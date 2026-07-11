// ng-curriculum-v2.js — one-shot reconciler applying Curriculum V2 to the LIVE bank.
// The seed transform only reaches fresh plants (replant is skip-if-exists), so this
// updates ladders in place, resequences units, and removes the First Contact dupes.
// Idempotent: guarded by a brain_log marker. Fired by ng-heartbeat.

const{createClient}=require('@supabase/supabase-js')
const{SEED}=require('./ng-seed-trilha.js')
const UID='00000000-0000-0000-0000-000000000001'
const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()
const flags=(st,i)=>({stage:i+1,pt:st.pt,en:st.en,acquired:false,acquired_at:null,practice_count:0,modes_used:[],...(st.kind?{kind:st.kind}:{})})
// old bases whose text no longer appears anywhere in the new ladders
const OLDBASES={'tinha muitnos la':'tinha muita gente lá','falei com o victor de manha':'falei com ele de manhã'}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{data:done}=await sb.from('ng_brain_log').select('id').eq('user_id',UID).eq('process','curriculum_v2').limit(1)
    if(done&&done.length)return{statusCode:200,body:JSON.stringify({ok:true,already:true})}

    const seed=JSON.parse(SEED)
    const{data:bank}=await sb.from('ng_scaffolds').select('id,base_portuguese,stages').eq('user_id',UID)
    const byText={}
    for(const b of(bank||[])){
      byText[norm(b.base_portuguese)]=byText[norm(b.base_portuguese)]||b.id
      for(const st of(b.stages||[]))if(st.pt&&!byText[norm(st.pt)])byText[norm(st.pt)]=b.id
    }
    for(const[oldB,newB]of Object.entries(OLDBASES)){if(byText[oldB]&&!byText[norm(newB)])byText[norm(newB)]=byText[oldB]}

    // 1. Reconcile every seeded scaffold: update in place, or insert + attach.
    const used=new Set(),attach={}
    let updated=0,inserted=0
    for(const ns of(seed.new_scaffolds||[])){
      const sc=ns.scaffold
      let id=byText[norm(sc.base_portuguese)]
      if(!id)for(const st of(sc.stages||[])){id=byText[norm(st.pt)];if(id)break}
      if(id&&used.has(id))id=null // same old row already claimed (the split unit) — insert as new
      if(id){
        used.add(id)
        const{error}=await sb.from('ng_scaffolds').update({
          base_portuguese:sc.base_portuguese,base_english:sc.base_english,
          stages:(sc.stages||[]).map(flags)
        }).eq('id',id).eq('user_id',UID)
        if(!error)updated++
      }else{
        const nid='sc_v2_'+Math.random().toString(36).slice(2,8)
        const{error}=await sb.from('ng_scaffolds').insert({
          id:nid,user_id:UID,base_portuguese:sc.base_portuguese,base_english:sc.base_english,
          stages:(sc.stages||[]).map(flags),current_stage:1,phase:sc.phase||1,
          category:sc.category||'social_foundation',context:sc.context||'social',
          cluster:ns.unit_id,source:'curriculum',last_practiced:null
        })
        if(!error){inserted++;(attach[ns.unit_id]=attach[ns.unit_id]||[]).push(nid)}
      }
    }
    // 2. Attach new bricks + resequence every unit.
    const{data:units}=await sb.from('ng_path_units').select('id,unit_id,scaffold_ids,sort_order').eq('user_id',UID)
    const orderOf={};(seed.units||[]).forEach(u=>orderOf[u.unit_id]=u.sort_order)
    orderOf.first_contact=-3;orderOf.me_and_you=-2;orderOf.numbers_money=-1
    for(const u of(units||[])){
      const upd={}
      if(orderOf[u.unit_id]!==undefined&&u.sort_order!==orderOf[u.unit_id])upd.sort_order=orderOf[u.unit_id]
      if(attach[u.unit_id])upd.scaffold_ids=[...new Set([...(u.scaffold_ids||[]),...attach[u.unit_id]])]
      if(u.unit_id==='first_contact'){
        // dedupe: kit_socorro owns 'como se fala' / 'o que significa'
        upd.scaffold_ids=(upd.scaffold_ids||u.scaffold_ids||[]).filter(id=>id!=='sc_fc_comofala'&&id!=='sc_fc_oquee')
      }
      if(Object.keys(upd).length)await sb.from('ng_path_units').update(upd).eq('id',u.id)
    }
    await sb.from('ng_scaffolds').delete().eq('user_id',UID).in('id',['sc_fc_comofala','sc_fc_oquee'])
    await sb.from('ng_scaffolds').update({base_portuguese:'Pode ser',base_english:'Could be / sure',
      stages:[flags({pt:'Pode ser',en:'Could be / sure'},0),flags({pt:'Pode ser, bora',en:"Could be — let's go"},1)]
    }).eq('id','sc_fc_sim_nao').eq('user_id',UID)

    await sb.from('ng_brain_log').insert({user_id:UID,process:'curriculum_v2',importance:2,
      thought:`Curriculum V2 applied: ${updated} ladders rebuilt (easiest cell first), ${inserted} new bricks planted into the empty rooms, Pillar B resequenced (single tenses before the per-verb labs), First Contact deduped, the 'muitnós' rewire artifact healed.`})
    return{statusCode:200,body:JSON.stringify({ok:true,updated,inserted})}
  }catch(e){
    console.error('ng-curriculum-v2:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
