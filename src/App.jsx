import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const USER_ID='00000000-0000-0000-0000-000000000001'
const BG='#07070f',S='#0d0d1a',S2='#131324',BD='#1a1a32',AC='#4f8ef7',TX='#eeeef5',MU='#55557a',GR='#34d399',RE='#f87171',YE='#fbbf24'
const FONT="-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif"
const TIERS=[{name:'Turista',min:0},{name:'Comunicador',min:15},{name:'Carioca',min:35},{name:'Carioca Honorario',min:60}]
const getTier=n=>TIERS.reduce((a,t)=>n>=t.min?t:a,TIERS[0])
const CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body{background:${BG};overscroll-behavior:none;font-family:${FONT}}@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}textarea,input{font-family:${FONT}}`

function sm2(card,q){
  let ef=card.easeFactor??2.5,iv=card.interval??0,rp=card.reps??0
  if(q>=3){iv=rp===0?1:rp===1?6:Math.round(iv*ef);rp++}else{iv=1;rp=0}
  ef=Math.max(1.3,ef+0.1-(5-q)*(0.08+(5-q)*0.02))
  const nr=new Date();nr.setDate(nr.getDate()+iv)
  const mastery=Math.min(5,rp===0?0:rp<=1?1:rp<=3?2:rp<=5?3:rp<=8?4:5)
  return{easeFactor:ef,interval:iv,reps:rp,nextReview:nr.toISOString(),mastery}
}

function enforceInterleaving(deck){
  const result=[],remaining=[...deck]
  while(remaining.length>0){
    const lastClusters=result.slice(-3).map(c=>c.cluster).filter(Boolean)
    const idx=remaining.findIndex(c=>!c.cluster||!lastClusters.includes(c.cluster))
    if(idx===-1){result.push(...remaining);break}
    result.push(remaining.splice(idx,1)[0])
  }
  return result
}

function buildDeck(cards){
  const now=new Date()
  const due=cards.filter(c=>new Date(c.nextReview)<=now&&c.mastery>0).sort(()=>Math.random()-0.5)
  const fresh=cards.filter(c=>c.mastery===0).sort(()=>Math.random()-0.5)
  const deck=!due.length?fresh.slice(0,20):[...due,...fresh.slice(0,Math.max(3,Math.round(due.length*0.3)))].slice(0,20)
  return enforceInterleaving(deck)
}

const mk=(id,p,e,t,x={})=>({id:String(id),portuguese:p,english:e,type:t,cluster:null,contrast:null,scenario:null,exampleSentence:null,mastery:0,easeFactor:2.5,interval:0,reps:0,nextReview:new Date().toISOString(),sentenceScore:0,sentenceCount:0,recognitionMastery:0,productionMastery:0,...x})

const SEED=[
  mk(1,'opa','hey / whoa','giria',{cluster:'greeting',exampleSentence:'Opa, tudo bom?'}),
  mk(2,'vixe','geez / oh wow','giria',{cluster:'exclamation',exampleSentence:'Vixe, que calor demais!'}),
  mk(3,'eita','damn / wow','giria',{cluster:'exclamation',exampleSentence:'Eita, que baguca!'}),
  mk(4,'puta merda','holy shit','giria',{cluster:'exclamation',exampleSentence:'Puta merda, esqueci minha carteira!'}),
  mk(5,'caralho','fuck / holy shit','giria',{cluster:'exclamation',exampleSentence:'Caralho mano, que susto!'}),
  mk(6,'caraca','wow — softer than caralho','giria',{cluster:'exclamation',contrast:'caralho',exampleSentence:'Caraca, voce e de Londres?'}),
  mk(7,'puta que pariu','holy fucking shit','giria',{cluster:'exclamation',exampleSentence:'Puta que pariu, que transito!'}),
  mk(8,'koe',"what's up?",'giria',{cluster:'greeting',exampleSentence:'Koe, qual foi?'}),
  mk(9,'fala ai','what\'s up / talk to me','giria',{cluster:'greeting',exampleSentence:'Fala ai, ta tudo bem?'}),
  mk(10,'coisa','thing','vocab',{cluster:'thing',exampleSentence:'Que coisa estranha isso.'}),
  mk(11,'treco','thing / stuff informal','giria',{cluster:'thing',exampleSentence:'Que treco e esse?'}),
  mk(12,'bagulho','thing / stuff street','giria',{cluster:'thing',exampleSentence:'Esse bagulho ta do caralho.'}),
  mk(13,'mano','bro / man','giria',{cluster:'address',exampleSentence:'Mano, voce viu isso?'}),
  mk(14,'cara','dude / man','giria',{cluster:'address',exampleSentence:'Cara, que situacao estranha.'}),
  mk(15,'gatinha','attractive girl / hottie','giria',{exampleSentence:'Tu e uma gatinha, sabia?'}),
  mk(16,'gostoso/a','hot / delicious','vocab',{exampleSentence:'Essa comida ta gostosa demais.'}),
  mk(17,'to ligado','I understand / I get it','frase_pronta',{exampleSentence:'To ligado, pode falar.'}),
  mk(18,'ta ligado?','you know? / you get it?','frase_pronta',{exampleSentence:'A gente vai sair, ta ligado?'}),
  mk(19,'bora',"let's go",'giria',{cluster:'letsgo',contrast:'vamos',exampleSentence:'Bora tomar uma gelada!'}),
  mk(20,'tamo indo',"we're heading out",'frase_pronta',{cluster:'letsgo',contrast:'estamos indo',exampleSentence:'Tamo indo, te vejo la.'}),
  mk(21,'acabei de aprender isso','I just learned this','sentence',{exampleSentence:'Acabei de aprender isso hoje na aula.'}),
  mk(22,'valeu','thanks / bet / aight','giria',{exampleSentence:'Valeu mano, voce e demais.'}),
  mk(23,'tchau','goodbye','vocab',{exampleSentence:'Tchau, te vejo amanha!'}),
  mk(24,'ate logo','see you later','frase_pronta',{exampleSentence:'Ate logo, foi um prazer.'}),
  mk(25,'foi um prazer','it was a pleasure','frase_pronta',{exampleSentence:'Foi um prazer te conhecer, cara.'}),
  mk(26,'a gente se ve',"we'll see each other",'frase_pronta',{exampleSentence:'A gente se ve na festa entao.'}),
  mk(27,'a gente','us / we — replaces nos in Carioca','grammar',{contrast:'nos',exampleSentence:'A gente vai pra praia hoje.'}),
  mk(28,'vamo pra praia',"let's go to the beach",'sentence',{cluster:'letsgo',contrast:'nos vamos a praia',scenario:'social',exampleSentence:'Vamo pra praia? Ta fazendo calor demais.'}),
  mk(29,'eu me mudei pro Rio','I moved to Rio','sentence',{contrast:'eu me mudei para o Rio',exampleSentence:'Eu me mudei pro Rio pq eu amo o Brasil.'}),
  mk(30,'pra / pro','to the — contracted','grammar',{contrast:'para a / para o',exampleSentence:'Vou pra praia, depois pro bar.'}),
  mk(31,'queria','wanted / was wanting','vocab',{exampleSentence:'Eu queria morar em algum lugar bonito.'}),
  mk(32,'me ve uma cerveja','can I have a beer','frase_pronta',{contrast:'eu gostaria de uma cerveja',scenario:'ordering',exampleSentence:'Me ve uma cerveja gelada, por favor.'}),
  mk(33,'me ve uma gelada','can I have a cold one','frase_pronta',{contrast:'eu gostaria de uma cerveja gelada',scenario:'ordering',exampleSentence:'Me ve uma gelada ai, valeu.'}),
  mk(34,'bora tomar uma',"let's grab a drink",'frase_pronta',{cluster:'letsgo',scenario:'social',exampleSentence:'Bora tomar uma, a noite ta boa.'}),
  mk(35,'a conta por favor','the check please','frase_pronta',{scenario:'ordering',exampleSentence:'Moco, a conta por favor.'}),
  mk(36,'pode repetir?','can you repeat that?','frase_pronta',{exampleSentence:'Pode repetir? Nao entendi direito.'}),
  mk(37,'pode falar devagar?','can you speak slowly?','frase_pronta',{exampleSentence:'Pode falar devagar, por favor?'}),
  mk(38,'qual e o nome?',"what's the name?",'frase_pronta',{exampleSentence:'Opa, qual e o nome?'}),
  mk(39,'quanto que ta?','how much is it?','frase_pronta',{scenario:'shopping',exampleSentence:'Quanto que ta essa camiseta?'}),
  mk(40,'po faz por quinze?','come on, make it fifteen?','frase_pronta',{scenario:'shopping',exampleSentence:'Ta dezoito? Po faz por quinze?'}),
  mk(41,'vou pagar no credito',"I'll pay by card",'frase_pronta',{scenario:'shopping',exampleSentence:'Vou pagar no credito, pode ser?'}),
  mk(42,'eu tambem','me too','vocab',{exampleSentence:'Po, to com fome. Eu tambem!'}),
  mk(43,'sem gas','still water','vocab',{scenario:'ordering',exampleSentence:'Me ve uma agua sem gas, por favor.'}),
  mk(44,'exatamente','exactly','vocab',{exampleSentence:'Exatamente isso que eu queria dizer.'}),
  mk(45,'concordo','I agree','vocab',{exampleSentence:'Concordo com voce, cara.'}),
  mk(46,'mesmo','same / really / even','vocab',{exampleSentence:'Mesmo carro, mesma roupa — que coincidencia.'}),
  mk(47,'e mesmo','oh yeah that\'s true','giria',{exampleSentence:'E mesmo, esqueci que voce nao bebe.'}),
  mk(48,'parecido','similar','vocab',{exampleSentence:'E parecido com o que temos no Brasil.'}),
  mk(49,'sem graca','boring / bland','vocab',{exampleSentence:'Aldershot e uma cidade bem sem graca.'}),
  mk(50,'nasci e cresci no Rio','I was born and raised in Rio','sentence',{exampleSentence:'Sou carioca, nasci e cresci no Rio.'}),
  mk(51,'atrasado','late','vocab',{exampleSentence:'Mano estamos atrasados, bora!'}),
  mk(52,'demais','too much / a lot','vocab',{exampleSentence:'Ta fazendo calor demais hoje.'}),
  mk(53,'depois','after / later','vocab',{exampleSentence:'Bora tomar uma depois do trabalho.'}),
  mk(54,'de boa','chilling / all good','giria',{exampleSentence:'To de boa em casa hoje.'}),
  mk(55,'ta pronta?','are you ready?','frase_pronta',{exampleSentence:'Ta pronta? A gente ta te esperando.'}),
  mk(56,'mao de vaca','stingy / cheapskate','giria',{exampleSentence:'Nao compensa, o cara e mao de vaca demais.'}),
  mk(57,'nao compensa','not worth it','frase_pronta',{exampleSentence:'Nao compensa ir la, fica longe demais.'}),
  mk(58,'trouxa','dumb / sucker','giria',{exampleSentence:'Tu e muito trouxa de ter acreditado nisso.'}),
  mk(59,'eu tava no clube','I was at the club','sentence',{contrast:'eu estava no clube',exampleSentence:'Eu tava no clube quando recebi a mensagem.'}),
  mk(60,'eu fui pra praia','I went to the beach','sentence',{exampleSentence:'Eu fui pra praia ontem, tava incrivel.'}),
  mk(61,'eu quero ir pra praia','I want to go to the beach','sentence',{exampleSentence:'Hoje eu quero ir pra praia de manha.'}),
  mk(62,'eu quero ir pro bar','I want to go to the bar','sentence',{scenario:'social',exampleSentence:'Eu quero ir pro bar depois, bora?'}),
  mk(63,'bairro','neighbourhood','vocab',{exampleSentence:'Qual bairro voce mora?'}),
  mk(64,'po','come on / damn mild','giria',{exampleSentence:'Po, to com fome mano.'}),
  mk(65,'uma delicia','delicious / amazing','vocab',{scenario:'food',exampleSentence:'Essa comida ta uma delicia!'}),
  mk(66,'essa comida ta do caralho','this food is fucking amazing','sentence',{scenario:'food',exampleSentence:'Cara, essa comida ta do caralho mesmo.'}),
  mk(67,'de + a = da','contraction: da — cafe da manha','grammar',{exampleSentence:'Cafe da manha, carro da Juliana.'}),
  mk(68,'de + o = do','contraction: do — carro do Victor','grammar',{exampleSentence:'Carro do Victor, nome do lugar.'}),
  mk(69,'eu gosto de futebol','I like football','sentence',{exampleSentence:'Eu gosto de futebol, eu amo nadar.'}),
  mk(70,'mano estamos atrasados bora',"bro we're late let's go",'sentence',{cluster:'letsgo',exampleSentence:'Mano estamos atrasados, bora logo!'}),
  mk(71,'tudo','everything','vocab',{exampleSentence:'Tudo bem com voce?'}),
  mk(72,'voce vai?','are you going?','frase_pronta',{exampleSentence:'Voce vai na festa hoje?'}),
  mk(73,'eu quero','I want','vocab',{exampleSentence:'Eu quero ir pra praia hoje.'}),
  mk(74,'eu quero dormir','I want to sleep','sentence',{exampleSentence:'To cansado demais, eu quero dormir.'}),
  mk(75,'eu quero cochilar','I want to nap','sentence',{exampleSentence:'Ei vou cochilar um pouco, to destruido.'}),
  mk(76,'eu quero um banho','I want a shower','sentence',{exampleSentence:'Eu quero um banho depois da praia.'}),
  mk(77,'eu quero tomar um banho','I want to take a shower','sentence',{exampleSentence:'Deixa eu tomar um banho antes de sair.'}),
  mk(78,'eu quero uma massagem','I want a massage','sentence',{exampleSentence:'Depois desse dia eu quero uma massagem.'}),
  mk(79,'eu quero ir pra...','I want to go to...','grammar',{exampleSentence:'Eu quero ir pra um barzinho hoje a noite.'}),
  mk(80,'eu queria ir','I wanted to go','frase_pronta',{exampleSentence:'Eu queria ir mas tava cansado demais.'}),
  mk(81,'viajar','to travel','vocab',{exampleSentence:'Eu amo viajar pelo Brasil.'}),
  mk(82,'viagem','trip / travel','vocab',{exampleSentence:'Que viagem incrivel foi essa!'}),
  mk(83,'eu quero descansar','I want to rest','sentence',{exampleSentence:'Eu preciso descansar hoje, to destruido.'}),
  mk(84,'eu quero um beijo','I want a kiss','sentence',{exampleSentence:'Juliana, eu quero um beijo.'}),
  mk(85,'cafune','gentle head scratch / hair stroke','giria',{exampleSentence:'Me da um cafune? To estressado.'}),
  mk(86,'eu preciso de...','I need...','grammar',{exampleSentence:'Eu preciso de um cafe agora.'}),
  mk(87,'vem aqui','come here','frase_pronta',{exampleSentence:'Vem aqui, deixa eu te mostrar uma coisa.'}),
  mk(88,'alto','tall / high','vocab',{exampleSentence:'Ele e muito alto, ne?'}),
  mk(89,'baixo','short / low','vocab',{exampleSentence:'O preco ta baixo hoje.'}),
  mk(90,'que caralho','what the fuck','giria',{cluster:'exclamation',exampleSentence:'Que caralho foi isso?!'}),
  mk(91,'que porra','what the fuck stronger','giria',{cluster:'exclamation',exampleSentence:'Que porra e essa mano?'}),
  mk(92,'assim','like this','vocab',{exampleSentence:'Faz assim, olha — pode fazer tipo assim.'}),
  mk(93,'tipo','like discourse marker','giria',{exampleSentence:'Eu tava tipo, bebado na festa.'}),
  mk(94,'foda','badass / fucking amazing','giria',{exampleSentence:'Natureza e foda ne irmao.'}),
  mk(95,'ne','right? tag question','giria',{exampleSentence:'Ta fazendo calor demais, ne?'}),
  mk(96,'irmao','brother / bro','giria',{cluster:'address',exampleSentence:'Irmao, voce viu o jogo ontem?'}),
  // Day 13 missed
  mk(97,'o que e isso?','what is this?','frase_pronta',{exampleSentence:'O que e isso? Nunca vi antes.'}),
  mk(98,'natureza','nature','vocab',{exampleSentence:'Natureza e foda ne, irmao.'}),
  // Day 14
  mk(99,'nossa','wow / oh my god','giria',{cluster:'exclamation',exampleSentence:'Nossa, que dia lindo!'}),
  mk(100,'tudo bem','everything good / all good','frase_pronta',{cluster:'greeting',exampleSentence:'Tudo bem? Tudo bom!'}),
  mk(101,'tudo bom','all good','frase_pronta',{cluster:'greeting',exampleSentence:'Oi, tudo bom por ai?'}),
  mk(102,'ruim','bad','vocab',{contrast:'mau/mal',exampleSentence:'O tempo ta ruim hoje.'}),
  mk(103,'tempo','time / weather','vocab',{exampleSentence:'O tempo ta otimo hoje!'}),
  mk(104,'semana que vem','next week','frase_pronta',{exampleSentence:'A gente se ve semana que vem.'}),
  mk(105,'segunda-feira','Monday','vocab',{cluster:'days',exampleSentence:'Te vejo segunda-feira.'}),
  mk(106,'terca-feira','Tuesday','vocab',{cluster:'days',exampleSentence:'Terca-feira a gente vai ao mercado.'}),
  mk(107,'quarta-feira','Wednesday','vocab',{cluster:'days',exampleSentence:'Quarta-feira e dia de treino.'}),
  mk(108,'quinta-feira','Thursday','vocab',{cluster:'days',exampleSentence:'Quinta-feira ja?'}),
  mk(109,'sexta-feira','Friday','vocab',{cluster:'days',exampleSentence:'Sexta-feira bora tomar uma!'}),
  mk(110,'sabado','Saturday','vocab',{cluster:'days',exampleSentence:'Sabado a praia ta cheia.'}),
  mk(111,'domingo','Sunday','vocab',{cluster:'days',exampleSentence:'Domingo e dia de descanso.'}),
  mk(112,'te vejo segunda','see you Monday','frase_pronta',{exampleSentence:'Valeu cara, te vejo segunda!'}),
  mk(113,'ser vs estar','SER = what it is. ESTAR = how it is right now','grammar',{exampleSentence:'E bonito (always). Esta bonito (right now).'}),
  mk(114,'voce quer?','do you want?','frase_pronta',{exampleSentence:'Voce quer uma cerveja?'}),
  mk(115,'dia lindo ne?','beautiful day right?','frase_pronta',{exampleSentence:'Dia lindo ne? Bora pra praia!'}),
  // Day 15
  mk(116,'outro/outra','another / other','vocab',{exampleSentence:'Me ve outra gelada, valeu.'}),
  mk(117,'mais um/uma','one more','frase_pronta',{exampleSentence:'Mais uma? Bora!'}),
  mk(118,'verao','summer','vocab',{exampleSentence:'No verao o Rio e incrivel.'}),
  mk(119,'voce tem?','do you have?','frase_pronta',{exampleSentence:'Voce tem uma cerveja gelada?'}),
  mk(120,'frio','cold','vocab',{cluster:'weather',exampleSentence:'Esta frio hoje, ne?'}),
  mk(121,'bonito','beautiful / pretty','vocab',{exampleSentence:'Que lugar bonito, cara!'}),
  mk(122,'nublado','cloudy','vocab',{cluster:'weather',exampleSentence:'Ta nublado mas nao vai chover.'}),
  mk(123,'molhado','wet','vocab',{exampleSentence:'Fiquei todo molhado na chuva.'}),
  mk(124,'ensolarado','sunny','vocab',{cluster:'weather',exampleSentence:'Dia ensolarado, bora pra praia!'}),
  mk(125,'esta quente','it is hot right now','sentence',{contrast:'e quente (permanent fact)',exampleSentence:'Esta quente demais hoje!'}),
  mk(126,'esta frio','it is cold right now','sentence',{contrast:'e frio (permanent fact)',exampleSentence:'Esta frio la fora, leva um casaco.'}),
  mk(127,'esta nublado','it is cloudy right now','sentence',{exampleSentence:'Esta nublado, nao vai dar praia hoje.'}),
  mk(128,'e bonito','it is beautiful (permanent quality)','sentence',{contrast:'esta bonito (looking good right now)',exampleSentence:'E bonito aqui, ne?'}),
]

const SB_URL=import.meta.env.VITE_SUPABASE_URL
const SB_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY
const sb=(SB_URL&&SB_KEY)?createClient(SB_URL,SB_KEY):null
const toRow=c=>({id:c.id,user_id:USER_ID,portuguese:c.portuguese,english:c.english,example_sentence:c.exampleSentence||null,type:c.type,cluster:c.cluster||null,contrast:c.contrast||null,scenario:c.scenario||null,mastery:c.mastery||0,ease_factor:c.easeFactor||2.5,interval:c.interval||0,reps:c.reps||0,next_review:c.nextReview||new Date().toISOString(),sentence_score:c.sentenceScore||0,sentence_count:c.sentenceCount||0,recognition_mastery:c.recognitionMastery||0,production_mastery:c.productionMastery||0})
const fromRow=r=>({id:r.id,portuguese:r.portuguese,english:r.english,exampleSentence:r.example_sentence,type:r.type,cluster:r.cluster,contrast:r.contrast,scenario:r.scenario,mastery:r.mastery||0,easeFactor:r.ease_factor||2.5,interval:r.interval||0,reps:r.reps||0,nextReview:r.next_review||new Date().toISOString(),sentenceScore:r.sentence_score||0,sentenceCount:r.sentence_count||0,recognitionMastery:r.recognition_mastery||0,productionMastery:r.production_mastery||0})

async function dbLoad(){if(!sb)return null;try{const[{data:cards},{data:state}]=await Promise.all([sb.from('cards').select('*').eq('user_id',USER_ID),sb.from('user_state').select('*').eq('user_id',USER_ID).single()]);return{cards:(cards||[]).map(fromRow),state:state||null}}catch(e){return null}}
async function dbSeed(){if(!sb)return;await sb.from('cards').upsert(SEED.map(toRow),{onConflict:'id,user_id'})}
async function dbUpdateCard(card){if(!sb)return;await sb.from('cards').update({mastery:card.mastery,ease_factor:card.easeFactor,interval:card.interval,reps:card.reps,next_review:card.nextReview,sentence_score:card.sentenceScore||0,sentence_count:card.sentenceCount||0,recognition_mastery:card.recognitionMastery||0,production_mastery:card.productionMastery||0,updated_at:new Date().toISOString()}).eq('id',card.id).eq('user_id',USER_ID)}
async function dbInsertCards(newCards){if(!sb)return;await sb.from('cards').insert(newCards.map(toRow))}
async function dbSaveState(streak,lastDate,sentenceHistory){if(!sb)return;await sb.from('user_state').upsert({user_id:USER_ID,streak_days:streak,last_session_date:lastDate,sentence_history:sentenceHistory||[],updated_at:new Date().toISOString()},{onConflict:'user_id'})}
async function dbLogReview(cardId,quality,mode){if(!sb)return;await sb.from('card_reviews').insert({user_id:USER_ID,card_id:cardId,quality,mode})}

async function callClaude(system,messages,max=900){const r=await fetch('/.netlify/functions/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system,messages,max_tokens:max})});const d=await r.json();return d.content?.[0]?.text||''}
const ct=(sys,txt,max)=>callClaude(sys,[{role:'user',content:txt}],max)
const RULES=`CRITICAL: NEVER penalise missing/wrong accents. ta=ta, voce=voce, e=e casual all fine. Accept ALL Carioca: tamo,pra,ta,num,ce. Judge MEANING only. Validate first, correct second.`

async function evalCardAnswer(card,answer){
  const raw=await ct(`Carioca Portuguese tutor evaluating a flashcard translation.\n${RULES}\nReply ONLY valid JSON: {"accuracy":0-100,"naturalness":0-100,"feedback":"warm one line","correction":"better version or null"}`,
  `Card: "${card.portuguese}" = "${card.english}"${card.contrast?`. Carioca: "${card.contrast}"`:''}. Student: "${answer}"`,400)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}
  catch{return{accuracy:50,naturalness:50,feedback:"Could not evaluate.",correction:null}}
}

function Spinner({size=20}){return <div style={{width:size,height:size,border:`2px solid ${BD}`,borderTopColor:AC,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
function Tag({text,color}){const c=color||AC;return <span style={{fontSize:11,padding:'3px 9px',borderRadius:6,background:`${c}22`,color:c,fontWeight:500}}>{text}</span>}
function PBtn({label,onClick,disabled,full=true,small}){return <button onClick={disabled?null:onClick} style={{width:full?'100%':undefined,background:disabled?S2:AC,color:disabled?MU:'#fff',border:'none',borderRadius:13,padding:small?'10px 18px':'15px 24px',fontSize:small?13:15,fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,fontFamily:FONT}} onMouseDown={e=>{if(!disabled)e.currentTarget.style.opacity='0.8'}} onMouseUp={e=>e.currentTarget.style.opacity='1'}>{label}</button>}
function GBtn({label,onClick}){return <button onClick={onClick} style={{background:S2,border:`1px solid ${BD}`,color:MU,borderRadius:13,padding:'14px 24px',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:FONT,width:'100%'}}>{label}</button>}
function MasteryDots({mastery,size=8}){return <div style={{display:'flex',gap:3}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:size,height:size,borderRadius:'50%',background:i<=mastery?(mastery>=4?GR:mastery>=2?AC:YE):BD}}/>)}</div>}

function CardStatPopup({card,onClose}){
  const daysUntil=Math.round((new Date(card.nextReview)-new Date())/86400000)
  const status=daysUntil<0?`${Math.abs(daysUntil)}d overdue`:daysUntil===0?'Due today':`In ${daysUntil}d`
  const statusColor=daysUntil<0?RE:daysUntil<=1?YE:GR
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,background:S,borderRadius:'20px 20px 0 0',padding:'24px 24px 40px',animation:'up 0.25s ease'}}>
      <div style={{fontSize:20,fontWeight:700,color:TX,marginBottom:4}}>{card.portuguese}</div>
      <div style={{fontSize:14,color:MU,marginBottom:20}}>{card.english}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[{l:'Mastery',v:<MasteryDots mastery={card.mastery}/>},{l:'Next review',v:<span style={{color:statusColor,fontSize:13,fontWeight:600}}>{status}</span>},{l:'Recognition',v:`${card.recognitionMastery||0}/5`},{l:'Production',v:`${card.productionMastery||0}/5`},{l:'Interval',v:`${card.interval||0} days`},{l:'Ease factor',v:(card.easeFactor||2.5).toFixed(2)},{l:'Reps',v:card.reps||0},{l:'Sentence uses',v:card.sentenceCount||0}].map(({l,v})=><div key={l} style={{background:S2,borderRadius:10,padding:'12px'}}>
          <div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:4}}>{l.toUpperCase()}</div>
          <div style={{fontSize:14,color:TX,fontWeight:600}}>{v}</div>
        </div>)}
      </div>
      {card.exampleSentence&&<div style={{background:S2,borderRadius:10,padding:'12px',marginBottom:12}}>
        <div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:4}}>EXAMPLE</div>
        <div style={{fontSize:14,color:TX,fontStyle:'italic'}}>{card.exampleSentence}</div>
      </div>}
      {card.contrast&&<div style={{background:S2,borderRadius:10,padding:'12px',marginBottom:12}}>
        <div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:4}}>FORMAL EQUIVALENT</div>
        <div style={{fontSize:14,color:MU,fontStyle:'italic'}}>{card.contrast}</div>
      </div>}
      <GBtn label="Close" onClick={onClose}/>
    </div>
  </div>
}

function Nav({screen,go,due}){
  const tabs=[{k:'home',i:'⊙',l:'Home'},{k:'study',i:'▣',l:'Study',b:due},{k:'phrase',i:'◈',l:'Phrase'},{k:'bank',i:'☰',l:'Bank'},{k:'import',i:'↑',l:'Import'}]
  return <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:`${S}ee`,borderTop:`1px solid ${BD}`,display:'flex',padding:'8px 0 22px',backdropFilter:'blur(16px)',zIndex:100}}>
    {tabs.map(t=><button key={t.k} onClick={()=>go(t.k)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'4px 0',position:'relative',fontFamily:FONT}}>
      <span style={{fontSize:20,opacity:screen===t.k?1:0.3,filter:screen===t.k?`drop-shadow(0 0 8px ${AC})`:'none'}}>{t.i}</span>
      <span style={{fontSize:10,color:screen===t.k?AC:MU,fontWeight:screen===t.k?700:400}}>{t.l}</span>
      {t.b>0&&<div style={{position:'absolute',top:2,right:'15%',width:7,height:7,background:RE,borderRadius:'50%'}}/>}
    </button>)}
  </div>
}

function Home({cards,streak,lastDate,tier,go}){
  const due=cards.filter(c=>new Date(c.nextReview)<=new Date()&&c.mastery>0).length
  const mastered=cards.filter(c=>c.mastery>=5).length
  const inSentences=cards.filter(c=>c.sentenceCount>0).length
  const nextTier=TIERS.find(t=>t.min>mastered)
  const pct=nextTier?((mastered-tier.min)/(nextTier.min-tier.min))*100:100
  const studiedToday=lastDate===new Date().toISOString().slice(0,10)
  return <div style={{padding:'52px 24px 100px',animation:'up 0.35s ease'}}>
    <div style={{marginBottom:36}}>
      <div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:8}}>YOUR PROGRESS</div>
      <div style={{display:'flex',alignItems:'baseline',gap:12,marginBottom:4}}>
        <span style={{fontSize:48,fontWeight:900,color:TX,lineHeight:1}}>{mastered}</span>
        <span style={{fontSize:18,color:MU}}>of {cards.length} mastered</span>
      </div>
      <div style={{fontSize:14,color:MU,marginBottom:12}}>{inSentences} used in sentences</div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:14,color:AC,fontWeight:700}}>{tier.name}</span>
        {nextTier&&<div style={{flex:1,height:3,background:BD,borderRadius:3}}><div style={{height:'100%',width:`${pct}%`,background:AC,borderRadius:3,transition:'width 0.7s ease'}}/></div>}
        {nextTier&&<span style={{fontSize:11,color:MU}}>{nextTier.min-mastered} to go</span>}
        {streak>0&&<span style={{fontSize:14,color:YE,fontWeight:700}}>🔥 {streak}d</span>}
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:28}}>
      {[{label:'Cards',val:cards.length,color:TX},{label:'Due',val:due,color:due>0?YE:GR},{label:'Mastered',val:mastered,color:GR}].map(s=><div key={s.label} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px 12px',textAlign:'center'}}>
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
  const mainDeck=useMemo(()=>{const d=buildDeck(cards);return d.length?d:cards.slice(0,20)},[])
  const[idx,setIdx]=useState(0)
  const[deck,setDeck]=useState(mainDeck)
  const[isRetest,setIsRetest]=useState(false)
  const[wrongCards,setWrongCards]=useState([])
  const[flipped,setFlipped]=useState(false)
  const[flipping,setFlipping]=useState(false)
  const[phase,setPhase]=useState('front')
  const[ans,setAns]=useState('')
  const[ev,setEv]=useState(null)
  const[showCorrection,setShowCorrection]=useState(false)
  const[combo,setCombo]=useState(0)
  const[hist,setHist]=useState([])
  const[done,setDone]=useState(false)
  const[cardKey,setCardKey]=useState(0)
  const[statCard,setStatCard]=useState(null)
  const card=deck[idx]
  const isDeep=card&&card.mastery>=2
  const doFlip=useCallback(cb=>{setFlipping(true);setTimeout(()=>{cb();setFlipping(false)},170)},[])
  const advance=useCallback(q=>{
    onRate(card.id,q,'study')
    if(q<3&&!isRetest)setWrongCards(w=>[...w,card])
    setCombo(c=>q>=3?c+1:0)
    setHist(h=>[...h,{card,q}])
    setShowCorrection(false)
    const nextIdx=idx+1
    if(nextIdx>=deck.length){
      if(!isRetest&&wrongCards.length>0){
        setDeck([...wrongCards]);setIdx(0);setIsRetest(true)
        setFlipped(false);setPhase('front');setAns('');setEv(null);setCardKey(k=>k+1)
        return
      }
      setDone(true);return
    }
    doFlip(()=>{setIdx(nextIdx);setFlipped(false);setPhase('front');setAns('');setEv(null);setCardKey(k=>k+1)})
  },[card,idx,deck,isRetest,wrongCards,onRate,doFlip])
  const tap=useCallback(async()=>{
    if(flipped||flipping)return
    if(isDeep&&phase==='front'){setPhase('typing');return}
    if(isDeep&&phase==='typing'){
      if(!ans.trim()){doFlip(()=>{setFlipped(true);setPhase('back')});return}
      setPhase('evaluating')
      const res=await evalCardAnswer(card,ans)
      doFlip(()=>{setEv(res);setFlipped(true);setPhase('back')})
      return
    }
    doFlip(()=>{setFlipped(true);setPhase('back')})
  },[flipped,flipping,isDeep,phase,ans,card,doFlip])
  useEffect(()=>{if(flipped&&ev){const t=setTimeout(()=>setShowCorrection(true),1000);return()=>clearTimeout(t)}},[flipped,ev])
  if(done)return <StudyDone hist={hist} combo={combo} wrongCount={wrongCards.length} onBack={onBack}/>
  if(!card)return null
  return <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
    {statCard&&<CardStatPopup card={statCard} onClose={()=>setStatCard(null)}/>}
    <div style={{padding:'16px 20px 8px',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:26,cursor:'pointer',fontFamily:FONT}}>‹</button>
      <div style={{flex:1,height:3,background:BD,borderRadius:3}}><div style={{height:'100%',width:`${(idx/deck.length)*100}%`,background:isRetest?YE:AC,borderRadius:3,transition:'width 0.3s'}}/></div>
      {isRetest&&<span style={{fontSize:11,color:YE,fontWeight:700}}>RE-TEST</span>}
      {combo>=3&&<span style={{fontSize:13,color:YE,fontWeight:700}}>🔥 {combo}</span>}
      <span style={{fontSize:12,color:MU,fontWeight:500}}>{idx+1}/{deck.length}</span>
    </div>
    <div style={{flex:1,padding:'8px 20px 16px',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <Tag text={card.type}/>{card.contrast&&<Tag text="Carioca" color={GR}/>}{card.scenario&&<Tag text={card.scenario} color={MU}/>}
        <button onClick={()=>setStatCard(card)} style={{background:'none',border:'none',cursor:'pointer',marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}><MasteryDots mastery={card.mastery}/></button>
      </div>
      <div style={{position:'relative',flex:1,display:'flex',flexDirection:'column'}}>
        {deck[idx+2]&&<div style={{position:'absolute',inset:0,background:S,border:`1px solid ${BD}`,borderRadius:22,transform:'translateY(12px) scale(0.91)',opacity:0.28}}/>}
        {deck[idx+1]&&<div style={{position:'absolute',inset:0,background:S,border:`1px solid ${BD}`,borderRadius:22,transform:'translateY(6px) scale(0.956)',opacity:0.52}}/>}
        <div key={cardKey} style={{position:'relative',flex:1,zIndex:2,display:'flex',flexDirection:'column',animation:'up 0.28s ease',opacity:flipping?0:1,transform:flipping?'scaleX(0.05)':'scaleX(1)',transition:flipping?'all 0.15s ease':'none'}}>
          {!flipped
            ?<div onClick={phase!=='typing'?tap:undefined} style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:22,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 28px',textAlign:'center',cursor:phase==='typing'?'default':'pointer'}}>
              {phase==='front'&&<><div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:18}}>PORTUGUESE</div><div style={{fontSize:card.portuguese.length>22?22:38,color:TX,fontWeight:700,lineHeight:1.25,marginBottom:card.exampleSentence?16:24}}>{card.portuguese}</div>{card.exampleSentence&&<div style={{fontSize:12,color:MU,fontStyle:'italic',marginBottom:16,maxWidth:280}}>{card.exampleSentence}</div>}<div style={{fontSize:13,color:MU,padding:'9px 22px',border:`1px solid ${BD}`,borderRadius:22}}>{isDeep?'Tap to translate':'Tap to reveal'}</div></>}
              {phase==='typing'&&<div style={{width:'100%'}}><div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:14}}>TRANSLATE TO ENGLISH</div><div style={{fontSize:card.portuguese.length>22?20:32,color:TX,fontWeight:700,lineHeight:1.3,marginBottom:20}}>{card.portuguese}</div><textarea value={ans} onChange={e=>setAns(e.target.value)} autoFocus placeholder="write your translation…" style={{width:'100%',background:BG,border:`1px solid ${BD}`,borderRadius:13,padding:'14px',color:TX,fontSize:15,resize:'none',outline:'none',minHeight:72,boxSizing:'border-box',marginBottom:12}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/><PBtn label="Reveal →" onClick={tap} disabled={!ans.trim()}/></div>}
              {phase==='evaluating'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}><Spinner/><span style={{fontSize:13,color:MU}}>Evaluating…</span></div>}
            </div>
            :<div style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:22,padding:'24px',overflowY:'auto',display:'flex',flexDirection:'column'}}>
              <div style={{fontSize:card.portuguese.length>22?18:28,color:TX,fontWeight:700,marginBottom:8,lineHeight:1.3}}>{card.portuguese}</div>
              <div style={{fontSize:17,color:TX,lineHeight:1.5,marginBottom:12}}>{card.english}</div>
              {card.contrast&&<div style={{padding:'10px 0',borderTop:`1px solid ${BD}`,marginBottom:12}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:4}}>FORMAL PORTUGUESE</div><div style={{fontSize:13,color:MU,fontStyle:'italic'}}>{card.contrast}</div></div>}
              {card.exampleSentence&&<div style={{padding:'10px 0',borderTop:`1px solid ${BD}`,marginBottom:12}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:4}}>EXAMPLE</div><div style={{fontSize:13,color:TX,fontStyle:'italic'}}>{card.exampleSentence}</div></div>}
              {ev&&showCorrection&&<div style={{background:S2,borderRadius:14,padding:'14px',marginBottom:14,animation:'fadeIn 0.4s ease'}}>
                <div style={{display:'flex',gap:8,marginBottom:10}}>{[{l:'Accuracy',v:ev.accuracy||50},{l:'Carioca',v:ev.naturalness||50}].map(x=>{const c=x.v>=75?GR:x.v>=50?YE:RE;return <div key={x.l} style={{flex:1,background:BG,borderRadius:10,padding:'10px',textAlign:'center'}}><div style={{fontSize:22,fontWeight:800,color:c}}>{x.v}</div><div style={{fontSize:10,color:MU,fontWeight:600,marginTop:3}}>{x.l.toUpperCase()}</div></div>})}</div>
                {ev.feedback&&<div style={{fontSize:13,color:TX,marginBottom:ev.correction?8:0,lineHeight:1.5}}>"{ev.feedback}"</div>}
                {ev.correction&&<div style={{fontSize:13,color:GR,fontStyle:'italic'}}>→ {ev.correction}</div>}
              </div>}
              <div style={{marginTop:'auto',paddingTop:12}}>
                <div style={{fontSize:11,color:MU,fontWeight:600,textAlign:'center',marginBottom:10}}>HOW DID YOU DO?</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[{l:'✗',sub:'Again',q:1,c:RE},{l:'△',sub:'Almost',q:3,c:YE},{l:'✓',sub:'Got it',q:5,c:GR}].map(x=><button key={x.q} onClick={()=>advance(x.q)} style={{padding:'14px 8px',background:`${x.c}18`,border:`1px solid ${x.c}44`,borderRadius:14,color:x.c,cursor:'pointer',fontFamily:FONT,transition:'transform 0.12s'}} onMouseDown={e=>e.currentTarget.style.transform='scale(0.92)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><div style={{fontSize:22,marginBottom:3}}>{x.l}</div><div style={{fontSize:12,fontWeight:500}}>{x.sub}</div></button>)}
                </div>
              </div>
            </div>}
        </div>
      </div>
    </div>
  </div>
}

function StudyDone({hist,combo,wrongCount,onBack}){
  const ok=hist.filter(h=>h.q>=4).length,al=hist.filter(h=>h.q===3).length,no=hist.filter(h=>h.q<3).length
  const corrections=hist.filter(h=>h.q<3).map(h=>h.card.portuguese)
  return <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 24px 100px',animation:'up 0.4s ease'}}>
    <div style={{fontSize:56,marginBottom:16,animation:'pop 0.5s ease'}}>🎉</div>
    <div style={{fontSize:26,fontWeight:800,color:TX,marginBottom:6}}>Session done</div>
    {wrongCount>0&&<div style={{fontSize:13,color:YE,marginBottom:6}}>Retested {wrongCount} missed cards</div>}
    {combo>=3&&<div style={{fontSize:14,color:YE,fontWeight:700,marginBottom:20}}>🔥 Best combo: {combo}</div>}
    <div style={{display:'flex',gap:28,marginBottom:corrections.length?24:32}}>{[{v:ok,c:GR,l:'correct'},{v:al,c:YE,l:'almost'},{v:no,c:RE,l:'again'}].map(x=><div key={x.l} style={{textAlign:'center'}}><div style={{fontSize:34,fontWeight:800,color:x.c}}>{x.v}</div><div style={{fontSize:11,color:MU,fontWeight:500}}>{x.l}</div></div>)}</div>
    {corrections.length>0&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',width:'100%',marginBottom:24}}><div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:10}}>REVIEW THESE</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{corrections.map((p,i)=><span key={i} style={{padding:'4px 10px',borderRadius:8,background:`${RE}18`,color:RE,fontSize:12,fontWeight:600}}>{p}</span>)}</div></div>}
    <PBtn label="Done" onClick={onBack}/>
  </div>
}


async function dbSaveHoF(entry){if(!sb)return;await sb.from('sentence_hall_of_fame').insert({user_id:USER_ID,...entry})}
async function dbLoadHoF(){if(!sb)return[];const{data}=await sb.from('sentence_hall_of_fame').select('*').eq('user_id',USER_ID).order('naturalness_score',{ascending:false}).limit(20);return data||[]}
async function dbLogImport(filename,added,skipped){if(!sb)return;await sb.from('import_history').insert({user_id:USER_ID,filename,cards_added:added,cards_skipped:skipped})}
async function dbLoadImportHistory(){if(!sb)return[];const{data}=await sb.from('import_history').select('*').eq('user_id',USER_ID).order('created_at',{ascending:false}).limit(10);return data||[]}
async function dbUpdateErrorPattern(errorType,example){if(!sb)return;try{const{data}=await sb.from('error_patterns').select('*').eq('user_id',USER_ID).eq('error_type',errorType).single();if(data){const examples=[...(data.examples||[]).slice(-4),example];await sb.from('error_patterns').update({count:(data.count||0)+1,last_seen:new Date().toISOString(),examples}).eq('user_id',USER_ID).eq('error_type',errorType)}else{await sb.from('error_patterns').insert({user_id:USER_ID,error_type:errorType,count:1,last_seen:new Date().toISOString(),examples:[example]})}}catch(e){}}
async function dbLoadErrorPatterns(){if(!sb)return[];try{const{data}=await sb.from('error_patterns').select('*').eq('user_id',USER_ID).order('count',{ascending:false});return data||[]}catch(e){return[]}}

const FULL_RULES=`CRITICAL RULES — follow exactly:
1. NEVER penalise missing or wrong accents. ta=ta, voce=voce, e=e in casual context — all fine.
2. Accept ALL Carioca speech: tamo=estamos, pra=para, ta=esta, num=nao, ce=voce, po=po.
3. Judge MEANING and intelligibility only. Not formal grammar.
4. Tone: validate first, correct second. Example: "Nice — just worth noting: ta not ta."
5. Wrong ONLY if meaning is actually different or unintelligible.
6. Test: would a Carioca understand what they meant?`

async function genScenario(cards,sentenceHistory,errorPatterns){
  const vocab=cards.filter(c=>c.mastery>=1||cards.length<6).slice(0,30).map(c=>`${c.portuguese} (${c.english}, mastery:${c.mastery}, uses:${c.sentenceCount})`).join('\n')
  const priority=cards.filter(c=>c.mastery>=1&&c.sentenceCount===0).slice(0,5).map(c=>c.portuguese).join(', ')
  const recent=(sentenceHistory||[]).slice(-4).map(s=>s.english).join(' | ')
  const errorFocus=(errorPatterns||[]).slice(0,2).map(e=>e.error_type).join(', ')
  const n=cards.length
  const complexity=n<6?'very simple 2-3 words':n<15?'short sentence familiar vocab':'full situational scenario'
  const raw=await ct(`You are a Carioca Portuguese tutor in Rio creating sentence practice.\n${FULL_RULES}\nCreate ONE realistic Rio situation. Student writes what they would say — not a translation.\nComplexity: ${complexity}. Prioritise words never used in sentences: ${priority||'any'}.\nTarget error patterns if possible: ${errorFocus||'none yet'}.\nDo NOT repeat: ${recent||'none'}. Set in real Rio life: boteco, praia, uber, rua, vizinho, mercado etc.\nReply ONLY valid JSON: {"english":"situation","targetWords":["w1","w2"],"scenario":"boteco|praia|rua|social|compras","context":"brief scene","structure":"grammar pattern e.g. eu quero ir pra..."}`,
  `Vocabulary:\n${vocab}\n\nGenerate:`,600)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}
  catch{return{english:"You just walked into your local boteco. Order a cold one.",targetWords:['me ve','gelada'],scenario:'boteco',context:'At a bar in Rio',structure:'me ve + noun'}}
}

async function evalAnswer(scenario,answer,cards){
  const raw=await ct(`You are a warm Carioca Portuguese tutor.\n${FULL_RULES}\nReply ONLY valid JSON: {"wordScores":{"word":1-5},"naturalness":0-100,"feedback":"one warm validating line then soft correction if needed","correction":"natural Carioca version if improvement possible else null","errorType":"register|vocabulary|structure|production|null"}`,
  `Situation: ${scenario.english}\nTargets: ${scenario.targetWords?.join(', ')||''}\nStudent: "${answer}"`,500)
  try{
    const ev=JSON.parse(raw.replace(/```json|```/g,'').trim())
    const cardUpdates={}
    Object.entries(ev.wordScores||{}).forEach(([word,score])=>{const card=cards.find(c=>c.portuguese.toLowerCase().includes(word.toLowerCase()));if(card)cardUpdates[card.id]=score})
    return{...ev,cardUpdates}
  }catch{return{wordScores:{},naturalness:50,feedback:"Couldn't evaluate — check connection.",correction:null,errorType:null,cardUpdates:{}}}
}

async function claudeSearch(query,cards){
  const list=cards.map(c=>`${c.id}|${c.portuguese}|${c.english||''}|${c.type}`).join('\n')
  const raw=await ct(`Search a Portuguese vocabulary bank. Find the most relevant cards for the query — match by meaning not just string. Query can be English or Portuguese. Reply ONLY a JSON array of card IDs in relevance order max 20: ["id1","id2"]`,`Query: "${query}"\n\nCards:\n${list}`,400)
  try{const ids=JSON.parse(raw.replace(/```json|```/g,'').trim());return ids.map(id=>cards.find(c=>c.id===id)).filter(Boolean)}
  catch{return[]}
}

function normPT(s){
  return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
}

// Split pasted text into day chunks
function splitByDays(text){
  const chunks=[]
  const dayRegex=/(?:^|\n)\s*(Day|DAY)\s+(\d+)/g
  let match
  const positions=[]
  while((match=dayRegex.exec(text))!==null){
    positions.push({day:parseInt(match[2]),idx:match.index})
  }
  if(positions.length===0)return[{day:0,text:text.trim()}]
  for(let i=0;i<positions.length;i++){
    const{day,idx}=positions[i]
    const end=i+1<positions.length?positions[i+1].idx:text.length
    chunks.push({day,text:text.slice(idx,end).trim()})
  }
  return chunks
}

// Extract new cards from pasted text
async function extractFromText(pastedText,existingCards){
  const existingList=existingCards.map(c=>c.portuguese).join('\n')
  const existingNorm=new Set(existingCards.map(c=>normPT(c.portuguese)))
  const ALWAYS_SKIP=[1,2,3,4,5,6,7,8,9,10,11,12,13]

  const chunks=splitByDays(pastedText)
  console.log('Found chunks:',chunks.map(c=>`Day ${c.day}`))

  // Determine which days to skip
  const dayCardCounts={}
  existingCards.forEach(c=>{if(c.sourceDay)dayCardCounts[c.sourceDay]=(dayCardCounts[c.sourceDay]||0)+1})
  const coveredDays=new Set([...ALWAYS_SKIP,...Object.keys(dayCardCounts).filter(d=>dayCardCounts[d]>=3).map(Number)])

  const newChunks=chunks.filter(c=>c.day===0||!coveredDays.has(c.day))
  console.log('Processing:',newChunks.map(c=>`Day ${c.day}`))

  if(newChunks.length===0)return[]

  const allItems=[]
  const seenNorm=new Set([...existingNorm])

  for(const chunk of newChunks){
    if(chunk.text.length<30)continue

    // Focus on new content subsections — skip straight to them if found
    const markers=['Matéria:','Materia:','Aula de Hoje:','Aula de hoje:','Coisas de hoje:','Quer aprender:']
    let focusText=chunk.text
    for(const m of markers){
      const idx=chunk.text.indexOf(m)
      if(idx>0){focusText=chunk.text.slice(idx);break}
    }
    const hasMarker=markers.some(m=>chunk.text.includes(m))

    // Skip chunks that are pure review with no new content signal
    const lc=chunk.text.toLowerCase()
    const reviewCount=(lc.match(/revis[aã]o/g)||[]).length
    const newCount=(lc.match(/aula de hoje|matéria|materia|coisas de hoje|quer aprender/g)||[]).length
    if(reviewCount>3&&newCount===0&&chunk.day>0&&coveredDays.has(chunk.day-1)){
      console.log(`Skipping Day ${chunk.day} — review only`)
      continue
    }

    const raw=await ct(
      `You are extracting NEW vocabulary cards from a Brazilian Portuguese lesson.
The professor writes informal messy notes in Google Docs — formatting is inconsistent.

STUDENT ALREADY HAS THESE WORDS — skip anything with the same meaning (ignore accents when comparing):
${existingList}

HOW THIS DOCUMENT IS STRUCTURED:
- "Revisão 1/2/Geral/da ultima aula:" = review of old content = SKIP ENTIRELY
- "Matéria:", "Aula de Hoje:", "Coisas de hoje:", "Quer aprender:" = NEW content = EXTRACT
- Lines with !, *, ?, (!) (*) (?) after them = mastery markers = SKIP THE MARKER, keep the word IF it's new
- "To Learn:", "Proxima aula:", "Homework:" = skip
- "(errado)" or lines marked as wrong = skip
- Pronunciation tables (CH=SH, R=H etc) = skip

WHAT TO EXTRACT:
- New vocabulary words
- New fixed phrases used as units
- New grammar rules (make ONE clear card per rule)
- Repeated patterns: eu quero ir pra praia/bar/festa → ONE card: "eu quero ir pra..." = "I want to go to..."
- Conjugation tables: only extract if the word itself is new

SEMANTIC DEDUP: if an item means the same as something in the deck (even with different accents or phrasing), skip it.

Return ONLY a valid JSON array, no markdown, no explanation:
[{"portuguese":"correct accents","english":"translation","type":"giria|vocab|frase_pronta|grammar|sentence","cluster":"semantic group or null","contrast":"formal Portuguese if Carioca, else null","exampleSentence":"example or null"}]
If nothing new: []`,
      `DAY ${chunk.day} LESSON TEXT${hasMarker?' (new content section)':''}:\n${focusText.slice(0,5000)}`,
      2000
    )

    let items=[]
    try{
      let cleaned=raw.replace(/```json|```/g,'').trim()
      if(!cleaned.startsWith('['))cleaned='[]'
      if(!cleaned.endsWith(']')){
        const last=cleaned.lastIndexOf('},')
        cleaned=last>0?cleaned.slice(0,last+1)+']':'[]'
      }
      items=JSON.parse(cleaned)
    }catch(e){
      const match=raw.match(/\[[\s\S]*\]/)
      if(match){try{items=JSON.parse(match[0])}catch(e2){}}
    }

    const filtered=items.filter(i=>{
      if(!i||!i.portuguese)return false
      const n=normPT(i.portuguese)
      if(seenNorm.has(n))return false
      seenNorm.add(n)
      return true
    }).map(i=>({...i,sourceDay:chunk.day||0}))

    allItems.push(...filtered)
    console.log(`Day ${chunk.day}: ${filtered.length} new items`)
  }

  return allItems
}
async function iwantToSay(thought){
  const raw=await ct(`You are a Carioca Portuguese assistant. Give the most natural Carioca way to say what the student wants — not formal Portuguese.\nReply ONLY valid JSON: {"portuguese":"Carioca version","pronunciation":"rough phonetic guide","note":"brief usage note if helpful"}`,
  `I want to say: "${thought}"`,300)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}
  catch{return{portuguese:'...',pronunciation:'',note:''}}
}

async function openChatScene(scene){
  const raw=await ct(`You are a Carioca local in Rio for language practice. Short, casual, real Carioca contractions and giria.\nReply ONLY valid JSON: {"message":"opening in Portuguese","translation":"English translation"}`,
  `Scene: ${scene}\n\nOpen:`,300)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}
  catch{return{message:'Oi! Tudo bom?',translation:'Hey! All good?'}}
}

async function replyChatScene(history){
  const convo=history.map(h=>`${h.role==='user'?'Student':'Carioca'}: ${h.content}`).join('\n')
  const raw=await ct(`You are a Carioca local having a casual conversation with a language student.\n${FULL_RULES}\nKeep replies short, natural, Carioca. Use contractions and giria naturally.\nReply ONLY valid JSON: {"message":"reply in Portuguese","translation":"English translation","correction":"if student made error give gentle correction like nice just noting X not Y — else null"}`,
  `Conversation:\n${convo}\n\nYour reply:`,300)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}
  catch{return{message:'E mesmo?',translation:'Oh really?',correction:null}}
}

async function evalFullChat(history,turnCorrections,cards){
  const convo=history.map(h=>`${h.role}: ${h.content}`).join('\n')
  const vocab=cards.filter(c=>c.mastery>=1).map(c=>c.portuguese).slice(0,20).join(', ')
  const prior=turnCorrections.filter(Boolean).join(' | ')
  const raw=await ct(`Evaluate a Carioca Portuguese conversation by a language student.\n${FULL_RULES}\nIMPORTANT: Be fully congruent with these turn-by-turn corrections already given: ${prior||'none'}. Do not contradict them.\nReply ONLY valid JSON: {"overallScore":0-100,"feedback":"2-3 sentences warm specific","corrections":["correction1"],"wordsUsedWell":["word1"]}`,
  `Student vocab: ${vocab}\n\nConversation:\n${convo}`,500)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}
  catch{return{overallScore:70,feedback:'Good effort! Keep practising.',corrections:[],wordsUsedWell:[]}}
}

// ── PHRASE ────────────────────────────────────────────────────────
function Phrase({cards,onRateMultiple,sentenceHistory,onSaveSentence,onBack}){
  const[tab,setTab]=useState('practice')
  return <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
    <div style={{padding:'16px 20px 0',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:26,cursor:'pointer',fontFamily:FONT}}>‹</button>
      <div style={{display:'flex',background:S2,borderRadius:11,padding:3,gap:2}}>
        {[['practice','Practice'],['chat','Chat'],['say','Say it'],['best','Best']].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:'7px 14px',borderRadius:9,background:tab===k?AC:'transparent',color:tab===k?'#fff':MU,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:FONT,transition:'all 0.15s'}}>{l}</button>)}
      </div>
    </div>
    <div style={{flex:1,overflowY:'auto'}}>
      {tab==='practice'&&<Practice cards={cards} onRateMultiple={onRateMultiple} sentenceHistory={sentenceHistory} onSaveSentence={onSaveSentence}/>}
      {tab==='chat'&&<ChatMode cards={cards} onRateMultiple={onRateMultiple}/>}
      {tab==='say'&&<IWantToSay/>}
      {tab==='best'&&<BestSentences/>}
    </div>
  </div>
}

function Practice({cards,onRateMultiple,sentenceHistory,onSaveSentence}){
  const[phase,setPhase]=useState('idle')
  const[scenario,setScenario]=useState(null)
  const[ans,setAns]=useState('')
  const[ev,setEv]=useState(null)
  const[showCorrection,setShowCorrection]=useState(false)
  const[count,setCount]=useState(0)
  const[sessionCorrections,setSessionCorrections]=useState([])
  const[showEnd,setShowEnd]=useState(false)
  const[errorPatterns,setErrorPatterns]=useState([])
  useEffect(()=>{dbLoadErrorPatterns().then(setErrorPatterns)},[])
  const generate=useCallback(async()=>{setPhase('loading');setAns('');setEv(null);setShowCorrection(false);const s=await genScenario(cards,sentenceHistory||[],errorPatterns);setScenario(s);setPhase('writing')},[cards,sentenceHistory,errorPatterns])
  const submit=useCallback(async()=>{
    if(!ans.trim()||!scenario)return
    setPhase('evaluating')
    const res=await evalAnswer(scenario,ans,cards)
    setEv(res);setCount(c=>c+1)
    onRateMultiple(res.cardUpdates||{},'sentence')
    if(res.errorType&&res.naturalness<75)dbUpdateErrorPattern(res.errorType,`${scenario.english} => ${ans}`)
    onSaveSentence({english:scenario.english,userAnswer:ans,scenario:scenario.scenario,date:new Date().toISOString()})
    if(res.correction)setSessionCorrections(sc=>[...sc,res.correction])
    if(res.naturalness>=85)dbSaveHoF({portuguese:ans,english_prompt:scenario.english,scenario:scenario.scenario,naturalness_score:res.naturalness})
    setPhase('result')
    setTimeout(()=>setShowCorrection(true),1000)
  },[ans,scenario,cards,onRateMultiple,onSaveSentence])
  const icons={boteco:'🍺',praia:'🏖️',rua:'🛣️',social:'👥',compras:'🛍️',food:'🍽️'}
  if(showEnd)return <div style={{padding:'24px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:16}}>Session corrections</div>
    {sessionCorrections.length===0?<div style={{fontSize:14,color:GR,padding:'20px 0'}}>No corrections this session — great work!</div>
    :sessionCorrections.map((c,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 16px',marginBottom:8}}><div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:4}}>CORRECTION {i+1}</div><div style={{fontSize:14,color:GR}}>→ {c}</div></div>)}
    <div style={{marginTop:20,display:'flex',gap:10}}>
      <PBtn label="New session" onClick={()=>{setShowEnd(false);setSessionCorrections([]);setCount(0);setPhase('idle')}}/>
      <GBtn label="Done" onClick={()=>setShowEnd(false)}/>
    </div>
  </div>
  return <div style={{padding:'20px 20px 40px'}}>
    {phase==='idle'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',paddingTop:48,gap:16,animation:'up 0.3s ease'}}>
      <div style={{fontSize:52}}>💬</div>
      <div style={{fontSize:22,fontWeight:800,color:TX}}>Phrase Practice</div>
      <div style={{fontSize:14,color:MU,lineHeight:1.7,maxWidth:300}}>Claude builds a real Rio scenario from your vocabulary. Write what you'd actually say — no accent penalties.</div>
      <PBtn label="Generate scenario →" onClick={generate}/>
    </div>}
    {phase==='loading'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}><Spinner size={28}/><span style={{fontSize:14,color:MU}}>Claude is thinking…</span></div>}
    {(phase==='writing'||phase==='evaluating')&&scenario&&<div style={{animation:'up 0.3s ease'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
        <span style={{fontSize:22}}>{icons[scenario.scenario]||'💬'}</span>
        <Tag text={scenario.scenario||'general'} color={MU}/>
        {scenario.targetWords?.map(w=><Tag key={w} text={w} color={AC}/>)}
      </div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:18}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:10}}>SITUATION</div>
        <div style={{fontSize:18,color:TX,lineHeight:1.55}}>{scenario.english}</div>
        {scenario.context&&<div style={{fontSize:12,color:MU,marginTop:10,fontStyle:'italic'}}>📍 {scenario.context}</div>}
      </div>
      <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:8}}>YOUR RESPONSE IN PORTUGUESE</div>
      <textarea value={ans} onChange={e=>setAns(e.target.value)} placeholder="write here… (accents optional)" style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',color:TX,fontSize:16,resize:'none',outline:'none',minHeight:90,boxSizing:'border-box',marginBottom:12}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      {phase==='evaluating'?<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:18}}><Spinner/><span style={{color:MU,fontSize:13}}>Evaluating…</span></div>:<PBtn label="Submit →" onClick={submit} disabled={!ans.trim()}/>}
    </div>}
    {phase==='result'&&ev&&scenario&&<div style={{animation:'up 0.3s ease'}}>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:14,textAlign:'center'}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:6}}>CARIOCA NATURALNESS</div>
        <div style={{fontSize:52,fontWeight:900,color:ev.naturalness>=75?GR:ev.naturalness>=50?YE:RE,lineHeight:1}}>{ev.naturalness||50}</div>
        {ev.naturalness>=85&&<div style={{fontSize:12,color:GR,marginTop:6,fontWeight:600}}>🇧🇷 Soou como carioca — saved to your best sentences</div>}
      </div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:12}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:8}}>YOUR ANSWER</div>
        <div style={{fontSize:16,color:TX,marginBottom:ev.feedback?12:0}}>{ans}</div>
        {ev.feedback&&<div style={{fontSize:14,color:MU,fontStyle:'italic',marginBottom:showCorrection&&ev.correction?12:0}}>"{ev.feedback}"</div>}
        {showCorrection&&ev.correction&&<div style={{animation:'fadeIn 0.4s ease'}}>
          <div style={{height:1,background:BD,margin:'8px 0'}}/>
          <div style={{fontSize:11,color:GR,fontWeight:600,marginBottom:4}}>CARIOCA VERSION</div>
          <div style={{fontSize:15,color:GR}}>{ev.correction}</div>
        </div>}
      </div>
      <div style={{display:'flex',gap:10}}>
        <PBtn label="Next →" onClick={generate}/>
        <GBtn label={`End (${count})`} onClick={()=>setShowEnd(true)}/>
      </div>
    </div>}
  </div>
}

const CHAT_SCENES=[
  {key:'boteco',label:'🍺 Boteco',desc:'Ordering at a Rio bar'},
  {key:'praia',label:'🏖️ Praia',desc:'At the beach'},
  {key:'uber',label:'🚗 Uber',desc:'Chatting with your driver'},
  {key:'vizinho',label:'🏠 Vizinho',desc:'Talking to a neighbour'},
  {key:'mercado',label:'🛒 Mercado',desc:'At the local market'},
  {key:'freestyle',label:'💬 Freestyle',desc:'You describe the situation'},
]

function ChatMode({cards,onRateMultiple}){
  const[phase,setPhase]=useState('pick')
  const[history,setHistory]=useState([])
  const[turnCorrections,setTurnCorrections]=useState([])
  const[input,setInput]=useState('')
  const[freestyleDesc,setFreestyleDesc]=useState('')
  const[loading,setLoading]=useState(false)
  const[evalResult,setEvalResult]=useState(null)
  const[showEnd,setShowEnd]=useState(false)
  const scrollRef=useRef()
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight},[history])
  const start=useCallback(async(scene)=>{
    const sceneDesc=scene.key==='freestyle'?freestyleDesc:scene.key
    setPhase('loading')
    const res=await openChatScene(sceneDesc)
    setHistory([{role:'bot',content:res.message,translation:res.translation}])
    setPhase('chatting')
  },[freestyleDesc])
  const send=useCallback(async()=>{
    if(!input.trim()||loading)return
    const msg=input.trim();setInput('');setLoading(true)
    const newHist=[...history,{role:'user',content:msg}]
    setHistory(newHist)
    const res=await replyChatScene(newHist)
    const correction=res.correction||null
    setTurnCorrections(tc=>[...tc,correction])
    setHistory([...newHist,{role:'bot',content:res.message,translation:res.translation,correction}])
    setLoading(false)
  },[input,loading,history])
  const endConversation=useCallback(async()=>{
    setShowEnd(true);setLoading(true)
    const res=await evalFullChat(history,turnCorrections,cards)
    if(res.wordsUsedWell?.length){const updates={};res.wordsUsedWell.forEach(word=>{const card=cards.find(c=>c.portuguese.toLowerCase().includes(word.toLowerCase()));if(card)updates[card.id]=4});onRateMultiple(updates,'chat')}
    setEvalResult(res);setLoading(false)
  },[history,turnCorrections,cards,onRateMultiple])
  const reset=()=>{setPhase('pick');setHistory([]);setTurnCorrections([]);setEvalResult(null);setInput('');setShowEnd(false);setFreestyleDesc('')}
  if(phase==='pick')return <div style={{padding:'20px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:6}}>Choose a situation</div>
    <div style={{fontSize:13,color:MU,marginBottom:20}}>Claude plays a Carioca local. Conversation runs until you end it.</div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {CHAT_SCENES.map(s=><div key={s.key}>
        <button onClick={()=>s.key!=='freestyle'&&start(s)} style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',textAlign:'left',cursor:s.key==='freestyle'?'default':'pointer',fontFamily:FONT,transition:'border-color 0.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor=AC} onMouseLeave={e=>e.currentTarget.style.borderColor=BD}>
          <div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:3}}>{s.label}</div>
          <div style={{fontSize:13,color:MU}}>{s.desc}</div>
        </button>
        {s.key==='freestyle'&&<div style={{marginTop:8,display:'flex',gap:8}}>
          <input value={freestyleDesc} onChange={e=>setFreestyleDesc(e.target.value)} placeholder="Describe your situation…" style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px',color:TX,fontSize:14,outline:'none'}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
          <PBtn label="Go" onClick={()=>freestyleDesc.trim()&&start(s)} disabled={!freestyleDesc.trim()} full={false} small/>
        </div>}
      </div>)}
    </div>
  </div>
  if(phase==='loading')return <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}><Spinner size={28}/><span style={{fontSize:14,color:MU}}>Starting…</span></div>
  if(showEnd)return <div style={{padding:'20px',animation:'up 0.3s ease'}}>
    {loading?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:40,gap:16}}><Spinner size={28}/><span style={{color:MU}}>Evaluating conversation…</span></div>
    :evalResult&&<>
      <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:16}}>Conversation evaluated</div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:16,textAlign:'center'}}>
        <div style={{fontSize:52,fontWeight:900,color:evalResult.overallScore>=75?GR:evalResult.overallScore>=50?YE:RE,lineHeight:1}}>{evalResult.overallScore}</div>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginTop:6}}>OVERALL SCORE</div>
      </div>
      <div style={{fontSize:14,color:TX,lineHeight:1.7,marginBottom:16}}>{evalResult.feedback}</div>
      {evalResult.corrections?.length>0&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',marginBottom:16}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:10}}>ALL CORRECTIONS</div>
        {evalResult.corrections.map((c,i)=><div key={i} style={{fontSize:13,color:GR,marginBottom:6}}>→ {c}</div>)}
      </div>}
      <PBtn label="New conversation" onClick={reset}/>
    </>}
  </div>
  const userTurns=history.filter(h=>h.role==='user').length
  return <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
    <div style={{padding:'10px 20px',borderBottom:`1px solid ${BD}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:13,color:MU}}>{userTurns} turn{userTurns!==1?'s':''}</span>
      <button onClick={endConversation} style={{background:`${RE}22`,border:`1px solid ${RE}44`,borderRadius:10,padding:'8px 16px',color:RE,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT}}>End conversation</button>
    </div>
    <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
      {history.map((h,i)=><div key={i} style={{display:'flex',flexDirection:'column',alignItems:h.role==='user'?'flex-end':'flex-start'}}>
        <div style={{maxWidth:'82%',background:h.role==='user'?AC:S2,borderRadius:h.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'13px 18px'}}>
          <div style={{fontSize:15,color:h.role==='user'?'#fff':TX}}>{h.content}</div>
          {h.translation&&<div style={{fontSize:11,color:h.role==='user'?'rgba(255,255,255,0.65)':MU,marginTop:5,fontStyle:'italic'}}>{h.translation}</div>}
        </div>
        {h.correction&&<div style={{fontSize:12,color:YE,marginTop:4,paddingLeft:4}}>💡 {h.correction}</div>}
      </div>)}
      {loading&&<div style={{display:'flex',alignItems:'center',gap:8}}><Spinner/><span style={{fontSize:13,color:MU}}>typing…</span></div>}
    </div>
    <div style={{padding:'12px 20px 28px',borderTop:`1px solid ${BD}`,display:'flex',gap:10}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="respond in Portuguese…" style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'14px 16px',color:TX,fontSize:15,outline:'none'}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      <button onClick={send} disabled={!input.trim()||loading} style={{background:AC,color:'#fff',border:'none',borderRadius:13,padding:'14px 20px',fontSize:18,fontWeight:700,cursor:'pointer',opacity:input.trim()&&!loading?1:0.4,fontFamily:FONT}}>→</button>
    </div>
  </div>
}

function IWantToSay(){
  const[thought,setThought]=useState('')
  const[result,setResult]=useState(null)
  const[loading,setLoading]=useState(false)
  const[saved,setSaved]=useState(false)
  const go=async()=>{if(!thought.trim())return;setLoading(true);setResult(null);setSaved(false);const res=await iwantToSay(thought);setResult(res);setLoading(false)}
  const save=()=>{if(!result)return;const c=mk(`say-${Date.now()}`,result.portuguese,thought,'frase_pronta',{exampleSentence:result.portuguese});dbInsertCards([c]);setSaved(true)}
  return <div style={{padding:'28px 24px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:22,fontWeight:800,color:TX,marginBottom:8}}>I want to say…</div>
    <div style={{fontSize:14,color:MU,marginBottom:24,lineHeight:1.6}}>Type a thought in English. Get the Carioca way to say it.</div>
    <textarea value={thought} onChange={e=>setThought(e.target.value)} placeholder="e.g. I'm starving, let's eat something" style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',color:TX,fontSize:16,resize:'none',outline:'none',minHeight:90,boxSizing:'border-box',marginBottom:12}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
    {loading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:20}}><Spinner/><span style={{color:MU}}>Thinking…</span></div>:<PBtn label="Translate →" onClick={go} disabled={!thought.trim()}/>}
    {result&&<div style={{marginTop:20,animation:'up 0.3s ease'}}>
      <div style={{background:S,border:`1px solid ${AC}44`,borderRadius:16,padding:'20px',marginBottom:12}}>
        <div style={{fontSize:11,color:AC,fontWeight:600,marginBottom:8}}>CARIOCA WAY</div>
        <div style={{fontSize:24,fontWeight:700,color:TX,marginBottom:8}}>{result.portuguese}</div>
        {result.pronunciation&&<div style={{fontSize:13,color:MU,fontStyle:'italic',marginBottom:8}}>🔊 {result.pronunciation}</div>}
        {result.note&&<div style={{fontSize:13,color:MU,lineHeight:1.6}}>{result.note}</div>}
      </div>
      {saved?<div style={{fontSize:14,color:GR,textAlign:'center',padding:12}}>✓ Saved to your deck</div>:<GBtn label="Save as card" onClick={save}/>}
    </div>}
  </div>
}

function BestSentences(){
  const[sentences,setSentences]=useState([])
  const[loading,setLoading]=useState(true)
  useEffect(()=>{dbLoadHoF().then(data=>{setSentences(data);setLoading(false)})},[])
  if(loading)return <div style={{display:'flex',justifyContent:'center',paddingTop:60}}><Spinner/></div>
  return <div style={{padding:'20px 24px'}}>
    <div style={{fontSize:18,fontWeight:800,color:TX,marginBottom:6}}>Best sentences 🏆</div>
    <div style={{fontSize:13,color:MU,marginBottom:20}}>Sentences scoring 85+ naturalness — your Carioca highlights.</div>
    {sentences.length===0?<div style={{fontSize:14,color:MU,textAlign:'center',paddingTop:40}}>No highlights yet — keep practising!</div>
    :sentences.map((s,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><Tag text={s.scenario||'general'} color={MU}/><span style={{fontSize:13,color:GR,fontWeight:700}}>{s.naturalness_score}</span></div>
      <div style={{fontSize:16,fontWeight:600,color:TX,marginBottom:4}}>{s.portuguese}</div>
      <div style={{fontSize:12,color:MU}}>{s.english_prompt}</div>
    </div>)}
  </div>
}

// ── VOCAB BANK ────────────────────────────────────────────────────
function Bank({cards}){
  const[search,setSearch]=useState('')
  const[claudeResults,setClaudeResults]=useState(null)
  const[sort,setSort]=useState('overdue')
  const[typeFilter,setTypeFilter]=useState('all')
  const[practiceFilter,setPracticeFilter]=useState('all')
  const[expanded,setExpanded]=useState(null)
  const[searching,setSearching]=useState(false)
  const searchTimer=useRef(null)
  const daysUntil=c=>Math.round((new Date(c.nextReview)-new Date())/86400000)
  const reviewColor=c=>{const d=daysUntil(c);if(c.mastery>=5)return MU;if(d<0)return RE;if(d<=1)return YE;return GR}
  const reviewLabel=c=>{const d=daysUntil(c);if(c.mastery>=5)return'Mastered';if(d<0)return`${Math.abs(d)}d overdue`;if(d===0)return'Due today';return`In ${d}d`}
  const localFiltered=useMemo(()=>{
    let c=[...cards]
    if(typeFilter!=='all')c=c.filter(x=>x.type===typeFilter)
    if(practiceFilter==='never')c=c.filter(x=>x.sentenceCount===0)
    if(practiceFilter==='practiced')c=c.filter(x=>x.sentenceCount>0)
    if(search.trim()&&!claudeResults){const q=search.toLowerCase().trim();c=c.filter(x=>x.portuguese.toLowerCase().includes(q)||( x.english||'').toLowerCase().includes(q))}
    return c
  },[cards,typeFilter,practiceFilter,search,claudeResults])
  const displayed=claudeResults||localFiltered
  const sorted=useMemo(()=>{const now=new Date();return[...displayed].sort((a,b)=>{if(sort==='overdue'){return(new Date(a.nextReview)-now)-(new Date(b.nextReview)-now)}if(sort==='weakest')return a.mastery-b.mastery;if(sort==='strongest')return b.mastery-a.mastery;if(sort==='never')return a.sentenceCount-b.sentenceCount;if(sort==='az')return a.portuguese.localeCompare(b.portuguese);return 0})},[displayed,sort])
  const handleSearch=useCallback(val=>{
    setSearch(val);setClaudeResults(null)
    clearTimeout(searchTimer.current)
    if(!val.trim())return
    searchTimer.current=setTimeout(async()=>{setSearching(true);const results=await claudeSearch(val,cards);if(results.length>0)setClaudeResults(results);setSearching(false)},700)
  },[cards])
  const overdue=cards.filter(c=>daysUntil(c)<0&&c.mastery>0&&c.mastery<5)
  return <div style={{padding:'52px 0 100px',animation:'up 0.35s ease'}}>
    <div style={{padding:'0 20px 16px',position:'relative'}}>
      <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Search in English or Portuguese…" style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'14px 44px 14px 16px',color:TX,fontSize:15,outline:'none',boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      <div style={{position:'absolute',right:34,top:'50%',transform:'translateY(-50%)'}}>{searching?<Spinner size={16}/>:<span style={{color:MU,fontSize:16}}>⌕</span>}</div>
    </div>
    {overdue.length>0&&!search&&<div style={{margin:'0 20px 16px',padding:'14px 18px',background:`${RE}15`,border:`1px solid ${RE}44`,borderRadius:14}}>
      <div style={{fontSize:13,color:RE,fontWeight:700}}>{overdue.length} card{overdue.length!==1?'s':''} overdue</div>
      <div style={{fontSize:11,color:MU,marginTop:2}}>{overdue.map(c=>c.portuguese).slice(0,3).join(', ')}{overdue.length>3?'…':''}</div>
    </div>}
    <div style={{padding:'0 20px 12px',display:'flex',gap:6,overflowX:'auto'}}>
      {[['overdue','Overdue'],['weakest','Weakest'],['strongest','Strongest'],['never','Never practiced'],['az','A–Z']].map(([k,l])=><button key={k} onClick={()=>setSort(k)} style={{background:sort===k?AC:S2,color:sort===k?'#fff':MU,border:'none',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap'}}>{l}</button>)}
    </div>
    <div style={{padding:'0 20px 12px',display:'flex',gap:6,overflowX:'auto'}}>
      {['all','giria','vocab','frase_pronta','grammar','sentence'].map(t=><button key={t} onClick={()=>setTypeFilter(t)} style={{background:typeFilter===t?S:S2,color:typeFilter===t?TX:MU,border:`1px solid ${typeFilter===t?BD:'transparent'}`,borderRadius:8,padding:'5px 11px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap'}}>{t==='all'?'All types':t}</button>)}
      {[['all','All'],['never','Never practiced'],['practiced','Practiced']].map(([k,l])=><button key={k} onClick={()=>setPracticeFilter(k)} style={{background:practiceFilter===k?S:S2,color:practiceFilter===k?TX:MU,border:`1px solid ${practiceFilter===k?BD:'transparent'}`,borderRadius:8,padding:'5px 11px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap'}}>{l}</button>)}
    </div>
    <div style={{padding:'0 20px 12px'}}><span style={{fontSize:12,color:MU}}>{sorted.length} cards</span>{claudeResults&&<span style={{fontSize:12,color:AC,marginLeft:8}}>· Claude search</span>}</div>
    <div style={{padding:'0 20px'}}>
      {sorted.map(card=><div key={card.id}>
        <button onClick={()=>setExpanded(expanded===card.id?null:card.id)} style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px 16px',marginBottom:6,textAlign:'left',cursor:'pointer',fontFamily:FONT}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
            <span style={{fontSize:16,fontWeight:700,color:TX}}>{card.portuguese}</span>
            <span style={{fontSize:11,color:reviewColor(card),fontWeight:600,whiteSpace:'nowrap',marginLeft:8}}>{reviewLabel(card)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,color:MU}}>{card.english}</span>
            <MasteryDots mastery={card.mastery} size={7}/>
          </div>
        </button>
        {expanded===card.id&&<div style={{background:S2,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',marginBottom:8,marginTop:-4,animation:'up 0.2s ease'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            {[{l:'Type',v:card.type},{l:'Mastery',v:`${card.mastery}/5`},{l:'Ease factor',v:(card.easeFactor||2.5).toFixed(2)},{l:'Interval',v:`${card.interval||0}d`},{l:'Reps',v:card.reps||0},{l:'Recognition',v:`${card.recognitionMastery||0}/5`},{l:'Production',v:`${card.productionMastery||0}/5`},{l:'Sentence uses',v:card.sentenceCount||0}].map(({l,v})=><div key={l} style={{background:S,borderRadius:8,padding:'10px'}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:3}}>{l.toUpperCase()}</div><div style={{fontSize:13,color:TX,fontWeight:600}}>{v}</div></div>)}
          </div>
          {card.contrast&&<div style={{background:S,borderRadius:8,padding:'10px',marginBottom:8}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:3}}>FORMAL EQUIVALENT</div><div style={{fontSize:13,color:MU,fontStyle:'italic'}}>{card.contrast}</div></div>}
          {card.exampleSentence&&<div style={{background:S,borderRadius:8,padding:'10px',marginBottom:8}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:3}}>EXAMPLE</div><div style={{fontSize:13,color:TX,fontStyle:'italic'}}>{card.exampleSentence}</div></div>}
          <div style={{background:S,borderRadius:8,padding:'10px'}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:3}}>WHAT THIS MEANS</div><div style={{fontSize:12,color:MU,lineHeight:1.6}}>{card.mastery>=5?'Fully mastered — long review intervals.':card.mastery>=3&&card.sentenceCount===0?'Solid in flashcards but never used in a sentence. Phrase mode will target it.':card.mastery>=3?'Solid — used in flashcards and sentences.':card.mastery>=1?'Still learning — keep reviewing.':'Not started yet.'}</div></div>
        </div>}
      </div>)}
    </div>
  </div>
}

// ── IMPORT ────────────────────────────────────────────────────────
function Import({cards,onImport,onBack}){
  const[stage,setStage]=useState('idle')
  const[pasted,setPasted]=useState('')
  const[preview,setPreview]=useState([])
  const[visible,setVisible]=useState(0)
  const[history,setHistory]=useState([])
  const[statusMsg,setStatusMsg]=useState('')

  useEffect(()=>{dbLoadImportHistory().then(setHistory)},[])

  const run=useCallback(async()=>{
    if(!pasted.trim())return
    setStage('parsing');setVisible(0)
    try{
      const chunks=splitByDays(pasted)
      const days=chunks.map(c=>c.day).filter(d=>d>0)
      setStatusMsg(`Found Day ${Math.min(...days)||'?'} – ${Math.max(...days)||'?'}. Extracting new content…`)
      const items=await extractFromText(pasted,cards)
      setPreview(items)
      setStage('preview')
      items.forEach((_,i)=>setTimeout(()=>setVisible(v=>v+1),i*80))
    }catch(e){console.error(e);setStage('idle')}
  },[pasted,cards])

  const confirmImport=async()=>{
    await onImport(preview)
    await dbLogImport(`Paste ${new Date().toLocaleDateString()}`,preview.length,cards.length)
    setHistory(await dbLoadImportHistory())
    setStage('done')
  }

  return <div style={{padding:'52px 24px 100px',animation:'up 0.35s ease'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:28}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:26,cursor:'pointer',fontFamily:FONT}}>‹</button>
      <div>
        <div style={{fontSize:22,fontWeight:800,color:TX}}>Import Lesson</div>
        <div style={{fontSize:13,color:MU,marginTop:2}}>{cards.length} cards in deck</div>
      </div>
    </div>

    {stage==='idle'&&<>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'16px 18px',marginBottom:14}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:6}}>HOW TO USE</div>
        <div style={{fontSize:13,color:MU,lineHeight:1.8}}>
          Open your Google Doc → Select All (⌘A) → Copy (⌘C) → paste below.<br/>
          Claude skips review sections and only extracts what's genuinely new.
        </div>
      </div>
      <textarea
        value={pasted}
        onChange={e=>setPasted(e.target.value)}
        placeholder="Paste your lesson notes here…"
        style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',color:TX,fontSize:14,resize:'none',outline:'none',minHeight:200,boxSizing:'border-box',marginBottom:12,lineHeight:1.5}}
        onFocus={e=>e.target.style.borderColor=AC}
        onBlur={e=>e.target.style.borderColor=BD}
      />
      {pasted.trim().length>0&&<div style={{fontSize:12,color:MU,marginBottom:12}}>
        ~{pasted.trim().split(/\s+/).length} words pasted
        {splitByDays(pasted).filter(c=>c.day>0).length>0&&
          ` · Days ${splitByDays(pasted).filter(c=>c.day>0).map(c=>c.day).join(', ')} detected`}
      </div>}
      <PBtn label="Extract new cards →" onClick={run} disabled={!pasted.trim()}/>
      {history.length>0&&<div style={{marginTop:28}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:12}}>IMPORT HISTORY</div>
        {history.map((h,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 16px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:13,color:TX,fontWeight:600}}>{h.filename||'Paste'}</div>
            <div style={{fontSize:11,color:MU,marginTop:2}}>{new Date(h.created_at).toLocaleDateString()}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:13,color:GR,fontWeight:700}}>+{h.cards_added}</div>
            <div style={{fontSize:11,color:MU}}>{h.cards_skipped} in deck</div>
          </div>
        </div>)}
      </div>}
    </>}

    {stage==='parsing'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}>
      <Spinner size={28}/>
      <span style={{fontSize:14,color:MU,textAlign:'center'}}>{statusMsg||'Analysing notes…'}</span>
      <span style={{fontSize:12,color:MU,maxWidth:280,textAlign:'center',lineHeight:1.6}}>Comparing against your deck and extracting only genuinely new content.</span>
    </div>}

    {stage==='preview'&&<>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:16}}>
        <div style={{fontSize:13,color:MU}}>{cards.length} existing cards compared</div>
        <div style={{fontSize:28,fontWeight:800,color:preview.length>0?GR:MU,marginTop:4}}>
          {preview.length} new card{preview.length!==1?'s':''} found
        </div>
      </div>
      {preview.length===0
        ?<div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{fontSize:16,color:MU,marginBottom:8}}>Nothing new found</div>
          <div style={{fontSize:13,color:MU,lineHeight:1.7,marginBottom:20}}>All content in these notes is already in your deck. Try pasting notes from a newer lesson day.</div>
          <GBtn label="Back" onClick={()=>setStage('idle')}/>
        </div>
        :<>
          <div style={{maxHeight:360,overflowY:'auto',marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>
            {preview.slice(0,visible).map((item,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'13px 18px',animation:'up 0.25s ease'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{fontSize:15,fontWeight:700,color:TX}}>{item.portuguese}</div>
                {item.sourceDay>0&&<span style={{fontSize:10,color:MU,fontWeight:600,marginLeft:8}}>Day {item.sourceDay}</span>}
              </div>
              <div style={{fontSize:13,color:MU,marginTop:2}}>{item.english||'—'}</div>
            </div>)}
          </div>
          {visible>=preview.length&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <GBtn label="Back" onClick={()=>{setStage('idle');setPasted('')}}/>
            <PBtn label={`Add ${preview.length} cards`} onClick={confirmImport}/>
          </div>}
        </>}
    </>}

    {stage==='done'&&<div style={{textAlign:'center',paddingTop:60,animation:'up 0.4s ease'}}>
      <div style={{fontSize:56,marginBottom:16,animation:'pop 0.5s ease'}}>🎉</div>
      <div style={{fontSize:24,fontWeight:800,color:TX,marginBottom:8}}>{preview.length} cards added</div>
      <div style={{fontSize:13,color:MU,marginBottom:28}}>They start at level zero. Your performance takes it from here.</div>
      <PBtn label="Back to home" onClick={onBack}/>
    </div>}
  </div>
}

export default function App(){
  const[cards,setCards]=useState([])
  const[streak,setStreak]=useState(0)
  const[lastDate,setLastDate]=useState(null)
  const[sentenceHistory,setSentenceHistory]=useState([])
  const[screen,setScreen]=useState('home')
  const[loaded,setLoaded]=useState(false)

  useEffect(()=>{const style=document.createElement('style');style.textContent=CSS;document.head.appendChild(style);return()=>document.head.removeChild(style)},[])

  useEffect(()=>{
    const load=async()=>{
      const data=await dbLoad()
      if(data?.cards?.length){setCards(data.cards);setStreak(data.state?.streak_days||0);setLastDate(data.state?.last_session_date||null);setSentenceHistory(data.state?.sentence_history||[])}
      else{await dbSeed();setCards(SEED)}
      setLoaded(true)
    }
    load()
  },[])

  useEffect(()=>{
    if(!sb)return
    const channel=sb.channel('cards-sync')
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'cards',filter:`user_id=eq.${USER_ID}`},payload=>{const updated=fromRow(payload.new);setCards(prev=>prev.map(c=>c.id===updated.id?{...c,...updated}:c))})
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'cards',filter:`user_id=eq.${USER_ID}`},payload=>{setCards(prev=>[...prev,fromRow(payload.new)])})
      .subscribe()
    return()=>sb.removeChannel(channel)
  },[])

  const touchStreak=useCallback(()=>{
    const today=new Date().toISOString().slice(0,10)
    if(lastDate===today)return
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10)
    const ns=lastDate===yesterday?streak+1:1
    setStreak(ns);setLastDate(today)
    dbSaveState(ns,today,sentenceHistory)
  },[lastDate,streak,sentenceHistory])

  const onRate=useCallback((id,q,mode='study')=>{
    setCards(prev=>prev.map(c=>{
      if(c.id!==id)return c
      const u=sm2(c,q)
      const rm=mode==='study'?Math.max(c.recognitionMastery||0,u.mastery):c.recognitionMastery||0
      const pm=mode==='sentence'||mode==='chat'?Math.max(c.productionMastery||0,u.mastery):c.productionMastery||0
      const updated={...c,...u,recognitionMastery:rm,productionMastery:pm}
      dbUpdateCard(updated);dbLogReview(id,q,mode)
      return updated
    }))
    touchStreak()
  },[touchStreak])

  const onRateMultiple=useCallback((cardUpdates,mode='sentence')=>{
    if(!Object.keys(cardUpdates||{}).length)return
    setCards(prev=>prev.map(c=>{
      const q=cardUpdates[c.id];if(!q)return c
      const u=sm2(c,q)
      const sc=((c.sentenceScore||0)*(c.sentenceCount||0)+q)/((c.sentenceCount||0)+1)
      const pm=Math.max(c.productionMastery||0,u.mastery)
      const updated={...c,...u,sentenceScore:Math.round(sc*10)/10,sentenceCount:(c.sentenceCount||0)+1,productionMastery:pm}
      dbUpdateCard(updated);dbLogReview(c.id,q,mode)
      return updated
    }))
    touchStreak()
  },[touchStreak])

  const onImport=useCallback(async items=>{
    const newCards=items.map((it,i)=>mk(`imp-${Date.now()}-${i}`,it.portuguese,it.english||'—',it.type||'vocab',{cluster:it.cluster||null,contrast:it.contrast||null,exampleSentence:it.exampleSentence||null}))
    setCards(prev=>[...prev,...newCards])
    await dbInsertCards(newCards)
  },[])

  const onSaveSentence=useCallback(entry=>{
    const updated=[...(sentenceHistory||[]).slice(-49),entry]
    setSentenceHistory(updated)
    dbSaveState(streak,lastDate,updated)
  },[sentenceHistory,streak,lastDate])

  useEffect(()=>{
    if(!loaded)return
    const t=setTimeout(()=>dbSaveState(streak,lastDate,sentenceHistory),5000)
    return()=>clearTimeout(t)
  },[streak,lastDate,loaded,sentenceHistory])

  if(!loaded)return <div style={{background:BG,height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,fontFamily:FONT}}><Spinner size={28}/><span style={{color:MU,fontSize:14}}>Loading…</span></div>

  const due=cards.filter(c=>new Date(c.nextReview)<=new Date()&&c.mastery>0).length
  const mastered=cards.filter(c=>c.mastery>=5).length
  const tier=getTier(mastered)

  return <div style={{background:BG,minHeight:'100vh',maxWidth:480,margin:'0 auto',fontFamily:FONT,color:TX,display:'flex',flexDirection:'column'}}>
    <div style={{flex:1,overflowY:'auto',paddingBottom:64}}>
      {screen==='home'&&<Home cards={cards} streak={streak} lastDate={lastDate} tier={tier} go={setScreen}/>}
      {screen==='study'&&<Study cards={cards} onRate={onRate} onBack={()=>setScreen('home')}/>}
      {screen==='phrase'&&<Phrase cards={cards} onRateMultiple={onRateMultiple} sentenceHistory={sentenceHistory} onSaveSentence={onSaveSentence} onBack={()=>setScreen('home')}/>}
      {screen==='bank'&&<Bank cards={cards}/>}
      {screen==='import'&&<Import cards={cards} onImport={onImport} onBack={()=>setScreen('home')}/>}
    </div>
    <Nav screen={screen} go={setScreen} due={due}/>
  </div>
}
