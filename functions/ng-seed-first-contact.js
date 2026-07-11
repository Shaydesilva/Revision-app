// ng-seed-first-contact.js — plants the FIRST CONTACT world: the true zero.
// Capacity for everyone: greetings, courtesy, and the conversation-survival kit
// (the Can-Do that makes every other Can-Do learnable on the street).
// Hand-authored, register-true — street forms taught beside standard anchors.
// Idempotent: no-op if the unit already exists. Fired by ng-heartbeat.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

const BRICKS=[
  // [id-suffix, base_pt, base_en, stages:[[pt,en],...], kind]
  ['oi',        'Oi, tudo bem?','Hi, all good?',[['Oi, tudo bem?','Hi, all good?'],['E aí, de boa?','Hey, all good? (street)']],'chunk'],
  ['eai',       'E aí?','What\'s up?',[['E aí?','What\'s up?'],['E aí, beleza?','What\'s up, all good?']],'chunk'],
  ['beleza',    'Beleza','All good / deal',[['Beleza','All good / deal'],['Beleza, fechou','Cool, done deal']],'chunk'],
  ['valeu',     'Valeu','Thanks (street)',[['Valeu','Thanks (street)'],['Valeu, irmão','Thanks, brother']],'chunk'],
  ['deboa',     'De boa','All good / relaxed',[['De boa','All good / relaxed'],['Tô de boa','I\'m all good']],'chunk'],
  ['naoentendi','Não entendi','I didn\'t understand',[['Não entendi','I didn\'t understand'],['Não entendi nada','I didn\'t understand anything']],'chunk'],
  ['falade',    'Fala de novo?','Say it again?',[['Fala de novo?','Say it again?'],['Fala mais devagar, por favor','Speak slower, please']],'chunk'],
  ['desculpa',  'Desculpa','Sorry',[['Desculpa','Sorry'],['Foi mal','My bad (street)']],'chunk'],
  ['licenca',   'Com licença','Excuse me',[['Com licença','Excuse me']],'chunk'],
  ['tchau',     'Tchau','Bye',[['Tchau','Bye'],['Até mais','See you later']],'chunk'],
  ['bora',      'Bora','Let\'s go',[['Bora','Let\'s go'],['Bora amanhã?','Shall we go tomorrow?']],'chunk'],
  ['podeser',   'Pode ser','Could be / sure',[['Pode ser','Could be / sure'],['Pode ser, bora',"Could be — let's go"]],'chunk'],
  ['meajuda',   'Me ajuda?','Can you help me?',[['Me ajuda?','Can you help me?'],['Me ajuda com isso, por favor?','Help me with this, please?']],'slot-phrase'],
  ['soude',     'Eu sou de ___','I\'m from ___',[['Eu sou da Inglaterra','I\'m from England'],['Moro no Vidigal','I live in Vidigal']],'slot-phrase'],
]

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{data:existing}=await sb.from('ng_path_units').select('id').eq('user_id',UID).eq('unit_id','first_contact').single()
    if(existing)return{statusCode:200,body:JSON.stringify({ok:true,already:true})}

    // Bank-aware: don't duplicate bricks the learner already has
    const{data:bank}=await sb.from('ng_scaffolds').select('id,base_portuguese').eq('user_id',UID)
    const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()
    const knownId={};(bank||[]).forEach(b=>{knownId[norm(b.base_portuguese)]=b.id})

    const ids=[]
    for(const[suf,base,baseEn,stages,kind]of BRICKS){
      const id='sc_fc_'+suf
      const existing=knownId[norm(base)]
      if(existing){ids.push(existing);continue} // brick survived a reset — relink it
      const{error}=await sb.from('ng_scaffolds').insert({
        id,user_id:UID,base_portuguese:base,base_english:baseEn,
        stages:stages.map(([pt,en],i)=>({stage:i+1,pt,en,kind,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})),
        current_stage:1,phase:1,category:'survival',context:'social',
        cluster:'first_contact',source:'curriculum',last_practiced:null
      })
      if(!error)ids.push(id)
    }
    await sb.from('ng_path_units').insert({
      user_id:UID,unit_id:'first_contact',title:'First Contact',emoji:'👋',
      situation:'The true zero: greet, thank, apologize, leave — and the conversation-survival kit that makes every other world learnable on the street.',
      scaffold_ids:ids,threshold_days:5,sort_order:-3,is_side_quest:false,level:1
    })
    try{await sb.from('ng_brain_log').insert({user_id:UID,process:'seed',thought:`First Contact planted — ${ids.length} foundational bricks, from “oi” up. The shelf now starts at absolute zero.`,importance:2})}catch(_){}
    return{statusCode:200,body:JSON.stringify({ok:true,planted:ids.length})}
  }catch(e){
    console.error('ng-seed-first-contact:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
