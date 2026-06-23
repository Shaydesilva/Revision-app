import React,{useState,useEffect,useRef,useCallback,useMemo} from 'react'
import{createClient}from'@supabase/supabase-js'

const USER_ID='00000000-0000-0000-0000-000000000001'
const BG='#07070f',S='#0d0d1a',S2='#131324',BD='#1a1a32',AC='#4f8ef7',TX='#eeeef5',MU='#55557a',GR='#34d399',RE='#f87171',YE='#fbbf24',GD='#f59e0b'
const FONT="-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif"
const TIERS=[{name:'Turista',min:0},{name:'Comunicador',min:15},{name:'Carioca',min:35},{name:'Carioca Honorario',min:60}]
const getTier=n=>TIERS.reduce((a,t)=>n>=t.min?t:a,TIERS[0])
const CSS=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}body{background:${BG};overscroll-behavior:none;font-family:${FONT}}textarea,input{-webkit-user-select:text;user-select:text;font-family:${FONT}}@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`


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
function PBtn({label,onClick,disabled,full=true,small,color}){const bg=color||(disabled?S2:AC);return<button onClick={disabled?null:onClick} onMouseDown={e=>{SND.init();if(!disabled)e.currentTarget.style.opacity='0.8'}} onMouseUp={e=>e.currentTarget.style.opacity='1'} style={{width:full?'100%':undefined,background:bg,color:disabled?MU:'#fff',border:'none',borderRadius:13,padding:small?'10px 18px':'15px 24px',fontSize:small?13:15,fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,fontFamily:FONT}}>{label}</button>}
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

function Nav({screen,go,due}){
  const tabs=[{k:'home',i:'⊙',l:'Home'},{k:'study',i:'▣',l:'Study',b:due},{k:'phrase',i:'◈',l:'Phrase'},{k:'voice',i:'◉',l:'Voice'},{k:'bank',i:'☰',l:'Bank'}]
  return<div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:`${S}f0`,borderTop:`1px solid ${BD}`,display:'flex',padding:'8px 0 22px',backdropFilter:'blur(16px)',zIndex:100}}>
    {tabs.map(t=><button key={t.k} onClick={()=>go(t.k)} style={{flex:1,background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'4px 0',position:'relative',fontFamily:FONT}} onMouseDown={()=>SND.init()}>
      <span style={{fontSize:20,opacity:screen===t.k?1:0.3,filter:screen===t.k?`drop-shadow(0 0 8px ${AC})`:'none'}}>{t.i}</span>
      <span style={{fontSize:10,color:screen===t.k?AC:MU,fontWeight:screen===t.k?700:400}}>{t.l}</span>
      {t.b>0&&<div style={{position:'absolute',top:2,right:'15%',width:7,height:7,background:RE,borderRadius:'50%'}}/>}
    </button>)}
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
      if(!ans.trim()){doFlip(()=>{setFlipped(true);setPhase('back')});return}
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
        if(remaining===0){SND.play('milestone');setDone(true);return}
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
    {stage==='done'&&<div style={{textAlign:'center',paddingTop:60,animation:'up 0.4s ease'}}><div style={{fontSize:56,marginBottom:16,animation:'pop 0.5s ease'}}>🎉</div><div style={{fontSize:24,fontWeight:800,color:TX,marginBottom:8}}>{preview.length} cards added</div><div style={{fontSize:13,color:MU,marginBottom:28}}>Starting at zero — your performance takes it from here.</div><PBtn label="Back to home" onClick={()=>setStage('idle')}/></div>}
  </div>
}




// ── VoiceMode ─────────────────────────────────────────────────────────────

const PT_RE_V=/[ãõâêîôûçáéíóúàü]/i
const PT_SET_V=new Set(['tá','né','tô','cê','cara','gente','assim','então','tipo','nossa','oi','tchau','obrigado','obrigada','legal','saudade','praia','poxa','beleza','valeu','falou','não','sim','muito','mais','uma','isso','bom','boa','bem','tudo','você','mas','cadê','também','porque','pô','bora','mano','irmão','aqui','ali','lá','fome','sede','calor','frio'])
function isPtWord(w){const c=(w||'').toLowerCase().replace(/[.,!?;:'"()—\-]/g,'');return!!c&&(PT_RE_V.test(c)||PT_SET_V.has(c))}
const GOODBYE_V=['bye','tchau','até mais','gotta go','see you','boa noite','falou','goodbye','ciao']

function VoiceBubble({msg,cardMap,translateWord,onWordPress}){
  const[showTl,setShowTl]=useState(false)
  const[tl,setTl]=useState(null)
  const[loading,setLoading]=useState(false)
  const isLuna=msg.role==='luna'
  const tap=async()=>{
    if(showTl){setShowTl(false);return}
    setShowTl(true)
    if(!tl){setLoading(true);const r=await translateWord(msg.text);setTl(r?.translation||'—');setLoading(false)}
  }
  const words=txt=>txt.split(/(\s+)/).map((tok,i)=>{
    if(/^\s+$/.test(tok))return<span key={i}> </span>
    const clean=tok.replace(/^["""'(]+/g,'').replace(/[.,!?;:"""')—\-]+$/g,'')
    const pt=!!clean&&isPtWord(clean)
    return<span key={i}
      onClick={pt?async e=>{e.stopPropagation();const r=await translateWord(clean);const rc=e.target.getBoundingClientRect();onWordPress(clean,r?.translation||'',msg.text,rc.left,Math.max(rc.top-80,60))}:undefined}
      style={{color:pt?YE:TX,fontWeight:pt?600:400,background:pt?`${YE}15`:'transparent',borderRadius:pt?4:0,padding:pt?'0 2px':0,cursor:pt?'pointer':'default',display:'inline'}}
    >{tok}</span>
  })
  return<div style={{display:'flex',flexDirection:'column',alignItems:isLuna?'flex-start':'flex-end',marginBottom:4}}>
    <div onClick={tap} style={{maxWidth:'85%',padding:'12px 16px',borderRadius:isLuna?'18px 18px 18px 4px':'18px 18px 4px 18px',background:isLuna?S:AC,border:isLuna?`1px solid ${BD}`:'none',fontSize:15,lineHeight:1.6,color:isLuna?TX:'#fff',cursor:'pointer'}}>
      {isLuna?words(msg.text):msg.text}
    </div>
    {showTl&&<div style={{maxWidth:'85%',marginTop:4,padding:'8px 12px',background:S2,border:`1px solid ${BD}`,borderRadius:10,fontSize:13,color:MU,animation:'fadeIn 0.2s ease'}}>{loading?<Spinner size={12}/>:tl}</div>}
    <div style={{fontSize:10,color:MU,marginTop:2,opacity:0.4}}>{isLuna?'tap to translate':'tap for Portuguese'}</div>
  </div>
}

function VoiceMode({cards,onRateMultiple,onAddCard,isOnline}){
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
  const[summary,setSummary]=useState(null)
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
  const pcRef=useRef(null)
  const dcRef=useRef(null)
  const streamRef=useRef(null)
  const audioRef=useRef(null)
  const timerRef=useRef(null)
  const reinRef=useRef(null)
  const transcriptRef=useRef([])
  const lunaLiveRef=useRef('')
  const shouldEndRef=useRef(false)
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
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null}
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
    try{
      const res=await fetch('/.netlify/functions/luna-session-end',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transcript:tr,duration_seconds:dur})})
      const result=await res.json()
      if(result.cardUpdates&&Object.keys(result.cardUpdates).length)onRateMultiple(result.cardUpdates,'voice')
      setSummary(result)
    }catch{
      setSummary({summary:'Session complete.',score:0,boostWords:[],struggleWords:[],newCardsAdded:[]})
    }
    phaseRef.current='done';setPhase('done')
  },[cleanup,onRateMultiple])

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
          setMessages(prev=>[...prev,{role:'luna',text,id:Date.now()}])
        }
        setDotMode('listen')
        setStatus(pttRef.current?'Hold to talk':'Listening…')
        break
      }

      case 'response.done':
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

      case 'conversation.item.input_audio_transcription.completed':{
        // User spoke — show in chat
        const text=(ev.transcript||'').trim()
        if(!text)break
        transcriptRef.current.push({role:'user',text})
        setMessages(prev=>[...prev,{role:'user',text,id:Date.now()}])
        if(GOODBYE_V.some(g=>text.toLowerCase().includes(g)))shouldEndRef.current=true
        break
      }

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
            }
          }
        }
        break

      case 'session.updated':
        log('Session updated — transcription: '+JSON.stringify(ev.session?.input_audio_transcription))
        break

      case 'input_audio_buffer.speech_started':
        setDotMode('listen');setStatus('Listening…')
        break
      case 'input_audio_buffer.speech_stopped':
        setDotMode('');setStatus('Thinking…')
        break
    }
  }

  // ── Connect ────────────────────────────────────────────────────────────
  const connect=useCallback(async()=>{
    if(!isOnline||phaseRef.current!=='idle')return
    phaseRef.current='connecting'
    setPhase('connecting');setStatus('Connecting…')
    setMessages([]);setLiveText('')
    transcriptRef.current=[];lunaLiveRef.current='';shouldEndRef.current=false
    SND.init()
    try{
      log('Requesting session token…')
      const res=await fetch('/.netlify/functions/luna-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({spectrum:spectrumRef.current,speed:speedRef.current})})
      const data=await res.json()
      if(!res.ok)throw new Error(data.error||`Server ${res.status}`)
      const token=data.value
      const model=data.model||'gpt-realtime-mini'
      log(`Token: ${token?'OK':'MISSING'} | Model: ${model}`)
      if(!token)throw new Error('No token — check OPENAI_API_KEY in Netlify env vars')
      if(data.cardMap)setCardMap(prev=>({...prev,...data.cardMap}))

      log('Getting microphone…')
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})
      streamRef.current=stream
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
        phaseRef.current='live';setPhase('live')
        setDotMode('listen');setStatus(pttRef.current?'Hold to talk':'Listening…')
        startTimeRef.current=Date.now()
        timerRef.current=setInterval(()=>setElapsed(Math.floor((Date.now()-startTimeRef.current)/1000)),1000)
        if(pttRef.current)stream.getAudioTracks().forEach(t=>{t.enabled=false})
        // Enable user speech transcription
        // whisper-1 is what the original Luna used successfully
        const suMsg={type:'session.update',session:{modalities:['text','audio'],input_audio_transcription:{model:'whisper-1'}}}
        dc.send(JSON.stringify(suMsg))
        log('Sent session.update: '+JSON.stringify(suMsg.session))
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
  const pttOn=e=>{e.preventDefault();if(streamRef.current)streamRef.current.getAudioTracks().forEach(t=>{t.enabled=true})}
  const pttOff=e=>{e.preventDefault();if(streamRef.current)streamRef.current.getAudioTracks().forEach(t=>{t.enabled=false})}
  const togglePtt=()=>{const n=!pttRef.current;setPtt(n);if(streamRef.current)streamRef.current.getAudioTracks().forEach(t=>{t.enabled=!n})}

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
    if(GOODBYE_V.some(g=>msg.toLowerCase().includes(g)))shouldEndRef.current=true
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
    await onAddCard(mk(`voice-${Date.now()}`,word||'',translation||'','vocab',{exampleSentence:sentence||null}))
    setWordMenu(null)
  },[onAddCard])

  // ── Done screen ────────────────────────────────────────────────────────
  if(phase==='done'&&summary)return<div style={{padding:'40px 24px 100px',animation:'up 0.4s ease'}}>
    <div style={{fontSize:52,textAlign:'center',marginBottom:16}}>{(summary.score||0)>=75?'🔥':(summary.score||0)>=50?'💪':'📚'}</div>
    <div style={{fontSize:24,fontWeight:800,color:TX,textAlign:'center',marginBottom:4}}>Session done</div>
    <div style={{fontSize:13,color:MU,textAlign:'center',marginBottom:24}}>{fmtTime(elapsed)}</div>
    {summary.summary&&<div style={{background:S,border:`1px solid ${BD}`,borderRadius:16,padding:'18px',marginBottom:16,fontSize:14,color:TX,lineHeight:1.7}}>{summary.summary}</div>}
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
      {(summary.boostWords||[]).map(w=><span key={w} style={{padding:'4px 12px',borderRadius:20,background:`${GR}18`,color:GR,fontSize:12,fontWeight:600}}>{w} ✓</span>)}
      {(summary.struggleWords||[]).map(w=><span key={w} style={{padding:'4px 12px',borderRadius:20,background:`${RE}18`,color:RE,fontSize:12,fontWeight:600}}>{w} ⭐</span>)}
      {(summary.newCardsAdded||[]).map(w=><span key={w} style={{padding:'4px 12px',borderRadius:20,background:`${AC}18`,color:AC,fontSize:12,fontWeight:600}}>+{w}</span>)}
    </div>
    {(summary.newCardsAdded||[]).length>0&&<div style={{fontSize:12,color:MU,marginBottom:20}}>{summary.newCardsAdded.length} new word{summary.newCardsAdded.length!==1?'s':''} added to deck.</div>}
    <PBtn label="Talk again" onClick={()=>{phaseRef.current='idle';setPhase('idle');setSummary(null);setElapsed(0);setMessages([])}}/>
  </div>

  // ── Main render ────────────────────────────────────────────────────────
  return<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 64px)'}}>

    {/* Word menu */}
    {wordMenu&&<div style={{position:'fixed',inset:0,zIndex:200}} onClick={()=>setWordMenu(null)}>
      <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:wordMenu.y,left:Math.min(wordMenu.x,window.innerWidth-210),background:S,border:`1px solid ${BD}`,borderRadius:14,padding:'8px',minWidth:200,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'up 0.15s ease'}}>
        <div style={{fontSize:15,fontWeight:700,color:YE,padding:'6px 12px',borderBottom:`1px solid ${BD}`,marginBottom:4}}>{wordMenu.word}</div>
        {wordMenu.translation&&<div style={{fontSize:12,color:MU,padding:'2px 12px 8px'}}>{wordMenu.translation}</div>}
        <button onClick={()=>addToDeck(wordMenu.word,wordMenu.translation,wordMenu.sentence)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',background:'none',border:'none',padding:'10px 12px',cursor:'pointer',fontSize:13,color:GR,fontFamily:FONT,borderRadius:8}}>＋ Add to deck</button>
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

    {/* Spectrum bar */}
    <div style={{padding:'12px 20px 8px',borderBottom:`1px solid ${BD}`,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:11,color:MU,fontWeight:600}}>👋 Amigo</span>
        <input type="range" min={0} max={1} step={0.01} value={spectrum} onChange={e=>setSpectrum(parseFloat(e.target.value))} style={{flex:1,height:3,WebkitAppearance:'none',appearance:'none',borderRadius:2,background:`linear-gradient(to right,${GR} 0%,${AC} ${spectrum*100}%,${BD} ${spectrum*100}%)`,outline:'none',cursor:'pointer'}}/>
        <span style={{fontSize:11,color:MU,fontWeight:600}}>👩‍🏫 Tutor</span>
        <button onClick={()=>setShowDebug(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:0.3,padding:'2px',lineHeight:1,flexShrink:0}}>⚙️</button>
      </div>
      <div style={{textAlign:'center',fontSize:10,color:MU,marginTop:4}}>{spectrum<0.25?'Flowing — corrections minimal':spectrum<0.6?'Balanced — gentle nudges':'Active correction mode'}</div>
      <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'center'}}>
        {[['slow','🐢 Slow'],['normal','⚡ Normal']].map(([k,l])=><button key={k} onClick={()=>setSpeed(k)} style={{padding:'6px 18px',borderRadius:20,background:speed===k?AC:S2,color:speed===k?'#fff':MU,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:FONT}}>{l}</button>)}
      </div>
    </div>

    {/* Chat feed */}
    <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:8}}>
      {messages.length===0&&phase==='idle'&&<div style={{textAlign:'center',padding:'60px 20px 0'}}>
        <div style={{fontSize:40,marginBottom:16}}>🎙️</div>
        <div style={{fontSize:18,fontWeight:700,color:TX,marginBottom:8}}>Talk to Luna</div>
        <div style={{fontSize:13,color:MU,lineHeight:1.7}}>Your Carioca conversation partner.<br/>Tap any word to translate or add to your deck.</div>
      </div>}
      {messages.map(msg=><VoiceBubble key={msg.id} msg={msg} cardMap={cardMap} translateWord={translateWord} onWordPress={(w,t,s,x,y)=>setWordMenu({word:w,translation:t,sentence:s,x,y})}/>)}
      {liveText&&<div style={{alignSelf:'flex-start',maxWidth:'85%'}}>
        <div style={{padding:'12px 16px',borderRadius:'18px 18px 18px 4px',background:S,border:`1px solid ${BD}`,fontSize:15,lineHeight:1.6,color:MU,fontStyle:'italic'}}>
          {liveText}<span style={{display:'inline-block',width:7,height:13,background:AC,borderRadius:1,marginLeft:3,animation:'pulse 0.7s ease-in-out infinite',verticalAlign:'middle'}}/>
        </div>
      </div>}
    </div>

    {/* Status bar */}
    <div style={{flexShrink:0,padding:'8px 20px',borderTop:`1px solid ${BD}`,display:'flex',alignItems:'center',gap:10,minHeight:40}}>
      <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:dotMode==='speak'?AC:dotMode==='listen'?GR:BD,transition:'background 0.2s',animation:dotMode?'pulse 1.5s ease-in-out infinite':'none'}}/>
      <span style={{fontSize:13,color:MU,flex:1}}>{status}</span>
      {phase==='live'&&<span style={{fontSize:12,color:MU,fontVariantNumeric:'tabular-nums',fontFamily:'monospace'}}>{fmtTime(elapsed)}</span>}
      {phase==='live'&&<button onClick={togglePtt} style={{fontSize:11,color:ptt?GR:MU,background:ptt?`${GR}18`:S2,border:`1px solid ${ptt?GR:BD}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontFamily:FONT,flexShrink:0}}>{ptt?'Hold to talk':'Auto'}</button>}
      {phase==='live'&&<button onClick={()=>setShowTextInput(v=>!v)} style={{fontSize:11,color:showTextInput?AC:MU,background:showTextInput?`${AC}18`:S2,border:`1px solid ${showTextInput?AC:BD}`,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontFamily:FONT,flexShrink:0}}>⌨️</button>}
    </div>

    {phase==='live'&&<div style={{padding:'6px 20px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
      {ptt&&<button onTouchStart={pttOn} onTouchEnd={pttOff} onMouseDown={pttOn} onMouseUp={pttOff} style={{width:'100%',padding:'14px',border:`1.5px dashed ${BD}`,borderRadius:14,background:'transparent',color:MU,fontFamily:FONT,fontSize:14,fontWeight:600,cursor:'pointer',WebkitTapHighlightColor:'transparent',userSelect:'none'}}>Hold to talk</button>}
      {showTextInput&&<div style={{display:'flex',gap:8,alignItems:'center'}}>
        <input
          value={textInput}
          onChange={e=>setTextInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText()}}}
          placeholder="Type to Luna…"
          autoFocus
          style={{flex:1,background:S,border:`1px solid ${AC}55`,borderRadius:12,padding:'12px 14px',color:TX,fontSize:14,outline:'none',fontFamily:FONT,WebkitUserSelect:'text',userSelect:'text'}}
        />
        <button
          onClick={sendText}
          disabled={!textInput.trim()||sendingText}
          onMouseDown={()=>SND.init()}
          style={{background:AC,color:'#fff',border:'none',borderRadius:12,padding:'12px 16px',fontSize:16,cursor:'pointer',opacity:textInput.trim()&&!sendingText?1:0.4,fontFamily:FONT,flexShrink:0}}
        >→</button>
      </div>}
    </div>}

    <div style={{padding:'8px 20px 20px',flexShrink:0}}>
      {phase==='idle'&&<PBtn label={isOnline?'Start talking':'Needs connection'} onClick={isOnline?connect:undefined} disabled={!isOnline}/>}
      {phase==='connecting'&&<PBtn label="Connecting…" disabled/>}
      {phase==='live'&&<PBtn label="End session" onClick={endSession} color={`${RE}cc`}/>}
      {phase==='ending'&&<PBtn label="Saving…" disabled/>}
    </div>
  </div>
}


export default function App(){
  const[cards,setCards]=useState([])
  const[streak,setStreak]=useState(0)
  const[lastDate,setLastDate]=useState(null)
  const[sentenceHistory,setSentenceHistory]=useState([])
  const[screen,setScreen]=useState('home')
  const[loaded,setLoaded]=useState(false)
  const[isOnline,setIsOnline]=useState(navigator.onLine)

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
    <Nav screen={screen} go={setScreen} due={due}/>
  </div>
}
