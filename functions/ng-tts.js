// ng-tts.js — TTS wrapper
// Tries ElevenLabs (better Carioca) first, falls back to OpenAI TTS

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{text='',voice='nova'}=JSON.parse(event.body||'{}')
    if(!text.trim())return{statusCode:400,body:JSON.stringify({error:'No text'})}

    let audioBase64=null
    let source='openai'

    // Try ElevenLabs if API key configured
    const elKey=process.env.ELEVENLABS_API_KEY
    const elVoice=process.env.ELEVENLABS_VOICE_ID
    if(elKey&&elVoice){
      try{
        const res=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elVoice}`,{
          method:'POST',
          headers:{'Content-Type':'application/json','xi-api-key':elKey},
          body:JSON.stringify({
            text,
            model_id:'eleven_multilingual_v2',
            voice_settings:{stability:0.5,similarity_boost:0.75,style:0.3,use_speaker_boost:true}
          })
        })
        if(res.ok){
          const buf=await res.arrayBuffer()
          audioBase64=Buffer.from(buf).toString('base64')
          source='elevenlabs'
        }
      }catch(e){console.log('ElevenLabs failed:',e.message)}
    }

    // Fallback: OpenAI TTS
    if(!audioBase64){
      const validVoices=['alloy','ash','coral','echo','fable','nova','onyx','sage','shimmer']
      const safeVoice=validVoices.includes(voice)?voice:'nova'
      const res=await fetch('https://api.openai.com/v1/audio/speech',{
        method:'POST',
        headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({model:'tts-1',voice:safeVoice,input:text,speed:0.9})
      })
      if(res.ok){
        const buf=await res.arrayBuffer()
        audioBase64=Buffer.from(buf).toString('base64')
      }
    }

    if(!audioBase64)return{statusCode:500,body:JSON.stringify({error:'TTS failed'})}

    return{statusCode:200,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({audio:audioBase64,source})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
