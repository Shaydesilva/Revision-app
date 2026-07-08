// ng-import-scaffolds.js — VICTOR IMPORT v2: the notes decision engine.
// TIMEOUT-SAFE: the doc is split by lesson day; the CLIENT drives the chain,
// one chunk per request (Haiku, fast). Every candidate flows through the
// unified suggestion pipeline (ng_suggestions) — nothing enters unseen.
//
// THE RUBRIC (what Fable decided is worth pulling from Victor's notes):
//  EXTRACT: natural complete utterances; PATTERN FAMILIES as one multi-stage
//   ladder (Eu quero → quero ir pra → queria → vou querer); identity scripts;
//   transactional scripts; colloquial gems; contrast pairs AS example sentences.
//  SKIP: conjugation paradigm tables; vós/literary forms ("não usamos");
//   phonics drills; English-only lines; exercises/homework/meta.
//  MARKS: !?* annotations are stripped as noise — zero bias, merit only.

const{createClient}=require('@supabase/supabase-js')
const{REGISTER_LAW_GENERATE}=require('./register-law.cjs')
const UID='00000000-0000-0000-0000-000000000001'
const norm=t=>(t||'').toLowerCase().replace(/[.,!?…()]/g,'').replace(/\s+/g,' ').trim()
const stageFlags=(s,i)=>({stage:i+1,pt:s.pt,en:s.en,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})

function splitDays(notes){
  const parts=notes.split(/\n(?=\s*(?:Day|Dia)\s*\d+)/i).map(p=>p.trim()).filter(Boolean)
  const chunks=[]
  for(const p of(parts.length?parts:[notes])){
    if(p.length<=4200)chunks.push(p)
    else for(let i=0;i<p.length;i+=3800)chunks.push(p.slice(i,i+4200))
  }
  return chunks
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const body=JSON.parse(event.body||'{}')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)

    // ── Legacy path: write pre-approved scaffolds (hybrids still use this) ──
    if((body.approvedScaffolds||[]).length){
      let added=0
      for(const sc of body.approvedScaffolds.slice(0,40)){
        if(!sc.base_portuguese||!sc.stages?.length)continue
        const{error}=await sb.from('ng_scaffolds').insert({
          id:'sc_victor_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
          user_id:UID,base_portuguese:sc.base_portuguese,base_english:sc.base_english||'',
          stages:sc.stages.map((s,i)=>stageFlags(s,i)),
          current_stage:1,phase:sc.phase||1,category:sc.category||'social_foundation',
          context:sc.context||'general',cluster:sc.is_hybrid?'hybrid':'victor',
          source:sc.is_hybrid?'hybrid':'victor',last_practiced:null
        })
        if(!error)added++
      }
      return{statusCode:200,body:JSON.stringify({ok:true,added})}
    }

    // ── ANALYZE — one day-chunk per request, client drives the chain ──────
    const{notes='',chunk=0}=body
    if(!notes.trim())return{statusCode:400,body:JSON.stringify({error:'No notes'})}
    const chunks=splitDays(notes)
    if(chunk>=chunks.length)return{statusCode:200,body:JSON.stringify({done:true,total_chunks:chunks.length})}
    const text=chunks[chunk]
    // The doc's own day-structure defines recency for the Victor loop —
    // capture the real 'Day N' number, not the chunk index.
    const dayM=text.match(/^\s*(?:Day|Dia)\s*(\d+)/i)
    const sourceDay=dayM?Number(dayM[1]):null

    // Dedupe surface: bank bases + every stage + already-pending suggestions
    const[{data:bank},{data:pending}]=await Promise.all([
      sb.from('ng_scaffolds').select('id,base_portuguese,stages').eq('user_id',UID),
      sb.from('ng_suggestions').select('phrase,payload').eq('user_id',UID).eq('status','pending')
    ])
    const known=new Set()
    for(const sc of(bank||[])){
      known.add(norm(sc.base_portuguese))
      for(const st of(sc.stages||[]))known.add(norm(st.pt))
    }
    for(const p of(pending||[])){
      known.add(norm(p.phrase))
      for(const st of(p.payload?.scaffold?.stages||[]))known.add(norm(st.pt))
    }
    const bankSample=(bank||[]).slice(0,60).map(s=>s.base_portuguese).join(' · ')

    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:2000,
        system:`${REGISTER_LAW_GENERATE}\n\nYou are the notes decision engine for a Carioca Portuguese learner's lesson notes (teacher: Victor). Extract SCAFFOLD candidates — nothing else.

EXTRACT (candidates):
- Natural, complete utterances a Carioca actually says: interjections, greetings, questions, replies, functional scripts (restaurant/shopping/directions), colloquial gems (incl. vulgar street register — it's the point), double meanings.
- PATTERN FAMILIES: when the notes drill one base through variants/tenses (e.g. "Eu quero X" → "Eu quero ir pra X" → "Eu queria ir" → "Eu vou querer"), output ONE scaffold with 2-4 escalating stages — not many fragments.
- Personal identity scripts (learner's own story sentences: "Eu me mudei pro Rio...", "Nasci e cresci...") → context "identity", these are gold.
- Grammar contrast pairs ONLY as their example sentences ("A água é fria" vs "A água tá fria" as stages of one scaffold), NEVER rule explanations.

SKIP (do not output; count in skipped):
- Conjugation paradigm tables (eu estou/tu estás/ele está lists) — harvest only natural sentences near them. Count as "tables".
- Literary/European forms: any vós row, tu estás/estiveras style, estivera/estiverdes, anything marked "não usamos". Count as "tables".
- Pronunciation/phonics drills (letter-sound sections, syllable splits, respellings like "BOH-TTLA"). Count as "phonics".
- English-only lines, exercise instructions/answers, homework, "Next class"/"To Learn"/"Legenda"/meta. Count as "meta".
- Bare common single words with no register value (hoje, alto, tudo) unless colloquial gems.

VICTOR'S MARKS: the notes may carry !/?/* annotations. Treat them as NOISE — strip them from extracted text and give them ZERO weight in any decision. Extract purely on merit.

Each scaffold: {"base_portuguese":stage-1 text,"base_english":"","category":"social_foundation|dating_register|personality_humour|deep_fluency","context":"","phase":1-4,"stages":[{"pt":"","en":""}] (2-4, stage 1 = simplest)}
Max 8 scaffolds per chunk — pick the highest-value. JSON only:
{"scaffolds":[...],"skipped":{"tables":0,"phonics":0,"marked_solid":0,"meta":0}}`,
        messages:[{role:'user',content:`ALREADY IN THE BANK (do not duplicate): ${bankSample||'empty'}\n\nNOTES CHUNK ${chunk+1}/${chunks.length}:\n${text}`}]})
    })
    const data=await res.json()
    let out=null
    try{out=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch(_){}
    if(!out)return{statusCode:200,body:JSON.stringify({chunk,next:chunk+1<chunks.length?chunk+1:null,total_chunks:chunks.length,created:[],parse_error:true})}

    // Server-side dedupe + write into the unified suggestion pipeline
    const created=[]
    for(const sc of(out.scaffolds||[]).slice(0,8)){
      const stages=(sc.stages||[]).filter(s=>s?.pt).slice(0,4)
      if(!stages.length)continue
      if(stages.every(s=>known.has(norm(s.pt))))continue // fully known — dupe
      if(known.has(norm(sc.base_portuguese||stages[0].pt)))continue
      const payload={
        decision:'new_scaffold',
        scaffold:{base_portuguese:stages[0].pt,base_english:stages[0].en||sc.base_english||'',
          category:sc.category||'social_foundation',context:sc.context||'victor',
          phase:sc.phase||1,stages},
        tapped_stage:0,
        day_chunk:chunk,
        source_day:sourceDay
      }
      const{data:ins,error}=await sb.from('ng_suggestions').insert({
        user_id:UID,source:'victor',phrase:stages[0].pt,payload,status:'pending'
      }).select().single()
      if(!error&&ins){
        created.push(ins)
        stages.forEach(s=>known.add(norm(s.pt)))
      }
    }
    try{
      if(created.length)await sb.from('ng_brain_log').insert({user_id:UID,process:'suggest',
        thought:`Victor import chunk ${chunk+1}/${chunks.length}: ${created.length} candidates proposed (${(out.skipped?.tables||0)} tables, ${(out.skipped?.phonics||0)} phonics drills, ${(out.skipped?.marked_solid||0)} already-solid skipped). Awaiting verdicts.`,importance:1})
    }catch(_){}
    return{statusCode:200,body:JSON.stringify({
      chunk,next:chunk+1<chunks.length?chunk+1:null,total_chunks:chunks.length,
      created,skipped:out.skipped||{}
    })}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
