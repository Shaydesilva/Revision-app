# CALÇADÃO — engineering state & forward specs

**Written by Fable at the end of the overhaul's first arc (21 deployments), as the
knowledge-transfer document for whichever mind builds next (Opus, a future session,
or Fable again).** Read the two PDFs' spirit through this lens: the owner's briefs
define the values; this file records what was BUILT, what was DECIDED and why, and
exact specs for what remains. Where this file and old docs disagree, this file wins
(it's newer). `docs/LEARNMODE_PROPOSAL.md` is the original design proposal — kept
for history; superseded by reality where they differ.

---

## 1 · What the system IS now

**One app.** The classic app, its `sm2` scheduler, card store, ModeSelect and browser
TTS are deleted. Nextgen is the product. `App.jsx` ~5,100 lines (was 6,947).

**One brain.** Every rep flows through `ng-session-end` (ONE WRITE PATH) into
`ng_memory` (ONE CLOCK: `next_due` is the only scheduler). Never violate these.

**The guided engine** (three governors, all live):
- **Keep floor** — every due review is served; the clock decides, never a ratio/meter.
- **New valve** — `guide_dial.new_per_session` (default 6), throttles at 25 due, closes
  at 40. The dial lives in `ng_learner_profile.guide_dial` and is tuned WITH the owner.
- **Success governor** — sessions hold a ~80–88% success band. Client tracks
  `bandRef {n, ok}` in NGTreino; under band → non-review bricks met one rung gentler;
  >92% → every 3rd item stretches +1 rung. ≥6 reps of evidence required. NEVER touches
  reviews or placement forces. Pure mirror: `governRung()` in `ng-brain-core.cjs`.

**Rungs** (per-brick, derived, never stored): 0 conhecer (flip/recog) → 1 apoiado
(reorder/cloze/escuta) → 2 discriminar (duel/conserta/timeline) → 3 produzir
(constructor ×2 : monta ×1). Derivation in `ng-brain-core.cjs:deriveRung` from events
+ memory; struggle drops the rung (frequency and difficulty are decoupled: urgency
picks WHAT repeats, rung picks HOW it's met). Reviews retrieve at the brick's rung;
`guide_dial.review_style='gentle'` reverts all reviews to flips.

**Leeches**: `isLeech()` — ≥6 recent reps, ≥70% fails, no q≥4, no two q≥3 in a row →
parked out of guided fill (due reviews still honored), surfaced as `parked_count`/
`parked[]` in the guided response. Reframe step NOT yet built (spec §4.3).

**Register Law**: single source `functions/register-law.cjs` (GENERATE + GRADE
variants) imported by all 12 generators. Deterministic linter `register-lint.cjs`
(a gente / tu / vós / mesóclise / synthetic future) wired observe-only into radio +
lesson-gen. Bank healer `ng-register-sweep.js` (heartbeat + nightly) rewrites
violating bank bricks via Haiku, lint-verified before save. History: the nós rewire
had MISSED `ng-luna-session.js` (it taught "use 'a gente', never 'nós'") — fixed.
The owner's screenshot caught live 'a gente' bank content — hence the sweep.

**English chrome law**: every label/instruction/status/button is English.
*Portuguese on screen is always learnable content, never interface.* Brand names stay
(Radio Carioca, Luna, Máquina do Tempo). Two hardcoded owner names were removed
(nightly-brain prompt, home greeting) — the name-free principle is enforced; grep for
regressions when touching prompts.

**Flow**: no gates anywhere. Treino auto-starts (10 min, timer chip = +5/tap), guided
deck prefetched from Home (`GUIDED_PREFETCH`, 3-min freshness), arc opens with 2
low-rung wins, speed finale closes. Placement machinery dormant (not a gate; future
opt-in "skip ahead" tool). Aula lesson pack prefetches from Home.

**Shelf**: no locks — "distance is information, never permission." Zero-to-hero floor:
First Contact (16 bricks) → Me & You (10) → Numbers & Money (10), hand-authored
register-true, planted idempotently by heartbeat (`ng-seed-first-contact`,
`ng-seed-worlds`). "I know this" on new flip cards → `ng-memory action:'know'` →
trusted 30d prior + controlled, `source:'known'`, NO ledger event (priors are beliefs,
reps are evidence).

**Victor loop**: import parses real "Day N"/"Dia N" per chunk → `source_day` on the
suggestion payload → stamped onto stages at approval → Victor deck sorts newest-day
first, with scopes recent (top 2 days present) / older / all. UI: Study → 📓 Victor →
three chips.

**Feel (v1)**: universal button press (CSS `:active` scale 0.955, 90ms spring),
`up` keyframe overshoots, verdict motion (pop / one dry shake via `flash` state in
NGTreino), sound = puh-ting on correct (owner's explicit ear-verdict: bouncy/light
beats percussion for the reward sound), light tick on tap, soft surdo thud on miss,
pandeiro-roll + surdo + cuíca on session complete. **Real sampled one-shots remain
the upgrade path.** Haptics do NOT exist in iOS Safari — don't promise them.

**Backbone**: brick kinds backfill nightly (`ng-brick-kinds`, Haiku, 25/night, stored
as `stages[].kind`: chunk/verb-form/connector/time-word/person-form/slot-phrase/vocab).
Hybrid machinery deleted (`ng-self-extend` KEPT — live ladder extension). Monta grading:
`ng-write-eval mode:'monta'` (no target; missing brick caps q3).

## 2 · Verification discipline (non-negotiable)

- Build: `npm run build > log 2>&1; echo $?` — NEVER pipe-then-`$?` (that reads the
  pipe's exit). This exact mistake happened; don't repeat it.
- SSR smoke: scratchpad `smoke.mjs` pattern — vite SSR-bundle App.jsx (outDir INSIDE
  repo `node_modules/.smoke-ssr` for react resolution), stub browser globals, assert
  renderToString length. Catches TDZ and module-scope crashes.
- Behavioral harnesses run the VERBATIM extracted code (sed by anchors), never
  re-typed logic — and are validated by demonstrating the OLD code fails
  (the radio harness only counted once it reproduced the freeze).
- Pure engine logic lives in `ng-brain-core.cjs` precisely so it's testable without
  a DB. Extend the pattern; don't inline subtle math into the handler.
- Python edits: assert anchor counts before replace (an unmatched `str.replace`
  silently no-ops — the "anchor drift" hazard bit once via a fancy-quote mismatch).
- Netlify: sync fns die ~10–26s; awaited-send dispatch (1.2s AbortController) for
  fire-and-forget chains; progressive DB writes; heartbeat is the app's cron.
- `functions/*.js` are CJS but repo package.json is `"type":"module"` — shared
  modules must be `.cjs`. Netlify's bundler doesn't care; local node does.
- Beware `w['constructor']` on plain objects (Object.prototype leak made NaN weights
  and silently removed the constructor atom from all rotation for months). Use
  `typeof w[k]==='number'` guards for JSONB-sourced maps.

## 3 · The owner (operating covenant)

Full creative/dev control is granted and phase-gated: investigate → build → verify →
deploy → report honestly. He audits on-device and returns precise screenshots — treat
them as QA gold (one caught the 'a gente' bank bug). Feel is tuned by HIS thumb: ship,
ask for one-word verdicts, iterate (he overruled percussion-on-correct for puh-ting —
his call wins over any brief). Never reverse without naming it: nós register, timer
law, placement safety, no-assumption, English chrome, fail-loudly. No gimmick
mechanics — every pull must survive being understood ("wolf test"). Dense honest
reports; never claim done without the verification ledger.

## 4 · Forward specs (designed, not built — execute in roughly this order)

### 4.1 Speaking atom — 'falar' (the mouth) — DISCUSS DESIGN WITH OWNER FIRST
The single highest-value pedagogical gap: production is typed-only outside Luna.
Design: a rung-3+ atom. UI = push-to-talk button on a constructor-style card
(prompt: item.en). Pipeline: MediaRecorder → `ng-transcribe` (Whisper, exists, used
by Luna) → transcript → `ng-write-eval` (mode:'falar', same rubric; add a note that
transcription noise ≠ learner error: judge meaning/grammar leniently on homophones/
punctuation). Log mode:'falar' → production. RUNG_OF_MODE gets `falar:3`. Guards:
mic permission fail → fallback constructor; offline → reorder. Rotation: join rung 3
pool at low weight initially (['constructor','constructor','monta','falar']).
iOS Safari: MediaRecorder works (Luna proves it); audio unlock via first gesture.
Do NOT gate on pronunciation scoring v1 — Whisper's transcript IS the pronunciation
test (if Whisper heard the right words, the street will too).

### 4.2 Carioca-accent TTS — LANDSCAPE + OWNER DECISION NEEDED
Current: OpenAI tts-1 everywhere (radio voices praised but São Paulo-flavored).
Options to research/present: ElevenLabs (voice cloning — could clone a consenting
carioca speaker; cost/latency higher), Azure pt-BR neural voices (several, still not
carioca-specific), Google Chirp, or keeping OpenAI + accepting the accent gap.
Recommendation to present: ElevenLabs cloned voice for single-phrase/escuta audio
(quality where pedagogy needs it), keep OpenAI for radio's improv bulk (cost).
Needs owner discussion (his explicit ask) + an API key decision. TTS is wrapped in
`ng-tts.js` + `ng-radio.js` VOICE_MAP — swap points are clean.

### 4.3 Leech reframe (detection/parking is LIVE; this is the healing half)
Nightly-brain step: read parked leeches (recompute via isLeech over events, or pass
from a guided call), for each: Haiku call under REGISTER_LAW_GENERATE — "same meaning,
simpler/shorter/more chunk-like rewrite, or split into two bricks." Replace stage pt
(lint-verified) OR mark stage kind:'chunk', log to brain_log loudly ("Reframed X —
it kept beating you, so it comes back wearing different clothes"). Cap 5/night.

### 4.4 Capability verification (Can-Do earned by performance)
A Can-Do (unit) flips to "✓ yours" only via a PERFORMANCE: completing a Cena in that
world with all gaps ≥q3, or (later) a falar/monta set. Store `earned_at` +
`earned_by` on ng_path_units. The trilha 'solid' stability gate stays as the
*eligibility* signal; performance is the *proof*. Surface: shelf badge language
("provable" → "proven"). This kills the "stats said I could" doubt.

### 4.5 Visual heat pass — NEEDS OWNER'S EYES
Held deliberately. Method: he screenshots the most "boffin" screens; heat those
specifically (saturation up on active elements, ouro accents, bigger type moments on
Ganhos count, Calçadão wave as section motif — `Poste` SVG already has the wave path).
Do NOT blanket-recolor; the floresta/ouro identity and GR=earned-only law stay.

### 4.6 VoiceMode (Luna) internal strip
Her classic branches are unreachable (props defaulted, ngMode=true at the only mount)
but ~100 lines of dead weight + `mk` helper survive. Strip with the falar work (same
file, one verification pass): remove !ngMode branches, luna-session/luna-session-end
endpoint switches, addToDeck classic path, then delete `mk`.

### 4.7 Endpoint security (before ANY second device/user)
All endpoints are unauthenticated. n=1 obscurity holds for now. Real fix is Supabase
auth + RLS (multi-user unlock), not a shared secret in a public JS bundle. When
multi-user starts: RLS on all ng_* tables, session JWT through `ngFetch`, UID from
token not constant. Until then: don't ship the URL anywhere public.

### 4.8 More worlds + Can-Do statement framing
Next worlds when appetite exists: Directions & Transport, Food & the Boteco Menu,
Making Plans. Same hand-authored seeder pattern (canonical A0/A1 content: author,
don't generate). Longer-term: retitle units as Can-Do statements ("I can order and
banter at a boteco") — copy change + `situation` field already carries the meaning.

### 4.9 Radio linter escalation
Linter is observe-only. After ~2 weeks of brain_log data: if flag rate is ~0, keep
observing; if regular, escalate radio/lesson-gen to regenerate-on-flag (one retry,
then ship-with-log — never block the show).

## 5 · Live telemetry to watch (the honest scoreboard)
`ng_scaffold_events`: sessions/week, reps/session, avg quality trend, mode mix
(constructor+monta+falar share should RISE as rungs mature). `ng_memory`: production
stability distribution. brain_log: register_sweep healing counts (should hit zero),
lint flags, leech parks. If avg quality sits >4.5 the governor band may be too soft —
raise stretch aggressiveness before adding new material load.
