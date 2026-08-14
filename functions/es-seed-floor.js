// es-seed-floor.js — THE PAISA FLOOR (Medellín, 0→1).
// Hand-authored, register-true paisa. Every brick carries its `kind` AT BIRTH —
// the Portuguese bank's Lego layer ended up 92% unclassified because kinds were
// backfilled by a nightly job that barely ran. Not repeating that mistake.
//
// Method: these are INTENT conversions of the Rio bank, not translations.
// "que saco" → "qué pereza". "me vê uma cerveja" → "me regala una fría".
// Same communicative move, executed the way a paisa executes it.
//
// NOTE ON THE SCHEMA: stage.pt holds the TARGET-language phrase. The field is
// named `pt` for historical reasons (the app was born Portuguese); renaming it
// would touch every atom, every function and every memory row for zero learner
// benefit. Read it as "phrase", not "Portuguese".
//
// Idempotent per world; relinks bricks that survived a reset. Planted under the
// Paisa identity (lang.cjs es-med) — structurally isolated from the Rio bank.

const{createClient}=require('@supabase/supabase-js')
const{getPack}=require('./lang.cjs')
const UID=getPack('es-med').uid

// [id-suffix, base_es, base_en, [[phrase,gloss],...], kind]
const WORLDS=[
  {unit_id:"pa_first_contact",title:"First Contact",emoji:"👋",sort_order:-3,category:"survival",context:"social",
   situation:"The true zero: greet, thank, apologize, leave — and the repair kit that makes every other conversation survivable.",
   bricks:[
    ["quiubo","¿quiubo, parce?","What's up, mate?",[["¿quiubo, parce?","What's up, mate?"],["¿quiubo pues, todo bien?","What's up then, all good?"]],"chunk"],
    ["quemas","¿qué más?","How's it going?",[["¿qué más?","How's it going? (the paisa greeting)"],["¿qué más pues?","How's it going then? (very paisa)"]],"chunk"],
    ["bienoque","¿bien o qué?","You good or what?",[["¿bien o qué?","You good or what?"],["¿bien o qué, parce?","You good or what, mate?"]],"chunk"],
    ["todobien","todo bien","All good",[["todo bien","All good"],["todo bien, ¿y vos?","All good, and you?"]],"chunk"],
    ["muchogusto","mucho gusto","Nice to meet you",[["mucho gusto","Nice to meet you"],["mucho gusto, ¿cómo se llama?","Nice to meet you, what's your name?"]],"chunk"],
    ["listo","listo","OK / done / deal",[["listo","OK / done / deal"],["listo pues","Alright then"]],"chunk"],
    ["gracias","gracias","Thanks",[["gracias","Thanks"],["muchas gracias, muy amable","Thanks a lot, very kind of you"]],"chunk"],
    ["alaorden","a la orden","You're welcome / at your service",[["a la orden","You're welcome / at your service"],["con mucho gusto","My pleasure (the Colombian 'you're welcome')"]],"chunk"],
    ["quepena","qué pena","Excuse me / sorry",[["qué pena","Excuse me / sorry (NOT shame)"],["qué pena con usted","So sorry (very Colombian)"]],"chunk"],
    ["noentendi","no entendí","I didn't understand",[["no entendí","I didn't understand"],["no entendí nada, qué pena","I didn't get any of that, sorry"]],"chunk"],
    ["repite","¿me repite?","Can you repeat?",[["¿me repite?","Can you repeat?"],["¿me repite más despacio, por favor?","Can you say it slower, please?"]],"chunk"],
    ["permiso","permiso","Excuse me (passing)",[["permiso","Excuse me (passing)"],["con permiso, voy pasando","Excuse me, coming through"]],"chunk"],
    ["chao","chao","Bye",[["chao","Bye"],["chao pues, nos vemos","Bye then, see you"]],"chunk"],
    ["hagale","hágale","Go ahead / do it",[["hágale","Go ahead / do it"],["hágale pues, de una","Go for it, right now"]],"chunk"],
    ["meayuda","¿me ayuda?","Can you help me?",[["¿me ayuda?","Can you help me?"],["¿me ayuda con una cosita?","Can you help me with something?"]],"slot-phrase"],
   ]},
  {unit_id:"pa_vos_y_yo",title:"You & Me",emoji:"🤝",sort_order:-2,category:"identity",context:"social",
   situation:"Who I am, where I'm from, what I do — and the same questions back. Voseo and usted, side by side.",
   bricks:[
    ["comosellama","¿cómo se llama?","What's your name?",[["¿cómo se llama?","What's your name?"],["¿usted cómo se llama?","What's your name? (warm usted)"]],"chunk"],
    ["mellamo","me llamo ___","My name is ___",[["me llamo ___","My name is ___"],["yo soy ___, mucho gusto","I'm ___, nice to meet you"]],"slot-phrase"],
    ["dedondesos","¿de dónde sos?","Where are you from?",[["¿de dónde sos?","Where are you from? (voseo)"],["¿usted de dónde es?","Where are you from? (usted)"]],"person-form"],
    ["soyde","yo soy de ___","I'm from ___",[["yo soy de Inglaterra","I'm from England"],["soy de allá pero vivo acá","I'm from there but I live here"]],"slot-phrase"],
    ["vivo","yo vivo en ___","I live in ___",[["yo vivo en Medellín","I live in Medellín"],["vivo acá hace poquito","I've only lived here a little while"]],"slot-phrase"],
    ["aquesededica","¿a qué se dedica?","What do you do?",[["¿a qué se dedica?","What do you do?"],["¿en qué camella?","What do you work in? (street)"]],"chunk"],
    ["camello","yo trabajo en ___","I work in ___",[["yo trabajo en ventas","I work in sales"],["camello desde la casa","I work from home (street)"]],"slot-phrase"],
    ["megusta","me gusta ___","I like ___",[["me gusta el fútbol","I like football"],["me gusta mucho acá","I really like it here"]],"slot-phrase"],
    ["cuantosanos","¿cuántos años tiene?","How old are you?",[["¿cuántos años tiene?","How old are you?"],["tengo treinta años","I'm thirty"]],"chunk"],
    ["sospaisa","¿vos sos paisa?","Are you paisa?",[["¿vos sos paisa?","Are you paisa? (voseo)"],["¿usted es de acá?","Are you from here?"]],"person-form"],
   ]},
  {unit_id:"pa_plata",title:"Money & Numbers",emoji:"💰",sort_order:-1,category:"survival",context:"transactional",
   situation:"Counting, prices, paying and time — the survival math of daily Medellín.",
   bricks:[
    ["cuantovale","¿cuánto vale?","How much is it?",[["¿cuánto vale?","How much is it?"],["¿cuánto vale eso pues?","How much is that then?"]],"chunk"],
    ["meregala","¿me regala ___?","Can I get ___?",[["¿me regala un tinto?","Can I get a black coffee?"],["regáleme dos, por favor","Give me two, please"]],"slot-phrase"],
    ["lacuenta","la cuenta, por favor","The bill, please",[["la cuenta, por favor","The bill, please"],["¿me regala la cuenta?","Can I get the bill?"]],"chunk"],
    ["tarjeta","¿puedo pagar con tarjeta?","Can I pay by card?",[["¿puedo pagar con tarjeta?","Can I pay by card?"],["¿reciben Nequi?","Do you take Nequi?"]],"chunk"],
    ["caro","está caro","It's expensive",[["está muy caro","That's expensive"],["está barato, de una","That's cheap, let's do it"]],"chunk"],
    ["vueltas","¿tiene vueltas?","Do you have change?",[["¿tiene vueltas?","Do you have change?"],["¿me da las vueltas?","Can I have my change?"]],"chunk"],
    ["numeros","uno, dos, tres","One, two, three",[["uno, dos, tres, cuatro, cinco","One to five"],["diez, veinte, cincuenta, cien","Ten, twenty, fifty, a hundred"]],"vocab"],
    ["lucas","diez lucas","Ten thousand pesos",[["diez lucas","Ten thousand pesos"],["eso vale como veinte lucas","That costs about twenty thousand"]],"vocab"],
    ["quehora","¿qué hora es?","What time is it?",[["¿qué hora es?","What time is it?"],["¿a qué hora cierran?","What time do you close?"]],"chunk"],
    ["ahorita","ahorita","In a bit / just now",[["ahorita","In a bit / just now"],["ahorita vuelvo","I'll be right back"]],"time-word"],
   ]},
  {unit_id:"pa_comida",title:"Food & Coffee",emoji:"🍽",sort_order:0.1,category:"survival",context:"transactional",
   situation:"Hungry in Medellín — order, ask what's good, say what you want and what you don't.",
   bricks:[
    ["tinto","¿me regala un tinto?","Can I get a black coffee?",[["¿me regala un tinto?","Can I get a black coffee?"],["un tintico, porfa","A little coffee, please"]],"slot-phrase"],
    ["hambre","tengo hambre","I'm hungry",[["tengo hambre","I'm hungry"],["tengo un filo que no veo","I'm starving (street)"]],"chunk"],
    ["recomienda","¿qué me recomienda?","What do you recommend?",[["¿qué me recomienda?","What do you recommend?"],["¿qué es lo bueno acá?","What's good here?"]],"chunk"],
    ["quiero","yo quiero ___","I want ___",[["yo quiero una arepa","I want an arepa"],["me regala una bandeja paisa","Get me a bandeja paisa"]],"slot-phrase"],
    ["sin","sin ___","Without ___",[["sin cebolla, por favor","No onion, please"],["sin hielo","No ice"]],"slot-phrase"],
    ["rico","está muy rico","It's delicious",[["está muy rico","It's delicious"],["¡qué delicia, parce!","So good, mate!"]],"chunk"],
    ["lleno","estoy lleno","I'm full",[["estoy lleno","I'm full"],["quedé full, gracias","I'm stuffed, thanks"]],"chunk"],
    ["fria","¿me regala una fría?","Can I get a cold beer?",[["¿me regala una fría?","Can I get a cold beer?"],["dos frías bien heladas","Two nice cold beers"]],"slot-phrase"],
    ["agua","¿me regala un agua?","Can I get a water?",[["¿me regala un agua?","Can I get a water?"],["un agua sin gas","A still water"]],"slot-phrase"],
    ["almuerzo","el almuerzo del día","The lunch of the day",[["¿cuál es el almuerzo del día?","What's the lunch of the day?"],["voy a querer ese","I'll have that one"]],"chunk"],
   ]},
  {unit_id:"pa_me_muevo",title:"Getting Around",emoji:"🚇",sort_order:0.2,category:"survival",context:"transactional",
   situation:"The Metro, taxis, and the phrase every traveler needs — where things are and how to get there.",
   bricks:[
    ["dondequeda","¿dónde queda ___?","Where is ___?",[["¿dónde queda el baño?","Where's the bathroom?"],["¿dónde queda el metro?","Where's the metro?"]],"slot-phrase"],
    ["lejos","¿queda lejos?","Is it far?",[["¿queda lejos de acá?","Is it far from here?"],["queda cerquita, se puede ir a pie","It's close, you can walk"]],"chunk"],
    ["comollego","¿cómo llego a ___?","How do I get to ___?",[["¿cómo llego al Poblado?","How do I get to El Poblado?"],["¿por dónde cojo?","Which way do I go?"]],"slot-phrase"],
    ["derecha","a la derecha","To the right",[["a la derecha","To the right"],["gire a la izquierda ahí","Turn left there"]],"chunk"],
    ["derecho","siga derecho","Go straight",[["siga derecho","Go straight"],["siga derecho y coja a la derecha","Straight, then take a right"]],"chunk"],
    ["ahimismito","ahí mismito","Right there",[["ahí mismito","Right there"],["es ahí no más","It's just there"]],"chunk"],
    ["metro","voy a coger el metro","I'm taking the metro",[["voy a coger el metro","I'm going to take the metro"],["¿cuál estación me sirve?","Which station works for me?"]],"chunk"],
    ["cobra","¿cuánto me cobra?","How much do you charge?",[["¿cuánto me cobra hasta allá?","How much to get there?"],["¿me pide un taxi?","Can you call me a taxi?"]],"chunk"],
    ["perdido","estoy perdido","I'm lost",[["estoy perdido","I'm lost"],["creo que me perdí, qué pena","I think I got lost, sorry"]],"chunk"],
    ["lleva","¿me lleva a ___?","Can you take me to ___?",[["¿me lleva a esta dirección?","Can you take me to this address?"],["déjeme acá no más","Just drop me here"]],"slot-phrase"],
   ]},
  {unit_id:"pa_del_diario",title:"Everyday",emoji:"🛒",sort_order:0.3,category:"survival",context:"transactional",
   situation:"Shops, this and that, here and there — the small words that glue the day together.",
   bricks:[
    ["este","este de acá","This one here",[["este de acá","This one here"],["¿este o aquel?","This one or that one?"]],"vocab"],
    ["aca","acá / allá","Here / over there",[["acá","Here"],["allá","Over there"]],"vocab"],
    ["cerquita","acá cerquita","Nearby",[["¿hay una tienda acá cerquita?","Is there a shop nearby?"],["la droguería queda ahí mismito","The pharmacy is right there"]],"chunk"],
    ["necesito","necesito ___","I need ___",[["necesito una droguería","I need a pharmacy"],["necesito comprar agua","I need to buy water"]],"slot-phrase"],
    ["hay","¿hay ___?","Is there ___?",[["¿hay baño acá?","Is there a bathroom here?"],["¿hay wifi?","Is there wifi?"]],"slot-phrase"],
    ["abierto","¿está abierto?","Is it open?",[["¿está abierto?","Is it open?"],["¿a qué hora cierran?","What time do you close?"]],"chunk"],
    ["buscando","estoy buscando ___","I'm looking for ___",[["estoy buscando una droguería","I'm looking for a pharmacy"],["estoy buscando el supermercado","I'm looking for the supermarket"]],"slot-phrase"],
    ["eso","eso es","That's it exactly",[["eso es","That's it exactly"],["no, ese no","No, not that one"]],"chunk"],
    ["bolsa","¿me regala una bolsa?","Can I get a bag?",[["¿me regala una bolsa?","Can I get a bag?"],["eso es todo, gracias","That's all, thanks"]],"chunk"],
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
        if(ex){ids.push(ex);continue} // survived a reset — relink, never duplicate
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
        situation:w.situation,scaffold_ids:ids,threshold_days:5,
        sort_order:w.sort_order,is_side_quest:false,level:1
      })
      planted++
      try{await sb.from('ng_brain_log').insert({user_id:UID,process:'seed',thought:`Paisa world planted: ${w.title} — ${ids.length} bricks.`,importance:1})}catch(_){}
    }
    return{statusCode:200,body:JSON.stringify({ok:true,planted,bricks})}
  }catch(e){
    console.error('es-seed-floor:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
