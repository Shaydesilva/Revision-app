// ng-frontier.js — computes frontier, review queue, recommendation
// Category rotation, hybrid eligibility, urgency engine

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST'&&event.httpMethod!=='GET')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'
    console.log('ng-frontier: start')

    const[
      {data:profile,error:profileErr},
      {data:scaffolds,error:scaffoldErr},
      {data:recentEvents}
    ]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffolds')
        .select('id,base_portuguese,base_english,stages,current_stage,phase,category,context,source,last_practiced')
        .eq('user_id',UID),
      sb.from('ng_scaffold_events')
        .select('scaffold_id,stage,mode,quality,created_at')
        .eq('user_id',UID)
        .order('created_at',{ascending:false})
        .limit(500)
    ])

    console.log('ng-frontier: scaffolds=',scaffolds?.length||0,'err=',scaffoldErr?.message||'none')

    if(!scaffolds?.length){
      return{statusCode:200,body:JSON.stringify({
        frontier:[],controlled:[],phase:1,
        phase_name:'Survival → Social',
        review:[],recommendation:null,phase_progress:0
      })}
    }

    const now=Date.now()
    const controlled=new Set((profile?.controlled||[]).map(c=>c.scaffold_id+'|'+c.stage))

    // Build event map
    const eventMap={}
    ;(recentEvents||[]).forEach(ev=>{
      const key=ev.scaffold_id+'_'+ev.stage
      if(!eventMap[key])eventMap[key]={total:0,modes:{},qualities:[],lastPracticed:null}
      eventMap[key].total++
      eventMap[key].modes[ev.mode]=(eventMap[key].modes[ev.mode]||0)+1
      eventMap[key].qualities.push(ev.quality)
      if(!eventMap[key].lastPracticed)eventMap[key].lastPracticed=ev.created_at
    })

    const shArr=Array.isArray(profile?.session_history)?profile.session_history:[]
    const lastSession=shArr[0]?.date?new Date(shArr[0].date):null
    const lastMode=shArr[0]?.mode||null
    const daysSinceSession=lastSession?(now-lastSession.getTime())/(86400000):999

    const frontier=[]
    const reviewQueue=[]
    const fullyControlled=[]
    const SR_INTERVALS=[1,3,7,21,60,180]

    for(const scaffold of scaffolds){
      const stages=scaffold.stages||[]
      if(!stages.length)continue
      let allControlled=true

      for(let i=0;i<stages.length;i++){
        const stage=stages[i]
        const key=scaffold.id+'_'+stage.stage
        const controlledKey=scaffold.id+'|'+stage.stage
        const events=eventMap[key]||{total:0,modes:{},qualities:[],lastPracticed:null}
        const isControlled=controlled.has(controlledKey)

        if(isControlled){
          // Check review schedule
          const entry=(profile?.controlled||[]).find(c=>c.scaffold_id===scaffold.id&&c.stage===Number(stage.stage))
          if(entry){
            const lastReview=entry.last_review?new Date(entry.last_review):(entry.acquired_at?new Date(entry.acquired_at):null)
            const reviewCount=entry.review_count||0
            const interval=SR_INTERVALS[Math.min(reviewCount,SR_INTERVALS.length-1)]
            const daysSince=lastReview?(now-lastReview.getTime())/86400000:999
            if(daysSince>=interval){
              reviewQueue.push({
                scaffold_id:scaffold.id,
                base:scaffold.base_portuguese,
                stage:stage.stage,
                pt:stage.pt,
                en:stage.en,
                context:scaffold.context,
                category:scaffold.category,
                isReview:true,
                days_overdue:Math.round(daysSince-interval),
                review_count:reviewCount,
                next_interval:SR_INTERVALS[Math.min(reviewCount+1,SR_INTERVALS.length-1)]
              })
            }
          }
          if(i===stages.length-1)fullyControlled.push(scaffold.id)
          continue
        }

        allControlled=false

        // Urgency: in-progress items always outrank never-touched
        const daysSincePractice=events.lastPracticed
          ?(now-new Date(events.lastPracticed).getTime())/86400000:0
        const modesUsed=Object.keys(events.modes)
        const hasStudy=!!events.modes['flashcard']
        const hasPhrase=!!events.modes['phrase']
        const hasLuna=!!events.modes['luna']
        const avgQuality=events.qualities.length
          ?events.qualities.reduce((a,b)=>a+b,0)/events.qualities.length:0

        let urgency=0
        if(events.total===0){
          urgency+=3
          if(scaffold.source==='victor')urgency+=3
          if(['dating','social','bar','beach'].includes(scaffold.context))urgency+=2
        }else{
          urgency+=10 // in-progress always beats new
          if(scaffold.source==='victor')urgency+=3
          if(['dating','social','bar','beach'].includes(scaffold.context))urgency+=2
          if(daysSincePractice>=1)urgency+=Math.min(daysSincePractice,5)
        }

        const avoidance=(profile?.scaffold_avoidance||[]).find(a=>a.scaffold_id===scaffold.id)
        if(avoidance?.times_in_frontier>=3)urgency+=4

        // Priority boost — star or failure-driven
        const boost=(profile?.priority_boosts||{})[scaffold.id]||0
        urgency+=boost

        // Struggle penalty — "I don't know" presses
        const struggles=(profile?.struggle_patterns?.by_scaffold||{})[scaffold.id]||0
        if(struggles>=2)urgency+=Math.min(struggles*2,8)

        frontier.push({
          scaffold_id:scaffold.id,
          base:scaffold.base_portuguese,
          stage:stage.stage,
          pt:stage.pt,
          en:stage.en,
          context:scaffold.context,
          category:scaffold.category,
          phase:scaffold.phase,
          urgency:Math.round(urgency*10)/10,
          practice_count:events.total,
          modes_used:modesUsed,
          has_study:hasStudy,
          has_phrase:hasPhrase,
          has_luna:hasLuna,
          days_since_practice:Math.round(daysSincePractice),
          avg_quality:Math.round(avgQuality*10)/10
        })
        break // first uncontrolled stage only
      }
    }

    frontier.sort((a,b)=>b.urgency-a.urgency)

    // Category rotation — cap any single category at 6/12
    const rawPool=frontier.slice(0,32)
    const workingFrontier=[]
    const catCounts={}
    const CAT_CAP=6

    for(const item of rawPool){
      if(workingFrontier.length>=12)break
      const cat=item.category||'social_foundation'
      if((catCounts[cat]||0)<CAT_CAP){
        catCounts[cat]=(catCounts[cat]||0)+1
        workingFrontier.push(item)
      }
    }
    // Fill remainder ignoring cap if needed
    if(workingFrontier.length<12){
      const inSet=new Set(workingFrontier.map(f=>f.scaffold_id+'_'+f.stage))
      for(const item of rawPool){
        if(workingFrontier.length>=12)break
        if(!inSet.has(item.scaffold_id+'_'+item.stage))workingFrontier.push(item)
      }
    }

    // Hybrid eligibility — all 4 stages controlled
    const scaffoldControlledCount={}
    ;(profile?.controlled||[]).forEach(c=>{
      scaffoldControlledCount[c.scaffold_id]=(scaffoldControlledCount[c.scaffold_id]||0)+1
    })
    const hybridEligibleIds=Object.entries(scaffoldControlledCount)
      .filter(([,count])=>count>=4)
      .map(([id])=>id)
    const hybridSet=new Set(hybridEligibleIds)
    workingFrontier.forEach(f=>{f.hybrid_eligible=hybridSet.has(f.scaffold_id)})

    // Phase progress
    const currentPhase=profile?.phase||1
    const phaseScaffolds=scaffolds.filter(s=>s.phase===currentPhase)
    const phaseControlledCount=phaseScaffolds.reduce((sum,s)=>{
      const allDone=s.stages.every(st=>controlled.has(s.id+'|'+st.stage))
      return sum+(allDone?1:0)
    },0)
    const phaseProgress=phaseScaffolds.length?phaseControlledCount/phaseScaffolds.length:0
    const newPhase=phaseProgress>=0.8&&currentPhase<5?currentPhase+1:currentPhase

    // Recommendation
    const recommendation=computeRecommendation({
      frontier:workingFrontier,
      reviewQueue,
      daysSinceSession,
      lastMode,
      phase:currentPhase
    })

    // Write frontier to profile (fire-and-forget)
    sb.from('ng_learner_profile')
      .upsert({
        user_id:UID,
        frontier:workingFrontier,
        phase:newPhase,
        phase_progress:phaseProgress,
        phase_name:phaseName(newPhase)
      },{onConflict:'user_id'})
      .then(({error})=>{if(error)console.log('Profile write err:',error.message)})
      .catch(e=>console.log('Profile write catch:',e?.message))

    // Fire metrics if stale (> 5 min) or never computed
    const lastMetrics=profile?.metrics_snapshot?.computed_at
    const metricsAge=lastMetrics?(Date.now()-new Date(lastMetrics).getTime())/60000:999
    if(metricsAge>5){
      try{
        const siteUrl2=process.env.URL||process.env.DEPLOY_URL||''
        if(siteUrl2)fetch(`${siteUrl2}/.netlify/functions/ng-progress-metrics`,{method:'POST'}).catch(()=>{})
      }catch(_){}
    }

    // Nightly brain — fires after 4am Rio, once per day (checks its own dedup)
    try{
      const nowRioNB=new Date(Date.now()-3*3600000)
      if(nowRioNB.getUTCHours()>=4){
        const siteUrlNB=process.env.URL||process.env.DEPLOY_URL||''
        if(siteUrlNB)fetch(`${siteUrlNB}/.netlify/functions/ng-nightly-brain`,{method:'POST'}).catch(()=>{})
      }
    }catch(_){}

    // Daily hybrid generation — fires after 7am Rio time (UTC-3)
    try{
      const nowRio=new Date(Date.now()-3*3600000)
      const todayRio=nowRio.toISOString().slice(0,10)
      const lastHybrid=profile?.last_hybrid_date||'2000-01-01'
      const rioHour=nowRio.getUTCHours()
      if(rioHour>=7&&lastHybrid<todayRio){
        const siteUrl=process.env.URL||process.env.DEPLOY_URL||''
        if(siteUrl){
          fetch(`${siteUrl}/.netlify/functions/ng-hybrid-generate`,{method:'POST'}).catch(()=>{})
        }
      }
    }catch(_){}

    // Pending hybrids count for map badge
    const pendingHybrids=profile?.pending_hybrids||[]

    console.log('ng-frontier: returning',workingFrontier.length,'items, phase',newPhase,'hybrid_eligible',hybridEligibleIds.length)

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        frontier:workingFrontier,
        review:reviewQueue.slice(0,8),
        review_count:reviewQueue.length,
        recommendation,
        phase:newPhase,
        phase_name:phaseName(newPhase),
        phase_progress:phaseProgress,
        total_controlled:controlled.size,
        fully_controlled_scaffolds:fullyControlled.length,
        controlled_list:Array.from(profile?.controlled||[]),
        hybrid_eligible_count:hybridEligibleIds.length,
        hybrid_eligible_ids:hybridEligibleIds,
        pending_hybrids_count:pendingHybrids.length,
        pending_hybrids:pendingHybrids,
        priority_boosts:profile?.priority_boosts||{}
      })
    }

  }catch(e){
    console.error('ng-frontier error:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

function computeRecommendation({frontier,reviewQueue,daysSinceSession,lastMode,phase}){
  const overdue=reviewQueue.filter(r=>r.days_overdue>0)
  const unseenFrontier=frontier.filter(f=>f.practice_count===0)
  const studiedNotPhrased=frontier.filter(f=>f.has_study&&!f.has_phrase&&!f.has_luna&&f.practice_count>=1)
  const studiedNotLuna=frontier.filter(f=>(f.has_study||f.has_phrase)&&!f.has_luna&&f.practice_count>=2)
  const slipping=frontier.filter(f=>f.days_since_practice>=3&&f.practice_count>0)

  if(overdue.length>=2)return{
    action:'study',mode:'review',priority:'high',
    title:'Review due',
    reason:overdue.length+' acquired patterns need a refresh. Without review they fade.',
    cta:'Quick review',items:overdue.slice(0,3).map(r=>r.base)
  }

  if(studiedNotPhrased.length>=2)return{
    action:'phrase',mode:'phrase',priority:'high',
    title:'Time to produce',
    reason:'You\'ve studied "'+studiedNotPhrased[0].base+'" '+studiedNotPhrased[0].practice_count+'x. Writing it in a scenario locks it in.',
    cta:'Open Phrase',items:studiedNotPhrased.slice(0,3).map(f=>f.base)
  }

  if(studiedNotLuna.length>=1)return{
    action:'luna',mode:'luna',priority:'high',
    title:'Ready for conversation',
    reason:'"'+studiedNotLuna[0].base+'" has been studied and written. Deploy it naturally with Luna.',
    cta:'Talk to Luna',items:studiedNotLuna.slice(0,2).map(f=>f.base)
  }

  if(unseenFrontier.length>=3)return{
    action:'study',mode:'study',priority:'medium',
    title:'New patterns waiting',
    reason:unseenFrontier.length+' frontier patterns haven\'t been practiced yet. Start here.',
    cta:'Open Study',items:unseenFrontier.slice(0,3).map(f=>f.base)
  }

  if(slipping.length>=2)return{
    action:'study',mode:'study',priority:'medium',
    title:'Patterns slipping',
    reason:slipping.length+' patterns haven\'t been practiced in '+slipping[0].days_since_practice+' days.',
    cta:'Open Study',items:slipping.slice(0,3).map(f=>f.base)
  }

  if(daysSinceSession>=1&&unseenFrontier.length<3)return{
    action:'luna',mode:'luna',priority:'medium',
    title:'Pick up where you left off',
    reason:'It\'s been '+Math.round(daysSinceSession)+' day'+(daysSinceSession>=2?'s':'')+' since your last session.',
    cta:'Talk to Luna',items:[]
  }

  return{
    action:'luna',mode:'luna',priority:'low',
    title:'Keep the conversation going',
    reason:'Your frontier is being worked consistently. Luna will push the patterns that need more depth.',
    cta:'Talk to Luna',items:[]
  }
}

function phaseName(phase){
  return{1:'Survival → Social',2:'Social → Conversational',3:'Conversational → Fluent',4:'Fluent → Natural',5:'Natural → Mastery'}[phase]||'Mastery'
}
