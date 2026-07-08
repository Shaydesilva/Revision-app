// ng-memory.js — The Memory Engine
// FSRS-style stability/retrievability model per (scaffold, stage, skill).
// Actions: review (update after an answer), due (list items due), backfill (bootstrap from event history), state (full memory map)

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,proc,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:proc,thought,data,importance})}catch(_){}
}

// ── FSRS-lite core ─────────────────────────────────────────────────
// retrievability R = exp(ln(0.9) * elapsed_days / stability)
function retrievability(stabilityDays,elapsedDays){
  if(stabilityDays<=0)return 0
  return Math.exp(Math.log(0.9)*elapsedDays/stabilityDays)
}
// After a review, stability grows on success (more when R was low — desirable difficulty),
// collapses on failure.
function nextStability(S,D,R,success){
  if(success){
    const growth=1+Math.exp(1.2)*(11-D)*Math.pow(S,-0.05)*(Math.exp((1-R)*1.4)-1)*0.35
    return Math.min(S*growth,365)
  }
  // Lapse: stability drops hard but keeps a floor proportional to history
  return Math.max(0.5,S*0.25*Math.pow(R,0.4))
}
function nextDifficulty(D,quality){
  // quality 1-5 → difficulty drifts down when easy, up when hard
  const delta=(3-quality)*0.35
  return Math.min(10,Math.max(1,D+delta))
}
function dueDate(stabilityDays){
  // schedule at the point R is predicted to hit ~0.90
  return new Date(Date.now()+stabilityDays*24*3600*1000).toISOString()
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const body=JSON.parse(event.body||'{}')
    const{action='due'}=body

    // ═══ REVIEW: update memory after an answer ═══════════════════════
    if(action==='review'){
      const{scaffold_id,stage,skill='production',quality=3}=body
      if(!scaffold_id||!stage)return{statusCode:400,body:JSON.stringify({error:'scaffold_id+stage required'})}
      const success=quality>=3
      const{data:row}=await sb.from('ng_memory').select('*')
        .eq('user_id',UID).eq('scaffold_id',scaffold_id).eq('stage',stage).eq('skill',skill).single()

      const now=new Date().toISOString()
      if(!row){
        // First encounter
        const S=success?(quality>=4?3:1.5):0.5
        const D=nextDifficulty(5,quality)
        await sb.from('ng_memory').insert({
          user_id:UID,scaffold_id,stage,skill,
          stability:S,retrievability:1,difficulty:D,
          reps:1,lapses:success?0:1,last_review:now,next_due:dueDate(S),updated_at:now
        })
        return{statusCode:200,body:JSON.stringify({ok:true,stability:S,created:true})}
      }
      const elapsed=row.last_review?(Date.now()-new Date(row.last_review).getTime())/(24*3600*1000):0
      const R=retrievability(row.stability,elapsed)
      const S=nextStability(row.stability,row.difficulty,R,success)
      const D=nextDifficulty(row.difficulty,quality)
      await sb.from('ng_memory').update({
        stability:S,retrievability:1,difficulty:D,
        reps:row.reps+1,lapses:row.lapses+(success?0:1),
        last_review:now,next_due:dueDate(S),updated_at:now
      }).eq('id',row.id)
      return{statusCode:200,body:JSON.stringify({ok:true,stability:S,retrievability_at_review:R})}
    }

    // ═══ DUE: items whose predicted R has decayed most ═══════════════
    if(action==='due'){
      const{limit=15,skill=null}=body
      let q=sb.from('ng_memory').select('*').eq('user_id',UID)
        .lte('next_due',new Date().toISOString())
        .order('next_due',{ascending:true}).limit(limit)
      if(skill)q=q.eq('skill',skill)
      const{data:due}=await q
      // Compute live retrievability for display
      const enriched=(due||[]).map(d=>{
        const elapsed=d.last_review?(Date.now()-new Date(d.last_review).getTime())/(24*3600*1000):0
        return{...d,live_r:Math.round(retrievability(d.stability,elapsed)*100)/100}
      })
      return{statusCode:200,body:JSON.stringify({due:enriched})}
    }

    // ═══ STATE: full memory map (feeds Constellation + workout) ══════
    if(action==='state'){
      const{data:all}=await sb.from('ng_memory').select('*').eq('user_id',UID)
      const nowMs=Date.now()
      const state=(all||[]).map(m=>{
        const elapsed=m.last_review?(nowMs-new Date(m.last_review).getTime())/(24*3600*1000):0
        return{
          scaffold_id:m.scaffold_id,stage:m.stage,skill:m.skill,
          stability:m.stability,
          live_r:Math.round(retrievability(m.stability,elapsed)*100)/100,
          reps:m.reps,lapses:m.lapses,source:m.source
        }
      })
      // Derived "controlled": production stability >= 21 days
      const controlled=state.filter(s=>s.skill==='production'&&s.stability>=21)
        .map(s=>({scaffold_id:s.scaffold_id,stage:s.stage}))
      return{statusCode:200,body:JSON.stringify({state,controlled_derived:controlled})}
    }

    // ═══ BACKFILL: bootstrap memory from existing event history ══════
    if(action==='backfill'){
      const{data:events}=await sb.from('ng_scaffold_events')
        .select('scaffold_id,stage,mode,quality,created_at')
        .eq('user_id',UID).order('created_at',{ascending:true}).limit(2000)
      const{data:profile}=await sb.from('ng_learner_profile')
        .select('controlled').eq('user_id',UID).single()

      // Replay history through the model
      const mem={} // key → {S,D,reps,lapses,last}
      for(const ev of(events||[])){
        const skill=(ev.mode==='flashcard')?'recognition':'production'
        const key=`${ev.scaffold_id}|${ev.stage}|${skill}`
        const success=(ev.quality||3)>=3
        const t=new Date(ev.created_at).getTime()
        if(!mem[key]){
          mem[key]={S:success?(ev.quality>=4?3:1.5):0.5,D:nextDifficulty(5,ev.quality||3),reps:1,lapses:success?0:1,last:t}
        }else{
          const m=mem[key]
          const elapsed=(t-m.last)/(24*3600*1000)
          const R=retrievability(m.S,elapsed)
          m.S=nextStability(m.S,m.D,R,success)
          m.D=nextDifficulty(m.D,ev.quality||3)
          m.reps++;if(!success)m.lapses++
          m.last=t
        }
      }
      // Anything in legacy controlled but with thin events gets a stability floor
      const legacyControlled=Array.isArray(profile?.controlled)?profile.controlled:[]
      for(const c of legacyControlled){
        const key=`${c.scaffold_id}|${c.stage}|production`
        if(!mem[key]||mem[key].S<21){
          mem[key]={...(mem[key]||{D:5,reps:3,lapses:0,last:Date.now()}),S:Math.max(mem[key]?.S||0,21)}
        }
      }
      // Write rows
      const rows=Object.entries(mem).map(([key,m])=>{
        const[scaffold_id,stage,skill]=key.split('|')
        return{
          user_id:UID,scaffold_id,stage:Number(stage),skill,
          stability:m.S,retrievability:1,difficulty:m.D,
          reps:m.reps,lapses:m.lapses,
          last_review:new Date(m.last).toISOString(),
          next_due:dueDate(m.S),source:'backfill',updated_at:new Date().toISOString()
        }
      })
      // Upsert in chunks
      for(let i=0;i<rows.length;i+=100){
        await sb.from('ng_memory').upsert(rows.slice(i,i+100),{onConflict:'user_id,scaffold_id,stage,skill'})
      }
      await brainLog(sb,'memory',`Memory engine backfilled: ${rows.length} memory states reconstructed from full event history. Every pattern now has its own decay curve.`,{count:rows.length},3)
      return{statusCode:200,body:JSON.stringify({ok:true,backfilled:rows.length})}
    }

    // ═══ KNOW: 'I know this' — a trusted prior, not a rep ═══════════
    // No-assumption principle: outside knowledge (Victor, Vidigal, life) is
    // accommodated without proof-of-knowledge grinding. Writes a 30-day
    // production+recognition prior and marks the stage controlled. Decay
    // self-corrects if the tap was optimistic. Never inserts a ledger event —
    // priors are beliefs, reps are evidence.
    if(action==='know'){
      const{scaffold_id,stage=1}=body
      if(!scaffold_id)return{statusCode:400,body:JSON.stringify({error:'scaffold_id required'})}
      const due=new Date(Date.now()+30*86400000).toISOString()
      for(const skill of['production','recognition']){
        await sb.from('ng_memory').upsert({
          user_id:UID,scaffold_id,stage:Number(stage),skill,
          stability:30,difficulty:4,next_due:due,
          last_review:new Date().toISOString(),reps:1,lapses:0
        },{onConflict:'user_id,scaffold_id,stage,skill'})
      }
      const{data:prof}=await sb.from('ng_learner_profile').select('controlled').eq('user_id',UID).single()
      const controlled=Array.isArray(prof?.controlled)?prof.controlled:[]
      if(!controlled.some(c=>c.scaffold_id===scaffold_id&&Number(c.stage)===Number(stage))){
        controlled.push({scaffold_id,stage:Number(stage),acquired_at:new Date().toISOString(),review_count:0,last_review:null,source:'known'})
        await sb.from('ng_learner_profile').update({controlled}).eq('user_id',UID)
      }
      return{statusCode:200,body:JSON.stringify({ok:true,scaffold_id,stage:Number(stage)})}
    }

    return{statusCode:400,body:JSON.stringify({error:'Unknown action'})}
  }catch(e){
    console.error('ng-memory:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
