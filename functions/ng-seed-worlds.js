// ng-seed-worlds.js — plants the early worlds above First Contact:
// ME & YOU (who I am, who you are) and NUMBERS & MONEY (prices, time, counting).
// Hand-authored, register-true, Lego kinds on every brick. Idempotent per world.
// Fired by ng-heartbeat; no-op once planted.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

const WORLDS=[
  {unit_id:'me_and_you',title:'Me & You',emoji:'🤝',sort_order:0.4,
   situation:'Who I am, where I\'m from, what I do — and the same questions back. The first real conversation.',
   bricks:[
    ['nome',    'Meu nome é ___','My name is ___',[['Meu nome é ___','My name is ___'],['Pode me chamar de ___','You can call me ___']],'slot-phrase'],
    ['chama',   'Como você chama?','What\'s your name?',[['Como você chama?','What\'s your name? (street)'],['Qual é o seu nome?','What is your name?']],'chunk'],
    ['prazer',  'Prazer','Nice to meet you',[['Prazer','Nice to meet you'],['Prazer, tudo bem?','Nice to meet you, all good?']],'chunk'],
    ['deonde',  'De onde você é?','Where are you from?',[['De onde você é?','Where are you from?'],['Cê é daqui?','Are you from here? (street)']],'chunk'],
    ['moro',    'Moro aqui perto','I live near here',[['Moro aqui perto','I live near here'],['Moro aqui há dois anos','I\'ve lived here for two years']],'chunk'],
    ['trabalho','Trabalho com ___','I work with ___',[['Trabalho com vendas','I work in sales'],['Trabalho de casa','I work from home']],'slot-phrase'],
    ['oquefaz', 'O que você faz?','What do you do?',[['O que você faz?','What do you do?'],['Cê faz o quê da vida?','What do you do for a living? (street)']],'chunk'],
    ['gosto',   'Eu gosto de ___','I like ___',[['Eu gosto de futebol','I like football'],['Gosto muito daqui','I really like it here']],'slot-phrase'],
    ['tenho',   'Tenho ___ anos','I\'m ___ years old',[['Tenho trinta anos','I\'m thirty years old']],'slot-phrase'],
    ['voce_e',  'Você é ___?','Are you ___?',[['Você é carioca?','Are you carioca?'],['Cê é casado?','Are you married? (street)']],'slot-phrase'],
   ]},
  {unit_id:'numbers_money',title:'Numbers & Money',emoji:'💰',sort_order:0.6,
   situation:'Counting, prices, paying, and time — the survival math of daily Rio.',
   bricks:[
    ['quanto',  'Quanto custa?','How much is it?',[['Quanto custa?','How much is it?'],['Quanto que é?','How much is it? (street)']],'chunk'],
    ['meve',    'Me vê ___','Get me ___ (ordering)',[['Me vê uma água','Get me a water'],['Me vê mais um, por favor','Get me another one, please']],'slot-phrase'],
    ['contae',  'A conta, por favor','The bill, please',[['A conta, por favor','The bill, please'],['Fecha a conta pra mim?','Close the bill for me? (street)']],'chunk'],
    ['pagar',   'Posso pagar no cartão?','Can I pay by card?',[['Posso pagar no cartão?','Can I pay by card?'],['Tem pix?','Do you take pix?']],'chunk'],
    ['caro',    'Tá caro','That\'s expensive',[['Tá caro','That\'s expensive'],['Tá barato, bora','That\'s cheap, let\'s go']],'chunk'],
    ['troco',   'Tem troco?','Do you have change?',[['Tem troco pra cinquenta?','Change for fifty?']],'slot-phrase'],
    ['numeros', 'Um, dois, três','One, two, three',[['Um, dois, três, quatro, cinco','One to five'],['Dez, vinte, cinquenta, cem','Ten, twenty, fifty, a hundred']],'vocab'],
    ['horas',   'Que horas são?','What time is it?',[['Que horas são?','What time is it?'],['Que horas fecha?','What time does it close?']],'chunk'],
    ['quando',  'Quando?','When?',[['Quando?','When?'],['Hoje ou amanhã?','Today or tomorrow?']],'time-word'],
    ['meia',    'Meia hora','Half an hour',[['Meia hora','Half an hour'],['Chego em meia hora','I arrive in half an hour']],'time-word'],
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
      for(const[suf,base,baseEn,stages,kind]of w.bricks){
        const id='sc_'+w.unit_id+'_'+suf
        const existing=knownId[norm(base)]
        if(existing){ids.push(existing);continue} // brick survived a reset — relink it
        const{error}=await sb.from('ng_scaffolds').insert({
          id,user_id:UID,base_portuguese:base,base_english:baseEn,
          stages:stages.map(([pt,en],i)=>({stage:i+1,pt,en,kind,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})),
          current_stage:1,phase:1,category:'survival',context:'social',
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
      try{await sb.from('ng_brain_log').insert({user_id:UID,process:'seed',thought:`World planted: ${w.title} — ${ids.length} bricks.`,importance:1})}catch(_){}
    }
    return{statusCode:200,body:JSON.stringify({ok:true,planted})}
  }catch(e){
    console.error('ng-seed-worlds:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
