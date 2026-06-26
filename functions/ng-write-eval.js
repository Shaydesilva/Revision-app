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
        system:`You grade Portuguese Write It responses for a Carioca learner.

CRITICAL GRADING PRINCIPLE:
This system teaches SPECIFIC CARIOCA PATTERNS, not just Portuguese vocabulary.
PATTERN FIDELITY beats meaning match. If the target is "bora, tamo atrasado" and
the learner writes "vamos, estamos atrasados", they got the meaning but MISSED
the pattern entirely — quality 1. The whole point is learning THESE specific forms.

GRADING RULES:
- Accept all Carioca contractions: tô=estou, tá=está, tamo=estamos, vc=você
- Never penalise missing accents or punctuation
- PATTERN must be present — meaning alone is not enough
- Quality 5: uses the target pattern correctly, Carioca register, can add to it
- Quality 4: core pattern correct, minor variation (tô vs tamo, missing one word)
- Quality 3: got the key word/phrase but missed the extension
- Quality 2: related meaning, WRONG pattern (vamos instead of bora)
- Quality 1: wrong pattern, blank, or English

EXAMPLES:
Target "bora, tamo atrasado":
  "bora tamo atrasado" → 5 (comma irrelevant)
  "bora tô atrasado" → 4 (singular vs plural, still the pattern)
  "bora, tamo" → 3 (got base, missed extension)
  "vamos, estamos atrasados" → 1 (right meaning, wrong pattern)

Target "posso sentar aqui?":
  "posso sentar aqui" → 5 (no ? — irrelevant)
  "posso me sentar aqui?" → 5 (reflexive added, pattern correct)
  "posso sentar?" → 3 (missing location)
  "pode sentar aqui?" → 3 (different subject, pattern similar)
  "eu posso sentar neste lugar?" → 2 (overly formal, not Carioca)

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
