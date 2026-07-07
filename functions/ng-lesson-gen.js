// ng-lesson-gen.js — LAYER 2 SELF-EVOLUTION: the lesson pack generator.
// One Sonnet call per unit-level, cached in ng_path_units.lesson_cache.
// Regenerates when the unit levels up or on explicit refresh:true.
// Produces: Escuta dialogue (Bia & Chico speaking the unit's patterns),
// Cena roleplay (user gaps BOUND to real scaffold ids -> real events),
// and narration one-liners. Life-context law: themes from the profile
// principle, never invented private people. Fallback-safe: on any failure
// returns {fallback:true} and the lesson simply runs without theater.
const REGISTER_LAW="CARIOCA REGISTER LAW (mandatory): spoken Rio register. 'voce' never 'tu'; 'first-plural is 'nos' not 'a gente' - BOTH reduced (nos vai, nos ta, nos foi) AND standard (nos vamos, nos estamos) are CORRECT, never penalize either; 'a gente' acceptable, not an error; contractions to/ta/tamo/pra/pro/ce; spoken imperfect valid; no European forms. Real giria a Carioca says TODAY - never textbook-flavored or invented slang."
const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'
exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{unit_id,refresh=false}=JSON.parse(event.body||'{}')
    if(!unit_id)return{statusCode:400,body:JSON.stringify({error:'unit_id required'})}
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{data:unit}=await sb.from('ng_path_units').select('*').eq('user_id',UID).eq('unit_id',unit_id).single()
    if(!unit)return{statusCode:404,body:JSON.stringify({error:'Unit not found'})}
    const cache=unit.lesson_cache
    if(cache&&cache.level===(unit.level||1)&&!refresh)
      return{statusCode:200,body:JSON.stringify({pack:cache.pack,cached:true})}
    const ids=Array.isArray(unit.scaffold_ids)?unit.scaffold_ids:[]
    const[{data:scs},{data:prof}]=await Promise.all([
      sb.from('ng_scaffolds').select('id,base_portuguese,base_english,stages').eq('user_id',UID).in('id',ids),
      sb.from('ng_learner_profile').select('life_context,error_fingerprint').eq('user_id',UID).single()
    ])
    if(!scs?.length)return{statusCode:200,body:JSON.stringify({fallback:true})}
    const pats=scs.map(s=>`${s.id} | "${s.base_portuguese}" (${s.base_english})`).join('\n')
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1300,
        system:`${REGISTER_LAW}
You write a mini-lesson pack for ONE unit of a Carioca Portuguese learning app. Radio hosts Bia (warm, sharp) & Chico (dry, funny) perform it.
RULES:
- ESCUTA dialogue: 6 short lines between B and C set in the unit situation, naturally weaving in AT LEAST 4 of the unit patterns (verbatim or lightly inflected). Street-real, funny beats welcome.
- CENA roleplay: a 4-turn scene in the same situation. Turns 1 and 3 are given lines (B or C). Turns 2 and 4 are USER GAPS: the learner must produce one of the unit patterns. Each gap MUST bind to a scaffold id from the list (target_pt = that pattern or a natural close variant; keep it producible).
- NARRATION: three one-liners (open/mid/close) in Bia's voice, PT with EN gloss, hyping without cringe.
- LIFE THEMES (never invent private people): ${prof?.life_context||'general Rio life'}
JSON only:
{"dialogue":[{"sp":"B"|"C","pt":"","en":""}],
 "cena":{"setting_pt":"","setting_en":"","turns":[{"sp":"B","pt":"","en":""},{"gap":{"scaffold_id":"","stage":1,"prompt_en":"","target_pt":""}},{"sp":"C","pt":"","en":""},{"gap":{"scaffold_id":"","stage":1,"prompt_en":"","target_pt":""}}]},
 "narr":{"open_pt":"","open_en":"","mid_pt":"","mid_en":"","close_pt":"","close_en":""}}`,
        messages:[{role:'user',content:`UNIT: "${unit.title}" — ${unit.situation}\nLEVEL: ${unit.level||1}\nUNIT PATTERNS:\n${pats}\nLEARNER WEAK SPOTS: ${Object.keys(prof?.error_fingerprint||{}).slice(0,4).join(', ')||'none'}`}]})
    })
    const data=await res.json()
    let pack=null
    try{pack=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch(_){}
    if(!pack||!pack.dialogue?.length)return{statusCode:200,body:JSON.stringify({fallback:true})}
    await sb.from('ng_path_units').update({lesson_cache:{level:unit.level||1,generated_at:new Date().toISOString(),pack}}).eq('id',unit.id)
    return{statusCode:200,body:JSON.stringify({pack,cached:false})}
  }catch(e){return{statusCode:200,body:JSON.stringify({fallback:true,error:e.message})}}
}
