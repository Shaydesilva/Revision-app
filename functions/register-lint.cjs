// register-lint.cjs — deterministic red-flag checks on GENERATED Portuguese.
// Generation at scale needs automated QA: this catches the law's hard violations
// cheaply (no AI call). v1 observes and reports (fail loudly via brain_log);
// it does not block output — we watch the flag rate before enforcing.

const SYNTHETIC_FUTURE=/\b(estarei|estaremos|serei|seremos|farei|faremos|irei|iremos|terei|teremos|poderei|poderemos|estar[aã]o|ser[aã]o|far[aã]o|ir[aã]o)\b/i

function lintPT(text){
  const t=String(text||'')
  const flags=[]
  if(/\ba gente\b/i.test(t))flags.push("teaches 'a gente' (law: nos)")
  if(/\btu\b/i.test(t))flags.push("uses 'tu'")
  if(/\bv[oó]s\b/i.test(t))flags.push("European 'vos'")
  if(/\b\w+-(lo|la|los|las)-(ei|as|a|emos|ao)\b/i.test(t))flags.push('mesoclise')
  if(SYNTHETIC_FUTURE.test(t))flags.push('synthetic future')
  return{ok:!flags.length,flags}
}

// Lint a set of dialogue lines; returns aggregated flags with line indices.
function lintLines(lines){
  const hits=[]
  ;(lines||[]).forEach((l,i)=>{
    const r=lintPT(l&&(l.pt||l.text||l))
    if(!r.ok)hits.push({line:i,flags:r.flags,pt:String(l&&(l.pt||l.text||l)).slice(0,80)})
  })
  return{ok:!hits.length,hits}
}

module.exports={lintPT,lintLines}
