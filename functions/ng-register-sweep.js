// ng-register-sweep.js — heals Register Law violations in the EXISTING bank.
// The linter guards generation; this guards what's already planted. Scaffolds
// authored before the nós rewire still carry 'a gente' (and friends) and get
// served as fresh material — this sweep rewrites them to the canonical register.
//
// Batch discipline: lint the whole bank cheaply (no AI), then one Haiku call
// rewrites up to 15 flagged bricks, progressive per-scaffold writes. Idempotent;
// fired nightly by ng-nightly-brain, safe to call ad hoc.

const{createClient}=require('@supabase/supabase-js')
const{lintPT}=require('./register-lint.cjs')
const{REGISTER_LAW_GENERATE}=require('./register-law.cjs')
const UID='00000000-0000-0000-0000-000000000001'
const MODEL='claude-haiku-4-5-20251001'

async function brainLog(sb,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:'register_sweep',thought,data,importance})}catch(_){}
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    let batch=15
    try{const b=JSON.parse(event.body||'{}');if(b.batch)batch=Math.max(1,Math.min(25,Number(b.batch)||15))}catch(_){}

    const{data:scaffolds}=await sb.from('ng_scaffolds')
      .select('id,base_portuguese,stages').eq('user_id',UID)

    // Cheap deterministic scan of every brick in the bank
    const flagged=[]
    for(const sc of(scaffolds||[])){
      const baseHit=!lintPT(sc.base_portuguese).ok
      const stageHits=(sc.stages||[]).map((st,i)=>({i,flags:lintPT(st.pt).flags})).filter(x=>x.flags.length)
      if(baseHit||stageHits.length)flagged.push({sc,baseHit,stageHits})
      if(flagged.length>=batch)break
    }
    if(!flagged.length)return{statusCode:200,body:JSON.stringify({ok:true,clean:true,fixed:0})}

    // One rewrite call for the batch — meaning preserved, register corrected.
    const lines=[]
    flagged.forEach((f,i)=>{
      if(f.baseHit)lines.push(`${i}.base: ${f.sc.base_portuguese}`)
      f.stageHits.forEach(h=>lines.push(`${i}.${h.i}: ${(f.sc.stages[h.i]||{}).pt}`))
    })
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:1600,
        system:REGISTER_LAW_GENERATE+`\n\nYou fix sentences that violate the law above. Rewrite each line to the correct register with the SAME meaning and similar length (e.g. 'a gente namorou' -> 'nós namorou' or 'nós namoramos', favoring the reduced form). Change ONLY what the law requires — keep everything else verbatim. Return JSON only: {"fixed":{"<index>":"<corrected sentence>",...}} using the given indices.`,
        messages:[{role:'user',content:lines.join('\n')}]})
    })
    const data=await res.json()
    let fixed={}
    try{fixed=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim()).fixed||{}}catch(_){}

    // Progressive writes — verify each rewrite actually passes the lint before saving.
    let applied=0,examples=[]
    for(let i=0;i<flagged.length;i++){
      const f=flagged[i]
      let touched=false
      let base=f.sc.base_portuguese
      const nb=fixed[`${i}.base`]
      if(f.baseHit&&nb&&lintPT(nb).ok){base=nb;touched=true}
      const stages=(f.sc.stages||[]).map((st,j)=>{
        const nv=fixed[`${i}.${j}`]
        if(nv&&lintPT(nv).ok&&f.stageHits.some(h=>h.i===j)){
          touched=true;applied++
          if(examples.length<3)examples.push(`"${st.pt}" → "${nv}"`)
          return{...st,pt:nv}
        }
        return st
      })
      if(touched){
        const{error}=await sb.from('ng_scaffolds').update({base_portuguese:base,stages}).eq('id',f.sc.id).eq('user_id',UID)
        if(error)console.log('sweep write err:',f.sc.id,error.message)
      }
    }
    await brainLog(sb,`Register sweep healed ${applied} brick(s) to the nós register. ${examples.join(' · ')}`,{applied},2)
    return{statusCode:200,body:JSON.stringify({ok:true,fixed:applied,flagged:flagged.length})}
  }catch(e){
    console.error('ng-register-sweep:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
