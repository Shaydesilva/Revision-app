// ng-setup.js — Primeiro Dia state machine.
// Tracks setup_state: new -> world -> planting -> organizing -> placement -> done.
// Resumable: the client asks 'status' and jumps to the right step.
const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'
const STEPS=['new','world','planting','organizing','placement','done']
exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{action,state,life_context}=JSON.parse(event.body||'{}')
    if(action==='status'){
      const{data:p}=await sb.from('ng_learner_profile').select('setup_state,placement_done').eq('user_id',UID).single()
      // Back-compat: an existing user with real progress but no setup_state is 'done'.
      let s=p?.setup_state
      if(!s){
        const{count}=await sb.from('ng_scaffold_events').select('id',{count:'exact',head:true}).eq('user_id',UID)
        s=(count>0||p?.placement_done)?'done':'new'
        await sb.from('ng_learner_profile').update({setup_state:s}).eq('user_id',UID)
      }
      return{statusCode:200,body:JSON.stringify({state:s})}
    }
    if(action==='set'){
      const patch={}
      if(state&&STEPS.includes(state))patch.setup_state=state
      if(typeof life_context==='string'&&life_context.trim())patch.life_context=life_context.trim()
      if(Object.keys(patch).length)await sb.from('ng_learner_profile').update(patch).eq('user_id',UID)
      return{statusCode:200,body:JSON.stringify({ok:true,...patch})}
    }
    return{statusCode:400,body:JSON.stringify({error:'unknown action'})}
  }catch(e){return{statusCode:500,body:JSON.stringify({error:e.message})}}
}
