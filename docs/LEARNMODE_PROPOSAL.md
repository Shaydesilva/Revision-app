# Learn-mode redesign — proposal (v1, for discussion)

**From:** Fable · **Status:** design for your reaction — nothing here is built yet.
**Inputs:** the seed brief (principles), the handover brief (terrain), and a full read of the live selection machinery (`ng-frontier.js`, `NGTreino`'s `atomFor`, `ng-session-end.js`, `ng-placement-seed.js`, `ng-path.js`).

One structural fact from the code drives a lot of what follows: **per-brick atom sequencing does not exist today, but every signal it needs is already recorded.** `atomFor` picks the atom by queue position — `bag[(i*7+3)%bag.length]` — weighted only by the global `atom_weights`. It never looks at the scaffold's own history. Meanwhile `ng_memory` (stability per skill) and `ng_scaffold_events` (every rep, with atom + quality) already hold the full per-brick story, and `stages[].practice_count / modes_used / acquired` are written at creation and never read — dead fields. The redesign mostly *uses what's already there*.

---

## 1 · The model: Bricks, Builds, Can-Dos

### Bricks
A brick **is** a (scaffold, stage) pair — the exact unit the memory engine already tracks. No new entity, no data migration, ONE CLOCK untouched. Two additions:

- **`brick_kind`** — a lightweight classification written onto `ng_scaffolds` by a one-time AI pass (then set at creation for new material): `chunk` (frozen phrase), `verb-form`, `connector`, `time-word`, `person-form`, `slot-phrase` (a frame with a hole). Kind is what makes bricks *snap* — it powers the Lego surfaces and the monta atom (§5).
- **`rung`** — not stored, *derived* per brick from memory + recent events (§3). The brick's current position on the gentle→demanding ladder.

### Builds
A build is not an entity — it's the **posture**: the reward lives in combining bricks into real sentences. Concretely it shows up as (a) the constructor reframed around a visible brick tray, (b) a new `monta` atom (§5), (c) Cena gaps styled as brick slots. Every build is still just reps flowing through `ng-session-end`.

### Can-Dos
Can-Dos replace units as the organising surface. A Can-Do = a named real-world capability ("Consigo pedir e zoar no boteco", "Consigo contar como foi meu dia") + the bricks that serve it + a **derived** state.

- **Data:** `ng_path_units` already has title / situation / scaffold_ids / threshold_days — it *is* the Can-Do table. We reread it, we don't rebuild it. The 25-unit spine's pedagogical DNA (Máquina do Tempo especially) survives as capability groupings.
- **What dies:** `locked` status, completion as progress, levels as displayed rank. **Every Can-Do is enterable, always.** Availability without presumption.
- **What replaces "locked":** a *distance reading*, not a gate — "8 of 11 bricks solid", "within reach", "fresh territory". Derived live from `ng_memory` production stability vs `threshold_days` (the solid-gate math already in `ng-path.js`). You can walk into "fresh territory" anytime; the app just tells you honestly what's in there.
- **Bounded-feeling without gating:** the Can-Do shelf is *curated and finite* (~25-30 named capabilities, growing organically from Victor + street finds + life), grouped by world (Sobrevivência / Tempo / Identidade / Rio Social / Profundidade). A named, scannable shelf is what kills the shark-ocean; the absence of locks is what kills the assumption. Layer-1 depth-generation (72h cooldown) survives as *rooms deepening* — generative, not status.

---

## 2 · No assumption, technically

Three moves:

1. **The placement gate retires.** First open goes straight into a gentle guided session (recognition-forward for unmet bricks); the engine learns from real reps from minute one. `ng-placement-seed` stays as a dormant endpoint (optional "calibrate me" tool later, maybe), but nothing in the entry flow ever again decides what he is.
2. **"Já sei"** — everywhere a brick surfaces (roam card, session card, Can-Do sheet), one tap marks it known. It writes a *trusted* prior: production stability ~30d + controlled, same class of write as `ng-placement.js`'s earned-key path. Trusted, not humble — the principle is *no proof-of-knowledge grinding*, and decay self-corrects if the tap was optimistic. (Fork #3, §8.)
3. **Phase is demoted to a rubric dial.** It already mostly is one (`ng-write-eval` weights). It keeps growing the grading up; it never gates content or deck eligibility again. The frontier's phase-progression bookkeeping can stay as telemetry.

---

## 3 · The rung ladder — atom sequencing by per-brick progress

*(This is handover Item 3 and seed question #6 — the convergent piece.)*

Every brick sits on a rung. Atoms belong to rungs:

| Rung | Feeling | Atoms |
|---|---|---|
| 0 · conhecer | just met | flip, recog |
| 1 · apoiado | assisted | reorder, cloze, escuta |
| 2 · discriminar | can tell right from wrong | duel, conserta, timeline (grammar) |
| 3 · produzir | demanded in full | constructor, monta; later say-it |

**Derivation (server-side, in `ng-frontier`, which already loads events + memory):**
- Start at rung 0. Advance when the last 2 events *at the current rung* average quality ≥ 3.5 (or production stability alone clears a threshold — outside knowledge fast-tracks: a "já sei" brick starts at rung 3).
- **Struggle drops the rung.** A quality ≤ 2 at rung *r* sends the brick to *r−1* for its next appearances. This is the direct fix for "failing hard scaffolds only surfaces them more": the weak-spot machinery keeps choosing *which* bricks appear more (urgency/struggle boosts, unchanged), but the rung decides *how* they appear — more often **and more gently**. Frequency and difficulty finally decouple.
- Each deck item arrives with its `rung` attached; `atomFor` picks *within* the rung, with `atom_weights` biasing inside it (Layer-3 survives, its consumption point moves).
- The card→write cliff disappears structurally: no brick meets `constructor` until it has passed rungs 0–2. The jump he feels today is `atomFor` being blind — this makes it sighted.

**Trade-off to hold consciously:** desirable difficulty. A ladder this gentle could under-stretch. Two counterweights built in: advancement needs only 2 good reps (fast for easy bricks), and reviews run *at the brick's rung* — a solid brick reviews at production, which is both better science and a quiet fix for the self-grade-calibration weakness (flip's honesty drift). Cost: production reviews are slower than flip-taps, so session pace drops. (Fork #1, §8.)

---

## 4 · The guided engine — 65/35 and the why

A new deck type in `ng-frontier`: **`guided`** (evolves `session`, reuses the urgency machinery).

1. **Relevance picks the room.** Score each Can-Do: Victor-recent material in it > it's the active/nearest capability > life_context match > shelf order. Highest becomes today's room.
2. **Retention fills the 65%.** Due reviews first (the ONE CLOCK, untouched), then fading bricks (retrievability in the 30–70% band) — preferring the room's bricks on ties but never withholding a due review because it lives elsewhere.
3. **The room supplies the 35% new** — its unmet bricks, rung-0 entry.
4. Composition per ~20-item block: 13 retention / 7 new, recomputed on refetch, so the dial holds across an endless session.
5. **The why is composed at selection time,** from the actual reasons, in one human line: *"As frases de terça do Victor tão quase sumindo — 13 delas, e 7 novas do mundo boteco."* Server returns `why` with the deck; it's the session header. Long-press any card for its micro-why ("due 2 days ago", "new — serves 'pedir no boteco'"). Transparency on demand; no Layer-3 language anywhere on the surface.

---

## 5 · Flow and surfaces

**Entry (flow first).** App opens → the guided deck was already prefetched in the background → Home *is* the first card with the why-line above it. Zero configuration. The 10-min clock (his median) starts on the first answer; minutes stay changeable *during* the session via a quiet control — the choice exists, the gate doesn't. The timer-is-the-only-cap law, endless refetch, grammar guarantee, Ganhos: all survive unchanged underneath.

**Guide me / Roam.** Guided is the default motion (above). **Roam** is one tap away: the brick shelf, default-sorted by *fading first* (serendipity — "oh, right, that one"), with lens chips: Tema / Victor / Solidez / Novo. Tap a brick → its card (stages, memory age in plain words, já sei, practice-now). Tap a Can-Do → enter that room (a `seedUnit`-style session, machinery already exists). No map metaphor. Never required for anything.

**Lego posture.** Constructor gets a visible brick tray (the person-form, verb, connector chips in play — tap or type, rubric-v2 grading unchanged). Reorder chips become bricks visually (snap motion + sound). Later, the purest atom — **monta**: given 2–3 bricks, build *any* true sentence using them, graded by rubric + brick-inclusion. New atom = new mode string through `ng-session-end`, nothing else.

**What goes quiet (hide the smartness).** Constellation, Matrix, brain-log narration, phase/level displays → behind one "curiosidades" deep-cut. The Matrix keeps feeding Tempo Can-Do internals; it stops being a face. **Fail loudly stays:** empty guided deck, dead TTS, failed generation — all get a visible one-liner, never a silent shrug (the radio-restart fix just shipped sets the pattern).

**Aula.** The three acts survive as optional depth *inside* a Can-Do room (Escuta/Cena, `lesson_cache` keyed as today). Not a sequence to complete — a place to go deeper.

---

## 6 · Sensory layer — commitments and one honest limit

Prototype-by-feel workstream, deliberately not specified here beyond commitments: motion tokens (150–250ms, spring curves, every touch moves something *now*); a Rio percussion SFX kit (surdo hit = correct, agogô run = rung-up, cuíca groan = a miss that stays playful, pandeiro roll = session close) as preloaded Web Audio sprites, <80ms; visuals stay green/gold but louder, warmer, higher contrast.

**The honest limit: iOS Safari PWAs have no haptics API.** `navigator.vibrate` doesn't exist there. The brief's haptic channel is unreachable without a native wrapper (a future consideration, not a small one). Sound + motion have to carry the crispness alone — they can, but I'm not going to pretend the third channel is available.

---

## 7 · Migration — four shippable phases, each reversible

Nothing in any phase touches `ng_memory`, `ng_scaffold_events`, or the one write path. Register Law untouched.

- **Phase 0 (invisible):** `brick_kind` AI pass; rung derivation in `ng-frontier`; deck items carry `rung` (unused).
- **Phase 1 (felt immediately, inside the current Treino shell):** rung-aware `atomFor`; `guided` deck + why-line; struggle-drops-rung. *This alone answers his two sharpest pains — the card→write cliff and weak-spot punishment.*
- **Phase 2 (structural):** flow-first Home; Can-Do shelf replaces the trilha view (`ng_path_units` reread, locks and level-display removed); placement gate retired; "já sei" everywhere.
- **Phase 3 (feel):** Roam shelf; Lego constructor framing + monta; sound/motion pass, tuned by feel with him on device.

Rollback at any phase = stop reading the new fields; the old semantics still hold underneath.

---

## 8 · The forks I want your call on

1. **Reviews at the brick's rung, or keep flip-fast reviews?** Rung-based is better science and fixes self-grade drift, but production reviews are slower — fewer reps per session. *My recommendation: rung-based, with flip retained for rung-0/1 bricks.*
2. **65/35 — hard dial or hard floor?** Strictly 13/7 per block, or "at least 65% retention" with new material allowed to shrink when reviews pile up? *Recommendation: hard floor — retention debt beats ratio purity, and the why-line explains it honestly ("hoje é dia de segurar o que é teu — 18 due").*
3. **"Já sei" trust level:** full retire (30d prior + controlled) vs humble prior (2d, placement-style)? *Recommendation: trust him — 30d. No-grinding is the principle; decay self-corrects; he's the only user and he audits.*

Everything else in this document I'm treating as mine to build once you've reacted — push back anywhere.

---

## 9 · Honest ledger

- Nothing above is implemented. The radio restart fix (separate commit) is the only code shipped so far.
- The atom-by-atom fitness audit (handover Item 2) is folded into the rung design but not *finished* by it — individual atom refinement stays an ongoing collaboration, and the rung table above is its new frame.
- Audio overhaul (Item 5) and the Victor mode (Item 4) are deliberately out of scope here; the Victor mode drops naturally out of this design (a Victor lens is already a roam lens, and a Victor-filtered guided room is one deck variant) — day-ordinal tagging at import remains its enabling piece.
