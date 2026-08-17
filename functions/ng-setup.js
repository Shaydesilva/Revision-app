const LANG=require('./lang.cjs')
// ng-setup.js — Primeiro Dia state machine.
// Tracks setup_state: new -> world -> planting -> organizing -> placement -> done.
// Resumable: the client asks 'status' and jumps to the right step.
const{createClient}=require('@supabase/supabase-js')
let UID=LANG.uidFromEvent() // reassigned per request in the handler
const STEPS=['new','world','planting','organizing','placement','done']
exports.handler=async(event)=>{
  UID=LANG.uidFromEvent(event) // Rio or Paisa bank
  const PACK=LANG.packFromEvent(event)
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{action,state,life_context}=JSON.parse(event.body||'{}')

    // Primeiro Dia is the RIO onboarding — its copy is Portuguese and its
    // planting step fires the Portuguese curriculum seeder. Any other pack
    // arrives with its own floor already planted, so it is 'done' on arrival.
    // (Without this, a fresh bank sat in the Portuguese wizard forever.)
    if(PACK.id!=='pt-rio')return{statusCode:200,body:JSON.stringify({state:'done',skipped:'non-rio pack'})}

    if(action==='status'){
      const{data:p}=await sb.from('ng_learner_profile').select('setup_state,placement_done').eq('user_id',UID).single()
      // Back-compat: an existing user with real progress but no setup_state is 'done'.
      let s=p?.setup_state
      if(!s){
        const{count}=await sb.from('ng_scaffold_events').select('id',{count:'exact',head:true}).eq('user_id',UID)
        s=(count>0||p?.placement_done)?'done':'new'
        // UPSERT, not update: an UPDATE against a bank with no profile row yet is
        // a silent no-op, so the state never persisted and the wizard reopened
        // on every single launch. That was the inescapable loop.
        await sb.from('ng_learner_profile').upsert({user_id:UID,setup_state:s},{onConflict:'user_id'})
      }
      return{statusCode:200,body:JSON.stringify({state:s})}
    }
    if(action==='set'){
      const patch={}
      if(state&&STEPS.includes(state))patch.setup_state=state
      if(typeof life_context==='string'&&life_context.trim())patch.life_context=life_context.trim()
      if(Object.keys(patch).length)await sb.from('ng_learner_profile').upsert({user_id:UID,...patch},{onConflict:'user_id'})
      return{statusCode:200,body:JSON.stringify({ok:true,...patch})}
    }
    return{statusCode:400,body:JSON.stringify({error:'unknown action'})}
  }catch(e){return{statusCode:500,body:JSON.stringify({error:e.message})}}
}
