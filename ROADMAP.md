# UPT Roadmap — from bridge catalog to verified physics atlas

**Status:** strategic direction, not a release-blocking backlog. The live task list
is [`ACTIVE.md`](ACTIVE.md). [`todo.md`](todo.md) is the historical ledger. A phase
below becomes engineering work only when it is an open task in `ACTIVE.md`. Nothing
here is authorized by being written here.

**Baseline:** `universal-physics-tensor@0.45.2` on `master`, 2026-09-20.

**Sources.** This roadmap is informed by three documents written 2026-09-20, in order of
revision:

1. *Physics as a Graph: Equations as Nodes, Bridges as Edges* — the seven-page draft. A survey
   of prior attempts (Bronstein cube, Inönü–Wigner contractions, categorical physics, MMT/OMDoc,
   PhysLean, knowledge graphs, equation embeddings, AI Feynman), the argument that "one vector
   space of physics" is the wrong container, a proposal for a typed category with seven edge
   kinds, and a worked 16-equation poster graph.
2. *Physics Equation Atlas — Research proposal for a verified network of physical models* — the
   revised proposal. Keeps the survey and the poster, corrects fifteen over-strong claims
   (Appendix A of that document), fixes the record model (Statement / Model / Context / Bridge /
   Evidence), the eight relation types, the validation workflow, and a five-phase pilot plan.
3. *Physics Equation Atlas: Blueprint v2* — the design and research plan. Sharpens the unit of
   knowledge into the sequent `Γ ⊢ P within M`, adds first-class `Regime` records on dimensionless groups, the
   composition table with "no composite claim" as the default, the `(K, δ)` affine algebra of
   approximation error, evidence tags instead of a score, the oscillator pilot (five bridges,
   one rejection, fifteen executable checks in a companion `verify_pilot.py` that is **not in
   hand** — fourteen are enumerable from the Blueprint text), the invalid-bridge taxonomy, and
   a six-phase roadmap with exit criteria.

Where the three disagree, Blueprint v2 wins. Where Blueprint v2 disagrees with a repo
invariant (`CLAUDE.md`, the second audit in
[`Scientific-Bridge-Discovery-v1.md`](docs/planning/Scientific-Bridge-Discovery-v1.md) §0.2),
the repo invariant wins and the deviation is recorded in §3 below.

---

## 1. Where UPT stands against the proposal

This inventory is the 2026-09-20 baseline, from before `src/atlas/` landed. Later phase state is in [`NOTES.md`](NOTES.md).

UPT already has the dimension layer, the firewall, the L-layer, and quantitative
confrontation; it lacks relation types, regimes, hyperedges, models, and formal references.
The inventory, so no phase rebuilds what exists:

| Proposal concept | What UPT has today | Gap |
|---|---|---|
| Dimension space ℚ⁷, Buckingham null space | `src/dimensional/` (7 base dimensions, rational exponents, `buckingham.ts` exact-rational π enumerator, `validator.ts` homogeneity check on every catalog RHS) | The linear structure is done and gated. The proposal's semantic rules on top of it (temperature offsets, log arguments, unit-system conversion maps) are only partly covered: `CanonicalForms` has `logBase` / `quantityKind`; there are no conversion maps. |
| Statement with typed syntax tree | `ExprNode` AST (`ast-types.ts`), `CanonicalEquation.scalarAst` (L1) / `fieldEquation` (L2), `BridgeEdge.symbolic` | Original source expression is not kept beside the normalized form; no symbol namespace record. |
| Model as the unit, not the equation | `CanonicalEquation.regime` (tensor-cell coordinates) + `assumptions: string[]`; `BridgeEquationEntry.bridges: [regime, regime]` | No `Model` record (state space, dynamics, observables, boundary data). Equations are the unit. |
| Regime records: inequalities on dimensionless groups | `ValidityDomain { description, predicate }` on every `BridgeEdge` (v0.8 G-8) | The predicate is an opaque function on raw inputs. It is not expressed on named dimensionless groups traceable to the dimension matrix, so regimes cannot be queried, intersected, or plotted per family. |
| Eight relation types with contracts | `BridgeEdge.kind: 'bridge' \| 'law'`; `EdgeConfidence`; `CanonicalEquation.epistemicStatus` (L0/L1/L2 fidelity) | No relation type. A GR→Newton approximation, a spring↔LC equivalence, and a Wick-rotation continuation would all be `kind: 'bridge'`. |
| Composition defined only where a law exists | `composeEdges` / `composeSymbolic` chain any two edges through a junction quantity; `minConfidence` demotes | Composition is always defined. The proposal's safety property, "anything else → no composite claim", does not exist. |
| `(K, δ)` affine error propagation with horizon | `composition/uncertainty.ts` (`propagateUncertainty`), `consistency.ts`, `retrodiction.ts` | Propagates input uncertainty through a chain; does not carry a per-edge Lipschitz constant, uniform error, norm, domain, or time horizon. |
| Evidence tags (several may apply), no aggregate score | `BridgeEquationStatus` (4 values), `EdgeConfidence` (3), `ConfrontationOutcome` + `residualInSigma` + rigor tiers (`confrontations.ts`), `KnownIssue[]`, `RejectedBridgeAdjudication`, `AdjudicationVerdict` | Evidence is spread over five typed surfaces, each honest, none a vector on one record. There is no `symbolically-checked` / `convention-checked` / `formally-proved` tag. |
| Counterexamples as part of a bridge | `bridges/rejected.ts` (rejected identifications), `known_issues` | A rejection is a separate registry entry, not a field on the bridge it breaks. |
| Conventions first-class | `CanonicalForms` disambiguators (`areaOrRadius`, `logBase`, `quantityKind`) | Sign, metric signature, Fourier normalization, SI vs Gaussian are not recorded or checked. |
| Hyperedges: many premises, one conclusion | `BridgeEdge.sources: Quantity[]` → `target: Quantity` (n-ary in quantities) | n-ary in *quantities*, not in *statements*. "Newton II + Hooke ⊢ oscillator equation" cannot be recorded. |
| Association layer (shared constants, symbols, history), never counted as a bridge | `docs/research/` repeatedly finds that cross-cluster links are dimensional coincidences; `upt discover` axis-clash gate rejects them | The finding exists as research prose and funnel verdicts, not as a typed `Association` record distinct from `BridgeEdge`. |
| Authority rule: rules, search, LLMs propose; only independent validation promotes | The firewall: no machine verdict mutates `BRIDGE_EQUATIONS` or `CANONICAL_EQUATIONS`; `proposed-bridges.ts` is `'unadjudicated'`; Product B candidates are `h-*` with an append-only status history | Already the house rule. Keep it. |
| Explorer with filters by relation type and evidence tag | `upt map --format=mermaid\|dot\|svg`, `--source`, `--proposed` | Filters by source and status only. |
| Storage: one record per file in git, generated graph views | `src/bridges/equations/*.ts`, `src/canonical/entries/*.ts`, `data/bridge-catalog.json` + schema | Same shape. The catalog JSON is generated from TS, which is the proposal's "generated, not authoritative" view. |
| Formal layer (Lean 4 / Physlib links) | None | Nothing links to a checked statement. |
| Invalid-bridge benchmark, independently authored, κ-reported | `tests/composition/discovery-calibration.test.ts` (Product A's Family A pins), Family B fixtures under `tests/fixtures/discovery/` (five cases) | Both benchmark families test *identification* and *expression search*. Neither tests relation-type validity or the eight failure kinds. |
| Pilot: oscillator family, five relation types | `CE-simple-harmonic-frequency`, `CE-lc-resonance`, `CE-oscillator-energy`, `CE-spring-potential-energy` in the canonical registry | The equations exist as L-layer laws. The spring↔LC bridge, its damping side condition, the cubic-spring rejection, the singular m→0 limit, and the chain→wave coarse-graining do not. |

Two things the proposal asks for that UPT already answers better than the proposal expects:

- **A trustworthy "no" on one question.** Product A has adjudicated 0 of 8 quantity
  identifications genuine and falsified 90 by funnel verdict
  (`docs/research/pi-instrument-results.md`). That coincidence-rejecting discipline transfers,
  but it answers `a ≡ b`, not relation validity: no existing gate tests the eight failure kinds
  the proposal's "invalid-bridge rejection versus best LLM baseline" headline needs. That is
  Phase 5's job. The test has since run, and the atlas did NOT beat the LLM baselines
  (`docs/research/atlas-study-results.md`).
- **Quantitative confrontation.** Nineteen real-data confrontations with a declared rigor
  hierarchy (`upt confront`). The proposal's "empirically supported (with regime)" tag has a
  numeric backing here that the proposal does not require.

---

## 2. Decisions carried from the proposal

These are adopted as design constraints for every phase. Each is a proposal decision restated
against UPT's vocabulary.

1. **Models, not equations, are the unit.** The same equation appears in unrelated models; one
   model has many equivalent equations. `CanonicalEquation` keeps its identity; a `Model`
   record is added above it.
2. **Relation type is a contract, not a label.** Eight types: derivation, exact equivalence,
   restriction, approximation/limit, coarse-graining, analytic continuation, structural analogy,
   deformation/quantization. Each names what must be recorded for the edge to be admitted.
   Conjecture and validation status stay separate from type.
3. **Undefined composition by default.** The composition table (Blueprint v2 §4.2) says which
   type pairs compose and to what. Every other pair returns "no composite claim". Silence is
   safer than a manufactured conclusion.
4. **Regimes per model family, on named dimensionless groups.** No global manifold of physics.
   A regime is a set of inequalities on groups the Buckingham engine can derive from the
   family's dimension matrix.
5. **Approximation edges carry `(K, δ)`, a norm, a domain, and a horizon.** They compose as
   `(K₂, δ₂) ∘ (K₁, δ₁) = (K₂K₁, K₂δ₁ + δ₂)`. A bound without a horizon is rejected at
   admission. A bridge lacking `K` can end a chain but not sit in the middle of one.
6. **Evidence is a vector of tags, never one score.** `proposed · reviewed · dimension-checked ·
   convention-checked · symbolically-checked · numerically-supported · formally-proved ·
   empirically-supported(regime) · contradicted · unresolved`. Mathematical validation and
   empirical adequacy are separate records.
7. **Counterexamples are part of a bridge.** What breaks it, and how, is what separates a
   transformation from a resemblance.
8. **Associations are not bridges.** Shared constants (π, ħ), shared symbols, shared
   mathematics, and historical influence live in a separate layer and never inflate
   connectivity.
9. **Conventions are first-class and mechanically checked.** Sign of work in the first law,
    capacitor charge sign,
   metric signature, Fourier normalization, SI vs Gaussian charge.
10. **Authority rule.** Rules, search, and language models propose. Only independent validation
    promotes. Numerical agreement is scoped evidence, never proof. UPT's firewall already
    implements this; every phase preserves it.
11. **Gradual verification.** Requiring proof at entry is what stalled earlier formalization
    efforts (Wiedijk). Records enter as `proposed` and climb.
12. **Embeddings last.** Retrieval instruments whose quality is measured against a task, added
    only after a benchmark and a typed-search baseline exist.
13. **Start deep and narrow.** One family across five relation types tests the contracts. A
    hundred exact derivations would not.
14. **"Unresolved" is principled.** Expression equality is undecidable in general (Richardson),
    so a symbolic check may legitimately fail to decide. A timeout is `unresolved`, not `false`.

---

## 3. Repo invariants that constrain how the proposal lands

Blueprint v2 was written for a fresh Python-and-git project. UPT is not that, and the
following are binding (from `CLAUDE.md` and the discovery plan's second audit):

| Proposal says | UPT does instead | Why |
|---|---|---|
| SymPy, NumPy/SciPy, `verify_pilot.py` | Vitest witnesses in TypeScript; symbolic checks via the optional `@danielsimonjr/mathts-expression` peer with graceful degradation to `unresolved` | No Python in the codebase; zero hard deps. |
| YAML records, one per file | TypeScript modules (as `src/canonical/entries/`, `src/bridges/equations/`) with a generated JSON export + JSON Schema under `data/` | That is the existing authoritative-source / generated-view split; YAML adds a parser dependency. |
| Lean 4 + Physlib in the toolchain; "≥5 formal proofs with no holes" | A `formalRef` field pointing at an external checked statement, with a statement-fidelity flag; no proof assistant in-tree | Out-of-tree tooling is the rule for every backend (discovery plan §10–11). Whether a proof "has no holes" is verified where the proof lives. UPT records the reference and the fidelity review, not the proof. |
| Property-graph / RDF view, explorer web pages | `upt map` extensions and CLI reports; RDF/JSON-LD as an *export* only | In-package UI is parked in `Future-Production-Hardening.md`; no interactive viz here. |
| Frontier-LLM baselines with a CAS tool | Run out of process; results land in `docs/research/` with the reproducer command | Untrusted external engines are plugins, never in-tree. |
| New `ScientificRelationRecord` envelope (discovery plan §3) and new atlas records | **One** additive overlay, not two. The discovery plan's `RelationKind` / `AuditState` / `EvidenceProfile` sketch and the atlas `Bridge` / `Evidence` record are the same object and must be reconciled in the Phase 1 design note. | Two overlays pointing at the same `BridgeEdge` is the "parallel UPT inside UPT" the second audit forbade. |
| Replace status with evidence tags | Derive evidence tags from the existing surfaces (validator, confrontations, rejections) beside `BridgeEquationStatus` / `EdgeConfidence`; never store them on a row, never adapt one type into the other | Eve forbade the `confidenceToStatus` adapter (`src/core/cell.ts`); existing epistemic types are not replaced (audit corrections #11 and #16). |
| Nested CLI (`atlas regime`, `atlas path`) | Flat verbs (`upt regime`, `upt path`, …), `FlagSpec`-parsed, `--json` envelope | The CLI is a flat registry; frozen verbs (`discover`, `candidates`, `ground`, `connectors`, `predict`, `confront`) are never hijacked. |
| No forced migration | Existing 41 graph edges, 55 catalog rows (`BridgeEquationEntry`), and 109 canonical entries all receive the optional overlay fields in Phase 1 and start as `relation: undefined` / `auditState: 'not-yet-audited'` until audited (evidence tags are derived, never stored); 17 catalog rows have no graph edge, so the row is the per-bridge home | No fabricated metadata (audit correction #16, §3.1). Coverage is reported as schema / audited / verified. |
| Product A is "the discovery hypothesis" | Product A stays frozen. Link prediction over the typed graph is a Phase 6 study, and its held-out-recovery claim is the only one made | Audit corrections #1 and #17. |

---

## 4. Phases

Phase numbering does **not** match Blueprint v2 §9 one-to-one. The mapping: Phase 0 → BP 0
(package); Phases 1, 2, 3 → BP 1 (schema and corpus) split into overlay, regimes, and
hyperedges because each lands on existing types; Phase 4 → BP 2 (checked bridges); Phase 5 →
BP 3 (benchmark); Phase 6 → BP 4 + 5 (study, release). Version windows are indicative.
This document makes no delivery commitment. Per-bridge curation cost is not a gate.

Every phase: design note → Adam (design vet) → implementation plan → TDD with scoped vitest →
Eve (value-level verification) → stale-docs gate → CHANGELOG → `bun run docs:deps` → wrap.
Additive changes to existing public types (optional fields on `BridgeEdge`, a new throw path
in `composeEdges`) are allowed; new modules stay off `src/index.ts` until Phase 6 review.

### Phase 0 — Pilot package: the oscillator family (target: v0.46)

> **Status.** The code and the witnesses shipped on 2026-09-20. On 2026-10-01 the owner
> removed the two exit criteria that were not code: independent physicist review, and
> per-bridge curation cost. The phase is closed. The harness and the witnesses stay.

**Goal.** Prove the five relation contracts on one family where curation is cheap and every
contract is exercised, before designing types for all of physics.

**Deliverables.**

- `src/atlas/` (new, off the public barrel; subpath `universal-physics-tensor/atlas`):
  minimal `Model`, `Regime`, `AtlasBridge`, `Witness` types sufficient for the pilot only.
- Five bridges plus one rejection, each backed by a passing vitest witness ported from the
  checks the Blueprint text names (thirteen in §6 — 1, 1a, 1b, 2, 2b, 7, 7b, 8, 8b, 9, 3, 4,
  5 — plus the check-6 associativity witness in §4.3; the Blueprint's `verify_pilot.py` has
  fifteen, and the fifteenth is unidentified until that script is obtained). Witness ids below
  are the Blueprint's:

  | # | Bridge | Type | Key content | Witness |
  |---|---|---|---|---|
  | 1 | Spring ↔ LC circuit | exact equivalence | `u = x/x₀` or `q/q₀`, `τ = ω₀t`; both give `u″ + u = 0`; `m↔L`, `k↔1/C` | 1, 1a, 1b (substitution identity; inverse scale maps and initial conditions, per the revised proposal §5) |
  | 2 | Damped spring ↔ RLC | equivalence with side condition | `u″ + 2ζu′ + u = 0` iff `b/√(mk) = R√(C/L)` | 2, 2b (adding `R` to bridge 1 breaks it) |
  | 3 | Pendulum → linear oscillator | approximation, non-uniform in time | relative period error `θ₀²/16`; phase error reaches 90° after ~100 cycles | 7, 7b (0.002506 vs 0.002500 at 0.2 rad; horizon `t ≪ 16T₀/θ₀²`) |
  | 4 | Damped oscillator, `m → 0` | singular limit | order drops 2→1; boundary layer `~m/b`; velocity initial condition cannot be imposed on the reduced model | 8, 8b (roots → `−k/b` and `≈ −b/m`; lost initial condition) |
  | 5 | Mass–spring chain → wave equation | coarse-graining | `c² = κa²/m`; dispersion error `(qa)²/24`; information above `q ≈ π/a` lost | 9 (dispersion relation vs continuum) |
  | ✗ | Cubic spring ↔ linear LC | **rejected** | `ε = βx₀²/k` survives nondimensionalization and depends on amplitude | 3 (Buckingham group survives) |

- One complete record (the spring↔LC bridge) with every field the Blueprint's
  `bridge_spring_lc.yaml` carries, as a TS module and as a JSON export under `data/atlas/`.
- Two supporting witnesses used later by the poster index: the chirped Gaussian
  `σₓσₚ = (ħ/2)√(1 + 16α²s⁴)` (a Gaussian density alone does not saturate the bound), and the
  `t = −iτ` substitution turning Schrödinger into `∂_τφ = (ħ/2m)∇²φ − Vφ/ħ`.
- The `(K, δ)` composition law as a pure function with its associativity witness
  (`(1, 0)` identity; `(K₂K₁, K₂δ₁ + δ₂)`).
- The regime records for the family: inequalities on `ζ`, `θ₀`, `ε`, `qa`, `mk/b²`, each traced
  to the family's dimension matrix via `buckingham.ts`.

**Exit criteria.** Reproduces from a fresh `bun install --frozen-lockfile && bun run test`.
Existing suite count unchanged or higher; no public-API change. Independent physicist review
and per-bridge curation cost are not exit criteria (owner, 2026-10-01).

**Explicitly out.** No changes to `BridgeEdge`, `composeEdges`, or the catalog. The pilot is
allowed to be throwaway if Phase 1 shows the types were wrong.

### Phase 1 — Relation contracts as an additive overlay (target: v0.47–v0.48)

> **▶ STATUS 2026-09-21 — IMPLEMENTED; 3 of 4 exit criteria met, and the fourth is named.**
> On `master`, CI green. `RelationContract` and `Conventions` in `src/atlas/types.ts`; the literal
> 8×8 `composeRelation` table; `composeEdges` throwing `UndefinedCompositionError` on a refused
> pair; `derive-evidence.ts` + `coverage.ts`; the `Association` registry seeded from the four
> `'decoy'` adjudications; `checkConventions` and `unknownConventionKeys`. Full suite 393 files /
> 4,083 tests.
>
> **Measured coverage:** schema 55 · audited 10 · not-yet-audited 45 · verified 0; atlas 5 bridges,
> 0 reviewed.
>
> | Exit criterion | State |
> |---|---|
> | Every field audited or marked `not-yet-audited` | **MET** — `overlayCoverage` classifies all 55 explicitly; nothing is silently unclassified |
> | Coverage report distinguishes schema / audited / verified | **MET** |
> | The five pilot bridges re-register through the overlay unchanged | **MET** |
> | Zero fabricated assumptions, **Eve spot-checking a sample against the cited sources** | **NOT MET** |
>
> **Why the fourth is not met, stated rather than smoothed over.** Eve reviewed the design and the
> shipped code and returned two findings that both held — but she has no access to the cited
> papers and never checked a citation against its source. I verified four of the 22 `// source:`
> comments myself against known physics (KSS 2005, Shapiro 1964, GRW 1990, Einstein 1915) and
> confirmed that none cites this project's own documents. That is a weaker claim than the criterion
> makes, and it is the same shape as Phase 0's open criterion: **a review by someone who is not the
> author cannot be performed by the author.** `verified: 0` is the honest reading of it.
>
> **Found while wrapping, and fixed rather than filed:** the deliverable "a
> `RejectedBridgeAdjudication` ⇒ `contradicted` with the counterexample LINKED" was
> HALF-implemented — only BE-35 carried the link, and a special case was forcing the tag onto the
> other four rejected rows from no artifact at all. All five now derive it from a real
> counterexample, projected from `rejected.ts` rather than copied into any row.

**Goal.** Give every edge a relation type with a contract, evidence as a tag vector, a
conventions record, and the composition table, without replacing any existing type.

**Deliverables.**

- `RelationType` union (eight members) and per-type required-content interfaces. Adds an
  optional `relation?: RelationContract` to `BridgeEdge`; existing 41 edges stay `undefined`.
- `EvidenceTag` union and `evidenceTags?: ReadonlySet<EvidenceTag>` beside (never instead of)
  `EdgeConfidence` / `BridgeEquationStatus`. Tags come only from artifacts on the record
  (`src/atlas/derive-evidence.ts`). `dimension-checked` needs a witness of kind `dimensional`,
  which `Witness` does not have, so it does not fire. `empirically-supported`, `reviewed`, and
  `unresolved` are in the union and are not emitted. `contradicted` comes from an unresolved
  counterexample, and a `not-a-bridge` verdict does not force it.
- `Conventions` record (heat/work sign, metric signature, Fourier normalization, unit system,
  capacitor sign) on `CanonicalEquation` and `AtlasBridge`; a convention-mismatch check that
  fires on composition and on `upt recover`.
- `Association` record type and registry, distinct from `BridgeEdge`; the shared-constant
  links `upt discover` already rejects as coincidences are the seed population.
- `counterexamples?: readonly Counterexample[]` on the bridge, cross-linked from
  `bridges/rejected.ts` rather than duplicating it.
- The composition table as `composeRelation(a, b): RelationType | 'no-composite-claim'`;
  `composeEdges` consults it when both operands carry a `relation` and throws a new
  `UndefinedCompositionError` (sibling of `DomainViolationError`) on the default row. Edges
  without a `relation` compose exactly as today, so no existing test moves.
  **Deliberate deviation:** a pure type-pair matrix is a conservative under-approximation of
  Blueprint v2 §4.2. Three of its rows are conditions on edge data, not on types
  ("analytic continuation ∘ X only if X preserves the analyticity domain"; "analogy ∘
  derivation: transport only for statements written entirely in preserved structure";
  "exact ∘ approximation needs `K` for the exact map"), and "limit ∘ quantization is never
  the identity" is a statement about the composite, not that it is undefined. The matrix
  returns `'no-composite-claim'` for all of these. Phase 2 did not widen the table. `norm`
  already existed as a mandatory string. Widening remains a reviewed act, and the table's
  test is a test of that conservative reading, not of "every row of §4.2".
- Reconciliation of the discovery plan §3 `ScientificRelationRecord` sketch with this overlay
  into one type, recorded in the design note, so Product B and the atlas share it.

**Exit criteria.** Every field on every existing record is either audited or marked
`not-yet-audited`; zero fabricated assumptions (Eve spot-checks a random sample against the
cited sources). Coverage report distinguishes schema / audited / verified. The five pilot
bridges re-register through the overlay unchanged.

### Phase 2 — Regime records and error-carrying paths (target: v0.49–v0.50)

**Goal.** Make "at my operating point, which models are valid, and where does each stop" a
query, and make path error a computed bound.

**Deliverables.**

- `Regime` as inequalities on named dimensionless groups, per model family, each group
  traceable to the family's dimension matrix. `ValidityDomain.predicate` remains for edges
  that have not been re-expressed; a `regime?: Regime` field is added beside it.
- `ApproximationBound.uniformity` is required (`readonly string[] | null`). `boundPath`
  returns `uniformity-unanalysed` and no number when any bound on the path has `null` or
  `[]`. Construction does not throw. `norm` is a mandatory string; it was not added here as
  an optional field. Admission rejects an approximation bound without a horizon.
- `(K, δ)` on approximation edges. A path bound is `boundPath`, not `propagateUncertainty`.
  `propagateUncertainty` does not implement the uniformity gate. The composition table was
  not widened.
- Regime overlap analysis per family: uncovered regions, overlaps where two models disagree.
  Reported via `upt regime <family> [--at group=value …]` and `upt path <from> <to>` (new flat
  verbs, `--json` envelope, exit 2 on unknown flags).
- `upt map` gains `--relation=<type>` and `--evidence=<tag>` filters.

**Exit criteria.** The oscillator family's regime space renders from the CLI; the pendulum
bridge's horizon is enforced (a query past `16T₀/θ₀²` returns the bound as invalid); the GR
evidence spine's three tests (perihelion, light deflection, Shapiro delay) are re-expressible as regime inequalities on
`r_s/r` and `v/c` without changing their confrontation numbers.

### Phase 3 — Hyperedges, models, and the poster as a typed index (target: v0.51–v0.52)

**Goal.** Record derivations with several premises, add the `Model` record, and ship the
16-equation poster as an educational index with its supporting nodes, correctly typed.

**Deliverables.**

- `Statement` (`Γ ⊢ P within M`) and `Derivation` hyperedge (premise statements → one
  conclusion, with the context union — compatibility-checked, never pooling incompatible
  assumptions into one premise set (Blueprint v2 §5.2 step 2) — and side conditions). Composition of exact hyperedges is
  the multicategory of Blueprint v2 §2.4; nothing else claims categorical structure.
- `Model` record: state space, dynamics, observables, parameters, boundary/initial data,
  symmetry group where known, regime. Canonical entries gain `model?: ModelId`.
- The poster's sixteen entries as `Statement` records with the essential qualification from
  Blueprint v2 Appendix A (e.g. entry 11 fails naively when fields carry momentum; entry 13
  needs `σ > 0`; entry 3 and entry 14 are `Association` only). Most already exist as canonical
  entries; the missing ones are added as L1 entries, and hidden nodes the graph demands
  (action principle, Noether, the full Maxwell system, the Lorentz group, the central limit
  theorem) are added as supporting statements.
- The poster's bridges, all fifteen Appendix A lines, typed as Appendix A types them:
  `10 → 9` restriction plus separate frame content in 9; `11 → momentum conservation`
  derivation for isolated particle systems (converse fails; translation symmetry gives the
  field-inclusive version under action and boundary assumptions); `1 ↔ energy conservation`
  via Noether for autonomous models, which defines neither heat nor a global energy in curved
  spacetime; `8 → 12` approximation (weak field, slow motion, near-stationary, negligible Λ)
  then restriction to a point source; `16 → 5, 10` approximation in `v/c`, regular, needing
  `E = γmc²`, `p = γmv`, `F = dp/dt`; `7 ↔ 16` **association** for the historical link only —
  the derivation route is a hyperedge {full Maxwell system, spacetime structure} → 16, never
  from 7 alone; `5, 16 → 8` constrain but do not determine (Einstein–Hilbert is a separate
  variational route); `6 ↔ 15` linearity preserves superposition, Hilbert-space kinematics
  supplies it; `4` derivation from the commutator and Cauchy–Schwarz, no time-dependent
  equation needed; `13 ↔ 4` a Gaussian *family* saturates the bound, a Gaussian density does
  not (Sprint 0 check 4); `6 ↔ 13` analytic continuation to the heat semigroup for
  self-adjoint, lower-bounded `H`, Gaussian kernel only when `V = 0` (Sprint 0 check 5);
  `2 → 13` two routes (central limit, maximum entropy), neither from Boltzmann alone; `2 → 1`
  needs a microscopic energy model, an ensemble choice, and definitions of heat and work;
  `6 → 10` Ehrenfest, exact for affine forces, approximate for localized packets, distinct
  from the singular `ħ → 0` limit; `3, 14 → *` association only.
- Original source expression kept beside the normalized AST on every new statement.

**Exit criteria.** `upt map --source=poster` renders the sixteen entries and their supporting
nodes with relation-type edges and association edges drawn differently; each bridge carries
the assumptions the Appendix names; the graph "predicts" the hidden nodes in the sense that
removing one leaves a premise dangling, and a test asserts that.

### Phase 4 — Verification workflow and checked bridges (target: v0.53–v0.55)

**Goal.** Twenty admitted bridges across at least five relation types, each with a
reproducible witness, and the statement-fidelity safeguard applied to every formal reference.

**Deliverables.**

- The five-step workflow as code paths: parse-and-resolve (keep original beside normalized),
  applicability (dimensions, conventions, domains, side conditions: division needs nonzero,
  squaring adds solutions), relation check (symbolic via MathTS peer when present, numeric via
  vitest with convergence reported, formal via `formalRef`), statement fidelity, review and
  version.
- Symbolic witnesses through `compose-symbolic.ts` / `expr-simplify.ts` and the optional
  `mathts-expression` peer; a timeout or peer absence yields `unresolved`, never a pass.
- `formalRef?: { system: 'lean4-physlib' | …; statement: string; version: string; axioms:
  string[]; fidelity: 'two-formalizers' | 'back-translation' | 'sanity-lemmas' | 'unreviewed' }`.
  At least five bridges carry a `formalRef` with fidelity other than `unreviewed`. The proof
  itself lives out of tree; UPT does not run a proof assistant.
- CI demotes a bridge whose witness fails: `formally-proved` and `symbolically-checked` tags
  are recomputed from witness results, never hand-set.
- Families beyond oscillators: elementary diffusion and elementary waves (the proposal's
  first release scope), using the existing `fluids-waves.ts` entries as the L-layer.

**Exit criteria.** ≥ 20 bridges across ≥ 5 relation types, every one with a witness; ≥ 5 with
a reviewed `formalRef`; zero bridges tagged `formally-proved` without a `formalRef`.
Per-bridge curation cost is not an exit criterion (owner, 2026-10-01).

### Phase 5 — The invalid-bridge benchmark (target: v0.56)

**Goal.** A frozen benchmark that the atlas, formula similarity, and LLM conditions are
scored against. This is a third benchmark family, separate from Product A's identification
pins and Product B's expression fixtures. The human study (independent item authors and
human κ raters) was dropped by the owner on 2026-10-01. The harness stays.

**Deliverables.**

- Failure taxonomy, sampled evenly: omitted premise; domain violation; convention mismatch;
  notation collision; dimensional coincidence; non-uniform limit presented as uniform; false
  inverse (quantization as inverse of a limit); analogy promoted to equivalence.
- Fixtures at `tests/fixtures/atlas/<case>/{public,scorer}/`, mirroring the discovery layout;
  the scorer half is never read by the generator side.
- Independent authorship and Cohen's κ were the human study. That study was dropped
  (owner, 2026-10-01) and is not an exit criterion. The harness, including the contested
  set, stays.
- Leakage controls: frozen held-out set; at least one entire model family held out; renamed
  variables and equivalent syntax included.
- Power: 60 items (the revised proposal's 60 valid + 60 invalid) gives a Wilson interval too wide to separate methods; the target
  is 200 per class with a paired design and McNemar's test. If curation cost makes 200
  unreachable, the study reports the interval it can afford rather than the claim it cannot.
- Pre-stated criteria, fixed before data collection: zero false promotions to
  `formally-proved` (any instance blocks release); invalid-bridge rejection vs the best LLM
  baseline, paired difference with a 95% interval excluding zero; recall at depth 10 vs
  embeddings; abstention reported and preferred to a wrong accept; practical value (time and
  error rate for tracing a known derivation with the atlas versus ordinary references).
  Per-bridge curation cost is not a criterion (owner, 2026-10-01). The "if curation cost
  makes 200 unreachable" sentence above is not a gate.

**Exit criteria.** Held-out family fixed; thresholds frozen in a pre-registration note under
`docs/research/` before any condition is run. Human κ and independent item authors are not
exit criteria (owner, 2026-10-01). The harness stays.

### Phase 6 — Study, scoped release, and the discovery hypothesis (target: v0.57+)

**Goal.** Run the comparison, publish the data, and state the discovery result modestly.
The scoring study was dropped by the owner on 2026-10-01. The harness stays. The remaining
engineering item is the public-API move.

**Deliverables.**

- Seven conditions: text retrieval; symbol matching; contextual equation embeddings; typed
  structural search; LLM alone; LLM with a CAS tool; LLM with the atlas. A hosted frontier LLM
  is NOT in scope: the owner declined the spend. Local models stand in as the LLM baselines, and
  every result states that they are weaker baselines than a frontier model. LLM and
  embedding conditions run out of process and log their versions. Ablation: types only; plus
  assumptions; plus dimensions and conventions; plus regimes.
- The discovery hypothesis, tested once and stated once: held-out known bridges are recovered
  by link prediction over the typed graph at a rate above the typed-search baseline. Hubs,
  sparse regions, and missing links are hypotheses about the representation until
  independently tested. Product A stays frozen throughout.
- Versioned open export: `data/atlas/atlas.json` with JSON Schema, stable identifiers, and an
  RDF-compatible (JSON-LD) projection; QUDT / SI Digital Framework identifiers for quantity
  kinds where they resolve; PROV-O-shaped provenance.
- Explorer = `upt map` + `upt regime` + `upt path` + a per-bridge `upt atlas <id>` report with
  every qualification visible. No in-package web UI.
- Experimental API review. A symbol whose value depends on a benchmark claim is promoted to
  `src/index.ts` only if the study justifies that claim. A symbol selected on API-quality grounds
  alone (a stable contract, independent tests, no coupling to repository data, closure under type
  references) does not wait on the study. `package.json` stays `0.x`. The decision that applied
  this reading is `docs/decisions/atlas-tier1-namespace.md`.
- Governance: named maintainers per model family; a written policy for contested entries;
  contribution by small reviewable PRs.

**Exit criteria.** The scoring study (S6.1/S6.2 on the frozen set) was dropped by the owner
on 2026-10-01. The harness stays. Results already written under `docs/research/` stay the
record of the run that happened. The remaining engineering item is the public-API move
(S6.7), tracked in [`ACTIVE.md`](ACTIVE.md). Reviewer time is not an exit criterion.

---

## 5. What this roadmap does not commit to

- **A global manifold of physics, or "one vector space".** Rejected by all three source
  documents. Dimension space is the only literal vector space here, and UPT already has it.
- **Machine discovery of new physics.** A gap in the graph motivates a look; it establishes
  nothing. "No credible candidate found" is a successful outcome (discovery plan §0.1 #20).
- **Any composite claim the composition table does not define.** In particular limit followed
  by quantization is never the identity (Groenewold–Van Hove).
- **Python, SymPy, a proof assistant, or a database in the repo.** All backends stay out of
  process; witnesses are TypeScript.
- **An interactive explorer in this package.** Parked in `Future-Production-Hardening.md`.
- **A `1.0.0`.** The atlas surface stays experimental. `package.json` stays `0.x` until the owner says otherwise.
- **Replacing `BridgeEquationStatus`, `EdgeConfidence`, `EpistemicStatus`, `VettedCandidate`,
  or `AdjudicationVerdict`.** Overlay only.
- **A staffing or delivery date.**
- **A 50–100-family corpus.** The proposal's Phase 1 target. UPT's corpus is the 109-entry
  L-layer plus the families each phase adds (oscillators, diffusion, waves). Breadth is
  those families, not a target set by a curation-cost measurement.
- **Not carried, by choice:** OpenMath / Content MathML syntax trees (UPT's `ExprNode` is the
  syntax tree) and Wikidata symbol identifiers; assisted-authoring hours-saved measurement;
  Lean4PHYS / LeanPhysBench positioning; the Bronstein-cube caveat that its corners are
  regimes, not eight theories (the §Sources survey entry is the draft's, uncorrected);
  spectral-gap undecidability as an argument. None of these changes a phase.

## 6. Risks specific to landing this in UPT

| Risk | Mitigation |
|---|---|
| Two overlays for one edge (discovery plan §3 and the atlas record) | Phase 1 design note reconciles them into one type before code; Adam vets the reconciliation. |
| Fabricated relation types or assumptions during migration | `undefined` / `not-yet-audited` is the default; Eve samples migrated records against sources. |
| Composition-table change breaks the 41-edge graph tests | Edges without a `relation` compose as today; the table only fires when both operands carry one. |
| Formal-reference theatre (a `formalRef` to the wrong statement) | Fidelity field is required; `unreviewed` never contributes a `formally-proved` tag. |
| Benchmark built by the schema authors | The human study was dropped (owner, 2026-10-01). The harness remains. Model-rater agreement, where already reported, is model agreement. |
| Curation cost swamps the project | Per-bridge person-hours are not an exit criterion (owner, 2026-10-01). |
| Graph statistics misread as physics | Every hub/gap figure reports its filters and coverage and is labelled a hypothesis about the representation. |
| This document drifts like the old `CLAUDE.md` release section did | It records direction and exit criteria only. Counts, versions, and shipped state live in `CHANGELOG.md`, `todo.md`, and `ACTIVE.md`; when a phase ships, this file gets a one-line status pointer, not a narrative. |

## 7. Phase status

**UPT is DONE (owner, 2026-09-24; pre-registration Amendment 12).** DONE means that every criterion below is MEASURED and REPORTED: MET, NOT MET, amended or deferred. It does not mean that every criterion is met. Study criteria 2 and 3 are NOT MET, and they are the findings of the run that happened. On 2026-10-01 the owner dropped the human-dependent studies and removed the human-reviewer gates. Those gates are not open criteria. The harness stays.

| Phase | Status | Pointer |
|---|---|---|
| 0 — Oscillator pilot | closed | Code shipped 2026-09-20. The owner removed independent physicist review and per-bridge curation cost as exit criteria on 2026-10-01. [`ACTIVE.md`](ACTIVE.md) |
| 1 — Relation contracts overlay | overlay shipped; "zero fabricated assumptions" MET (Mothership's ruling, after a mechanical quote check) | Every quoted span in the 15 `// source:` comments matches its source exactly (`bun run atlas:quote-check`: 43 MATCH, 44 negative controls held). Disclosed by name: BE-11 checked on search-snippet access, not full text; C6 (Josephson 1962, paywalled) unverifiable; two equation numbers not confirmed by machine, von Klitzing eq. 4 (publisher bot wall) and Shapiro's printed label (1) (not machine-readable), both deferred by the owner on 2026-09-24 (they were for the owner to check in a browser). [`docs/research/phase-1-citation-check.md`](docs/research/phase-1-citation-check.md) |
| 2 — Regimes and error-carrying paths | shipped | Uniformity gate on `boundPath` (reason `uniformity-unanalysed`). The table was not widened. [`NOTES.md`](NOTES.md) |
| 3 — Hyperedges, models, poster index | shipped | `8 → 12` is one approximation (`d-8-to-12`) and its direction is unresolved. [`NOTES.md`](NOTES.md) |
| 4 — Verification workflow, checked bridges | closed | 20 bridges / 6 types. Atlas reviewed `formalRef` is 10, which meets the ≥5 gate. Catalog counted `formalRef`s are 9. Catalog cross-check `formalRef`s are 3 and catalog property `formalRef`s are 3; the owner admitted both kinds on 2026-10-01, and neither lights `formally-proved`. Per-bridge curation cost is not an exit criterion (owner, 2026-10-01). [`NOTES.md`](NOTES.md) |
| 5 — Invalid-bridge benchmark | closed; harness kept | The human study was dropped by the owner on 2026-10-01. Human κ and independent item authors are not exit criteria. The harness is unchanged. [`ACTIVE.md`](ACTIVE.md) |
| 6 — Study and scoped release | closed except the public-API move | S6.1/S6.2 scoring was dropped by the owner on 2026-10-01. The harness stays. The run that already happened is in [`NOTES.md`](NOTES.md) and [`docs/research/atlas-study-results.md`](docs/research/atlas-study-results.md). S6.7 is an open task in [`ACTIVE.md`](ACTIVE.md). |

> **This table is updated at the END of every sprint, and the risk register above is why.** Its own
> last row names the failure — *"this document drifts like the old `CLAUDE.md` release section
> did"* — and prescribes the fix: a one-line status pointer when a phase ships, never a narrative.
> The mitigation was written and then not applied, so all seven rows read "not started" while
> Phases 0–2 had shipped and Phase 3 was under way. A stale status table is worse than no status
> table: it answers the question "what is left?" confidently and wrongly, and it is the one
> document a reader consults before deciding whether to proceed or ask.

## 8. Later work

**Hybrid retrieval** (owner, 2026-09-24; pre-registration Amendment 12). An embedding model finds the candidate canonical relations for a claim, and the atlas verifies them. Each part is used where the study measured it strong. qwen3-embedding:4b retrieved the correct relation for 49/50 claims, and the atlas's typed search for 12/50 (criterion 3, Amendment 11). The atlas made 1 wrong accept, and the local LLMs made 9 to 13 (criterion 4, Amendment 4). The study's scores are in §7 and `NOTES.md`. ~~No design exists yet.~~ Design: [`docs/design/tier-11-hybrid-retrieval.md`](docs/design/tier-11-hybrid-retrieval.md). What landed is in `CHANGELOG.md`.

**Probe-searchable frontier gaps** (persona finding C1). Design: `docs/design/tier-8-probe-searchable-gaps.md`. What landed is in `CHANGELOG.md`.

**Cross-family `upt path`** (persona finding C3). Design: [`docs/design/tier-10-cross-family-path.md`](docs/design/tier-10-cross-family-path.md). ~~A route is searched inside one family.~~ The cross-family rule is that design note. What landed is in `CHANGELOG.md` and `NOTES.md`.

**Lean-proved bridges.** Design: [`docs/design/roadmap-lean-proven-bridges.md`](docs/design/roadmap-lean-proven-bridges.md). Which statements are in reach is [`docs/research/phase-4-formalref-scoping.md`](docs/research/phase-4-formalref-scoping.md). Owner, 2026-10-01: a cross-check and a property may be a catalog `formalRef`. The covers word is the kind. The three counts are the phase 4 cell. Nested statements stay nested.

Subagent-driven execution plan for all seven phases:
[`docs/planning/Atlas-Roadmap-Implementation-Plan.md`](docs/planning/Atlas-Roadmap-Implementation-Plan.md).

Related programs already recorded elsewhere and not restated here: the Product B
expression/residual search (`Scientific-Bridge-Discovery-v1.md`, phases 0A–12, Product B
shipped experimentally in v0.44.2, 2026-08-25), the v0.7 proposal set (`docs/planning/UPT v0.70 -
Proposals.md`, P1–P3/P5/P8 shipped, P4 and P7 pending peers, P6 phases B–D awaiting an owner ruling on whether they are open or met), and the
parking lot in `Future-Production-Hardening.md`.
