// ng-suggest.js — THE UNIFIED SUGGESTION PIPELINE
// Law: nothing enters the bank unseen. Every surface proposes here;
// the analyzer places the phrase (base / above / below / extend existing),
// and the verbatim tapped phrase ALWAYS survives as a stage.
// Rejections are consequence-free (no analyzer learning) by design.

const{createClient}=require('@supabase/supabase-js')
const{REGISTER_LAW_GENERATE}=require('./register-law.cjs')
const UID='00000000-0000-0000-0000-000000000001'
async function brainLog(sb,thought,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:'suggest',thought,importance})}catch(_){}
}
const stageFlags=s=>({...s,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})
const norm=t=>(t||'').toLowerCase().replace(/[.,!?…]/g,'').replace(/\s+/g,' ').trim()

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const body=JSON.parse(event.body||'{}')
    const{action='propose'}=body

    // ── LIST pending ─────────────────────────────────────────────────
    if(action==='list'){
      const{data}=await sb.from('ng_suggestions').select('*')
        .eq('user_id',UID).eq('status','pending').order('created_at',{ascending:false}).limit(20)
      return{statusCode:200,body:JSON.stringify({suggestions:data||[]})}
    }

    // ── RESOLVE BULK — batch verdicts (Victor import review) ─────────
    if(action==='resolve_bulk'){
      const{ids=[],verdict='approve'}=body
      if(!ids.length)return{statusCode:400,body:JSON.stringify({error:'No ids'})}
      if(verdict==='reject'){
        await sb.from('ng_suggestions').update({status:'rejected'}).eq('user_id',UID).in('id',ids)
        return{statusCode:200,body:JSON.stringify({ok:true,rejected:ids.length})}
      }
      let approved=0
      for(const sid of ids.slice(0,60)){
        const{data:sug}=await sb.from('ng_suggestions').select('*').eq('user_id',UID).eq('id',sid).single()
        if(!sug||sug.status!=='pending')continue
        const p=sug.payload||{}
        const scf=p.scaffold||{}
        const stages=(scf.stages||[]).map((st,i)=>({stage:i+1,pt:st.pt,en:st.en,acquired:false,acquired_at:null,practice_count:0,modes_used:[]}))
        if(!stages.length)continue
        const id='sc_sug_'+Date.now()+'_'+Math.random().toString(36).slice(2,5)
        const{error}=await sb.from('ng_scaffolds').insert({
          id,user_id:UID,base_portuguese:stages[0].pt,base_english:stages[0].en||scf.base_english||'',
          stages,current_stage:1,phase:scf.phase||1,category:scf.category||'social_foundation',
          context:scf.context||sug.source||'general',cluster:'suggested',source:sug.source||'suggested',last_practiced:null
        })
        if(error)continue
        approved++
        if(p.curriculum_unit){
          try{
            const{data:u}=await sb.from('ng_path_units').select('id,scaffold_ids').eq('user_id',UID).eq('unit_id',p.curriculum_unit).single()
            if(u)await sb.from('ng_path_units').update({scaffold_ids:[...(u.scaffold_ids||[]),id]}).eq('id',u.id)
          }catch(_){}
        }
        await sb.from('ng_suggestions').update({status:'approved'}).eq('id',sug.id)
      }
      await brainLog(sb,`Import review: ${approved} patterns approved into the bank.`,2)
      return{statusCode:200,body:JSON.stringify({ok:true,approved,boosted:Object.keys(boosts).length})}
    }

    // ── RESOLVE ──────────────────────────────────────────────────────
    if(action==='resolve'){
      const{suggestion_id,verdict,make_base=false}=body
      const{data:sug}=await sb.from('ng_suggestions').select('*')
        .eq('user_id',UID).eq('id',suggestion_id).single()
      if(!sug)return{statusCode:404,body:JSON.stringify({error:'Suggestion not found'})}
      if(verdict==='reject'){
        await sb.from('ng_suggestions').update({status:'rejected'}).eq('id',sug.id)
        return{statusCode:200,body:JSON.stringify({ok:true,rejected:true})}
      }
      const p=sug.payload||{}
      if(p.decision==='extend_existing'&&p.extension){
        const{data:sc}=await sb.from('ng_scaffolds').select('id,stages')
          .eq('user_id',UID).eq('id',p.extension.scaffold_id).single()
        if(!sc)return{statusCode:404,body:JSON.stringify({error:'Target scaffold gone'})}
        let stages=Array.isArray(sc.stages)?[...sc.stages]:[]
        const ns=stageFlags({pt:p.extension.new_stage.pt,en:p.extension.new_stage.en})
        if(p.extension.position==='below')stages.unshift(ns);else stages.push(ns)
        stages=stages.map((s,i)=>({...s,stage:i+1}))
        await sb.from('ng_scaffolds').update({stages}).eq('id',sc.id)
        await sb.from('ng_suggestions').update({status:'approved'}).eq('id',sug.id)
        await brainLog(sb,`Suggestion approved: "${sug.phrase}" extended existing pattern (${p.extension.position||'above'}).`,2)
        return{statusCode:200,body:JSON.stringify({ok:true,extended:p.extension.scaffold_id})}
      }
      // new scaffold
      const scf=p.scaffold||{}
      let stages=(scf.stages||[]).map(s=>({pt:s.pt,en:s.en}))
      if(make_base&&typeof p.tapped_stage==='number'&&p.tapped_stage>0){
        const t=stages.splice(p.tapped_stage,1)[0];stages.unshift(t)
      }
      stages=stages.map((s,i)=>stageFlags({stage:i+1,pt:s.pt,en:s.en}))
      // Victor recency: the doc's day number rides on every brick it produced.
      if(p.source_day!=null)stages=stages.map(s=>({...s,source_day:p.source_day}))
      const id='sc_sug_'+Date.now()+'_'+Math.random().toString(36).slice(2,5)
      const{error}=await sb.from('ng_scaffolds').insert({
        id,user_id:UID,
        base_portuguese:stages[0]?.pt||sug.phrase,
        base_english:stages[0]?.en||scf.base_english||'',
        stages,current_stage:1,
        phase:scf.phase||1,category:scf.category||'social_foundation',
        context:scf.context||sug.source||'general',cluster:'suggested',
        source:sug.source||'suggested',last_practiced:null
      })
      if(error)return{statusCode:500,body:JSON.stringify({error:error.message})}
      // Curriculum-authored scaffolds attach to their unit (the spine fills itself)
      if(p.curriculum_unit){
        try{
          const{data:u}=await sb.from('ng_path_units').select('id,scaffold_ids').eq('user_id',UID).eq('unit_id',p.curriculum_unit).single()
          if(u)await sb.from('ng_path_units').update({scaffold_ids:[...(u.scaffold_ids||[]),id]}).eq('id',u.id)
        }catch(_){}
      }
      await sb.from('ng_suggestions').update({status:'approved'}).eq('id',sug.id)
      await brainLog(sb,`Suggestion approved: new pattern "${stages[0]?.pt}" (${stages.length} stages) from ${sug.source}. Verbatim phrase preserved at stage ${(make_base?1:(p.tapped_stage||0)+1)}.`,2)
      return{statusCode:200,body:JSON.stringify({ok:true,scaffold_id:id})}
    }

    // ── PROPOSE — the analyzer ───────────────────────────────────────
    const{phrase='',translation='',context_sentence='',source='unknown'}=body
    if(!phrase.trim())return{statusCode:400,body:JSON.stringify({error:'No phrase'})}

    const{data:bank}=await sb.from('ng_scaffolds')
      .select('id,base_portuguese,base_english,stages,category').eq('user_id',UID)
    // Hard dedupe: verbatim already a base or a stage anywhere
    const np=norm(phrase)
    for(const sc of(bank||[])){
      if(norm(sc.base_portuguese)===np)
        return{statusCode:200,body:JSON.stringify({duplicate:true,existing:{id:sc.id,base:sc.base_portuguese}})}
      for(const st of(sc.stages||[]))
        if(norm(st.pt)===np)
          return{statusCode:200,body:JSON.stringify({duplicate:true,existing:{id:sc.id,base:sc.base_portuguese,at_stage:st.stage}})}
    }
    const{data:profile}=await sb.from('ng_learner_profile')
      .select('phase,controlled,life_context').eq('user_id',UID).single()
    const words=new Set(np.split(' '))
    const related=(bank||[]).filter(sc=>norm(sc.base_portuguese).split(' ').some(w=>w.length>2&&words.has(w))).slice(0,15)
    const sample=(bank||[]).slice(0,25)
    const ref=[...new Map([...related,...sample].map(s=>[s.id,s])).values()].slice(0,35)
      .map(s=>`${s.id}|"${s.base_portuguese}"|stages:${(s.stages||[]).map(x=>x.pt).join(' → ')}`).join('\n')

    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1100,
        system:`${REGISTER_LAW_GENERATE}\n\nYou are the scaffold analyzer for a Carioca Portuguese learner. A phrase was tapped in the wild. Decide its place in their pattern bank.

IRON LAW: the tapped phrase appears VERBATIM as one stage of whatever you propose. Never paraphrase it away.
RULES:
- The phrase is a SAMPLE from a difficulty ladder, not automatically the base. Simple phrase → it IS the base, build 1-2 harder stages above. Complex/street phrase → decompose BELOW it into simpler, complete, natural sayable utterances (semantic decomposition, never truncation), phrase sits at the top or near-top. Mid → build both directions.
- 2-4 stages total, each a complete natural thing a Carioca actually says.
- Judge difficulty relative to THIS learner: phase ${profile?.phase||1}, ${(profile?.controlled||[]).length} controlled stages.
- If the phrase clearly belongs as a new stage of an EXISTING pattern in the reference list, choose extend_existing instead of duplicating.
- If it looks like a transcription mishearing, keep the verbatim as required but add a "note" with the likely intended form.
JSON only:
{"decision":"new_scaffold"|"extend_existing",
 "scaffold":{"base_portuguese":"stage1 pt","base_english":"","category":"survival|grammar_core|identity|social|deep_fluency|personality_humour","context":"","phase":1,"stages":[{"pt":"","en":""}]},
 "tapped_stage":0,
 "extension":{"scaffold_id":"","new_stage":{"pt":"","en":""},"position":"above"|"below"},
 "note":""}`,
        messages:[{role:'user',content:`TAPPED PHRASE (verbatim, the law): "${phrase}"\nTRANSLATION: ${translation||'unknown'}\nHEARD IN: ${context_sentence||'no context'}\nSOURCE: ${source}\nLEARNER LIFE (theme principles for stage examples; never invent private people): ${profile?.life_context||'general Rio life'}\n\nBANK REFERENCE (for extend/dedupe decisions):\n${ref||'empty bank'}`}]})
    })
    const data=await res.json()
    let out=null
    try{out=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch(_){}
    if(!out||!out.decision)return{statusCode:500,body:JSON.stringify({error:'Analysis failed — try again'})}
    // Enforce the law server-side
    if(out.decision==='new_scaffold'){
      const stages=out.scaffold?.stages||[]
      const idx=stages.findIndex(s=>norm(s.pt)===np)
      if(idx<0){stages.push({pt:phrase,en:translation||''});out.tapped_stage=stages.length-1}
      else out.tapped_stage=idx
      out.scaffold.stages=stages.slice(0,4)
    }
    const{data:ins,error}=await sb.from('ng_suggestions').insert({
      user_id:UID,source,phrase,payload:out,status:'pending'
    }).select().single()
    if(error)return{statusCode:500,body:JSON.stringify({error:error.message})}
    await brainLog(sb,`Suggestion proposed from ${source}: "${phrase}" → ${out.decision==='extend_existing'?'extend existing pattern':'new '+((out.scaffold?.stages||[]).length)+'-stage ladder, phrase at stage '+((out.tapped_stage||0)+1)}. Awaiting your verdict.`,1)
    return{statusCode:200,body:JSON.stringify({ok:true,suggestion:ins})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
