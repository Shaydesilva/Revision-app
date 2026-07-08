// ng-brick-kinds.js — backfills a `kind` onto each brick (stage) so bricks can snap.
// Kinds power the Lego surfaces: what composes with what.
//
// Storage: stages[i].kind inside the existing ng_scaffolds.stages JSONB — no schema
// migration needed, and per-stage is the correct grain (a brick IS a stage).
// Batch discipline: one Haiku call classifies up to 25 scaffolds, then progressive
// per-scaffold writes (Netlify freeze rule: never leave work un-awaited).
// Fired nightly by ng-nightly-brain; safe to call ad hoc. Idempotent — only
// touches scaffolds whose stages lack a kind.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'
const KINDS=['chunk','verb-form','connector','time-word','person-form','slot-phrase','vocab']
const MODEL='claude-haiku-4-5-20251001' // classification is cheap work — Haiku tier

async function brainLog(sb,thought,data=null){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:'brick_kinds',thought,data,importance:1})}catch(_){}
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    let batchSize=25
    try{const b=JSON.parse(event.body||'{}');if(b.batch)batchSize=Math.max(1,Math.min(40,Number(b.batch)||25))}catch(_){}

    const{data:scaffolds}=await sb.from('ng_scaffolds')
      .select('id,base_portuguese,stages').eq('user_id',UID)
    const pending=(scaffolds||[]).filter(sc=>
      Array.isArray(sc.stages)&&sc.stages.length&&sc.stages.some(st=>!st.kind)
    ).slice(0,batchSize)

    if(!pending.length)return{statusCode:200,body:JSON.stringify({ok:true,done:true,classified:0})}

    // One classification call for the whole batch.
    const lines=[]
    pending.forEach((sc,i)=>{(sc.stages||[]).forEach((st,j)=>{
      if(!st.kind&&st.pt)lines.push(`${i}.${j}: ${st.pt}`)
    })})
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:MODEL,max_tokens:1500,
        system:`You classify spoken Rio Portuguese phrases into Lego-brick kinds for a language-learning system. Kinds:
- chunk: a frozen social phrase used whole (e.g. "e aí, de boa?", "valeu", "espero que esteja tudo bem")
- verb-form: the phrase's learning target is a verb form/tense cell (e.g. "nós vai amanhã", "tava fazendo")
- connector: target is a linking word in context (e.g. "fui lá, mas tava fechado" teaching "mas")
- time-word: target is a time expression (e.g. "depois eu te falo" teaching "depois")
- person-form: target is a person/pronoun pattern (e.g. "cê vai?", "nós tamo junto")
- slot-phrase: a frame with an open slot (e.g. "me vê ___", "tô afim de ___", "quero ___")
- vocab: target is a content word/noun phrase (e.g. "uma água de coco")
Pick the ONE kind that names what the learner is acquiring. Return JSON only: {"kinds":{"<index>":"<kind>",...}} using the given indices.`,
        messages:[{role:'user',content:lines.join('\n')}]
      })
    })
    const data=await res.json()
    let kinds={}
    try{kinds=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim()).kinds||{}}catch(_){}

    // Progressive writes — one scaffold at a time, all awaited.
    let classified=0
    for(let i=0;i<pending.length;i++){
      const sc=pending[i]
      let touched=false
      const stages=(sc.stages||[]).map((st,j)=>{
        if(st.kind||!st.pt)return st
        const k=kinds[`${i}.${j}`]
        if(KINDS.includes(k)){touched=true;classified++;return{...st,kind:k}}
        return st
      })
      if(touched){
        const{error}=await sb.from('ng_scaffolds').update({stages}).eq('id',sc.id).eq('user_id',UID)
        if(error)console.log('brick-kinds write err:',sc.id,error.message)
      }
    }
    const remaining=(scaffolds||[]).filter(sc=>Array.isArray(sc.stages)&&sc.stages.some(st=>!st.kind&&st.pt)).length-classified
    await brainLog(sb,`Classified ${classified} bricks into kinds (${Math.max(0,remaining)} remaining).`)
    return{statusCode:200,body:JSON.stringify({ok:true,classified,remaining:Math.max(0,remaining)})}
  }catch(e){
    console.error('ng-brick-kinds:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
