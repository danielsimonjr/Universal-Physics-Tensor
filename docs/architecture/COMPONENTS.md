# Universal Physics Tensor — Component Reference

---

## Table of Contents

1. [Overview](#overview)
2. [Bridge Module](#bridge-module)
3. [Composition Module](#composition-module)
4. [Canonical Module](#canonical-module)
5. [Atlas Module](#atlas-module)
6. [Dimensional Module](#dimensional-module)
7. [Numerical Module](#numerical-module)
8. [Curvature / GR Module](#curvature--gr-module)
9. [Core Module](#core-module)
10. [CLI Module](#cli-module)
11. [Entry Point](#entry-point)
12. [Component Dependencies](#component-dependencies)
13. [Curvature composite layer](#curvature-composite-layer)

---

## Overview

UPT follows a layered architecture. The 392 TypeScript files under `src/` fall into twelve modules. Each module keeps a strictly separated responsibility.

`atlas` holds typed relations between physical models (see Atlas Module). `bridges` catalogs, evaluates, and adjudicates established equations, and confronts them against real data through the evidence-spine registry. `canonical` is the textbook L-layer registry that bridges are validated against. The registry has 109 equations, spanning a monomial L0 tier, a non-monomial L1-sum tier, and a condensed-matter domain. `composition` is the graph-lite bridge-composition layer: the 41-edge catalog graph, the canonical-only graph, the discovery-hardening funnel, and the epistemic-grounding ledger. `dimensional` provides the symbolic layer, including the connection and curvature AST. `numerical` provides the compute layer, including the GR integrators and evaluators. `core` holds legacy high-level utilities, the flat constants, and the intelligent-index / regime layer. `diff` is the bridge-gradient layer. `cases` holds qualified applied-case evaluators. `cli` is the typed CLI command tree behind the `bin/upt.mjs` shim. `entry` is the public re-export surface. `root` is the one-file `cli-api` barrel at the `src/` root.

```
┌────────────────────────────────────────────────────────────────┐
│  entry/            │  Public re-export surface (1 file)        │
├────────────────────────────────────────────────────────────────┤
│  cli/              │  Typed CLI command tree — main/args/      │
│                    │  output/graphs + 25 per-command           │
│                    │  modules behind the bin/upt.mjs shim      │
│                    │  (45 files); the 1-file cli-api barrel    │
│                    │  at src/ root is its sole runtime seam    │
│                    │  into internals                           │
├────────────────────────────────────────────────────────────────┤
│  atlas/            │  Typed model-to-model relations: types /  │
│                    │  error algebra / regime / composition     │
│                    │  table / witnesses / families / export    │
│                    │  + invalid-bridge benchmark (65 files)    │
├────────────────────────────────────────────────────────────────┤
│  bridges/          │  Catalog index + per-bridge evaluators +  │
│                    │  membership criterion / negative catalog  │
│                    │  + the CONFRONTATIONS evidence-spine      │
│                    │  registry (19 data-confronted bridges)    │
│                    │  (90 files)                               │
├────────────────────────────────────────────────────────────────┤
│  canonical/        │  Canonical L-layer registry + entries +   │
│                    │  dimensional fields + normal-form hash +  │
│                    │  bridge↔canonical linkage (F4 guard) +    │
│                    │  tensor seeder (18 files; 109             │
│                    │  equations incl. the L1-sum non-monomial  │
│                    │  tier + condensed-matter domain)          │
├────────────────────────────────────────────────────────────────┤
│  composition/      │  Quantity / BridgeEdge / composeEdges +   │
│                    │  centralized quantities + alias           │
│                    │  dispositions + enumerator + uncertainty  │
│                    │  + identifiability + retrodiction +       │
│                    │  explainQuantity + bridge-analysis +      │
│                    │  discovery + CATALOG_GRAPH + the          │
│                    │  epistemic-grounding ledger (77 files)    │
├────────────────────────────────────────────────────────────────┤
│  dimensional/      │  SI types / algebra / AST / validator /   │
│                    │  metric, connection, curvature layer +    │
│                    │  Buckingham-π + dim-spec (32 files)       │
├────────────────────────────────────────────────────────────────┤
│  numerical/        │  TensorEngine / engines / lowering /      │
│                    │  RK4 + GL4 integrators / perihelion       │
│                    │  finder / Killing / Einstein / Kretschmann│
│                    │  / Klein-Gordon / formula / geometrized   │
│                    │  (40 files)                               │
├────────────────────────────────────────────────────────────────┤
│  cases/            │  Qualified applied-case evaluators        │
│                    │  (9 files)                                │
├────────────────────────────────────────────────────────────────┤
│  core/             │  UniversalTensor class + PhysicalConstants│
│                    │  + flat *_SI constants + Labeled-         │
│                    │  Tensor / Cell / regime layer (11 files)  │
├────────────────────────────────────────────────────────────────┤
│  diff/             │  bridgeGradient + AST gradient + bridge   │
│                    │  specs (3 files)                          │
├────────────────────────────────────────────────────────────────┤
│  root              │  cli-api barrel (1 file)                  │
└────────────────────────────────────────────────────────────────┘
```

**Total** (`src/` scope): 392 TypeScript files, 2820 exports (1339 re-exports), and 55 bridge catalog entries. The catalog spans IDs 11–65: 19 established, 33 speculative, 3 highly-speculative. The scope also has 41 composition-graph edges, plus 109 canonical-only `law` edges through `CANONICAL_GRAPH`. The scope has 19 real-data confrontations: BE-11, BE-21, BE-23, BE-35, BE-36, BE-37, BE-48, BE-51, BE-52, BE-55, BE-56, BE-58, BE-59, BE-60, BE-61, BE-62, BE-63, BE-64, BE-65.

(The `src/`-scope file and export counts come from the Summary Statistics in `docs/architecture/DEPENDENCY_GRAPH.md`, which `bun run docs:deps` regenerates. The catalog, canonical, graph and confrontation counts come from the built package; see Verification below.)

---

## Bridge Module

### `BRIDGE_EQUATIONS` array (`src/bridges/index.ts`)

The 55-entry catalog array of `BridgeEquationEntry` objects. Each entry carries: `id` (11–65), `name`, `category` / `category_name`, `bridges` (the two bridged regimes), `status` (`established` / `speculative` / `highly-speculative` / `invalid`), and `context` (1–2 sentence summary). The entry carries `formula_latex`, `source_part`, `known_issues`, `references`, `dependencies` (ids of other bridge entries explicitly referenced), `dimensional_signature` (null for entries without a dimensional encoding), and `tractability_class`. The array is the source of truth for catalog metadata; per-bridge evaluator modules supplement it with runnable code.

### `BridgeEquationEntry` type (`src/bridges/index.ts`)

The shape of a single catalog entry. Carries all spec-level metadata described above. Consumers who only need catalog queries (filter by status, look up known issues) import this type and `BRIDGE_EQUATIONS`. These consumers never need to touch the dimensional or numerical layers.

### `BridgeEquationStatus` / `BridgeIssueSeverity` / `BridgeIssueFixable` (`src/bridges/index.ts`)

Discriminated string union types for the `status`, severity, and fixability fields of catalog entries. `isActiveStatus(s)` is a type predicate that excludes the `'invalid'` arm. The function is defined in `src/bridges/index.ts`. The function is **not** re-exported from `src/index.ts`, so the function is not on the main package's public surface.

### `BridgeTractabilityClass` (`src/bridges/index.ts`)

Classifies how computationally tractable a bridge equation is: `'closed-form'` (O(1) algebraic evaluation), `'numerical-tractable'` (polynomial-time algorithm), `'numerical-asymptotic'` (diverging asymptotic series), `'formally-divergent'` (not Turing-computable, e.g. cosmological constant), `'undefined'` (not yet classified).

### Per-bridge evaluator modules (`src/bridges/equations/be-*.ts`)

Every catalogued bridge (all 55, IDs 11–65) has an evaluator — see `docs/architecture/bridge-coverage-audit.md`. BE-11…50 and BE-53/54 live in `src/bridges/equations/be-*.ts`; BE-51/52 live in `src/bridges/gravitational-lensing.ts` / `perihelion-precession.ts`; BE-55…65 live in `src/bridges/be55…be65-*.ts`. Each `equations/be-*.ts` module exports:
- **RHS AST constant** — the `ExprNode` tree for the right-hand side (all modules; 31 also export the LHS tree).
- **`validate*Dimensions(): DimensionValidationReport`** — calls `validateEquation(LHS, RHS)` and returns `{ ok, lhsDim, rhsDim }`. BE-22, BE-32, BE-35, BE-50 and BE-53 export no such helper.
- **`evaluate*(inputs): number`** — a synchronous plain-JS evaluator over a typed inputs interface. BE-37 also exports the async `evaluateBE37EikonalNumerical()`, the only evaluator in `equations/` that calls `evaluateNumerical()`.
- **Typed inputs interface** — e.g., `DecoherenceRateInputs`, `HawkingTemperatureInputs`; only BE-11, BE-37 and BE-42 export one.

The modules do not share a base class; the pattern is by convention. See `ARCHITECTURE.md §Bridge Catalog Architecture` for the full per-module pattern.

### `BridgeEquations` facade (`src/bridges/bridge-equations.ts`)

A root-level convenience object gathering every per-bridge `evaluate*()` function under readable method names — e.g. `BridgeEquations.decoherenceRate({...})` (BE-11), `.hawkingTemperature({ M_kg })` (BE-42). Each method is a 1:1 pass-through to the existing pure evaluator (no new physics). TypeScript infers the per-method input/return types structurally, adding exactly one runtime export as a result. The archived BE-25 OrchOR is excluded (BE-25 maps to the live IIT `intrinsicInformation`); BE-51 and BE-52 map to `gravitationalLensing` and `perihelionPrecession`.

### `evaluateGravitationalLensing` / `evaluatePerihelionPrecession` (`src/bridges/index.ts` re-export)

The GR bridge evaluators for BE-51 and BE-52, defined in `gravitational-lensing.ts` and `perihelion-precession.ts` and re-exported from the main index. Both are synchronous, take typed input bundles and return typed result objects. Lensing takes `{ M_kg, b_m }` (lensing mass, impact parameter) and returns the deflection angle in radians and arc-seconds. Perihelion takes `{ M_kg, a_m, e, T_yr }` (central mass, semi-major axis, eccentricity, orbital period) and returns the advance per orbit and per century.

### `adjudicateBridgeEntry` / `adjudicateCatalog` (`src/bridges/membership.ts`)

The computable bridge-membership criterion has two cases. *A bridge is an edge whose endpoint quantities differ in at least one regime attribute*. *A law is an edge whose endpoints share all stated regime attributes*. For catalog entries the `bridges: [a, b]` tuple is the proxy, with the negative catalog as overlay. Returns a `BridgeVerdict` (`'bridge' | 'not-a-bridge' | 'unadjudicated'`) per entry, or a whole-catalog `CatalogAdjudicationReport`. Re-exported from `src/index.ts` directly from `membership.ts`.

### `REJECTED_BRIDGE_ADJUDICATIONS` / `REJECTED_BRIDGE_IDS` (`src/bridges/rejected.ts`)

The negative catalog — entries adjudicated NOT-A-BRIDGE with per-id reasons: BE-28, BE-29, BE-32, BE-35, BE-40. BE-42 (Hawking temperature) is adjudicated a bridge (`['gravity','quantum']`); BE-44/46/50 are contested/unadjudicated. Full disposition: `docs/architecture/v0.8.0-catalog-adjudication.md`.

### `confrontBE36` / `GW170817` (`src/bridges/be36-gw170817-confrontation.ts`)

The GW170817 multi-messenger observation (`GW170817`, a `GWSpeedObservation` constant) confronted against the BE-36 GW-speed bound. Returns a `BE36ConfrontationResult`. Re-exported from `src/index.ts`. `confrontBE36WithUncertainty` adds a first-order 1σ on both bounds (`upperBoundSigma`, `lowerBoundSigma`), computed inline from the observational timing uncertainty (Δt = 1.74±0.05 s).

### `confrontBE23` / `PLANCKIAN_CUPRATES` (`src/bridges/be23-planckian-confrontation.ts`)

The BE-23 real-data confrontation: SYK Planckian dissipation against the overdoped-cuprate aggregate of Legros et al. 2019 (`PLANCKIAN_CUPRATES`, a `PlanckianObservation` constant; `PLANCKIAN_O1_BAND` is the O(1) acceptance band). Honest-aggregate encoding — no fabricated per-material table. `confrontBE23` returns a `BE23ConfrontationResult`; `confrontBE23WithUncertainty` adds first-order uncertainty propagation, computed inline. All re-exported from `src/index.ts`.

### `CONFRONTATIONS` / `runConfrontation` / `listConfrontations` (`src/bridges/confrontations.ts`)

The confront / evidence-spine registry — the unified home for every real-data confrontation, wrapping the per-bridge `be*-confrontation.ts` modules behind one normalized `ConfrontationOutcome` shape. `runConfrontation(bridgeId)` runs one confrontation by id (`undefined` if unregistered); `listConfrontations()` returns every entry in ascending bridge-id order. `DATA_CONFRONTED_IDS` (`src/bridges/confrontation-coverage.ts`) projects this registry's keyset — the single source of truth for "how many bridges are data-confronted" (19; `node bin/upt.mjs coverage --json` reports it as `byTier['data-confronted']`). Confrontations are deliberately ORTHOGONAL to the discovery funnel — this module never imports `discovery.ts`. Surfaced by `upt confront [--bridge=be-XX] [--json] [--sensitivity]` (`src/cli/commands/confront.ts`).

### `ConfrontationOutcome` / `ObservationProvenance` / `residualInSigma` / `combineInQuadrature` (`src/bridges/observations/types.ts`)

The typed observation layer every confrontation module returns into. `ConfrontationOutcome` is discriminated on `kind` (`'value' | 'upper-bound' | 'consistency' | 'table'`), so each confrontation carries only the fields it can honestly populate. No confrontation carries a fabricated placeholder for a bound-only or consistency-only result. Every observation carries a mandatory `ObservationProvenance` (citation, year, ISO retrieval date, optional caveat note); the `upper-bound` arm carries an optional `caveat` field (e.g. BE-36's one-sided-pass note, surfaced in the `upt confront` summary line itself, not just the provenance). `residualInSigma(predicted, observed, sigma)` and `combineInQuadrature(components)` (root-sum-square over named `SigmaComponent`s) are the shared statistics primitives every confrontation module calls.

### Per-bridge confrontation modules (`src/bridges/be*-confrontation.ts`)

Nineteen confrontations exist. Each confrontation recomputes a bridge's own prediction. Each confrontation confronts that prediction against an independently-sourced observation:

- be-11 × collisional decoherence (Hornberger 2003)
- be-21 × quark-gluon-plasma KSS bound (Bernhard-Moreland-Bass 2019)
- be-23 × Planckian cuprates (Legros 2019)
- be-35 × 3D-Ising conformal bootstrap (Pelissetto-Vicari 2002)
- be-36 × GW170817 (with the one-sided caveat)
- be-37 × Cassini PPN-γ (Bertotti 2003)
- be-48 × LISA-Pathfinder CSL bound (Carlesso 2016)
- be-51 × VLBI light-deflection PPN-γ (Lambert 2009)
- be-52 × Mercury perihelion (Clemence 1947)
- be-55 × quantum Hall universality (Janssen 2012)
- be-56 × Casimir force (Mohideen-Roy 1998)
- be-58 × Johnson-Nyquist noise thermometry (Flowers-Jacobs 2017)
- be-59 × Josephson-volt universality (Kautz 1996 / BIPM)
- be-60 × fractional quantum Hall ν = 1/3 plateau (Tsui-Störmer-Gossard 1982)
- be-61 × Wiedemann-Franz Lorenz number (Kumar 2023)
- be-62 × BCS gap ratio (Tinkham)
- be-63 × Chandrasekhar mass (Shapiro-Teukolsky)
- be-64 × Eddington luminosity (Rybicki-Lightman)
- be-65 × Jeans mass (Binney-Tremaine)

Together, be-52 (Mercury perihelion), be-51 (light deflection) and be-37 (Shapiro delay) agree with their observations within 1σ. Perihelion and deflection are two of the three classic GR tests; Shapiro delay is the fourth. They are not three equal confirmations: deflection and Shapiro delay both test PPN γ, and Mercury tests the combination (2 + 2γ − β)/3.

---

## Composition Module

The graph-lite bridge-composition layer (`src/composition/`): bridges as typed graph edges over physical quantities, composable into multi-bridge chains. 71 files; the graph has **41 edges** (9 calibration + 6 catalog-tranche + 26 catalog-full).

### `Quantity` / `RegimeAttributes` / `regimesDiffer` (`src/composition/quantity.ts`)

A `Quantity` is a graph endpoint — a physical quantity with a `Dimension` and stated regime attributes. `regimesDiffer(a, b)` is the graph-native form of the membership criterion.

### `BridgeEdge` / `EdgeConfidence` / `ValidityDomain` (`src/composition/edge.ts`)

A directed edge between two `Quantity` endpoints carrying the bridge's transfer function, confidence tier, and validity domain. `evaluateEdge` applies an edge. The `CompositionDimensionError` / `CompositionJunctionError` / `DomainViolationError` / `CompositionAliasError` classes also live here. `CompositionAliasError` is thrown when a name collision between composed operands' source quantities has no recorded disposition.

### `composeEdges(...)` (`src/composition/compose.ts`)

The composition operator — chains compatible edges into a derived edge, checking junction compatibility and quantity identification (`QUANTITY_IDENTIFICATIONS`, `QuantityIdentification`) and combining confidence tiers via `minConfidence`. Note the name: `composeEdges`, **not** `compose` (`compose` is the Cell factory in `core/`). It enforces the **namespacing gate**. Same-named source quantities across the two operands throw `CompositionAliasError` unless an `AliasDisposition` is recorded. The disposition is `'shared'` or `{renameSecond}` with an input remap. The disposition is recorded in the reviewable `SOURCE_ALIAS_DISPOSITIONS` registry, or passed through `opts.aliases`.

### `consistencyRatio(...)` (`src/composition/consistency.ts`)

Compares a composed chain's prediction against an independent direct route and returns the dimensionless ratio.

### Centralized quantity nodes (`src/composition/quantities.ts` barrel + `quantities/` modules)

The home of every graph endpoint: **131** `Quantity` constants (`export const *Q: Quantity`), one object per canonical name, with name uniqueness pinned by `tests/composition/quantities.test.ts`. Naming judgments are recorded at each definition where the physics differs from an existing node. For example, BE-23/BE-26 carrier/proton masses are `effective-mass` / `tunneling-mass`, not the gravitational `mass`. Internal: the edge files consume the nodes. The composition barrel does not re-export them. The definitions are grouped by physics domain in `quantities/{quantum,gravitation-cosmology,fields,condensed-matter,common}.ts`, with shared dimension aliases in `quantities/_dims.ts`. Each node's consuming `catalog-*` edge file classifies the node. `quantities.ts` is a barrel re-exporting all five. The cross-cutting unit-convention banner (GeV-vs-J and bits-vs-nats heterogeneity) stays in the barrel docstring.

### `enumerateCompositions(...)` (`src/composition/enumerate.ts`)

The candidate enumerator walks all ordered edge pairs and attempts composition. The enumerator returns an `EnumerationReport`. The report partitions the pairs into three groups: valid `CompositionCandidate`s (split against `REGISTERED_COMPOSITION_IDS` into registered and novel), dimension/junction failures, and `requiresDisposition` entries. Each such entry (`DispositionRequired[]`) is an alias collision correctly held at the namespacing gate. Over the 41-edge graph it finds 11 compositions, 7 of them novel candidates (`docs/research/v0.11.0-novel-candidates.md`).

### `propagateUncertainty(...)` (`src/composition/uncertainty.ts`)

First-order uncertainty propagation through a central-difference Jacobian over an edge's transfer function. This method works on composed edges for free and returns an `UncertaintyResult`. No module in `src/` calls the function. The function is a public export, exercised by `tests/composition/enumerate-uncertainty.test.ts` and `tests/atlas/path-bound.test.ts`. The BE-36 and BE-23 `…WithUncertainty` confrontations do not call the function; they compute their first-order σ inline.

### `classifyIdentifiability(...)` / `classifyAll(...)` / `forwardClosure(...)` (`src/composition/identifiability.ts`)

The structural identifiability classifier. The classifier takes a known-quantity-name set and a target name over an edge set. The classifier counts the target's INDEPENDENT derivations and returns an `IdentifiabilityResult` with a four-way `IdentifiabilityVerdict`:

- `under-determined` (target unreachable, with a `blockingFrontier` of upstream gaps)
- `exactly-determined` (one derivation)
- `over-determined` (≥2 derivations; the surplus are falsifiable consistency constraints)
- `given` (target in the known set)

`forwardClosure` is the monotone determinability primitive. It honors `QUANTITY_IDENTIFICATIONS` as directed name-equivalences, mirroring `composeEdges`. Derivation counting uses a target-removed closure to exclude circular self-support. The classifier is structural, not parametric — see `docs/planning/Identifiability-Classifier-Design-Note.md`. Real-graph anchor: from `{mass}`, `hawking-temperature` is over-determined (be-42 and be-42-via-rs).

### `retrodict(...)` / `retrodictNode(...)` (`src/composition/retrodiction.ts`)

The framework's own falsification benchmark — the numerical counterpart of the identifiability classifier's `over-determined` verdict. Given ground-truth quantity values, the benchmark MASKS each over-determined node. Masking recomputes source values over the graph with every edge into that node removed. The benchmark recovers the node through each independent derivation, using the domain-checked `evaluateEdge`. The benchmark scores the relative spread of the predictions. Outcomes: `consistent` (≥2 derivations agree ≤ tolerance), `inconsistent` (disagree — a real falsification), `single`, `unrecoverable`. Returns a `RetrodictionReport` with the headline `allConsistent` gate; `classifyAll` is the feeder for the swept node set. Optional external `references` add textbook-value scoring (`referencePass`). Pass bar pre-registered (spread ≤ 1e-6) in `docs/planning/Retrodiction-Harness-Design-Note.md`. Pre-registered anchor: from `{mass: M_sun}`, `hawking-temperature` is `consistent` (be-42 vs be-42-via-rs agree to float precision) and recovers the ≈ 6.17×10⁻⁸ K solar-mass value.

### `explainQuantity(...)` (`src/composition/explain.ts`)

The unified "explain this quantity" entry point — synthesizes the three inference primitives into one `QuantityExplanation`. Given a target and a known set (names, or `name → value`), the function runs three primitives. The function runs the identifiability classifier, which shows how the graph computes the target. The function runs the retrodiction harness, which shows whether the redundant derivations agree, and the recovered value when values are supplied. The function runs the dimensional Buckingham-π layer: `dimensionallyDetermines` on the known set shows whether the inputs are dimensionally sufficient, independent of the graph. The function composes these three results into a plain-language `summary`. The three primitives answer complementary questions. For example: for `hawking-temperature` from `{mass: M_sun}`, the summary reports that the quantity is over-determined (be-42, be-42-via-rs), the derivations agree, and the value is ≈ 6.17×10⁻⁸ K. The summary also reports that mass alone is not dimensionally sufficient; the evaluator carries ℏ, c, G, k_B. Per-derivation values come from the retrodiction predictions; `extraDimensions` lets the dimensional layer test a known set richer than the graph's nodes (e.g. raw `G`, `c`). Each derivation is reported full-chain: `leafInputs` traces the immediate `sources` back through every intermediate to the leaf inputs (e.g. be-42-via-rs's last-hop source `schwarzschild-radius` traces to the `mass` leaf), with an optional `dimensionalForm` monomial in those leaves. Surfaced for non-TypeScript users by the `upt` CLI (`bin/upt.mjs`, `npm run upt -- explain <quantity> …`, or `npm run explain`).

### `bridge-analysis.ts` (INTERNAL — not on the public surface)

A meta/analysis layer, like the catalog adjudicator, that combines the dimensional engine with the graph. The layer triages the speculative bridges by *decidability against established physics*, using four signals:

- `dimensionalFreedom` (free dimensionless parameters)
- `attemptDerivation` (does the equation re-derive as a recognized monomial with a clean constant — `grounded`/`empirical`/`decoy`/`open`)
- `anchoringDistance` (graph distance to the established-confidence core)
- `bridgePriority` (the composite scorecard, Tier 1–3)

Deliberately NOT re-exported from `src/index.ts`. **Explicitly a review/confrontation-priority ranking, NOT a credibility score** — the signals are orthogonal to whether a bridge is true (the docstring and `docs/research/Bridge-Priority-Scorecard.md` carry the caveat). Surfaced by `npm run bridge-priority`; pinned by `tests/composition/bridge-priority.test.ts`.

The module also hosts `linkageMap(edges)`, the connected-component map of the catalog graph (edges linked by shared quantities, honoring `QUANTITY_IDENTIFICATIONS`). The map has three parts. The parts are: clusters (largest first, each with its status mix, link hubs, and an `anchored` flag), the isolated tail, and the composition count. The map reveals the catalog's hub-and-spoke structure: one dominant anchored cluster of 16 hubbed on `mass`/`temperature`, two small thematic clusters, and 20 isolated edges. Surfaced by `upt map`; recorded in `docs/research/Catalog-Linkage-Map.md`; pinned by `tests/composition/linkage-map.test.ts`. This map is structural, NOT a credibility signal.

`proposeLinkCandidates(edges)` uses the map to propose candidate identifications. A candidate is every pair of quantities in DIFFERENT clusters that share a non-dimensionless dimension — the kind of link that the Hawking-temperature ≡ temperature identification is. Each candidate is tagged with `touchesCore` and `sameKind` (shared name token).

⚠ The result is a coincidence-heavy REVIEW SURFACE, NOT a list of discovered bridges. Of 132 candidates, 98 touch the anchored core, and 36 of those are also same-kind. Of the same-kind candidates, ~34 are still coincidences (`decoherence-rate ≟ hubble-rate`) or pairs the catalog deliberately keeps distinct (`effective-mass ≠ mass`). The genuinely-motivated few — e.g. `coarsening-length ≟ quantum-correlation-length`, linking the isolated Model-A coarsening bridge to the Kibble–Zurek cluster — go to human review.

Surfaced by `upt candidates`; written up in `docs/research/Linkage-Candidate-Proposals.md`; pinned by `tests/composition/link-candidates.test.ts`.

### `describeGrounding` / `CandidateGrounding` (`src/composition/grounding.ts`)

The PI-instrument epistemic-grounding ledger is a pure, annotation-only view. The view sits over a `VettedCandidate`'s (`discovery.ts`) already-computed falsifier results. The ledger attaches to every `promising` `upt discover` verdict.

The ledger partitions the candidate's gates into two groups:

- `passed`: a gate that ran a real comparison AND the candidate survived it — numerical-consistency, magnitude, axis-compatibility, or an `entailed` consequence match.
- `gaps`: a gate that abstained, or an unadjudicated `novel-consequence`/`inconclusive` consequence signal.

The ledger also carries two permanent honesty-ceiling fields, both fixed at `false`:

- `mechanismTested`: axis-compatibility is a regime proxy, not a mechanism test. A dedicated mechanism-proxy gate was assessed and found not buildable without fabricating coupling physics the catalog lacks.
- `dataTested`: a candidate is unconfrontable until promoted to an established bridge. Real data confrontation lives in the `upt confront` world, not candidate space.

The ledger changes no verdict, score, or funnel count. `describeGrounding(candidate, consequence?)` takes the optional signal from `src/composition/consequence.ts`'s `annotateConsequences`, the `entailed` / `novel-consequence` / `inconclusive` post-pass classifier over `deriveProposedBridges`. The function omits that signal when the consequence layer did not run.

### `compose-surface.ts` barrel

The surface barrel for the namespacing-gate symbols (`CompositionAliasError`, `SOURCE_ALIAS_DISPOSITIONS`, `AliasDisposition`, `DispositionRequired`) — keeps `src/index.ts` one-import-per-area while the implementations live in `edge.ts` / `compose.ts` / `enumerate.ts`.

### Calibration edges (`src/composition/edges/calibration.ts`)

Pre-registered edges for the calibration targets:

- `be16Edge` (Landauer)
- `be42Edge` / `be42ViaRsEdge` (Hawking T)
- `be51Edge` (lensing)
- `be52Edge` (perihelion)
- `be12Edge` (thermal de Broglie)
- `be11ZurekEdge` (Zurek decoherence)
- `be37Edge` (Shapiro delay)

`lawSchwarzschildRadius` is a **diagonal-law edge**: same-regime endpoints, a law rather than a bridge under the membership criterion. The `M_SUN_KG` anchor constant is an alias of `M_SUN_SI` from `core/constants.ts`. The CT-1 target derives E_min(M) = ℏc³ln2/(8πGM) from the BE-42∘BE-16 chain. CT-3 derives the Zurek decoherence scaling from BE-12∘BE-11.

### Catalog-tranche edges (`src/composition/edges/catalog-tranche.ts`)

Six catalog-backed edges wrap existing validated evaluators: `be14Edge`, `be19Edge`, `be21Edge` (KSS, a nullary edge), `be48Edge` (GRW localization), `be53Edge`, and `be54Edge`. Each edge carries value pins, domain tests, and a catalog-status drift guard.

### Catalog-full edges (`src/composition/edges/catalog-full.ts`)

26 further edges (`CATALOG_FULL_EDGES`), one per catalog bridge, which bring the graph to 41 edges. BE-11 is among them and also has `be11ZurekEdge`. Each wraps an existing validated catalog evaluator (the catalog stays authoritative) and carries a first-class validity domain mirroring what the wrapped evaluator enforces. No edges exist for the NOT-A-BRIDGE entries BE-28/29/32/35/40 (per `rejected.ts`). BE-44 is skipped honestly: its evaluator takes a `number[]` news-sample array, incompatible with the scalar-Record edge contract. BE-55…65 have no graph edge either, so 17 catalog bridges have no edge in total.

### Assembled graph (`src/composition/catalog-graph.ts`)

`CATALOG_GRAPH` — the 9 calibration + 6 catalog-tranche + 26 catalog-full edges assembled once into a single `readonly BridgeEdge[]`. The result is the public, canonical 41-edge graph. The CLI reads it through the `cli-api` barrel (`src/cli/graphs.ts`). The composition test suites import it directly, rather than each rebuilding the edge list from its constituent imports.

---

## Canonical Module

The textbook **L-layer** registry (`src/canonical/`, 17 files): the standard-physics "answer key" the catalog bridges are validated against (Π = L + B + E). **109 canonical equations** (mechanics, EM/circuits, fluids/waves, thermo, quantum/atomic, gravitation, cosmology, condensed-matter, + the L1-sum non-monomial tier), grouped into per-domain `entries/` modules.

### `CanonicalEquation` type (`src/canonical/canonical-equation.ts`)

One textbook law with its fidelity tier: L0 (dimensional), L1 (scalar-AST), or L2 (field-equation). Each equation also carries `epistemicStatus`, `freeDimensionlessGroups`, the L0 `dimensional` fields, and the F4 disambiguators `partnerBridges` / `restatesBridge`. The latter names the bridge a law literally restates, so the linkage guard can discount the trivial X≡X match.

### `CANONICAL_EQUATIONS` registry + accessors (`src/canonical/registry.ts`)

The assembled array plus `canonicalById` / `canonicalByDomain`, the coverage helpers `partneredBridgeIds` / `bridgesWithoutCanonicalPartner` (47 bridges have no canonical partner), and `seedCanonicalLaws` / `CANONICAL_TENSOR_CONFIG` for populating the tensor. Entry modules live in `entries/`, grouped by physics domain:

- `dimensional-classics.ts`
- `relativity.ts`
- `mechanics.ts`
- `electromagnetism.ts`
- `fluids-waves.ts`
- `thermo-nuclear-cosmo.ts`
- `atomic.ts`
- `statistical-mechanics.ts`
- `condensed-matter.ts`
- `nonmonomial.ts` (the L1-sum tier's 13 non-monomial entries)

All entry modules are built on the shared `_l1-build.ts` helper. L0 fields are derived from the Buckingham engine in `dimensional-fields.ts`.

### `normalForm` / `structurallyEqual` (`src/canonical/normal-form.ts`)

The structural hash: "the same relation up to dimensionless **constants**." Numeric literals and registered constants (`ln2`, `4pi`, …) are dropped. A dimensionless symbol that is NOT a recognized constant is kept as a distinct `stub:<name>` token. A functional stub like `ln⟨e^−βW⟩` therefore does not collapse onto `ln2`.

### `canonicalResidual` (`src/canonical/residual.ts`)

The residual form of a canonical entry, `target − scalarAst`. An entry stores the right-hand side of one target, while a claim is a relation `lhs − rhs`. The structural key of a residual and of a right-hand side is never equal, so a structural search must compare residuals on both sides. Only the tests and the criterion 3 study reach the module (`test-only`). The product's typed structural search keeps its pinned behaviour while the study is live.

### `classifyLinkage` / `scanLinkages` (`src/canonical/linkage.ts`)

The "validate against standard physics" engine + the **F4 circularity guard**. Each bridge↔canonical pair classifies as `restates-canonical` (a declared X≡X, NOT a discovery), `recovers` (an undeclared structural match), `dimensional-only`, or `unrelated`. `upt recover` surfaces the scan.

---

## Atlas Module

The atlas (`src/atlas/`) records typed relations BETWEEN physical models. The bridge catalog
records relations between QUANTITIES. Each atlas bridge has a relation type, side conditions, a
regime, an error bound with a machine horizon, and witnesses and counterexamples. An evidence
tag is never set by hand; `deriveEvidence` derives it.

The public set is the root `atlas` namespace (`src/atlas/public.ts`). All other atlas symbols are
`@internal` and reachable only through the `universal-physics-tensor/atlas` subpath.
`src/bridges/` and `src/composition/` never import the atlas barrel `src/atlas/index.ts`, because
that import closes a cycle.

### `RelationType` / `AtlasBridge` / `ApproximationBound` / `Regime` (`src/atlas/types.ts`)

The record types. `RelationType` is `'derivation' | 'exact-equivalence' | 'restriction' |
'approximation' | 'coarse-graining' | 'analytic-continuation' | 'structural-analogy' |
'deformation-quantization'`. An `ApproximationBound` must carry a machine `horizonHolds`; a
constructor without it throws `MissingHorizonError`. A `Regime` holds a list of
`RegimeInequality` (`{ group, op, bound }`), keyed by `PiGroup.formula`.

### `composeBounds(outer, inner)` / `composeBoundPath(bounds)` (`src/atlas/error-algebra.ts`)

`composeBounds(outer: BoundPair, inner: BoundPair): BoundPair` composes two error bounds, outer
after inner: `K = outer.K * inner.K`, `delta = outer.K * inner.delta + outer.delta`.
`composeBoundPath(bounds: readonly (BoundPair | null)[]): ComposedPath` folds a path, and refuses a
path that has no Lipschitz constant except at its end (`MissingLipschitzError`).
`IDENTITY_BOUND` is `{ K: 1, delta: 0 }`.

### `regimeHolds(regime, groupValues)` (`src/atlas/regime.ts`)

`regimeHolds(regime: Regime, groupValues: Readonly<Record<string, number>>): RegimeCheck`. The
result is three-state: `ok` is `true`, `false` (an inequality is violated) or `'unknown'` (an
inequality has no value). An empty inequality list returns `true`, which means "nothing to check",
not "checked and held"; callers treat it as unchecked. The same module holds
`deriveRegimeGroups`, `intersectRegimes`, `regimeOverlap`, `uncoveredRegions` and
`admitApproximation`.

### `composeRelation(first, second)` / `COMPOSITION_TABLE` (`src/atlas/composition-table.ts`)

`composeRelation(first: RelationType, second: RelationType): CompositionResult` reads the 8×8
table. A cell the table declines returns `NO_COMPOSITE_CLAIM` (`'no-composite-claim'`), never a
guess.

### `findPath(...)` / `boundPath(bridges)` (`src/atlas/path-bound.ts`)

`findPath(family: string, from: string, to: string): readonly AtlasBridge[] | null` routes
between two models through the bridges of ONE family; a route that crosses families is outside its
scope. `boundPath(bridges: readonly AtlasBridge[]): PathBoundResult` composes the relation types
and the error bounds along a route, and returns a no-claim result when the table declines.

### `deriveEvidence(record, passingWitnessIds)` (`src/atlas/derive-evidence.ts`)

`deriveEvidence(record: EvidenceInput, passingWitnessIds: ReadonlySet<string>):
ReadonlySet<EvidenceTag>`. The second argument is required, so "no witness passed" is a written
choice (`NO_PASSING_WITNESSES`). `formally-proved` is reachable only through a reviewed
`formalRef`; a file allow-list lint forbids spelling the tag anywhere a record could set it.

### `checkApplicability(input)` (`src/atlas/applicability.ts`)

`checkApplicability(input: ApplicabilityInput): readonly ApplicabilityFinding[]`. The function returns
findings, not a boolean. A `'blocking'` finding is a contradiction in the data (a dimensional
failure, opposite conventions, a literal zero divisor). A `'question'` finding is a silence (an
unguarded divisor, a convention only one side declares). `sideConditions` is required, so "none"
is written as `[]`.

### Witness runners (`src/atlas/witness-numeric.ts`, `witness-symbolic.ts`, `witness-artifact.ts`, `witness-specs.ts`)

`runNumericWitness(spec: NumericWitnessSpec): NumericWitnessRunResult` measures the error at two
resolutions and returns `checked`, `refuted` or `unresolved`. `runSymbolicWitness(spec:
SymbolicWitnessSpec, simplifier?: SymbolicSimplifier | null): Promise<WitnessRunResult>` asks the
CAS peer whether `lhs - rhs` simplifies to zero; `null` means the peer is absent, and the result
is then `unresolved` with reason `peer-absent`. `WITNESS_REGISTRY` in `witness-specs.ts` is the
executable list. `runWitnessRegistry` runs it, and only `bun run atlas:witness-results` writes the
result to `data/atlas/witness-results.json`. Every registered witness has a negative control in
`tests/atlas/`; the coverage test in `tests/atlas/negative-controls.test.ts` compares the control
ids against `WITNESS_REGISTRY`.

### Families (`src/atlas/oscillators/`, `diffusion/`, `waves/`, `families.ts`)

Each family module holds its models, bridges and rejections. `ATLAS_FAMILIES` in `families.ts`
lists every family; a whole-atlas gate iterates it and never names one family. A bridge can end in
a model of another family instead of defining that model again.

### Export (`src/atlas/serialize.ts`, `export.ts`)

`toAtlasJson` writes one family as versioned JSON (`ATLAS_RECORD_SCHEMA_VERSION`).
`toCombinedAtlasJson(families, packageVersion)` and `toAtlasJsonLd(...)` write the whole atlas;
ids use the prefix `ATLAS_ID_PREFIX` (`urn:upt:atlas:`).

### Invalid-bridge benchmark (`src/atlas/benchmark/`)

- `types.ts`: `BenchmarkItem`, the PUBLIC half of an item. It never carries the answer.
- `loader.ts`: `loadFrozenItems(benchmarkDir: string): BenchmarkItem[]` and `validateItems(items,
  frozen): ItemProblem[]`. The loader refuses a frozen item that is not `'independent'`, and any
  public item that carries `kind` or `failureKind`.
- `run-atlas.ts`: `runAtlasOnItem(item, config?): AtlasVerdict` applies the applicability checker,
  the composition table and the regime check. It rejects when an instrument demonstrably fires,
  accepts only when at least one instrument ran and every enabled instrument cleared, and abstains
  otherwise. `ABLATION_CONFIGS` holds the four cumulative configurations.
- `study.ts`: `validateLabels(itemIds, labels)`, `scoreCondition(condition, answers, labels)`,
  `pairedRejection(...)` and `scoreAblation(...)`. The answer key is always an argument; no `src/`
  file reads the scorer half. An empty key throws.
- `stats.ts`: `wilsonInterval`, `mcnemar`, `pairedDifferenceInterval` (Newcombe method 10),
  `cohensKappa` and `powerReport`.
- `leakage.ts`: `leakageKey(expr)` renames every dimensioned symbol to its dimension before
  `normalForm`, so renamed-variable variants collide. `findCrossSplitLeakage` and
  `checkRenamedVariants` use it.

### `runLinkPrediction(families, k?)` (`src/atlas/link-prediction.ts`)

Leave-one-bridge-out link prediction over the typed graph, scored against a word-overlap baseline.
`docs/research/atlas-link-prediction.md` records the result, and
`tests/atlas/link-prediction.test.ts` recomputes every figure.

---

## Dimensional Module

### `Dimension` interface (`src/dimensional/types.ts`)

The seven base SI dimensions as a plain record: `{ L, M, T, I, Theta, N, J }` where each field is a `number` exponent. Rational exponents (e.g., `0.5` for a square-root dimension) are supported.

### Named dimension constants (`src/dimensional/types.ts`)

Exported constants for common SI dimensions: `DIMENSIONLESS`, `LENGTH`, `AREA`, `TIME`, `FREQUENCY`, `MASS`, `VELOCITY`, `ACCELERATION`, `FORCE`, `ENERGY`, `POWER`, `ACTION`, `TEMPERATURE`, `ENTROPY`, `CHARGE`. Only constants with at least one concrete consumer (a bridge encoding or a test) are exported. The file comment lists dimensions that are not exported (e.g., `VOLUME`, `PRESSURE`).

### `multiply` / `divide` / `power` / `add` / `subtract` / `equals` / `format` (`src/dimensional/algebra.ts`)

Pure functions over `Dimension` values. `add` and `subtract` throw `DimensionMismatchError` if the operand dimensions differ — this is the mechanism that makes the validator catch non-homogeneous equations. `format(dim)` returns a human-readable string like `[energy]` by matching against the `NAMED_DIMENSIONS` lookup table.

### `DimensionMismatchError` (`src/dimensional/algebra.ts`)

Thrown by `add` / `subtract` when operand dimensions disagree. Caught inside the validator and converted to a `Violation` entry rather than propagated as an uncaught exception.

### `buckinghamPi` / `dimensionallyDetermines` (`src/dimensional/buckingham.ts`)

The Buckingham-π enumerator — the principled primitive for the identifiability classifier's exactly-determined case. `buckinghamPi(variables)` builds the dimension matrix (7 SI base rows × variables). The function computes the matrix's rank and a basis of its null space through EXACT rational arithmetic. The function returns the n − r dimensionless π-groups (integer exponents) with a `BuckinghamVerdict` (`dimensionally-independent` / `single-invariant` / `multiple-invariants`). `dimensionallyDetermines(target, governing)` answers whether the target is fixed UP TO A DIMENSIONLESS CONSTANT. The answer is true if and only if the governing set is dimensionally independent and the target's dimension lies in its span. The function then returns the (possibly rational) monomial. The result types carry FORM only (no value or constant field) — the honest boundary between dimensional analysis and numerology. Pins the canonical results: pendulum T = const·√(L/g), Schwarzschild r_s = const·GM/c² (and that mass alone does NOT determine r_s — G and c are required). Throws `RationalizationError` on duplicate names, an empty set, or a non-rational exponent. Design: `docs/planning/Bridge-Inference-Epistemics-Note.md` (build target 1).

### `parseDimensionSpec` (`src/dimensional/dimension-spec.ts`, INTERNAL)

Turns a human dimension string into a `Dimension`. The string names one of three forms:

- a named dimension (`length`, `velocity`, …, case-insensitive)
- a fundamental constant by SI dimension (`hbar`, `c`, `G`, `k_B`, `e` — exact-case so `G` ≠ `g`)
- explicit base exponents (`L^3.M^-1.T^-2`, fractional exponents allowed)

Lets the `upt` CLI accept user-declared dimensions without TypeScript. Throws `DimensionSpecError` on bad input. Not on the public surface.

### `ExprNode` union (`src/dimensional/ast-types.ts`, re-exported by `validator.ts`)

The AST union type — **25 arms**. The union covers three groups of nodes. The scalar nodes are `symbol`, `op`, `integral`, `derivative`, `transcendental`, `abs`, and the distributional/variational primitives `dirac-delta` and `variational-derivative`. The tensor nodes are `tensor-symbol`, `tensor-product`, `metric-tensor`, `kronecker-delta`, `tensor-partial-derivative`, and `covariant-derivative`. The curvature and equation node kinds are `riemann-tensor`, `ricci-tensor`, `einstein-tensor`, `bianchi-residual`, `killing-vector`, `conserved-charge`, `stress-energy`, `cosmological-constant`, `einstein-equation`, `weyl-tensor`, and `kretschmann-scalar`. The `op '^'` arm also accepts an input-dependent exponent on a dimensionless base. The `symbol` leaf carries its dimension inline; all other nodes build structure from sub-expressions.

### `validate(node)` (`src/dimensional/validator.ts`)

Walks an `ExprNode` tree, infers SI dimensions at each node, and returns a `ValidationResult`. Tracks free (uncontracted) tensor indices in a mutable `Map`. Returns `ok: false` if any error-severity violation is found.

### `validateEquation(lhs, rhs)` (`src/dimensional/validator.ts`)

Validates two `ExprNode` trees independently and checks that their inferred dimensions agree. Used by per-bridge `validate*Dimensions()` helpers.

### `validateInverseMetricPair(gLower, gUpper)` (`src/dimensional/validator.ts`)

Opt-in structural check: given a lower/upper metric pair, returns warning-severity violations if the index structure suggests the pair is inconsistent. Not folded into `validate()` to keep the hot path lean.

### `ValidationResult` interface (`src/dimensional/validator.ts`)

Return type of `validate()`. Fields: `ok` (boolean), `inferredDimension` (`Dimension | null`), `freeIndices` (`Map<string, {upper, lower}>`), `violations` (`Violation[]`).

### `Violation` interface (`src/dimensional/validator.ts`)

A single dimensional mismatch or structural error. Fields: `location` (tree path string, e.g. `"args[1].args[0]"`), `expected`, `actual` (both `Dimension`), `note` (human-readable), `severity` (`'error' | 'warning'`, defaults to `'error'`).

### `DimensionValidationReport` interface (`src/dimensional/validator.ts`)

The return type used by all per-bridge `validate*Dimensions()` helpers. Fields: `ok`, `lhsDim`, `rhsDim` (both `Dimension | null`). Defined once in the validator to prevent per-bridge redeclaration.

### `inferDimensionForBridge` (`src/dimensional/bridge-check.ts`)

`inferDimensionForBridge(bridgeId, expr): Dimension | null`. Infers the dimension of a single hand-encoded expression. When `EXPECTED_DIMENSION_BY_BRIDGE` has an entry for the bridge id, it cross-checks the result against it. The function returns `null` when the expression is dimensionally inconsistent or fails that check. Re-exported from `src/index.ts`.

### `TensorSymbolNode` (`src/dimensional/ast-types.ts`)

AST node for a named tensor symbol with explicit index structure. Fields: `kind: 'tensor-symbol'`, `name`, `dim`, `indices` (array of `{label, variance: 'upper'|'lower'}`), `role?` (for metric-layer semantics).

### `TensorProductNode` (`src/dimensional/ast-types.ts`)

AST node for an Einstein-summation product. `computeContraction(args, validateChild)` in `src/dimensional/tensor.ts` implements the contraction algebra: pairs repeated indices, returns the residual free-index map and the product dimension.

### `MetricTensorNode` (`src/dimensional/ast-types.ts`)

AST node for a metric tensor g_{ab} or g^{ab}. Fields: `kind: 'metric-tensor'`, `name`, `indices` (two entries specifying upper or lower variance), `dim`, `signature` (a string, e.g. `'-,+,+,+'`; `metric-validators.ts` checks its form), `derivativeStrategy?` (`'computed' | 'zero' | 'supplied'`, default `'computed'`). In the numerical lowering of ∂g, `'computed'` and `'zero'` both treat the metric as constant (∂g = 0), and `'supplied'` reads the slices from `NumericalInputs.metricDerivatives`.

### `KroneckerDeltaNode` (`src/dimensional/ast-types.ts`)

AST node for the Kronecker delta δ^a_b. Dimensionless by definition; tracks the mixed-variance index pair.

### `TensorPartialDerivativeNode` (`src/dimensional/ast-types.ts`)

AST node for a partial derivative ∂_a T^b. Dimension is `dim(T) / dim(x^a)`.

### `CovariantDerivativeNode` (`src/dimensional/ast-types.ts`)

AST node for the covariant derivative ∇_μ T^ν. Validation delegates to `validateCovariantDerivative` (`src/dimensional/connection-validators.ts`), which checks that the connection index is consistent with the tensor's free-index signature.

### `christoffel(gLower, gInverse, upper, lowerA, lowerB, xCoord)` (`src/dimensional/connection.ts`)

Builds the Christoffel symbol Γ^λ_μν formula as a composite `ExprNode` tree. Uses a deterministic fresh-label scheme for the dummy contraction index ρ. Returns an `ExprNode` (not a number) — the result is inspectable, validatable, and passable to `evaluateNumerical()`.

---

## Numerical Module

### `parseFormula` / `FormulaParser` (`src/numerical/formula.ts`, INTERNAL)

A self-contained, dependency-free recursive-descent parser/evaluator for closed-form scalar physics expressions (`hbar*c^3/(8*pi*G*M*k_B)`) — Path B of the "use the CLI with your own equations" work. SAFE by construction: no `eval`/Function/property access, only arithmetic over numbers, a fixed function whitelist (`sqrt`/`exp`/`ln`/`sin`/…), and the constants `pi`/`tau`. Caller-supplied variables are also allowed; an unknown symbol is a `FormulaError`, never an implicit global. `parse(expr)` returns a `CompiledFormula` exposing its free `variables` and `evaluate(scope)`. It sits behind the `FormulaParser` interface. Not on the public surface; surfaced by `upt eval` / `upt derive --formula`.

### `formula-mathts.ts` / `formula-registry.ts` (Path A, INTERNAL)

The MathTS-backed `FormulaParser` (Path A) and the selector that chooses it. `formula-mathts.ts` wraps `@danielsimonjr/mathts-functions`'s assembled mathjs engine (`parse(expr).evaluate(scope)`). This module loads dynamically through the `mathts-functions.ambient.d.ts` optional-peer declaration, mirroring `mathts-engine.ts`. Free variables are the symbol nodes minus function callees minus MathTS's own built-ins. A scalar-only guard rejects non-number results, so MathTS types never leak through the seam. `formula-registry.ts` (`getFormulaParser` / `getFormulaParserKind`, mirroring `engine-registry.ts`) selects the parser. The module returns the MathTS parser when the peer is installed and passes a smoke test. Otherwise, the module falls back silently to Path B, suppressing MathTS's WASM-fallback chatter on load. The two are proven interchangeable by the shared `tests/numerical/formula-conformance.ts` suite, run against both. Their one accepted divergence: MathTS recognizes Euler's `e` as a constant. The `upt` CLI consumes the registry, with `--debug` printing the active parser.

### `formula-dimension.ts` (INTERNAL except `FormulaDimensionError`)

Dimensionally CHECKS a user's formula by transpiling its AST into UPT's own dimensional `ExprNode` and running `validate()` — unifying string→AST with AST→dimension (UPT). The private factory `createFormulaDimensionChecker` builds a `FormulaDimensionChecker`. Its `check(expr, dims)` reports homogeneity and the inferred `Dimension`, or an error message. Its `parse(expr, dims)` returns `{ expr, dimension }` or throws `FormulaDimensionError`. `builtinFormulaDimensionChecker()` builds one over the Path B AST (`parseFormulaToAst`); `loadFormulaDimensionChecker()` builds one over the MathTS AST (Path A) and throws when the peer is absent. The transpile maps AST forms to dimensional forms:

- constants → dimensionless symbols
- variables → their declared dim (`pi`/`tau`/`e` dimensionless)
- `+−*/` → `op`
- `^`/`sqrt`/`pow` → power ops (constant exponents only)
- `abs` → passthrough
- transcendentals (`exp`/`log`/`sin`/…) → the project's typed-stub pattern (dimensionless argument required → dimensionless result)

**Default-on:** `getFormulaDimensionChecker()` (`formula-registry.ts`) returns a checker whether or not the MathTS peer is installed. Both paths transpile to the same `ExprNode`; a builtin↔mathts parity test pins the agreement. `FormulaDimensionError` is exported from the package root. Surfaced in `upt derive --formula` (e.g. the pendulum reports `formula dimension: [time] ✓ matches target`; `length + gravity` is reported not homogeneous). Design in `docs/planning/Formula-Dimensional-Check-Design-Note.md`.

### `TensorEngine` interface (`src/numerical/tensor-engine.ts`)

The compute contract. Methods: `fromNested`, `toNested`, `einsum`, `matMul`, `transpose`, `reshape`, `add`, `sub`, `mul`, `scale`, `identity`, `normInf`. Optional: `dispose`, `forwardGrad`, `reverseGrad`. Both engines (`Float64ReferenceEngine` and `MathTSEngine`) run the shared parameterized conformance suite `tests/numerical/engine-conformance.ts`.

### `EngineTensor` interface (`src/numerical/tensor-engine.ts`)

Opaque rank-N tensor handle. Only exposes `shape: ReadonlyArray<number>`. The concrete backing (`Float64Array`, a MathTS tensor, etc.) is hidden from consumers.

### `EinsumSpec` (`src/numerical/tensor-engine.ts`)

The engine-agnostic einsum plan produced by `lowering.ts`. Contains `contractions` (paired indices to sum over) and `free` (surviving free axes in output order). Passed to `engine.einsum()`.

### `ForwardGradResult` / `ReverseGradResult` (`src/numerical/tensor-engine.ts`)

Return types for the AD methods. `ForwardGradResult` carries `{ value, jacobian }`; `ReverseGradResult` carries `{ value, gradient }`.

### `hasAutogradSupport(engine)` (`src/numerical/tensor-engine.ts`)

Returns `true` iff the engine implements both `forwardGrad` and `reverseGrad`. Use this before invoking AD methods to get a clear capability signal rather than a runtime `TypeError`.

### `EngineCapabilityError` (`src/numerical/tensor-engine.ts`)

Thrown when an AD method is called on an engine that does not implement it. Also thrown when `hasAutogradSupport` returns false but the caller invokes an AD method anyway.

### `Float64ReferenceEngine` (`src/numerical/float64-engine.ts`)

The zero-dependency reference implementation of `TensorEngine`. Backed by `Float64Array`. Its module header calls it a correctness baseline, not a performance target. AD implemented inline: forward mode via dual numbers (`EngineDualTensor` primal + tangent pair), reverse mode via a tape-record approach. Both modes are synchronous internally but return `Promise` for uniform consumer semantics.

### `evaluateNumerical(node, inputs, options?)` (`src/numerical/index.ts`)

The main public entry point for numerical evaluation. Validates the AST first (throws `NumericalBackendError` on failure), then lowers to engine calls via `lowerNode()`, and returns a `NumericalResult` with `value`, `dim`, `freeIndices`, and `warnings`. The optional `engine` field in `options` overrides the active engine.

### `evaluateNumericalRaw(node, inputs, options?)` (`src/numerical/index.ts`)

Like `evaluateNumerical` but returns a `NumericalRawResult` carrying a live `EngineTensor` instead of a plain JS nested array. The caller must call `.dispose()` when done. Intended for chaining workloads where materializing to JS is expensive.

### `NumericalResult` / `NumericalRawResult` (`src/numerical/index.ts`)

Return types for `evaluateNumerical` and `evaluateNumericalRaw`. Both carry `dim`, `freeIndices`, and `warnings` alongside the output value.

### `EvaluateOptions` (`src/numerical/index.ts`)

Per-call options for the `evaluateNumerical*` entry points. One field: `engine?: TensorEngine` to override the globally active engine.

### `NumericalInputs` (`src/numerical/types.ts`)

The input bundle passed to `evaluateNumerical()`. An interface whose required field `tensors: ReadonlyMap<string, NestedArray>` maps `ExprNode` symbol names to concrete numeric values. Optional fields:

- `dimension` (index dimensionality, default 4)
- `fields` (closures for `'numerical-fn'` tensor symbols)
- `grids` (`GridField` spatial data)
- `derivatives` (pre-computed derivatives)
- `coords` (coordinate values)
- `metricDerivatives` (metric Jacobian slices for `derivativeStrategy: 'supplied'`)

### `lowerNode(node, inputs, engine)` (`src/numerical/lowering.ts`)

The lowering pass. Translates an `ExprNode` tree into a sequence of `TensorEngine` calls and returns the resulting `EngineTensor`. Internal — not exported from the public surface. The five deferred-evaluator node kinds dispatch through `DEFERRED_EVALUATOR_REGISTRY` instead of hand-written switch arms. A registry-consulting default arm reads it, with compile-time exhaustiveness through `Exclude<…> → never`. The registry is not on the public surface, and is not re-exported from `src/index.ts` or `numerical/index.ts`.

### `getActiveEngine()` / `setActiveEngine(engine)` (`src/numerical/engine-registry.ts`)

Global active-engine management. `getActiveEngine()` returns a `Promise<TensorEngine>` — async to allow lazy initialization. `setActiveEngine()` is synchronous. The default engine is `MathTSEngine` when both `@danielsimonjr/mathts-tensor` and `@danielsimonjr/mathts-autograd` are installed, and `Float64ReferenceEngine` otherwise.

### `NumericalBackendError` (`src/numerical/errors.ts`)

Thrown by `evaluateNumerical()` when the AST fails validation or when the lowering pass encounters an inconsistency. Extends the base error class.

### `DuplicateCoordinateWarning` (`src/dimensional/errors.ts`, re-exported via `src/numerical/index.ts`)

A warning-severity signal (not a thrown error) emitted when the same coordinate label appears in conflicting positions in an `ExprNode`. Re-exported from `numerical/index.ts` to keep that as the single public API surface without creating a dimensional→numerical import cycle.

### `evaluateMetricInverse(gInverse, g, inputs, tolerance?, options?)` (`src/numerical/metric-inverse.ts`)

Numerically checks whether a supplied inverse/metric pair is consistent (i.e., g^{ab} g_{bc} ≈ δ^a_c). Async; returns `{ residualNorm, warning? }`, where `warning` is a violation present when ‖g⁻¹g − I‖_∞ exceeds `tolerance` (default 1e-10). Called automatically by `evaluateNumerical()` when the AST contains an identifiable metric pair.

### `evaluateBE37CovariantEikonalNumerical(inputs)` (`src/numerical/be37-covariant-eikonal.ts`)

Numerical implementation of the covariant eikonal for bridge equation BE-37 (Shapiro delay). Returns a `BE37CovariantEikonalResult`: `eikonalResidual` (the normalized null-covector residual), `shapiroDelaySec` (from GL4 null-geodesic integration), and the optional field `closedFormDelaySec`, which this evaluator does not populate. Re-exported from `src/index.ts`.

### `toGeometrized` / `fromGeometrized` / `geometrizedFactor` / `NonGeometrizableDimensionError` (`src/numerical/geometrized.ts`)

The geometrized-units (G = c = 1) boundary adapters. `geometrizedFactor(dim)` is the single conversion factor `G^M·c^(T−2M)` driven mechanically by the `Dimension` exponent vector (the dimension functor); `toGeometrized(valueSI, dim)` multiplies and `fromGeometrized` divides. A nonzero electromagnetic/thermal/molar/luminous exponent (I/Θ/N/J) throws `NonGeometrizableDimensionError`. All four are on the public API. The default GR pipeline uses SI units.

### `integrateGeodesic(inputs)` (`src/numerical/geodesic-integrator.ts`)

RK4 integrator for the geodesic equation. Accepts a `GeodesicIntegratorInputs` bundle:

- a flat-layout Christoffel-symbol closure (`christoffelFn`, returning `Float64Array(64)`)
- initial position `x0` and initial velocity `v0`
- proper-time bounds `tauStart` / `tauEnd`
- the step count `steps`
- an optional `domainMinRadius`

Returns a `GeodesicIntegratorResult` with `xFinal`, `vFinal`, and a `trajectory` of sampled positions (about 100 snapshots plus the initial point). No `TensorEngine` dependency — operates on plain JS arrays.

### `integrateGeodesicGL4(initialState, options)` (`src/numerical/gl4-integrator.ts`)

The GL4 (Gauss–Legendre 4th-order) symplectic integrator for the geodesic equation — an implicit, energy-conserving alternative to RK4 for long-time integration. Takes an initial `GL4State` and `GL4Options`, and returns `readonly GL4Snapshot[]` (`steps + 1` snapshots, each with `tau`, `x`, `p` and an optional `v`). Re-exported from the main index via `numerical/index`.

### `findPerihelion(...)` (`src/numerical/perihelion-finder.ts`)

Bisection-based finder that locates the perihelion radius along a geodesic trajectory; returns a `PerihelionResult`. Underpins the BE-52 Mercury perihelion-advance demonstration.

### `evaluateKGDispersionResidual` / `verifyKleinGordonPlaneWave` (`src/numerical/klein-gordon.ts`)

The Klein-Gordon dispersion evaluator (plane-wave sector). `evaluateKGDispersionResidual` computes the relative residual of the dispersion relation ω² = c²k² + (mc²/ℏ)²; `verifyKleinGordonPlaneWave` checks a plane-wave candidate against it. The numerical companion to the dimensional layer's `KleinGordonEquationNode` / `validateKleinGordonEquation`. Both re-exported from `src/index.ts`.

### Flat-metric layout

These metric closures use row-major `Float64Array`:

- `MetricFnFlat` (`(x) => Float64Array(16)`, defined in `curvature-lowering-helpers.ts`)
- the Painlevé–Gullstrand closures `painleveGullstrandGFn` / `painleveGullstrandGInverseFn`
- the canonical Schwarzschild fixture (`tests/fixtures/schwarzschild.ts` — `gInverseFn` → `Float64Array(16)`, `dgInverseFn` → `Float64Array(64)`, layout `flat[λ*16+μ*4+ν]`)

`MetricClosure` (`einstein-equation.ts`) and the metric closures in `killing.ts` return `number[][]`; `MetricFn` in `curvature-lowering-helpers.ts` returns a `NestedArray`. Hot-path consumers (GL4 Picard loops, perihelion finder, null-ic, BE-37 eikonal) use dim-stride indexing; the measured GL4 stage-solve speedup is recorded in `docs/architecture/v0.9.0-baseline.md`.

---

## Curvature / GR Module

The curvature subsystem spans both `dimensional/` (AST nodes + validators) and `numerical/` (evaluators). The composite AST node kinds and the `CurvatureCompositeNode<K,S>` factory are described in detail under [Curvature composite layer](#curvature-composite-layer).

### `ricci(R)` / `einstein(R, g, gInverse)` / `bianchiResidual(R)` (`src/dimensional/curvature.ts`)

Composite-node helpers. `ricci` produces the contracted R_μν = R^λ_{μλν}; `einstein` produces G_μν = R_μν − ½ R g_μν (vacuum scope); `bianchiResidual` returns `{ residual, evaluate, evaluateMax }` for the cyclic second-Bianchi-identity check. `ricci` and `einstein` return an `ExprNode` composite; `bianchiResidual`'s `residual` field is the `ExprNode`. All three are re-exported from `src/index.ts`.

### `CURVATURE_KIND_REGISTRY` / `CurvatureCompositeNode<K,S>` (`src/dimensional/curvature-composite.ts`)

The shared composite-node factory type and the kind registry for all six curvature node kinds. The `lowerCurvature` dispatcher in `lowering.ts` switches on `node.kind` and does not read the registry.

### `validateKretschmannScalar` / `KretschmannScalarNode` (`src/dimensional/curvature-invariants.ts`)

The Kretschmann scalar AST node (K = R_{ρσμν} R^{ρσμν}; scalar, dim [L⁻⁴]; declared in `ast-types.ts`) and its structural validator (in `curvature-invariants.ts`). `validateKretschmannScalar` is re-exported from `src/index.ts`.

### `validateWeylTensor` / `WeylTensorNode` (`src/dimensional/weyl-validators.ts`)

The Weyl tensor AST node (trace-free part of Riemann; declared in `ast-types.ts`) and its validator (in `weyl-validators.ts`). The validator is `@internal` — not re-exported from `src/index.ts`.

### `validateEinsteinFieldEquation` / `EinsteinFieldEquationNode` (`src/dimensional/einstein-equation.ts`)

The Einstein field-equation predicate AST node (G_μν + Λ g_μν = (8πG/c⁴) T_μν) is declared in `ast-types.ts`. Its structural validator (in `einstein-equation.ts`) checks free-index agreement, per-component dim equality [L⁻²], and symmetry agreement. `validateEinsteinFieldEquation` is re-exported from `src/index.ts`.

### `verifyKillingEquation` / `evaluateConservedCharge` (`src/numerical/killing.ts`)

The Killing-vector machinery. `verifyKillingEquation` numerically checks the Killing equation ∇_μ ξ_ν + ∇_ν ξ_μ = 0 at a point (hybrid impl — exact Christoffels + analytic metric derivatives). `checkKillingEquation` wraps it and applies `KillingEquationOptions.tolerance` to the relative residual, residual / max(max|g_μν|, 1). `evaluateConservedCharge` evaluates Q = ξ^μ p_μ along a geodesic. Options type `KillingEquationOptions`; the layout-agnostic Christoffel accessor type is `ChristoffelAccess`. Both functions re-exported from `src/index.ts`.

### `evaluateEinsteinEquationResidual(input)` (`src/numerical/einstein-equation.ts`)

Computes the scale-normalized max Einstein field-equation residual |G_μν + Λ g_μν − κ T_μν| / |g_μν| at a coordinate point. Accepts metric closures (`MetricClosure`, `Vec4`) + a stress-energy closure (`EinsteinEquationResidualInput`); returns a dimensionless relative residual. For Schwarzschild vacuum the residual is the finite-difference truncation floor; `tests/numerical/einstein-vacuum-schwarzschild.test.ts` pins it below 2.66e-10 at 13 sample points. Re-exported from `src/index.ts`.

### `computeKretschmann(...)` (`src/numerical/kretschmann.ts`)

Numerical contraction of the Kretschmann scalar. Its metric-inverse input accepts `number[][] | Float64Array` (as does `WeylInputs` in `weyl-lowering.ts`). The contraction uses an exact factored index-raising algorithm (4×4⁵ — no symmetry assumption) rather than the naive O(4⁸) = 65536-multiplication contraction. `tests/numerical/kretschmann-factored-raising.test.ts` pins it to the naive result at relative < 1e-15; `benchmarks.md` records the measured speedup. Re-exported from `src/index.ts`.

### `christoffelFnFlat` (`src/numerical/christoffel-flat.ts`)

`christoffelFnFlat(M)` returns a Schwarzschild Christoffel-symbol closure `(x, out?) => Float64Array(64)` in the flat λ-major layout, consumed by the GR evaluators. The layout-agnostic accessor type is `ChristoffelAccess` (see Killing machinery above).

---

## Core Module

### `UniversalTensor` (`src/core/tensor.ts`)

A high-level tensor facade, separate from the dimensional and numerical layers. Provides a typed wrapper around tensor data with metadata (physical scale, associated physical law). Kept for backward compatibility and as the class-export on the public surface.

### `PhysicalConstants` (`src/core/types.ts`)

A lookup object of SI physical constants: G (gravitational), c (speed of light), ℏ (reduced Planck), k_B (Boltzmann), and others. Used by bridge evaluator modules that need numerical constant values. The flat `*_SI` constants below are a separate set.

### Flat `*_SI` constants (`src/core/constants.ts`)

The canonical CODATA 2018 / SI-defined physical constants, as bare `number` values in SI units:

- `C_SI`, `G_SI`, `H_SI`, `HBAR_SI`, `K_B_SI`, `E_SI`, `ALPHA` (dimensionless), `M_P_SI`, `L_P_SI`, `T_P_SI`, `H0_SI`
- the anchors `M_SUN_SI` (solar mass), `M_E_SI` (electron mass), and `B_WIEN_SI` (Wien displacement constant)

These constants are the single source of truth for physical constants across the numerical, dimensional, and bridge layers. All re-exported from `src/index.ts`.

### Intelligent-index / regime layer (`src/core/labeled-tensor.ts`, `axes-registry.ts`, `universal-index.ts`, `cell.ts`, `flux-rules.ts`, `regime-registry.ts`, …)

The intelligent-index layer lives in `core/`. This layer has three parts: `LabeledTensor` (semantic axis labels — see `docs/architecture/intelligent-index-tutorial.md`), the axes/universal-index registries, and the `Cell`/flux-rule/regime-registry machinery. The `compose` Cell factory lives here — not to be confused with the `composeEdges` composition operator. Flux **Rule 3 (Causality) is ERROR-tier**: a reverse-arrow `BridgeCell` (coarser→finer scale) fail-atomics at `addCell` unless whitelisted. The sibling `diff/` module holds `bridgeGradient` + the bridge specs (see `docs/architecture/bridge-gradient-tutorial.md`).

**`LabeledTensor` axis order and reshape.** An explicit `axisOrder: readonly string[]` field (label keys in engine-axis order) is the authoritative label↔axis mapping, queried through `axisOf(key)`. `transpose`/`contract` can leave the engine axes in a non-sorted order. `axisOrder` records the real order; `AxisOrderError` guards a bad explicit order (an optional 4th constructor param). `mergeAxes(keys, merged)` / `splitAxis(key, parts)` add rank-changing reshape on top of this: they fuse a contiguous run of engine axes into one caller-labelled axis, and its inverse. `AxisMergeError` / `AxisSplitError` guard these two operations. All three error classes are `@public`.

---

## CLI Module

The `upt` CLI (`bin/upt.mjs` + `src/cli/`, compiled to `dist/cli/`). `bin/upt.mjs` is a 22-line shim. The shim resolves `dist/cli/main.js`, guards the not-built case, and maps the returned exit code onto `process.exitCode`, not `process.exit`. This way, piped stdout is not truncated. Only the not-built guard calls `process.exit(1)`.

### `runCli(argv, io?)` (`src/cli/main.ts`)

The verb-first dispatcher: `upt <command> [args...]`. Owns four responsibilities:

- `help`/`version`/`--version`/`-v` handling
- the no-args demo (dispatches to `explain` + `priority` with fixed demo arguments)
- the unknown-command exit-2 contract
- per-command dispatch (parse → run → map a thrown `UsageError` to exit 2 / `CliError` to exit 1)

The dispatcher never special-cases a command by name — commands are plain data registered through `registerCommand` (`command.ts`), so adding a command never touches `runCli`'s body. Every `Command.run` receives an injected `CommandCtx` (`{ args, api, out, err, write }`) rather than reaching for `process.*` itself, which is what makes commands testable in-process against the built `dist/cli/*.js`.

### `parseArgs` / `FlagSpec` (`src/cli/args.ts`)

The hand-written declarative flag parser. A single left-to-right scan, zero dependencies. Only `--`-prefixed tokens are treated as flags: attached `--flag=value`, `next`-style `--flag value`, or `none`-style boolean. Everything else — including `name=value` and `name:dim` positionals — passes through untouched and in order. An unrecognized flag throws `UsageError` (exit 2) naming the bad flag and the command.

### `Command` / `CommandCtx` / `registerCommand` / `resolveCommand` (`src/cli/command.ts`)

The command registry and contract. A `Command` is self-contained: its own `FlagSpec[]`, its own verbatim help block, and a `run(ctx)` returning a `Promise<number>` exit code. `CommandCtx.api` is `typeof cli-api` — the injected barrel — so tests can stub it while `main.ts` passes the real one.

### `UsageError` / `CliError` (`src/cli/errors.ts`)

The two exit-code-bearing error classes `runCli` maps: `UsageError` → exit 2 (malformed invocation — bad/missing/unknown flags), `CliError` → exit 1 (a well-formed invocation that failed at runtime).

### `sanitize` / `emitJson` / `JsonEnvelope` (`src/cli/output.ts`)

The `--json` envelope machinery used by all data-bearing commands. `sanitize` deep-copies a result before `JSON.stringify`. This copy step matters for genuine non-finite physics values, e.g. `Infinity` in the priority board's `anchoring` field. These values survive as the explicit strings `"Infinity"`/`"-Infinity"`/`"NaN"`, instead of silently collapsing to `null`. Functions are dropped, and `Map`s become plain objects. `emitJson` writes `{command, source?, options?, epistemics?, result}` to stdout. Errors never emit a JSON envelope. A failing invocation always prints plain text to stderr with empty stdout, `--json` or not. Zero-exit stdout is therefore always parseable.

### `resolveGraph` / `SourceName` (`src/cli/graphs.ts`)

The shared `--source=catalog|canonical|both` graph resolver: every graph-analysis command calls it once. The resolver returns the resolved `BridgeEdge[]` graph, a human-readable label for the command's banner, and the resolved `SourceName`.

### `packageVersion()` (`src/cli/version.ts`)

Reads `package.json`'s `version` field relative to its own module location. This works from both the dev checkout and the installed npm layout. It backs `upt version` / `--version` / `-v` without a build step re-stamping a generated constant.

### Per-command modules (`src/cli/commands/*.ts`)

22 commands: `atlas`, `audit`, `axes`, `candidates`, `canonical`, `confront`, `connectors`, `coverage`, `derive`, `discover`, `eval`, `evaluate`, `explain`, `ground`, `map`, `path`, `predict`, `priority`, `probe`, `recover`, `regime`, and `symbolic`. `listCommandNames()` returns this list. Each command is a self-contained `Command` that calls `registerCommand` at module load. `commands/index.ts` is the side-effect barrel that `main.ts` imports once, to register them all. `_discovery-opts.ts` is a shared (non-command) helper for `discover`'s `--max-orders`/`--anchor` option parsing. The experimental `upt probe` is Product B expression/residual search and is not a rename of `upt discover`.

### `cli-api.ts` (`src/cli-api.ts`)

Not part of `src/cli/` itself. The barrel is the seam every command reaches internals through: it re-exports everything the CLI needs from the rest of the codebase. A module move anywhere else in the tree therefore touches only this one file. `main.ts` is the single module that imports it at runtime (as `api` in every `CommandCtx`); `command.ts` and `commands/path.ts` import it only as a type. No command file imports it or any deep internal path at runtime. Several command files import TYPES from deep paths (`_discovery-opts.ts`, `derive.ts`, `discover.ts`, `map.ts`, `symbolic.ts`). Not re-exported from the package root `src/index.ts`, so it stays off the public library surface.

---

## Entry Point

### `src/index.ts`

The single public re-export surface. Every symbol in `ARCHITECTURE.md §Key Types and Entry Points` flows through here. The file is the source of truth for what is and is not part of the public API; the snapshot test `tests/api/public-surface.test.ts` enforces its stability.

`MathTSEngine` is intentionally absent from this file. The engine is available only through the `universal-physics-tensor/numerical/mathts-engine` exports subpath defined in `package.json`.

---

## Component Dependencies

```
src/index.ts
  ├── src/core/tensor.ts          (UniversalTensor)
  ├── src/core/types.ts           (PhysicalConstants)
  ├── src/core/constants.ts       (flat *_SI constants)
  ├── src/composition/index.ts    (composeEdges, BridgeEdge, calibration + tranche +
  │                                catalog-full edges, CATALOG_FULL_EDGES,
  │                                enumerateCompositions, propagateUncertainty)
  ├── src/composition/compose-surface.ts  (CompositionAliasError,
  │                                SOURCE_ALIAS_DISPOSITIONS)
  ├── src/bridges/membership.ts   (adjudicateBridgeEntry, adjudicateCatalog,
  │                                REJECTED_BRIDGE_*)
  ├── src/bridges/be36-gw170817-confrontation.ts  (confrontBE36, GW170817,
  │                                confrontBE36WithUncertainty)
  ├── src/bridges/be23-planckian-confrontation.ts (confrontBE23, PLANCKIAN_CUPRATES)
  ├── src/numerical/klein-gordon.ts  (evaluateKGDispersionResidual,
  │                                verifyKleinGordonPlaneWave)
  ├── src/bridges/index.ts        (BRIDGE_EQUATIONS, evaluateGravitationalLensing,
  │                                evaluatePerihelionPrecession, catalog types)
  │     └── src/bridges/equations/be-*.ts
  │           ├── src/dimensional/validator.ts  (ExprNode, validate, validateEquation)
  │           ├── src/dimensional/types.ts      (Dimension constants)
  │           └── src/numerical/index.ts        (evaluateNumerical — BE-37 only)
  ├── src/dimensional/validator.ts  (ExprNode, validate, validateEquation,
  │                                  validateInverseMetricPair, ValidationResult)
  ├── src/dimensional/types.ts      (Dimension, named constants)
  ├── src/dimensional/algebra.ts    (multiply, divide, power, add, subtract,
  │                                  equals, format, DimensionMismatchError)
  ├── src/dimensional/bridge-check.ts   (inferDimensionForBridge)
  ├── src/dimensional/connection.ts     (christoffel)
  ├── src/dimensional/curvature.ts      (ricci, einstein, bianchiResidual)
  ├── src/dimensional/einstein-equation.ts     (validateEinsteinFieldEquation)
  ├── src/dimensional/curvature-invariants.ts  (validateKretschmannScalar)
  ├── src/numerical/index.ts        (evaluateNumerical, evaluateNumericalRaw,
  │   ├── src/numerical/tensor-engine.ts   evaluateMetricInverse, NumericalResult,
  │   ├── src/numerical/float64-engine.ts  Float64ReferenceEngine, TensorEngine,
  │   ├── src/numerical/engine-registry.ts getActiveEngine, setActiveEngine,
  │   ├── src/numerical/lowering.ts        NumericalBackendError, hasAutogradSupport,
  │   ├── src/numerical/gl4-integrator.ts  integrateGeodesicGL4, findPerihelion)
  │   ├── src/numerical/perihelion-finder.ts
  │   ├── src/numerical/metric-inverse.ts
  │   └── src/numerical/be37-covariant-eikonal.ts
  ├── src/numerical/geodesic-integrator.ts  (integrateGeodesic)
  ├── src/numerical/killing.ts              (verifyKillingEquation, evaluateConservedCharge)
  ├── src/numerical/einstein-equation.ts    (evaluateEinsteinEquationResidual)
  └── src/numerical/kretschmann.ts          (computeKretschmann)
```

The `dimensional` module imports from `numerical` only for types, plus one dynamic import in `curvature.ts` — the lazy evaluator behind `bianchiResidual`. This dynamic import keeps the runtime graph free of a dimensional→numerical→dimensional cycle. The `numerical` module imports from `dimensional` (for `ExprNode`, `Dimension`, `validate`) and from `core` (constants). The `bridges` module imports from `dimensional`, `numerical`, `core`, `composition` and `atlas`; `composition` imports from `dimensional`, `bridges` (the wrapped catalog evaluators), `core`, `canonical`, `numerical` and `atlas`. At module level these imports form cycles (for example `bridges` ↔ `composition`). At file level, `DEPENDENCY_GRAPH.md` reports **0 runtime circular dependencies and 0 type-only circular dependencies**. For the authoritative, fully-enumerated per-file dependency graph, see `DEPENDENCY_GRAPH.md` (regenerated by `bun run docs:deps`).

---

## Curvature composite layer

UPT's curvature subsystem is a family of "first-class composite AST node"
kinds. Each kind is a member of the `ExprNode` union with its own validator and a
lowering arm. The six kinds are:

| Node                    | Validator                                         | Lowering arm (`lowering.ts`)        |
|-------------------------|---------------------------------------------------|-------------------------------------|
| `RiemannTensorNode`     | `connection-validators.ts:validateRiemannTensor`  | case `'riemann-tensor'`             |
| `RicciTensorNode`       | `curvature.ts:validateRicciTensor`                | case `'ricci-tensor'`               |
| `EinsteinTensorNode`    | `curvature.ts:validateEinsteinTensor`             | case `'einstein-tensor'`            |
| `BianchiResidualNode`   | `curvature.ts:validateBianchiResidual`            | case `'bianchi-residual'`           |
| `WeylTensorNode`        | `weyl-validators.ts:validateWeylTensor`           | case `'weyl-tensor'`                |
| `KretschmannScalarNode` | `curvature-invariants.ts:validateKretschmannScalar` | case `'kretschmann-scalar'`       |

Each node wraps an inner `RiemannTensorNode`, or builds the coordinate-basis
Riemann directly. Each node carries explicit references to the metric pair (`gLower`,
`gInverse`), used for index-raising and Christoffel/∂Γ assembly. Each node lowers by
materialising the inner Riemann through `engine.toNested`, contracting on the JS
side, and lifting back through `engine.fromNested`. The approach is "walk-directly":
no AST rewrite into a `tensor-product` einsum.

### The `CurvatureCompositeNode<K,S>` factory

The shared factory lives in **`src/dimensional/curvature-composite.ts`**.
That file defines:

- `CurvatureKind` — the discriminated union of the six `kind` strings.
- `CurvatureCompositeNode<K extends CurvatureKind, S extends object>` — the
  shared composite-node factory type. `K` discriminates the node kind; `S`
  carries the per-kind extra slots (e.g., the metric pair for Einstein, the
  trace slots for Weyl). This factory type is an intersection type, not a fixed
  three-variant shape.
- `CurvatureKindSpec` + `CURVATURE_KIND_REGISTRY` — a registry mapping each
  `CurvatureKind` to its shape and dimensional spec. Tests read it; the
  lowering does not.

All six curvature node kinds are defined as instantiations of
`CurvatureCompositeNode<K,S>`. A single `lowerCurvature` dispatcher in
`lowering.ts` handles all six kinds with a `switch` on `node.kind`. The dispatcher does
not read `CURVATURE_KIND_REGISTRY`.

---

## Verification

Generated by `repo_map.py map`.
Regenerate: `python repo_map.py map <repo> --out <dir>` · Check: `python repo_map.py check <repo> --docs docs/architecture`

| Claim | Value | Source |
|---|---|---|
| totalSourceFiles | 976 | dependency-graph.json |
| totalExports | 3533 | dependency-graph.json |
| totalTypeOnlyImports | 949 | dependency-graph.json |

**Two scopes, both correct.** The table above is **whole-repository** — `repo_map` counts
every TypeScript file git tracks, including `tests/`, `bench/`, `examples/` and `tools/`. The prose in this
document uses the **`src/` scope** produced by this repository's own generator
(`bun run docs:deps`): 392 files, 2820 exports, 1339 of them re-exports. 976 and 392 do not
contradict each other; they answer different questions. Every figure states its scope.

**Claims the gate cannot hold.** Catalog figures are properties of the physics catalog,
not of the dependency graph. These figures are: 55 bridge entries (IDs 11–65; 19
established, 33 speculative, 3 highly-speculative), 109 canonical equations, 41
composition-graph edges, and 19 real-data confrontations. They were measured by importing the built package and reading
`BRIDGE_EQUATIONS`, `CANONICAL_EQUATIONS`, `CATALOG_GRAPH` and `listConfrontations()` directly,
not taken from any metric. Re-measure the same way; `repo_map` cannot check them.
