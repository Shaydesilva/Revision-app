// ng-priority-boost.js — star priority + failure boost
// Stored in profile.priority_boosts: {scaffold_id: boost_value}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'
    const{scaffold_id,boost_type='star',remove=false}=JSON.parse(event.body||'{}')
    if(!scaffold_id)return{statusCode:400,body:JSON.stringify({error:'No scaffold_id'})}

    const{data:profile}=await sb.from('ng_learner_profile').select('priority_boosts').eq('user_id',UID).single()
    const boosts={...(profile?.priority_boosts||{})}

    if(remove){
      delete boosts[scaffold_id]
    }else{
      const BOOST={star:8,failure:4}
      const current=boosts[scaffold_id]||0
      boosts[scaffold_id]=Math.min(current+(BOOST[boost_type]||4),20) // cap at 20
    }

    const{error:wErr}=await sb.from('ng_learner_profile').update({priority_boosts:boosts}).eq('user_id',UID)
    if(wErr)return{statusCode:500,body:JSON.stringify({error:wErr.message})}

    return{statusCode:200,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ok:true,boosts,scaffold_id,action:remove?'removed':boost_type})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
