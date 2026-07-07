exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{spectrum=0.5,speed='normal'}=JSON.parse(event.body||'{}')
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    // Load cards
    const[{data:allCards},{data:errors}]=await Promise.all([
      sb.from('cards').select('portuguese,english,mastery,sentenceCount,recognitionMastery,productionMastery,cluster,type').eq('user_id',UID),
      sb.from('error_patterns').select('error_type,count').eq('user_id',UID).order('count',{ascending:false}).limit(3)
    ])

    const cards=allCards||[]
    const total=cards.length
    const mastered=cards.filter(c=>c.mastery>=4).length
    const reviewed=cards.filter(c=>c.mastery>=1)
    const neverSpoken=reviewed.filter(c=>c.sentenceCount===0).slice(0,8)
    const productionGap=cards.filter(c=>c.recognitionMastery>=2&&c.productionMastery<=1).slice(0,6)

    // Word list — use ALL deck cards as known vocabulary (mastery reset doesn't mean unknown)
    // Shay has studied these with Victor, they're in his deck for a reason
    const knownWords=cards.slice(0,60).map(c=>`${c.portuguese}(${c.english})`).join(', ')
    const targetWords=neverSpoken.map(c=>c.portuguese).join(', ')

    // ── SPEED ────────────────────────────────────────────────────
    const speedRule=speed==='slow'
      ?`SPEED — CRITICAL: Speak SLOWLY. Pause 1 full second between sentences. Pronounce every syllable clearly and separately. Never rush. The student needs time to process each word.`
      :`SPEED: Natural relaxed Carioca pace.`

    // ── CORRECTION STYLE from spectrum ───────────────────────────
    const sp=Math.max(0,Math.min(1,spectrum))
    const correctionRule=sp<0.25
      ?`CORRECTIONS: React to meaning only. Never comment on pronunciation or grammar. If he's understood — respond naturally and move on.`
      :sp<0.6
      ?`CORRECTIONS: If he makes an error that changes meaning, model the correct version briefly ("yeah, tô not estou — anyway...") in one breath. Then immediately move on. Never dwell.`
      :`CORRECTIONS: When he makes an error, correct it clearly but once only. Model the right form. Then continue. Never repeat the correction.`

    // ── COMPLEXITY calibration ────────────────────────────────────
    const complexityRule=`LANGUAGE LEVEL — A1 PORTUGUESE — CRITICAL:
Speak at CEFR A1 level. This is not a guideline. This is the level.

A1 means:
- Short simple sentences. Maximum one clause. Never compound.
- Only present tense and simple past. No subjunctive. No future tense.
- Only words from his vocabulary list below
- If a word isn't in his list: say the English first, then the Portuguese word once

EXAMPLE of correct Luna responses at this level:
  Shay: "oi"
  Luna: "Oi! Tudo bem? Você foi à praia hoje?"

  Shay: "sim, fui"
  Luna: "Legal! Estava quente? Ipanema ou Copacabana?"

  Shay: "Ipanema"
  Luna: "Boa escolha. Eu adoro Ipanema. Você foi de manhã?"

EXAMPLE of WRONG Luna responses (too complex — never do this):
  ✗ "Que incrível que você conseguiu ir à praia apesar do tempo nublado que tivemos nos últimos dias!"
  ✗ "Se eu fosse você, teria aproveitado mais o sol enquanto durava."

Short. Simple. One idea at a time. A1. Always.`

    // ── ANTI-LOOP rule ────────────────────────────────────────────
    const loopRule=`REPETITION — CRITICAL — READ CAREFULLY:
When you introduce a word or phrase:
  → Say it once naturally in conversation
  → If he tries to repeat it: accept the attempt immediately, say "yeah" or "isso" or "exato" and MOVE ON
  → NEVER ask him to repeat again after he's attempted it once
  → NEVER say "one more time", "try again", "can you say it again"
  → One attempt = done. Hard stop. Change topic or continue conversation.
If he gets it wrong: model the correct version once ("tô, not estou") then immediately talk about something else.
Violating this rule breaks the experience. One attempt. Done. Move on.`

    // ── Active unit (the trilha and Luna share one world) ─────────
    let unitNote=''
    try{
      const{data:units}=await sb.from('ng_path_units').select('title,situation,scaffold_ids,completed_at,sort_order,is_side_quest')
        .eq('user_id',UID).order('sort_order')
      const cur=(units||[]).find(u=>!u.completed_at&&!u.is_side_quest)
      if(cur){
        const ids=(cur.scaffold_ids||[]).slice(0,8)
        let pats=[]
        if(ids.length){
          const{data:scs}=await sb.from('ng_scaffolds').select('base_portuguese').eq('user_id',UID).in('id',ids)
          pats=(scs||[]).map(s=>s.base_portuguese)
        }
        unitNote=`ACTIVE UNIT: "${cur.title}" — ${(cur.situation||'').slice(0,110)}. Its patterns: ${pats.join(' · ')||'—'}. Weave 1-2 in naturally; stealth-test one.`
      }
    }catch(_){}

    // ── Error patterns ────────────────────────────────────────────
    const errorNote=(errors||[]).length
      ?`KNOWN ERROR PATTERNS: ${(errors||[]).map(e=>e.error_type).join(', ')} — be aware but don't lecture.`
      :''

    const instructions=`CARIOCA REGISTER LAW (mandatory for ALL Portuguese you produce): spoken Rio register only. Use 'voce' never 'tu' (nor tu conjugations). Use 'First-person plural is 'nos', NEVER 'a gente' (this learner's Vidigal register). Agreement is a MIX, mostly REDUCED (nos takes the 3rd-singular verb form: nos vai, nos ta, nos foi, nos tava, nos tem, nos fez); standard 1st-plural also occurs and is the taught anchor (nos estamos, nos vamos, nos fomos, nos estavamos). BOTH correct - favor reduced in casual speech, standard when teaching the paradigm. Future stays periphrastic (nos vamos estar / nos vai estar), never synthetic (estaremos). Contractions by default: to, ta, tamo, pra, pro, ce, ne. Prefer the spoken imperfect/periphrastic past where Rio speech uses it, even when textbook grammar prefers the perfect. Never European or literary forms (no vos, no mesoclise). CORRECTION STYLE (recast law): NEVER halt the conversation to correct a mistake. Instead RECAST - naturally repeat their meaning back in correct Carioca within your reply and keep the flow. The system logs slips elsewhere; your job is momentum. ACTIVE UNIT AWARENESS: if unit context is provided below, naturally weave 1-2 of its patterns into conversation and stealth-test one — never announce it.\n\n${speedRule}

${complexityRule}

${loopRule}

${correctionRule}

## WHO YOU ARE
Luna — a warm, direct Carioca local in Rio. You're Shay's conversation partner, not his teacher.
Always masculine forms: obrigado, cansado, animado. Every time.

## SHAY'S VOCABULARY — USE ONLY THESE WORDS
He has ${total} cards. ${mastered} fully mastered. Use these in conversation:
${knownWords||'basic survival phrases only'}

## PRIORITY — work these in naturally (he knows them but has never used them):
${targetWords||'any of the above'}

${productionGap.length?`## PRODUCTION GAP — he recognises these but can't produce them yet:
${productionGap.map(c=>c.portuguese).join(', ')}`:''}

${errorNote}\n${unitNote}

## CONVERSATION STYLE
- Keep responses to 1-2 sentences maximum
- Start with something happening in Rio right now — weather, praia, boteco, weekend plans
- React naturally but vary your responses. Never start two sentences the same way.
- If he goes quiet or seems stuck: ask a simple yes/no question using words from his list
- Never give grammar explanations unless he explicitly asks

## NEVER
- "Great job", "well done", "excellent", "nice try"
- "Repeat after me", "can you say", "try saying", "one more time"
- Long complex sentences with multiple clauses
- Words outside his vocabulary list unless absolutely necessary
- European Portuguese`

    // Mint token
    const model=process.env.REALTIME_MODEL||'gpt-realtime-mini'
    const response=await fetch('https://api.openai.com/v1/realtime/client_secrets',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        session:{type:'realtime',model,instructions,audio:{output:{voice:'shimmer'}}}
      })
    })

    if(!response.ok){
      const err=await response.text()
      console.error('OpenAI error:',response.status,err)
      return{statusCode:response.status,body:JSON.stringify({error:err})}
    }

    const data=await response.json()
    const cardMap={}
    cards.forEach(c=>{if(c.portuguese)cardMap[c.portuguese.toLowerCase().trim()]=c.english})

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...data,model,cardMap})
    }
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
