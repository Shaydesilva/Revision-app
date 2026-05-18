import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";

// ─── THEME ────────────────────────────────────────────────────────
const G="#c9a84c",BG="#09080a",S="#111013",S2="#181620",BD="#1e1b22",TX="#e8e2d8",MU="#58525f",GR="#5ee8a0",RE="#f07070",YE="#f0d060",PU="#a070f0";
const TIERS=[{name:"Turista",min:0,color:MU},{name:"Gringo Simpático",min:8,color:"#8a6a30"},{name:"Comunicador",min:20,color:G},{name:"Carioca em Progresso",min:38,color:"#e8c870"},{name:"Carioca Honorário",min:55,color:"#fff4b8"}];
const getTier=n=>TIERS.reduce((a,t)=>n>=t.min?t:a,TIERS[0]);

const CSS=`
@keyframes slideUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes cardIn{from{opacity:0;transform:translateY(32px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes bounce{0%,100%{transform:scale(1)}40%{transform:scale(1.2)}70%{transform:scale(0.94)}}
@keyframes fire{0%,100%{transform:scale(1) rotate(-4deg)}50%{transform:scale(1.18) rotate(4deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.38}}
@keyframes glow{0%,100%{box-shadow:0 0 0 transparent}50%{box-shadow:0 0 22px #c9a84c55}}
@keyframes treeGlow{0%,100%{filter:drop-shadow(0 0 4px #c9a84c88)}50%{filter:drop-shadow(0 0 10px #c9a84ccc)}}
@keyframes chipIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
@keyframes packPop{from{opacity:0;transform:translateY(14px) scale(0.86)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes flipOut{0%{opacity:1;transform:scaleX(1)}100%{opacity:0;transform:scaleX(0)}}
@keyframes flipIn{0%{opacity:0;transform:scaleX(0)}100%{opacity:1;transform:scaleX(1)}}
@keyframes toastIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes unlockPop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
`;

// ─── SOUND ────────────────────────────────────────────────────────
class Snd{
  constructor(){this.ctx=null;this.on=true;}
  _ctx(){if(!this.ctx)this.ctx=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==="suspended")this.ctx.resume();return this.ctx;}
  _t(f,d,type,v,delay){type=type||"sine";v=v||0.2;delay=delay||0;if(!this.on)return;try{const c=this._ctx(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=f;o.type=type;const t=c.currentTime+delay;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+0.012);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.05);}catch(e){}}
  flip(){this._t(880,0.05,"sine",0.13);this._t(660,0.06,"sine",0.09,0,0.05);}
  correct(){this._t(523,0.1,"sine",0.2);this._t(659,0.1,"sine",0.18,0,0.09);this._t(784,0.16,"sine",0.16,0,0.18);}
  almost(){this._t(440,0.13,"sine",0.14);this._t(494,0.13,"sine",0.11,0,0.11);}
  wrong(){this._t(220,0.22,"sawtooth",0.13);this._t(185,0.18,"sawtooth",0.09,0,0.12);}
  combo(n){const fs=[330,370,415,466,523,587,659,740,830,932];this._t(fs[Math.min(n-1,9)],0.07,"sine",0.15);}
  unlock(){[[440,0],[554,0.1],[659,0.2],[880,0.32]].forEach(([f,d])=>this._t(f,0.4,"sine",0.2,0,d));}
  graduation(){[[523,0],[659,0.1],[784,0.2],[988,0.32],[1047,0.46],[1319,0.62]].forEach(([f,d])=>this._t(f,0.7,"sine",0.2,0,d));}
  pop(){this._t(900,0.04,"sine",0.13);this._t(1100,0.04,"sine",0.09,0,0.04);}
  done(){[[392,0],[523,0.14],[659,0.28],[784,0.42],[1047,0.58]].forEach(([f,d])=>this._t(f,0.4,"sine",0.18,0,d));}
  tap(){this._t(600,0.04,"sine",0.07);}
}
const snd=new Snd();
const hap=p=>{try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}};

// ─── CARD DATA ────────────────────────────────────────────────────
const mk=(id,p,e,t,x={})=>({id:String(id),portuguese:p,english:e,type:t,cluster:null,contrast:null,scenario:null,mastery:0,easeFactor:2.5,interval:0,reps:0,nextReview:new Date().toISOString(),prerequisites:[],...x});
const pr=(...reqs)=>reqs.map(([cardId,minMastery])=>({cardId:String(cardId),minMastery}));

const CARDS=[
  // TIER 0 — ROOTS (no prerequisites)
  mk(1,"opa","hey / whoa","giria",{cluster:"greeting"}),
  mk(2,"vixe","geez / oh wow","giria",{cluster:"exclamation"}),
  mk(3,"eita","damn / wow","giria",{cluster:"exclamation"}),
  mk(4,"puta merda","holy shit","giria",{cluster:"exclamation"}),
  mk(5,"caralho","fuck / holy shit","giria",{cluster:"exclamation"}),
  mk(7,"puta que pariu","holy fucking shit","giria",{cluster:"exclamation"}),
  mk(8,"koe","what's up?","giria",{cluster:"greeting"}),
  mk(9,"fala ai","what's up / talk to me","giria",{cluster:"greeting"}),
  mk(10,"coisa","thing","vocab",{cluster:"thing"}),
  mk(13,"mano","bro / man","giria",{cluster:"address"}),
  mk(14,"cara","dude / man","giria",{cluster:"address"}),
  mk(15,"gatinha","attractive girl / hottie","giria"),
  mk(16,"gostoso/a","hot / delicious","vocab"),
  mk(17,"to ligado","I understand / I get it","frase_pronta"),
  mk(18,"tá ligado?","you know? / you get it?","frase_pronta"),
  mk(19,"bora","let's go","giria",{cluster:"letsgo",contrast:"vamos"}),
  mk(22,"valeu","thanks / bet / aight","giria"),
  mk(23,"tchau","goodbye","vocab"),
  mk(44,"exatamente","exactly","vocab"),
  mk(45,"concordo","I agree","vocab"),

  // TIER 1 — first branches
  mk(6,"caraca","wow — softer than caralho","giria",{cluster:"exclamation",contrast:"caralho",prerequisites:pr([5,2])}),
  mk(11,"treco","thing / stuff (informal)","giria",{cluster:"thing",prerequisites:pr([10,2])}),
  mk(20,"tamo indo","we're heading out","frase_pronta",{cluster:"letsgo",contrast:"estamos indo",prerequisites:pr([19,2])}),
  mk(21,"acabei de aprender isso","I just learned this","sentence",{prerequisites:pr([17,2])}),
  mk(24,"até logo","see you later","frase_pronta",{prerequisites:pr([23,2])}),
  mk(25,"foi um prazer","it was a pleasure","frase_pronta",{prerequisites:pr([22,2])}),
  mk(27,"a gente","us/we — replaces nós in Carioca","grammar",{contrast:"nós",prerequisites:pr([13,2])}),
  mk(31,"queria","wanted / was wanting","vocab",{prerequisites:pr([19,2])}),
  mk(36,"pode repetir?","can you repeat that?","frase_pronta",{prerequisites:pr([18,2])}),
  mk(38,"qual é o nome?","what's the name?","frase_pronta",{prerequisites:pr([9,2])}),
  mk(42,"eu também","me too","vocab",{prerequisites:pr([22,2])}),
  mk(46,"mesmo","same / really / even","vocab",{prerequisites:pr([45,1])}),
  mk(48,"parecido","similar","vocab",{prerequisites:pr([46,1])}),
  mk(49,"sem graça","boring / bland","vocab",{prerequisites:pr([15,2])}),
  mk(51,"atrasado","late","vocab",{prerequisites:pr([19,2])}),
  mk(52,"demais","too much / a lot","vocab",{prerequisites:pr([5,2])}),
  mk(53,"depois","after / later","vocab",{prerequisites:pr([19,2])}),
  mk(54,"de boa","chilling / all good","giria",{prerequisites:pr([9,2])}),
  mk(55,"tá pronta?","are you ready?","frase_pronta",{prerequisites:pr([19,2])}),
  mk(56,"mão de vaca","stingy / cheapskate","giria",{prerequisites:pr([14,2])}),
  mk(58,"trouxa","dumb / sucker","giria",{prerequisites:pr([14,2])}),
  mk(64,"pô","come on / damn (mild)","giria",{prerequisites:pr([5,2])}),

  // TIER 2 — deeper branches
  mk(12,"bagulho","thing / stuff (street)","giria",{cluster:"thing",prerequisites:pr([10,2],[11,1])}),
  mk(26,"a gente se vê","we'll see each other","frase_pronta",{prerequisites:pr([24,2],[27,1])}),
  mk(28,"vamo pra praia","let's go to the beach","sentence",{cluster:"letsgo",contrast:"nós vamos à praia",scenario:"social",prerequisites:pr([19,2],[27,2])}),
  mk(29,"eu me mudei pro Rio","I moved to Rio","sentence",{contrast:"eu me mudei para o Rio",prerequisites:pr([27,2],[19,2])}),
  mk(30,"pra / pro","to the — contracted","grammar",{contrast:"para a / para o",prerequisites:pr([19,3],[20,2])}),
  mk(32,"me vê uma cerveja","can I have a beer","frase_pronta",{contrast:"eu gostaria de uma cerveja",scenario:"ordering",prerequisites:pr([19,2],[22,2])}),
  mk(37,"pode falar devagar?","can you speak slowly?","frase_pronta",{prerequisites:pr([36,2])}),
  mk(39,"quanto que tá?","how much is it?","frase_pronta",{scenario:"shopping",prerequisites:pr([32,2])}),
  mk(43,"sem gás","still water","vocab",{scenario:"ordering",prerequisites:pr([32,2])}),
  mk(47,"é mesmo","oh yeah, that's true","giria",{prerequisites:pr([46,2])}),
  mk(57,"não compensa","not worth it","frase_pronta",{prerequisites:pr([56,1])}),
  mk(63,"bairro","neighbourhood","vocab",{prerequisites:pr([27,1])}),
  mk(65,"uma delícia","delicious / amazing","vocab",{scenario:"food",prerequisites:pr([16,2])}),
  mk(67,"de + a = da","contraction: da (café da manhã)","grammar",{prerequisites:pr([30,2])}),
  mk(68,"de + o = do","contraction: do (carro do Victor)","grammar",{prerequisites:pr([67,1])}),

  // TIER 3
  mk(33,"me vê uma gelada","can I have a cold one","frase_pronta",{contrast:"eu gostaria de uma cerveja gelada",scenario:"ordering",prerequisites:pr([32,2])}),
  mk(34,"bora tomar uma","let's grab a drink","frase_pronta",{cluster:"letsgo",scenario:"social",prerequisites:pr([19,2],[32,1])}),
  mk(35,"a conta por favor","the check please","frase_pronta",{scenario:"ordering",prerequisites:pr([32,2])}),
  mk(40,"pô faz por quinze?","come on, make it fifteen?","frase_pronta",{scenario:"shopping",prerequisites:pr([39,2])}),
  mk(41,"vou pagar no crédito","I'll pay by card","frase_pronta",{scenario:"shopping",prerequisites:pr([39,2])}),
  mk(50,"nasci e cresci no Rio","I was born and raised in Rio","sentence",{prerequisites:pr([27,2],[63,1])}),
  mk(59,"eu tava no clube","I was at the club","sentence",{contrast:"eu estava no clube",prerequisites:pr([54,2],[53,2])}),
  mk(60,"eu fui pra praia","I went to the beach","sentence",{prerequisites:pr([30,2])}),
  mk(66,"essa comida tá do caralho","this food is fucking amazing","sentence",{scenario:"food",prerequisites:pr([65,2],[5,3])}),

  // TIER 4
  mk(61,"eu quero ir pra praia","I want to go to the beach","sentence",{prerequisites:pr([60,2])}),
  mk(62,"eu quero ir pro bar","I want to go to the bar","sentence",{scenario:"social",prerequisites:pr([61,1])}),
  mk(69,"eu gosto de futebol","I like football","sentence",{prerequisites:pr([67,2])}),
  mk(70,"mano estamos atrasados bora","bro we're late, let's go","sentence",{cluster:"letsgo",prerequisites:pr([13,2],[51,2],[19,3])}),
];

// ─── SM-2 + UNLOCK SYSTEM ─────────────────────────────────────────
function sm2(c,q){
  let{easeFactor:ef=2.5,interval:iv=0,reps:rp=0}=c;
  if(q>=3){iv=rp===0?1:rp===1?6:Math.round(iv*ef);rp++;}else{rp=0;iv=1;}
  ef=Math.max(1.3,ef+0.1-(5-q)*(0.08+(5-q)*0.02));
  const nr=new Date();nr.setDate(nr.getDate()+iv);
  const mastery=Math.min(5,rp===0?0:rp<=1?1:rp<=3?2:rp<=5?3:rp<=8?4:5);
  return{easeFactor:ef,interval:iv,reps:rp,nextReview:nr.toISOString(),mastery};
}

function getCardStatus(card,all){
  if(card.mastery>=5)return"mastered";
  if(card.mastery>=1)return"active";
  if(!card.prerequisites||!card.prerequisites.length)return"available";
  const met=card.prerequisites.every(req=>{
    const pc=all.find(c=>c.id===req.cardId);
    return pc&&pc.mastery>=req.minMastery;
  });
  return met?"available":"locked";
}

function checkNewUnlocks(prevCards,nextCards){
  return nextCards.filter(nc=>{
    const pc=prevCards.find(c=>c.id===nc.id);
    const wasLocked=pc&&getCardStatus(pc,prevCards)==="locked";
    const nowAvail=getCardStatus(nc,nextCards)==="available";
    return wasLocked&&nowAvail;
  });
}

function buildDeck(cards){
  const now=new Date();
  const due=cards.filter(c=>new Date(c.nextReview)<=now&&c.mastery>0).sort(()=>Math.random()-0.5);
  const fresh=cards.filter(c=>c.mastery===0&&getCardStatus(c,cards)!=="locked").sort(()=>Math.random()-0.5);
  if(!due.length)return fresh.slice(0,20);
  return[...due,...fresh.slice(0,Math.max(3,Math.round(due.length*0.3)))].slice(0,20);
}

// ─── STORAGE ─────────────────────────────────────────────────────
async function dbLoad(){try{const r=await window.storage.get("carioca-v8");return r?JSON.parse(r.value):null;}catch{return null;}}
async function dbSave(s){try{await window.storage.set("carioca-v8",JSON.stringify(s));}catch{}}

// ─── CLAUDE API ───────────────────────────────────────────────────
async function claudeEval(card,answer){
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,system:`Carioca Portuguese tutor. Score 0-100: accuracy=correct meaning, carioca=would a Rio local say this (formal in casual=low). Ignore accent marks completely. Reply ONLY JSON: {"accuracy":N,"carioca":N,"feedback":"one line carioca friend voice","note":"one tip"}`,messages:[{role:"user",content:`"${card.portuguese}"="${card.english}"${card.contrast?`. Carioca:"${card.contrast}"`:""}. Student:"${answer}"`}]})});
    return JSON.parse((await r.json()).content[0].text.replace(/```json|```/g,"").trim());
  }catch{return{accuracy:0,carioca:0,feedback:"Sem conexão — tente de novo",note:""};}
}

async function claudeGenerateSentence(vocabList){
  try{
    const words=vocabList.slice(0,15).map(c=>c.portuguese).join(", ");
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,system:`Generate a natural Rio Carioca Portuguese sentence for language practice. Use at least 3 words from the provided vocabulary list. The sentence should sound like something said in day-to-day Rio life (boteco, beach, street, etc). Ignore formal Portuguese — use Carioca contractions (pra, tamo, tá, etc). Reply ONLY JSON: {"english":"...","portuguese":"...","targetWords":["word1","word2"],"scenario":"boteco|praia|rua|social|geral","hint":"brief grammar note"}`,messages:[{role:"user",content:`Available vocabulary: ${words}. Generate a sentence.`}]})});
    return JSON.parse((await r.json()).content[0].text.replace(/```json|```/g,"").trim());
  }catch{return{english:"What's up, let's go get a cold one",portuguese:"Koe, bora tomar uma gelada",targetWords:["koe","bora","gelada"],scenario:"boteco",hint:"koe = what's up, bora = let's go"};}
}

async function claudeEvalSentence(sentence,userAnswer,cards){
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:`Evaluate a Carioca Portuguese sentence translation. Ignore accents completely. For each target word, score how well the student used it (1=wrong/missing, 3=almost right, 5=correct). Accept Carioca contractions, gíria, natural variations. Reply ONLY JSON: {"wordScores":{"word1":5,"word2":3},"overall":N,"naturalness":N,"feedback":"carioca friend voice, encouraging","correction":"show natural Carioca version if needed"}`,messages:[{role:"user",content:`English: "${sentence.english}"\nCorrect Portuguese: "${sentence.portuguese}"\nTarget words: ${sentence.targetWords.join(", ")}\nStudent wrote: "${userAnswer}"`}]})});
    const ev=JSON.parse((await r.json()).content[0].text.replace(/```json|```/g,"").trim());
    // Map word scores to card quality scores
    const cardUpdates={};
    sentence.targetWords.forEach(word=>{
      const card=cards.find(c=>c.portuguese===word||c.portuguese.includes(word));
      if(card){
        const wordQ=ev.wordScores[word]||3;
        cardUpdates[card.id]=wordQ;
      }
    });
    return{...ev,cardUpdates};
  }catch{return{wordScores:{},overall:50,naturalness:50,feedback:"Sem conexão",correction:"",cardUpdates:{}};}
}

async function claudeParse(b64,existing){
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:`Extract ALL vocab, phrases, expressions, grammar from this BP lesson doc. ONLY JSON array: [{"portuguese":"...","english":"..." or null,"type":"giria"|"vocab"|"frase_pronta"|"grammar"|"sentence","cluster":"..." or null,"contrast":"..." or null}]. cluster=group synonyms. contrast=formal equiv of Carioca.`,messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:"Extract:"}]}]})});
    const items=JSON.parse((await r.json()).content[0].text.replace(/```json|```/g,"").trim());
    return items.filter(i=>i.portuguese&&!existing.has(i.portuguese.toLowerCase().trim()));
  }catch(e){console.error(e);return[];}
}

// ─── HOOKS ────────────────────────────────────────────────────────
function useCount(target){
  const[v,setV]=useState(target);const prev=useRef(target);
  useEffect(()=>{
    const diff=target-prev.current;if(!diff)return;
    let i=0;const t=setInterval(()=>{i++;setV(Math.round(prev.current+diff*(i/28)));if(i>=28){clearInterval(t);prev.current=target;}},25);
    return()=>clearInterval(t);
  },[target]);
  return v;
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────
function Pill({text,gold,dim}){return <span style={{fontSize:9,letterSpacing:2,padding:"4px 9px",borderRadius:5,background:gold?G+"22":S2,border:"1px solid "+(gold?G+"55":BD),color:gold?G:dim?MU:TX}}>{text?.toUpperCase()}</span>;}

function Nav({screen,go,due}){
  const ns=[{k:"home",i:"⌂",l:"Início"},{k:"study",i:"📚",l:"Estudar",b:due},{k:"sentence",i:"💬",l:"Frase"},{k:"tree",i:"🌳",l:"Mapa"},{k:"import",i:"↑",l:"Importar"}];
  return <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:S,borderTop:"1px solid "+BD,display:"flex",zIndex:100}}>
    {ns.map(n=><button key={n.k} onClick={()=>{snd.tap();go(n.k);}} style={{flex:1,background:"none",border:"none",padding:"10px 4px 14px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,position:"relative"}}>
      <span style={{fontSize:18,color:screen===n.k?G:MU,transition:"color 0.15s"}}>{n.i}</span>
      <span style={{fontSize:9,letterSpacing:1,color:screen===n.k?G:MU}}>{n.l.toUpperCase()}</span>
      {n.b>0&&<div style={{position:"absolute",top:8,right:"calc(50% - 12px)",width:7,height:7,background:YE,borderRadius:"50%",animation:"pulse 2s infinite"}}/>}
    </button>)}
  </div>;
}

function UnlockToast({cards,onDismiss}){
  useEffect(()=>{const t=setTimeout(onDismiss,4000);return()=>clearTimeout(t);},[onDismiss]);
  return <div onClick={onDismiss} style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:S,border:"1px solid "+G+"66",borderRadius:12,padding:"12px 20px",zIndex:200,animation:"toastIn 0.3s ease",display:"flex",alignItems:"center",gap:12,maxWidth:380,width:"calc(100% - 32px)"}}>
    <span style={{fontSize:18}}>🔓</span>
    <div>
      <div style={{fontSize:11,color:G,letterSpacing:2,marginBottom:3}}>DESBLOQUEADO</div>
      <div style={{fontSize:13,color:TX}}>{cards.map(c=>c.english).join(" · ")}</div>
    </div>
  </div>;
}

function GradOverlay({card,onClose}){
  const pts=useMemo(()=>Array.from({length:24},(_,i)=>{const a=(i/24)*Math.PI*2,d=80+Math.random()*110;return{id:i,tx:Math.cos(a)*d,ty:Math.sin(a)*d,color:[G,GR,YE,"#ff6b9d",PU,"#70a0f0"][i%6],size:4+Math.random()*9,delay:Math.random()*0.4};}),[]); 
  useEffect(()=>{snd.graduation();hap([50,30,80]);},[]);
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,textAlign:"center"}}>
    <div style={{position:"absolute",top:"40%",left:"50%",transform:"translate(-50%,-50%)"}}>
      {pts.map(p=><div key={p.id} style={{position:"absolute",width:p.size,height:p.size,borderRadius:"50%",background:p.color,left:-p.size/2,top:-p.size/2,transform:"translate(0,0) scale(1)",opacity:1,transition:`transform 1.4s ease-out ${p.delay}s, opacity 1.4s ease-out ${p.delay}s`}} ref={el=>{if(el)requestAnimationFrame(()=>{el.style.transform=`translate(${p.tx}px,${p.ty}px) scale(0)`;el.style.opacity="0";});}}/>)}
    </div>
    <div style={{fontSize:76,marginBottom:16,animation:"bounce 0.7s ease",zIndex:1,position:"relative"}}>🎓</div>
    <div style={{fontSize:15,color:GR,marginBottom:10,letterSpacing:3,zIndex:1,position:"relative"}}>CARTA DOMINADA</div>
    <div style={{fontSize:28,color:G,marginBottom:8,zIndex:1,position:"relative"}}>{card.portuguese}</div>
    <div style={{fontSize:14,color:MU,marginBottom:52,zIndex:1,position:"relative"}}>{card.english}</div>
    <div style={{fontSize:10,color:MU,letterSpacing:3,zIndex:1,position:"relative"}}>TOQUE PARA CONTINUAR</div>
  </div>;
}

function SessionDone({history,peak,onBack}){
  const ok=history.filter(h=>h.q>=4).length,al=history.filter(h=>h.q===3).length,no=history.filter(h=>h.q<3).length;
  useEffect(()=>{snd.done();hap([40,20,40,20,80]);},[]);
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 24px",animation:"slideUp 0.4s ease"}}>
    <div style={{fontSize:56,marginBottom:16,animation:"bounce 0.6s ease"}}>🎉</div>
    <div style={{fontSize:22,color:G,marginBottom:6}}>Sessão completa!</div>
    {peak>=3&&<div style={{fontSize:13,color:YE,marginBottom:20}}>🔥 Combo máximo: {peak}</div>}
    <div style={{display:"flex",gap:20,marginBottom:32}}>
      {[{v:ok,c:GR,l:"certas"},{v:al,c:YE,l:"quase"},{v:no,c:RE,l:"erradas"}].map(x=><div key={x.l} style={{textAlign:"center"}}><div style={{fontSize:30,color:x.c}}>{x.v}</div><div style={{fontSize:10,color:MU,letterSpacing:2}}>{x.l.toUpperCase()}</div></div>)}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginBottom:36,maxWidth:360}}>
      {history.map((h,i)=><div key={i} style={{padding:"5px 10px",borderRadius:8,background:(h.q>=4?GR:h.q>=3?YE:RE)+"18",border:"1px solid "+(h.q>=4?GR:h.q>=3?YE:RE)+"44",fontSize:11,color:h.q>=4?GR:h.q>=3?YE:RE,animation:`chipIn 0.3s ease ${i*0.04}s both`}}>{h.card.portuguese}</div>)}
    </div>
    <button onClick={onBack} style={{background:G,border:"none",borderRadius:14,padding:"16px 48px",color:BG,fontSize:13,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px "+G+"33"}}>VOLTAR</button>
  </div>;
}

// ─── STUDY SCREEN ─────────────────────────────────────────────────
function CardFace({card,phase,ans,setAns,onTap,flipped,ev}){
  if(!flipped)return <div onClick={phase!=="typing"?onTap:undefined} style={{flex:1,background:S,border:"1px solid "+BD,borderRadius:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 28px",textAlign:"center",cursor:phase==="typing"?"default":"pointer",animation:"flipIn 0.18s ease"}}>
    {phase==="front"&&<><div style={{fontSize:11,color:MU,letterSpacing:3,marginBottom:20}}>PORTUGUÊS</div><div style={{fontSize:card.portuguese.length>22?22:38,color:G,lineHeight:1.3}}>{card.portuguese}</div><div style={{marginTop:24,fontSize:12,color:MU,border:"1px solid "+BD,borderRadius:20,padding:"8px 20px"}}>toque para {card.mastery>=2?"traduzir":"revelar"}</div></>}
    {phase==="typing"&&<div style={{width:"100%"}}><div style={{fontSize:10,color:MU,letterSpacing:3,marginBottom:14}}>COMO SE DIZ EM INGLÊS?</div><div style={{fontSize:card.portuguese.length>22?18:28,color:G,lineHeight:1.3,marginBottom:18}}>{card.portuguese}</div><textarea value={ans} onChange={e=>setAns(e.target.value)} autoFocus placeholder="escreva a tradução..." style={{width:"100%",background:BG,border:"1px solid "+BD,borderRadius:12,padding:"12px",color:TX,fontSize:15,fontFamily:"inherit",resize:"none",outline:"none",minHeight:68,boxSizing:"border-box",marginBottom:12}} onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=BD}/><button onClick={onTap} style={{width:"100%",background:ans.trim()?G:BD,border:"none",borderRadius:12,padding:"14px",color:ans.trim()?BG:MU,cursor:ans.trim()?"pointer":"default",fontFamily:"inherit",fontSize:13,letterSpacing:2,transition:"all 0.2s"}}>REVELAR →</button></div>}
    {phase==="evaluating"&&<div style={{fontSize:13,color:G,letterSpacing:3,animation:"pulse 1s infinite"}}>AVALIANDO...</div>}
  </div>;
  return <div style={{flex:1,background:S,border:"1px solid "+BD,borderRadius:20,padding:"24px",overflowY:"auto",animation:"flipIn 0.18s ease"}}>
    <div style={{fontSize:card.portuguese.length>22?17:26,color:G,marginBottom:8,lineHeight:1.3}}>{card.portuguese}</div>
    <div style={{fontSize:17,color:TX,lineHeight:1.4,marginBottom:card.contrast?14:0}}>{card.english}</div>
    {card.contrast&&<div style={{paddingTop:12,borderTop:"1px solid "+BD,marginBottom:14}}><div style={{fontSize:9,color:MU,letterSpacing:2,marginBottom:4}}>FORMA FORMAL</div><div style={{fontSize:13,color:MU,fontStyle:"italic"}}>{card.contrast}</div></div>}
    {ev&&<div style={{background:S2,borderRadius:12,padding:"14px",marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:10}}>{[{l:"PRECISÃO",v:ev.accuracy},{l:"CARIOCA",v:ev.carioca}].map(x=>{const c=x.v>=75?GR:x.v>=50?YE:RE;return <div key={x.l} style={{flex:1,background:BG,borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,color:c}}>{x.v}</div><div style={{fontSize:9,color:MU,letterSpacing:2,marginTop:3}}>{x.l}</div></div>;})}</div>{ev.feedback&&<div style={{fontSize:12,color:"#9a8878",fontStyle:"italic",marginBottom:6}}>"{ev.feedback}"</div>}{ev.note&&<div style={{fontSize:11,color:"#6a8060",lineHeight:1.6}}>{ev.note}</div>}</div>}
  </div>;
}

function Study({cards,onRate,onBack}){
  const[deck]=useState(()=>{const d=buildDeck(cards);return d.length?d:cards.filter(c=>getCardStatus(c,cards)!=="locked").slice(0,20);});
  const[idx,setIdx]=useState(0);const[flipped,setFlipped]=useState(false);const[flipping,setFlipping]=useState(false);
  const[phase,setPhase]=useState("front");const[ans,setAns]=useState("");const[ev,setEv]=useState(null);
  const[combo,setCombo]=useState(0);const[peak,setPeak]=useState(0);const[hist,setHist]=useState([]);
  const[done,setDone]=useState(false);const[key,setKey]=useState(0);
  const card=deck[idx];const isDeep=card&&card.mastery>=2;

  const doFlip=useCallback(cb=>{setFlipping(true);setTimeout(()=>{cb();setFlipping(false);},180);},[]);
  const advance=useCallback(q=>{
    onRate(card.id,q,"study");
    const nc=q>=3?combo+1:0;if(nc>0)snd.combo(nc);
    setCombo(nc);setPeak(p=>Math.max(p,nc));setHist(h=>[...h,{card,q}]);
    if(idx+1>=deck.length){setDone(true);return;}
    doFlip(()=>{setIdx(i=>i+1);setFlipped(false);setPhase("front");setAns("");setEv(null);setKey(k=>k+1);});
  },[combo,card,idx,deck,onRate,doFlip]);

  const tap=useCallback(async()=>{
    if(flipped||flipping)return;
    if(isDeep&&phase==="front"){snd.flip();setPhase("typing");return;}
    if(isDeep&&phase==="typing"){
      if(!ans.trim()){doFlip(()=>{snd.flip();hap(20);setFlipped(true);setPhase("back");});return;}
      setPhase("evaluating");const res=await claudeEval(card,ans);
      doFlip(()=>{setEv(res);snd.flip();hap(20);setFlipped(true);setPhase("back");});return;
    }
    doFlip(()=>{snd.flip();hap(20);setFlipped(true);setPhase("back");});
  },[flipped,flipping,isDeep,phase,ans,card,doFlip]);

  if(done)return <SessionDone history={hist} peak={peak} onBack={onBack}/>;
  if(!card)return null;
  const fires=combo>=8?"🔥🔥🔥":combo>=5?"🔥🔥":combo>=3?"🔥":"";
  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 64px)"}}>
    <div style={{padding:"16px 20px 8px",display:"flex",alignItems:"center",gap:12}}>
      <button onClick={()=>{snd.tap();onBack();}} style={{background:"none",border:"none",color:MU,fontSize:22,cursor:"pointer",lineHeight:1}}>←</button>
      <div style={{flex:1,height:3,background:BD,borderRadius:3}}><div style={{height:"100%",width:((idx/deck.length)*100)+"%",background:G,borderRadius:3,transition:"width 0.4s ease"}}/></div>
      {fires&&<div style={{fontSize:combo>=8?22:combo>=5?17:13,animation:"fire 0.6s infinite",lineHeight:1}}>{fires}<span style={{color:G,fontSize:11}}> {combo}</span></div>}
      <div style={{fontSize:11,color:MU}}>{idx+1}/{deck.length}</div>
    </div>
    <div style={{flex:1,padding:"8px 20px 20px",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}><Pill text={card.type}/>{card.contrast&&<Pill text="🇧🇷 carioca" gold/>}{card.scenario&&<Pill text={card.scenario} dim/>}{card.mastery>0&&<Pill text={"box "+card.mastery} dim/>}</div>
      <div style={{position:"relative",flex:1,display:"flex",flexDirection:"column"}}>
        {deck[idx+2]&&<div style={{position:"absolute",inset:0,transform:"translateY(14px) scale(0.91)",borderRadius:20,background:S,border:"1px solid "+BD,opacity:0.28,zIndex:0}}/>}
        {deck[idx+1]&&<div style={{position:"absolute",inset:0,transform:"translateY(7px) scale(0.955)",borderRadius:20,background:S,border:"1px solid "+BD,opacity:0.52,zIndex:1}}/>}
        <div key={key} style={{position:"relative",flex:1,zIndex:2,display:"flex",flexDirection:"column",animation:"cardIn 0.3s ease",opacity:flipping?0:1,transform:flipping?"scaleX(0.1)":"scaleX(1)",transition:flipping?"transform 0.15s ease, opacity 0.15s ease":"none"}}>
          <CardFace card={card} phase={phase} ans={ans} setAns={setAns} onTap={tap} flipped={flipped} ev={ev}/>
          {flipped&&<div style={{marginTop:12}}>
            <div style={{fontSize:10,color:MU,letterSpacing:2,textAlign:"center",marginBottom:10}}>COMO FOI?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{l:"✗",s:"Errei",q:1,c:RE,b:RE+"18"},{l:"△",s:"Quase",q:3,c:YE,b:YE+"18"},{l:"✓",s:"Sabia",q:5,c:GR,b:GR+"18"}].map(x=><button key={x.q} onClick={()=>advance(x.q)} style={{padding:"16px 8px",background:x.b,border:"1px solid "+x.c+"44",borderRadius:14,color:x.c,cursor:"pointer",fontFamily:"inherit",transition:"transform 0.12s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.92)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}><div style={{fontSize:20,marginBottom:3}}>{x.l}</div><div style={{fontSize:11}}>{x.s}</div></button>)}
            </div>
          </div>}
        </div>
      </div>
    </div>
  </div>;
}

// ─── SWIPE SCREEN ─────────────────────────────────────────────────
function Swipe({cards,onRate,onBack}){
  const[queue]=useState(()=>cards.filter(c=>getCardStatus(c,cards)!=="locked").sort(()=>Math.random()-0.5).slice(0,25));
  const[idx,setIdx]=useState(0);const[revealed,setRevealed]=useState(false);
  const[dragX,setDragX]=useState(0);const[dragging,setDragging]=useState(false);const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
  const tRef=useRef({sx:0,dx:0,t:0});const card=queue[idx];

  const doSwipe=useCallback(dir=>{
    if(busy)return;setBusy(true);onRate(card.id,dir==="right"?4:1,"swipe");
    if(dir==="right"){snd.correct();hap(40);}else{snd.wrong();hap([25,15,25]);}
    setDragX(dir==="right"?560:-560);
    setTimeout(()=>{if(idx+1>=queue.length){setDone(true);return;}setIdx(i=>i+1);setDragX(0);setDragging(false);setRevealed(false);setBusy(false);},300);
  },[busy,card,idx,queue,onRate]);

  const onTS=e=>{tRef.current={sx:e.touches[0].clientX,dx:0,t:Date.now()};setDragging(true);};
  const onTM=e=>{if(!busy){const dx=e.touches[0].clientX-tRef.current.sx;tRef.current.dx=dx;setDragX(dx);}};
  const onTE=()=>{if(busy)return;setDragging(false);const{dx,t}=tRef.current;const vel=Math.abs(dx)/(Date.now()-t);if(Math.abs(dx)>80||vel>0.5)doSwipe(dx>0?"right":"left");else setDragX(0);};

  if(done)return <div style={{height:"calc(100vh - 64px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:52,marginBottom:12,animation:"bounce 0.6s ease"}}>✅</div><div style={{color:G,fontSize:18,marginBottom:28}}>Feito!</div><button onClick={onBack} style={{background:G,border:"none",borderRadius:14,padding:"14px 40px",color:BG,cursor:"pointer",fontFamily:"inherit",letterSpacing:2,fontSize:13}}>VOLTAR</button></div>;
  if(!card)return null;
  const rot=dragX/14,bc=dragX>50?GR+"bb":dragX<-50?RE+"bb":BD,sh=dragX>50?"0 8px 28px "+GR+"33":dragX<-50?"0 8px 28px "+RE+"33":"0 8px 24px rgba(0,0,0,0.4)";
  return <div style={{height:"calc(100vh - 64px)",display:"flex",flexDirection:"column"}}>
    <div style={{padding:"16px 20px 0",display:"flex",alignItems:"center",gap:12}}>
      <button onClick={()=>{snd.tap();onBack();}} style={{background:"none",border:"none",color:MU,fontSize:22,cursor:"pointer"}}>←</button>
      <div style={{flex:1,height:3,background:BD,borderRadius:3}}><div style={{height:"100%",width:((idx/queue.length)*100)+"%",background:G,borderRadius:3}}/></div>
      <div style={{fontSize:11,color:MU}}>{idx+1}/{queue.length}</div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",padding:"10px 36px 0",opacity:0.35}}><span style={{fontSize:12,color:RE}}>← não sei</span><span style={{fontSize:12,color:GR}}>sei →</span></div>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 20px",position:"relative"}}>
      {queue[idx+2]&&<div style={{position:"absolute",inset:"0 20px",transform:"translateY(14px) scale(0.90)",borderRadius:24,background:S,border:"1px solid "+BD,opacity:0.28}}/>}
      {queue[idx+1]&&<div style={{position:"absolute",inset:"0 20px",transform:"translateY(7px) scale(0.955)",borderRadius:24,background:S,border:"1px solid "+BD,opacity:0.5}}/>}
      <div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onClick={()=>setRevealed(r=>!r)} style={{position:"relative",width:"100%",background:S,border:"2px solid "+bc,borderRadius:24,padding:"44px 28px",textAlign:"center",cursor:"grab",userSelect:"none",transform:"translateX("+dragX+"px) rotate("+rot+"deg)",transition:dragging||busy?"none":"transform 0.32s ease,border-color 0.15s",willChange:"transform",boxShadow:sh,zIndex:2}}>
        {dragX>60&&<div style={{position:"absolute",top:20,right:22,fontSize:26,opacity:Math.min(1,(dragX-60)/100)}}>✓</div>}
        {dragX<-60&&<div style={{position:"absolute",top:20,left:22,fontSize:26,opacity:Math.min(1,(-dragX-60)/100)}}>✗</div>}
        <div style={{fontSize:10,color:MU,letterSpacing:3,marginBottom:18}}>{card.type?.toUpperCase()}</div>
        <div style={{fontSize:card.portuguese.length>22?22:36,color:G,lineHeight:1.3,marginBottom:revealed?24:0}}>{card.portuguese}</div>
        {!revealed&&<div style={{marginTop:20,fontSize:12,color:MU,border:"1px solid "+BD,borderRadius:20,padding:"8px 18px",display:"inline-block"}}>toque para revelar</div>}
        {revealed&&<><div style={{width:40,height:1,background:BD,margin:"0 auto 18px"}}/><div style={{fontSize:16,color:TX,lineHeight:1.5,marginBottom:card.contrast?10:0}}>{card.english}</div>{card.contrast&&<div style={{fontSize:12,color:MU,fontStyle:"italic"}}>formal: {card.contrast}</div>}</>}
      </div>
    </div>
    <div style={{display:"flex",gap:16,padding:"0 40px 24px"}}>
      <button onClick={()=>doSwipe("left")} style={{flex:1,padding:"18px",background:RE+"18",border:"1px solid "+RE+"44",borderRadius:16,color:RE,fontSize:24,cursor:"pointer",transition:"transform 0.12s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.93)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>✗</button>
      <button onClick={()=>doSwipe("right")} style={{flex:1,padding:"18px",background:GR+"18",border:"1px solid "+GR+"44",borderRadius:16,color:GR,fontSize:24,cursor:"pointer",transition:"transform 0.12s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.93)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>✓</button>
    </div>
  </div>;
}

// ─── SENTENCE MODE ────────────────────────────────────────────────
function SentenceMode({cards,onRateMultiple,onBack}){
  const[phase,setPhase]=useState("idle");// idle|loading|writing|evaluating|result
  const[sentence,setSentence]=useState(null);const[ans,setAns]=useState("");const[ev,setEv]=useState(null);
  const[count,setCount]=useState(0);const[hist,setHist]=useState([]);

  const vocab=useMemo(()=>cards.filter(c=>c.mastery>=2),[cards]);

  const generate=useCallback(async()=>{
    setPhase("loading");setAns("");setEv(null);
    const s=await claudeGenerateSentence(vocab);
    setSentence(s);setPhase("writing");
  },[vocab]);

  const submit=useCallback(async()=>{
    if(!ans.trim()||!sentence)return;
    setPhase("evaluating");
    const res=await claudeEvalSentence(sentence,ans,cards);
    setEv(res);
    // Update all touched cards
    onRateMultiple(res.cardUpdates,"sentence");
    setHist(h=>[...h,{sentence,ans,ev:res}]);
    setCount(c=>c+1);
    setPhase("result");
  },[ans,sentence,cards,onRateMultiple]);

  const scenarioEmoji={boteco:"🍺",praia:"🏖️",rua:"🛣️",social:"👥",geral:"💬"};

  return <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 64px)"}}>
    <div style={{padding:"16px 20px 8px",display:"flex",alignItems:"center",gap:12}}>
      <button onClick={()=>{snd.tap();onBack();}} style={{background:"none",border:"none",color:MU,fontSize:22,cursor:"pointer",lineHeight:1}}>←</button>
      <div style={{flex:1}}><div style={{fontSize:14,color:TX}}>Modo Frase</div><div style={{fontSize:11,color:MU}}>escreva em português</div></div>
      <div style={{fontSize:12,color:MU}}>{count} feitas</div>
    </div>

    <div style={{flex:1,padding:"8px 20px 20px",display:"flex",flexDirection:"column",overflowY:"auto"}}>
      {phase==="idle"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",gap:20}}>
        <div style={{fontSize:40}}>💬</div>
        <div style={{fontSize:16,color:TX,marginBottom:4}}>Construção de frases</div>
        <div style={{fontSize:13,color:MU,lineHeight:1.7,maxWidth:300}}>Recebe uma frase em inglês construída com o seu vocabulário. Escreve em português carioca.</div>
        <div style={{background:S,border:"1px solid "+BD,borderRadius:12,padding:"14px 18px",fontSize:12,color:MU,lineHeight:1.7}}>
          {vocab.length>=3?`${vocab.length} palavras disponíveis`:"Precisa de pelo menos 3 palavras no box 2+ para começar. Continue estudando!"}
        </div>
        {vocab.length>=3&&<button onClick={generate} style={{background:G,border:"none",borderRadius:14,padding:"16px 40px",color:BG,fontSize:14,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px "+G+"33"}}>GERAR FRASE →</button>}
      </div>}

      {phase==="loading"&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:13,color:G,letterSpacing:3,animation:"pulse 1s infinite"}}>GERANDO FRASE...</div></div>}

      {(phase==="writing"||phase==="evaluating")&&sentence&&<div style={{animation:"cardIn 0.3s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <span style={{fontSize:18}}>{scenarioEmoji[sentence.scenario]||"💬"}</span>
          <Pill text={sentence.scenario||"geral"} dim/>
        </div>
        <div style={{background:S,border:"1px solid "+BD,borderRadius:16,padding:"24px",marginBottom:16}}>
          <div style={{fontSize:11,color:MU,letterSpacing:3,marginBottom:12}}>EM INGLÊS</div>
          <div style={{fontSize:20,color:TX,lineHeight:1.5}}>{sentence.english}</div>
          {sentence.hint&&<div style={{fontSize:11,color:MU,marginTop:12,fontStyle:"italic"}}>💡 {sentence.hint}</div>}
        </div>
        <div style={{fontSize:11,color:MU,letterSpacing:2,marginBottom:10}}>ESCREVA EM PORTUGUÊS CARIOCA</div>
        <textarea value={ans} onChange={e=>setAns(e.target.value)} placeholder="escreva aqui... (acentos opcionais)" style={{width:"100%",background:S,border:"1px solid "+BD,borderRadius:14,padding:"16px",color:TX,fontSize:16,fontFamily:"inherit",resize:"none",outline:"none",minHeight:90,boxSizing:"border-box",marginBottom:14}} onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=BD}/>
        <button onClick={submit} disabled={!ans.trim()||phase==="evaluating"} style={{width:"100%",background:ans.trim()&&phase!=="evaluating"?G:BD,border:"none",borderRadius:14,padding:"16px",color:ans.trim()&&phase!=="evaluating"?BG:MU,fontSize:14,letterSpacing:2,cursor:ans.trim()?"pointer":"default",fontFamily:"inherit",transition:"all 0.2s"}}>
          {phase==="evaluating"?"AVALIANDO...":"VERIFICAR →"}
        </button>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:14}}>{sentence.targetWords?.map(w=><Pill key={w} text={w} gold/>)}</div>
      </div>}

      {phase==="result"&&ev&&sentence&&<div style={{animation:"slideUp 0.3s ease"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[{l:"NATURALIDADE",v:ev.naturalness},{l:"GERAL",v:ev.overall}].map(x=>{const c=x.v>=75?GR:x.v>=50?YE:RE;return <div key={x.l} style={{background:S,border:"1px solid "+BD,borderRadius:12,padding:"16px",textAlign:"center"}}><div style={{fontSize:26,color:c}}>{x.v}</div><div style={{fontSize:9,color:MU,letterSpacing:2,marginTop:3}}>{x.l}</div></div>;})}
        </div>
        <div style={{background:S,border:"1px solid "+BD,borderRadius:14,padding:"16px",marginBottom:12}}>
          <div style={{fontSize:9,color:MU,letterSpacing:2,marginBottom:8}}>SUA RESPOSTA</div>
          <div style={{fontSize:15,color:TX,marginBottom:ev.correction?12:0}}>{ans}</div>
          {ev.correction&&<><div style={{fontSize:9,color:G,letterSpacing:2,marginBottom:6}}>VERSÃO CARIOCA</div><div style={{fontSize:15,color:G,fontStyle:"italic"}}>{ev.correction}</div></>}
        </div>
        {ev.feedback&&<div style={{fontSize:13,color:"#9a8878",fontStyle:"italic",marginBottom:16}}>"{ev.feedback}"</div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={generate} style={{flex:1,background:G,border:"none",borderRadius:14,padding:"16px",color:BG,fontSize:13,letterSpacing:2,cursor:"pointer",fontFamily:"inherit"}}>PRÓXIMA →</button>
          <button onClick={onBack} style={{padding:"16px 20px",background:"transparent",border:"1px solid "+BD,borderRadius:14,color:MU,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
        </div>
      </div>}
    </div>
  </div>;
}

// ─── SKILL TREE ───────────────────────────────────────────────────
function SkillTree({cards,onUnlockChallenge}){
  const svgRef=useRef();const gRef=useRef();
  const[selected,setSelected]=useState(null);
  const[challengeCard,setChallengeCard]=useState(null);

  const{nodes,edges}=useMemo(()=>{
    // Compute tier depth per card
    const tierMap={};
    function getTierDepth(id,visited=new Set()){
      if(tierMap[id]!==undefined)return tierMap[id];
      if(visited.has(id)){tierMap[id]=0;return 0;}
      visited.add(id);
      const card=cards.find(c=>c.id===id);
      if(!card?.prerequisites?.length){tierMap[id]=0;return 0;}
      const max=Math.max(...card.prerequisites.map(p=>getTierDepth(p.cardId,new Set(visited))));
      tierMap[id]=max+1;return max+1;
    }
    cards.forEach(c=>getTierDepth(c.id));

    // Group by tier
    const tiers={};
    cards.forEach(c=>{const t=tierMap[c.id]||0;if(!tiers[t])tiers[t]=[];tiers[t].push(c);});

    // Assign positions
    const W=1100,TIER_H=150;
    const positions={};
    Object.entries(tiers).forEach(([tier,tc])=>{
      const y=80+parseInt(tier)*TIER_H;
      tc.forEach((c,i)=>{positions[c.id]={x:(W/(tc.length+1))*(i+1),y};});
    });

    // Build node objects
    const statusedCards=cards.map(c=>({...c,status:getCardStatus(c,cards)}));
    const nodes=statusedCards.map(c=>({...c,...positions[c.id]||{x:550,y:80}}));

    // Build edges
    const edges=[];
    cards.forEach(c=>{
      c.prerequisites?.forEach(req=>{
        const src=positions[req.cardId];const dst=positions[c.id];
        if(src&&dst)edges.push({id:c.id+"-"+req.cardId,sx:src.x,sy:src.y,tx:dst.x,ty:dst.y,met:cards.find(p=>p.id===req.cardId)?.mastery>=req.minMastery});
      });
    });
    return{nodes,edges};
  },[cards]);

  useEffect(()=>{
    const el=svgRef.current;if(!el)return;
    const g=d3.select(gRef.current);
    const zoom=d3.zoom().scaleExtent([0.25,2.5]).on("zoom",e=>g.attr("transform",e.transform));
    d3.select(el).call(zoom).on("dblclick.zoom",null);
    // Initial center
    d3.select(el).call(zoom.transform,d3.zoomIdentity.translate(0,20).scale(0.7));
  },[]);

  const nodeColor={locked:"#131118",available:"#131118",active:"#1a1525",mastered:"#0d1a0f"};
  const nodeStroke={locked:"#2a2535",available:G,active:PU,mastered:GR};
  const nodeR={locked:22,available:26,active:28,mastered:32};

  const handleNodeTap=useCallback((node)=>{
    snd.tap();
    if(node.status==="available"){setChallengeCard(node);return;}
    setSelected(node);
  },[]);

  return <div style={{height:"calc(100vh - 64px)",display:"flex",flexDirection:"column",background:BG,overflow:"hidden"}}>
    <div style={{padding:"16px 20px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:14,color:TX}}>Mapa de habilidades</div>
      <div style={{fontSize:11,color:MU}}>{cards.filter(c=>c.mastery>=5).length}/{cards.length} dominadas</div>
    </div>
    <div style={{fontSize:11,color:MU,padding:"0 20px 10px",display:"flex",gap:12,flexWrap:"wrap"}}>
      {[{c:"#2a2535",l:"bloqueada"},{c:G,l:"disponível"},{c:PU,l:"aprendendo"},{c:GR,l:"dominada"}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:x.c,border:"1px solid "+x.c}}/><span style={{fontSize:9}}>{x.l}</span></div>)}
    </div>

    <svg ref={svgRef} style={{flex:1,background:"radial-gradient(ellipse at 50% 30%, #0f0d14 0%, "+BG+" 70%)",cursor:"grab"}}>
      <g ref={gRef}>
        {/* Edges */}
        {edges.map(e=><line key={e.id} x1={e.sx} y1={e.sy} x2={e.tx} y2={e.ty} stroke={e.met?G+"44":"#2a2535"} strokeWidth={e.met?1.5:1} strokeDasharray={e.met?"none":"4,4"}/>)}
        {/* Nodes */}
        {nodes.map(n=>{
          const r=nodeR[n.status]||22;
          const isAvail=n.status==="available";
          const label=n.status==="locked"||n.status==="available"?n.english:n.portuguese;
          const subLabel=n.status==="active"||n.status==="mastered"?n.english:null;
          const maxLen=12;
          const displayLabel=label&&label.length>maxLen?label.slice(0,maxLen-1)+"…":label||"—";
          return <g key={n.id} onClick={()=>handleNodeTap(n)} style={{cursor:"pointer"}}>
            {isAvail&&<circle cx={n.x} cy={n.y} r={r+6} fill="none" stroke={G} strokeWidth={1} opacity={0.3} style={{animation:"treeGlow 2s infinite"}}/>}
            <circle cx={n.x} cy={n.y} r={r} fill={nodeColor[n.status]} stroke={nodeStroke[n.status]} strokeWidth={n.status==="mastered"?2:1.5} opacity={n.status==="locked"?0.5:1}/>
            {n.mastery>0&&n.mastery<5&&<circle cx={n.x} cy={n.y} r={r-3} fill="none" stroke={n.mastery>=3?G:PU} strokeWidth={2} strokeDasharray={`${(n.mastery/5)*(2*Math.PI*(r-3))} ${2*Math.PI*(r-3)}`} transform={`rotate(-90,${n.x},${n.y})`} opacity={0.6}/>}
            {n.status==="locked"&&<text x={n.x} y={n.y-2} textAnchor="middle" fontSize={10} fill="#3a3545">🔒</text>}
            {n.status==="mastered"&&<text x={n.x} y={n.y-2} textAnchor="middle" fontSize={10} fill={GR}>✦</text>}
            <text x={n.x} y={n.status==="locked"?n.y+9:subLabel?n.y+3:n.y+4} textAnchor="middle" fontSize={n.status==="mastered"?9:8} fill={n.status==="locked"?"#3a3545":n.status==="available"?MU:n.status==="mastered"?GR:TX} fontWeight={n.status==="mastered"?"bold":"normal"}>{displayLabel}</text>
            {subLabel&&<text x={n.x} y={n.y+13} textAnchor="middle" fontSize={7} fill={MU}>{subLabel.length>14?subLabel.slice(0,13)+"…":subLabel}</text>}
          </g>;
        })}
      </g>
    </svg>

    {/* Selected card detail */}
    {selected&&<div style={{position:"absolute",bottom:80,left:16,right:16,background:S,border:"1px solid "+BD,borderRadius:16,padding:"16px 18px",animation:"slideUp 0.2s ease",zIndex:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><div style={{fontSize:18,color:G}}>{selected.portuguese}</div><div style={{fontSize:13,color:MU,marginTop:4}}>{selected.english}</div>{selected.contrast&&<div style={{fontSize:11,color:MU,marginTop:4,fontStyle:"italic"}}>formal: {selected.contrast}</div>}</div>
        <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:20,lineHeight:1}}>✕</button>
      </div>
      <div style={{display:"flex",gap:8,marginTop:10}}><Pill text={selected.type}/><Pill text={"box "+selected.mastery} gold/></div>
    </div>}

    {/* Unlock challenge modal */}
    {challengeCard&&<UnlockChallenge card={challengeCard} allCards={cards} onComplete={id=>{snd.unlock();hap([30,15,60]);onUnlockChallenge(id);setChallengeCard(null);}} onCancel={()=>setChallengeCard(null)}/>}
  </div>;
}

function UnlockChallenge({card,allCards,onComplete,onCancel}){
  const[step,setStep]=useState(0);// 0=preview, 1=challenge
  const[correct,setCorrect]=useState(0);
  // Quick 3-question recognition challenge
  const questions=useMemo(()=>{
    const pool=allCards.filter(c=>c.mastery>=1&&c.id!==card.id).sort(()=>Math.random()-0.5).slice(0,6);
    return Array.from({length:3},(_,i)=>{
      const wrongCard=pool[i]||allCards[0];
      const isFirstCorrect=Math.random()>0.5;
      return{opts:isFirstCorrect?[card.english,wrongCard.english]:[wrongCard.english,card.english],correctIdx:isFirstCorrect?0:1};
    });
  },[card,allCards]);
  const[qIdx,setQIdx]=useState(0);const[done,setDone]=useState(false);

  const answer=useCallback(idx=>{
    const isCorrect=idx===questions[qIdx].correctIdx;
    if(isCorrect){snd.correct();hap(40);}else{snd.wrong();hap([20,10,20]);}
    if(isCorrect)setCorrect(c=>c+1);
    if(qIdx+1>=3){setDone(true);}else{setQIdx(q=>q+1);}
  },[qIdx,questions]);

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div style={{width:"100%",maxWidth:480,background:S,borderRadius:"24px 24px 0 0",padding:"28px 24px 40px",animation:"slideUp 0.3s ease"}}>
      {step===0&&<>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:11,color:G,letterSpacing:3,marginBottom:12}}>DESBLOQUEAR PALAVRA</div>
          <div style={{fontSize:28,color:TX,marginBottom:6}}>{card.english}</div>
          <div style={{fontSize:13,color:MU}}>Complete 3 perguntas rápidas para desbloquear esta palavra no seu baralho.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onCancel} style={{padding:"16px",background:"transparent",border:"1px solid "+BD,borderRadius:14,color:MU,cursor:"pointer",fontFamily:"inherit"}}>Agora não</button>
          <button onClick={()=>setStep(1)} style={{padding:"16px",background:G,border:"none",borderRadius:14,color:BG,cursor:"pointer",fontFamily:"inherit",fontSize:14,letterSpacing:1}}>DESBLOQUEAR →</button>
        </div>
      </>}
      {step===1&&!done&&<>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:11,color:MU,letterSpacing:2}}>PERGUNTA {qIdx+1}/3</div>
          <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:i<qIdx?GR:i===qIdx?G:BD}}/>)}</div>
        </div>
        <div style={{background:S2,borderRadius:14,padding:"20px",textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:11,color:MU,letterSpacing:2,marginBottom:12}}>O QUE SIGNIFICA?</div>
          <div style={{fontSize:26,color:G,lineHeight:1.3}}>{card.portuguese}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {questions[qIdx].opts.map((opt,i)=><button key={i} onClick={()=>answer(i)} style={{padding:"16px",background:S2,border:"1px solid "+BD,borderRadius:12,color:TX,fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"border-color 0.15s"}} onMouseDown={e=>e.currentTarget.style.borderColor=G} onMouseUp={e=>e.currentTarget.style.borderColor=BD}>{opt}</button>)}
        </div>
      </>}
      {done&&<div style={{textAlign:"center",animation:"unlockPop 0.5s ease"}}>
        <div style={{fontSize:52,marginBottom:12}}>🔓</div>
        <div style={{fontSize:20,color:G,marginBottom:6}}>Desbloqueado!</div>
        <div style={{fontSize:15,color:TX,marginBottom:4}}>{card.portuguese}</div>
        <div style={{fontSize:13,color:MU,marginBottom:24}}>{correct}/3 corretas · agora no seu baralho</div>
        <button onClick={()=>onComplete(card.id)} style={{background:G,border:"none",borderRadius:14,padding:"14px 40px",color:BG,cursor:"pointer",fontFamily:"inherit",letterSpacing:2,fontSize:13}}>CONTINUAR</button>
      </div>}
    </div>
  </div>;
}

// ─── IMPORT SCREEN ────────────────────────────────────────────────
function Import({cards,onImport,onBack}){
  const[stage,setStage]=useState("idle");const[preview,setPreview]=useState([]);const[visible,setVisible]=useState(0);
  const fileRef=useRef();const existing=new Set(cards.map(c=>c.portuguese.toLowerCase().trim()));
  const handleFile=async e=>{
    const file=e.target.files?.[0];if(!file)return;setStage("parsing");setVisible(0);
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const items=await claudeParse(b64,existing);setPreview(items);setStage("preview");
      items.forEach((_,i)=>setTimeout(()=>{snd.pop();setVisible(v=>v+1);},i*130));
    }catch{setStage("idle");}
  };
  return <div style={{padding:"28px 24px"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
      <button onClick={()=>{snd.tap();onBack();}} style={{background:"none",border:"none",color:MU,fontSize:22,cursor:"pointer"}}>←</button>
      <div><div style={{fontSize:17,color:TX}}>Importar Aula</div><div style={{fontSize:11,color:MU,marginTop:2}}>{cards.length} cartas no baralho</div></div>
    </div>
    {stage==="idle"&&<><div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed "+BD,borderRadius:18,padding:"56px 24px",textAlign:"center",cursor:"pointer",transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=G} onMouseLeave={e=>e.currentTarget.style.borderColor=BD}><div style={{fontSize:40,marginBottom:14}}>📄</div><div style={{fontSize:15,color:TX,marginBottom:6}}>Soltar PDF aqui</div><div style={{fontSize:12,color:MU}}>ou toque para selecionar</div><input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} style={{display:"none"}}/></div><div style={{marginTop:18,background:S,border:"1px solid "+BD,borderRadius:14,padding:"18px"}}><div style={{fontSize:10,color:MU,letterSpacing:2,marginBottom:8}}>COMO FUNCIONA</div><div style={{fontSize:13,color:MU,lineHeight:1.8}}>Envie o PDF das suas aulas. Cartas já existentes são ignoradas. Novo conteúdo entra com pontuação zero. Desbloqueios acontecem automaticamente conforme você avança.</div></div></>}
    {stage==="parsing"&&<div style={{textAlign:"center",padding:"72px 0"}}><div style={{fontSize:11,color:G,letterSpacing:4,marginBottom:12,animation:"pulse 1s infinite"}}>ANALISANDO</div><div style={{fontSize:12,color:MU}}>Claude está extraindo o conteúdo...</div></div>}
    {stage==="preview"&&<><div style={{background:S,border:"1px solid "+BD,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontSize:13,color:MU}}>{existing.size} existentes ignoradas</div><div style={{fontSize:24,color:GR,marginTop:4}}>{preview.length} novas cartas encontradas</div></div><div style={{maxHeight:290,overflowY:"auto",marginBottom:16}}>{preview.slice(0,visible).map((item,i)=><div key={i} style={{background:S,border:"1px solid "+BD,borderRadius:12,padding:"12px 16px",marginBottom:8,animation:"packPop 0.3s ease both"}}><div style={{fontSize:15,color:G}}>{item.portuguese}</div><div style={{fontSize:12,color:MU,marginTop:3}}>{item.english||"—"}</div></div>)}</div>{visible>=preview.length&&preview.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><button onClick={()=>setStage("idle")} style={{padding:"16px",background:"transparent",border:"1px solid "+BD,borderRadius:14,color:MU,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button><button onClick={()=>{snd.done();hap([40,20,40,20,80]);onImport(preview);setStage("done");}} style={{padding:"16px",background:G,border:"none",borderRadius:14,color:BG,cursor:"pointer",fontFamily:"inherit",fontSize:14,letterSpacing:1,boxShadow:"0 4px 16px "+G+"33"}}>ADICIONAR</button></div>}</>}
    {stage==="done"&&<div style={{textAlign:"center",padding:"72px 0",animation:"slideUp 0.4s ease"}}><div style={{fontSize:52,marginBottom:14,animation:"bounce 0.6s ease"}}>🎉</div><div style={{color:G,fontSize:16,marginBottom:28}}>{preview.length} cartas adicionadas!</div><button onClick={()=>{snd.tap();onBack();}} style={{background:G,border:"none",borderRadius:14,padding:"14px 40px",color:BG,cursor:"pointer",fontFamily:"inherit",letterSpacing:2,fontSize:13}}>VOLTAR</button></div>}
  </div>;
}

// ─── HOME SCREEN ─────────────────────────────────────────────────
function Home({cards,fluency,momentum,tier,go}){
  const df=useCount(fluency);
  const nextTier=TIERS.find(t=>t.min>cards.filter(c=>c.mastery>=5).length);
  const mastered=cards.filter(c=>c.mastery>=5).length;
  const due=cards.filter(c=>new Date(c.nextReview)<=new Date()&&c.mastery>0).length;
  const available=cards.filter(c=>getCardStatus(c,cards)==="available"&&c.mastery===0).length;
  const tp=nextTier?((mastered-tier.min)/(nextTier.min-tier.min))*100:100;
  const vocab=cards.filter(c=>c.mastery>=2).length;

  // Tutor nudge
  const nudge=useMemo(()=>{
    if(due>=5)return{icon:"📚",text:`${due} cartas aguardando revisão`,action:"study",cta:"Revisar agora"};
    if(available>=3)return{icon:"🔓",text:`${available} novas palavras desbloqueadas`,action:"tree",cta:"Ver no mapa"};
    if(vocab>=3)return{icon:"💬",text:"Você tem vocabulário para praticar frases",action:"sentence",cta:"Modo frase"};
    return null;
  },[due,available,vocab]);

  return <div style={{padding:"40px 24px 24px",animation:"slideUp 0.4s ease"}}>
    <div style={{textAlign:"center",marginBottom:36}}>
      <div style={{fontSize:10,letterSpacing:4,color:MU,marginBottom:8}}>FLUENCY RATING</div>
      <div style={{fontSize:76,color:G,lineHeight:1,fontWeight:"normal"}}>{df}</div>
      <div style={{fontSize:12,color:tier.color,marginTop:12,letterSpacing:3}}>{tier.name.toUpperCase()}</div>
      {nextTier&&<div style={{marginTop:14,padding:"0 40px"}}><div style={{height:3,background:BD,borderRadius:3,animation:"glow 2s infinite"}}><div style={{height:"100%",width:tp+"%",background:G,borderRadius:3,transition:"width 0.8s ease"}}/></div><div style={{fontSize:10,color:MU,marginTop:5}}>{mastered} / {nextTier.min} para {nextTier.name}</div></div>}
    </div>

    <div style={{background:S,border:"1px solid "+BD,borderRadius:14,padding:"18px 20px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:10,letterSpacing:3,color:MU}}>MOMENTUM</span><span style={{fontSize:12,color:momentum>60?GR:momentum>30?YE:RE}}>{momentum}%</span></div>
      <div style={{height:4,background:BD,borderRadius:4}}><div style={{height:"100%",width:momentum+"%",background:momentum>60?GR:momentum>30?YE:RE,borderRadius:4,transition:"width 0.6s ease"}}/></div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
      {[{l:"TOTAL",v:cards.length,c:TX},{l:"HOJE",v:due,c:due>0?YE:GR,p:due>5},{l:"DOMINADAS",v:mastered,c:GR}].map(x=><div key={x.l} style={{background:S,border:"1px solid "+BD,borderRadius:12,padding:"16px 10px",textAlign:"center",animation:x.p?"pulse 2s infinite":"none"}}><div style={{fontSize:26,color:x.c,marginBottom:4}}>{x.v}</div><div style={{fontSize:9,color:MU,letterSpacing:2}}>{x.l}</div></div>)}
    </div>

    {/* Tutor nudge */}
    {nudge&&<div onClick={()=>{snd.tap();go(nudge.action);}} style={{background:S2,border:"1px solid "+G+"44",borderRadius:14,padding:"14px 16px",marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",gap:12,animation:"glow 3s infinite"}}>
      <span style={{fontSize:20}}>{nudge.icon}</span>
      <div style={{flex:1}}><div style={{fontSize:12,color:TX}}>{nudge.text}</div></div>
      <div style={{fontSize:11,color:G,letterSpacing:1,whiteSpace:"nowrap"}}>{nudge.cta} →</div>
    </div>}

    {available>0&&<div style={{background:S,border:"1px solid "+PU+"66",borderRadius:14,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:16}}>🔓</span>
      <div style={{flex:1,fontSize:12,color:TX}}><span style={{color:PU,fontWeight:"bold"}}>{available}</span> palavras novas desbloqueadas no mapa</div>
      <button onClick={()=>{snd.tap();go("tree");}} style={{background:PU+"22",border:"1px solid "+PU+"55",borderRadius:8,padding:"6px 12px",color:PU,fontSize:11,cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>VER →</button>
    </div>}

    <button onClick={()=>{snd.tap();go("study");}} style={{width:"100%",background:G,border:"none",borderRadius:14,padding:"20px",color:BG,fontSize:15,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",marginBottom:10,fontWeight:"bold",boxShadow:"0 4px 24px "+G+"33",transition:"transform 0.12s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
      {due>0?"📚 REVISAR — "+due+" CARTAS":"📚 ESTUDAR"}
    </button>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <button onClick={()=>{snd.tap();go("swipe");}} style={{padding:"14px",background:"transparent",border:"1px solid "+BD,borderRadius:14,color:MU,fontSize:12,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=G;e.currentTarget.style.color=G;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=BD;e.currentTarget.style.color=MU;}}>⇄ SWIPE</button>
      <button onClick={()=>{snd.tap();go("sentence");}} style={{padding:"14px",background:"transparent",border:"1px solid "+BD,borderRadius:14,color:MU,fontSize:12,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=G;e.currentTarget.style.color=G;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=BD;e.currentTarget.style.color=MU;}}>💬 FRASE</button>
    </div>
  </div>;
}

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App(){
  const[cards,setCards]=useState([]);
  const[fluency,setFluency]=useState(1000);const[momentum,setMomentum]=useState(75);
  const[screen,setScreen]=useState("home");
  const[loaded,setLoaded]=useState(false);
  const[grad,setGrad]=useState(null);
  const[unlockToast,setUnlockToast]=useState(null);
  const[soundOn,setSoundOn]=useState(true);

  useEffect(()=>{const style=document.createElement("style");style.textContent=CSS;document.head.appendChild(style);return()=>document.head.removeChild(style);},[]);
  useEffect(()=>{dbLoad().then(s=>{if(s?.cards?.length){setCards(s.cards);setFluency(s.fluency||1000);setMomentum(s.momentum||75);}else setCards(CARDS);setLoaded(true);});},[]);
  useEffect(()=>{if(loaded)dbSave({cards,fluency,momentum});},[cards,fluency,momentum,loaded]);
  useEffect(()=>{snd.on=soundOn;},[soundOn]);

  const applyRates=useCallback((prevCards,updates)=>{
    let newCards=[...prevCards];
    let newlyUnlocked=[];
    updates.forEach(({id,q,mode})=>{
      newCards=newCards.map(c=>{if(c.id!==id)return c;const u=sm2(c,q);if(c.mastery<5&&u.mastery>=5)setGrad(c);return{...c,...u};});
      setFluency(f=>Math.max(500,f+(q>=4?8:q>=3?2:-4)));
      setMomentum(m=>Math.max(0,Math.min(100,m+(q>=3?3:-2))));
    });
    // Check for new unlocks
    const unlocked=checkNewUnlocks(prevCards,newCards);
    if(unlocked.length>0){setUnlockToast(unlocked);hap([30,15,60]);}
    return newCards;
  },[]);

  const onRate=useCallback((id,q,mode)=>{
    setCards(prev=>applyRates(prev,[{id,q,mode}]));
  },[applyRates]);

  const onRateMultiple=useCallback((cardUpdates,mode)=>{
    const updates=Object.entries(cardUpdates).map(([id,q])=>({id,q,mode}));
    if(updates.length)setCards(prev=>applyRates(prev,updates));
  },[applyRates]);

  const onUnlockChallenge=useCallback(cardId=>{
    setCards(prev=>{
      const sm={...sm2(prev.find(c=>c.id===cardId)||{},3),mastery:1};
      return prev.map(c=>c.id===cardId?{...c,...sm}:c);
    });
  },[]);

  const onImport=useCallback(items=>{
    setCards(prev=>[...prev,...items.map((it,i)=>mk("imp-"+Date.now()+"-"+i,it.portuguese,it.english||"—",it.type||"vocab",{cluster:it.cluster||null,contrast:it.contrast||null}))]);
  },[]);

  if(!loaded)return <div style={{background:BG,height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:52,marginBottom:14,animation:"bounce 1s infinite"}}>🇧🇷</div><div style={{color:G,fontSize:11,letterSpacing:4}}>CARREGANDO</div></div>;

  const mastered=cards.filter(c=>c.mastery>=5).length;
  const tier=getTier(mastered);
  const due=cards.filter(c=>new Date(c.nextReview)<=new Date()&&c.mastery>0).length;

  return <div style={{background:BG,minHeight:"100vh",maxWidth:480,margin:"0 auto",fontFamily:"Georgia,serif",color:TX,display:"flex",flexDirection:"column",position:"relative"}}>
    {unlockToast&&<UnlockToast cards={unlockToast} onDismiss={()=>setUnlockToast(null)}/>}
    <div style={{position:"absolute",top:8,right:16,zIndex:50}}>
      <button onClick={()=>setSoundOn(x=>!x)} style={{background:"none",border:"none",color:MU,fontSize:16,cursor:"pointer",opacity:0.7}}>{soundOn?"🔊":"🔇"}</button>
    </div>
    <div style={{flex:1,overflowY:"auto",paddingBottom:64}}>
      {screen==="home"&&<Home cards={cards} fluency={fluency} momentum={momentum} tier={tier} go={setScreen}/>}
      {screen==="study"&&<Study cards={cards} onRate={onRate} onBack={()=>setScreen("home")}/>}
      {screen==="swipe"&&<Swipe cards={cards} onRate={onRate} onBack={()=>setScreen("home")}/>}
      {screen==="sentence"&&<SentenceMode cards={cards} onRateMultiple={onRateMultiple} onBack={()=>setScreen("home")}/>}
      {screen==="tree"&&<SkillTree cards={cards} onUnlockChallenge={onUnlockChallenge}/>}
      {screen==="import"&&<Import cards={cards} onImport={onImport} onBack={()=>setScreen("home")}/>}
    </div>
    <Nav screen={screen} go={setScreen} due={due}/>
    {grad&&<GradOverlay card={grad} onClose={()=>setGrad(null)}/>}
  </div>;
}
