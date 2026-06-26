// ng-luna-session.js
// Next Gen version of luna-session
// Loads complete learner profile, injects frontier into Luna's prompt
// Luna always knows exactly where you are and what to push next

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    const{spectrum=0.35,speed='normal',pttMode=true,voice='shimmer'}=JSON.parse(event.body||'{}')

    // Load everything Luna needs — one query each
    const[
      {data:profile},
      {data:cards},
      {data:recentEvents}
    ]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('cards').select('portuguese,english,mastery,sentenceCount').eq('user_id',UID),
      sb.from('ng_scaffold_events')
        .select('scaffold_id,stage,mode,quality')
        .eq('user_id',UID)
        .order('created_at',{ascending:false})
        .limit(50)
    ])

    const frontier=profile?.frontier||[]
    const metrics=profile?.metrics_snapshot||null
    const weeklyNarrative=metrics?.weekly_narrative||''
    const struggleInfo=metrics?.dont_know?.top_struggles?.slice(0,2).map(s=>s.base).join(', ')||''
    const controlled=profile?.controlled||[]
    const errorFingerprint=profile?.error_fingerprint||{}
    const avoidedPatterns=profile?.avoided_patterns||[]
    const scaffoldAvoidance=profile?.scaffold_avoidance||[]
    const lunaNotes=profile?.luna_notes||''
    const personalityProfile=profile?.personality_profile||{}
    const fieldReports=profile?.field_reports||[]
    const phase=profile?.phase||1

    // Build word map from cards for translation
    const cardMap={}
    ;(cards||[]).forEach(c=>{
      if(c.portuguese)cardMap[c.portuguese.toLowerCase().trim()]=c.english
    })

    // ── Speed instruction ─────────────────────────────────────
    const speedRule=speed==='slow'
      ?`SPEED — CRITICAL: Speak SLOWLY. Full pause between every sentence. Pronounce each syllable clearly. Never rush.`
      :`SPEED: Relaxed natural Carioca pace.`

    // ── Correction style from spectrum ─────────────────────────
    const sp=Math.max(0,Math.min(1,spectrum))
    const correctionRule=sp<0.25
      ?`CORRECTIONS: React to meaning only. Never comment on pronunciation or grammar.`
      :sp<0.6
      ?`CORRECTIONS: If an error changes meaning, model the correct version briefly in one breath then immediately move on. Never dwell.`
      :`CORRECTIONS: Correct errors clearly but once only. Model the right form. Then continue.`

    // ── Anti-loop rule ─────────────────────────────────────────
    const loopRule=`REPETITION — HARD RULE:
When you introduce a frontier pattern: say it once naturally in conversation.
When Shay attempts it: accept the attempt immediately — say "isso" or "exato" or just nod in text — and MOVE ON.
NEVER ask him to repeat again after one attempt.
NEVER say "one more time", "try again", "can you say".
One attempt = done. Change topic or continue. This rule has no exceptions.`

    // ── Complexity rule based on phase ─────────────────────────
    const complexityRule=phase<=1
      ?`LANGUAGE LEVEL: A1. Short sentences. Max one clause. Present tense only. Only words from his deck.`
      :phase<=2
      ?`LANGUAGE LEVEL: A2. Simple sentences. Can mix tenses. Use words from his deck + natural extensions.`
      :phase<=3
      ?`LANGUAGE LEVEL: B1. Natural sentences. Full tense range. Colloquial register.`
      :`LANGUAGE LEVEL: B2+. Full natural Carioca. Idioms, humour, cultural references.`

    // ── Error fingerprint — active pressure on known weaknesses ───
    const topErrors=Object.entries(errorFingerprint||{})
      .sort(([,a],[,b])=>b-a)
      .slice(0,3)
      .map(([k,v])=>`${k.replace(/_/g,' ')} (${v}x)`)
      .join(', ')

    const errorPressureRule=topErrors
      ?('ERROR PATTERNS — create natural situations that address these: '+topErrors)
      :''

    // ── Avoidance pressure ─────────────────────────────────────────
    const avoidedScaffolds=(scaffoldAvoidance||[])
      .filter(a=>a.times_in_frontier>=3&&(!a.times_produced||a.times_produced===0))
      .slice(0,2)

    const avoidancePressureRule=avoidedScaffolds.length
      ?('AVOIDANCE — Shay avoids these despite knowing them. Engineer a natural opening: '+avoidedScaffolds.map(a=>a.scaffold_id).join(', '))
      :''

    // ── Build controlled list (what she can use freely) ────────
    const controlledPatterns=controlled
      .slice(0,30)
      .map(c=>`${c.scaffold_id}`)
      .join(', ')

    // ── Build frontier injection ────────────────────────────────
    const frontierBlock=frontier.slice(0,8).map(f=>
      `- "${f.pt}" (${f.en}) [${f.context}] — introduce naturally once if moment arises`
    ).join('\n')

    // ── Avoidance pressure ─────────────────────────────────────
    const avoidanceBlock=scaffoldAvoidance
      .filter(a=>a.times_in_frontier>=3&&a.times_produced===0)
      .slice(0,3)
      .map(a=>`- scaffold_id: ${a.scaffold_id} — Shay consistently avoids this. Create a situation that makes it the natural response.`)
      .join('\n')

    // ── Error fingerprint ───────────────────────────────────────
    const errorBlock=Object.entries(errorFingerprint)
      .sort(([,a],[,b])=>b-a)
      .slice(0,3)
      .map(([k,v])=>`- ${k} (${v}x)`)
      .join('\n')

    // ── Field reports ───────────────────────────────────────────
    const fieldBlock=fieldReports.slice(0,2).map(r=>
      `[${r.date||'recent'}] ${r.summary||r.text}`
    ).join('\n')

    // ── Personality notes ───────────────────────────────────────
    const personalityBlock=personalityProfile.notes||''

    // ── Active error + avoidance pressure ───────────────────────
    // activePressure: only error patterns — avoidance already covered by avoidanceBlock above
    const activePressure=[errorPressureRule].filter(Boolean).join('\n\n')

    // ── Pick scenario from session history ──────────────────────
    const usedScenarios=Object.keys(profile?.session_history||{})
      .filter(k=>k.startsWith('scenario_'))
    const scenarios=getScenarios(phase,usedScenarios)
    const scenario=scenarios[Math.floor(Math.random()*scenarios.length)]

    const instructions=`${speedRule}

${complexityRule}

${loopRule}

${correctionRule}

## WHO YOU ARE
Luna — a warm, direct Carioca local in Rio. You are Shay's conversation partner, not his teacher.
Always masculine forms: obrigado, cansado, animado. Every time.
Keep responses to 1-3 sentences. Conversational pace. Never lecture.

## SHAY'S LEARNING STATE
Phase ${phase}: ${profile?.phase_name||'Survival → Social'}
${controlled.length} scaffold stages controlled.

## CONTROLLED — use these freely, no explanation needed:
${controlledPatterns||'basic Carioca greetings and expressions'}

## FRONTIER — your goal this session. Introduce these naturally in context. Once each. Don't drill.
${frontierBlock||'Use natural Carioca vocabulary at A1 level'}

${avoidanceBlock?`## PUSH GENTLY — Shay avoids these. Create a natural opening:\n${avoidanceBlock}`:''}

${errorBlock?`## KNOWN ERROR PATTERNS — be aware, don't lecture:\n${errorBlock}`:''}

${fieldBlock?`## REAL WORLD CONTEXT — what happened recently outside the app:\n${fieldBlock}`:''}

${personalityBlock?`## SHAY'S PERSONALITY:\n${personalityBlock}`:''}

${lunaNotes?`## YOUR NOTES ON SHAY:\n${lunaNotes}`:''}

## TODAY'S SCENARIO
${scenario}

${activePressure?'\n## ACTIVE FOCUS\n'+activePressure:''}

## NEVER
- "Great job", "well done", "excellent", "nice try"
- "Repeat after me", "can you say", "try saying", "one more time"
- Grammar explanations unless explicitly asked
- European Portuguese`

    // Mint OpenAI Realtime token
    const model=process.env.REALTIME_MODEL||'gpt-realtime-mini'
    const response=await fetch('https://api.openai.com/v1/realtime/client_secrets',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        session:{
          type:'realtime',model,instructions,
          audio:{output:{voice:voice||'shimmer'}},
          // Bake PTT mode in at session creation — prevents mid-hold responses
          turn_detection:pttMode?{type:'none'}:{type:'server_vad',silence_duration_ms:600,threshold:0.5}
        }
      })
    })

    if(!response.ok){
      const err=await response.text()
      return{statusCode:response.status,body:JSON.stringify({error:err})}
    }

    const data=await response.json()

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ...data,
        model,
        cardMap,
        frontier,
        phase,
        scenario,
        ptt_mode_set:pttMode,
        chat_history:profile?.luna_chat_history||[]
      })
    }

  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

function getScenarios(phase,usedScenarios){
  const allScenarios={
    1:[
      "You're at a boteco in Ipanema. A girl at the next table catches your eye. Start naturally.",
      "You just arrived at the beach. A friendly local strikes up conversation.",
      "You're ordering at a padaria. Practice the full ordering sequence.",
      "You're in an Uber. The driver is chatty — make conversation.",
      "You meet someone at a rooftop party in Santa Teresa.",
      "You're at a churrasco with people who speak no English.",
      "Someone on the street asks you for directions — you don't know, but manage the conversation.",
      "You're buying fruit at the feira. Practise bargaining.",
    ],
    2:[
      "A girl from the gym asks what you're doing in Rio. Tell her your story.",
      "You're on a date at a bar in Leblon. Keep the conversation going.",
      "Her friends don't speak English. You're the only gringo.",
      "You ran into someone you met at a party last week. Pick up the conversation.",
      "You're at a birthday party. Meet three new people in one evening.",
      "A Carioca challenges you to explain why you prefer Rio to London.",
    ],
    3:[
      "A deep conversation about what you love and miss about home.",
      "She asks about your last relationship. Handle it with humour.",
      "You're explaining something that happened to you this week.",
      "A philosophical conversation about Rio vs other cities.",
      "You're teasing someone playfully — keep it natural.",
    ],
    4:[
      "Full freestyle conversation — no guardrails. Wherever it goes.",
      "You're telling a story that happened to you in Rio.",
      "A late night conversation — whatever comes up.",
    ]
  }

  const phaseScenarios=allScenarios[Math.min(phase,4)]||allScenarios[1]
  // Prefer unused scenarios
  const unused=phaseScenarios.filter(s=>!usedScenarios.includes(s))
  return unused.length?unused:phaseScenarios
}
