// ng-nightly-brain.js — The Nightly Brain
// Deep daily run: error autopsy + interference detection, coach's note,
// tomorrow's workout assembly, daily radio dialogue, fluency dials,
// Sunday recap, mission shelf restock, radio opener pre-generation.
// Trigger: first ng-frontier call after 4am Rio, or manual POST.

const{createClient}=require('@supabase/supabase-js')
const{REGISTER_LAW_GENERATE:REGISTER_LAW}=require('./register-law.cjs')
const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,proc,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:proc,thought,data,importance})}catch(_){}
}

async function claude(system,user,maxTokens=1500){
  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:maxTokens,system:REGISTER_LAW+'\n\n'+system,messages:[{role:'user',content:user}]})
  })
  const data=await res.json()
  return(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim()
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const today=new Date(Date.now()-3*3600000).toISOString().slice(0,10) // Rio date

    // Skip if already ran today
    const{data:existing}=await sb.from('ng_daily').select('id,workout').eq('user_id',UID).eq('date',today).single()
    if(existing?.workout)return{statusCode:200,body:JSON.stringify({ok:true,already_ran:true})}
    // A row without a workout = a previous run was killed mid-flight — resume it.

    // ── Load everything ─────────────────────────────────────────────
    const yesterday=new Date(Date.now()-27*3600000).toISOString()
    const[{data:profile},{data:recentEvents},{data:memState},{data:scaffolds}]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffold_events').select('*').eq('user_id',UID).gte('created_at',yesterday).order('created_at'),
      sb.from('ng_memory').select('*').eq('user_id',UID),
      sb.from('ng_scaffolds').select('id,base_portuguese,base_english,category,stages').eq('user_id',UID)
    ])

    const scMap={};(scaffolds||[]).forEach(s=>{scMap[s.id]=s})
    const events=recentEvents||[]
    const mem=memState||[]
    const lunaNotes=profile?.luna_notes||''
    const errorFingerprint=profile?.error_fingerprint||{}
    const confidenceLog=Array.isArray(profile?.confidence_log)?profile.confidence_log:[]

    // Memory summary for prompts
    const strongIds=mem.filter(m=>m.skill==='production'&&m.stability>=21).map(m=>m.scaffold_id)
    const strongSet=new Set(strongIds)
    const controlledPatterns=[...strongSet].map(id=>scMap[id]?.base_portuguese).filter(Boolean)
    const frontierPatterns=(profile?.frontier||[]).slice(0,12).map(f=>`"${f.pt}" (${f.en})`)
    const eventsSummary=events.slice(0,60).map(e=>
      `${e.mode}|${scMap[e.scaffold_id]?.base_portuguese||e.scaffold_id}|s${e.stage}|q${e.quality}`
    ).join('\n')

    // ── 1. ERROR AUTOPSY + INTERFERENCE + COACH NOTE (one deep call) ──
    let analysis={}
    try{
      const raw=await claude(
`You are the nightly analysis brain for a Carioca Portuguese learning system.
The learner lives in Rio and learns street Carioca, not textbook Portuguese.
Analyse the last 24h of learning events. Return JSON only:
{
 "error_autopsy":{"clusters":[{"pattern":"description of error mechanism","examples":[],"prescription":"what drill fixes it"}]},
 "interference":{"english_bleed":[],"spanish_bleed":[],"notes":""},
 "coach_note":"exactly 3 sentences, direct and honest, second person, no fluff. What moved, what's weak, what tomorrow targets.",
 "confident_but_wrong":[{"pattern":"","note":""}],
 "tomorrow_focus":["scaffold ids or pattern texts to target, max 5"]
}`,
`EVENTS (mode|pattern|stage|quality):\n${eventsSummary||'(no activity yesterday)'}\n\nKNOWN ERROR FINGERPRINT:\n${JSON.stringify(errorFingerprint)}\n\nLUNA NOTES:\n${lunaNotes.slice(0,800)}\n\nCONFIDENCE LOG (recent, felt-sure vs actual):\n${JSON.stringify(confidenceLog.slice(-20))}\n\nFRONTIER:\n${frontierPatterns.join('\n')}`,
      1800)
      analysis=JSON.parse(raw)
    }catch(e){console.log('analysis fail:',e.message);analysis={coach_note:events.length?'Analysis unavailable today — data is logged, workout is standard.':'Quiet day yesterday. Today\'s workout keeps everything warm.'}}

    if(analysis.error_autopsy?.clusters?.length){
      await brainLog(sb,'nightly_brain',`Error autopsy: ${analysis.error_autopsy.clusters.length} failure cluster(s) identified. ${analysis.error_autopsy.clusters[0]?.pattern||''}`,analysis.error_autopsy,2)
    }
    if(analysis.interference?.spanish_bleed?.length||analysis.interference?.english_bleed?.length){
      await brainLog(sb,'nightly_brain',`Interference detected: ${(analysis.interference.spanish_bleed||[]).length} Spanish, ${(analysis.interference.english_bleed||[]).length} English bleed patterns. Contrast drills queued.`,analysis.interference,2)
    }

    // Progressive write #1 — coach note + autopsy land even if we're killed later
    await sb.from('ng_daily').upsert({
      user_id:UID,date:today,
      coach_note:analysis.coach_note||'',
      error_autopsy:analysis.error_autopsy||{},
      interference:analysis.interference||{}
    },{onConflict:'user_id,date'})

    // ── 2. TOMORROW'S WORKOUT (pre-assembled) ────────────────────────
    // Due reviews (from memory engine), frontier picks, listening drill, composition, luna seed
    const nowIso=new Date().toISOString()
    const due=mem.filter(m=>m.next_due&&m.next_due<=nowIso)
      .sort((a,b)=>(a.next_due<b.next_due?-1:1)).slice(0,8)
      .map(m=>({scaffold_id:m.scaffold_id,stage:m.stage,skill:m.skill,pt:scMap[m.scaffold_id]?.base_portuguese||''}))
    const focus=(analysis.tomorrow_focus||[]).slice(0,5)
    const frontierPick=(profile?.frontier||[]).slice(0,4).map(f=>({scaffold_id:f.scaffold_id,stage:f.stage,pt:f.pt,en:f.en}))

    let listening=null,composition=null
    try{
      const wk=await claude(
`Generate workout content for a Carioca Portuguese learner. Return JSON only:
{
 "listening":{"pt":"one natural Carioca sentence at street register using mostly known patterns","en":"translation","target_pattern":"the key pattern inside"},
 "composition":{"scenario_en":"vivid Rio scenario under 50 words requiring 2-3 of the given patterns","patterns":["pt strings"]}
}`,
`KNOWN PATTERNS: ${controlledPatterns.slice(0,40).join(', ')}\nFRONTIER: ${frontierPatterns.join(', ')}\nFOCUS TODAY: ${focus.join(', ')||'general'}`,
      700)
      const w=JSON.parse(wk);listening=w.listening;composition=w.composition
    }catch(e){console.log('workout gen fail:',e.message)}

    const workout={
      reviews:due,
      frontier:frontierPick,
      listening,
      composition,
      luna_seed:focus.length?`Weave these into conversation: ${focus.join(', ')}`:'Free conversation',
      estimated_mins:Math.min(15,3+due.length+frontierPick.length*1.5)
    }

    // Progressive write #2 — the workout is the highest-value output; bank it now
    {
      const prodMemP=mem.filter(m=>m.skill==='production')
      const recMemP=mem.filter(m=>m.skill==='recognition')
      const avgStabP=arr=>arr.length?arr.reduce((s,m)=>s+m.stability,0)/arr.length:0
      const dialsP={
        comprehension:Math.min(100,Math.round(avgStabP(recMemP)*2.2)),
        production:Math.min(100,Math.round(avgStabP(prodMemP)*2.0)),
        speed:Math.min(100,Math.round((strongSet.size/197)*140)),
        register:Math.min(100,Math.round(Object.keys(errorFingerprint).length?70-Object.keys(errorFingerprint).length*4:75)),
        projection_weeks:Math.max(1,Math.round((197-strongSet.size)/Math.max(1,(strongSet.size||4)/8)))
      }
      await sb.from('ng_daily').update({workout,fluency_dials:dialsP}).eq('user_id',UID).eq('date',today)
    }

    // ── 3. DAILY RADIO DIALOGUE (script only; TTS on demand) ─────────
    let dialogue=null
    try{
      const showBible=profile?.show_bible||''
      const stationPrompt=profile?.radio_station_prompt||''
      const{data:recentSegsNB}=await sb.from('ng_radio_segments').select('lines')
        .eq('user_id',UID).order('created_at',{ascending:false}).limit(12)
      const recentBeatsNB=(recentSegsNB||[]).map(s=>{
        const ls=Array.isArray(s.lines)?s.lines.slice(0,2):[]
        return ls.map(l=>l.pt).join(' / ')
      }).filter(Boolean).map(b=>'- '+b.slice(0,140)).join('\n')
      const dRaw=await claude(
`Write today's 90-second Radio Carioca dialogue: two hosts, Chico (cynical, dry) and Bia (chaotic, warm), Cariocas.
Humorous, natural street register, swallowed syllables implied in word choice.
FRONTIER BUDGET — STRICT: weave in AT MOST 2 frontier patterns total, each ONCE, only where a Carioca would genuinely say it. Never contort scenes to fit a phrase; most lines contain no target pattern.
FRESH — STRICT: OPEN WITH A COMPLETELY NEW TOPIC. Never open with a running gag or anything from RECENT BEATS. Pick a format: brand-new story / listener message / mock news / debate / game. Show-bible items are one-line callbacks only — never retellings, never openers.
12-16 lines. Return JSON only:
{"lines":[{"speaker":"echo","pt":"","en":""},{"speaker":"shimmer","pt":"","en":""}],"patterns_used":["frontier patterns woven in"],"bible_update":"one line: any new running joke or callback established"}
speaker "echo"=Chico, "shimmer"=Bia.`,
`KNOWN: ${controlledPatterns.slice(0,40).join(', ')}\nFRONTIER: ${frontierPatterns.join(', ')}\nSHOW BIBLE (callbacks only, never openers):\n${showBible.slice(0,600)}\nRECENT BEATS — never retell or open with these:\n${recentBeatsNB||'(none yet)'}\nTOPIC SEED: ${stationPrompt||'daily life in Rio, gossip, beach, absurd situations'}\nRECENT LEARNER CONTEXT: ${lunaNotes.slice(0,300)}`,
      1600)
      dialogue=JSON.parse(dRaw)
      // Update show bible
      if(dialogue.bible_update){
        const newBible=(showBible+'\n'+dialogue.bible_update).split('\n').slice(-15).join('\n')
        await sb.from('ng_learner_profile').update({show_bible:newBible}).eq('user_id',UID)
      }
      // Store as an opener radio segment for instant tune-in
      await sb.from('ng_radio_segments').insert({
        user_id:UID,station:'daily',session_key:'daily_'+today,segment_index:0,
        lines:dialogue.lines||[],is_opener:true,patterns_used:dialogue.patterns_used||[]
      })
    }catch(e){console.log('dialogue fail:',e.message)}

    // ── 4. FLUENCY DIALS ─────────────────────────────────────────────
    const prodMem=mem.filter(m=>m.skill==='production')
    const recMem=mem.filter(m=>m.skill==='recognition')
    const avgStab=arr=>arr.length?arr.reduce((s,m)=>s+m.stability,0)/arr.length:0
    const last30=events.filter(e=>true)
    const dials={
      comprehension:Math.min(100,Math.round(avgStab(recMem)*2.2)),
      production:Math.min(100,Math.round(avgStab(prodMem)*2.0)),
      speed:Math.min(100,Math.round((strongSet.size/197)*140)),
      register:Math.min(100,Math.round(Object.keys(errorFingerprint).length?70-Object.keys(errorFingerprint).length*4:75)),
      projection_weeks:Math.max(1,Math.round((197-strongSet.size)/Math.max(1,(strongSet.size||4)/8)))
    }

    // ── 5. SUNDAY RECAP ──────────────────────────────────────────────
    let weekRecap=null
    const isSunday=new Date(Date.now()-3*3600000).getUTCDay()===0
    if(isSunday){
      try{
        const rRaw=await claude(
`Write a weekly recap for a language learner. Return JSON only:
{"headline":"one punchy line","best_moment":"one sentence","number_that_moved":"one stat sentence","next_week":"one sentence"}`,
`Week's events count: ${events.length}. Controlled: ${strongSet.size}/197 scaffolds strong. Coach analysis: ${analysis.coach_note||''}`,
        400)
        weekRecap=JSON.parse(rRaw)
      }catch(_){}
    }

    // ── 6. MISSION SHELF RESTOCK (opportunities, never obligations) ──
    try{
      const{data:shelf}=await sb.from('ng_missions').select('id').eq('user_id',UID).eq('status','shelf')
      if((shelf||[]).length<3){
        const mRaw=await claude(
`Generate 3 low-pressure real-world Carioca practice opportunities + 3 home Luna-roleplay equivalents.
Casual framing — "next time you happen to be..." never "go do this". Return JSON only:
{"missions":[{"title":"","prompt_pt":"","prompt_en":"","context":"uber|boteco|beach|shop|home_luna","is_home_variant":false}]}`,
`Frontier patterns to weave in: ${frontierPatterns.slice(0,6).join(', ')}`,
        700)
        const parsed=JSON.parse(mRaw)
        const rows=(parsed.missions||[]).slice(0,6).map(m=>({
          user_id:UID,title:m.title,prompt_pt:m.prompt_pt,prompt_en:m.prompt_en,
          context:m.context||'boteco',is_home_variant:!!m.is_home_variant,status:'shelf'
        }))
        if(rows.length)await sb.from('ng_missions').insert(rows)
      }
    }catch(e){console.log('missions fail:',e.message)}

    // ── Path maintenance: side-quests from fresh imports + weakness reorder ──
    try{
      const twoDaysAgo=new Date(Date.now()-48*3600000).toISOString()
      const{data:freshImports}=await sb.from('ng_scaffolds')
        .select('id,base_portuguese').eq('user_id',UID).eq('source','import')
        .gte('created_at',twoDaysAgo)
      if((freshImports||[]).length>=3){
        const sqId='sidequest_'+today.replace(/-/g,'')
        await sb.from('ng_path_units').upsert({
          user_id:UID,unit_id:sqId,title:'Aula do Victor',emoji:'📓',
          situation:"Fresh from your latest lesson — strike while it's hot",
          scaffold_ids:freshImports.map(s=>s.id).slice(0,7),
          sort_order:-1,is_side_quest:true
        },{onConflict:'user_id,unit_id'})
        await brainLog(sb,'path',`Side-quest injected: "${'Aula do Victor'}" with ${Math.min(7,freshImports.length)} patterns from your latest import, placed at the top of the Trilha.`,null,2)
      }
      // Weakness reorder: units containing struggle scaffolds move up
      const struggles=(profile?.struggle_patterns?.by_scaffold)||{}
      if(Object.keys(struggles).length){
        const{data:pUnits}=await sb.from('ng_path_units').select('id,unit_id,scaffold_ids,sort_order,is_side_quest').eq('user_id',UID)
        const scored=(pUnits||[]).filter(u=>!u.is_side_quest).map(u=>({
          ...u,pain:(Array.isArray(u.scaffold_ids)?u.scaffold_ids:[]).reduce((s,id)=>s+(struggles[id]||0),0)
        }))
        const reordered=[...scored].sort((a,b)=>b.pain-a.pain||a.sort_order-b.sort_order)
        for(let i=0;i<reordered.length;i++){
          if(reordered[i].sort_order!==i)await sb.from('ng_path_units').update({sort_order:i}).eq('id',reordered[i].id)
        }
      }
      // Evolution suggestions — units ready to level up get a nudge (max 2)
      const{data:allUnits}=await sb.from('ng_path_units').select('unit_id,title,level,completed_at,is_side_quest').eq('user_id',UID)
      const ready=(allUnits||[]).filter(u=>u.completed_at&&(Date.now()-new Date(u.completed_at).getTime())>=72*3600000).slice(0,2)
      for(const u of ready){
        await brainLog(sb,'path',`"${u.title}" está pronta pra evoluir — nível ${(u.level||1)+1} esperando. O ↑ tá aceso na trilha. Sua decisão.`,null,3)
      }
      // Evolution nudge: units past the 72h cooldown get a brain-log suggestion.
      // Suggest, never auto-evolve — the ↑ has to be the learner's tap.
      try{
        const{data:pu}=await sb.from('ng_path_units').select('unit_id,title,level,completed_at,scaffold_ids').eq('user_id',UID).not('completed_at','is',null)
        for(const u of(pu||[])){
          const hrs=(Date.now()-new Date(u.completed_at).getTime())/3600000
          if(hrs>=72){
            await brainLog(sb,'path',`"${u.title}" has been solid for ${Math.floor(hrs/24)} days — it's ready to evolve to level ${(u.level||1)+1}. The ↑ is waiting on the trilha.`,null,2)
          }
        }
      }catch(_){}
      // RECLUSTER SWEEP: numbered "Da rua" catch-alls get dissolved into
      // NAMED situational units (one Sonnet call, only when they exist).
      // The dumb sweep stays fast at generate-time; the night makes it beautiful.
      try{
        const{data:extraU}=await sb.from('ng_path_units').select('id,unit_id,title,scaffold_ids')
          .eq('user_id',UID).like('title','Da rua ·%')
        if((extraU||[]).length){
          const ids=[...new Set(extraU.flatMap(u=>u.scaffold_ids||[]))]
          if(ids.length){
            const{data:scs}=await sb.from('ng_scaffolds').select('id,base_portuguese,base_english,category').eq('user_id',UID).in('id',ids)
            const listing=(scs||[]).map(s=>`${s.id} | "${s.base_portuguese}" (${s.base_english||''}) [${s.category}]`).join('\n')
            const raw=await claude(
`You cluster leftover Carioca Portuguese patterns into REAL situational learning units. 3-6 patterns per unit, every id placed exactly once. Titles: short evocative PT + emoji. JSON only:
{"units":[{"unit_id":"snake_case","title":"","title_en":"","emoji":"","situation":"one line: the situation these live in","scaffold_ids":[]}]}`,
`PATTERNS TO CLUSTER:\n${listing}`,1400)
            let out=null;try{out=JSON.parse(raw)}catch(_){}
            if(out?.units?.length){
              const placed=new Set()
              const rows=out.units.map((u,i)=>({
                user_id:UID,unit_id:('rc_'+(u.unit_id||('extra'+i))).slice(0,60),
                title:u.title||'Da rua',emoji:u.emoji||'📦',
                situation:(u.title_en?('['+u.title_en+'] '):'')+(u.situation||''),
                scaffold_ids:(u.scaffold_ids||[]).filter(id=>ids.includes(id)&&!placed.has(id)&&(placed.add(id)||true)),
                threshold_days:7,sort_order:900+i,is_side_quest:false,level:1,levels:[]
              })).filter(r=>r.scaffold_ids.length)
              const left=ids.filter(id=>!placed.has(id))
              if(left.length&&rows.length)rows[rows.length-1].scaffold_ids.push(...left)
              if(rows.length){
                await sb.from('ng_path_units').delete().eq('user_id',UID).in('id',extraU.map(u=>u.id))
                await sb.from('ng_path_units').insert(rows)
                await brainLog(sb,'path',`Reclustered ${ids.length} stray patterns from ${extraU.length} catch-alls into ${rows.length} real units: ${rows.map(r=>r.title).join(' · ')}.`,null,2)
              }
            }
          }
        }
      }catch(_){}

      // ORPHAN SWEEP: scaffolds not living in ANY unit (fresh Victor imports,
      // street finds) get adopted into a rolling side-quest unit — the trilha
      // never loses sight of new material.
      try{
        const[{data:allU},{data:allS}]=await Promise.all([
          sb.from('ng_path_units').select('id,unit_id,scaffold_ids').eq('user_id',UID),
          sb.from('ng_scaffolds').select('id,created_at').eq('user_id',UID)
        ])
        const placed=new Set();(allU||[]).forEach(u=>(u.scaffold_ids||[]).forEach(x=>placed.add(x)))
        const orphans=(allS||[]).filter(x=>!placed.has(x.id)).map(x=>x.id)
        if(orphans.length){
          const rua=(allU||[]).find(u=>u.unit_id==='da_rua_novos')
          if(rua){
            const merged=[...new Set([...(rua.scaffold_ids||[]),...orphans])].slice(-12)
            await sb.from('ng_path_units').update({scaffold_ids:merged}).eq('id',rua.id)
          }else{
            await sb.from('ng_path_units').insert({user_id:UID,unit_id:'da_rua_novos',
              title:'Da Rua — Novos',emoji:'📦',
              situation:'[Fresh Finds] O que chegou da rua e do Victor esta semana — pratica e o cérebro reagrupa',
              scaffold_ids:orphans.slice(0,12),threshold_days:7,sort_order:998,is_side_quest:true,level:1,levels:[]})
          }
          await brainLog(sb,'path',`${orphans.length} new pattern${orphans.length>1?'s':''} adopted into "Da Rua — Novos" — nothing you learn goes homeless.`,null,1)
        }
      }catch(_){}

      // LAYER-3 POLICY: atom weights from the last 7 days of atom-tagged events.
      // Atoms you ace get lighter; atoms you fail get heavier (more practice).
      // Bounded 0.5–2.0 — the variety floor: no atom ever vanishes.
      try{
        const since=new Date(Date.now()-7*86400000).toISOString()
        const{data:evs}=await sb.from('ng_scaffold_events').select('mode,quality')
          .eq('user_id',UID).gte('created_at',since).limit(1200)
        const per={}
        for(const e of(evs||[])){
          const m=e.mode
          if(!['timeline','duel','conserta','reorder','cloze'].includes(m))continue
          per[m]=per[m]||{n:0,fail:0};per[m].n++;if((e.quality||0)<3)per[m].fail++
        }
        const w={}
        for(const[m,s]of Object.entries(per)){
          if(s.n<4)continue
          w[m]=Math.max(0.5,Math.min(2,0.7+(s.fail/s.n)*1.8))
        }
        if(Object.keys(w).length){
          await sb.from('ng_learner_profile').update({atom_weights:w}).eq('user_id',UID)
          await brainLog(sb,'path',`Atom policy tuned: ${Object.entries(w).map(([k,v])=>k+'×'+v.toFixed(1)).join(', ')} — the games bend toward your weak spots.`,null,1)
        }
      }catch(_){}
    }catch(pathErr){console.log('path maintenance skipped:',pathErr.message)}

    // ── Brick-kind backfill — classify a batch of unkinded bricks (Calçadão) ──
    // Awaited-send dispatch: the request leaves before this container freezes;
    // ng-brick-kinds does its own chunked, progressive writes.
    try{
      const siteUrlBK=process.env.URL||process.env.DEPLOY_URL||''
      if(siteUrlBK){
        const _ac=new AbortController();const _tm=setTimeout(()=>_ac.abort(),1200)
        await fetch(`${siteUrlBK}/.netlify/functions/ng-brick-kinds`,{method:'POST',body:'{}',signal:_ac.signal}).catch(()=>{})
        clearTimeout(_tm)
        // Register sweep: heal pre-rewire 'a gente' bricks still in the bank
        const _ac2=new AbortController();const _tm2=setTimeout(()=>_ac2.abort(),1200)
        await fetch(`${siteUrlBK}/.netlify/functions/ng-register-sweep`,{method:'POST',body:'{}',signal:_ac2.signal}).catch(()=>{})
        clearTimeout(_tm2)
      }
    }catch(_){}

    // ── Final update — remaining fields (row was created progressively) ──
    await sb.from('ng_daily').update({
      dialogue:dialogue||{},fluency_dials:dials,week_recap:weekRecap
    }).eq('user_id',UID).eq('date',today)

    await brainLog(sb,'nightly_brain',`Deep run complete for ${today}: workout assembled (${due.length} reviews + ${frontierPick.length} frontier), radio dialogue written (${dialogue?.lines?.length||0} lines), dials computed. Coach note is on the home screen.`,{date:today},3)

    return{statusCode:200,body:JSON.stringify({ok:true,date:today,workout_items:due.length+frontierPick.length,dialogue_lines:dialogue?.lines?.length||0})}
  }catch(e){
    console.error('ng-nightly-brain:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
