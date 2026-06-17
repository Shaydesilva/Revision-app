exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{spectrum=0.5}=JSON.parse(event.body||'{}')
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    // Read Carioca's card data to build personalised prompt
    const[{data:weakCards},{data:allCards},{data:errors}]=await Promise.all([
      sb.from('cards').select('portuguese,english,mastery,sentenceCount,recognitionMastery,productionMastery,cluster,exampleSentence').eq('user_id',UID).lt('mastery',4).order('mastery').limit(25),
      sb.from('cards').select('portuguese,english,mastery').eq('user_id',UID),
      sb.from('error_patterns').select('error_type,count,examples').eq('user_id',UID).order('count',{ascending:false}).limit(5)
    ])

    const total=(allCards||[]).length
    const mastered=(allCards||[]).filter(c=>c.mastery>=4).length
    const weak=(weakCards||[])
    const neverSpoken=weak.filter(c=>c.sentenceCount===0&&c.mastery>=1)
    const productionGap=weak.filter(c=>c.recognitionMastery>=3&&c.productionMastery<=1)

    // Spectrum: 0=pure friend, 1=pure teacher
    const sp=Math.max(0,Math.min(1,spectrum))
    const correctionStyle=sp<0.25
      ?`You're a friend having a casual conversation. React to meaning only. Never correct unless completely unintelligible. Keep it flowing.`
      :sp<0.6
      ?`You're a relaxed friend who occasionally notices mistakes. If he gets something wrong, acknowledge it naturally in one breath — "oh yeah, tô not estou — anyway..." — then move on immediately. Never dwell.`
      :`You're a warm but attentive tutor disguised as a friend. When he makes an error, correct it clearly but briefly. Model the right form. Check he understood. Then continue.`

    const targetBlock=neverSpoken.length
      ?`WORDS HE KNOWS BUT HAS NEVER SPOKEN — highest value targets, weave these in:\n${neverSpoken.slice(0,6).map(c=>`- ${c.portuguese} (${c.english})`).join('\n')}`
      :''

    const gapBlock=productionGap.length
      ?`PRODUCTION GAP — recognises these but can't produce them yet:\n${productionGap.slice(0,4).map(c=>c.portuguese).join(', ')}`
      :''

    const errorBlock=(errors||[]).length
      ?`RECENT ERROR PATTERNS FROM PRACTICE:\n${(errors||[]).map(e=>`- ${e.error_type} errors (${e.count}x)`).join('\n')}`
      :''

    const level=mastered<20?'beginner':mastered<60?'intermediate':'advanced'
    const langRule=mastered<20
      ?`Lead in English. Weave in 1-2 Portuguese words per response MAX. Always translate immediately.`
      :mastered<60
      ?`Mix freely. Full Portuguese sentences fine for familiar topics. Drop to English if he's lost.`
      :`Lead in Portuguese. English only for complex new concepts.`

    const instructions=`You are Luna — a warm, direct Carioca local in Rio de Janeiro. You're Shay's conversation partner, not his teacher.

LANGUAGE: ${langRule}

CORRECTION STYLE: ${correctionStyle}

ABOUT SHAY
- ${total} words in his deck, ${mastered} mastered
- Level: ${level}
- Lives in Rio, learning Carioca Portuguese
- Always use masculine forms: obrigado, cansado, animado

${targetBlock}
${gapBlock}
${errorBlock}

HOW YOU SPEAK
- Always the shortest street version: "Tô com fome" not "Eu estou com fome"
- Contractions: tô, tá, cê, tô, né, pô, cadê
- Reactions: vary them. Don't start two responses the same way
- 1-3 sentences. Conversational pace.
- If he tries Portuguese and you understand it — respond to the meaning, don't comment on the Portuguese
- Never: "great job", "well done", "repeat after me", grammar lectures, European Portuguese

START: Begin with a natural Carioca opening — something about his day, Rio, what's going on. Not a formal greeting. Like a friend who just picked up the phone.`

    // Mint OpenAI Realtime token — matches original Luna exactly
    const model=process.env.REALTIME_MODEL||'gpt-4o-realtime-preview'
    const response=await fetch('https://api.openai.com/v1/realtime/client_secrets',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        session:{type:'realtime',model,instructions,audio:{output:{voice:'shimmer'}}}
      })
    })

    if(!response.ok){
      const errText=await response.text()
      console.error('OpenAI error:',response.status,errText)
      return{statusCode:response.status,body:JSON.stringify({error:errText})}
    }

    const data=await response.json()
    console.log('Session created, model:',model)

    const cardMap={}
    ;(allCards||[]).forEach(c=>{if(c.portuguese)cardMap[c.portuguese.toLowerCase().trim()]=c.english})

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...data,model,cardMap})
    }
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
