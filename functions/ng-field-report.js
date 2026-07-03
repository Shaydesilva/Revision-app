// ng-field-report.js
// Saves a real-world conversation report AND mines it for scaffold suggestions
// Closes the loop: street conversation → intelligence layer → new scaffolds

const{createClient}=require('@supabase/supabase-js')

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,proc,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:proc,thought,data,importance})}catch(_){}
}
    const{text='',approvedScaffolds=null,mine_only=false,source='field_report'}=JSON.parse(event.body||'{}')

    // ── Approval path: write approved scaffolds to bank ────────────────
    if(Array.isArray(approvedScaffolds)&&approvedScaffolds.length){
      const rows=approvedScaffolds.map((sc,i)=>({
        id:sc.id||`sc_field_${Date.now()}_${i}`,
        user_id:UID,
        base_portuguese:sc.base_portuguese,
        base_english:sc.base_english,
        stages:sc.stages||[],
        phase:sc.phase||1,
        category:sc.category||'field_learned',
        context:sc.context||'real_world',
        is_hybrid:false,
        source:source||'field_report'
      }))
      const{error}=await sb.from('ng_scaffolds').insert(rows)
      if(error)return{statusCode:500,body:JSON.stringify({error:error.message})}
      return{statusCode:200,body:JSON.stringify({ok:true,added:rows.length})}
    }

    if(!text.trim())return{statusCode:400,body:JSON.stringify({error:'No text'})}

    // ── Load profile for context ────────────────────────────────────────
    const[{data:profile},{data:scaffolds}]=await Promise.all([
      sb.from('ng_learner_profile').select('frontier,controlled,field_reports,version').eq('user_id',UID).single(),
      sb.from('ng_scaffolds').select('base_portuguese').eq('user_id',UID)
    ])

    const existingPatterns=(scaffolds||[]).map(s=>s.base_portuguese).join('\n')

    // ── Save the report to profile (skipped for mine_only e.g. Luna transcripts) ──
    if(!mine_only){
    const newReport={
      date:new Date().toISOString().slice(0,10),
      text:text.trim(),
      summary:text.trim().slice(0,120)
    }
    const existingReports=Array.isArray(profile?.field_reports)?profile.field_reports:[]
    await sb.from('ng_learner_profile').update({
      field_reports:[newReport,...existingReports].slice(0,10),
      version:(profile?.version||0)+1,
      last_updated:new Date().toISOString()
    }).eq('user_id',UID)
    }

    // ── Mine the report for scaffold suggestions ─────────────────────────
    let suggestions=[]
    try{
      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({
          model:'claude-sonnet-4-6',max_tokens:900,
          system:`You mine real-world Portuguese conversation reports for learnable Carioca patterns.
The learner lives in Rio. Extract patterns they TRIED to say but couldn't, MISHEARD, or ENCOUNTERED and didn't know.
Only suggest genuinely useful, natural Carioca patterns — not textbook Portuguese.
Skip anything they clearly already know or that already exists in their bank.

EXISTING PATTERNS IN BANK (do not duplicate):
${existingPatterns.slice(0,3000)}

For each suggestion, generate 4 escalating stages (base → extension → fuller → expressive).
Return JSON only: {"suggestions":[{"base_portuguese":"","base_english":"","category":"social_foundation|dating_register|personality_humour|deep_fluency","context":"","reason":"why this emerged from the report","stages":[{"stage":1,"pt":"","en":""},{"stage":2,"pt":"","en":""},{"stage":3,"pt":"","en":""},{"stage":4,"pt":"","en":""}]}]}
Maximum 4 suggestions. If nothing genuinely useful, return {"suggestions":[]}.`,
          messages:[{role:'user',content:`Field report from a real conversation:\n\n${text.trim()}`}]
        })
      })
      const data=await res.json()
      const parsed=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())
      suggestions=Array.isArray(parsed.suggestions)?parsed.suggestions:[]
    }catch(e){console.log('Field mining failed:',e.message)}

    await brainLog(sb,'field',suggestions.length
      ?`Field report mined: found ${suggestions.length} street-learned pattern(s) worth adding — ${suggestions.map(s=>'"'+s.base_portuguese+'"').slice(0,2).join(', ')}.`
      :'Field report saved. Nothing new to mine — the street confirmed what the bank already covers.',
      {suggestions:suggestions.length},suggestions.length?2:1)
    return{statusCode:200,body:JSON.stringify({ok:true,saved:true,suggestions})}

  }catch(e){
    console.error('ng-field-report:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
