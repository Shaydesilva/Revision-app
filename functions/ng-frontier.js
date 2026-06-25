// ng-frontier.js
// Computes the full learning state:
// - Working frontier (8-12 scaffold stages at the learning edge)
// - Review queue (acquired stages due for spaced repetition)
// - Recommendation (what to do RIGHT NOW and why)
// Pure computation — read-only, no writes

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST'&&event.httpMethod!=='GET')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    console.log('ng-frontier: fetching data for',UID)

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

    console.log('ng-frontier: profile=',profile?.user_id||'null','scaffolds=',scaffolds?.length||0,'scaffoldErr=',scaffoldErr?.message||'none')

    if(!scaffolds?.length){
      return{statusCode:200,body:JSON.stringify({
        frontier:[],controlled:[],phase:1,phase_name:'Survival → Social',
        review:[],recommendation:null,phase_progress:0
      })}
    }

    const now=Date.now()
    // Use pipe separator — scaffold IDs contain underscores
    const controlled=new Set((profile?.controlled||[]).map(c=>`${c.scaffold_id}|${c.stage}`))

    // ── Build event map ────────────────────────────────────────────────
    const eventMap={}
    ;(recentEvents||[]).forEach(ev=>{
      const key=`${ev.scaffold_id}_${ev.stage}`
      if(!eventMap[key])eventMap[key]={total:0,modes:{},qualities:[],lastPracticed:null}
      eventMap[key].total++
      eventMap[key].modes[ev.mode]=(eventMap[key].modes[ev.mode]||0)+1
      eventMap[key].qualities.push(ev.quality)
      if(!eventMap[key].lastPracticed)eventMap[key].lastPracticed=ev.created_at
    })

    // ── Session history ────────────────────────────────────────────────
    const sessionHistory=profile?.session_history||{}
    const lastSession=sessionHistory.last_session?new Date(sessionHistory.last_session):null
    const lastMode=sessionHistory.last_mode||null
    const daysSinceSession=lastSession?(now-lastSession.getTime())/(1000*60*60*24):999

    // ── Compute frontier and review queue ──────────────────────────────
    const frontier=[]
    const reviewQueue=[]
    const fullyControlled=[]

    // Spaced repetition intervals (days): review after these intervals
    const SR_INTERVALS=[1,3,7,21,60,180]

    for(const scaffold of scaffolds){
      const stages=scaffold.stages||[]
      if(!stages.length)continue

      for(let i=0;i<stages.length;i++){
        const stage=stages[i]
        const key=`${scaffold.id}_${stage.stage}`  // for eventMap
        const controlledKey=`${scaffold.id}|${stage.stage}`  // pipe for controlled set
        const events=eventMap[key]||{total:0,modes:{},qualities:[],lastPracticed:null}
        const isControlled=controlled.has(controlledKey)

        if(isControlled){
          // Stage acquired — check if due for spaced repetition review
          const controlledEntry=(profile?.controlled||[]).find(c=>c.scaffold_id===scaffold.id&&c.stage===Number(stage.stage))
          if(controlledEntry){
            const acquiredAt=controlledEntry.acquired_at?new Date(controlledEntry.acquired_at):null
            const reviewCount=controlledEntry.review_count||0
            const lastReview=controlledEntry.last_review?new Date(controlledEntry.last_review):acquiredAt
            const interval=SR_INTERVALS[Math.min(reviewCount,SR_INTERVALS.length-1)]
            const daysSinceReview=lastReview?(now-lastReview.getTime())/(1000*60*60*24):999
            const isDue=daysSinceReview>=interval

            if(isDue){
              reviewQueue.push({
                scaffold_id:scaffold.id,
                base:scaffold.base_portuguese,
                stage:stage.stage,
                pt:stage.pt,
                en:stage.en,
                context:scaffold.context,
                category:scaffold.category,
                days_overdue:Math.round(daysSinceReview-interval),
                review_count:reviewCount,
                next_interval:SR_INTERVALS[Math.min(reviewCount+1,SR_INTERVALS.length-1)]
              })
            }
          }
          // Stage is controlled — check if this is the last stage
          if(i===stages.length-1)fullyControlled.push(scaffold.id)
          continue
        }

        // Not controlled — this is the active stage for this scaffold
        const modesUsed=Object.keys(events.modes)
        const avgQuality=events.qualities.length
          ?events.qualities.reduce((a,b)=>a+b,0)/events.qualities.length:0
        const acquired=(events.total>=3&&avgQuality>=3)||(modesUsed.length>=2&&events.total>=2&&avgQuality>=3.5)

        if(acquired){
          // Just acquired — will be handled by session-end
          // Still show in frontier until confirmed by server
        }

        // Urgency scoring
        const daysSincePractice=events.lastPracticed
          ?(now-new Date(events.lastPracticed).getTime())/(1000*60*60*24):99
        let urgency=0
        if(scaffold.source==='victor')urgency+=3
        if(events.total>0&&events.total<3)urgency+=2
        if(['dating','social','bar','beach'].includes(scaffold.context))urgency+=2
        urgency+=Math.min(daysSincePractice,7)
        const avoidance=(profile?.scaffold_avoidance||[]).find(a=>a.scaffold_id===scaffold.id)
        if(avoidance?.times_in_frontier>=3)urgency+=4

        // Which modes have been used — drives recommendation
        const hasStudy=events.modes['flashcard']>0
        const hasPhrase=events.modes['phrase']>0
        const hasLuna=events.modes['luna']>0

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
        break // Only take the first uncontrolled stage per scaffold
      }
    }

    frontier.sort((a,b)=>b.urgency-a.urgency)
    const workingFrontier=frontier.slice(0,12)

    // ── Phase progress ─────────────────────────────────────────────────
    const currentPhase=profile?.phase||1
    const phaseScaffolds=scaffolds.filter(s=>s.phase===currentPhase)
    const phaseControlledCount=phaseScaffolds.reduce((sum,s)=>{
      const allControlled=s.stages.every(st=>controlled.has(`${s.id}|${st.stage}`))
      return sum+(allControlled?1:0)
    },0)
    const phaseProgress=phaseScaffolds.length?phaseControlledCount/phaseScaffolds.length:0
    const newPhase=phaseProgress>=0.8&&currentPhase<5?currentPhase+1:currentPhase

    // ── Recommendation engine ──────────────────────────────────────────
    const recommendation=computeRecommendation({
      frontier:workingFrontier,
      reviewQueue,
      daysSinceSession,
      lastMode,
      phase:currentPhase
    })

    // Write frontier to profile (fire-and-forget, never blocks the response)
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

    console.log('ng-frontier: returning',workingFrontier.length,'frontier,',reviewQueue.length,'review,recommendation:',recommendation?.action)

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
        controlled_list:Array.from(profile?.controlled||[])
      })
    }

  }catch(e){
    console.error('ng-frontier error:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

// ── Recommendation Engine ──────────────────────────────────────────────
function computeRecommendation({frontier,reviewQueue,daysSinceSession,lastMode,phase}){
  const overdue=reviewQueue.filter(r=>r.days_overdue>0)
  const unseenFrontier=frontier.filter(f=>f.practice_count===0)
  const studiedNotPhrased=frontier.filter(f=>f.has_study&&!f.has_phrase&&!f.has_luna&&f.practice_count>=1)
  const studiedNotLuna=frontier.filter(f=>(f.has_study||f.has_phrase)&&!f.has_luna&&f.practice_count>=2)
  const slipping=frontier.filter(f=>f.days_since_practice>=3&&f.practice_count>0)

  // Priority 1: Review overdue — memory fading
  if(overdue.length>=2){
    return{
      action:'study',
      mode:'review',
      priority:'high',
      title:'Review due',
      reason:`${overdue.length} acquired patterns haven't been reviewed in a while. Without review, they fade.`,
      cta:'Quick review',
      items:overdue.slice(0,3).map(r=>r.base)
    }
  }

  // Priority 2: Patterns seen in Study but never produced — Phrase next
  if(studiedNotPhrased.length>=2){
    return{
      action:'phrase',
      mode:'phrase',
      priority:'high',
      title:'Time to produce',
      reason:`You've studied "${studiedNotPhrased[0].base}" ${studiedNotPhrased[0].practice_count}x. Writing it in a scenario locks it in.`,
      cta:'Open Phrase',
      items:studiedNotPhrased.slice(0,3).map(f=>f.base)
    }
  }

  // Priority 3: Practiced in Study+Phrase — Luna next
  if(studiedNotLuna.length>=1){
    return{
      action:'luna',
      mode:'luna',
      priority:'high',
      title:'Ready for conversation',
      reason:`"${studiedNotLuna[0].base}" has been studied and written. Deploy it naturally in conversation with Luna.`,
      cta:'Talk to Luna',
      items:studiedNotLuna.slice(0,2).map(f=>f.base)
    }
  }

  // Priority 4: Unseen patterns — always Study first on fresh install
  if(unseenFrontier.length>=3){
    return{
      action:'study',
      mode:'study',
      priority:'medium',
      title:'New patterns waiting',
      reason:`${unseenFrontier.length} patterns in your frontier haven't been practiced yet. Start here — Study first.`,
      cta:'Open Study',
      items:unseenFrontier.slice(0,3).map(f=>f.base)
    }
  }

  // Priority 5: Slipping — haven't practiced in a while
  if(slipping.length>=2){
    return{
      action:'study',
      mode:'study',
      priority:'medium',
      title:'Patterns slipping',
      reason:`${slipping.length} patterns haven't been practiced in ${slipping[0].days_since_practice} days. Quick Study session.`,
      cta:'Open Study',
      items:slipping.slice(0,3).map(f=>f.base)
    }
  }

  // Priority 6: Gap since last session (only if frontier is being worked)
  if(daysSinceSession>=1&&unseenFrontier.length<3){
    return{
      action:'luna',
      mode:'luna',
      priority:'medium',
      title:'Pick up where you left off',
      reason:`It's been ${Math.round(daysSinceSession)} day${daysSinceSession>=2?'s':''} since your last session. Luna is ready.`,
      cta:'Talk to Luna',
      items:[]
    }
  }

  // Default: talk to Luna — everything is in good shape
  return{
    action:'luna',
    mode:'luna',
    priority:'low',
    title:'Keep the conversation going',
    reason:'Your frontier is being worked consistently. Luna will push the patterns that need more depth.',
    cta:'Talk to Luna',
    items:[]
  }
}

function phaseName(phase){
  return{
    1:'Survival → Social',
    2:'Social → Conversational',
    3:'Conversational → Fluent',
    4:'Fluent → Natural',
    5:'Natural → Mastery'
  }[phase]||'Mastery'
}
