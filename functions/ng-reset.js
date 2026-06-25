// ng-reset.js
// Clears all Next Gen progress — keeps scaffold bank intact
// Only callable from Intel screen, requires explicit confirmation

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    const{confirmed=false}=JSON.parse(event.body||'{}')
    if(!confirmed)return{statusCode:400,body:JSON.stringify({error:'Must confirm reset'})}

    console.log('ng-reset: clearing all progress for',UID)

    // 1. Clear all scaffold events
    const{error:eventsErr}=await sb
      .from('ng_scaffold_events').delete().eq('user_id',UID)
    if(eventsErr)console.log('Events clear error:',eventsErr.message)

    // 2. Clear all milestones
    const{error:msErr}=await sb
      .from('ng_milestones').delete().eq('user_id',UID)
    if(msErr)console.log('Milestones clear error:',msErr.message)

    // 3. Clear all intelligence sessions
    const{error:intelErr}=await sb
      .from('ng_intelligence_sessions').delete().eq('user_id',UID)
    if(intelErr)console.log('Intel clear error:',intelErr.message)

    // 4. Reset learner profile — keep user_id, zero everything else
    const{error:profileErr}=await sb
      .from('ng_learner_profile').upsert({
        user_id:UID,
        phase:1,
        phase_name:'Survival → Social',
        phase_progress:0,
        frontier:[],
        controlled:[],
        error_fingerprint:{},
        avoided_patterns:[],
        scaffold_avoidance:[],
        session_history:{},
        luna_notes:'',
        personality_profile:{},
        field_reports:[],
        last_intelligence_insights:'',
        version:0,
        last_updated:new Date().toISOString()
      },{onConflict:'user_id'})
    if(profileErr)console.log('Profile reset error:',profileErr.message)

    // 5. Reset scaffold stages — clear acquisition data but keep the scaffolds
    const{data:scaffolds}=await sb
      .from('ng_scaffolds').select('id,stages').eq('user_id',UID)

    let scaffoldsReset=0
    for(const sc of(scaffolds||[])){
      const resetStages=(sc.stages||[])
        // Remove generated stages (keep only curated 4)
        .filter(s=>!s.generated)
        .map(s=>({
          ...s,
          acquired:false,
          acquired_at:null,
          practice_count:0,
          modes_used:[]
        }))
      const{error}=await sb.from('ng_scaffolds')
        .update({stages:resetStages,current_stage:1})
        .eq('id',sc.id).eq('user_id',UID)
      if(!error)scaffoldsReset++
    }

    // 6. Clear write log
    await sb.from('write_log').delete().eq('user_id',UID).catch(()=>{})

    console.log('ng-reset: complete. scaffolds reset:',scaffoldsReset)

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ok:true,
        scaffolds_reset:scaffoldsReset,
        message:'All progress cleared. Scaffold bank intact.'
      })
    }
  }catch(e){
    console.error('ng-reset error:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
