// ng-bank-audit.js — hunts ARTIFACTS in the live bank: old imported cards that
// have no good place in today's app. REPORT-ONLY (fail loudly, never delete
// silently) — findings land in ng_brain_log for the Intel feed, and the response
// returns the full list so a human (or a future curator step) decides.
//
// Detector classes:
//   english_in_pt  — Portuguese field contains English words (import junk)
//   empty_or_echo  — missing en, or en identical to pt
//   duplicates     — same normalized base on multiple scaffolds
//   textbook_drift — full forms (estou/estamos/está + pronoun) with NO street
//                    stage anywhere on the scaffold (the 'Eu estou fazendo' class)
//   fragments      — 1-2 word single-stage cards from import sources with no kind
//                    (not curated chunks — leftover word-list entries)

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'
const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()
const EN_WORDS=/\b(the|and|with|you|your|are|was|this|that|what|when|have|from|about|would|could)\b/
const FULLFORM=/\b(eu estou|voc[eê] est[aá]|n[oó]s estamos|estou|estamos)\b/i
const STREET=/\b(t[oô]|t[aá]|tamo|c[eê]|pra|pro|bora)\b/i

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const[{data:scaffolds},{data:units}]=await Promise.all([
      sb.from('ng_scaffolds').select('id,base_portuguese,base_english,stages,source,category').eq('user_id',UID),
      sb.from('ng_path_units').select('scaffold_ids').eq('user_id',UID)
    ])
    const inUnit=new Set();(units||[]).forEach(u=>(u.scaffold_ids||[]).forEach(id=>inUnit.add(id)))

    const report={english_in_pt:[],empty_or_echo:[],duplicates:[],textbook_drift:[],fragments:[],orphans:0}
    const byBase={}
    for(const sc of(scaffolds||[])){
      const stages=Array.isArray(sc.stages)?sc.stages:[]
      const allPt=[sc.base_portuguese,...stages.map(s=>s.pt)].filter(Boolean)
      const allEn=stages.map(s=>s.en).filter(Boolean)
      if(!inUnit.has(sc.id))report.orphans++
      const key=norm(sc.base_portuguese)
      ;(byBase[key]=byBase[key]||[]).push(sc.id)
      if(allPt.some(p=>EN_WORDS.test((p||'').toLowerCase())))
        report.english_in_pt.push({id:sc.id,pt:sc.base_portuguese})
      if(!allEn.length||stages.some(s=>s.pt&&s.en&&norm(s.pt)===norm(s.en)))
        report.empty_or_echo.push({id:sc.id,pt:sc.base_portuguese})
      if(allPt.some(p=>FULLFORM.test(p||''))&&!allPt.some(p=>STREET.test(p||'')))
        report.textbook_drift.push({id:sc.id,pt:sc.base_portuguese,source:sc.source})
      if(stages.length<=1&&(sc.base_portuguese||'').split(' ').length<=2
         &&['victor','suggested','hybrid','self_extend'].includes(sc.source)
         &&!stages.some(s=>s.kind))
        report.fragments.push({id:sc.id,pt:sc.base_portuguese,source:sc.source})
    }
    for(const[base,ids]of Object.entries(byBase))
      if(ids.length>1)report.duplicates.push({base,ids})

    const counts=Object.fromEntries(Object.entries(report).map(([k,v])=>[k,Array.isArray(v)?v.length:v]))
    const total=counts.english_in_pt+counts.empty_or_echo+counts.duplicates+counts.textbook_drift+counts.fragments
    const sample=[...report.textbook_drift,...report.english_in_pt,...report.fragments].slice(0,3).map(x=>`"${x.pt}"`).join(' · ')
    await sb.from('ng_brain_log').insert({user_id:UID,process:'bank_audit',importance:total?2:1,
      thought:total
        ?`Bank audit: ${total} artifact candidate(s) — ${counts.textbook_drift} textbook-drift, ${counts.english_in_pt} english-in-pt, ${counts.fragments} fragments, ${counts.duplicates} duplicate bases, ${counts.empty_or_echo} empty/echo translations. Samples: ${sample}. Report-only — nothing deleted.`
        :'Bank audit: clean. No artifacts detected.',
      data:counts})
    return{statusCode:200,body:JSON.stringify({ok:true,counts,report})}
  }catch(e){
    console.error('ng-bank-audit:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
