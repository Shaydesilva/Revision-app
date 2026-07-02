// ng-graph-generate.js — One-time (re-runnable) knowledge graph generation
// Claude analyses the scaffold bank in batches and emits typed edges.
// Idempotent: upserts on (from,to,type).

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,proc,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:proc,thought,data,importance})}catch(_){}
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{batch=0,batchSize=40}=JSON.parse(event.body||'{}')

    const{data:scaffolds}=await sb.from('ng_scaffolds')
      .select('id,base_portuguese,base_english,category,context')
      .eq('user_id',UID).order('id')
    if(!scaffolds?.length)return{statusCode:200,body:JSON.stringify({error:'No scaffolds'})}

    const slice=scaffolds.slice(batch*batchSize,(batch+1)*batchSize)
    if(!slice.length)return{statusCode:200,body:JSON.stringify({ok:true,done:true,total_batches:Math.ceil(scaffolds.length/batchSize)})}

    // Full bank as reference (compact), batch as focus
    const bankRef=scaffolds.map(s=>`${s.id}: "${s.base_portuguese}" (${s.base_english}) [${s.category}]`).join('\n')
    const focusRef=slice.map(s=>s.id).join(', ')

    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',max_tokens:3000,
        system:`You build a knowledge graph over Carioca Portuguese patterns.
Edge types:
- synonym: interchangeable meaning ("bora"/"partiu")
- collocation: naturally said together ("bora"+"tamo atrasado")
- register_pair: formal↔Carioca versions of the same act ("vamos"/"bora")
- situational: same real-world situation (both live at the boteco)
- grammatical: same structural family (both movement contractions)
Strength 0.3-1.0. Only emit genuinely useful edges — quality over quantity, max ~6 per focus pattern.
Return JSON only: {"edges":[{"from":"id","to":"id","type":"synonym","strength":0.8}]}`,
        messages:[{role:'user',content:`FULL BANK:\n${bankRef}\n\nEMIT EDGES ONLY FOR THESE FROM-NODES (to-nodes may be anywhere in bank):\n${focusRef}`}]
      })
    })
    const data=await res.json()
    let edges=[]
    try{
      const parsed=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())
      edges=Array.isArray(parsed.edges)?parsed.edges:[]
    }catch(e){console.log('parse fail:',e.message)}

    const validIds=new Set(scaffolds.map(s=>s.id))
    const rows=edges
      .filter(e=>validIds.has(e.from)&&validIds.has(e.to)&&e.from!==e.to)
      .map(e=>({
        user_id:UID,from_scaffold:e.from,to_scaffold:e.to,
        edge_type:e.type||'situational',
        strength:Math.min(1,Math.max(0.1,e.strength||0.5))
      }))

    if(rows.length){
      await sb.from('ng_graph_edges').upsert(rows,{onConflict:'user_id,from_scaffold,to_scaffold,edge_type'})
    }

    const isLast=(batch+1)*batchSize>=scaffolds.length
    await brainLog(sb,'graph',isLast
      ?`Knowledge graph complete: final batch wrote ${rows.length} edges. The constellation is fully mapped.`
      :`Graph batch ${batch}: ${rows.length} relationships mapped (synonyms, collocations, register pairs).`,
      {batch,edges:rows.length},isLast?3:1)
    return{statusCode:200,body:JSON.stringify({
      ok:true,batch,edges_written:rows.length,
      next_batch:(batch+1)*batchSize<scaffolds.length?batch+1:null
    })}
  }catch(e){
    console.error('ng-graph-generate:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
