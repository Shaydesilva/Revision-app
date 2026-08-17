// lang.cjs — THE LANGUAGE PACK REGISTRY.
// "Same hardware, different ingredients." The engine (brain-core, memory, the
// governors, the clock) never learns what language it teaches. Everything that
// IS language-bound — the register law, the linter, the bank identity, the
// prompt framing — comes from here.
//
// IDENTITY SEPARATION (the load-bearing decision):
// Each language owns a distinct user_id. Every query in this codebase already
// filters by user_id — it is the one filter nothing works without — so two banks
// can never bleed into each other. No schema migration, no new filter to forget.
// Adding a language = adding a pack. Never a fork.

const{REGISTER_LAW_GENERATE:PT_GEN,REGISTER_LAW_GRADE:PT_GRADE}=require('./register-law.cjs')
const{lintPT}=require('./register-lint.cjs')

// ── PAISA (Medellín, Antioquia) ─────────────────────────────────────
// The register law is the soul of a pack. This one is built on three hard calls:
//  1. VOSEO is the register — vos sos / tenés / podés, imperatives vení / andá.
//  2. USTED is WARM, not formal — paisas use it with partners, kids, close
//     friends. Every Spanish course teaches the opposite. This is the "nós not
//     a gente" of this pack: the local truth over the textbook.
//  3. TÚ is the outsider form. Not wrong — just marks you as not from here.
const ES_GEN=[
"PAISA REGISTER LAW (mandatory for ALL Spanish you produce): spoken Medellin/Antioquia register only.",
"VOSEO is the default familiar form: vos sos, vos tenes, vos podes, vos queres, vos sabes, vos vas, vos haces, vos decis, vos vivis. Imperatives: veni, anda, mira, hace, deci, come, deja, espera.",
"USTED is used WARMLY and constantly — with partners, close friends, children, even pets. It is NOT formal distance in Medellin. Mixing vos and usted with the same person is normal and correct.",
"TU is the outsider form. Avoid it; never make it the default.",
"'PUES' is the paisa signature — sentence-initial and sentence-final: 'veni pues', 'listo pues', 'que mas pues?', 'pues claro'. Use it naturally and often.",
"Greetings are '?que mas?', '?que mas pues?', '?bien o que?', '?quiubo?' — never '?que tal?'.",
"Core paisa vocabulary you SHOULD use: parce/parcero (mate), listo (ok/done), hagale (go ahead), a la orden (service), que pena (excuse me — NOT shame), de una (right away), bacano/chevere/melo (cool), berraco (badass/tough), que pereza / que mamera (what a drag), camellar (to work), plata (money), lucas (thousands of pesos), tinto (black coffee), fria (beer), finca (country house — paisa weekend culture), el man / la vieja (the guy / the woman), fresco & suave (relax), eso! (agreement), mijo/mija (affectionate), ave Maria! and uy! (exclamations).",
"REQUESTS use 'regalar': '?me regala un tinto?', 'regaleme la cuenta'. This is deeply Colombian — prefer it over 'dame' or 'quiero'.",
"DIMINUTIVES are constant: -ito and -ico. ahorita, momentico, ratico, tintico, cafecito, ahi mismito.",
"'coger' is NORMAL in Colombia (coger el bus, coger un taxi) — do not avoid it.",
"NEVER Spain: vosotros, vale, tio, guay, ordenador, movil, coche, hostia, chaval.",
"NEVER Mexico: guey/wey, orale, chido, andale, no manches, platicar.",
"NEVER Argentina: che, boludo, pibe, quilombo, laburo.",
"NEVER Portuguese, and never Portuguese-shaped Spanish — this learner speaks Rio Portuguese and portunol is the main risk.",
"NEVER textbook-neutral Spanish that sounds like a course. Real paisa speech as spoken TODAY — never invented or dictionary slang."
].join(' ')

const ES_GRADE=[
"PAISA REGISTER LAW (grading): spoken Medellin register.",
"Voseo (vos sos/tenes/podes) and usted are BOTH correct and preferred; 'tu' is acceptable and must NEVER be marked wrong — only note it reads as non-local.",
"Standard/neutral Spanish that is grammatically correct is NEVER an error — at most note the paisa way alongside.",
"'pues', 'parce', 'listo', 'hagale', 'de una', diminutives and 'regalar'-requests are CORRECT and preferred, never over-familiar.",
"'coger' is correct Colombian usage.",
"PORTUGUESE LEAKAGE is the one thing to flag explicitly and by name: this learner speaks Rio Portuguese. If the answer contains Portuguese words or Portuguese-shaped Spanish, say so plainly — 'that's Portuguese, not Spanish' — and give the paisa form."
].join(' ')

// Deterministic red-flags on generated Spanish. Only unambiguous markers —
// words that cannot be valid Colombian Spanish — so false positives stay near zero.
const ES_SPAIN=/\b(vosotros|vuestro|vuestra|vale que|tío|guay|ordenador|móvil|hostia|chaval|gilipollas)\b/i
const ES_MEX=/\b(güey|wey|órale|chido|ándale|no manches|platicar|padrísimo)\b/i
const ES_ARG=/\b(boludo|pibe|quilombo|laburo|che\b)\b/i
// Portuguese markers with NO valid Spanish reading — the portuñol tripwire.
// TWO TIERS, deliberately. JavaScript's \b is defined over [A-Za-z0-9_], so
// accented letters count as NON-word characters and boundaries land in absurd
// places: /é\b/ happily matches inside "qué", "querés", "hacés" and "déjeme",
// which flagged half the voseo paradigm as Portuguese. Learned the hard way.
//   Tier 1 — multi-letter markers, matched on ACCENT-STRIPPED text so \b only
//            ever sees ASCII. No Spanish word deaccents into any of these.
//   Tier 2 — short/ambiguous markers, matched on the ORIGINAL text with
//            explicit delimiters instead of \b.
const ES_PT_WORDS=/\b(voce|voces|nao|entao|muito|muita|obrigad[oa]|tudo|fazer|faco|coisa|agora|dinheiro|mais|bem|beleza|vou|ontem|hoje|amanha|pra|pro|tem que)\b/i
const ES_PT_SHORT=/(^|[\s¡¿"'(,.])(é|aí|tá|tô|cê|sim|com)([\s.,!?;:)"']|$)/i
const deaccent=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'')

function lintES(text){
  const t=String(text||'')
  const flags=[]
  if(ES_SPAIN.test(t))flags.push('Spain register')
  if(ES_MEX.test(t))flags.push('Mexican register')
  if(ES_ARG.test(t))flags.push('Argentine register')
  if(ES_PT_WORDS.test(deaccent(t))||ES_PT_SHORT.test(t))flags.push('PORTUGUESE leakage (portuñol)')
  return{ok:!flags.length,flags}
}

// ── THE PACKS ───────────────────────────────────────────────────────
const PACKS={
  'pt-rio':{
    id:'pt-rio',
    uid:'00000000-0000-0000-0000-000000000001', // the original bank — untouched
    label:'Carioca',
    sublabel:'Rio de Janeiro Portuguese',
    emoji:'🇧🇷',
    language:'Portuguese',
    city:'Rio de Janeiro',
    lawGenerate:PT_GEN,
    lawGrade:PT_GRADE,
    lint:lintPT,
    ttsVoice:'echo',
    ttsSpeed:1.05,
    utcOffset:-3,      // Rio — decides when "today" rolls over for the nightly brain
    hasRadio:true      // the daily radio dialogue is authored for this pack
  },
  'es-med':{
    id:'es-med',
    uid:'00000000-0000-0000-0000-000000000002', // fresh bank, structurally isolated
    label:'Paisa',
    sublabel:'Medellín Spanish',
    emoji:'🇨🇴',
    language:'Spanish',
    city:'Medellín',
    lawGenerate:ES_GEN,
    lawGrade:ES_GRADE,
    lint:lintES,
    ttsVoice:'echo',
    ttsSpeed:1.05,
    utcOffset:-5,      // Medellín — two hours behind Rio; the day must roll over locally
    hasRadio:false     // no paisa cast yet; the nightly brain skips radio for this pack
  }
}

const DEFAULT_LANG='pt-rio'

// Resolve a pack from a request body / query. Unknown or missing → default,
// so every existing call site keeps working untouched.
function getPack(idOrBody){
  const id=typeof idOrBody==='string'?idOrBody:(idOrBody&&(idOrBody.lang||idOrBody.language))
  return PACKS[id]||PACKS[DEFAULT_LANG]
}
// The bank identity for a request. This is what every query must scope by.
function uidFor(idOrBody){return getPack(idOrBody).uid}

// Resolve straight from a Lambda event. Safe on missing/malformed bodies —
// anything unrecognised falls back to the original Rio bank, so every legacy
// call site keeps working exactly as before.
// Reads the body first, then ?lang= — GET endpoints (ng-export) have no body.
function langFromEvent(event){
  try{
    const b=JSON.parse((event&&event.body)||'{}')
    if(b&&(b.lang||b.language))return b.lang||b.language
  }catch(_){}
  const q=event&&event.queryStringParameters
  return(q&&q.lang)||null
}
function uidFromEvent(event){
  try{return uidFor(langFromEvent(event))}catch(_){return PACKS[DEFAULT_LANG].uid}
}
function packFromEvent(event){
  try{return getPack(langFromEvent(event))}catch(_){return PACKS[DEFAULT_LANG]}
}

module.exports={PACKS,DEFAULT_LANG,getPack,uidFor,uidFromEvent,packFromEvent,langFromEvent,lintES,ES_GEN,ES_GRADE}
