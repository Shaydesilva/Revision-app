exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{transcript=[],duration_seconds=0}=JSON.parse(event.body||'{}')
    if(!transcript.length)return{statusCode:200,body:JSON.stringify({ok:true})}

    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    // Load Carioca cards for matching
    const{data:cards}=await sb.from('cards').select('id,portuguese,english,mastery,reps,easeFactor,interval,nextReview,sentenceCount,sentenceScore,productionMastery,recognitionMastery,priority,priorityStreak').eq('user_id',UID)
    const cardList=(cards||[]).map(c=>`${c.id}|${c.portuguese}|${c.english}`).join('\n')
    const transcriptText=transcript.map(t=>`${t.role==='assistant'?'Luna':'Shay'}: ${t.text}`).join('\n')

    // GPT-4o-mini analysis
    const gptRes=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gpt-4o-mini',
        max_tokens:900,
        temperature:0.2,
        response_format:{type:'json_object'},
        messages:[{
          role:'system',
          content:`Analyze this Portuguese learning conversation. Return JSON only.
Rules: NEVER penalise missing accents. Accept all Carioca contractions.
Judge production by meaning and intelligibility, not formal grammar.`
        },{
          role:'user',
          content:`Cards in deck:\n${cardList}\n\nTranscript:\n${transcriptText}\n\nReturn JSON:
{
  "usedCorrectly": ["card_id"],
  "struggled": ["card_id"],
  "newWords": [{"portuguese":"word","english":"meaning","exampleSentence":"from transcript"}],
  "summary": "2 sentence honest summary of the session",
  "score": 0-100,
  "errorTypes": ["register|vocabulary|structure|pronunciation"]
}`
        }]
      })
    })

    const gptData=await gptRes.json()
    const analysis=JSON.parse(gptData.choices?.[0]?.message?.content||'{}')

    const now=new Date()
    const cardById={}
    ;(cards||[]).forEach(c=>{cardById[c.id]=c})

    // SM-2 update function matching Carioca's algorithm
    function sm2(card,q){
      let ef=card.easeFactor??2.5,iv=card.interval??0,rp=card.reps??0
      if(q>=3){iv=rp===0?1:rp===1?6:Math.round(iv*ef);rp++}else{iv=1;rp=0}
      ef=Math.max(1.3,ef+0.1-(5-q)*(0.08+(5-q)*0.02))
      if(card.priority)iv=Math.max(1,Math.round(iv*0.33))
      const nr=new Date();nr.setDate(nr.getDate()+iv)
      const mastery=Math.min(5,rp===0?0:rp<=1?1:rp<=3?2:rp<=5?3:rp<=8?4:5)
      let priority=card.priority||false,priorityStreak=card.priorityStreak||0
      if(priority){if(q>=4){priorityStreak++;if(priorityStreak>=3&&mastery>=4){priority=false;priorityStreak=0}}else priorityStreak=0}
      return{easeFactor:ef,interval:iv,reps:rp,nextReview:nr.toISOString(),mastery,priority,priorityStreak}
    }

    const cardUpdates={}
    const boostWords=[]
    const struggleWords=[]

    // Boost correctly used cards
    for(const id of(analysis.usedCorrectly||[])){
      const card=cardById[id]
      if(!card)continue
      const u=sm2(card,4) // quality 4 = produced correctly
      const pm=Math.max(card.productionMastery||0,u.mastery)
      const sc=(card.sentenceCount||0)+1
      await sb.from('cards').update({
        ...u,
        production_mastery:pm,
        sentence_count:sc,
        updated_at:now.toISOString()
      }).eq('id',id).eq('user_id',UID)
      cardUpdates[id]=4
      boostWords.push(card.portuguese)
    }

    // Flag struggled cards as priority
    for(const id of(analysis.struggled||[])){
      const card=cardById[id]
      if(!card)continue
      const u=sm2(card,1) // quality 1 = struggled
      await sb.from('cards').update({
        ...u,
        priority:true,
        updated_at:now.toISOString()
      }).eq('id',id).eq('user_id',UID)
      cardUpdates[id]=1
      struggleWords.push(card.portuguese)
    }

    // Add new words to Carioca deck
    const newCardsAdded=[]
    for(const w of(analysis.newWords||[]).slice(0,8)){
      if(!w.portuguese)continue
      // Check not already in deck
      const exists=(cards||[]).some(c=>c.portuguese.toLowerCase().trim()===w.portuguese.toLowerCase().trim())
      if(exists)continue
      const nr=new Date();nr.setDate(nr.getDate()+1)
      await sb.from('cards').insert({
        id:`voice-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        user_id:UID,
        portuguese:w.portuguese,
        english:w.english||'',
        example_sentence:w.exampleSentence||null,
        type:'vocab',
        mastery:0,ease_factor:2.5,interval:0,reps:0,
        next_review:nr.toISOString(),
        sentence_count:0,sentence_score:0,
        recognition_mastery:0,production_mastery:0,
        priority:false,priority_streak:0
      })
      newCardsAdded.push(w.portuguese)
    }

    // Log error patterns
    for(const et of(analysis.errorTypes||[])){
      const{data:ep}=await sb.from('error_patterns').select('*').eq('user_id',UID).eq('error_type',et).limit(1).single().catch(()=>({data:null}))
      if(ep){
        await sb.from('error_patterns').update({count:(ep.count||0)+1,last_seen:now.toISOString()}).eq('user_id',UID).eq('error_type',et)
      }else{
        await sb.from('error_patterns').insert({user_id:UID,error_type:et,count:1,last_seen:now.toISOString(),examples:[]}).catch(()=>{})
      }
    }

    // Save voice session log
    await sb.from('voice_sessions').insert({
      user_id:UID,
      mode:'talk',
      duration_seconds:duration_seconds||0,
      words_boosted:boostWords,
      words_struggled:struggleWords,
      words_added:newCardsAdded,
      overall_score:analysis.score||0,
      summary:analysis.summary||''
    }).catch(()=>{})

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ok:true,
        cardUpdates,
        boostWords,
        struggleWords,
        newCardsAdded,
        summary:analysis.summary||'',
        score:analysis.score||0
      })
    }
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
