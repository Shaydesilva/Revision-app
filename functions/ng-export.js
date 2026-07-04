// ng-export.js — full backup of the learning journey as one JSON.
// Additive, read-only. Your months of memory data deserve an exit door.
const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

exports.handler=async(event)=>{
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const grab=async(table,order,limit)=>{
      try{
        let q=sb.from(table).select('*').eq('user_id',UID)
        if(order)q=q.order(order,{ascending:false})
        if(limit)q=q.limit(limit)
        const{data}=await q
        return data||[]
      }catch(_){return[]}
    }
    const[profile,scaffolds,memory,events,units,daily,suggestions,milestones]=await Promise.all([
      grab('ng_learner_profile'),
      grab('ng_scaffolds'),
      grab('ng_memory'),
      grab('ng_scaffold_events','created_at',5000),
      grab('ng_path_units'),
      grab('ng_daily','date',60),
      grab('ng_suggestions','created_at',200),
      grab('ng_milestones','created_at',200)
    ])
    return{
      statusCode:200,
      headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="carioca-backup-${new Date().toISOString().slice(0,10)}.json"`},
      body:JSON.stringify({
        exported_at:new Date().toISOString(),
        version:'v1-freeze',
        counts:{scaffolds:scaffolds.length,memory:memory.length,events:events.length,units:units.length},
        profile,scaffolds,memory,events,units,daily,suggestions,milestones
      })
    }
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
