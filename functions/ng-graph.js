// ng-graph.js — Graph read API: neighbours, clusters, propagation credits
const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{action='neighbours',scaffold_id=null}=JSON.parse(event.body||'{}')

    if(action==='neighbours'&&scaffold_id){
      const{data:out}=await sb.from('ng_graph_edges').select('*')
        .eq('user_id',UID).eq('from_scaffold',scaffold_id)
      const{data:inc}=await sb.from('ng_graph_edges').select('*')
        .eq('user_id',UID).eq('to_scaffold',scaffold_id)
      return{statusCode:200,body:JSON.stringify({outgoing:out||[],incoming:inc||[]})}
    }

    if(action==='full'){
      const{data:edges}=await sb.from('ng_graph_edges').select('from_scaffold,to_scaffold,edge_type,strength').eq('user_id',UID)
      return{statusCode:200,body:JSON.stringify({edges:edges||[]})}
    }

    // propagate: after acquiring a node, give small stability credit to strong neighbours
    if(action==='propagate'&&scaffold_id){
      const{data:edges}=await sb.from('ng_graph_edges').select('to_scaffold,strength')
        .eq('user_id',UID).eq('from_scaffold',scaffold_id).gte('strength',0.6)
      let credited=0
      for(const e of(edges||[])){
        const{data:mem}=await sb.from('ng_memory').select('id,stability')
          .eq('user_id',UID).eq('scaffold_id',e.to_scaffold).eq('stage',1).eq('skill','recognition').single()
        if(mem){
          await sb.from('ng_memory').update({
            stability:Math.min(365,mem.stability*(1+e.strength*0.15)),
            updated_at:new Date().toISOString()
          }).eq('id',mem.id)
          credited++
        }
      }
      return{statusCode:200,body:JSON.stringify({ok:true,credited})}
    }

    return{statusCode:400,body:JSON.stringify({error:'Unknown action'})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
