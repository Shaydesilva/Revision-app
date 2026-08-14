const LANG=require('./lang.cjs')
// ng-say-it.js
// Carioca translator + TTS + scaffold detection (returns suggestions, never auto-adds)

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
const{REGISTER_LAW_GENERATE}=require('./register-law.cjs')
const INTEL=require('./ng-intel.cjs')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID=LANG.uidFromEvent(event) // Rio or Paisa bank
    const PACK=LANG.packFromEvent(event) // the register law + city this call speaks
    const{text='',addToBank=false,cardData=null,approvedScaffolds=[],forceScaffold=false}=JSON.parse(event.body||'{}')

    // Handle adding approved scaffolds to bank
    if(approvedScaffolds.length){
      const results=[]
      const newIds=[]
      for(const sc of approvedScaffolds){
        const id='sc_sayit_'+Date.now()+'_'+Math.random().toString(36).slice(2,5)
        const{error}=await sb.from('ng_scaffolds').insert({
          id,
          user_id:UID,
          base_portuguese:sc.base_portuguese,
          base_english:sc.base_english||'',
          stages:(sc.stages||[]).map((st,i)=>({stage:st.stage||i+1,pt:st.pt,en:st.en,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})),
          current_stage:1,
          phase:1,
          category:INTEL.safeCategory(sc.category),
          context:sc.context||'general',
          cluster:'say_it',
          source:'say_it',
          last_practiced:null
        })
        if(!error)newIds.push(id)
        results.push({base:sc.base_portuguese,ok:!error,error:error?.message})
      }
      // Born with a home: straight into the street inbox, visible everywhere today.
      try{await INTEL.attachToInbox(sb,UID,newIds)}catch(e){console.log('inbox attach:',e.message)}
      return{statusCode:200,body:JSON.stringify({ok:true,added:results})}
    }

    // Handle adding card to OG bank
    if(addToBank&&cardData){
      const{error}=await sb.from('cards').insert({
        user_id:UID,
        portuguese:cardData.portuguese,
        english:cardData.english,
        mastery:0,
        lastReviewed:new Date().toISOString(),
        sentenceCount:0,
        createdAt:new Date().toISOString()
      })
      return{statusCode:200,body:JSON.stringify({ok:!error,error:error?.message})}
    }

    if(!text.trim())return{statusCode:400,body:JSON.stringify({error:'No text'})}

    // Load existing scaffold bases to avoid suggesting duplicates
    const{data:existingScaffolds}=await sb
      .from('ng_scaffolds').select('base_portuguese').eq('user_id',UID)
    const existingBases=new Set((existingScaffolds||[]).map(s=>s.base_portuguese.toLowerCase().trim()))

    // Translate + detect scaffold suggestions in one call
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',max_tokens:600,
        system:`${PACK.lawGenerate}\n\nYou are an expert in the real spoken ${PACK.language} of ${PACK.city}. You translate text into natural ${PACK.label} ${PACK.language} and identify scaffold patterns.

TRANSLATION RULES:
- Obey the register law above absolutely — it defines the local register
- Preserve the tone and register of the original
- If the input is already ${PACK.language}, improve it to natural ${PACK.label} register
- Never a neutral/textbook version, never another country's register

SCAFFOLD DETECTION:
A scaffold is a conversational pattern with depth — a phrase that can be naturally extended in stages.
Only suggest NEW scaffolds not in the existing bank. Only suggest if genuinely useful for daily life in ${PACK.city}.
Max 2 suggestions per call.
${forceScaffold?`FORCE MODE: You MUST return exactly ONE scaffold built around the given phrase. ANALYZE the phrase's register and complexity, then PLACE IT at its correct rung of a natural 4-stage acquisition ladder (anchor_stage 1-4): if it's already complex street ${PACK.language} it belongs at stage 3-4 with simpler foundations built BENEATH it; if it's a simple base it sits at stage 1 with extensions built above. The ladder must feel like one pattern family growing, not four unrelated lines. Include "anchor_stage" in the JSON.`:''}

Existing bases (don't suggest these): ${Array.from(existingBases).slice(0,30).join(', ')}

Return JSON only (the "carioca" key name is legacy — it always holds the ${PACK.label} version):
{
  "carioca": "the natural ${PACK.label} ${PACK.language} version",
  "back_translation": "literal English back-translation",
  "register": "casual|social|dating|formal",
  "scaffolds": [
    {
      "base_portuguese": "base form",
      "base_english": "translation",
      "category": "survival|grammar_core|identity|social|deep_fluency|personality_humour",
      "context": "social|dating|bar|beach|general",
      "stages": [
        {"stage":1,"pt":"base form","en":"translation"},
        {"stage":2,"pt":"natural extension","en":"translation"},
        {"stage":3,"pt":"fuller extension","en":"translation"},
        {"stage":4,"pt":"full ${PACK.label} version","en":"translation"}
      ],
      "reason": "one sentence on why this is worth learning"
    }
  ]
}`,
        messages:[{role:'user',content:text}]
      })
    })
    const data=await res.json()
    let result={carioca:'',back_translation:'',register:'casual',scaffolds:[]}
    try{result=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch{}

    // Filter scaffold suggestions against existing
    const suggestions=(result.scaffolds||[]).filter(s=>
      s.base_portuguese&&(forceScaffold||!existingBases.has(s.base_portuguese.toLowerCase().trim()))
    )

    // Generate TTS audio
    let audioBase64=null
    try{
      const ttsRes=await fetch('https://api.openai.com/v1/audio/speech',{
        method:'POST',
        headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({model:'tts-1',voice:PACK.ttsVoice,input:result.carioca,speed:PACK.ttsSpeed})
      })
      if(ttsRes.ok){
        const buf=await ttsRes.arrayBuffer()
        audioBase64=Buffer.from(buf).toString('base64')
      }
    }catch(e){console.log('TTS error:',e.message)}

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ok:true,
        original:text,
        carioca:result.carioca,
        back_translation:result.back_translation,
        register:result.register,
        audio:audioBase64,
        suggestions
      })
    }
  }catch(e){
    console.error('ng-say-it:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
