// ng-session-end.js
// Runs after every study/phrase/luna session
// Logs scaffold events, checks acquisition, updates profile

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    const body=JSON.parse(event.body||'{}')
    const{mode,transcript=[],events=[],duration_seconds=0}=body

    console.log('ng-session-end: mode=',mode,'events=',events.length,'transcript=',transcript.length)

    if(!events.length&&!transcript.length){
      return{statusCode:200,body:JSON.stringify({ok:true,message:'No events'})}
    }

    const now=new Date().toISOString()

    // ── Load profile ──────────────────────────────────────────────────
    const{data:profile}=await sb
      .from('ng_learner_profile').select('*').eq('user_id',UID).single()

    // ── For Luna sessions — analyse transcript ────────────────────────
    let analysedEvents=[...events]
    let sessionSummary=''
    let newLunaNotes=''
    let newErrorPatterns={}

    if(transcript.length&&mode==='luna'){
      const frontier=profile?.frontier||[]
      const transcriptText=transcript.map(t=>`${t.role==='assistant'?'Luna':'Shay'}: ${t.text}`).join('\n')
      const frontierList=frontier.map(f=>`${f.scaffold_id}|${f.pt}`).join('\n')
      try{
        const gptRes=await fetch('https://api.openai.com/v1/chat/completions',{
          method:'POST',
          headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
          body:JSON.stringify({
            model:'gpt-4o-mini',max_tokens:600,temperature:0.1,
            response_format:{type:'json_object'},
            messages:[
              {role:'system',content:`Analyse a Portuguese learning conversation. Return JSON only.\nFrontier: ${frontierList}`},
              {role:'user',content:`Transcript:\n${transcriptText}\n\nReturn JSON:{\"scaffoldEvents\":[{\"scaffold_id\":\"string\",\"stage\":1,\"quality\":1-5,\"produced\":true}],\"errorPatterns\":{},\"summary\":\"string\",\"lunaNotes\":\"string\"}`}
            ]
          })
        })
        const gptData=await gptRes.json()
        const analysis=JSON.parse(gptData.choices?.[0]?.message?.content||'{}')
        // Combine: validate GPT events against real scaffold IDs to prevent phantoms
      const gptEvents=analysis.scaffoldEvents||[]
      const manualKeys=new Set(events.map(e=>`${e.scaffold_id}|${e.stage}`))
      const{data:realScaffolds}=await sb.from('ng_scaffolds').select('id').eq('user_id',UID)
      const realIds=new Set((realScaffolds||[]).map(s=>s.id))
      const uniqueGpt=gptEvents.filter(e=>
        !manualKeys.has(`${e.scaffold_id}|${e.stage}`)&&realIds.has(e.scaffold_id)
      )
      analysedEvents=[...events,...uniqueGpt]
        newErrorPatterns=analysis.errorPatterns||{}
        sessionSummary=analysis.summary||''
        newLunaNotes=analysis.lunaNotes||''
      }catch(e){console.log('Luna analysis failed:',e.message)}
    }

    // ── Insert scaffold events ────────────────────────────────────────
    const eventRows=analysedEvents
      .filter(ev=>ev.scaffold_id&&ev.stage)
      .map(ev=>({
        user_id:UID,
        scaffold_id:ev.scaffold_id,
        stage:Number(ev.stage),
        mode,
        quality:Number(ev.quality)||3,
        produced:Boolean(ev.produced),
        created_at:now
      }))

    let eventsInserted=0
    if(eventRows.length){
      const{error:insertErr}=await sb.from('ng_scaffold_events').insert(eventRows)
      if(insertErr){
        console.log('Insert error:',insertErr.message)
      }else{
        eventsInserted=eventRows.length
        console.log('Inserted',eventsInserted,'events')
      }
    }

    // ── Load all events for acquisition check ─────────────────────────
    const{data:allEvents}=await sb
      .from('ng_scaffold_events')
      .select('scaffold_id,stage,mode,quality')
      .eq('user_id',UID)
      .order('created_at',{ascending:false})
      .limit(1000)

    console.log('Total events in DB:',allEvents?.length||0)

    // ── Group by scaffold+stage ───────────────────────────────────────
    const stageMap={}
    ;(allEvents||[]).forEach(ev=>{
      // Use pipe separator to avoid splitting on underscores in scaffold IDs
      const key=`${ev.scaffold_id}|${ev.stage}`
      if(!stageMap[key])stageMap[key]={total:0,modes:new Set(),qualities:[]}
      stageMap[key].total++
      stageMap[key].modes.add(ev.mode)
      stageMap[key].qualities.push(Number(ev.quality))
    })

    // ── Check acquisition ─────────────────────────────────────────────
    const existingControlled=new Set(
      (profile?.controlled||[]).map(c=>`${c.scaffold_id}|${c.stage}`)
    )

    const newlyAcquired=[]
    Object.entries(stageMap).forEach(([key,data])=>{
      if(existingControlled.has(key))return
      const avgQuality=data.qualities.reduce((a,b)=>a+b,0)/data.qualities.length
      // Acquire after: 3 sessions avgQ≥3, OR 2 modes+2 sessions avgQ≥3.5
      const acquired=(data.total>=3&&avgQuality>=3)||(data.modes.size>=2&&data.total>=2&&avgQuality>=3.5)
      if(acquired){
        // CORRECT split: scaffold_id uses pipe separator
        const pipeIdx=key.indexOf('|')
        const scaffoldId=key.substring(0,pipeIdx)
        const stage=parseInt(key.substring(pipeIdx+1))
        if(scaffoldId&&!isNaN(stage)){
          newlyAcquired.push({scaffold_id:scaffoldId,stage,acquired_at:now,review_count:0,last_review:null})
          console.log('Acquired:',scaffoldId,'stage',stage)
        }
      }
    })

    // ── Track struggle patterns + auto failure boost ───────────────────
    const dontKnowEvents=analysedEvents.filter(ev=>Number(ev.quality)<=1&&ev.mode==='write')
    if(dontKnowEvents.length){
      const existingStruggles=profile?.struggle_patterns||{by_scaffold:{},by_category:{},total:0}
      const byScaffold={...(existingStruggles.by_scaffold||{})}
      dontKnowEvents.forEach(ev=>{byScaffold[ev.scaffold_id]=(byScaffold[ev.scaffold_id]||0)+1})
      const currentBoosts={...(profile?.priority_boosts||{})}
      dontKnowEvents.forEach(ev=>{currentBoosts[ev.scaffold_id]=Math.min((currentBoosts[ev.scaffold_id]||0)+4,20)})
      await sb.from('ng_learner_profile').update({
        struggle_patterns:{by_scaffold:byScaffold,total:(existingStruggles.total||0)+dontKnowEvents.length},
        priority_boosts:currentBoosts
      }).eq('user_id',UID).catch(e=>console.log('Struggle update:',e.message))
    }

    // ── Handle review outcomes ────────────────────────────────────────
    const SR_INTERVALS=[1,3,7,21,60,180]
    let updatedControlled=[...(profile?.controlled||[])]

    // Process review card outcomes
    const reviewEvents=analysedEvents.filter(ev=>ev.isReview)
    for(const rev of reviewEvents){
      const idx=updatedControlled.findIndex(c=>c.scaffold_id===rev.scaffold_id&&c.stage===Number(rev.stage))
      if(idx>=0){
        const remembered=Number(rev.quality)>=4
        if(remembered){
          const count=updatedControlled[idx].review_count||0
          updatedControlled[idx]={...updatedControlled[idx],review_count:Math.min(count+1,5),last_review:now}
        }else{
          updatedControlled.splice(idx,1) // back to frontier
        }
      }
    }

    // Add newly acquired (avoid duplicates)
    const controlledKeys=new Set(updatedControlled.map(c=>`${c.scaffold_id}|${c.stage}`))
    for(const acq of newlyAcquired){
      const k=`${acq.scaffold_id}|${acq.stage}`
      if(!controlledKeys.has(k)){
        updatedControlled.push(acq)
        controlledKeys.add(k)
      }
    }

    // ── Write profile ─────────────────────────────────────────────────
    const currentSession=profile?.session_history||{}
    const{error:profileErr}=await sb.from('ng_learner_profile').upsert({
      user_id:UID,
      controlled:updatedControlled,
      session_history:{...currentSession,last_session:now,last_mode:mode,[`last_${mode}`]:now},
      ...(newLunaNotes?{luna_notes:newLunaNotes}:{}),
      ...(Object.keys(newErrorPatterns).length?{error_fingerprint:{...(profile?.error_fingerprint||{}),...newErrorPatterns}}:{}),
      version:(profile?.version||0)+1,
      last_updated:now
    },{onConflict:'user_id',ignoreDuplicates:false})

    if(profileErr)console.log('Profile write error:',profileErr.message)
    else console.log('Profile updated, controlled count:',updatedControlled.length)

    // ── Milestones ────────────────────────────────────────────────────
    const totalControlled=updatedControlled.length
    if(newlyAcquired.length){
      const milestones=[]
      if(totalControlled===1)milestones.push({user_id:UID,milestone_type:'first_stage_acquired',milestone_data:{stage:newlyAcquired[0]},seen:false})
      if(totalControlled===10)milestones.push({user_id:UID,milestone_type:'ten_stages_controlled',milestone_data:{count:10},seen:false})
      if(totalControlled===25)milestones.push({user_id:UID,milestone_type:'twenty_five_stages',milestone_data:{count:25},seen:false})
      if(milestones.length)await sb.from('ng_milestones').insert(milestones).catch(()=>{})
    }

    // ── Self-extend for final stage acquisitions ──────────────────────
    if(newlyAcquired.length){
      const{data:scaffolds}=await sb
        .from('ng_scaffolds').select('id,stages').eq('user_id',UID)
        .in('id',newlyAcquired.map(a=>a.scaffold_id))
      const scaffoldMap={}
      ;(scaffolds||[]).forEach(s=>{scaffoldMap[s.id]=s})
      for(const acq of newlyAcquired){
        const sc=scaffoldMap[acq.scaffold_id]
        if(sc&&acq.stage===sc.stages?.length){
          fetch(`/.netlify/functions/ng-self-extend`,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({scaffold_id:acq.scaffold_id})
          }).catch(()=>{})
        }
      }
    }

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ok:true,
        events_inserted:eventsInserted,
        newly_acquired:newlyAcquired,
        total_controlled:updatedControlled.length,
        summary:sessionSummary
      })
    }

  }catch(e){
    console.error('ng-session-end crash:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
