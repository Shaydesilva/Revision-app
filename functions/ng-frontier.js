// ng-frontier.js
// Compute the working frontier from scaffold data
// Pure computation — no AI, runs in <100ms
// Returns 8-12 scaffold stages at the exact learning edge

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST'&&event.httpMethod!=='GET')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    // Load profile + scaffolds in parallel
    const[{data:profile},{data:scaffolds},{data:recentEvents}]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffolds').select('*').eq('user_id',UID),
      sb.from('ng_scaffold_events')
        .select('scaffold_id,stage,mode,quality,created_at')
        .eq('user_id',UID)
        .order('created_at',{ascending:false})
        .limit(200)
    ])

    if(!scaffolds?.length){
      return{statusCode:200,body:JSON.stringify({frontier:[],controlled:[],phase:1})}
    }

    const controlled=new Set(
      (profile?.controlled||[]).map(c=>`${c.scaffold_id}_${c.stage}`)
    )

    // Build event map — how many times each scaffold/stage practiced per mode
    const eventMap={}
    ;(recentEvents||[]).forEach(ev=>{
      const key=`${ev.scaffold_id}_${ev.stage}`
      if(!eventMap[key])eventMap[key]={total:0,modes:{},qualities:[],lastPracticed:null}
      eventMap[key].total++
      eventMap[key].modes[ev.mode]=(eventMap[key].modes[ev.mode]||0)+1
      eventMap[key].qualities.push(ev.quality)
      if(!eventMap[key].lastPracticed)eventMap[key].lastPracticed=ev.created_at
    })

    const frontier=[]
    const fullyControlled=[]

    for(const scaffold of scaffolds){
      const stages=scaffold.stages||[]
      if(!stages.length)continue

      // Find current active stage
      let activeStageIdx=-1
      for(let i=0;i<stages.length;i++){
        const key=`${scaffold.id}_${stages[i].stage}`
        if(!controlled.has(key)){
          activeStageIdx=i
          break
        }
      }

      // All stages acquired — scaffold complete
      if(activeStageIdx===-1){
        fullyControlled.push(scaffold.id)
        continue
      }

      const activeStage=stages[activeStageIdx]
      const key=`${scaffold.id}_${activeStage.stage}`
      const events=eventMap[key]||{total:0,modes:{},qualities:[],lastPracticed:null}

      // Check acquisition criteria
      const modesUsed=Object.keys(events.modes).length
      const avgQuality=events.qualities.length
        ?events.qualities.reduce((a,b)=>a+b,0)/events.qualities.length
        :0
      const acquired=modesUsed>=2&&events.total>=3&&avgQuality>=3.5

      if(acquired){
        // Mark as controlled — will be written back by session-end
        // For now, advance to next stage in frontier computation
        const nextStage=stages[activeStageIdx+1]
        if(nextStage){
          const nextKey=`${scaffold.id}_${nextStage.stage}`
          const nextEvents=eventMap[nextKey]||{total:0,modes:{},qualities:[],lastPracticed:null}
          frontier.push(buildFrontierItem(scaffold,nextStage,nextEvents,profile))
        }else{
          fullyControlled.push(scaffold.id)
        }
      }else{
        frontier.push(buildFrontierItem(scaffold,activeStage,events,profile))
      }
    }

    // Sort by urgency — highest first
    frontier.sort((a,b)=>b.urgency-a.urgency)

    // Working frontier: 8-12 items
    const workingFrontier=frontier.slice(0,12)

    // Phase progress — how many phase scaffolds have all stages controlled
    const currentPhase=profile?.phase||1
    const phaseScaffolds=scaffolds.filter(s=>s.phase===currentPhase)
    const phaseControlled=phaseScaffolds.filter(s=>
      s.stages.every(st=>controlled.has(`${s.id}_${st.stage}`))
    )
    const phaseProgress=phaseScaffolds.length
      ?phaseControlled.length/phaseScaffolds.length
      :0

    // Auto-advance phase if 80% controlled
    let newPhase=currentPhase
    if(phaseProgress>=0.8&&currentPhase<5){
      newPhase=currentPhase+1
    }

    // Update profile with new frontier and phase
    await fetch(`${process.env.URL||''}/.netlify/functions/ng-profile-update`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        update:{
          frontier:workingFrontier,
          phase:newPhase,
          phase_progress:phaseProgress,
          phase_name:phaseName(newPhase)
        }
      })
    }).catch(()=>{})

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        frontier:workingFrontier,
        phase:newPhase,
        phase_name:phaseName(newPhase),
        phase_progress:phaseProgress,
        total_controlled:controlled.size,
        fully_controlled_scaffolds:fullyControlled.length
      })
    }

  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

function buildFrontierItem(scaffold,stage,events,profile){
  const daysSincePractice=events.lastPracticed
    ?(Date.now()-new Date(events.lastPracticed).getTime())/(1000*60*60*24)
    :99

  // Urgency scoring
  let urgency=0
  if(scaffold.source==='victor')urgency+=3          // Victor taught it
  if(events.total>0&&events.total<3)urgency+=2       // Started but not acquired
  if(scaffold.context==='dating'||scaffold.context==='social')urgency+=2
  urgency+=Math.min(daysSincePractice,7)             // +1 per day without practice, cap at 7

  // Avoidance detection — in frontier 3+ sessions but rarely produced
  const avoidanceScore=(profile?.scaffold_avoidance||[])
    .find(a=>a.scaffold_id===scaffold.id)
  if(avoidanceScore&&avoidanceScore.times_in_frontier>=3){
    urgency+=4 // Pressure increases on avoided scaffolds
  }

  return{
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
    modes_used:Object.keys(events.modes),
    days_since_practice:Math.round(daysSincePractice)
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
