// ng-today.js — serves today's nightly-brain output to the client
// Returns coach note, pre-assembled workout, fluency dials, dialogue, missions shelf

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const body=JSON.parse(event.body||'{}')
    const{action='get'}=body
    const today=new Date(Date.now()-3*3600000).toISOString().slice(0,10)

    if(action==='get'){
      const[{data:daily},{data:missions}]=await Promise.all([
        sb.from('ng_daily').select('*').eq('user_id',UID).eq('date',today).single(),
        sb.from('ng_missions').select('*').eq('user_id',UID).eq('status','shelf').order('created_at',{ascending:false}).limit(4)
      ])
      // Fall back to most recent daily if today's hasn't run yet
      let d=daily
      if(!d){
        const{data:latest}=await sb.from('ng_daily').select('*').eq('user_id',UID)
          .order('date',{ascending:false}).limit(1).single()
        d=latest
      }
      return{statusCode:200,body:JSON.stringify({
        date:d?.date||null,is_today:d?.date===today,
        coach_note:d?.coach_note||'',workout:d?.workout||null,
        fluency_dials:d?.fluency_dials||null,dialogue:d?.dialogue||null,
        week_recap:d?.week_recap||null,missions:missions||[]
      })}
    }

    if(action==='mission_done'||action==='mission_dismiss'){
      const{mission_id}=body
      if(mission_id){
        await sb.from('ng_missions').update({
          status:action==='mission_done'?'done':'dismissed',
          completed_at:action==='mission_done'?new Date().toISOString():null
        }).eq('id',mission_id)
      }
      return{statusCode:200,body:JSON.stringify({ok:true})}
    }

    return{statusCode:400,body:JSON.stringify({error:'Unknown action'})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
