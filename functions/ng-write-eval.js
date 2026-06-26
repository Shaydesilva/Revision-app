// ng-write-eval.js — grades Write It responses
// Semantic grading, accepts Carioca register, no accent penalty

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{target_pt,user_answer,scaffold_id,stage,en_prompt}=JSON.parse(event.body||'{}')
    if(!target_pt||!user_answer)return{statusCode:400,body:JSON.stringify({error:'Missing fields'})}

    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',max_tokens:300,
        system:`You grade Portuguese Write It responses for a Carioca learner. Be fair and direct.

GRADING RULES:
- Accept all Carioca contractions: tô=estou, tá=está, tamo=estamos, vc=você, etc.
- Never penalise missing accents
- Judge on: correct pattern, natural register, meaning preserved
- Quality 5: perfect or better (more natural/Carioca than target)
- Quality 4: correct pattern, minor differences
- Quality 3: right idea, some errors
- Quality 2: partial — got the base but not the extension
- Quality 1: wrong or blank

Return JSON only.`,
        messages:[{role:'user',content:`Target: "${target_pt}"
Learner wrote: "${user_answer}"
${en_prompt?`English prompt shown: "${en_prompt}"`:''}

Return JSON:
{
  "quality": 1-5,
  "correct": true/false,
  "feedback": "one direct sentence",
  "carioca_correction": "natural Carioca version if they made errors, or empty string if perfect",
  "what_was_right": "brief note on what they got right if anything"
}`}]
      })
    })
    const data=await res.json()
    let result={quality:3,correct:false,feedback:'Could not evaluate.',carioca_correction:'',what_was_right:''}
    try{result=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch{}

    return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify(result)}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message,quality:2,correct:false,feedback:'Evaluation failed.'})}
  }
}
