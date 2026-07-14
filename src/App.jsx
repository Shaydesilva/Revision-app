import React,{useState,useEffect,useRef,useCallback,useMemo} from 'react'
import{createClient}from'@supabase/supabase-js'

const USER_ID='00000000-0000-0000-0000-000000000001'
const SB_URL=import.meta.env.VITE_SUPABASE_URL
const SB_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY
const sb=(SB_URL&&SB_KEY)?createClient(SB_URL,SB_KEY):null
// ═══ BRASIL GLOBAL — floresta night canvas, ouro hero, verde earned ═══
const BG='#07130c'        // floresta at night — the canvas
const S='#0e2015'         // panel — deep jungle green
const S2='#0b1a11'        // recessed panel
const BD='#1e4530'        // green-tinted borders
const AC='#ffd52e'        // OURO — the hero accent
const TX='#f4f8ef'        // warm white
const MU='#8fb3a0'        // sage muted
const GR='#2ee56f'        // verde bandeira — EARNED only
const RE='#ff6b5e'
const YE='#ffcf3f'
const GD='#f0a92c'        // frontier gold — deeper than ouro, same family
const CORAL='#fb7185'
const BZ='#3d7bff'        // globo blue
const FONT="-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif"
const CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
button{transition:transform 0.09s cubic-bezier(0.2,0.8,0.4,1.4)}
button:active{transform:scale(0.955)}
body{background:${BG};overscroll-behavior:none;font-family:${FONT}}textarea,input{-webkit-user-select:text;user-select:text;font-family:${FONT}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes popIn{0%{transform:scale(0.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes confettiFall{0%{transform:translateY(-10vh) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:0.6}}
@keyframes ringGlow{0%,100%{box-shadow:0 0 12px rgba(255,213,46,0.35)}50%{box-shadow:0 0 26px rgba(255,213,46,0.7)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes eq{0%,100%{transform:scaleY(0.25)}50%{transform:scaleY(1)}}
button{transition:transform 0.08s ease}
button:active{transform:scale(0.96)}
@keyframes up{0%{opacity:0;transform:translateY(14px)}70%{opacity:1;transform:translateY(-2px)}100%{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}@keyframes glow{0%,100%{opacity:0.6}50%{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}::-webkit-scrollbar{display:none}*{scrollbar-width:none}`


const mk=(id,p,e,t,x={})=>({id:String(id),portuguese:p,english:e,type:t,cluster:null,contrast:null,scenario:null,exampleSentence:null,mnemonic:null,priority:false,priorityStreak:0,mastery:0,easeFactor:2.5,interval:0,reps:0,nextReview:new Date().toISOString(),sentenceScore:0,sentenceCount:0,recognitionMastery:0,productionMastery:0,...x})


class SoundEngine{
  constructor(){this.ctx=null;this.enabled=localStorage.getItem('snd')!=='0'}
  init(){if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume()}
  _t(freq,type,dur,start,vol=0.25){
    const o=this.ctx.createOscillator(),g=this.ctx.createGain()
    o.connect(g);g.connect(this.ctx.destination)
    o.type=type;o.frequency.value=freq
    g.gain.setValueAtTime(vol,start)
    g.gain.exponentialRampToValueAtTime(0.001,start+dur)
    o.start(start);o.stop(start+dur+0.01)
  }
  play(type,param){
    if(!this.enabled)return
    try{
      this.init()
      const t=this.ctx.currentTime
      if(type==='flip'){const b=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*0.06),this.ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length)*0.3;const s=this.ctx.createBufferSource();const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=3000;s.buffer=b;s.connect(f);f.connect(this.ctx.destination);s.start(t)}
      else if(type==='correct'){this._t(523,'sine',0.25,t,0.2);this._t(659,'sine',0.2,t+0.06,0.1)}
      else if(type==='wrong'){this._t(100,'sine',0.18,t,0.35)}
      else if(type==='combo'){const lvl=Math.min(4,Math.floor((param||3)/3));[261,329,392,523,659].slice(0,lvl+2).forEach((f,i)=>this._t(f,'sine',0.15,t+i*0.07,0.15))}
      else if(type==='eliminate'){this._t(400,'sine',0.04,t,0.3);this._t(600,'sine',0.07,t+0.02,0.2);this._t(900,'sine',0.05,t+0.05,0.15)}
      else if(type==='boss'){this._t(55,'sawtooth',0.5,t,0.3);setTimeout(()=>{if(this.ctx){const t2=this.ctx.currentTime;this._t(880,'sine',0.3,t2,0.2)}},400)}
      else if(type==='done'){[261,329,392,523].forEach((f,i)=>this._t(f,'sine',0.4,t+i*0.1,0.18))}
      else if(type==='milestone'){[392,392,392,523,392,0,523,659].forEach((f,i)=>{if(f>0)this._t(f,'square',0.18,t+i*0.11,0.12)})}
    }catch(e){}
  }
  toggle(){this.enabled=!this.enabled;localStorage.setItem('snd',this.enabled?'1':'0');return this.enabled}
}
const SND=new SoundEngine()


function Spinner({size=20}){return<div style={{width:size,height:size,border:`2px solid ${BD}`,borderTopColor:AC,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
function PBtn({label,onClick,disabled,full=true,small,color}){const bg=color||(disabled?S2:AC);return<button onClick={disabled?null:onClick} onMouseDown={e=>{SND.init();if(!disabled)e.currentTarget.style.opacity='0.8'}} onMouseUp={e=>e.currentTarget.style.opacity='1'} style={{width:full?'100%':undefined,background:bg,color:disabled?MU:(color?'#fff':'#16240f'),border:'none',borderRadius:13,padding:small?'10px 18px':'15px 24px',fontSize:small?13:15,fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,fontFamily:FONT}}>{label}</button>}
function GBtn({label,onClick,small}){return<button onClick={onClick} style={{background:S2,border:`1px solid ${BD}`,color:MU,borderRadius:13,padding:small?'10px 18px':'14px 24px',fontSize:small?13:14,fontWeight:600,cursor:'pointer',fontFamily:FONT,width:'100%'}}>{label}</button>}

class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(e){return{error:e.message||'Unknown error'}}
  componentDidCatch(e,info){console.error('Crashed:',e,info)}
  render(){
    if(this.state.error)return<div style={{padding:'40px 24px',textAlign:'center'}}><div style={{fontSize:32,marginBottom:16}}>⚠️</div><div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:8}}>Something crashed</div><div style={{fontSize:11,color:MU,marginBottom:20,fontFamily:'monospace',background:S2,padding:'10px',borderRadius:8,wordBreak:'break-all'}}>{this.state.error}</div><button onClick={()=>this.setState({error:null})} style={{background:AC,color:'#fff',border:'none',borderRadius:12,padding:'12px 24px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Try again</button></div>
    return this.props.children
  }
}


const PT_RE_V=/[ãõâêîôûçáéíóúàü]/i
const PT_SET_V=new Set(['tá','né','tô','cê','cara','gente','assim','então','tipo','nossa','oi','tchau','obrigado','obrigada','legal','saudade','praia','poxa','beleza','valeu','falou','não','sim','muito','mais','uma','isso','bom','boa','bem','tudo','você','mas','cadê','também','porque','pô','bora','mano','irmão','aqui','ali','lá','fome','sede','calor','frio'])
function isPtWord(w){const c=(w||'').toLowerCase().replace(/[.,!?;:'"()—\-]/g,'');return!!c&&(PT_RE_V.test(c)||PT_SET_V.has(c))}
const GOODBYE_V=['tchau','até mais','até logo','boa noite','goodbye','bye bye','gotta go','vou nessa','falou então']
const isGoodbye=(t)=>{
  const s=(t||'').toLowerCase().replace(/[.!?,…]/g,'').trim()
  if(!s)return false
  const words=s.split(/\s+/)
  if(words.length>4)return false // a real goodbye is short — never a mid-story mention
  return GOODBYE_V.some(g=>s===g||s.endsWith(' '+g)||s.startsWith(g+' '))
}

function VoiceBubble({msg,cardMap,translateWord,onWordPress}){
  const[showTl,setShowTl]=useState(false)
  const[tl,setTl]=useState(null)
  const[loading,setLoading]=useState(false)
  const isLuna=msg.role==='assistant'||msg.role==='luna'
  const evalBorder=msg.testEval==='pass'?GR:msg.testEval==='fail'?RE:null

  const tap=async()=>{
    if(!isLuna)return
    if(showTl){setShowTl(false);return}
    setShowTl(true)
    if(!tl){setLoading(true);const r=await translateWord(msg.text);setTl(r?.translation||'—');setLoading(false)}
  }

  const words=txt=>txt.split(/(\s+)/).map((tok,i)=>{
    if(/^\s+$/.test(tok))return React.createElement('span',{key:i},' ')
    const clean=tok.replace(/^["“”'(]+/g,'').replace(/[.,!?;:“”')—-]+$/g,'')
    const pt=!!clean&&isPtWord(clean)
    return React.createElement('span',{key:i,
      onClick:pt?async e=>{e.stopPropagation();const r=await translateWord(clean);const rc=e.target.getBoundingClientRect();onWordPress(clean,r?.translation||'',msg.text,rc.left,Math.max(rc.top-80,60))}:undefined,
      style:{color:pt?YE:TX,fontWeight:pt?600:400,background:pt?(YE+'15'):'transparent',borderRadius:pt?4:0,padding:pt?'0 2px':0,cursor:pt?'pointer':'default',display:'inline'}
    },tok)
  })

  if(msg.role==='system'){
    return<div style={{textAlign:'center',padding:'8px 0',fontSize:11,color:MU,opacity:0.5}}>{msg.text}</div>
  }

  return<div style={{display:'flex',flexDirection:'column',alignItems:isLuna?'flex-start':'flex-end',marginBottom:4}}>
    <div onClick={tap} style={{
      maxWidth:'82%',padding:'10px 14px',
      borderRadius:isLuna?'18px 18px 18px 4px':'18px 18px 4px 18px',
      background:isLuna?S:AC,
      border:evalBorder?('2px solid '+evalBorder):isLuna?('1px solid '+BD):'none',
      opacity:msg.pending?0.55:1,fontStyle:msg.pending?'italic':'normal',
      fontSize:15,lineHeight:1.6,color:isLuna?TX:'#16240f',
      cursor:isLuna?'pointer':'default',wordBreak:'break-word'
    }}>
      {isLuna?words(msg.text):<span>{msg.text}</span>}
      {evalBorder&&<span style={{marginLeft:8,fontSize:12}}>{msg.testEval==='pass'?'✓':'✗'}</span>}
    </div>
    {showTl&&<div style={{maxWidth:'82%',marginTop:4,padding:'8px 12px',background:S2,border:('1px solid '+BD),borderRadius:10,fontSize:13,color:MU}}>{loading?React.createElement(Spinner,{size:12}):tl}</div>}
    {isLuna&&!showTl&&<div style={{fontSize:10,color:MU,marginTop:2,opacity:0.3}}>tap word to translate</div>}
  </div>
}
function VoiceMode({cards=[],onRateMultiple=()=>{},onAddCard=()=>{},isOnline,ngMode=false}){
  // ── State ──────────────────────────────────────────────────────────────
  const[phase,setPhase]=useState('idle')
  const[spectrum,setSpectrum]=useState(0.35)
  const[speed,setSpeed]=useState('normal') // 'normal' | 'slow'
  const speedRef=useRef('normal')
  const[messages,setMessages]=useState([])
  const[liveText,setLiveText]=useState('')
  const[elapsed,setElapsed]=useState(0)
  const[status,setStatus]=useState('Ready')
  const[dotMode,setDotMode]=useState('')
  const[ptt,setPtt]=useState(true)
  const[lunaVoice,setLunaVoice]=useState(()=>localStorage.getItem('luna_voice')||'shimmer')
  const[testResult,setTestResult]=useState(null) // null|'pass'|'fail'
  const testInProgress=useRef(false)
  const frontierRef=useRef([])
  const profileRef=useRef(null)
  const sesDataRef=useRef(null)
  const testsGivenRef=useRef([])
  const recorderRef=useRef(null)
  const recChunksRef=useRef([])
  const[summary,setSummary]=useState(null)
  const[lunaCandidates,setLunaCandidates]=useState([])
  const[lunaDecisions,setLunaDecisions]=useState({})
  const[unlockScaffold,setUnlockScaffold]=useState(null)
  const[wordMenu,setWordMenu]=useState(null)
  const[textInput,setTextInput]=useState('')
  const[showTextInput,setShowTextInput]=useState(false)
  const[sendingText,setSendingText]=useState(false)
  const[showDebug,setShowDebug]=useState(false)
  const[debugLog,setDebugLog]=useState([])
  const[cardMap,setCardMap]=useState({})
  const[tlCache,setTlCache]=useState({})

  // ── Refs — mutable values that don't cause re-renders ──────────────────
  const scrollRef=useRef()
  const chatEndRef=useRef(null)
  const pcRef=useRef(null)
  const dcRef=useRef(null)
  const streamRef=useRef(null)
  const audioRef=useRef(null)
  const timerRef=useRef(null)
  const reinRef=useRef(null)
  const transcriptRef=useRef([])
  const lunaLiveRef=useRef('')
  const shouldEndRef=useRef(false)
  const respActiveRef=useRef(false)
  const recStreamRef=useRef(null)
  const[lunaSuggestion,setLunaSuggestion]=useState(null)
  const[pendingSug,setPendingSug]=useState([]) // scaffold suggestions awaiting YOUR approval
  const phaseRef=useRef('idle')
  const spectrumRef=useRef(0.35)
  const pttRef=useRef(true)
  const startTimeRef=useRef(0)
  // Always-fresh event handler — assigned each render, zero stale closure risk
  const onEventRef=useRef(null)

  // ── Sync refs with state ───────────────────────────────────────────────
  useEffect(()=>{spectrumRef.current=spectrum},[spectrum])
  useEffect(()=>{speedRef.current=speed},[speed])
  useEffect(()=>{pttRef.current=ptt},[ptt])
  useEffect(()=>{phaseRef.current=phase},[phase])
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages.length])


  // End session cleanly when user switches tabs / app goes to background
  useEffect(()=>{
    const handleVisibility=()=>{
      if(document.hidden&&dcRef.current?.readyState==='open'){
        console.log('VoiceMode: tab hidden, ending session')
        hangup()
      }
    }
    document.addEventListener('visibilitychange',handleVisibility)
    return()=>document.removeEventListener('visibilitychange',handleVisibility)
  },[])
  useEffect(()=>{
    const m={}
    cards.forEach(c=>{if(c.portuguese&&c.english)m[c.portuguese.toLowerCase().trim()]=c.english})
    setCardMap(m)
  },[cards])
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight},[messages,liveText])

  // ── Helpers ────────────────────────────────────────────────────────────
  const log=useCallback(msg=>{setDebugLog(p=>[`${new Date().toLocaleTimeString()} ${msg}`,...p.slice(0,29)]);console.log('[Voice]',msg)},[])
  const fmtTime=s=>{const m=Math.floor(s/60);return`${m}:${String(s%60).padStart(2,'0')}`}

  // ── Cleanup all WebRTC resources ───────────────────────────────────────
  const cleanup=useCallback(()=>{
    clearInterval(timerRef.current)
    clearInterval(reinRef.current)
    if(dcRef.current){try{dcRef.current.close()}catch{}dcRef.current=null}
    if(pcRef.current){try{pcRef.current.close()}catch{}pcRef.current=null}
    if(recorderRef.current){try{if(recorderRef.current.state!=='inactive')recorderRef.current.stop()}catch{}recorderRef.current=null}
    recChunksRef.current=[]
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null}
    if(recStreamRef.current){recStreamRef.current.getTracks().forEach(t=>t.stop());recStreamRef.current=null}
    if(audioRef.current)audioRef.current.srcObject=null
    lunaLiveRef.current=''
    shouldEndRef.current=false
  },[])

  // ── End session — save transcript, update cards ────────────────────────
  const endSession=useCallback(async()=>{
    if(phaseRef.current==='idle'||phaseRef.current==='ending'||phaseRef.current==='done')return
    phaseRef.current='ending'
    const tr=[...transcriptRef.current]
    const dur=Math.floor((Date.now()-startTimeRef.current)/1000)
    setPhase('ending');setStatus('Saving session…')
    cleanup()
    if(!tr.length){phaseRef.current='idle';setPhase('idle');setElapsed(0);return}
    // Save chat history to profile (persistent across sessions)
    if(ngMode){
      setMessages(prev=>{
        const toSave=prev.filter(m=>m.role!=='system').slice(-50)
        fetch('/.netlify/functions/ng-profile-update',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({update:{luna_chat_history:toSave}})
        }).catch(()=>{})
        return prev
      })
    }
    try{
      const endEndpoint=ngMode?'ng-session-end':'luna-session-end'
      const res=await fetch(`/.netlify/functions/${endEndpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ngMode?{mode:'luna',transcript:tr,duration_seconds:dur}:{transcript:tr,duration_seconds:dur})})
      const result=await res.json()
      if(result.cardUpdates&&Object.keys(result.cardUpdates).length)onRateMultiple(result.cardUpdates,'voice')
      setSummary(result)
    }catch{
      setSummary({summary:'Session complete.',score:0,boostWords:[],struggleWords:[],newCardsAdded:[]})
    }
    // Luna unlock pathway: mine the conversation for patterns worth learning
    if(ngMode&&tr.length>=6){
      const txt=tr.map(t=>`${t.role==='assistant'?'Luna':'Me'}: ${t.text}`).join('\n')
      ngFetch('ng-field-report',{text:txt,mine_only:true,source:'luna'})
        .then(d=>{if(Array.isArray(d.suggestions)&&d.suggestions.length){setLunaCandidates(d.suggestions);setLunaDecisions({})}})
        .catch(()=>{})
    }
    phaseRef.current='done';setPhase('done')
    // In NG mode: auto-reset after brief pause so chat stays accessible
    if(ngMode){setTimeout(()=>{phaseRef.current='idle';setPhase('idle')},1500)}
  },[cleanup,onRateMultiple,ngMode])

  // ── Event handler — assigned every render so always fresh ─────────────
  onEventRef.current=(ev)=>{
    if(!ev?.type)return
    switch(ev.type){

      case 'response.output_audio_transcript.delta':
        // Luna streaming — accumulate into live text
        lunaLiveRef.current+=(ev.delta||'')
        setLiveText(lunaLiveRef.current)
        setDotMode('speak')
        setStatus('Luna is talking…')
        break

      case 'response.output_audio_transcript.done':{
        // Luna finished — ev.transcript is authoritative, clear buffer
        const text=(ev.transcript||lunaLiveRef.current).trim()
        lunaLiveRef.current=''
        setLiveText('')
        if(text){
          transcriptRef.current.push({role:'assistant',text})
          // Detect test evaluation from this Luna message
          let testEval=undefined
          if(testInProgress.current==='answered'){
            const lc=text.toLowerCase()
            const passed=lc.includes('isso')||lc.includes('exato')||lc.includes('perfeito')||lc.includes('correto')||lc.includes('muito bem')||lc.includes('acertou')||lc.includes('show')
            const failed=lc.includes('quase')||lc.includes('errado')||lc.includes('não foi')||lc.includes('tente')||lc.includes('almost there')
            if(passed||failed){
              testEval=passed?'pass':'fail'
              testInProgress.current=false
              // Update testsGiven with result
              const lastIdx=testsGivenRef.current.length-1
              if(lastIdx>=0){
                const updated=[...testsGivenRef.current]
                updated[lastIdx]={...updated[lastIdx],result:testEval}
                testsGivenRef.current=updated
              }
              // Log to acquisition engine — Luna test feeds the Map
              const lastTest=testsGivenRef.current[testsGivenRef.current.length-1]
              if(lastTest&&isOnline){
                ngFetch('ng-session-end',{
                  mode:'luna_test',
                  events:[{scaffold_id:lastTest.scaffold_id,stage:lastTest.stage,
                    quality:passed?4:1,produced:passed,mode:'luna_test'}],
                  duration_seconds:30
                }).catch(()=>{})
              }
            }
          }
          setMessages(prev=>[...prev,{role:'luna',text,id:Date.now(),testEval}])
        }
        setDotMode('listen')
        setStatus(pttRef.current?'Hold to talk':'Listening…')
        break
      }

      case 'response.created':
        respActiveRef.current=true
        break
      case 'response.done':
        respActiveRef.current=false
        // Response cycle complete — commit any orphaned live text (safety net only)
        if(lunaLiveRef.current.trim()){
          const text=lunaLiveRef.current.trim()
          lunaLiveRef.current=''
          setLiveText('')
          transcriptRef.current.push({role:'assistant',text})
          setMessages(prev=>[...prev,{role:'luna',text,id:Date.now()}])
        }
        setDotMode('listen')
        setStatus(pttRef.current?'Hold to talk':'Listening…')
        // Goodbye was detected — end session after this response finishes
        if(shouldEndRef.current){
          shouldEndRef.current=false
          setTimeout(()=>endSession(),800)
        }
        break

      case 'conversation.item.input_audio_transcription.completed':
        // Dead on WebRTC (transcription config rejected) — and if OpenAI ever
        // enables it, this would DUPLICATE the Whisper bubble. Deliberate no-op.
        break

      case 'conversation.item.done':
        // Log full content — check if transcript is embedded here
        if(ev.item?.role==='user'&&ev.item?.content){
          log('User item content: '+JSON.stringify(ev.item.content).slice(0,200))
          // Some API versions embed transcript directly in the item
          const transcript=ev.item.content?.find?.(c=>c.type==='input_audio'&&c.transcript)?.transcript||
                           ev.item.content?.find?.(c=>c.transcript)?.transcript
          if(transcript){
            const text=transcript.trim()
            if(text){
              transcriptRef.current.push({role:'user',text})
              setMessages(prev=>[...prev,{role:'user',text,id:Date.now()}])
              // If test in progress, user just answered — mark waiting for Luna eval
              if(testInProgress.current)testInProgress.current='answered'
            }
          }
        }
        break

      case 'session.updated':
        log('Session updated — transcription: '+JSON.stringify(ev.session?.input_audio_transcription))
        break

      case 'input_audio_buffer.speech_started':
        if(pttRef.current){setDotMode('');break} // appended PTT audio — recorder already ran
        setDotMode('listen');setStatus('Listening…')
        // Start capturing for Whisper transcription
        if(recorderRef.current&&recorderRef.current.state==='inactive'){
          recChunksRef.current=[]
          recorderRef.current.start()
        }
        break
      case 'input_audio_buffer.speech_stopped':
        if(pttRef.current){setStatus('Thinking…');break}
        setDotMode('');setStatus('Thinking…')
        // Stop recorder — onstop will transcribe via Whisper
        if(recorderRef.current&&recorderRef.current.state==='recording'){
          recorderRef.current.stop()
        }
        break
    }
  }

  // ── Connect ────────────────────────────────────────────────────────────
  const transcribeAudio=async(blob,phId)=>{
    if(!blob||blob.size<1000)return
    try{
      const r=await fetch('/.netlify/functions/ng-transcribe',{
        method:'POST',
        headers:{'Content-Type':blob.type||'audio/webm'},
        body:blob
      })
      const d=await r.json()
      if(d.text?.trim()){
        const text=d.text.trim()
        transcriptRef.current.push({role:'user',text})
        setMessages(prev=>phId&&prev.some(m=>m.id===phId)
          ?prev.map(m=>m.id===phId?{...m,text,pending:false}:m)
          :[...prev,{role:'user',text,id:Date.now()}])
        if(testInProgress.current)testInProgress.current='answered'
        if(isGoodbye(text))shouldEndRef.current=true
      }else if(phId){
        // Whisper heard nothing usable — remove the ghost bubble
        setMessages(prev=>prev.filter(m=>m.id!==phId))
      }
    }catch(e){
      if(phId)setMessages(prev=>prev.filter(m=>m.id!==phId))
      log('Transcribe error: '+e.message)}
  }

  const connect=useCallback(async()=>{
    if(!isOnline||phaseRef.current!=='idle')return
    phaseRef.current='connecting'
    testInProgress.current=false // reset from any previous session
    testsGivenRef.current=[] // reset test history for new session
    setPhase('connecting');setStatus('Connecting…')
    setMessages([]);setLiveText('')
    transcriptRef.current=[];lunaLiveRef.current='';shouldEndRef.current=false
    SND.init()
    try{
      log('Requesting session token…')
      const endpoint=ngMode?'ng-luna-session':'luna-session'
      const sessionBody=ngMode
        ?{spectrum:spectrumRef.current,speed:speedRef.current,pttMode:pttRef.current,voice:lunaVoice}
        :{spectrum:spectrumRef.current,speed:speedRef.current}
      const res=await fetch(`/.netlify/functions/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sessionBody)})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||`Server ${res.status}`)
      sesDataRef.current=data // store for dc.onopen (frontier, chat_history, phase etc)
      const token=data.value
      const model=data.model||'gpt-realtime-mini'
      log(`Token: ${token?'OK':'MISSING'} | Model: ${model}`)
      if(!token)throw new Error('No token — check OPENAI_API_KEY in Netlify env vars')
      if(data.cardMap)setCardMap(prev=>({...prev,...data.cardMap}))

      log('Getting microphone…')
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
      streamRef.current=stream
      // Immediately disable mic if in PTT mode — prevents audio leaking before DC opens
      if(pttRef.current) stream.getAudioTracks().forEach(t=>{t.enabled=false})
      log('Mic OK')

      const pc=new RTCPeerConnection()
      pcRef.current=pc
      const audioEl=new Audio();audioEl.autoplay=true;audioRef.current=audioEl
      pc.ontrack=e=>{if(audioRef.current)audioRef.current.srcObject=e.streams[0]}
      stream.getTracks().forEach(t=>pc.addTrack(t,stream))

      const dc=pc.createDataChannel('oai-events')
      dcRef.current=dc

      dc.onopen=()=>{
        log('Data channel open — sending session.update…')
        // Init MediaRecorder for user speech transcription via Whisper
        try{
          // Safari (iPad!) supports NONE of the webm types — it records mp4/AAC.
          const mimeType=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(m=>MediaRecorder.isTypeSupported(m))||''
          // CRITICAL: the recorder must NOT share the WebRTC stream — muting
          // that stream (PTT) silences every consumer, recorder included.
          // A cloned stream stays live regardless of what OpenAI hears.
          const recStream=stream.clone()
          recStream.getAudioTracks().forEach(t=>{t.enabled=true})
          recStreamRef.current=recStream
          const rec=new MediaRecorder(recStream,mimeType?{mimeType}:{})
          rec.ondataavailable=e=>{if(e.data&&e.data.size>0)recChunksRef.current.push(e.data)}
          rec.onstop=()=>{
            const chunks=[...recChunksRef.current]
            recChunksRef.current=[]
            const realType=recorderRef.current?.mimeType||mimeType||'audio/mp4'
            const blob=new Blob(chunks,{type:realType})
            if(blob.size<2500){setStatus('');setDotMode('');return} // accidental tap
            // Claim the chat slot NOW — Whisper is slower than Luna's realtime,
            // so without a placeholder your words land under her reply.
            const phId='u'+Date.now()+Math.random().toString(36).slice(2,5)
            setMessages(prev=>[...prev,{role:'user',text:'🎙 …',pending:true,id:phId}])
            transcribeAudio(blob,phId)         // → replaces the placeholder in place
            if(pttRef.current)sendBlobToRealtime(blob) // → Luna's ears (PTT only)
          }
          recorderRef.current=rec
          log('MediaRecorder ready: '+mimeType)
        }catch(e){log('MediaRecorder init failed: '+e.message)}

        // Store frontier + profile context for Test Me injections
        frontierRef.current=sesDataRef.current?.frontier||[]
        profileRef.current=sesDataRef.current
        // Load persisted chat history
        const history=sesDataRef.current?.chat_history||[]
        if(history.length){
          setMessages(prev=>[
            {role:'system',text:'— previous session —',id:'sep-'+Date.now()},
            ...history.slice(-20),
            ...prev
          ])
        }
        phaseRef.current='live';setPhase('live')
        setDotMode('listen');setStatus(pttRef.current?'Hold to talk':'Listening…')
        startTimeRef.current=Date.now()
        timerRef.current=setInterval(()=>setElapsed(Math.floor((Date.now()-startTimeRef.current)/1000)),1000)
        if(pttRef.current)stream.getAudioTracks().forEach(t=>{t.enabled=false})
        // Enable transcription (turn_detection already set at session creation)
        // Minimal session.update — input_audio_transcription rejected by API
        dc.send(JSON.stringify({type:'session.update',session:{
          modalities:['text','audio']
        }}))
        log('Sent session.update: modalities set')
        // Trigger Luna's opening line after brief delay
        setTimeout(()=>{if(dcRef.current?.readyState==='open')dc.send(JSON.stringify({type:'response.create'}))},600)
        // Periodic reinforcement to keep model on track
        reinRef.current=setInterval(()=>{
          if(dcRef.current?.readyState==='open')
            dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'system',content:[{type:'input_text',text:'Keep responses short and natural. Stay in character as a Carioca local.'}]}}))
        },90000)
      }

      dc.onmessage=e=>{
        try{
          const ev=JSON.parse(e.data)
          // Log every event type so we can see what's actually firing
          if(ev.type!=='response.output_audio_transcript.delta')log(`← ${ev.type}`)
          if(ev.type==='session.updated')log(`Transcription: ${JSON.stringify(ev.session?.input_audio_transcription)}`)
          onEventRef.current(ev)
        }catch{}
      }
      dc.onerror=e=>{log(`DC error: ${String(e)}`)}

      const offer=await pc.createOffer()
      await pc.setLocalDescription(offer)
      log(`SDP → OpenAI (${model})…`)
      const sdpRes=await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
        {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/sdp'},body:offer.sdp}
      )
      log(`SDP: ${sdpRes.status}`)
      if(!sdpRes.ok){const e=await sdpRes.text();log(`SDP err: ${e}`);throw new Error(`WebRTC ${sdpRes.status}: ${e}`)}
      await pc.setRemoteDescription({type:'answer',sdp:await sdpRes.text()})
      log('Connected ✓')

    }catch(err){
      log(`FAILED: ${err.message}`)
      cleanup()
      phaseRef.current='idle';setPhase('idle');setStatus(err.message)
    }
  },[isOnline,cleanup,log])

  // ── PTT ────────────────────────────────────────────────────────────────
  // PTT audio path: decode the recorded blob → PCM16 @ 24kHz → push over
  // the data channel. Luna hears NOTHING until release.
  const blobToPcm16=async(blob)=>{
    const ab=await blob.arrayBuffer()
    const ac=new(window.AudioContext||window.webkitAudioContext)({sampleRate:24000})
    const buf=await ac.decodeAudioData(ab)
    let ch
    if(buf.numberOfChannels>1){
      const a=buf.getChannelData(0),b=buf.getChannelData(1)
      ch=new Float32Array(buf.length)
      for(let i=0;i<buf.length;i++)ch[i]=(a[i]+b[i])/2
    }else ch=buf.getChannelData(0)
    // Safari can ignore the sampleRate option — resample manually if needed,
    // or Luna hears you slowed down and pitched into the floor.
    const srcRate=buf.sampleRate||ac.sampleRate
    if(srcRate!==24000){
      const ratio=srcRate/24000
      const outLen=Math.floor(ch.length/ratio)
      const res=new Float32Array(outLen)
      for(let i=0;i<outLen;i++){
        const pos=i*ratio,i0=Math.floor(pos),i1=Math.min(i0+1,ch.length-1),f=pos-i0
        res[i]=ch[i0]*(1-f)+ch[i1]*f
      }
      ch=res
    }
    const pcm=new Int16Array(ch.length)
    for(let i=0;i<ch.length;i++){const s=Math.max(-1,Math.min(1,ch[i]));pcm[i]=s<0?s*0x8000:s*0x7FFF}
    try{ac.close()}catch(_){}
    return pcm
  }
  const pcmChunksB64=(pcm)=>{
    const bytes=new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength)
    const out=[];const SZ=48000
    for(let i=0;i<bytes.length;i+=SZ){
      let bin='';const sl=bytes.subarray(i,Math.min(i+SZ,bytes.length))
      for(let j=0;j<sl.length;j++)bin+=String.fromCharCode(sl[j])
      out.push(btoa(bin))
    }
    return out
  }
  const sendBlobToRealtime=async(blob)=>{
    try{
      if(!dcRef.current||dcRef.current.readyState!=='open')return
      const pcm=await blobToPcm16(blob)
      if(pcm.length<24000*0.25){setStatus('');setDotMode('');return} // tap, not speech
      dcRef.current.send(JSON.stringify({type:'input_audio_buffer.clear'}))
      for(const c of pcmChunksB64(pcm))dcRef.current.send(JSON.stringify({type:'input_audio_buffer.append',audio:c}))
      // trailing silence so server VAD closes the turn and Luna responds
      for(const c of pcmChunksB64(new Int16Array(12000)))dcRef.current.send(JSON.stringify({type:'input_audio_buffer.append',audio:c}))
    }catch(e){log('PTT send failed: '+e.message)}
  }

  const pttOn=e=>{
    e.preventDefault()
    if(!streamRef.current)return
    // Barge-in: cancel only if Luna is actually mid-response
    if(respActiveRef.current&&dcRef.current?.readyState==='open'){
      dcRef.current.send(JSON.stringify({type:'response.cancel'}))
    }
    // Track stays MUTED — Luna hears nothing until release
    streamRef.current.getAudioTracks().forEach(t=>{t.enabled=false})
    recChunksRef.current=[]
    if(recorderRef.current&&recorderRef.current.state==='inactive'){
      try{recorderRef.current.start()}catch(_){}
    }
  }
  const pttOff=e=>{
    e.preventDefault()
    if(!streamRef.current)return
    // onstop delivers the blob → Whisper bubble + PCM push to Luna
    if(recorderRef.current&&recorderRef.current.state==='recording'){
      recorderRef.current.stop()
    }
  }
  const togglePtt=()=>{
    const n=!pttRef.current
    setPtt(n)
    if(streamRef.current)streamRef.current.getAudioTracks().forEach(t=>{t.enabled=!n})
    // turn_detection rejected by OpenAI Realtime API — VAD handled server-side
  }

  // ── Translation ────────────────────────────────────────────────────────
  const sendText=useCallback(async()=>{
    const msg=textInput.trim()
    if(!msg||!dcRef.current||dcRef.current.readyState!=='open')return
    setSendingText(true)
    transcriptRef.current.push({role:'user',text:msg})
    setMessages(prev=>[...prev,{role:'user',text:msg,id:Date.now()}])
    setTextInput('')
    dcRef.current.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:msg}]}}))
    setTimeout(()=>{if(dcRef.current?.readyState==='open')dcRef.current.send(JSON.stringify({type:'response.create'}))},100)
    setSendingText(false)
    if(isGoodbye(msg))shouldEndRef.current=true
  },[textInput])

  const translateWord=useCallback(async word=>{
    const key=(word||'').toLowerCase().trim()
    if(!key)return{translation:'—'}
    if(tlCache[key])return tlCache[key]
    if(cardMap[key]){const r={translation:cardMap[key],fromDeck:true};setTlCache(p=>({...p,[key]:r}));return r}
    try{
      const r=await fetch('/.netlify/functions/luna-translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word,cardMap})})
      const d=await r.json();setTlCache(p=>({...p,[key]:d}));return d
    }catch{return{translation:'—'}}
  },[tlCache,cardMap])

  const addToDeck=useCallback(async(word,translation,sentence)=>{
    if(ngMode){
      // UNIFIED PIPELINE: the analyzer places the phrase in a ladder
      // (base / above / below / extend existing). Verbatim survives. You judge.
      setWordMenu(null)
      setLunaSuggestion({loading:true,phrase:word||sentence||''})
      try{
        const r=await fetch('/.netlify/functions/ng-suggest',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'propose',phrase:word||'',translation:translation||'',context_sentence:sentence||'',source:'luna'})}).then(x=>x.json())
        if(r?.duplicate)setLunaSuggestion({duplicate:true,existing:r.existing})
        else if(r?.suggestion)setLunaSuggestion({sug:r.suggestion})
        else setLunaSuggestion({error:r?.error||'Analysis failed'})
      }catch(e){setLunaSuggestion({error:e.message})}
      return
    }
    await onAddCard(mk(`voice-${Date.now()}`,word||'',translation||'','vocab',{exampleSentence:sentence||null}))
    setWordMenu(null)
  },[onAddCard,ngMode])

  const approveSug=useCallback(async(sug)=>{
    try{
      await fetch('/.netlify/functions/ng-say-it',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({approvedScaffolds:[sug]})})
      SFX.unlock()
      setPendingSug(p=>p.filter(x=>x._id!==sug._id))
    }catch(e){log('Approve failed: '+e.message)}
  },[])

  // ── Done screen ────────────────────────────────────────────────────────
  if(phase==='done'&&summary&&!ngMode)return<div style={{padding:'40px 24px 100px',animation:'up 0.4s ease'}}>
    <div style={{fontSize:52,textAlign:'center',marginBottom:16}}>{(summary.score||0)>=75?'🔥':(summary.score||0)>=50?'💪':'📚'}</div>
    <div style={{fontSize:24,fontWeight:800,color:TX,textAlign:'center',marginBottom:4}}>Session done</div>
    <div style={{fontSize:13,color:MU,textAlign:'center',marginBottom:24}}>{fmtTime(elapsed)}</div>
    {summary.summary&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:16,fontSize:14,color:TX,lineHeight:1.7}}>{summary.summary}</div>}
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
      {(summary.boostWords||[]).map(w=><span key={w} style={{padding:'4px 12px',borderRadius:20,background:`${GR}18`,color:GR,fontSize:12,fontWeight:600}}>{w} ✓</span>)}
      {(summary.struggleWords||[]).map(w=><span key={w} style={{padding:'4px 12px',borderRadius:20,background:`${RE}18`,color:RE,fontSize:12,fontWeight:600}}>{w} ⭐</span>)}
      {(summary.newCardsAdded||[]).map(w=><span key={w} style={{padding:'4px 12px',borderRadius:20,background:`${LU}18`,color:LU,fontSize:12,fontWeight:600}}>+{w}</span>)}
    </div>
    {(summary.newCardsAdded||[]).length>0&&<div style={{fontSize:12,color:MU,marginBottom:20}}>{summary.newCardsAdded.length} new word{summary.newCardsAdded.length!==1?'s':''} added to deck.</div>}
    <PBtn label="Talk again" onClick={()=>{phaseRef.current='idle';setPhase('idle');setSummary(null);setElapsed(0);setMessages([])}}/>
  </div>

  // ── Main render ────────────────────────────────────────────────────────
  return<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>

    {/* Word menu */}
    {lunaSuggestion&&<div style={{position:'fixed',left:12,right:12,bottom:118,zIndex:60,maxWidth:456,margin:'0 auto'}}>
      {lunaSuggestion.loading&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,display:'flex',gap:10,alignItems:'center'}}><Spinner size={14}/>Analisando "{lunaSuggestion.phrase}" — onde entra na escada…</div>}
      {lunaSuggestion.duplicate&&<div onClick={()=>setLunaSuggestion(null)} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,cursor:'pointer'}}>You already have this one: <span style={{color:AC,fontWeight:700}}>{lunaSuggestion.existing?.base}</span> · tap to close</div>}
      {lunaSuggestion.error&&<div onClick={()=>setLunaSuggestion(null)} style={{background:`${RE}10`,border:`1px solid ${RE}44`,borderRadius:14,padding:'12px 15px',fontSize:12,color:RE,cursor:'pointer'}}>{lunaSuggestion.error} · tap to close</div>}
      {lunaSuggestion.sug&&<SuggestionCard sug={lunaSuggestion.sug} onDone={()=>setLunaSuggestion(null)}/>}
    </div>}
    {wordMenu&&<div style={{position:'fixed',inset:0,zIndex:200}} onClick={()=>setWordMenu(null)}>
      <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:wordMenu.y,left:Math.min(wordMenu.x,window.innerWidth-210),background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'8px',minWidth:200,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'up 0.15s ease'}}>
        <div style={{fontSize:15,fontWeight:700,color:YE,padding:'6px 12px',borderBottom:`1px solid ${BD}`,marginBottom:4}}>{wordMenu.word}</div>
        {wordMenu.translation&&<div style={{fontSize:12,color:MU,padding:'2px 12px 8px'}}>{wordMenu.translation}</div>}
        <button onClick={()=>addToDeck(wordMenu.word,wordMenu.translation,wordMenu.sentence)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',background:'none',border:'none',padding:'10px 12px',cursor:'pointer',fontSize:13,color:GR,fontFamily:FONT,borderRadius:8}}>{ngMode?'✦ Capture pattern':'＋ Add to deck'}</button>
        <button onClick={()=>setWordMenu(null)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',background:'none',border:'none',padding:'10px 12px',cursor:'pointer',fontSize:13,color:MU,fontFamily:FONT,borderRadius:8}}>Cancel</button>
      </div>
    </div>}

    {/* Debug panel */}
    {showDebug&&<div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)'}} onClick={()=>setShowDebug(false)}>
      <div onClick={e=>e.stopPropagation()} style={{margin:'60px 16px 16px',background:S,borderRadius:16,padding:'16px',maxHeight:'70vh',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:14,fontWeight:700,color:TX}}>Debug</span>
          <button onClick={()=>setDebugLog([])} style={{fontSize:11,color:MU,background:S2,border:`1px solid ${BD}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontFamily:FONT}}>Clear</button>
        </div>
        <div style={{overflowY:'auto',flex:1,fontFamily:'monospace',fontSize:12,lineHeight:1.6}}>
          {debugLog.length===0?<span style={{color:MU}}>No logs yet</span>:debugLog.map((l,i)=><div key={i} style={{color:l.includes('FAILED')||l.includes('err')||l.includes('MISSING')?RE:l.includes('OK')||l.includes('✓')||l.includes('Mic')?GR:MU,marginBottom:3,wordBreak:'break-all'}}>{l}</div>)}
        </div>
        <div style={{fontSize:11,color:MU,borderTop:`1px solid ${BD}`,paddingTop:10,marginTop:8}}>Tap outside to close</div>
      </div>
    </div>}

    {/* Luna header — minimal in NG mode, full controls in Classic */}
    {!ngMode&&<div style={{padding:'12px 20px 8px',borderBottom:`1px solid ${BD}`,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:11,color:MU,fontWeight:600}}>👋 Amigo</span>
        <input type="range" min={0} max={1} step={0.01} value={spectrum} onChange={e=>setSpectrum(parseFloat(e.target.value))} style={{flex:1,height:3,WebkitAppearance:'none',appearance:'none',borderRadius:2,background:`linear-gradient(to right,${GR} 0%,${LU} ${spectrum*100}%,${BD} ${spectrum*100}%)`,outline:'none',cursor:'pointer'}}/>
        <span style={{fontSize:11,color:MU,fontWeight:600}}>👩‍🏫 Tutor</span>
        <button onClick={()=>setShowDebug(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:0.3,padding:'2px',lineHeight:1,flexShrink:0}}>⚙️</button>
      </div>
      <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'center'}}>
        {[['slow','🐢 Slow'],['normal','⚡ Normal']].map(([k,l])=><button key={k} onClick={()=>setSpeed(k)} style={{padding:'6px 14px',borderRadius:20,background:speed===k?LU:S2,color:speed===k?'#fff':MU,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:FONT}}>{l}</button>)}
      </div>
    </div>}
    {ngMode&&<div style={{padding:'8px 16px',borderBottom:`1px solid ${BD}`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{fontSize:12,color:MU}}>Luna</div>
      <div style={{display:'flex',gap:6,alignItems:'center'}}>
        {['shimmer','echo','nova','onyx'].map(v=><button key={v} onClick={()=>{setLunaVoice(v);localStorage.setItem('luna_voice',v)}}
          style={{padding:'4px 10px',background:lunaVoice===v?LU:S2,border:`1px solid ${lunaVoice===v?LU:BD}`,borderRadius:20,color:lunaVoice===v?'#fff':MU,fontFamily:FONT,fontSize:10,cursor:'pointer'}}>
          {v}
        </button>)}
        <button onClick={()=>setShowDebug(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity:0.3,padding:'2px',lineHeight:1}}>⚙️</button>
      </div>
    </div>}

    {/* Chat feed */}
    <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:8}}>
      {messages.length===0&&phase==='idle'&&<div style={{textAlign:'center',padding:'80px 20px 0'}}>
        <div style={{fontSize:40,marginBottom:16,opacity:0.4}}>◉</div>
        <div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:6}}>{ngMode?'Luna':'Talk to Luna'}</div>
        <div style={{fontSize:13,color:MU,lineHeight:1.7}}>{ngMode?'Your Carioca friend. Tap PTT to start talking.':'Your Carioca conversation partner.'}</div>
      </div>}
      {messages.length>20&&<button onClick={()=>{}} style={{background:'none',border:`1px solid ${BD}`,borderRadius:8,color:MU,fontSize:11,cursor:'pointer',fontFamily:FONT,padding:'6px 12px',margin:'0 auto 8px',display:'block'}}>↑ Load older</button>}
      {messages.map(msg=><VoiceBubble key={msg.id} msg={msg} cardMap={cardMap} translateWord={translateWord} onWordPress={(w,t,s,x,y)=>setWordMenu({word:w,translation:t,sentence:s,x,y})}/>)}

      {/* Scaffold suggestions — Claude's analysis, YOUR approval */}
      {pendingSug.map(sug=><div key={sug._id} style={{margin:'10px 0',background:S2,border:`1.5px solid ${GD}55`,borderRadius:16,padding:'14px 15px',animation:'up 0.3s ease'}}>
        <div style={{fontSize:9,color:GD,fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>✦ Padrão sugerido{sug.anchor_stage?` · sua frase = etapa ${sug.anchor_stage}`:''}</div>
        <div style={{fontSize:15,fontWeight:800,color:TX}}>{sug.base_portuguese}</div>
        <div style={{fontSize:11,color:MU,marginBottom:8}}>{sug.base_english}</div>
        {(sug.stages||[]).map((st,i)=><div key={i} style={{display:'flex',gap:8,padding:'4px 0',borderTop:`1px solid ${BD}`,alignItems:'baseline'}}>
          <span style={{fontSize:9,color:(sug.anchor_stage===i+1)?GD:MU,fontWeight:800,flexShrink:0,width:16}}>{(sug.anchor_stage===i+1)?'★':i+1}</span>
          <span style={{flex:1,fontSize:12.5,color:TX}}>{st.pt}<span style={{color:MU,fontSize:10.5}}> — {st.en}</span></span>
        </div>)}
        {sug.reason&&<div style={{fontSize:10.5,color:MU,fontStyle:'italic',marginTop:8}}>{sug.reason}</div>}
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={()=>approveSug(sug)} style={{flex:1,padding:'11px',background:`${GR}15`,border:`1px solid ${GR}55`,borderRadius:11,color:GR,fontSize:12.5,fontWeight:800,cursor:'pointer',fontFamily:FONT}}>✓ Adicionar à trilha</button>
          <button onClick={()=>setPendingSug(p=>p.filter(x=>x._id!==sug._id))} style={{flex:1,padding:'11px',background:'none',border:`1px solid ${BD}`,borderRadius:11,color:MU,fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:FONT}}>Dispensar</button>
        </div>
      </div>)}
      <div ref={chatEndRef}/>
      {liveText&&<div style={{alignSelf:'flex-start',maxWidth:'85%'}}>
        <div style={{padding:'12px 16px',borderRadius:'18px 18px 18px 4px',background:S,border:`1px solid ${BD}`,fontSize:15,lineHeight:1.6,color:MU,fontStyle:'italic'}}>
          {liveText}<span style={{display:'inline-block',width:7,height:13,background:LU,borderRadius:1,marginLeft:3,animation:'pulse 0.7s ease-in-out infinite',verticalAlign:'middle'}}/>
        </div>
      </div>}
    </div>

    {/* Status bar */}
    <div style={{flexShrink:0,padding:'8px 20px',borderTop:`1px solid ${BD}`,display:'flex',alignItems:'center',gap:10,minHeight:40}}>
      <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:dotMode==='speak'?LU:dotMode==='listen'?GR:BD,transition:'background 0.2s',animation:dotMode?'pulse 1.5s ease-in-out infinite':'none'}}/>
      <span style={{fontSize:13,color:MU,flex:1}}>{status}</span>
      {phase==='live'&&<span style={{fontSize:12,color:MU,fontVariantNumeric:'tabular-nums',fontFamily:'monospace'}}>{fmtTime(elapsed)}</span>}
      {phase==='live'&&<button onClick={togglePtt} style={{fontSize:11,color:ptt?GR:MU,background:ptt?`${GR}18`:S2,border:`1px solid ${ptt?GR:BD}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontFamily:FONT,flexShrink:0}}>{ptt?'Hold to talk':'Auto'}</button>}
      
    </div>

    {phase==='live'&&<div style={{padding:'6px 20px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>

      {ptt&&<div style={{display:'flex',gap:8}}>
        <button onTouchStart={pttOn} onTouchEnd={pttOff} onMouseDown={pttOn} onMouseUp={pttOff}
          style={{flex:3,padding:'14px',border:`1.5px dashed ${BD}`,borderRadius:14,background:'transparent',color:MU,fontFamily:FONT,fontSize:14,fontWeight:600,cursor:'pointer',WebkitTapHighlightColor:'transparent',userSelect:'none'}}>
          Hold to talk
        </button>
        {ngMode&&<button onClick={()=>{
          if(!dcRef.current||dcRef.current.readyState!=='open')return
          // Build intelligent test injection from full queue
          const queue=sesDataRef.current?.test_queue||[]
          const given=testsGivenRef.current
          // Find next untested — or retry last fail
          const lastTest=given[given.length-1]
          const shouldRetry=lastTest&&lastTest.result==='fail'&&
            given.filter(g=>g.scaffold_id===lastTest.scaffold_id).length<2
          let target=null
          if(shouldRetry){
            target=queue.find(q=>q.scaffold_id===lastTest.scaffold_id)
          }else{
            // Skip recently tested (last 3 different patterns)
            const recentIds=new Set(given.slice(-3).map(g=>g.scaffold_id))
            target=queue.find(q=>!recentIds.has(q.scaffold_id))
            if(!target)target=queue[0] // fallback: restart queue
          }
          if(!target)return
          // Build injection — 🧪 prefix, role:'user', type:'input_text'
          // Does NOT go into setMessages — invisible in UI
          const injection=`🧪 ${target.testType} | target: "${target.pt}" (${target.en}) | stage: ${target.stage} | urgency: ${target.urgency}`
          dcRef.current.send(JSON.stringify({
            type:'conversation.item.create',
            item:{type:'message',role:'user',content:[{type:'input_text',text:injection}]}
          }))
          dcRef.current.send(JSON.stringify({type:'response.create'}))
          // Track this test
          testsGivenRef.current=[...given,{scaffold_id:target.scaffold_id,stage:target.stage,type:target.testType,timestamp:Date.now(),result:'pending'}]
          testInProgress.current=true
        }} style={{flex:1,padding:'14px',background:`${LU}15`,border:`1px solid ${LU}44`,borderRadius:14,cursor:'pointer',fontFamily:FONT,fontSize:12,fontWeight:700,color:LU,WebkitTapHighlightColor:'transparent'}}>
          Testa aí →
        </button>}
      </div>}
      {phase==='live'&&<div style={{display:'flex',gap:8,alignItems:'center'}}>
        <input
          value={textInput}
          onChange={e=>setTextInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText()}}}
          placeholder="Type to Luna…"
          autoFocus
          style={{flex:1,background:S,border:`1px solid ${LU}55`,borderRadius:12,padding:'12px 14px',color:TX,fontSize:14,outline:'none',fontFamily:FONT,WebkitUserSelect:'text',userSelect:'text'}}
        />
        <button
          onClick={sendText}
          disabled={!textInput.trim()||sendingText}
          onMouseDown={()=>SND.init()}
          style={{background:LU,color:'#fff',border:'none',borderRadius:12,padding:'12px 16px',fontSize:16,cursor:'pointer',opacity:textInput.trim()&&!sendingText?1:0.4,fontFamily:FONT,flexShrink:0}}
        >→</button>
      </div>}
    </div>}

    {/* Luna unlock pathway — patterns mined from this conversation */}
    {ngMode&&lunaCandidates.length>0&&<div style={{padding:'10px 20px',flexShrink:0,borderTop:`1px solid ${BD}`,maxHeight:'42vh',overflowY:'auto',background:S2}}>
      <div style={{fontSize:11,color:GD,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:8}}>◈ Luna spotted {lunaCandidates.length} pattern{lunaCandidates.length!==1?'s':''} worth learning</div>
      {lunaCandidates.map((sc,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'10px 12px',marginBottom:8}}>
        <div style={{fontSize:14,fontWeight:700,color:TX}}>{sc.base_portuguese}</div>
        <div style={{fontSize:11,color:MU,marginBottom:2}}>{sc.base_english}</div>
        {sc.reason&&<div style={{fontSize:10,color:YE,fontStyle:'italic',marginBottom:6}}>{sc.reason}</div>}
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>setLunaDecisions(d=>({...d,[i]:true}))} style={{flex:1,padding:'7px',background:lunaDecisions[i]===true?`${GR}20`:S2,border:`1px solid ${lunaDecisions[i]===true?GR+'44':BD}`,borderRadius:8,cursor:'pointer',fontFamily:FONT,fontSize:11,fontWeight:600,color:lunaDecisions[i]===true?GR:TX}}>{lunaDecisions[i]===true?'✓ Learn it':'Learn it'}</button>
          <button onClick={()=>setLunaDecisions(d=>({...d,[i]:false}))} style={{flex:1,padding:'7px',background:lunaDecisions[i]===false?`${RE}12`:S2,border:`1px solid ${lunaDecisions[i]===false?RE+'33':BD}`,borderRadius:8,cursor:'pointer',fontFamily:FONT,fontSize:11,color:lunaDecisions[i]===false?RE:MU}}>Skip</button>
        </div>
      </div>)}
      {lunaCandidates.every((_,i)=>lunaDecisions[i]!==undefined)&&<PBtn label="Confirm" onClick={async()=>{
        const appr=lunaCandidates.filter((_,i)=>lunaDecisions[i]===true)
        if(appr.length){
          await ngFetch('ng-field-report',{approvedScaffolds:appr,source:'luna'}).catch(()=>{})
          if(appr[0])setUnlockScaffold(appr[0])
        }
        setLunaCandidates([])
      }}/>}
    </div>}

    {unlockScaffold&&<ScaffoldUnlockAnimation scaffold={unlockScaffold} onComplete={()=>setUnlockScaffold(null)}/>}

    <div style={{padding:'8px 20px 20px',flexShrink:0}}>
      {phase==='idle'&&!ngMode&&<PBtn label={isOnline?'Start talking':'Needs connection'} onClick={isOnline?connect:undefined} disabled={!isOnline} color={LU}/>}
      {phase==='idle'&&ngMode&&<PBtn label={isOnline?'◉  Start Luna':'Needs connection'} onClick={isOnline?connect:undefined} disabled={!isOnline} color={LU}/>}
      {phase==='connecting'&&<PBtn label="Connecting…" disabled color={LU}/>}
      {phase==='ending'&&<PBtn label="Saving…" disabled color={LU}/>}
    </div>
  </div>
}




// ── NGFlashCards ──────────────────────────────────────────────────
function NGFlashCards({isOnline,onBack,reviewItems=[],seed,clearSeed,goTreinoGrammar}){
  const[frontier,setFrontier]=useState([])
  const[idx,setIdx]=useState(0)
  const[flipped,setFlipped]=useState(false)
  const[loading,setLoading]=useState(true)
  const[sessionEvents,setSessionEvents]=useState([])
  const[deckPhase,setDeckPhase]=useState('pick') // pick | session
  const[syncMsg,setSyncMsg]=useState(null) // {ok,text} — live write receipt
  const gainsRef=useRef([]) // session memory deltas → today's-gains end screen
  const[activeDeck,setActiveDeck]=useState(null)
  const[allCats,setAllCats]=useState([])
  const[dueCount,setDueCount]=useState(0)
  const[coachHint,setCoachHint]=useState(null)
  const coachCheckedAt=useRef(0)
  const[done,setDone]=useState(false)
  const[summary,setSummary]=useState({})
  const[writeAnswer,setWriteAnswer]=useState('')
  const[writeResult,setWriteResult]=useState(null)
  const[writeLoading,setWriteLoading]=useState(false)
  const[cardAudio,setCardAudio]=useState(null)
  const[cardPlaying,setCardPlaying]=useState(false)
  const audioCache=useRef({}) // text → base64 audio, pre-generated

  // Smart mode only: first exposure = flip, subsequent = write, review = write
  const getCardMode=(card)=>{
    if(!card)return'flip'
    if(card.isReview)return'write'
    return(card.practice_count||0)===0?'flip':'write'
  }

  const playCardAudio=async(text)=>{
    if(cardPlaying||!text)return
    setCardPlaying(true)
    try{
      // Check cache first — should already be there from pre-generation
      let audioData=audioCache.current[text]
      if(!audioData){
        const data=await ngFetch('ng-tts',{text,voice:'echo'})
        audioData=data.audio
        if(audioData)audioCache.current[text]=audioData
      }
      if(audioData){
        const audio=new Audio('data:audio/mp3;base64,'+audioData)
        audio.onended=()=>setCardPlaying(false)
        audio.onerror=()=>setCardPlaying(false)
        setCardAudio(audio)
        audio.play()
      }else setCardPlaying(false)
    }catch{setCardPlaying(false)}
  }

  useEffect(()=>{
    // Load picker metadata only — session starts when a deck is chosen
    if(!isOnline)return
    ngFetch('ng-frontier').then(d=>{
      setAllCats(d.all_categories||[])
      setDueCount(d.review_count||0)
    }).catch(()=>{})
  },[isOnline])

  useEffect(()=>{
    // Arriving from Learn with a unit seed → straight into that unit's session
    if(seed?.deck==='unit'&&seed.unit_id){
      setActiveDeck(seed.title||'unit')
      setDeckPhase('session')
      setIdx(0);setFlipped(false);setSessionEvents([]);setDone(false);setSummary({})
      loadFrontier('unit',null,seed.unit_id)
      clearSeed&&clearSeed()
    }
  },[seed])

  const[victorPick,setVictorPick]=useState(false) // Victor scope chips visible?
  const startDeck=(deck,category,scope)=>{
    setActiveDeck(deck==='category'?category:deck)
    setDeckPhase('session')
    setIdx(0);setFlipped(false);setSessionEvents([]);setDone(false);setSummary({})
    gainsRef.current=[]
    loadFrontier(deck,category,undefined,scope)
  }

  const loadFrontier=async(deck,category,unitId,scope)=>{
    setLoading(true)
    try{
      const data=await ngFetch('ng-frontier',deck&&deck!=='focus'&&deck!=='due'?{deck,category,unit_id:unitId,scope}:{})
      if(data.error)throw new Error(data.error)
      ngFetch('ng-today',{action:'get'}).then(t=>{if(t?.coach_note)setCoachNote(t.coach_note)}).catch(()=>{})
    ngFetch('ng-suggest',{action:'list'}).then(d=>setPendCount((d.suggestions||[]).length)).catch(()=>{})
      const reviewCards=(data.review||[]).map(r=>({...r,isReview:true}))
      // due = reviews only · decks = pure deck · focus/default = frontier+reviews
      const allCards=deck==='due'?reviewCards
        :(deck&&deck!=='focus')?(data.frontier||[])
        :[...(data.frontier||[]),...reviewCards]
      setFrontier(allCards)
      // Pre-generate TTS for all cards in parallel — silent, best-effort
      if(isOnline&&allCards.length){
        const texts=[...new Set(allCards.map(c=>c.pt).filter(Boolean))]
        Promise.all(texts.slice(0,12).map(async text=>{
          try{
            const r=await ngFetch('ng-tts',{text,voice:'echo'})
            if(r.audio)audioCache.current[text]=r.audio
          }catch{}
        })).catch(()=>{})
      }
    }catch(e){console.warn('Frontier load failed:',e)}
    setLoading(false)
  }

  const card=frontier[idx]

  const writeRetryRef=useRef(null) // firstQ when retrying (Universal Correction Law)
  const submitWrite=async()=>{
    if(!card||writeLoading||getCardMode(card)!=='write')return
    setWriteLoading(true)
    try{
      const data=await ngFetch('ng-write-eval',{
        target_pt:card.pt,
        user_answer:writeAnswer,
        scaffold_id:card.scaffold_id,
        stage:card.stage,
        en_prompt:card.en
      })
      if(writeRetryRef.current!=null){
        // retry: best score counts, minus the 0.5 honesty tax on improvement
        const raw=data.quality||2
        data.quality=Math.max(writeRetryRef.current,Math.max(1,Math.round(raw-0.5)))
        data._retried=true
        writeRetryRef.current=null
      }
      setWriteResult(data)
      // Auto-advance after seeing result — rate fires separately on Continue
    }catch{setWriteResult({quality:2,correct:false,feedback:'Could not evaluate.'})}
    setWriteLoading(false)
  }

  const confirmWriteResult=()=>{
    if(!writeResult)return
    // Don't re-log if this was a reveal (dontKnow already logged quality=1)
    if(!writeResult.revealed){
      rate(writeResult.quality||2)
    }else{
      // Just advance to next card without logging again
      setWriteAnswer('')
      setWriteResult(null)
      if(idx>=frontier.length-1){
        setDone(true);SFX.complete()
        if(isOnline)ngFetch('ng-frontier').then(d=>{if(d.frontier)setFrontier(d.frontier)}).catch(()=>{})
      }else{
        setIdx(i=>i+1)
        setFlipped(false)
        setWriteAnswer('')
        setWriteResult(null)
        if(cardAudio){cardAudio.pause();cardAudio.currentTime=0}
        setCardPlaying(false)
      }
    }
  }

  const dontKnow=()=>{
    // Show the answer first — learning moment — then rate and advance
    if(card){
      setWriteResult({
        quality:1,
        correct:false,
        feedback:"No problem — see it, say it, move on.",
        carioca_correction:card.pt,
        what_was_right:'',
        revealed:true
      })
      if(isOnline)ngFetch('ng-priority-boost',{scaffold_id:card.scaffold_id,boost_type:'failure'}).catch(()=>{})
      if(isOnline)ngFetch('ng-session-end',{mode:'write',events:[{
        scaffold_id:card.scaffold_id,stage:card.stage,quality:1,produced:false,mode:'write',isReview:card.isReview||false
      }],duration_seconds:15}).catch(()=>{})
    }
  }

  // Fire each rating immediately — pick up and put down anytime
  const rate=async(quality)=>{
    if(!card)return
    const produced=quality>=4
    const cardMode=getCardMode(card)
    const event={scaffold_id:card.scaffold_id,stage:card.stage,quality,produced,mode:cardMode==='write'?'write':'flashcard',isReview:card.isReview||false}
    quality>=3?SFX.good():SFX.bad()
    const newEvents=[...sessionEvents,event]
    setSessionEvents(newEvents)

    // Live coach: check every 5 events, only when struggling
    if(isOnline&&newEvents.length>=5&&newEvents.length-coachCheckedAt.current>=5){
      coachCheckedAt.current=newEvents.length
      ngFetch('ng-coach',{mode:'study',events:newEvents}).then(c=>{
        if(c.hint)setCoachHint(c.hint)
      }).catch(()=>{})
    }

    // Log immediately, don't batch
    if(isOnline){
      ngFetch('ng-session-end',{mode:'flashcard',events:[event],duration_seconds:15})
        .then(r=>{
          // Live receipt: proof the memory engine got it — or the exact error
          if(r.memory_error)setSyncMsg({ok:false,text:'⚠ save failed: '+r.memory_error})
          else if(r.memory?.length){const w=r.memory[0];gainsRef.current.push(...r.memory);setSyncMsg({ok:true,text:`🧠 ${w.skill==='recognition'?'recog':'prod'} memory ${w.before}d → ${w.after}d`})}
          else if(r.error)setSyncMsg({ok:false,text:'⚠ '+r.error})
          setTimeout(()=>setSyncMsg(null),2600)
          if(r.newly_acquired?.length)setSummary(s=>({...s,acquired:(s.acquired||0)+r.newly_acquired.length,total_controlled:r.total_controlled||0}))
          setSummary(s=>({...s,inserted:(s.inserted||0)+(r.events_inserted||0),events:newEvents.length}))
        }).catch(()=>{})
    }

    if(idx>=frontier.length-1){
      setDone(true);SFX.complete()
      if(isOnline)ngFetch('ng-frontier').then(d=>{if(d.frontier)setFrontier(d.frontier)}).catch(()=>{})
    }else{
      setIdx(i=>i+1)
      setFlipped(false)
      setWriteAnswer('')
      setWriteResult(null)
      if(cardAudio){cardAudio.pause();cardAudio.currentTime=0}
      setCardPlaying(false)
    }
  }

  const endEarly=()=>{
    setWriteAnswer('')
    setWriteResult(null)
    if(sessionEvents.length===0){onBack();return}
    setDone(true);SFX.complete()
    if(isOnline)ngFetch('ng-frontier').then(d=>{if(d.frontier)setFrontier(d.frontier)}).catch(()=>{})
  }

  if(deckPhase==='pick')return<div style={{padding:'52px 20px 100px',animation:'up 0.35s ease'}}>
    <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0}}>← Home</button>
    </div>
    <div style={{fontSize:24,fontWeight:900,color:TX,marginBottom:4,fontFamily:FONTD}}>Study</div>
    <div style={{fontSize:13,color:MU,marginBottom:22}}>What are you in the mood for?</div>
    {[
      {k:'fading',i:'🌗',t:'Fading',d:'The half-known — catch them before they slip away'},
      {k:'victor',i:'📓',t:'Victor',d:"Your tutor's material — the homework loop"},
      ...(victorPick?[
        {k:'victor_recent',i:'🕐',t:'→ Recent days',d:"The newest 1-2 days from his doc"},
        {k:'victor_older',i:'📚',t:'→ Older material',d:'Everything before that'},
        {k:'victor_all',i:'⛰',t:'→ Everything',d:'The whole Victor bank, newest first'},
      ]:[]),
      {k:'fresh',i:'🔥',t:'Fresh',d:"Newest additions — today's lesson, latest imports"},
      {k:'mix',i:'🎲',t:'Mix',d:'A little of everything, across all categories'},
      {k:'weak',i:'🎯',t:'Weak spots',d:'What you struggle with — the data decides'},
      {k:'due',i:'◌',t:'Due'+(dueCount?` · ${dueCount}`:''),d:'Reviews at the forgetting edge'},
      {k:'focus',i:'◈',t:'Focus',d:'The classic frontier — highest priority 12'},
      {k:'grammar',i:'⚙',t:'Grammar',d:'The Máquina do Tempo — tenses as living sentences'},
    ].map(dk=><button key={dk.k} onClick={()=>{if(dk.k==='grammar'&&goTreinoGrammar){goTreinoGrammar();return}if(dk.k==='victor'){setVictorPick(v=>!v);return}if(dk.k.startsWith('victor_')){setVictorPick(false);startDeck('victor',null,dk.k.split('_')[1]==='all'?null:dk.k.split('_')[1]);return}startDeck(dk.k)}}
      style={{width:'100%',textAlign:'left',background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'15px 16px',marginBottom:10,cursor:'pointer',fontFamily:FONT,display:'flex',gap:14,alignItems:'center'}}>
      <span style={{fontSize:22,flexShrink:0}}>{dk.i}</span>
      <span>
        <span style={{display:'block',fontSize:15,fontWeight:700,color:TX}}>{dk.t}</span>
        <span style={{display:'block',fontSize:12,color:MU,marginTop:2}}>{dk.d}</span>
      </span>
    </button>)}
    {allCats.length>0&&<>
      <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:2,textTransform:'uppercase',margin:'14px 0 10px'}}>Or pick a category</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
        {allCats.map(c=><button key={c} onClick={()=>startDeck('category',c)}
          style={{background:S2,border:`1px solid ${BD}`,borderRadius:20,padding:'8px 14px',cursor:'pointer',fontFamily:FONT,fontSize:12,color:TX}}>
          {c.replace(/_/g,' ')}
        </button>)}
      </div>
    </>}
  </div>

  if(loading)return<div style={{padding:'60px 24px',textAlign:'center'}}>
    <Spinner size={24}/>
    <div style={{color:MU,fontSize:13,marginTop:16}}>Loading your frontier…</div>
  </div>

  if(frontier.length===0)return<div style={{padding:'60px 24px',textAlign:'center',animation:'up 0.4s ease'}}>
    <div style={{fontSize:40,marginBottom:16}}>✓</div>
    <div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:8}}>Frontier empty</div>
    <div style={{fontSize:13,color:MU,lineHeight:1.7,marginBottom:24}}>All current scaffold stages are controlled.<br/>Use Luna to advance to the next stage.</div>
    <PBtn label="Back" onClick={onBack}/>
  </div>

  if(done)return<div style={{padding:'48px 24px 100px',animation:'up 0.4s ease'}}>
    <div style={{fontSize:52,textAlign:'center',marginBottom:16}}>
      {summary.acquired>0?'🔥':'✓'}
    </div>
    <div style={{fontSize:24,fontWeight:800,color:TX,textAlign:'center',marginBottom:4}}>
      {summary.acquired>0?`${summary.acquired} stage${summary.acquired!==1?'s':''} acquired!`:'Session logged'}
    </div>
    <div style={{fontSize:13,color:MU,textAlign:'center',marginBottom:24}}>
      {summary.events||0} patterns practiced · {summary.inserted||0} logged · {summary.total_controlled||0} controlled
    </div>

    {summary.acquired===0&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:600,color:TX,marginBottom:8}}>Progress recorded ✓</div>
      <div style={{fontSize:13,color:MU,lineHeight:1.7,marginBottom:12}}>
        A stage is acquired after 3 sessions with quality ≥ 3. You're building up.
      </div>
      <div style={{fontSize:13,color:AC,lineHeight:1.7}}>
        → Practice these same patterns in Luna or Phrase to acquire them faster.
      </div>
    </div>}

    {summary.acquired>0&&<div style={{background:`${GR}12`,border:`1px solid ${GR}33`,borderRadius:16,padding:'18px',marginBottom:20}}>
      <div style={{fontSize:13,color:GR,lineHeight:1.7}}>
        {summary.acquired} scaffold stage{summary.acquired!==1?'s':''} acquired and moved to the next level. Your frontier has updated.
      </div>
    </div>}

    {gainsRef.current.length>0&&(()=>{
      const g=gainsRef.current
      const total=g.reduce((s,w)=>s+Math.max(0,(w.after||0)-(w.before||0)),0)
      const uniq=[...new Set(g.map(w=>w.scaffold_id))].length
      const top=[...g].sort((a,b)=>(b.after-b.before)-(a.after-a.before)).slice(0,3)
      return<div style={{background:'#0a1a11',border:`1px solid ${AC}33`,borderRadius:18,padding:'18px',marginBottom:16}}>
        <div style={{fontSize:10,color:GD,fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>✦ Ganhos de hoje</div>
        <div style={{display:'flex',gap:18,marginBottom:12}}>
          <div><div style={{fontSize:24,fontWeight:900,color:AC,fontFamily:FONTD}}>{uniq}</div><div style={{fontSize:9,color:MU,letterSpacing:1}}>PATTERNS</div></div>
          <div><div style={{fontSize:24,fontWeight:900,color:GR,fontFamily:FONTD}}>+{Math.round(total*10)/10}d</div><div style={{fontSize:9,color:MU,letterSpacing:1}}>MEMORY</div></div>
        </div>
        {top.map((w,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderTop:`1px solid ${BD}`}}>
          <span style={{fontSize:10,color:MU,flex:1}}>{w.scaffold_id} · s{w.stage} · {w.skill==='recognition'?'recog':'prod'}</span>
          <span style={{fontSize:11,fontWeight:700,color:GR}}>{w.before}d → {w.after}d</span>
        </div>)}
      </div>
    })()}
    <PBtn label="Back to home" onClick={onBack}/>
    <div style={{height:10}}/>
    <GBtn label="Another deck" onClick={()=>setDeckPhase('pick')}/>
  </div>

  // Find previous stage for anchor display
  const prevStage=card.stage>1?{pt:`Stage ${card.stage-1} ✓`}:null
  const nextPreview=`Stage ${card.stage+1} →`

  return<div style={{padding:'52px 20px 100px',animation:'up 0.35s ease'}}>
    <div style={{display:'flex',alignItems:'center',marginBottom:24}}>
      <button onClick={()=>setDeckPhase('pick')} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0}}>‹ Decks</button>
      <div style={{flex:1,textAlign:'center',fontSize:13,color:MU}}>{activeDeck?String(activeDeck).replace(/_/g,' ')+' · ':''}{idx+1} of {frontier.length}</div>
      <button onClick={endEarly} style={{background:'none',border:'none',color:MU,fontSize:12,cursor:'pointer',fontFamily:FONT,padding:0,opacity:0.6}}>Done</button>
    </div>

    {/* Live write receipt — memory engine proof per rep */}
    {syncMsg&&<div style={{position:'fixed',bottom:96,left:'50%',transform:'translateX(-50%)',zIndex:80,background:syncMsg.ok?'#12261f':'#2a1416',border:`1px solid ${syncMsg.ok?GR+'55':RE+'55'}`,borderRadius:20,padding:'7px 14px',fontSize:11.5,fontWeight:600,color:syncMsg.ok?GR:RE,animation:'up 0.25s ease',whiteSpace:'nowrap'}}>{syncMsg.text}</div>}

    {/* Live coach hint — the brain watching in real time */}
    {coachHint&&<div style={{background:`${GR}0d`,border:`1px solid ${GR}33`,borderRadius:12,padding:'10px 13px',marginBottom:14,display:'flex',gap:10,alignItems:'flex-start',animation:'up 0.3s ease'}}>
      <span style={{fontSize:14,flexShrink:0}}>◉</span>
      <div style={{flex:1,fontSize:12,color:TX,lineHeight:1.55}}>{coachHint}</div>
      <button onClick={()=>setCoachHint(null)} style={{background:'none',border:'none',color:MU,fontSize:14,cursor:'pointer',padding:0,flexShrink:0,fontFamily:FONT}}>×</button>
    </div>}

    {/* Progress bar */}
    <div style={{height:2,background:BD,borderRadius:2,marginBottom:20,overflow:'hidden'}}>
      <div style={{height:'100%',background:AC,borderRadius:2,width:`${((idx)/frontier.length)*100}%`,transition:'width 0.3s ease'}}/>
    </div>

    {/* Card — Flip or Write It based on mode */}
    {getCardMode(card)==='flip'?
      <div style={{position:'relative'}}>
      <div style={{position:'absolute',inset:0,transform:'translate(7px,7px)',background:'#0a1a11',border:`1px solid ${BD}`,borderRadius:20,zIndex:0}}/>
      <div style={{position:'absolute',inset:0,transform:'translate(3.5px,3.5px)',background:'#0f281b',border:`1px solid ${BD}`,borderRadius:20,zIndex:0}}/>
      <div onClick={()=>!flipped&&setFlipped(true)}
        style={{position:'relative',zIndex:1,background:S,border:`1px solid ${flipped?AC+'44':BD}`,borderRadius:20,padding:'28px 24px',minHeight:200,cursor:flipped?'default':'pointer',transition:'border 0.2s',animation:'up 0.25s ease',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
          <div style={{fontSize:11,color:card.isReview?YE:MU,fontWeight:600,letterSpacing:2,textTransform:'uppercase'}}>
            {card.isReview?'Review — '+card.category?.replace(/_/g,' '):card.category?.replace(/_/g,' ')}
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:3}}>
            {[1,2,3,4].map(i=><div key={i} style={{width:10,height:3,borderRadius:2,background:i<=card.stage?(card.isReview?YE:AC):BD}}/>)}
          </div>
          <div style={{fontSize:11,color:card.isReview?YE:AC}}>{card.isReview?'Acquired':'Stage '+card.stage}</div>
        </div>
        <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
          <div style={{fontSize:26,fontWeight:800,color:TX,lineHeight:1.3,flex:1}}>{card.pt}</div>
          <button onClick={e=>{e.stopPropagation();playCardAudio(card.pt)}}
            style={{flexShrink:0,width:36,height:36,borderRadius:'50%',background:cardPlaying?AC:S2,border:`1px solid ${cardPlaying?AC:BD}`,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {cardPlaying?'⏸':'▶'}
          </button>
        </div>
        {!flipped&&<div style={{fontSize:12,color:MU,marginTop:16}}>Tap to reveal</div>}
        {flipped&&<div style={{marginTop:12}}>
          <div style={{fontSize:15,color:MU,marginBottom:8}}>{card.en}</div>
          <div style={{fontSize:11,color:MU}}>How did you do?</div>
        </div>}
      </div>
      </div>
    :
      <div style={{background:S,border:`1px solid ${writeResult?(writeResult.correct?GR+'44':RE+'33'):BD}`,borderRadius:20,padding:'24px',animation:'up 0.25s ease',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <div style={{fontSize:11,color:AC,fontWeight:600,letterSpacing:2,textTransform:'uppercase'}}>Write It</div>
          <div style={{marginLeft:'auto',display:'flex',gap:3}}>
            {[1,2,3,4].map(i=><div key={i} style={{width:10,height:3,borderRadius:2,background:i<=card.stage?AC:BD}}/>)}
          </div>
        </div>
        <div style={{fontSize:13,color:MU,marginBottom:6}}>How do you say this in Portuguese?</div>
        <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:16}}>{card.en}</div>

        {!writeResult?<>
          <textarea value={writeAnswer} onChange={e=>setWriteAnswer(e.target.value)}
            placeholder="Escreve em português…"
            autoFocus
            style={{width:'100%',minHeight:80,background:S2,border:`1px solid ${BD}`,borderRadius:12,padding:'12px',color:TX,fontSize:15,outline:'none',resize:'none',fontFamily:FONT,marginBottom:10}}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={submitWrite} disabled={!writeAnswer.trim()||writeLoading}
              style={{flex:2,padding:'12px',background:AC,border:'none',borderRadius:12,color:'#fff',fontFamily:FONT,fontSize:13,fontWeight:700,cursor:'pointer',opacity:writeAnswer.trim()&&!writeLoading?1:0.4}}>
              {writeLoading?'Checking…':'Submit'}
            </button>
            <button onClick={dontKnow}
              style={{flex:1,padding:'12px',background:S2,border:`1px solid ${MU}33`,borderRadius:12,color:MU,fontFamily:FONT,fontSize:12,cursor:'pointer'}}>
              Reveal
            </button>
          </div>
        </>:<>
          <div style={{background:writeResult.revealed?`${MU}12`:writeResult.correct?`${GR}12`:`${RE}12`,border:`1px solid ${writeResult.revealed?MU+'22':writeResult.correct?GR+'33':RE+'22'}`,borderRadius:12,padding:'12px',marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:700,color:writeResult.revealed?MU:writeResult.correct?GR:RE,marginBottom:4}}>
              {writeResult.revealed?'The answer':'Graded: '+writeResult.quality+'/5'}
            </div>
            {writeResult.feedback&&<div style={{fontSize:13,color:MU,lineHeight:1.6,marginBottom:writeResult.carioca_correction?8:0}}>
              {writeResult.feedback}
            </div>}
            {writeResult.carioca_correction&&<div style={{fontSize:20,fontWeight:800,color:AC,marginTop:6,lineHeight:1.4}}>
              {writeResult.carioca_correction}
            </div>}
          </div>
          {writeResult.quality<=3&&!writeResult.revealed&&!writeResult._retried&&
            <button onClick={()=>{writeRetryRef.current=writeResult.quality||1;setWriteResult(null)}}
              style={{width:'100%',padding:'12px',background:`${GD}14`,border:`1px solid ${GD}55`,borderRadius:12,color:GD,fontFamily:FONT,fontSize:13,fontWeight:700,cursor:'pointer',marginBottom:8}}>
              ↻ Tentar de novo (melhor nota vale, com taxa)
            </button>}
          <button onClick={confirmWriteResult}
            style={{width:'100%',padding:'12px',background:writeResult.revealed?MU:AC,border:'none',borderRadius:12,color:'#fff',fontFamily:FONT,fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {writeResult.revealed?'Got it — next →':'Continue →'}
          </button>
        </>}
      </div>
    }

    {/* Rating buttons */}
    {flipped&&card.isReview&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      <button onClick={()=>rate(1)} style={{background:S,border:`1px solid ${RE}44`,borderRadius:14,padding:'20px',cursor:'pointer',fontFamily:FONT}}>
        <div style={{fontSize:20,marginBottom:4}}>✗</div>
        <div style={{fontSize:13,color:RE,fontWeight:600}}>Forgot it</div>
        <div style={{fontSize:10,color:MU}}>goes back to frontier</div>
      </button>
      <button onClick={()=>rate(5)} style={{background:`${GR}08`,border:`1px solid ${GR}44`,borderRadius:14,padding:'20px',cursor:'pointer',fontFamily:FONT}}>
        <div style={{fontSize:20,marginBottom:4}}>✓</div>
        <div style={{fontSize:13,color:GR,fontWeight:600}}>Remembered</div>
        <div style={{fontSize:10,color:MU}}>interval doubles</div>
      </button>
    </div>}
    {flipped&&!card.isReview&&<div style={{display:'flex',gap:10}}>
      <button onClick={()=>rate(1)} style={{flex:1,padding:'16px',background:S,border:`1px solid ${RE}33`,borderRadius:14,cursor:'pointer',fontFamily:FONT,textAlign:'center'}}>
        <div style={{fontSize:22,marginBottom:4}}>✗</div>
        <div style={{fontSize:13,color:RE,fontWeight:700}}>Not yet</div>
      </button>
      <button onClick={()=>rate(4)} style={{flex:1,padding:'16px',background:`${GR}10`,border:`1px solid ${GR}44`,borderRadius:14,cursor:'pointer',fontFamily:FONT,textAlign:'center'}}>
        <div style={{fontSize:22,marginBottom:4}}>✓</div>
        <div style={{fontSize:13,color:GR,fontWeight:700}}>Got it</div>
      </button>
    </div>}
  </div>
}

// ── NGPhrase ───────────────────────────────────────────────────────
function NGPhrase({isOnline,onBack}){
  const[phase,setPhase]=useState('loading') // loading|scenario|answering|result|done
  const[frontier,setFrontier]=useState([])
  const[targetScaffold,setTargetScaffold]=useState(null)
  const[secondaryTarget,setSecondaryTarget]=useState(null)
  const[scenario,setScenario]=useState('')
  const[answer,setAnswer]=useState('')
  const[result,setResult]=useState(null)
  const[sessionEvents,setSessionEvents]=useState([])
  const[roundNum,setRoundNum]=useState(0)

  useEffect(()=>{loadAndGenerate()},[])

  const loadAndGenerate=async()=>{
    setPhase('loading')
    try{
      const data=await ngFetch('ng-frontier')
      const f=data.frontier||[]
      setFrontier(f)
      if(f.length)await generateScenario(f)
      else setPhase('empty')
    }catch{setPhase('done')}
  }

  const generateScenario=async(f,forRound)=>{
    const fList=f||frontier
    if(!fList.length){setPhase('done');return}
    // Pick a frontier item — rotate through them using explicit round number
    const round=forRound!==undefined?forRound:roundNum
    // Pick 2 frontier items for richer scenarios
    const target1=fList[round%fList.length]
    const target2=fList[(round+Math.floor(fList.length/2))%fList.length]
    const target=target1 // primary target for events
    const targets=[target1,target2].filter((t,i,arr)=>t&&arr.findIndex(x=>x.scaffold_id===t.scaffold_id)===i)
    setTargetScaffold(target)
    setSecondaryTarget(targets[1]||null)
    setPhase('loading')
    try{
      const res=await fetch('/.netlify/functions/claude',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          system:`You generate short Portuguese practice scenarios for Rio de Janeiro learners.
The scenario must make BOTH target scaffold patterns the NATURAL response — the learner needs to use both.
Write in English, 2-3 sentences max. Be specific. Set the scene vividly.
Context: ${targets.map(t=>t.context).join('/')}, Phase ${target.phase}.`,
          messages:[{role:'user',content:`Target patterns (learner must use both):
1. "${target.pt}" (${target.en})
${targets[1]?`2. "${targets[1].pt}" (${targets[1].en})`:''}

Write a specific Rio scenario (bar, beach, date, Uber, party) where using BOTH phrases feels completely natural.
Do NOT include the phrases. Do NOT give hints. Just set the scene.`}],
          max_tokens:150
        })
      })
      const d=await res.json()
      setScenario(d.content?.[0]?.text||'')
      setPhase('scenario')
    }catch{setPhase('done')}
  }

  const submitAnswer=async()=>{
    if(!answer.trim()||!targetScaffold)return
    setPhase('loading')
    try{
      const res=await fetch('/.netlify/functions/claude',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          system:`You evaluate Portuguese language responses for a Carioca learner.
Be generous. Accept contractions, informal spelling, dropped subjects.
Never penalise missing accents. Judge on meaning and pattern use.
${secondaryTarget?'This scenario requires TWO patterns — grade both independently.':''}
Return JSON only.`,
          messages:[{role:'user',content:`Scenario: ${scenario}

Target pattern 1: "${targetScaffold.pt}" (${targetScaffold.en})
${secondaryTarget?`Target pattern 2: "${secondaryTarget.pt}" (${secondaryTarget.en})`:''}

Learner's response: "${answer}"

Return JSON:
{
  "used_target": true/false,
  "quality": 1-5,
  "natural": true/false,
  "feedback": "one short honest sentence in English",
  "carioca_version": "how a Carioca would naturally say this"${secondaryTarget?`,
  "used_secondary": true/false,
  "secondary_quality": 1-5`:''}
}`}],
          max_tokens:250
        })
      })
      const d=await res.json()
      const text=d.content?.[0]?.text||'{}'
      const evaluation=JSON.parse(text.replace(/```json|```/g,'').trim())

      const event={
        scaffold_id:targetScaffold.scaffold_id,
        stage:targetScaffold.stage,
        quality:evaluation.quality||2,
        produced:evaluation.used_target||false,
        mode:'phrase'
      }
      const events=[event]
      // Grade + log secondary pattern independently — both progress toward acquisition
      if(secondaryTarget){
        events.push({
          scaffold_id:secondaryTarget.scaffold_id,
          stage:secondaryTarget.stage,
          quality:evaluation.secondary_quality||(evaluation.used_secondary?3:1),
          produced:evaluation.used_secondary||false,
          mode:'phrase'
        })
      }
      const newEvents=[...sessionEvents,...events]
      setSessionEvents(newEvents)
      setResult(evaluation)
      setPhase('result')

      // Fire immediately — no session minimum
      if(isOnline){
        ngFetch('ng-session-end',{
          mode:'phrase',
          events,
          duration_seconds:60
        }).catch(()=>{})
      }
    }catch{setPhase('scenario')}
  }

  const nextRound=()=>{
    const nextRound=roundNum+1
    // No hard cap — continue as long as user wants
    setRoundNum(nextRound)
    setAnswer('')
    setResult(null)
    generateScenario(frontier,nextRound)
  }

  if(phase==='loading')return<div style={{padding:'60px 24px',textAlign:'center'}}>
    <Spinner size={24}/>
    <div style={{color:MU,fontSize:13,marginTop:16}}>
      {roundNum===0?'Setting the scene…':'Evaluating…'}
    </div>
  </div>

  if(phase==='empty')return<div style={{padding:'60px 24px',textAlign:'center'}}>
    <div style={{fontSize:40,marginBottom:16}}>◈</div>
    <div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:8}}>Frontier not loaded</div>
    <div style={{fontSize:13,color:MU,lineHeight:1.7,marginBottom:20}}>Go to Home first to load your frontier, then come back to Phrase.</div>
    <GBtn label="Retry" onClick={loadAndGenerate}/>
  </div>

  if(phase==='done')return<div style={{padding:'48px 24px',textAlign:'center',animation:'up 0.4s ease'}}>
    <div style={{fontSize:40,marginBottom:16}}>{sessionEvents.filter(e=>e.produced).length>=2?'🔥':'💪'}</div>
    <div style={{fontSize:22,fontWeight:800,color:TX,marginBottom:4}}>Session done</div>
    <div style={{fontSize:13,color:MU,marginBottom:24}}>{sessionEvents.length} scenarios · {sessionEvents.filter(e=>e.produced).length} target patterns used</div>
    <PBtn label="Another session" onClick={()=>{setRoundNum(0);setSessionEvents([]);loadAndGenerate()}}/>
    <div style={{height:12}}/>
    <GBtn label="Back to home" onClick={onBack}/>
  </div>

  return<div style={{padding:'52px 20px 100px',animation:'up 0.35s ease'}}>
    <div style={{display:'flex',alignItems:'center',marginBottom:24}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0}}>← Home</button>
      <div style={{flex:1,textAlign:'center',fontSize:13,color:MU}}>Round {roundNum+1}</div>
      <button onClick={()=>{setRoundNum(0);setAnswer('');setResult(null);setSessionEvents([]);loadAndGenerate()}} style={{background:'none',border:'none',color:MU,fontSize:18,cursor:'pointer',fontFamily:FONT,padding:0}}>↺</button>
    </div>

    {/* Scenario */}
    <div style={{background:S,border:`1px solid ${BD}`,borderRadius:20,padding:'24px',marginBottom:20}}>
      <div style={{fontSize:11,color:AC,fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:12}}>The scene</div>
      <div style={{fontSize:15,color:TX,lineHeight:1.7}}>{scenario}</div>
      {!result&&<div style={{marginTop:16,fontSize:12,color:MU}}>
        Target context: <span style={{color:YE}}>{targetScaffold?.context}</span>
      </div>}
    </div>

    {/* Answer input */}
    {phase==='scenario'&&<>
      <div style={{fontSize:13,color:MU,marginBottom:10}}>What do you say? (in Portuguese)</div>
      <textarea
        value={answer}
        onChange={e=>setAnswer(e.target.value)}
        placeholder="Escreve em português…"
        autoFocus
        style={{width:'100%',minHeight:100,background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px',color:TX,fontSize:15,outline:'none',resize:'none',fontFamily:FONT,marginBottom:12}}
      />
      <PBtn label="Submit" onClick={submitAnswer} disabled={!answer.trim()||!isOnline}/>
    </>}

    {/* Result */}
    {phase==='result'&&result&&<div style={{animation:'up 0.3s ease'}}>
      <div style={{background:result.used_target?`${GR}12`:S2,border:`1px solid ${result.used_target?GR+'44':BD}`,borderRadius:16,padding:'18px',marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:700,color:result.used_target?GR:YE,marginBottom:8}}>
          {result.used_target?'✓ Pattern used':'△ Pattern not used'}
        </div>
        <div style={{fontSize:13,color:MU,lineHeight:1.6,marginBottom:result.carioca_version?12:0}}>
          {result.feedback}
        </div>
        {result.carioca_version&&<div style={{borderTop:`1px solid ${BD}`,paddingTop:12,marginTop:4}}>
          <div style={{fontSize:11,color:MU,marginBottom:4}}>A Carioca would say:</div>
          <div style={{fontSize:15,fontWeight:600,color:AC}}>{result.carioca_version}</div>
        </div>}
      </div>

      {/* Show target scaffold */}
      <div style={{background:S,border:`1px solid ${AC}22`,borderRadius:14,padding:'14px 16px',marginBottom:16}}>
        <div style={{fontSize:11,color:MU,marginBottom:4}}>Target scaffold Stage {targetScaffold?.stage}:</div>
        <div style={{fontSize:16,fontWeight:700,color:TX}}>{targetScaffold?.pt}</div>
        <div style={{fontSize:13,color:MU}}>{targetScaffold?.en}</div>
      </div>

      <PBtn label='Next scenario →' onClick={nextRound}/>
    </div>}
  </div>
}




// ── NGScaffoldMap ─────────────────────────────────────────────────
function NGScaffoldMap({isOnline,onBack}){
  const[pendSugs,setPendSugs]=useState([])
  const[matrixSel,setMatrixSel]=useState(null)
  const[mapView,setMapView]=useState('constellation') // constellation | grid
  const[memState,setMemState]=useState([])
  const[graphEdges,setGraphEdges]=useState([])
  const[constFetched,setConstFetched]=useState(false)
  const[scaffolds,setScaffolds]=useState([])
  const[controlled,setControlled]=useState(new Set())
  const[loading,setLoading]=useState(true)
  const[selected,setSelected]=useState(null)
  const[starredScaffolds,setStarredScaffolds]=useState(new Set())
  const[unlockScaffold,setUnlockScaffold]=useState(null)
  useEffect(()=>{
    if(!isOnline)return
    ngFetch('ng-suggest',{action:'list'}).then(d=>setPendSugs(d.suggestions||[])).catch(()=>{})
  },[isOnline])

  useEffect(()=>{
    if((mapView!=='constellation'&&mapView!=='matrix')||memState.length)return
    Promise.all([
      ngFetch('ng-memory',{action:'state'}).then(d=>setMemState(d.state||[])).catch(()=>{}),
      ngFetch('ng-graph',{action:'full'}).then(d=>setGraphEdges(d.edges||[])).catch(()=>{})
    ]).finally(()=>setConstFetched(true))
  },[mapView])

  useEffect(()=>{load()},[])

  const load=async()=>{
    setLoading(true)
    try{
      const UID='00000000-0000-0000-0000-000000000001'
      const[frontierData,{data:scaffoldData},{data:profileData}]=await Promise.all([
        ngFetch('ng-frontier'),
        sb.from('ng_scaffolds')
          .select('id,base_portuguese,base_english,phase,category,stages,current_stage,context')
          .eq('user_id',UID)
          .order('phase'),
        sb.from('ng_learner_profile').select('priority_boosts').eq('user_id',UID).single()
      ])
      const ctrl=new Set(
        (frontierData.controlled_list||[]).map(c=>`${c.scaffold_id}|${c.stage}`)
      )
      setControlled(ctrl)
      // Load starred scaffolds from profile
      const boosts=profileData?.priority_boosts||{}
      setStarredScaffolds(new Set(Object.keys(boosts).filter(id=>boosts[id]>0)))
      if(scaffoldData?.length)setScaffolds(scaffoldData)
    }catch(e){console.warn('Map load:',e)}
    setLoading(false)
  }

  const categories={
    survival:'Survival',grammar_core:'Grammar',identity:'Identity',social:'Social',
    social_foundation:'Social',
    dating_register:'Dating',
    personality_humour:'Personality',
    deep_fluency:'Fluency'
  }

  const catColor={
    survival:AC,grammar_core:GD,identity:BZ,social:GR,
    social_foundation:GR,
    dating_register:AC,
    personality_humour:YE,
    deep_fluency:GD
  }

  const getStagesControlled=(sc)=>{
    return sc.stages.filter(st=>controlled.has(`${sc.id}|${st.stage}`)).length
  }

  const grouped={}
  scaffolds.forEach(s=>{
    const cat=s.category||'social_foundation'
    if(!grouped[cat])grouped[cat]=[]
    grouped[cat].push(s)
  })

  const totalControlled=scaffolds.reduce((sum,s)=>sum+getStagesControlled(s),0)
  const totalStages=scaffolds.reduce((sum,s)=>sum+(s.stages?.length||4),0)

  if(loading)return<div style={{padding:'60px 24px',textAlign:'center'}}>
    <Spinner size={24}/>
    <div style={{color:MU,fontSize:13,marginTop:16}}>Loading scaffold map…</div>
  </div>

  return<div style={{padding:'52px 0 100px',animation:'up 0.4s ease'}}>

    {/* Header */}
    {unlockScaffold&&<ScaffoldUnlockAnimation scaffold={unlockScaffold} onComplete={()=>setUnlockScaffold(null)}/>}

    {/* Semantics legend — ✓ is history, rings are now */}
    <div style={{padding:'0 20px',marginBottom:10,fontSize:10,color:MU,opacity:0.75,lineHeight:1.5}}>✓ = acquired (historical) · trilha rings & constellation glow = memory strength <i>now</i> — they can fade; that's honesty, not a bug.</div>

    {/* Pendentes — the suggestion shelf */}
    {pendSugs.length>0&&<div style={{padding:'0 20px',marginBottom:18}}>
      <div style={{fontSize:10,color:GD,fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>📥 Pendentes · {pendSugs.length}</div>
      {pendSugs.map(sg=><SuggestionCard key={sg.id} sug={sg} onDone={()=>setPendSugs(p=>p.filter(x=>x.id!==sg.id))}/>)}
    </div>}
    <div style={{padding:'0 20px 20px',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0}}>← Back</button>
      <div style={{flex:1}}>
        <div style={{fontSize:18,fontWeight:800,color:TX}}>Scaffold Map</div>
        <div style={{fontSize:12,color:MU,marginTop:2}}>{totalControlled} of {totalStages} stages controlled</div>
      </div>
    </div>

    {/* View switch — Live constellation / classic grid */}
    <div style={{padding:'0 20px 14px',display:'flex',gap:8}}>
      {[['constellation','✦ Live map'],['grid','⊞ Grid'],['matrix','⚙ Matrix']].map(([k,l])=>
        <button key={k} onClick={()=>setMapView(k)}
          style={{flex:1,padding:'10px',background:mapView===k?`${AC}18`:S2,border:`1px solid ${mapView===k?AC+'55':BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,fontSize:13,fontWeight:mapView===k?700:400,color:mapView===k?AC:MU}}>{l}</button>)}
      <button onClick={()=>{SFX.tap();fetch('/.netlify/functions/ng-export').then(r=>r.blob()).then(b=>{const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='carioca-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}).catch(()=>{})}}
        style={{padding:'10px 14px',background:S2,border:`1px solid ${BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,fontSize:14,color:GD}}>⬇</button>
    </div>

    {/* Overall progress bar */}
    <div style={{padding:'0 20px 24px'}}>
      <div style={{height:4,background:BD,borderRadius:4,overflow:'hidden'}}>
        <div style={{height:'100%',background:`linear-gradient(to right,${GR},${AC})`,borderRadius:4,width:`${totalStages?totalControlled/totalStages*100:0}%`,transition:'width 1s ease'}}/>
      </div>
    </div>

    {/* Constellation view — knowledge as a living network */}
    {mapView==='constellation'&&<div style={{padding:'0 12px 24px'}}>
      {(memState.length||graphEdges.length)
        ?<ConstellationView scaffolds={scaffolds} memState={memState} edges={graphEdges}/>
        :constFetched
        ?<div style={{textAlign:'center',padding:'50px 20px'}}>
          <div style={{fontSize:32,marginBottom:12,opacity:0.4}}>✦</div>
          <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:6}}>No memory data yet</div>
          <div style={{fontSize:12,color:MU,lineHeight:1.7}}>The constellation lights up from the memory engine and knowledge graph.<br/>Open <b>Intel</b> and tap <b style={{color:AC}}>✦ V2 Setup</b> once — it backfills your whole history.</div>
        </div>
        :<div style={{textAlign:'center',padding:'60px 20px'}}><Spinner size={20}/><div style={{fontSize:12,color:MU,marginTop:12}}>Mapping the constellation…</div></div>}
      <div style={{fontSize:10,color:MU,opacity:0.6,textAlign:'center',marginTop:10}}>Brightness = memory strength · threads = relationships · tap ⊞ for grid</div>
    </div>}

    {/* Selected scaffold — fixed overlay popup */}
    {selected&&<div onClick={()=>setSelected(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:S,border:`1px solid ${BD}`,borderRadius:20,padding:'20px',width:'100%',maxWidth:420,maxHeight:'75vh',overflowY:'auto',animation:'up 0.2s ease'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:800,color:TX}}>{selected.base_portuguese}</div>
            <div style={{fontSize:13,color:MU,marginTop:2}}>{selected.base_english}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button onClick={async()=>{
              const bd=await ngFetch('ng-priority-boost',{scaffold_id:selected.id,boost_type:'star',remove:starredScaffolds.has(selected.id)})
              if(bd?.boosts)setStarredScaffolds(new Set(Object.keys(bd.boosts).filter(k=>bd.boosts[k]>0)))
              else if(bd?.error)alert('Star failed: '+bd.error)
            }} style={{background:starredScaffolds.has(selected.id)?`${YE}20`:S2,border:`1px solid ${starredScaffolds.has(selected.id)?YE+'44':BD}`,borderRadius:10,padding:'6px 10px',cursor:'pointer',fontSize:16,fontFamily:FONT}}>
              {starredScaffolds.has(selected.id)?'★':'☆'}
            </button>
            <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:MU,fontSize:22,cursor:'pointer',padding:'0 4px',fontFamily:FONT,lineHeight:1}}>×</button>
          </div>
        </div>
        {starredScaffolds.has(selected.id)&&<div style={{fontSize:11,color:YE,marginBottom:10}}>★ Priority boosted — this will appear more in Study, Phrase and Shuffle</div>}
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {(selected.stages||[]).map(st=>{
            const done=controlled.has(`${selected.id}|${st.stage}`)
            return<div key={st.stage} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:done?`${GR}12`:S2,borderRadius:12,border:`1px solid ${done?GR+'33':BD}`}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:done?GR:BD,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:done?TX:MU,fontWeight:done?600:400,lineHeight:1.4}}>{st.pt}</div>
                <div style={{fontSize:11,color:MU,marginTop:2}}>{st.en}</div>
              </div>
              <div style={{fontSize:11,color:done?GR:MU,fontWeight:done?600:400,flexShrink:0}}>
                {done?'✓ Controlled':`Stage ${st.stage}`}
              </div>
            </div>
          })}
        </div>
      </div>
    </div>}

    {/* Category sections — grid view */}
    {mapView==='matrix'&&(()=>{
      // A MATRIZ — persons × Linha do Tempo, each cell lit by live memory.
      // Pure read over existing data: scaffolds classified, memory glows.
      const persons=['eu','você·ele·ela','nós','eles']
      const stabOf={}
      for(const m of memState){
        const k=m.scaffold_id
        if(!stabOf[k]||m.stability>stabOf[k])stabOf[k]=m.stability||0
      }
      const cells={}
      for(const sc of scaffolds){
        for(const st of(sc.stages||[])){
          const tp=tlClassify(st.pt);const pp=personClassify(st.pt)
          if(!tp||!pp)continue
          const key=pp+'|'+tp
          const s=stabOf[sc.id]||0
          if(!cells[key]||s>cells[key].s)cells[key]={s,pt:st.pt,en:st.en}
        }
      }
      return<div style={{padding:'0 12px'}}>
        <div style={{fontSize:10.5,color:MU,textAlign:'center',marginBottom:6,lineHeight:1.6}}>The Timeline × the three living person-forms.<br/>Each cell lights up with your REAL memory strength. Tap a cell to see its sentence.</div>
        <div style={{fontSize:9.5,color:MU,opacity:0.7,textAlign:'center',marginBottom:12}}>This fills as you practice the ⚙ Máquina do Tempo units — empty at first is normal.</div>
        <div style={{overflowX:'auto'}}>
        <table style={{borderCollapse:'separate',borderSpacing:3,margin:'0 auto'}}>
          <thead><tr><th></th>{TL_POINTS.map(p=><th key={p} style={{fontSize:7.5,color:GD,fontWeight:800,padding:'2px 1px',maxWidth:44,fontFamily:FONT}}>{p}</th>)}</tr></thead>
          <tbody>{persons.map(pp=><tr key={pp}>
            <td style={{fontSize:9,color:AC,fontWeight:800,paddingRight:6,whiteSpace:'nowrap',fontFamily:FONT}}>{pp}</td>
            {TL_POINTS.map(tp=>{
              const c=cells[pp+'|'+tp]
              const glow=c?Math.min(1,c.s/7):0
              return<td key={tp} onClick={()=>c&&setMatrixSel({person:pp,point:tp,pt:c.pt,en:c.en||'',s:c.s})} style={{width:40,height:40,borderRadius:9,textAlign:'center',verticalAlign:'middle',cursor:c?'pointer':'default',
                background:c?(glow>0?`rgba(46,229,111,${0.08+glow*0.5})`:S):`${S2}`,
                border:`1px solid ${c?(glow>0.6?GR:glow>0?GR+'55':BD):'#15291c'}`,
                fontSize:11,color:glow>0.6?'#0a1f12':glow>0?GR:c?MU:'#25402f',fontWeight:800}}>
                {c?(glow>=0.99?'★':glow>0?Math.round(c.s*10)/10:'·'):''}
              </td>})}
          </tr>)}</tbody>
        </table>
        </div>
        {matrixSel&&<div style={{margin:'14px auto 0',maxWidth:360,background:S,border:`1px solid ${GD}55`,borderRadius:14,padding:'12px 15px',animation:'up 0.25s ease'}}>
          <div style={{fontSize:8.5,color:GD,fontWeight:800,letterSpacing:1.5,marginBottom:5}}>{matrixSel.person} × {matrixSel.point}</div>
          <div style={{fontSize:14.5,fontWeight:700,color:AC}}>{matrixSel.pt}</div>
          <div style={{fontSize:11,color:MU,marginTop:2}}>{matrixSel.en} · {matrixSel.s>0?`${Math.round(matrixSel.s*10)/10}d de memória`:'not practiced yet'}</div>
        </div>}
        <div style={{fontSize:9.5,color:MU,textAlign:'center',marginTop:12}}>número = dias de estabilidade · ★ = sólido (7d+) · vazio = célula ainda não existe no teu banco</div>
      </div>
    })()}

    {mapView==='grid'&&Object.entries(categories).map(([cat,label])=>{
      const catScaffolds=grouped[cat]||[]
      if(!catScaffolds.length)return null
      const color=catColor[cat]||AC
      const catControlled=catScaffolds.reduce((sum,s)=>sum+getStagesControlled(s),0)
      const catTotal=catScaffolds.reduce((sum,s)=>sum+(s.stages?.length||4),0)

      return<div key={cat} style={{marginBottom:28}}>
        <div style={{padding:'0 20px',display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
          <div style={{fontSize:13,fontWeight:700,color:TX}}>{label}</div>
          <div style={{fontSize:11,color:MU,marginLeft:'auto'}}>{catControlled}/{catTotal}</div>
        </div>

        {/* Grid */}
        <div style={{padding:'0 16px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {catScaffolds.map(s=>{
            const stagesControlled=getStagesControlled(s)
            const total=s.stages?.length||4
            const pct=stagesControlled/total

            return<button
              key={s.id}
              onClick={()=>setSelected(s)}
              style={{background:pct===1?`${color}22`:pct>0?`${color}10`:S,border:`1px solid ${pct===1?color+'55':pct>0?color+'22':BD}`,borderRadius:12,padding:'10px 8px',cursor:'pointer',textAlign:'center',WebkitTapHighlightColor:'transparent',transition:'all 0.15s',position:'relative'}}
            >
              {/* Stage bars */}
              <div style={{display:'flex',gap:2,justifyContent:'center',marginBottom:6}}>
                {[...Array(total)].map((_,i)=><div key={i} style={{width:8,height:3,borderRadius:2,background:i<stagesControlled?color:BD}}/>)}
              </div>
              <div style={{fontSize:9,color:pct>0?color:MU,fontWeight:600,lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                {s.base_portuguese}
              </div>
            </button>
          })}
        </div>
      </div>
    })}
  </div>
}




function NGShuffle({isOnline,onBack}){
  const[phase,setPhase]=useState('setup') // setup|loading|challenge|result|done
  const[count,setCount]=useState(5)
  const[difficulty,setDifficulty]=useState('easy')
  const[coherentMode,setCoherentMode]=useState(true) // coherent=same category, false=random
  const[words,setWords]=useState([])
  const[challenge,setChallenge]=useState(null)
  const[answer,setAnswer]=useState('')
  const[result,setResult]=useState(null)
  const[sessionResults,setSessionResults]=useState([])

  const start=async()=>{
    if(!isOnline)return
    setPhase('loading')
    try{
      const data=await ngFetch('ng-shuffle',{count,difficulty,coherent:coherentMode,action:'generate'})
      if(!data.ok){setPhase('setup');alert(data.error||'Could not load patterns');return}
      setWords(data.words||[])
      setChallenge(data.challenge||{})
      setAnswer('')
      setResult(null)
      setPhase('challenge')
    }catch{setPhase('setup')}
  }

  const submit=async()=>{
    if(!answer.trim()||!isOnline)return
    setPhase('loading')
    try{
      const data=await ngFetch('ng-shuffle',{action:'evaluate',answer,words})
      setResult(data)
      setSessionResults(r=>[...r,{score:data.score,used:data.patterns_used?.length||0,total:words.length}])
      setPhase('result')
    }catch{setPhase('challenge')}
  }

  const next=()=>{setPhase('setup');setWords([]);setChallenge(null);setAnswer('');setResult(null)}

  const difficultyLabel={easy:'Easy — base form',med:'Med — extended form',hard:'Hard — full Carioca'}

  if(phase==='setup')return<div style={{padding:'20px 20px 100px',animation:'up 0.35s ease'}}>
    <div style={{marginBottom:28}}>
      <div style={{fontSize:22,fontWeight:800,color:TX,marginBottom:4}}>Shuffle</div>
      <div style={{fontSize:13,color:MU,lineHeight:1.6}}>Pick patterns from everything you've practiced. Combine them all in one response.</div>
    </div>

    {/* Count selector */}
    <div style={{marginBottom:24}}>
      <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>How many patterns?</div>
      <div style={{display:'flex',gap:10}}>
        {[3,5,7].map(n=><button key={n} onClick={()=>setCount(n)}
          style={{flex:1,padding:'14px 0',background:count===n?AC:S,border:`1px solid ${count===n?AC:BD}`,borderRadius:12,color:count===n?'#fff':TX,fontFamily:FONT,fontSize:16,fontWeight:700,cursor:'pointer'}}>
          {n}
        </button>)}
      </div>
    </div>

    {/* Difficulty selector */}
    <div style={{marginBottom:32}}>
      <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>Difficulty</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {['easy','med','hard'].map(d=><button key={d} onClick={()=>setDifficulty(d)}
          style={{padding:'14px 16px',background:difficulty===d?`${AC}15`:S,border:`1px solid ${difficulty===d?AC+'44':BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,textAlign:'left'}}>
          <span style={{fontSize:13,fontWeight:700,color:difficulty===d?AC:TX,textTransform:'capitalize'}}>{d}</span>
          <span style={{fontSize:12,color:MU,marginLeft:8}}>{difficultyLabel[d]}</span>
        </button>)}
      </div>
    </div>

    {/* Coherent vs Random */}
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>Pattern selection</div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setCoherentMode(true)}
          style={{flex:1,padding:'12px',background:coherentMode?`${AC}15`:S,border:`1px solid ${coherentMode?AC+'44':BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,textAlign:'left'}}>
          <div style={{fontSize:12,fontWeight:700,color:coherentMode?AC:TX}}>Coherent</div>
          <div style={{fontSize:11,color:MU}}>Same category — forms natural sentences</div>
        </button>
        <button onClick={()=>setCoherentMode(false)}
          style={{flex:1,padding:'12px',background:!coherentMode?`${AC}15`:S,border:`1px solid ${!coherentMode?AC+'44':BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,textAlign:'left'}}>
          <div style={{fontSize:12,fontWeight:700,color:!coherentMode?AC:TX}}>Random</div>
          <div style={{fontSize:11,color:MU}}>Mixed — harder creative challenge</div>
        </button>
      </div>
    </div>

    <PBtn label={isOnline?"Let's go →":'Needs connection'} onClick={start} disabled={!isOnline}/>

    {sessionResults.length>0&&<div style={{marginTop:20,background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px 16px'}}>
      <div style={{fontSize:11,color:MU,marginBottom:6}}>This session</div>
      {sessionResults.map((r,i)=><div key={i} style={{fontSize:13,color:TX,marginBottom:2}}>
        Round {i+1}: {r.score}/10 — {r.used}/{r.total} patterns used
      </div>)}
    </div>}
  </div>

  if(phase==='loading')return<div style={{padding:'60px 24px',textAlign:'center'}}>
    <Spinner size={24}/>
    <div style={{color:MU,fontSize:13,marginTop:16}}>{words.length?'Evaluating…':'Building your challenge…'}</div>
  </div>

  if(phase==='challenge')return<div style={{padding:'20px 20px 100px',animation:'up 0.35s ease'}}>
    {/* Scenario */}
    <div style={{background:`${AC}10`,border:`1px solid ${AC}33`,borderRadius:18,padding:'18px 20px',marginBottom:16}}>
      <div style={{fontSize:10,color:AC,fontWeight:700,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>The challenge</div>
      <div style={{fontSize:14,color:TX,lineHeight:1.7,marginBottom:8}}>{challenge?.scenario}</div>
      {challenge?.hint&&<div style={{fontSize:11,color:MU}}>💡 {challenge.hint}</div>}
    </div>

    {/* Patterns to use — EN only, recall the PT from memory */}
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>Express these in Portuguese</div>
      <div style={{fontSize:11,color:MU,opacity:0.6,marginBottom:8}}>Recall the Carioca form — don't write the English</div>
      {words.map((w,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:S,border:`1px solid ${BD}`,borderRadius:10,marginBottom:6}}>
        <div style={{width:20,height:20,borderRadius:'50%',background:AC,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{fontSize:10,color:'#fff',fontWeight:700}}>{i+1}</span>
        </div>
        <div style={{fontSize:14,fontWeight:600,color:TX}}>{w.en}</div>
      </div>)}
    </div>

    {/* Answer */}
    <textarea
      value={answer}
      onChange={e=>setAnswer(e.target.value)}
      placeholder="Escreve em português…"
      autoFocus
      style={{width:'100%',minHeight:120,background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px',color:TX,fontSize:15,outline:'none',resize:'none',fontFamily:FONT,marginBottom:12}}
    />
    <PBtn label="Submit" onClick={submit} disabled={!answer.trim()||!isOnline}/>
  </div>

  if(phase==='result'&&result)return<div style={{padding:'20px 20px 100px',animation:'up 0.35s ease'}}>
    {/* Score */}
    <div style={{textAlign:'center',marginBottom:20}}>
      <div style={{fontSize:52,fontWeight:900,color:result.score>=7?GR:result.score>=5?YE:RE}}>{result.score}/10</div>
      <div style={{fontSize:14,color:MU}}>
        {result.patterns_used?.length||0} of {words.length} patterns used correctly
      </div>
    </div>

    {/* Feedback */}
    <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'16px',marginBottom:12}}>
      <div style={{fontSize:13,color:TX,lineHeight:1.7,marginBottom:result.carioca_version?12:0}}>{result.feedback}</div>
      {result.carioca_version&&<>
        <div style={{height:1,background:BD,margin:'10px 0'}}/>
        <div style={{fontSize:11,color:MU,marginBottom:4}}>How a Carioca would write it:</div>
        <div style={{fontSize:14,fontWeight:600,color:AC,lineHeight:1.6}}>{result.carioca_version}</div>
      </>}
    </div>

    {/* Missed patterns */}
    {result.patterns_missed?.length>0&&<div style={{background:S,border:`1px solid ${RE}33`,borderRadius:14,padding:'14px',marginBottom:12}}>
      <div style={{fontSize:11,color:RE,fontWeight:600,marginBottom:6}}>Patterns missed</div>
      {result.patterns_missed.map((p,i)=><div key={i} style={{fontSize:13,color:MU,marginBottom:2}}>· {p}</div>)}
    </div>}

    {words.length>0&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px',marginBottom:12}}>
      <div style={{fontSize:11,color:MU,marginBottom:6}}>The patterns (Portuguese):</div>
      {words.map((w,i)=><div key={i} style={{fontSize:13,color:TX,marginBottom:2}}>
        <span style={{color:MU}}>{i+1}. </span>{w.pt}<span style={{color:MU,fontSize:11}}> — {w.en}</span>
      </div>)}
    </div>}

    <div style={{display:'flex',gap:10}}>
      <button onClick={next} style={{flex:1,padding:'14px',background:AC,border:'none',borderRadius:14,color:'#fff',fontFamily:FONT,fontSize:14,fontWeight:700,cursor:'pointer'}}>Another round</button>
      <button onClick={onBack} style={{flex:1,padding:'14px',background:S,border:`1px solid ${BD}`,borderRadius:14,color:TX,fontFamily:FONT,fontSize:14,cursor:'pointer'}}>Done</button>
    </div>
  </div>

  return null
}

// ── NGSayIt ───────────────────────────────────────────────────────
function NGSayIt({isOnline,onBack}){
  const[unlockScaffold,setUnlockScaffold]=useState(null)
  const[input,setInput]=useState('')
  const[loading,setLoading]=useState(false)
  const[result,setResult]=useState(null)
  const[audioEl,setAudioEl]=useState(null)
  const[playing,setPlaying]=useState(false)

  // Cleanup audio on unmount
  useEffect(()=>{
    return()=>{if(audioEl){audioEl.pause();audioEl.currentTime=0}}
  },[audioEl])
  const[addedToBank,setAddedToBank]=useState(false)
  const[saySug,setSaySug]=useState(null)
  const[scaffoldDecisions,setScaffoldDecisions]=useState({}) // {idx: true/false}
  const[scaffoldsSubmitted,setScaffoldsSubmitted]=useState(false)

  const translate=async()=>{
    if(!input.trim()||!isOnline)return
    // Stop any existing audio before new translation
    if(audioEl){audioEl.pause();audioEl.currentTime=0;setAudioEl(null);setPlaying(false)}
    setLoading(true)
    setResult(null)
    setAddedToBank(false)
    setScaffoldDecisions({})
    setScaffoldsSubmitted(false)
    try{
      const data=await ngFetch('ng-say-it',{text:input.trim()})
      if(data.carioca){
        setResult(data)
        if(data.audio){
          const audio=new Audio('data:audio/mp3;base64,'+data.audio)
          audio.onended=()=>setPlaying(false)
          setAudioEl(audio)
        }
      }
    }catch(e){console.warn('Say It error:',e)}
    setLoading(false)
  }

  const playAudio=()=>{
    if(!audioEl)return
    if(playing){audioEl.pause();audioEl.currentTime=0;setPlaying(false);return}
    audioEl.play()
    setPlaying(true)
  }

  const addToBank=async()=>{
    if(!result||!isOnline)return
    // UNIFIED PIPELINE — analyzer places it (base/above/below/extend),
    // verbatim survives, you judge on the card below.
    setAddedToBank(true)
    setSaySug({loading:true})
    try{
      const r=await ngFetch('ng-suggest',{action:'propose',phrase:result.carioca,translation:result.original||'',context_sentence:'',source:'say_it'})
      if(r?.duplicate)setSaySug({duplicate:true,existing:r.existing})
      else if(r?.suggestion)setSaySug({sug:r.suggestion})
      else{setSaySug({error:r?.error||'Analysis failed'});setAddedToBank(false)}
    }catch(e){setSaySug({error:e.message});setAddedToBank(false)}
  }

  const submitScaffolds=async()=>{
    if(!result?.suggestions)return
    const approved=result.suggestions.filter((_,i)=>scaffoldDecisions[i]===true)
    if(approved.length){
      await ngFetch('ng-say-it',{approvedScaffolds:approved})
      if(approved[0])setUnlockScaffold(approved[0])
    }
    setScaffoldsSubmitted(true)
  }

  const allDecided=result?.suggestions?.length>0&&
    result.suggestions.every((_,i)=>scaffoldDecisions[i]!==undefined)

  return<div style={{position:'relative'}}>
    {unlockScaffold&&<ScaffoldUnlockAnimation scaffold={unlockScaffold} onComplete={()=>setUnlockScaffold(null)}/>}
    <div style={{padding:'20px 20px 100px',animation:'up 0.35s ease'}}>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:22,fontWeight:800,color:TX,marginBottom:4}}>Say It</div>
      <div style={{fontSize:13,color:MU}}>Type anything. Get the Carioca version.</div>
    </div>

    {/* Input */}
    <textarea
      value={input}
      onChange={e=>setInput(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&e.metaKey)translate()}}
      placeholder="How do I say 'I've been waiting for you for 20 minutes'…"
      style={{width:'100%',minHeight:90,background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px',color:TX,fontSize:15,outline:'none',resize:'none',fontFamily:FONT,marginBottom:10}}
    />
    <PBtn label={loading?'Translating…':'Translate →'} onClick={translate} disabled={!input.trim()||loading||!isOnline}/>

    {loading&&<div style={{padding:'20px 0',textAlign:'center'}}><Spinner size={20}/></div>}

    {/* Result */}
    {result&&!loading&&<div style={{marginTop:20,animation:'up 0.3s ease'}}>
      {/* Translation */}
      <div style={{background:`${AC}10`,border:`1px solid ${AC}33`,borderRadius:16,padding:'18px 20px',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:AC,fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Carioca</div>
            <div style={{fontSize:20,fontWeight:800,color:TX,lineHeight:1.4,marginBottom:6}}>{result.carioca}</div>
            {result.back_translation&&<div style={{fontSize:12,color:MU}}>{result.back_translation}</div>}
          </div>
          {audioEl&&<button onClick={playAudio} style={{flexShrink:0,width:44,height:44,borderRadius:'50%',background:playing?AC:S,border:`1px solid ${playing?AC:BD}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
            {playing?'⏸':'▶'}
          </button>}
        </div>
      </div>

      {/* Add to bank */}
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <button onClick={addToBank} disabled={addedToBank} style={{flex:1,padding:'12px',background:addedToBank?`${GR}20`:S,border:`1px solid ${addedToBank?GR+'44':BD}`,borderRadius:12,cursor:addedToBank?'default':'pointer',fontFamily:FONT,fontSize:13,color:addedToBank?GR:TX,fontWeight:600}}>
          {addedToBank?'✓ Suggestion ready — review below ↓':'✦ Capture as pattern'}
        </button>
        <button onClick={()=>{setInput(result.carioca||'');setResult(null)}} style={{padding:'12px 16px',background:S,border:`1px solid ${BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,fontSize:13,color:MU}}>
          Edit
        </button>
      </div>
      {saySug&&<div style={{marginBottom:16}}>
        {saySug.loading&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,display:'flex',gap:10,alignItems:'center'}}><Spinner size={14}/>Finding where this fits…</div>}
        {saySug.duplicate&&<div onClick={()=>{setSaySug(null);setAddedToBank(false)}} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,cursor:'pointer'}}>You already have this one: <span style={{color:AC,fontWeight:700}}>{saySug.existing?.base}</span> · tap to close</div>}
        {saySug.error&&<div onClick={()=>{setSaySug(null);setAddedToBank(false)}} style={{background:`${RE}10`,border:`1px solid ${RE}44`,borderRadius:14,padding:'12px 15px',fontSize:12,color:RE,cursor:'pointer'}}>{saySug.error} · tap to close</div>}
        {saySug.sug&&<SuggestionCard sug={saySug.sug} onDone={()=>{setSaySug(null)}}/>}
      </div>}

      {/* Scaffold suggestions — user must approve */}
      {result.suggestions?.length>0&&!scaffoldsSubmitted&&<div style={{background:S,border:`1px solid ${YE}33`,borderRadius:16,padding:'16px',marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:YE,marginBottom:4}}>New patterns detected</div>
        <div style={{fontSize:11,color:MU,lineHeight:1.6,marginBottom:12}}>Add these to your scaffold bank? You can reject any you don't want.</div>
        {result.suggestions.map((sc,i)=><div key={i} style={{background:S2,border:`1px solid ${BD}`,borderRadius:12,padding:'12px',marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:2}}>{sc.base_portuguese}</div>
          <div style={{fontSize:12,color:MU,marginBottom:6}}>{sc.base_english}</div>
          <div style={{fontSize:11,color:MU,marginBottom:10,fontStyle:'italic'}}>{sc.reason}</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setScaffoldDecisions(d=>({...d,[i]:true}))}
              style={{flex:1,padding:'8px',background:scaffoldDecisions[i]===true?`${GR}20`:S,border:`1px solid ${scaffoldDecisions[i]===true?GR+'44':BD}`,borderRadius:8,cursor:'pointer',fontFamily:FONT,fontSize:12,color:scaffoldDecisions[i]===true?GR:TX,fontWeight:600}}>
              {scaffoldDecisions[i]===true?'✓ Approved':'Approve'}
            </button>
            <button onClick={()=>setScaffoldDecisions(d=>({...d,[i]:false}))}
              style={{flex:1,padding:'8px',background:scaffoldDecisions[i]===false?`${RE}12`:S,border:`1px solid ${scaffoldDecisions[i]===false?RE+'33':BD}`,borderRadius:8,cursor:'pointer',fontFamily:FONT,fontSize:12,color:scaffoldDecisions[i]===false?RE:MU}}>
              {scaffoldDecisions[i]===false?'✗ Rejected':'Reject'}
            </button>
          </div>
        </div>)}
        {allDecided&&<button onClick={submitScaffolds} style={{width:'100%',padding:'12px',background:AC,border:'none',borderRadius:12,color:'#fff',fontFamily:FONT,fontSize:13,fontWeight:700,cursor:'pointer',marginTop:4}}>
          Confirm decisions
        </button>}
      </div>}

      {scaffoldsSubmitted&&<div style={{background:`${GR}12`,border:`1px solid ${GR}33`,borderRadius:12,padding:'12px',fontSize:13,color:GR,marginBottom:12}}>
        ✓ Scaffold decisions saved
      </div>}

      {/* Translate again */}
      <button onClick={()=>{setInput('');setResult(null);setAddedToBank(false);setScaffoldDecisions({});setScaffoldsSubmitted(false)}}
        style={{width:'100%',padding:'12px',background:'none',border:`1px dashed ${BD}`,borderRadius:12,cursor:'pointer',fontSize:13,color:MU,fontFamily:FONT,marginTop:4}}>
        Translate something else
      </button>
    </div>}
  </div>
  </div>
}

// ── NGImport — Victor's notes import for Next Gen ──────────────────
function NGImport({isOnline,onBack}){
  const[pasted,setPasted]=useState('')
  const[loading,setLoading]=useState(false)
  const[suggestions,setSuggestions]=useState([])
  const[decisions,setDecisions]=useState({})
  const[submitted,setSubmitted]=useState(false)
  const[phase,setPhase]=useState('input') // input|review|done

  const[importProg,setImportProg]=useState(null) // {chunk,total,found}
  const analyse=async()=>{
    if(!pasted.trim()||!isOnline)return
    setLoading(true)
    setSuggestions([])
    // Client-driven chunk chain — one lesson day per request, timeout-immune.
    try{
      let chunk=0,total=null,acc=[],guard=0,skipTotals={}
      while(chunk!==null&&guard<40){
        setImportProg({chunk:chunk+1,total,found:acc.length})
        const d=await ngFetch('ng-import-scaffolds',{notes:pasted.trim(),chunk})
        if(d?.error)break
        total=d.total_chunks||total
        acc=[...acc,...(d.created||[])]
        for(const[k,v]of Object.entries(d.skipped||{}))skipTotals[k]=(skipTotals[k]||0)+(v||0)
        setSuggestions([...acc])
        setImportProg({chunk:(d.chunk||0)+1,total,found:acc.length,skipped:skipTotals})
        chunk=(d.next===0||d.next)?d.next:null
        guard++
      }
      setImportProg(p=>({...(p||{}),done:true}))
      setPhase(acc.length?'review':'done')
    }catch(e){console.warn('Import error:',e);setPhase(suggestions.length?'review':'done')}
    setLoading(false)
  }

  const confirm=async()=>{
    const approved=suggestions.filter((_,i)=>decisions[i]===true)
    if(approved.length){
      await ngFetch('ng-import-scaffolds',{approvedScaffolds:approved}).catch(()=>{})
    }
    setSubmitted(true)
    setPhase('done')
  }

  const allDecided=suggestions.length>0&&suggestions.every((_,i)=>decisions[i]!==undefined)

  if(phase==='input')return<div style={{padding:'20px 20px 100px',animation:'up 0.35s ease'}}>
    <div style={{marginBottom:20}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0,marginBottom:16}}>← Back</button>
      <div style={{fontSize:22,fontWeight:800,color:TX,marginBottom:4}}>Victor's Notes</div>
      <div style={{fontSize:13,color:MU,lineHeight:1.6}}>Paste your lesson notes. Claude will detect scaffold patterns and ask you to approve each one before adding to your bank.</div>
    </div>
    <textarea
      value={pasted}
      onChange={e=>setPasted(e.target.value)}
      placeholder={"Paste today's lesson notes here…\n\nBora — let's go\nTamo atrasado — we're late\n…"}
      style={{width:'100%',minHeight:200,background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px',color:TX,fontSize:14,outline:'none',resize:'none',fontFamily:FONT,lineHeight:1.7,marginBottom:12}}
    />
    <PBtn label={loading?'Analysing…':'Analyse notes →'} onClick={analyse} disabled={!pasted.trim()||loading||!isOnline}/>
    {loading&&<div style={{textAlign:'center',padding:'20px 0'}}><Spinner size={20}/><div style={{color:MU,fontSize:12,marginTop:8}}>{importProg?`Dia ${importProg.chunk}${importProg.total?'/'+importProg.total:''} · ${importProg.found} propostos…`:'Detecting patterns…'}</div></div>}
  </div>

  if(phase==='review')return<div style={{padding:'20px 20px 100px',animation:'up 0.35s ease'}}>
    <button onClick={()=>setPhase('input')} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0,marginBottom:16}}>← Back</button>
    <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:4,fontFamily:FONTD}}>{suggestions.length} padr{suggestions.length!==1?'ões':'ão'} proposto{suggestions.length!==1?'s':''}</div>
    <div style={{fontSize:12.5,color:MU,marginBottom:6}}>From Victor's notes — pattern ladders assembled; tables, phonetics and meta ignored. !?* marks treated as noise.</div>
    {importProg?.skipped&&<div style={{fontSize:10.5,color:MU,opacity:0.7,marginBottom:16}}>
      Ignorado: {importProg.skipped.tables||0} tabelas · {importProg.skipped.phonics||0} fonética · {importProg.skipped.meta||0} meta
    </div>}
    <div style={{display:'flex',gap:8,marginBottom:14}}>
      <button onClick={async()=>{
        SFX.tap()
        const ids=suggestions.map(s=>s.id)
        const r=await ngFetch('ng-suggest',{action:'resolve_bulk',ids,verdict:'approve'})
        if(r?.ok){SFX.complete();setSuggestions([]);setSubmitted(true);setPhase('done')}
      }} style={{flex:2,padding:'12px',background:`${GR}16`,border:`1px solid ${GR}55`,borderRadius:12,color:GR,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:FONT}}>✓ Aprovar todos ({suggestions.length})</button>
      <button onClick={async()=>{
        const ids=suggestions.map(s=>s.id)
        await ngFetch('ng-suggest',{action:'resolve_bulk',ids,verdict:'reject'})
        setSuggestions([]);setPhase('done')
      }} style={{flex:1,padding:'12px',background:'none',border:`1px solid ${BD}`,borderRadius:12,color:MU,fontSize:12.5,cursor:'pointer',fontFamily:FONT}}>✕ Recusar todos</button>
    </div>
    {suggestions.map(sg=><SuggestionCard key={sg.id} sug={sg} onDone={()=>setSuggestions(p=>p.filter(x=>x.id!==sg.id))}/>)}
    {suggestions.length===0&&<div style={{textAlign:'center',padding:'30px',color:MU,fontSize:13}}>Tudo decidido ✓</div>}
  </div>

  if(phase==='done')return<div style={{padding:'60px 24px',textAlign:'center',animation:'up 0.3s ease'}}>
    <div style={{fontSize:48,marginBottom:16}}>✓</div>
    <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:8}}>
      {submitted?`${suggestions.filter((_,i)=>decisions[i]===true).length} patterns added`:'No patterns detected'}
    </div>
    <div style={{fontSize:13,color:MU,marginBottom:24}}>
      {submitted?'They\'ve entered your scaffold bank and will appear in your frontier.':'Try pasting more detailed lesson notes with example phrases.'}
    </div>
    <PBtn label="Import more notes" onClick={()=>{setPasted('');setSuggestions([]);setDecisions({});setPhase('input')}}/>
  </div>

  return null
}



// ── Unlock Animation ──────────────────────────────────────────────────
// Full-screen cutscene when a scaffold is approved/unlocked
function ScaffoldUnlockAnimation({scaffold,onComplete}){
  useEffect(()=>{SFX.unlock()},[])
  const[phase,setPhase]=useState('fade-in') // fade-in|reveal|map|glow|fade-out
  useEffect(()=>{
    const t1=setTimeout(()=>setPhase('reveal'),400)
    const t2=setTimeout(()=>setPhase('map'),1000)
    const t3=setTimeout(()=>setPhase('glow'),1600)
    const t4=setTimeout(()=>setPhase('fade-out'),3200)
    const t5=setTimeout(()=>onComplete&&onComplete(),3700)
    return()=>[t1,t2,t3,t4,t5].forEach(clearTimeout)
  },[])

  const phaseColor={'survival':'#ffd52e','grammar_core':'#f0a92c','identity':'#3d7bff','social':'#2ee56f','social_foundation':'#ffd52e','dating_register':'#fb7185','personality_humour':'#2ee56f','deep_fluency':'#3d7bff'}
  const color=phaseColor[scaffold?.category]||AC

  return<div style={{
    position:'fixed',inset:0,zIndex:500,
    background:`rgba(7,7,10,${phase==='fade-out'?0:0.95})`,
    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    transition:'background 0.5s ease',
    fontFamily:FONT
  }}>
    {/* Unlock label */}
    <div style={{
      fontSize:11,color:color,fontWeight:700,letterSpacing:3,textTransform:'uppercase',
      marginBottom:16,opacity:phase==='fade-in'?0:1,transition:'opacity 0.5s ease 0.3s'
    }}>New pattern unlocked</div>

    {/* Scaffold text */}
    <div style={{
      fontSize:28,fontWeight:900,color:'#fff',textAlign:'center',padding:'0 32px',
      lineHeight:1.3,marginBottom:8,
      opacity:phase==='fade-in'?0:1,
      transform:phase==='fade-in'?'scale(0.8)':'scale(1)',
      transition:'all 0.5s ease 0.3s'
    }}>{scaffold?.base_portuguese}</div>
    <div style={{
      fontSize:14,color:MU,marginBottom:40,
      opacity:phase==='fade-in'?0:1,transition:'opacity 0.5s ease 0.5s'
    }}>{scaffold?.base_english}</div>

    {/* Map cell animation */}
    {(phase==='map'||phase==='glow'||phase==='fade-out')&&<div style={{
      position:'relative',width:80,height:80,
      opacity:phase==='fade-out'?0:1,transition:'opacity 0.5s ease'
    }}>
      {/* Particle sparks */}
      {[0,1,2,3,4,5,6,7].map(i=><div key={i} style={{
        position:'absolute',
        width:4,height:4,borderRadius:'50%',
        background:color,
        top:'50%',left:'50%',
        transform:`rotate(${i*45}deg) translateX(${phase==='glow'?30:0}px)`,
        opacity:phase==='glow'?0:1,
        transition:`all 0.6s ease ${i*0.05}s`
      }}/>)}
      {/* Cell */}
      <div style={{
        width:'100%',height:'100%',borderRadius:16,
        background:`${color}20`,border:`2px solid ${color}`,
        display:'flex',alignItems:'center',justifyContent:'center',
        transform:phase==='map'?'scale(0)':'scale(1)',
        boxShadow:phase==='glow'?`0 0 40px ${color}88,0 0 80px ${color}44`:'none',
        transition:'all 0.5s cubic-bezier(0.34,1.56,0.64,1)'
      }}>
        <div style={{fontSize:10,color,fontWeight:700,textAlign:'center',padding:4,lineHeight:1.3}}>
          {scaffold?.base_portuguese?.slice(0,12)}
        </div>
      </div>
    </div>}

    {/* Stage dots */}
    {phase!=='fade-in'&&<div style={{
      display:'flex',gap:6,marginTop:20,
      opacity:phase==='fade-out'?0:1,transition:'opacity 0.3s ease'
    }}>
      {[1,2,3,4].map(i=><div key={i} style={{
        width:8,height:8,borderRadius:'50%',
        background:i===1?color:BD,
        transform:i===1&&phase==='glow'?'scale(1.3)':'scale(1)',
        transition:'all 0.3s ease'
      }}/>)}
    </div>}

    {/* Tap to continue */}
    {phase==='glow'&&<div onClick={()=>onComplete&&onComplete()} style={{
      position:'absolute',bottom:60,fontSize:12,color:MU,opacity:0.6,cursor:'pointer'
    }}>tap to continue</div>}
  </div>
}

// ── Hybrid Notification Panel (inside NGScaffoldMap) ──────────────────
// Rendered as a modal panel within the map screen
const FONTD="'Sora',"+"system-ui,-apple-system,sans-serif"
const LU='#fb7185'      // Luna's coral — her accent everywhere
const RADIO_A='#fbbf24' // Radio amber — the station's accent

const SFX=(()=>{
  let ctx=null
  const on=()=>{try{return localStorage.getItem('sfx')!=='off'}catch(_){return true}}
  const tone=(f,d,type='sine',g=0.12,when=0)=>{
    try{
      ctx=ctx||new(window.AudioContext||window.webkitAudioContext)()
      if(ctx.state==='suspended')ctx.resume()
      const o=ctx.createOscillator(),v=ctx.createGain()
      o.type=type;o.frequency.value=f
      o.connect(v);v.connect(ctx.destination)
      const s=ctx.currentTime+when
      v.gain.setValueAtTime(g,s)
      v.gain.exponentialRampToValueAtTime(0.001,s+d)
      o.start(s);o.stop(s+d)
    }catch(_){}
  }
  // Percussion voices: filtered-noise hits, not oscillator chimes.
  const hit=(freq,dur,g=0.2,when=0,q=1.2)=>{
    try{
      ctx=ctx||new(window.AudioContext||window.webkitAudioContext)()
      if(ctx.state==='suspended')ctx.resume()
      const n=Math.max(1,Math.floor(ctx.sampleRate*dur))
      const b=ctx.createBuffer(1,n,ctx.sampleRate)
      const d=b.getChannelData(0)
      for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2)
      const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),v=ctx.createGain()
      f.type='bandpass';f.frequency.value=freq;f.Q.value=q
      s.buffer=b;s.connect(f);f.connect(v);v.connect(ctx.destination)
      v.gain.value=g
      s.start(ctx.currentTime+when)
    }catch(_){}
  }
  const surdo=(f0=150,f1=55,dur=0.28,g=0.3,when=0)=>{
    try{
      ctx=ctx||new(window.AudioContext||window.webkitAudioContext)()
      if(ctx.state==='suspended')ctx.resume()
      const o=ctx.createOscillator(),v=ctx.createGain()
      o.type='sine';o.connect(v);v.connect(ctx.destination)
      const s=ctx.currentTime+when
      o.frequency.setValueAtTime(f0,s)
      o.frequency.exponentialRampToValueAtTime(f1,s+dur*0.7)
      v.gain.setValueAtTime(g,s)
      v.gain.exponentialRampToValueAtTime(0.001,s+dur)
      o.start(s);o.stop(s+dur+0.02)
    }catch(_){}
  }
  return{
    tap:()=>{if(on())hit(4200,0.035,0.10)}, // light tick — touch answered
    flip:()=>{if(on())hit(1800,0.06,0.14,0,0.9)},
    good:()=>{if(!on())return; // puh-TING — light, bouncy, up
      hit(3000,0.03,0.08)
      tone(659,0.09,'triangle',0.10,0.015)
      tone(988,0.22,'triangle',0.12,0.09)
      tone(1976,0.18,'sine',0.035,0.10)},
    bad:()=>{if(on())surdo(150,62,0.18,0.18)}, // soft dry thud — never a buzzer,
    acende:()=>{if(!on())return;tone(440,0.26,'sine',0.12,0);tone(554.37,0.26,'sine',0.12,0.11);tone(659.25,0.3,'sine',0.12,0.22);tone(880,0.32,'triangle',0.05,0.24)},
    cuica:()=>{
      if(!on())return
      try{
        ctx=ctx||new(window.AudioContext||window.webkitAudioContext)()
        if(ctx.state==='suspended')ctx.resume()
        const o=ctx.createOscillator(),v=ctx.createGain()
        o.type='sawtooth';o.connect(v);v.connect(ctx.destination)
        const s=ctx.currentTime
        o.frequency.setValueAtTime(420,s)
        o.frequency.exponentialRampToValueAtTime(950,s+0.16)
        o.frequency.exponentialRampToValueAtTime(480,s+0.34)
        v.gain.setValueAtTime(0.07,s)
        v.gain.exponentialRampToValueAtTime(0.001,s+0.4)
        o.start(s);o.stop(s+0.42)
      }catch(_){}
    },
    complete:()=>{if(!on())return;
      // pandeiro roll into a surdo drop — the session lands, samba-school style
      [0,0.07,0.14,0.21,0.28].forEach((t,i)=>hit(2200+i*240,0.05,0.12,t))
      surdo(170,60,0.34,0.32,0.4)
      setTimeout(()=>{try{SFX.cuica()}catch(_){}},650)},
    unlock:()=>{if(!on())return;[784,988,1175,1568].forEach((f,i)=>tone(f,0.22,'sine',0.09,i*0.06))}
  }
})()

// Flow-first: the guided deck is fetched BEFORE it's wanted, so opening a
// session starts in motion instead of a spinner. 3-minute freshness window.
let GUIDED_PREFETCH=null
const prefetchGuided=()=>{
  ngFetch('ng-frontier',{deck:'guided'})
    .then(d=>{if(d&&Array.isArray(d.frontier))GUIDED_PREFETCH={data:d,ts:Date.now()}})
    .catch(()=>{})
}
const takeGuidedPrefetch=()=>{
  const p=GUIDED_PREFETCH
  GUIDED_PREFETCH=null
  return(p&&Date.now()-p.ts<180000)?p.data:null
}
const ngFetch=async(fn,body={})=>{
  const r=await fetch(`/.netlify/functions/${fn}`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  })
  return r.json()
}

// ── NGHome ────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════
// V2 COMPONENTS — Today, Radio, Placement, Constellation
// ═══════════════════════════════════════════════════════════════════


// ── NGBrain — tune into the always-on brain's thought stream ────────
function NGBrain({isOnline,onBack}){
  const[thoughts,setThoughts]=useState([])
  const[loading,setLoading]=useState(true)
  const pollRef=useRef(null)
  const PROC_META={
    heartbeat:{i:'♥',c:'#f97066',l:'Heartbeat'},
    nightly_brain:{i:'☾',c:'#2ee56f',l:'Nightly Brain'},
    coach:{i:'◉',c:'#34d399',l:'Live Coach'},
    radio:{i:'📻',c:'#fbbf24',l:'Radio'},
    memory:{i:'◌',c:'#60a5fa',l:'Memory'},
    graph:{i:'✦',c:'#c084fc',l:'Graph'},
    placement:{i:'⊕',c:'#3d7bff',l:'Placement'},
    field:{i:'🌴',c:'#4ade80',l:'Field'},
    session:{i:'▣',c:'#94a3b8',l:'Session'}
  }
  const load=async()=>{
    if(!isOnline||!sb)return
    try{
      const{data}=await sb.from('ng_brain_log').select('*')
        .eq('user_id','00000000-0000-0000-0000-000000000001')
        .order('created_at',{ascending:false}).limit(60)
      setThoughts(data||[])
    }catch{}
    setLoading(false)
  }
  useEffect(()=>{
    load()
    // Ping the heartbeat so the brain wakes when you tune in
    ngFetch('ng-heartbeat',{}).catch(()=>{})
    pollRef.current=setInterval(load,8000)
    return()=>clearInterval(pollRef.current)
  },[isOnline])

  const timeAgo=(ts)=>{
    const s=Math.floor((Date.now()-new Date(ts).getTime())/1000)
    if(s<60)return`${s}s`
    if(s<3600)return`${Math.floor(s/60)}m`
    if(s<86400)return`${Math.floor(s/3600)}h`
    return`${Math.floor(s/86400)}d`
  }

  return<div style={{padding:'52px 20px 100px',animation:'up 0.35s ease'}}>
    <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,marginBottom:16,padding:0}}>← Back</button>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
      <div style={{fontSize:24}}>🧠</div>
      <div style={{fontSize:22,fontWeight:900,color:TX,fontFamily:FONTD}}>The Brain</div>
      <div style={{width:7,height:7,background:GR,borderRadius:'50%',animation:'pulse 1.6s infinite',marginTop:2}}/>
    </div>
    <div style={{fontSize:12,color:MU,marginBottom:20}}>Live stream of everything the system is thinking and doing.</div>

    {loading&&<div style={{textAlign:'center',padding:'40px'}}><Spinner size={20}/></div>}
    {!loading&&!thoughts.length&&<div style={{textAlign:'center',padding:'50px 20px'}}>
      <div style={{fontSize:36,marginBottom:12,opacity:0.4}}>🧠</div>
      <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:6}}>Quiet in here — for now</div>
      <div style={{fontSize:12,color:MU,lineHeight:1.7}}>Thoughts appear as the brain works: nightly runs, live coaching, radio generation, memory sweeps. Do a session and come back.</div>
    </div>}

    {thoughts.map(t=>{
      const meta=PROC_META[t.process]||{i:'·',c:MU,l:t.process}
      const big=t.importance>=3
      return<div key={t.id} style={{
        background:big?`${meta.c}0d`:S,
        border:`1px solid ${big?meta.c+'44':BD}`,
        borderRadius:14,padding:'12px 14px',marginBottom:8,
        boxShadow:big?`0 0 16px ${meta.c}15`:'none'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
          <span style={{fontSize:13}}>{meta.i}</span>
          <span style={{fontSize:10,fontWeight:700,color:meta.c,letterSpacing:1,textTransform:'uppercase'}}>{meta.l}</span>
          {big&&<span style={{fontSize:9,color:meta.c,opacity:0.8}}>★ milestone</span>}
          <span style={{marginLeft:'auto',fontSize:10,color:MU,opacity:0.6}}>{timeAgo(t.created_at)}</span>
        </div>
        <div style={{fontSize:13,color:TX,lineHeight:1.6}}>{t.thought}</div>
      </div>
    })}
  </div>
}


// ── NGLearn — the Trilha. Duolingo-class path: winding nodes, progress
// rings, celebrations, sound. Defensive: every state renders something. ──
// O Poste — the brand mark: a memory, lit, above the city
// SuggestionCard — the single approval surface for the unified pipeline.
// Ouro = the verbatim tapped phrase (the law).
function SuggestionCard({sug,onDone}){
  const[busy,setBusy]=useState(false)
  const p=sug.payload||{}
  const isExt=p.decision==='extend_existing'
  const stages=p.scaffold?.stages||[]
  const resolve=async(verdict,make_base)=>{
    setBusy(true)
    try{
      const r=await ngFetch('ng-suggest',{action:'resolve',suggestion_id:sug.id,verdict,make_base})
      if(verdict==='approve'&&r?.ok)SFX.unlock()
      onDone&&onDone(verdict,r)
    }catch(_){onDone&&onDone('error')}
  }
  return<div style={{background:S,border:`1px solid ${GD}55`,borderRadius:16,padding:'14px 15px',marginBottom:10,animation:'up 0.3s ease'}}>
    <div style={{fontSize:9,color:GD,fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>
      ✦ Sugestão · {sug.source} · {isExt?'extends an existing pattern':`escada de ${stages.length}`}
    </div>
    {isExt?<div>
      <div style={{fontSize:12,color:MU,marginBottom:4}}>Novo degrau ({p.extension?.position==='below'?'abaixo':'acima'}) num padrão que você já tem:</div>
      <div style={{fontSize:14,fontWeight:700,color:AC,marginBottom:2}}>{p.extension?.new_stage?.pt}</div>
      <div style={{fontSize:11,color:MU}}>{p.extension?.new_stage?.en}</div>
    </div>
    :<div>
      {stages.map((s,i)=><div key={i} style={{display:'flex',gap:8,alignItems:'baseline',padding:'4px 0'}}>
        <span style={{fontSize:9,color:MU,width:14,flexShrink:0}}>{i+1}</span>
        <div style={{flex:1}}>
          <span style={{fontSize:13.5,fontWeight:i===p.tapped_stage?800:600,color:i===p.tapped_stage?AC:TX}}>
            {s.pt}{i===p.tapped_stage&&<span style={{fontSize:8,color:GD,marginLeft:6,letterSpacing:1}}>YOU SAID</span>}
          </span>
          <div style={{fontSize:10,color:MU}}>{s.en}</div>
        </div>
      </div>)}
    </div>}
    {p.note&&<div style={{fontSize:10.5,color:YE,marginTop:6,lineHeight:1.5}}>⚠ {p.note}</div>}
    <div style={{display:'flex',gap:8,marginTop:12}}>
      <button disabled={busy} onClick={()=>resolve('approve')} style={{flex:1,padding:'10px',background:`${GR}14`,border:`1px solid ${GR}55`,borderRadius:11,color:GR,fontWeight:700,fontSize:12.5,cursor:'pointer',fontFamily:FONT}}>{busy?'…':'✓ Aprovar'}</button>
      {!isExt&&typeof p.tapped_stage==='number'&&p.tapped_stage>0&&
        <button disabled={busy} onClick={()=>resolve('approve',true)} style={{flex:1,padding:'10px',background:S2,border:`1px solid ${BD}`,borderRadius:11,color:TX,fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:FONT}}>⤴ Como base</button>}
      <button disabled={busy} onClick={()=>resolve('reject')} style={{padding:'10px 14px',background:'none',border:`1px solid ${BD}`,borderRadius:11,color:MU,fontSize:12.5,cursor:'pointer',fontFamily:FONT}}>✕</button>
    </div>
  </div>
}

function Poste({size=28}){
  return<svg width={size} height={size*0.82} viewBox="0 0 40 33" style={{display:'block'}}>
    <circle cx="20" cy="8" r="6.5" fill="#f0b429" opacity="0.16"/>
    <circle cx="20" cy="8" r="3.1" fill="#f0b429"/>
    <path d="M2 25 Q8 18 14 25 T26 25 T38 25" fill="none" stroke="#e8e8f0" strokeWidth="2.6" strokeLinecap="round" opacity="0.92"/>
  </svg>
}

function Confetti(){
  const bits=Array.from({length:26},(_,i)=>i)
  const cols=['#009C3B','#ffd52e','#3d7bff','#2ee56f','#ffcf3f','#ffffff']
  return<div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:401,overflow:'hidden'}}>
    {bits.map(i=><span key={i} style={{
      position:'absolute',top:0,left:`${(i*37)%100}%`,
      width:8,height:i%2?8:14,borderRadius:i%2?'50%':2,
      background:cols[i%cols.length],
      animation:`confettiFall ${2+(i%5)*0.4}s ${(i%7)*0.15}s ease-in forwards`
    }}/>)}
  </div>
}

function NGLearn({isOnline,onBack,startUnit,startAula}){
  const[status,setStatus]=useState('loading') // loading|building|ready|empty|error
  const[units,setUnits]=useState([])
  const[sheet,setSheet]=useState(null) // expanded unit
  const[errMsg,setErrMsg]=useState('')
  const[celebrate,setCelebrate]=useState(null) // unit that just completed
  const pollRef=useRef(null)
  const lastCountRef=useRef(-1)
  const stableRef=useRef(0)
  const buildingRef=useRef(false)
  const[buildChunk,setBuildChunk]=useState(null) // {done,total}

  // The browser drives the build — sequential awaited calls, immune to
  // Lambda freeze. Each chunk is fast (Haiku, one category).
  const runBuildChain=async()=>{
    if(buildingRef.current)return
    buildingRef.current=true
    try{
      let chunk=0,guard=0
      while(chunk!==null&&guard<15){
        setBuildChunk({done:chunk,total:null})
        const g=await ngFetch('ng-path',{action:'generate',chunk})
        if(g?.error){setErrMsg('Build failed at chunk '+chunk+': '+g.error);setStatus('error');buildingRef.current=false;return}
        chunk=(g?.next===0||g?.next)?g.next:null
        if(g?.done)chunk=null
        guard++
      }
    }catch(e){
      setErrMsg('Build interrupted: '+(e?.message||'')+' — reopen Learn to resume; completed chunks are saved.')
      setStatus('error');buildingRef.current=false;return
    }
    buildingRef.current=false
    setBuildChunk(null)
    load()
  }

  const[evolving,setEvolving]=useState(null)
  const levelUp=async(u)=>{
    setSheet(null);setEvolving(u)
    try{
      const r=await ngFetch('ng-path',{action:'level_up',unit_id:u.unit_id})
      if(r?.error){setErrMsg(r.error);setStatus('error');setEvolving(null);return}
      SFX.unlock()
      setEvolving(null)
      setCelebrate({emoji:u.emoji,title:`${u.title} — Nível ${r.new_level}`,sub:'LEVEL UNLOCKED'})
      load()
    }catch(e){setEvolving(null);setErrMsg('Evolution failed: '+(e?.message||''));setStatus('error')}
  }
  const redoLevel=async(u)=>{
    setSheet(null)
    try{
      const r=await ngFetch('ng-path',{action:'redo_level',unit_id:u.unit_id})
      if(r?.error){setErrMsg(r.error);setStatus('error');return}
      SFX.tap();load()
    }catch(e){setErrMsg('Redo failed: '+(e?.message||''));setStatus('error')}
  }
  const stopPoll=()=>{if(pollRef.current){clearInterval(pollRef.current);pollRef.current=null}}
  const startPoll=()=>{if(!pollRef.current)pollRef.current=setInterval(load,8000)}

  const load=async()=>{
    if(!isOnline){setStatus('error');setErrMsg('Needs connection');return}
    try{
      const d=await ngFetch('ng-path',{action:'get'})
      if(d?.error){setStatus('error');setErrMsg(d.error);stopPoll();return}
      const us=Array.isArray(d?.units)?d.units:[]
      if(d?.bootstrapping||(!us.length&&d?.bootstrapping!==false)){
        setStatus(us.length?'ready':'building')
        if(d?.client_should_build&&!buildingRef.current)runBuildChain()
        else startPoll()
      }
      if(us.length){
        // Celebration check — did any unit cross 100% since last visit?
        try{
          const prev=JSON.parse(localStorage.getItem('trilha_pcts')||'{}')
          const justDone=us.find(u=>u.pct>=100&&prev[u.unit_id]!==undefined&&prev[u.unit_id]<100)
          if(justDone){setCelebrate(justDone);SFX.complete()}
          localStorage.setItem('trilha_pcts',JSON.stringify(Object.fromEntries(us.map(u=>[u.unit_id,u.pct]))))
        }catch(_){}
        setUnits(us)
        setStatus('ready')
        // Keep polling while the build is still landing chunks
        if(us.length!==lastCountRef.current){lastCountRef.current=us.length;stableRef.current=0;startPoll()}
        else{stableRef.current++;if(stableRef.current>=2)stopPoll()}
      }else if(d?.bootstrapping===false&&!us.length){
        setStatus('empty');stopPoll()
      }
    }catch(e){
      setStatus('error')
      setErrMsg((e?.message||'fetch failed')+(/pattern|JSON|token/i.test(e?.message||'')?' — the function likely returned an error page (check Netlify logs / that ng-path.js is deployed).':''))
      stopPoll()
    }
  }
  useEffect(()=>{load();return stopPoll},[isOnline])

  const S_NODE=76
  const nodeVisual=(u)=>{
    const ring=u.status==='complete'?GR:u.is_side_quest?YE:u.pct>0?AC:BD
    const deg=Math.round(u.pct*3.6)
    return{
      background:`conic-gradient(${ring} ${deg}deg, ${BD} ${deg}deg)`,
      opacity:1, // no locks: every world is open — distance is information, not permission
      animation:u.status==='current'?'float 2.6s ease-in-out infinite':'none',
      boxShadow:u.status==='current'?`0 0 22px ${AC}55`:u.status==='complete'?`0 0 14px ${GR}33`:u.status==='in_progress'?`0 0 12px ${AC}33`:'none'
    }
  }

  return<div style={{padding:'52px 0 110px',animation:'up 0.35s ease',minHeight:'70vh'}}>
    <div style={{padding:'0 20px'}}>
      <div style={{fontSize:24,fontWeight:900,color:TX,marginBottom:2,fontFamily:FONTD}}>Learn</div>
      <div style={{fontSize:12,color:MU,marginBottom:8}}>Every world is open. Progress is measured in what you can do — never in what you're allowed to touch.</div>
    </div>

    {status==='loading'&&<div style={{textAlign:'center',padding:'60px 20px'}}><Spinner size={22}/></div>}

    {status==='building'&&<div style={{textAlign:'center',padding:'40px 24px'}}>
      <div style={{fontSize:40,marginBottom:12,animation:'float 2s ease-in-out infinite'}}>🏗️</div>
      <div style={{fontSize:15,fontWeight:800,color:TX,marginBottom:6}}>Building your path…</div>
      <div style={{fontSize:12,color:MU,lineHeight:1.7}}>Clustering your patterns into Rio situations,{buildChunk?` chunk ${(buildChunk.done||0)+1} in progress`:''}<br/>Keep this screen open — about a minute total.</div>
      <div style={{marginTop:16}}><Spinner size={18}/></div>
    </div>}

    {status==='empty'&&<div style={{textAlign:'center',padding:'50px 24px'}}>
      <div style={{fontSize:40,marginBottom:12,opacity:0.5}}>⛰</div>
      <div style={{fontSize:15,fontWeight:800,color:TX,marginBottom:6}}>No patterns, no path yet. Fair enough.</div>
      <div style={{fontSize:12,color:MU,lineHeight:1.7}}>Your content bank is empty. Import a lesson or add patterns via Say It, then come back — the path builds itself.</div>
    </div>}

    {status==='error'&&<div style={{margin:'20px',background:`${RE}0d`,border:`1px solid ${RE}33`,borderRadius:14,padding:'14px 16px'}}>
      <div style={{fontSize:13,fontWeight:700,color:RE,marginBottom:4}}>The path hit a power cut</div>
      <div style={{fontSize:12,color:TX,lineHeight:1.6,marginBottom:10}}>{errMsg}</div>
      <PBtn label="Try again" onClick={()=>{setStatus('loading');load()}}/>
    </div>}

    {status==='ready'&&<div style={{position:'relative',marginTop:10,background:'linear-gradient(180deg,rgba(46,229,111,0.05),transparent 28%,transparent 72%,rgba(212,160,23,0.06))',borderRadius:24}}>
      {/* The spine — a gentle S winding through the city */}
      <svg style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M50 0 C 26 8, 26 14, 50 22 S 74 32, 50 42 S 26 52, 50 62 S 74 72, 50 82 S 26 92, 50 100"
          fill="none" stroke={BD} strokeWidth="0.7" strokeDasharray="2.4 2" vectorEffect="non-scaling-stroke" opacity="0.9"/>
      </svg>
      {units.map((u,i)=>{
        const left=i%2===0
        return<div key={u.unit_id} style={{position:'relative',display:'flex',justifyContent:left?'flex-start':'flex-end',padding:left?'0 0 26px 12%':'0 12% 26px 0'}}>
          {/* connector nub to spine */}
          <div style={{position:'absolute',top:S_NODE/2,[left?'left':'right']:'calc(12% + 76px)',width:`calc(38% - 76px)`,height:2,background:BD}}/>
          <div style={{textAlign:'center',width:110}}>
            <button onClick={()=>{SFX.tap();setSheet(u)}} style={{
              width:S_NODE,height:S_NODE,borderRadius:'50%',border:'none',cursor:'pointer',
              padding:4,...nodeVisual(u),position:'relative',margin:'0 auto',display:'block'
            }}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:S,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30}}>
                {u.status==='complete'?'✓':u.emoji}
              </div>
              {u.is_side_quest&&<div style={{position:'absolute',top:-6,right:-6,fontSize:14}}>📓</div>}
              {/* Level badge — the little bubble on the big bubble */}
              <div style={{position:'absolute',bottom:-3,right:-3,minWidth:20,height:20,borderRadius:10,
                background:u.level_ready?AC:S,border:`1.5px solid ${u.level_ready?AC:BD}`,
                color:u.level_ready?'#16240f':MU,fontSize:10,fontWeight:800,
                display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px',
                animation:u.level_ready?'pulse 1.5s infinite':'none'}}>
                {u.level_ready?'↑':(u.level||1)}
              </div>
            </button>
            <div style={{fontSize:11.5,fontWeight:700,color:TX,marginTop:7,lineHeight:1.3}}>{u.title}</div>
            <div style={{fontSize:9.5,color:u.status==='complete'?GR:u.pct>0?AC:MU,marginTop:1,fontWeight:600}}>
              {u.status==='complete'?'✓ yours':u.pct>0?u.pct+'%':u.status==='current'?'← start here':'fresh territory'}
            </div>
          </div>
        </div>
      })}
    </div>}

    {/* Unit detail — bottom sheet */}
    {sheet&&<div onClick={()=>setSheet(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:300,display:'flex',alignItems:'flex-end'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'78vh',overflowY:'auto',background:S,borderRadius:'22px 22px 0 0',padding:'22px 20px 30px',animation:'slideUp 0.28s ease'}}>
        <div style={{width:38,height:4,background:BD,borderRadius:4,margin:'0 auto 16px'}}/>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
          <div style={{fontSize:34}}>{sheet.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:900,color:TX}}>{sheet.title}</div>
            <div style={{fontSize:12,color:MU}}>{sheet.situation}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:17,fontWeight:800,color:sheet.status==='complete'?GR:AC}}>{sheet.status==='complete'?'✓':sheet.pct+'%'}</div>
            <div style={{fontSize:9.5,color:MU,fontWeight:700,letterSpacing:1}}>NÍVEL {sheet.level||1}</div>
          </div>
        </div>
        <div style={{height:5,background:BD,borderRadius:5,overflow:'hidden',margin:'10px 0 16px'}}>
          <div style={{height:'100%',width:`${sheet.pct}%`,borderRadius:5,transition:'width 0.8s ease',
            backgroundImage:`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='26' height='5'><path d='M0 2.5 Q6.5 0 13 2.5 T26 2.5' fill='none' stroke='white' stroke-opacity='0.4' stroke-width='1.4'/></svg>"),linear-gradient(to right,${sheet.status==='complete'?GR:AC},${sheet.status==='complete'?GR:GD})`,
            backgroundRepeat:'repeat-x,no-repeat',backgroundSize:'26px 5px,100% 100%'}}/>
        </div>
        {(sheet.patterns||[]).map(p=><div key={p.scaffold_id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderTop:`1px solid ${BD}`}}>
          <span style={{fontSize:13,flexShrink:0,color:p.solid?GR:MU,width:14}}>{p.solid?'✓':'·'}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:TX}}>{p.pt}</div>
            <div style={{fontSize:11,color:MU}}>{p.en}</div>
          </div>
          <div style={{width:56,height:4,background:BD,borderRadius:4,overflow:'hidden',flexShrink:0}}>
            <div style={{height:'100%',width:`${Math.round((p.progress||0)*100)}%`,background:p.solid?GR:GD,borderRadius:4,transition:'width 0.6s ease'}}/>
          </div>
        </div>)}
        <div style={{marginTop:16}}>
          <PBtn label={sheet.status==='complete'?'↻ Review this unit':'▶ Practice this unit'} onClick={()=>{SFX.tap();const u=sheet;setSheet(null);startUnit(u)}}/>
          <div style={{marginTop:8}}><GBtn label="🎓 Aula guiada — Escuta · Pratica · Cena" onClick={()=>{SFX.tap();const u=sheet;setSheet(null);startAula&&startAula(u)}}/></div>
          {sheet.level_ready&&<div style={{marginTop:10}}>
            <PBtn label={`⬆ Evoluir para nível ${(sheet.level||1)+1}`} color={GR} onClick={()=>levelUp(sheet)}/>
            <div style={{fontSize:10,color:MU,textAlign:'center',marginTop:6}}>Claude forges 4-5 harder patterns for this exact situation — built from your weak spots.</div>
          </div>}
          {!sheet.level_ready&&sheet.pct>=100&&sheet.level_wait_hours>0&&<div style={{marginTop:10,textAlign:'center',fontSize:11.5,color:GD,fontWeight:600}}>
            ⏳ Evolui em {Math.ceil(sheet.level_wait_hours/24)}d — deixa a memória assentar
          </div>}
          {(sheet.level||1)>1&&sheet.pct===0&&<div style={{marginTop:10}}>
            <GBtn label="↻ Redo this level (nothing practiced yet)" small onClick={()=>redoLevel(sheet)}/>
          </div>}
        </div>
        <div style={{fontSize:10,color:MU,opacity:0.65,textAlign:'center',marginTop:10}}>Progress = real memory strength. Fades if neglected — units can reopen.</div>
      </div>
    </div>}

    {/* Evolving — Claude forging the next level, live */}
    {evolving&&<div style={{position:'fixed',inset:0,background:'rgba(4,16,9,0.93)',zIndex:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:30}}>
      <div style={{animation:'float 2s ease-in-out infinite'}}><Poste size={48}/></div>
      <div style={{fontSize:16,fontWeight:800,color:TX,marginTop:18,fontFamily:FONTD}}>The path is evolving…</div>
      <div style={{fontSize:12,color:MU,marginTop:8,textAlign:'center',lineHeight:1.7}}>Claude is forging the next patterns for<br/>"{evolving.title}" — nível {(evolving.level||1)+1}. ~10 segundos.</div>
      <div style={{marginTop:18}}><Spinner size={20}/></div>
    </div>}

    {/* Unit complete — celebration */}
    {celebrate&&<div onClick={()=>setCelebrate(null)} style={{position:'fixed',inset:0,background:'rgba(4,16,9,0.9)',zIndex:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:30}}>
      <Confetti/>
      <div style={{fontSize:74,animation:'popIn 0.6s cubic-bezier(0.34,1.56,0.64,1)'}}>{celebrate.emoji}</div>
      <div style={{fontSize:13,color:GD,fontWeight:700,letterSpacing:3,textTransform:'uppercase',marginTop:18,animation:'up 0.5s ease 0.2s both'}}>{celebrate.sub||'Unidade completa · every pattern memory-verified'}</div>
      <div style={{fontSize:26,fontWeight:900,color:'#fff',marginTop:6,textAlign:'center',animation:'up 0.5s ease 0.3s both'}}>{celebrate.title}</div>
      <div style={{fontSize:13,color:'#aab',marginTop:8,textAlign:'center',animation:'up 0.5s ease 0.4s both'}}>THAT'S IT! Get it notarized! 🔥</div>
      <div style={{fontSize:11,color:'#778',marginTop:26,animation:'up 0.5s ease 0.6s both'}}>tap anywhere</div>
    </div>}
  </div>
}
function NGToday({isOnline,onBack,goTo}){
  const[data,setData]=useState(null)
  const[loading,setLoading]=useState(true)
  const[err,setErr]=useState(null)
  const[generating,setGenerating]=useState(false)

  const load=()=>{
    if(!isOnline){setLoading(false);return}
    setLoading(true);setErr(null)
    ngFetch('ng-today',{action:'get'})
      .then(d=>{
        if(d?.error)setErr('ng-today returned an error: '+d.error)
        setData(d);setLoading(false)
      })
      .catch(e=>{setErr('Could not reach ng-today — is ng-today.js uploaded to functions/? ('+(e?.message||'fetch failed')+')');setLoading(false)})
  }
  useEffect(load,[isOnline])

  const generateNow=async()=>{
    setGenerating(true)
    try{
      await ngFetch('ng-nightly-brain',{})
      setTimeout(()=>{setGenerating(false);load()},2500)
    }catch(e){setErr('Nightly brain failed: '+(e?.message||'unknown'));setGenerating(false)}
  }

  const dismissMission=async(id)=>{
    setData(p=>({...p,missions:(p.missions||[]).filter(m=>m.id!==id)}))
    ngFetch('ng-today',{action:'mission_dismiss',mission_id:id}).catch(()=>{})
  }
  const doneMission=async(id)=>{
    setData(p=>({...p,missions:(p.missions||[]).filter(m=>m.id!==id)}))
    ngFetch('ng-today',{action:'mission_done',mission_id:id}).catch(()=>{})
  }

  if(loading)return<div style={{padding:'80px 24px',textAlign:'center'}}><Spinner size={22}/></div>
  const d=data||{}
  const dials=d.fluency_dials
  const isEmpty=!d.coach_note&&!d.workout&&!dials&&!(d.missions?.length)

  return<div style={{padding:'52px 20px 100px',animation:'up 0.35s ease'}}>
    <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,marginBottom:16,padding:0}}>← Back</button>
    <div style={{fontSize:24,fontWeight:900,color:TX,marginBottom:2,fontFamily:FONTD}}>Today</div>
    <div style={{fontSize:12,color:MU,marginBottom:18}}>{d.is_today?'Assembled overnight by the brain':isEmpty?'':'Latest available plan'}</div>

    {err&&<div style={{background:`${RE}0d`,border:`1px solid ${RE}33`,borderRadius:14,padding:'13px 15px',marginBottom:14}}>
      <div style={{fontSize:12,color:RE,lineHeight:1.6}}>{err}</div>
    </div>}

    {isEmpty&&!err&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'22px',textAlign:'center',marginBottom:16}}>
      <div style={{fontSize:32,marginBottom:10,opacity:0.5}}>☾</div>
      <div style={{fontSize:15,fontWeight:700,color:TX,marginBottom:6}}>The brain hasn't assembled today yet</div>
      <div style={{fontSize:12,color:MU,lineHeight:1.7,marginBottom:16}}>It runs automatically after 4am Rio on your first app open. Or run it right now — takes about a minute.</div>
      <PBtn label={generating?'☾ Thinking…':'☾ Generate today now'} onClick={generateNow} disabled={generating||!isOnline}/>
    </div>}

    {/* Coach's note */}
    {d.coach_note&&<div style={{background:`${AC}0d`,border:`1px solid ${AC}33`,borderRadius:16,padding:'16px',marginBottom:16}}>
      <div style={{fontSize:10,color:AC,fontWeight:700,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Coach's note</div>
      <div style={{fontSize:14,color:TX,lineHeight:1.7}}>{d.coach_note}</div>
    </div>}

    {/* Fluency dials */}
    {dials&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:16}}>
      {[['Ouvir',dials.comprehension],['Falar',dials.production],['Ritmo',dials.speed],['Registro',dials.register]].map(([l,v])=>
        <div key={l} style={{background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'10px 6px',textAlign:'center'}}>
          <div style={{fontSize:18,fontWeight:800,color:v>=70?GR:v>=45?YE:MU}}>{v??'–'}</div>
          <div style={{fontSize:9,color:MU,marginTop:2}}>{l}</div>
        </div>)}
    </div>}
    {dials?.projection_weeks&&<div style={{fontSize:11,color:MU,textAlign:'center',marginBottom:16}}>
      Conversational threshold: ~{dials.projection_weeks} weeks at current pace
    </div>}

    {/* Week recap (Sundays) */}
    {d.week_recap?.headline&&<div style={{background:S,border:`1px solid ${YE}44`,borderRadius:16,padding:'16px',marginBottom:16}}>
      <div style={{fontSize:15,fontWeight:800,color:YE,marginBottom:6}}>{d.week_recap.headline}</div>
      <div style={{fontSize:12,color:MU,lineHeight:1.7}}>{d.week_recap.best_moment} {d.week_recap.number_that_moved}</div>
    </div>}

    {/* The Workout */}
    {d.workout&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'16px',marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:800,color:TX}}>The Workout</div>
        <div style={{fontSize:11,color:MU}}>~{Math.round(d.workout.estimated_mins||10)} min</div>
      </div>
      {(d.workout.reviews?.length>0)&&<div style={{fontSize:12,color:MU,marginBottom:6}}>◌ {d.workout.reviews.length} reviews at the forgetting edge</div>}
      {(d.workout.frontier?.length>0)&&<div style={{fontSize:12,color:MU,marginBottom:6}}>◈ {d.workout.frontier.length} frontier patterns</div>}
      {d.workout.listening&&<div style={{fontSize:12,color:MU,marginBottom:6}}>◉ 1 listening drill (Ouvido)</div>}
      {d.workout.composition&&<div style={{fontSize:12,color:MU,marginBottom:10}}>✍ 1 composition scenario</div>}
      <PBtn label="Start workout →" onClick={()=>goTo&&goTo('ng-study')}/>
      <div style={{fontSize:10,color:MU,opacity:0.6,marginTop:8,textAlign:'center'}}>Runs through Study — the engine already loaded today's items</div>
    </div>}

    {/* Mission shelf — opportunities, never obligations */}
    {(d.missions?.length>0)&&<div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>On the shelf — if it comes up</div>
      {d.missions.map(m=><div key={m.id} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 14px',marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:700,color:TX,marginBottom:2}}>{m.is_home_variant?'🏠 ':'🌴 '}{m.title}</div>
        {m.prompt_pt&&<div style={{fontSize:13,color:AC,fontWeight:600,marginBottom:2}}>{m.prompt_pt}</div>}
        {m.prompt_en&&<div style={{fontSize:11,color:MU,marginBottom:8}}>{m.prompt_en}</div>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>doneMission(m.id)} style={{flex:1,padding:'7px',background:`${GR}12`,border:`1px solid ${GR}33`,borderRadius:8,cursor:'pointer',fontFamily:FONT,fontSize:11,color:GR,fontWeight:600}}>Happened ✓</button>
          <button onClick={()=>dismissMission(m.id)} style={{flex:1,padding:'7px',background:S2,border:`1px solid ${BD}`,borderRadius:8,cursor:'pointer',fontFamily:FONT,fontSize:11,color:MU}}>Not for me</button>
        </div>
      </div>)}
    </div>}
  </div>
}

// ── NGRadio — Radio Carioca: tune in, infinite buffered show ────────
function NGRadio({isOnline,onBack}){
  const[radioSug,setRadioSug]=useState(null)
  const radioCreditRef=useRef(new Set())
  const proposeLine=async(l)=>{
    SFX.tap()
    setRadioSug({loading:true})
    try{
      const r=await ngFetch('ng-suggest',{action:'propose',phrase:l.pt||l.text||'',translation:l.en||'',context_sentence:'',source:'radio'})
      if(r?.duplicate)setRadioSug({duplicate:true,existing:r.existing})
      else if(r?.suggestion)setRadioSug({sug:r.suggestion})
      else setRadioSug({error:r?.error||'Analysis failed'})
    }catch(e){setRadioSug({error:e.message})}
  }
  const[phase,setPhase]=useState('off') // off|tuning|playing
  const[radioErr,setRadioErr]=useState('') // fail loudly: a tune that dies must say so, not just re-show the button
  const[paused,setPaused]=useState(false)
  const[speed,setSpeed]=useState(1)
  const[follow,setFollow]=useState(true)
  const[lines,setLines]=useState([]) // all lines across segments [{speaker,pt,en,lineIdx}]
  const[currentLine,setCurrentLine]=useState(-1)
  const[stationPrompt,setStationPrompt]=useState(()=>localStorage.getItem('radio_station')||'')
  const[showTl,setShowTl]=useState({})
  const[exportMsg,setExportMsg]=useState('')
  const[frontierPatterns,setFrontierPatterns]=useState([])
  const[patternPopup,setPatternPopup]=useState(null) // {f,loading,scaffold,mem}
  const wasAutoPausedRef=useRef(false)
  const sessionRef=useRef(null)
  const audioQueueRef=useRef([])
  const playingRef=useRef(false)
  const segIndexRef=useRef(0)
  const bufferingRef=useRef(false)
  const stopRef=useRef(false)
  const pausedRef=useRef(false)
  const epochRef=useRef(0) // show generation token — bumped on stop/tune so stale loops & in-flight fetches self-discard
  const audioDoneRef=useRef(null) // resolver for the line currently playing — lets stop() unstick playQueue mid-line
  const speedRef=useRef(1)
  const currentAudioRef=useRef(null)
  const followRef=useRef(true)
  const feedRef=useRef(null)
  const endRef=useRef(null)

  useEffect(()=>{followRef.current=follow},[follow])
  useEffect(()=>{if(follow)endRef.current?.scrollIntoView({behavior:'smooth'})},[currentLine,follow])
  useEffect(()=>()=>{stopRef.current=true;epochRef.current+=1;try{currentAudioRef.current?.pause()}catch{};audioDoneRef.current?.()},[])

  const setSpeedLive=v=>{
    speedRef.current=v;setSpeed(v)
    try{if(currentAudioRef.current)currentAudioRef.current.playbackRate=v}catch{}
  }
  const togglePause=()=>{
    if(pausedRef.current){
      pausedRef.current=false;setPaused(false)
      try{currentAudioRef.current?.play()}catch{}
    }else{
      pausedRef.current=true;setPaused(true)
      try{currentAudioRef.current?.pause()}catch{}
    }
  }

  // Consumption-driven buffering: whenever the queue runs low, generate more.
  const maybeBuffer=()=>{
    if(!stopRef.current&&!bufferingRef.current&&audioQueueRef.current.length<8)bufferNext()
  }

  const playQueue=async()=>{
    if(playingRef.current)return
    playingRef.current=true
    const epoch=epochRef.current
    const live=()=>!stopRef.current&&epoch===epochRef.current
    while(live()){
      // Hold here while paused between lines
      while(pausedRef.current&&live()){await new Promise(r=>setTimeout(r,200))}
      if(!live())break
      const next=audioQueueRef.current.shift()
      if(!next){
        playingRef.current=false
        maybeBuffer()
        if(live())setTimeout(()=>{if(audioQueueRef.current.length&&live())playQueue()},800)
        return
      }
      maybeBuffer() // stay ahead while consuming — this is what makes it infinite
      setCurrentLine(next.lineIdx)
      await new Promise(res=>{
        audioDoneRef.current=res // stop() calls this — pause() alone never fires onended, which froze this loop forever
        try{
          const a=new Audio('data:audio/mp3;base64,'+next.b64)
          a.playbackRate=speedRef.current
          currentAudioRef.current=a
          a.onended=res;a.onerror=res
          a.play().catch(res)
        }catch{res()}
      })
      audioDoneRef.current=null
      currentAudioRef.current=null
      await new Promise(r=>setTimeout(r,300))
    }
    // Only the loop that owns the current epoch may clear the flag —
    // a stale loop exiting must never clobber a newer show's playback.
    if(epoch===epochRef.current)playingRef.current=false
  }

  const ingestSegment=(data,baseLineIdx)=>{
    const segLines=(data.lines||[]).map((l,i)=>({...l,lineIdx:baseLineIdx+i}))
    setLines(prev=>[...prev,...segLines])
    ;(data.audio||[]).forEach(a=>{
      if(a.b64)audioQueueRef.current.push({lineIdx:baseLineIdx+a.line_index,b64:a.b64})
    })
    playQueue()
  }

  const bufferNext=async()=>{
    if(bufferingRef.current||stopRef.current)return
    bufferingRef.current=true
    const epoch=epochRef.current // a 'next' fetch takes seconds — if the show changed meanwhile, discard the result
    try{
      segIndexRef.current+=1
      const d=await ngFetch('ng-radio',{action:'next',session_key:sessionRef.current,segment_index:segIndexRef.current,station:stationPrompt})
      if(d.lines&&!stopRef.current&&epoch===epochRef.current){
        setLines(prev=>{
          const base=prev.length
          const segLines=d.lines.map((l,i)=>({...l,lineIdx:base+i}))
          ;(d.audio||[]).forEach(a=>{if(a.b64)audioQueueRef.current.push({lineIdx:base+a.line_index,b64:a.b64})})
          playQueue()
          return[...prev,...segLines]
        })
      }
    }catch{}
    bufferingRef.current=false
  }

  const tune=async()=>{
    if(!isOnline)return
    epochRef.current+=1 // new show — any stale loop or in-flight fetch from the last one is now void
    const epoch=epochRef.current
    playingRef.current=false // a stale loop can't clear this itself anymore (epoch guard), so release it here or the new show never starts
    bufferingRef.current=false
    radioCreditRef.current=new Set() // fresh show — recognition credits re-arm
    stopRef.current=false;pausedRef.current=false;setPaused(false)
    setPhase('tuning');setRadioErr('')
    setLines([]);setCurrentLine(-1);setFollow(true)
    audioQueueRef.current=[];segIndexRef.current=0
    localStorage.setItem('radio_station',stationPrompt)
    try{
      const d=await ngFetch('ng-radio',{action:'tune',station:stationPrompt})
      if(epoch!==epochRef.current)return // stopped (or re-tuned) while sintonizando — don't resurrect a dead show
      if(!Array.isArray(d.lines)||!d.lines.length)throw new Error(d.error||'empty show') // fail loudly, not into a silent dead deck
      sessionRef.current=d.session_key
      setFrontierPatterns(Array.isArray(d.frontier_ref)?d.frontier_ref:[])
      setPhase('playing')
      ingestSegment(d,0)
      setTimeout(()=>maybeBuffer(),600)
    }catch(e){if(epoch===epochRef.current){setPhase('off');setRadioErr(e?.message||'sem sinal')}}
  }

  const stop=()=>{
    stopRef.current=true
    epochRef.current+=1 // void the current show's loop + fetches
    try{currentAudioRef.current?.pause()}catch{}
    currentAudioRef.current=null
    audioDoneRef.current?.() // unstick playQueue if it's parked awaiting the line we just paused
    audioDoneRef.current=null
    audioQueueRef.current=[]
    pausedRef.current=false;setPaused(false)
    setPhase('off')
    setCurrentLine(-1)
  }

  // Free scroll: scrolling away from the bottom breaks follow mode
  const onFeedScroll=()=>{
    const el=feedRef.current;if(!el)return
    const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<90
    if(!nearBottom&&followRef.current)setFollow(false)
  }

  const openPattern=async(f)=>{
    // Auto-pause the show while the popup is open
    if(!pausedRef.current){
      wasAutoPausedRef.current=true
      pausedRef.current=true;setPaused(true)
      try{currentAudioRef.current?.pause()}catch{}
    }
    setPatternPopup({f,loading:true,scaffold:null,mem:[]})
    // Recognition credit: you HEARD it live and engaged — a small, honest rep.
    // Once per pattern per show (radioCreditRef guards).
    if(f?.scaffold_id&&!radioCreditRef.current.has(f.scaffold_id)){
      radioCreditRef.current.add(f.scaffold_id)
      ngFetch('ng-session-end',{mode:'radio',events:[{scaffold_id:f.scaffold_id,stage:f.stage||1,quality:4,mode:'flashcard'}],duration_seconds:10}).catch(()=>{})
    }
    try{
      const[{data:scf},{data:memRows}]=await Promise.all([
        sb.from('ng_scaffolds').select('*').eq('id',f.scaffold_id).single(),
        sb.from('ng_memory').select('stage,skill,stability')
          .eq('user_id','00000000-0000-0000-0000-000000000001').eq('scaffold_id',f.scaffold_id)
      ])
      setPatternPopup({f,loading:false,scaffold:scf,mem:memRows||[]})
    }catch{setPatternPopup(p=>p?{...p,loading:false}:null)}
  }
  const closePattern=()=>{
    setPatternPopup(null)
    // Resume only if WE paused it
    if(wasAutoPausedRef.current){
      wasAutoPausedRef.current=false
      pausedRef.current=false;setPaused(false)
      try{currentAudioRef.current?.play()}catch{}
    }
  }

  // Golden highlight: wrap frontier pattern matches inside a spoken line
  const highlightLine=(text)=>{
    if(!frontierPatterns.length||!text)return text
    const lower=text.toLowerCase()
    const matches=[]
    frontierPatterns.forEach(f=>{
      if(!f.pt)return
      const pat=f.pt.toLowerCase().replace(/[.!?…]+$/,'').trim()
      if(pat.length<3)return
      const idx=lower.indexOf(pat)
      if(idx>=0)matches.push({start:idx,end:idx+pat.length,f})
    })
    if(!matches.length)return text
    matches.sort((a,b)=>a.start-b.start)
    const parts=[];let pos=0
    matches.forEach(m=>{
      if(m.start<pos)return
      if(m.start>pos)parts.push(text.slice(pos,m.start))
      parts.push(<span key={m.start} onClick={e=>{e.stopPropagation();openPattern(m.f)}}
        style={{color:GD,fontWeight:700,textDecoration:'underline',textDecorationColor:`${GD}66`,textUnderlineOffset:3,cursor:'pointer'}}>
        {text.slice(m.start,m.end)}</span>)
      pos=m.end
    })
    if(pos<text.length)parts.push(text.slice(pos))
    return parts
  }

  const exportTranscript=async()=>{
    if(!sb||!isOnline){setExportMsg('Needs connection');return}
    setExportMsg('Building…')
    try{
      const{data:segs}=await sb.from('ng_radio_segments')
        .select('session_key,segment_index,lines,created_at')
        .eq('user_id','00000000-0000-0000-0000-000000000001')
        .order('created_at',{ascending:false}).limit(40)
      if(!segs?.length){setExportMsg('Nothing to export yet');return}
      const sessions={},order=[]
      segs.forEach(s=>{
        if(!sessions[s.session_key]){sessions[s.session_key]=[];order.push(s.session_key)}
        sessions[s.session_key].push(s)
      })
      let out='RÁDIO CARIOCA — transcript export\n'
      order.slice(0,3).forEach(key=>{
        const parts=sessions[key].sort((a,b)=>(a.segment_index||0)-(b.segment_index||0))
        out+=`\n═══ Session ${key} — ${(parts[0]?.created_at||'').slice(0,16).replace('T',' ')} ═══\n`
        parts.forEach(p=>{(p.lines||[]).forEach(l=>{
          out+=`\n${l.speaker==='echo'?'Chico':'Bia'}: ${l.pt}\n   (${l.en})\n`
        })})
      })
      if(navigator.share){
        try{await navigator.share({title:'Rádio Carioca transcript',text:out});setExportMsg('Shared ✓')}
        catch(e){if(e.name!=='AbortError'){await navigator.clipboard.writeText(out);setExportMsg('Copied ✓')}else setExportMsg('')}
      }else{
        await navigator.clipboard.writeText(out)
        setExportMsg('Copied to clipboard ✓')
      }
    }catch(e){setExportMsg('Export failed: '+e.message)}
    setTimeout(()=>setExportMsg(''),4000)
  }

  const SPEEDS=[0.7,0.85,1,1.15]

  return<div style={{height:'100dvh',display:'flex',flexDirection:'column',animation:'up 0.35s ease'}}>
    <div style={{padding:'52px 20px 12px',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
        <button onClick={()=>{stop();onBack()}} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0}}>← Back</button>
        <button onClick={exportTranscript} style={{marginLeft:'auto',background:S2,border:`1px solid ${BD}`,borderRadius:8,padding:'5px 10px',cursor:'pointer',fontFamily:FONT,fontSize:11,color:MU}}>↗ Export</button>
      </div>
      {exportMsg&&<div style={{fontSize:11,color:RADIO_A,marginBottom:8}}>{exportMsg}</div>}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{fontSize:24}}>📻</div>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:TX,fontFamily:FONTD}}>Rádio Carioca</div>
          <div style={{fontSize:11,color:MU}}>{phase==='playing'?(paused?'⏸ Paused':'● LIVE — Chico & Bia'):phase==='tuning'?'Tuning in…':'Tap in'}</div>
        </div>
        {phase==='playing'&&<div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          {!paused&&<div style={{display:'flex',gap:2.5,alignItems:'flex-end',height:16}}>
            {[0,1,2,3,4].map(i=><div key={i} style={{width:3,height:16,background:'#fbbf24',borderRadius:2,transformOrigin:'bottom',animation:`eq ${0.55+i*0.13}s ease-in-out ${i*0.09}s infinite`}}/>)}
          </div>}
          <div style={{background:'#3a2a10',border:'1px solid #fbbf2466',borderRadius:6,padding:'3px 9px',fontSize:9,fontWeight:800,letterSpacing:1.5,color:'#fbbf24'}}>{paused?'PAUSED':'ON AIR'}</div>
        </div>}
      </div>
    </div>

    {/* Transcript feed — lines reveal only as spoken */}
    <div ref={feedRef} onScroll={onFeedScroll} style={{flex:1,overflowY:'auto',padding:'8px 20px',position:'relative'}}>
      {phase==='off'&&<div style={{textAlign:'center',padding:'60px 20px'}}>
        <div style={{fontSize:44,marginBottom:14,opacity:0.5}}>📻</div>
        <div style={{display:'flex',justifyContent:'center',marginBottom:10}}><Poste size={34}/></div>
        <div style={{fontSize:15,fontWeight:700,color:TX,marginBottom:6}}>Two Cariocas. Infinite conversation.</div>
        <div style={{fontSize:12,color:MU,lineHeight:1.7}}>Tune in whenever. It's always mid-show.<br/>Tap any bubble for the translation.</div>
      </div>}
      {lines.slice(0,currentLine+1).map((l,i)=>{
        const isChico=l.speaker==='echo'
        const active=i===currentLine
        return<div key={i} style={{display:'flex',flexDirection:'column',alignItems:isChico?'flex-start':'flex-end',marginBottom:6,animation:'up 0.25s ease'}}>
          <div style={{fontSize:9,color:MU,marginBottom:2,padding:'0 6px'}}>{isChico?'Chico':'Bia'}</div>
          <div onClick={()=>setShowTl(p=>({...p,[i]:!p[i]}))} style={{
            maxWidth:'82%',padding:'10px 14px',
            borderRadius:isChico?'16px 16px 16px 4px':'16px 16px 4px 16px',
            background:isChico?S:'#2a4a3a',
            border:active?`1.5px solid ${isChico?RADIO_A:GR}`:`1px solid ${BD}`,
            fontSize:14,lineHeight:1.6,color:TX,cursor:'pointer',
            boxShadow:active?`0 0 12px ${isChico?RADIO_A:GR}22`:'none'
          }}>{highlightLine(l.pt)}</div>
          {showTl[i]&&<div style={{maxWidth:'82%',marginTop:3,padding:'6px 10px',background:S2,border:`1px solid ${BD}`,borderRadius:8,fontSize:12,color:MU,display:'flex',alignItems:'center',gap:8}}>
            <span style={{flex:1}}>{l.en}</span>
            <button onClick={e=>{e.stopPropagation();proposeLine(l)}} style={{background:`${RADIO_A}14`,border:`1px solid ${RADIO_A}44`,borderRadius:8,padding:'3px 9px',fontSize:10.5,fontWeight:700,color:RADIO_A,cursor:'pointer',fontFamily:FONT,flexShrink:0}}>✦ padrão</button>
          </div>}
        </div>
      })}
      <div ref={endRef}/>
    </div>

    {radioSug&&<div style={{position:'fixed',left:12,right:12,bottom:110,zIndex:60,maxWidth:456,margin:'0 auto'}}>
      {radioSug.loading&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,display:'flex',gap:10,alignItems:'center'}}><Spinner size={14}/>Finding where this fits…</div>}
      {radioSug.duplicate&&<div onClick={()=>setRadioSug(null)} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,cursor:'pointer'}}>You already have this one: <span style={{color:RADIO_A,fontWeight:700}}>{radioSug.existing?.base}</span> · tap to close</div>}
      {radioSug.error&&<div onClick={()=>setRadioSug(null)} style={{background:`${RE}10`,border:`1px solid ${RE}44`,borderRadius:14,padding:'12px 15px',fontSize:12,color:RE,cursor:'pointer'}}>{radioSug.error} · tap to close</div>}
      {radioSug.sug&&<SuggestionCard sug={radioSug.sug} onDone={()=>setRadioSug(null)}/>}
    </div>}

    {/* Back-to-live chip when free scrolling */}
    {phase==='playing'&&!follow&&<div style={{position:'absolute',bottom:118,left:'50%',transform:'translateX(-50%)',zIndex:50}}>
      <button onClick={()=>{setFollow(true);endRef.current?.scrollIntoView({behavior:'smooth'})}}
        style={{background:`${RE}dd`,border:'none',borderRadius:20,padding:'8px 16px',cursor:'pointer',fontFamily:FONT,fontSize:12,fontWeight:700,color:'#fff',boxShadow:'0 4px 14px rgba(0,0,0,0.4)'}}>
        ▼ AO VIVO
      </button>
    </div>}

    {/* Frontier pattern popup — same style as the scaffold map card */}
    {patternPopup&&<div onClick={closePattern} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:S,border:`1px solid ${BD}`,borderRadius:20,padding:'20px',width:'100%',maxWidth:420,maxHeight:'70vh',overflowY:'auto',animation:'up 0.2s ease'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:`${GD}15`,border:`1px solid ${GD}44`,borderRadius:8,padding:'4px 10px',marginBottom:12}}>
          <span style={{fontSize:11,color:GD,fontWeight:700}}>◈ Frontier — you're learning this</span>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:2}}>{patternPopup.f.pt}</div>
        <div style={{fontSize:13,color:MU,marginBottom:16}}>{patternPopup.f.en}</div>
        {patternPopup.loading&&<div style={{textAlign:'center',padding:'20px'}}><Spinner size={18}/></div>}
        {!patternPopup.loading&&patternPopup.scaffold?.stages&&<div>
          <div style={{fontSize:10,color:MU,fontWeight:700,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>Stage progress</div>
          {patternPopup.scaffold.stages.map(st=>{
            const prodMem=(patternPopup.mem||[]).find(m=>m.stage===st.stage&&m.skill==='production')
            const strength=prodMem?Math.min(1,prodMem.stability/21):0
            const controlled=strength>=1
            const isCurrent=st.stage===patternPopup.f.stage
            return<div key={st.stage} style={{marginBottom:10,padding:'10px 12px',background:isCurrent?`${GD}0a`:S2,border:`1px solid ${controlled?GR+'44':isCurrent?GD+'44':BD}`,borderRadius:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{fontSize:10,fontWeight:700,color:controlled?GR:isCurrent?GD:MU}}>
                  {controlled?'✓':isCurrent?'◈':'·'} Stage {st.stage}{isCurrent&&!controlled?' — current':''}
                </span>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:TX,marginBottom:2}}>{st.pt}</div>
              <div style={{fontSize:11,color:MU,marginBottom:6}}>{st.en}</div>
              <div style={{height:3,background:BD,borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.round(strength*100)}%`,background:controlled?GR:GD,borderRadius:3,transition:'width 0.6s ease'}}/>
              </div>
            </div>
          })}
        </div>}
        {!patternPopup.loading&&!patternPopup.scaffold&&<div style={{fontSize:12,color:MU,textAlign:'center',padding:'12px'}}>Couldn't load details</div>}
        <button onClick={closePattern} style={{width:'100%',marginTop:6,padding:'12px',background:`${RADIO_A}15`,border:`1px solid ${RADIO_A}44`,borderRadius:12,cursor:'pointer',fontFamily:FONT,fontSize:13,fontWeight:700,color:RADIO_A}}>
          ▶ Back to the show
        </button>
      </div>
    </div>}

    {/* Controls — padded past the nav bar + home indicator (iPhone fold fix) */}
    <div style={{padding:'10px 20px calc(env(safe-area-inset-bottom, 0px) + 96px)',flexShrink:0,borderTop:`1px solid ${BD}`}}>
      {phase==='off'&&<>
        <input value={stationPrompt} onChange={e=>setStationPrompt(e.target.value)}
          placeholder="Station vibe (optional): trading, Ipanema nightlife…"
          style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'11px 14px',color:TX,fontSize:13,outline:'none',fontFamily:FONT,marginBottom:10}}/>
        <PBtn label={isOnline?'📻 Tune in':'Needs connection'} onClick={tune} disabled={!isOnline}/>
        {radioErr&&<div style={{marginTop:8,padding:'9px 12px',background:`${RE}10`,border:`1px solid ${RE}33`,borderRadius:10,fontSize:11.5,color:RE,textAlign:'center'}}>📡 No signal ({radioErr}) — try again.</div>}
      </>}
      {phase==='tuning'&&<PBtn label="Tuning in…" disabled/>}
      {phase==='playing'&&<>
        <div style={{display:'flex',gap:6,marginBottom:10,alignItems:'center'}}>
          <span style={{fontSize:10,color:MU,flexShrink:0}}>Speed</span>
          {SPEEDS.map(v=><button key={v} onClick={()=>setSpeedLive(v)}
            style={{flex:1,padding:'7px 0',background:speed===v?`${RADIO_A}20`:S2,border:`1px solid ${speed===v?RADIO_A+'55':BD}`,borderRadius:9,cursor:'pointer',fontFamily:FONT,fontSize:11,fontWeight:speed===v?700:400,color:speed===v?RADIO_A:MU}}>
            {v===1?'1×':v+'×'}
          </button>)}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={togglePause}
            style={{flex:2,padding:'13px',background:paused?`${GR}18`:S2,border:`1px solid ${paused?GR+'55':BD}`,borderRadius:14,cursor:'pointer',fontFamily:FONT,fontSize:14,fontWeight:700,color:paused?GR:TX}}>
            {paused?'▶ Resume':'⏸ Pause'}
          </button>
          <button onClick={stop}
            style={{flex:1,padding:'13px',background:`${RE}12`,border:`1px solid ${RE}33`,borderRadius:14,cursor:'pointer',fontFamily:FONT,fontSize:14,fontWeight:700,color:RE}}>
            ◼
          </button>
        </div>
      </>}
    </div>
  </div>
}
function ConstellationView({scaffolds,memState,edges}){
  // Radial layout by category; node brightness = live retrievability
  const cats=[...new Set((scaffolds||[]).map(s=>s.category))]
  const W=340,H=420,cx=W/2,cy=H/2
  const nodePos={}
  ;(scaffolds||[]).forEach((s,i)=>{
    const catIdx=cats.indexOf(s.category)
    const catAngle=(catIdx/Math.max(1,cats.length))*Math.PI*2-Math.PI/2
    const inCat=(scaffolds||[]).filter(x=>x.category===s.category)
    const j=inCat.findIndex(x=>x.id===s.id)
    const ring=60+(j%5)*32
    const jitter=(j/inCat.length)*1.1-0.55
    nodePos[s.id]={
      x:cx+Math.cos(catAngle+jitter)*ring,
      y:cy+Math.sin(catAngle+jitter)*ring
    }
  })
  const memBySc={}
  ;(memState||[]).forEach(m=>{
    if(m.skill!=='production')return
    if(!memBySc[m.scaffold_id]||m.live_r>memBySc[m.scaffold_id])memBySc[m.scaffold_id]=m.live_r
  })
  const catColor={survival:'#ffd52e',grammar_core:'#f0a92c',identity:'#3d7bff',social:'#2ee56f',social_foundation:'#ffd52e',dating_register:'#fb7185',personality_humour:'#2ee56f',deep_fluency:'#3d7bff'}

  return<svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',display:'block'}}>
    {/* Edges — faint threads between related nodes */}
    {(edges||[]).slice(0,300).map((e,i)=>{
      const a=nodePos[e.from_scaffold],b=nodePos[e.to_scaffold]
      if(!a||!b)return null
      return<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke="#ffffff" strokeOpacity={0.04+e.strength*0.06} strokeWidth={0.6}/>
    })}
    {/* Nodes — glow by retrievability */}
    {(scaffolds||[]).map(s=>{
      const p=nodePos[s.id];if(!p)return null
      const r=memBySc[s.id]??null
      const color=catColor[s.category]||'#8888aa'
      const lit=r!==null
      const glow=lit?Math.max(0.15,r):0.08
      return<g key={s.id}>
        {lit&&r>0.5&&<circle cx={p.x} cy={p.y} r={7+r*5} fill={color} opacity={r*0.14}/>}
        <circle cx={p.x} cy={p.y} r={lit?3.5:2}
          fill={color} opacity={glow}
          stroke={lit&&r>0.85?color:'none'} strokeWidth={0.8} strokeOpacity={0.5}/>
      </g>
    })}
    {/* Category labels */}
    {cats.map((c,i)=>{
      const a=(i/Math.max(1,cats.length))*Math.PI*2-Math.PI/2
      return<text key={c} x={cx+Math.cos(a)*185} y={cy+Math.sin(a)*195}
        fill={catColor[c]||'#888'} fontSize={8} textAnchor="middle" opacity={0.7}
        fontFamily="system-ui">{c.replace('_',' ')}</text>
    })}
  </svg>
}



// ═══ Signature-atom helpers (Linha do Tempo classification + corruption) ═══
const TL_POINTS=['fazia','fiz','tava fazendo','ia fazer','faço','tô fazendo','vou fazer']
function tlClassify(pt){
  const t=' '+(pt||'').toLowerCase()+' '
  if(/\s(tava|estava)\s+\w+ndo/.test(t))return'tava fazendo'
  if(/\s(tô|to|tá|ta|tão|tao|tamo)\s+\w+ndo/.test(t))return'tô fazendo'
  if(/\s(ia|iam)\s+\w+r\b/.test(t))return'ia fazer'
  if(/\s(vou|vai|vão|vao)\s+\w+r\b/.test(t))return'vou fazer'
  if(/\s(fui|foi|foram|fiz|fez|fizemos|falei|falou|vi|viu|comi|comeu|peguei|pegou|tive|teve|conheci|passei)\s/.test(t))return'fiz'
  if(/\s(fazia|tinha|era|queria|via|jogava|morava|tava|estava)\s/.test(t))return'fazia'
  return null // present/habitual or unclassifiable — skip the atom
}
const DECOY_EN=['let\'s go tomorrow','I already ate','where is the bathroom?','she works downtown','it was really expensive','call me later','I don\'t drink coffee','we missed the bus','that place is closed','he plays on Sundays']
const DECOY_PT=['bora amanhã cedo','já comi, valeu','onde fica o banheiro?','ela trabalha no centro','foi caro demais','me liga mais tarde','não bebo café','nós perdeu o ônibus','esse lugar tá fechado','ele joga domingo']
function padOptions(correct,cands,lang){
  const pool=[...new Set(cands.filter(x=>x&&x!==correct))]
  const dec=(lang==='pt'?DECOY_PT:DECOY_EN).filter(d=>d!==correct&&!pool.includes(d))
  while(pool.length<2&&dec.length)pool.push(dec.splice(Math.floor(Math.random()*dec.length),1)[0])
  return[correct,...pool.slice(0,2)].sort(()=>Math.random()-0.5)
}
const COR_SPEED='#fb7185'
function SpeedTimer({deadline,onExpire}){
  const[pct,setPct]=useState(100)
  useEffect(()=>{
    const iv=setInterval(()=>{
      const r=Math.max(0,(deadline-Date.now())/6000*100)
      setPct(r)
      if(r<=0){clearInterval(iv);onExpire&&onExpire()}
    },100)
    return()=>clearInterval(iv)
  },[deadline])
  return<div style={{height:5,background:'#1a3324',borderRadius:3,overflow:'hidden'}}>
    <div style={{height:'100%',width:pct+'%',background:pct>40?'#2ee56f':pct>18?'#f0a92c':'#ff6b5e',transition:'width 0.1s linear'}}/>
  </div>
}
function personClassify(pt){
  const t=' '+(pt||'').toLowerCase()+' '
  if(/\snós\s|\snos\s|\s(estamos|vamos|fomos|estávamos|estavamos|fizemos|temos|queremos|precisamos)\s/.test(t))return'nós'
  if(/\s(eu)\s/.test(t))return'eu'
  if(/\s(eles|elas|vocês|voces|tão|tao|foram|vão|vao|fizeram|estão|estao|estavam)\s/.test(t))return'eles'
  if(/\s(a gente|você|voce|cê|ce|ele|ela)\s/.test(t))return'você·ele·ela'
  if(/^\s*(tô|to|fui|fiz|quero|queria|vou|preciso|tenho|tava|falei|vi)\s/.test(t))return'eu'
  return null
}
const CONF_PAIRS=[['tô','tava'],['tava','tô'],['tá','é'],['é','tá'],['fui','ia'],['ia','fui'],['foi','ia'],['vou','fui'],['tenho','tinha'],['tem','tinha'],['tamo','tava'],['fiz','fazia'],['fazia','fiz']]
function corruptPT(pt){
  const words=(pt||'').split(' ')
  for(let i=0;i<words.length;i++){
    const bare=words[i].toLowerCase().replace(/[.,!?]/g,'')
    const hit=CONF_PAIRS.find(([a])=>a===bare)
    if(hit){
      const bad=[...words];bad[i]=hit[1]
      return{bad:bad.join(' '),wrongIdx:i,wrongWord:hit[1],rightWord:words[i],decoys:CONF_PAIRS.filter(([a])=>a!==bare&&a!==hit[1]).slice(0,4).map(x=>x[0])}
    }
  }
  return null
}

// ═══ NGTreino — THE DAILY LEARNING MODE ═══════════════════════════════
// "How many minutes have you got?" -> countdown -> atoms from EVERYTHING
// (reviews first, grammar guaranteed, constructor as an atom) -> every rep
// graded into the one engine. Congruency is everything.


// ═══ NGOficina — the standalone CONSTRUCTOR mode ══════════════════════
// 8 sentences, difficulty ramping, the delayed "tem certeza?" nudge,
// full rubric-v2 grading, retry law. The highest-value rep, given a home.
function NGOficina({isOnline,onBack}){
  const[st,setSt]=useState('load')
  const[items,setItems]=useState([])
  const[i,setI]=useState(0)
  const[ans,setAns]=useState('')
  const[evald,setEvald]=useState(null)
  const[busy,setBusy]=useState(false)
  const[retried,setRetried]=useState(false)
  const firstQRef=useRef(null)
  const[nudge,setNudge]=useState(false)
  const nudgeShownRef=useRef(false)
  const nudgeTimerRef=useRef(null)
  const[scores,setScores]=useState([])
  const startRef=useRef(Date.now())

  useEffect(()=>{
    (async()=>{
      try{
        const[due,def]=await Promise.all([
          ngFetch('ng-frontier',{deck:'due'}).catch(()=>({})),
          ngFetch('ng-frontier').catch(()=>({}))
        ])
        const pool=[...(due?.frontier||[]),...(def?.frontier||[])]
          .filter(x=>x.pt&&x.en&&(x.pt.split(' ').length>=3))
        const seen=new Set();const uniq=[]
        for(const p of pool){const k=p.scaffold_id+'|'+p.stage;if(!seen.has(k)){seen.add(k);uniq.push(p)}}
        uniq.sort((a,b)=>(a.phase||1)-(b.phase||1)) // difficulty ramp
        if(!uniq.length){setSt('empty');return}
        setItems(uniq.slice(0,8));setSt('run');startRef.current=Date.now()
      }catch(_){setSt('empty')}
    })()
    return()=>{if(nudgeTimerRef.current)clearTimeout(nudgeTimerRef.current)}
  },[])

  const it=items[i]
  const onType=(v)=>{
    setAns(v);setNudge(false)
    if(nudgeTimerRef.current)clearTimeout(nudgeTimerRef.current)
    // THE DELAYED NUDGE: pause ~4s on a submittable draft -> one soft check-in.
    if(!evald&&!nudgeShownRef.current&&v.trim().split(' ').length>=2){
      nudgeTimerRef.current=setTimeout(()=>{nudgeShownRef.current=true;setNudge(true)},4000)
    }
  }
  const submit=async()=>{
    if(busy||!ans.trim()||!it)return
    if(nudgeTimerRef.current)clearTimeout(nudgeTimerRef.current)
    setNudge(false);setBusy(true)
    const r=await ngFetch('ng-write-eval',{target_pt:it.pt,user_answer:ans,en_prompt:it.en,scaffold_id:it.scaffold_id,stage:it.stage}).catch(()=>({quality:2,feedback:'—'}))
    if(retried&&firstQRef.current!=null){
      r.quality=Math.max(firstQRef.current,Math.max(1,Math.round((r.quality||2)-0.5)))
      r._retried=true
    }
    setEvald(r);setBusy(false)
  }
  const commit=async()=>{
    const q=evald?.quality||2
    setScores(s=>[...s,q])
    if(isOnline&&it)
      ngFetch('ng-session-end',{mode:'daily',events:[{scaffold_id:it.scaffold_id,stage:it.stage,quality:q,mode:'write'}],duration_seconds:Math.max(5,Math.round((Date.now()-startRef.current)/1000/Math.max(1,scores.length+1)))}).catch(()=>{})
    if(q>=4)SFX.tap()
    if(i>=items.length-1){SFX.complete();setSt('done');return}
    setI(x=>x+1);setAns('');setEvald(null);setRetried(false)
    firstQRef.current=null;nudgeShownRef.current=false
  }

  if(st==='load')return<div style={{padding:'130px 20px',textAlign:'center'}}><Spinner size={20}/></div>
  if(st==='empty')return<div style={{padding:'100px 20px',textAlign:'center'}}>
    <div style={{fontSize:13,color:MU,marginBottom:16}}>Nada pra construir agora — pratica primeiro, volta depois.</div>
    <GBtn label="← Voltar" onClick={onBack}/></div>
  if(st==='done'){
    const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10:0
    return<div style={{padding:'90px 20px',textAlign:'center',animation:'up 0.4s ease'}}>
      <div style={{fontSize:44}}>🛠</div>
      <div style={{fontSize:22,fontWeight:800,color:TX,fontFamily:FONTD,margin:'10px 0 4px'}}>Oficina fechada</div>
      <div style={{fontSize:12.5,color:MU,marginBottom:22}}>{scores.length} frases construídas · qualidade média {avg}<br/>Significado primeiro, sempre. Tudo no motor.</div>
      <PBtn label="Voltar" onClick={onBack}/>
    </div>
  }
  return<div style={{padding:'24px 20px 100px',animation:'up 0.3s ease'}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0}}>← sair</button>
      <div style={{fontSize:11,color:MU}}>{i+1}/{items.length}</div>
    </div>
    <div style={{fontSize:9,color:GD,fontWeight:800,letterSpacing:2,marginBottom:6}}>🛠 OFICINA DE FRASES · fase {it?.phase||1}</div>
    <div style={{fontSize:12,color:MU,marginBottom:8}}>Build it in Portuguese:</div>
    <div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'15px 16px',fontSize:15.5,fontWeight:700,color:TX,marginBottom:12}}>{it?.en}</div>
    <textarea value={ans} onChange={e=>onType(e.target.value)} disabled={!!evald&&(retried||evald.quality>=4)}
      placeholder="do teu jeito — significado primeiro…" style={{width:'100%',minHeight:80,background:S2,border:`1.5px solid ${evald?(evald.quality>=4?GR:GD):nudge?GD:BD}`,borderRadius:14,padding:'12px 14px',fontSize:15.5,color:TX,fontFamily:FONT,resize:'none',boxSizing:'border-box'}}/>
    {nudge&&!evald&&<div style={{marginTop:8,fontSize:11.5,color:GD,animation:'up 0.3s ease'}}>🤔 Tem certeza? Dá uma olhada no tempo verbal antes de mandar — ou manda mesmo, errar aqui é barato.</div>}
    {evald&&<div style={{marginTop:10,background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 14px'}}>
      <div style={{display:'flex',gap:10,marginBottom:6,fontSize:10,fontWeight:800}}>
        <span style={{color:evald.meaning_ok?GR:RE}}>MEANING {evald.meaning_ok?'✓':'✗'}</span>
        <span style={{color:evald.grammar_ok?GR:GD}}>GRAMMAR {evald.grammar_ok?'✓':'~'}</span>
        <span style={{color:evald.form_ok?GR:MU}}>ACCENTS {evald.form_ok?'✓':'·'}</span>
        <span style={{marginLeft:'auto',color:AC}}>q{evald.quality}</span>
      </div>
      <div style={{fontSize:12.5,color:TX,lineHeight:1.6}}>{evald.tip||evald.feedback}</div>
      {evald.quality<5&&evald.carioca_correction&&<div style={{fontSize:12,color:AC,marginTop:6}}>The Carioca way: <b>{evald.carioca_correction}</b></div>}
    </div>}
    <div style={{marginTop:12}}>
      {!evald?<PBtn label={busy?'Avaliando…':'Enviar'} onClick={submit}/>
      :(evald.quality<=3&&!retried)?<div style={{display:'flex',gap:8}}>
        <button onClick={()=>{firstQRef.current=evald.quality||1;setRetried(true);setEvald(null)}} style={{flex:1,padding:'13px',background:`${GD}14`,border:`1px solid ${GD}55`,borderRadius:12,color:GD,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:FONT}}>↻ Try again</button>
        <button onClick={commit} style={{flex:1,padding:'13px',background:S2,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:FONT}}>Continue</button>
      </div>
      :<PBtn label={i>=items.length-1?'Fechar oficina':'Próxima →'} onClick={commit}/>}
    </div>
  </div>
}

// ═══ NGAula — the guided lesson: Escuta → Pratica → Cena ═════════════
// Layer-2 generated theater over the same atoms & the same engine.
function NGAula({isOnline,unit,onBack}){
  const[st,setSt]=useState('gen') // gen|escuta|practice|cena|done|nopack
  const[pack,setPack]=useState(null)
  const[playing,setPlaying]=useState(-1)
  const[showEn,setShowEn]=useState({})
  const[turnIdx,setTurnIdx]=useState(0)
  const[gapAns,setGapAns]=useState('')
  const[gapEval,setGapEval]=useState(null)
  const[gapBusy,setGapBusy]=useState(false)
  const[cenaScore,setCenaScore]=useState([])
  const audioRef=useRef(null)

  useEffect(()=>{
    if(!unit){onBack();return}
    ngFetch('ng-lesson-gen',{unit_id:unit.unit_id})
      .then(r=>{if(r?.pack){setPack(r.pack);setSt('escuta')}else setSt('nopack')})
      .catch(()=>setSt('nopack'))
    return()=>{if(audioRef.current){audioRef.current.pause();audioRef.current=null}}
  },[])

  const playLine=async(i)=>{
    const l=pack.dialogue[i];if(!l)return
    setPlaying(i)
    try{
      const r=await ngFetch('ng-tts',{text:l.pt,voice:l.sp==='B'?'shimmer':'echo'})  // radio cast: Bia / Chico
      if(r?.audio){
        if(audioRef.current)audioRef.current.pause()
        const a=new Audio('data:audio/mp3;base64,'+r.audio)
        audioRef.current=a
        a.onended=()=>setPlaying(-1)
        a.play()
      }else setPlaying(-1)
    }catch(_){setPlaying(-1)}
  }

  const gapFirstQRef=useRef(null)
  const[gapRetried,setGapRetried]=useState(false)
  const submitGap=async(gap)=>{
    if(gapBusy||!gapAns.trim())return
    setGapBusy(true)
    const r=await ngFetch('ng-write-eval',{target_pt:gap.target_pt,user_answer:gapAns,en_prompt:gap.prompt_en,scaffold_id:gap.scaffold_id,stage:gap.stage||1}).catch(()=>({quality:2,feedback:'—'}))
    if(gapRetried&&gapFirstQRef.current!=null){
      r.quality=Math.max(gapFirstQRef.current,Math.max(1,Math.round((r.quality||2)-0.5)))
      r._retried=true
    }
    setGapEval(r);setGapBusy(false)
    const q=r.quality||2
    setCenaScore(s=>[...s,q])
    if(gap.scaffold_id&&isOnline)
      ngFetch('ng-session-end',{mode:'daily',events:[{scaffold_id:gap.scaffold_id,stage:gap.stage||1,quality:q,mode:'phrase'}],duration_seconds:30}).catch(()=>{})
  }
  const nextTurn=()=>{setGapAns('');setGapEval(null);setGapRetried(false);gapFirstQRef.current=null;setTurnIdx(i=>i+1)}

  const Narr=({pt,en})=>pt?<div style={{textAlign:'center',margin:'0 0 16px'}}>
    <div style={{fontSize:12.5,color:AC,fontWeight:700,fontStyle:'italic'}}>"{pt}"</div>
    <div style={{fontSize:10,color:MU}}>{en} — Bia</div>
  </div>:null

  if(st==='gen')return<div style={{padding:'130px 20px',textAlign:'center'}}>
    <div style={{animation:'float 2s ease-in-out infinite',display:'inline-block'}}><Poste size={42}/></div>
    <div style={{fontSize:14,fontWeight:700,color:TX,marginTop:16,fontFamily:FONTD}}>Claude montando a aula…</div>
    <div style={{fontSize:11,color:MU,marginTop:6}}>{unit?.title} · diálogo + cena, do teu mundo</div>
  </div>

  if(st==='nopack')return<div style={{padding:'80px 20px',textAlign:'center'}}>
    <div style={{fontSize:13,color:MU,marginBottom:18}}>The guided lesson didn't load — but the unit practice is ready to go.</div>
    <PBtn label="▶ Practice the unit" onClick={()=>setSt('practice')}/>
    <div style={{marginTop:10}}><GBtn label="← Voltar" onClick={onBack}/></div>
  </div>

  if(st==='escuta')return<div style={{padding:'24px 20px 100px',animation:'up 0.35s ease'}}>
    <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0,marginBottom:14}}>← sair</button>
    <div style={{fontSize:9,color:GD,fontWeight:800,letterSpacing:2,marginBottom:4}}>AULA · ATO 1 — ESCUTA</div>
    <div style={{fontSize:20,fontWeight:800,color:TX,fontFamily:FONTD,marginBottom:12}}>{unit.emoji} {unit.title}</div>
    <Narr pt={pack.narr?.open_pt} en={pack.narr?.open_en}/>
    {pack.dialogue.map((l,i)=><div key={i} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
      <button onClick={()=>playLine(i)} style={{width:34,height:34,borderRadius:17,background:playing===i?AC:S2,border:`1px solid ${playing===i?AC:BD}`,color:playing===i?'#16240f':MU,fontSize:13,cursor:'pointer',flexShrink:0}}>{playing===i?'◼':'▶'}</button>
      <div onClick={()=>setShowEn(s=>({...s,[i]:!s[i]}))} style={{flex:1,background:l.sp==='B'?S:'#132a1c',border:`1px solid ${BD}`,borderRadius:'4px 14px 14px 14px',padding:'10px 13px',cursor:'pointer'}}>
        <div style={{fontSize:8.5,color:l.sp==='B'?COR_SPEED:GR,fontWeight:800,letterSpacing:1.5,marginBottom:3}}>{l.sp==='B'?'BIA':'CHICO'}</div>
        <div style={{fontSize:14,color:TX,fontWeight:600,lineHeight:1.55}}>{l.pt}</div>
        {showEn[i]&&<div style={{fontSize:11,color:MU,marginTop:4}}>{l.en}</div>}
      </div>
    </div>)}
    <div style={{fontSize:10,color:MU,textAlign:'center',margin:'6px 0 14px'}}>toca na fala pra ver o inglês · o ouvido antes da boca</div>
    <PBtn label="Agora pratica →" onClick={()=>{SFX.tap();setSt('practice')}}/>
  </div>

  if(st==='practice')return<NGTreino isOnline={isOnline} seedUnit={unit.unit_id}
    onBack={onBack} onDone={()=>{setSt(pack?.cena?.turns?.length?'cena':'done');if(!pack?.cena)SFX.complete()}}/>

  if(st==='cena'){
    const turns=pack.cena.turns||[]
    const t=turns[turnIdx]
    return<div style={{padding:'24px 20px 100px',animation:'up 0.35s ease'}}>
    <div style={{fontSize:9,color:GD,fontWeight:800,letterSpacing:2,marginBottom:4}}>AULA · ATO FINAL — CENA</div>
    <div style={{fontSize:13,color:TX,fontWeight:700,marginBottom:2}}>{pack.cena.setting_pt}</div>
    <div style={{fontSize:10.5,color:MU,marginBottom:16}}>{pack.cena.setting_en} · agora é você na cena</div>
    <Narr pt={pack.narr?.mid_pt} en={pack.narr?.mid_en}/>
    {turns.slice(0,turnIdx+1).map((tt,i)=>tt.gap
      ?(i<turnIdx||gapEval?.quality>=0&&i===turnIdx&&false?null:null)
      :null)}
    {turns.slice(0,turnIdx).map((tt,i)=><div key={i} style={{marginBottom:10}}>
      {tt.gap
        ?<div style={{textAlign:'right'}}><div style={{display:'inline-block',background:AC,borderRadius:'14px 4px 14px 14px',padding:'9px 13px',fontSize:13.5,fontWeight:700,color:'#16240f',maxWidth:'85%'}}>{tt.gap._said||tt.gap.target_pt}</div></div>
        :<div style={{display:'inline-block',background:S,border:`1px solid ${BD}`,borderRadius:'4px 14px 14px 14px',padding:'9px 13px',fontSize:13.5,color:TX,maxWidth:'85%'}}><span style={{fontSize:8.5,color:tt.sp==='B'?COR_SPEED:GR,fontWeight:800}}>{tt.sp==='B'?'BIA ':'CHICO '}</span>{tt.pt}</div>}
    </div>)}
    {t&&!t.gap&&<div style={{marginBottom:14}}>
      <div style={{display:'inline-block',background:S,border:`1.5px solid ${GD}66`,borderRadius:'4px 14px 14px 14px',padding:'11px 14px',fontSize:14.5,color:TX,maxWidth:'88%'}}>
        <span style={{fontSize:8.5,color:t.sp==='B'?COR_SPEED:GR,fontWeight:800}}>{t.sp==='B'?'BIA ':'CHICO '}</span>{t.pt}
        <div style={{fontSize:10.5,color:MU,marginTop:4}}>{t.en}</div>
      </div>
      <div style={{marginTop:14}}><PBtn label="Sua vez →" onClick={nextTurn}/></div>
    </div>}
    {t&&t.gap&&<div>
      <div style={{fontSize:12,color:GD,fontWeight:700,marginBottom:8}}>🎬 Sua fala: {t.gap.prompt_en}</div>
      <textarea value={gapAns} onChange={e=>setGapAns(e.target.value)} disabled={!!gapEval}
        placeholder="fala do teu jeito…" style={{width:'100%',minHeight:64,background:S2,border:`1.5px solid ${gapEval?(gapEval.quality>=4?GR:GD):BD}`,borderRadius:14,padding:'12px 14px',fontSize:15,color:TX,fontFamily:FONT,resize:'none',boxSizing:'border-box'}}/>
      {gapEval&&<div style={{marginTop:10,background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'11px 13px'}}>
        <div style={{fontSize:12,color:TX,lineHeight:1.6}}>{gapEval.tip||gapEval.feedback}</div>
        {gapEval.quality<5&&gapEval.carioca_correction&&<div style={{fontSize:12,color:AC,marginTop:5}}>The Carioca way: <b>{gapEval.carioca_correction}</b></div>}
      </div>}
      <div style={{marginTop:12}}>
        {!gapEval?<PBtn label={gapBusy?'Avaliando…':'Falar'} onClick={()=>submitGap(t.gap)}/>
        :(gapEval.quality<=3&&!gapRetried)?<div style={{display:'flex',gap:8}}>
          <button onClick={()=>{gapFirstQRef.current=gapEval.quality||1;setGapRetried(true);setGapEval(null)}} style={{flex:1,padding:'13px',background:`${GD}14`,border:`1px solid ${GD}55`,borderRadius:12,color:GD,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:FONT}}>↻ Try again</button>
          <button onClick={()=>{t.gap._said=gapAns;(turnIdx>=turns.length-1)?(SFX.complete(),setSt('done')):nextTurn()}} style={{flex:1,padding:'13px',background:S2,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:FONT}}>Continue</button>
        </div>
        :<PBtn label={turnIdx>=turns.length-1?'Fechar a cena':'Continuar a cena →'} onClick={()=>{
          t.gap._said=gapAns
          if(turnIdx>=turns.length-1){SFX.complete();setSt('done')}else nextTurn()
        }}/>}
      </div>
    </div>}
    {!t&&<PBtn label="Fechar a cena" onClick={()=>{SFX.complete();setSt('done')}}/>}
  </div>}

  if(st==='done'){
    const avg=cenaScore.length?Math.round(cenaScore.reduce((a,b)=>a+b,0)/cenaScore.length*10)/10:null
    return<div style={{padding:'80px 20px',textAlign:'center',animation:'up 0.4s ease'}}>
    <div style={{fontSize:46}}>🎓</div>
    <div style={{fontSize:22,fontWeight:800,color:TX,fontFamily:FONTD,margin:'12px 0 4px'}}>Aula fechada</div>
    <Narr pt={pack?.narr?.close_pt} en={pack?.narr?.close_en}/>
    {avg&&<div style={{fontSize:12,color:MU,marginBottom:18}}>Cena: qualidade média {avg} — tudo já entrou no motor.</div>}
    <PBtn label="Voltar" onClick={onBack}/>
  </div>}
  return null
}

function NGTreino({isOnline,onBack,seedUnit,seedDeck,onDone}){
  const[stage,setStage]=useState('gate') // gate|placement-intro|pick|load|run|done|placed
  const placementRef=useRef(false)
  const placeResults=useRef([])
  const[placeOut,setPlaceOut]=useState(null)
  const[mins,setMins]=useState(10)
  const[left,setLeft]=useState(0)
  const[queue,setQueue]=useState([])
  const[qi,setQi]=useState(0)
  const[atom,setAtom]=useState(null) // {type,...state}
  const[stats,setStats]=useState({done:0,qsum:0,byType:{}})
  const[gains,setGains]=useState([])
  const[flash,setFlash]=useState(null) // 'pop' | 'shake' — verdict motion
  const bandRef=useRef({n:0,ok:0}) // session success band — the governor's evidence
  const timeUpRef=useRef(false)
  const[speed,setSpeed]=useState(null) // {items,idx,streak,best,deadline}
  const speedRef=useRef(false)
  const endAtRef=useRef(0)
  const atomStartRef=useRef(0)
  const tickRef=useRef(null)
  const startedRef=useRef(false)
  useEffect(()=>{
    // FLOW FIRST: no placement gate, no minute-picking toll booth. The session
    // starts the moment you arrive (10 min default — the timer chip extends it).
    if(startedRef.current)return
    startedRef.current=true
    start(seedUnit?8:10,seedUnit)
  },[])

  useEffect(()=>()=>{if(tickRef.current)clearInterval(tickRef.current)},[])

  const startPlacement=async()=>{
    setStage('load')
    try{
      const d=await ngFetch('ng-frontier',{deck:'placement'})
      const q=d?.frontier||[]
      if(q.length<8){setStage('pick');return}
      placementRef.current=true;placeResults.current=[]
      setQueue(q);setQi(0);setStats({done:0,qsum:0,byType:{}})
      timeUpRef.current=false;speedRef.current=true
      endAtRef.current=Date.now()+10*60000;setLeft(600)
      tickRef.current=setInterval(()=>{
        const s=Math.max(0,Math.round((endAtRef.current-Date.now())/1000))
        setLeft(s);if(s<=0){timeUpRef.current=true;clearInterval(tickRef.current)}
      },1000)
      buildAtom(q[0],0);setStage('run')
    }catch(_){setStage('pick')}
  }
  const atomWRef=useRef({})
  const dialRef=useRef({})
  const[why,setWhy]=useState('')
  const refetchingRef=useRef(false)
  const start=async(m,unitId)=>{
    setMins(m);setStage('load')
    try{
      // GUIDED DECK (Calçadão): one fetch — keep floor + new valve + room, with
      // the why-line. Unit/grammar seeds keep their dedicated decks.
      // (The old separate {deck:'due'} fetch was vestigial — ng-frontier has no
      // 'due' branch, so it always returned an empty frontier; reviews arrive
      // inside the session/guided deck itself, already flagged isReview.)
      const prefetched=(!unitId&&!seedDeck)?takeGuidedPrefetch():null
      const def=prefetched||await(
        unitId?ngFetch('ng-frontier',{deck:'unit',unit_id:unitId})
          :seedDeck==='grammar'?ngFetch('ng-frontier',{deck:'grammar'})
          :ngFetch('ng-frontier',{deck:'guided'})
      ).catch(()=>({}))
      atomWRef.current=def?.atom_weights||{}
      dialRef.current=def?.guide_dial||{}
      setWhy((!unitId&&!seedDeck&&def?.why)?def.why:'')
      const dueItems=(def?.frontier||[]).filter(x=>x.isReview)
      let front=(def?.frontier||[]).filter(x=>!x.isReview)
      // GRAMMAR GUARANTEE: grammar cells surface at least every 3rd frontier slot
      const gram=front.filter(x=>(x.context||'')==='grammar')
      const rest=front.filter(x=>(x.context||'')!=='grammar')
      const mixed=[]
      while(gram.length||rest.length){
        if(rest.length)mixed.push(rest.shift())
        if(rest.length)mixed.push(rest.shift())
        if(gram.length)mixed.push(gram.shift())
      }
      let q=[...dueItems.slice(0,14),...mixed].slice(0,40)
      // ARC — open hot: the first two reps are easy wins (low rung), so the
      // session starts with motion and confidence, not a wall.
      const arcWarm=[],arcRest=[]
      for(const it of q){
        if(arcWarm.length<2&&(it.rung??0)<=1&&!it.isReview)arcWarm.push(it);else arcRest.push(it)
      }
      q=[...arcWarm,...arcRest]
      if(!q.length){setStage('empty');return}
      setQueue(q);setQi(0)
      setStats({done:0,qsum:0,byType:{}});setGains([])
      timeUpRef.current=false
      endAtRef.current=Date.now()+m*60000
      setLeft(m*60)
      tickRef.current=setInterval(()=>{
        const s=Math.max(0,Math.round((endAtRef.current-Date.now())/1000))
        setLeft(s)
        if(s<=75&&!speedRef.current&&m>=10){speedRef.current=true} // finale armed
        if(s<=0){timeUpRef.current=true;clearInterval(tickRef.current)}
      },1000)
      buildAtom(q[0],0)
      setStage('run')
    }catch(e){setStage('empty')}
  }

  const atomFor=(item,i)=>{
    if(item.force==='recog')return'recog'
    if(item.force==='reorder')return (item.pt||'').split(' ').length>=3?'reorder':'recog'
    if(item.force==='constructor')return isOnline?'constructor':'reorder'
    const words=(item.pt||'').split(' ')
    const isGram=(item.context||'')==='grammar'
    // RUNG LADDER (Calçadão): a brick is met at its own evidence level —
    // 0 conhecer (flip/recog) → 1 apoiado (reorder/cloze/escuta) →
    // 2 discriminar (duel/conserta/timeline) → 3 produzir (constructor).
    // The server derives rung from events+memory; struggle already dropped it there.
    // The card→write cliff is gone: nothing meets the constructor before passing rung 2.
    let rung=Number.isInteger(item.rung)?item.rung:(item.isReview?3:(item.practice_count>0?1:0))
    // conhecer: a brand-new brick is INTRODUCED (see it, hear it) before it's
    // ever tested. Patience — the brick is placed in your hand before you build.
    if(!item.isReview&&!item.force&&(item.practice_count||0)===0&&rung===0)return'intro'
    // SUCCESS GOVERNOR: hold the session in the ~80-88% band. Under it, meet
    // bricks one rung gentler; cruising above it, stretch every third item.
    // Never touches reviews (the clock owns those) or placement forces.
    if(!item.isReview){
      const b=bandRef.current
      if(b.n>=6){
        const rate=b.ok/b.n
        if(rate<0.78)rung=Math.max(0,rung-1)
        else if(rate>0.92&&i%3===0)rung=Math.min(3,rung+1)
      }
    }
    if(item.isReview){
      // Reviews retrieve at the strength you own (dial: guide_dial.review_style
      // 'gentle' keeps all reviews as flips). Production reviews only ever hit
      // bricks that already passed discrimination — gentle by construction.
      if(dialRef.current?.review_style==='gentle')return'flip'
      if(rung<=1)return'flip'
      if(rung===2){
        let r=isGram&&tlClassify(item.pt)?'timeline':'duel'
        if(r==='duel'&&!corruptPT(item.pt))r='flip'
        return r
      }
      return isOnline?'constructor':'flip'
    }
    // Non-review: rotate WITHIN the rung's pool, weighted by Layer-3 atom_weights
    // (struggled atom types appear more, aced ones less — inside the rung, never above it).
    const pools={
      0:['flip','recog'],
      1:['reorder','cloze','escuta'],
      2:isGram?['timeline','duel','conserta']:['duel','conserta','cloze'],
      3:['constructor','constructor','monta'] // produzir: mostly targeted, sometimes free build
    }
    const base=pools[rung]||pools[1]
    const w=atomWRef.current||{}
    const bag=[]
    // typeof guard: w['constructor'] on a plain object returns the Object
    // constructor (truthy!) → NaN reps → the atom silently vanished from the
    // rotation. This exact leak kept the constructor atom out of every Treino
    // rotation in the pre-rung app.
    for(const a of base){const wv=typeof w[a]==='number'?w[a]:1;const rep=Math.max(1,Math.round(wv*2));for(let k=0;k<rep;k++)bag.push(a)}
    let rot=bag[(i*7+3)%bag.length]
    if(rot==='timeline'&&!tlClassify(item.pt))rot='duel'
    if(rot==='conserta'&&!corruptPT(item.pt))rot='cloze'
    if(rot==='duel'&&!corruptPT(item.pt)&&queue.length<3)rot='cloze'
    if(rot==='reorder'&&words.length<3)rot='cloze'
    if(rot==='cloze'&&words.length<3)rot='flip'
    if(rot==='escuta'&&(!isOnline||queue.length<3))rot='cloze'
    if(rot==='constructor'&&!isOnline)rot=isGram?'conserta':'reorder'
    if(rot==='monta'&&(!isOnline||(item.pt||'').split(' ').length>6))rot=isOnline?'constructor':'reorder'
    if(rot==='conserta'&&!corruptPT(item.pt))rot='cloze'
    if(rot==='recog'&&queue.length<3)rot='flip'
    return rot
  }
  const shuffleArr=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}

  const buildAtom=(item,i)=>{
    atomStartRef.current=Date.now()
    const t=atomFor(item,i)
    if(t==='intro'){setAtom({type:'intro'});setTimeout(()=>speak(item.pt),350);return}
    if(t==='flip')setAtom({type:'flip',revealed:false})
    else if(t==='reorder'){
      const words=(item.pt||'').split(' ')
      setAtom({type:'reorder',pool:shuffleArr(words),picked:[],tries:0,result:null,hint:null})
    }else if(t==='cloze'){
      const words=(item.pt||'').split(' ')
      let bi=0;words.forEach((w,j)=>{if(w.length>words[bi].length)bi=j})
      const correct=words[bi]
      // Distractor quality: confusion partners first (real grammar traps),
      // then same-ending words (plausible), then random — never absurd-easy.
      const cl=correct.toLowerCase().replace(/[.,!?]/g,'')
      const conf=CONF_PAIRS.filter(([a])=>a===cl).map(([,b])=>b)
        .concat(CONF_PAIRS.filter(([,b])=>b===cl).map(([a])=>a))
      const pool=[...new Set(queue.filter(x=>x!==item).flatMap(x=>(x.pt||'').split(' ')))]
        .filter(w=>w.length>=3&&w.toLowerCase()!==cl)
      const ending=pool.filter(w=>w.slice(-2)===correct.slice(-2))
      let cand=[...new Set([...conf,...shuffleArr(ending),...shuffleArr(pool)])].slice(0,2)
      while(cand.length<2){const d=DECOY_PT[Math.floor(Math.random()*DECOY_PT.length)].split(' ');const w=d[Math.floor(Math.random()*d.length)];if(w.toLowerCase()!==cl&&!cand.includes(w))cand.push(w)}
      const ops=shuffleArr([correct,...cand])
      setAtom({type:'cloze',blank:bi,correct,options:ops,result:null})
    }else if(t==='escuta'){
      const others=queue.filter(x=>x!==item&&x.en).map(x=>x.en)
      setAtom({type:'escuta',options:padOptions(item.en,others,'en'),audio:null,fetching:false,plays:0,result:null,chosen:null})
    }else if(t==='recog'){
      const others=queue.filter(x=>x!==item&&x.en).map(x=>x.en)
      setAtom({type:'recog',options:padOptions(item.en,others,'en'),result:null,chosen:null})
      setTimeout(()=>speak(item.pt),350)
    }else if(t==='timeline'){
      setAtom({type:'timeline',point:tlClassify(item.pt),result:null,chosen:null})
    }else if(t==='duel'){
      const cor=corruptPT(item.pt)
      const alt=(queue.find(x=>x!==item&&x.pt)||{}).pt
      const wrong=cor?cor.bad:(alt||DECOY_PT[Math.floor(Math.random()*DECOY_PT.length)])
      const pair=Math.random()<0.5?[item.pt,wrong]:[wrong,item.pt]
      setAtom({type:'duel',pair,result:null,chosen:null,isTense:!!cor})
    }else if(t==='conserta'){
      const cor=corruptPT(item.pt)
      setAtom({type:'conserta',...cor,phase2:false,result:null,options:null})
    }else if(t==='monta'){
      // LEGO: the target brick + one snap-piece. Build ANY true sentence with both.
      const SNAPS=['hoje','amanhã','depois','mas','porque','então','agora','sempre']
      const picks=shuffleArr(SNAPS).slice(0,1)
      setAtom({type:'monta',bricks:[item.pt,...picks],answer:'',evald:null,retried:false,busy:false})
    }else setAtom({type:'constructor',answer:'',evald:null,retried:false,busy:false})
  }

  const logEvent=async(item,quality,atomType)=>{
    // Relearning loop: a failed item returns later in the SAME session (once).
    // Desirable difficulty — you don't leave a Treino with an unrepaired miss.
    if(!placementRef.current&&quality<=2&&!item._requeued&&atomType!=='speed'){
      setQueue(prev=>{
        const at=Math.min(prev.length,qi+4)
        return[...prev.slice(0,at),{...item,_requeued:true},...prev.slice(at)]
      })
    }
    if(placementRef.current){
      placeResults.current.push({scaffold_id:item.scaffold_id,stage:item.stage,phase:item.phase||1,
        skill:atomType==='recog'?'recognition':'production',ok:quality>=3})
      setStats(s=>({done:s.done+1,qsum:s.qsum+quality,byType:s.byType}))
      return
    }
    const secs=Math.max(3,Math.round((Date.now()-atomStartRef.current)/1000))
    setStats(s=>({done:s.done+1,qsum:s.qsum+quality,byType:{...s.byType,[atomType]:(s.byType[atomType]||0)+1}}))
    // Verdict choreography: the card answers physically before it answers verbally.
    bandRef.current={n:bandRef.current.n+1,ok:bandRef.current.ok+(quality>=3?1:0)}
    setFlash(quality>=4?'pop':quality<=2?'shake':null)
    setTimeout(()=>setFlash(null),450)
    if(quality>=4)SFX.tap()
    if(!isOnline)return
    try{
      const r=await ngFetch('ng-session-end',{mode:'daily',
        events:[{scaffold_id:item.scaffold_id,stage:item.stage,quality,
          mode:(atomType==='intro'||atomType==='flip'||atomType==='recog'||atomType==='speed'||atomType==='escuta_audio')?'flashcard':atomType==='constructor'?'write':atomType}],
        duration_seconds:secs})
      if(r?.memory?.length)setGains(g=>[...g,...r.memory.map(m=>({...m,pt:item.pt}))])
    }catch(_){}
  }

  const advance=()=>{
    if(timeUpRef.current){finish();return}
    if(qi>=queue.length-1){
      if(placementRef.current){
        // Placement is timer-governed too: keep sampling more items until the
        // clock dies (richer measurement), pulling a fresh stratified deck.
        if(isOnline&&!refetchingRef.current){
          refetchingRef.current=true
          ngFetch('ng-frontier',{deck:'placement'}).then(d=>{
            refetchingRef.current=false
            const seen=new Set(queue.map(x=>x.scaffold_id+'|'+x.stage))
            const more=(d?.frontier||[]).filter(x=>!seen.has(x.scaffold_id+'|'+x.stage))
            if(more.length){setQueue(prev=>[...prev,...more]);const ni=qi+1;setQi(ni);buildAtom(more[0],ni)}
            else finish()
          }).catch(()=>{refetchingRef.current=false;finish()})
          return
        }
        finish();return
      }
      // THE TIMER IS THE ONLY CAP. First try to pull a FRESH deck from the
      // server (new material — reviews that just came due, unseen frontier);
      // only if that's empty do we reshuffle what we have. Never end on time left.
      if(isOnline&&!refetchingRef.current){
        refetchingRef.current=true
        // Guided refetch keeps the governors live mid-session (catches newly-due
        // reviews, respects the valve); seeded modes keep their original behavior.
        ngFetch('ng-frontier',{deck:(seedUnit||seedDeck)?'session':'guided'}).then(d=>{
          refetchingRef.current=false
          const seen=new Set(queue.map(x=>x.scaffold_id+'|'+x.stage))
          const incoming=(d?.frontier||[]).filter(x=>!seen.has(x.scaffold_id+'|'+x.stage))
          const add=incoming.length?incoming:shuffleArr(queue.map(x=>({...x,_requeued:false})))
          if(add.length){
            setQueue(prev=>[...prev,...add])
            const ni=qi+1;setQi(ni);buildAtom(add[0],ni)
          }else finish()
        }).catch(()=>{
          refetchingRef.current=false
          const fresh=shuffleArr(queue.map(x=>({...x,_requeued:false})))
          if(fresh.length){setQueue(prev=>[...prev,...fresh]);const ni=qi+1;setQi(ni);buildAtom(fresh[0],ni)}else finish()
        })
        return
      }
      const fresh=shuffleArr(queue.map(x=>({...x,_requeued:false})))
      if(fresh.length){setQueue(prev=>[...prev,...fresh]);const ni=qi+1;setQi(ni);buildAtom(fresh[0],ni);return}
      finish();return
    }
    if(speedRef.current&&!speed&&!placementRef.current){
      // ═ A10 SPEED ROUND — peak-end rule: close on fire ═
      const pool=queue.filter(x=>x.pt&&x.en).sort(()=>Math.random()-0.5)
      if(pool.length>=4){startSpeedItem(pool,0,0,0);return}
    }
    const ni=qi+1;setQi(ni);buildAtom(queue[ni],ni)
  }
  const startSpeedItem=(poolIn,idxIn,streak,best)=>{
    atomStartRef.current=Date.now()
    if(timeUpRef.current){finish();return}
    let pool=poolIn,idx=idxIn
    if(idx>=pool.length){ // timer still alive — recycle the speed pool, keep the streak
      pool=shuffleArr(pool);idx=0
    }
    const it=pool[idx]
    const wrongs=pool.filter(x=>x!==it&&x.pt!==it.pt).map(x=>x.pt)
    const ops=padOptions(it.pt,wrongs,'pt')
    setSpeed({pool,idx,streak,best:Math.max(best,streak),item:it,ops,deadline:Date.now()+6000,flash:null})
  }
  const finish=async()=>{
    if(tickRef.current)clearInterval(tickRef.current)
    if(placementRef.current){
      placementRef.current=false
      const res=placeResults.current
      if(res.length<6){ // too little evidence — no lock-in, no seeding
        setStage('placement-intro');return
      }
      const acc={}
      for(const r of res){
        const w=r.skill==='production'?2:1
        acc[r.phase]=acc[r.phase]||{ok:0,n:0};acc[r.phase].ok+=r.ok?w:0;acc[r.phase].n+=w
      }
      let ph=1
      for(const p of[1,2,3,4]){if(acc[p]&&acc[p].n>=2&&acc[p].ok/acc[p].n>=0.6)ph=p}
      let out={phase:ph,seeded:0}
      try{const r=await ngFetch('ng-placement-seed',{results:res,phase:ph});out.seeded=r?.seeded||0}catch(_){}
      setPlaceOut(out);SFX.complete();setStage('placed')
      return
    }
    SFX.complete();setStage('done')
  }
  const mmss=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const item=queue[qi]

  if(stage==='gate')return<div style={{padding:'140px 20px',textAlign:'center'}}><Spinner size={20}/></div>

  if(stage==='empty')return<div style={{padding:'120px 20px',textAlign:'center',animation:'up 0.3s ease'}}>
    <div style={{fontSize:40,marginBottom:12}}>🌴</div>
    <div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:6}}>Nothing to train right now</div>
    <div style={{fontSize:12,color:MU,lineHeight:1.7,marginBottom:20}}>The deck came back empty — that usually means you're offline or the bank is still planting. Try again in a moment.</div>
    <PBtn label="Try again" onClick={()=>{SFX.tap();start(10)}}/>
    <div style={{marginTop:10}}><GBtn label="Back to Home" onClick={onBack}/></div>
  </div>

  if(stage==='load')return<div style={{padding:'120px 20px',textAlign:'center'}}><Spinner size={22}/><div style={{fontSize:12,color:MU,marginTop:14}}>Building your session…</div></div>

  if(stage==='done'){
    const avg=stats.done?Math.round(stats.qsum/stats.done*10)/10:0
    return<div style={{padding:'56px 20px 100px',animation:'up 0.4s ease',textAlign:'center'}}>
    <div style={{fontSize:44}}>🏁</div>
    <div style={{fontSize:22,fontWeight:800,color:TX,fontFamily:FONTD,margin:'10px 0 4px'}}>Session complete</div>
    <div style={{fontSize:12.5,color:MU,marginBottom:20}}>{mins} min · {stats.done} reps · avg quality {avg}</div>
    {gains.length>0&&(()=>{
      // Dedupe by phrase — one row per pattern, strongest gain kept. Show ALL, scroll if long.
      const byPhrase={}
      for(const g of gains){
        const k=g.pt||g.scaffold_id||JSON.stringify(g)
        const d=typeof g.delta==='number'?g.delta:parseFloat(g.delta)||0
        if(!byPhrase[k]||d>byPhrase[k]._d)byPhrase[k]={...g,_d:d}
      }
      const rows=Object.values(byPhrase)
      return<div style={{textAlign:'left',background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'14px 16px',marginBottom:16}}>
        <div style={{fontSize:9,color:GD,fontWeight:800,letterSpacing:2,marginBottom:8,display:'flex',justifyContent:'space-between'}}>
          <span>MEMORY GAINS</span><span style={{color:GR}}>{rows.length} patterns</span>
        </div>
        <div style={{maxHeight:280,overflowY:'auto'}}>
        {rows.map((g,i)=><div key={i} style={{fontSize:11.5,color:TX,padding:'3px 0',display:'flex',justifyContent:'space-between',gap:8}}>
          <span style={{maxWidth:'72%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.pt}</span>
          <span style={{color:GR,fontWeight:700,flexShrink:0}}>{g.delta||'↑'}</span>
        </div>)}
        </div>
      </div>
    })()}
    <PBtn label={onDone?"Continue to the Scene →":"Back to Home"} onClick={onDone||onBack}/>
  </div>}

  // ═══ RUN ═══
  return<div style={{padding:'20px 20px 100px',animation:'up 0.3s ease'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:why?6:16}}>
      <button onClick={finish} style={{background:'none',border:'none',color:MU,fontSize:12,cursor:'pointer',fontFamily:FONT,padding:0}}>end</button>
      <button onClick={()=>{endAtRef.current+=5*60000;setMins(m=>m+5);setLeft(l=>l+300);SFX.tap()}} title="+5 min" style={{background:left<=60?`${RE}18`:S,border:`1px solid ${left<=60?RE+'66':BD}`,borderRadius:20,padding:'6px 14px',fontSize:13,fontWeight:800,color:left<=60?RE:AC,fontVariantNumeric:'tabular-nums',cursor:'pointer',fontFamily:FONT}}>⏱ {mmss(left)} +</button>
      <div style={{fontSize:11,color:MU}}>{qi+1}/{queue.length}</div>
    </div>
    {/* The why-line: the guide explains today's session in one plain sentence. */}
    {why&&!speed&&<div style={{fontSize:11.5,color:MU,lineHeight:1.5,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${BD}`}}>{why}</div>}
    {speed&&<div style={{animation:'up 0.25s ease'}}>
      <div style={{textAlign:'center',marginBottom:14}}>
        <span style={{fontSize:10,color:COR_SPEED,fontWeight:800,letterSpacing:3}}>⚡ LIGHTNING ROUND</span>
        <span style={{marginLeft:12,fontSize:12,color:speed.streak>=5?AC:MU,fontWeight:800}}>{speed.streak>=3?'🔥':''} streak {speed.streak}</span>
      </div>
      <SpeedTimer deadline={speed.deadline} onExpire={()=>{
        setSpeed(s=>s?{...s,flash:'slow'}:s)
        logEvent(speed.item,1,'speed')
        setTimeout(()=>startSpeedItem(speed.pool,speed.idx+1,0,speed.best),500)
      }}/>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px 16px',fontSize:14.5,fontWeight:700,color:TX,textAlign:'center',margin:'10px 0 14px'}}>{speed.item.en}</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {speed.ops.map((op,i)=><button key={i} onClick={async()=>{
          const right=op===speed.item.pt
          const ns=right?speed.streak+1:0
          if(right){SFX.tap();if(ns===8)SFX.complete()}
          logEvent(speed.item,right?4:1,'speed')
          startSpeedItem(speed.pool,speed.idx+1,ns,speed.best)
        }} style={{padding:'14px',background:S2,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:FONT}}>{op}</button>)}
      </div>
    </div>}
    {!speed&&item&&atom&&<div style={{animation:flash==='pop'?'pop 0.4s ease':flash==='shake'?'shake 0.4s ease':'none'}}>
      <div style={{fontSize:9,color:GD,fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>
        {placementRef.current?'📍 Placement':(item.isReview?'◌ Review':(item.context==='grammar'?'⚙ Grammar':(item.isNew?'✦ New':'✦ Frontier')))} · {atom.type}
      </div>

      {atom.type==='intro'&&<div>
        <div style={{fontSize:11,color:GD,marginBottom:10,textAlign:'center'}}>New brick — meet it first 👋</div>
        <div style={{background:S,border:`1px solid ${GD}44`,borderRadius:18,padding:'28px 20px',textAlign:'center',marginBottom:14}}>
          <div onClick={()=>speak(item.pt)} style={{fontSize:22,fontWeight:800,color:AC,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:10}}>
            {item.pt} <span style={{fontSize:18,opacity:0.7}}>🔊</span>
          </div>
          <div style={{fontSize:14,color:MU,marginTop:10}}>{item.en}</div>
        </div>
        <PBtn label="Got it — test me →" onClick={async()=>{SFX.tap();await logEvent(item,3,'intro');advance()}}/>
      </div>}

      {atom.type==='flip'&&<div>
        <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'26px 20px',textAlign:'center',marginBottom:14}}>
          <div style={{fontSize:11,color:MU,marginBottom:8}}>Say it in Portuguese:</div>
          <div style={{fontSize:17,fontWeight:700,color:TX}}>{item.en}</div>
          {atom.revealed&&<div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${BD}`,fontSize:18,fontWeight:800,color:AC}}>{item.pt}</div>}
        </div>
          {atom.revealed&&<div onClick={()=>speak(item.pt)} style={{fontSize:12,color:GD,marginTop:8,cursor:'pointer'}}>🔊 hear it</div>}
        {!atom.revealed?<PBtn label="Show" onClick={()=>{setAtom(a=>({...a,revealed:true}));setTimeout(()=>speak(item.pt),200)}}/>
        :<div style={{display:'flex',gap:8}}>
          {[[1,'Forgot',RE],[3,'Hard',GD],[4,'Good',GR],[5,'Easy',AC]].map(([q,l,col])=>
            <button key={q} onClick={async()=>{await logEvent(item,q,'flip');advance()}} style={{flex:1,padding:'12px 4px',background:`${col}14`,border:`1px solid ${col}55`,borderRadius:12,color:col,fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:FONT}}>{l}</button>)}
        </div>}
        {!item.isReview&&!placementRef.current&&<button onClick={()=>{
          // Trusted prior, not a rep: 30-day memory + controlled. No grinding what you own.
          SFX.tap()
          ngFetch('ng-memory',{action:'know',scaffold_id:item.scaffold_id,stage:item.stage}).catch(()=>{})
          setQueue(prev=>prev.filter((x,xi)=>xi===qi||!(x.scaffold_id===item.scaffold_id&&x.stage===item.stage)))
          advance()
        }} style={{display:'block',margin:'10px auto 0',background:'none',border:'none',color:MU,fontSize:11.5,cursor:'pointer',fontFamily:FONT,textDecoration:'underline',textUnderlineOffset:3}}>I already know this — skip it</button>}
      </div>}

      {atom.type==='reorder'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:8}}>Build the sentence: <span style={{color:TX}}>{item.en}</span></div>
        <div style={{minHeight:52,background:S,border:`1px dashed ${atom.result==='right'?GR:atom.result==='wrong'?RE:BD}`,borderRadius:14,padding:'10px 12px',marginBottom:10,display:'flex',flexWrap:'wrap',gap:6}}>
          {atom.picked.map((w,i)=><button key={i} onClick={()=>!atom.result&&setAtom(a=>({...a,picked:a.picked.filter((_,j)=>j!==i),pool:[...a.pool,w]}))} style={{padding:'7px 11px',background:AC,border:'none',borderRadius:9,color:'#16240f',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:FONT}}>{w}</button>)}
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
          {atom.pool.map((w,i)=><button key={i} onClick={()=>!atom.result&&setAtom(a=>({...a,pool:a.pool.filter((_,j)=>j!==i),picked:[...a.picked,w]}))} style={{padding:'7px 11px',background:S2,border:`1px solid ${BD}`,borderRadius:9,color:TX,fontSize:13,cursor:'pointer',fontFamily:FONT}}>{w}</button>)}
        </div>
        {atom.hint&&!atom.result&&<div style={{fontSize:11.5,color:GD,marginBottom:10}}>💡 {atom.hint}</div>}
        {atom.result==='wrong'&&<div style={{fontSize:12,color:TX,marginBottom:10,background:`${RE}10`,border:`1px solid ${RE}33`,borderRadius:10,padding:'10px 12px'}}>Era assim: <b style={{color:AC}}>{item.pt}</b></div>}
        {!atom.result?<PBtn label="Verificar" onClick={async()=>{
          const ans=atom.picked.join(' ')
          if(ans===item.pt){setAtom(a=>({...a,result:'right'}));const q=atom.tries>0?3:4;await logEvent(item,q,'reorder');setTimeout(advance,650)}
          else if(atom.tries===0){setAtom(a=>({...a,tries:1,hint:`Começa com "${(item.pt||'').split(' ')[0]}" — tenta de novo`,picked:[],pool:shuffleArr((item.pt||'').split(' '))}));}
          else{setAtom(a=>({...a,result:'wrong'}));await logEvent(item,1,'reorder')}
        }}/>:atom.result==='wrong'?<PBtn label="Continue" onClick={advance}/>:<div style={{textAlign:'center',color:GR,fontWeight:800,fontSize:15}}>✓</div>}
      </div>}

      {atom.type==='cloze'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:8}}>{item.en}</div>
        <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'20px 16px',fontSize:16,fontWeight:600,color:TX,marginBottom:14,lineHeight:1.7}}>
          {(item.pt||'').split(' ').map((w,i)=>i===atom.blank?<span key={i} style={{color:atom.result?(atom.result==='right'?GR:RE):AC,borderBottom:`2px solid ${AC}`,padding:'0 6px',margin:'0 3px'}}>{atom.result?atom.correct:'____'}</span>:<span key={i}> {w} </span>)}
        </div>
        {!atom.result?<div style={{display:'flex',gap:8}}>
          {atom.options.map((op,i)=><button key={i} onClick={async()=>{
            const right=op===atom.correct
            setAtom(a=>({...a,result:right?'right':'wrong',chosen:op}))
            await logEvent(item,right?4:1,'cloze')
            setTimeout(advance,right?600:1600)
          }} style={{flex:1,padding:'13px 6px',background:S2,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontWeight:700,fontSize:13.5,cursor:'pointer',fontFamily:FONT}}>{op}</button>)}
        </div>
        :atom.result==='wrong'&&<div style={{fontSize:12,color:TX,background:`${RE}10`,border:`1px solid ${RE}33`,borderRadius:10,padding:'10px 12px'}}>Você marcou "{atom.chosen}" — era <b style={{color:AC}}>"{atom.correct}"</b> · {item.en}</div>}
      </div>}

      {atom.type==='escuta'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:10}}>Ears only — what did you hear?</div>
        <div style={{textAlign:'center',marginBottom:16}}>
          <button onClick={async()=>{
            if(atom.plays>=2)return
            if(atom.audio){const a=new Audio('data:audio/mp3;base64,'+atom.audio);a.play();setAtom(x=>({...x,plays:x.plays+1}));return}
            if(atom.fetching)return
            setAtom(x=>({...x,fetching:true}))
            try{
              const r=await ngFetch('ng-tts',{text:item.pt,voice:'echo'})
              if(r?.audio){const a=new Audio('data:audio/mp3;base64,'+r.audio);a.play();setAtom(x=>({...x,audio:r.audio,fetching:false,plays:x.plays+1}))}
              else setAtom(x=>({...x,fetching:false}))
            }catch(_){setAtom(x=>({...x,fetching:false}))}
          }} style={{width:76,height:76,borderRadius:38,background:atom.plays>=2?S2:`${BZ}18`,border:`2px solid ${atom.plays>=2?BD:BZ}`,color:atom.plays>=2?MU:BZ,fontSize:26,cursor:'pointer'}}>
            {atom.fetching?'…':'🔊'}
          </button>
          <div style={{fontSize:9.5,color:MU,marginTop:6}}>{atom.plays===0?'toca pra ouvir':atom.plays===1?'mais 1 replay':'sem replays — decide'}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {atom.options.map((op,i)=><button key={i} disabled={!!atom.result||atom.plays===0} onClick={async()=>{
            const right=op===item.en
            setAtom(a=>({...a,result:right?'right':'wrong',chosen:op}))
            await logEvent(item,right?4:1,'escuta_audio')
            setTimeout(advance,right?600:1800)
          }} style={{padding:'13px 15px',textAlign:'left',background:atom.result&&op===item.en?`${GR}16`:atom.chosen===op&&atom.result==='wrong'?`${RE}12`:S2,border:`1px solid ${atom.result&&op===item.en?GR:BD}`,borderRadius:12,color:atom.plays===0?MU:TX,fontWeight:600,fontSize:13.5,cursor:'pointer',fontFamily:FONT,opacity:atom.plays===0?0.5:1}}>{op}</button>)}
        </div>
        {atom.result&&<div style={{fontSize:12,color:TX,marginTop:10,textAlign:'center'}}>Era: <b style={{color:AC}}>{item.pt}</b></div>}
      </div>}

      {atom.type==='recog'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:8}}>What does it mean?</div>
        <div onClick={()=>speak(item.pt)} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'20px 16px',fontSize:17,fontWeight:800,color:AC,textAlign:'center',marginBottom:14,cursor:'pointer'}}>{item.pt} <span style={{fontSize:14,opacity:0.6}}>🔊</span></div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {atom.options.map((op,i)=><button key={i} disabled={!!atom.result} onClick={async()=>{
            const right=op===item.en
            setAtom(a=>({...a,result:right?'right':'wrong',chosen:op}))
            await logEvent(item,right?4:1,'recog')
            setTimeout(advance,right?550:1500)
          }} style={{padding:'13px 15px',textAlign:'left',background:atom.result&&op===item.en?`${GR}16`:atom.chosen===op&&atom.result==='wrong'?`${RE}12`:S2,border:`1px solid ${atom.result&&op===item.en?GR:BD}`,borderRadius:12,color:TX,fontWeight:600,fontSize:13.5,cursor:'pointer',fontFamily:FONT}}>{op}</button>)}
        </div>
      </div>}

      {atom.type==='timeline'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:6}}>Onde essa frase mora na linha do tempo?</div>
        <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px 16px',fontSize:16,fontWeight:700,color:TX,textAlign:'center',marginBottom:16}}>{item.pt}</div>
        <div style={{display:'flex',flexDirection:'column',gap:7}}>
          {TL_POINTS.map(p=><button key={p} disabled={!!atom.result} onClick={async()=>{
            const right=p===atom.point
            setAtom(a=>({...a,result:right?'right':'wrong',chosen:p}))
            await logEvent(item,right?4:1,'timeline')
            setTimeout(advance,right?650:1900)
          }} style={{padding:'11px 14px',textAlign:'left',background:atom.result&&p===atom.point?`${GR}18`:atom.chosen===p&&atom.result==='wrong'?`${RE}14`:S2,border:`1px solid ${atom.result&&p===atom.point?GR:atom.chosen===p&&atom.result==='wrong'?RE:BD}`,borderRadius:11,color:atom.result&&p===atom.point?GR:TX,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:FONT}}>
            <span style={{fontSize:9,color:MU,marginRight:8}}>{'←·→'[Math.sign(TL_POINTS.indexOf(p)-3.2)+1]||'·'}</span>{p}
          </button>)}
        </div>
        {atom.result==='wrong'&&<div style={{fontSize:11.5,color:TX,marginTop:10}}>Mora em <b style={{color:AC}}>{atom.point}</b> — {item.en}</div>}
      </div>}

      {atom.type==='duel'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:6}}>{atom.isTense?'Qual soa certo pra essa situação?':'Which one is the real sentence?'}</div>
        <div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:13.5,fontWeight:700,color:TX,marginBottom:14}}>{item.en}</div>
        <div style={{display:'flex',flexDirection:'column',gap:9}}>
          {atom.pair.map((p,i)=><button key={i} disabled={!!atom.result} onClick={async()=>{
            const right=p===item.pt
            setAtom(a=>({...a,result:right?'right':'wrong',chosen:p}))
            await logEvent(item,right?4:1,'duel')
            setTimeout(advance,right?600:1900)
          }} style={{padding:'15px 16px',textAlign:'left',background:atom.result&&p===item.pt?`${GR}16`:atom.chosen===p&&atom.result==='wrong'?`${RE}12`:S2,border:`1.5px solid ${atom.result&&p===item.pt?GR:atom.chosen===p&&atom.result==='wrong'?RE:BD}`,borderRadius:13,color:TX,fontWeight:700,fontSize:14.5,cursor:'pointer',fontFamily:FONT}}>{p}</button>)}
        </div>
        {atom.result==='wrong'&&<div style={{fontSize:11.5,color:TX,marginTop:10}}>The other one was right — the tense changes the story.</div>}
      </div>}

      {atom.type==='conserta'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:6}}>{atom.phase2?'Qual palavra conserta?':'Tem um erro aqui — toca na palavra errada:'}</div>
        <div style={{background:S,border:`1px solid ${atom.result==='right'?GR:atom.result==='wrong'?RE:BD}`,borderRadius:16,padding:'18px 16px',fontSize:16,fontWeight:600,color:TX,marginBottom:14,lineHeight:1.8}}>
          {(atom.bad||'').split(' ').map((w,i)=><span key={i} onClick={()=>{
            if(atom.phase2||atom.result)return
            if(i===atom.wrongIdx){
              SFX.tap()
              const ops=[atom.rightWord,...atom.decoys.slice(0,2)].sort(()=>Math.random()-0.5)
              setAtom(a=>({...a,phase2:true,options:ops}))
            }else setAtom(a=>({...a,missTap:(a.missTap||0)+1}))
          }} style={{cursor:atom.phase2?'default':'pointer',padding:'2px 4px',borderRadius:6,background:atom.phase2&&i===atom.wrongIdx?`${GD}22`:'transparent',borderBottom:!atom.phase2?`1px dotted ${BD}`:i===atom.wrongIdx?`2px solid ${GD}`:'none',color:atom.result&&i===atom.wrongIdx?(atom.result==='right'?GR:RE):TX}}>{atom.result==='right'&&i===atom.wrongIdx?atom.rightWord:w} </span>)}
        </div>
        {atom.missTap>=2&&!atom.phase2&&<div style={{fontSize:11,color:GD,marginBottom:10}}>💡 Olha o tempo verbal…</div>}
        {atom.phase2&&!atom.result&&<div style={{display:'flex',gap:8}}>
          {atom.options.map((op,i)=><button key={i} onClick={async()=>{
            const right=op===atom.rightWord
            setAtom(a=>({...a,result:right?'right':'wrong'}))
            await logEvent(item,right?((atom.missTap||0)>=2?3:4):1,'conserta')
            setTimeout(advance,right?650:1900)
          }} style={{flex:1,padding:'13px 6px',background:S2,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:FONT}}>{op}</button>)}
        </div>}
        {atom.result==='wrong'&&<div style={{fontSize:12,color:TX}}>Era <b style={{color:AC}}>{atom.rightWord}</b>: {item.pt}</div>}
      </div>}

      {atom.type==='monta'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:8}}>Build ANY true sentence using these bricks:</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
          {atom.bricks.map((b,i)=><span key={i} style={{background:i===0?`${AC}18`:S,border:`1.5px solid ${i===0?AC+'66':BD}`,borderRadius:10,padding:'8px 12px',fontSize:14,fontWeight:700,color:i===0?AC:TX}}>{b}</span>)}
        </div>
        <textarea value={atom.answer} onChange={e=>setAtom(a=>({...a,answer:e.target.value}))} disabled={!!atom.evald&&(atom.retried||atom.evald.quality>=4)} placeholder="your sentence, your way…" style={{width:'100%',minHeight:74,background:S2,border:`1.5px solid ${atom.evald?(atom.evald.quality>=4?GR:GD):BD}`,borderRadius:14,padding:'12px 14px',fontSize:15,color:TX,fontFamily:FONT,resize:'none',boxSizing:'border-box'}}/>
        {atom.evald&&<div style={{marginTop:10,background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 14px'}}>
          <div style={{display:'flex',gap:10,marginBottom:6,fontSize:10,fontWeight:800}}>
            <span style={{color:atom.evald.meaning_ok?GR:RE}}>MEANING {atom.evald.meaning_ok?'✓':'✗'}</span>
            <span style={{color:atom.evald.grammar_ok?GR:GD}}>GRAMMAR {atom.evald.grammar_ok?'✓':'~'}</span>
            <span style={{marginLeft:'auto',color:AC}}>q{atom.evald.quality}</span>
          </div>
          <div style={{fontSize:12,color:TX,lineHeight:1.6}}>{atom.evald.tip||atom.evald.feedback}</div>
          {atom.evald.quality<5&&atom.evald.carioca_correction&&<div style={{fontSize:12,color:AC,marginTop:6}}>The Carioca way: <b>{atom.evald.carioca_correction}</b></div>}
        </div>}
        <div style={{marginTop:12}}>
          {!atom.evald?<PBtn label={atom.busy?'Checking…':'Submit'} onClick={async()=>{
            if(atom.busy||!atom.answer.trim())return
            setAtom(a=>({...a,busy:true}))
            const r=await ngFetch('ng-write-eval',{mode:'monta',bricks:atom.bricks,user_answer:atom.answer,en_prompt:item.en,scaffold_id:item.scaffold_id,stage:item.stage}).catch(()=>({quality:2,feedback:'Could not evaluate'}))
            setAtom(a=>({...a,busy:false,evald:r,firstQ:r.quality||2}))
          }}/>
          :(atom.evald.quality<=3&&!atom.retried)?<div style={{display:'flex',gap:8}}>
            <button onClick={()=>setAtom(a=>({...a,evald:null,retried:true}))} style={{flex:1,padding:'13px',background:`${GD}14`,border:`1px solid ${GD}55`,borderRadius:12,color:GD,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:FONT}}>↻ Try again</button>
            <button onClick={async()=>{await logEvent(item,atom.evald.quality,'monta');advance()}} style={{flex:1,padding:'13px',background:S2,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:FONT}}>Continue</button>
          </div>
          :<PBtn label="Continue" onClick={async()=>{
            const raw=atom.evald.quality||2
            const q=atom.retried?Math.max(atom.firstQ||1,Math.max(1,Math.round(raw-0.5))):raw
            await logEvent(item,q,'monta');advance()
          }}/>}
        </div>
      </div>}

      {atom.type==='constructor'&&<div>
        <div style={{fontSize:12,color:MU,marginBottom:8}}>Build it in Portuguese:</div>
        <div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px 16px',fontSize:15,fontWeight:700,color:TX,marginBottom:12}}>{item.en}</div>
        <textarea value={atom.answer} onChange={e=>setAtom(a=>({...a,answer:e.target.value}))} disabled={!!atom.evald&&(atom.retried||atom.evald.quality>=4)} placeholder="your sentence, your way…" style={{width:'100%',minHeight:74,background:S2,border:`1.5px solid ${atom.evald?(atom.evald.quality>=4?GR:GD):BD}`,borderRadius:14,padding:'12px 14px',fontSize:15,color:TX,fontFamily:FONT,resize:'none',boxSizing:'border-box'}}/>
        {atom.evald&&<div style={{marginTop:10,background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 14px'}}>
          <div style={{display:'flex',gap:10,marginBottom:6,fontSize:10,fontWeight:800}}>
            <span style={{color:atom.evald.meaning_ok?GR:RE}}>MEANING {atom.evald.meaning_ok?'✓':'✗'}</span>
            <span style={{color:atom.evald.grammar_ok?GR:GD}}>GRAMMAR {atom.evald.grammar_ok?'✓':'~'}</span>
            <span style={{color:atom.evald.form_ok?GR:MU}}>ACCENTS {atom.evald.form_ok?'✓':'·'}</span>
            <span style={{marginLeft:'auto',color:AC}}>q{atom.evald.quality}</span>
          </div>
          <div style={{fontSize:12,color:TX,lineHeight:1.6}}>{atom.evald.tip||atom.evald.feedback}</div>
          {atom.evald.quality<5&&atom.evald.carioca_correction&&<div style={{fontSize:12,color:AC,marginTop:6}}>The Carioca way: <b>{atom.evald.carioca_correction}</b></div>}
        </div>}
        <div style={{marginTop:12}}>
          {!atom.evald?<PBtn label={atom.busy?'Checking…':'Submit'} onClick={async()=>{
            if(atom.busy||!atom.answer.trim())return
            setAtom(a=>({...a,busy:true}))
            const r=await ngFetch('ng-write-eval',{target_pt:item.pt,user_answer:atom.answer,en_prompt:item.en,scaffold_id:item.scaffold_id,stage:item.stage}).catch(()=>({quality:2,feedback:'Não deu pra avaliar'}))
            setAtom(a=>({...a,busy:false,evald:r,firstQ:r.quality||2}))
          }}/>
          :(atom.evald.quality<=3&&!atom.retried)?<div style={{display:'flex',gap:8}}>
            <button onClick={()=>setAtom(a=>({...a,evald:null,retried:true}))} style={{flex:1,padding:'13px',background:`${GD}14`,border:`1px solid ${GD}55`,borderRadius:12,color:GD,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:FONT}}>↻ Try again</button>
            <button onClick={async()=>{await logEvent(item,atom.evald.quality,'constructor');advance()}} style={{flex:1,padding:'13px',background:S2,border:`1px solid ${BD}`,borderRadius:12,color:TX,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:FONT}}>Continue</button>
          </div>
          :<PBtn label="Continue" onClick={async()=>{
            const raw=atom.evald.quality||2
            const q=atom.retried?Math.max(atom.firstQ||1,Math.max(1,Math.round(raw-0.5))):raw
            await logEvent(item,q,'constructor');advance()
          }}/>}
        </div>
      </div>}
    </div>}
  </div>
}


// ═══ NGSetup — PRIMEIRO DIA — the resumable first-run wizard ══════════
// welcome -> seu mundo -> plantar -> organizar -> placement -> pronto.
// Every step idempotent; state persists server-side so a mid-setup quit resumes.
function Row({k,v}){return<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:13}}>
  <span style={{color:MU}}>{k}</span><span style={{color:TX,fontWeight:700}}>{v}</span></div>}
function NGSetup({isOnline,initialState,onEnterApp,onPlacement}){
  const[step,setStep]=useState(initialState==='new'?'welcome':initialState)
  const[chips,setChips]=useState([])
  const[freeText,setFreeText]=useState('')
  const[seedOut,setSeedOut]=useState(null)
  const ranRef=useRef({})

  const setServer=(state,extra={})=>ngFetch('ng-setup',{action:'set',state,...extra}).catch(()=>{})

  const CHIPS=[
    ['trabalho remoto','remote work'],['vendas','sales'],['mora no Rio','lives in Rio'],
    ['boteco & cerveja','bar life'],['praia','beach'],['futebol','football'],
    ['academia','gym'],['programador','builds apps'],['viagem','travel'],
    ['música','music'],['namoro','dating'],['gringo aprendendo','foreigner learning']]
  const toggle=c=>setChips(x=>x.includes(c)?x.filter(y=>y!==c):[...x,c])

  const composeLifeContext=()=>{
    const themes=chips.map(c=>CHIPS.find(x=>x[0]===c)?.[1]||c).join('; ')
    const free=freeText.trim()
    return`Principles, not private names: this learner learns through their OWN real life. Themes: ${themes||'general Rio life'}.${free?` In their words: ${free}`:''} Draw scenarios from these THEMES — never invent private people or relationships.`
  }

  // ── PLANTING: seed spine directly + cluster wilds in one call ──
  useEffect(()=>{
    if(step!=='planting'&&step!=='organizing')return
    if(ranRef.current[step])return
    ranRef.current[step]=true
    if(step==='planting'){
      // fire the combined seed (direct plant + wild cluster) once
      ngFetch('ng-seed-trilha',{cluster_wilds:true})
        .then(r=>{setSeedOut(r||{});setServer('organizing');setStep('organizing')})
        .catch(()=>{setSeedOut({});setServer('organizing');setStep('organizing')})
    }
  },[step])

  const box={maxWidth:440,margin:'0 auto',padding:'0 22px'}

  if(step==='welcome')return<div style={{...box,paddingTop:80,animation:'up 0.4s ease'}}>
    <div style={{textAlign:'center'}}><Poste size={54}/></div>
    <div style={{fontSize:28,fontWeight:900,color:TX,fontFamily:FONTD,textAlign:'center',marginTop:20}}>Welcome to Carioca</div>
    <div style={{fontSize:14,color:MU,textAlign:'center',lineHeight:1.7,margin:'12px 0 30px'}}>
      30 minutos por dia. Português de verdade — o do bar, da praia, da rua. Não é sala de aula.
      Vamos montar tudo em 5 passos rápidos.
    </div>
    <PBtn label="Let's go" onClick={()=>{SFX.tap();setServer('world');setStep('world')}}/>
  </div>

  if(step==='world')return<div style={{...box,paddingTop:56,animation:'up 0.4s ease'}}>
    <div style={{fontSize:10,color:GD,fontWeight:800,letterSpacing:2,marginBottom:6}}>STEP 1 OF 5 · YOUR WORLD</div>
    <div style={{fontSize:22,fontWeight:800,color:TX,fontFamily:FONTD,marginBottom:8}}>What's part of your life?</div>
    <div style={{fontSize:12.5,color:MU,lineHeight:1.6,marginBottom:18}}>Tap what describes you. Every scene, conversation and exercise will come from YOUR world — no names, just themes.</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:18}}>
      {CHIPS.map(([c])=><button key={c} onClick={()=>toggle(c)} style={{padding:'9px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:FONT,
        background:chips.includes(c)?AC:S,border:`1px solid ${chips.includes(c)?AC:BD}`,color:chips.includes(c)?'#16240f':TX}}>{c}</button>)}
    </div>
    <textarea value={freeText} onChange={e=>setFreeText(e.target.value)} placeholder="algo mais? (opcional) — ex: trabalho com cripto, tenho um cachorro…"
      style={{width:'100%',minHeight:60,background:S2,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 14px',fontSize:14,color:TX,fontFamily:FONT,resize:'none',boxSizing:'border-box',marginBottom:18}}/>
    <PBtn label="Continue" onClick={()=>{SFX.tap();setServer('planting',{life_context:composeLifeContext()});setStep('planting')}}/>
    <div style={{textAlign:'center',marginTop:10}}><button onClick={()=>{setServer('planting',{life_context:composeLifeContext()});setStep('planting')}} style={{background:'none',border:'none',color:MU,fontSize:12,cursor:'pointer',fontFamily:FONT}}>skip for now</button></div>
  </div>

  if(step==='planting')return<div style={{...box,paddingTop:150,textAlign:'center'}}>
    <div style={{animation:'float 2s ease-in-out infinite',display:'inline-block'}}><Poste size={44}/></div>
    <div style={{fontSize:10,color:GD,fontWeight:800,letterSpacing:2,margin:'20px 0 8px'}}>STEP 2 OF 5 · PLANTING</div>
    <div style={{fontSize:16,fontWeight:700,color:TX,fontFamily:FONTD}}>Planting your curriculum…</div>
    <div style={{fontSize:12,color:MU,marginTop:8,lineHeight:1.6}}>25 units — from survival to the Máquina do Tempo —<br/>plus everything already in your bank, organized.</div>
    <div style={{marginTop:20}}><Spinner size={18}/></div>
  </div>

  if(step==='organizing')return<div style={{...box,paddingTop:70,animation:'up 0.4s ease'}}>
    <div style={{textAlign:'center',fontSize:44}}>🗺️</div>
    <div style={{fontSize:10,color:GD,fontWeight:800,letterSpacing:2,textAlign:'center',margin:'14px 0 6px'}}>STEP 3 OF 5 · ORGANIZED</div>
    <div style={{fontSize:22,fontWeight:800,color:TX,fontFamily:FONTD,textAlign:'center',marginBottom:14}}>Your path is ready</div>
    <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'16px 18px',marginBottom:8}}>
      <Row k="Espinha dorsal" v={`${seedOut?.units||25} unidades`}/>
      <Row k="Padrões plantados" v={`${(seedOut?.planted||0)+(seedOut?.attached||0)}`}/>
      {seedOut?.wild_units>0&&<Row k="Missões extras (da rua)" v={`${seedOut.wild_units} unidades · ${seedOut.wild_patterns} padrões`}/>}
    </div>
    <div style={{fontSize:11.5,color:MU,lineHeight:1.6,marginBottom:20,textAlign:'center'}}>The spine is curated and fixed. The side quests are everything you already had, grouped by situation — optional, explorable.</div>
    <PBtn label="Continue" onClick={()=>{SFX.tap();setServer('placement');setStep('placement')}}/>
  </div>

  if(step==='placement')return<div style={{...box,paddingTop:70,animation:'up 0.4s ease'}}>
    <div style={{textAlign:'center',fontSize:42}}>📍</div>
    <div style={{fontSize:10,color:GD,fontWeight:800,letterSpacing:2,textAlign:'center',margin:'14px 0 6px'}}>STEP 4 OF 5 · FIRST SESSION</div>
    <div style={{fontSize:22,fontWeight:800,color:TX,fontFamily:FONTD,textAlign:'center',marginBottom:10}}>Your first session</div>
    <div style={{fontSize:13,color:MU,lineHeight:1.7,textAlign:'center',marginBottom:8}}>No placement test, no level lock. Your first real session starts gently and the engine learns you from actual reps.</div>
    <div style={{fontSize:11,color:MU,opacity:0.75,textAlign:'center',marginBottom:24}}>Nothing here ever assumes what you know — and never blocks what you want to reach for.</div>
    <PBtn label="▶ Start your first session" onClick={()=>{SFX.tap();setServer('done');onPlacement()}}/>
    <div style={{textAlign:'center',marginTop:10}}><button onClick={()=>{setServer('done');onEnterApp()}} style={{background:'none',border:'none',color:MU,fontSize:12,cursor:'pointer',fontFamily:FONT}}>later</button></div>
  </div>

  return null
}

function NGHome({isOnline,go,active=true}){
  const[coachNote,setCoachNote]=useState('')
  const[phase,setPhase]=useState({n:1,name:'Survival → Social',controlled:0,due:0})
  const[currentUnit,setCurrentUnit]=useState(null)
  const[brainLine,setBrainLine]=useState(null)
  const[loading,setLoading]=useState(true)
  const[milestone,setMilestone]=useState(null)
  const[pendCount,setPendCount]=useState(0)

  useEffect(()=>{
    if(!active||!isOnline){setLoading(false);return}
    prefetchGuided() // flow-first: today's session is ready before it's asked for
    // Three light parallel reads — no frontier list, no legacy recommendation
    ngFetch('ng-frontier').then(d=>{
      setPhase({n:d.phase||1,name:d.phase_name||'Survival → Social',
        controlled:d.total_controlled||0,due:d.review_count||0,
        streak:(d.streak&&d.streak.count)||0})
      setLoading(false)
    }).catch(()=>setLoading(false))
    ngFetch('ng-today',{action:'get'}).then(t=>{if(t?.coach_note)setCoachNote(t.coach_note)}).catch(()=>{})
    ngFetch('ng-path',{action:'get'}).then(d=>{
      const us=Array.isArray(d?.units)?d.units:[]
      setCurrentUnit(us.find(u=>u.status==='current'||u.status==='in_progress')||us[0]||null)
      // Aula prefetch: generate the active unit's lesson pack NOW, in the
      // background, so first-open pays cache instead of ~10s of Sonnet.
      const cur=us.find(u=>u.status==='current'||u.status==='in_progress')
      if(cur)ngFetch('ng-lesson-gen',{unit_id:cur.unit_id}).catch(()=>{})
    }).catch(()=>{})
    if(sb)sb.from('ng_brain_log').select('process,thought,created_at')
      .eq('user_id','00000000-0000-0000-0000-000000000001')
      .order('created_at',{ascending:false}).limit(1)
      .then(({data})=>{if(data?.[0])setBrainLine(data[0])})
    if(sb)sb.from('ng_milestones').select('*')
      .eq('user_id','00000000-0000-0000-0000-000000000001')
      .eq('seen',false).order('created_at').limit(1)
      .then(({data})=>{if(data?.[0])setMilestone(data[0])})
  },[active,isOnline])

  const dismissMilestone=()=>{
    if(milestone&&sb)sb.from('ng_milestones').update({seen:true}).eq('id',milestone.id).then(()=>{})
    setMilestone(null)
  }

  // Smart continue: due reviews → current unit → mix deck
  const continueTarget=phase.due>=5?{label:`◌ Clear ${phase.due} reviews`,go:'ng-study'}
    :currentUnit?{label:`▶ ${currentUnit.emoji} ${currentUnit.title}`,unit:currentUnit}
    :{label:'🎲 Learn a bit of everything',go:'ng-study'}

  if(loading)return<div style={{padding:'100px 24px',textAlign:'center'}}><Spinner size={24}/></div>

  return<div style={{padding:'0 0 100px',animation:'up 0.4s ease'}}>
    {/* Brand row — o poste */}
    <div style={{padding:'54px 20px 0',display:'flex',alignItems:'center',gap:9,animation:'popIn 0.55s cubic-bezier(0.34,1.56,0.64,1)'}}>
      <Poste size={26}/>
      <span style={{fontSize:10.5,letterSpacing:4.5,color:MU,fontWeight:700,fontFamily:FONTD}}>CARIOCA</span>
    </div>
    <div style={{margin:'10px 20px 0',height:2,borderRadius:2,background:'linear-gradient(90deg,#009C3B 0%,#ffd52e 30%,#3d7bff 50%,#ffd52e 70%,#009C3B 100%)',opacity:0.55}}/>

    {/* Milestone toast */}
    {milestone&&<div onClick={dismissMilestone} style={{margin:'14px 20px 0',background:`${GD}10`,border:`1px solid ${GD}44`,borderRadius:16,padding:'14px 16px',cursor:'pointer',animation:'popIn 0.5s ease'}}>
      <div style={{fontSize:11,color:GD,fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>★ {milestone.title||'Milestone'}</div>
      <div style={{fontSize:13,color:TX,lineHeight:1.6}}>{milestone.message||milestone.description||''}</div>
    </div>}

    {/* Header: greeting + phase */}
    <div style={{padding:'14px 20px 6px',display:'flex',alignItems:'center',gap:14}}>
      {phase.streak>=2&&<div style={{position:'absolute',right:20,top:12,background:`${GD}12`,border:`1px solid ${GD}44`,borderRadius:14,padding:'4px 10px',fontSize:11.5,fontWeight:800,color:GD}}>🔥 {phase.streak}</div>}
      <div style={{flex:1}}>
        <div style={{fontSize:26,fontWeight:900,color:TX,fontFamily:FONTD}}>E aí</div>
        <div style={{fontSize:12,color:MU,marginTop:2}}>Phase {phase.n} · {phase.name}</div>
      </div>
      <div style={{textAlign:'center',flexShrink:0}}>
        <div style={{fontSize:22,fontWeight:900,color:AC,fontFamily:FONTD}}>{phase.controlled}</div>
        <div style={{fontSize:9,color:MU,letterSpacing:1}}>CONTROLLED</div>
      </div>
    </div>

    {/* Coach's note — from the nightly brain */}
    {coachNote&&<div onClick={()=>go&&go('ng-today')} style={{margin:'14px 20px 0',background:`${AC}0d`,border:`1px solid ${AC}33`,borderRadius:16,padding:'14px 16px',cursor:'pointer'}}>
      <div style={{fontSize:9,color:AC,fontWeight:700,letterSpacing:2,textTransform:'uppercase',marginBottom:6}}>Coach's note · tap for today</div>
      <div style={{fontSize:13.5,color:TX,lineHeight:1.7}}>{coachNote}</div>
    </div>}

    {/* CONTINUE — the one big button */}
    <div style={{margin:'16px 20px 0'}}>
      <button onClick={()=>{SFX.tap();go('ng-treino')}} style={{width:'100%',padding:'15px 18px',background:`${GR}14`,border:`1.5px solid ${GR}66`,borderRadius:18,cursor:'pointer',fontFamily:FONT,marginBottom:10,textAlign:'left'}}>
        <span style={{display:'block',fontSize:10,color:GR,fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>▶ Daily Training</span>
        <span style={{display:'block',fontSize:15,color:TX,fontWeight:700}}>Opens straight into today's session</span>
      </button>
      <button onClick={()=>{SFX.tap();go('ng-oficina')}} style={{width:'100%',padding:'11px 18px',background:S,border:`1px solid ${BD}`,borderRadius:14,cursor:'pointer',fontFamily:FONT,marginBottom:10,textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:12.5,color:TX,fontWeight:600}}>🛠 Sentence Workshop</span>
        <span style={{fontSize:10,color:MU}}>free construction · 8 sentences</span>
      </button>
      <button onClick={()=>{SFX.tap();if(continueTarget.unit){go&&go('__unit:'+continueTarget.unit.unit_id+':'+encodeURIComponent(continueTarget.unit.title))}else{go&&go(continueTarget.go)}}}
        style={{width:'100%',padding:'18px',background:`linear-gradient(135deg,${AC},#e6a900)`,border:'none',borderRadius:18,cursor:'pointer',fontFamily:FONT,animation:`ringGlow ${phase.due>=8?1.6:phase.due>=4?2.2:3.2}s ease-in-out infinite`}}>
        <span style={{display:'block',fontSize:10,color:'#16240fbb',fontWeight:800,letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>Continue</span>
        <span style={{display:'block',fontSize:16,color:'#14230e',fontWeight:800}}>{continueTarget.label}</span>
      </button>
    </div>

    {pendCount>0&&<div onClick={()=>go&&go('ng-map')} style={{margin:'12px 20px 0',display:'flex',alignItems:'center',gap:9,background:`${GD}0c`,border:`1px solid ${GD}44`,borderRadius:14,padding:'10px 14px',cursor:'pointer'}}>
      <span style={{fontSize:14}}>📥</span>
      <span style={{flex:1,fontSize:12.5,color:TX,fontWeight:600}}>{pendCount} sugest{pendCount===1?'ão':'ões'} esperando seu veredito</span>
      <span style={{fontSize:11,color:GD,fontWeight:700}}>revisar →</span>
    </div>}

    {/* Live tiles */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,margin:'14px 20px 0'}}>
      <div onClick={()=>go&&go('ng-learn')} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'14px',cursor:'pointer'}}>
        <div style={{fontSize:20,marginBottom:6}}>⛰</div>
        <div style={{fontSize:13,fontWeight:800,color:TX}}>Path</div>
        <div style={{fontSize:11,color:MU,marginTop:2}}>{currentUnit?`${currentUnit.title} · ${currentUnit.pct||0}%`:'Building…'}</div>
        {currentUnit&&<div style={{height:3,background:BD,borderRadius:3,overflow:'hidden',marginTop:8}}>
          <div style={{height:'100%',width:`${currentUnit.pct||0}%`,background:AC,borderRadius:3}}/>
        </div>}
      </div>
      <div onClick={()=>go&&go('ng-study')} style={{background:S,border:`1px solid ${phase.due?YE+'44':BD}`,borderRadius:16,padding:'14px',cursor:'pointer'}}>
        <div style={{fontSize:20,marginBottom:6}}>◌</div>
        <div style={{fontSize:13,fontWeight:800,color:TX}}>Reviews</div>
        <div style={{fontSize:11,color:phase.due?YE:MU,marginTop:2}}>{phase.due?`${phase.due} lights blinking — Chico doubts you`:"Nothing due. Even I'm surprised ✓"}</div>
      </div>
      <div onClick={()=>go&&go('ng-radio')} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'14px',cursor:'pointer'}}>
        <div style={{fontSize:20,marginBottom:6}}>📻</div>
        <div style={{fontSize:13,fontWeight:800,color:TX}}>Rádio Carioca</div>
        <div style={{fontSize:11,color:MU,marginTop:2}}>Chico & Bia · always on air</div>
      </div>
      <div onClick={()=>go&&go('ng-voice')} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'14px',cursor:'pointer'}}>
        <div style={{fontSize:20,marginBottom:6}}>◉</div>
        <div style={{fontSize:13,fontWeight:800,color:TX}}>Luna</div>
        <div style={{fontSize:11,color:MU,marginTop:2}}>Come talk to me</div>
      </div>
    </div>

    {/* Brain ticker */}
    {brainLine&&<div onClick={()=>go&&go('ng-brain')} style={{margin:'14px 20px 0',display:'flex',gap:10,alignItems:'flex-start',background:S2,border:`1px solid ${BD}`,borderRadius:14,padding:'11px 14px',cursor:'pointer'}}>
      <span style={{fontSize:13,flexShrink:0}}>🧠</span>
      <div style={{flex:1,fontSize:11.5,color:MU,lineHeight:1.55,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{brainLine.thought}</div>
    </div>}
  </div>
}
function NGFieldReport({isOnline,onBack}){
  const[text,setText]=useState('')
  const[phase,setPhase]=useState('input') // input|mining|review|done
  const[suggestions,setSuggestions]=useState([])
  const[decisions,setDecisions]=useState({})
  const[unlockScaffold,setUnlockScaffold]=useState(null)
  const[addedCount,setAddedCount]=useState(0)

  const submit=async()=>{
    if(!text.trim()||!isOnline)return
    setPhase('mining')
    try{
      const data=await ngFetch('ng-field-report',{text:text.trim()})
      if(data.suggestions?.length){
        setSuggestions(data.suggestions)
        setDecisions({})
        setPhase('review')
      }else{
        setPhase('done')
      }
    }catch{setPhase('done')}
  }

  const confirmDecisions=async()=>{
    const approved=suggestions.filter((_,i)=>decisions[i]===true)
    if(approved.length){
      await ngFetch('ng-field-report',{approvedScaffolds:approved}).catch(()=>{})
      setAddedCount(approved.length)
      if(approved[0])setUnlockScaffold(approved[0])
    }
    setPhase('done')
  }

  const allDecided=suggestions.length>0&&suggestions.every((_,i)=>decisions[i]!==undefined)

  if(phase==='mining')return<div style={{padding:'80px 24px',textAlign:'center'}}>
    <Spinner size={24}/>
    <div style={{fontSize:14,color:TX,fontWeight:600,marginTop:16}}>Reading your report…</div>
    <div style={{fontSize:12,color:MU,marginTop:6}}>Mining for patterns worth learning</div>
  </div>

  if(phase==='review')return<div style={{padding:'52px 24px 100px',animation:'up 0.35s ease'}}>
    {unlockScaffold&&<ScaffoldUnlockAnimation scaffold={unlockScaffold} onComplete={()=>setUnlockScaffold(null)}/>}
    <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:4}}>Found {suggestions.length} pattern{suggestions.length!==1?'s':''} from the street</div>
    <div style={{fontSize:13,color:MU,marginBottom:20}}>Real conversations are the best teacher. Add the ones worth learning.</div>
    {suggestions.map((sc,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px',marginBottom:10}}>
      <div style={{fontSize:15,fontWeight:700,color:TX,marginBottom:2}}>{sc.base_portuguese}</div>
      <div style={{fontSize:12,color:MU,marginBottom:6}}>{sc.base_english}</div>
      {sc.reason&&<div style={{fontSize:11,color:YE,marginBottom:8,fontStyle:'italic'}}>{sc.reason}</div>}
      {sc.stages?.slice(0,2).map((st,j)=><div key={j} style={{fontSize:11,color:MU,paddingLeft:8,borderLeft:`2px solid ${BD}`,marginBottom:3}}>
        Stage {st.stage}: {st.pt}
      </div>)}
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button onClick={()=>setDecisions(d=>({...d,[i]:true}))}
          style={{flex:1,padding:'9px',background:decisions[i]===true?`${GR}20`:S2,border:`1px solid ${decisions[i]===true?GR+'44':BD}`,borderRadius:10,cursor:'pointer',fontFamily:FONT,fontSize:12,color:decisions[i]===true?GR:TX,fontWeight:600}}>
          {decisions[i]===true?'✓ Learn it':'Learn it'}
        </button>
        <button onClick={()=>setDecisions(d=>({...d,[i]:false}))}
          style={{flex:1,padding:'9px',background:decisions[i]===false?`${RE}12`:S2,border:`1px solid ${decisions[i]===false?RE+'33':BD}`,borderRadius:10,cursor:'pointer',fontFamily:FONT,fontSize:12,color:decisions[i]===false?RE:MU}}>
          {decisions[i]===false?'✗ Skip':'Skip'}
        </button>
      </div>
    </div>)}
    {allDecided&&<PBtn label="Confirm" onClick={confirmDecisions}/>}
  </div>

  if(phase==='done')return<div style={{padding:'60px 24px',textAlign:'center',animation:'up 0.3s ease'}}>
    {unlockScaffold&&<ScaffoldUnlockAnimation scaffold={unlockScaffold} onComplete={()=>setUnlockScaffold(null)}/>}
    <div style={{fontSize:40,marginBottom:16}}>✓</div>
    <div style={{fontSize:18,fontWeight:700,color:TX}}>Report saved</div>
    <div style={{fontSize:13,color:MU,marginTop:8}}>
      {addedCount>0?`${addedCount} new pattern${addedCount!==1?'s':''} added to your bank. `:''}Luna will know about this next session.
    </div>
    <div style={{marginTop:24}}>
      <PBtn label="Done" onClick={onBack}/>
    </div>
  </div>

  return<div style={{padding:'52px 24px 100px',animation:'up 0.35s ease'}}>
    <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,marginBottom:20,padding:0}}>← Back</button>
    <div style={{fontSize:22,fontWeight:800,color:TX,marginBottom:6}}>Field Report</div>
    <div style={{fontSize:13,color:MU,marginBottom:24,lineHeight:1.7}}>Had a real conversation in Portuguese? What happened? What did you try to say? What couldn't you say? I'll mine it for patterns worth learning — and Luna reads it before your next session.</div>
    <textarea
      value={text}
      onChange={e=>setText(e.target.value)}
      placeholder={"Tonight at the bar I tried to ask for the bill but froze — ended up pointing. The bartender said something like 'fechou a conta' and I didn't know how to respond…"}
      style={{width:'100%',minHeight:180,background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px',color:TX,fontSize:14,outline:'none',resize:'none',fontFamily:FONT,lineHeight:1.7,marginBottom:14}}
    />
    <PBtn label={isOnline?'Save + mine for patterns →':'Needs connection'} onClick={submit} disabled={!text.trim()||!isOnline}/>
  </div>
}
function NGIntelligence({isOnline,onBack}){
  const GREETING={role:'assistant',content:"Hey. I'm Luna — the intelligence layer. Ask me anything about your learning. Where you are, what you're struggling with, what I'm planning. I'll be straight with you."}
  const[messages,setMessages]=useState([GREETING])
  const[historyLoaded,setHistoryLoaded]=useState(false)

  // Restore last conversation on mount — Intel remembers
  useEffect(()=>{
    if(!isOnline||historyLoaded)return
    setHistoryLoaded(true)
    ngFetch('ng-intelligence',{action:'loadHistory'}).then(d=>{
      if(Array.isArray(d.messages)&&d.messages.length){
        setMessages([
          ...d.messages.slice(-20),
          {role:'system',content:'— new conversation —'}
        ])
      }
    }).catch(()=>{})
  },[isOnline])

  // Persist conversation after every exchange
  const persistConversation=(msgs)=>{
    if(!isOnline)return
    const toSave=msgs.filter(m=>m.role!=='system')
    ngFetch('ng-intelligence',{action:'saveSession',messages:toSave}).catch(()=>{})
  }
  const[input,setInput]=useState('')
  const[loading,setLoading]=useState(false)
  const scrollRef=useRef()

  useEffect(()=>{
    if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight
  },[messages])

  const send=async()=>{
    const msg=input.trim()
    if(!msg||loading||!isOnline)return
    const userMsg={role:'user',content:msg}
    const newMessages=[...messages,userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try{
      const data=await ngFetch('ng-intelligence',{
        messages:newMessages.map(m=>({role:m.role,content:m.content})),
        extractInsights:newMessages.length>=6
      })
      setMessages(prev=>{
        const updated=[...prev,{role:'assistant',content:data.reply||'Something went wrong.'}]
        persistConversation(updated)
        return updated
      })
    }catch{
      setMessages(prev=>[...prev,{role:'assistant',content:'Could not reach the server. Try again.'}])
    }
    setLoading(false)
  }

  const[showHealth,setShowHealth]=useState(false)
  const[health,setHealth]=useState(null)
  const[healthLoading,setHealthLoading]=useState(false)
  const[showReset,setShowReset]=useState(false)
  const[resetting,setResetting]=useState(false)

  const loadHealth=async()=>{
    setHealthLoading(true)
    setShowHealth(true)
    try{
      const data=await ngFetch('ng-sync-health')
      setHealth(data)
    }catch(e){setHealth({error:e.message})}
    setHealthLoading(false)
  }

  const doReset=async()=>{
    setResetting(true)
    try{
      const result=await ngFetch('ng-reset',{confirmed:true})
      if(result.ok){
        setShowReset(false)
        setMessages([{role:'assistant',content:'Progress cleared — '+result.scaffolds_reset+' patterns reset. Taking you to the fresh start…'}])
        setTimeout(()=>{try{window.location.reload()}catch(_){}},1400)
      }
    }catch(e){console.warn('Reset error:',e)}
    setResetting(false)
  }

  return<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
    <div style={{padding:'12px 20px',borderBottom:`1px solid ${BD}`,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:TX}}>Intelligence</div>
          <div style={{fontSize:11,color:MU,marginTop:1}}>Talk to Luna about your learning</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={loadHealth} style={{fontSize:11,color:MU,background:S2,border:`1px solid ${BD}`,borderRadius:8,padding:'5px 10px',cursor:'pointer',fontFamily:FONT}}>⚡ Health</button>
          <button onClick={()=>setShowReset(true)} style={{fontSize:11,color:RE,background:`${RE}12`,border:`1px solid ${RE}33`,borderRadius:8,padding:'5px 10px',cursor:'pointer',fontFamily:FONT}}>↺ Reset</button>
        </div>
      </div>

      {/* Sync Health Panel */}
      {showHealth&&<div style={{marginTop:10,background:S2,borderRadius:10,padding:'12px',fontSize:11,color:MU,lineHeight:1.8,maxHeight:200,overflowY:'auto'}}>
        {healthLoading&&<div>Loading health data…</div>}
        {health&&!health.error&&<>
          <div style={{color:TX,fontWeight:700,marginBottom:4}}>System Health</div>
          <div>Phase: {health.phase} — {health.phase_name} ({health.phase_progress_pct}%)</div>
          <div>Stages controlled: {health.stages_controlled} | Scaffolds complete: {health.scaffolds_fully_controlled}</div>
          <div>Total events: {health.total_events} | By mode: {JSON.stringify(health.events_by_mode)}</div>
          <div>Frontier: {health.frontier_size} items | Review queue: {health.review?.length||0}</div>
          <div>Last session: {health.last_session?new Date(health.last_session).toLocaleString():'never'}</div>
          <div>Luna notes: {health.luna_notes?health.luna_notes.slice(0,80)+'…':'none'}</div>
          <div>Error fingerprint: {JSON.stringify(health.error_fingerprint)}</div>
          <div>Write errors: {health.write_errors||0}</div>
          <div style={{color:health.write_errors>0?RE:GR}}>Status: {health.write_errors>0?'⚠ Write errors detected':'✓ Clean'}</div>
        </>}
        {health?.error&&<div style={{color:RE}}>Error: {health.error}</div>}
        <button onClick={()=>setShowHealth(false)} style={{marginTop:6,fontSize:10,color:MU,background:'none',border:'none',cursor:'pointer',fontFamily:FONT}}>Close</button>
      </div>}

      {/* Reset Confirm */}
      {showReset&&<div style={{marginTop:10,background:`${RE}12`,border:`1px solid ${RE}33`,borderRadius:10,padding:'12px'}}>
        <div style={{fontSize:13,color:TX,fontWeight:600,marginBottom:4}}>Reset all Next Gen progress?</div>
        <div style={{fontSize:11,color:MU,marginBottom:10}}>Clears all events, controlled stages, Luna notes, milestones. Scaffold bank stays intact.</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={doReset} disabled={resetting} style={{fontSize:12,color:'#fff',background:RE,border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontFamily:FONT,opacity:resetting?0.5:1}}>
            {resetting?'Resetting…':'Yes, reset everything'}
          </button>
          <button onClick={()=>setShowReset(false)} style={{fontSize:12,color:MU,background:S2,border:`1px solid ${BD}`,borderRadius:8,padding:'6px 14px',cursor:'pointer',fontFamily:FONT}}>Cancel</button>
        </div>
      </div>}
    </div>

    <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
      {messages.map((m,i)=>{
        if(m.role==='system')return<div key={i} style={{textAlign:'center',padding:'8px 0',fontSize:11,color:MU,opacity:0.5}}>{m.content}</div>
        const isLuna=m.role==='assistant'
        return<div key={i} style={{display:'flex',flexDirection:'column',alignItems:isLuna?'flex-start':'flex-end'}}>
          <div style={{maxWidth:'88%',padding:'12px 16px',borderRadius:isLuna?'18px 18px 18px 4px':'18px 18px 4px 18px',background:isLuna?S:AC,border:isLuna?`1px solid ${BD}`:'none',fontSize:14,lineHeight:1.65,color:isLuna?TX:'#fff'}}>
            {m.content}
          </div>
        </div>
      })}
      {loading&&<div style={{alignSelf:'flex-start'}}>
        <div style={{padding:'12px 16px',background:S,border:`1px solid ${BD}`,borderRadius:'18px 18px 18px 4px'}}>
          <Spinner size={14}/>
        </div>
      </div>}
    </div>

    <div style={{padding:'8px 16px',paddingBottom:'max(16px,env(safe-area-inset-bottom))',borderTop:`1px solid ${BD}`,display:'flex',gap:8,flexShrink:0,background:BG}}>
      <input
        value={input}
        onChange={e=>setInput(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
        placeholder="Ask anything about your progress…"
        style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 14px',color:TX,fontSize:14,outline:'none',fontFamily:FONT,minWidth:0}}
      />
      <button
        onClick={send}
        disabled={!input.trim()||loading||!isOnline}
        style={{background:AC,color:'#fff',border:'none',borderRadius:12,padding:'12px 16px',fontSize:16,cursor:'pointer',opacity:input.trim()&&!loading&&isOnline?1:0.4,fontFamily:FONT,flexShrink:0}}
      >→</button>
    </div>
  </div>
}

export default function App(){
  // Calçadão: nextgen IS the app. The classic app, its card pipeline and the
  // mode picker were culled — one brain, one write path, no decision toll-booth.
  const[ngScreen,setNgScreen]=useState('ng-home')
  const[showMore,setShowMore]=useState(false)
  const[studySeed,setStudySeed]=useState(null) // {deck:'unit',unit_id,title} from Learn
  const[aulaUnit,setAulaUnit]=useState(null)
  const[treinoSeedDeck,setTreinoSeedDeck]=useState(null)
  const[isOnline,setIsOnline]=useState(navigator.onLine)
  const[setupState,setSetupState]=useState(null) // null=checking, 'done'=skip wizard, else step
  useEffect(()=>{
    if(!isOnline){return}
    ngFetch('ng-setup',{action:'status'}).then(r=>setSetupState(r?.state||'done')).catch(()=>setSetupState('done'))
  },[isOnline])

  // Always-on brain: heartbeat ping on load + every 5 min while app is open
  useEffect(()=>{
    if(!isOnline)return
    ngFetch('ng-heartbeat',{}).catch(()=>{})
    const hb=setInterval(()=>{ngFetch('ng-heartbeat',{}).catch(()=>{})},5*60*1000)
    return()=>clearInterval(hb)
  },[isOnline])

  useEffect(()=>{const s=document.createElement('style');s.textContent=CSS;document.head.appendChild(s);return()=>document.head.removeChild(s)},[])

  useEffect(()=>{
    const goOnline=()=>setIsOnline(true)
    const goOffline=()=>setIsOnline(false)
    window.addEventListener('online',goOnline)
    window.addEventListener('offline',goOffline)
    return()=>{window.removeEventListener('online',goOnline);window.removeEventListener('offline',goOffline)}
  },[])

  // PRIMEIRO DIA gate — the wizard owns the screen until setup completes.
  if(isOnline&&setupState&&setupState!=='done'){
    return<div style={{background:`radial-gradient(1100px 520px at 50% -8%,rgba(255,213,46,0.05),transparent 60%),linear-gradient(#0a1a10,${BG})`,minHeight:'100vh',maxWidth:480,margin:'0 auto',fontFamily:FONT,color:TX}}>
      <ErrorBoundary>
        <NGSetup isOnline={isOnline} initialState={setupState}
          onEnterApp={()=>{setSetupState('done');setNgScreen('ng-home')}}
          onPlacement={()=>{setSetupState('done');setNgScreen('ng-treino')}}/>
      </ErrorBoundary>
    </div>
  }
  return<div style={{background:`radial-gradient(1100px 520px at 50% -8%,rgba(255,213,46,0.05),transparent 60%),linear-gradient(#0a1a10,${BG})`,minHeight:'100vh',maxWidth:480,margin:'0 auto',fontFamily:FONT,color:TX}}>
    <ErrorBoundary>
    {/* Mount-all for screens that preserve state between visits */}
    <div style={{display:ngScreen==='ng-home'?'block':'none'}}><NGHome isOnline={isOnline} active={ngScreen==='ng-home'} go={k=>{
      if(typeof k==='string'&&k.startsWith('__unit:')){
        const[,uid,title]=k.split(':')
        setStudySeed({deck:'unit',unit_id:uid,title:decodeURIComponent(title||'')})
        setNgScreen('ng-study');return
      }
      setNgScreen(k)
    }}/></div>
    <div style={{display:ngScreen==='ng-intelligence'?'block':'none'}}><NGIntelligence isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/></div>
    <div style={{display:ngScreen==='ng-phrase'?'block':'none'}}><NGPhrase isOnline={isOnline} onBack={()=>setNgScreen('ng-home')} active={ngScreen==='ng-phrase'}/></div>
    {/* Conditional — fresh each visit */}
    {ngScreen==='ng-treino'&&<NGTreino isOnline={isOnline} seedDeck={treinoSeedDeck} onBack={()=>{setTreinoSeedDeck(null);setNgScreen('ng-home')}}/>}
    {ngScreen==='ng-aula'&&<NGAula isOnline={isOnline} unit={aulaUnit} onBack={()=>setNgScreen('ng-learn')}/>}
    {ngScreen==='ng-oficina'&&<NGOficina isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
    {ngScreen==='ng-voice'&&<VoiceMode isOnline={isOnline} ngMode={true}/>}
    {ngScreen==='ng-field-report'&&<NGFieldReport isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
    {ngScreen==='ng-study'&&<NGFlashCards isOnline={isOnline} onBack={()=>setNgScreen('ng-home')} seed={studySeed} clearSeed={()=>setStudySeed(null)} goTreinoGrammar={()=>{setTreinoSeedDeck('grammar');setNgScreen('ng-treino')}}/>}
    {ngScreen==='ng-map'&&<NGScaffoldMap isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
    {ngScreen==='ng-shuffle'&&<NGShuffle isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
    {ngScreen==='ng-import'&&<NGImport isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
    {ngScreen==='ng-today'&&<NGToday isOnline={isOnline} onBack={()=>setNgScreen('ng-home')} goTo={setNgScreen}/>}
    {ngScreen==='ng-radio'&&<NGRadio isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
    {ngScreen==='ng-brain'&&<NGBrain isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
    {ngScreen==='ng-learn'&&<NGLearn isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}
      startUnit={u=>{setStudySeed({deck:'unit',unit_id:u.unit_id,title:u.title});setNgScreen('ng-study')}}
      startAula={u=>{setAulaUnit(u);setNgScreen('ng-aula')}}/>}
    <div style={{display:ngScreen==='ng-say-it'?'block':'none'}}><NGSayIt isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/></div>
    </ErrorBoundary>
    {/* Nav — 5 primary + More sheet */}
    <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:`${BG}f0`,backdropFilter:'blur(12px)',borderTop:`1px solid ${BD}`,display:'flex',justifyContent:'space-around',padding:'8px 0 24px',zIndex:100}}>
      {[{k:'ng-home',i:'◈',l:'Home'},{k:'ng-learn',i:'⛰',l:'Learn'},{k:'ng-today',i:'☀',l:'Today'},{k:'ng-voice',i:'◉',l:'Luna'},{k:'ng-study',i:'▣',l:'Study'}].map(t=>
        <button key={t.k} onClick={()=>{setNgScreen(t.k);setShowMore(false)}} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 14px',WebkitTapHighlightColor:'transparent'}}>
          <span style={{fontSize:20,opacity:ngScreen===t.k&&!showMore?1:0.3,filter:ngScreen===t.k&&!showMore?`drop-shadow(0 0 8px ${AC})`:'none'}}>{t.i}</span>
          <span style={{fontSize:10,color:ngScreen===t.k&&!showMore?AC:MU,fontWeight:ngScreen===t.k&&!showMore?700:400}}>{t.l}</span>
        </button>
      )}
      <button onClick={()=>setShowMore(m=>!m)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 14px',WebkitTapHighlightColor:'transparent'}}>
        <span style={{fontSize:20,opacity:showMore?1:0.3,filter:showMore?`drop-shadow(0 0 8px ${AC})`:'none'}}>⋯</span>
        <span style={{fontSize:10,color:showMore?AC:MU,fontWeight:showMore?700:400}}>More</span>
      </button>
    </div>

    {/* More sheet */}
    {showMore&&<><div onClick={()=>setShowMore(false)} style={{position:'fixed',inset:0,zIndex:98,background:'rgba(0,0,0,0.3)'}}/><div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:S,border:`1px solid ${BD}`,borderRadius:'20px 20px 0 0',padding:'12px 20px 80px',zIndex:99,animation:'slideUp 0.2s ease'}}>
      <div style={{width:36,height:4,background:BD,borderRadius:2,margin:'0 auto 16px'}}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {[
          {k:'ng-radio',i:'📻',l:'Radio',d:'Chico & Bia, live'},
          {k:'ng-phrase',i:'◇',l:'Phrase',d:'Scenario practice'},
          {k:'ng-shuffle',i:'◈',l:'Shuffle',d:'Combine patterns'},
          {k:'ng-say-it',i:'💬',l:'Say It',d:'Carioca translator'},
          {k:'ng-map',i:'⊞',l:'Map',d:'Pattern progress'},
          {k:'ng-intelligence',i:'◎',l:'Intel',d:'System dashboard'},
          {k:'ng-import',i:'📥',l:'Import',d:"Victor's notes"},
          {k:'ng-field-report',i:'🌴',l:'Field Report',d:'Real-world log'},
          {k:'ng-brain',i:'🧠',l:'The Brain',d:'Watch it think'},
          {k:'__sfx',i:'🔊',l:'Sound',d:'Tap to toggle effects'},
          {k:'__export',i:'⬇',l:'Backup',d:'Download your full journey as JSON'},
        ].map(t=><button key={t.k} onClick={()=>{
            if(t.k==='__export'){
              SFX.tap()
              fetch('/.netlify/functions/ng-export').then(r=>r.blob()).then(b=>{
                const u=URL.createObjectURL(b)
                const a=document.createElement('a')
                a.href=u;a.download='carioca-backup-'+new Date().toISOString().slice(0,10)+'.json'
                document.body.appendChild(a);a.click();a.remove()
                setTimeout(()=>URL.revokeObjectURL(u),4000)
              }).catch(()=>{})
              setShowMore(false);return
            }
            if(t.k==='__sfx'){
              const off=localStorage.getItem('sfx')==='off'
              localStorage.setItem('sfx',off?'on':'off')
              if(off)SFX.complete()
              setShowMore(false);return
            }
            setNgScreen(t.k);setShowMore(false)
          }} style={{background:ngScreen===t.k?`${AC}12`:S2,border:`1px solid ${ngScreen===t.k?AC+'33':BD}`,borderRadius:14,padding:'14px',cursor:'pointer',fontFamily:FONT,textAlign:'left',WebkitTapHighlightColor:'transparent'}}>
          <div style={{fontSize:22,marginBottom:4}}>{t.i}</div>
          <div style={{fontSize:13,fontWeight:700,color:ngScreen===t.k?AC:TX}}>{t.l}</div>
          <div style={{fontSize:11,color:MU}}>{t.d}</div>
        </button>)}
      </div>
    </div></>
}
  </div>
}
