// ng-radio.js — Radio Carioca
// Actions:
//   tune    — start/resume a session: returns opener segment (with audio) + session_key
//   next    — generate the next segment ahead of playback (script + audio)
//   render  — TTS-render a segment's lines (per voice)
// Buffer model: client plays segment N while requesting N+1.

const{createClient}=require('@supabase/supabase-js')
const UID='00000000-0000-0000-0000-000000000001'

async function brainLog(sb,proc,thought,data=null,importance=1){
  try{await sb.from('ng_brain_log').insert({user_id:UID,process:proc,thought,data,importance})}catch(_){}
}
const VOICE_MAP={echo:'echo',shimmer:'shimmer'} // Chico=echo, Bia=shimmer

async function tts(text,voice){
  const res=await fetch('https://api.openai.com/v1/audio/speech',{
    method:'POST',
    headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:'tts-1',voice:VOICE_MAP[voice]||'echo',input:text,speed:1.05})
  })
  if(!res.ok)return null
  const buf=Buffer.from(await res.arrayBuffer())
  return buf.toString('base64')
}

async function generateSegment(sb,profile,scaffolds,mem,prevLines,station,segIndex,recentBeats,formatHint){
  const scMap={};(scaffolds||[]).forEach(s=>{scMap[s.id]=s})
  const strong=(mem||[]).filter(m=>m.skill==='production'&&m.stability>=14)
    .map(m=>scMap[m.scaffold_id]?.base_portuguese).filter(Boolean)
  const frontier=(profile?.frontier||[]).slice(0,8).map(f=>`"${f.pt}"`)
  const showBible=profile?.show_bible||''
  const prevContext=prevLines?prevLines.slice(-6).map(l=>`${l.speaker==='echo'?'Chico':'Bia'}: ${l.pt}`).join('\n'):''

  const res=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({
      model:'claude-sonnet-4-6',max_tokens:1400,
      system:`CARIOCA REGISTER LAW (mandatory for ALL Portuguese you produce): spoken Rio register only. Use 'voce' never 'tu' (nor tu conjugations). Use 'a gente' + 3rd-person singular, never 'nos'. Contractions by default: to, ta, tamo, pra, pro, ce, ne. Prefer the spoken imperfect/periphrastic past where Rio speech uses it, even when textbook grammar prefers the perfect. Never European or literary forms (no vos, no mesoclise).\n\nYou write Radio Carioca — a continuous comedy radio show. Two hosts:
Chico (speaker "echo"): cynical, dry, complains about everything, secretly soft.
Bia (speaker "shimmer"): chaotic, warm, always has a story that escalates.
Natural Carioca street register. Funny. Never explain vocabulary. Never break character.

FRONTIER PATTERN BUDGET — STRICT:
Weave in AT MOST 2 frontier patterns in the whole segment, each used ONCE, and ONLY where a Carioca would genuinely say it in that moment. If it doesn't fit naturally, SKIP it — natural flow always beats coverage. Never contort a scene (talking to objects/animals just to use a phrase). Most lines should contain NO target pattern at all.

FRESH CONTENT — STRICT:
NEVER retell or re-enact a story beat that already happened (see RECENT BEATS). The show bible is for one-line CALLBACKS only, never full retellings. Each segment must do something NEW — pick one: advance a brand-new story, a listener message, mock neighbourhood news, a debate (beach vs boteco style), a game between the hosts, or a running-gag callback that moves it FORWARD.

Write a 60-90 second segment (10-14 lines) that flows FROM the previous segment naturally (mid-conversation feel).
If no previous context, start mid-flow anyway — like tuning into live radio.
Return JSON only: {"lines":[{"speaker":"echo|shimmer","pt":"","en":""}],"patterns_used":[]}`,
      messages:[{role:'user',content:`STATION TOPIC: ${station||'daily Rio life, gossip, absurd situations'}
KNOWN PATTERNS: ${strong.slice(0,40).join(', ')||'basic Carioca'}
FRONTIER (max 2, only if natural): ${frontier.join(', ')||'none'}
SHOW BIBLE (callbacks only): ${showBible.slice(0,500)}
SEGMENT FORMAT DIRECTIVE: ${formatHint||'fresh new story'}
RECENT BEATS — already told, do NOT retell any of these:
${recentBeats||'(none yet)'}
PREVIOUS SEGMENT ENDED WITH:
${prevContext||'(fresh tune-in — start mid-flow)'}`}]
    })
  })
  const data=await res.json()
  const parsed=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())
  return parsed
}

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const body=JSON.parse(event.body||'{}')
    const{action='tune',session_key=null,segment_index=0,station='',render_audio=true}=body

    const[{data:profile},{data:scaffolds},{data:mem},{data:recentSegs}]=await Promise.all([
      sb.from('ng_learner_profile').select('frontier,show_bible,radio_station_prompt').eq('user_id',UID).single(),
      sb.from('ng_scaffolds').select('id,base_portuguese').eq('user_id',UID),
      sb.from('ng_memory').select('scaffold_id,skill,stability').eq('user_id',UID),
      sb.from('ng_radio_segments').select('lines,created_at').eq('user_id',UID)
        .order('created_at',{ascending:false}).limit(12)
    ])
    // Beat summaries: first two lines of each recent segment = the story beats already told
    const recentBeats=(recentSegs||[]).map(s=>{
      const ls=Array.isArray(s.lines)?s.lines.slice(0,2):[]
      return ls.map(l=>l.pt).join(' / ')
    }).filter(Boolean).map(b=>'- '+b.slice(0,140)).join('\n')
    const FORMATS=['a brand-new story from one of the hosts','a listener message (invent a listener + neighbourhood)','mock neighbourhood news','a debate between the hosts (pick a petty Rio topic)','a quick game between the hosts','advance an existing running gag FORWARD with new developments']
    const pickFormat=(i)=>FORMATS[((i||0)+new Date().getDate())%FORMATS.length]
    const stationPrompt=station||profile?.radio_station_prompt||''

    // ═══ TUNE: instant start ═════════════════════════════════════════
    if(action==='tune'){
      const key='radio_'+Date.now()
      // Try today's pre-generated opener first (nightly brain made it)
      const today=new Date(Date.now()-3*3600000).toISOString().slice(0,10)
      // Single-use cache: only serve an opener that has NEVER been heard.
      // Replays are what made every session start with the same story.
      let{data:opener}=await sb.from('ng_radio_segments').select('*')
        .eq('user_id',UID).eq('is_opener',true).eq('played_count',0)
        .gte('created_at',today+'T00:00:00')
        .order('created_at',{ascending:false}).limit(1).single()

      if(!opener){
        // No cached opener — generate live (slower cold start, still works)
        const seg=await generateSegment(sb,profile,scaffolds,mem,null,stationPrompt,0,recentBeats,pickFormat(Math.floor(Math.random()*6)))
        const{data:inserted}=await sb.from('ng_radio_segments').insert({
          user_id:UID,station:stationPrompt||'default',session_key:key,segment_index:0,
          lines:seg.lines||[],is_opener:true,patterns_used:seg.patterns_used||[]
        }).select().single()
        opener=inserted
      }else{
        await sb.from('ng_radio_segments').update({played_count:(opener.played_count||0)+1,session_key:key}).eq('id',opener.id)
      }

      // Render audio for opener lines
      let audio=[]
      if(render_audio&&opener?.lines){
        audio=await Promise.all(opener.lines.map(async(l,i)=>({
          line_index:i,b64:await tts(l.pt,l.speaker)
        })))
      }
      await brainLog(sb,'radio',`Tuned in — opener ${opener?.id?'served from cache':'generated live'} (${(opener?.lines||[]).length} lines). Buffering ahead.`,null,1)
      return{statusCode:200,body:JSON.stringify({
        ok:true,session_key:key,segment_index:0,
        lines:opener?.lines||[],audio,patterns_used:opener?.patterns_used||[],
        frontier_ref:(profile?.frontier||[]).map(f=>({scaffold_id:f.scaffold_id,pt:f.pt,en:f.en,stage:f.stage}))
      })}
    }

    // ═══ NEXT: generate segment N+1 while N plays ════════════════════
    if(action==='next'&&session_key){
      // Previous segment context
      const{data:prev}=await sb.from('ng_radio_segments').select('lines')
        .eq('user_id',UID).eq('session_key',session_key)
        .order('segment_index',{ascending:false}).limit(1).single()

      const seg=await generateSegment(sb,profile,scaffolds,mem,prev?.lines||null,stationPrompt,segment_index,recentBeats,pickFormat(segment_index))
      await sb.from('ng_radio_segments').insert({
        user_id:UID,station:stationPrompt||'default',session_key,segment_index,
        lines:seg.lines||[],patterns_used:seg.patterns_used||[]
      })

      let audio=[]
      if(render_audio&&seg.lines){
        audio=await Promise.all(seg.lines.map(async(l,i)=>({
          line_index:i,b64:await tts(l.pt,l.speaker)
        })))
      }
      if((seg.patterns_used||[]).length){
        await brainLog(sb,'radio',`Segment ${segment_index} on air — wove in: ${(seg.patterns_used||[]).slice(0,3).join(', ')}. Stealth teaching in progress.`,{patterns:seg.patterns_used},1)
      }
      return{statusCode:200,body:JSON.stringify({
        ok:true,session_key,segment_index,
        lines:seg.lines||[],audio,patterns_used:seg.patterns_used||[]
      })}
    }

    return{statusCode:400,body:JSON.stringify({error:'Unknown action'})}
  }catch(e){
    console.error('ng-radio:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
