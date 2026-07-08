// ng-write-eval.js — production evaluation under the FEEDBACK CONSTITUTION.
// Hierarchy: MEANING > grammar > accents. Phase-aware weights:
//  P1-2: meaning-right GUARANTEES q>=3; grammar separates 3/4; accents only 4->5.
//  P3+: grammar counts more; register precision at P4.
// Accents NEVER cost more than one point. Never bare-wrong: always a contrast + ONE tip
// targeted at the highest failed tier only.
const{REGISTER_LAW_GRADE:REGISTER_LAW}=require('./register-law.cjs')
const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'
exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{target_pt='',user_answer='',en_prompt='',scaffold_id,stage}=JSON.parse(event.body||'{}')
    let phase=1
    try{
      const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
      const{data:p}=await sb.from('ng_learner_profile').select('phase').eq('user_id',UID).single()
      phase=p?.phase||1
    }catch(_){}
    const weights=phase>=4?'meaning 50 / grammar 40 / form 10 (register precision now counts: ta vs esta matters)'
      :phase>=3?'meaning 60 / grammar 30 / form 10'
      :'meaning 70 / grammar 20 / form 10 (meaning-right GUARANTEES quality>=3; grammar rough is a PASS)'
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:420,
        system:`${REGISTER_LAW}
You grade a learner's typed Portuguese under the FEEDBACK CONSTITUTION (learner phase ${phase}; weights: ${weights}).
Judge THREE tiers independently:
- MEANING: would a Carioca understand the intended message? (intent match vs the target/prompt)
- GRAMMAR: register-aware correctness. Contractions and spoken forms are CORRECT. NÓS RULE: 'nós' is this learner's first-plural; accept BOTH reduced agreement (nós vai, nós tá, nós foi) AND standard (nós vamos, nós estamos) as fully correct — never mark reduced nós as an error. 'a gente' is also acceptable, never penalize it. At phase<=2 be generous.
- FORM: accents/spelling only. Compare ACCENT-INSENSITIVELY for meaning/grammar; accents affect ONLY the 4->5 step.
QUALITY: meaning wrong -> max 2. meaning ok + grammar rough -> 3. + grammar clean -> 4. + form perfect -> 5.
TIP: exactly ONE line, warm Bia voice, targeting ONLY the highest failed tier. If meaning failed, do not mention grammar or accents at all. If quality=5, tip is a specific 4-word praise.
JSON only: {"quality":1-5,"correct":bool,"meaning_ok":bool,"grammar_ok":bool,"form_ok":bool,"feedback":"one short line","tip":"one line","carioca_correction":"the natural Carioca way to say it","what_was_right":"one specific thing they nailed"}`,
        messages:[{role:'user',content:`TARGET (a valid answer): "${target_pt}"\nPROMPT SHOWN: "${en_prompt}"\nLEARNER TYPED: "${user_answer}"`}]})
    })
    const data=await res.json()
    let out=null
    try{out=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch(_){}
    if(!out||!out.quality)return{statusCode:200,body:JSON.stringify({quality:2,correct:false,feedback:'Could not evaluate — logged gently.',tip:'',carioca_correction:target_pt,what_was_right:''})}
    out.quality=Math.max(1,Math.min(5,Math.round(out.quality)))
    return{statusCode:200,body:JSON.stringify(out)}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
