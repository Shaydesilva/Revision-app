// es-seed-spine.js — THE PAISA SPINE (the band above the floor).
// Unit-for-unit intent conversion of the Rio spine: same curriculum design,
// natively re-authored. "O Motor do Querer" → "El Motor del Querer";
// "Reagindo na Hora" → "Reaccionando"; "tô ligado" → "ya sé, parce".
//
// Interleaved by design (the Rio pillar rhythm): situation → machine →
// situation → machine, so grammar never arrives as a block of homework.
// Kinds assigned at birth. Nothing born homeless.
//
// VULGAR TIER: carried, per the owner's call, with the register cost stated
// plainly in the English gloss — you should always know what you're detonating.

const{createClient}=require('@supabase/supabase-js')
const{getPack}=require('./lang.cjs')
const UID=getPack('es-med').uid

const WORLDS=[
  {unit_id:"pa_motor",title:"The Want Engine",emoji:"🔑",sort_order:1,category:"grammar_core",context:"grammar",
   situation:"Want, need, can, have to — statistically the heart of survival speech. Four verbs that carry half of everything you'll say.",
   bricks:[
    ["quiero","yo quiero ___","I want ___",[["yo quiero un tinto","I want a coffee"],["quiero irme ya","I want to leave now"]],"slot-phrase"],
    ["queres","¿vos qué querés?","What do you want?",[["¿vos qué querés?","What do you want? (voseo)"],["¿usted qué quiere tomar?","What do you want to drink? (usted)"]],"person-form"],
    ["necesito","necesito ___","I need ___",[["necesito ayuda","I need help"],["necesito que me ayude","I need you to help me"]],"slot-phrase"],
    ["puedo","¿puedo ___?","Can I ___?",[["¿puedo pagar con tarjeta?","Can I pay by card?"],["¿puedo entrar?","Can I come in?"]],"slot-phrase"],
    ["tengoque","tengo que ___","I have to ___",[["tengo que camellar mañana","I have to work tomorrow"],["tengo que irme, qué pena","I have to go, sorry"]],"slot-phrase"],
    ["metoca","me toca ___","I've got to ___",[["me toca camellar","I've got to work (very Colombian)"],["me toca madrugar mañana","I've got to be up early tomorrow"]],"slot-phrase"],
    ["meprovoca","me provoca ___","I feel like ___",[["me provoca un tinto","I feel like a coffee (very Colombian)"],["no me provoca salir hoy","I don't feel like going out today"]],"slot-phrase"],
   ]},
  {unit_id:"pa_estados",title:"Now — States",emoji:"⚙️",sort_order:2,category:"grammar_core",context:"grammar",
   situation:"ESTAR in the present — how you are, where you are, right now. The most-used verb of your first month.",
   bricks:[
    ["estoybien","estoy bien","I'm good",[["estoy bien, gracias","I'm good, thanks"],["estoy muy bien, ¿y usted?","I'm great, and you?"]],"verb-form"],
    ["estoycansado","estoy cansado","I'm tired",[["estoy cansado hoy","I'm tired today"],["estoy muerto, parce","I'm dead tired, mate"]],"verb-form"],
    ["comoesta","¿cómo está?","How are you?",[["¿usted cómo está?","How are you? (warm usted)"],["¿vos cómo estás?","How are you? (voseo)"]],"person-form"],
    ["estamos","estamos ___","We're ___",[["estamos listos","We're ready"],["estamos en el parque","We're at the park"]],"slot-phrase"],
    ["afan","estoy con afán","I'm in a hurry",[["estoy con afán","I'm in a hurry (very Colombian)"],["ando con afán, hablamos después","I'm rushed, let's talk later"]],"chunk"],
    ["dondeestas","¿dónde estás?","Where are you?",[["¿dónde estás?","Where are you?"],["¿por dónde anda?","Whereabouts are you?"]],"person-form"],
    ["aburrido","estoy aburrido","I'm bored",[["estoy aburrido","I'm bored"],["qué pereza, no hay nada que hacer","What a drag, there's nothing to do"]],"verb-form"],
   ]},
  {unit_id:"pa_no_entendi",title:"The Repair Kit",emoji:"🆘",sort_order:3,category:"survival",context:"social",
   situation:"Control the conversation when you're lost. The kit that turns panic into a normal exchange.",
   bricks:[
    ["comoasi","¿cómo así?","How do you mean?",[["¿cómo así?","How do you mean? (very Colombian)"],["¿cómo así que no?","What do you mean, no?"]],"chunk"],
    ["quequiere","¿qué quiere decir eso?","What does that mean?",[["¿qué quiere decir eso?","What does that mean?"],["¿qué significa esa palabra?","What does that word mean?"]],"chunk"],
    ["otravez","dígame otra vez","Say it again",[["dígame otra vez, por favor","Say that again, please"],["¿me lo repite?","Can you repeat it?"]],"chunk"],
    ["despacio","más despacio","Slower",[["hable más despacio, por favor","Speak slower, please"],["despacito que apenas estoy aprendiendo","Slowly — I'm only just learning"]],"chunk"],
    ["comosedice","¿cómo se dice ___?","How do you say ___?",[["¿cómo se dice esto?","How do you say this?"],["¿cómo se dice eso en español?","How do you say that in Spanish?"]],"slot-phrase"],
    ["siga","siga","Go ahead",[["siga, lo escucho","Go ahead, I'm listening"],["dígame pues","Tell me then"]],"chunk"],
    ["apenas","apenas estoy aprendiendo","I'm only just learning",[["apenas estoy aprendiendo","I'm only just learning"],["hablo poquito todavía","I still speak just a little"]],"chunk"],
   ]},
  {unit_id:"pa_charla",title:"Starting Conversations",emoji:"💬",sort_order:4,category:"social",context:"social",
   situation:"The question engine. You don't need to talk much if you can keep someone else talking.",
   bricks:[
    ["venismucho","¿vos venís mucho por acá?","Do you come here often?",[["¿vos venís mucho por acá?","Do you come here often? (voseo)"],["¿usted viene mucho por acá?","Do you come here often? (usted)"]],"person-form"],
    ["quetegusta","¿qué te gusta hacer?","What do you like to do?",[["¿qué te gusta hacer?","What do you like to do?"],["¿qué hace en el tiempo libre?","What do you do in your free time?"]],"chunk"],
    ["conoces","¿conocés ___?","Do you know ___?",[["¿conocés ese lugar?","Do you know that place? (voseo)"],["¿usted conoce por acá?","Do you know around here?"]],"slot-phrase"],
    ["quehaces","¿qué hacés?","What are you up to?",[["¿qué hacés?","What are you up to? (voseo)"],["¿qué está haciendo?","What are you doing?"]],"person-form"],
    ["yentonces","¿y entonces?","So then?",[["¿y entonces?","So then? / And?"],["¿y entonces qué pasó?","So then what happened?"]],"chunk"],
    ["dondeandas","¿por dónde andás?","Whereabouts are you?",[["¿por dónde andás?","Whereabouts are you? (voseo)"],["¿dónde anda metido?","Where have you got to?"]],"person-form"],
   ]},
  {unit_id:"pa_reaccion",title:"Reacting Live",emoji:"⚡",sort_order:5,category:"personality_humour",context:"social",
   situation:"The reaction bank — how you stay alive in a conversation while somebody else is doing the talking.",
   bricks:[
    ["nopuedeser","¡no puede ser!","No way!",[["¡no puede ser!","No way! / I can't believe it"],["¡no me diga!","You don't say!"]],"chunk"],
    ["quelocura","¡qué locura!","That's crazy!",[["¡qué locura!","That's crazy!"],["¡qué nota!","How cool! (Colombian)"]],"chunk"],
    ["avemaria","¡ave María!","Good grief!",[["¡ave María!","Good grief! (the paisa exclamation)"],["¡ave María, pues!","Good grief, man!"]],"chunk"],
    ["claroquesi","claro que sí","Of course",[["claro que sí","Of course"],["obvio, parce","Obviously, mate"]],"chunk"],
    ["yase","ya sé","I know / I get it",[["ya sé","I know / I get it"],["sí, ya caigo","Yeah, I follow now"]],"chunk"],
    ["puessi","pues sí","Well, yeah",[["pues sí","Well, yeah (very paisa)"],["pues claro, hombre","Well obviously, man"]],"chunk"],
    ["eso","¡eso!","That's it! / Yes!",[["¡eso!","That's it! / Yes! (agreement)"],["¡eso es, parce!","That's exactly it, mate!"]],"chunk"],
    ["bacano","¡qué bacano!","How cool!",[["¡qué bacano!","How cool!"],["¡qué chimba!","Awesome! (strong — with friends only)"]],"chunk"],
    ["quepereza","qué pereza","What a drag",[["qué pereza","What a drag"],["qué mamera, parce","What a pain, mate"]],"chunk"],
   ]},
  {unit_id:"pa_va_pasar",title:"Going To",emoji:"🔮",sort_order:6,category:"grammar_core",context:"grammar",
   situation:"The only future you need: ir + a + verb. Plans, intentions, and what's about to happen.",
   bricks:[
    ["voya","voy a ___","I'm going to ___",[["voy a salir ahorita","I'm going out in a bit"],["voy a comer algo primero","I'm going to eat something first"]],"slot-phrase"],
    ["vaa","va a ___","It's going to ___",[["va a estar bueno","It's going to be good"],["va a llover, parce","It's going to rain, mate"]],"slot-phrase"],
    ["vamosa","vamos a ___","Let's ___",[["vamos a comer algo","Let's go eat something"],["vamos a ver qué pasa","Let's see what happens"]],"slot-phrase"],
    ["yavoy","ya voy","I'm on my way",[["ya voy","I'm on my way"],["ya voy llegando","I'm nearly there (very Colombian)"]],"chunk"],
    ["vaasalir","va a salir bien","It'll work out",[["va a salir bien","It'll work out"],["tranquilo, todo se arregla","Relax, it all works out"]],"chunk"],
   ]},
  {unit_id:"pa_pasando",title:"Happening Now",emoji:"🌀",sort_order:7,category:"grammar_core",context:"grammar",
   situation:"ESTAR + gerund — the live present. What's going on right this second.",
   bricks:[
    ["estoyhaciendo","estoy haciendo ___","I'm doing ___",[["¿qué estás haciendo?","What are you doing?"],["estoy haciendo nada, parce","I'm doing nothing, mate"]],"slot-phrase"],
    ["estoypensando","estoy pensando","I'm thinking",[["estoy pensando","I'm thinking"],["estoy pensando en ir","I'm thinking about going"]],"verb-form"],
    ["camellando","estoy camellando","I'm working",[["estoy camellando","I'm working (street)"],["estoy trabajando ahorita","I'm working right now"]],"verb-form"],
    ["quepasando","¿qué está pasando?","What's going on?",[["¿qué está pasando?","What's going on?"],["¿qué más de nuevo?","What's new?"]],"chunk"],
    ["esperando","estoy esperando","I'm waiting",[["estoy esperando","I'm waiting"],["lo estoy esperando hace rato","I've been waiting a while for him"]],"verb-form"],
   ]},
  {unit_id:"pa_bar",title:"Out for a Drink",emoji:"🍺",sort_order:8,category:"social",context:"social",
   situation:"The opening ritual — walk in, greet, first round, and the phrases that say you belong here.",
   bricks:[
    ["vamospues","¡vamos pues!","Let's go!",[["¡vamos pues!","Let's go!"],["arranquemos, ya vamos tarde","Let's move, we're late"]],"chunk"],
    ["tomamosuna","¿nos tomamos una?","Shall we grab a drink?",[["¿nos tomamos una?","Shall we grab a drink?"],["¿nos tomamos una fría?","Shall we grab a cold one?"]],"chunk"],
    ["lleno","está lleno hoy","It's packed today",[["está lleno hoy, ¿no?","It's packed today, isn't it?"],["no hay dónde sentarse","There's nowhere to sit"]],"chunk"],
    ["salud","¡salud!","Cheers!",[["¡salud!","Cheers!"],["¡salud, parce, por eso!","Cheers mate, to that!"]],"chunk"],
    ["cuenteconmigo","cuente conmigo","Count on me",[["cuente conmigo","Count on me"],["estamos ahí, parce","We're in this together, mate"]],"chunk"],
    ["otraronda","otra ronda","Another round",[["otra ronda, por favor","Another round, please"],["yo invito esta","This one's on me"]],"chunk"],
    ["yomevoy","yo ya me voy","I'm heading off",[["yo ya me voy","I'm heading off"],["me abro, parce, hablamos","I'm off, mate, talk soon"]],"chunk"],
   ]},
]

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()
    const{data:bank}=await sb.from('ng_scaffolds').select('id,base_portuguese').eq('user_id',UID)
    const knownId={};(bank||[]).forEach(b=>{knownId[norm(b.base_portuguese)]=b.id})
    let planted=0,bricks=0
    for(const w of WORLDS){
      const{data:existing}=await sb.from('ng_path_units').select('id').eq('user_id',UID).eq('unit_id',w.unit_id).maybeSingle()
      if(existing)continue
      const ids=[]
      for(const[suf,base,baseEn,stages,kind]of w.bricks){
        const id='sc_'+w.unit_id+'_'+suf
        const ex=knownId[norm(base)]
        if(ex){ids.push(ex);continue}
        const{error}=await sb.from('ng_scaffolds').insert({
          id,user_id:UID,base_portuguese:base,base_english:baseEn,
          stages:stages.map(([pt,en],i)=>({stage:i+1,pt,en,kind,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})),
          current_stage:1,phase:1,category:w.category,context:w.context,
          cluster:w.unit_id,source:'curriculum',last_practiced:null
        })
        if(!error){ids.push(id);bricks++}
      }
      await sb.from('ng_path_units').insert({
        user_id:UID,unit_id:w.unit_id,title:w.title,emoji:w.emoji,
        situation:w.situation,scaffold_ids:ids,threshold_days:6,
        sort_order:w.sort_order,is_side_quest:false,level:1
      })
      planted++
      try{await sb.from('ng_brain_log').insert({user_id:UID,process:'seed',thought:`Paisa spine world planted: ${w.title} — ${ids.length} bricks.`,importance:1})}catch(_){}
    }
    return{statusCode:200,body:JSON.stringify({ok:true,planted,bricks})}
  }catch(e){
    console.error('es-seed-spine:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

exports.WORLDS=WORLDS // exported for the content harness
