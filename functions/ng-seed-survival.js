// ng-seed-survival.js — the A1 SURVIVAL BREADTH band (Calçadão 0→1 reshape).
// Concrete, high-frequency survival worlds that a true beginner needs BEFORE the
// tense machine: food, getting around (incl. the bathroom), everyday errands.
// Hand-authored, register-true, lowercase spine voice, Lego kinds. Idempotent.
// Fired by ng-heartbeat + replant.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

const WORLDS=[
  {unit_id:'comida',title:'Comida',emoji:'🍽',sort_order:0.1,category:'survival',context:'transactional',
   situation:'Hungry in Rio — order, ask what\'s good, say what you want and don\'t.',
   bricks:[
    ['fome',   'tô com fome',[['tô com fome','I\'m hungry'],['tô morrendo de fome','I\'m starving']],'chunk'],
    ['recomenda','o que cê recomenda?',[['o que cê recomenda?','what do you recommend?'],['qual que é bom aqui?','which one\'s good here?']],'chunk'],
    ['queroum','eu quero um ___',[['eu quero um pastel','I want a pastel'],['me vê um X-tudo','get me an X-tudo']],'slot-phrase'],
    ['sem',    'sem ___',[['sem cebola, por favor','no onion, please'],['sem gelo','no ice']],'slot-phrase'],
    ['delicia','tá uma delícia',[['tá uma delícia','it\'s delicious'],['nossa, que delícia','wow, so good']],'chunk'],
    ['maisum', 'mais um pouco',[['mais um pouco, por favor','a little more, please'],['pode trazer mais?','can you bring more?']],'chunk'],
    ['cheio',  'tô cheio',[['tô cheio','I\'m full'],['tô satisfeito, valeu','I\'m satisfied, thanks']],'chunk'],
    ['agua',   'uma água, por favor',[['uma água, por favor','a water, please'],['uma cerveja bem gelada','a nice cold beer']],'slot-phrase'],
    ['prato',  'o prato do dia',[['qual é o prato do dia?','what\'s the dish of the day?'],['vou querer esse aqui','I\'ll have this one']],'chunk'],
   ]},
  {unit_id:'me_vira',title:'Me Vira',emoji:'🧭',sort_order:0.2,category:'survival',context:'transactional',
   situation:'Getting around — where things are, how to get there, and the phrase every traveler needs.',
   bricks:[
    ['ondefica','onde fica ___?',[['onde fica o banheiro?','where\'s the bathroom?'],['onde fica a praia?','where\'s the beach?']],'slot-phrase'],
    ['longe',  'é longe daqui?',[['é longe daqui?','is it far from here?'],['é pertinho, dá pra ir a pé','it\'s close, you can walk']],'chunk'],
    ['comochego','como chego em ___?',[['como chego na praia?','how do I get to the beach?'],['qual o caminho?','which way is it?']],'slot-phrase'],
    ['direita','vira à direita',[['vira à direita','turn right'],['vira à esquerda ali','turn left there']],'chunk'],
    ['reto',   'segue reto',[['segue reto','go straight'],['segue reto e vira na esquina','straight, then turn at the corner']],'chunk'],
    ['ali',    'é ali',[['é ali, ó','it\'s right there'],['é logo ali na frente','it\'s just up ahead']],'chunk'],
    ['busao',  'pega o busão',[['pega o busão','take the bus'],['qual busão vai pro centro?','which bus goes downtown?']],'chunk'],
    ['corrida','quanto é a corrida?',[['quanto é a corrida?','how much is the ride?'],['chama um uber pra mim?','call an uber for me?']],'chunk'],
    ['perdido','tô perdido',[['tô perdido','I\'m lost'],['acho que me perdi','I think I got lost']],'chunk'],
   ]},
  {unit_id:'dia_a_dia',title:'Do Dia a Dia',emoji:'🛒',sort_order:0.3,category:'survival',context:'transactional',
   situation:'Everyday errands — shops, this and that, here and there, the small words that glue it all.',
   bricks:[
    ['esse',   'esse aqui',[['esse aqui','this one here'],['esse ou aquele?','this one or that one?']],'chunk'],
    ['aqui',   'aqui / ali / lá',[['aqui','here'],['ali','right there'],['lá','over there']],'vocab'],
    ['perto',  'aqui perto',[['tem um mercado aqui perto?','is there a market nearby?'],['a farmácia é logo ali','the pharmacy is right there']],'chunk'],
    ['precode','preciso de ___',[['preciso de um remédio','I need a medicine'],['preciso comprar água','I need to buy water']],'slot-phrase'],
    ['temaqui','tem ___ aqui?',[['tem banheiro aqui?','is there a bathroom here?'],['tem wi-fi aqui?','is there wifi here?']],'slot-phrase'],
    ['aberto', 'tá aberto?',[['tá aberto?','is it open?'],['fecha que horas?','what time does it close?']],'chunk'],
    ['procurando','tô procurando ___',[['tô procurando uma farmácia','I\'m looking for a pharmacy'],['tô procurando o mercado','I\'m looking for the market']],'slot-phrase'],
    ['isso',   'é isso mesmo',[['é isso mesmo','that\'s it exactly'],['não, esse não','no, not that one']],'chunk'],
    ['sacola', 'pode pôr na sacola?',[['pode pôr na sacola?','can you put it in a bag?'],['só isso, valeu','that\'s all, thanks']],'chunk'],
   ]},
]

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()
    const{data:bank}=await sb.from('ng_scaffolds').select('id,base_portuguese').eq('user_id',UID)
    const knownId={};(bank||[]).forEach(b=>{knownId[norm(b.base_portuguese)]=b.id})
    let planted=0
    for(const w of WORLDS){
      const{data:existing}=await sb.from('ng_path_units').select('id').eq('user_id',UID).eq('unit_id',w.unit_id).single()
      if(existing)continue
      const ids=[]
      for(const[suf,base,stages]of w.bricks){
        const id='sc_'+w.unit_id+'_'+suf
        const ex=knownId[norm(base)]
        if(ex){ids.push(ex);continue}
        const kind=stages.length===1?'vocab':(base.includes('___')?'slot-phrase':'chunk')
        const{error}=await sb.from('ng_scaffolds').insert({
          id,user_id:UID,base_portuguese:base,base_english:stages[0][1],
          stages:stages.map(([pt,en],i)=>({stage:i+1,pt,en,kind,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})),
          current_stage:1,phase:1,category:w.category,context:w.context,
          cluster:w.unit_id,source:'curriculum',last_practiced:null
        })
        if(!error)ids.push(id)
      }
      await sb.from('ng_path_units').insert({
        user_id:UID,unit_id:w.unit_id,title:w.title,emoji:w.emoji,
        situation:w.situation,scaffold_ids:ids,threshold_days:5,
        sort_order:w.sort_order,is_side_quest:false,level:1
      })
      planted++
      try{await sb.from('ng_brain_log').insert({user_id:UID,process:'seed',thought:`Survival world planted: ${w.title} — ${ids.length} bricks.`,importance:1})}catch(_){}
    }
    return{statusCode:200,body:JSON.stringify({ok:true,planted})}
  }catch(e){
    console.error('ng-seed-survival:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
