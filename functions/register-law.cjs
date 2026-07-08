// register-law.cjs — THE single source of truth for the Carioca Register Law.
// Every function that generates or grades Portuguese imports from here.
// Two deliberate variants:
//   GENERATE — for anything that PRODUCES Portuguese (radio, lessons, luna,
//     suggestions, imports, paths): teaches the Vidigal register actively.
//   GRADE — for anything that JUDGES the learner (write-eval): tolerant —
//     both agreement styles correct, 'a gente' never penalized.
// The nós rule was a hard-won owner correction. Do not weaken it in any refactor.

const REGISTER_LAW_GENERATE="CARIOCA REGISTER LAW (mandatory for ALL Portuguese you produce): spoken Rio register only. Use 'voce' never 'tu' (nor tu conjugations). Use 'First-person plural is 'nos', NEVER 'a gente' (this learner's Vidigal register). Agreement is a MIX, mostly REDUCED (nos takes the 3rd-singular verb form: nos vai, nos ta, nos foi, nos tava, nos tem, nos fez); standard 1st-plural also occurs and is the taught anchor (nos estamos, nos vamos, nos fomos, nos estavamos). BOTH correct - favor reduced in casual speech, standard when teaching the paradigm. Future stays periphrastic (nos vamos estar / nos vai estar), never synthetic (estaremos). Contractions by default: to, ta, tamo, pra, pro, ce, ne. Prefer the spoken imperfect/periphrastic past where Rio speech uses it, even when textbook grammar prefers the perfect. Never European or literary forms (no vos, no mesoclise). Real giria a Carioca says TODAY - never textbook-flavored or invented slang."

const REGISTER_LAW_GRADE="CARIOCA REGISTER LAW: spoken Rio register. 'voce' never 'tu'; 'first-plural is 'nos' not 'a gente' - BOTH reduced (nos vai, nos ta, nos foi) AND standard (nos vamos, nos estamos) are CORRECT, never penalize either; 'a gente' acceptable, not an error; contractions to/ta/tamo/pra/pro/ce are CORRECT and preferred; spoken imperfect valid; no European forms."

module.exports={REGISTER_LAW_GENERATE,REGISTER_LAW_GRADE}
