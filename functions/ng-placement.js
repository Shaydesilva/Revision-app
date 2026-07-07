// ng-placement.js — Text-based placement conversation with Luna
// Actions: chat (adaptive ladder probe), finalize (transcript → placement matrix → fill)

const{createClient}=require('@supabase/supabase-js')
const REGISTER_LAW="CARIOCA REGISTER LAW (mandatory for ALL Portuguese you produce): spoken Rio register only. Use 'voce' never 'tu' (nor tu conjugations). Use 'First-person plural is 'nos', NEVER 'a gente' (this learner's Vidigal register). Agreement is a MIX, mostly REDUCED (nos takes the 3rd-singular verb form: nos vai, nos ta, nos foi, nos tava, nos tem, nos fez); standard 1st-plural also occurs and is the taught anchor (nos estamos, nos vamos, nos fomos, nos estavamos). BOTH correct - favor reduced in casual speech, standard when teaching the paradigm. Future stays periphrastic (nos vamos estar / nos vai estar), never synthetic (estaremos). Contractions by default: to, ta, tamo, pra, pro, ce, ne. Prefer the spoken imperfect/periphrastic past where Rio speech uses it, even when textbook grammar prefers the perfect. Never European or literary forms (no vos, no mesoclise)."
const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,proc,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:proc,thought,data,importance})}catch(_){}
}

async function claude(system,messages,maxTokens=800){
  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:maxTokens,system:REGISTER_LAW+'\n\n'+system,messages})
  })
  const data=await res.json()
  return(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim()
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const{action='chat',messages=[]}=JSON.parse(event.body||'{}')
    const{data:scaffolds}=await sb.from('ng_scaffolds')
      .select('id,base_portuguese,base_english,category,phase,stages').eq('user_id',UID)

    // ═══ CHAT: adaptive probing conversation ═══════════════════════
    if(action==='chat'){
      const bankSample=(scaffolds||[]).map(s=>`${s.id}|P${s.phase}|${s.category}|"${s.base_portuguese}"`).join('\n')
      const reply=await claude(
`You are Luna running a PLACEMENT conversation (text) for a Carioca Portuguese learner.
GOAL: find the learner's competence edge per category in ~15-20 exchanges using an adaptive ladder:
- Start probes at Phase 2. Produce naturally → probe higher. Struggle → probe lower.
- Mix probe types: production ("Como você diria: '[EN]'?"), response (text him a Carioca message, see how he replies), judgment ("Qual soa mais natural: A ou B?").
- Cover the main categories across the conversation. 1 probe per message. Keep it warm and conversational, never exam-like.
- Accept English meta-questions gracefully (note as evidence, keep moving).
- After ~15-18 exchanges (count the user messages), say EXACTLY: "Fechamos! Deixa eu processar isso…" and nothing else — that signals completion.
Scaffold bank (id|phase|category|pattern) for calibration:
${bankSample.slice(0,6000)}`,
        messages.length?messages:[{role:'user',content:'(start the placement)'}],
        500)
      const done=reply.includes('Fechamos! Deixa eu processar')
      return{statusCode:200,body:JSON.stringify({reply,done})}
    }

    // ═══ FINALIZE: transcript → matrix → fill rules → write ════════
    if(action==='finalize'){
      const transcript=messages.map(m=>`${m.role==='assistant'?'Luna':'Shay'}: ${m.content}`).join('\n')
      const bankFull=(scaffolds||[]).map(s=>`${s.id}|P${s.phase}|${s.category}|stages:${s.stages?.length||4}|"${s.base_portuguese}"`).join('\n')

      const raw=await claude(
`Analyse a placement conversation and produce a placement matrix. Return JSON only:
{"matrix":[{"category":"","ceiling_phase":1,"ceiling_stage":2,"confidence":"high|medium|low"}],
"notes":"2 sentences on the learner's level"}
Rules: only claim what the transcript evidences. Production evidence > response > judgment. Be conservative.`,
        [{role:'user',content:`TRANSCRIPT:\n${transcript}\n\nCATEGORIES IN BANK: ${[...new Set((scaffolds||[]).map(s=>s.category))].join(', ')}`}],
        900)
      let matrix=[],notes=''
      try{const p=JSON.parse(raw);matrix=p.matrix||[];notes=p.notes||''}catch(_){}

      // Fill rules
      const ADJ={social_foundation:['dating_register','personality_humour'],
                 dating_register:['social_foundation'],
                 personality_humour:['social_foundation'],
                 deep_fluency:[]}
      const grants=[] // {scaffold_id,stage}
      const boosts=[] // scaffold ids to surface early in frontier
      for(const m of matrix){
        const conf=m.confidence||'low'
        for(const sc of(scaffolds||[])){
          const nStages=sc.stages?.length||4
          // RULE 1 — downward fill in same category (high/medium confidence)
          if(sc.category===m.category&&conf!=='low'){
            if(sc.phase<m.ceiling_phase){
              for(let st=1;st<=Math.min(3,nStages);st++)grants.push({scaffold_id:sc.id,stage:st}) // RULE 3: never stage 4
            }else if(sc.phase===m.ceiling_phase){
              for(let st=1;st<=Math.min(m.ceiling_stage,3,nStages);st++)grants.push({scaffold_id:sc.id,stage:st})
            }
          }
          // RULE 2 — lateral fill (high confidence only, stages 1-2, phase-1 and below)
          if(conf==='high'&&(ADJ[m.category]||[]).includes(sc.category)&&sc.phase<m.ceiling_phase){
            for(let st=1;st<=Math.min(2,nStages);st++)grants.push({scaffold_id:sc.id,stage:st})
          }
          // RULE 4 — medium/low at the edge → boost, not grant
          if(sc.category===m.category&&sc.phase===m.ceiling_phase&&conf!=='high'){
            boosts.push(sc.id)
          }
        }
      }
      // Dedupe grants
      const seen=new Set()
      const unique=grants.filter(g=>{const k=g.scaffold_id+'|'+g.stage;if(seen.has(k))return false;seen.add(k);return true})

      // Write to ng_memory with source:'placement', 7-day stability (self-correcting)
      const now=new Date().toISOString()
      // NEVER downgrade earned memory — load existing keys and skip them
      const{data:existingMem}=await sb.from('ng_memory')
        .select('scaffold_id,stage,skill').eq('user_id',UID)
      const memSet=new Set((existingMem||[]).map(m=>`${m.scaffold_id}|${m.stage}|${m.skill}`))
      const memRows=[]
      for(const g of unique){
        for(const skill of['recognition','production']){
          if(memSet.has(`${g.scaffold_id}|${g.stage}|${skill}`))continue // earned/existing wins
          memRows.push({user_id:UID,scaffold_id:g.scaffold_id,stage:g.stage,skill,
            stability:skill==='production'?21:30,retrievability:1,difficulty:5,
            reps:1,lapses:0,last_review:now,
            next_due:new Date(Date.now()+7*24*3600*1000).toISOString(),
            source:'placement',updated_at:now})
        }
      }
      for(let i=0;i<memRows.length;i+=100){
        await sb.from('ng_memory').insert(memRows.slice(i,i+100))
      }
      // Also merge into legacy controlled (additive only) + boosts + flag
      const{data:profile}=await sb.from('ng_learner_profile').select('controlled,priority_boosts,version').eq('user_id',UID).single()
      const existing=Array.isArray(profile?.controlled)?profile.controlled:[]
      const exSet=new Set(existing.map(c=>c.scaffold_id+'|'+c.stage))
      const merged=[...existing,...unique.filter(g=>!exSet.has(g.scaffold_id+'|'+g.stage)).map(g=>({...g,source:'placement'}))]
      const newBoosts={...(profile?.priority_boosts||{})}
      boosts.slice(0,10).forEach(id=>{newBoosts[id]=(newBoosts[id]||0)+4})
      await sb.from('ng_learner_profile').update({
        controlled:merged,priority_boosts:newBoosts,placement_done:true,
        version:(profile?.version||0)+1,last_updated:now
      }).eq('user_id',UID)

      await brainLog(sb,'placement',`Placement complete: ${unique.length} stages granted across the map, ${boosts.length} patterns boosted to frontier for validation. ${notes||''}`,{granted:unique.length},3)
      return{statusCode:200,body:JSON.stringify({ok:true,granted:unique.length,boosted:boosts.length,matrix,notes})}
    }

    return{statusCode:400,body:JSON.stringify({error:'Unknown action'})}
  }catch(e){
    console.error('ng-placement:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
