// ng-path.js — The Learn path (Trilha)
// Units = knowledge-graph clusters bound to real Rio situations.
// Gates = memory-verified production stability (can decay → unit reopens).
// Self-bootstraps on first load. Nightly brain reorders + injects side-quests.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,proc,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:proc,thought,data,importance})}catch(_){}
}

async function generateUnits(sb){
  const[{data:scaffolds},{data:edges}]=await Promise.all([
    sb.from('ng_scaffolds').select('id,base_portuguese,base_english,category,phase').eq('user_id',UID),
    sb.from('ng_graph_edges').select('from_scaffold,to_scaffold,strength').eq('user_id',UID)
  ])
  if(!scaffolds?.length)return{error:'No scaffolds'}
  const bank=scaffolds.map(s=>`${s.id}|P${s.phase}|${s.category}|"${s.base_portuguese}" (${s.base_english})`).join('\n')
  const edgeRef=(edges||[]).slice(0,400).map(e=>`${e.from_scaffold}→${e.to_scaffold}`).join(', ')
  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:4000,
      system:`You design a learning path ("Trilha") for Carioca Portuguese from a pattern bank + relationship graph.
Cluster patterns into 10-16 UNITS of 4-7 scaffolds each. Each unit is a REAL Rio situation where those patterns live together (use graph edges + categories + phases as clustering signal). Order units by phase then natural dependency — early units = survival/social basics.
Every scaffold id appears in EXACTLY one unit. Titles in Portuguese, punchy. Return JSON only:
{"units":[{"unit_id":"chegando_no_boteco","title":"Chegando no boteco","emoji":"🍺","situation":"Walking in, grabbing a table, first round","scaffold_ids":["id1","id2"]}]}`,
      messages:[{role:'user',content:`BANK:\n${bank}\n\nGRAPH EDGES (related pairs):\n${edgeRef}`}]})
  })
  const data=await res.json()
  let units=[]
  try{units=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim()).units||[]}catch(_){}
  if(!units.length)return{error:'Generation failed'}
  const validIds=new Set(scaffolds.map(s=>s.id))
  const rows=units.map((u,i)=>({
    user_id:UID,unit_id:u.unit_id||('unit_'+i),title:u.title||('Unit '+(i+1)),
    emoji:u.emoji||'📍',situation:u.situation||'',
    scaffold_ids:(u.scaffold_ids||[]).filter(id=>validIds.has(id)),
    sort_order:i,is_side_quest:false
  })).filter(r=>r.scaffold_ids.length)
  await sb.from('ng_path_units').upsert(rows,{onConflict:'user_id,unit_id'})
  await brainLog(sb,'path',`Trilha generated: ${rows.length} units clustered from the knowledge graph, each bound to a real Rio situation. The path is live.`,{units:rows.length},3)
  return{ok:true,units:rows.length}
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{action='get'}=JSON.parse(event.body||'{}')

    if(action==='generate'){
      const r=await generateUnits(sb)
      return{statusCode:200,body:JSON.stringify(r)}
    }

    // GET — units + live memory-verified progress
    let{data:units}=await sb.from('ng_path_units').select('*').eq('user_id',UID).order('sort_order')
    if(!units?.length){
      // Self-bootstrap — no setup buttons, ever
      const r=await generateUnits(sb)
      if(r.error)return{statusCode:200,body:JSON.stringify({units:[],bootstrapping:false,error:r.error})}
      const{data:fresh}=await sb.from('ng_path_units').select('*').eq('user_id',UID).order('sort_order')
      units=fresh||[]
    }
    const[{data:mem},{data:scaffolds}]=await Promise.all([
      sb.from('ng_memory').select('scaffold_id,skill,stability').eq('user_id',UID).eq('skill','production'),
      sb.from('ng_scaffolds').select('id,base_portuguese,base_english').eq('user_id',UID)
    ])
    const stab={};(mem||[]).forEach(m=>{if(!stab[m.scaffold_id]||m.stability>stab[m.scaffold_id])stab[m.scaffold_id]=m.stability})
    const scMap={};(scaffolds||[]).forEach(s=>{scMap[s.id]=s})

    let currentAssigned=false
    const enriched=(units||[]).map(u=>{
      const ids=Array.isArray(u.scaffold_ids)?u.scaffold_ids:[]
      const per=ids.map(id=>({
        scaffold_id:id,
        pt:scMap[id]?.base_portuguese||id,en:scMap[id]?.base_english||'',
        stability:stab[id]||0,
        solid:(stab[id]||0)>=u.threshold_days
      }))
      const solidCount=per.filter(p=>p.solid).length
      const started=per.some(p=>p.stability>0)
      const pct=ids.length?Math.round(solidCount/ids.length*100):0
      let status=pct>=100?'complete':started?'in_progress':'locked'
      if(status==='locked'&&!currentAssigned){status='current';currentAssigned=true}
      if(status==='in_progress')currentAssigned=true
      return{...u,patterns:per,pct,status}
    })
    return{statusCode:200,body:JSON.stringify({units:enriched})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
