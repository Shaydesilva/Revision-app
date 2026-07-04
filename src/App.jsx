import React,{useState,useEffect,useRef,useCallback,useMemo} from 'react'
import{createClient}from'@supabase/supabase-js'

const USER_ID='00000000-0000-0000-0000-000000000001'
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
const TIERS=[{name:'Turista',min:0},{name:'Comunicador',min:15},{name:'Carioca',min:35},{name:'Carioca Honorario',min:60}]
const getTier=n=>TIERS.reduce((a,t)=>n>=t.min?t:a,TIERS[0])
const CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}body{background:${BG};overscroll-behavior:none;font-family:${FONT}}textarea,input{-webkit-user-select:text;user-select:text;font-family:${FONT}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes popIn{0%{transform:scale(0.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes confettiFall{0%{transform:translateY(-10vh) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:0.6}}
@keyframes ringGlow{0%,100%{box-shadow:0 0 12px rgba(255,213,46,0.35)}50%{box-shadow:0 0 26px rgba(255,213,46,0.7)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes eq{0%,100%{transform:scaleY(0.25)}50%{transform:scaleY(1)}}
button{transition:transform 0.08s ease}
button:active{transform:scale(0.96)}
@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}@keyframes glow{0%,100%{opacity:0.6}50%{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}::-webkit-scrollbar{display:none}*{scrollbar-width:none}`


function sm2(card,q){
  let ef=card.easeFactor??2.5,iv=card.interval??0,rp=card.reps??0
  if(q>=3){iv=rp===0?1:rp===1?6:Math.round(iv*ef);rp++}else{iv=1;rp=0}
  ef=Math.max(1.3,ef+0.1-(5-q)*(0.08+(5-q)*0.02))
  // Priority compression — intervals at 33% while active
  if(card.priority)iv=Math.max(1,Math.round(iv*0.33))
  const nr=new Date();nr.setDate(nr.getDate()+iv)
  const mastery=Math.min(5,rp===0?0:rp<=1?1:rp<=3?2:rp<=5?3:rp<=8?4:5)
  // Priority auto-resolve: 3 correct in a row at mastery 4+
  let priority=card.priority||false
  let priorityStreak=card.priorityStreak||0
  if(priority){
    if(q>=4){priorityStreak++;if(priorityStreak>=3&&mastery>=4){priority=false;priorityStreak=0}}
    else priorityStreak=0
  }
  return{easeFactor:ef,interval:iv,reps:rp,nextReview:nr.toISOString(),mastery,priority,priorityStreak}
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
  // Priority cards always in first 5 slots
  const priority=cards.filter(c=>c.priority)
  const due=cards.filter(c=>!c.priority&&new Date(c.nextReview)<=now&&c.mastery>0).sort(()=>Math.random()-0.5)
  const fresh=cards.filter(c=>!c.priority&&c.mastery===0).sort(()=>Math.random()-0.5)
  const prioritySlots=priority.sort(()=>Math.random()-0.5).slice(0,5)
  // When no due cards, serve 20 fresh — not the 30% rule which gives only 3
  const freshCount=due.length===0?20:Math.max(5,Math.round(due.length*0.3))
  const remaining=[...due,...fresh.slice(0,freshCount)].slice(0,20)
  return enforceInterleaving([...prioritySlots,...remaining])
}

function buildEliminationPool(cards,n){
  // Mastery 1-3 preferred, no priority influence
  const target=cards.filter(c=>c.mastery>=1&&c.mastery<=3).sort(()=>Math.random()-0.5)
  const fallbackLow=cards.filter(c=>c.mastery===0).sort(()=>Math.random()-0.5)
  const fallbackHigh=cards.filter(c=>c.mastery===4).sort(()=>Math.random()-0.5)
  let pool=[...target]
  if(pool.length<n)pool=[...pool,...fallbackLow]
  if(pool.length<n)pool=[...pool,...fallbackHigh]
  return pool.slice(0,n)
}

const mk=(id,p,e,t,x={})=>({id:String(id),portuguese:p,english:e,type:t,cluster:null,contrast:null,scenario:null,exampleSentence:null,mnemonic:null,priority:false,priorityStreak:0,mastery:0,easeFactor:2.5,interval:0,reps:0,nextReview:new Date().toISOString(),sentenceScore:0,sentenceCount:0,recognitionMastery:0,productionMastery:0,...x})


const SEED=[
  mk(1,'opa','hey / whoa','giria',{cluster:'greeting',exampleSentence:'Opa, tudo bom?'}),
  mk(2,'vixe','geez / oh wow','giria',{cluster:'exclamation',exampleSentence:'Vixe, que calor demais!'}),
  mk(3,'eita','damn / wow','giria',{cluster:'exclamation',exampleSentence:'Eita, que baguca!'}),
  mk(4,'puta merda','holy shit','giria',{cluster:'exclamation',exampleSentence:'Puta merda, esqueci minha carteira!'}),
  mk(5,'caralho','fuck / holy shit','giria',{cluster:'exclamation',exampleSentence:'Caralho mano, que susto!'}),
  mk(6,'caraca','wow softer than caralho','giria',{cluster:'exclamation',contrast:'caralho',exampleSentence:'Caraca, voce e de Londres?'}),
  mk(7,'puta que pariu','holy fucking shit','giria',{cluster:'exclamation',exampleSentence:'Puta que pariu, que transito!'}),
  mk(8,'koe',"what's up",'giria',{cluster:'greeting',exampleSentence:'Koe, qual foi?'}),
  mk(9,'fala ai',"what's up talk to me",'giria',{cluster:'greeting',exampleSentence:'Fala ai, ta tudo bem?'}),
  mk(10,'coisa','thing','vocab',{cluster:'thing',exampleSentence:'Que coisa estranha isso.'}),
  mk(11,'treco','thing stuff informal','giria',{cluster:'thing',exampleSentence:'Que treco e esse?'}),
  mk(12,'bagulho','thing stuff street','giria',{cluster:'thing',exampleSentence:'Esse bagulho ta do caralho.'}),
  mk(13,'mano','bro man','giria',{cluster:'address',exampleSentence:'Mano, voce viu isso?'}),
  mk(14,'cara','dude man','giria',{cluster:'address',exampleSentence:'Cara, que situacao estranha.'}),
  mk(15,'gatinha','attractive girl hottie','giria',{exampleSentence:'Tu e uma gatinha, sabia?'}),
  mk(16,'gostoso/a','hot delicious','vocab',{exampleSentence:'Essa comida ta gostosa demais.'}),
  mk(17,'to ligado','I understand I get it','frase_pronta',{exampleSentence:'To ligado, pode falar.'}),
  mk(18,'ta ligado?','you know? you get it?','frase_pronta',{exampleSentence:'A gente vai sair, ta ligado?'}),
  mk(19,'bora',"let's go",'giria',{cluster:'letsgo',contrast:'vamos',exampleSentence:'Bora tomar uma gelada!'}),
  mk(20,'tamo indo',"we're heading out",'frase_pronta',{cluster:'letsgo',contrast:'estamos indo',exampleSentence:'Tamo indo, te vejo la.'}),
  mk(21,'acabei de aprender isso','I just learned this','sentence',{exampleSentence:'Acabei de aprender isso hoje na aula.'}),
  mk(22,'valeu','thanks bet aight','giria',{exampleSentence:'Valeu mano, voce e demais.'}),
  mk(23,'tchau','goodbye','vocab',{exampleSentence:'Tchau, te vejo amanha!'}),
  mk(24,'ate logo','see you later','frase_pronta',{exampleSentence:'Ate logo, foi um prazer.'}),
  mk(25,'foi um prazer','it was a pleasure','frase_pronta',{exampleSentence:'Foi um prazer te conhecer, cara.'}),
  mk(26,'a gente se ve',"we'll see each other",'frase_pronta',{exampleSentence:'A gente se ve na festa entao.'}),
  mk(27,'a gente','us we replaces nos in Carioca','grammar',{contrast:'nos',exampleSentence:'A gente vai pra praia hoje.'}),
  mk(28,'vamo pra praia',"let's go to the beach",'sentence',{cluster:'letsgo',contrast:'nos vamos a praia',scenario:'social',exampleSentence:'Vamo pra praia? Ta fazendo calor demais.'}),
  mk(29,'eu me mudei pro Rio','I moved to Rio','sentence',{contrast:'eu me mudei para o Rio',exampleSentence:'Eu me mudei pro Rio pq eu amo o Brasil.'}),
  mk(30,'pra / pro','to the contracted','grammar',{contrast:'para a / para o',exampleSentence:'Vou pra praia, depois pro bar.'}),
  mk(31,'queria','wanted was wanting','vocab',{exampleSentence:'Eu queria morar em algum lugar bonito.'}),
  mk(32,'me ve uma cerveja','can I have a beer','frase_pronta',{contrast:'eu gostaria de uma cerveja',scenario:'ordering',exampleSentence:'Me ve uma cerveja gelada, por favor.'}),
  mk(33,'me ve uma gelada','can I have a cold one','frase_pronta',{scenario:'ordering',exampleSentence:'Me ve uma gelada ai, valeu.'}),
  mk(34,'bora tomar uma',"let's grab a drink",'frase_pronta',{cluster:'letsgo',scenario:'social',exampleSentence:'Bora tomar uma, a noite ta boa.'}),
  mk(35,'a conta por favor','the check please','frase_pronta',{scenario:'ordering',exampleSentence:'Moco, a conta por favor.'}),
  mk(36,'pode repetir?','can you repeat that?','frase_pronta',{exampleSentence:'Pode repetir? Nao entendi.'}),
  mk(37,'pode falar devagar?','can you speak slowly?','frase_pronta',{exampleSentence:'Pode falar devagar, por favor?'}),
  mk(38,'qual e o nome?',"what's the name?",'frase_pronta',{exampleSentence:'Opa, qual e o nome?'}),
  mk(39,'quanto que ta?','how much is it?','frase_pronta',{scenario:'shopping',exampleSentence:'Quanto que ta essa camiseta?'}),
  mk(40,'po faz por quinze?','come on make it fifteen?','frase_pronta',{scenario:'shopping',exampleSentence:'Ta dezoito? Po faz por quinze?'}),
  mk(41,'vou pagar no credito',"I'll pay by card",'frase_pronta',{scenario:'shopping',exampleSentence:'Vou pagar no credito, pode ser?'}),
  mk(42,'eu tambem','me too','vocab',{exampleSentence:'Po, to com fome. Eu tambem!'}),
  mk(43,'sem gas','still water','vocab',{scenario:'ordering',exampleSentence:'Me ve uma agua sem gas.'}),
  mk(44,'exatamente','exactly','vocab',{exampleSentence:'Exatamente isso que eu queria dizer.'}),
  mk(45,'concordo','I agree','vocab',{exampleSentence:'Concordo com voce, cara.'}),
  mk(46,'mesmo','same really even','vocab',{exampleSentence:'Mesmo carro, mesma roupa.'}),
  mk(47,'e mesmo',"oh yeah that's true",'giria',{exampleSentence:'E mesmo, esqueci que voce nao bebe.'}),
  mk(48,'parecido','similar','vocab',{exampleSentence:'E parecido com o que temos no Brasil.'}),
  mk(49,'sem graca','boring bland','vocab',{exampleSentence:'Aldershot e uma cidade bem sem graca.'}),
  mk(50,'nasci e cresci no Rio','I was born and raised in Rio','sentence',{exampleSentence:'Sou carioca, nasci e cresci no Rio.'}),
  mk(51,'atrasado','late','vocab',{exampleSentence:'Mano estamos atrasados, bora!'}),
  mk(52,'demais','too much a lot','vocab',{exampleSentence:'Ta fazendo calor demais hoje.'}),
  mk(53,'depois','after later','vocab',{exampleSentence:'Bora tomar uma depois do trabalho.'}),
  mk(54,'de boa','chilling all good','giria',{exampleSentence:'To de boa em casa hoje.'}),
  mk(55,'ta pronta?','are you ready?','frase_pronta',{exampleSentence:'Ta pronta? A gente ta te esperando.'}),
  mk(56,'mao de vaca','stingy cheapskate','giria',{exampleSentence:'O cara e mao de vaca demais.'}),
  mk(57,'nao compensa','not worth it','frase_pronta',{exampleSentence:'Nao compensa ir la, fica longe demais.'}),
  mk(58,'trouxa','dumb sucker','giria',{exampleSentence:'Tu e muito trouxa de ter acreditado.'}),
  mk(59,'eu tava no clube','I was at the club','sentence',{contrast:'eu estava no clube',exampleSentence:'Eu tava no clube quando recebi a msg.'}),
  mk(60,'eu fui pra praia','I went to the beach','sentence',{exampleSentence:'Eu fui pra praia ontem, tava incrivel.'}),
  mk(61,'eu quero ir pra praia','I want to go to the beach','sentence',{exampleSentence:'Hoje eu quero ir pra praia de manha.'}),
  mk(62,'eu quero ir pro bar','I want to go to the bar','sentence',{scenario:'social',exampleSentence:'Eu quero ir pro bar depois, bora?'}),
  mk(63,'bairro','neighbourhood','vocab',{exampleSentence:'Qual bairro voce mora?'}),
  mk(64,'po','come on damn mild','giria',{exampleSentence:'Po, to com fome mano.'}),
  mk(65,'uma delicia','delicious amazing','vocab',{scenario:'food',exampleSentence:'Essa comida ta uma delicia!'}),
  mk(66,'essa comida ta do caralho','this food is fucking amazing','sentence',{scenario:'food',exampleSentence:'Cara, essa comida ta do caralho.'}),
  mk(67,'de + a = da','contraction da — cafe da manha','grammar',{exampleSentence:'Cafe da manha, carro da Juliana.'}),
  mk(68,'de + o = do','contraction do — carro do Victor','grammar',{exampleSentence:'Carro do Victor, nome do lugar.'}),
  mk(69,'eu gosto de futebol','I like football','sentence',{exampleSentence:'Eu gosto de futebol, eu amo nadar.'}),
  mk(70,'mano estamos atrasados bora',"bro we're late let's go",'sentence',{cluster:'letsgo',exampleSentence:'Mano estamos atrasados, bora logo!'}),
  mk(71,'tudo','everything','vocab',{exampleSentence:'Tudo bem com voce?'}),
  mk(72,'voce vai?','are you going?','frase_pronta',{exampleSentence:'Voce vai na festa hoje?'}),
  mk(73,'eu quero','I want','vocab',{exampleSentence:'Eu quero ir pra praia hoje.'}),
  mk(74,'eu quero dormir','I want to sleep','sentence',{exampleSentence:'To cansado demais, eu quero dormir.'}),
  mk(75,'eu quero cochilar','I want to nap','sentence',{exampleSentence:'Vou cochilar um pouco, to destruido.'}),
  mk(76,'eu quero um banho','I want a shower','sentence',{exampleSentence:'Eu quero um banho depois da praia.'}),
  mk(77,'eu quero tomar um banho','I want to take a shower','sentence',{exampleSentence:'Deixa eu tomar um banho antes de sair.'}),
  mk(78,'eu quero uma massagem','I want a massage','sentence',{exampleSentence:'Depois desse dia eu quero uma massagem.'}),
  mk(79,'eu quero ir pra...','I want to go to...','grammar',{exampleSentence:'Eu quero ir pra um barzinho hoje.'}),
  mk(80,'eu queria ir','I wanted to go','frase_pronta',{exampleSentence:'Eu queria ir mas tava cansado demais.'}),
  mk(81,'viajar','to travel','vocab',{exampleSentence:'Eu amo viajar pelo Brasil.'}),
  mk(82,'viagem','trip travel','vocab',{exampleSentence:'Que viagem incrivel foi essa!'}),
  mk(83,'eu quero descansar','I want to rest','sentence',{exampleSentence:'Eu preciso descansar hoje.'}),
  mk(84,'eu quero um beijo','I want a kiss','sentence',{exampleSentence:'Juliana, eu quero um beijo.'}),
  mk(85,'cafune','gentle head scratch hair stroke','giria',{exampleSentence:'Me da um cafune? To estressado.'}),
  mk(86,'eu preciso de...','I need...','grammar',{exampleSentence:'Eu preciso de um cafe agora.'}),
  mk(87,'vem aqui','come here','frase_pronta',{exampleSentence:'Vem aqui, deixa eu te mostrar.'}),
  mk(88,'alto','tall high','vocab',{exampleSentence:'Ele e muito alto, ne?'}),
  mk(89,'baixo','short low','vocab',{exampleSentence:'O preco ta baixo hoje.'}),
  mk(90,'que caralho','what the fuck','giria',{cluster:'exclamation',exampleSentence:'Que caralho foi isso?!'}),
  mk(91,'que porra','what the fuck stronger','giria',{cluster:'exclamation',exampleSentence:'Que porra e essa mano?'}),
  mk(92,'assim','like this','vocab',{exampleSentence:'Faz assim, olha.'}),
  mk(93,'tipo','like discourse marker','giria',{exampleSentence:'Eu tava tipo, bebado na festa.'}),
  mk(94,'foda','badass fucking amazing','giria',{exampleSentence:'Natureza e foda ne irmao.'}),
  mk(95,'ne','right? tag question','giria',{exampleSentence:'Ta fazendo calor demais, ne?'}),
  mk(96,'irmao','brother bro','giria',{cluster:'address',exampleSentence:'Irmao, voce viu o jogo ontem?'}),
  mk(97,'o que e isso?','what is this?','frase_pronta',{exampleSentence:'O que e isso? Nunca vi antes.'}),
  mk(98,'natureza','nature','vocab',{exampleSentence:'Natureza e foda ne, irmao.'}),
  mk(99,'nossa','wow oh my god','giria',{cluster:'exclamation',exampleSentence:'Nossa, que dia lindo!'}),
  mk(100,'tudo bem','everything good all good','frase_pronta',{cluster:'greeting',exampleSentence:'Tudo bem? Tudo bom!'}),
  mk(101,'tudo bom','all good','frase_pronta',{cluster:'greeting',exampleSentence:'Oi, tudo bom por ai?'}),
  mk(102,'ruim','bad','vocab',{contrast:'mau/mal',exampleSentence:'O tempo ta ruim hoje.'}),
  mk(103,'tempo','time weather','vocab',{exampleSentence:'O tempo ta otimo hoje!'}),
  mk(104,'semana que vem','next week','frase_pronta',{exampleSentence:'A gente se ve semana que vem.'}),
  mk(105,'segunda-feira','Monday','vocab',{cluster:'days',exampleSentence:'Te vejo segunda-feira.'}),
  mk(106,'terca-feira','Tuesday','vocab',{cluster:'days',exampleSentence:'Terca-feira vamos ao mercado.'}),
  mk(107,'quarta-feira','Wednesday','vocab',{cluster:'days',exampleSentence:'Quarta-feira e dia de treino.'}),
  mk(108,'quinta-feira','Thursday','vocab',{cluster:'days',exampleSentence:'Quinta-feira ja?'}),
  mk(109,'sexta-feira','Friday','vocab',{cluster:'days',exampleSentence:'Sexta-feira bora tomar uma!'}),
  mk(110,'sabado','Saturday','vocab',{cluster:'days',exampleSentence:'Sabado a praia ta cheia.'}),
  mk(111,'domingo','Sunday','vocab',{cluster:'days',exampleSentence:'Domingo e dia de descanso.'}),
  mk(112,'te vejo segunda','see you Monday','frase_pronta',{exampleSentence:'Valeu cara, te vejo segunda!'}),
  mk(113,'ser vs estar','SER = what it is. ESTAR = how it is right now','grammar',{exampleSentence:'E bonito (always). Esta bonito (right now).'}),
  mk(114,'voce quer?','do you want?','frase_pronta',{exampleSentence:'Voce quer uma cerveja?'}),
  mk(115,'dia lindo ne?','beautiful day right?','frase_pronta',{exampleSentence:'Dia lindo ne? Bora pra praia!'}),
  mk(116,'outro/outra','another other','vocab',{exampleSentence:'Me ve outra gelada, valeu.'}),
  mk(117,'mais um/uma','one more','frase_pronta',{exampleSentence:'Mais uma? Bora!'}),
  mk(118,'verao','summer','vocab',{exampleSentence:'No verao o Rio e incrivel.'}),
  mk(119,'voce tem?','do you have?','frase_pronta',{exampleSentence:'Voce tem uma cerveja gelada?'}),
  mk(120,'frio','cold','vocab',{cluster:'weather',exampleSentence:'Esta frio hoje, ne?'}),
  mk(121,'bonito','beautiful pretty','vocab',{exampleSentence:'Que lugar bonito, cara!'}),
  mk(122,'nublado','cloudy','vocab',{cluster:'weather',exampleSentence:'Ta nublado mas nao vai chover.'}),
  mk(123,'molhado','wet','vocab',{exampleSentence:'Fiquei todo molhado na chuva.'}),
  mk(124,'ensolarado','sunny','vocab',{cluster:'weather',exampleSentence:'Dia ensolarado, bora pra praia!'}),
  mk(125,'esta quente','it is hot right now','sentence',{contrast:'e quente (permanent)',exampleSentence:'Esta quente demais hoje!'}),
  mk(126,'esta frio','it is cold right now','sentence',{contrast:'e frio (permanent)',exampleSentence:'Esta frio la fora, leva um casaco.'}),
  mk(127,'esta nublado','it is cloudy','sentence',{exampleSentence:'Esta nublado, nao vai dar praia.'}),
  mk(128,'e bonito','it is beautiful permanent','sentence',{contrast:'esta bonito (right now)',exampleSentence:'E bonito aqui, ne?'}),
]


const SB_URL=import.meta.env.VITE_SUPABASE_URL
const SB_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY
const sb=(SB_URL&&SB_KEY)?createClient(SB_URL,SB_KEY):null

const LS_CARDS='carioca_cards',LS_STATE='carioca_state',LS_QUEUE='carioca_queue',LS_DELETED='carioca_deleted'
function getDeletedIds(){try{return new Set(JSON.parse(localStorage.getItem(LS_DELETED)||'[]'))}catch{return new Set()}}
function addDeletedIds(ids){try{const d=getDeletedIds();ids.forEach(id=>d.add(id));localStorage.setItem(LS_DELETED,JSON.stringify([...d]))}catch{}}
function lsSave(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function lsGet(k){try{const d=localStorage.getItem(k);return d?JSON.parse(d):null}catch(e){return null}}

const toRow=c=>({id:c.id,user_id:USER_ID,portuguese:c.portuguese,english:c.english,example_sentence:c.exampleSentence||null,type:c.type,cluster:c.cluster||null,contrast:c.contrast||null,scenario:c.scenario||null,mnemonic:c.mnemonic||null,priority:c.priority||false,priority_streak:c.priorityStreak||0,mastery:c.mastery||0,ease_factor:c.easeFactor||2.5,interval:c.interval||0,reps:c.reps||0,next_review:c.nextReview||new Date().toISOString(),sentence_score:c.sentenceScore||0,sentence_count:c.sentenceCount||0,recognition_mastery:c.recognitionMastery||0,production_mastery:c.productionMastery||0})
const fromRow=r=>({id:r.id,portuguese:r.portuguese,english:r.english,exampleSentence:r.example_sentence,type:r.type,cluster:r.cluster,contrast:r.contrast,scenario:r.scenario,mnemonic:r.mnemonic||null,priority:r.priority||false,priorityStreak:r.priority_streak||0,mastery:r.mastery||0,easeFactor:r.ease_factor||2.5,interval:r.interval||0,reps:r.reps||0,nextReview:r.next_review||new Date().toISOString(),sentenceScore:r.sentence_score||0,sentenceCount:r.sentence_count||0,recognitionMastery:r.recognition_mastery||0,productionMastery:r.production_mastery||0})

function queueWrite(op){try{const q=lsGet(LS_QUEUE)||[];q.push({...op,ts:Date.now()});lsSave(LS_QUEUE,q)}catch(e){}}
async function flushQueue(){
  if(!sb||!navigator.onLine)return
  try{
    const q=lsGet(LS_QUEUE)||[]
    if(!q.length)return
    for(const op of q){
      if(op.type==='updateCard')await sb.from('cards').update(op.data).eq('id',op.id).eq('user_id',USER_ID).catch(()=>{})
      if(op.type==='updateMeta')await sb.from('cards').update(op.data).eq('id',op.id).eq('user_id',USER_ID).catch(()=>{})
      if(op.type==='saveState')await sb.from('user_state').upsert({user_id:USER_ID,...op.data},{onConflict:'user_id'}).catch(()=>{})
    }
    lsSave(LS_QUEUE,[])
  }catch(e){}
}

async function dbSeed(){
  const local=lsGet(LS_CARDS)||[]
  if(!local.length)lsSave(LS_CARDS,SEED)
  if(!sb||!navigator.onLine)return
  try{await sb.from('cards').upsert(SEED.map(toRow),{onConflict:'id,user_id'})}catch(e){}
}

async function syncToSupabase(localCards){
  if(!sb||!navigator.onLine||!localCards.length)return
  try{
    const BATCH=50
    for(let i=0;i<localCards.length;i+=BATCH){
      const batch=localCards.slice(i,i+BATCH)
      await sb.from('cards').upsert(batch.map(toRow),{onConflict:'id,user_id'})
    }
    console.log('Synced',localCards.length,'cards to Supabase')
  }catch(e){console.warn('Sync failed:',e.message)}
}

async function dbUpdateCard(card){
  const cached=lsGet(LS_CARDS)||[]
  const exists=cached.some(c=>c.id===card.id)
  lsSave(LS_CARDS,exists?cached.map(c=>c.id===card.id?{...c,...card}:c):[...cached,card])
  const data={mastery:card.mastery,ease_factor:card.easeFactor,interval:card.interval,reps:card.reps,next_review:card.nextReview,sentence_score:card.sentenceScore||0,sentence_count:card.sentenceCount||0,recognition_mastery:card.recognitionMastery||0,production_mastery:card.productionMastery||0,priority:card.priority||false,priority_streak:card.priorityStreak||0,updated_at:new Date().toISOString()}
  if(sb&&navigator.onLine){try{await sb.from('cards').update(data).eq('id',card.id).eq('user_id',USER_ID);return}catch(e){}}
  queueWrite({type:'updateCard',id:card.id,data})
}

async function dbUpdateCardMeta(cardId,meta){
  // For mnemonic and priority changes only
  const cached=lsGet(LS_CARDS)||[]
  lsSave(LS_CARDS,cached.map(c=>c.id===cardId?{...c,...meta}:c))
  if(sb&&navigator.onLine){try{await sb.from('cards').update(meta).eq('id',cardId).eq('user_id',USER_ID);return}catch(e){}}
  queueWrite({type:'updateMeta',id:cardId,data:meta})
}

async function dbInsertCards(newCards){
  const cached=lsGet(LS_CARDS)||[]
  lsSave(LS_CARDS,[...cached,...newCards])
  if(!sb)return
  try{await sb.from('cards').insert(newCards.map(toRow))}catch(e){}
}

async function dbDeleteCard(cardId){
  addDeletedIds([cardId])
  const cached=lsGet(LS_CARDS)||[]
  lsSave(LS_CARDS,cached.filter(c=>c.id!==cardId))
  if(sb&&navigator.onLine)await sb.from('cards').delete().eq('id',cardId).eq('user_id',USER_ID).catch(()=>{})
}

async function dbSaveState(streak,lastDate,sentenceHistory){
  const data={streak_days:streak,last_session_date:lastDate,sentence_history:sentenceHistory||[],updated_at:new Date().toISOString()}
  lsSave(LS_STATE,data)
  if(sb&&navigator.onLine){try{await sb.from('user_state').upsert({user_id:USER_ID,...data},{onConflict:'user_id'});return}catch(e){}}
  queueWrite({type:'saveState',data})
}

async function dbLogReview(cardId,quality,mode){if(!sb||!navigator.onLine)return;try{await sb.from('card_reviews').insert({user_id:USER_ID,card_id:cardId,quality,mode})}catch(e){}}
async function dbSaveHoF(entry){if(!sb||!navigator.onLine)return;try{await sb.from('sentence_hall_of_fame').insert({user_id:USER_ID,...entry})}catch(e){}}
async function dbLoadHoF(){if(!sb||!navigator.onLine)return[];try{const{data}=await sb.from('sentence_hall_of_fame').select('*').eq('user_id',USER_ID).order('naturalness_score',{ascending:false}).limit(20);return data||[]}catch(e){return[]}}
async function dbLogImport(filename,added,skipped){if(!sb||!navigator.onLine)return;try{await sb.from('import_history').insert({user_id:USER_ID,filename,cards_added:added,cards_skipped:skipped})}catch(e){}}
async function dbLoadImportHistory(){if(!sb||!navigator.onLine)return[];try{const{data}=await sb.from('import_history').select('*').eq('user_id',USER_ID).order('created_at',{ascending:false}).limit(10);return data||[]}catch(e){return[]}}
async function dbLoadErrorPatterns(){if(!sb||!navigator.onLine)return[];try{const{data,error}=await sb.from('error_patterns').select('*').eq('user_id',USER_ID).order('count',{ascending:false});if(error)return[];return data||[]}catch(e){return[]}}
async function dbUpdateErrorPattern(errorType,example){if(!sb||!navigator.onLine)return;try{const{data}=await sb.from('error_patterns').select('*').eq('user_id',USER_ID).eq('error_type',errorType).limit(1);if(data?.length){await sb.from('error_patterns').update({count:(data[0].count||0)+1,last_seen:new Date().toISOString(),examples:[...(data[0].examples||[]).slice(-4),example]}).eq('user_id',USER_ID).eq('error_type',errorType)}else{await sb.from('error_patterns').insert({user_id:USER_ID,error_type:errorType,count:1,last_seen:new Date().toISOString(),examples:[example]})}}catch(e){}}


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


let ptVoice=null
function loadVoice(){const voices=speechSynthesis.getVoices();const found=voices.find(v=>v.lang==='pt-BR'&&v.localService)||voices.find(v=>v.lang==='pt-BR')||voices.find(v=>v.lang.startsWith('pt'));if(found)ptVoice=found}
if(window.speechSynthesis){loadVoice();if(!ptVoice)speechSynthesis.addEventListener('voiceschanged',loadVoice)}
function speak(text){if(!window.speechSynthesis)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=0.82;u.pitch=0.88;if(ptVoice)u.voice=ptVoice;speechSynthesis.speak(u)}
function SpeakBtn({text,size=15}){
  const[on,setOn]=useState(false)
  const go=e=>{e.stopPropagation();SND.init();if(on){speechSynthesis.cancel();setOn(false);return}speak(text);setOn(true);setTimeout(()=>setOn(false),Math.max(1500,text.length*90))}
  return<button onClick={go} style={{background:'none',border:'none',cursor:'pointer',fontSize:size,opacity:on?1:0.55,padding:'2px 5px',lineHeight:1}}>{on?'⏹':'🔊'}</button>
}


async function callClaude(system,messages,max=900){
  try{
    const r=await fetch('/.netlify/functions/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system,messages,max_tokens:max})})
    if(!r.ok)throw new Error(`HTTP ${r.status}`)
    const d=await r.json()
    return d.content?.[0]?.text||''
  }catch(e){console.warn('Claude call failed:',e.message);return''}
}
const ct=(sys,txt,max)=>callClaude(sys,[{role:'user',content:txt}],max)

const RULES=`CRITICAL: NEVER penalise missing/wrong accents. ta=ta,voce=voce,e=e casual=fine. Accept ALL Carioca:tamo,pra,ta,num,ce. Judge MEANING only. Validate first,correct second.`
const FULL_RULES=`CRITICAL RULES:
1. NEVER penalise missing/wrong accents. ta=ta,voce=voce — all fine.
2. Accept ALL Carioca:tamo=estamos,pra=para,ta=esta,num=nao,ce=voce.
3. Judge MEANING and intelligibility only. Not formal grammar.
4. Tone: validate first,correct second. "Nice — just worth noting: ta not ta."
5. Wrong ONLY if meaning actually different or unintelligible.`

async function evalCardAnswer(card,answer){
  const raw=await ct(`Carioca Portuguese tutor evaluating a flashcard translation.\n${RULES}\nReply ONLY valid JSON:{"accuracy":0-100,"naturalness":0-100,"feedback":"warm one line","correction":"better version or null"}`,`Card:"${card.portuguese}"="${card.english}"${card.contrast?`. Carioca:"${card.contrast}"`:''}. Student:"${answer}"`,400)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return{accuracy:50,naturalness:50,feedback:'Could not evaluate.',correction:null}}
}

async function genScenario(cards,sentenceHistory,errorPatterns){
  const vocab=cards.filter(c=>c.mastery>=1||cards.length<6).slice(0,30).map(c=>`${c.portuguese}(${c.english},m:${c.mastery},s:${c.sentenceCount})`).join('\n')
  const priority=cards.filter(c=>c.mastery>=1&&c.sentenceCount===0).slice(0,5).map(c=>c.portuguese).join(', ')
  const recent=(sentenceHistory||[]).slice(-4).map(s=>s.english).join(' | ')
  const n=cards.length
  const complexity=n<6?'very simple 2-3 words':n<15?'short sentence familiar vocab':'full situational Rio scenario'
  const raw=await ct(`Carioca Portuguese tutor creating sentence practice.\n${FULL_RULES}\nCreate ONE realistic Rio situation. Student writes what they would say — not a translation.\nComplexity:${complexity}. Prioritise unused words:${priority||'any'}. Do NOT repeat:${recent||'none'}.\nSet in real Rio life:boteco,praia,uber,rua,vizinho,mercado.\nReply ONLY valid JSON:{"english":"situation","targetWords":["w1","w2"],"scenario":"boteco|praia|rua|social|compras","context":"brief scene","structure":"grammar pattern"}`,
  `Vocabulary:\n${vocab}\n\nGenerate:`,600)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}
  catch{return{english:'You just walked into your local boteco. Order a cold one.',targetWords:['me ve','gelada'],scenario:'boteco',context:'At a bar in Rio',structure:'me ve + noun'}}
}

async function evalAnswer(scenario,answer,cards){
  const raw=await ct(`Warm Carioca Portuguese tutor.\n${FULL_RULES}\nReply ONLY valid JSON:{"wordScores":{"word":1-5},"naturalness":0-100,"feedback":"one warm validating line then soft correction","correction":"Carioca version if improvement possible else null","errorType":"register|vocabulary|structure|production|null"}`,
  `Situation:${scenario.english}\nTargets:${scenario.targetWords?.join(', ')||''}\nStudent:"${answer}"`,500)
  try{const ev=JSON.parse(raw.replace(/```json|```/g,'').trim());const cardUpdates={};Object.entries(ev.wordScores||{}).forEach(([w,s])=>{const c=cards.find(x=>x.portuguese.toLowerCase().includes(w.toLowerCase()));if(c)cardUpdates[c.id]=s});return{...ev,cardUpdates}}
  catch{return{wordScores:{},naturalness:50,feedback:"Couldn't evaluate.",correction:null,errorType:null,cardUpdates:{}}}
}

async function claudeSearch(query,cards){
  const list=cards.map(c=>`${c.id}|${c.portuguese}|${c.english||''}|${c.type}`).join('\n')
  const raw=await ct(`Search Portuguese vocab bank by meaning. Query can be English or Portuguese. Reply ONLY JSON array of card IDs in relevance order max 20:["id1","id2"]`,`Query:"${query}"\n\nCards:\n${list}`,400)
  try{const ids=JSON.parse(raw.replace(/```json|```/g,'').trim());return ids.map(id=>cards.find(c=>c.id===id)).filter(Boolean)}catch{return[]}
}

function normPT(s){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function splitByDays(text){const chunks=[],re=/(?:^|\n)\s*(Day|DAY)\s+(\d+)/g;let m;const pos=[];while((m=re.exec(text))!==null)pos.push({day:parseInt(m[2]),idx:m.index});if(!pos.length)return[{day:0,text:text.trim()}];for(let i=0;i<pos.length;i++){const{day,idx}=pos[i];const end=i+1<pos.length?pos[i+1].idx:text.length;chunks.push({day,text:text.slice(idx,end).trim()})}return chunks}

async function extractFromText(pastedText,existingCards){
  const existingList=existingCards.map(c=>c.portuguese).join('\n')
  const existingNorm=new Set(existingCards.map(c=>normPT(c.portuguese)))
  const ALWAYS_SKIP=[1,2,3,4,5,6,7,8,9,10,11,12,13]
  const chunks=splitByDays(pastedText)
  const dayCardCounts={}
  existingCards.forEach(c=>{if(c.sourceDay)dayCardCounts[c.sourceDay]=(dayCardCounts[c.sourceDay]||0)+1})
  const coveredDays=new Set([...ALWAYS_SKIP,...Object.keys(dayCardCounts).filter(d=>dayCardCounts[d]>=3).map(Number)])
  const newChunks=chunks.filter(c=>c.day===0||!coveredDays.has(c.day))
  if(!newChunks.length)return[]
  const allItems=[],seenNorm=new Set([...existingNorm])
  for(const chunk of newChunks){
    if(chunk.text.length<30)continue
    const markers=['Matéria:','Materia:','Aula de Hoje:','Aula de hoje:','Coisas de hoje:','Quer aprender:']
    let focusText=chunk.text
    for(const m of markers){const idx=chunk.text.indexOf(m);if(idx>0){focusText=chunk.text.slice(idx);break}}
    const hasMarker=markers.some(m=>chunk.text.includes(m))
    const lc=chunk.text.toLowerCase()
    if((lc.match(/revis[aã]o/g)||[]).length>3&&(lc.match(/aula de hoje|matéria|materia|coisas de hoje/g)||[]).length===0)continue
    const raw=await ct(`Smart vocabulary extractor for Brazilian Portuguese lesson notes.\nSTUDENT'S DECK — skip anything semantically equivalent:\n${existingList}\n\nDOC FORMAT: "Revisão*"=SKIP | "Matéria:/Aula de Hoje:/Coisas de hoje:/Quer aprender:"=EXTRACT | "To Learn:/Proxima aula:/Homework:"=SKIP | lines with !,*,?=SKIP | (errado)=SKIP | Pronunciation tables=SKIP\n\nEXTRACT: new words,phrases,grammar rules(ONE card per rule),collapsed patterns(eu quero ir pra...)\nReturn ONLY JSON array:[{"portuguese":"accented","english":"translation","type":"giria|vocab|frase_pronta|grammar|sentence","cluster":null,"contrast":null,"exampleSentence":null}]\nNothing new→[]`,
    `DAY ${chunk.day}${hasMarker?' (new section)':''}:\n${focusText.slice(0,5000)}`,2000)
    let items=[]
    try{let c=raw.replace(/```json|```/g,'').trim();if(!c.startsWith('['))c='[]';if(!c.endsWith(']')){const l=c.lastIndexOf('},');c=l>0?c.slice(0,l+1)+']':'[]'}items=JSON.parse(c)}catch(e){const m=raw.match(/\[[\s\S]*\]/);if(m)try{items=JSON.parse(m[0])}catch(e2){}}
    const filtered=items.filter(i=>{if(!i?.portuguese)return false;const n=normPT(i.portuguese);if(seenNorm.has(n))return false;seenNorm.add(n);return true}).map(i=>({...i,sourceDay:chunk.day||0}))
    allItems.push(...filtered)
  }
  return allItems
}

async function iwantToSay(thought){
  const raw=await ct(`Carioca Portuguese assistant. Give the most natural Carioca way to say it — not formal Portuguese.\nReply ONLY valid JSON:{"portuguese":"Carioca version","pronunciation":"rough phonetic guide","note":"brief usage note"}`,`I want to say:"${thought}"`,300)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return{portuguese:'...',pronunciation:'',note:''}}
}

async function generateMnemonic(card,previousMnemonic){
  const raw=await ct(`You create short memorable visual memory hooks for language learners. The student is an English-speaking man living in Rio de Janeiro learning Carioca Portuguese from a local tutor.\nMake it visual,story-based,sound-based,or absurd. Reference Rio life when natural. 2-3 sentences max.\n${previousMnemonic?`Previous hook the student didn't resonate with:"${previousMnemonic}" — create something completely different.`:''}\nReply ONLY valid JSON:{"mnemonic":"the hook text"}`,
  `Word:"${card.portuguese}" means "${card.english}"${card.exampleSentence?`. Example:"${card.exampleSentence}"`:''}`,400)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim()).mnemonic||null}catch{return null}
}

async function openChatScene(scene){
  const raw=await ct(`Carioca local in Rio for language practice. Short,casual,real Carioca contractions and giria.\nReply ONLY valid JSON:{"message":"opening in Portuguese","translation":"English translation"}`,`Scene:${scene}\n\nOpen:`,300)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return{message:'Oi! Tudo bom?',translation:'Hey! All good?'}}
}

async function replyChatScene(history){
  const convo=history.map(h=>`${h.role==='user'?'Student':'Carioca'}:${h.content}`).join('\n')
  const raw=await ct(`Carioca local having casual conversation with language student.\n${FULL_RULES}\nShort,natural,Carioca. Use contractions and giria naturally.\nReply ONLY valid JSON:{"message":"reply in Portuguese","translation":"English","correction":"gentle correction if student made error else null"}`,
  `Conversation:\n${convo}\n\nYour reply:`,300)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return{message:'E mesmo?',translation:'Oh really?',correction:null}}
}

async function evalFullChat(history,turnCorrections,cards){
  const convo=history.map(h=>`${h.role}:${h.content}`).join('\n')
  const prior=turnCorrections.filter(Boolean).join(' | ')
  const raw=await ct(`Evaluate a Carioca Portuguese conversation by a language student.\n${FULL_RULES}\nCongruent with turn corrections already given:${prior||'none'}. Do not contradict them.\nReply ONLY valid JSON:{"overallScore":0-100,"feedback":"2-3 sentences warm specific","corrections":["c1"],"wordsUsedWell":["w1"]}`,
  `Vocab:${cards.filter(c=>c.mastery>=1).map(c=>c.portuguese).slice(0,20).join(', ')}\n\nConversation:\n${convo}`,500)
  try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return{overallScore:70,feedback:'Good effort! Keep practising.',corrections:[],wordsUsedWell:[]}}
}

async function generateShuffleWords(cards,difficulty){
  const counts={easy:3,medium:5,hard:7}
  const n=counts[difficulty]||5
  const eligible=cards.filter(c=>c.mastery>=1)
  if(eligible.length<n)return eligible.sort(()=>Math.random()-0.5).slice(0,eligible.length)
  const list=eligible.map(c=>`${c.id}|${c.portuguese}|${c.english}`).join('\n')
  const raw=await ct(`Pick ${n} Portuguese words from this list for a creative sentence challenge.\n${difficulty==='hard'?'Pick words from DIFFERENT semantic areas that are hard to combine naturally.':difficulty==='medium'?'Mix familiar and unfamiliar topic areas.':'Pick related words from the same area.'}\nReply ONLY a JSON array of IDs:["id1","id2",...]`,
  `Words:\n${list}`,400)
  try{const ids=JSON.parse(raw.replace(/```json|```/g,'').trim());const result=ids.map(id=>eligible.find(c=>c.id===id)).filter(Boolean);return result.length>=2?result.slice(0,n):eligible.sort(()=>Math.random()-0.5).slice(0,n)}
  catch{return eligible.sort(()=>Math.random()-0.5).slice(0,n)}
}

async function evalShuffle(targetWords,sentence,cards){
  const raw=await ct(`Evaluating a Portuguese sentence by a Carioca Portuguese student.\n${FULL_RULES}\nTarget words to use:${targetWords.map(c=>c.portuguese).join(', ')}\nReply ONLY valid JSON:{"wordsUsed":["portuguese_word"],"naturalness":0-100,"feedback":"warm specific feedback","correction":"improved Carioca version or null"}`,
  `Sentence:"${sentence}"`,600)
  try{
    const ev=JSON.parse(raw.replace(/```json|```/g,'').trim())
    const used=ev.wordsUsed?.length||0
    const total=targetWords.length
    const score=Math.round(used*10+(ev.naturalness/100)*50+(used===total?50:0)+(used===total&&ev.naturalness>=80?100:0))
    return{...ev,score}
  }catch{return{wordsUsed:[],naturalness:50,feedback:"Couldn't evaluate.",correction:null,score:0}}
}


function Spinner({size=20}){return<div style={{width:size,height:size,border:`2px solid ${BD}`,borderTopColor:AC,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>}
function Tag({text,color}){const c=color||AC;return<span style={{fontSize:11,padding:'3px 9px',borderRadius:6,background:`${c}22`,color:c,fontWeight:500}}>{text}</span>}
function PBtn({label,onClick,disabled,full=true,small,color}){const bg=color||(disabled?S2:AC);return<button onClick={disabled?null:onClick} onMouseDown={e=>{SND.init();if(!disabled)e.currentTarget.style.opacity='0.8'}} onMouseUp={e=>e.currentTarget.style.opacity='1'} style={{width:full?'100%':undefined,background:bg,color:disabled?MU:(color?'#fff':'#16240f'),border:'none',borderRadius:13,padding:small?'10px 18px':'15px 24px',fontSize:small?13:15,fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,fontFamily:FONT}}>{label}</button>}
function GBtn({label,onClick,small}){return<button onClick={onClick} style={{background:S2,border:`1px solid ${BD}`,color:MU,borderRadius:13,padding:small?'10px 18px':'14px 24px',fontSize:small?13:14,fontWeight:600,cursor:'pointer',fontFamily:FONT,width:'100%'}}>{label}</button>}
function MasteryDots({mastery,size=8}){return<div style={{display:'flex',gap:3}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:size,height:size,borderRadius:'50%',background:i<=mastery?(mastery>=4?GR:mastery>=2?AC:YE):BD}}/>)}</div>}

function CardStatPopup({card,onClose}){
  const daysUntil=Math.round((new Date(card.nextReview)-new Date())/86400000)
  const status=daysUntil<0?`${Math.abs(daysUntil)}d overdue`:daysUntil===0?'Due today':`In ${daysUntil}d`
  const statusColor=daysUntil<0?RE:daysUntil<=1?YE:GR
  return<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,background:S,borderRadius:'20px 20px 0 0',padding:'24px 24px 40px',animation:'slideUp 0.25s ease'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
        <div style={{fontSize:20,fontWeight:700,color:TX}}>{card.portuguese}</div>
        <SpeakBtn text={card.portuguese}/>
        {card.priority&&<span style={{fontSize:16}}>⭐</span>}
      </div>
      <div style={{fontSize:14,color:MU,marginBottom:20}}>{card.english}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[{l:'Mastery',v:<MasteryDots mastery={card.mastery}/>},{l:'Next review',v:<span style={{color:statusColor,fontSize:13,fontWeight:600}}>{status}</span>},{l:'Recognition',v:`${card.recognitionMastery||0}/5`},{l:'Production',v:`${card.productionMastery||0}/5`},{l:'Interval',v:`${card.interval||0} days`},{l:'Ease factor',v:(card.easeFactor||2.5).toFixed(2)},{l:'Reps',v:card.reps||0},{l:'Sentence uses',v:card.sentenceCount||0}].map(({l,v})=><div key={l} style={{background:S2,borderRadius:10,padding:'12px'}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:4}}>{l.toUpperCase()}</div><div style={{fontSize:14,color:TX,fontWeight:600}}>{v}</div></div>)}
      </div>
      {card.exampleSentence&&<div style={{background:S2,borderRadius:10,padding:'12px',marginBottom:10}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><div style={{fontSize:10,color:MU,fontWeight:600}}>EXAMPLE</div><SpeakBtn text={card.exampleSentence} size={12}/></div><div style={{fontSize:13,color:TX,fontStyle:'italic'}}>{card.exampleSentence}</div></div>}
      {card.mnemonic&&<div style={{background:`${GD}15`,border:`1px solid ${GD}33`,borderRadius:10,padding:'12px',marginBottom:10}}><div style={{fontSize:10,color:GD,fontWeight:600,marginBottom:3}}>MEMORY HOOK</div><div style={{fontSize:13,color:TX}}>{card.mnemonic}</div></div>}
      <GBtn label="Close" onClick={onClose}/>
    </div>
  </div>
}

function Nav({screen,go,due,onSwitchNG}){
  const tabs=[{k:'home',i:'⊙',l:'Home'},{k:'study',i:'▣',l:'Study',b:due},{k:'phrase',i:'◈',l:'Phrase'},{k:'voice',i:'◉',l:'Voice'},{k:'bank',i:'☰',l:'Bank'}]
  return<div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:`${S}f0`,borderTop:`1px solid ${BD}`,display:'flex',padding:'8px 0 22px',backdropFilter:'blur(16px)',zIndex:100}}>
    {tabs.map(t=><button key={t.k} onClick={()=>go(t.k)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'4px 0',position:'relative',fontFamily:FONT}} onMouseDown={()=>SND.init()}>
      <span style={{fontSize:20,opacity:screen===t.k?1:0.3,filter:screen===t.k?`drop-shadow(0 0 8px ${AC})`:'none'}}>{t.i}</span>
      <span style={{fontSize:10,color:screen===t.k?AC:MU,fontWeight:screen===t.k?700:400}}>{t.l}</span>
      {t.b>0&&<div style={{position:'absolute',top:2,right:'15%',width:7,height:7,background:RE,borderRadius:'50%'}}/>}
    </button>)}
    {onSwitchNG&&<button onClick={onSwitchNG} style={{flex:0.8,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'4px 0',fontFamily:FONT}}>
      <span style={{fontSize:20,opacity:0.5}}>◈</span>
      <span style={{fontSize:9,color:MU}}>Next Gen</span>
    </button>}
  </div>
}

class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null}}
  static getDerivedStateFromError(e){return{error:e.message||'Unknown error'}}
  componentDidCatch(e,info){console.error('Crashed:',e,info)}
  render(){
    if(this.state.error)return<div style={{padding:'40px 24px',textAlign:'center'}}><div style={{fontSize:32,marginBottom:16}}>⚠️</div><div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:8}}>Something crashed</div><div style={{fontSize:11,color:MU,marginBottom:20,fontFamily:'monospace',background:S2,padding:'10px',borderRadius:8,wordBreak:'break-all'}}>{this.state.error}</div><button onClick={()=>this.setState({error:null})} style={{background:AC,color:'#fff',border:'none',borderRadius:12,padding:'12px 24px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Try again</button></div>
    return this.props.children
  }
}


function Home({cards,streak,lastDate,tier,go}){
  const due=cards.filter(c=>new Date(c.nextReview)<=new Date()&&c.mastery>0&&!c.priority).length
  const mastered=cards.filter(c=>c.mastery>=5).length
  const inSentences=cards.filter(c=>c.sentenceCount>0).length
  const priorityCount=cards.filter(c=>c.priority).length
  const nextTier=TIERS.find(t=>t.min>mastered)
  const pct=nextTier?((mastered-tier.min)/(nextTier.min-tier.min))*100:100
  const studiedToday=lastDate===new Date().toISOString().slice(0,10)
  return<div style={{padding:'52px 24px 100px',animation:'up 0.35s ease'}}>
    <div style={{marginBottom:32}}>
      <div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:8}}>YOUR PROGRESS</div>
      <div style={{display:'flex',alignItems:'baseline',gap:12,marginBottom:4}}>
        <span style={{fontSize:48,fontWeight:900,color:TX,lineHeight:1}}>{mastered}</span>
        <span style={{fontSize:18,color:MU}}>of {cards.length} mastered</span>
      </div>
      <div style={{fontSize:14,color:MU,marginBottom:12}}>{inSentences} used in sentences</div>
      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <span style={{fontSize:14,color:AC,fontWeight:700}}>{tier.name}</span>
        {nextTier&&<div style={{flex:1,height:3,background:BD,borderRadius:3,minWidth:60}}><div style={{height:'100%',width:`${pct}%`,background:AC,borderRadius:3,transition:'width 0.7s ease'}}/></div>}
        {nextTier&&<span style={{fontSize:11,color:MU}}>{nextTier.min-mastered} to go</span>}
        {streak>0&&<span style={{fontSize:14,color:YE,fontWeight:700}}>🔥 {streak}d</span>}
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:24}}>
      {[{label:'Cards',val:cards.length,color:TX},{label:'Due',val:due,color:due>0?YE:GR},{label:'Mastered',val:mastered,color:GR}].map(s=><div key={s.label} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'16px 12px',textAlign:'center'}}><div style={{fontSize:28,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div><div style={{fontSize:11,color:MU,marginTop:4,fontWeight:500}}>{s.label}</div></div>)}
    </div>
    {priorityCount>0&&<div style={{background:`${GD}15`,border:`1px solid ${GD}33`,borderRadius:14,padding:'12px 18px',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
      <span style={{fontSize:16}}>⭐</span><span style={{fontSize:13,color:GD,fontWeight:600}}>{priorityCount} priority card{priorityCount!==1?'s':''} in today's deck</span>
    </div>}
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <button onClick={()=>go('study')} onMouseDown={()=>SND.init()} style={{background:AC,color:'#fff',border:'none',borderRadius:16,padding:'20px 24px',fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:FONT}}>
        <span>{due>0?`Review — ${due} cards due`:'Study flashcards'}</span><span style={{fontSize:22}}>→</span>
      </button>
      <button onClick={()=>go('phrase')} onMouseDown={()=>SND.init()} style={{background:S,border:`1px solid ${BD}`,color:TX,borderRadius:16,padding:'18px 24px',fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:FONT}}>
        <span>Phrase practice</span><span style={{opacity:0.4,fontSize:18}}>→</span>
      </button>
    </div>
    {streak>0&&!studiedToday&&<div style={{marginTop:18,padding:'14px 18px',background:`${YE}15`,border:`1px solid ${YE}44`,borderRadius:14,display:'flex',alignItems:'center',gap:10}}>
      <span>🔥</span><span style={{fontSize:13,color:YE}}>Study today to keep your {streak}-day streak</span>
    </div>}
  </div>
}


function Study({cards,onRate,active}){
  const[mode,setMode]=useState('flash')
  const[flashKey,setFlashKey]=useState(0)
  const restart=useCallback(()=>setFlashKey(k=>k+1),[])
  return<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
    <div style={{padding:'16px 20px 0',display:'flex',gap:8}}>
      {[['flash','Flashcards'],['elim','Elimination']].map(([k,l])=><button key={k} onClick={()=>{setMode(k);if(k==='flash')setFlashKey(n=>n+1)}} onMouseDown={()=>SND.init()} style={{padding:'8px 18px',borderRadius:10,background:mode===k?AC:S2,color:mode===k?'#fff':MU,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:FONT}}>{l}</button>)}
    </div>
    <div style={{flex:1,overflow:'hidden'}}>
      {mode==='flash'&&<FlashCards key={flashKey} cards={cards} onRate={onRate} onRestart={restart}/>}
      {mode==='elim'&&<EliminationGame cards={cards} onRate={onRate}/>}
    </div>
  </div>
}

function FlashCards({cards,onRate,onRestart}){
  // Build initial batch — due first, then fresh
  const makeBatch=useCallback((seen=new Set())=>{
    const now=new Date()
    const priority=cards.filter(c=>c.priority&&!seen.has(c.id))
    const due=cards.filter(c=>!c.priority&&new Date(c.nextReview)<=now&&c.mastery>0&&!seen.has(c.id)).sort(()=>Math.random()-0.5)
    const fresh=cards.filter(c=>!c.priority&&c.mastery===0&&!seen.has(c.id)).sort(()=>Math.random()-0.5)
    // If nothing new left, cycle everything
    const pool=priority.length||due.length||fresh.length
      ?[...priority,...due,...fresh]
      :cards.sort(()=>Math.random()-0.5)
    return enforceInterleaving(pool.slice(0,20))
  },[cards])

  const[deck,setDeck]=useState(()=>makeBatch())
  const[idx,setIdx]=useState(0)
  const[seenIds,setSeenIds]=useState(new Set())
  const[wrongCards,setWrongCards]=useState([])
  const[isRetest,setIsRetest]=useState(false)
  const[flipped,setFlipped]=useState(false)
  const[flipping,setFlipping]=useState(false)
  const[phase,setPhase]=useState('front')
  const[ans,setAns]=useState('')
  const[ev,setEv]=useState(null)
  const[showCorrection,setShowCorrection]=useState(false)
  const[combo,setCombo]=useState(0)
  const[maxCombo,setMaxCombo]=useState(0)
  const[sessionCount,setSessionCount]=useState(0)
  const[sessionCorrect,setSessionCorrect]=useState(0)
  const[showFinish,setShowFinish]=useState(false)
  const[cardKey,setCardKey]=useState(0)
  const[statCard,setStatCard]=useState(null)
  const[hintRevealed,setHintRevealed]=useState(false)
  const[generatingMnemonic,setGeneratingMnemonic]=useState(false)
  const[localMnemonic,setLocalMnemonic]=useState(null)
  const card=deck[idx]
  const isDeep=card&&card.mastery>=2
  const mnemonic=localMnemonic||(card?.mnemonic)||null

  useEffect(()=>{setLocalMnemonic(null);setHintRevealed(false)},[idx,cardKey])

  // Top up deck when approaching end
  useEffect(()=>{
    if(!isRetest&&idx>=deck.length-3){
      const newSeen=new Set([...seenIds,...deck.map(c=>c.id)])
      const more=makeBatch(newSeen)
      if(more.length){setDeck(prev=>[...prev,...more]);setSeenIds(newSeen)}
      // If nothing genuinely new, cycle from scratch after retest
    }
  },[idx,deck,isRetest,seenIds,makeBatch])

  const doFlip=useCallback(cb=>{SND.play('flip');setFlipping(true);setTimeout(()=>{cb();setFlipping(false)},170)},[])

  const advance=useCallback(q=>{
    const effectiveQ=hintRevealed?Math.min(q,3):q
    onRate(card.id,effectiveQ,'study')
    if(effectiveQ<3&&!isRetest)setWrongCards(w=>[...w,card])
    const newCombo=effectiveQ>=3?combo+1:0
    setCombo(newCombo)
    setMaxCombo(m=>Math.max(m,newCombo))
    SND.play(effectiveQ<3?'wrong':newCombo>=3?'combo':'correct',newCombo)
    setSessionCount(c=>c+1)
    if(effectiveQ>=4)setSessionCorrect(c=>c+1)
    setShowCorrection(false);setHintRevealed(false);setLocalMnemonic(null)
    const nextIdx=idx+1
    // End of deck — do retest if wrong cards, then keep going
    if(nextIdx>=deck.length){
      if(!isRetest&&wrongCards.length>0){
        setDeck([...wrongCards]);setIdx(0);setIsRetest(true)
        setFlipped(false);setPhase('front');setAns('');setEv(null);setCardKey(k=>k+1)
        return
      }
      // Retest done or no wrong cards — load next batch
      setIsRetest(false);setWrongCards([])
      const newSeen=new Set([...seenIds,...deck.map(c=>c.id)])
      const more=makeBatch(newSeen)
      setDeck(more.length?more:makeBatch(new Set()))
      setSeenIds(more.length?newSeen:new Set())
      setIdx(0);setFlipped(false);setPhase('front');setAns('');setEv(null);setCardKey(k=>k+1)
      return
    }
    doFlip(()=>{setIdx(nextIdx);setFlipped(false);setPhase('front');setAns('');setEv(null);setCardKey(k=>k+1)})
  },[card,idx,deck,isRetest,wrongCards,combo,hintRevealed,seenIds,makeBatch,onRate,doFlip])

  const tap=useCallback(async()=>{
    if(flipped||flipping)return
    if(isDeep&&phase==='front'){setPhase('typing');return}
    if(isDeep&&phase==='typing'){
      if(!ans.trim()){doFlip(()=>{setFlipped(true);SFX.flip();setPhase('back')});return}
      setPhase('evaluating')
      const res=await evalCardAnswer(card,ans)
      doFlip(()=>{setEv(res);setFlipped(true);setPhase('back')})
      return
    }
    doFlip(()=>{setFlipped(true);setPhase('back')})
  },[flipped,flipping,isDeep,phase,ans,card,doFlip])

  useEffect(()=>{if(flipped&&ev){const t=setTimeout(()=>setShowCorrection(true),1000);return()=>clearTimeout(t)}},[flipped,ev])

  const genMnemonic=useCallback(async()=>{
    if(generatingMnemonic)return
    setGeneratingMnemonic(true)
    const m=await generateMnemonic(card,mnemonic)
    if(m){setLocalMnemonic(m);await dbUpdateCardMeta(card.id,{mnemonic:m})}
    setGeneratingMnemonic(false)
  },[card,mnemonic,generatingMnemonic])

  const removeMnemonic=useCallback(async()=>{
    setLocalMnemonic(null)
    await dbUpdateCardMeta(card.id,{mnemonic:null})
  },[card])

  if(showFinish)return<StudyDone
    sessionCount={sessionCount}
    sessionCorrect={sessionCorrect}
    combo={combo}
    maxCombo={maxCombo}
    onRestart={()=>{
      setShowFinish(false);setDeck(makeBatch());setIdx(0);setSeenIds(new Set())
      setWrongCards([]);setIsRetest(false);setCombo(0);setMaxCombo(0)
      setSessionCount(0);setSessionCorrect(0);setFlipped(false);setPhase('front')
      setAns('');setEv(null);setCardKey(k=>k+1)
    }}
  />

  if(!card)return<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16}}><Spinner/><span style={{color:MU}}>Loading cards…</span></div>

  return<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
    {statCard&&<CardStatPopup card={statCard} onClose={()=>setStatCard(null)}/>}
    <div style={{padding:'12px 20px 8px',display:'flex',alignItems:'center',gap:10}}>
      {/* Streak counter */}
      {combo>=3&&<div style={{display:'flex',alignItems:'center',gap:4,background:`${YE}18`,border:`1px solid ${YE}33`,borderRadius:20,padding:'4px 12px'}}>
        <span style={{fontSize:14}}>🔥</span>
        <span style={{fontSize:14,color:YE,fontWeight:800}}>{combo}</span>
      </div>}
      <div style={{flex:1,height:3,background:BD,borderRadius:3}}>
        <div style={{height:'100%',width:`${Math.min(100,(sessionCount%20)*5)}%`,background:isRetest?YE:AC,borderRadius:3,transition:'width 0.3s'}}/>
      </div>
      {isRetest&&<span style={{fontSize:11,color:YE,fontWeight:700}}>RE-TEST</span>}
      <span style={{fontSize:12,color:MU,fontWeight:500}}>{sessionCount} done</span>
      <button onClick={()=>setShowFinish(true)} style={{fontSize:11,color:MU,background:'none',border:`1px solid ${BD}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontFamily:FONT}}>Finish</button>
    </div>
    <div style={{flex:1,padding:'8px 20px 16px',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <Tag text={card.type}/>{card.contrast&&<Tag text="Carioca" color={GR}/>}{card.priority&&<span style={{fontSize:13}}>⭐</span>}
        <button onClick={()=>setStatCard(card)} style={{background:'none',border:'none',cursor:'pointer',marginLeft:'auto',display:'flex',alignItems:'center',gap:4}}><MasteryDots mastery={card.mastery}/></button>
      </div>
      <div style={{position:'relative',flex:1,display:'flex',flexDirection:'column'}}>
        {deck[idx+2]&&<div style={{position:'absolute',inset:0,background:S,border:`1px solid ${BD}`,borderRadius:22,transform:'translateY(12px) scale(0.91)',opacity:0.28}}/>}
        {deck[idx+1]&&<div style={{position:'absolute',inset:0,background:S,border:`1px solid ${BD}`,borderRadius:22,transform:'translateY(6px) scale(0.956)',opacity:0.52}}/>}
        <div key={cardKey} style={{position:'relative',flex:1,zIndex:2,display:'flex',flexDirection:'column',animation:'up 0.28s ease',opacity:flipping?0:1,transform:flipping?'scaleX(0.05)':'scaleX(1)',transition:flipping?'all 0.15s ease':'none'}}>
          {!flipped
            ?<div onClick={phase!=='typing'?tap:undefined} style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:22,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 28px',textAlign:'center',cursor:phase==='typing'?'default':'pointer'}}>
              {phase==='front'&&<>
                <div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:16}}>PORTUGUESE</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:card.exampleSentence?12:20}}>
                  <div style={{fontSize:card.portuguese.length>22?22:38,color:TX,fontWeight:700,lineHeight:1.25}}>{card.portuguese}</div>
                  <SpeakBtn text={card.portuguese} size={18}/>
                </div>
                {card.exampleSentence&&<div style={{fontSize:12,color:MU,fontStyle:'italic',marginBottom:12,maxWidth:280}}>{card.exampleSentence}</div>}
                {mnemonic&&!hintRevealed&&<button onClick={e=>{e.stopPropagation();setHintRevealed(true)}} style={{fontSize:11,color:GD,background:`${GD}18`,border:`1px solid ${GD}33`,borderRadius:20,padding:'6px 14px',cursor:'pointer',fontFamily:FONT,marginBottom:8}}>💡 Show hint</button>}
                {mnemonic&&hintRevealed&&<div style={{background:`${GD}15`,border:`1px solid ${GD}33`,borderRadius:12,padding:'12px 16px',marginBottom:8,maxWidth:300,animation:'fadeIn 0.3s ease'}}><div style={{fontSize:11,color:GD,fontWeight:600,marginBottom:4}}>MEMORY HOOK <span style={{color:YE,fontSize:10}}>(hint used → max △)</span></div><div style={{fontSize:13,color:TX}}>{mnemonic}</div></div>}
                {!mnemonic&&<button onClick={e=>{e.stopPropagation();genMnemonic()}} style={{fontSize:11,color:MU,background:'none',border:`1px solid ${BD}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',fontFamily:FONT,marginBottom:8}}>{generatingMnemonic?'Generating…':'+ Generate hint'}</button>}
                <div style={{fontSize:13,color:MU,padding:'9px 22px',border:`1px solid ${BD}`,borderRadius:22,marginTop:8}}>{isDeep?'Tap to translate':'Tap to reveal'}</div>
              </>}
              {phase==='typing'&&<div style={{width:'100%'}}>
                <div style={{fontSize:11,color:MU,letterSpacing:2,fontWeight:600,marginBottom:12}}>TRANSLATE TO ENGLISH</div>
                <div style={{fontSize:card.portuguese.length>22?20:32,color:TX,fontWeight:700,lineHeight:1.3,marginBottom:16}}>{card.portuguese}</div>
                <textarea value={ans} onChange={e=>setAns(e.target.value)} autoFocus placeholder="write your translation…" style={{width:'100%',background:BG,border:`1px solid ${BD}`,borderRadius:13,padding:'14px',color:TX,fontSize:15,resize:'none',outline:'none',minHeight:72,boxSizing:'border-box',marginBottom:12}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
                <PBtn label="Reveal →" onClick={tap} disabled={!ans.trim()}/>
              </div>}
              {phase==='evaluating'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}><Spinner/><span style={{fontSize:13,color:MU}}>Evaluating…</span></div>}
            </div>
            :<div style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:22,padding:'24px',overflowY:'auto',display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{fontSize:card.portuguese.length>22?18:28,color:TX,fontWeight:700,lineHeight:1.3}}>{card.portuguese}</div>
                <SpeakBtn text={card.portuguese}/>
              </div>
              <div style={{fontSize:17,color:TX,lineHeight:1.5,marginBottom:12}}>{card.english}</div>
              {card.contrast&&<div style={{padding:'10px 0',borderTop:`1px solid ${BD}`,marginBottom:12}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:4}}>FORMAL PORTUGUESE</div><div style={{fontSize:13,color:MU,fontStyle:'italic'}}>{card.contrast}</div></div>}
              {card.exampleSentence&&<div style={{padding:'10px 0',borderTop:`1px solid ${BD}`,marginBottom:12}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><div style={{fontSize:10,color:MU,fontWeight:600}}>EXAMPLE</div><SpeakBtn text={card.exampleSentence} size={12}/></div><div style={{fontSize:13,color:TX,fontStyle:'italic'}}>{card.exampleSentence}</div></div>}
              {ev&&showCorrection&&<div style={{background:S2,borderRadius:14,padding:'14px',marginBottom:14,animation:'fadeIn 0.4s ease'}}>
                <div style={{display:'flex',gap:8,marginBottom:10}}>{[{l:'Accuracy',v:ev.accuracy||50},{l:'Carioca',v:ev.naturalness||50}].map(x=>{const c=x.v>=75?GR:x.v>=50?YE:RE;return<div key={x.l} style={{flex:1,background:BG,borderRadius:10,padding:'10px',textAlign:'center'}}><div style={{fontSize:22,fontWeight:800,color:c}}>{x.v}</div><div style={{fontSize:10,color:MU,fontWeight:600,marginTop:3}}>{x.l.toUpperCase()}</div></div>})}</div>
                {ev.feedback&&<div style={{fontSize:13,color:TX,marginBottom:ev.correction?8:0}}>"{ev.feedback}"</div>}
                {ev.correction&&<div style={{fontSize:13,color:GR}}>→ {ev.correction}</div>}
              </div>}
              <div style={{marginTop:'auto',paddingTop:12}}>
                {mnemonic&&<div style={{background:`${GD}15`,border:`1px solid ${GD}33`,borderRadius:12,padding:'12px',marginBottom:12}}>
                  <div style={{fontSize:10,color:GD,fontWeight:600,marginBottom:4}}>MEMORY HOOK</div>
                  <div style={{fontSize:13,color:TX,marginBottom:8}}>{mnemonic}</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={genMnemonic} style={{fontSize:11,color:MU,background:S2,border:`1px solid ${BD}`,borderRadius:8,padding:'5px 10px',cursor:'pointer',fontFamily:FONT}}>{generatingMnemonic?'…':'🔄 Refresh'}</button>
                    <button onClick={removeMnemonic} style={{fontSize:11,color:RE,background:`${RE}18`,border:`1px solid ${RE}33`,borderRadius:8,padding:'5px 10px',cursor:'pointer',fontFamily:FONT}}>✕ Remove</button>
                  </div>
                </div>}
                {!mnemonic&&<button onClick={genMnemonic} style={{fontSize:12,color:GD,background:`${GD}15`,border:`1px solid ${GD}33`,borderRadius:12,padding:'10px 16px',cursor:'pointer',fontFamily:FONT,width:'100%',marginBottom:12}}>{generatingMnemonic?<span style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><Spinner size={14}/>Generating…</span>:'💡 Generate memory hook'}</button>}
                <div style={{fontSize:11,color:MU,fontWeight:600,textAlign:'center',marginBottom:10}}>HOW DID YOU DO?{hintRevealed&&<span style={{color:YE,marginLeft:8}}>hint used — max △</span>}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  {[{l:'✗',sub:'Again',q:1,c:RE},{l:'△',sub:'Almost',q:3,c:YE},{l:'✓',sub:'Got it',q:4,c:GR}].map(x=><button key={x.q} onClick={()=>advance(x.q)} disabled={x.q===4&&hintRevealed} style={{padding:'14px 8px',background:`${x.c}18`,border:`1px solid ${x.c}44`,borderRadius:14,color:x.c,cursor:x.q===4&&hintRevealed?'not-allowed':'pointer',fontFamily:FONT,opacity:x.q===4&&hintRevealed?0.3:1}} onMouseDown={e=>{SND.init();e.currentTarget.style.transform='scale(0.92)'}} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><div style={{fontSize:22,marginBottom:3}}>{x.l}</div><div style={{fontSize:12,fontWeight:500}}>{x.sub}</div></button>)}
                </div>
              </div>
            </div>}
        </div>
      </div>
    </div>
  </div>
}
function StudyDone({sessionCount,sessionCorrect,combo,maxCombo,onRestart}){
  const pct=sessionCount>0?Math.round((sessionCorrect/sessionCount)*100):0
  return<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 24px 100px',animation:'up 0.4s ease'}}>
    <div style={{fontSize:56,marginBottom:16,animation:'pop 0.5s ease'}}>{pct>=80?'🔥':pct>=60?'💪':'📚'}</div>
    <div style={{fontSize:26,fontWeight:800,color:TX,marginBottom:6}}>Session done</div>
    <div style={{fontSize:14,color:MU,marginBottom:28}}>{sessionCount} cards reviewed</div>
    <div style={{display:'flex',gap:24,marginBottom:28}}>
      {[{v:`${pct}%`,c:pct>=80?GR:pct>=60?YE:RE,l:'accuracy'},{v:maxCombo,c:YE,l:'best streak'},{v:sessionCorrect,c:GR,l:'correct'}].map(x=><div key={x.l} style={{textAlign:'center'}}><div style={{fontSize:34,fontWeight:800,color:x.c}}>{x.v}</div><div style={{fontSize:11,color:MU,fontWeight:500,marginTop:2}}>{x.l}</div></div>)}
    </div>
    <PBtn label="Study again →" onClick={onRestart}/>
  </div>
}


function EliminationGame({cards,onRate}){
  const[phase,setPhase]=useState('pick')
  const[poolSize,setPoolSize]=useState(10)
  const[pool,setPool]=useState([])
  const[streaks,setStreaks]=useState({})
  const[eliminated,setEliminated]=useState(new Set())
  const[queue,setQueue]=useState([])
  const[qIdx,setQIdx]=useState(0)
  const[attempts,setAttempts]=useState(0)
  const[flipped,setFlipped]=useState(false)
  const[flipping,setFlipping]=useState(false)
  const[cardKey,setCardKey]=useState(0)
  const[elimMsg,setElimMsg]=useState(null)
  const[done,setDone]=useState(false)

  const start=()=>{
    const p=buildEliminationPool(cards,poolSize)
    if(p.length<3){return}
    setPool(p);setStreaks({});setEliminated(new Set());setQueue([...p].sort(()=>Math.random()-0.5));setQIdx(0);setAttempts(0);setFlipped(false);setPhase('playing');setDone(false)
  }

  const currentCard=queue[qIdx]
  const remaining=pool.length-(eliminated.size)
  const isBoss=remaining===1&&!done

  const doFlip=useCallback(cb=>{SND.play('flip');setFlipping(true);setTimeout(()=>{cb();setFlipping(false)},170)},[])

  const rate=useCallback(q=>{
    if(!currentCard)return
    const newAttempts=attempts+1
    setAttempts(newAttempts)
    onRate(currentCard.id,q===5?5:q===3?3:1,'elimination')
    const streak=(streaks[currentCard.id]||0)
    if(q>=4){
      const newStreak=streak+1
      const newStreaks={...streaks,[currentCard.id]:newStreak}
      setStreaks(newStreaks)
      if(newStreak>=3){
        SND.play('eliminate')
        const newElim=new Set([...eliminated,currentCard.id])
        setEliminated(newElim)
        setElimMsg(`${currentCard.portuguese} — ELIMINATED! 💥`)
        setTimeout(()=>setElimMsg(null),1800)
        const remaining=pool.length-newElim.size
        if(remaining===0){SND.play('milestone');setDone(true);SFX.complete();return}
        // Move to next
        const newQueue=queue.filter(c=>!newElim.has(c.id))
        setQueue(newQueue);setQIdx(0);setFlipped(false);setCardKey(k=>k+1)
        return
      }
    }else{
      setStreaks({...streaks,[currentCard.id]:0})
      SND.play('wrong')
    }
    // Move card to end of queue, advance
    const newQ=[...queue.filter((_,i)=>i!==qIdx),currentCard]
    const nextIdx=qIdx>=newQ.length?0:qIdx
    setQueue(newQ);setQIdx(nextIdx===newQ.length?0:nextIdx);setFlipped(false);setCardKey(k=>k+1)
  },[currentCard,streaks,eliminated,queue,qIdx,attempts,pool,onRate])

  if(phase==='pick')return<div style={{padding:'24px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:6}}>Elimination Game</div>
    <div style={{fontSize:13,color:MU,marginBottom:24,lineHeight:1.7}}>Get each card right 3 times IN A ROW to eliminate it. Wrong answer resets the streak. Last card standing is the boss.</div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:10}}>POOL SIZE</div>
      <div style={{display:'flex',gap:8}}>{[5,10,15].map(n=><button key={n} onClick={()=>setPoolSize(n)} style={{flex:1,padding:'12px',background:poolSize===n?AC:S2,color:poolSize===n?'#fff':MU,border:'none',borderRadius:12,cursor:'pointer',fontFamily:FONT,fontWeight:700}}>{n}</button>)}</div>
    </div>
    <PBtn label="Start →" onClick={start}/>
  </div>

  if(done){
    const perfect=pool.length*3
    const efficiency=Math.round((perfect/Math.max(attempts,1))*100)
    const pb=parseInt(localStorage.getItem('elim_pb')||'0')
    const isNewPB=efficiency>pb
    if(isNewPB)localStorage.setItem('elim_pb',String(efficiency))
    return<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 24px',animation:'up 0.4s ease'}}>
      <div style={{fontSize:56,marginBottom:16,animation:'pop 0.6s ease'}}>🏆</div>
      <div style={{fontSize:26,fontWeight:800,color:TX,marginBottom:6}}>Deck cleared!</div>
      <div style={{fontSize:14,color:MU,marginBottom:24}}>{attempts} total attempts for {pool.length} cards</div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'24px',textAlign:'center',width:'100%',marginBottom:16}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:4}}>EFFICIENCY</div>
        <div style={{fontSize:52,fontWeight:900,color:efficiency>=80?GR:efficiency>=60?YE:RE}}>{efficiency}%</div>
        {isNewPB&&<div style={{fontSize:13,color:GD,marginTop:6,fontWeight:600}}>🎉 New personal best!</div>}
        {!isNewPB&&<div style={{fontSize:12,color:MU,marginTop:4}}>PB: {pb}%</div>}
      </div>
      <PBtn label="Play again" onClick={()=>{setPhase('pick');setDone(false)}}/>
    </div>
  }

  if(!currentCard)return null

  const streak=streaks[currentCard.id]||0

  return<div style={{display:'flex',flexDirection:'column',height:'100%',padding:'12px 20px'}}>
    {elimMsg&&<div style={{position:'fixed',top:'20%',left:'50%',transform:'translateX(-50%)',background:GR,color:'#fff',padding:'12px 24px',borderRadius:14,fontSize:15,fontWeight:700,zIndex:50,animation:'pop 0.3s ease',whiteSpace:'nowrap'}}>{elimMsg}</div>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
      <div style={{fontSize:13,color:isBoss?RE:MU,fontWeight:isBoss?700:400}}>{isBoss?'👾 BOSS CARD':`${pool.length-eliminated.size} remaining`}</div>
      <div style={{fontSize:13,color:MU}}>{attempts} attempts</div>
    </div>
    {/* Streak dots */}
    <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:16}}>
      {[1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:'50%',background:i<=streak?(i===3?GR:YE):BD,transition:'background 0.2s'}}/>)}
    </div>
    <div key={cardKey} style={{flex:1,display:'flex',flexDirection:'column',animation:'up 0.25s ease',opacity:flipping?0:1,transform:flipping?'scaleX(0.05)':'scaleX(1)',transition:flipping?'all 0.15s ease':'none'}}>
      {!flipped
        ?<div onClick={()=>{if(!flipping){SND.play('flip');setFlipping(true);setTimeout(()=>{setFlipped(true);setFlipping(false)},170)}}} style={{flex:1,background:isBoss?`${RE}18`:S,border:`1px solid ${isBoss?RE:BD}`,borderRadius:22,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',textAlign:'center',cursor:'pointer'}}>
          <div style={{fontSize:11,color:isBoss?RE:MU,letterSpacing:2,fontWeight:600,marginBottom:16}}>{isBoss?'BOSS CARD':'PORTUGUESE'}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <div style={{fontSize:currentCard.portuguese.length>22?22:38,color:TX,fontWeight:700}}>{currentCard.portuguese}</div>
            <SpeakBtn text={currentCard.portuguese} size={18}/>
          </div>
          <div style={{fontSize:13,color:MU,padding:'8px 20px',border:`1px solid ${BD}`,borderRadius:20}}>Tap to reveal</div>
        </div>
        :<div style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:22,padding:'24px',display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><div style={{fontSize:26,color:TX,fontWeight:700}}>{currentCard.portuguese}</div><SpeakBtn text={currentCard.portuguese}/></div>
          <div style={{fontSize:17,color:TX,marginBottom:12}}>{currentCard.english}</div>
          {currentCard.exampleSentence&&<div style={{fontSize:13,color:MU,fontStyle:'italic',marginBottom:12}}>{currentCard.exampleSentence}</div>}
          {currentCard.mnemonic&&<div style={{background:`${GD}15`,border:`1px solid ${GD}33`,borderRadius:12,padding:'12px',marginBottom:12}}><div style={{fontSize:10,color:GD,fontWeight:600,marginBottom:3}}>MEMORY HOOK</div><div style={{fontSize:13,color:TX}}>{currentCard.mnemonic}</div></div>}
          <div style={{marginTop:'auto'}}>
            <div style={{fontSize:11,color:MU,fontWeight:600,textAlign:'center',marginBottom:10}}>HOW DID YOU DO?</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[{l:'✗',sub:'Again',q:1,c:RE},{l:'△',sub:'Almost',q:3,c:YE},{l:'✓',sub:'Got it',q:4,c:GR}].map(x=><button key={x.q} onClick={()=>rate(x.q)} style={{padding:'14px 8px',background:`${x.c}18`,border:`1px solid ${x.c}44`,borderRadius:14,color:x.c,cursor:'pointer',fontFamily:FONT}} onMouseDown={e=>{SND.init();e.currentTarget.style.transform='scale(0.92)'}} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}><div style={{fontSize:22,marginBottom:3}}>{x.l}</div><div style={{fontSize:12,fontWeight:500}}>{x.sub}</div></button>)}
            </div>
          </div>
        </div>}
    </div>
  </div>
}


function Phrase({cards,onRateMultiple,sentenceHistory,onSaveSentence,isOnline=true,active}){
  const[tab,setTab]=useState('practice')
  return<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>
    <div style={{padding:'16px 20px 0',display:'flex',gap:2,background:S2,borderRadius:11,margin:'12px 20px 0',padding:'3px'}}>
      {[['practice','Practice'],['chat','Chat'],['shuffle','Shuffle'],['say','Say it'],['best','Best']].map(([k,l])=><button key={k} onClick={()=>setTab(k)} onMouseDown={()=>SND.init()} style={{flex:1,padding:'7px 10px',borderRadius:9,background:tab===k?AC:'transparent',color:tab===k?'#fff':MU,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:FONT,transition:'all 0.15s'}}>{l}</button>)}
    </div>
    <div style={{flex:1,overflowY:'auto',marginTop:4}}>
      {tab==='practice'&&<Practice cards={cards} onRateMultiple={onRateMultiple} sentenceHistory={sentenceHistory} onSaveSentence={onSaveSentence} isOnline={isOnline}/>}
      {tab==='chat'&&<ChatMode cards={cards} onRateMultiple={onRateMultiple} isOnline={isOnline}/>}
      {tab==='shuffle'&&<ShuffleMode cards={cards} onRateMultiple={onRateMultiple} isOnline={isOnline}/>}
      {tab==='say'&&<IWantToSay/>}
      {tab==='best'&&<BestSentences active={tab==='best'}/>}
    </div>
  </div>
}

function Practice({cards,onRateMultiple,sentenceHistory,onSaveSentence,isOnline=true}){
  const[phase,setPhase]=useState('idle')
  const[scenario,setScenario]=useState(null)
  const[ans,setAns]=useState('')
  const[ev,setEv]=useState(null)
  const[showCorrection,setShowCorrection]=useState(false)
  const[count,setCount]=useState(0)
  const[sessionCorrections,setSessionCorrections]=useState([])
  const[showEnd,setShowEnd]=useState(false)
  const[errorPatterns,setErrorPatterns]=useState([])
  const[initialized,setInitialized]=useState(false)

  useEffect(()=>{if(isOnline&&!initialized){dbLoadErrorPatterns().then(setErrorPatterns);setInitialized(true)}},[isOnline])

  const generate=useCallback(async()=>{
    if(!isOnline)return
    setPhase('loading');setAns('');setEv(null);setShowCorrection(false)
    try{const s=await genScenario(cards,sentenceHistory||[],errorPatterns);setScenario(s);setPhase('writing')}
    catch(e){setPhase('idle')}
  },[cards,sentenceHistory,errorPatterns,isOnline])

  const submit=useCallback(async()=>{
    if(!ans.trim()||!scenario||!isOnline)return
    setPhase('evaluating')
    try{
      const res=await evalAnswer(scenario,ans,cards)
      setEv(res);setCount(c=>c+1)
      onRateMultiple(res.cardUpdates||{},'sentence')
      if(res.errorType&&res.naturalness<75)dbUpdateErrorPattern(res.errorType,`${scenario.english} => ${ans}`)
      onSaveSentence({english:scenario.english,userAnswer:ans,scenario:scenario.scenario,date:new Date().toISOString()})
      if(res.correction)setSessionCorrections(sc=>[...sc,res.correction])
      if(res.naturalness>=85)dbSaveHoF({portuguese:ans,english_prompt:scenario.english,scenario:scenario.scenario,naturalness_score:res.naturalness})
      SND.play(res.naturalness>=75?'correct':'wrong')
      setPhase('result')
      setTimeout(()=>setShowCorrection(true),1000)
    }catch(e){setPhase('writing')}
  },[ans,scenario,cards,onRateMultiple,onSaveSentence,isOnline])

  const icons={boteco:'🍺',praia:'🏖️',rua:'🛣️',social:'👥',compras:'🛍️',food:'🍽️'}

  if(showEnd)return<div style={{padding:'24px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:16}}>Session corrections</div>
    {sessionCorrections.length===0?<div style={{fontSize:14,color:GR,padding:'16px 0'}}>No corrections — great session!</div>:sessionCorrections.map((c,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 16px',marginBottom:8}}><div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:4}}>CORRECTION {i+1}</div><div style={{fontSize:14,color:GR}}>→ {c}</div></div>)}
    <div style={{marginTop:20,display:'flex',gap:10}}><PBtn label="New session" onClick={()=>{setShowEnd(false);setSessionCorrections([]);setCount(0);setPhase('idle')}}/><GBtn label="Done" onClick={()=>setShowEnd(false)}/></div>
  </div>

  return<div style={{padding:'20px 20px 40px'}}>
    {phase==='idle'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',paddingTop:48,gap:16,animation:'up 0.3s ease'}}>
      <div style={{fontSize:52}}>{isOnline?'💬':'✈️'}</div>
      <div style={{fontSize:22,fontWeight:800,color:TX}}>Phrase Practice</div>
      {isOnline?<div style={{fontSize:14,color:MU,lineHeight:1.7,maxWidth:300}}>Claude builds a real Rio scenario from your vocab. Write what you'd actually say — no accent penalties.</div>:<div style={{fontSize:14,color:YE,lineHeight:1.7,maxWidth:300}}>Needs internet. Use Study mode to review flashcards offline.</div>}
      {isOnline&&<PBtn label="Generate scenario →" onClick={generate}/>}
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
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:14,textAlign:'center'}}><div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:6}}>CARIOCA NATURALNESS</div><div style={{fontSize:52,fontWeight:900,color:ev.naturalness>=75?GR:ev.naturalness>=50?YE:RE,lineHeight:1}}>{ev.naturalness||50}</div>{ev.naturalness>=85&&<div style={{fontSize:12,color:GR,marginTop:6,fontWeight:600}}>🇧🇷 Soou como carioca!</div>}</div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:12}}><div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:8}}>YOUR ANSWER</div><div style={{fontSize:16,color:TX,marginBottom:ev.feedback?12:0}}>{ans}</div>{ev.feedback&&<div style={{fontSize:14,color:MU,fontStyle:'italic',marginBottom:showCorrection&&ev.correction?12:0}}>"{ev.feedback}"</div>}{showCorrection&&ev.correction&&<div style={{animation:'fadeIn 0.4s ease'}}><div style={{height:1,background:BD,margin:'8px 0'}}/><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:11,color:GR,fontWeight:600}}>CARIOCA VERSION</div><SpeakBtn text={ev.correction} size={12}/></div><div style={{fontSize:15,color:GR,marginTop:4}}>{ev.correction}</div></div>}</div>
      <div style={{display:'flex',gap:10}}><PBtn label="Next →" onClick={generate}/><GBtn label={`End (${count})`} onClick={()=>setShowEnd(true)}/></div>
    </div>}
  </div>
}

const CHAT_SCENES=[{key:'boteco',label:'🍺 Boteco',desc:'Ordering at a Rio bar'},{key:'praia',label:'🏖️ Praia',desc:'At the beach'},{key:'uber',label:'🚗 Uber',desc:'Chatting with your driver'},{key:'vizinho',label:'🏠 Vizinho',desc:'Talking to a neighbour'},{key:'mercado',label:'🛒 Mercado',desc:'At the local market'},{key:'freestyle',label:'💬 Freestyle',desc:'You describe the situation'}]

function ChatMode({cards,onRateMultiple,isOnline=true}){
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

  const start=useCallback(async s=>{
    if(!isOnline)return
    const desc=s.key==='freestyle'?freestyleDesc:s.key
    setPhase('loading')
    try{const res=await openChatScene(desc);setHistory([{role:'bot',content:res.message,translation:res.translation}]);setPhase('chatting')}
    catch(e){setPhase('pick')}
  },[freestyleDesc,isOnline])

  const send=useCallback(async()=>{
    if(!input.trim()||loading||!isOnline)return
    const msg=input.trim();setInput('');setLoading(true)
    const newHist=[...history,{role:'user',content:msg}]
    setHistory(newHist)
    try{const res=await replyChatScene(newHist);const correction=res.correction||null;setTurnCorrections(tc=>[...tc,correction]);setHistory([...newHist,{role:'bot',content:res.message,translation:res.translation,correction}])}
    catch(e){setHistory([...newHist,{role:'bot',content:'...'}])}
    setLoading(false)
  },[input,loading,history,isOnline])

  const end=useCallback(async()=>{
    setShowEnd(true);setLoading(true)
    try{const res=await evalFullChat(history,turnCorrections,cards);if(res.wordsUsedWell?.length){const u={};res.wordsUsedWell.forEach(w=>{const c=cards.find(x=>x.portuguese.toLowerCase().includes(w.toLowerCase()));if(c)u[c.id]=4});onRateMultiple(u,'chat')}setEvalResult(res)}catch(e){setEvalResult({overallScore:70,feedback:'Good effort!',corrections:[],wordsUsedWell:[]})}
    setLoading(false)
  },[history,turnCorrections,cards,onRateMultiple])

  const reset=()=>{setPhase('pick');setHistory([]);setTurnCorrections([]);setEvalResult(null);setInput('');setShowEnd(false);setFreestyleDesc('')}

  if(!isOnline)return<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',padding:40,textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>✈️</div><div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:8}}>Chat needs internet</div><div style={{fontSize:14,color:MU}}>Come back when you land.</div></div>

  if(phase==='pick')return<div style={{padding:'20px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:4}}>Choose a situation</div>
    <div style={{fontSize:13,color:MU,marginBottom:16}}>Claude plays a Carioca local. No turn limit.</div>
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {CHAT_SCENES.map(s=><div key={s.key}>
        <button onClick={()=>s.key!=='freestyle'&&start(s)} style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',textAlign:'left',cursor:s.key==='freestyle'?'default':'pointer',fontFamily:FONT}} onMouseEnter={e=>e.currentTarget.style.borderColor=AC} onMouseLeave={e=>e.currentTarget.style.borderColor=BD}>
          <div style={{fontSize:15,fontWeight:700,color:TX,marginBottom:2}}>{s.label}</div>
          <div style={{fontSize:12,color:MU}}>{s.desc}</div>
        </button>
        {s.key==='freestyle'&&<div style={{marginTop:8,display:'flex',gap:8}}>
          <input value={freestyleDesc} onChange={e=>setFreestyleDesc(e.target.value)} placeholder="Describe your situation…" style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px',color:TX,fontSize:14,outline:'none'}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
          <PBtn label="Go" onClick={()=>freestyleDesc.trim()&&start({key:'freestyle'})} disabled={!freestyleDesc.trim()} full={false} small/>
        </div>}
      </div>)}
    </div>
  </div>

  if(phase==='loading')return<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}><Spinner size={28}/><span style={{fontSize:14,color:MU}}>Starting…</span></div>

  if(showEnd)return<div style={{padding:'20px',animation:'up 0.3s ease'}}>
    {loading?<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:40,gap:16}}><Spinner size={28}/><span style={{color:MU}}>Evaluating conversation…</span></div>:evalResult&&<>
      <div style={{fontSize:20,fontWeight:800,color:TX,marginBottom:16}}>Conversation evaluated</div>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:16,textAlign:'center'}}><div style={{fontSize:52,fontWeight:900,color:evalResult.overallScore>=75?GR:evalResult.overallScore>=50?YE:RE,lineHeight:1}}>{evalResult.overallScore}</div><div style={{fontSize:11,color:MU,fontWeight:600,marginTop:6}}>OVERALL SCORE</div></div>
      <div style={{fontSize:14,color:TX,lineHeight:1.7,marginBottom:16}}>{evalResult.feedback}</div>
      {evalResult.corrections?.length>0&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',marginBottom:16}}><div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:10}}>ALL CORRECTIONS</div>{evalResult.corrections.map((c,i)=><div key={i} style={{fontSize:13,color:GR,marginBottom:6}}>→ {c}</div>)}</div>}
      <PBtn label="New conversation" onClick={reset}/>
    </>}
  </div>

  return<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
    <div style={{padding:'10px 20px',borderBottom:`1px solid ${BD}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:13,color:MU}}>{history.filter(h=>h.role==='user').length} turns</span>
      <button onClick={end} style={{background:`${RE}22`,border:`1px solid ${RE}44`,borderRadius:10,padding:'8px 16px',color:RE,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT}}>End conversation</button>
    </div>
    <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
      {history.map((h,i)=><div key={i} style={{display:'flex',flexDirection:'column',alignItems:h.role==='user'?'flex-end':'flex-start'}}>
        <div style={{maxWidth:'82%',background:h.role==='user'?AC:S2,borderRadius:h.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'13px 18px'}}>
          <div style={{fontSize:15,color:h.role==='user'?'#fff':TX}}>{h.content}</div>
          {h.translation&&<div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}><div style={{fontSize:11,color:h.role==='user'?'rgba(255,255,255,0.65)':MU,fontStyle:'italic'}}>{h.translation}</div>{h.role==='bot'&&<SpeakBtn text={h.content} size={11}/>}</div>}
        </div>
        {h.correction&&<div style={{fontSize:12,color:YE,marginTop:4,paddingLeft:4}}>💡 {h.correction}</div>}
      </div>)}
      {loading&&<div style={{display:'flex',alignItems:'center',gap:8}}><Spinner size={14}/><span style={{fontSize:13,color:MU}}>typing…</span></div>}
    </div>
    <div style={{padding:'12px 20px 28px',borderTop:`1px solid ${BD}`,display:'flex',gap:10}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()} placeholder="respond in Portuguese…" style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'14px 16px',color:TX,fontSize:15,outline:'none'}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      <button onClick={send} disabled={!input.trim()||loading} onMouseDown={()=>SND.init()} style={{background:AC,color:'#fff',border:'none',borderRadius:13,padding:'14px 20px',fontSize:18,fontWeight:700,cursor:'pointer',opacity:input.trim()&&!loading?1:0.4,fontFamily:FONT}}>→</button>
    </div>
  </div>
}


function ShuffleMode({cards,onRateMultiple,isOnline=true}){
  const TODAY=new Date().toISOString().slice(0,10)
  const SKEY=`shuffle_${TODAY}`
  const[phase,setPhase]=useState('pick')
  const[difficulty,setDifficulty]=useState('medium')
  const[words,setWords]=useState([])
  const[ans,setAns]=useState('')
  const[ev,setEv]=useState(null)
  const[showCorrection,setShowCorrection]=useState(false)
  const[saved,setSaved]=useState(null)
  const[attempts,setAttempts]=useState(0)
  const[loading,setLoading]=useState(false)

  const eligible=cards.filter(c=>c.mastery>=1)
  const minWords={easy:3,medium:5,hard:7}
  const canPlay={easy:eligible.length>=3,medium:eligible.length>=5,hard:eligible.length>=7}

  useEffect(()=>{
    const stored=lsGet(SKEY)
    if(stored?.words?.length){
      const resolved=stored.words.map(id=>cards.find(c=>c.id===id)).filter(Boolean)
      if(resolved.length){setWords(resolved);setSaved(stored);setAttempts(stored.attempts||0);setPhase('challenge');return}
    }
  },[])

  const start=useCallback(async()=>{
    if(!isOnline)return
    setLoading(true)
    try{
      const w=await generateShuffleWords(cards,difficulty)
      const stored={words:w.map(c=>c.id),difficulty,attempts:0,bestScore:0,bestSentence:''}
      lsSave(SKEY,stored)
      setWords(w);setSaved(stored);setAttempts(0);setPhase('challenge')
    }catch(e){}
    setLoading(false)
  },[cards,difficulty,isOnline])

  const submit=useCallback(async()=>{
    if(!ans.trim()||!isOnline)return
    setPhase('evaluating')
    try{
      const res=await evalShuffle(words,ans,cards)
      const cardUpdates={}
      res.wordsUsed?.forEach(pt=>{const c=words.find(w=>normPT(w.portuguese)===normPT(pt));if(c)cardUpdates[c.id]=4})
      onRateMultiple(cardUpdates,'shuffle')
      SND.play(res.score>=100?'milestone':res.score>=50?'correct':'wrong')
      const newAttempts=attempts+1
      const stored=lsGet(SKEY)||{}
      const newStored={...stored,attempts:newAttempts,bestScore:Math.max(stored.bestScore||0,res.score),bestSentence:res.score>(stored.bestScore||0)?ans:stored.bestSentence}
      lsSave(SKEY,newStored);setSaved(newStored);setAttempts(newAttempts)
      setEv(res);setPhase('result');setTimeout(()=>setShowCorrection(true),1000)
    }catch(e){setPhase('challenge')}
  },[ans,words,cards,onRateMultiple,attempts,isOnline])

  if(!isOnline)return<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',padding:40,textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>✈️</div><div style={{fontSize:16,fontWeight:700,color:TX,marginBottom:8}}>Shuffle needs internet</div></div>

  if(loading)return<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}><Spinner size={28}/><span style={{fontSize:14,color:MU}}>Claude is picking your words…</span></div>

  if(phase==='pick')return<div style={{padding:'24px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:22,fontWeight:800,color:TX,marginBottom:6}}>Daily Shuffle</div>
    <div style={{fontSize:13,color:MU,lineHeight:1.7,marginBottom:24}}>Use all the words in one sentence. New challenge every day. Claude picks words that force creativity.</div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:10}}>DIFFICULTY</div>
      <div style={{display:'flex',gap:8}}>
        {[['easy','Fácil','3 words'],['medium','Médio','5 words'],['hard','Difícil','7 words']].map(([k,l,s])=><button key={k} onClick={()=>canPlay[k]&&setDifficulty(k)} style={{flex:1,padding:'12px 8px',background:difficulty===k?AC:S2,color:difficulty===k?'#fff':canPlay[k]?MU:BD,border:'none',borderRadius:12,cursor:canPlay[k]?'pointer':'not-allowed',fontFamily:FONT,opacity:canPlay[k]?1:0.4}} onMouseDown={()=>SND.init()}><div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{l}</div><div style={{fontSize:11}}>{s}</div></button>)}
      </div>
      {!canPlay[difficulty]&&<div style={{fontSize:12,color:YE,marginTop:8}}>Need {minWords[difficulty]} mastered cards for this difficulty.</div>}
    </div>
    <PBtn label="Generate today's challenge →" onClick={start} disabled={!canPlay[difficulty]}/>
  </div>

  if(phase==='challenge'||phase==='evaluating')return<div style={{padding:'20px',animation:'up 0.3s ease'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <div style={{fontSize:13,color:MU}}>Attempt {attempts+1}{saved?.bestScore>0?` · Best: ${saved.bestScore}pts`:''}</div>
      <button onClick={()=>setPhase('pick')} style={{fontSize:12,color:MU,background:'none',border:`1px solid ${BD}`,borderRadius:8,padding:'5px 10px',cursor:'pointer',fontFamily:FONT}}>New challenge</button>
    </div>
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:10}}>USE ALL THESE WORDS</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
        {words.map((w,i)=><div key={w.id} style={{background:S,border:`1px solid ${AC}55`,borderRadius:14,padding:'10px 16px',display:'flex',alignItems:'center',gap:6}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:TX}}>{w.portuguese}</div>
            <div style={{fontSize:11,color:MU}}>{w.english}</div>
          </div>
          <SpeakBtn text={w.portuguese}/>
        </div>)}
      </div>
    </div>
    <div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:8}}>YOUR SENTENCE</div>
    <textarea value={ans} onChange={e=>setAns(e.target.value)} placeholder="Write one sentence using all these words…" style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',color:TX,fontSize:16,resize:'none',outline:'none',minHeight:100,boxSizing:'border-box',marginBottom:12}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
    {phase==='evaluating'?<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:18}}><Spinner/><span style={{color:MU,fontSize:13}}>Evaluating…</span></div>:<PBtn label="Submit →" onClick={submit} disabled={!ans.trim()}/>}
  </div>

  if(phase==='result'&&ev)return<div style={{padding:'20px',animation:'up 0.3s ease'}}>
    <div style={{background:S,border:`1px solid ${BD}`,borderRadius:18,padding:'22px',marginBottom:14,textAlign:'center'}}>
      <div style={{fontSize:52,fontWeight:900,color:ev.score>=150?GR:ev.score>=80?YE:RE,lineHeight:1}}>{ev.score}</div>
      <div style={{fontSize:11,color:MU,fontWeight:600,marginTop:4}}>POINTS</div>
      {saved?.bestScore>=ev.score&&saved?.bestScore>0&&<div style={{fontSize:12,color:GD,marginTop:4,fontWeight:600}}>🏆 Best: {saved.bestScore}pts</div>}
    </div>
    <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:12}}>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:6}}>WORDS USED</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{words.map(w=>{const used=ev.wordsUsed?.some(u=>normPT(u)===normPT(w.portuguese));return<span key={w.id} style={{padding:'4px 10px',borderRadius:8,background:used?`${GR}22`:`${RE}18`,color:used?GR:RE,fontSize:12,fontWeight:600}}>{w.portuguese}</span>})}</div>
      </div>
      <div style={{fontSize:14,color:MU,fontStyle:'italic',marginBottom:showCorrection&&ev.correction?12:0}}>"{ev.feedback}"</div>
      {showCorrection&&ev.correction&&<div style={{animation:'fadeIn 0.4s ease'}}><div style={{height:1,background:BD,margin:'8px 0'}}/><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:11,color:GR,fontWeight:600}}>CARIOCA VERSION</div><SpeakBtn text={ev.correction} size={12}/></div><div style={{fontSize:14,color:GR,marginTop:4}}>{ev.correction}</div></div>}
    </div>
    <div style={{display:'flex',gap:10}}>
      <PBtn label="Try again" onClick={()=>{setAns('');setEv(null);setShowCorrection(false);setPhase('challenge')}}/>
      <GBtn label="New challenge" onClick={()=>setPhase('pick')}/>
    </div>
  </div>

  return null
}

function IWantToSay(){
  const[thought,setThought]=useState('')
  const[result,setResult]=useState(null)
  const[loading,setLoading]=useState(false)
  const[saved,setSaved]=useState(false)
  const go=async()=>{if(!thought.trim())return;setLoading(true);setResult(null);setSaved(false);const res=await iwantToSay(thought);setResult(res);setLoading(false)}
  const save=()=>{if(!result)return;const c=mk(`say-${Date.now()}`,result.portuguese,thought,'frase_pronta',{exampleSentence:result.portuguese});dbInsertCards([c]);setSaved(true)}
  return<div style={{padding:'28px 24px',animation:'up 0.3s ease'}}>
    <div style={{fontSize:22,fontWeight:800,color:TX,marginBottom:8}}>I want to say…</div>
    <div style={{fontSize:14,color:MU,marginBottom:24,lineHeight:1.6}}>Type a thought in English. Get the Carioca way to say it.</div>
    <textarea value={thought} onChange={e=>setThought(e.target.value)} placeholder="e.g. I'm starving, let's eat something" style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',color:TX,fontSize:16,resize:'none',outline:'none',minHeight:90,boxSizing:'border-box',marginBottom:12}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
    {loading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:20}}><Spinner/><span style={{color:MU}}>Thinking…</span></div>:<PBtn label="Translate →" onClick={go} disabled={!thought.trim()}/>}
    {result&&<div style={{marginTop:20,animation:'up 0.3s ease'}}>
      <div style={{background:S,border:`1px solid ${AC}44`,borderRadius:16,padding:'20px',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><div style={{fontSize:11,color:AC,fontWeight:600}}>CARIOCA WAY</div><SpeakBtn text={result.portuguese}/></div>
        <div style={{fontSize:24,fontWeight:700,color:TX,marginBottom:8}}>{result.portuguese}</div>
        {result.pronunciation&&<div style={{fontSize:13,color:MU,fontStyle:'italic',marginBottom:8}}>🔊 {result.pronunciation}</div>}
        {result.note&&<div style={{fontSize:13,color:MU,lineHeight:1.6}}>{result.note}</div>}
      </div>
      {saved?<div style={{fontSize:14,color:GR,textAlign:'center',padding:12}}>✓ Saved to your deck</div>:<GBtn label="Save as card" onClick={save}/>}
    </div>}
  </div>
}

function BestSentences({active}){
  const[sentences,setSentences]=useState([])
  const[loading,setLoading]=useState(false)
  const[initialized,setInitialized]=useState(false)
  useEffect(()=>{if(active&&!initialized){setLoading(true);dbLoadHoF().then(data=>{setSentences(data);setLoading(false);setInitialized(true)})}},[ active])
  if(loading)return<div style={{display:'flex',justifyContent:'center',paddingTop:60}}><Spinner/></div>
  return<div style={{padding:'20px 24px'}}>
    <div style={{fontSize:18,fontWeight:800,color:TX,marginBottom:6}}>Best sentences 🏆</div>
    <div style={{fontSize:13,color:MU,marginBottom:20}}>Sentences scoring 85+ naturalness.</div>
    {sentences.length===0?<div style={{fontSize:14,color:MU,textAlign:'center',paddingTop:40}}>No highlights yet — keep practising!</div>
    :sentences.map((s,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><Tag text={s.scenario||'general'} color={MU}/><span style={{fontSize:13,color:GR,fontWeight:700}}>{s.naturalness_score}</span></div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><div style={{fontSize:16,fontWeight:600,color:TX}}>{s.portuguese}</div><SpeakBtn text={s.portuguese}/></div>
      <div style={{fontSize:12,color:MU}}>{s.english_prompt}</div>
    </div>)}
  </div>
}


function useLongPress(cb,delay=500){
  const t=useRef(null)
  const start=e=>{e.preventDefault();t.current=setTimeout(cb,delay)}
  const stop=()=>clearTimeout(t.current)
  return{onMouseDown:start,onTouchStart:start,onMouseUp:stop,onTouchEnd:stop,onMouseLeave:stop}
}

function CardForm({card,onSave,onClose}){
  const[pt,setPt]=useState(card?.portuguese||'')
  const[en,setEn]=useState(card?.english||'')
  const[type,setType]=useState(card?.type||'vocab')
  const[ex,setEx]=useState(card?.exampleSentence||'')
  const[ct,setCt]=useState(card?.contrast||'')
  const submit=()=>{if(!pt.trim()||!en.trim())return;onSave({portuguese:pt.trim(),english:en.trim(),type,exampleSentence:ex.trim()||null,contrast:ct.trim()||null});onClose()}
  return<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,background:S,borderRadius:'20px 20px 0 0',padding:'24px 24px 40px',animation:'slideUp 0.25s ease'}}>
      <div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:20}}>{card?'Edit card':'Add card'}</div>
      {[{label:'Portuguese *',val:pt,set:setPt,ph:'e.g. bora'},{label:'English *',val:en,set:setEn,ph:'e.g. let\'s go'},{label:'Example sentence',val:ex,set:setEx,ph:'optional'},{label:'Formal equivalent',val:ct,set:setCt,ph:'optional'}].map(f=>(<div key={f.label} style={{marginBottom:14}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:6}}>{f.label.toUpperCase()}</div>
        <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{width:'100%',background:S2,border:`1px solid ${BD}`,borderRadius:10,padding:'12px',color:TX,fontSize:14,outline:'none',boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      </div>))}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:MU,fontWeight:600,marginBottom:6}}>TYPE</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{['giria','vocab','frase_pronta','grammar','sentence'].map(t=><button key={t} onClick={()=>setType(t)} style={{padding:'6px 12px',background:type===t?AC:S2,color:type===t?'#fff':MU,border:'none',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:FONT}}>{t}</button>)}</div>
      </div>
      <div style={{display:'flex',gap:10}}><GBtn label="Cancel" onClick={onClose}/><PBtn label="Save" onClick={submit} disabled={!pt.trim()||!en.trim()}/></div>
    </div>
  </div>
}

function ContextMenu({card,pos,onClose,onEdit,onPriority,onRemove}){
  return<div style={{position:'fixed',inset:0,zIndex:200}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:pos.y,left:Math.min(pos.x,window.innerWidth-200),background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'8px',minWidth:180,boxShadow:'0 8px 32px rgba(0,0,0,0.4)',animation:'up 0.15s ease'}}>
      <div style={{fontSize:12,color:MU,fontWeight:600,padding:'6px 12px',borderBottom:`1px solid ${BD}`,marginBottom:4}}>{card.portuguese}</div>
      {[{icon:'✏️',label:'Edit',action:onEdit},{icon:'⭐',label:card.priority?'Remove priority':'Mark priority',action:onPriority},{icon:'🗑️',label:'Remove card',action:onRemove,color:RE}].map(item=><button key={item.label} onClick={item.action} style={{display:'flex',alignItems:'center',gap:10,width:'100%',background:'none',border:'none',padding:'10px 12px',cursor:'pointer',fontSize:13,color:item.color||TX,fontFamily:FONT,borderRadius:8,textAlign:'left'}} onMouseEnter={e=>e.currentTarget.style.background=S2} onMouseLeave={e=>e.currentTarget.style.background='none'}><span>{item.icon}</span>{item.label}</button>)}
    </div>
  </div>
}

function Bank({cards,onUpdateCard,onAddCard,onDeleteCard,onDeleteCards,active,onImportNav,isOnline=true}){
  const[search,setSearch]=useState('')
  const[claudeResults,setClaudeResults]=useState(null)
  const[sort,setSort]=useState('overdue')
  const[typeFilter,setTypeFilter]=useState('all')
  const[practiceFilter,setPracticeFilter]=useState('all')
  const[expanded,setExpanded]=useState(null)
  const[searching,setSearching]=useState(false)
  const[showForm,setShowForm]=useState(false)
  const[editCard,setEditCard]=useState(null)
  const[contextMenu,setContextMenu]=useState(null)
  const[initialized,setInitialized]=useState(false)
  const searchTimer=useRef(null)

  const[dupePreview,setDupePreview]=useState(null)

  const findDupes=useCallback(()=>{
    const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()
    const groups={}
    cards.forEach(c=>{const k=norm(c.portuguese);if(!groups[k])groups[k]=[];groups[k].push(c)})
    const toRemove=[]
    Object.values(groups).forEach(g=>{
      if(g.length<2)return
      // Keep highest mastery, then most reps, then first by id
      const sorted=[...g].sort((a,b)=>(b.mastery-a.mastery)||(b.reps-a.reps))
      toRemove.push(...sorted.slice(1))
    })
    return toRemove
  },[cards])

  const runDedupe=useCallback(async()=>{
    const dupes=findDupes()
    if(!dupes.length){alert('No duplicates found!');return}
    setDupePreview(dupes)
  },[findDupes])

  const confirmDedupe=()=>{
    if(!dupePreview||!dupePreview.length)return
    const ids=dupePreview.map(c=>c.id)
    // Single batch update — one state write, one localStorage write
    onDeleteCards(ids)
    // Delete from Supabase — batch delete in one query
    if(sb&&navigator.onLine){
      sb.from('cards').delete().in('id',ids).eq('user_id',USER_ID).catch(()=>{})
    }
    setDupePreview(null)
  }

  const exportBackup=useCallback(()=>{
    const data=lsGet(LS_CARDS)||[]
    const json=JSON.stringify(data,null,2)
    const blob=new Blob([json],{type:'application/json'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a')
    a.href=url;a.download=`carioca-backup-${new Date().toISOString().slice(0,10)}.json`;a.click()
    URL.revokeObjectURL(url)
  },[])

  const daysUntil=c=>{const d=Math.round((new Date(c.nextReview||Date.now())-new Date())/86400000);return isNaN(d)?0:d}
  const reviewColor=c=>{const d=daysUntil(c);if(c.mastery>=5)return MU;if(d<0)return RE;if(d<=1)return YE;return GR}
  const reviewLabel=c=>{const d=daysUntil(c);if(c.mastery>=5)return'Mastered';if(d<0)return`${Math.abs(d)}d overdue`;if(d===0)return'Due today';return`In ${d}d`}

  const localFiltered=useMemo(()=>{
    let c=[...cards]
    if(typeFilter!=='all')c=c.filter(x=>x.type===typeFilter)
    if(practiceFilter==='never')c=c.filter(x=>x.sentenceCount===0)
    if(practiceFilter==='practiced')c=c.filter(x=>x.sentenceCount>0)
    if(practiceFilter==='priority')c=c.filter(x=>x.priority)
    if(search.trim()&&!claudeResults){const q=search.toLowerCase().trim();c=c.filter(x=>(x.portuguese||'').toLowerCase().includes(q)||(x.english||'').toLowerCase().includes(q))}
    return c
  },[cards,typeFilter,practiceFilter,search,claudeResults])

  const displayed=claudeResults||localFiltered
  const sorted=useMemo(()=>{const now=new Date();return[...displayed].sort((a,b)=>{if(sort==='overdue')return(new Date(a.nextReview||Date.now())-now)-(new Date(b.nextReview||Date.now())-now);if(sort==='weakest')return a.mastery-b.mastery;if(sort==='strongest')return b.mastery-a.mastery;if(sort==='never')return a.sentenceCount-b.sentenceCount;if(sort==='az')return a.portuguese.localeCompare(b.portuguese);return 0})},[displayed,sort])

  const handleSearch=useCallback(val=>{
    setSearch(val);setClaudeResults(null);clearTimeout(searchTimer.current)
    if(!val.trim())return
    searchTimer.current=setTimeout(async()=>{setSearching(true);const r=await claudeSearch(val,cards);if(r.length>0)setClaudeResults(r);setSearching(false)},700)
  },[cards])

  const overdue=cards.filter(c=>daysUntil(c)<0&&c.mastery>0&&c.mastery<5)

  const handleLongPress=(card,e)=>{
    const rect=e.currentTarget.getBoundingClientRect()
    setContextMenu({card,pos:{x:rect.left+20,y:rect.top-10}})
  }

  const handleAddCard=card=>{onAddCard(card)}
  const handleEditCard=updates=>{onUpdateCard({...editCard,...updates})}
  const handleTogglePriority=card=>{onUpdateCard({...card,priority:!card.priority,priorityStreak:0})}
  const handleDeleteCard=async card=>{if(window.confirm(`Remove "${card.portuguese||'this card'}" from your deck?`)){await dbDeleteCard(card.id);if(onDeleteCard)onDeleteCard(card.id)}}

  return<div style={{padding:'52px 0 100px',animation:'up 0.35s ease'}}>
    {showForm&&<CardForm onSave={handleAddCard} onClose={()=>setShowForm(false)}/>}
    {editCard&&<CardForm card={editCard} onSave={handleEditCard} onClose={()=>setEditCard(null)}/>}
    {contextMenu&&<ContextMenu card={contextMenu.card} pos={contextMenu.pos} onClose={()=>setContextMenu(null)} onEdit={()=>{setEditCard(contextMenu.card);setContextMenu(null)}} onPriority={()=>{handleTogglePriority(contextMenu.card);setContextMenu(null)}} onRemove={()=>{handleDeleteCard(contextMenu.card);setContextMenu(null)}}/>}
    <div style={{padding:'0 20px 14px',position:'relative'}}>
      <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Search in English or Portuguese…" style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'14px 44px 14px 16px',color:TX,fontSize:15,outline:'none',boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      <div style={{position:'absolute',right:34,top:'50%',transform:'translateY(-50%)'}}>{searching?<Spinner size={16}/>:<span style={{color:MU,fontSize:16}}>⌕</span>}</div>
    </div>
    {overdue.length>0&&!search&&<div style={{margin:'0 20px 14px',padding:'12px 16px',background:`${RE}15`,border:`1px solid ${RE}44`,borderRadius:14}}><div style={{fontSize:13,color:RE,fontWeight:700}}>{overdue.length} card{overdue.length!==1?'s':''} overdue</div><div style={{fontSize:11,color:MU,marginTop:2}}>{overdue.map(c=>c.portuguese).slice(0,3).join(', ')}{overdue.length>3?'…':''}</div></div>}
    {/* Dedupe preview modal */}
    {dupePreview&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={()=>setDupePreview(null)}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,background:S,borderRadius:'20px 20px 0 0',padding:'24px 24px 40px',animation:'slideUp 0.25s ease'}}>
        <div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:4}}>Remove {dupePreview.length} duplicate{dupePreview.length!==1?'s':''}</div>
        <div style={{fontSize:13,color:MU,marginBottom:16}}>Keeping the version with highest mastery for each.</div>
        <div style={{maxHeight:200,overflowY:'auto',marginBottom:20,display:'flex',flexDirection:'column',gap:6}}>
          {dupePreview.map(c=><div key={c.id} style={{background:S2,borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:14,fontWeight:600,color:TX}}>{c.portuguese}</div><div style={{fontSize:12,color:MU}}>{c.english}</div></div>
            <div style={{fontSize:11,color:MU}}>mastery {c.mastery}</div>
          </div>)}
        </div>
        <div style={{display:'flex',gap:10}}>
          <GBtn label="Cancel" onClick={()=>setDupePreview(null)}/>
          <PBtn label={`Remove ${dupePreview.length} dupes`} onClick={confirmDedupe} color={RE}/>
        </div>
      </div>
    </div>}

    <div style={{margin:'0 20px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:12,color:MU}}>{cards.length} cards total</span>
      <div style={{display:'flex',gap:8}}>
        <button onClick={runDedupe} style={{fontSize:11,color:YE,background:`${YE}15`,border:`1px solid ${YE}33`,borderRadius:8,padding:'5px 12px',cursor:'pointer',fontFamily:FONT}}>✦ Dedupe</button>
        <button onClick={exportBackup} style={{fontSize:11,color:MU,background:S2,border:`1px solid ${BD}`,borderRadius:8,padding:'5px 12px',cursor:'pointer',fontFamily:FONT}}>⬇ Backup</button>
      </div>
    </div>
    <div style={{padding:'0 20px 10px',display:'flex',gap:6,overflowX:'auto'}}>
      {[['overdue','Overdue'],['weakest','Weakest'],['strongest','Strongest'],['never','Never practiced'],['az','A–Z']].map(([k,l])=><button key={k} onClick={()=>setSort(k)} style={{background:sort===k?AC:S2,color:sort===k?'#fff':MU,border:'none',borderRadius:8,padding:'6px 12px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap'}}>{l}</button>)}
    </div>
    <div style={{padding:'0 20px 12px',display:'flex',gap:6,overflowX:'auto'}}>
      {['all','giria','vocab','frase_pronta','grammar','sentence'].map(t=><button key={t} onClick={()=>setTypeFilter(t)} style={{background:typeFilter===t?S:S2,color:typeFilter===t?TX:MU,border:`1px solid ${typeFilter===t?BD:'transparent'}`,borderRadius:8,padding:'5px 10px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap'}}>{t==='all'?'All':t}</button>)}
      {[['all','All practice'],['never','Never used'],['practiced','Practiced'],['priority','⭐ Priority']].map(([k,l])=><button key={k} onClick={()=>setPracticeFilter(k)} style={{background:practiceFilter===k?S:S2,color:practiceFilter===k?TX:MU,border:`1px solid ${practiceFilter===k?BD:'transparent'}`,borderRadius:8,padding:'5px 10px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:FONT,whiteSpace:'nowrap'}}>{l}</button>)}
    </div>
    <div style={{padding:'0 20px 10px'}}><span style={{fontSize:12,color:MU}}>{sorted.length} cards</span>{claudeResults&&<span style={{fontSize:12,color:AC,marginLeft:8}}>· Claude search</span>}</div>
    <div style={{padding:'0 20px'}}>
      {sorted.map(card=>(
        <div key={card.id}>
          <button onClick={()=>setExpanded(expanded===card.id?null:card.id)} style={{width:'100%',background:S,border:`1px solid ${card.priority?GD:BD}`,borderLeft:card.priority?`3px solid ${GD}`:undefined,borderRadius:14,padding:'14px 16px',marginBottom:6,textAlign:'left',cursor:'pointer',fontFamily:FONT}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:16,fontWeight:700,color:TX}}>{card.portuguese}</span>{card.priority&&<span style={{fontSize:12}}>⭐</span>}{card.mnemonic&&<span style={{fontSize:12,opacity:0.6}}>💡</span>}</div>
              <span style={{fontSize:11,color:reviewColor(card),fontWeight:600,whiteSpace:'nowrap',marginLeft:8}}>{reviewLabel(card)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:MU}}>{card.english}</span><MasteryDots mastery={card.mastery} size={7}/></div>
          </button>
          {expanded===card.id&&<div style={{background:S2,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',marginBottom:8,marginTop:-4,animation:'up 0.2s ease'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              {[{l:'Type',v:card.type},{l:'Mastery',v:`${card.mastery}/5`},{l:'Ease factor',v:(card.easeFactor||2.5).toFixed(2)},{l:'Interval',v:`${card.interval||0}d`},{l:'Reps',v:card.reps||0},{l:'Recognition',v:`${card.recognitionMastery||0}/5`},{l:'Production',v:`${card.productionMastery||0}/5`},{l:'Sentence uses',v:card.sentenceCount||0}].map(({l,v})=>(<div key={l} style={{background:S,borderRadius:8,padding:'10px'}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:3}}>{l.toUpperCase()}</div><div style={{fontSize:13,color:TX,fontWeight:600}}>{v}</div></div>))}
            </div>
            {card.contrast&&<div style={{background:S,borderRadius:8,padding:'10px',marginBottom:8}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:3}}>FORMAL EQUIVALENT</div><div style={{fontSize:13,color:MU,fontStyle:'italic'}}>{card.contrast}</div></div>}
            {card.exampleSentence&&<div style={{background:S,borderRadius:8,padding:'10px',marginBottom:8}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><div style={{fontSize:10,color:MU,fontWeight:600}}>EXAMPLE</div><SpeakBtn text={card.exampleSentence} size={11}/></div><div style={{fontSize:13,color:TX,fontStyle:'italic'}}>{card.exampleSentence}</div></div>}
            <MnemonicSection card={card}/>
            <div style={{background:S,borderRadius:8,padding:'10px',marginBottom:10}}><div style={{fontSize:10,color:MU,fontWeight:600,marginBottom:3}}>WHAT THIS MEANS</div><div style={{fontSize:12,color:MU,lineHeight:1.6}}>{card.mastery>=5?'Fully mastered.':card.priority?'Priority — reviewed every session, intervals at 33%.':card.mastery>=3&&card.sentenceCount===0?'Solid in flashcards but never used in a sentence. Phrase mode will target it.':card.mastery>=3?'Solid — flashcards and sentences.':card.mastery>=1?'Still learning.':'Not started yet.'}</div></div>
            <div style={{display:'flex',gap:8,paddingTop:8,borderTop:`1px solid ${BD}`}}>
              <button onClick={()=>setEditCard(card)} style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:10,padding:'10px',color:MU,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:FONT}}>✏️ Edit</button>
              <button onClick={()=>handleTogglePriority(card)} style={{flex:1,background:card.priority?`${GD}18`:S,border:`1px solid ${card.priority?GD:BD}`,borderRadius:10,padding:'10px',color:card.priority?GD:MU,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:FONT}}>{card.priority?'★ Priority':'☆ Priority'}</button>
              <button onClick={()=>handleDeleteCard(card)} style={{flex:1,background:`${RE}15`,border:`1px solid ${RE}33`,borderRadius:10,padding:'10px',color:RE,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:FONT}}>🗑 Remove</button>
            </div>
          </div>}
        </div>
      ))}
    </div>
    {/* Floating action buttons — anchored to viewport right edge, works on any width */}
    <div style={{position:'fixed',bottom:88,right:20,display:'flex',flexDirection:'column',gap:10,alignItems:'center',zIndex:90}}>
      <button onClick={onImportNav} onMouseDown={()=>SND.init()} style={{width:44,height:44,borderRadius:'50%',background:S,border:`1px solid ${BD}`,color:TX,fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.4)'}}>↑</button>
      <button onClick={()=>setShowForm(true)} onMouseDown={()=>SND.init()} style={{width:52,height:52,borderRadius:'50%',background:AC,color:'#fff',border:'none',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(79,142,247,0.5)'}}>+</button>
    </div>
  </div>
}

function MnemonicSection({card}){
  const[mnemonic,setMnemonic]=useState(card.mnemonic||null)
  const[loading,setLoading]=useState(false)
  const gen=async()=>{
    setLoading(true)
    const m=await generateMnemonic(card,mnemonic)
    if(m){setMnemonic(m);await dbUpdateCardMeta(card.id,{mnemonic:m})}
    setLoading(false)
  }
  const remove=async()=>{setMnemonic(null);await dbUpdateCardMeta(card.id,{mnemonic:null})}
  if(mnemonic)return<div style={{background:`${GD}15`,border:`1px solid ${GD}33`,borderRadius:8,padding:'10px',marginBottom:8}}>
    <div style={{fontSize:10,color:GD,fontWeight:600,marginBottom:4}}>MEMORY HOOK</div>
    <div style={{fontSize:13,color:TX,marginBottom:8}}>{mnemonic}</div>
    <div style={{display:'flex',gap:8}}><button onClick={gen} style={{fontSize:11,color:MU,background:S,border:`1px solid ${BD}`,borderRadius:7,padding:'4px 10px',cursor:'pointer',fontFamily:FONT}}>{loading?'…':'🔄 Refresh'}</button><button onClick={remove} style={{fontSize:11,color:RE,background:`${RE}18`,border:`1px solid ${RE}33`,borderRadius:7,padding:'4px 10px',cursor:'pointer',fontFamily:FONT}}>✕ Remove</button></div>
  </div>
  return<button onClick={gen} style={{fontSize:12,color:GD,background:`${GD}15`,border:`1px solid ${GD}33`,borderRadius:8,padding:'10px 14px',cursor:'pointer',fontFamily:FONT,width:'100%',marginBottom:8,textAlign:'left'}}>{loading?'Generating hook…':'💡 Generate memory hook'}</button>
}


function Import({cards,onImport,isOnline=true,active,onBack}){
  const[stage,setStage]=useState('idle')
  const[scaffoldSuggestions,setScaffoldSuggestions]=useState([])
  const[showScaffoldApproval,setShowScaffoldApproval]=useState(false)
  const[scaffoldDecisions,setScaffoldDecisions]=useState({})
  const[pasted,setPasted]=useState('')
  const[preview,setPreview]=useState([])
  const[visible,setVisible]=useState(0)
  const[history,setHistory]=useState([])
  const[statusMsg,setStatusMsg]=useState('')
  const[initialized,setInitialized]=useState(false)

  useEffect(()=>{if(active&&!initialized){dbLoadImportHistory().then(setHistory);setInitialized(true)}},[active])

  const run=useCallback(async()=>{
    if(!pasted.trim()||!isOnline)return
    setStage('parsing');setVisible(0)
    const chunks=splitByDays(pasted)
    const days=chunks.map(c=>c.day).filter(d=>d>0)
    setStatusMsg(days.length?`Found Day ${Math.min(...days)}–${Math.max(...days)}. Extracting new content…`:'Analysing notes…')
    try{const items=await extractFromText(pasted,cards);setPreview(items);setStage('preview');items.forEach((_,i)=>setTimeout(()=>setVisible(v=>v+1),i*80))}
    catch(e){setStage('idle')}
  },[pasted,cards,isOnline])

  const confirmImport=async()=>{
    await onImport(preview)
    // Next Gen: detect scaffolds from Victor's notes
    if(pasted&&preview.length){
      // Get scaffold suggestions — don't auto-add, show for approval
      fetch('/.netlify/functions/ng-import-scaffolds',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({notes:pasted,newCards:preview,previewOnly:true})
      }).then(r=>r.json()).then(result=>{
        if(result.suggestions?.length){
          setScaffoldSuggestions(result.suggestions)
          setShowScaffoldApproval(true)
        }
      }).catch(()=>{})
    }
    await dbLogImport(`Paste ${new Date().toLocaleDateString()}`,preview.length,cards.length)
    setHistory(await dbLoadImportHistory())
    setStage('done')
  }

  if(!isOnline)return<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'calc(100vh - 64px)',padding:40,textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>✈️</div><div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:8}}>Import needs internet</div><div style={{fontSize:14,color:MU}}>Save your paste for when you land.</div></div>

  return<div style={{padding:'52px 24px 100px',animation:'up 0.35s ease'}}>
    <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,marginBottom:16,padding:0}}>← Back to Bank</button>
    <div style={{marginBottom:28}}><div style={{fontSize:22,fontWeight:800,color:TX}}>Import Lesson</div><div style={{fontSize:13,color:MU,marginTop:2}}>{cards.length} cards in deck</div></div>
    {stage==='idle'&&<>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'14px 16px',marginBottom:14}}><div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:6}}>HOW TO USE</div><div style={{fontSize:13,color:MU,lineHeight:1.8}}>Open Google Doc → Select All (⌘A) → Copy (⌘C) → paste below. Claude skips review sections and only extracts what's genuinely new.</div></div>
      <textarea value={pasted} onChange={e=>setPasted(e.target.value)} placeholder="Paste your lesson notes here…" style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'16px',color:TX,fontSize:14,resize:'none',outline:'none',minHeight:200,boxSizing:'border-box',marginBottom:10,lineHeight:1.5}} onFocus={e=>e.target.style.borderColor=AC} onBlur={e=>e.target.style.borderColor=BD}/>
      {pasted.trim().length>0&&<div style={{fontSize:12,color:MU,marginBottom:12}}>~{pasted.trim().split(/\s+/).length} words{splitByDays(pasted).filter(c=>c.day>0).length>0&&` · Days ${splitByDays(pasted).filter(c=>c.day>0).map(c=>c.day).join(', ')}`}</div>}
      <PBtn label="Extract new cards →" onClick={run} disabled={!pasted.trim()}/>
      {history.length>0&&<div style={{marginTop:28}}><div style={{fontSize:11,color:MU,fontWeight:600,letterSpacing:1,marginBottom:12}}>IMPORT HISTORY</div>
        {history.map((h,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 16px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:13,color:TX,fontWeight:600}}>{h.filename||'Paste'}</div><div style={{fontSize:11,color:MU,marginTop:2}}>{new Date(h.created_at).toLocaleDateString()}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:13,color:GR,fontWeight:700}}>+{h.cards_added}</div><div style={{fontSize:11,color:MU}}>{h.cards_skipped} in deck</div></div>
        </div>)}
      </div>}
    </>}
    {stage==='parsing'&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:80,gap:16}}><Spinner size={28}/><span style={{fontSize:14,color:MU,textAlign:'center'}}>{statusMsg}</span></div>}
    {stage==='preview'&&<>
      <div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:16}}><div style={{fontSize:13,color:MU}}>{cards.length} existing cards compared</div><div style={{fontSize:28,fontWeight:800,color:preview.length>0?GR:MU,marginTop:4}}>{preview.length} new card{preview.length!==1?'s':''} found</div></div>
      {preview.length===0
        ?<div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:16,color:MU,marginBottom:8}}>Nothing new found</div><div style={{fontSize:13,color:MU,lineHeight:1.7,marginBottom:20}}>All content already in your deck, or only review sections detected.</div><GBtn label="Back" onClick={()=>setStage('idle')}/></div>
        :<><div style={{maxHeight:360,overflowY:'auto',marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>
          {preview.slice(0,visible).map((item,i)=><div key={i} style={{background:S,border:`1px solid ${BD}`,borderRadius:13,padding:'13px 18px',animation:'up 0.25s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div style={{fontSize:15,fontWeight:700,color:TX}}>{item.portuguese}</div>{item.sourceDay>0&&<span style={{fontSize:10,color:MU,fontWeight:600}}>Day {item.sourceDay}</span>}</div>
            <div style={{fontSize:13,color:MU,marginTop:2}}>{item.english||'—'}</div>
          </div>)}
        </div>
        {visible>=preview.length&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <GBtn label="Back" onClick={()=>{setStage('idle');setPasted('')}}/>
          <PBtn label={`Add ${preview.length} cards`} onClick={confirmImport}/>
        </div>}</>}
    </>}
    {stage==='done'&&<div style={{textAlign:'center',paddingTop:60,animation:'up 0.4s ease'}}>
        <div style={{fontSize:56,marginBottom:16,animation:'pop 0.5s ease'}}>🎉</div>
        <div style={{fontSize:24,fontWeight:800,color:TX,marginBottom:8}}>{preview.length} cards added</div>
        <div style={{fontSize:13,color:MU,marginBottom:28}}>Starting at zero — your performance takes it from here.</div>
        <PBtn label="Back to home" onClick={()=>setStage('idle')}/>
      </div>}
      {showScaffoldApproval&&<div style={{marginTop:20,padding:'0 4px',animation:'up 0.3s ease'}}>
        <div style={{fontSize:15,fontWeight:700,color:TX,marginBottom:4}}>New patterns detected</div>
        <div style={{fontSize:12,color:MU,marginBottom:12}}>Approve patterns to add to your scaffold bank. Nothing adds without your OK.</div>
        {scaffoldSuggestions.map((sc,i)=><div key={i} style={{background:S2,border:`1px solid ${BD}`,borderRadius:12,padding:'12px',marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:700,color:TX,marginBottom:1}}>{sc.base_portuguese}</div>
          <div style={{fontSize:11,color:MU,marginBottom:8}}>{sc.base_english||''}</div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setScaffoldDecisions(d=>({...d,[i]:true}))} style={{flex:1,padding:'7px',background:scaffoldDecisions[i]===true?`${GR}20`:S,border:`1px solid ${scaffoldDecisions[i]===true?GR+'33':BD}`,borderRadius:8,cursor:'pointer',fontFamily:FONT,fontSize:11,color:scaffoldDecisions[i]===true?GR:TX,fontWeight:600}}>{scaffoldDecisions[i]===true?'✓ Yes':'Approve'}</button>
            <button onClick={()=>setScaffoldDecisions(d=>({...d,[i]:false}))} style={{flex:1,padding:'7px',background:scaffoldDecisions[i]===false?`${RE}12`:S,border:`1px solid ${scaffoldDecisions[i]===false?RE+'33':BD}`,borderRadius:8,cursor:'pointer',fontFamily:FONT,fontSize:11,color:scaffoldDecisions[i]===false?RE:MU}}>{scaffoldDecisions[i]===false?'✗ No':'Reject'}</button>
          </div>
        </div>)}
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button onClick={async()=>{
            const approved=scaffoldSuggestions.filter((_,i)=>scaffoldDecisions[i]===true)
            if(approved.length)await fetch('/.netlify/functions/ng-import-scaffolds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({approvedScaffolds:approved})}).catch(()=>{})
            setShowScaffoldApproval(false)
          }} style={{flex:2,padding:'10px',background:AC,border:'none',borderRadius:10,color:'#fff',fontFamily:FONT,fontSize:12,fontWeight:700,cursor:'pointer'}}>Confirm</button>
          <button onClick={()=>setShowScaffoldApproval(false)} style={{flex:1,padding:'10px',background:S,border:`1px solid ${BD}`,borderRadius:10,color:MU,fontFamily:FONT,fontSize:12,cursor:'pointer'}}>Skip</button>
        </div>
      </div>}
  </div>
}




// ── VoiceMode ─────────────────────────────────────────────────────────────

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
function VoiceMode({cards,onRateMultiple,onAddCard,isOnline,ngMode=false}){
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
            const failed=lc.includes('quase')||lc.includes('errado')||lc.includes('não foi')||lc.includes('tente')||lc.includes('quase lá')
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
      {lunaSuggestion.duplicate&&<div onClick={()=>setLunaSuggestion(null)} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,cursor:'pointer'}}>Você já tem esse: <span style={{color:AC,fontWeight:700}}>{lunaSuggestion.existing?.base}</span> · toque pra fechar</div>}
      {lunaSuggestion.error&&<div onClick={()=>setLunaSuggestion(null)} style={{background:`${RE}10`,border:`1px solid ${RE}44`,borderRadius:14,padding:'12px 15px',fontSize:12,color:RE,cursor:'pointer'}}>{lunaSuggestion.error} · toque pra fechar</div>}
      {lunaSuggestion.sug&&<SuggestionCard sug={lunaSuggestion.sug} onDone={()=>setLunaSuggestion(null)}/>}
    </div>}
    {wordMenu&&<div style={{position:'fixed',inset:0,zIndex:200}} onClick={()=>setWordMenu(null)}>
      <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:wordMenu.y,left:Math.min(wordMenu.x,window.innerWidth-210),background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'8px',minWidth:200,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'up 0.15s ease'}}>
        <div style={{fontSize:15,fontWeight:700,color:YE,padding:'6px 12px',borderBottom:`1px solid ${BD}`,marginBottom:4}}>{wordMenu.word}</div>
        {wordMenu.translation&&<div style={{fontSize:12,color:MU,padding:'2px 12px 8px'}}>{wordMenu.translation}</div>}
        <button onClick={()=>addToDeck(wordMenu.word,wordMenu.translation,wordMenu.sentence)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',background:'none',border:'none',padding:'10px 12px',cursor:'pointer',fontSize:13,color:GR,fontFamily:FONT,borderRadius:8}}>{ngMode?'✦ Analisar padrão':'＋ Add to deck'}</button>
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
function NGFlashCards({isOnline,onBack,reviewItems=[],seed,clearSeed}){
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
        const data=await ngFetch('ng-tts',{text,voice:'nova'})
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

  const startDeck=(deck,category)=>{
    setActiveDeck(deck==='category'?category:deck)
    setDeckPhase('session')
    setIdx(0);setFlipped(false);setSessionEvents([]);setDone(false);setSummary({})
    gainsRef.current=[]
    loadFrontier(deck,category)
  }

  const loadFrontier=async(deck,category,unitId)=>{
    setLoading(true)
    try{
      const data=await ngFetch('ng-frontier',deck&&deck!=='focus'&&deck!=='due'?{deck,category,unit_id:unitId}:{})
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
            const r=await ngFetch('ng-tts',{text,voice:'nova'})
            if(r.audio)audioCache.current[text]=r.audio
          }catch{}
        })).catch(()=>{})
      }
    }catch(e){console.warn('Frontier load failed:',e)}
    setLoading(false)
  }

  const card=frontier[idx]

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
      {k:'fresh',i:'🔥',t:'Fresh',d:"Newest additions — today's lesson, latest imports"},
      {k:'mix',i:'🎲',t:'Mix',d:'A little of everything, across all categories'},
      {k:'weak',i:'🎯',t:'Weak spots',d:'What you struggle with — the data decides'},
      {k:'due',i:'◌',t:'Due'+(dueCount?` · ${dueCount}`:''),d:'Reviews at the forgetting edge'},
      {k:'focus',i:'◈',t:'Focus',d:'The classic frontier — highest priority 12'},
    ].map(dk=><button key={dk.k} onClick={()=>startDeck(dk.k)}
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
          <div><div style={{fontSize:24,fontWeight:900,color:GR,fontFamily:FONTD}}>+{Math.round(total*10)/10}d</div><div style={{fontSize:9,color:MU,letterSpacing:1}}>MEMÓRIA</div></div>
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
  const[mapView,setMapView]=useState('constellation') // constellation | grid
  const[memState,setMemState]=useState([])
  const[graphEdges,setGraphEdges]=useState([])
  const[constFetched,setConstFetched]=useState(false)
  const[scaffolds,setScaffolds]=useState([])
  const[controlled,setControlled]=useState(new Set())
  const[hybridEligible,setHybridEligible]=useState(new Set())
  const[loading,setLoading]=useState(true)
  const[selected,setSelected]=useState(null)
  const[starredScaffolds,setStarredScaffolds]=useState(new Set())
  const[pendingHybrids,setPendingHybrids]=useState([])
  const[showHybridPanel,setShowHybridPanel]=useState(false)
  const[unlockScaffold,setUnlockScaffold]=useState(null)
  useEffect(()=>{
    if(!isOnline)return
    ngFetch('ng-suggest',{action:'list'}).then(d=>setPendSugs(d.suggestions||[])).catch(()=>{})
  },[isOnline])

  useEffect(()=>{
    if(mapView!=='constellation'||memState.length)return
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
      setHybridEligible(new Set(frontierData.hybrid_eligible_ids||[]))
      // Load starred scaffolds from profile
      const boosts=profileData?.priority_boosts||{}
      setStarredScaffolds(new Set(Object.keys(boosts).filter(id=>boosts[id]>0)))
      setPendingHybrids(frontierData.pending_hybrids||[])
      if(scaffoldData?.length)setScaffolds(scaffoldData)
    }catch(e){console.warn('Map load:',e)}
    setLoading(false)
  }

  const categories={
    social_foundation:'Social',
    dating_register:'Dating',
    personality_humour:'Personality',
    deep_fluency:'Fluency'
  }

  const catColor={
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
    {showHybridPanel&&<HybridApprovalPanel
      pending={pendingHybrids}
      onClose={()=>setShowHybridPanel(false)}
      onApprove={async(approved)=>{
        setShowHybridPanel(false)
        for(const sc of approved){
          await ngFetch('ng-import-scaffolds',{approvedScaffolds:[{...sc,is_hybrid:true,can_hybridize:false}]}).catch(()=>{})
        }
        await ngFetch('ng-profile-update',{update:{pending_hybrids:[]}}).catch(()=>{})
        setPendingHybrids([])
        if(approved.length)setUnlockScaffold(approved[0])
      }}
      onReject={()=>{}}
    />}
    <div style={{padding:'0 20px 20px',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0}}>← Back</button>
      <div style={{flex:1}}>
        <div style={{fontSize:18,fontWeight:800,color:TX}}>Scaffold Map</div>
        <div style={{fontSize:12,color:MU,marginTop:2}}>{totalControlled} of {totalStages} stages controlled</div>
      </div>
      {pendingHybrids.length>0&&<button onClick={()=>setShowHybridPanel(true)}
        style={{position:'relative',background:`${YE}15`,border:`1px solid ${YE}44`,borderRadius:10,padding:'7px 12px',cursor:'pointer',fontFamily:FONT,display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
        <span style={{fontSize:13}}>◈</span>
        <span style={{fontSize:11,color:YE,fontWeight:700}}>{pendingHybrids.length} new</span>
        <div style={{position:'absolute',top:-4,right:-4,width:8,height:8,background:RE,borderRadius:'50%'}}/>
      </button>}
    </div>

    {/* View switch — Live constellation / classic grid */}
    <div style={{padding:'0 20px 14px',display:'flex',gap:8}}>
      {[['constellation','✦ Live map'],['grid','⊞ Grid']].map(([k,l])=>
        <button key={k} onClick={()=>setMapView(k)}
          style={{flex:1,padding:'10px',background:mapView===k?`${AC}18`:S2,border:`1px solid ${mapView===k?AC+'55':BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,fontSize:13,fontWeight:mapView===k?700:400,color:mapView===k?AC:MU}}>{l}</button>)}
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
              {hybridEligible.has(s.id)&&<div style={{position:'absolute',top:3,right:3,fontSize:7,color:color,opacity:0.8}}>◈</div>}
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




// ── NGMilestone — full screen moment ────────────────────────────────
function NGMilestone({milestone,onDismiss}){
  const configs={
    first_stage_acquired:{
      emoji:'🎯',
      title:'First one acquired.',
      sub:'You just locked in your first scaffold stage. It\'s in now.',
      color:AC
    },
    ten_stages_controlled:{
      emoji:'🔥',
      title:'10 stages controlled.',
      sub:'You have 10 patterns you can actually produce. That\'s not nothing.',
      color:GR
    },
    first_scaffold_complete:{
      emoji:'⚡',
      title:'First scaffold complete.',
      sub:`All 4 stages of "${milestone?.data?.base||'a scaffold'}" — from base to full Carioca extension. That's a real pattern, fully yours.`,
      color:YE
    },
    twenty_five_stages:{
      emoji:'💪',
      title:'25 stages controlled.',
      sub:'A quarter of Phase 1. You can feel the difference in conversation.',
      color:AC
    },
    phase_complete:{
      emoji:'🌊',
      title:'Phase complete.',
      sub:'You\'ve moved through an entire phase. Rio is starting to make sense.',
      color:GR
    }
  }

  const cfg=configs[milestone?.milestone_type]||{
    emoji:'✓',
    title:'Milestone reached.',
    sub:'Keep going.',
    color:AC
  }

  useEffect(()=>{
    // Auto dismiss after 8s
    const t=setTimeout(onDismiss,8000)
    return()=>clearTimeout(t)
  },[])

  return<div
    onClick={onDismiss}
    style={{position:'fixed',inset:0,zIndex:500,background:BG,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 32px',animation:'fadeIn 0.5s ease',textAlign:'center'}}
  >
    <div style={{fontSize:72,marginBottom:28,animation:'pop 0.6s ease'}}>{cfg.emoji}</div>
    <div style={{fontSize:28,fontWeight:800,color:TX,marginBottom:12,lineHeight:1.2}}>{cfg.title}</div>
    <div style={{fontSize:15,color:MU,lineHeight:1.7,maxWidth:280,marginBottom:40}}>{cfg.sub}</div>
    {milestone?.data?.pt&&<div style={{background:S,border:`1px solid ${cfg.color}44`,borderRadius:14,padding:'16px 20px',marginBottom:32}}>
      <div style={{fontSize:18,fontWeight:700,color:TX}}>{milestone.data.pt}</div>
      <div style={{fontSize:13,color:MU,marginTop:4}}>{milestone.data.en}</div>
    </div>}
    <div style={{fontSize:12,color:MU,opacity:0.5}}>Tap anywhere to continue</div>
  </div>
}




// ── NGShuffle ─────────────────────────────────────────────────────
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
          {addedToBank?'✓ Sugestão pronta — revisa abaixo ↓':'✦ Analisar como padrão'}
        </button>
        <button onClick={()=>{setInput(result.carioca||'');setResult(null)}} style={{padding:'12px 16px',background:S,border:`1px solid ${BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,fontSize:13,color:MU}}>
          Edit
        </button>
      </div>
      {saySug&&<div style={{marginBottom:16}}>
        {saySug.loading&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,display:'flex',gap:10,alignItems:'center'}}><Spinner size={14}/>Analisando onde entra na escada…</div>}
        {saySug.duplicate&&<div onClick={()=>{setSaySug(null);setAddedToBank(false)}} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,cursor:'pointer'}}>Você já tem esse: <span style={{color:AC,fontWeight:700}}>{saySug.existing?.base}</span> · toque pra fechar</div>}
        {saySug.error&&<div onClick={()=>{setSaySug(null);setAddedToBank(false)}} style={{background:`${RE}10`,border:`1px solid ${RE}44`,borderRadius:14,padding:'12px 15px',fontSize:12,color:RE,cursor:'pointer'}}>{saySug.error} · toque pra fechar</div>}
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
    <div style={{fontSize:12.5,color:MU,marginBottom:6}}>Do caderno do Victor — escadas montadas, tabelas e fonética ignoradas, itens "!" pulados.</div>
    {importProg?.skipped&&<div style={{fontSize:10.5,color:MU,opacity:0.7,marginBottom:16}}>
      Ignorado: {importProg.skipped.tables||0} tabelas · {importProg.skipped.phonics||0} fonética · {importProg.skipped.marked_solid||0} já sólidos (!) · {importProg.skipped.meta||0} meta
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

  const phaseColor={'social_foundation':'#ffd52e','dating_register':'#fb7185','personality_humour':'#2ee56f','deep_fluency':'#3d7bff'}
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
function HybridApprovalPanel({pending,onApprove,onReject,onClose}){
  const[decisions,setDecisions]=useState({})
  const allDecided=pending.length>0&&pending.every((_,i)=>decisions[i]!==undefined)

  return<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
    <div onClick={e=>e.stopPropagation()} style={{background:S,borderRadius:'20px 20px 0 0',padding:'16px 20px 40px',width:'100%',maxWidth:480,maxHeight:'80vh',overflowY:'auto',animation:'slideUp 0.3s ease'}}>
      <div style={{width:36,height:4,background:BD,borderRadius:2,margin:'0 auto 16px'}}/>
      <div style={{fontSize:18,fontWeight:800,color:TX,marginBottom:4}}>New hybrid patterns</div>
      <div style={{fontSize:12,color:MU,marginBottom:20}}>Forged from patterns you've mastered. Approve to add to your bank.</div>
      {pending.map((sc,i)=><div key={i} style={{background:S2,border:`1px solid ${BD}`,borderRadius:14,padding:'14px',marginBottom:10}}>
        <div style={{fontSize:13,color:YE,fontWeight:600,marginBottom:2}}>◈ Hybrid</div>
        <div style={{fontSize:16,fontWeight:800,color:TX,marginBottom:2}}>{sc.base_portuguese}</div>
        <div style={{fontSize:12,color:MU,marginBottom:6}}>{sc.base_english}</div>
        <div style={{fontSize:11,color:MU,marginBottom:4,fontStyle:'italic'}}>{sc.reason}</div>
        <div style={{fontSize:11,color:MU,marginBottom:10}}>From: {sc.parent_a_base} + {sc.parent_b_base}</div>
        {sc.stages?.slice(0,3).map((st,j)=><div key={j} style={{fontSize:11,color:MU,paddingLeft:8,borderLeft:`2px solid ${BD}`,marginBottom:3}}>
          Stage {st.stage}: {st.pt}
        </div>)}
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <button onClick={()=>setDecisions(d=>({...d,[i]:true}))}
            style={{flex:1,padding:'9px',background:decisions[i]===true?`${GR}20`:S,border:`1px solid ${decisions[i]===true?GR+'44':BD}`,borderRadius:10,cursor:'pointer',fontFamily:FONT,fontSize:12,color:decisions[i]===true?GR:TX,fontWeight:600}}>
            {decisions[i]===true?'✓ Add':'Add to bank'}
          </button>
          <button onClick={()=>setDecisions(d=>({...d,[i]:false}))}
            style={{flex:1,padding:'9px',background:decisions[i]===false?`${RE}12`:S,border:`1px solid ${decisions[i]===false?RE+'33':BD}`,borderRadius:10,cursor:'pointer',fontFamily:FONT,fontSize:12,color:decisions[i]===false?RE:MU}}>
            {decisions[i]===false?'✗ Skip':'Skip'}
          </button>
        </div>
      </div>)}
      {allDecided&&<button onClick={()=>{
        const approved=pending.filter((_,i)=>decisions[i]===true)
        const rejected=pending.filter((_,i)=>decisions[i]===false)
        onApprove(approved,rejected)
      }} style={{width:'100%',padding:'14px',background:AC,border:'none',borderRadius:12,color:'#fff',fontFamily:FONT,fontSize:14,fontWeight:700,cursor:'pointer',marginTop:4}}>
        Confirm
      </button>}
    </div>
  </div>
}


// ── Next Gen Constants ────────────────────────────────────────────
const NG_MODE_KEY='carioca_ng_mode' // 'original'|'nextgen'
const NG_ONBOARDED_KEY='carioca_ng_onboarded'

// ── Helpers ───────────────────────────────────────────────────────

// ═══ SFX — synthesized sound design, zero assets, app-wide ═══════════
// Toggle: localStorage 'sfx' = 'off' disables. Default on.
// Display font: Sora for titles & big numbers — runtime-injected,
// offline falls back to system gracefully.
try{
  if(typeof document!=='undefined'&&!document.getElementById('carioca-font')){
    const l=document.createElement('link')
    l.id='carioca-font';l.rel='stylesheet'
    l.href='https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap'
    document.head.appendChild(l)
  }
}catch(_){}
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
  return{
    tap:()=>{if(on())tone(700,0.05,'sine',0.06)},
    flip:()=>{if(on())tone(520,0.07,'triangle',0.09)},
    good:()=>{if(!on())return;tone(659,0.09,'sine',0.11);tone(880,0.13,'sine',0.11,0.08)},
    bad:()=>{if(on())tone(196,0.16,'sine',0.1)},
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
    complete:()=>{if(!on())return;SFX.acende();setTimeout(()=>{try{SFX.cuica()}catch(_){}},260)},
    unlock:()=>{if(!on())return;[784,988,1175,1568].forEach((f,i)=>tone(f,0.22,'sine',0.09,i*0.06))}
  }
})()

const ngFetch=async(fn,body={})=>{
  const r=await fetch(`/.netlify/functions/${fn}`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  })
  return r.json()
}

// ── ModeSelect ────────────────────────────────────────────────────
function ModeSelect({onSelect}){
  const[hover,setHover]=useState(null)
  return<div style={{minHeight:'100vh',background:BG,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px'}}>
    <div style={{marginBottom:40,textAlign:'center'}}>
      <div style={{fontSize:13,letterSpacing:4,color:MU,fontWeight:600,marginBottom:12,textTransform:'uppercase'}}>Carioca</div>
      <div style={{fontSize:28,fontWeight:800,color:TX,lineHeight:1.2}}>How do you want<br/>to learn today?</div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:16,width:'100%',maxWidth:360}}>

      {/* Original */}
      <button
        onClick={()=>onSelect('original')}
        onMouseEnter={()=>setHover('original')}
        onMouseLeave={()=>setHover(null)}
        style={{background:hover==='original'?S2:S,border:`1px solid ${hover==='original'?BD+'88':BD}`,borderRadius:20,padding:'24px 24px',cursor:'pointer',textAlign:'left',transition:'all 0.15s',WebkitTapHighlightColor:'transparent'}}
      >
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
          <div style={{fontSize:24}}>▣</div>
          <div style={{fontSize:17,fontWeight:700,color:TX}}>Original</div>
          <div style={{marginLeft:'auto',fontSize:11,color:MU,background:S2,border:`1px solid ${BD}`,borderRadius:20,padding:'3px 10px'}}>Stable</div>
        </div>
        <div style={{fontSize:13,color:MU,lineHeight:1.6}}>Flashcards, phrase practice, voice sessions. Your cards, your progress, all intact.</div>
      </button>

      {/* Next Gen */}
      <button
        onClick={()=>onSelect('nextgen')}
        onMouseEnter={()=>setHover('nextgen')}
        onMouseLeave={()=>setHover(null)}
        style={{background:hover==='nextgen'?`${AC}12`:`${AC}08`,border:`1px solid ${hover==='nextgen'?AC+'66':AC+'33'}`,borderRadius:20,padding:'24px 24px',cursor:'pointer',textAlign:'left',transition:'all 0.15s',WebkitTapHighlightColor:'transparent',position:'relative',overflow:'hidden'}}
      >
        <div style={{position:'absolute',top:0,right:0,width:120,height:120,background:`radial-gradient(circle at top right, ${AC}18, transparent)`,pointerEvents:'none'}}/>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
          <div style={{fontSize:24}}>◈</div>
          <div style={{fontSize:17,fontWeight:700,color:TX}}>Next Gen</div>
          <div style={{marginLeft:'auto',fontSize:11,color:AC,background:`${AC}18`,border:`1px solid ${AC}44`,borderRadius:20,padding:'3px 10px'}}>New</div>
        </div>
        <div style={{fontSize:13,color:MU,lineHeight:1.6,marginBottom:12}}>Scaffold-based engine. Learns what you know and pushes exactly one step beyond it. Evergreen.</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['i+1 frontier','Smart Luna','Full Rio coverage'].map(t=><span key={t} style={{fontSize:11,color:AC,background:`${AC}12`,borderRadius:20,padding:'3px 10px'}}>{t}</span>)}
        </div>
      </button>
    </div>

    <div style={{marginTop:28,fontSize:12,color:MU,textAlign:'center',lineHeight:1.6}}>
      Switch anytime from settings.<br/>Your data is shared between both modes.
    </div>
  </div>
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
      ✦ Sugestão · {sug.source} · {isExt?'estende padrão existente':`escada de ${stages.length}`}
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
            {s.pt}{i===p.tapped_stage&&<span style={{fontSize:8,color:GD,marginLeft:6,letterSpacing:1}}>VOCÊ FALOU</span>}
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

function NGLearn({isOnline,onBack,startUnit}){
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
      setCelebrate({emoji:u.emoji,title:`${u.title} — Nível ${r.new_level}`,sub:'NÍVEL DESBLOQUEADO'})
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
      opacity:u.status==='locked'?0.45:1,
      animation:u.status==='current'?'float 2.6s ease-in-out infinite':'none',
      boxShadow:u.status==='current'?`0 0 22px ${AC}55`:u.status==='complete'?`0 0 14px ${GR}33`:u.status==='in_progress'?`0 0 12px ${AC}33`:'none'
    }
  }

  return<div style={{padding:'52px 0 110px',animation:'up 0.35s ease',minHeight:'70vh'}}>
    <div style={{padding:'0 20px'}}>
      <div style={{fontSize:24,fontWeight:900,color:TX,marginBottom:2,fontFamily:FONTD}}>Learn</div>
      <div style={{fontSize:12,color:MU,marginBottom:8}}>A trilha — clustered by your knowledge graph, verified by your memory.</div>
    </div>

    {status==='loading'&&<div style={{textAlign:'center',padding:'60px 20px'}}><Spinner size={22}/></div>}

    {status==='building'&&<div style={{textAlign:'center',padding:'40px 24px'}}>
      <div style={{fontSize:40,marginBottom:12,animation:'float 2s ease-in-out infinite'}}>🏗️</div>
      <div style={{fontSize:15,fontWeight:800,color:TX,marginBottom:6}}>Building your trilha…</div>
      <div style={{fontSize:12,color:MU,lineHeight:1.7}}>Clustering your patterns into Rio situations,{buildChunk?` chunk ${(buildChunk.done||0)+1} in progress`:''}<br/>Keep this screen open — about a minute total.</div>
      <div style={{marginTop:16}}><Spinner size={18}/></div>
    </div>}

    {status==='empty'&&<div style={{textAlign:'center',padding:'50px 24px'}}>
      <div style={{fontSize:40,marginBottom:12,opacity:0.5}}>⛰</div>
      <div style={{fontSize:15,fontWeight:800,color:TX,marginBottom:6}}>Sem padrões, sem trilha. Lógico.</div>
      <div style={{fontSize:12,color:MU,lineHeight:1.7}}>Your content bank is empty. Import a lesson or add patterns via Say It, then come back — the path builds itself.</div>
    </div>}

    {status==='error'&&<div style={{margin:'20px',background:`${RE}0d`,border:`1px solid ${RE}33`,borderRadius:14,padding:'14px 16px'}}>
      <div style={{fontSize:13,fontWeight:700,color:RE,marginBottom:4}}>A trilha apagou a luz</div>
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
            <div style={{fontSize:11.5,fontWeight:700,color:u.status==='locked'?MU:TX,marginTop:7,lineHeight:1.3}}>{u.title}</div>
            <div style={{fontSize:9.5,color:u.status==='complete'?GR:u.pct>0?AC:MU,marginTop:1,fontWeight:600}}>
              {u.status==='complete'?'completa':u.pct>0?u.pct+'%':u.status==='current'?'← começa aqui':''}
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
          <PBtn label={sheet.status==='complete'?'↻ Revisar unidade':'▶ Praticar esta unidade'} onClick={()=>{SFX.tap();const u=sheet;setSheet(null);startUnit(u)}}/>
          {sheet.level_ready&&<div style={{marginTop:10}}>
            <PBtn label={`⬆ Evoluir para nível ${(sheet.level||1)+1}`} color={GR} onClick={()=>levelUp(sheet)}/>
            <div style={{fontSize:10,color:MU,textAlign:'center',marginTop:6}}>Claude forja 4-5 padrões mais difíceis desta situação, no momento — dos seus pontos fracos.</div>
          </div>}
          {!sheet.level_ready&&sheet.pct>=100&&sheet.level_wait_hours>0&&<div style={{marginTop:10,textAlign:'center',fontSize:11.5,color:GD,fontWeight:600}}>
            ⏳ Evolui em {Math.ceil(sheet.level_wait_hours/24)}d — deixa a memória assentar
          </div>}
          {(sheet.level||1)>1&&sheet.pct===0&&<div style={{marginTop:10}}>
            <GBtn label="↻ Refazer este nível (nada praticado ainda)" small onClick={()=>redoLevel(sheet)}/>
          </div>}
        </div>
        <div style={{fontSize:10,color:MU,opacity:0.65,textAlign:'center',marginTop:10}}>Progress = real memory strength. Fades if neglected — units can reopen.</div>
      </div>
    </div>}

    {/* Evolving — Claude forging the next level, live */}
    {evolving&&<div style={{position:'fixed',inset:0,background:'rgba(4,16,9,0.93)',zIndex:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:30}}>
      <div style={{animation:'float 2s ease-in-out infinite'}}><Poste size={48}/></div>
      <div style={{fontSize:16,fontWeight:800,color:TX,marginTop:18,fontFamily:FONTD}}>A trilha está evoluindo…</div>
      <div style={{fontSize:12,color:MU,marginTop:8,textAlign:'center',lineHeight:1.7}}>Claude está forjando os próximos padrões de<br/>"{evolving.title}" — nível {(evolving.level||1)+1}. ~10 segundos.</div>
      <div style={{marginTop:18}}><Spinner size={20}/></div>
    </div>}

    {/* Unit complete — celebration */}
    {celebrate&&<div onClick={()=>setCelebrate(null)} style={{position:'fixed',inset:0,background:'rgba(4,16,9,0.9)',zIndex:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:30}}>
      <Confetti/>
      <div style={{fontSize:74,animation:'popIn 0.6s cubic-bezier(0.34,1.56,0.64,1)'}}>{celebrate.emoji}</div>
      <div style={{fontSize:13,color:GD,fontWeight:700,letterSpacing:3,textTransform:'uppercase',marginTop:18,animation:'up 0.5s ease 0.2s both'}}>{celebrate.sub||'Unidade completa · every pattern memory-verified'}</div>
      <div style={{fontSize:26,fontWeight:900,color:'#fff',marginTop:6,textAlign:'center',animation:'up 0.5s ease 0.3s both'}}>{celebrate.title}</div>
      <div style={{fontSize:13,color:'#aab',marginTop:8,textAlign:'center',animation:'up 0.5s ease 0.4s both'}}>AI SIM! Registra no cartório! 🔥</div>
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
  const speedRef=useRef(1)
  const currentAudioRef=useRef(null)
  const followRef=useRef(true)
  const feedRef=useRef(null)
  const endRef=useRef(null)

  useEffect(()=>{followRef.current=follow},[follow])
  useEffect(()=>{if(follow)endRef.current?.scrollIntoView({behavior:'smooth'})},[currentLine,follow])
  useEffect(()=>()=>{stopRef.current=true;try{currentAudioRef.current?.pause()}catch{}},[])

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
    while(!stopRef.current){
      // Hold here while paused between lines
      while(pausedRef.current&&!stopRef.current){await new Promise(r=>setTimeout(r,200))}
      if(stopRef.current)break
      const next=audioQueueRef.current.shift()
      if(!next){
        playingRef.current=false
        maybeBuffer()
        if(!stopRef.current)setTimeout(()=>{if(audioQueueRef.current.length&&!stopRef.current)playQueue()},800)
        return
      }
      maybeBuffer() // stay ahead while consuming — this is what makes it infinite
      setCurrentLine(next.lineIdx)
      await new Promise(res=>{
        try{
          const a=new Audio('data:audio/mp3;base64,'+next.b64)
          a.playbackRate=speedRef.current
          currentAudioRef.current=a
          a.onended=res;a.onerror=res
          a.play().catch(res)
        }catch{res()}
      })
      currentAudioRef.current=null
      await new Promise(r=>setTimeout(r,300))
    }
    playingRef.current=false
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
    try{
      segIndexRef.current+=1
      const d=await ngFetch('ng-radio',{action:'next',session_key:sessionRef.current,segment_index:segIndexRef.current,station:stationPrompt})
      if(d.lines&&!stopRef.current){
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
    stopRef.current=false;pausedRef.current=false;setPaused(false)
    setPhase('tuning')
    setLines([]);setCurrentLine(-1);setFollow(true)
    audioQueueRef.current=[];segIndexRef.current=0
    localStorage.setItem('radio_station',stationPrompt)
    try{
      const d=await ngFetch('ng-radio',{action:'tune',station:stationPrompt})
      sessionRef.current=d.session_key
      setFrontierPatterns(Array.isArray(d.frontier_ref)?d.frontier_ref:[])
      setPhase('playing')
      ingestSegment(d,0)
      setTimeout(()=>maybeBuffer(),600)
    }catch{setPhase('off')}
  }

  const stop=()=>{
    stopRef.current=true
    try{currentAudioRef.current?.pause()}catch{}
    currentAudioRef.current=null
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
          <div style={{fontSize:11,color:MU}}>{phase==='playing'?(paused?'⏸ Pausado':'● AO VIVO — Chico & Bia'):phase==='tuning'?'Sintonizando…':'Toca aí'}</div>
        </div>
        {phase==='playing'&&<div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
          {!paused&&<div style={{display:'flex',gap:2.5,alignItems:'flex-end',height:16}}>
            {[0,1,2,3,4].map(i=><div key={i} style={{width:3,height:16,background:'#fbbf24',borderRadius:2,transformOrigin:'bottom',animation:`eq ${0.55+i*0.13}s ease-in-out ${i*0.09}s infinite`}}/>)}
          </div>}
          <div style={{background:'#3a2a10',border:'1px solid #fbbf2466',borderRadius:6,padding:'3px 9px',fontSize:9,fontWeight:800,letterSpacing:1.5,color:'#fbbf24'}}>{paused?'PAUSA':'ON AIR'}</div>
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
      {radioSug.loading&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,display:'flex',gap:10,alignItems:'center'}}><Spinner size={14}/>Analisando onde entra na escada…</div>}
      {radioSug.duplicate&&<div onClick={()=>setRadioSug(null)} style={{background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'12px 15px',fontSize:12,color:MU,cursor:'pointer'}}>Você já tem esse: <span style={{color:RADIO_A,fontWeight:700}}>{radioSug.existing?.base}</span> · toque pra fechar</div>}
      {radioSug.error&&<div onClick={()=>setRadioSug(null)} style={{background:`${RE}10`,border:`1px solid ${RE}44`,borderRadius:14,padding:'12px 15px',fontSize:12,color:RE,cursor:'pointer'}}>{radioSug.error} · toque pra fechar</div>}
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
          ▶ Voltar pro programa
        </button>
      </div>
    </div>}

    {/* Controls */}
    <div style={{padding:'10px 20px 28px',flexShrink:0,borderTop:`1px solid ${BD}`}}>
      {phase==='off'&&<>
        <input value={stationPrompt} onChange={e=>setStationPrompt(e.target.value)}
          placeholder="Station vibe (optional): trading, Ipanema nightlife…"
          style={{width:'100%',background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'11px 14px',color:TX,fontSize:13,outline:'none',fontFamily:FONT,marginBottom:10}}/>
        <PBtn label={isOnline?'📻 Tune in':'Needs connection'} onClick={tune} disabled={!isOnline}/>
      </>}
      {phase==='tuning'&&<PBtn label="Sintonizando…" disabled/>}
      {phase==='playing'&&<>
        <div style={{display:'flex',gap:6,marginBottom:10,alignItems:'center'}}>
          <span style={{fontSize:10,color:MU,flexShrink:0}}>Velocidade</span>
          {SPEEDS.map(v=><button key={v} onClick={()=>setSpeedLive(v)}
            style={{flex:1,padding:'7px 0',background:speed===v?`${RADIO_A}20`:S2,border:`1px solid ${speed===v?RADIO_A+'55':BD}`,borderRadius:9,cursor:'pointer',fontFamily:FONT,fontSize:11,fontWeight:speed===v?700:400,color:speed===v?RADIO_A:MU}}>
            {v===1?'1×':v+'×'}
          </button>)}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={togglePause}
            style={{flex:2,padding:'13px',background:paused?`${GR}18`:S2,border:`1px solid ${paused?GR+'55':BD}`,borderRadius:14,cursor:'pointer',fontFamily:FONT,fontSize:14,fontWeight:700,color:paused?GR:TX}}>
            {paused?'▶ Continuar':'⏸ Pausar'}
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
function NGPlacementChat({isOnline,onBack,onComplete}){
  const[messages,setMessages]=useState([])
  const[input,setInput]=useState('')
  const[loading,setLoading]=useState(false)
  const[phase,setPhase]=useState('chat') // chat|processing|done
  const[result,setResult]=useState(null)
  const endRef=useRef(null)
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages,loading])

  // Kick off — Luna opens
  useEffect(()=>{
    if(!isOnline||messages.length)return
    setLoading(true)
    ngFetch('ng-placement',{action:'chat',messages:[]}).then(d=>{
      setMessages([{role:'assistant',content:d.reply}])
      setLoading(false)
    }).catch(()=>setLoading(false))
  },[isOnline])

  const send=async()=>{
    const msg=input.trim()
    if(!msg||loading)return
    const updated=[...messages,{role:'user',content:msg}]
    setMessages(updated);setInput('');setLoading(true)
    try{
      const d=await ngFetch('ng-placement',{action:'chat',messages:updated})
      const withReply=[...updated,{role:'assistant',content:d.reply}]
      setMessages(withReply)
      if(d.done){
        setPhase('processing')
        const fin=await ngFetch('ng-placement',{action:'finalize',messages:withReply})
        setResult(fin)
        setPhase('done')
        if(onComplete)onComplete(fin)
      }
    }catch{}
    setLoading(false)
  }

  if(phase==='processing')return<div style={{padding:'100px 24px',textAlign:'center'}}>
    <Spinner size={26}/>
    <div style={{fontSize:15,fontWeight:700,color:TX,marginTop:18}}>Processando…</div>
    <div style={{fontSize:12,color:MU,marginTop:6}}>Mapping your Portuguese across 788 stages</div>
  </div>

  if(phase==='done')return<div style={{padding:'80px 24px',textAlign:'center',animation:'up 0.4s ease'}}>
    <div style={{fontSize:44,marginBottom:14}}>✦</div>
    <div style={{fontSize:22,fontWeight:900,color:TX,marginBottom:8}}>Placed.</div>
    <div style={{fontSize:14,color:AC,fontWeight:700,marginBottom:6}}>{result?.granted||0} stages marked known</div>
    <div style={{fontSize:12,color:MU,lineHeight:1.7,marginBottom:8}}>{result?.notes||''}</div>
    <div style={{fontSize:11,color:MU,opacity:0.7,marginBottom:24}}>Placement stages get validated by reviews over the next week — anything you can't actually produce slides back to the frontier. Self-correcting.</div>
    <PBtn label="Into the app →" onClick={onBack}/>
  </div>

  return<div style={{height:'100dvh',display:'flex',flexDirection:'column',animation:'up 0.35s ease'}}>
    <div style={{padding:'52px 20px 10px',flexShrink:0,borderBottom:`1px solid ${BD}`}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:MU,fontSize:13,cursor:'pointer',fontFamily:FONT,padding:0,marginBottom:8}}>← Later</button>
      <div style={{fontSize:18,fontWeight:800,color:TX}}>Placement</div>
      <div style={{fontSize:11,color:MU}}>~5 min chat with Luna. Skip the stuff you already know.</div>
    </div>
    <div style={{flex:1,overflowY:'auto',padding:'14px 20px'}}>
      {messages.map((m,i)=>{
        const isLuna=m.role==='assistant'
        return<div key={i} style={{display:'flex',flexDirection:'column',alignItems:isLuna?'flex-start':'flex-end',marginBottom:8}}>
          <div style={{maxWidth:'84%',padding:'11px 15px',borderRadius:isLuna?'16px 16px 16px 4px':'16px 16px 4px 16px',background:isLuna?S:AC,border:isLuna?`1px solid ${BD}`:'none',fontSize:14,lineHeight:1.6,color:isLuna?TX:'#16240f'}}>{m.content}</div>
        </div>
      })}
      {loading&&<div style={{padding:'6px 0'}}><Spinner size={14}/></div>}
      <div ref={endRef}/>
    </div>
    <div style={{padding:'10px 20px 28px',flexShrink:0,display:'flex',gap:8,borderTop:`1px solid ${BD}`}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}}
        placeholder="Responde aí…"
        style={{flex:1,background:S,border:`1px solid ${BD}`,borderRadius:12,padding:'12px 14px',color:TX,fontSize:14,outline:'none',fontFamily:FONT,minWidth:0}}/>
      <button onClick={send} disabled={!input.trim()||loading}
        style={{background:AC,color:'#fff',border:'none',borderRadius:12,padding:'12px 16px',fontSize:16,cursor:'pointer',opacity:input.trim()&&!loading?1:0.4,fontFamily:FONT,flexShrink:0}}>→</button>
    </div>
  </div>
}

// ── ConstellationView — memory graph rendered as living network ─────
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
  const catColor={social_foundation:'#ffd52e',dating_register:'#fb7185',personality_humour:'#2ee56f',deep_fluency:'#3d7bff'}

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
    // Three light parallel reads — no frontier list, no legacy recommendation
    ngFetch('ng-frontier').then(d=>{
      setPhase({n:d.phase||1,name:d.phase_name||'Survival → Social',
        controlled:d.total_controlled||0,due:d.review_count||0})
      setLoading(false)
    }).catch(()=>setLoading(false))
    ngFetch('ng-today',{action:'get'}).then(t=>{if(t?.coach_note)setCoachNote(t.coach_note)}).catch(()=>{})
    ngFetch('ng-path',{action:'get'}).then(d=>{
      const us=Array.isArray(d?.units)?d.units:[]
      setCurrentUnit(us.find(u=>u.status==='current'||u.status==='in_progress')||us[0]||null)
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
      <div style={{flex:1}}>
        <div style={{fontSize:26,fontWeight:900,color:TX,fontFamily:FONTD}}>E aí, Shay</div>
        <div style={{fontSize:12,color:MU,marginTop:2}}>Fase {phase.n} · {phase.name}</div>
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
        <div style={{fontSize:13,fontWeight:800,color:TX}}>Trilha</div>
        <div style={{fontSize:11,color:MU,marginTop:2}}>{currentUnit?`${currentUnit.title} · ${currentUnit.pct||0}%`:'Building…'}</div>
        {currentUnit&&<div style={{height:3,background:BD,borderRadius:3,overflow:'hidden',marginTop:8}}>
          <div style={{height:'100%',width:`${currentUnit.pct||0}%`,background:AC,borderRadius:3}}/>
        </div>}
      </div>
      <div onClick={()=>go&&go('ng-study')} style={{background:S,border:`1px solid ${phase.due?YE+'44':BD}`,borderRadius:16,padding:'14px',cursor:'pointer'}}>
        <div style={{fontSize:20,marginBottom:6}}>◌</div>
        <div style={{fontSize:13,fontWeight:800,color:TX}}>Reviews</div>
        <div style={{fontSize:11,color:phase.due?YE:MU,marginTop:2}}>{phase.due?`${phase.due} luzes piscando — Chico duvida de você`:'Nada vencendo. Até eu tô surpreso ✓'}</div>
      </div>
      <div onClick={()=>go&&go('ng-radio')} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'14px',cursor:'pointer'}}>
        <div style={{fontSize:20,marginBottom:6}}>📻</div>
        <div style={{fontSize:13,fontWeight:800,color:TX}}>Rádio Carioca</div>
        <div style={{fontSize:11,color:MU,marginTop:2}}>Chico & Bia · sempre no ar</div>
      </div>
      <div onClick={()=>go&&go('ng-voice')} style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'14px',cursor:'pointer'}}>
        <div style={{fontSize:20,marginBottom:6}}>◉</div>
        <div style={{fontSize:13,fontWeight:800,color:TX}}>Luna</div>
        <div style={{fontSize:11,color:MU,marginTop:2}}>Fala comigo, vai</div>
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
        setMessages([{role:'assistant',content:'Progress cleared. '+result.scaffolds_reset+' scaffolds reset. Refresh the app to start fresh.'}])
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
  const[cards,setCards]=useState([])
  const[streak,setStreak]=useState(0)
  const[lastDate,setLastDate]=useState(null)
  const[sentenceHistory,setSentenceHistory]=useState([])
  const[screen,setScreen]=useState('home')
  const[ngMode,setNgMode]=useState(()=>localStorage.getItem(NG_MODE_KEY)||null)
  const[ngScreen,setNgScreen]=useState('ng-home')
  const[showMore,setShowMore]=useState(false)
  const[studySeed,setStudySeed]=useState(null) // {deck:'unit',unit_id,title} from Learn
  const[loaded,setLoaded]=useState(false)
  const[isOnline,setIsOnline]=useState(navigator.onLine)

  // Always-on brain: heartbeat ping on load + every 5 min while app is open
  useEffect(()=>{
    if(ngMode!=='nextgen'||!isOnline)return
    ngFetch('ng-heartbeat',{}).catch(()=>{})
    const hb=setInterval(()=>{ngFetch('ng-heartbeat',{}).catch(()=>{})},5*60*1000)
    return()=>clearInterval(hb)
  },[ngMode,isOnline])

  useEffect(()=>{const s=document.createElement('style');s.textContent=CSS;document.head.appendChild(s);return()=>document.head.removeChild(s)},[])

  useEffect(()=>{
    const goOnline=()=>{setIsOnline(true);flushQueue()}
    const goOffline=()=>setIsOnline(false)
    window.addEventListener('online',goOnline)
    window.addEventListener('offline',goOffline)
    return()=>{window.removeEventListener('online',goOnline);window.removeEventListener('offline',goOffline)}
  },[])

  // Re-sync from Supabase when tab becomes visible
  useEffect(()=>{
    const onVisible=async()=>{
      if(document.visibilityState!=='visible'||!sb||!navigator.onLine)return
      try{
        const{data:sbCards}=await sb.from('cards').select('*').eq('user_id',USER_ID)
        if(!sbCards?.length)return
        const sbMapped=sbCards.map(fromRow)
        const localCards=lsGet(LS_CARDS)||[]
        const localIds=new Set(localCards.map(c=>c.id))
        const deletedIds=getDeletedIds() // never restore deliberately deleted cards
        // Only add cards from Supabase that: (a) aren't local yet, (b) weren't deleted here
        const newFromSb=sbMapped.filter(c=>!localIds.has(c.id)&&!deletedIds.has(c.id))
        if(newFromSb.length>0){
          const merged=[...localCards,...newFromSb]
          lsSave(LS_CARDS,merged)
          setCards(merged)
        }
        // Note: local SM-2 always wins — we never overwrite local card data with Supabase
      }catch(e){}
    }
    document.addEventListener('visibilitychange',onVisible)
    return()=>document.removeEventListener('visibilitychange',onVisible)
  },[])

  // Supabase realtime — push card updates from phone to laptop instantly
  useEffect(()=>{
    if(!sb)return
    const channel=sb.channel('cards-live')
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'cards',filter:`user_id=eq.${USER_ID}`},payload=>{
        const updated=fromRow(payload.new)
        setCards(prev=>{
          const next=prev.map(c=>{
            if(c.id!==updated.id)return c
            // Remote update only wins if mastery is higher (avoid overwriting fresh local work)
            return updated.mastery>=c.mastery?{...c,...updated}:c
          })
          lsSave(LS_CARDS,next)
          return next
        })
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'cards',filter:`user_id=eq.${USER_ID}`},payload=>{
        const newCard=fromRow(payload.new)
        setCards(prev=>{
          if(prev.find(c=>c.id===newCard.id))return prev
          if(getDeletedIds().has(newCard.id))return prev // never restore deleted cards
          const next=[...prev,newCard]
          lsSave(LS_CARDS,next)
          return next
        })
      })
      .subscribe()
    return()=>sb.removeChannel(channel)
  },[])

  useEffect(()=>{
    const load=async()=>{
      // 1. Load from localStorage immediately
      let localCards=lsGet(LS_CARDS)||[]
      const state=lsGet(LS_STATE)
      if(!localCards.length){lsSave(LS_CARDS,SEED);localCards=SEED;dbSeed()}
      setCards(localCards)
      setStreak(state?.streak_days||0)
      setLastDate(state?.last_session_date||null)
      setSentenceHistory(state?.sentence_history||[])
      setLoaded(true)
      // 2. Background Supabase sync — merge, never overwrite with fewer
      if(sb&&navigator.onLine){
        try{
          const{data:sbCards}=await sb.from('cards').select('*').eq('user_id',USER_ID)
          if(sbCards?.length){
            const sbMapped=sbCards.map(fromRow)
            const sbIds=new Set(sbMapped.map(c=>c.id))
            const localIds=new Set(localCards.map(c=>c.id))
            const deletedIds=getDeletedIds() // cards deliberately deleted on this device
            // Local wins for SM-2 state
            // Only add Supabase cards if: not in local AND not deliberately deleted
            const sbOnlyCards=sbMapped.filter(c=>!localIds.has(c.id)&&!deletedIds.has(c.id))
            const merged=[...localCards,...sbOnlyCards]
            if(merged.length>localCards.length){lsSave(LS_CARDS,merged);setCards(merged)}
            // Push local state to Supabase
            syncToSupabase(merged) // batched, safe for large decks
          }else{syncToSupabase(localCards)}
          const{data:stateRows}=await sb.from('user_state').select('*').eq('user_id',USER_ID).limit(1)
          if(stateRows?.[0])lsSave(LS_STATE,stateRows[0])
        }catch(e){console.warn('Sync failed:',e.message)}
      }
      flushQueue()
    }
    load()
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
    if(q===null)return // meta-only updates
    setCards(prev=>prev.map(c=>{
      if(c.id!==id)return c
      const u=sm2(c,q)
      const rm=mode==='study'?Math.max(c.recognitionMastery||0,u.mastery):c.recognitionMastery||0
      const pm=(mode==='sentence'||mode==='chat'||mode==='shuffle')?Math.max(c.productionMastery||0,u.mastery):c.productionMastery||0
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

  const onUpdateCard=useCallback(updatedCard=>{
    setCards(prev=>prev.map(c=>c.id===updatedCard.id?updatedCard:c))
    dbUpdateCard(updatedCard)
    // Also sync meta fields
    dbUpdateCardMeta(updatedCard.id,{mnemonic:updatedCard.mnemonic||null,priority:updatedCard.priority||false,priority_streak:updatedCard.priorityStreak||0})
  },[])

  const onAddCard=useCallback(async card=>{
    setCards(prev=>{const updated=[...prev,card];lsSave(LS_CARDS,updated);return updated})
    await dbInsertCards([card])
  },[])

  const onDeleteCard=useCallback(cardId=>{
    setCards(prev=>{const updated=prev.filter(c=>c.id!==cardId);lsSave(LS_CARDS,updated);return updated})
  },[])

  const onDeleteCards=useCallback(cardIds=>{
    addDeletedIds(cardIds)  // permanently exclude from Supabase merge
    const idSet=new Set(cardIds)
    setCards(prev=>{const updated=prev.filter(c=>!idSet.has(c.id));lsSave(LS_CARDS,updated);return updated})
  },[])

  const onImport=useCallback(async items=>{
    const newCards=items.map((it,i)=>mk(`imp-${Date.now()}-${i}`,it.portuguese,it.english||'—',it.type||'vocab',{cluster:it.cluster||null,contrast:it.contrast||null,exampleSentence:it.exampleSentence||null,sourceDay:it.sourceDay||0}))
    setCards(prev=>{const updated=[...prev,...newCards];lsSave(LS_CARDS,updated);return updated})
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
  },[streak,lastDate,loaded])

  // Mode not chosen yet — show full-screen mode select
  if(loaded&&!ngMode)return<ModeSelect onSelect={mode=>{
    localStorage.setItem(NG_MODE_KEY,mode)
    setNgMode(mode)
  }}/>

  // Next Gen mode — own screen stack
  if(loaded&&ngMode==='nextgen'){
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
      {ngScreen==='ng-voice'&&<VoiceMode cards={cards} onRateMultiple={onRateMultiple} onAddCard={onAddCard} isOnline={isOnline} active={true} ngMode={true}/>}
      {ngScreen==='ng-field-report'&&<NGFieldReport isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
      {ngScreen==='ng-study'&&<NGFlashCards isOnline={isOnline} onBack={()=>setNgScreen('ng-home')} seed={studySeed} clearSeed={()=>setStudySeed(null)}/>}
      {ngScreen==='ng-map'&&<NGScaffoldMap isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
      {ngScreen==='ng-shuffle'&&<NGShuffle isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
      {ngScreen==='ng-import'&&<NGImport isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
      {ngScreen==='ng-today'&&<NGToday isOnline={isOnline} onBack={()=>setNgScreen('ng-home')} goTo={setNgScreen}/>}
      {ngScreen==='ng-radio'&&<NGRadio isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
      {ngScreen==='ng-placement'&&<NGPlacementChat isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
      {ngScreen==='ng-brain'&&<NGBrain isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/>}
      {ngScreen==='ng-learn'&&<NGLearn isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}
        startUnit={u=>{setStudySeed({deck:'unit',unit_id:u.unit_id,title:u.title});setNgScreen('ng-study')}}/>}
      <div style={{display:ngScreen==='ng-say-it'?'block':'none'}}><NGSayIt isOnline={isOnline} onBack={()=>setNgScreen('ng-home')}/></div>
      </ErrorBoundary>
      {/* Next Gen Nav — 5 primary + More sheet */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:`${BG}f0`,backdropFilter:'blur(12px)',borderTop:`1px solid ${BD}`,display:'flex',justifyContent:'space-around',padding:'8px 0 24px',zIndex:100}}>
        {[{k:'ng-home',i:'◈',l:'Home'},{k:'ng-learn',i:'⛰',l:'Learn'},{k:'ng-today',i:'☀',l:'Today'},{k:'ng-voice',i:'◉',l:'Luna'},{k:'ng-study',i:'▣',l:'Study'}].map(t=>
          <button key={t.k} onClick={()=>{
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
            }} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 14px',WebkitTapHighlightColor:'transparent'}}>
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
            {k:'ng-radio',i:'📻',l:'Rádio',d:'Chico & Bia, live'},
            {k:'ng-phrase',i:'◇',l:'Phrase',d:'Scenario practice'},
            {k:'ng-shuffle',i:'◈',l:'Shuffle',d:'Combine patterns'},
            {k:'ng-say-it',i:'💬',l:'Say It',d:'Carioca translator'},
            {k:'ng-map',i:'⊞',l:'Map',d:'Scaffold progress'},
            {k:'ng-intelligence',i:'◎',l:'Intel',d:'Talk to Luna'},
            {k:'ng-import',i:'📥',l:'Import',d:"Victor's notes"},
            {k:'ng-field-report',i:'🌴',l:'Field Report',d:'Real-world log'},
            {k:'ng-placement',i:'✦',l:'Placement',d:'Map what you know'},
            {k:'ng-brain',i:'🧠',l:'The Brain',d:'Watch it think'},
            {k:'__sfx',i:'🔊',l:'Sound',d:'Tap to toggle effects'},
            {k:'__export',i:'⬇',l:'Backup',d:'Download your full journey as JSON'},
          ].map(t=><button key={t.k} onClick={()=>{setNgScreen(t.k);setShowMore(false)}} style={{background:ngScreen===t.k?`${AC}12`:S2,border:`1px solid ${ngScreen===t.k?AC+'33':BD}`,borderRadius:14,padding:'14px',cursor:'pointer',fontFamily:FONT,textAlign:'left',WebkitTapHighlightColor:'transparent'}}>
            <div style={{fontSize:22,marginBottom:4}}>{t.i}</div>
            <div style={{fontSize:13,fontWeight:700,color:ngScreen===t.k?AC:TX}}>{t.l}</div>
            <div style={{fontSize:11,color:MU}}>{t.d}</div>
          </button>)}
        </div>
        <button onClick={()=>{localStorage.setItem(NG_MODE_KEY,'original');setNgMode('original');setShowMore(false)}} style={{width:'100%',marginTop:10,padding:'12px',background:'none',border:`1px solid ${BD}`,borderRadius:12,cursor:'pointer',fontFamily:FONT,fontSize:13,color:MU}}>
          ⊙ Switch to Classic mode
        </button>
      </div></>
}
    </div>
  }

  if(!loaded)return<div style={{background:BG,height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,fontFamily:FONT}}><Spinner size={28}/><span style={{color:MU,fontSize:14}}>Loading…</span></div>

  const due=cards.filter(c=>new Date(c.nextReview)<=new Date()&&c.mastery>0).length
  const mastered=cards.filter(c=>c.mastery>=5).length
  const tier=getTier(mastered)

  return<div style={{background:BG,minHeight:'100vh',maxWidth:480,margin:'0 auto',fontFamily:FONT,color:TX,display:'flex',flexDirection:'column'}}>
    {!isOnline&&<div style={{background:`${YE}22`,borderBottom:`1px solid ${YE}44`,padding:'8px 20px',display:'flex',alignItems:'center',gap:8,position:'sticky',top:0,zIndex:150}}>
      <span style={{fontSize:13}}>✈️</span><span style={{fontSize:12,color:YE,fontWeight:600}}>Offline — Study works fully. Claude features need connection.</span>
    </div>}
    {/* Mount all screens — state preserved across navigation */}
    <div style={{flex:1,overflowY:'auto',paddingBottom:64}}>
      <div style={{display:screen==='home'?'block':'none'}}><Home cards={cards} streak={streak} lastDate={lastDate} tier={tier} go={setScreen}/></div>
      <div style={{display:screen==='study'?'block':'none'}}><Study cards={cards} onRate={onRate} active={screen==='study'}/></div>
      <div style={{display:screen==='phrase'?'block':'none'}}><ErrorBoundary><Phrase cards={cards} onRateMultiple={onRateMultiple} sentenceHistory={sentenceHistory} onSaveSentence={onSaveSentence} isOnline={isOnline} active={screen==='phrase'}/></ErrorBoundary></div>
      <div style={{display:screen==='bank'?'block':'none'}}><ErrorBoundary><Bank cards={cards} onUpdateCard={onUpdateCard} onAddCard={onAddCard} onDeleteCard={onDeleteCard} onDeleteCards={onDeleteCards} active={screen==='bank'} onImportNav={()=>setScreen('import')} isOnline={isOnline}/></ErrorBoundary></div>
      <div style={{display:screen==='voice'?'block':'none'}}><ErrorBoundary><VoiceMode cards={cards} onRateMultiple={onRateMultiple} onAddCard={onAddCard} isOnline={isOnline} active={screen==='voice'}/></ErrorBoundary></div>
      <div style={{display:screen==='import'?'block':'none'}}><Import cards={cards} onImport={onImport} isOnline={isOnline} active={screen==='import'} onBack={()=>setScreen('bank')}/></div>
    </div>
    <Nav screen={screen} go={setScreen} due={due} onSwitchNG={()=>{localStorage.setItem(NG_MODE_KEY,'nextgen');setNgMode('nextgen')}}/>
  </div>
}
