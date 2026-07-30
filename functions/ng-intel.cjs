// ng-intel.cjs — shared intelligence-layer helpers (CJS: repo is type:module).
// One law: nothing that enters the bank is allowed to be invisible.
// Every imported scaffold gets a valid category and a home unit (the street
// inbox) the moment it's born — no waiting on the nightly sweep.

const VALID_CATS=['survival','grammar_core','identity','social','personality_humour','deep_fluency']
// Legacy keys still living on old rows — mapped, never dropped.
const LEGACY_CATS={social_foundation:'social',dating_register:'social'}

function safeCategory(c){
  if(VALID_CATS.includes(c))return c
  if(LEGACY_CATS[c])return LEGACY_CATS[c]
  return 'social'
}

const INBOX_ID='street_inbox'

// Find-or-create the street inbox unit. Returns the unit row {id,scaffold_ids}.
async function ensureInbox(sb,UID){
  const{data:u}=await sb.from('ng_path_units').select('id,scaffold_ids')
    .eq('user_id',UID).eq('unit_id',INBOX_ID).single()
  if(u)return u
  const{data:ins,error}=await sb.from('ng_path_units').insert({
    user_id:UID,unit_id:INBOX_ID,title:'Da Rua — Inbox',emoji:'📥',
    situation:'Patterns you captured on the street — Say It, Radio, Luna, imports. Practice one a few times and the brain files it into the world where it belongs.',
    scaffold_ids:[],threshold_days:7,sort_order:997,is_side_quest:true,level:1
  }).select('id,scaffold_ids').single()
  if(error)throw new Error('inbox create failed: '+error.message)
  return ins
}

// Attach scaffold ids to the inbox (idempotent, unbounded — no eviction, ever).
async function attachToInbox(sb,UID,ids){
  if(!ids||!ids.length)return 0
  const u=await ensureInbox(sb,UID)
  const merged=[...new Set([...(u.scaffold_ids||[]),...ids])]
  if(merged.length===(u.scaffold_ids||[]).length)return 0
  const{error}=await sb.from('ng_path_units').update({scaffold_ids:merged}).eq('id',u.id)
  if(error)throw new Error('inbox attach failed: '+error.message)
  return merged.length-(u.scaffold_ids||[]).length
}

module.exports={VALID_CATS,LEGACY_CATS,safeCategory,INBOX_ID,ensureInbox,attachToInbox}
