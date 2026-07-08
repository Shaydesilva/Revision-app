// ng-brain-core.js — pure logic for the guided engine. No I/O, no Supabase, no fetch.
// Everything here is deterministic and unit-testable: rung derivation, the guided
// deck's three governors (keep floor / new valve / room pick), and the why-line.
//
// CONSTITUTION (Calçadão):
// - ONE CLOCK: due-ness comes only from ng_memory.next_due. This module never schedules.
// - Rungs are DERIVED per brick from real evidence (events + memory), never stored.
//   0 conhecer (flip/recog) → 1 apoiado (reorder/cloze/escuta) →
//   2 discriminar (timeline/duel/conserta) → 3 produzir (constructor/write/monta/phrase/luna)
// - Struggle drops the rung: a brick you just failed comes back MORE OFTEN but GENTLER.
//   Frequency is urgency's job; difficulty is the rung's job. They stay decoupled.
// - The why-line is ENGLISH. Portuguese on screen is always content, never chrome.

// Event ledger mode → rung. 'flashcard' covers flip/recog/speed/escuta (ng-session-end
// collapses them); typed/spoken production arrives as write/phrase/luna or raw atom names.
const RUNG_OF_MODE={
  flashcard:0,flip:0,recog:0,speed:0,escuta:0,escuta_audio:0,
  reorder:1,cloze:1,
  timeline:2,duel:2,conserta:2,
  write:3,constructor:3,monta:3,phrase:3,luna:3
}

const RUNG_NAMES=['conhecer','apoiado','discriminar','produzir']

// Atoms eligible at each rung (consumed by the client in Phase 1).
const ATOMS_AT_RUNG={
  0:['flip','recog'],
  1:['reorder','cloze','escuta'],
  2:['duel','conserta','timeline'],
  3:['constructor']
}

function defaultDial(){
  // The shared dial. new_per_session is the appetite valve; success_band is the
  // governor's target; both tune together against real telemetry.
  return{new_per_session:6,success_band:[0.80,0.88],version:1}
}

// Derive a brick's current rung from evidence.
// recentEvents: newest-first [{mode, quality}] for THIS (scaffold, stage).
// prodStability / recogStability: ng_memory stability (days) per skill.
// isControlled: the stage sits in profile.controlled (acquisition gate passed).
function deriveRung({recentEvents=[],prodStability=0,recogStability=0,isControlled=false}={}){
  // Owned bricks review at production — retrieval at the strength you have.
  if(isControlled||prodStability>=14)return 3
  if(!recentEvents.length){
    // No events in the window (old brick, or a placement/já-sei prior): read stability.
    if(prodStability>=7)return 3
    if(prodStability>=1.5)return 2
    if(recogStability>0)return 1
    return 0
  }
  // Highest rung with a passing recent record: last two qualities avg ≥3.5,
  // or a single ≥4 when only one rep exists at that rung.
  const byRung={0:[],1:[],2:[],3:[]}
  for(const ev of recentEvents){
    const r=RUNG_OF_MODE[ev.mode]
    if(r===undefined)continue
    if(byRung[r].length<2)byRung[r].push(Number(ev.quality)||0)
  }
  let highestPassed=-1
  for(let r=3;r>=0;r--){
    const q=byRung[r]
    const passed=q.length>=2?(q[0]+q[1])/2>=3.5:(q.length===1&&q[0]>=4)
    if(passed){highestPassed=r;break}
  }
  let rung=Math.min(3,highestPassed+1)
  // Struggle drop: if the most recent rep failed, meet the brick one rung gentler.
  const last=recentEvents.find(ev=>RUNG_OF_MODE[ev.mode]!==undefined)
  if(last&&Number(last.quality)<=2)rung=Math.max(0,rung-1)
  return rung
}

// The new-material valve: appetite throttled by review debt.
// Debt is real workload — forcing new material onto a heavy review day digs the hole deeper.
function newValve({dueCount=0,dial}={}){
  const appetite=Math.max(0,(dial||defaultDial()).new_per_session)
  if(dueCount>=40)return 0
  if(dueCount>=25)return Math.min(appetite,3)
  return appetite
}

// Room pick: relevance chooses what the session is ABOUT (the 35%'s successor).
// units: [{unit_id,title,scaffold_ids,completed_at,sort_order,is_side_quest}]
// frontier items must carry scaffold_id, practice_count, source.
function pickRoom({units=[],frontier=[],due=[]}={}){
  if(!units.length)return null
  const dueIds=new Set(due.map(d=>d.scaffold_id))
  const spine=units.filter(u=>!u.is_side_quest).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
  const firstIncomplete=spine.find(u=>!u.completed_at)
  let best=null,bestScore=-1
  for(const u of units){
    const ids=new Set(Array.isArray(u.scaffold_ids)?u.scaffold_ids:[])
    if(!ids.size)continue
    let dueIn=0,unmet=0,victorUnmet=0
    for(const f of frontier){
      if(!ids.has(f.scaffold_id))continue
      if(f.practice_count===0){unmet++;if(f.source==='victor')victorUnmet++}
    }
    for(const id of dueIds)if(ids.has(id))dueIn++
    let score=dueIn*2+unmet+victorUnmet*2
    if(firstIncomplete&&u.unit_id===firstIncomplete.unit_id)score+=4
    if(score>bestScore){bestScore=score;best=u}
  }
  return bestScore>0?{unit_id:best.unit_id,title:best.title,scaffold_ids:best.scaffold_ids}:(firstIncomplete?{unit_id:firstIncomplete.unit_id,title:firstIncomplete.title,scaffold_ids:firstIncomplete.scaffold_ids}:null)
}

// The why-line: one plain English sentence of reasoning. This is the trust mechanism —
// the guide explains itself or it doesn't deserve to guide.
function composeWhy({dueCount=0,newCount=0,roomTitle=null,victorNew=0}={}){
  if(dueCount>=40)return`Heavy review day — ${dueCount} patterns at the forgetting edge, so nothing new today. Hold what's yours.`
  if(dueCount>0&&newCount>0){
    const room=roomTitle?` from “${roomTitle}”`:''
    const victor=victorNew>0?` (${victorNew} from Victor)`:''
    return`${dueCount} pattern${dueCount===1?'':'s'} due first — then ${newCount} new${room}${victor}.`
  }
  if(dueCount>0)return`${dueCount} pattern${dueCount===1?'':'s'} about to fade — today is about keeping what's yours.`
  if(newCount>0){
    const room=roomTitle?` from “${roomTitle}”`:''
    return`Nothing's fading today. ${newCount} new brick${newCount===1?'':'s'}${room} — fresh territory.`
  }
  return`All caught up. Anything you practice now is a bonus rep.`
}

// Assemble the guided deck (pure part). Caller supplies the pools; this orders them.
// Order: keep floor (overdue first) → new bricks (clustered, from the room first) → fading fill.
// The Phase 1 client turns this into the session arc; the deck just guarantees composition.
function composeGuidedDeck({due=[],frontier=[],bankPool=[],units=[],dial}={}){
  const d=dial||defaultDial()
  const newCount=newValve({dueCount:due.length,dial:d})
  const room=pickRoom({units,frontier,due})
  const roomIds=new Set(room&&Array.isArray(room.scaffold_ids)?room.scaffold_ids:[])
  const inDeck=new Set(due.map(x=>x.scaffold_id+'|'+x.stage))
  const unmet=frontier.filter(f=>f.practice_count===0&&!inDeck.has(f.scaffold_id+'|'+f.stage))
  const fromRoom=unmet.filter(f=>roomIds.has(f.scaffold_id))
  const elsewhere=unmet.filter(f=>!roomIds.has(f.scaffold_id))
  const newItems=[...fromRoom,...elsewhere].slice(0,newCount).map(x=>({...x,isNew:true}))
  newItems.forEach(x=>inDeck.add(x.scaffold_id+'|'+x.stage))
  const fading=frontier.filter(f=>f.practice_count>0&&!inDeck.has(f.scaffold_id+'|'+f.stage))
  fading.forEach(x=>inDeck.add(x.scaffold_id+'|'+x.stage))
  const spare=bankPool.filter(b=>!inDeck.has(b.scaffold_id+'|'+b.stage))
  const items=[...due,...newItems,...fading,...spare].slice(0,120)
  const victorNew=newItems.filter(x=>x.source==='victor').length
  const why=composeWhy({dueCount:due.length,newCount:newItems.length,roomTitle:room?.title||null,victorNew})
  return{items,why,room:room?{unit_id:room.unit_id,title:room.title}:null,kept_count:due.length,new_count:newItems.length,dial:d}
}

module.exports={RUNG_OF_MODE,RUNG_NAMES,ATOMS_AT_RUNG,defaultDial,deriveRung,newValve,pickRoom,composeWhy,composeGuidedDeck}
