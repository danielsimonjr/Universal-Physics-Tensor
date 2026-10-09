# Part IX — Bridge Composition (Research-Track Specification)

> **Status:** Phase A research spec per v0.7+ Proposal 6. This is
> a SPECIFICATION document, not an implementation manifest. The
> composition operator + cascade evaluator are deferred per
> Adam-F2 reconciliation (existing bridge evaluators have ad-hoc
> return shapes with no shared `Observable` contract; a translation
> layer would force design choices that belong in Phase B / v0.9α).
>
> **Phase A goal:** Define what "bridge composition" MEANS in UPT,
> with enough precision that Phase B (v0.9α calibration) can test
> against ≥3 known cross-scale derivations, and Phase C (v0.9β
> stress tests) and Phase D (v1.0 hypothesis generation) inherit
> a clear yes-or-no acceptance bar.

## 1. The composition question

UPT ships a 44-bridge catalog at v0.7. Each bridge declares
`source: TensorIndices → target: TensorIndices` and carries a
formula. A natural follow-up question: **can two bridges be
composed to derive a third relation that the literature confirms?**

Concrete example: bridge `B_A: quantum → mesoscopic`
(decoherence-driven emergence of classical states) + bridge
`B_B: mesoscopic → classical` (statistical-mechanical averaging)
should compose to a `B_B ∘ B_A: quantum → classical` relation
that recovers the standard "quantum→classical" reduction limit.

## 2. Operational definition of composition (Decision #1 locked)

Per P6 Decision #1, "compose" has the following precise meaning
in UPT v0.8+:

> Two bridges `B_A: regime₁ → regime₂` and `B_B: regime₂ → regime₃`
> *compose* to `B_B ∘ B_A: regime₁ → regime₃` if, given a numerical
> instance of an observable in `regime₁` and the parameters of
> both bridges, evaluating `B_A` then `B_B` (cascade) produces an
> output in `regime₃` that matches the literature-known direct
> derivation of the same observable in `regime₃`, to within the
> tolerance the calibration case admits.

Two interpretations locked in priority order:

| # | Interpretation | Status | Layer |
|---|---|---|---|
| (d) | Numerical-cascade composition (B_A's numerical output → B_B's numerical input) | **PRIMARY** | Machinery — `src/composition/` (deferred to Phase B) |
| (b) | Categorical composition (regimes as objects, bridges as morphisms, ∘ as morphism composition, non-commutativity as 2-cells) | **SECONDARY** | Language — this document |
| (a) | Symbolic AST composition | **OUT** for Phase A; revisit Phase B if needed | — |
| (c) | Logical implication | **OUT** (wrong primitive for physics bridges) | — |

The categorical layer (b) is the *language* this definition is
expressed in; the cascade layer (d) is the *machinery* that
produces the numbers.

## 3. Categorical framing (documentation-only)

Following Baez & Stay (2010), Coecke & Kissinger (2017), Fong &
Spivak (2019):

- **Objects.** A regime — an element of the v0.8 `RegimeType`
  registry (`src/core/regime-registry.ts`). Examples
  pre-registered at v0.8: `Axes.scale.quantum`, `Axes.scale.classical`,
  `Axes.force.gravitational`, etc. (18 built-ins; downstream
  packages register more.)
- **Morphisms.** A bridge — an element of UPT's 44-bridge catalog,
  oriented from `source: TensorIndices` to `target: TensorIndices`.
  The morphism is the *equation* + *physics* + *parameter
  specification* (not just a label).
- **Composition (∘).** `B_B ∘ B_A` is defined iff
  `target(B_A) = source(B_B)` (regime tuple identity, NOT just
  axis-name match). The result morphism has
  `source(B_B ∘ B_A) = source(B_A)` and
  `target(B_B ∘ B_A) = target(B_B)`.
- **Identity (id_R).** A regime R's identity morphism — the
  trivial "no-op" bridge from R to R. Phase A leaves this
  unspecified; Phase B may need it for associativity-witness
  tests.
- **2-cells.** Obstructions to commutativity. If `B_C ∘ B_A` and
  `B_C ∘ B_B` give different numerical results for the same
  input observable, the obstruction is a 2-cell (or higher
  natural transformation in the 2-category of physics theories).
  Non-trivial 2-cells are EVIDENCE that the regime taxonomy is
  too coarse — different cascades through ostensibly-equivalent
  intermediate regimes give different answers.

## 4. Cascade-evaluation contract

Phase B's compose operator shipped: `composeEdges(first, second)` in
`src/composition/compose.ts` chains two typed `BridgeEdge`s through a
shared quantity, with a dimensional check at the junction. Whether
phases C–D are met is recorded in `NOTES.md` (the owner's ruling of
2026-10-09). The rest of this section is the Phase A contract as it was
written, before that operator existed. Per Adam-F2, the precondition
is a shared `Observable` contract on bridge outputs that does NOT
yet exist at HEAD. The existing evaluators
(`evaluatePerihelionPrecession`, `evaluateGravitationalLensing`,
etc.) return ad-hoc TS interfaces (e.g.,
`PerihelionPrecessionResult` with 6 numeric fields). A composition
operator requires either:

- (a) An `Observable<RegimeT, ValueT>` interface that every
  bridge evaluator returns (breaking change to v0.7+ evaluators);
- (b) A per-bridge-pair `BridgeAdapter` that translates
  `B_A`'s output struct → `B_B`'s input struct (one adapter per
  composable pair — combinatorial blowup); or
- (c) A purely numerical cascade on rank-1 tensors (treat each
  bridge as `numbers → numbers`, lose all type safety).

Phase B was to choose between (a) and (b); the design it chose is
`docs/planning/v0.8.0-Design.md`.

## 5. Calibration set (Phase B target, named here per Decision #3)

Phase B will test composition against five named cross-scale
derivations (C1-C5). Phase A enumerates them so the Phase B
plan inherits a concrete acceptance bar:

| ID | Source bridge | Target bridge | Cross-scale derivation |
|---|---|---|---|
| C1 | Decoherence master (BE-11) | Coherence length (BE-12) | quantum→classical: decoherence length scaling — **REALIZED 2026-06-11 as CT-3** (Zurek scaling Γ_dec = γ·(Δx/λ_T)², `composeEdges(be12Edge, be11ZurekEdge)`; pre-registered v0.8.0-Design.md §9) |
| C2 | Einstein-Cartan (BE-17) | Newton + special-relativity → weak-field GR | Newtonian limit recovery |
| C3 | Higgs mass (BE-18) | Vacuum energy (BE-20) | electroweak → cosmological-constant problem residue |
| C4 | Hawking temperature (BE-42) | Information bounds | black-hole-thermodynamics → information-theoretic — **REALIZED 2026-06-11 as CT-1** (erasure cost E_min(M) = ℏc³ln2/(8πGM), `composeEdges(be42Edge, be16Edge)`) |
| C5 | Shapiro time delay (BE-37) | Perihelion precession (BE-52) | weak-field GR consistency across observables — **REALIZED 2026-06-11 as CT-2 + CT-4** (BE-51/52 ratio 2a(1−e²)/(3πb); BE-37×BE-52 ratio a(1−e²)ln(R_far/R_near)/(3πc) — both parameter-free in (G, M); pre-registered v0.8.0-Design.md §10) |

All cited BE-IDs verified present in `src/bridges/index.ts` per
the v0.7-p6 Phase A Eve review.

## 6. Success / failure criteria (P6 Decision tag)

The track succeeds if, at v1.0 close, at least one of:

1. **Positive outcome.** ≥3 of C1-C5 reproduced (Phase B) — **MET
   2026-06-11: C1 (CT-3), C4 (CT-1), C5 (CT-2+CT-4), all
   pre-registered with literature anchors** — ≥2
   stress tests survived (Phase C), ≥1 novel candidate generated
   for physicist review (Phase D). UPT plausibly claims a
   methodological contribution.

2. **Negative outcome with diagnosis.** Framework fails on C1-C5
   in a way the design can NAME (e.g., "categorical composition
   cannot represent non-commuting order-of-limits"); failure
   published as a research note in the v1.0 white paper. UPT
   plausibly claims a methodological *clarification* — pinning
   down what does NOT compose and why.

The track fails only if Phases A-D end with **no clear yes-or-no**
— a vague "more research needed" that doesn't advance the field.

## 7. Open questions (cross-referenced in
`docs/planning/v0.7-Proposal-6-PhaseA-Open-Questions.md`)

Phase B should not open until at least Q1-Q3 below are resolved
(or explicitly deferred to v0.9α with documented justification):

- **Q1.** Which of (a) shared `Observable` contract vs (b)
  per-pair `BridgeAdapter` is the Phase B composition surface?
- **Q2.** What's the tolerance discipline for "matches the
  literature"? Per-derivation? Or a global epsilon?
- **Q3.** Does composition commute with the existing flux
  rules (BE-coordinate-matching, causality, regime-consistency)?

## 8. Honest scope note

Phase A's *engineering* output this session is THIS document +
the Open-Questions doc + the Adam+Eve review-findings doc. No
TypeScript code ships in `src/composition/` per Adam-F2 (the
translation layer needs to be designed, not improvised). This
preserves the "research track decoupled from release cadence"
framing in P6 Decision #0.

## 9. Phase-D candidate identifications (PROPOSED — UNADJUDICATED)

> **Status: PROPOSED, NOT ADJUDICATED.** These are machine-generated
> candidate *quantity identifications* surfaced by the linkage map
> (`linkageMap` + `proposeLinkCandidates`, `src/composition/bridge-analysis.ts`;
> `upt candidates`; full analysis in
> `docs/research/Linkage-Candidate-Proposals.md`). They are recorded here
> as Phase-D hypothesis-generation output (per §6.1), **not** as accepted
> bridges. None is registered in `QUANTITY_IDENTIFICATIONS`; promoting any
> requires a human-verifiable physics judgment under the Status-Promotion
> Protocol (Part-VI §XXVII-B). The generator is a coincidence-heavy review
> surface — 132 same-dimension cross-cluster pairs funnel to these few —
> so the default expectation for each is rejection.

The candidate identification mechanism is the same one that underlies
composition: asserting that a quantity named X in one bridge IS the
quantity named Y in another (the precedent being the registered
hawking-temperature ≡ temperature, which fuses the gravitational and
thermodynamic clusters). A candidate is surfaced when X and Y live in
DIFFERENT linkage clusters yet carry the same (non-dimensionless) SI
dimension. The three below survived the funnel *and* a "same physical
kind in adjacent regimes" reading; each, if adjudicated true by a
physicist, would link a currently-isolated bridge into the anchored core.

| # | Candidate identification | Dim | Would link | Physical motivation | Recommendation |
|---|---|---|---|---|---|
| CI-1 | `coarsening-length` ≡ `quantum-correlation-length` (and `reference-correlation-length`) | length | BE-15 (Model-A coarsening, *isolated*) ↔ BE-33 (quantum criticality) | The correlation length is the order parameter of critical dynamics; classical coarsening and quantum criticality are related by **dynamic-scaling universality** — the very framework of the Kibble–Zurek mechanism (BE-34, already catalogued). | Worth a critical-phenomena physicist's review (strongest candidate). |
| CI-2 | `time` ≡ `microscopic-relaxation-time` | time | BE-15 (Model-A coarsening, *isolated*) ↔ BE-34 (Kibble–Zurek) | Companion of CI-1: both are the characteristic timescale of the same critical-dynamics universality class. | Review together with CI-1 (one universality class, or two?). |
| CI-3 | `landauer-erasure-energy` ≡ `inflation-hubble-energy` (or `planck-mass-energy`) | energy | BE-16 (Landauer) ↔ BE-45 (TCC max e-folds) | Both are characteristic energies bridging information thermodynamics and cosmology/Planck physics — the *kind* of cross-regime link the catalog seeks. | Flagged, **not recommended**: these are different *scales*, most likely a context-specific relation rather than a global identification. |

**Orphan-connector re-analysis (2026-06-15).** The v0.12 tooling
(`proposeOrphanConnectors` / `upt connectors`) re-examined this surface
structurally: of the 20 isolated bridges, exactly 7 carry a same-kind
connector to the anchored core. Physics review (`docs/research/
Orphan-Connector-Analysis.md`) **independently re-derived CI-1/CI-2** as the
only motivated ones and **rejected every other connector with grounded
reasoning** — BE-22 (topological entanglement entropy is gapped — no
correlation length), BE-24 (a Förster radius is not a horizon), BE-26 (a
proton tunneling mass is not a strange-metal carrier mass), BE-41 (the
`X ≡ mass` family), BE-47 (baryon density ≠ carrier density; the
`hubble-rate ≡ decoherence-rate` decoy); BE-45 is the already-recorded,
not-recommended CI-3. No new candidate was added: the orphan frontier is
decoy-dominated, and the catalog's real growth edge is the **12 dimensionally
unconnectable orphans** (BE-14/17/21/25/30/36/39/43/46/49/50/53), which need
NEW bridges or quantities, not re-labeling. A follow-on (2026-06-15) further
established that **CI-1 is an over-determination, not a composition**: both
identified lengths are only ever *targets*, so the identification merges two
independent derivations (Model-A dynamics vs Hertz-Millis statics) rather than
forming a chain, and `composeSymbolic` does not apply — its confirmation is a
physicist's dynamic-scaling judgment (checklist (a)), not a mechanical
derivation. (A bounded `^`-grammar extension since landed — v0.13, symbolic
exponents on a dimensionless base — does let BE-33 carry its faithful
`(T/T₀)^(−1/z)` form, but does not change the over-determination conclusion for
CI-1.) Details: `docs/research/Orphan-Connector-Analysis.md`.

**Adjudication checklist** (for a reviewing physicist, per Part-VI
§XXVII-B): (a) are the two quantities the *same physical observable*, not
merely the same dimension? (b) is the identification *global* or only
valid in a specific regime/limit? (c) does accepting it produce a
composition that reproduces a known cross-scale result (a CT-style
calibration target)? Only on a "yes" to (a) and (c) should a candidate be
promoted to `QUANTITY_IDENTIFICATIONS` with its rationale and citation.
