// ng-reset.js — Full progress wipe, V2-compatible.
// Clears: events, memory, daily brain output, radio, missions, brain log,
// heartbeat state, intel sessions, milestones, write log, earned scaffolds
// (hybrids/self-extends), and every progress field on the profile.
// Keeps: the scaffold content bank (curated + imported + say-it + field + luna),
// the knowledge graph (content-derived, not progress), radio station prompt.

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'
    const{confirmed=false}=JSON.parse(event.body||'{}')
    if(!confirmed)return{statusCode:400,body:JSON.stringify({error:'Must confirm reset'})}

    const wiped=[]
    const wipe=async(table)=>{
      try{
        const{error}=await sb.from(table).delete().eq('user_id',UID)
        if(!error)wiped.push(table)
        else console.log(table,'clear error:',error.message)
      }catch(e){console.log(table,'clear skipped:',e.message)}
    }

    // ── Progress tables (V1 + V2 + brain) ─────────────────────────────
    await wipe('ng_scaffold_events')
    await wipe('ng_memory')             // V2 memory engine
    await wipe('ng_daily')              // nightly brain output
    await wipe('ng_radio_segments')     // radio content references old frontier
    await wipe('ng_missions')           // mission shelf
    await wipe('ng_brain_log')          // thought stream
    await wipe('ng_heartbeat_state')    // watcher state
    await wipe('ng_intelligence_sessions')
    await wipe('ng_milestones')
    await wipe('write_log')
    // Knowledge graph is content-derived, not progress — kept.

    // ── Earned scaffolds (generated from progress) are orphaned rewards ──
    const{error:hybErr}=await sb.from('ng_scaffolds').delete()
      .eq('user_id',UID).in('source',['hybrid','self_extend'])
    if(!hybErr)wiped.push('earned scaffolds (hybrid/self-extend)')

    // ── Profile: zero every progress field, keep prefs ─────────────────
    const{error:profileErr}=await sb.from('ng_learner_profile').upsert({
      user_id:UID,
      phase:1,phase_name:'Survival → Social',phase_progress:0,
      frontier:[],controlled:[],
      error_fingerprint:{},avoided_patterns:[],scaffold_avoidance:[],
      session_history:[],            // ARRAY — matches current format
      luna_notes:'',personality_profile:{},
      field_reports:[],struggle_patterns:{},priority_boosts:{},
      pending_hybrids:[],luna_chat_history:[],
      metrics_snapshot:null,last_intelligence_insights:'',
      show_bible:'',placement_done:false,confidence_log:[],
      last_hybrid_date:null,
      version:0,last_updated:new Date().toISOString()
      // radio_station_prompt intentionally kept — it's a preference
    },{onConflict:'user_id'})
    if(profileErr)console.log('Profile reset error:',profileErr.message)
    else wiped.push('profile progress fields')

    // ── Scaffold stage flags — keep content, clear acquisition markers ──
    const{data:scaffolds}=await sb.from('ng_scaffolds').select('id,stages').eq('user_id',UID)
    let scaffoldsReset=0
    for(const sc of(scaffolds||[])){
      const resetStages=(sc.stages||[])
        .filter(s=>!s.generated)
        .map(s=>({...s,acquired:false,acquired_at:null,practice_count:0,modes_used:[]}))
      const{error}=await sb.from('ng_scaffolds')
        .update({stages:resetStages,current_stage:1}).eq('id',sc.id).eq('user_id',UID)
      if(!error)scaffoldsReset++
    }

    return{statusCode:200,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ok:true,scaffolds_reset:scaffoldsReset,wiped,
        message:'Full reset complete across all systems. Content bank + knowledge graph intact.'})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
