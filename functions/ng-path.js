// ng-path.js — The Learn path (Trilha)
// TIMEOUT-SAFE ARCHITECTURE: generation is chunked per-category using Haiku
// (fast), each chunk self-chains the next via absolute URL. 'get' never
// generates inline — it dispatches chunk 0 fire-and-forget and returns
// {bootstrapping:true}; the client polls until units land.

const{createClient}=require('@supabase/supabase-js')
const{REGISTER_LAW_GENERATE}=require('./register-law.cjs')
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
        body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:2400,
          system:`${REGISTER_LAW_GENERATE}\n\nCluster Carioca Portuguese patterns into 3-6 learning UNITS of 4-7 scaffolds each. MANDATORY: EVERY scaffold id in the list appears in EXACTLY one unit — omit NONE. Create more units rather than dropping any id. Each unit = a REAL Rio situation where those patterns live together (graph edges hint at relatedness). Order by phase. Every scaffold id appears in EXACTLY one unit. Portuguese titles, punchy. JSON only:
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
      // Coverage guarantee: any id the model dropped still gets a home.
      {
        const placed=new Set();rows.forEach(r=>(r.scaffold_ids||[]).forEach(id=>placed.add(id)))
        const leftovers=[...catIds].filter(id=>!placed.has(id))
        for(let li=0;li<leftovers.length;li+=6){
          rows.push({user_id:UID,unit_id:(cat+'_extra_'+chunk+'_'+(li/6)).slice(0,60),
            title:'Da rua · '+cat.replace(/_/g,' ')+' '+['I','II','III','IV','V','VI','VII','VIII'][Math.floor(li/6)%8],emoji:'📦',
            situation:'Padrões ainda sem casa — pratique; o cérebro reagrupa com o tempo',
            scaffold_ids:leftovers.slice(li,li+6),
            sort_order:chunk*100+60+Math.floor(li/6),is_side_quest:false})
        }
      }
      if(rows.length)await sb.from('ng_path_units').upsert(rows,{onConflict:'user_id,unit_id'})
      await brainLog(sb,'path',`Trilha chunk ${chunk+1}/${cats.length} ("${cat}"): ${rows.length} units built.`,null,1)
      // Best-effort self-chain with awaited send (client also drives the chain)
      if(siteUrl){
        try{
          const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),1200)
          await fetch(`${siteUrl}/.netlify/functions/ng-path`,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({action:'generate',chunk:chunk+1}),signal:ac.signal
          }).catch(()=>{});clearTimeout(tm)
        }catch(_){}
      }
      return{statusCode:200,body:JSON.stringify({ok:true,chunk,units_written:rows.length,next:chunk+1<cats.length?chunk+1:null})}
    }

    // ═══ LEVEL UP — the unit evolves: new, harder patterns forged live ═══
    if(action==='level_up'){
      const{unit_id}=JSON.parse(event.body||'{}')
      const{data:unit}=await sb.from('ng_path_units').select('*').eq('user_id',UID).eq('unit_id',unit_id).single()
      if(!unit)return{statusCode:404,body:JSON.stringify({error:'Unit not found'})}
      // Server-side gate: every current pattern solid + 72h cooldown passed
      const ids=Array.isArray(unit.scaffold_ids)?unit.scaffold_ids:[]
      const{data:mem}=await sb.from('ng_memory').select('scaffold_id,stability')
        .eq('user_id',UID).eq('skill','production').in('scaffold_id',ids)
      const stab={};(mem||[]).forEach(m=>{if(!stab[m.scaffold_id]||m.stability>stab[m.scaffold_id])stab[m.scaffold_id]=m.stability})
      const allSolid=ids.length>0&&ids.every(id=>(stab[id]||0)>=(unit.threshold_days||7))
      const hoursSince=unit.completed_at?(Date.now()-new Date(unit.completed_at).getTime())/3600000:0
      if(!allSolid||hoursSince<72)return{statusCode:400,body:JSON.stringify({error:'Not ready — patterns must be solid and 72h must pass since completion.'})}

      const[{data:scRows},{data:profile}]=await Promise.all([
        sb.from('ng_scaffolds').select('id,base_portuguese,base_english,phase,category,context').eq('user_id',UID).in('id',ids),
        sb.from('ng_learner_profile').select('error_fingerprint,struggle_patterns,phase,life_context').eq('user_id',UID).single()
      ])
      const current=(scRows||[]).map(s=>`"${s.base_portuguese}" (${s.base_english})`).join('\n')
      const maxPhase=Math.max(1,...(scRows||[]).map(s=>s.phase||1))
      const cat=(scRows||[])[0]?.category||'social_foundation'
      const struggles=Object.keys(profile?.error_fingerprint||{}).slice(0,5).join(', ')||'none logged'

      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1400,
          system:`${REGISTER_LAW_GENERATE}\n\nYou evolve a Carioca Portuguese learning unit to its next level. The learner MASTERED the current patterns — design 4-5 NEW, harder ones for the SAME situation: longer chains, faster register, more idiomatic/street, weave in their weak spots. Portuguese must be authentic Rio street register — real gíria a Carioca says TODAY, never textbook-flavored or invented slang. If unsure a construction is natural, choose a simpler one that definitely is. JSON only:
{"scaffolds":[{"base_portuguese":"","base_english":"","stages":[{"pt":"","en":""},{"pt":"","en":""},{"pt":"","en":""}]}]}
Stages escalate: 1 core → 2 extended → 3 full street flow.`,
          messages:[{role:'user',content:`UNIT: "${unit.title}" — ${unit.situation}\nEVOLVING: level ${unit.level||1} → ${(unit.level||1)+1}\nMASTERED PATTERNS:\n${current}\nLEARNER WEAK SPOTS: ${struggles}\nLEARNER LIFE (principles — draw scenarios from these THEMES, never invent private people): ${profile?.life_context||'general Rio life'}`}]})
      })
      const data=await res.json()
      let gen=[]
      try{gen=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim()).scaffolds||[]}catch(_){}
      if(!gen.length)return{statusCode:500,body:JSON.stringify({error:'Evolution generation failed — try again.'})}
      const newIds=[]
      for(const g of gen.slice(0,5)){
        const id='sc_lvl_'+Date.now()+'_'+Math.random().toString(36).slice(2,5)
        const{error}=await sb.from('ng_scaffolds').insert({
          id,user_id:UID,base_portuguese:g.base_portuguese,base_english:g.base_english||'',
          stages:(g.stages||[]).map((s,i)=>({stage:i+1,pt:s.pt,en:s.en,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})),
          current_stage:1,phase:Math.min(4,maxPhase+1),category:cat,
          context:unit.situation||'general',cluster:unit.unit_id,source:'self_extend',last_practiced:null
        })
        if(!error)newIds.push(id)
      }
      if(!newIds.length)return{statusCode:500,body:JSON.stringify({error:'Could not write evolved patterns'})}
      await sb.from('ng_path_units').update({
        levels:[...(Array.isArray(unit.levels)?unit.levels:[]),{level:unit.level||1,scaffold_ids:ids,completed_at:unit.completed_at}],
        scaffold_ids:newIds,
        level:(unit.level||1)+1,
        completed_at:null
      }).eq('id',unit.id)
      await brainLog(sb,'path',`"${unit.title}" evolved to level ${(unit.level||1)+1}: ${newIds.length} harder patterns forged from mastery + weak spots (${struggles}). The trilha grows.`,null,3)
      return{statusCode:200,body:JSON.stringify({ok:true,new_level:(unit.level||1)+1,added:newIds.length})}
    }

    // ═══ REDO LEVEL — post-facto rejection of an evolution (untouched only) ═══
    if(action==='redo_level'){
      const{unit_id}=JSON.parse(event.body||'{}')
      const{data:unit}=await sb.from('ng_path_units').select('*').eq('user_id',UID).eq('unit_id',unit_id).single()
      if(!unit||(unit.level||1)<2)return{statusCode:400,body:JSON.stringify({error:'Nothing to redo'})}
      const ids=Array.isArray(unit.scaffold_ids)?unit.scaffold_ids:[]
      const{count:evCount}=await sb.from('ng_scaffold_events')
        .select('id',{count:'exact',head:true}).eq('user_id',UID).in('scaffold_id',ids)
      if((evCount||0)>0)return{statusCode:400,body:JSON.stringify({error:'Level already practiced — it stays. Redo is for untouched evolutions only.'})}
      const hist=Array.isArray(unit.levels)?[...unit.levels]:[]
      const prev=hist.pop()
      if(!prev)return{statusCode:400,body:JSON.stringify({error:'No previous level archived'})}
      await sb.from('ng_scaffolds').delete().eq('user_id',UID).in('id',ids).eq('source','self_extend')
      await sb.from('ng_path_units').update({
        scaffold_ids:prev.scaffold_ids,levels:hist,
        level:prev.level,completed_at:prev.completed_at
      }).eq('id',unit.id)
      await brainLog(sb,'path',`"${unit.title}" evolution undone — level ${unit.level} scrapped untouched. The ↑ is live again; evolve when ready for a fresh forge.`,null,2)
      return{statusCode:200,body:JSON.stringify({ok:true,restored_level:prev.level})}
    }

    // ═══ GET — never generates inline; dispatches + reports bootstrapping ═══
    let{data:units}=await sb.from('ng_path_units').select('*').eq('user_id',UID).order('sort_order')
    if(!units?.length){
      const{count:scCount}=await sb.from('ng_scaffolds').select('id',{count:'exact',head:true}).eq('user_id',UID)
      if(!scCount)return{statusCode:200,body:JSON.stringify({units:[],bootstrapping:false,error:'No scaffolds in the bank yet'})}
      // THE AUTHORED CURRICULUM IS THE FOUNDATION — plant it, never AI-cluster
      // from scratch. Generation only ever EXTENDS (levels, orphan sweeps).
      try{
        const ctrl=new AbortController();setTimeout(()=>ctrl.abort(),1300)
        await fetch(process.env.URL+'/.netlify/functions/ng-seed-trilha',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:ctrl.signal}).catch(()=>{})
      }catch(_){}
      return{statusCode:200,body:JSON.stringify({units:[],bootstrapping:true,message:'Plantando o currículo autoral…'})}
      // Debounce: skip dispatch if a build started in the last 3 minutes
      const threeMin=new Date(Date.now()-3*60000).toISOString()
      const{data:recentGen}=await sb.from('ng_brain_log').select('id')
        .eq('user_id',UID).eq('process','path').gte('created_at',threeMin).limit(1)
      if(!(recentGen||[]).length){
        await brainLog(sb,'path','Building the Trilha: the app will walk the build chunk by chunk. Units appear as each category completes.',null,2)
      }
      // Client drives the chain (Lambda freeze drops un-awaited dispatches)
      return{statusCode:200,body:JSON.stringify({units:[],bootstrapping:true,client_should_build:true})}
    }

    const[{data:mem},{data:scaffolds}]=await Promise.all([
      sb.from('ng_memory').select('scaffold_id,skill,stability').eq('user_id',UID).eq('skill','production'),
      sb.from('ng_scaffolds').select('id,base_portuguese,base_english').eq('user_id',UID)
    ])
    const stab={};(mem||[]).forEach(m=>{if(!stab[m.scaffold_id]||m.stability>stab[m.scaffold_id])stab[m.scaffold_id]=m.stability})
    const scMap={};(scaffolds||[]).forEach(s=>{scMap[s.id]=s})
    const COOLDOWN_H=72 // level-up cooldown: memory needs to settle (spacing effect)
    let currentAssigned=false
    const stampQueue=[]
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
      // Level machinery: stamp first completion of the CURRENT level;
      // gate the upgrade behind a 72h cooldown so mastery has to survive sleep.
      let completedAt=u.completed_at
      if(pct>=100&&!completedAt){completedAt=new Date().toISOString();stampQueue.push({id:u.id,completed_at:completedAt})}
      const hoursSince=completedAt?(Date.now()-new Date(completedAt).getTime())/3600000:0
      const level_ready=pct>=100&&completedAt&&hoursSince>=COOLDOWN_H
      const level_wait_hours=pct>=100&&!level_ready?Math.max(0,Math.ceil(COOLDOWN_H-hoursSince)):0
      return{...u,patterns:per,pct,status,level:u.level||1,level_ready,level_wait_hours,completed_at:completedAt}
    })
    for(const s of stampQueue){await sb.from('ng_path_units').update({completed_at:s.completed_at}).eq('id',s.id)}
    return{statusCode:200,body:JSON.stringify({units:enriched})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
