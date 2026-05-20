import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const BG='#07070f',S='#0d0d1a',S2='#131324',BD='#1a1a32',AC='#4f8ef7',TX='#eeeef5',MU='#55557a',GR='#34d399',RE='#f87171',YE='#fbbf24'
const FONT="-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif"
const TIERS=[{name:'Turista',min:0},{name:'Comunicador',min:15},{name:'Carioca',min:35},{name:'Carioca Honorário',min:60}]
const getTier=n=>TIERS.reduce((a,t)=>n>=t.min?t:a,TIERS[0])
const CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body{background:${BG};overscroll-behavior:none;font-family:${FONT}}@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}textarea,input{font-family:${FONT}}`

// Device ID — no login needed
function getDeviceId(){
  let id=localStorage.getItem('carioca-device-id')
  if(!id){id=crypto.randomUUID();localStorage.setItem('carioca-device-id',id)}
  return id
}

// SM-2
function sm2(card,q){
  let ef=card.easeFactor??2.5,iv=card.interval??0,rp=card.reps??0
  if(q>=3){iv=rp===0?1:rp===1?6:Math.round(iv*ef);rp++}else{iv=1;rp=0}
  ef=Math.max(1.3,ef+0.1-(5-q)*(0.08+(5-q)*0.02))
  const nr=new Date();nr.setDate(nr.getDate()+iv)
  const mastery=Math.min(5,rp===0?0:rp<=1?1:rp<=3?2:rp<=5?3:rp<=8?4:5)
  return{easeFactor:ef,interval:iv,reps:rp,nextReview:nr.toISOString(),mastery}
}
function buildDeck(cards){
  const now=new Date()
  const due=cards.filter(c=>new Date(c.nextReview)<=now&&c.mastery>0).sort(()=>Math.random()-0.5)
  const fresh=cards.filter(c=>c.mastery===0).sort(()=>Math.random()-0.5)
  if(!due.length)return fresh.slice(0,20)
  return[...due,...fresh.slice(0,Math.max(3,Math.round(due.length*0.3)))].slice(0,20)
}

// Seed cards
const mk=(id,p,e,t,x={})=>({id:String(id),portuguese:p,english:e,type:t,cluster:null,contrast:null,scenario:null,mastery:0,easeFactor:2.5,interval:0,reps:0,nextReview:new Date().toISOString(),sentenceScore:0,sentenceCount:0,...x})
const SEED=[
  mk(1,"opa","hey / whoa","giria",{cluster:"greeting"}),mk(2,"vixe","geez / oh wow","giria",{cluster:"exclamation"}),
  mk(3,"eita","damn / wow","giria",{cluster:"exclamation"}),mk(4,"puta merda","holy shit","giria",{cluster:"exclamation"}),
  mk(5,"caralho","fuck / holy shit","giria",{cluster:"exclamation"}),mk(6,"caraca","wow — softer than caralho","giria",{cluster:"exclamation",contrast:"caralho"}),
  mk(7,"puta que pariu","holy fucking shit","giria",{cluster:"exclamation"}),mk(8,"koe","what's up?","giria",{cluster:"greeting"}),
  mk(9,"fala ai","what's up / talk to me","giria",{cluster:"greeting"}),mk(10,"coisa","thing","vocab",{cluster:"thing"}),
  mk(11,"treco","thing / stuff informal","giria",{cluster:"thing"}),mk(12,"bagulho","thing / stuff street","giria",{cluster:"thing"}),
  mk(13,"mano","bro / man","giria",{cluster:"address"}),mk(14,"cara","dude / man","giria",{cluster:"address"}),
  mk(15,"gatinha","attractive girl / hottie","giria"),mk(16,"gostoso/a","hot / delicious","vocab"),
  mk(17,"to ligado","I understand / I get it","frase_pronta"),mk(18,"ta ligado?","you know? / you get it?","frase_pronta"),
  mk(19,"bora","let's go","giria",{cluster:"letsgo",contrast:"vamos"}),mk(20,"tamo indo","we're heading out","frase_pronta",{cluster:"letsgo",contrast:"estamos indo"}),
  mk(21,"acabei de aprender isso","I just learned this","sentence"),mk(22,"valeu","thanks / bet / aight","giria"),
  mk(23,"tchau","goodbye","vocab"),mk(24,"ate logo","see you later","frase_pronta"),mk(25,"foi um prazer","it was a pleasure","frase_pronta"),
  mk(26,"a gente se ve","we'll see each other","frase_pronta"),mk(27,"a gente","us / we replaces nos","grammar",{contrast:"nos"}),
  mk(28,"vamo pra praia","let's go to the beach","sentence",{cluster:"letsgo",scenario:"social"}),
  mk(29,"eu me mudei pro Rio","I moved to Rio","sentence"),mk(30,"pra / pro","contracted from para a / para o","grammar"),
  mk(31,"queria","wanted / was wanting","vocab"),
  mk(32,"me ve uma cerveja","can I have a beer","frase_pronta",{contrast:"eu gostaria de uma cerveja",scenario:"ordering"}),
  mk(33,"me ve uma gelada","can I have a cold one","frase_pronta",{scenario:"ordering"}),
  mk(34,"bora tomar uma","let's grab a drink","frase_pronta",{cluster:"letsgo",scenario:"social"}),
  mk(35,"a conta por favor","the check please","frase_pronta",{scenario:"ordering"}),
  mk(36,"pode repetir?","can you repeat that?","frase_pronta"),mk(37,"pode falar devagar?","can you speak slowly?","frase_pronta"),
  mk(38,"qual e o nome?","what's the name?","frase_pronta"),mk(39,"quanto que ta?","how much is it?","frase_pronta",{scenario:"shopping"}),
  mk(40,"po faz por quinze?","come on make it fifteen?","frase_pronta",{scenario:"shopping"}),
  mk(41,"vou pagar no credito","I'll pay by card","frase_pronta",{scenario:"shopping"}),
  mk(42,"eu tambem","me too","vocab"),mk(43,"sem gas","still water","vocab",{scenario:"ordering"}),
  mk(44,"exatamente","exactly","vocab"),mk(45,"concordo","I agree","vocab"),mk(46,"mesmo","same / really / even","vocab"),
  mk(47,"e mesmo","oh yeah that's true","giria"),mk(48,"parecido","similar","vocab"),mk(49,"sem graca","boring / bland","vocab"),
  mk(50,"nasci e cresci no Rio","I was born and raised in Rio","sentence"),
  mk(51,"atrasado","late","vocab"),mk(52,"demais","too much / a lot","vocab"),mk(53,"depois","after / later","vocab"),
  mk(54,"de boa","chilling / all good","giria"),mk(55,"ta pronta?","are you ready?","frase_pronta"),
  mk(56,"mao de vaca","stingy / cheapskate","giria"),mk(57,"nao compensa","not worth it","frase_pronta"),mk(58,"trouxa","dumb / sucker","giria"),
  mk(59,"eu tava no clube","I was at the club","sentence",{contrast:"eu estava no clube"}),mk(60,"eu fui pra praia","I went to the beach","sentence"),
  mk(61,"eu quero ir pra praia","I want to go to the beach","sentence"),mk(62,"eu quero ir pro bar","I want to go to the bar","sentence",{scenario:"social"}),
  mk(63,"bairro","neighbourhood","vocab"),mk(64,"po","come on / damn mild","giria"),
  mk(65,"uma delicia","delicious / amazing","vocab",{scenario:"food"}),mk(66,"essa comida ta do caralho","this food is fucking amazing","sentence",{scenario:"food"}),
  mk(67,"de + a = da","contraction da e.g. cafe da manha","grammar"),mk(68,"de + o = do","contraction do e.g. carro do Victor","grammar"),
  mk(69,"eu gosto de futebol","I like football","sentence"),mk(70,"mano estamos atrasados bora","bro we're late let's go","sentence",{cluster:"letsgo"}),
]

// Supabase — no auth, uses device ID as user_id
const SB_URL=import.meta.env.VITE_SUPABASE_URL
const SB_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY
const sb=(SB_URL&&SB_KEY)?createClient(SB_URL,SB_KEY):null

const toRow=(c,uid)=>({id:c.id,user_id:uid,portuguese:c.portuguese,english:c.english,type:c.type,cluster:c.cluster||null,contrast:c.contrast||null,scenario:c.scenario||null,mastery:c.mastery||0,ease_factor:c.easeFactor||2.5,interval:c.interval||0,reps:c.reps||0,next_review:c.nextReview||new Date().toISOString(),sentence_score:c.sentenceScore||0,sentence_count:c.sentenceCount||0})
const fromRow=r=>({id:r.id,portuguese:r.portuguese,english:r.english,type:r.type,cluster:r.cluster,contrast:r.contrast,scenario:r.scenario,mastery:r.mastery||0,easeFactor:r.ease_factor||2.5,interval:r.interval||0,reps:r.reps||0,nextReview:r.next_review||new Date().toISOString(),sentenceScore:r.sentence_score||0,sentenceCount:r.sentence_count||0})

async function dbLoad(uid){
  if(!sb)return null
  try{
    const[{data:cards},{data:state}]=await Promise.all([
      sb.from('cards').select('*').eq('user_id',uid),
      sb.from('user_state').select('*').eq('user_id',uid).single()
    ])
    return{cards:(cards||[]).map(fromRow),state:state||null}
  }catch(e){console.error('dbLoad',e);return null}
}
async function dbSeed(uid,cards){if(!sb)return;await sb.from('cards').upsert(cards.map(c=>toRow(c,uid)),{onConflict:'id,user_id'})}
async function dbUpdateCard(uid,card){
  if(!sb)return
  await sb.from('cards').update({mastery:card.mastery,ease_factor:card.easeFactor,interval:card.interval,reps:card.reps,next_review:card.nextReview,sentence_score:card.sentenceScore||0,sentence_count:card.sentenceCount||0,updated_at:new Date().toISOString()}).eq('id',card.id).eq('user_id',uid)
}
async function dbInsertCards(uid,cards){if(!sb)return;await sb.from('cards').insert(cards.map(c=>toRow(c,uid)))}
async function dbSaveState(uid,fluency,streak,lastDate,history){
  if(!sb)return
  await sb.from('user_state').upsert({user_id:uid,fluency_rating:fluency,streak_days:streak,last_session_date:lastDate,sentence_history:history||[],updated_at:new Date().toISOString()},{onConflict:'user_id'})
}

// Claude via Netlify proxy
async function callClaude(system,messages,max=900){
  const r=await fetch('/.netlify/functions/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system,messages,max_tokens:max})})
  const d=await r.json();return d.content?.[0]?.text||''
}
const ct=(sys,txt,max)=>callClaude(sys,[{role:'user',content:txt}],max)

async function generateScenario(cards,history){
  const vocab=cards.filter(c=>c.mastery>=2).map(c=>`${c.portuguese} (${c.english}, mastery:${c.mastery}, uses:${c.sentenceCount})`).join('\n')
  const priority=cards.filter(c=>c.mastery>=2&&c.sentenceCount===0).slice(0,5).map(c=>c.portuguese).join(', ')
  const recent=(history||[]).slice(-4).map(s=>s.english).join(' | ')
  const raw=await ct(`Carioca Portuguese tutor in Rio creating sentence practice scenarios.
ONE realistic Rio situation — student writes what they would say, not a translation.
Use words with mastery>=2. Prioritise unused in sentences: ${priority||'any'}. Avoid: ${recent||'none'}.
Set in real Rio: boteco, praia, uber, rua, vizinho, mercado. Accents optional, accept all Carioca speech.
Reply ONLY valid JSON: {"english":"situation","targetWords":["w1","w2"],"scenario":"boteco|praia|rua|social|compras","context":"brief scene"}`,
  `Vocabulary:\n${vocab}\n\nGenerate:`,600)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}
  catch{return{english:"You walked into your boteco. Order a cold beer.",targetWords:["me ve","gelada"],scenario:"boteco",context:"Bar in Rio"}}
}

async function evalAnswer(scenario,answer,cards){
  const raw=await ct(`Warm Carioca Portuguese tutor. IGNORE accents completely. Accept all Carioca speech: tamo,pra,ta,num,ce. Score MEANING and NATURALNESS only.
Reply ONLY valid JSON: {"wordScores":{"word":1-5},"naturalness":0-100,"feedback":"one warm line","correction":"natural Carioca version or null"}`,
  `Situation: ${scenario.english}\nTargets: ${scenario.targetWords?.join(', ')||''}\nStudent: "${answer}"`,500)
  try{
    const ev=JSON.parse(raw.replace(/```json|```/g,'').trim())
    const cardUpdates={}
    Object.entries(ev.wordScores||{}).forEach(([word,score])=>{
      const card=cards.find(c=>c.portuguese.toLowerCase().includes(word.toLowerCase()))
      if(card)cardUpdates[card.id]=score
    })
    return{...ev,cardUpdates}
  }catch{return{wordScores:{},naturalness:50,feedback:"Check connection.",correction:null,cardUpdates:{}}}
}

async function extractFromPDF(b64,existing){
  try{
    const raw=await callClaude(`Extract ALL vocab, phrases, grammar from this Brazilian Portuguese lesson.
Return ONLY JSON array: [{"portuguese":"...","english":"..." or null,"type":"giria"|"vocab"|"frase_pronta"|"grammar"|"sentence","cluster":"..." or null,"contrast":"..." or null}]`,
    [{role:'user',content:[{type:'document',source:{type:'base64',media_type:'application/pdf',data:b64}},{type:'text',text:'Extract as JSON:'}]}],4000)
    const items=JSON.parse(raw.replace(/```json|```/g,'').trim())
    return items.filter(i=>i.portuguese&&!existing.has(i.portuguese.toLowerCase().trim()))
  }catch(e){console.error(e);return[]}
}

async function openChatAPI(type){
  const raw=await ct(`Carioca local in Rio, language practice. Short, casual, real Carioca contractions.
Reply ONLY valid JSON: {"message":"opening in Portuguese","translation":"English"}`,`Scenario: ${type}\nOpen:`,300)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return{message:"Oi! Tudo bom?",translation:"Hey! All good?"}}
}

async function replyChatAPI(history){
  const convo=history.map(h=>`${h.role==='user'?'Student':'Carioca'}: ${h.content}`).join('\n')
  const raw=await ct(`Carioca local, casual conversation with language student. Short, natural, Carioca.
Reply ONLY valid JSON: {"message":"reply in Portuguese","translation":"English"}`,`${convo}\n\nYour reply:`,300)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return{message:"E mesmo?",translation:"Oh really?"}}
}

async function evalChatAPI(history,cards){
  const convo=history.map(h=>`${h.role}: ${h.content}`).join('\n')
  const vocab=cards.filter(c=>c.mastery>=2).map(c=>c.portuguese).slice(0,20).join(', ')
  const raw=await ct(`Evaluate Portuguese conversation. IGNORE accents. Accept all Carioca speech.
Reply ONLY valid JSON: {"overallScore":0-100,"feedback":"2-3 warm sentences","corrections":["fix1"],"wordsUsedWell":["word1"]}`,
  `Vocab: ${vocab}\n\n${convo}`,400)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return{overallScore:70,feedback:"Good effort!",corrections:[],wordsUsedWell:[]}}
}

// UI
function Spinner({size=20}){return <div style={{width:size,height:size,border:`2px solid ${BD}`,borderTopColor:AC,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
function Tag({text,color}){const c=color||AC;return <span style={{fontSize:11,padding:'3px 9px',borderRadius:6,background:`${c}22`,color:c,fontWeight:500}}>{text}</span>}
function PBtn({label,onClick,disabled,full=true}){
  return <button onClick={disabled?null:onClick} style={{width:full?'100%':undefined,background:disabled?S2:AC,color:disabled?MU:'#fff',border:'none',borderRadius:13,padding:'15px 24px',fontSize:15,fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,transition:'all 0.15s',fontFamily:FONT}}
    onMouseDown={e=>{if(!disabled)e.currentTarget.style.transform='scale(0.97)'}} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>{label}</button>
}
function GBtn({label,onClick}){return <button onClick={onClick} style={{background:S2,border:`1px solid ${BD}`,color:MU,borderRadius:13,padding:'14px 24px',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:FONT,width:'100%'}}>{label}</button>}

function Nav({screen,go,due}){
  const tabs=[{k:'home',i:'⊙',l:'Home'},{k:'study',i:'▣',l:'Study',b:due},{k:'phrase',i:'◈',l:'Phrase'},{k:'import',i:'↑',l:'Import'}]
  return <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:`${S}ee`,borderTop:`1px solid ${BD}`,display:'flex',padding:'8px 0 22px',backdropFilter:'blur(16px)',zIndex:100}}>
    {tabs.map(t=><button key={t.k} onClick={()=>go(t.k)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'4px 0',position:'relative',fontFamily:FONT}}>
      <span style={{fontSize:22,transition:'all 0.15s',opacity:screen===t.k?1:0.3,filter:screen===t.k?`drop-shadow(0 0 8px ${AC})`:'none'}}>{t.i}</span>
      <span style={{fontSize:10,color:screen===t.k?AC:MU,fontWeight:screen===t.k?700:400}}>{t.l}</span>
      {t.b>0&&<div style={{position:'absolute',top:2,right:'18%',width:7,height:7,background:RE,borderRadius:'50%'}}/>}
    </button>)}
  </div>
}

function Home({cards,fluency,streak,lastDate,tier,go}){
  const due=cards.filter(c=>new Date(c.nextReview)<=new Date()&&c.mastery>0).length
  const mastered=cards.filter(c=>c.mastery>=5).length
  const nextTier=TIERS.find(t=>t.min>mastered)
  const pct=nextTier?((mastered-tier.min)/(nextTier.min-tier.min))*100:100
  const studiedToday=lastDate===new Date().toISOString().slice(0,10)
  return <div style={{padding:'52px 24px 100px',animation:'up 0.35s ease'}}>
    <div style={{marginBottom:40}}>
      <div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:6}}>FLUENCY RATING</div>
      <div style={{fontSize:72,fontWeight:900,color:TX,lineHeight:1,letterSpacing:-3}}>{fluency}</div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginTop:10}}>
        <span style={{fontSize:14,color:AC,fontWeight:700}}>{tier.name}</span>
        {nextTier&&<div style={{flex:1,height:3,background:BD,borderRadius:3}}><div style={{height:'100%',width:`${pct}%`,background:AC,borderRadius:3,transition:'width 0.7s ease'}}/></div>}
        {streak>0&&<span style={{fontSize:14,color:YE,fontWeight:700}}>🔥 {streak}d</span>}
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:28}}>
      {[{label:'Cards',val:cards.length,color:TX},{label:'Due',val:due,color:due>0?YE:GR},{label:'Mastered',val:mastered,color:GR}].map(s=>
        <div key={s.label} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px 12px',textAlign:'center'}}>
          <div style={{fontSize:30,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
          <div style={{fontSize:11,color:MU,marginTop:5,fontWeight:500}}>{s.label}</div>
        </div>)}
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <button onClick={()=>go('study')} style={{background:AC,color:'#fff',border:'none',borderRadius:16,padding:'20px 24px',fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:FONT}}>
        <span>{due>0?`Review — ${due} cards due`:'Study flashcards'}</span><span style={{fontSize:22}}>→</span>
      </button>
      <button onClick={()=>go('phrase')} style={{background:S,border:`1px solid ${BD}`,color:TX,borderRadius:16,padding:'18px 24px',fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:FONT}}>
        <span>Phrase practice</span><span style={{opacity:0.4,fontSize:18}}>→</span>
      </button>
    </div>
    {streak>0&&!studiedToday&&<div style={{marginTop:20,padding:'14px 18px',background:`${YE}15`,border:`1px solid ${YE}44`,borderRadius:14,display:'flex',alignItems:'center',gap:10}}>
      <span>🔥</span><span style={{fontSize:13,color:YE}}>Study today to keep your {streak}-day streak</span>
    </div>}
  </div>
}

function Study({cards,onRate,onBack}){
  const[deck]=useState(()=>{const d=buildDeck(cards);return d.length?d:cards.slice(0,20)})
  const[idx,setIdx]=useState(0);const[flipped,setFlipped]=useState(false);const[flipping,setFlipping]=useState(false)
  const[phase,setPhase]=useState('front');const[ans,setAns]=useState('');const[ev,setEv]=useState(null)
  const[combo,setCombo]=useState(0);const[hist,setHist]=useState([]);const[done,setDone]=useState(false);const[cardKey,setCardKey]=useState(0)
  const card=deck[idx];const isDeep=card&&card.mastery>=2
  const doFlip=useCallback(cb=>{setFlipping(true);setTimeout(()=>{cb();setFlipping(false)},170)},[])
  const advance=useCallback(q=>{
    onRate(card.id,q);setCombo(c=>q>=3?c+1:0);setHist(h=>[...h,{card,q}])
    if(idx+1>=deck.length){setDone(true);return}
    doFlip(()=>{setIdx(i=>i+1);setFlipped(false);setPhase('front');setAns('');setEv(null);setCardKey(k=>k+1)})
  },[card,idx,deck,onRate,doFlip])
  const tap=useCallback(async()=>{
    if(flipped||flipping)return
    if(isDeep&&phase==='front'){setPhase('typing');return}
    if(isDeep&&phase==='typing'){
      if(!ans.trim()){doFlip(()=>{setFlipped(true);setPhase('back')});return}
      setPhase('evaluating')
      const res=await evalAnswer({english:card.english,targetWords:[card.portuguese]},ans,[card])
      doFlip(()=>{setEv(res);setFlipped(true);setPhase('back')});return
    }
    doFlip(()=>{setFlipped(true);setPhase('back')})
  },[flipped,flipping,isDeep,phase,ans,card,doFlip])
  if(done)return <StudyDone hist={hist} combo={combo} onBack={onBack}/>
  if(!card)return null
  return <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
    <div style={{padding:'16px 20px 8px',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:26,cursor:'pointer',lineHeight:1,padding:2,fontFamily:FONT}}>‹</button>
      <div style={{flex:1,height:3,background:BD,borderRadius:3}}><div style={{height:'100%',width:`${(idx/deck.length)*100}%`,background:AC,borderRadius:3,transition:'width 0.3s'}}/></div>
      {combo>=3&&<span style={{fontSize:13,color:YE,fontWeight:700}}>🔥 {combo}</span>}
      <span style={{fontSize:12,color:MU,fontWeight:500}}>{idx+1}/{deck.length}</span>
    </div>
    <div style={{flex:1,padding:'8px 20px 16px',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        <Tag text={card.type}/>{card.contrast&&<Tag text="Carioca" color={GR}/>}{card.scenario&&<Tag text={card.scenario} color={MU}/>}{card.mastery>0&&<Tag text={`lvl ${card.mastery}`} color={MU}/>}
      </div>
      <div style={{position:'relative',flex:1,display:'flex',flexDirection:'column'}}>
        {deck[idx+2]&&<div style={{position:'absolute',inset:0,background:S,border:`1px solid ${BD}`,borderRadius:22,transform:'translateY(12px) scale(0.91)',opacity:0.28}}/>}
        {deck[idx+1]&&<div style={{position:'absolute',inset:0,background:S,border:`1px solid ${BD}`,borderRadius:22,transform:'translateY(6px) scale(0.956)',opacity:0.52}}/>}
        <div key={cardKey} style={{position:'relative',flex:1,zIndex:2,display:'flex',flexDirection:'column',animation:'up 0.28s ease',opacity:flipping?0:1,transform:flipping?'scaleX(0.05)':'scaleX(1)',transition:flipping?'all 0.15s ease':'none'}}>
          {!flipped
            ?<div onClick={phase!=='typing'?tap:undefined} style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:22,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 28px',textAlign:'center',cursor:phase==='typing'?'default':'pointer'}}>
              {phase==='front'&&<><div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:18}}>PORTUGUESE</div><div style={{fontSize:card.portuguese.length>22?22:38,color:TX,fontWeight:700,lineHeight:1.25,marginBottom:24}}>{card.portuguese}</div><div style={{fontSize:13,color:MU,padding:'9px 22px',border:`1px solid ${BD}`,borderRadius:22}}>{isDeep?'Tap to translate':'Tap to reveal'}</div></>}
              {phase==='typing'&&<div style={{width:'100%'}}><div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:14}}>TRANSLATE TO ENGLISH</div><div style={{fontSize:card.portuguese.length>22?20:32,color:TX,fontWeight:700,lineHeight:1.3,marginBottom:20}}>{card.portuguese}</div><textarea value={ans} onChange={e=>setAns(e.target.value)} autoFocus placeholder="write your translation…" style={{width:'100%',background:BG,border:`1px solid ${BD}`,borderRadius:13,padding:'14px',color:TX,fontSize:15,resize:'none',outline:'none',minHeight:72,boxSizing:'border-box',marginBottom:12}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/><PBtn label="Reveal →" onClick={tap} disabled={!ans.trim()}/></div>}
              {phase==='evaluating'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}><Spinner/><span style={{fontSize:13,color:MU}}>Evaluating…</span></div>}
            </div>
            :<div style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:22,padding:'24px',overflowY:'auto',display:'flex',flexDirection:'column'}}>
              <div style={{fontSize:card.portuguese.length>22?18:28,color:TX,fontWeight:700,marginBottom:8,lineHeight:1.3}}>{card.portuguese}</div>
              <div style={{fontSize:17,color:TX,lineHeight:1.5,marginBottom:card.contrast?16:0}}>{card.english}</div>
              {card.contrast&&<div style={{padding:'12px 0',borderTop:`1px solid ${BD}`,marginBottom:14}}><div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:4}}>FORMAL PORTUGUESE</div><div style={{fontSize:13,color:MU,fontStyle:'italic'}}>{card.contrast}</div></div>}
              {ev&&<div style={{background:S2,borderRadius:14,padding:'14px',marginBottom:14}}>
                <div style={{textAlign:'center',marginBottom:10}}><div style={{fontSize:36,fontWeight:900,color:ev.naturalness>=75?GR:ev.naturalness>=50?YE:RE}}>{ev.naturalness||50}</div><div style={{fontSize:10,color:MU,fontWeight:600}}>CARIOCA NATURALNESS</div></div>
                {ev.feedback&&<div style={{fontSize:13,color:TX,marginBottom:ev.correction?8:0,lineHeight:1.5}}>"{ev.feedback}"</div>}
                {ev.correction&&<div style={{fontSize:13,color:GR,fontStyle:'italic'}}>→ {ev.correction}</div>}
              </div>}
              <div style={{marginTop:'auto',paddingTop:12}}>
                <div style={{fontSize:11,color:MU,fontWeight:600,textAlign:'center',marginBottom:10}}>HOW DID YOU DO?</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[{l:'✗',sub:'Again',q:1,c:RE},{l:'△',sub:'Almost',q:3,c:YE},{l:'✓',sub:'Got it',q:5,c:GR}].map(x=><button key={x.q} onClick={()=>advance(x.q)} style={{padding:'14px 8px',background:`${x.c}18`,border:`1px solid ${x.c}44`,borderRadius:14,color:x.c,cursor:'pointer',fontFamily:FONT,transition:'transform 0.1s'}} onMouseDown={e=>e.currentTarget.style.transform='scale(0.92)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><div style={{fontSize:22,marginBottom:3}}>{x.l}</div><div style={{fontSize:12,fontWeight:500}}>{x.sub}</div></button>)}
                </div>
              </div>
            </div>}
        </div>
      </div>
    </div>
  </div>
}

function StudyDone({hist,combo,onBack}){
  const ok=hist.filter(h=>h.q>=4).length,al=hist.filter(h=>h.q===3).length,no=hist.filter(h=>h.q<3).length
  return <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 24px 100px',animation:'up 0.4s ease'}}>
    <div style={{fontSize:56,marginBottom:16,animation:'pop 0.5s ease'}}>🎉</div>
    <div style={{fontSize:26,fontWeight:800,color:TX,marginBottom:6}}>Session done</div>
    {combo>=3&&<div style={{fontSize:14,color:YE,fontWeight:700,marginBottom:20}}>🔥 Best combo: {combo}</div>}
    <div style={{display:'flex',gap:28,marginBottom:32}}>
      {[{v:ok,c:GR,l:'correct'},{v:al,c:YE,l:'almost'},{v:no,c:RE,l:'again'}].map(x=><div key={x.l} style={{textAlign:'center'}}><div style={{fontSize:34,fontWeight:800,color:x.c}}>{x.v}</div><div style={{fontSize:11,color:MU,fontWeight:500}}>{x.l}</div></div>)}
    </div>
    <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginBottom:36,maxWidth:360}}>
      {hist.map((h,i)=><span key={i} style={{padding:'4px 12px',borderRadius:8,background:`${h.q>=4?GR:h.q>=3?YE:RE}18`,color:h.q>=4?GR:h.q>=3?YE:RE,fontSize:12,fontWeight:600}}>{h.card.portuguese}</span>)}
    </div>
    <PBtn label="Done" onClick={onBack}/>
  </div>
}

function Phrase({cards,onRateMultiple,sentenceHistory,onSaveSentence,onBack}){
  const[tab,setTab]=useState('practice')
  return <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
    <div style={{padding:'16px 20px 0',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:26,cursor:'pointer',fontFamily:FONT,padding:2,lineHeight:1}}>‹</button>
      <div style={{display:'flex',background:S2,borderRadius:11,padding:3,gap:2}}>
        {[['practice','Practice'],['chat','Chat']].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:'8px 18px',borderRadius:9,background:tab===k?AC:'transparent',color:tab===k?'#fff':MU,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:FONT,transition:'all 0.15s'}}>{l}</button>)}
      </div>
    </div>
    <div style={{flex:1,overflowY:'auto'}}>
      {tab==='practice'&&<Practice cards={cards} onRateMultiple={onRateMultiple} sentenceHistory={sentenceHistory} onSaveSentence={onSaveSentence}/>}
      {tab==='chat'&&<Chat cards={cards} onRateMultiple={onRateMultiple}/>}
    </div>
  </div>
}

function Practice({cards,onRateMultiple,sentenceHistory,onSaveSentence}){
  const[phase,setPhase]=useState('idle');const[scenario,setScenario]=useState(null)
  const[ans,setAns]=useState('');const[ev,setEv]=useState(null);const[count,setCount]=useState(0)
  const readyWords=cards.filter(c=>c.mastery>=2).length
  const icons={boteco:'🍺',praia:'🏖️',rua:'🛣️',social:'👥',compras:'🛍️',food:'🍽️'}
  const generate=useCallback(async()=>{setPhase('loading');setAns('');setEv(null);const s=await generateScenario(cards,sentenceHistory||[]);setScenario(s);setPhase('writing')},[cards,sentenceHistory])
  const submit=useCallback(async()=>{
    if(!ans.trim()||!scenario)return;setPhase('evaluating')
    const res=await evalAnswer(scenario,ans,cards)
    setEv(res);setCount(c=>c+1);onRateMultiple(res.cardUpdates||{})
    onSaveSentence({english:scenario.english,userAnswer:ans,scenario:scenario.scenario,date:new Date().toISOString()})
    setPhase('result')
  },[ans,scenario,cards,onRateMultiple,onSaveSentence])
  return <div style={{padding:'20px 20px 40px'}}>
    {phase==='idle'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',paddingTop:48,gap:16,animation:'up 0.3s ease'}}>
      <div style={{fontSize:52}}>💬</div>
      <div style={{fontSize:22,fontWeight:800,color:TX}}>Phrase Practice</div>
      <div style={{fontSize:14,color:MU,lineHeight:1.7,maxWidth:300}}>Claude creates a real Rio scenario using your vocabulary. You write what you'd say — no accent penalties.</div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'14px 20px',fontSize:13,color:MU}}>{readyWords} words ready</div>
      {readyWords>=3?<PBtn label="Generate scenario →" onClick={generate}/>:<div style={{fontSize:13,color:MU}}>Study at least 3 flashcards to level 2 first</div>}
    </div>}
    {phase==='loading'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}><Spinner size={28}/><span style={{fontSize:14,color:MU}}>Claude is thinking…</span></div>}
    {(phase==='writing'||phase==='evaluating')&&scenario&&<div style={{animation:'up 0.3s ease'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}><span style={{fontSize:22}}>{icons[scenario.scenario]||'💬'}</span><Tag text={scenario.scenario||'general'} color={MU}/>{scenario.targetWords?.map(w=><Tag key={w} text={w} color={AC}/>)}</div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:18}}><div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:10}}>SITUATION</div><div style={{fontSize:18,color:TX,lineHeight:1.55}}>{scenario.english}</div>{scenario.context&&<div style={{fontSize:12,color:MU,marginTop:10,fontStyle:'italic'}}>📍 {scenario.context}</div>}</div>
      <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:8}}>YOUR RESPONSE IN PORTUGUESE</div>
      <textarea value={ans} onChange={e=>setAns(e.target.value)} placeholder="write here… (accents optional)" style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',color:TX,fontSize:16,resize:'none',outline:'none',minHeight:90,boxSizing:'border-box',marginBottom:12}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      {phase==='evaluating'?<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:18}}><Spinner/><span style={{color:MU,fontSize:13}}>Evaluating…</span></div>:<PBtn label="Submit →" onClick={submit} disabled={!ans.trim()}/>}
    </div>}
    {phase==='result'&&ev&&scenario&&<div style={{animation:'up 0.3s ease'}}>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:14,textAlign:'center'}}>
        <div style={{fontSize:52,fontWeight:900,color:ev.naturalness>=75?GR:ev.naturalness>=50?YE:RE,lineHeight:1}}>{ev.naturalness||50}</div>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginTop:6}}>CARIOCA NATURALNESS</div>
      </div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:12}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:8}}>YOUR ANSWER</div>
        <div style={{fontSize:16,color:TX,marginBottom:ev.correction?14:0}}>{ans}</div>
        {ev.correction&&<><div style={{height:1,background:BD,margin:'12px 0'}}/><div style={{fontSize:11,color:GR,fontWeight:600,marginBottom:6}}>CARIOCA VERSION</div><div style={{fontSize:16,color:GR}}>{ev.correction}</div></>}
      </div>
      {ev.feedback&&<div style={{fontSize:14,color:MU,fontStyle:'italic',marginBottom:22,lineHeight:1.6}}>"{ev.feedback}"</div>}
      <div style={{display:'flex',gap:10}}><PBtn label="Next →" onClick={generate}/><GBtn label="Done" onClick={()=>setPhase('idle')}/></div>
      <div style={{fontSize:12,color:MU,textAlign:'center',marginTop:12}}>{count} sentence{count!==1?'s':''} this session</div>
    </div>}
  </div>
}

const SCENARIOS=[{key:'boteco',label:'🍺 Boteco',desc:'Ordering at a Rio bar'},{key:'praia',label:'🏖️ Praia',desc:'At the beach'},{key:'uber',label:'🚗 Uber',desc:'Chatting with your driver'},{key:'vizinho',label:'🏠 Vizinho',desc:'Talking to a neighbour'},{key:'mercado',label:'🛒 Mercado',desc:'At the local market'},{key:'qualquer',label:'💬 Random',desc:'Anything goes'}]

function Chat({cards,onRateMultiple}){
  const[phase,setPhase]=useState('pick');const[history,setHistory]=useState([]);const[input,setInput]=useState('');const[loading,setLoading]=useState(false);const[evalResult,setEvalResult]=useState(null)
  const scrollRef=useRef()
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight},[history])
  const start=useCallback(async s=>{setPhase('loading');const res=await openChatAPI(s.key);setHistory([{role:'bot',content:res.message,translation:res.translation}]);setPhase('chatting')},[])
  const send=useCallback(async()=>{
    if(!input.trim()||loading)return
    const msg=input.trim();setInput('');setLoading(true)
    const newHist=[...history,{role:'user',content:msg}];setHistory(newHist)
    if(newHist.filter(h=>h.role==='user').length>=4){
      setPhase('evaluating');const res=await evalChatAPI(newHist,cards);setEvalResult(res)
      if(res.wordsUsedWell?.length){const updates={};res.wordsUsedWell.forEach(w=>{const c=cards.find(c=>c.portuguese.toLowerCase().includes(w.toLowerCase()));if(c)updates[c.id]=4});onRateMultiple(updates)}
      setPhase('done')
    }else{const res=await replyChatAPI(newHist);setHistory([...newHist,{role:'bot',content:res.message,translation:res.translation}])}
    setLoading(false)
  },[input,loading,history,cards,onRateMultiple])
  const reset=()=>{setPhase('pick');setHistory([]);setEvalResult(null);setInput('')}
  if(phase==='pick')return <div style={{padding:'20px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:6}}>Choose a situation</div>
    <div style={{fontSize:13,color:MU,marginBottom:20}}>Claude plays a Carioca local. 4-turn conversation.</div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {SCENARIOS.map(s=><button key={s.key} onClick={()=>start(s)} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',textAlign:'left',cursor:'pointer',fontFamily:FONT,transition:'border-color 0.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor=AC} onMouseLeave={e=>e.currentTarget.style.borderColor=BD}>
        <div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:3}}>{s.label}</div><div style={{fontSize:13,color:MU}}>{s.desc}</div>
      </button>)}
    </div>
  </div>
  if(phase==='loading')return <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}><Spinner size={28}/><span style={{fontSize:14,color:MU}}>Starting…</span></div>
  if(phase==='done'&&evalResult)return <div style={{padding:'20px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:16}}>Conversation done</div>
    <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:16,textAlign:'center'}}>
      <div style={{fontSize:52,fontWeight:900,color:evalResult.overallScore>=75?GR:evalResult.overallScore>=50?YE:RE,lineHeight:1}}>{evalResult.overallScore}</div>
      <div style={{fontSize:11,color:MU,fontWeight:600,marginTop:6}}>OVERALL SCORE</div>
    </div>
    <div style={{fontSize:14,color:TX,lineHeight:1.7,marginBottom:16}}>{evalResult.feedback}</div>
    {evalResult.corrections?.length>0&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',marginBottom:20}}><div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:10}}>CORRECTIONS</div>{evalResult.corrections.map((c,i)=><div key={i} style={{fontSize:13,color:GR,marginBottom:5}}>→ {c}</div>)}</div>}
    <PBtn label="New conversation" onClick={reset}/>
  </div>
  const turnsLeft=4-history.filter(h=>h.role==='user').length
  return <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
    <div style={{padding:'10px 20px 8px',borderBottom:`1px solid ${BD}`}}><span style={{fontSize:13,color:MU}}>{turnsLeft} turn{turnsLeft!==1?'s':''} left</span></div>
    <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
      {history.map((h,i)=><div key={i} style={{display:'flex',flexDirection:'column',alignItems:h.role==='user'?'flex-end':'flex-start'}}>
        <div style={{maxWidth:'82%',background:h.role==='user'?AC:S2,borderRadius:h.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'13px 18px'}}>
          <div style={{fontSize:15,color:h.role==='user'?'#fff':TX}}>{h.content}</div>
          {h.translation&&<div style={{fontSize:11,color:h.role==='user'?'rgba(255,255,255,0.65)':MU,marginTop:5,fontStyle:'italic'}}>{h.translation}</div>}
        </div>
      </div>)}
      {loading&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0'}}><Spinner/><span style={{fontSize:13,color:MU}}>typing…</span></div>}
    </div>
    <div style={{padding:'12px 20px 28px',borderTop:`1px solid ${BD}`,display:'flex',gap:10}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="respond in Portuguese…" style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'14px 16px',color:TX,fontSize:15,outline:'none'}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      <button onClick={send} disabled={!input.trim()||loading} style={{background:AC,color:'#fff',border:'none',borderRadius:13,padding:'14px 20px',fontSize:18,fontWeight:700,cursor:'pointer',opacity:input.trim()&&!loading?1:0.4,fontFamily:FONT}}>→</button>
    </div>
  </div>
}

function Import({cards,onImport,onBack}){
  const[stage,setStage]=useState('idle');const[preview,setPreview]=useState([]);const[visible,setVisible]=useState(0)
  const ref=useRef();const existing=new Set(cards.map(c=>c.portuguese.toLowerCase().trim()))
  const handleFile=async e=>{
    const file=e.target.files?.[0];if(!file)return;setStage('parsing');setVisible(0)
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file)})
      const items=await extractFromPDF(b64,existing);setPreview(items);setStage('preview')
      items.forEach((_,i)=>setTimeout(()=>setVisible(v=>v+1),i*80))
    }catch{setStage('idle')}
  }
  return <div style={{padding:'52px 24px 100px',animation:'up 0.35s ease'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:32}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:26,cursor:'pointer',fontFamily:FONT,padding:2,lineHeight:1}}>‹</button>
      <div><div style={{fontSize:22,fontWeight:800,color:TX}}>Import Lesson</div><div style={{fontSize:13,color:MU,marginTop:2}}>{cards.length} cards in deck</div></div>
    </div>
    {stage==='idle'&&<>
      <div onClick={()=>ref.current?.click()} style={{border:`2px dashed ${BD}`,borderRadius:20,padding:'56px 24px',textAlign:'center',cursor:'pointer',transition:'border-color 0.2s',marginBottom:16}} onMouseEnter={e=>e.currentTarget.style.borderColor=AC} onMouseLeave={e=>e.currentTarget.style.borderColor=BD}>
        <div style={{fontSize:44,marginBottom:14}}>📄</div>
        <div style={{fontSize:17,fontWeight:700,color:TX,marginBottom:6}}>Drop PDF here</div>
        <div style={{fontSize:13,color:MU}}>or tap to select</div>
        <input ref={ref} type="file" accept=".pdf" onChange={handleFile} style={{display:'none'}}/>
      </div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px'}}><div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:8}}>HOW IT WORKS</div><div style={{fontSize:13,color:MU,lineHeight:1.8}}>Drop your professor's PDF. Claude extracts every word and phrase. Existing cards are skipped. New cards start at level zero.</div></div>
    </>}
    {stage==='parsing'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}><Spinner size={28}/><span style={{fontSize:14,color:MU}}>Claude is reading your document…</span></div>}
    {stage==='preview'&&<>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:16}}><div style={{fontSize:13,color:MU}}>{existing.size} existing cards skipped</div><div style={{fontSize:28,fontWeight:800,color:GR,marginTop:4}}>{preview.length} new cards found</div></div>
      <div style={{maxHeight:320,overflowY:'auto',marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>
        {preview.slice(0,visible).map((item,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'13px 18px',animation:'up 0.25s ease'}}><div style={{fontSize:15,fontWeight:700,color:TX}}>{item.portuguese}</div><div style={{fontSize:13,color:MU,marginTop:2}}>{item.english||'—'}</div></div>)}
      </div>
      {visible>=preview.length&&preview.length>0&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><GBtn label="Cancel" onClick={()=>setStage('idle')}/><PBtn label={`Add ${preview.length} cards`} onClick={()=>{onImport(preview);setStage('done')}}/></div>}
    </>}
    {stage==='done'&&<div style={{textAlign:'center',paddingTop:60,animation:'up 0.4s ease'}}><div style={{fontSize:56,marginBottom:16,animation:'pop 0.5s ease'}}>🎉</div><div style={{fontSize:24,fontWeight:800,color:TX,marginBottom:24}}>{preview.length} cards added</div><PBtn label="Back to home" onClick={onBack}/></div>}
  </div>
}

export default function App(){
  const[cards,setCards]=useState([])
  const[fluency,setFluency]=useState(1000)
  const[streak,setStreak]=useState(0)
  const[lastDate,setLastDate]=useState(null)
  const[sentenceHistory,setSentenceHistory]=useState([])
  const[screen,setScreen]=useState('home')
  const[loaded,setLoaded]=useState(false)
  const uid=useRef(getDeviceId())

  useEffect(()=>{
    const style=document.createElement('style');style.textContent=CSS;document.head.appendChild(style)
    return()=>document.head.removeChild(style)
  },[])

  // Load from Supabase on mount
  useEffect(()=>{
    const init=async()=>{
      const data=await dbLoad(uid.current)
      if(data?.cards?.length){
        setCards(data.cards)
        setFluency(data.state?.fluency_rating||1000)
        setStreak(data.state?.streak_days||0)
        setLastDate(data.state?.last_session_date||null)
        setSentenceHistory(data.state?.sentence_history||[])
      }else{
        // First time — seed cards
        await dbSeed(uid.current,SEED)
        setCards(SEED)
      }
      setLoaded(true)
    }
    init()
  },[])

  const touchStreak=useCallback((f,s,d,sh)=>{
    const today=new Date().toISOString().slice(0,10)
    if(d===today)return{s,d}
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10)
    const ns=d===yesterday?s+1:1
    setStreak(ns);setLastDate(today)
    dbSaveState(uid.current,f,ns,today,sh)
    return{s:ns,d:today}
  },[])

  const onRate=useCallback((id,q)=>{
    setCards(prev=>{
      const next=prev.map(c=>{if(c.id!==id)return c;const u={...c,...sm2(c,q)};dbUpdateCard(uid.current,u);return u})
      const nf=Math.max(500,fluency+(q>=4?8:q>=3?2:-4))
      setFluency(nf)
      touchStreak(nf,streak,lastDate,sentenceHistory)
      return next
    })
  },[fluency,streak,lastDate,sentenceHistory,touchStreak])

  const onRateMultiple=useCallback((cardUpdates)=>{
    if(!Object.keys(cardUpdates||{}).length)return
    setCards(prev=>{
      const next=prev.map(c=>{
        const q=cardUpdates[c.id];if(!q)return c
        const u=sm2(c,q)
        const sc=((c.sentenceScore||0)*(c.sentenceCount||0)+q)/((c.sentenceCount||0)+1)
        const updated={...c,...u,sentenceScore:Math.round(sc*10)/10,sentenceCount:(c.sentenceCount||0)+1}
        dbUpdateCard(uid.current,updated)
        return updated
      })
      const nf=Math.max(500,fluency+4)
      setFluency(nf)
      touchStreak(nf,streak,lastDate,sentenceHistory)
      return next
    })
  },[fluency,streak,lastDate,sentenceHistory,touchStreak])

  const onImport=useCallback((items)=>{
    const newCards=items.map((it,i)=>mk(`imp-${Date.now()}-${i}`,it.portuguese,it.english||'—',it.type||'vocab',{cluster:it.cluster||null,contrast:it.contrast||null}))
    setCards(prev=>[...prev,...newCards])
    dbInsertCards(uid.current,newCards)
  },[])

  const onSaveSentence=useCallback((entry)=>{
    const updated=[...(sentenceHistory||[]).slice(-49),entry]
    setSentenceHistory(updated)
    dbSaveState(uid.current,fluency,streak,lastDate,updated)
  },[sentenceHistory,fluency,streak,lastDate])

  // Debounced fluency sync
  useEffect(()=>{
    if(!loaded)return
    const t=setTimeout(()=>dbSaveState(uid.current,fluency,streak,lastDate,sentenceHistory),3000)
    return()=>clearTimeout(t)
  },[fluency,loaded])

  if(!loaded)return <div style={{background:BG,height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner size={28}/></div>

  const due=cards.filter(c=>new Date(c.nextReview)<=new Date()&&c.mastery>0).length
  const mastered=cards.filter(c=>c.mastery>=5).length
  const tier=getTier(mastered)

  return <div style={{background:BG,minHeight:'100vh',maxWidth:480,margin:'0 auto',fontFamily:FONT,color:TX,display:'flex',flexDirection:'column'}}>
    <div style={{flex:1,overflowY:'auto',paddingBottom:64}}>
      {screen==='home'&&<Home cards={cards} fluency={fluency} streak={streak} lastDate={lastDate} tier={tier} go={setScreen}/>}
      {screen==='study'&&<Study cards={cards} onRate={onRate} onBack={()=>setScreen('home')}/>}
      {screen==='phrase'&&<Phrase cards={cards} onRateMultiple={onRateMultiple} sentenceHistory={sentenceHistory} onSaveSentence={onSaveSentence} onBack={()=>setScreen('home')}/>}
      {screen==='import'&&<Import cards={cards} onImport={onImport} onBack={()=>setScreen('home')}/>}
    </div>
    <Nav screen={screen} go={setScreen} due={due}/>
  </div>
}
