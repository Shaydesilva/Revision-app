// ng-heartbeat.js — The always-on watcher.
// Cheap: mostly local logic, Haiku only for observation thoughts.
// Dispatches expensive jobs (nightly brain, speculative radio, coach sweeps).
// Trigger: Netlify schedule (netlify.toml: [functions."ng-heartbeat"] schedule="*/20 * * * *")
// AND client ping on app open / every 5 min while app is foregrounded.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,process,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process,thought,data,importance})}catch(_){}
}
async function haiku(prompt,maxTokens=200){
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:maxTokens,
        messages:[{role:'user',content:prompt}]})
    })
    const d=await r.json()
    return(d.content?.[0]?.text||'').trim()
  }catch(_){return''}
}

exports.handler=async(event)=>{
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const siteUrl=process.env.URL||process.env.DEPLOY_URL||''
    const now=Date.now()
    const nowIso=new Date(now).toISOString()
    const rioNow=new Date(now-3*3600000)
    const today=rioNow.toISOString().slice(0,10)
    const actions=[]

    // ── Load heartbeat state + recent signals in parallel ────────────
    const[{data:hb},{data:recentEvents},{data:daily},{data:dueMem},{data:openerToday}]=await Promise.all([
      sb.from('ng_heartbeat_state').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffold_events').select('scaffold_id,mode,quality,created_at')
        .eq('user_id',UID).gte('created_at',new Date(now-3600000).toISOString())
        .order('created_at',{ascending:false}).limit(60),
      sb.from('ng_daily').select('id,date,workout').eq('user_id',UID).eq('date',today).single(),
      sb.from('ng_memory').select('scaffold_id,stage').eq('user_id',UID)
        .lte('next_due',nowIso).limit(50),
      sb.from('ng_radio_segments').select('id').eq('user_id',UID).eq('is_opener',true)
        .gte('created_at',today+'T00:00:00').limit(1)
    ])

    // Rate-limit: min 4 minutes between beats (client pings can be chatty)
    if(hb?.last_beat&&(now-new Date(hb.last_beat).getTime())<4*60*1000){
      return{statusCode:200,body:JSON.stringify({ok:true,skipped:'too_soon'})}
    }
    const beatsToday=(hb?.beat_date===today?(hb?.beats_today||0):0)+1
    await sb.from('ng_heartbeat_state').upsert({
      user_id:UID,last_beat:nowIso,beats_today:beatsToday,beat_date:today,
      last_coach_check:hb?.last_coach_check||null,
      last_speculative:hb?.last_speculative||null,
      last_weekly_refit:hb?.last_weekly_refit||null
    },{onConflict:'user_id'})

    const events=recentEvents||[]
    const activeSession=events.length&&(now-new Date(events[0].created_at).getTime())<10*60*1000

    // ── 1. Nightly brain missing? Dispatch. ──────────────────────────
    if(!daily?.workout&&rioNow.getUTCHours()>=4){
      if(siteUrl){try{const _ac=new AbortController();const _tm=setTimeout(()=>_ac.abort(),1200);await fetch(`${siteUrl}/.netlify/functions/ng-nightly-brain`,{method:'POST',signal:_ac.signal}).catch(()=>{});clearTimeout(_tm)}catch(_){}}
      // First Contact world — plants once, no-op forever after
      if(siteUrl){try{const _acF=new AbortController();const _tmF=setTimeout(()=>_acF.abort(),1200);await fetch(`${siteUrl}/.netlify/functions/ng-seed-first-contact`,{method:'POST',body:'{}',signal:_acF.signal}).catch(()=>{});clearTimeout(_tmF)}catch(_){}}
      // Early worlds (Me & You, Numbers & Money) — plant once, no-op forever
      if(siteUrl){try{const _acW=new AbortController();const _tmW=setTimeout(()=>_acW.abort(),1200);await fetch(`${siteUrl}/.netlify/functions/ng-seed-worlds`,{method:'POST',body:'{}',signal:_acW.signal}).catch(()=>{});clearTimeout(_tmW)}catch(_){}}
      // Register sweep — heal pre-rewire 'a gente' bank bricks (no-op when clean)
      if(siteUrl){try{const _acR=new AbortController();const _tmR=setTimeout(()=>_acR.abort(),1200);await fetch(`${siteUrl}/.netlify/functions/ng-register-sweep`,{method:'POST',body:'{}',signal:_acR.signal}).catch(()=>{});clearTimeout(_tmR)}catch(_){}}
      actions.push('dispatched_nightly_brain')
      await brainLog(sb,'heartbeat','Nightly brain hasn\'t run today — dispatching the deep analysis now.',null,2)
    }

    // ── 2. Live session? Run the coach sweep (max every 6 min). ─────
    const lastCoach=hb?.last_coach_check?new Date(hb.last_coach_check).getTime():0
    if(activeSession&&(now-lastCoach)>6*60*1000&&events.length>=5){
      await sb.from('ng_heartbeat_state').update({last_coach_check:nowIso}).eq('user_id',UID)
      const recent=events.slice(0,15)
      const fails=recent.filter(e=>(e.quality||3)<3)
      const failRate=fails.length/recent.length
      if(failRate>=0.4){
        const failIds=[...new Set(fails.map(f=>f.scaffold_id))].slice(0,5)
        const obs=await haiku(`A Portuguese learner is mid-session and failing ${Math.round(failRate*100)}% of recent items (patterns: ${failIds.join(', ')}). Write ONE sentence of live coaching insight — what's likely happening and what to switch to. Direct, no fluff.`)
        await brainLog(sb,'coach',obs||`Live session struggling — ${Math.round(failRate*100)}% fail rate on recent items. Consider switching drill type.`,{fail_rate:failRate,patterns:failIds},2)
        actions.push('coach_intervention')
      }else{
        await brainLog(sb,'coach',`Watching live session — ${recent.length} events last hour, ${Math.round((1-failRate)*100)}% success. Flow is good, staying out of the way.`,null,1)
        actions.push('coach_watch')
      }
    }

    // ── 3. Speculative radio pre-gen (user active, no opener today) ──
    const lastSpec=hb?.last_speculative?new Date(hb.last_speculative).getTime():0
    if(activeSession&&!openerToday?.length&&(now-lastSpec)>30*60*1000){
      await sb.from('ng_heartbeat_state').update({last_speculative:nowIso}).eq('user_id',UID)
      if(siteUrl)fetch(`${siteUrl}/.netlify/functions/ng-radio`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'tune',render_audio:false})
      }).catch(()=>{})
      await brainLog(sb,'heartbeat','You\'re active and today\'s radio opener isn\'t cached — pre-generating one so tune-in is instant.',null,1)
      actions.push('speculative_radio')
    }

    // ── 3b. Knowledge graph missing? Build it automatically. ─────────
    try{
      const{count:edgeCount}=await sb.from('ng_graph_edges')
        .select('id',{count:'exact',head:true}).eq('user_id',UID)
      const{count:scCount}=await sb.from('ng_scaffolds')
        .select('id',{count:'exact',head:true}).eq('user_id',UID)
      if((edgeCount||0)===0&&(scCount||0)>0){
        if(siteUrl)fetch(`${siteUrl}/.netlify/functions/ng-graph-generate`,{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({batch:0})
        }).catch(()=>{})
        await brainLog(sb,'graph','No knowledge graph yet — building it automatically in the background. Batches self-chain; the ✦ Live map lights up as edges land.',null,2)
        actions.push('graph_bootstrap')
      }
    }catch(_){}

    // ── 4. Review pressure observation ───────────────────────────────
    const dueCount=(dueMem||[]).length
    if(dueCount>=10){
      await brainLog(sb,'memory',`${dueCount} patterns have crossed the forgetting edge. The next workout front-loads them before they decay further.`,{due:dueCount},dueCount>=25?2:1)
      actions.push('review_pressure_noted')
    }

    // ── 5. Weekly deep refit (Sundays, once) ─────────────────────────
    const lastRefit=hb?.last_weekly_refit?new Date(hb.last_weekly_refit).getTime():0
    if(rioNow.getUTCDay()===0&&(now-lastRefit)>6*24*3600*1000){
      await sb.from('ng_heartbeat_state').update({last_weekly_refit:nowIso}).eq('user_id',UID)
      // Graph gap sweep: any scaffold with zero edges gets queued for next graph pass
      const[{data:allSc},{data:edges}]=await Promise.all([
        sb.from('ng_scaffolds').select('id').eq('user_id',UID),
        sb.from('ng_graph_edges').select('from_scaffold').eq('user_id',UID)
      ])
      const connected=new Set((edges||[]).map(e=>e.from_scaffold))
      const orphans=(allSc||[]).filter(s=>!connected.has(s.id)).length
      if(orphans>10&&siteUrl){
        fetch(`${siteUrl}/.netlify/functions/ng-graph-generate`,{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({batch:0})
        }).catch(()=>{})
        await brainLog(sb,'graph',`Weekly sweep: ${orphans} patterns have no graph connections — regenerating edges for them.`,{orphans},2)
      }else{
        await brainLog(sb,'heartbeat','Weekly sweep complete — graph coverage healthy, memory curves stable.',null,1)
      }
      actions.push('weekly_refit')
    }

    // ── Silent beat if nothing happened (don't spam the log) ─────────
    return{statusCode:200,body:JSON.stringify({ok:true,actions,active_session:!!activeSession,due:dueCount})}
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
