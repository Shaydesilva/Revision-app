// ng-sync-health.js
// Returns complete diagnostic state of the Next Gen system

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST'&&event.httpMethod!=='GET')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    const[
      {data:profile},
      {data:eventCounts},
      {data:recentEvents},
      {data:scaffolds},
      {data:milestones},
      {data:writeLogs}
    ]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffold_events').select('mode',{count:'exact'}).eq('user_id',UID),
      sb.from('ng_scaffold_events')
        .select('scaffold_id,stage,mode,quality,created_at')
        .eq('user_id',UID)
        .order('created_at',{ascending:false}).limit(10),
      sb.from('ng_scaffolds').select('id,phase,source').eq('user_id',UID),
      sb.from('ng_milestones').select('milestone_type,seen,created_at').eq('user_id',UID),
      sb.from('write_log')
        .select('table_name,operation,status,error,created_at')
        .eq('user_id',UID)
        .order('created_at',{ascending:false}).limit(10)
    ])

    // Events by mode
    const modeBreakdown={}
    const{data:allEvents}=await sb
      .from('ng_scaffold_events')
      .select('mode').eq('user_id',UID)
    ;(allEvents||[]).forEach(ev=>{
      modeBreakdown[ev.mode]=(modeBreakdown[ev.mode]||0)+1
    })

    // Scaffolds by phase and source
    const scaffoldsByPhase={}
    const scaffoldsBySource={}
    ;(scaffolds||[]).forEach(s=>{
      scaffoldsByPhase[s.phase]=(scaffoldsByPhase[s.phase]||0)+1
      scaffoldsBySource[s.source]=(scaffoldsBySource[s.source]||0)+1
    })

    // Profile health
    const controlled=profile?.controlled||[]
    const frontier=profile?.frontier||[]
    const sessionHistory=profile?.session_history||{}

    const health={
      // Profile
      profile_exists:!!profile,
      profile_version:profile?.version||0,
      last_updated:profile?.last_updated||null,

      // Progress
      phase:profile?.phase||1,
      phase_name:profile?.phase_name||'Survival → Social',
      phase_progress_pct:Math.round((profile?.phase_progress||0)*100),
      stages_controlled:controlled.length,
      scaffolds_fully_controlled:0, // computed below

      // Frontier
      frontier_size:frontier.length,
      frontier_items:frontier.map(f=>({
        base:f.base,
        stage:f.stage,
        sessions:f.practice_count||0,
        modes:f.modes_used||[]
      })),

      // Events
      total_events:(allEvents||[]).length,
      events_by_mode:modeBreakdown,
      recent_events:(recentEvents||[]).map(ev=>({
        scaffold_id:ev.scaffold_id,
        stage:ev.stage,
        mode:ev.mode,
        quality:ev.quality,
        at:ev.created_at?.slice(0,19)
      })),

      // Scaffolds
      total_scaffolds:(scaffolds||[]).length,
      scaffolds_by_phase:scaffoldsByPhase,
      scaffolds_by_source:scaffoldsBySource,

      // Sessions
      last_session:sessionHistory.last_session||null,
      last_mode:sessionHistory.last_mode||null,
      session_counts:{
        flashcard:sessionHistory.last_flashcard?1:0,
        phrase:sessionHistory.last_phrase?1:0,
        luna:sessionHistory.last_luna?1:0
      },

      // Luna notes and fingerprint
      luna_notes:profile?.luna_notes||'',
      error_fingerprint:profile?.error_fingerprint||{},

      // Milestones
      milestones_earned:(milestones||[]).length,
      milestone_list:(milestones||[]).map(m=>({type:m.milestone_type,seen:m.seen,at:m.created_at?.slice(0,10)})),

      // Write health
      recent_writes:(writeLogs||[]).map(w=>({
        table:w.table_name,
        op:w.operation,
        status:w.status,
        error:w.error,
        at:w.created_at?.slice(0,19)
      })),
      write_errors:(writeLogs||[]).filter(w=>w.status==='failed').length
    }

    // Compute fully controlled scaffolds
    const controlledByScaffold={}
    controlled.forEach(c=>{
      if(!controlledByScaffold[c.scaffold_id])controlledByScaffold[c.scaffold_id]=0
      controlledByScaffold[c.scaffold_id]++
    })
    health.scaffolds_fully_controlled=Object.values(controlledByScaffold)
      .filter(count=>count>=4).length

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(health)
    }
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
