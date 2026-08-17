// es-seed-past.js — THE PAISA PAST BAND + the remaining social worlds.
// Intent conversion of the Rio units above the spine: "Ontem Foi" → "Ayer Fue",
// "O Cenário (Imperfeito)" → "La Escena", "Praia & Rolê" → "Planes y Finca"
// (Medellín has no beach; paisa weekends are the finca and Guatapé),
// "Maracanã" → "Fútbol" (Nacional / DIM), "Zoação" → "Molestando".
//
// The two past machines are deliberately separated the way the Rio bank had
// them: PRETERITE = the thing that happened once (fui, hablé, comí);
// IMPERFECT = the scene it happened inside (estaba, tenía, era). Spanish
// punishes confusing them far harder than Portuguese does, so they get their
// own worlds rather than being mixed into one "past" shelf.
//
// Kinds at birth. Nothing born homeless. Register costs stated in the gloss.

const{createClient}=require('@supabase/supabase-js')
const{getPack}=require('./lang.cjs')
const UID=getPack('es-med').uid

const WORLDS=[
  {unit_id:"pa_ayer_fue",title:"Yesterday Was",emoji:"⏪",sort_order:9,category:"grammar_core",context:"grammar",
   situation:"The preterite — the thing that happened, once, and finished. The carriers you'll reach for every single day: fui, hice, hablé, comí, vi, conocí.",
   bricks:[
    ["fui","ayer fui a ___","Yesterday I went to ___",[["ayer fui a la tienda","Yesterday I went to the shop"],["anoche fui a comer por allá","Last night I went to eat over there"]],"verb-form"],
    ["hice","¿qué hiciste ayer?","What did you do yesterday?",[["¿qué hiciste ayer?","What did you do yesterday?"],["no hice nada, la verdad","Nothing really, honestly"]],"verb-form"],
    ["hable","hablé con ___","I spoke to ___",[["hablé con él esta mañana","I spoke to him this morning"],["ya hablé con ella, todo bien","I already spoke to her, all good"]],"slot-phrase"],
    ["comi","comí ___","I ate ___",[["comí muy rico hoy","I ate really well today"],["comí demasiado, estoy lleno","I ate way too much, I'm full"]],"slot-phrase"],
    ["vi","vi ___","I saw ___",[["vi una cosa muy rara hoy","I saw something really odd today"],["¿vio lo que pasó?","Did you see what happened?"]],"slot-phrase"],
    ["conoci","conocí a ___","I met ___",[["conocí a una gente muy bacana","I met some really cool people"],["lo conocí el año pasado","I met him last year"]],"slot-phrase"],
    ["llegue","llegué hace ___","I arrived ___ ago",[["llegué hace dos semanas","I arrived two weeks ago"],["apenas llegué, todavía no conozco nada","I just arrived, I don't know anything yet"]],"slot-phrase"],
   ]},
  {unit_id:"pa_la_escena",title:"The Scene",emoji:"🎞",sort_order:10,category:"grammar_core",context:"grammar",
   situation:"The imperfect — not what happened, but the scene it happened inside. estaba · tenía · era · quería · había. This is also the polite 'I'd like'.",
   bricks:[
    ["estaba","yo estaba en ___","I was at ___",[["yo estaba en la casa","I was at home"],["estaba caminando por ahí","I was walking around"]],"verb-form"],
    ["tenia","tenía ___","I had ___",[["no tenía plata en ese momento","I had no money at the time"],["tenía como veinte años","I was about twenty"]],"verb-form"],
    ["era","era ___","It was ___",[["era muy bacano","It was really cool"],["era otra época, parce","It was a different time, mate"]],"verb-form"],
    ["queria","quería ___","I'd like ___",[["quería un tinto, por favor","I'd like a coffee, please (polite)"],["quería preguntarle una cosa","I wanted to ask you something"]],"slot-phrase"],
    ["habia","había ___","There was/were ___",[["había mucha gente","There were loads of people"],["no había nadie","There was nobody"]],"slot-phrase"],
    ["antes","antes ___","I used to ___",[["antes vivía en Rio","I used to live in Rio"],["antes no me gustaba, ahora sí","I didn't use to like it, now I do"]],"slot-phrase"],
   ]},
  {unit_id:"pa_mi_historia",title:"My Story",emoji:"📖",sort_order:11,category:"identity",context:"social",
   situation:"Your sixty-second Medellín identity: who you are, why you came, how long you've been here. You'll tell this one twice a week.",
   bricks:[
    ["llevo","llevo ___ acá","I've been here ___",[["llevo dos meses acá","I've been here two months"],["llevo poquito, apenas llegué","Not long, I've only just arrived"]],"slot-phrase"],
    ["mevine","me vine para Medellín","I moved to Medellín",[["me vine para Medellín","I moved to Medellín"],["me vine porque me gusta el clima","I came because I like the weather"]],"chunk"],
    ["porque","me vine porque ___","I came because ___",[["me vine porque quería aprender español","I came because I wanted to learn Spanish"],["vine por trabajo","I came for work"]],"slot-phrase"],
    ["cuenteme","cuénteme","Tell me",[["cuénteme","Tell me"],["cuénteme cómo le ha ido","Tell me how it's been going"]],"chunk"],
    ["hacerato","hace rato","A good while",[["hace rato no lo veo","I haven't seen him in ages"],["hace rato que vivo acá","I've lived here a good while"]],"time-word"],
    ["deantes","yo soy de ___, pero ___","I'm from ___, but ___",[["yo soy de Inglaterra, pero viví en Brasil","I'm from England, but I lived in Brazil"],["soy de allá, pero ya me siento de acá","I'm from there, but I feel from here now"]],"slot-phrase"],
   ]},
  {unit_id:"pa_planes",title:"Plans & the Finca",emoji:"🌄",sort_order:12,category:"social",context:"social",
   situation:"Making plans, paisa-style — the finca, Guatapé, tierra caliente. Weekends here leave the city, and this is how you get invited.",
   bricks:[
    ["cuadremos","cuadremos algo","Let's sort something out",[["cuadremos algo pa'l fin de semana","Let's sort something for the weekend"],["cuadramos y le aviso","We'll sort it and I'll let you know"]],"chunk"],
    ["finca","¿vamos a la finca?","Shall we go to the finca?",[["¿vamos a la finca el fin de semana?","Shall we go to the finca this weekend?"],["nos vamos pa' tierra caliente","We're off to the hot country"]],"chunk"],
    ["queplanes","¿qué planes?","What are the plans?",[["¿qué planes pa'l fin de semana?","What are the plans for the weekend?"],["¿qué vamos a hacer?","What are we going to do?"]],"chunk"],
    ["yocaigo","yo caigo","I'll show up",[["yo caigo, listo","I'll be there, sure"],["yo caigo por allá más tarde","I'll drop by later"]],"chunk"],
    ["aquehoras","¿a qué horas?","What time?",[["¿a qué horas nos vemos?","What time shall we meet?"],["a las ocho está bien","Eight's fine"]],"chunk"],
    ["ahinosvemos","ahí nos vemos","See you there",[["listo, ahí nos vemos","Cool, see you there"],["nos vemos la otra semana","See you next week"]],"chunk"],
    ["nopuedo","no puedo, ___","I can't, ___",[["no puedo, me toca camellar","I can't, I've got to work"],["esta vez no puedo, la próxima sí","Not this time, next one for sure"]],"slot-phrase"],
   ]},
  {unit_id:"pa_futbol",title:"Football",emoji:"⚽",sort_order:13,category:"social",context:"social",
   situation:"The universal Medellín password. Two teams share this city — Nacional and el DIM — and picking one is a personality test.",
   bricks:[
    ["vioelpartido","¿vio el partido?","Did you see the game?",[["¿vio el partido anoche?","Did you see the game last night?"],["¿vos viste el partido?","Did you see the game? (voseo)"]],"chunk"],
    ["levoy","yo le voy al ___","I support ___",[["yo le voy al Nacional","I support Nacional"],["yo le voy al DIM, parce","I'm a Medellín fan, mate"]],"slot-phrase"],
    ["acualleva","¿usted a cuál le va?","Which team do you support?",[["¿usted a cuál le va?","Which team do you support?"],["¿vos a cuál le vas?","Which team do you support? (voseo)"]],"person-form"],
    ["golazo","¡qué golazo!","What a goal!",[["¡qué golazo, hermano!","What a goal, mate!"],["ese gol estuvo muy bueno","That goal was really something"]],"chunk"],
    ["perdimos","perdimos otra vez","We lost again",[["perdimos otra vez, qué pereza","We lost again, what a drag"],["ganamos, ¡eso!","We won, get in!"]],"chunk"],
   ]},
  {unit_id:"pa_molestando",title:"Messing About",emoji:"😏",sort_order:14,category:"personality_humour",context:"social",
   situation:"Banter. Paisas tease constantly and warmly — being able to take it and give it back is how you stop being a foreigner.",
   bricks:[
    ["mamargallo","me está mamando gallo","You're pulling my leg",[["me está mamando gallo","You're pulling my leg (very Colombian)"],["no me mame gallo, parce","Don't wind me up, mate"]],"chunk"],
    ["noseaasi","no sea así","Don't be like that",[["no sea así, hombre","Don't be like that, man"],["no sea maluco","Don't be mean (Colombian)"]],"chunk"],
    ["estaloco","usted está loco","You're mad",[["usted está loco","You're mad"],["vos sí sos loco, parce","You really are mad, mate (voseo)"]],"person-form"],
    ["dejeelshow","deje el show","Cut it out",[["deje el show","Cut it out / stop performing"],["deje la pereza, vamos","Stop being lazy, let's go"]],"chunk"],
    ["queboleta","qué boleta","How embarrassing",[["qué boleta, parce","How embarrassing, mate (Colombian)"],["qué oso","How cringe (Colombian)"]],"chunk"],
    ["ustedsies","usted sí es ___","You really are ___",[["usted sí es bien loco","You really are properly mad"],["usted sí es tremendo, hermano","You really are something else"]],"slot-phrase"],
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
      try{await sb.from('ng_brain_log').insert({user_id:UID,process:'seed',thought:`Paisa past-band world planted: ${w.title} — ${ids.length} bricks.`,importance:1})}catch(_){}
    }
    return{statusCode:200,body:JSON.stringify({ok:true,planted,bricks})}
  }catch(e){
    console.error('es-seed-past:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

exports.WORLDS=WORLDS // exported for the content harness
