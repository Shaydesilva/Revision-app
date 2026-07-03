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
    const ct=(event.headers&&(event.headers['content-type']||event.headers['Content-Type']))||'audio/webm'
    const ext=/mp4/.test(ct)?'mp4':/ogg/.test(ct)?'ogg':'webm'
    const blob=new Blob([body],{type:ct.split(';')[0]})
    const form=new FormData()
    form.append('file',blob,'speech.'+ext)
    form.append('model','whisper-1')
    // No language lock — learner mixes PT/EN, auto-detect is more accurate
    // Prompt primes Whisper for Carioca vocabulary and contractions
    const _hint=decodeURIComponent((event.queryStringParameters&&event.queryStringParameters.hint)||'').slice(0,400)
    form.append('prompt',
      'Conversa em português brasileiro, estilo carioca. ' +
      'Palavras comuns: bora, tamo, tá, né, cara, galera, beleza, saudade, ' +
      'boa, show, legal, massa, curtir, curtindo, demais, pra, pro, ' +
      'tô, você, vc, aqui, lá, isso, esse, essa, ' +
      'obrigado, obrigada, por favor, com licença, desculpa, ' +
      'oi, olá, tchau, até logo, até mais.'
    +(_hint?' Padrões desta sessão: '+_hint+'.':''))
    form.append('temperature','0') // deterministic — reduces hallucination

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
