// ng-placement-seed.js — the placement test's ONLY writes.
// Placement HYPOTHESIZES mastery, never grants it: priors capped at 2 days,
// failures write nothing (absence of evidence, not negative evidence).
const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'
exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const body=JSON.parse(event.body||'{}')
    if(body.action==='status'){
      const{data:p}=await sb.from('ng_learner_profile').select('placement_done').eq('user_id',UID).single()
      return{statusCode:200,body:JSON.stringify({done:!!p?.placement_done})}
    }
    const{results=[],phase=1}=body
    let seeded=0
    const now=Date.now()
    for(const r of results){
      if(!r.ok||!r.scaffold_id)continue
      const stab=r.skill==='production'?2:1 // CAPPED — provisional by design
      const due=new Date(now+stab*86400000).toISOString()
      const{error}=await sb.from('ng_memory').upsert({
        user_id:UID,scaffold_id:r.scaffold_id,stage:r.stage||1,skill:r.skill||'recognition',
        stability:stab,difficulty:5,last_review:new Date(now).toISOString(),next_due:due,reps:1,lapses:0
      },{onConflict:'user_id,scaffold_id,stage,skill'})
      if(!error)seeded++
    }
    await sb.from('ng_learner_profile').update({placement_done:true,setup_state:'done',phase:Math.max(1,Math.min(4,phase))}).eq('user_id',UID)
    try{await sb.from('ng_brain_log').insert({user_id:UID,process:'placement',importance:3,
      thought:`Placement complete: starting phase ${phase}, ${seeded} patterns seeded with PROVISIONAL priors (capped 2d — real reps must confirm within the week). The journey starts measured.`})}catch(_){}
    return{statusCode:200,body:JSON.stringify({ok:true,seeded,phase})}
  }catch(e){return{statusCode:500,body:JSON.stringify({error:e.message})}}
}
