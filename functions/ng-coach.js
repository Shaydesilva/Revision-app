// ng-coach.js — Live session coaching endpoint.
// Client calls mid-session (every ~5 events). Fast analysis, returns an
// actionable hint if intervention is warranted, logs thought to brain stream.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{mode='study',events=[]}=JSON.parse(event.body||'{}')
    if(events.length<4)return{statusCode:200,body:JSON.stringify({hint:null})}

    const recent=events.slice(-10)
    const fails=recent.filter(e=>(e.quality||3)<3)
    const failRate=fails.length/recent.length

    // Only intervene when there's a real signal
    if(failRate<0.4){
      return{statusCode:200,body:JSON.stringify({hint:null,fail_rate:failRate})}
    }

    // Identify the failing patterns for context
    const failIds=[...new Set(fails.map(f=>f.scaffold_id))]
    const{data:scs}=await sb.from('ng_scaffolds').select('id,base_portuguese,base_english,category')
      .eq('user_id',UID).in('id',failIds.slice(0,6))
    const failDesc=(scs||[]).map(s=>`"${s.base_portuguese}" (${s.category})`).join(', ')

    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:150,
        messages:[{role:'user',content:`Mid-session live coaching. A Carioca Portuguese learner in "${mode}" mode is failing ${Math.round(failRate*100)}% of the last ${recent.length} items. Failing patterns: ${failDesc||failIds.join(', ')}.
Return JSON only: {"hint":"ONE short sentence shown to the learner right now — specific, direct, useful (e.g. what these failures share, or a micro-strategy)","thought":"one sentence for the brain log describing what you noticed"}`}]})
    })
    const d=await r.json()
    let out={hint:null,thought:null}
    try{out=JSON.parse((d.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch(_){}

    if(out.thought){
      await sb.from('ng_brain_log').insert({
        user_id:UID,process:'coach',thought:out.thought,
        data:{mode,fail_rate:failRate,patterns:failIds},importance:2
      }).catch?.(()=>{})
    }
    return{statusCode:200,body:JSON.stringify({hint:out.hint||null,fail_rate:failRate})}
  }catch(e){
    return{statusCode:200,body:JSON.stringify({hint:null,error:e.message})}
  }
}
