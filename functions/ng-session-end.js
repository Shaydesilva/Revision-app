// ng-session-end.js
// Runs after every Next Gen session (any mode)
// Analyses what happened, updates scaffold acquisition, rewrites learner profile

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    const body=JSON.parse(event.body||'{}')
    const{
      mode,           // flashcard|phrase|luna|shuffle|chat
      transcript=[],  // [{role,text}] for luna/chat modes
      events=[],      // [{scaffold_id,stage,quality,produced}] from any mode
      duration_seconds=0
    }=body

    if(!events.length&&!transcript.length){
      return{statusCode:200,body:JSON.stringify({ok:true,message:'No events to process'})}
    }

    // Load current profile and scaffolds
    const[{data:profile},{data:scaffolds}]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffolds').select('id,stages,current_stage,base_portuguese,source,context').eq('user_id',UID)
    ])

    // For Luna/chat modes — analyse transcript with GPT-4o-mini to extract scaffold events
    let analysedEvents=[...events]
    let sessionSummary=''
    let newErrorPatterns={}
    let newLunaNotes=''

    if(transcript.length&&mode==='luna'){
      const frontier=profile?.frontier||[]
      const controlled=profile?.controlled||[]

      const frontierList=frontier.map(f=>`${f.scaffold_id}|${f.pt}`).join('\n')
      const controlledList=controlled.slice(0,20).map(c=>c.scaffold_id).join(', ')
      const transcriptText=transcript.map(t=>`${t.role==='assistant'?'Luna':'Shay'}: ${t.text}`).join('\n')

      const gptRes=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',
        headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'gpt-4o-mini',
          max_tokens:800,
          temperature:0.1,
          response_format:{type:'json_object'},
          messages:[{
            role:'system',
            content:`Analyse a Portuguese learning conversation. Return JSON only.
Frontier scaffolds (what student is working on):
${frontierList}

Judge production ONLY on whether the pattern appeared naturally and correctly.
Accept all Carioca contractions. Never penalise missing accents.`
          },{
            role:'user',
            content:`Transcript:\n${transcriptText}\n\nReturn JSON:
{
  "scaffoldEvents": [
    {
      "scaffold_id": "id from frontier list",
      "stage": 1,
      "quality": 1-5,
      "produced": true/false
    }
  ],
  "errorPatterns": {
    "ser_estar_confusion": 0,
    "formal_register": 0,
    "avoided_conditional": 0
  },
  "avoidedScaffolds": ["scaffold_id that was in frontier but never used"],
  "summary": "2 honest sentences about this session",
  "lunaNotes": "1 sentence for Luna to remember about this learner"
}`
          }]
        })
      })

      const gptData=await gptRes.json()
      try{
        const analysis=JSON.parse(gptData.choices?.[0]?.message?.content||'{}')
        analysedEvents=[...events,...(analysis.scaffoldEvents||[])]
        newErrorPatterns=analysis.errorPatterns||{}
        sessionSummary=analysis.summary||''
        newLunaNotes=analysis.lunaNotes||''

        // Log avoidance
        if(analysis.avoidedScaffolds?.length){
          const avoidanceUpdates=analysis.avoidedScaffolds.map(id=>({
            scaffold_id:id,
            times_in_frontier:1,
            times_produced:0
          }))
          await fetch(`${process.env.URL||''}/.netlify/functions/ng-profile-update`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({update:{scaffold_avoidance:avoidanceUpdates}})
          }).catch(()=>{})
        }
      }catch{}
    }

    // Write all scaffold events to DB
    const now=new Date().toISOString()
    if(analysedEvents.length){
      const eventRows=analysedEvents.map(ev=>({
        user_id:UID,
        scaffold_id:ev.scaffold_id,
        stage:ev.stage,
        mode,
        quality:ev.quality||3,
        produced:ev.produced||false,
        created_at:now
      }))
      await sb.from('ng_scaffold_events').insert(eventRows).catch(()=>{})
    }

    // Check acquisition — did any stage cross the threshold this session?
    const newlyAcquired=[]
    const scaffoldMap={}
    ;(scaffolds||[]).forEach(s=>{scaffoldMap[s.id]=s})

    // Load recent events for acquisition check
    const{data:recentEvents}=await sb
      .from('ng_scaffold_events')
      .select('scaffold_id,stage,mode,quality')
      .eq('user_id',UID)
      .order('created_at',{ascending:false})
      .limit(500)

    // Group events by scaffold+stage
    const stageEvents={}
    ;(recentEvents||[]).forEach(ev=>{
      const key=`${ev.scaffold_id}_${ev.stage}`
      if(!stageEvents[key])stageEvents[key]={total:0,modes:new Set(),qualities:[]}
      stageEvents[key].total++
      stageEvents[key].modes.add(ev.mode)
      stageEvents[key].qualities.push(ev.quality)
    })

    const existingControlled=new Set(
      (profile?.controlled||[]).map(c=>`${c.scaffold_id}_${c.stage}`)
    )

    Object.entries(stageEvents).forEach(([key,data])=>{
      if(existingControlled.has(key))return // already controlled
      const avgQuality=data.qualities.reduce((a,b)=>a+b,0)/data.qualities.length
      if(data.modes.size>=2&&data.total>=3&&avgQuality>=3.5){
        const[scaffoldId,stage]=key.split('_')
        newlyAcquired.push({
          scaffold_id:scaffoldId,
          stage:parseInt(stage),
          acquired_at:now
        })
      }
    })

    // Update profile
    const profileUpdate={
      session_history:{
        last_session:now,
        last_mode:mode,
        [`last_${mode}`]:now
      },
      luna_notes:newLunaNotes,
      error_fingerprint:newErrorPatterns
    }

    if(newlyAcquired.length){
      profileUpdate.controlled=newlyAcquired
    }

    await fetch(`${process.env.URL||''}/.netlify/functions/ng-profile-update`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({update:profileUpdate})
    }).catch(()=>{})

    // Trigger self-extension for newly acquired final stages
    for(const acquired of newlyAcquired){
      const scaffold=scaffoldMap[acquired.scaffold_id]
      if(!scaffold)continue
      const isFinalStage=acquired.stage===scaffold.stages.length
      if(isFinalStage){
        // Fire and forget — generate stage N+1 in background
        fetch(`${process.env.URL||''}/.netlify/functions/ng-self-extend`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({scaffold_id:acquired.scaffold_id})
        }).catch(()=>{})
      }
    }

    // Trigger frontier recompute
    fetch(`${process.env.URL||''}/.netlify/functions/ng-frontier`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({})
    }).catch(()=>{})

    // Check for milestones
    const totalControlled=(profile?.controlled||[]).length+newlyAcquired.length
    await checkMilestones(sb,UID,totalControlled,newlyAcquired,profile?.phase||1)

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ok:true,
        events_processed:analysedEvents.length,
        newly_acquired:newlyAcquired,
        summary:sessionSummary
      })
    }

  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}

async function checkMilestones(sb,userId,totalControlled,newlyAcquired,phase){
  const milestones=[]
  if(newlyAcquired.length>0&&totalControlled===1){
    milestones.push({type:'first_stage_acquired',data:{stage:newlyAcquired[0]}})
  }
  if(totalControlled===10){
    milestones.push({type:'ten_stages_controlled',data:{count:10}})
  }
  if(totalControlled===50){
    milestones.push({type:'fifty_stages_controlled',data:{count:50}})
  }
  if(milestones.length){
    await sb.from('ng_milestones').insert(
      milestones.map(m=>({user_id:userId,...m,seen:false}))
    ).catch(()=>{})
  }
}
