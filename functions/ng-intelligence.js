// ng-intelligence.js
// Intelligence chat — Luna in settings
// Loads complete learner profile + history
// Text only, honest, grounded in real data

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    const{messages=[],extractInsights=false}=JSON.parse(event.body||'{}')
    if(!messages.length)return{statusCode:400,body:JSON.stringify({error:'No messages'})}

    // Load everything — complete context
    const[
      {data:profile},
      {data:recentScaffoldEvents},
      {data:recentIntel},
      {data:scaffolds}
    ]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffold_events')
        .select('scaffold_id,stage,mode,quality,produced,created_at')
        .eq('user_id',UID)
        .order('created_at',{ascending:false})
        .limit(30),
      sb.from('ng_intelligence_sessions')
        .select('messages,insights_extracted,created_at')
        .eq('user_id',UID)
        .order('created_at',{ascending:false})
        .limit(3),
      sb.from('ng_scaffolds')
        .select('id,base_portuguese,current_stage,phase,stages')
        .eq('user_id',UID)
    ])

    const frontier=profile?.frontier||[]
    const controlled=profile?.controlled||[]
    const errorFingerprint=profile?.error_fingerprint||{}
    const avoidance=profile?.scaffold_avoidance||[]
    const fieldReports=profile?.field_reports||[]
    const lunaNotes=profile?.luna_notes||''

    // Build scaffold map
    const scaffoldMap={}
    ;(scaffolds||[]).forEach(s=>{scaffoldMap[s.id]=s})

    // Format recent events readably
    const recentEventsSummary=(recentScaffoldEvents||[]).slice(0,10).map(ev=>{
      const sc=scaffoldMap[ev.scaffold_id]
      return`${ev.mode}: "${sc?.base_portuguese||ev.scaffold_id}" Stage ${ev.stage} — quality ${ev.quality}/5${ev.produced?' (produced)':''}`
    }).join('\n')

    // Format previous intel sessions
    const prevIntelSummary=(recentIntel||[]).map(s=>{
      const lastMsg=s.messages?.[s.messages.length-1]
      return`[${s.created_at?.slice(0,10)||''}] ${s.insights_extracted||lastMsg?.content?.slice(0,100)||''}`
    }).join('\n')

    // Format avoidance
    const avoidanceSummary=avoidance
      .filter(a=>a.times_in_frontier>=2)
      .map(a=>{
        const sc=scaffoldMap[a.scaffold_id]
        return`"${sc?.base_portuguese||a.scaffold_id}" — in frontier ${a.times_in_frontier}x, produced ${a.times_produced}x`
      }).join('\n')

    const systemPrompt=`You are Luna — the intelligence layer of Carioca, Shay's Portuguese learning app.

In this mode you are NOT having a language practice conversation.
You are having a direct, honest conversation about Shay's learning progress.

You have access to real data. Everything you say must be grounded in that data.
Never invent progress. Never give empty encouragement. Be honest.

== COMPLETE LEARNER STATE ==

Phase: ${profile?.phase||1} — ${profile?.phase_name||'Survival → Social'}
Total stages controlled: ${(profile?.controlled||[]).length}
Total events in system: ${(recentScaffoldEvents||[]).length} (last 30 shown)
Phase progress: ${Math.round((profile?.phase_progress||0)*100)}%
Total stages controlled: ${controlled.length}
Sessions logged: ${(recentScaffoldEvents||[]).length} recent events in DB

Current frontier (what he's actively working on — loaded from profile):
${frontier.length>0?frontier.map(f=>`- "${f.pt}" [Stage ${f.stage}] — ${f.practice_count||0}/3 sessions, modes: ${(f.modes_used||[]).join(',')||'none'}`).join('\n'):'Frontier not yet computed — user needs to visit Home first'}

Recent session activity:
${recentEventsSummary||'No recent events'}

Error patterns:
${Object.entries(errorFingerprint).map(([k,v])=>`- ${k}: ${v}x`).join('\n')||'None recorded yet'}

Avoidance patterns (in frontier but not producing):
${avoidanceSummary||'None detected yet'}

Field reports (real-world conversations):
${fieldReports.slice(0,3).map(r=>`- ${r.date||''}: ${r.summary||r.text||''}`).join('\n')||'None recorded yet'}

Luna's running notes on Shay:
${lunaNotes||'No notes yet — not enough sessions'}

Previous intelligence conversations:
${prevIntelSummary||'This is the first intelligence session'}

== WHAT YOU CAN DO ==
- Tell Shay honestly where he is and what's blocking him
- Explain what you plan to focus on in upcoming sessions and why
- Identify specific patterns he's avoiding
- Answer questions about his progress grounded in real data
- Accept his input: if he describes a real-world situation, note it for next session
- Adjust your plan based on what he tells you

== WHAT YOU NEVER DO ==
- Invent sessions that didn't happen
- Give vague encouragement not grounded in data
- Pretend his progress is better than it is
- Say "I don't have access to" when you can see the data above`

    // Call Claude
    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':process.env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01'
      },
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:600,
        system:systemPrompt,
        messages
      })
    })

    const data=await response.json()
    const reply=data.content?.[0]?.text||''

    // Save the full conversation
    const fullConversation=[...messages,{role:'assistant',content:reply}]
    let insights=''

    // If extracting insights (called when session ends)
    if(extractInsights&&fullConversation.length>=4){
      const insightRes=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key':process.env.ANTHROPIC_API_KEY,
          'anthropic-version':'2023-06-01'
        },
        body:JSON.stringify({
          model:'claude-sonnet-4-6',
          max_tokens:150,
          system:'Extract the key insight from this intelligence conversation in one sentence. Focus on what Luna should remember for next session.',
          messages:[{role:'user',content:JSON.stringify(fullConversation)}]
        })
      })
      const insightData=await insightRes.json()
      insights=insightData.content?.[0]?.text||''

      // Save session + update luna notes
      await sb.from('ng_intelligence_sessions').insert({
        user_id:UID,
        messages:fullConversation,
        insights_extracted:insights
      }).catch(()=>{})

      if(insights){
        // Write insights directly to Supabase — no internal HTTP
        await sb.from('ng_learner_profile').update({
          last_intelligence_insights:insights,
          luna_notes:insights
        }).eq('user_id',UID).catch(()=>{})
      }
    }

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({reply,insights})
    }

  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
