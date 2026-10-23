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
14. [Verification](#verification)

---

## Overview

UPT follows a layered architecture. The TypeScript files under `src/` fall into thirteen modules. Each module keeps a separate responsibility. Each module section below describes the main files of the module. The generated `dependency-graph.json` lists every file of `src/` with its description and its imports.

`atlas` holds typed relations between physical models (see Atlas Module). `bridges` catalogs, evaluates, and adjudicates established equations, and confronts them against real data through the evidence-spine registry. `canonical` is the textbook L-layer registry that bridges are validated against. The registry has 109 equations, spanning a monomial L0 tier, a non-monomial L1-sum tier, and a condensed-matter domain. `composition` is the graph-lite bridge-composition layer. The layer holds the catalog graph (one typed edge for each catalog relation), the canonical-only graph, the discovery-hardening funnel, and the epistemic-grounding ledger. `INTEGRATION_MAP.md` maps the parallel implementations. `dimensional` provides the symbolic layer, including the connection and curvature AST. `numerical` provides the compute layer, including the GR integrators and evaluators. `core` holds `UniversalTensor` (the rank-6 sparse store of law, bridge and emergence cells), the flat constants, and the intelligent-index / regime layer. `diff` is the bridge-gradient layer. `relations` holds the shared relation vocabulary. `cases` holds qualified applied-case evaluators. `cli` is the typed CLI command tree behind the `bin/upt.mjs` shim. The generator names `src/index.ts` the module `entry`. That file is the public re-export surface of the package root. The generator names `src/cli-api.ts` the module `root`. That file is the barrel of the CLI.

```
┌────────────────────────────────────────────────────────────────┐
│  entry             │  src/index.ts: the public re-export       │
│                    │  surface of the package root              │
├────────────────────────────────────────────────────────────────┤
│  cli/              │  Typed CLI command tree: main / args /    │
│                    │  output / graphs + one module per         │
│                    │  command behind the bin/upt.mjs shim.     │
│                    │  Command modules reach the library        │
│                    │  through CommandCtx.api, the cli-api      │
│                    │  barrel                                   │
├────────────────────────────────────────────────────────────────┤
│  atlas/            │  Typed model-to-model relations: types /  │
│                    │  error algebra / regime / composition     │
│                    │  table / witnesses / families / export    │
│                    │  + invalid-bridge benchmark               │
├────────────────────────────────────────────────────────────────┤
│  bridges/          │  Catalog index + evaluators projected     │
│                    │  from the catalog relations +             │
│                    │  membership criterion / negative catalog  │
│                    │  + the CONFRONTATIONS evidence-spine      │
│                    │  registry (the data-confronted bridges)   │
├────────────────────────────────────────────────────────────────┤
│  canonical/        │  Canonical L-layer registry + entries +   │
│                    │  dimensional fields + normal-form hash +  │
│                    │  bridge↔canonical linkage (F4 guard) +    │
│                    │  tensor seeder (109 equations incl. the   │
│                    │  L1-sum non-monomial tier + condensed-    │
│                    │  matter domain)                           │
├────────────────────────────────────────────────────────────────┤
│  composition/      │  Quantity / BridgeEdge / composeEdges +   │
│                    │  centralized quantities + alias           │
│                    │  dispositions + enumerator + uncertainty  │
│                    │  + identifiability + retrodiction +       │
│                    │  explainQuantity + bridge-analysis +      │
│                    │  discovery + CATALOG_GRAPH + the          │
│                    │  epistemic-grounding ledger               │
├────────────────────────────────────────────────────────────────┤
│  dimensional/      │  SI types / algebra / AST / validator /   │
│                    │  metric, connection, curvature layer +    │
│                    │  Buckingham-π + dim-spec                  │
├────────────────────────────────────────────────────────────────┤
│  numerical/        │  TensorEngine / engines / lowering /      │
│                    │  RK4 + GL4 integrators / perihelion       │
│                    │  finder / Killing / Einstein / Kretschmann│
│                    │  / Klein-Gordon / formula / geometrized   │
├────────────────────────────────────────────────────────────────┤
│  cases/            │  Qualified applied-case evaluators        │
├────────────────────────────────────────────────────────────────┤
│  core/             │  UniversalTensor class + PhysicalConstants│
│                    │  + flat *_SI constants + Labeled-         │
│                    │  Tensor / Cell / regime layer             │
├────────────────────────────────────────────────────────────────┤
│  diff/             │  numerical + AST gradients + bridge       │
│                    │  specs                                    │
├────────────────────────────────────────────────────────────────┤
│  relations/        │  Shared relation vocabulary: types,       │
│                    │  composition table, regime algebra,       │
│                    │  conventions, and category                │
├────────────────────────────────────────────────────────────────┤
│  root              │  src/cli-api.ts: the CLI barrel           │
└────────────────────────────────────────────────────────────────┘
```

**Total** (`src/` scope): the generator writes the file, export and re-export counts to `docs/architecture/dependency-graph.json` (`statistics`) and to the Summary Statistics of `DEPENDENCY_GRAPH.md`. `bun run docs:deps` regenerates both. `data/bridge-catalog.json` is the record of the bridge catalog: its size, id range and status split. The test fixture `tests/fixtures/catalog-census.json` pins the census. `CANONICAL_GRAPH` has one edge for each canonical equation (109 canonical equations). The scope has 19 real-data confrontations (`DATA_CONFRONTED_IDS`). The ids are BE-11, BE-21, BE-23, BE-35, BE-36, BE-37, BE-48, BE-51, BE-52, BE-55, BE-56, BE-58, BE-59, BE-60, BE-61, BE-62, BE-63, BE-64, BE-65.

(The `src/`-scope file and export counts come from the Summary Statistics in `docs/architecture/DEPENDENCY_GRAPH.md`, which `bun run docs:deps` regenerates.)

---

## Bridge Module

### `BRIDGE_EQUATIONS` array (`src/bridges/index.ts`)

The catalog array of `BridgeEquationEntry` objects, projected from `data/bridge-catalog.json`. The JSON file records the counts, and `tests/fixtures/catalog-census.json` pins them. Each entry carries: `id`, `name`, `category` / `category_name`, `bridges` (the two bridged regimes), `status` (`established` / `speculative` / `highly-speculative` / `invalid`), and `context` (1–2 sentence summary). The entry carries `formula_latex`, `source_part`, `known_issues`, `references`, `dependencies` (ids of other bridge entries explicitly referenced), and `dimensional_signature`. The JSON file is the source of truth. This array is a projection. `evaluateRelation` evaluates a record.

### `BridgeEquationEntry` type (`src/bridges/types.ts`, re-exported by `src/bridges/index.ts`)

The shape of a single catalog entry. Carries all spec-level metadata described above. Consumers who only need catalog queries (filter by status, look up known issues) import this type and `BRIDGE_EQUATIONS`. These consumers never need to touch the dimensional or numerical layers.

### `BridgeEquationStatus` / `BridgeIssueSeverity` / `BridgeIssueFixable` / `KnownIssue` (`src/bridges/types.ts`)

String union types for the `status` field of a catalog entry and for the severity and fixability fields of a known issue. `KnownIssue` holds one recorded defect: `severity`, `description` and `fixable`. `src/bridges/index.ts` re-exports all four.

### Catalog engine (`src/bridges/catalog-load.ts`, `src/bridges/evaluators.ts`, `src/bridges/relation-eval.ts`)

`catalog-load.ts` reads `data/bridge-catalog.json` through `src/core/data-file.ts`, which checks it against `data/bridge-catalog.schema.json` at load. `BRIDGE_EVALUATORS` in `evaluators.ts` is a `ReadonlyMap<number, EvaluatorSpec>`. An `EvaluatorSpec` (`bridgeId`, `name`, `inputKeys`, `parameters`, `outputs`, `contract`, `run`) is the input contract of one catalog evaluator, projected from that file. `run` evaluates the relation expression and does not switch on a catalog id. `evaluateRelation` is the public evaluation, defined in `src/composition/evaluate-relation.ts`. `relation-eval.ts` exports `relationDomain` and `evaluateCatalogRelation`. `BRIDGE_RHS_BY_ID` in `rhs-registry.ts` is the expression tree of each primary relation. The covariant-eikonal method lives in `src/numerical/covariant-eikonal.ts`. No catalog relation calls it.

### `adjudicateBridgeEntry` / `adjudicateCatalog` (`src/bridges/membership.ts`)

The computable bridge-membership criterion has two cases. *A bridge is an edge whose endpoint quantities differ in at least one regime attribute*. *A law is an edge whose endpoints share all stated regime attributes*. For catalog entries the `bridges: [a, b]` tuple is the proxy, with the negative catalog as overlay. Returns a `BridgeVerdict` (`'bridge' | 'not-a-bridge' | 'unadjudicated'`) per entry, or a whole-catalog `CatalogAdjudicationReport`. Re-exported from `src/index.ts` directly from `membership.ts`.

### `REJECTED_BRIDGE_ADJUDICATIONS` / `REJECTED_BRIDGE_IDS` (`src/bridges/rejected.ts`)

The negative catalog — entries adjudicated NOT-A-BRIDGE with per-id reasons: BE-28, BE-29, BE-32, BE-35, BE-40. BE-42 (Hawking temperature) is adjudicated a bridge (`['gravity','quantum']`); BE-44/46/50 are contested/unadjudicated. Full disposition: `docs/architecture/v0.8.0-catalog-adjudication.md`.

### `CONFRONTATIONS` / `runConfrontation` / `listConfrontations` (`src/bridges/confrontations.ts`)

The confront / evidence-spine registry. Each confrontation is a catalog record that stores its outcome. `confrontations.ts` projects each record into a `ConfrontationEntry` (`bridgeId`, `title`, `kind`, and `run`, which returns the stored outcome). `CONFRONTATIONS` maps a catalog id to its entry. `runConfrontation(bridgeId)` runs one confrontation by id (`undefined` if unregistered). `listConfrontations()` returns every entry in file order, which is the order of the `confrontations` array of `data/bridge-catalog.json`, not id order. `DATA_CONFRONTED_IDS` (`src/bridges/confrontation-coverage.ts`) projects this registry's keyset. The count is the number of confrontation rows in `data/bridge-catalog.json`. The module also exports the rigor classification: `RigorTier` (`stringent`, `moderate` or `loose`), `CONFRONTATION_RIGOR`, `confrontationRigor` and `rigorDistribution`. Confrontations are deliberately ORTHOGONAL to the discovery funnel — this module never imports `discovery.ts`. Surfaced by `upt confront` (`src/cli/commands/confront.ts`).

### `ConfrontationOutcome` / `ObservationProvenance` / `residualInSigma` / `combineInQuadrature` (`src/bridges/observations/types.ts`)

The typed observation layer. The types describe each stored outcome. `ConfrontationOutcome` is discriminated on `kind` (`'value' | 'upper-bound' | 'consistency' | 'table'`), so each confrontation carries only the fields it can honestly populate. No confrontation carries a fabricated placeholder for a bound-only or consistency-only result. Every observation carries a mandatory `ObservationProvenance` (citation, year, ISO retrieval date, optional caveat note); the `upper-bound` arm carries an optional `caveat` field (e.g. BE-36's one-sided-pass note, surfaced in the `upt confront` summary line itself, not just the provenance). Every outcome also carries a `ConfrontationDataHandling` record. Its `preprocessing` field (`ConfrontationPreprocessing`) states what was done to the source number before the comparison. Its `independence` field (`ConfrontationIndependence`) is `no-fitted-parameter`, `shares-input` or `not-recorded`. `SourceRef` and `SourceRefs` name the repository text that supports a statement. `residualInSigma(predicted, observed, sigma)` and `combineInQuadrature(components)` (root-sum-square over named `SigmaComponent`s) are the shared statistics primitives. `consistencyComparison(outcome)` returns a `ConsistencyComparison`: the signed relative difference, kept apart from the agreement bound, and the compatibility decision.

### Catalog confrontations

Each confrontation stores a bridge's prediction and a sourced observation, and compares the two. The `independence` field of the record states whether the two share an input. The records live in `data/bridge-catalog.json` and are projected by `src/bridges/confrontations.ts`:

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

Together, be-52 (Mercury perihelion), be-51 (light deflection) and be-37 (Shapiro delay) agree with their observations within 1σ (residuals of 0.29σ, 0.67σ and 0.91σ). They are not three equal confirmations: the records of be-51 and be-37 each confront the same parameter, PPN γ.

### Other files (`src/bridges/`)

- `caller-table.ts`: a confrontation that exists only when the caller supplies a measured table and a running procedure. A refusal names the missing inputs and carries no residual.
- `carrier-sign.ts`: the one sign rule for a transport coefficient built from a carrier charge and a mobility.
- `catalog-adapter.ts`: ingests `BRIDGE_EQUATIONS` into the sparse semantic catalog as `BridgeCell` values. The adapter lists each row it cannot place in `unsubmitted`.
- `catalog-types.ts`: the record shapes of `data/bridge-catalog.json`.
- `coefficient-statement.ts`: the sign of the one-loop coefficient, read from the catalog expression.
- `evaluation-errors.ts`: the errors that one evaluation throws. An input error comes first, then the domain error (`DomainViolationError`).
- `evaluator-inputs.ts`: converts `key=value[unit]` arguments into the numeric inputs of an evaluator, through its declared parameters.
- `expr-parse.ts`: the one parser of a catalog formula. The dimensional `ExprNode` comes from the MathTS parse tree of the same string.
- `holds.ts`: reads a catalog validity condition in the MathTS grammar and compares exactly.
- `input-contract.ts`: the one check of a binding record against the declared inputs of an id. Every evaluation runs it before any domain check.
- `notices.ts`: the caveats printed beside the value of a relation.
- `sensitivity.ts`: the log-sensitivity of a stored prediction to each of its inputs. The function ranks the inputs. The result is not an uncertainty budget.
- `tensor-index.ts`: the tensor-index component of a catalog category (Part II §VI.6.1).
- `types.ts`: the catalog entry types.
- `validity.ts`: a validity domain read from one condition text, the `holds` field of a record.

---

## Composition Module

The graph-lite bridge-composition layer (`src/composition/`): bridges as typed graph edges over physical quantities, composable into multi-bridge chains. `CATALOG_GRAPH` projects every catalog relation into one `BridgeEdge`.

### `Quantity` / `RegimeAttributes` / `regimesDiffer` (`src/composition/quantity.ts`)

A `Quantity` is a graph endpoint — a physical quantity with a `Dimension` and stated regime attributes. `regimesDiffer(a, b)` is the graph-native form of the membership criterion.

### `BridgeEdge` / `EdgeConfidence` / `ValidityDomain` (`src/composition/edge.ts`)

A directed edge between two `Quantity` endpoints carrying the bridge's transfer function, confidence tier, and validity domain. `evaluateEdge` applies an edge. `edge.ts` also defines the error classes `CompositionJunctionError`, `CompositionDimensionError`, `CoefficientUnsetError`, `CompositionAliasError` and `UndefinedCompositionError`. `DomainViolationError` lives in `src/bridges/evaluation-errors.ts`. `CompositionAliasError` is thrown when a name collision between composed operands' source quantities has no recorded disposition.

### `composeEdges(...)` (`src/composition/compose.ts`)

The composition operator — chains compatible edges into a derived edge, checking junction compatibility and quantity identification (`QUANTITY_IDENTIFICATIONS`, `QuantityIdentification`) and combining confidence tiers via `minConfidence`. Note the name: `composeEdges`, **not** `compose` (`compose` in `src/core/tensor.ts` builds a `UniversalTensor`). It enforces the **namespacing gate**. Same-named source quantities across the two operands throw `CompositionAliasError` unless an `AliasDisposition` is recorded. The disposition is `'shared'` or `{renameSecond}` with an input remap. The disposition is recorded in the reviewable `SOURCE_ALIAS_DISPOSITIONS` registry (which has no entry now), or passed through `opts.aliases`.

### `consistencyRatio(...)` (`src/composition/consistency.ts`)

`consistencyRatio(a, b, inputs)` returns the domain-checked quotient `a(inputs) / b(inputs)` of two edges that share source quantities. It throws `DomainViolationError` when the validity domain of either edge rejects the inputs. When the shared quantities cancel, the quotient is a parameter-free consistency relation.

### Graph quantity nodes (`src/composition/quantities.ts`)

Every graph endpoint is a projection of `data/quantities.json` through `src/dimensional/quantity-registry.ts`. `src/core/data-file.ts` checks the file against `data/quantities.schema.json` at load. The registry refuses two rows that one folded spelling names. `quantities.ts` builds one `Quantity` object per registry row whose `graphNode` is true. Name uniqueness is pinned by `tests/composition/quantities.test.ts`.

### `enumerateCompositions(...)` (`src/composition/enumerate.ts`)

The candidate enumerator walks all ordered edge pairs and attempts composition. The enumerator returns an `EnumerationReport`. The report lists the valid `CompositionCandidate`s in `all`. Two lists split `all` against `REGISTERED_COMPOSITION_IDS`: `registered` and `novel`. The report also holds the `requiresDisposition` entries. When the caller gives a seed set, the report holds `proofTargets` and `notSubstitutable`. A dimension or junction failure is a silent non-pair: the report omits it. Each `requiresDisposition` entry (`DispositionRequired[]`) is an alias collision correctly held at the namespacing gate. `tests/composition/linkage-map.test.ts` pins the composition count of `CATALOG_GRAPH`.

### `propagateUncertainty(...)` (`src/composition/uncertainty.ts`)

First-order uncertainty propagation through a central-difference Jacobian over an edge's transfer function. This method works on composed edges for free and returns an `UncertaintyResult`. No module in `src/` calls the function. The function is a public export, exercised by `tests/atlas/path-bound.test.ts` and `tests/cli/evaluate-uncertainty-name.test.ts`.

### `classifyIdentifiability(...)` / `classifyAll(...)` / `forwardClosure(...)` (`src/composition/identifiability.ts`)

The structural identifiability classifier. The classifier takes a known-quantity-name set and a target name over an edge set. The classifier counts the target's INDEPENDENT derivations and returns an `IdentifiabilityResult` with a four-way `IdentifiabilityVerdict`:

- `under-determined` (target unreachable, with a `blockingFrontier` of upstream gaps)
- `exactly-determined` (one derivation)
- `over-determined` (≥2 derivations; the surplus are falsifiable consistency constraints)
- `given` (target in the known set)

`forwardClosure` is the monotone determinability primitive. It honors `QUANTITY_IDENTIFICATIONS` as directed name-equivalences, mirroring `composeEdges`. Derivation counting uses a target-removed closure to exclude circular self-support. The classifier is structural, not parametric — see `docs/planning/Identifiability-Classifier-Design-Note.md`. Real-graph anchor: from `{mass}`, `hawking-temperature` is over-determined (be-42 and be-42-via-rs). The two routes restate one bridge, BE-42, in two forms, so the count of independent derivations is one (`explain.ts` counts routes by catalog `beId`).

### `retrodict(...)` / `retrodictNode(...)` (`src/composition/retrodiction.ts`)

The framework's own falsification benchmark — the numerical counterpart of the identifiability classifier's `over-determined` verdict. Given ground-truth quantity values, the benchmark MASKS each over-determined node. Masking recomputes source values over the graph with every edge into that node removed. The benchmark recovers the node through each independent derivation, using the domain-checked `evaluateEdge`. The benchmark scores the relative spread of the predictions. Outcomes: `consistent` (≥2 derivations agree ≤ tolerance), `inconsistent` (disagree — a real falsification), `single`, `unrecoverable`. Returns a `RetrodictionReport` with the headline `allConsistent` gate; `classifyAll` is the feeder for the swept node set. Optional external `references` add textbook-value scoring (`referencePass`). Pass bar pre-registered (spread ≤ 1e-6) in `docs/planning/Retrodiction-Harness-Design-Note.md`. Pre-registered anchor: from `{mass: M_sun}`, `hawking-temperature` is `consistent`. Be-42 and be-42-via-rs agree to float precision. They agree by algebra, because the two routes restate one bridge, so the agreement is not an independent check. The anchor recovers the ≈ 6.17×10⁻⁸ K solar-mass value.

### `explainQuantity(...)` (`src/composition/explain.ts`)

The unified "explain this quantity" entry point — synthesizes the three inference primitives into one `QuantityExplanation`. Given a target and a known set (names, or `name → value`), the function runs three primitives. The function runs the identifiability classifier, which shows how the graph computes the target. The function runs the retrodiction harness, which shows whether the redundant derivations agree, and the recovered value when values are supplied. The function runs the dimensional Buckingham-π layer: `dimensionallyDetermines` on the known set shows whether the inputs are dimensionally sufficient, independent of the graph. The function composes these three results into a plain-language `summary`. The three primitives answer complementary questions. For example: for `hawking-temperature` from `{mass: M_sun}`, the summary reports that the quantity is over-determined (be-42, be-42-via-rs). It reports that the two routes restate one bridge and so carry no independent constraint. It reports that the value is ≈ 6.17×10⁻⁸ K. The summary also reports that mass alone is not dimensionally sufficient; the evaluator carries ℏ, c, G, k_B. Per-derivation values come from the retrodiction predictions; `extraDimensions` lets the dimensional layer test a known set richer than the graph's nodes (e.g. raw `G`, `c`). Each derivation is reported full-chain: `leafInputs` traces the immediate `sources` back through every intermediate to the leaf inputs (e.g. be-42-via-rs's last-hop source `schwarzschild-radius` traces to the `mass` leaf), with an optional `dimensionalForm` monomial in those leaves. Surfaced for non-TypeScript users by the `upt` CLI (`bin/upt.mjs`, `npm run upt -- explain <quantity> …`, or `npm run explain`).

### `bridge-analysis.ts` (INTERNAL — not on the public surface)

A meta/analysis layer, like the catalog adjudicator, that combines the dimensional engine with the graph. The layer triages the speculative bridges by *decidability against established physics*, using four signals:

- `dimensionalFreedom` (free dimensionless parameters)
- `attemptDerivation` (does the equation re-derive as a recognized monomial with a clean constant). The function returns a `status` of `derived`, `decoy`, `open`, `no-samples`, `not-a-monomial` or `coefficient-unset`. `bridgePriority` maps these to the `grounding` labels `grounded`, `empirical`, `decoy` and `open`.
- `anchoringDistance` (graph distance to the established-confidence core)
- `bridgePriority` (the composite scorecard, Tier 1–3)

Deliberately NOT re-exported from `src/index.ts`. **Explicitly a review/confrontation-priority ranking, NOT a credibility score** — the signals are orthogonal to whether a bridge is true (the docstring and `docs/research/Bridge-Priority-Scorecard.md` carry the caveat). Surfaced by `upt priority`, which `npm run bridge-priority` runs.

The module also hosts `linkageMap(edges)`, the connected-component map of the catalog graph (edges linked by shared quantities, honoring `QUANTITY_IDENTIFICATIONS`). The map has three parts. The parts are: clusters (largest first, each with its status mix, link hubs, and an `anchored` flag), the isolated tail, and the composition count. The map shows the hub-and-spoke structure of the catalog. The catalog has one dominant anchored cluster with the `mass` and `temperature` hubs, smaller clusters, and a tail of isolated edges. `upt map` surfaces the map, and `tests/composition/linkage-map.test.ts` pins the live split. This map is structural, NOT a credibility signal.

`proposeLinkCandidates(edges)` uses the map to propose candidate identifications. A candidate is every pair of quantities in DIFFERENT clusters that share a non-dimensionless dimension — the kind of link that the Hawking-temperature ≡ temperature identification is. Each candidate is tagged with `touchesCore` and `sameKind` (shared name token).

⚠ The result is a coincidence-heavy REVIEW SURFACE, NOT a list of discovered bridges. `proposeLinkCandidates(CATALOG_GRAPH)` returns a long list. Most candidates touch the anchored core, and a smaller share are also same-kind. `tests/composition/link-candidates.test.ts` pins the counts. Same-kind pairs still include coincidences (`decoherence-rate ≟ hubble-rate`) and pairs the catalog deliberately keeps distinct (`effective-mass ≠ mass`). The output is a queue for human review. One candidate looks motivated: `coarsening-length ≟ quantum-correlation-length`. It would link the isolated Model-A coarsening bridge to the Kibble–Zurek cluster. `data/bridge-catalog.json` records it as an adjudicated decoy. A coarsening length is a non-equilibrium domain size. The quantum correlation length is an equilibrium property.

Surfaced by `upt candidates`; written up in `docs/research/Linkage-Candidate-Proposals.md`; pinned by `tests/composition/link-candidates.test.ts`.

### `describeGrounding` / `CandidateGrounding` (`src/composition/grounding.ts`)

The PI-instrument epistemic-grounding ledger is a pure, annotation-only view. The view sits over a `VettedCandidate`'s (`discovery.ts`) already-computed falsifier results. `upt discover` attaches the ledger to each candidate row that it lists (not with `--derive`, which lists proposals), and `upt ground` prints the ledger for one pair.

The ledger partitions the candidate's gates into two groups:

- `passed`: a gate that ran a real comparison AND the candidate survived it — numerical-consistency, magnitude, axis-compatibility, or an `entailed` consequence match.
- `gaps`: a gate that abstained, or an unadjudicated `novel-consequence`/`inconclusive` consequence signal.

The ledger also carries two permanent honesty-ceiling fields, both fixed at `false`:

- `mechanismTested`: axis-compatibility is a regime proxy, not a mechanism test. A dedicated mechanism-proxy gate was assessed and found not buildable without fabricating coupling physics the catalog lacks.
- `dataTested`: a candidate is unconfrontable until promoted to an established bridge. Real data confrontation lives in the `upt confront` world, not candidate space.

The ledger changes no verdict, score, or funnel count. `describeGrounding(candidate, consequence?)` takes the optional signal from `src/composition/consequence.ts`'s `annotateConsequences`, the `entailed` / `novel-consequence` / `inconclusive` post-pass classifier over `deriveProposedBridges`. The function omits that signal when the consequence layer did not run.

### `compose-surface.ts` barrel

The surface barrel for the namespacing-gate symbols (`CompositionAliasError`, `SOURCE_ALIAS_DISPOSITIONS`, `AliasDisposition`, `DispositionRequired`) — keeps `src/index.ts` one-import-per-area while the implementations live in `edge.ts` / `compose.ts` / `enumerate.ts`.

### Assembled graph (`src/composition/catalog-graph.ts`)

`CATALOG_GRAPH` is every catalog relation, projected once into a `readonly BridgeEdge[]`. The edge id, the expression, the domain, and the evaluation all come from the catalog record. The CLI reads the graph through the `cli-api` barrel (`src/cli/graphs.ts`). `tests/fixtures/catalog-census.json` pins the count of edges.

---

## Canonical Module

The textbook **L-layer** registry (`src/canonical/`): the standard-physics "answer key" the catalog bridges are validated against (Π = L + B + E). **109 canonical equations** (mechanics, EM/circuits, fluids/waves, thermo, quantum/atomic, gravitation, cosmology, condensed-matter, + the L1-sum non-monomial tier), grouped into per-domain `entries/` modules.

### `CanonicalEquation` type (`src/canonical/canonical-equation.ts`)

One textbook law with its fidelity tier: L0 (dimensional), L1 (scalar-AST), or L2 (field-equation). Each equation also carries `epistemicStatus`, `freeDimensionlessGroups`, the L0 `dimensional` fields, and the F4 disambiguators `partnerBridges` / `restatesBridge`. The latter names the bridge a law literally restates, so the linkage guard can discount the trivial X≡X match.

### `CANONICAL_EQUATIONS` registry + accessors (`src/canonical/registry.ts`)

The assembled array plus the accessors `canonicalById` (over the index `CANONICAL_BY_ID`), `canonicalByDomain` and `canonicalByTarget`, and the coverage helpers `partneredBridgeIds` / `bridgesWithoutCanonicalPartner`. Most catalog bridges have no canonical partner. `seed-l-layer.ts` holds `seedCanonicalLaws`, `CANONICAL_TENSOR_CONFIG` and `canonicalToLaw`, which populate the tensor. Entry modules live in `entries/`, grouped by physics domain:

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

Nine of the ten entry modules build on the shared `_l1-build.ts` helper. `dimensional-classics.ts` has its own L0 helper. L0 fields are derived from the Buckingham engine in `dimensional-fields.ts`.

### `normalForm` / `structurallyEqual` (`src/canonical/normal-form.ts`)

The structural hash: "the same relation up to dimensionless **constants**." Numeric literals and registered constants (`ln2`, `4pi`, …) are dropped. A dimensionless symbol that is NOT a recognized constant is kept as a distinct `stub:<name>` token. A functional stub like `ln⟨e^−βW⟩` therefore does not collapse onto `ln2`.

### `canonicalResidual` (`src/canonical/residual.ts`)

The residual form of a canonical entry, `target − scalarAst`. An entry stores the right-hand side of one target, while a claim is a relation `lhs − rhs`. The structural key of a residual and of a right-hand side is never equal, so a structural search must compare residuals on both sides. Only the tests and the criterion 3 study reach the module (`test-only`).

### `classifyLinkage` / `scanLinkages` (`src/canonical/linkage.ts`)

The "validate against standard physics" engine + the **F4 circularity guard**. Each bridge↔canonical pair classifies as `restates-canonical` (a declared X≡X, NOT a discovery), `recovers` (an undeclared structural match), `dimensional-only`, or `unrelated`. `upt recover` surfaces the scan. The structural step is `classifyStructure` in `structural.ts`. `linkage.ts` calls it and then runs numerical recovery.

### Other files (`src/canonical/`)

- `structural.ts`: `classifyStructure`, the shared structural classifier. It compares the dimension, the normal-form hash and the F4 `restatesBridge` guard.
- `fixed-points.ts`: the one owner of "a constant times that one". It holds the sample points (`fixedPoint`), the ratio statistic (`constantRatio`) and `recoverMonomialPrefactor`. Each caller passes its own scheme and tolerance.
- `seed-l-layer.ts`: `seedCanonicalLaws`, `CANONICAL_TENSOR_CONFIG` and `canonicalToLaw`.

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

The record types. `RelationType`, `Regime`, `RegimeInequality` and `ApproximationBound` are aliases
of the types in `src/relations/types.ts`. `AtlasBridge` is defined in `types.ts`. `RelationType` is
`'derivation' | 'exact-equivalence' | 'restriction' | 'approximation' | 'coarse-graining' |
'analytic-continuation' | 'structural-analogy' | 'deformation-quantization'`. An
`ApproximationBound` must carry a machine `horizonHolds` (its type requires the field).
`admitApproximation` throws `MissingHorizonError` for an approximation with no bound, an empty prose `horizon` or no `horizonHolds`. A `Regime` holds a list of `RegimeInequality` (`{ group, op, bound }`), keyed
by `PiGroup.formula`.

### `composeBounds(outer, inner)` / `composeBoundPath(bounds)` (`src/atlas/error-algebra.ts`)

`composeBounds(outer: BoundPair, inner: BoundPair): BoundPair` composes two error bounds, outer
after inner: `K = outer.K * inner.K`, `delta = outer.K * inner.delta + outer.delta`.
`composeBoundPath(bounds: readonly (BoundPair | null)[]): ComposedPath` folds a path, and refuses a
path that has no Lipschitz constant except at its end (`MissingLipschitzError`).
`IDENTITY_BOUND` is `{ K: 1, delta: 0 }`.

### `regimeHolds(regime, groupValues)` (`src/relations/regime.ts`, re-exported by `src/atlas/regime.ts`)

`regimeHolds(regime: Regime, groupValues: Readonly<Record<string, number>>): RegimeCheck`. The
result is three-state: `ok` is `true`, `false` (an inequality is violated) or `'unknown'` (an
inequality has no value). An empty inequality list returns `true`, which means "nothing to check",
not "checked and held"; callers treat it as unchecked. `src/atlas/regime.ts` re-exports
`collidingRegimeGroups`, `deriveRegimeGroups`, `intersectRegimes`, `makeRegime`, `regimeOverlap` and
`uncoveredRegions` from `src/relations/regime.ts`. The atlas file defines `admitApproximation`.

### `composeRelation(first, second)` / `COMPOSITION_TABLE` (`src/relations/composition-table.ts`, re-exported by `src/atlas/composition-table.ts`)

`composeRelation(first: RelationType, second: RelationType): CompositionResult` reads the 8×8
table. A cell the table declines returns `NO_COMPOSITE_CLAIM` (`'no-composite-claim'`), never a
guess.

### `findPath(...)` / `boundPath(bridges)` (`src/atlas/path-bound.ts`)

`findPath(family: string, from: string, to: string): readonly AtlasBridge[] | null` routes between
two models through the bridges of ONE family; a route that crosses families is outside its scope.
`boundPath(bridges: readonly AtlasBridge[]): PathBoundResult` composes the relation types and the
error bounds along a route, and returns a no-claim result when the table declines. Both functions
are `@internal`. `path-bound.ts` also exports `findAtlasPath`, `enumerateAtlasRoutes` and
`enumerateRoutes`.

### `deriveEvidence(record, passingWitnessIds)` (`src/atlas/derive-evidence.ts`)

`deriveEvidence(record: EvidenceInput, passingWitnessIds: ReadonlySet<string>):
ReadonlySet<EvidenceTag>`. The second argument is required, so "no witness passed" is a written
choice (`NO_PASSING_WITNESSES`). `formally-proved` is reachable only through a reviewed `formalRef`;
a file allow-list lint forbids spelling the tag anywhere a record could set it.
`provedWithUnresolvedCounterexample` is true when the derived set contains both `formally-proved`
and `contradicted`. The predicate removes neither tag.

### `checkApplicability(input)` (`src/atlas/applicability.ts`)

`checkApplicability(input: ApplicabilityInput): readonly ApplicabilityFinding[]`. The function returns
findings, not a boolean. A `'blocking'` finding is a contradiction in the data (a dimensional
failure, opposite conventions, a literal zero divisor). A `'question'` finding is a silence (an
unguarded divisor, a convention only one side declares). `sideConditions` is required, so "none"
is written as `[]`.

### Witness runners (`src/atlas/witness-numeric.ts`, `witness-symbolic.ts`, `witness-artifact.ts`, `witness-specs.ts`)

`runNumericWitness(spec: NumericWitnessSpec): NumericWitnessRunResult` measures the error at two
resolutions and returns `checked`, `refuted` or `unresolved`. `runSymbolicWitness(spec:
SymbolicWitnessSpec, simplifier?: SymbolicSimplifier | null): Promise<SymbolicWitnessRunResult>`
asks the CAS peer whether `lhs - rhs` simplifies to zero; `null` means the peer is absent, and the
result is then `unresolved` with reason `peer-absent`. `WITNESS_REGISTRY` in `witness-specs.ts` is
the executable list. `runWitnessRegistry` runs it, and only `bun run atlas:witness-results` writes
the result to `data/atlas/witness-results.json`. Every registered witness has a negative control in
`tests/atlas/`; the coverage test in `tests/atlas/negative-controls.test.ts` compares the control
ids against `WITNESS_REGISTRY`.

### Families (`src/atlas/oscillators/`, `diffusion/`, `waves/`, `families.ts`)

Each family module holds its models and bridges. The oscillator family also holds `rejections.ts`;
the diffusion and waves families record no rejections. `ATLAS_FAMILIES` in `families.ts` lists every
family; a whole-atlas gate iterates it and never names one family. A bridge can end in a model of
another family instead of defining that model again.

### Export (`src/atlas/serialize.ts`, `export.ts`)

`toAtlasJson(family, packageVersion, witnessResults)` writes one family as versioned JSON
(`ATLAS_RECORD_SCHEMA_VERSION`). `toCombinedAtlasJson(families, packageVersion, witnessResults)` and
`toAtlasJsonLd(families, packageVersion, qudt)` write the whole atlas. Ids use the prefix
`ATLAS_ID_PREFIX` (`urn:upt:atlas:`).

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

Exported constants for named SI shapes. The rule is one owner for each shape. Geometry, time and motion: `DIMENSIONLESS`, `LENGTH`, `AREA`, `VOLUME`, `TIME`, `FREQUENCY`, `VELOCITY`, `ACCELERATION`, `WAVENUMBER` and `DIFFUSIVITY`. Mass and mechanics: `MASS`, `MASS_DENSITY`, `LINEAR_DENSITY`, `FORCE`, `MOMENTUM`, `ACTION`, `PRESSURE`, `SPRING_CONSTANT`, `VISCOSITY` and `GRAVITATIONAL_CONSTANT`. Energy and heat: `ENERGY`, `POWER`, `ENERGY_FLUX`, `TEMPERATURE`, `ENTROPY`, `THERMAL_CONDUCTIVITY` and `SPECIFIC_HEAT`. Electricity: `CHARGE`, `CAPACITANCE`, `INDUCTANCE`, `RESISTANCE`, `PERMITTIVITY`, `ELECTRIC_FIELD` and `RESISTIVITY`. `NAMED_DIMENSIONS` is the subset that `format()` prints by name. A named constant that is not a row of that table prints as exponents.

### `multiply` / `divide` / `power` / `add` / `subtract` / `equals` / `format` (`src/dimensional/algebra.ts`)

Pure functions over `Dimension` values. `add` and `subtract` throw `DimensionMismatchError` if the operand dimensions differ — this is the mechanism that makes the validator catch non-homogeneous equations. `format(dim)` returns a human-readable string like `[energy]` by matching against the `NAMED_DIMENSIONS` lookup table.

### `DimensionMismatchError` (`src/dimensional/errors.ts`, re-exported by `src/dimensional/algebra.ts`)

Thrown by `add` / `subtract` when operand dimensions disagree. Caught inside the validator and converted to a `Violation` entry rather than propagated as an uncaught exception.

### `buckinghamPi` / `dimensionallyDetermines` (`src/dimensional/buckingham.ts`)

The Buckingham-π enumerator — the principled primitive for the identifiability classifier's exactly-determined case. `buckinghamPi(variables)` builds the dimension matrix (one row for each SI base that some variable uses, up to 7, × variables). The function computes the matrix's rank and a basis of its null space through EXACT rational arithmetic. The function returns the n − r dimensionless π-groups (integer exponents) with a `BuckinghamVerdict` (`dimensionally-independent` / `single-invariant` / `multiple-invariants`). `dimensionallyDetermines(target, governing)` answers whether the target is fixed UP TO A DIMENSIONLESS CONSTANT. The answer is true if and only if the governing set is dimensionally independent and the target's dimension lies in its span. The function then returns the (possibly rational) monomial. The result types carry FORM only (no value or constant field) — the honest boundary between dimensional analysis and numerology. Pins the canonical results: pendulum T = const·√(L/g), Schwarzschild r_s = const·GM/c² (and that mass alone does NOT determine r_s — G and c are required). Throws `RationalizationError` on duplicate names, an empty set, or a non-rational exponent. Design: `docs/planning/Bridge-Inference-Epistemics-Note.md` (build target 1).

### `parseDimensionSpec` (`src/dimensional/dimension-spec.ts`, INTERNAL)

Turns a human dimension string into a `Dimension`. The string names one of four forms:

- a named dimension (`length`, `velocity`, `volume`, `pressure`, `viscosity`, `current`, …, case-insensitive)
- a fundamental constant by name (`hbar`, `c`, `G`, `k_B`, `e` — exact-case so `G` ≠ `g`)
- a product or quotient of named dimensions or constants (`power/area`, `mass/length^3`)
- explicit base exponents (`L^3.M^-1.T^-2`, fractional exponents allowed)

The last two forms share the formula grammar, which MathTS parses (`parseFormulaPNode`). The parser lets the `upt` CLI accept user-declared dimensions without TypeScript. The parser throws `DimensionSpecError` on bad input. Not on the public surface.

### Unit reader (`src/dimensional/units.ts`, `exact-scale.ts`, `unit-data.ts`)

The unit reader turns text such as `1um`, `25degC` or `3.8e-16 kg/m^3` into an SI value and a `Dimension`. `data/units.json` holds the unit table. `unit-data.ts` loads the file once and checks it against `data/units.schema.json`. `readUnitFile(text, schema)` does the check and throws on a file that the schema or the table rules reject.

A unit is a product of factors, each `symbol[^n]`, joined by `*`, `·` or a space. Everything after the first `/` is the denominator, so `W/m*K` is W/(m·K). An exact symbol wins over a prefix: `T` is the tesla and `Ts` is a terasecond. An affine temperature (`degC`, `°C`, `degF`, `°F`) is valid only alone. Rankine is proportional, not affine.

`exact-scale.ts` holds `ExactScale`. An `ExactScale` is a rational (`num` and `den` as `bigint`) times one floating factor. The floating factor holds the irrational part: π for an angle, ln 2 for a bit. Prefixes, products, quotients and integer powers multiply the rationals exactly, and `scaleToNumber` rounds once. So `g/cm^3` is 1000 with no float noise. The helpers `decimalScale`, `scaleOf`, `ratioScale`, `irrationalScale`, `multiplyScales`, `divideScales`, `powerScale` and `addScales` build and combine scales. `solidusSides` splits a unit text at its first `/`. `readScaleExpression(text, resolve)` reads the scale expressions that `data/units.json` stores.

The root `src/index.ts` exports these names:

- `parseUnit(text): ParsedUnit`. `ParsedUnit` holds `scale`, `dim` and, for a lone affine temperature, `affine` (`AffineTemperature`). The empty string is dimensionless.
- `convertValue(raw, target, temperature?): ConvertedValue`. `raw` is `<number>[unit]` and `target` is a unit expression. A bare number is already in `target`. The dimensions must agree. A text with more than one reading keeps the reading whose dimension equals the target's. When a text with more than one reading has no matching reading, or more than one, `AmbiguousUnitError` names the readings. A text with one reading whose dimension differs from the target's throws `UnitError`. A declared target cannot be affine. `temperature` is `'absolute'` (the default) or `'difference'` (`TemperatureReading`), and only an absolute reading adds the affine offset. `ConvertedValue` holds `value`, `given` and, when set, `cycles` and `affine`.
- The error classes. `UnitError` is the base class. `UnknownUnitError` (field `symbol`) means that no table row and no prefix spells the symbol. `UnitRefusedError` means that the reader recognizes the unit and refuses it. The refused units are a logarithmic or ratio unit, an ambiguous name such as `ton`, and an affine temperature inside a compound. `AmbiguousUnitError` (fields `text` and `readings`) means that the text has more than one dimensionally distinct reading.

These functions are `@internal`. `readUnit(text): UnitReading` returns the one reading of a unit text. A reading has `label`, `exact` (an `ExactScale`) and `cycles`. `cycles` is the net power of cycle-counting units: 1 for a lone `kHz`, 0 for `1/s`. `readQuantityLiteral(raw, temperature?)` reads one number with an optional unit and returns a `QuantityLiteral` in SI. The function returns `null` when the text has another form or names a unit that no row spells. The caller can then read the text as an expression. `unitDimension(unit)` gives the dimension of a declared unit. `unitRows()` and `unitTables()` expose the table. A test compares the table with MathTS, and `src/cli/record-tables.ts` fingerprints the table for the CLI record.

### `ExprNode` union (`src/dimensional/ast-types.ts`, re-exported by `validator.ts`)

The AST union type — **25 arms**. The union covers three groups of nodes. The scalar nodes are `symbol`, `op`, `integral`, `derivative`, `transcendental`, `abs`, and the distributional/variational primitives `dirac-delta` and `variational-derivative`. The tensor nodes are `tensor-symbol`, `tensor-product`, `metric-tensor`, `kronecker-delta`, `tensor-partial-derivative`, and `covariant-derivative`. The curvature and equation node kinds are `riemann-tensor`, `ricci-tensor`, `einstein-tensor`, `bianchi-residual`, `killing-vector`, `conserved-charge`, `stress-energy`, `cosmological-constant`, `einstein-equation`, `weyl-tensor`, and `kretschmann-scalar`. The `op '^'` arm also accepts an input-dependent exponent on a dimensionless base. The `symbol`, `tensor-symbol`, `metric-tensor` and `kronecker-delta` nodes carry their dimension inline; the other nodes build structure from sub-expressions.

### `validate(node)` (`src/dimensional/validator.ts`)

Walks an `ExprNode` tree, infers SI dimensions at each node, and returns a `ValidationResult`. Tracks free (uncontracted) tensor indices in a mutable `Map`. Returns `ok: false` if any error-severity violation is found.

### `validateEquation(lhs, rhs)` (`src/dimensional/validator.ts`)

Validates two `ExprNode` trees independently and checks that their inferred dimensions agree. Also checks that both sides carry the same free-index signature, so a tensor cannot equal a scalar. Returns the combined `ValidationResult`.

### `validateInverseMetricPair(gLower, gUpper)` (`src/dimensional/validator.ts`)

Opt-in structural check: given a lower/upper metric pair, returns warning-severity violations if the index structure suggests the pair is inconsistent. Not folded into `validate()` to keep the hot path lean.

### `ValidationResult` interface (`src/dimensional/validator.ts`)

Return type of `validate()`. Fields: `ok` (boolean), `inferredDimension` (`Dimension | null`), `freeIndices` (`Map<string, {upper, lower}>`), `violations` (`Violation[]`).

### `Violation` interface (`src/dimensional/validator.ts`)

A single dimensional mismatch or structural error. Fields: `location` (tree path string, e.g. `"args[1].args[0]"`), `expected`, `actual` (both `Dimension`), `note` (human-readable), `severity` (`'error' | 'warning'`, defaults to `'error'`).

### `inferDimensionForBridge` (`src/dimensional/bridge-check.ts`)

`inferDimensionForBridge(bridgeId, expr): Dimension | null`. Infers the dimension of a single hand-encoded expression. When `EXPECTED_DIMENSION_BY_BRIDGE` has an entry for the bridge id, it cross-checks the result against it. The function returns `null` when the expression is dimensionally inconsistent or fails that check. Re-exported from `src/index.ts`.

### `TensorSymbolNode` (`src/dimensional/ast-types.ts`)

AST node for a named tensor symbol with explicit index structure. The fields are `kind: 'tensor-symbol'`, `name`, `dim` and `indices` (array of `{label, variance: 'upper'|'lower'}`). `role?` (`'coordinate' | 'field' | 'constant'`, default `'field'`) is structural metadata. `numericalForm?` (`'symbolic' | 'numerical-fn' | 'grid'`, default `'symbolic'`) gives the numerical strategy when the symbol is the operand of a partial derivative.

### `TensorProductNode` (`src/dimensional/ast-types.ts`)

AST node for an Einstein-summation product. `computeContraction(args, validateChild)` in `src/dimensional/tensor.ts` implements the contraction algebra: pairs repeated indices, returns the residual free-index map and the product dimension.

### `MetricTensorNode` (`src/dimensional/ast-types.ts`)

AST node for a metric tensor g_{ab} or g^{ab}. Fields: `kind: 'metric-tensor'`, `name`, `indices` (two entries specifying upper or lower variance), `dim`, `signature` (a string, e.g. `'-,+,+,+'`; `metric-validators.ts` checks its form), `derivativeStrategy?` (`'computed' | 'zero' | 'supplied'`, default `'computed'`). In the numerical lowering of ∂g, `'computed'` and `'zero'` both treat the metric as constant (∂g = 0), and `'supplied'` reads the slices from `NumericalInputs.metricDerivatives`.

### `KroneckerDeltaNode` (`src/dimensional/ast-types.ts`)

AST node for the Kronecker delta δ^a_b. Fields: `kind: 'kronecker-delta'`, `indices` and `dim`; the validator returns `node.dim`. `validateKroneckerDelta` (`src/dimensional/metric-validators.ts`) rejects a rank other than 2, two indices of equal variance, and two equal labels (a trace).

### `TensorPartialDerivativeNode` (`src/dimensional/ast-types.ts`)

AST node for a partial derivative ∂_a T^b. Dimension is `dim(T) / dim(x^a)`.

### `CovariantDerivativeNode` (`src/dimensional/ast-types.ts`)

AST node for the covariant derivative ∇_μ T^ν. Validation delegates to `validateCovariantDerivative` (`src/dimensional/connection-validators.ts`). The validator requires `wrtIndex` to be a lower index. The validator requires `gLower` to be both-lower and `gInverse` to be both-upper. The label of `wrtIndex` must not be a free index of the operand (`MetricSignatureError`). The environment variable `UPT_ALLOW_COORD_SHADOW=1` downgrades that error to a warning. The output dimension is `of.dim / wrt.dim`.

### `christoffel(gLower, gInverse, upper, lowerA, lowerB, xCoord)` (`src/dimensional/connection.ts`)

Builds the Christoffel symbol Γ^λ_μν formula as a composite `ExprNode` tree. Uses a deterministic fresh-label scheme for the dummy contraction index ρ. Returns an `ExprNode` (not a number) — the result is inspectable, validatable, and passable to `evaluateNumerical()`.

---

## Numerical Module

### `FormulaParser` / `CompiledFormula` (`src/numerical/formula-contract.ts`, INTERNAL)

The contract of the formula parser. `FormulaParser.parse(expr)` returns a `CompiledFormula`, which exposes its free `variables` and `evaluate(scope)`. The file also holds `FormulaError`, `EulerNumberError` (the name `euler` is an error) and `callBuiltinFunction`. `SCALAR_FUNCTIONS` is the one table of scalar functions, with the arity, numeric body and dimension rule of each. The parser does not call `eval` or `Function`. `SCALAR_FUNCTIONS` supplies the documented functions, and MathTS resolves any other MathTS function that a formula names (`gamma(5)`, `zeta`). The dimension checker (`formula-dimension.ts`) refuses every node except numbers, symbols, parentheses, unary minus, `+ - * / ^` and calls (`UnsupportedSyntaxError`). An unknown symbol is a `FormulaError`, never an implicit global. Not on the public surface; surfaced by `upt eval` and `upt derive --formula`.

### `formula-mathts.ts` / `formula-registry.ts` (INTERNAL except `parsePhysics`)

`formula-mathts.ts` holds the one `FormulaParser`. It compiles a formula with MathTS (`compileExpr` from `@danielsimonjr/mathts-functions`) and exports `parseFormula(expr)` and `mathtsFormulaParser`. The MathTS packages are required dependencies, so no fallback parser exists. Free variables are the symbol nodes minus the function callees minus the MathTS names that evaluate to a number. A scalar-only guard rejects a non-number result, and a non-finite number raises `FormulaValueError`, so MathTS types never cross the seam. A bare `e` is the elementary charge: MathTS binds it with `{ physics: true, charge: 'scalar' }`. Euler's number is `exp(1)`. `parsePhysics` is the public string-to-`ExprNode` entry point (a root export). The three other functions of `formula-registry.ts` (`getFormulaParser`, `getFormulaParserKind`, `getFormulaDimensionChecker`) are INTERNAL and select nothing. `getFormulaParser` returns the MathTS parser, and `getFormulaParserKind` returns `'mathts'`. The shared conformance suite `tests/numerical/formula-conformance.ts` runs against the MathTS parser. The `upt` CLI consumes the registry, with `--debug` printing the parser name and version.

### `formula-dimension.ts` (INTERNAL except `FormulaDimensionError` and the type `ParsedPhysics`)

Dimensionally CHECKS a user's formula by transpiling its parse tree into UPT's own dimensional `ExprNode` and running `validate()` — unifying string→AST with AST→dimension (UPT). `builtinFormulaDimensionChecker()` builds a `FormulaDimensionChecker` over the MathTS parse tree (the name is historical). Its `check(expr, dims)` reports homogeneity and the inferred `Dimension`, or an error message. Its `parse(expr, dims)` returns `{ expr, dimension }` or throws `FormulaDimensionError`. `parseFormulaPNode` exposes the normalized parse node to other readers. The transpile maps parse forms to dimensional forms:

- numeric literals → dimensionless symbols
- variables → their declared dim. An undeclared `e` is `CHARGE`, an undeclared `E` is `ENERGY`, and `pi`, `tau`, `phi`, `Infinity` and `NaN` are dimensionless. Any other undeclared symbol is an error
- `+−*/` → `op`
- `^`/`sqrt`/`cbrt`/`pow` → power ops. A numeric-constant exponent gives a dimensional power. A variable exponent is legal only on a dimensionless base
- `abs` → `abs` node
- `exp`/`ln`/`log`/`log10`/`log2`/`sin`/`cos`/`tan`/`sinh`/`cosh`/`tanh` → the grammar's `transcendental` node (dimensionless argument required → dimensionless result). `asin`, `acos` and `atan` use a dimensionless stub symbol. `atan2` needs two arguments of one dimension

**Default-on:** `getFormulaDimensionChecker()` (`formula-registry.ts`) returns the checker. `FormulaDimensionError` is exported from the package root. Surfaced in `upt derive --formula` (the pendulum reports `formula dimension: [time]  ✓ homogeneous, matches target`; a formula that adds a length to a time is reported not homogeneous). Design in `docs/planning/Formula-Dimensional-Check-Design-Note.md`.

### `TensorEngine` interface (`src/numerical/tensor-engine.ts`)

The compute contract. Methods: `fromNested`, `toNested`, `einsum`, `matMul`, `transpose`, `reshape`, `add`, `sub`, `mul`, `scale`, `identity`, `normInf`. Optional: `dispose`, `forwardGrad`, `reverseGrad`. `MathTSEngine`, the one engine, runs the shared parameterized conformance suite `tests/numerical/engine-conformance.ts`.

### `EngineTensor` interface (`src/numerical/tensor-engine.ts`)

Opaque rank-N tensor handle. Only exposes `shape: ReadonlyArray<number>`. The concrete backing (`Float64Array`, a MathTS tensor, etc.) is hidden from consumers.

### `EinsumSpec` (`src/numerical/tensor-engine.ts`)

The engine-agnostic einsum plan produced by `lowering.ts`. Contains `contractions` (paired indices to sum over) and `free` (surviving free axes in output order). Passed to `engine.einsum()`.

### `ForwardGradResult` / `ReverseGradResult` (`src/numerical/tensor-engine.ts`)

Return types for the AD methods. `ForwardGradResult` carries `{ value, jacobian }`; `ReverseGradResult` carries `{ value, gradient }`.

### `hasAutogradSupport(engine)` (`src/numerical/tensor-engine.ts`)

Returns `true` iff the engine implements both `forwardGrad` and `reverseGrad`. Use this before invoking AD methods to get a clear capability signal rather than a runtime `TypeError`.

### `EngineCapabilityError` (`src/numerical/errors.ts`, re-exported by `src/numerical/tensor-engine.ts`)

Extends `NumericalBackendError`. The constructor takes the engine name and the missing capability. `MathTSEngine.forwardGrad` and `MathTSEngine.reverseGrad` throw it when `@danielsimonjr/mathts-autograd` fails to load. `bridge-ast-gradient.ts` (`src/diff/`) throws it for the same reason.

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

The lowering pass. Translates an `ExprNode` tree into a sequence of `TensorEngine` calls and returns the resulting `EngineTensor`. Internal — not exported from the public surface. The five deferred-evaluator node kinds (`killing-vector`, `conserved-charge`, `stress-energy`, `cosmological-constant`, `einstein-equation`) dispatch through `DEFERRED_EVALUATOR_REGISTRY` instead of hand-written switch arms. Each throws a `NumericalBackendError` that names the evaluator to call (`verifyKillingEquation`, `evaluateConservedCharge` or `evaluateEinsteinEquationResidual`). A registry-consulting default arm reads it, with compile-time exhaustiveness through `Exclude<…> → never`. The registry is not on the public surface, and is not re-exported from `src/index.ts` or `numerical/index.ts`.

### `getActiveEngine()` / `setActiveEngine(engine)` (`src/numerical/engine-registry.ts`)

Global active-engine management. `getActiveEngine()` returns a `Promise<TensorEngine>` — async to allow lazy initialization. `setActiveEngine()` is synchronous. The engine is `MathTSEngine` (`src/numerical/mathts-engine.ts`, reached through the `universal-physics-tensor/numerical/mathts-engine` subpath); the MathTS packages are required, so there is no absent-peer branch.

### `NumericalBackendError` (`src/numerical/errors.ts`)

Thrown by `evaluateNumerical()` when the AST fails validation or when the lowering pass encounters an inconsistency. Extends the base error class.

### `DuplicateCoordinateWarning` (`src/dimensional/errors.ts`, re-exported via `src/numerical/index.ts`)

`validateCovariantDerivative` emits this warning through `process.emitWarning` when the `wrt` label of a covariant derivative equals a free index of its operand and `UPT_ALLOW_COORD_SHADOW=1` is set. Without that variable the same case throws `MetricSignatureError`. The class is re-exported from `numerical/index.ts` to keep that as the single public API surface without creating a dimensional→numerical import cycle.

### `evaluateMetricInverse(gInverse, g, inputs, tolerance?, options?)` (`src/numerical/metric-inverse.ts`)

Numerically checks whether a supplied inverse/metric pair is consistent (i.e., g^{ab} g_{bc} ≈ δ^a_c). Async; returns `{ residualNorm, warning? }`, where `warning` is a violation present when ‖g⁻¹g − I‖_∞ exceeds `tolerance` (default 1e-10). Called automatically by `evaluateNumerical()` when the AST contains an identifiable metric pair.

### `evaluateCovariantEikonalNumerical(inputs)` (`src/numerical/covariant-eikonal.ts`)

Numerical implementation of the covariant eikonal for the Shapiro-delay relation (be-37). Takes `CovariantEikonalInputs` and returns a `CovariantEikonalResult`. The result holds `eikonalResidual` (the normalized null-covector residual) and `shapiroDelaySec` (from GL4 null-geodesic integration). The optional field `closedFormDelaySec` stays unset: this evaluator does not populate it. Re-exported from `src/index.ts`.

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

`findPerihelion(options: FindPerihelionOptions): PerihelionResult` locates the perihelion along a cached GL4 trajectory. The function finds the snapshot pair where dr/dτ changes sign from minus to plus. Then the function fits a cubic Hermite polynomial through the bracket and refines the root with Brent's method (MathTS `findRoot`). The result is `{ tau, x, phi }`. The function throws when no bracket exists.

### `evaluateKGDispersionResidual` / `verifyKleinGordonPlaneWave` (`src/numerical/klein-gordon.ts`)

The Klein-Gordon dispersion evaluator (plane-wave sector). `evaluateKGDispersionResidual` computes the relative residual of the dispersion relation ω² = c²k² + (mc²/ℏ)²; `verifyKleinGordonPlaneWave` checks a plane-wave candidate against it. The numerical companion to the dimensional layer's `KleinGordonEquationNode` / `validateKleinGordonEquation`. Both re-exported from `src/index.ts`.

### Flat-metric layout

These metric closures use row-major `Float64Array`:

- `MetricFnFlat` (`(x) => Float64Array(16)`, defined in `curvature-lowering-helpers.ts`)
- the Painlevé–Gullstrand closures `painleveGullstrandGFn` / `painleveGullstrandGInverseFn`
- the canonical Schwarzschild fixture (`tests/fixtures/schwarzschild.ts` — `schwarzschildGInverseFn` → `Float64Array(16)`, layout `flat[mu*4+nu]`; `schwarzschildDgInverseFn` → `Float64Array(64)`, layout `flat[lambda*16+mu*4+nu]`)

`MetricClosure` (`einstein-equation.ts`) and the metric closures in `killing.ts` return `number[][]`; `MetricFn` in `curvature-lowering-helpers.ts` returns a `NestedArray`. The GL4 Picard loops and the perihelion finder index with a `dim` stride. `null-ic.ts` and `covariant-eikonal.ts` index with the literal 4.

### Other files (`src/numerical/`)

- `binding-value.ts`: reads a binding value (a bare number, a number with a unit, or an expression of registered constants and unit literals).
- `connection-lowering-helpers.ts`: computes Christoffel symbols and tensor corrections from raw metric data for the covariant-derivative lowering, and does not use the `christoffel()` composite tree.
- `curvature-lowering-helpers.ts`: assembles the Riemann tensor from metric closures, in the same way.
- `derivative-lowering.ts`: the derivative arms of the lowering (`lowerTensorPartialDerivative`, `lowerCovariantDerivative`).
- `evaluator-uncertainty.ts`: first-order (GUM) uncertainty propagation through a closed-form evaluator, with pairwise correlations and a curvature check. The module is the engine behind `upt evaluate --sigma` and `--corr`.
- `finite-difference.ts`: `centralPartial`, the one central difference. The caller passes the step.
- `grid-field.ts`: the `GridField` type, a field sampled on a regular grid. The file re-exports the type from `types.ts`.
- `input-validation.ts`: `validateFiniteInputs`, a finite-and-in-range check of the input record of an evaluator.
- `lowering-utils.ts`: helpers shared by the lowering modules.
- `null-ic.ts`: `reconstructNullPr`, which reconstructs the null initial condition (the radial covector component of an inward photon).
- `null-ray-integrator.ts`: `integrateRK4`, the fixed-step RK4 for null geodesics. The function returns the last state of `rk4Trajectory`. The file exports no one-step function: the one-step `rk4Step` is in `src/atlas/oscillators/pendulum-motion.ts`.
- `painleve-gullstrand-metric.ts`: the Painlevé–Gullstrand form of the Schwarzschild metric, which is regular at the horizon.
- `pderiv.ts`: the three partial-derivative strategies (`pderivGrid`, `pderivNumericalFn`, `pderivSymbolic`) and `metricDerivSupplied`. `derivative-lowering.ts` chooses one by `numericalForm`: `'grid'` and `'numerical-fn'` use a central difference, and `'symbolic'` reads a derivative that the caller supplies in `NumericalInputs.derivatives`. `metricDerivSupplied` reads a supplied metric derivative in the same way.
- `quadrature.ts`: the 16-point Gauss–Legendre rule. Its nodes are MathTS `rootsLegendre(16)`.
- `rk4-trajectory.ts`: `rk4Trajectory`, the one fixed-step RK4. It keeps every state and takes exactly the steps asked for.
- `schwarzschild.ts`: `schwarzschildRadius(M, G, c)`.
- `spacetime-metrics.ts`: the curvature of a few exact metrics, for `upt metric`.
- `statistics.ts`: scalar statistics (`mean`, `std`, `lgamma`) read from MathTS as plain numbers.
- `strides.ts`: row-major stride and flat-index utilities.
- `weyl-lowering.ts`: the numerical Weyl tensor (n = 4) from a sampled Riemann tensor, Ricci tensor, Ricci scalar and metric pair.

---

## Curvature / GR Module

The curvature subsystem spans both `dimensional/` (AST nodes + validators) and `numerical/` (evaluators). The composite AST node kinds and the `CurvatureCompositeNode<K,S>` factory are described in detail under [Curvature composite layer](#curvature-composite-layer).

### `ricci(R)` / `einstein(R, g, gInverse)` (`src/dimensional/curvature.ts`)

Composite-node helpers. `ricci` produces the contracted R_μν = R^λ_{μλν}; `einstein` produces G_μν = R_μν − ½ R g_μν (vacuum scope). Both return an `ExprNode` composite and are re-exported from `src/index.ts`. The Bianchi validator stays in this file.

### `bianchiResidual(R)` (`src/numerical/bianchi-residual.ts`)

Returns `{ residual, evaluate, evaluateMax }` for the cyclic second-Bianchi-identity check. `residual` is the `ExprNode`. The function calls `evaluateNumerical` with a static import. `src/numerical/index.ts` does not import this file. Re-exported from `src/index.ts`.

### `CURVATURE_KIND_REGISTRY` / `CurvatureCompositeNode<K,S>` (`src/dimensional/curvature-composite.ts`)

The shared composite-node factory type and the kind registry for all six curvature node kinds. The `lowerCurvature` dispatcher in `lowering.ts` switches on `node.kind` and does not read the registry.

### `validateKretschmannScalar` / `KretschmannScalarNode` (`src/dimensional/curvature-invariants.ts`)

The Kretschmann scalar AST node (K = R_{ρσμν} R^{ρσμν}; scalar, dim [L⁻⁴]; declared in `ast-types.ts`) and its structural validator (in `curvature-invariants.ts`). `validateKretschmannScalar` is re-exported from `src/index.ts`.

### `validateWeylTensor` / `WeylTensorNode` (`src/dimensional/weyl-validators.ts`)

The Weyl tensor AST node (trace-free part of Riemann; declared in `ast-types.ts`) and its validator (in `weyl-validators.ts`). The root exports the type `WeylTensorNode`. The validator is not a root export.

### `validateEinsteinFieldEquation` / `EinsteinFieldEquationNode` (`src/dimensional/einstein-equation.ts`)

The Einstein field-equation predicate AST node (G_μν + Λ g_μν = (8πG/c⁴) T_μν) is declared in `ast-types.ts`. Its structural validator (in `einstein-equation.ts`) checks free-index agreement, per-component dim equality [L⁻²], and symmetry agreement. `validateEinsteinFieldEquation` is re-exported from `src/index.ts`.

### `verifyKillingEquation` / `evaluateConservedCharge` (`src/numerical/killing.ts`)

The Killing-vector machinery. `verifyKillingEquation` numerically checks the Killing equation ∇_μ ξ_ν + ∇_ν ξ_μ = 0 at a point (hybrid impl — exact Christoffels + analytic metric derivatives). `checkKillingEquation` wraps it and applies `KillingEquationOptions.tolerance` to the relative residual, residual / max(max|g_μν|, 1). `evaluateConservedCharge` evaluates Q = ξ^μ p_μ along a geodesic. `KillingEquationOptions` holds `tolerance`, `order`, `constantKilling` and the optional analytic metric-derivative function, and `ChristoffelAccess` is the layout-agnostic Christoffel accessor type. `src/index.ts` re-exports `verifyKillingEquation`, `checkKillingEquation`, `evaluateConservedCharge` and the types `KillingEquationOptions`, `KillingEquationCheck`, `ChristoffelAccess`, `KillingFn`, `KillingMetricFn` and `ChristoffelAtFn`.

### `evaluateEinsteinEquationResidual(input)` (`src/numerical/einstein-equation.ts`)

Computes the scale-normalized max Einstein field-equation residual |G_μν + Λ g_μν − κ T_μν| / |g_μν| at a coordinate point. Accepts metric closures (`MetricClosure`, `Vec4`) + a stress-energy closure (`EinsteinEquationResidualInput`); returns a dimensionless relative residual. For Schwarzschild vacuum the residual is the finite-difference truncation floor; `tests/numerical/einstein-vacuum-schwarzschild.test.ts` pins it below 2.66e-10 at 13 sample points. Re-exported from `src/index.ts`.

### `computeKretschmann(...)` (`src/numerical/kretschmann.ts`)

Numerical contraction of the Kretschmann scalar. Its metric-inverse input accepts `number[][] | Float64Array` (as does `WeylInputs` in `weyl-lowering.ts`). The contraction uses an exact factored index-raising algorithm (4×4⁵ — no symmetry assumption) rather than the naive O(4⁸) = 65536-term contraction (about 327 thousand multiplications). `tests/numerical/kretschmann-factored-raising.test.ts` pins it to the naive result at relative < 1e-15; `benchmarks.md` records the measured speedup. Re-exported from `src/index.ts`.

### `christoffelFnFlat` (`src/numerical/christoffel-flat.ts`)

`christoffelFnFlat(M)` returns a Schwarzschild Christoffel-symbol closure `(x, out?) => Float64Array(64)` in the flat λ-major layout. No `src/` module imports it; the test fixture `tests/fixtures/schwarzschild.ts` and the tests of the module use it. The layout-agnostic accessor type is `ChristoffelAccess` (see Killing machinery above).

---

## Core Module

### `UniversalTensor` (`src/core/tensor.ts`)

The rank-6 sparse store Π = L + B + E. It holds law, bridge and emergence cells that are indexed by regime coordinates. The constructor takes a `TensorConfig` with `rank` (3 to 6), `scales` and `forces`, and refuses an axis value that the axis registry does not name. The writers are `addLaw`, `addBridge`, `addEmergence` and `addCell`. `addCell` runs the flux rules. An ERROR-tier violation throws and leaves the tensor unchanged. The readers are `populatedCount`, `populatedCells`, `unpopulatedNeighborhoods`, `fluxDiagnostics`, `getCellContents`, `getBridgeCellContents`, `queryLaws`, `findBridges`, `getLaws`, `getBridges`, `getEmergence` and `getStats`. `compose(laws, bridges, emergences, config)` in the same file builds a `UniversalTensor` from three cell arrays and calls `addCell` for each cell.

### `PhysicalConstants` (`src/core/types.ts`)

An object that projects the flat `*_SI` constants under the keys `c`, `h`, `hbar`, `G`, `kB`, `e`, `alpha`, `lP`, `tP`, `mP` and `H0`. The root exports this object. No module under `src/` reads the object. The numerical, dimensional and bridge layers read the flat constants below.

### Flat `*_SI` constants (`src/core/constants.ts`)

Every flat physical constant, as a bare `number` in SI units. The file is the one owner of each value.

- the defined and fundamental constants: `C_SI`, `H_SI`, `HBAR_SI` (`H_SI` divided by 2π), `K_B_SI`, `E_SI`, `N_A_SI`, `FARADAY_SI`, `G_SI` and `ALPHA` (dimensionless)
- `HBAR_CODATA_DISPLAY`: the printed CODATA value of ħ, kept so the difference is computed
- the electromagnetic and radiation constants: `EPS0_SI`, `MU0_SI`, `SIGMA_SB_SI`, `B_WIEN_SI`, `R_INF_SI`, `THOMSON_CROSS_SECTION_SI`
- the Planck units and the Hubble rate: `M_P_SI`, `L_P_SI`, `T_P_SI`, `H0_SI`
- the particle masses: `M_E_SI`, `M_PROTON_SI`, `M_U_SI`
- the solar anchors: `M_SUN_SI` and `M_SUN_KG` (the same value), `GM_SUN_SI` (the IAU 2015 nominal solar gravitational parameter, not `G_SI * M_SUN_SI`) and `M_SUN_IAU_SI` (`GM_SUN_SI / G_SI`)
- the constants of condensed matter, statistics and mathematics: `VON_KLITZING_SI`, `JOSEPHSON_CONSTANT_SI`, `LORENZ_NUMBER_SI`, `BCS_GAP_RATIO`, `LANE_EMDEN_OMEGA3`, `EULER_GAMMA`

The root `src/index.ts` re-exports `C_SI`, `G_SI`, `H_SI`, `HBAR_SI`, `K_B_SI`, `E_SI`, `ALPHA`, `M_P_SI`, `L_P_SI`, `T_P_SI`, `H0_SI`, `M_SUN_SI`, `GM_SUN_SI`, `M_E_SI` and `B_WIEN_SI` from this file. It also re-exports `VON_KLITZING_SI`, `JOSEPHSON_CONSTANT_SI`, `LORENZ_NUMBER_SI`, `BCS_GAP_RATIO`, `LANE_EMDEN_OMEGA3`, `THOMSON_CROSS_SECTION_SI` and `M_PROTON_SI` by way of `src/bridges/index.ts`, and `M_SUN_KG` by way of `src/composition/index.ts`. The other constants are read through their module. `parseUnit`, `convertValue` and `UnitError` are not here: they live in `src/dimensional/units.ts`.

### Intelligent-index / regime layer (`src/core/labeled-tensor.ts`, `axes-registry.ts`, `universal-index.ts`, `cell.ts`, `flux-rules.ts`, `regime-registry.ts`, …)

The intelligent-index layer lives in `core/`. This layer has three parts: `LabeledTensor` (semantic axis labels; see `docs/architecture/intelligent-index-tutorial.md`), the axes and universal-index registries, and the `Cell`, flux-rule and regime-registry machinery. `compose` is in `tensor.ts` and is not the `composeEdges` composition operator. Flux **Rule 3 (Causality) is ERROR-tier**: a reverse-arrow `BridgeCell` (coarser to finer scale) fails atomically at `addCell`. `causalityWhitelist` in `flux-rules.ts` is private and empty. That whitelist is the only per-cell suppression of that rule. The rule is also skipped, with an `info` diagnostic, when the source or target scale of a bridge is unspecified. Rule 4 (regime consistency, WARNING tier) is installed by `regime-rule-install.ts`. The sibling `diff/` module holds `bridgeGradientNumerical`, `bridgeGradientAST` and the bridge specs (see `docs/architecture/bridge-gradient-tutorial.md`).

**`LabeledTensor` axis order and reshape.** An explicit `axisOrder: readonly string[]` field (label keys in engine-axis order) is the authoritative label↔axis mapping, queried through `axisOf(key)`. `transpose`/`contract` can leave the engine axes in a non-sorted order. `axisOrder` records the real order; `AxisOrderError` guards a bad explicit order (an optional 4th constructor param). `mergeAxes(keys, merged)` / `splitAxis(key, parts)` add rank-changing reshape on top of this: they fuse a contiguous run of engine axes into one caller-labelled axis, and its inverse. `AxisMergeError` / `AxisSplitError` guard these two operations. All three error classes are `@public`.

### Other files (`src/core/`)

- `assignment.ts`: `splitAssignment`, the one split of a `name=value` token on its first `=`. Each caller keeps its own error class.
- `compare.ts`: the one owner of relative comparison (`relDiff`, `symmetricRelDiff`, `withinRel`, `withinMixed`, `withinSymmetric`) and of codepoint order (`compareCodepoint`, `byKey`). Each caller passes its own tolerance.
- `data-file.ts`: reads the packaged `data/` files and checks each one against its schema when it loads (`units.json` against `units.schema.json`). Two modules that read one file share one parse.
- `format.ts`: the printed forms of a number (`formatQuantity`, `formatExact`, `formatPercent`).
- `hash.ts`: `sha256Hex`, the one SHA-256 digest.
- `json-schema.ts`: the reader for the subset of JSON Schema keywords that the data schemas use (`schemaProblems`). A keyword outside the subset is an error in the schema.
- `mathts-read.ts`: `numberFrom`, `bigintFrom` and `numberMatrixFrom`, the typed readers of MathTS results. Each reader throws a `TypeError` that names the MathTS function.
- `regime-rule-install.ts`: installs the body of Rule 4 (regime consistency, WARNING tier) into the flux-rule registry when the module loads.
- `regimes-builtins.ts`: registers the built-in regime values of `types.ts` under their axes when the module loads. A second load changes nothing.

---

## CLI Module

The `upt` CLI (`bin/upt.mjs` + `src/cli/`, compiled to `dist/cli/`). `bin/upt.mjs` is a thin shim. The shim resolves `dist/cli/main.js`, guards the not-built case, and maps the code that `runCli` returns onto `process.exitCode`, not `process.exit`. This way, piped stdout is not truncated. The shim calls `process.exit` in two cases. The first case is a failed load of `dist/cli/main.js`, usually a missing build (exit 1). The second case is a reader that closed the pipe (`EPIPE`, exit 0). An error that `runCli` rethrows is a defect. The shim passes it to `reportInternalError` (`main.ts`), which prints `upt: internal error: <message>` and returns exit 70.

### `runCli(argv, io?)` (`src/cli/main.ts`)

The verb-first dispatcher: `upt <command> [args...]`. `runCli` returns an exit code and does not call `process.exit`. It owns these responsibilities:

- the global options before the command: `--json` (moved onto the command, whose own flag spec parses it) and one of `--record=FILE`, `--replay=FILE` and `--show-record=FILE` (`record.ts`)
- `help`, `help <command>`, `help statuses`, `<command> --help` and `<command> -h`, and `version`/`--version`/`-v`
- the no-args demo (dispatches to `explain` + `priority` with fixed demo arguments)
- the unknown-command exit-2 contract
- per-command dispatch (parse → run → map a thrown `UsageError` to exit 2 / `CliError` to exit 1; any other error is rethrown)


The dispatcher special-cases no registered command by name, except in the no-argument demo, which resolves `explain` and `priority`. `help` and `version` are dispatch verbs, not registered commands. Commands are plain data registered through `registerCommand` (`command.ts`), so adding a command never touches `runCli`'s body. Every `Command.run` receives an injected `CommandCtx` (`{ args, api, out, err, write }`) rather than reaching for `process.*` itself, which is what makes commands testable in-process against the built `dist/cli/*.js`.

### `parseArgs` / `FlagSpec` (`src/cli/args.ts`)

The hand-written declarative flag parser: a single left-to-right scan with zero dependencies. Only `--`-prefixed tokens are flags. A bare `--` ends the options, and every later token is a positional. The `valueStyle` of a `FlagSpec` is `attached` (`--flag=value`), `next` (`--flag value`), `either`, or `none` (boolean). A flag that is given twice is a usage error, unless its spec sets `repeatable`. Every other token, including `name=value` and `name:dim`, passes through to `positionals` untouched and in order. `Command.positionals` declares how many positionals the command reads (none by default). A token past that count is a usage error. An unrecognized flag throws `UsageError` (exit 2) that names the flag and the command. `optionTokens` returns the tokens before a bare `--`, so a `--help` after it is not read as a help request.

### `Command` / `CommandCtx` / `registerCommand` / `resolveCommand` (`src/cli/command.ts`)

The command registry and contract. A `Command` is self-contained. Its fields are `name` and `aliases`, its own `FlagSpec[]`, an optional `positionals` count, and a `run(ctx)` that returns a `Promise<number>` exit code. The command also has its own verbatim help block. `commandHelp(prose, flags)` in `flag-help.ts` builds the help block, so the Flags section lists the flags that the parser accepts. `summary`, `example`, `group` and `subcommands` feed `docs/CLI.md`. `CommandCtx.api` is `typeof cli-api` — the injected barrel — so tests can stub it while `main.ts` passes the real one. `listCommandNames()` returns the sorted primary names of the registered commands.

### `UsageError` / `CliError` (`src/cli/errors.ts`)

The exit-code-bearing errors. `UsageError` → exit 2 (malformed invocation — bad, missing or unknown flags, unparseable expression syntax, a binding with no `=`). `CliError` → exit 1 (a well-formed invocation that failed at runtime, including a non-numeric `upt eval` or `upt evaluate` binding value). `EXIT_CHECK_FAILED` (3) is returned, not thrown. The command ran, and its check came out negative. These cases give exit 3:

- a dimension mismatch
- a formula that differs from the canonical one
- a regime or horizon violated on a path, or an inadequate adequacy or observation verdict (`path`)
- a `regime` record whose condition fails
- a witness that `--run` refutes (`atlas`, `map`)
- a derive result that is not a unique monomial
- a `map` or `derive` target whose dimension depends on an unresolved name

An unknown command is exit 2. A defect is exit 70.

### `sanitize` / `emitJson` / `JsonEnvelope` (`src/cli/output.ts`)

The `--json` envelope machinery used by the data-bearing commands. `sanitize` deep-copies a result before `JSON.stringify`. This copy step matters for genuine non-finite physics values, e.g. `Infinity` in the priority board's `anchoring` field. These values survive as the explicit strings `"Infinity"`/`"-Infinity"`/`"NaN"`, instead of silently collapsing to `null`. A function is dropped from an object and becomes `null` in an array, and `Map`s become plain objects. `JsonEnvelope` requires `command` and `result`. The envelope can also hold `source`, `anchor` (an `AnchorScope`), `options` and `epistemics`, and `confront` and `recover` add fields of their own. `emitJson` writes the envelope to stdout and adds `definitions`: the meaning of each status the command can print, from `statuses.ts`. A command that is not `evaluate` prints a refusal as plain text on stderr. `upt evaluate --json` writes a refusal as `{command, error: {kind, exitCode, message}}` on stdout through `emitJsonError`, and returns exit 2 for a usage error or exit 1 for a value refusal.

### `resolveGraph` / `SourceName` (`src/cli/graphs.ts`)

The shared `--source=catalog|canonical|both` graph resolver. Ten commands take `--source` (`audit`, `candidates`, `connectors`, `discover`, `explain`, `ground`, `map`, `predict`, `priority`, `probe`), and each one calls it. `ground` calls it again for the other sources. The resolver returns the resolved `BridgeEdge[]` graph, a human-readable label for the command's banner, and the resolved `SourceName`. The same file defines `AnchorScope` (what a result is anchored to), `groundTruthAnchor` and `coreAnchor`, and the line printers `groundTruthLine` and `coreLine`.

### `packageVersion()` (`src/cli/version.ts`)

`packageVersion()` reads the `version` field of `package.json` relative to its own module location. This works from both the dev checkout and the installed npm layout. It backs `upt version` / `--version` / `-v` without a build step re-stamping a generated constant. `peerVersions()` returns the installed version of each MathTS dependency and optional peer (`null` when absent). `formulaParserLabel(kind)` names the active formula parser with its version. The experiment record stores both, so a replay can see a parser change.

### Per-command modules (`src/cli/commands/*.ts`)

28 commands exist. The first group is `atlas`, `audit`, `axes`, `candidates`, `canonical`, `chain`, `confront`, `connectors`, `coverage` and `derive`. The second group is `discover`, `eval`, `evaluate`, `explain`, `frontier`, `ground`, `map`, `metric`, `path` and `predict`. The third group is `priority`, `probe`, `recover`, `regime`, `retrieve`, `search`, `symbolic` and `testplan`. `listCommandNames()` returns these names. Each command is a self-contained `Command` that calls `registerCommand` at module load. `commands/index.ts` is the side-effect barrel that `main.ts` imports once, to register them all. `upt chain` is registered so that its name is not unknown. `upt help` leaves it off the list, and the command names the chain orchestrator and does not run it. `frontier` prints the null results and the frontier connections as two lists apart. `metric` (alias `curvature`) prints Christoffel symbols and curvature scalars for a named metric. `retrieve` searches the atlas by structure and can ask a local Ollama model for a proposal order. `search` finds a law, model, bridge or quantity by words. `testplan` prints the measurement plan that a case or a confrontation stores. Three files in `commands/` are helpers, not commands. `_discovery-opts.ts` parses `--max-orders` and `--anchor` for `discover`, `ground` and `map --proposed`. `_atlas-map.ts` draws the focused atlas maps of `map --route` and `map --family`. `_atlas-route.ts` finds the atlas route between two models and what composing it yields, for `path` and `map --route`. The experimental `upt probe` is Product B expression/residual search and is not a rename of `upt discover`.

### `cli-api.ts` (`src/cli-api.ts`)

Not part of `src/cli/` itself. The barrel is the seam every command reaches internals through: it re-exports what the CLI needs from the rest of the codebase. A module move anywhere else in the tree therefore touches this file. It also touches the thirteen support modules that import library values and the eight command files that import types from deep paths (listed below). `main.ts` imports it as a value (`api`) and injects it into every `CommandCtx`. No command file imports it as a value. `command.ts`, `record.ts`, and the command files `confront.ts`, `evaluate.ts`, `map.ts`, `metric.ts`, `path.ts`, `_atlas-map.ts` and `_atlas-route.ts` import it for types only. A command file imports no library value of its own: it reaches one through `ctx.api` or through a support module. Thirteen support modules import library values directly: `bindings`, `closed-form-range`, `conventions`, `eval-numbers`, `expr-print`, `library-defaults`, `map-evidence`, `numeric-flag`, `published-url`, `record`, `record-reach`, `record-tables` and `version`. Eight command files import types from deep paths: `_atlas-map.ts`, `_discovery-opts.ts`, `derive.ts`, `discover.ts`, `eval.ts`, `symbolic.ts`, `testplan.ts` and `map.ts` (one inline type). The barrel is not re-exported from the package root `src/index.ts`, so it stays off the public library surface.

### Other files (`src/cli/`)

- `bindings.ts`: the one reader of the `name=value` tokens of `eval`, `explain`, `evaluate` (and its `--sigma`), `metric`, and the `--at` flag of `regime` and `path`. The `--anchor` flag splits its `k=v` pairs through `splitAssignment` in `_discovery-opts.ts`. A token with no `=`, or an empty name, is a usage error (exit 2). A name that is given twice is a value refusal (exit 1).
- `closed-form-range.ts`: the range of `BE-` ids that `upt evaluate` prints, read from the evaluator registry.
- `conventions.ts`: the convention lines that a comparison prints. A difference inside a convention group is not a failed check.
- `determination.ts`: the one exit decision for a result that the user asked to have determined (`derive` and `map`). See `EXIT_CHECK_FAILED`.
- `euler-guard.ts`: tags an error of the formula parser with the name of the active parser.
- `eval-numbers.ts`: the numbers that `upt eval` reads: a bare numeral, a numeral with a unit, and the CODATA names. A bare `e` is the elementary charge.
- `expr-print.ts`: the three printed forms of a scalar composed AST: display, eval and LaTeX.
- `flag-help.ts`: renders flag text for `upt help` and for `docs/CLI.md` from the `FlagSpec` objects that the parser reads. It holds `commandHelp`, `JSON_FLAG` and `GLOBAL_FLAGS`.
- `library-defaults.ts`: the defaults and limits that a flag's help prints, read from the library constants that hold them.
- `map-evidence.ts`: the catalog evidence for `upt map`.
- `numeric-flag.ts`: `integerFlag` and `realFlag`, the one grammar of a numeric flag value.
- `published-url.ts`: a path in this repository as a GitHub blob URL, for command text that tells the reader where a record lives.
- `record.ts`: experiment record and replay (`--record`, `--replay`, `--show-record`). A record is JSON Lines with one entry per invocation. Replay keeps three outcomes apart: reproduced, differs, and not replayable.
- `record-reach.ts`: the static attribution of a record: which constants the code of a command can reach. The attribution is an upper bound, derived from the import graph.
- `record-tables.ts`: the constant tables that a record fingerprints, each under its own name.
- `search-index.ts`: the word index behind `upt search` and the NOT COVERED answer of `upt explain`.
- `statuses.ts`: the status words that the CLI prints, defined once. `upt help statuses` prints the table.
- `stored-results.ts`: the path of the committed witness-results artifact that `--stored` reads and a record hashes.
- `top-level-help.ts`: renders `upt help` from the registered commands' own help.

---

## Entry Point

### `src/index.ts`

The root API. Every symbol in `ARCHITECTURE.md §Key Types and Entry Points` flows through here. The file is the source of truth for what is and is not part of the root API; the snapshot test `tests/api/public-surface.test.ts` enforces its stability. The public atlas names reach the root as `export * as atlas from './atlas/public.js'`.

The `exports` map of `package.json` names four entries: `.` (`dist/index.js`), `./numerical/mathts-engine` (`dist/numerical/mathts-engine.js`), `./probe` (`dist/composition/probe/index.js`) and `./atlas` (`dist/atlas/index.js`). `MathTSEngine` is intentionally absent from `src/index.ts`. The engine is available only through the `./numerical/mathts-engine` subpath. The `bin` entry `upt` is `bin/upt.mjs`.

---

## Component Dependencies

```
src/index.ts
  ├── src/core/tensor.ts          (UniversalTensor)
  ├── src/core/types.ts           (PhysicalConstants)
  ├── src/core/constants.ts       (flat *_SI constants)
  ├── src/composition/index.ts    (composeEdges, BridgeEdge, CATALOG_GRAPH,
  │                                evaluateRelation, enumerateCompositions,
  │                                propagateUncertainty)
  ├── src/composition/compose-surface.ts  (CompositionAliasError,
  │                                SOURCE_ALIAS_DISPOSITIONS)
  ├── src/bridges/membership.ts   (adjudicateBridgeEntry, adjudicateCatalog)
  ├── src/bridges/confrontations.ts (CONFRONTATIONS, runConfrontation)
  ├── src/numerical/klein-gordon.ts  (evaluateKGDispersionResidual,
  │                                verifyKleinGordonPlaneWave)
  ├── src/bridges/index.ts        (BRIDGE_EQUATIONS, catalog types)
  │     └── src/bridges/catalog-load.ts  (data/bridge-catalog.json)
  ├── src/bridges/evaluators.ts   (types EvaluatorSpec, EvaluatorParameter,
  │                                ParameterAlternate, GeometryRole)
  ├── src/dimensional/validator.ts  (ExprNode, validate, validateEquation,
  │                                  validateInverseMetricPair, ValidationResult)
  ├── src/dimensional/types.ts      (Dimension, named constants)
  ├── src/dimensional/algebra.ts    (multiply, divide, power, add, subtract,
  │                                  equals, format, DimensionMismatchError)
  ├── src/dimensional/bridge-check.ts   (inferDimensionForBridge)
  ├── src/dimensional/connection.ts     (christoffel)
  ├── src/dimensional/curvature.ts      (ricci, einstein, Bianchi validator)
  ├── src/dimensional/einstein-equation.ts     (validateEinsteinFieldEquation)
  ├── src/dimensional/curvature-invariants.ts  (validateKretschmannScalar)
  ├── src/numerical/index.ts        (evaluateNumerical, evaluateNumericalRaw,
  │   ├── src/numerical/tensor-engine.ts   evaluateMetricInverse, getActiveEngine,
  │   ├── src/numerical/engine-registry.ts setActiveEngine, NumericalBackendError,
  │   ├── src/numerical/lowering.ts        EngineCapabilityError, hasAutogradSupport,
  │   ├── src/numerical/gl4-integrator.ts  integrateGeodesicGL4, findPerihelion,
  │   ├── src/numerical/perihelion-finder.ts evaluateCovariantEikonalNumerical,
  │   ├── src/numerical/metric-inverse.ts  NumericalResult, TensorEngine)
  │   └── src/numerical/covariant-eikonal.ts
  ├── src/numerical/geodesic-integrator.ts  (integrateGeodesic)
  ├── src/numerical/killing.ts              (verifyKillingEquation, evaluateConservedCharge)
  ├── src/numerical/einstein-equation.ts    (evaluateEinsteinEquationResidual)
  ├── src/numerical/kretschmann.ts          (computeKretschmann)
  └── src/numerical/bianchi-residual.ts     (bianchiResidual)
```

The tree lists the modules that `src/index.ts` reads and the files that `src/numerical/index.ts` reads. The tree does not list every module. `src/dimensional/` imports `src/numerical/` once: `dimension-spec.ts` reads `parseFormulaPNode` from `src/numerical/formula-dimension.ts`. `bianchiResidual` lives in `src/numerical/bianchi-residual.ts` and imports `evaluateNumerical` from `src/numerical/index.ts`. The `numerical` module imports from `dimensional` (for `ExprNode`, `Dimension`, `validate`) and from `core` (the constants, `mathts-read.ts`, `assignment.ts` and `compare.ts`). `core` imports `UPTError` from `src/dimensional/errors.ts` and the types of `src/numerical/tensor-engine.ts`. The `bridges` module imports from `dimensional`, `numerical`, `core`, and (types only) `relations`. `composition` imports from `dimensional`, `bridges` (the wrapped catalog evaluators), `core`, `canonical`, `numerical`, `cases`, and `relations`. `canonical` imports from `dimensional`, `bridges`, `composition`, `core`, `numerical`, and (types only) `relations`. At module level `composition` and `canonical` import each other. `atlas` imports from `bridges`, `canonical`, `composition`, `core`, `dimensional`, `numerical` and `relations`. `cases` imports from `bridges`, `core`, `dimensional` and `numerical`. `diff` imports from `bridges`, `dimensional` and `numerical`. `relations` imports from `core` and `dimensional`. `cli` reaches the library through `src/cli-api.ts` and through the support modules that the CLI Module lists. At file level, `DEPENDENCY_GRAPH.md` reports **0 runtime circular dependencies and 0 type-only circular dependencies**. For the authoritative, fully-enumerated per-file dependency graph, see `DEPENDENCY_GRAPH.md` (regenerated by `bun run docs:deps`).

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

The node types are defined in `src/dimensional/ast-types.ts`. The slots differ by kind.
`RiemannTensorNode` carries `upperIndex`, `lowerIndices`, the metric pair `gLower` and `gInverse`,
and the coordinate symbol `xCoord`. `RicciTensorNode` and `BianchiResidualNode` carry one `riemann`
slot. `EinsteinTensorNode` carries `riemann`, `gLower` and `gInverse`. `KretschmannScalarNode`
carries `riemann` and one `metric`. `WeylTensorNode` carries `metric`, `upperIndex`, `lowerIndices`
and `componentDim`, and has no `riemann` slot. The lowering walks the node directly: there is no AST
rewrite into a `tensor-product` einsum. The Ricci arm lowers the embedded Riemann tensor, converts
it with `engine.toNested`, contracts on the JS side, and lifts the result with `engine.fromNested`.
The Einstein arm builds on the Ricci result. The Bianchi, Weyl and Kretschmann arms call
`lowerBianchiResidual`, `lowerWeylTensor` and `lowerKretschmannScalar` in
`src/numerical/curvature-lowering-helpers.ts`. Those three read coordinate-dependent metric closures
from `inputs.fields`. The Bianchi helper looks them up by the names of the `gLower` and `gInverse`
slots of the Riemann node. The Weyl and Kretschmann helpers look them up by the metric name and
`<name>_inv`. Each helper assembles the Christoffel symbols and the Riemann tensor from the
closures, and does not lower an inner Riemann node.

### The `CurvatureCompositeNode<K,S>` factory

The shared factory lives in **`src/dimensional/curvature-composite.ts`**.
That file defines:

- `CurvatureKind` — the discriminated union of the six `kind` strings.
- `CurvatureCompositeNode<K extends CurvatureKind, S extends object>` — the shared composite-node type `{ readonly kind: K } & S`. `K` discriminates the node kind. `S` carries the extra slots of the kind (for example, the metric pair for Einstein).
- `CURVATURE_KIND_REGISTRY` — a registry that maps each `CurvatureKind` to its `freeIndicesShape` and `componentDim`. The type of its values, `CurvatureKindSpec`, is not exported. Tests read the registry; the lowering does not.

The package root exports the types `CurvatureCompositeNode` and `CurvatureKind`.

All six curvature node kinds are instantiations of `CurvatureCompositeNode<K,S>`. A single
`lowerCurvature` dispatcher in `src/numerical/lowering.ts` handles all six kinds with a `switch` on
`node.kind`. The dispatcher does not read `CURVATURE_KIND_REGISTRY`.

---

## Verification

Regenerate: `repo-tools map <repo> --out=<dir>` · Check: `repo-tools check <repo> --docs=docs/architecture`

| Claim | Value | Source |
|---|---|---|
| totalSourceFiles | 1150 | `dependency-graph.json` `statistics.totalSourceFiles` |
| runtimeCircularDeps | 0 | `dependency-graph.json` `statistics.runtimeCircularDeps` |
| typeOnlyCircularDeps | 0 | `dependency-graph.json` `statistics.typeOnlyCircularDeps` |

The three claims cover the whole repository, tests and tools included. `repo-tools map` uses this scope by default. The project generator `bun run docs:deps` reads `src/` only. `DEPENDENCY_GRAPH.md` holds its counts. The `dependency-graph.json` in the Source column is the output of `repo-tools map`. The committed `docs/architecture/dependency-graph.json` is a different file, which `bun run docs:deps` writes for `src/`.

**Claims the gate cannot hold.** The component sections describe the source files that the text names, and the gate does not read them. The signatures, the import lists and the file roles come from reading those files. The parallel-implementation reading is `INTEGRATION_MAP.md`.
