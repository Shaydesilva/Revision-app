// ng-path.js — The Learn path (Trilha)
// TIMEOUT-SAFE ARCHITECTURE: generation is chunked per-category using Haiku
// (fast), each chunk self-chains the next via absolute URL. 'get' never
// generates inline — it dispatches chunk 0 fire-and-forget and returns
// {bootstrapping:true}; the client polls until units land.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,proc,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:proc,thought,data,importance})}catch(_){}
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{action='get',chunk=0}=JSON.parse(event.body||'{}')
    const siteUrl=process.env.URL||process.env.DEPLOY_URL||''

    // ═══ GENERATE — one category per request, Haiku-fast, self-chaining ═══
    if(action==='generate'){
      const[{data:scaffolds},{data:edges}]=await Promise.all([
        sb.from('ng_scaffolds').select('id,base_portuguese,base_english,category,phase').eq('user_id',UID),
        sb.from('ng_graph_edges').select('from_scaffold,to_scaffold').eq('user_id',UID)
      ])
      if(!scaffolds?.length)return{statusCode:200,body:JSON.stringify({error:'No scaffolds'})}
      const cats=[...new Set(scaffolds.map(s=>s.category||'social_foundation'))].sort()
      if(chunk>=cats.length){
        await brainLog(sb,'path',`Trilha complete: all ${cats.length} category chunks clustered into units. The path is live.`,null,3)
        return{statusCode:200,body:JSON.stringify({ok:true,done:true})}
      }
      const cat=cats[chunk]
      const catSc=scaffolds.filter(s=>(s.category||'social_foundation')===cat)
      const catIds=new Set(catSc.map(s=>s.id))
      const catEdges=(edges||[]).filter(e=>catIds.has(e.from_scaffold)&&catIds.has(e.to_scaffold))
        .slice(0,150).map(e=>`${e.from_scaffold}→${e.to_scaffold}`).join(', ')
      const bank=catSc.map(s=>`${s.id}|P${s.phase}|"${s.base_portuguese}" (${s.base_english})`).join('\n')

      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1200,
          system:`Cluster Carioca Portuguese patterns into learning UNITS of 4-7 scaffolds. Each unit = a REAL Rio situation where those patterns live together (graph edges hint at relatedness). Order by phase. Every scaffold id appears in EXACTLY one unit. Portuguese titles, punchy. JSON only:
{"units":[{"unit_id":"snake_case_id","title":"","emoji":"🍺","situation":"one line in English","scaffold_ids":[]}]}`,
          messages:[{role:'user',content:`CATEGORY: ${cat}\nPATTERNS:\n${bank}\nRELATED PAIRS: ${catEdges||'none'}`}]})
      })
      const data=await res.json()
      let units=[]
      try{units=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim()).units||[]}catch(_){}
      const rows=units.map((u,i)=>({
        user_id:UID,unit_id:(u.unit_id||cat+'_'+i).slice(0,60),
        title:u.title||('Unidade '+(i+1)),emoji:u.emoji||'📍',situation:u.situation||'',
        scaffold_ids:(u.scaffold_ids||[]).filter(id=>catIds.has(id)),
        sort_order:chunk*100+i,is_side_quest:false
      })).filter(r=>r.scaffold_ids.length)
      if(rows.length)await sb.from('ng_path_units').upsert(rows,{onConflict:'user_id,unit_id'})
      await brainLog(sb,'path',`Trilha chunk ${chunk+1}/${cats.length} ("${cat}"): ${rows.length} units built.`,null,1)
      // Self-chain the next category
      if(siteUrl)fetch(`${siteUrl}/.netlify/functions/ng-path`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'generate',chunk:chunk+1})
      }).catch(()=>{})
      return{statusCode:200,body:JSON.stringify({ok:true,chunk,units_written:rows.length,next:chunk+1<cats.length?chunk+1:null})}
    }

    // ═══ GET — never generates inline; dispatches + reports bootstrapping ═══
    let{data:units}=await sb.from('ng_path_units').select('*').eq('user_id',UID).order('sort_order')
    if(!units?.length){
      const{count:scCount}=await sb.from('ng_scaffolds').select('id',{count:'exact',head:true}).eq('user_id',UID)
      if(!scCount)return{statusCode:200,body:JSON.stringify({units:[],bootstrapping:false,error:'No scaffolds in the bank yet'})}
      // Debounce: skip dispatch if a build started in the last 3 minutes
      const threeMin=new Date(Date.now()-3*60000).toISOString()
      const{data:recentGen}=await sb.from('ng_brain_log').select('id')
        .eq('user_id',UID).eq('process','path').gte('created_at',threeMin).limit(1)
      if(!(recentGen||[]).length){
        await brainLog(sb,'path','Building the Trilha: clustering the bank into situation units, one category at a time. Units appear as chunks complete.',null,2)
        if(siteUrl)fetch(`${siteUrl}/.netlify/functions/ng-path`,{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'generate',chunk:0})
        }).catch(()=>{})
      }
      return{statusCode:200,body:JSON.stringify({units:[],bootstrapping:true})}
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
        scaffold_id:id,pt:scMap[id]?.base_portuguese||id,en:scMap[id]?.base_english||'',
        stability:stab[id]||0,solid:(stab[id]||0)>=u.threshold_days,
        progress:Math.min(1,(stab[id]||0)/u.threshold_days)
      }))
      const started=per.some(p=>p.stability>0)
      // Continuous: every rep visibly moves the unit — no dead bars
      const pct=ids.length?Math.round(per.reduce((s,p)=>s+p.progress,0)/ids.length*100):0
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
