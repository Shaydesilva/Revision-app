// ng-progress-metrics.js
// Computes a clean metrics snapshot from raw events
// Stored to profile — Intel + Luna read from here, not raw events

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST'&&event.httpMethod!=='GET')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'
    const now=Date.now()
    const DAY=86400000

    const[{data:profile},{data:allEvents},{data:scaffolds}]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffold_events').select('scaffold_id,stage,mode,quality,produced,created_at').eq('user_id',UID),
      sb.from('ng_scaffolds').select('id,base_portuguese,phase,category,context').eq('user_id',UID)
    ])

    const scaffoldMap={}
    ;(scaffolds||[]).forEach(s=>{scaffoldMap[s.id]=s})
    const controlled=profile?.controlled||[]
    const events=allEvents||[]

    // Time windows
    const events7d=events.filter(e=>now-new Date(e.created_at).getTime()<7*DAY)
    const events30d=events.filter(e=>now-new Date(e.created_at).getTime()<30*DAY)

    // ── Velocity ───────────────────────────────────────────────────
    const acquired7d=controlled.filter(c=>c.acquired_at&&now-new Date(c.acquired_at).getTime()<7*DAY).length
    const acquired30d=controlled.filter(c=>c.acquired_at&&now-new Date(c.acquired_at).getTime()<30*DAY).length
    const acquired14d=controlled.filter(c=>c.acquired_at&&now-new Date(c.acquired_at).getTime()<14*DAY).length
    const prev14d=controlled.filter(c=>{
      const t=c.acquired_at?new Date(c.acquired_at).getTime():0
      return t>now-28*DAY&&t<=now-14*DAY
    }).length
    const trend=acquired14d>prev14d?'accelerating':acquired14d<prev14d?'slowing':'steady'
    const weeklyRate=acquired7d
    const phase1Total=(scaffolds||[]).filter(s=>s.phase===1).length*4
    const remaining=phase1Total-controlled.length
    const projectedWeeks=weeklyRate>0?Math.ceil(remaining/weeklyRate):null

    // ── Mode breakdown ─────────────────────────────────────────────
    const modeSessions={}
    const modeQualities={}
    events7d.forEach(e=>{
      modeSessions[e.mode]=(modeSessions[e.mode]||0)+1
      if(!modeQualities[e.mode])modeQualities[e.mode]=[]
      modeQualities[e.mode].push(e.quality)
    })
    const avgQualityByMode={}
    Object.entries(modeQualities).forEach(([m,qs])=>{
      avgQualityByMode[m]=Math.round(qs.reduce((a,b)=>a+b,0)/qs.length*10)/10
    })
    const bestMode=Object.entries(avgQualityByMode).sort(([,a],[,b])=>b-a)[0]?.[0]||null

    // ── Category health ────────────────────────────────────────────
    const catHealth={}
    const CATS=['social_foundation','dating_register','personality_humour','deep_fluency']
    CATS.forEach(cat=>{
      const catScaffolds=(scaffolds||[]).filter(s=>s.category===cat)
      const catControlled=controlled.filter(c=>{
        const sc=scaffoldMap[c.scaffold_id]
        return sc?.category===cat
      }).length
      const catEvents=events.filter(e=>{
        const sc=scaffoldMap[e.scaffold_id]
        return sc?.category===cat
      })
      const catQualities=catEvents.map(e=>e.quality)
      const avgQ=catQualities.length?Math.round(catQualities.reduce((a,b)=>a+b,0)/catQualities.length*10)/10:0
      const dontKnow=catEvents.filter(e=>e.quality<=1&&e.mode==='write').length
      catHealth[cat]={
        scaffolds:catScaffolds.length,
        controlled:catControlled,
        avg_quality:avgQ,
        dont_know:dontKnow,
        events:catEvents.length
      }
    })

    // ── Struggle patterns ──────────────────────────────────────────
    const dontKnowEvents=events.filter(e=>e.quality<=1&&e.mode==='write')
    const dontKnowByScaffold={}
    dontKnowEvents.forEach(e=>{
      dontKnowByScaffold[e.scaffold_id]=(dontKnowByScaffold[e.scaffold_id]||0)+1
    })
    const topStruggles=Object.entries(dontKnowByScaffold)
      .sort(([,a],[,b])=>b-a).slice(0,5)
      .map(([id,count])=>({scaffold_id:id,base:scaffoldMap[id]?.base_portuguese||id,count}))

    const dontKnowByCategory={}
    dontKnowEvents.forEach(e=>{
      const cat=scaffoldMap[e.scaffold_id]?.category||'unknown'
      dontKnowByCategory[cat]=(dontKnowByCategory[cat]||0)+1
    })

    // ── Consistency / streak ───────────────────────────────────────
    const sessionDays=new Set(events.map(e=>new Date(e.created_at).toISOString().slice(0,10)))
    let streak=0
    for(let i=0;i<60;i++){
      const d=new Date(now-i*DAY).toISOString().slice(0,10)
      if(sessionDays.has(d))streak++
      else if(i>0)break
    }

    // ── Mode efficiency (acquisition rate per mode) ────────────────
    const modeAcquisitions={}
    controlled.forEach(c=>{
      // Find the mode most used for this scaffold before acquisition
      const scEvents=events.filter(e=>e.scaffold_id===c.scaffold_id&&e.stage===c.stage)
      if(!scEvents.length)return
      const modeCount={}
      scEvents.forEach(e=>{modeCount[e.mode]=(modeCount[e.mode]||0)+1})
      const topMode=Object.entries(modeCount).sort(([,a],[,b])=>b-a)[0]?.[0]
      if(topMode)modeAcquisitions[topMode]=(modeAcquisitions[topMode]||0)+1
    })

    // ── Weakest area ───────────────────────────────────────────────
    const weakestCategory=Object.entries(catHealth)
      .filter(([,h])=>h.events>0)
      .sort(([,a],[,b])=>(b.dont_know/Math.max(b.events,1))-(a.dont_know/Math.max(a.events,1)))[0]?.[0]||null

    // ── Weekly summary ─────────────────────────────────────────────
    const lastWeekSummary=profile?.week_summary
    const weeklyNarrative=buildWeeklyNarrative({acquired7d,topStruggles,bestMode,streak,modeSessions})

    // ── Build snapshot ─────────────────────────────────────────────
    const snapshot={
      computed_at:new Date().toISOString(),
      velocity:{
        stages_7d:acquired7d,
        stages_30d:acquired30d,
        trend,
        projected_weeks_to_phase2:projectedWeeks
      },
      mode_breakdown:{
        sessions_7d:modeSessions,
        avg_quality_by_mode:avgQualityByMode,
        best_mode:bestMode,
        mode_acquisitions:modeAcquisitions
      },
      category_health:catHealth,
      dont_know:{
        total_7d:events7d.filter(e=>e.quality<=1&&e.mode==='write').length,
        by_category:dontKnowByCategory,
        top_struggles:topStruggles
      },
      consistency:{
        streak_days:streak,
        sessions_7d:events7d.length,
        sessions_30d:events30d.length
      },
      weakest_category:weakestCategory,
      total_controlled:controlled.length,
      total_stages:788,
      weekly_narrative:weeklyNarrative
    }

    // Write snapshot to profile
    await sb.from('ng_learner_profile')
      .update({metrics_snapshot:snapshot,week_summary:{...lastWeekSummary,latest:weeklyNarrative,acquired_this_week:acquired7d}})
      .eq('user_id',UID)
      .catch(e=>console.log('Snapshot write:',e.message))

    return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)}
  }catch(e){
    console.error('ng-progress-metrics:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

function buildWeeklyNarrative({acquired7d,topStruggles,bestMode,streak,modeSessions}){
  const parts=[]
  if(acquired7d>0)parts.push(`${acquired7d} stage${acquired7d!==1?'s':''} acquired this week`)
  if(streak>1)parts.push(`${streak}-day streak`)
  if(bestMode)parts.push(`${bestMode} is your strongest mode`)
  if(topStruggles.length)parts.push(`struggling with "${topStruggles[0].base}"`)
  return parts.join(' · ')
}
