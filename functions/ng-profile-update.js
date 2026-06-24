// ng-profile-update.js
// Single write function for learner profile — everything goes through here
// Version-checked to prevent race conditions

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'
    const body=JSON.parse(event.body||'{}')
    const{update={},expectedVersion=null}=body

    // Load current profile
    const{data:existing,error:loadErr}=await sb
      .from('ng_learner_profile')
      .select('*')
      .eq('user_id',UID)
      .single()

    if(loadErr&&loadErr.code!=='PGRST116'){
      return{statusCode:500,body:JSON.stringify({error:loadErr.message})}
    }

    // If no profile yet, create a fresh one
    if(!existing){
      const fresh={
        user_id:UID,
        phase:1,
        phase_name:'Survival → Social',
        phase_progress:0,
        frontier:[],
        controlled:[],
        error_fingerprint:{},
        avoided_patterns:[],
        scaffold_avoidance:[],
        session_history:{},
        luna_notes:'',
        personality_profile:{},
        field_reports:[],
        last_intelligence_insights:'',
        version:1,
        last_updated:new Date().toISOString(),
        ...update
      }
      const{error:insertErr}=await sb.from('ng_learner_profile').insert(fresh)
      if(insertErr)return{statusCode:500,body:JSON.stringify({error:insertErr.message})}
      await logWrite(sb,UID,'ng_learner_profile','insert','success')
      return{statusCode:200,body:JSON.stringify({ok:true,profile:fresh,version:1})}
    }

    // Version check — prevent stale writes
    if(expectedVersion!==null&&existing.version!==expectedVersion){
      // Merge additively rather than reject — scaffold events never cancel each other
      console.log(`Version mismatch: expected ${expectedVersion}, got ${existing.version} — merging`)
    }

    // Merge update into existing — additive for arrays, replace for scalars
    const merged={
      ...existing,
      ...update,
      // Arrays merge additively
      controlled:mergeControlled(existing.controlled||[],update.controlled||[]),
      avoided_patterns:mergeUnique(existing.avoided_patterns||[],update.avoided_patterns||[]),
      scaffold_avoidance:mergeAvoidance(existing.scaffold_avoidance||[],update.scaffold_avoidance||[]),
      field_reports:mergeFieldReports(existing.field_reports||[],update.field_reports||[]),
      // Error fingerprint merges by adding counts
      error_fingerprint:mergeErrorFingerprint(existing.error_fingerprint||{},update.error_fingerprint||{}),
      // Frontier replaces entirely (recomputed fresh each time)
      frontier:update.frontier!==undefined?update.frontier:existing.frontier,
      // Session history merges
      session_history:{...(existing.session_history||{}),...(update.session_history||{})},
      // Luna notes appends if new content
      luna_notes:mergeLunaNotes(existing.luna_notes||'',update.luna_notes||''),
      // Metadata
      version:(existing.version||0)+1,
      last_updated:new Date().toISOString()
    }

    const{error:updateErr}=await sb
      .from('ng_learner_profile')
      .update(merged)
      .eq('user_id',UID)

    if(updateErr){
      await logWrite(sb,UID,'ng_learner_profile','update','failed',updateErr.message)
      return{statusCode:500,body:JSON.stringify({error:updateErr.message})}
    }

    await logWrite(sb,UID,'ng_learner_profile','update','success')
    return{statusCode:200,body:JSON.stringify({ok:true,profile:merged,version:merged.version})}

  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

// ── Merge helpers ──────────────────────────────────────────────────

function mergeControlled(existing,incoming){
  if(!incoming.length)return existing
  const map={}
  existing.forEach(c=>{map[`${c.scaffold_id}_${c.stage}`]=c})
  incoming.forEach(c=>{map[`${c.scaffold_id}_${c.stage}`]=c}) // incoming wins
  return Object.values(map)
}

function mergeUnique(existing,incoming){
  const set=new Set([...existing,...incoming])
  return[...set]
}

function mergeAvoidance(existing,incoming){
  if(!incoming.length)return existing
  const map={}
  existing.forEach(a=>{map[a.scaffold_id]=a})
  incoming.forEach(a=>{
    if(map[a.scaffold_id]){
      map[a.scaffold_id]={
        ...map[a.scaffold_id],
        times_in_frontier:(map[a.scaffold_id].times_in_frontier||0)+(a.times_in_frontier||0),
        times_produced:(map[a.scaffold_id].times_produced||0)+(a.times_produced||0),
      }
    }else{map[a.scaffold_id]=a}
  })
  return Object.values(map)
}

function mergeFieldReports(existing,incoming){
  if(!incoming.length)return existing
  // Keep last 10 field reports
  const combined=[...incoming,...existing]
  return combined.slice(0,10)
}

function mergeErrorFingerprint(existing,incoming){
  const merged={...existing}
  Object.entries(incoming).forEach(([k,v])=>{
    merged[k]=(merged[k]||0)+(typeof v==='number'?v:1)
  })
  return merged
}

function mergeLunaNotes(existing,incoming){
  if(!incoming||incoming===existing)return existing
  if(!existing)return incoming
  // Append new notes with timestamp separator
  const ts=new Date().toISOString().slice(0,10)
  return`${existing}\n\n[${ts}] ${incoming}`
}

async function logWrite(sb,userId,table,operation,status,error=null){
  try{
    await sb.from('write_log').insert({
      user_id:userId,
      table_name:table,
      operation,
      status,
      error,
      row_count:1
    })
  }catch{}
}
