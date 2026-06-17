exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{word,text,cardMap={}}=JSON.parse(event.body||'{}')

    // Single word translation — check card deck first
    if(word){
      const key=word.toLowerCase().trim()
      // If it's in the user's deck, return instantly without GPT call
      if(cardMap[key]!==undefined){
        return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({translation:cardMap[key],fromDeck:true})}
      }
      // Fall through to GPT
      const res=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',
        headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'gpt-4o-mini',max_tokens:120,temperature:0.1,
          response_format:{type:'json_object'},
          messages:[{role:'user',content:`Translate this word/phrase. Return JSON: {"translation":"concise meaning","note":"5 word usage note or null","language":"pt or en"}\nWord: "${word}"`}]
        })
      })
      const d=await res.json()
      const result=JSON.parse(d.choices?.[0]?.message?.content||'{}')
      return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify(result)}
    }

    // Full message translation
    if(text){
      const res=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',
        headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'gpt-4o-mini',max_tokens:200,temperature:0.1,
          response_format:{type:'json_object'},
          messages:[{role:'user',content:`Translate this text naturally. If English→casual Carioca Portuguese (masculine, contractions: tô/tá/cê/cadê). If Portuguese→English. Return JSON: {"translation":"..."}\nText: "${text}"`}]
        })
      })
      const d=await res.json()
      const result=JSON.parse(d.choices?.[0]?.message?.content||'{}')
      return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify(result)}
    }

    return{statusCode:400,body:JSON.stringify({error:'No word or text provided'})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
