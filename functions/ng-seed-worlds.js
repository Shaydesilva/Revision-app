// ng-seed-worlds.js — plants the early worlds above First Contact:
// ME & YOU (who I am, who you are) and NUMBERS & MONEY (prices, time, counting).
// Hand-authored, register-true, Lego kinds on every brick. Idempotent per world.
// Fired by ng-heartbeat; no-op once planted.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

const WORLDS=[
  {unit_id:'me_and_you',title:'Me & You',emoji:'🤝',sort_order:-2,
   situation:'Who I am, where I\'m from, what I do — and the same questions back. The first real conversation.',
   bricks:[
    ['nome',    'meu nome é ___','My name is ___',[['meu nome é ___','My name is ___'],['pode me chamar de ___','You can call me ___']],'slot-phrase'],
    ['chama',   'como você chama?','What\'s your name?',[['como você chama?','What\'s your name? (street)'],['qual é o seu nome?','What is your name?']],'chunk'],
    ['prazer',  'prazer','Nice to meet you',[['prazer','Nice to meet you'],['prazer, tudo bem?','Nice to meet you, all good?']],'chunk'],
    ['deonde',  'de onde você é?','Where are you from?',[['de onde você é?','Where are you from?'],['cê é daqui?','Are you from here? (street)']],'chunk'],
    ['moro',    'moro aqui perto','I live near here',[['moro aqui perto','I live near here'],['moro aqui há dois anos','I\'ve lived here for two years']],'chunk'],
    ['trabalho','trabalho com ___','I work with ___',[['trabalho com vendas','I work in sales'],['trabalho de casa','I work from home']],'slot-phrase'],
    ['oquefaz', 'o que você faz?','What do you do?',[['o que você faz?','What do you do?'],['cê faz o quê da vida?','What do you do for a living? (street)']],'chunk'],
    ['gosto',   'eu gosto de ___','I like ___',[['eu gosto de futebol','I like football'],['gosto muito daqui','I really like it here']],'slot-phrase'],
    ['tenho',   'tenho ___ anos','I\'m ___ years old',[['tenho trinta anos','I\'m thirty years old']],'slot-phrase'],
    ['voce_e',  'você é ___?','Are you ___?',[['você é carioca?','Are you carioca?'],['cê é casado?','Are you married? (street)']],'slot-phrase'],
   ]},
  {unit_id:'numbers_money',title:'Numbers & Money',emoji:'💰',sort_order:-1,
   situation:'Counting, prices, paying, and time — the survival math of daily Rio.',
   bricks:[
    ['quanto',  'quanto custa?','How much is it?',[['quanto custa?','How much is it?'],['quanto que é?','How much is it? (street)']],'chunk'],
    ['meve',    'me vê ___','Get me ___ (ordering)',[['me vê uma água','Get me a water'],['me vê mais um, por favor','Get me another one, please']],'slot-phrase'],
    ['contae',  'a conta, por favor','The bill, please',[['a conta, por favor','The bill, please'],['fecha a conta pra mim?','Close the bill for me? (street)']],'chunk'],
    ['pagar',   'posso pagar no cartão?','Can I pay by card?',[['posso pagar no cartão?','Can I pay by card?'],['tem pix?','Do you take pix?']],'chunk'],
    ['caro',    'tá caro','That\'s expensive',[['tá caro','That\'s expensive'],['tá barato, bora','That\'s cheap, let\'s go']],'chunk'],
    ['troco',   'tem troco?','Do you have change?',[['tem troco pra cinquenta?','Change for fifty?']],'slot-phrase'],
    ['numeros', 'um, dois, três','One, two, three',[['um, dois, três, quatro, cinco','One to five'],['dez, vinte, cinquenta, cem','Ten, twenty, fifty, a hundred']],'vocab'],
    ['horas',   'que horas são?','What time is it?',[['que horas são?','What time is it?'],['que horas fecha?','What time does it close?']],'chunk'],
    ['quando',  'quando?','When?',[['quando?','When?'],['hoje ou amanhã?','Today or tomorrow?']],'time-word'],
    ['meia',    'meia hora','Half an hour',[['meia hora','Half an hour'],['chego em meia hora','I arrive in half an hour']],'time-word'],
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
