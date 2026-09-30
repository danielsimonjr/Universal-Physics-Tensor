# Active Engineering Backlog

This file is the machine-audited backlog for **current code work**. Historical implementation plans under `docs/planning/` are frozen design/review records; their unchecked boxes preserve the state of those documents at the time and are not a live completion ledger.

As of v0.44.1 completion hardening, there are no known unimplemented code tasks that block the repository's stated purpose as a computational laboratory for organizing, composing, evaluating, and confronting physics relations.

The next strategic evolution of the project is defined in [`Scientific-Bridge-Discovery-v1.md`](docs/planning/Scientific-Bridge-Discovery-v1.md) (re-audited against the v0.44.1 tree on 2026-08-19; see [`Scientific-Bridge-Discovery-v1-AUDIT.md`](docs/planning/Scientific-Bridge-Discovery-v1-AUDIT.md)): a phased plan that **freezes** the shipped identification funnel (`upt discover` / `VettedCandidate`) and, separately, adds an experimental expression/residual search pipeline (`src/composition/probe/`, CLI `upt probe`). That roadmap is intentionally separate from this machine-audited release-blocking backlog until individual phases are promoted into active engineering work. Do not treat Tranche A as authorized by this sentence.

Ongoing work that requires domain judgment rather than code completion lives in [`CONTRIBUTING.md`](CONTRIBUTING.md). Longer-horizon engineering ideas that are explicitly not release blockers live in [`Future-Production-Hardening.md`](docs/planning/Future-Production-Hardening.md).

## Release-blocking code

No open items.

## Active sprint — Atlas Roadmap, Sprint 6 (study, scoped release, discovery hypothesis, target v0.57+)

> **Heading corrected 2026-09-21.** It read "Phase 0 (oscillator pilot, target v0.46)" while the
> entries below had moved on to Sprint 2 — the ENTRIES were current and only their title was not.
> Worth saying why that is more than cosmetic: this file is the authorization gate, and a reader
> checking what is authorized reads the heading first. Sprint 0's box is open on purpose (two
> ROADMAP §7 exit criteria are unmet and neither is code), so a title naming Phase 0 next to a
> deliberately-open Phase 0 box reads as "still working on Sprint 0" rather than "Sprint 0's box is
> held open while Sprint 2 runs". Two correct signals combining into a wrong impression.
>
> **Heading moved to Sprint 3 on 2026-09-22** when Sprint 3 was promoted. Sprint 2 is CLOSED
> (lead wrap c43b442, CI green); its entry stays below as the record.
>
> **Heading moved to Sprint 4 on 2026-09-22** when Sprint 4 was promoted. Sprint 3 is CLOSED
> (landed on `master` at 786dceb, CI green, 4,326 tests); its entry stays below as the record.
>
>
> **Heading moved to Sprint 5 on 2026-09-22** when Sprint 5 was promoted. Sprint 4's code is
> complete (a3b5de2) and its box stays OPEN on purpose: one ROADMAP exit criterion is unmet (see
> its entry).
>
>
> **Heading moved to Sprint 6 on 2026-09-22** when Sprint 6 was promoted. Sprint 5's code is
> complete (84e75da) and its box stays OPEN on purpose ("κ reported" needs people).
>
> **Every sprint of the plan is now promoted; none is unauthorized.** The note that used to stand
> here said which sprints were NOT authorized: "3–6" until 05:50, "4–6" until 12:1x, "5–6" until
> 15:1x and "6" until 15:4x today; each promotion below made the previous wording FALSE. A note that is
> corrected once and then not re-checked when the thing it describes moves is the same rot it was
> written to fix, so **narrowing this range is part of promoting a sprint, not a follow-up.**

- [ ] **Sprint 0 — Oscillator pilot.** Promoted 2026-09-20 by the Lead, which is what authorizes
  [`Atlas-Roadmap-Implementation-Plan.md`](docs/planning/Atlas-Roadmap-Implementation-Plan.md) Sprint 0; nothing
  in that plan is authorized until its sprint is promoted here, and this line is the audited
  ledger (`tools/plan-doc-audit` walks this file only — the `- [ ]` boxes in the plan document
  itself are inert records).
  **Scope:** five typed bridges, one rejection, fifteen executable witnesses (`W1, W1a, W1b, W2,
  W2b, W3, W4, W5, W6, W7, W7b, W7c, W8, W8b, W9`), one complete record, the `(K, δ)` algebra and
  the family's regime records — all under `src/atlas/`, off the public barrel, with no change to
  any existing type. Curation cost is measured per bridge by relation type.
  **Entry conditions:** this line, plus `docs/planning/Atlas-Phase-0-Design.md` existing with Adam
  returning GREEN or a resolved YELLOW on it.
  **Boundaries:** every new symbol under `src/atlas/` is `@internal`; nothing is re-exported from
  `src/index.ts` before Phase 6; `BRIDGE_EQUATIONS` (55 rows) and `CATALOG_GRAPH` (41 edges) do
  not change shape; the pinned funnel counts 132 / 7 / 35 / 20 / 0 / 70 do not move.
  **▶ Status 2026-09-20 — code COMPLETE, box deliberately still OPEN.** All fifteen witnesses pass;
  126 atlas tests inside 384 files / 3,959 tests, exit 0; the JSON artifact is deterministic; the
  boundaries above all held (nothing on `src/index.ts`, 55 rows, 41 edges, funnel counts unmoved).
  The box stays unticked because two exit criteria in [`ROADMAP.md`](ROADMAP.md) §7 Phase 0
  are NOT met, and neither is code: **independent physicist review has not happened**, and
  **curation cost was measured per agent, not per bridge** — the scope line above says "per bridge
  by relation type" and that is not what was instrumented
  ([`Atlas-Phase-0-Curation-Cost.md`](docs/planning/Atlas-Phase-0-Curation-Cost.md) states so and does not
  estimate the missing rows). Ticking this on the code alone would record a measurement that was
  never taken. **Sprint 1 is therefore not promoted**; promoting it needs a decision on whether to
  accept the per-agent cost figure or re-measure.
  **Instrumentation fix carried into Sprint 1:** one agent per bridge where bridges are
  independent, or per-bridge start/stop timestamps in each agent's deviation report.

- [x] **Sprint 1 — Relation contracts as an additive overlay.** Promoted 2026-09-20 by the Lead
  under a standing instruction to run Sprints 0–6 continuously. That instruction is the decision
  the Sprint 0 entry above says is needed; recording it here rather than leaving the gap silent.
  **The per-bridge cost gap is addressed, not waived:** every Sprint 1 brief that owns more than
  one unit of work must timestamp per-unit start/stop in its deviation report, so Phase 1 returns
  the per-type measurement §L0.2 asks for and Phase 0 could not supply.
  **Scope:** `relation?`, `conventions?`, `counterexamples?` as OPTIONAL fields on `BridgeEdge`,
  `BridgeEquationEntry` and (`conventions?` only) `CanonicalEquation`; evidence tags **derived,
  never stored**; an `Association` registry; the 8×8 composition table defaulting to
  `no-composite-claim`; one overlay reconciled with the probe's existing `RelationKind` /
  `AuditState`.
  **Entry conditions:** this line, plus `docs/planning/Atlas-Phase-1-Design.md` carrying the
  reconciliation table and the composition matrix, with Adam GREEN or a resolved YELLOW on it.
  **Boundaries:** additive only — an edge or entry without overlay fields must behave
  byte-identically to today; `BRIDGE_EQUATIONS` stays 55 rows and `CATALOG_GRAPH` 41 edges;
  nothing new on `src/index.ts`; `src/composition/probe/types.ts` keeps
  `RelationKind`/`AuditState` and imports nothing from atlas; `docs:deps` reports no new cycle.
  **⚠ Boundary CORRECTED 2026-09-21 06:05.** This line previously said "no row edits", and that was
  wrong — it would have forbidden S1.5, which is the brief whose entire job is adding overlay fields
  to ten catalog rows. The invariant that actually holds is about COUNT and SHAPE, not immutability:
  no row is added or removed (55 stays 55, 41 stays 41), `status` is never touched, and rows gain
  only OPTIONAL overlay fields. Waves 1-2 edited no rows because they had no reason to, and I
  mistook that circumstance for a rule. **A consequence the wrap must not forget:** row edits
  invalidate the deep-equal pin in `tests/bridges/catalog-json.test.ts`, so that suite is EXPECTED
  RED from the moment S1.5 lands until the Lead runs `bun run catalog:json`.

  **▶ WRAPPED 2026-09-21 07:35. Ticked because Sprint 1's OWN scope is delivered; the ROADMAP
  Phase 1 exit criteria are a separate bar, and §7 records which one is NOT met.** On master, CI
  green at 8e8784f. Full suite 393 files / 4,083 tests, typecheck 0. Measured coverage: schema 55 ·
  audited 10 · not-yet-audited 45 · verified 0; atlas 5 bridges, 0 reviewed.
  Three exit criteria met (every field classified, coverage distinguishes the tiers, the five pilot
  bridges re-register). **One NOT met and not claimed:** "Eve spot-checks a random sample against
  the cited sources" — Eve reviewed design and code and returned two findings that both held, but
  she has no access to the papers and checked no citation against its source. I verified four of 22
  myself and confirmed none cites our own docs, which is a WEAKER claim than the criterion makes.
  `verified: 0` is the honest reading of it.
  **Adversarial review earned its place.** Adam caught a contradiction inside the implementation
  plan and an evidence rule that handed out free tags via `{}`; Eve caught a vacuous catalog
  measurement and a semantic clash that exposed a HALF-IMPLEMENTED deliverable — the
  rejection-counterexample link existed only for BE-35 while a special case forced the tag onto
  four other rows from no artifact at all.

- [x] **Sprint 3 — Hyperedges, models, and the poster index.** Promoted 2026-09-22 05:50 by the Lead
  under the same standing instruction to run Sprints 0–6 continuously. **This line is what authorizes
  the plan's Sprint 3 briefs**; nothing in that document is authorized until its sprint is promoted
  here, and the `- [ ]` box is the audited ledger (`tools/plan-doc-audit` walks this file only).
  **A NOTE ON WHY THIS WAS LATE, corrected 2026-09-22 05:50 by the user.** Sprint 2 closed at 03:30
  and this was not promoted until he asked why I was waiting on him. The standing order already
  covered it, promotion is the Lead's act, and none of the confirm-first walls apply to
  implementation work in this repo.
  My first write-up of this said I had "accepted a peer's framing over a standing user order" and
  that "a peer cannot narrow an authorization the user gave". **That is wrong and the user corrected
  it: Mothership has authority to act on his behalf.** Her judgement that Sprint 3 was his call was a
  legitimate exercise of that authority; it was simply mistaken, which is a different thing and must
  not be recorded as an authority failure.
  **The error was mine and it was narrower.** The charter says that when my judgement and a standing
  order conflict I say so rather than silently complying or silently deviating. I saw the tension
  between "run Sprints 0–6 continuously" and her framing, and I silently complied — I neither raised
  it with her nor acted on the order. Surfacing a conflict costs one message; absorbing it costs a
  sprint.
  **Scope:** `Statement` and `Derivation` (many premises → one conclusion) with a
  compatibility-checked `contextUnion`; the `Model` record promoted from Sprint 0's `AtlasModel`
  (boundary/initial data, symmetry group); `CanonicalEquation.model?`; the sixteen poster entries with
  their hidden supporting nodes; all fifteen Appendix A bridge lines typed as Appendix A types them;
  `upt map --source=poster`.
  **Entry conditions:** this line, plus `docs/planning/Atlas-Phase-3-Design.md` existing with Adam
  returning GREEN or a resolved YELLOW on it.
  **Boundaries:** every new symbol stays `@internal` and off `src/index.ts` before Phase 6; only
  EXACT hyperedges compose, and a composite's premises are the union minus internal conclusions;
  incompatible assumptions are NEVER pooled in a context union; `7 ↔ 16` is an association for the
  historical link only. **No test pins the canonical count at 103** — `registry.test.ts` and
  `seed-l-layer.test.ts` compare against `CANONICAL_EQUATIONS.length`, so the number lives in PROSE
  and drifts silently when L1 entries are added.
  **⚠ CORRECTED 2026-09-22 — "the number lives only in `CHANGELOG.md`, `ROADMAP.md` and the
  architecture docs" was FALSE, and it is the most dangerous sentence this sprint wrote.** The
  literal is in **22 files**. When Sprint 3 moved the count 103 → 107, the new gate
  `tests/canonical/canonical-count-prose.test.ts` named SEVEN stale locations across seven files,
  **four of them absent from that three-file list** — including `README.md`, `todo.md` and
  `docs/specification/Part-V.md`. A reader who trusts the list leaves four live product documents
  stale and believes the job is done. **Trust the gate, which DISCOVERS the files; never the list.**
  `CHANGELOG.md` history and `docs/architecture/archive/` are correctly excluded — they are history,
  not claims about today.
  **▶ WRAPPED 2026-09-22 11:5x.** Landed on `master` at 786dceb after Wave 2's typecheck repair.
  Verified independently by Mothership rather than relayed: CI completed/success, 4,326 tests across
  409 files with 0 failed, `tsc` AND `tsc -p tsconfig.tests.json` both clean, `docs:deps` 0 circular.
  **Two design calls recorded here because they live in no design note:** `composeDerivations`
  returns a DISCRIMINATED UNION rather than throwing (the plan and the roadmap line both say
  "throws"; the refusal is the correct OUTPUT, and `composeDerivationsOrThrow` keeps the plan's
  contract testable); and the poster's `8 → 12` arrow is recorded **DIRECTION UNRESOLVED** — a
  review argued it is backwards, but that rests on an entry identification nobody can verify without
  Blueprint v2 Appendix A, which is not in the repo. It is neither fixed nor filed as a defect.

- [ ] **Sprint 6 — Study, scoped release, discovery hypothesis.** Promoted 2026-09-22 by the Lead on
  Mothership's assignment of S6.1–S6.7. **This line is what authorizes the plan's Sprint 6 briefs.**
  **Two dependencies stated where they bind:** (1) S6.1/S6.2 score the FROZEN set, which is empty
  until independent authors exist, so the study script REFUSES (exit 3, writes nothing) rather
  than report a table from nothing; (2) S6.7 moves symbols onto the public API, an ADR-level call
  that goes to Mothership — the review is prepared, not applied. **Measured is not exercised:** the
  study's empty-set refusal is measured; its success path on a real frozen set has NEVER RUN
  (`Atlas-Phase-6-Design.md` §0).

- [ ] **Sprint 5 — The invalid-bridge benchmark.** Promoted 2026-09-22 by the Lead on Mothership's
  assignment of S5.1–S5.5 to the Atlas-Roadmap session. **This line is what authorizes the plan's
  Sprint 5 briefs.** **Scope:** item schema, loader and leakage checks; the atlas condition runner;
  deterministic in-tree baselines; statistics and power report; the pre-registration note.
  **The independence wall, stated where it binds:** no agent — this session or any subagent —
  authors a FROZEN item. Agents build the harness and may draft only into `contested/`, marked
  `authorship: 'contested-draft'`. The frozen set, its two named κ raters, and therefore the
  pre-registration's item-set hash all require independent human authors. Until they exist the
  Phase 5 exit criteria ("κ reported"; "thresholds frozen before any condition runs") cannot be
  met by code, and the entry says so rather than letting the harness stand in for the study.
  **Status 2026-09-22: code COMPLETE (S5.1–S5.5, pre-registration registered). Box held OPEN on
  purpose:** ROADMAP exit "κ reported" is UNMET — it needs two named raters and independent item
  authors, which no agent can supply. "Held-out family fixed" MET; "thresholds frozen in a
  pre-registration note before any condition is run" MET (no condition has run).
  **Held-out family: FLUID STATICS** (hydrostatic pressure, buoyancy, Pascal, barometric formula) —
  never added to `src/atlas/` while the benchmark is live. **Corrected from the plan's
  "first-order relaxation"**, which Phase 0 already encodes as `model-first-order` (b x′ + k x = 0);
  measured and argued in `Atlas-Phase-5-Design.md` §4.

- [x] **Sprint 4 — Verification workflow and checked bridges.** Code COMPLETE 2026-09-22 (S4.1–S4.6 +
  closure, a3b5de2). **Reviewed `formalRef` is met at 6**, which meets the ≥5 gate: five rank-1
  PhysJS lemmas and the pendulum reference retargeted at PhysJS. The owner deferred the criterion
  on 2026-09-24 (Amendment 10), so it does not block DONE; the count is no longer 1 of 5. Side by
  side, not merged: "≥ 20 bridges across ≥ 5 relation types" is **MET** (20 / 6). Promoted 2026-09-22 by the Lead
  under the same standing instruction to run Sprints 0–6 continuously, and on Mothership's direct
  assignment of S4.1–S6.7 to the Atlas-Roadmap session. **This line is what authorizes the plan's
  Sprint 4 briefs.**
  **Scope:** the applicability checker (dimensions, conventions, side conditions, model
  compatibility); symbolic and numeric witness runners with `unresolved` on peer-absence or timeout
  and two-resolution `convergence`; `formalRef` with a `fidelity` field; `formally-proved` and
  `symbolically-checked` DERIVED from a committed results artifact and never hand-set; the diffusion
  and wave families; ≥ 20 bridges across ≥ 5 relation types.
  **Entry conditions:** this line, plus `docs/planning/Atlas-Phase-4-Design.md`.
  **Boundaries:** every new symbol stays `@internal` and off `src/index.ts` before Phase 6; **no
  test writes into the tree** — the witness-results artifact is emitted by a Lead-run script and
  pinned by a deep-equal test, the `atlas-json` pattern; the optional MathTS peer is reached through
  an INJECTED simplifier (as built in S4.2: `simplifyExpr` when `isSimplifierAvailable()`, else
  `null` — a parser cannot decide `lhs − rhs = 0`, so the plan's `getFormulaParser()` was the wrong
  capability), so the module-private registry cache is never touched by a test; `BRIDGE_EQUATIONS` (55 rows) and `CATALOG_GRAPH` (41 edges) do not move.
  **Scope rule carried from the plan:** if measured curation cost makes 20 bridges unreachable, the
  Lead cuts the count here and says so; **the "≥ 5 relation types" criterion is not cut.**

- [x] **Sprint 2 — Regimes and error-carrying paths.** Promoted 2026-09-21 07:35 by the Lead under
  the standing instruction to run Sprints 0–6 continuously.
  **Scope:** `regime?` on edges and catalog rows BESIDE `ValidityDomain` (never replacing it);
  uniformity fields enforced at admission; machine-checkable horizons queried; `(K, δ)` path bounds
  through `propagateUncertainty`; regime-overlap and uncovered-region reports; the `upt regime` and
  `upt path` verbs; `upt map --relation= --evidence=` filters.
  **▶ WRAPPED 2026-09-22 03:30, ticked 08:05.** Lead wrap at c43b442, CI green. All five briefs
  landed (S2.1 regimes, S2.2 path bounds, S2.3 `upt regime`/`upt path`, S2.4 map filters, S2.5 GR
  spine regimes) plus the `deltaAt` machine form. Suite 4231 passed / 0 failed, typecheck 0.
  **Eve E2 returned DO NOT APPROVE with two CRITICALs, and BOTH are resolved:** the quadrature of a
  deterministic bias with a statistical sigma was real and is FIXED (bea5754 — sigma and delta now
  reported separately, not collapsed, because choosing a coverage factor is the caller's risk
  posture); the "K-less-middle guard is dead code" was REFUTED with two named test sites, and its
  proposed remedy would have put synthetic bridges in a physics catalogue to make reachable a test
  that already existed.
  **The box was ticked LATE and that is the gauge problem it is meant to prevent** — the sprint was
  closed at 03:30 and the audited ledger said otherwise for four and a half hours.

  **Entry conditions:** this line, plus `docs/planning/Atlas-Phase-2-Design.md` with Adam GREEN or
  a resolved YELLOW.
  **Boundaries:** a regime NEVER silently replaces a `ValidityDomain.predicate` — when both are
  present, `evaluateEdge` checks the predicate as today and ADDITIONALLY `regimeHolds` when the
  caller supplies group values. **The GR spine re-expression (`r_s/r`, `v/c`) must leave every
  confrontation number unchanged** — that is this sprint's load-bearing invariant and the one most
  likely to break silently, so it gets a before/after pin rather than a reading. Row/edge counts
  stay 55/41; nothing new on `src/index.ts`.
  **Carried from Phase 1:** Phase 2 supplies the edge data the composition table is waiting on, so
  its four conservative `'no-composite-claim'` rows become revisitable — widening any of them is a
  reviewed change that must fail the pinned cell-count test first.
