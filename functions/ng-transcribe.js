// ng-transcribe.js
// Receives raw audio blob from client, sends to Whisper API, returns transcript
// Used by VoiceMode MediaRecorder approach since input_audio_transcription
// is rejected by OpenAI Realtime API over WebRTC data channel

exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS'){
    return{statusCode:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'}}
  }
  if(event.httpMethod!=='POST'){
    return{statusCode:405,body:'Method not allowed'}
  }

  try{
    const body=event.isBase64Encoded
      ?Buffer.from(event.body,'base64')
      :Buffer.from(event.body||'','binary')

    if(!body||body.length<1000){
      return{
        statusCode:200,
        headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
        body:JSON.stringify({text:''})
      }
    }

    // Build FormData for Whisper API
    const{FormData,Blob,fetch:nodeFetch}=globalThis
    const blob=new Blob([body],{type:'audio/webm'})
    const form=new FormData()
    form.append('file',blob,'speech.webm')
    form.append('model','whisper-1')
    form.append('language','pt') // Portuguese — speeds up transcription

    const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
      body:form
    })

    const d=await r.json()
    console.log('Whisper result:',d.text?.slice(0,50)||'(empty)')

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
      body:JSON.stringify({text:d.text||''})
    }
  }catch(e){
    console.error('ng-transcribe error:',e.message)
    return{
      statusCode:200, // don't fail — just return empty
      headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
      body:JSON.stringify({text:''})
    }
  }
}
