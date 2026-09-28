# Universal Physics Tensor — System Architecture

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Module Organization](#module-organization)
4. [Key Types and Entry Points](#key-types-and-entry-points)
5. [TensorEngine Architecture](#tensorengine-architecture)
6. [Bridge Catalog Architecture](#bridge-catalog-architecture)
7. [Validation Pipeline](#validation-pipeline)
8. [Automatic Differentiation Architecture](#automatic-differentiation-architecture)
9. [Key Design Decisions](#key-design-decisions)
10. [Testing Strategy](#testing-strategy)

---

## System Overview

UPT is a TypeScript library for computational physics organized around two concerns:

- **symbolic dimensional analysis** (checking that physics equations are dimensionally consistent);
- **numerical tensor evaluation** (actually computing their values).

These concerns share a common AST — the `ExprNode` union — which serves as the lingua franca between bridge-equation authors, the validator, and the numerical backend. `ExprNode` is the single **semantic IR**. Either front-end parses physics text: the optional MathTS expression parser or the built-in one. Each front-end is adapted to a small normalized parse node and transpiled **once** to `ExprNode` (`parsePhysics`, in `numerical/formula-registry.ts`). Validation, numerical evaluation (`expr-eval`), autodiff, and composition then all operate on `ExprNode`. The parse-trees are transient.

A **general-relativity layer** sits on top of these two concerns:

- the connection layer (Christoffel builder, covariant derivative);
- the curvature layer (Riemann/Ricci/Einstein/Bianchi composite nodes, the GL4 symplectic integrator, the perihelion finder);
- the Killing/Einstein-equation/curvature-invariant layer (Killing-vector machinery, the `EinsteinFieldEquationNode` predicate + numerical residual evaluator, Weyl and Kretschmann).

All of these reuse the same `ExprNode` AST and `TensorEngine` backend — they add node kinds and evaluator modules, not parallel infrastructure.

A **composition layer** sits beside the catalog. `src/composition/` is a graph-lite `Quantity`/`BridgeEdge`/`composeEdges` layer with pre-registered calibration edges, including the first diagonal-law edge. The first derived result of the layer (CT-1) chains BE-42∘BE-16 to E_min(M) = ℏc³ln2/(8πGM). Catalog membership is computable: `src/bridges/membership.ts` is the criterion, `src/bridges/rejected.ts` is the negative catalog (NOT-A-BRIDGE entries), and `src/bridges/be36-gw170817-confrontation.ts` is a real-data confrontation. A generated JSON catalog artifact (`data/bridge-catalog.json`, `npm run catalog:json`) and a GitHub Actions CI workflow (`.github/workflows/ci.yml`) complete the tooling.

Three subsystems build on this foundation. First, the **evidence spine**: the **`upt confront`** subsystem holds **19 data-confronted bridges**. The subsystem is `src/bridges/confrontations.ts` + per-bridge `be*-confrontation.ts` modules, with a typed `ConfrontationOutcome` discriminated on `value`/`upper-bound`/`consistency`/`table`. The BE-36 confrontation carries a one-sided caveat.

Second, **discovery-hardening**:

- an adjudication ledger recording prior human review of candidates;
- an axis-compatibility falsifier (`'axis-clash'` verdict);
- consequence-propagation annotation (`src/composition/consequence.ts`) that labels a promising candidate `entailed`/`novel-consequence`/`inconclusive` against the canonical registry.

Third, the **canonical L-layer**: 107 equations, including a condensed-matter domain and the non-monomial "L1-sum" tier. The "L1-sum" tier:

- Bernoulli;
- radioactive decay;
- the photoelectric equation;
- Carnot efficiency;
- the Boltzmann factor;
- the Lorentz factor;
- Compton shift;
- the Rydberg formula;
- Snell's law;
- Malus's law.

The **PI-instrument program** makes an epistemic posture explicit. UPT is framed as a falsification instrument rather than a claim of achieved unification. In that framing, the instrument gives a trustworthy *no* on a candidate identification, and an extraordinary *yes* when one survives. The flagship artifact of the program is the **epistemic-grounding ledger** (`src/composition/grounding.ts`, `describeGrounding`). Every `promising` `upt discover` candidate carries a record of which falsifiers actually passed versus which gates abstained. The candidate also carries the honest ceiling the framework has not crossed (no mechanism test beyond axis-compatibility, no data confrontation for most candidates).

### Key Statistics

Numbers extracted from `docs/architecture/DEPENDENCY_GRAPH.md` Summary Statistics (authoritative output of the `create-dependency-graph` tool via `bun run docs:deps`) and the `upt canonical`/`upt coverage` CLI commands.

| Metric | Value |
|--------|-------|
| Source files | 383 TypeScript files under `src/` (976 across the whole repository, including tests and tooling) |
| Modules | 12 (`atlas`, `bridges`, `canonical`, `cases`, `cli`, `composition`, `core`, `diff`, `dimensional`, `entry`, `numerical`, `root`) |
| Total exports | 2777 (1335 re-exports) |
| Bridge catalog entries | 55 (IDs 11–65) |
| Per-bridge evaluator modules | see `bridge-coverage-audit.md` |
| Composition-graph edges | 41 `BridgeEdge` constants (9 calibration + 6 catalog-tranche + 26 catalog-full), assembled once as the public `CATALOG_GRAPH` |
| Canonical equations | 107 (`node bin/upt.mjs canonical`) |
| Data-confronted bridges | 19 — BE-11, 21, 23, 35, 36, 37, 48, 51, 52, 55, 56, 58, 59, 60, 61, 62, 63, 64, 65 (`listConfrontations()`) |
| TensorEngine implementations | 2 (`Float64ReferenceEngine`, `MathTSEngine`) |

### Module Distribution

| Module | Files | Responsibility |
|--------|-------|----------------|
| `bridges/` | 90 | Bridge catalog index + per-bridge evaluator modules + the `BridgeEquations` convenience facade gathering every `evaluate*()` under readable method names + membership criterion / negative catalog + the (internal) empirical-coverage audit + the unified `upt confront` evidence-spine subsystem (`confrontations.ts` + per-bridge `be*-confrontation.ts` modules — 19 data-confronted bridges, `listConfrontations()`) |
| `cli/` | 40 | The typed CLI — `runCli` (returns an exit code, never calls `process.exit`), the `FlagSpec` args parser, the `--json` envelope + non-finite-safe sanitizer (`output.ts`), and the per-command registry (`command.ts`, `commands/`). Every command reaches internals only via the injected `CommandCtx.api`, itself sourced from the `src/cli-api.ts` barrel (a separate 1-file module the dependency-graph tool classifies as `root`). `bin/upt.mjs` is a 28-line shim that resolves `dist/cli/main.js` and maps the returned exit code onto `process.exitCode` |
| `canonical/` | 18 | Canonical-equation registry — the textbook **L-layer** ground truth bridges are validated against: the `CanonicalEquation` type (L0/L1/L2 fidelity), the assembled registry + accessors + coverage helpers, the Buckingham-derived L0 fields, the per-equation entry modules, the structural normal-form hash + bridge↔canonical linkage (the F4 circularity guard; stub-identity-tagged so `ln2` ≠ `ln⟨e^−βW⟩`), and the tensor seeder. **107 equations** across per-domain `entries/` modules (mechanics, EM/circuits, fluids/waves, thermo, quantum/atomic, gravitation, cosmology, condensed-matter, + the L1-sum non-monomial tier) |
| `atlas/` | 65 | Typed relations between physical models: relation types, regimes, error bounds with a machine horizon, the composition table, derived evidence, the witness runners and registry, the model families, versioned export, and the invalid-bridge benchmark. The public set is the root `atlas` namespace (`public.ts`); every other symbol is `@internal` on the `universal-physics-tensor/atlas` subpath. See `COMPONENTS.md`, Atlas Module |
| `composition/` | 74 | Graph-lite `Quantity`/`BridgeEdge`/`composeEdges` layer + centralized quantity nodes, alias dispositions, Phase-D enumerator, uncertainty propagation, the identifiability classifier, the retrodiction harness, the unified `explainQuantity` entry point, the (internal) bridge-analysis triage + linkage-map + link-candidate layer, the 41-edge graph assembled as `CATALOG_GRAPH`, the canonical-only graph `CANONICAL_GRAPH` that runs the discovery funnel on standard physics alone, the internal `UniversalTensor`-backed bridge-prediction + the candidate-vetting discovery loop (with anchor-derived + sourced representative-value magnitude gating), the **identity-consequence surfacer** `proposed-bridges.ts` (`deriveProposedBridges`/`PROPOSED_BRIDGES` — `upt discover --derive`), the **physics-map visualization** `graph-viz.ts` (+ `graph-viz-svg.ts` for SVG via the optional `@viz-js/viz` peer — `upt map --format=mermaid|dot|svg`), **user-equation injection + dimensional analysis** `user-equation.ts` (`analyzeUserEquation` — `upt map --equation`), the **canonical comparison** `canonical-compare.ts` (`compareWithCanonical` — a user formula against the canonical equation with the same target and variables, at fixed points: agrees, differs by a factor, differs in form, or prefactor not checked; `upt map --equation`, `upt derive --formula`), the **sourced prefactor table** `canonical-prefactors.ts` (exact prefactors, with a verbatim quote and a revision-pinned locator, for entries `src/canonical` records only up to a constant; it lives outside that pinned tree), the **dimension-adjacency review surface** `dimension-adjacency.ts` (`dimensionAdjacency` — same-dimension, name-divergent candidates), and SYMBOLIC composition — `composeSymbolic` over optional `symbolic` ExprNode forms, the Observable contract, the scalar `evalExpr` + `substitute` primitives, and the optional MathTS-backed `simplifyExpr`/`simplifyObservable` |
| `dimensional/` | 32 | SI dimensional types, algebra, AST, validator, metric + connection + curvature layer + the Buckingham-π enumerator + the (internal) dimension-spec parser + single-unknown `dimension-inference` |
| `numerical/` | 39 | TensorEngine interface, engines, lowering, geodesic + GL4 integrators, perihelion finder, Killing/Einstein/Kretschmann evaluators, Klein-Gordon dispersion evaluator, the (internal) scalar-formula parser — self-contained (Path B) + MathTS-backed (Path A) behind a `FormulaParser` registry, plus the formula dimensional checker (default-on via either parser AST), the geometrized-units boundary adapters (`toGeometrized`/`fromGeometrized`/`geometrizedFactor`, dimension-functor-driven `G^M·c^(T−2M)`) — public — and the `input-validation.ts` leaf (the input validator, which keeps `numerical/` free of an upward dependency on `bridges/`; `grid-field.ts` is a thin re-export, and `GridField` lives in `numerical/types.ts`) |
| `core/` | 11 | `UniversalTensor` class, `PhysicalConstants` lookup, flat `*_SI` constants, the `LabeledTensor`/`Cell`/regime-registry layer (flux Rule 3 is ERROR-tier; `LabeledTensor` has an explicit `axisOrder` invariant + `axisOf` and the `mergeAxes`/`splitAxis` rank-changing reshape) |
| `diff/` | 3 | Bridge-gradient layer — `bridgeGradient` (for functions written in engine ops), `bridgeGradientNumerical` (central finite differences, for plain-JS bridges), the AST-gradient path (`bridgeGradientAST`, exact AD over a bridge's RHS AST), and the bridge specs |
| `cases/` | 9 | Qualified applied cases that connect catalog reductions to end-to-end CLI scenarios |
| `entry/` | 1 | `src/index.ts` — public re-export surface |
| `root` | 1 | `src/cli-api.ts` — the CLI API barrel that command modules consume through `CommandCtx` |

---

## Architecture Principles

### 1. AST-First

Every bridge equation is expressed as an `ExprNode` tree. The tree is the artifact — numerical evaluation and dimensional validation are operations applied to it, not the other way around. The AST-first design means that a bridge can be validated symbolically without ever touching floating-point arithmetic. The design also means that new validators (e.g., a future index-structure checker) can be added without modifying any bridge module.

### 2. Honest Framing

Capabilities that are not implemented are not claimed. The bridge catalog marks equations whose status is unclear. Engine AD operates on user-supplied function closures, not on `ExprNode` trees directly; exact AD over a bridge's RHS AST is the separate `bridgeGradientAST` path. In the lowering, the `derivativeStrategy: 'computed'` default on `MetricTensorNode` treats a raw-tensor metric as constant (∂g = 0).

### 3. Interface + Conformance Suite

The `TensorEngine` interface decouples the evaluation surface from any particular linear-algebra library. Both engines (`Float64ReferenceEngine` and `MathTSEngine`) satisfy a single parameterized conformance suite (`tests/numerical/engine-conformance.test.ts`) that runs the same test cases against either engine. Adding a new engine means implementing the interface and passing the suite — no changes to the evaluator.

### 4. Dependency-Shape Signal

`MathTSEngine` lives behind an `optionalDependency` on `@danielsimonjr/mathts-tensor`. `MathTSEngine` is the active default when both `mathts-tensor` and `mathts-autograd` are present. The reason is not that the engine is faster than `Float64ReferenceEngine` today (it may not be). The reason instead: the engine signals the intended dependency shape of the UPT ecosystem and exercises the monorepo boundary between UPT and the MathTS packages.

---

## Module Organization

### `bridges/` (90 files)

The bridges module has two distinct layers that should not be confused:

**Index layer** (`src/bridges/index.ts`): The machine-readable catalog. Contains `BRIDGE_EQUATIONS` — a 55-entry array (IDs 11–65) of `BridgeEquationEntry` objects carrying spec-level metadata (id, name, status, known issues, tractability class, references, dependencies, dimensional signature). This file has no evaluator logic. The file is the authoritative source of truth for the catalog. Type exports (`BridgeEquationEntry`, `BridgeEquationStatus`, `BridgeIssueSeverity`, etc.) describe the catalog shape.

**Evaluator layer**: per-bridge evaluator code. `src/bridges/equations/be-*.ts` holds BE-11…50, 53 and 54; `gravitational-lensing.ts` (BE-51) and `perihelion-precession.ts` (BE-52) are closed-form modules; `src/bridges/be55…be65-*.ts` hold BE-55…65. An equation module builds the equation's LHS and RHS as `ExprNode` trees. In most modules, the equation module also exports a `validate*Dimensions()` helper that calls `validateEquation(LHS, RHS)` (be-22, 32, 35, 50 and 53 have none). Its `evaluate*()` function is plain JS over a typed input; only BE-37 evaluates through `evaluateNumerical()`. Per-bridge coverage: `docs/architecture/bridge-coverage-audit.md`.

**Membership layer**: `src/bridges/membership.ts` makes catalog membership computable — *a bridge is an edge whose endpoint quantities differ in at least one regime attribute* (`adjudicateBridgeEntry` / `adjudicateCatalog`). `src/bridges/rejected.ts` is the negative catalog: BE-28/29/32/35/40 are adjudicated NOT-A-BRIDGE there, while BE-44/46/50 are contested/unadjudicated. BE-42 (Hawking temperature) is adjudicated a bridge (`['gravity','quantum']`). Full disposition: `docs/architecture/v0.8.0-catalog-adjudication.md`.

**Confrontation layer**: `src/bridges/be36-gw170817-confrontation.ts` confronts GW170817 against the BE-36 GW-speed bound (also `confrontBE36WithUncertainty`). `src/bridges/be23-planckian-confrontation.ts` confronts BE-23 SYK Planckian dissipation against overdoped-cuprate data (Legros et al. 2019; honest-aggregate encoding), `confrontBE23` / `confrontBE23WithUncertainty`.

### `composition/` (74 files)

The graph-lite composition layer:

- `quantity.ts` (`Quantity` + `RegimeAttributes` + `regimesDiffer`).
- `edge.ts` (`BridgeEdge` with confidence and validity domain; also `CompositionAliasError`).
- `compose.ts` (`composeEdges` — the composition operator). The operator is **not** named `compose`, which is the Cell factory. The operator enforces the name-collision rule via `SOURCE_ALIAS_DISPOSITIONS` / `AliasDisposition`.
- `consistency.ts` (`consistencyRatio`).
- `quantities.ts` (the centralized quantity-node registry, a barrel over `quantities/*.ts`: 131 uniqueness-pinned `Quantity` constants, one object per canonical name; internal — not re-exported from the barrel).
- `enumerate.ts` (`enumerateCompositions`, the Phase-D candidate enumerator; its report partitions alias-colliding pairs into `requiresDisposition`).
- `uncertainty.ts` (`propagateUncertainty`, first-order central-difference-Jacobian propagation).
- `identifiability.ts` (`classifyIdentifiability` / `classifyAll` / `forwardClosure`): the structural over/exactly/under-determined classifier over the directed edge hypergraph. The classifier counts independent derivations of a target from a known set. The count uses a target-removed closure that excludes circular self-support.
- `retrodiction.ts` (`retrodict` / `retrodictNode`): the framework's own falsification benchmark. The benchmark masks an over-determined node and recomputes the node via each independent derivation from ground-truth inputs. The benchmark then checks that the predictions agree. The benchmark is the over-determined verdict made numerical.
- `explain.ts` (`explainQuantity`): the unified entry point. The entry point synthesizes the identifiability classifier, the retrodiction harness, and the dimensional Buckingham-π layer into one `QuantityExplanation` with a plain-language summary. The summary states how the graph computes a target, whether the redundant derivations agree, the recovered value, and whether the known set is dimensionally sufficient.
- `bridge-analysis.ts` (INTERNAL — not on the public surface): `dimensionalFreedom` / `attemptDerivation` / `anchoringDistance` / `bridgePriority`. These functions form the structural-triage layer that ranks speculative bridges by *decidability* against the established core. The layer is a review-priority tool, explicitly NOT a credibility score. `npm run bridge-priority` surfaces the layer.
- `compose-surface.ts` (barrel for the namespacing-gate symbols).
- The edge files under `edges/`:
  - `calibration.ts` (9 edges — `be11ZurekEdge`, `be12Edge`, `be16Edge`, `be37Edge`, `be42Edge`, `be42ViaRsEdge`, `be51Edge`, `be52Edge`, plus `lawSchwarzschildRadius`, the first diagonal-law edge);
  - `catalog-tranche.ts` (6 edges: BE-14/19/21/48/53/54);
  - `catalog-full.ts` (26 edges, `CATALOG_FULL_EDGES` — a barrel over the four per-domain files `catalog-{quantum,gravitation-cosmology,fields,condensed-matter}.ts`).

`catalog-graph.ts` assembles the three entry files into the single public `CATALOG_GRAPH` constant. The constant is the one source of truth the CLI and tests consume instead of rebuilding the edge list. `canonical-graph.ts` is the bridge-free counterpart. The module projects the canonical-equation registry into the same `BridgeEdge` vocabulary as `CANONICAL_GRAPH` (constants baked into the evaluators, dimension-guarded). As a result, the discovery/analysis funnel can run on standard physics alone (`upt discover --source=canonical`). Total graph: **41 edges**. BE-28/29/32/35/40 get no edges (NOT-A-BRIDGE per the negative catalog); BE-44 is skipped (array-input evaluator incompatible with the scalar-Record edge contract). The CT-1 calibration target derives E_min(M) = ℏc³ln2/(8πGM) from the BE-42∘BE-16 chain; CT-3 derives the Zurek decoherence scaling from BE-12∘BE-11.

The discovery-hardening pieces are:

- `adjudication.ts` (the human-review ledger, `ADJUDICATIONS`/`annotateAdjudications`);
- `consequence.ts` (post-pass candidate classification against the canonical registry, `annotateConsequences`);
- the axis-compatibility falsifier folded into `compose.ts`'s `effectiveAttributes`.

`grounding.ts` (`describeGrounding`, the epistemic-grounding ledger on `upt discover` verdicts) — see System Overview above for what these do.

**`probe/` (Product B, experimental):** expression/residual search under `src/composition/probe/`. Types, enumerator, budgets, fingerprints, MHC/holdout fit, corpus comparison (`normalForm`), falsification batteries, optional NDJSON workers, and `upt probe`. Not re-exported from `src/index.ts`. Does not mutate `rankDiscoveries` / `VettedCandidate`. Structure probes never flip `axes.ts` `gated`.

### `dimensional/` (32 files)

The dimensional module is the heart of UPT's symbolic layer. Its responsibilities span four areas:

**SI type system** (`types.ts`): The `Dimension` interface — seven base SI dimensions (`L`, `M`, `T`, `I`, `Theta`, `N`, `J`) represented as a record of `number` exponents. Named dimension constants (`LENGTH`, `MASS`, `ENERGY`, etc.) are exported only when they have at least one concrete consumer (a bridge module or a test). The export rule is a deliberate hygiene discipline: unreferenced constants are removed.

**Dimension algebra** (`algebra.ts`): Pure functions (`multiply`, `divide`, `power`, `add`, `subtract`, `equals`, `format`) that operate on `Dimension` values. `add` and `subtract` throw `DimensionMismatchError` if operands disagree — this is the mechanism that catches non-homogeneous equations.

**Scalar-formula parser** (`numerical/formula.ts`, `formula-mathts.ts`, `formula-registry.ts`, all INTERNAL): lets the `upt` CLI evaluate user-supplied closed-form scalar equations. `formula.ts` is the dependency-free, safe Path B parser. `formula-mathts.ts` is the MathTS-backed Path A parser (over `@danielsimonjr/mathts-functions`'s assembled mathjs engine, dynamically imported via the `mathts-functions.ambient.d.ts` optional-peer pattern). `formula-registry.ts` selects MathTS when it is installed and smoke-tests clean, else falls back to Path B. Both parsers sit behind the one `FormulaParser` interface, proven interchangeable by a shared conformance suite. The one accepted divergence between the parsers: MathTS recognizes Euler's `e`.

**Buckingham-π enumerator** (`buckingham.ts`): `buckinghamPi` enumerates the dimensionless groups of a variable set (exact rational arithmetic — the null space of the dimension matrix; n − r groups). `dimensionallyDetermines` answers whether a governing set fixes a target UP TO A DIMENSIONLESS CONSTANT, returning the (possibly rational) monomial. The principled primitive for the identifiability classifier's exactly-determined case. The result types carry FORM only — no value or constant field — enforcing the honest boundary between dimensional analysis and numerology. Pins the canonical results (pendulum T = const·√(L/g); r_s = const·GM/c²). `dimension-spec.ts` (INTERNAL) parses human dimension strings (named dims, constants, or explicit `L^3.M^-1.T^-2`) into `Dimension`s, so CLI users can declare a custom equation's dimensions without TypeScript.

**AST and validator** (`ast-types.ts`, `validator.ts`):

- The `ExprNode` union type (the AST, declared in the leaf module `ast-types.ts` and re-exported by `validator.ts`).
- The `ValidationResult` interface.
- The `validate()` / `validateEquation()` entry points.

The validator is a recursive tree-walker that calls the algebra functions to infer the dimension at each node. Tensor-aware node kinds (`tensor-symbol`, `tensor-product`, `metric-tensor`, `kronecker-delta`, `tensor-partial-derivative`, `covariant-derivative`) delegate to specialized sub-validators. The curvature/equation node kinds (`riemann-tensor`, `ricci-tensor`, `einstein-tensor`, `bianchi-residual`, `killing-vector`, `conserved-charge`, `stress-energy`, `cosmological-constant`, `einstein-equation`, `weyl-tensor`, `kretschmann-scalar`) also delegate to specialized sub-validators. The tensor-aware kinds use `tensor.ts`, `metric-validators.ts` and `connection-validators.ts`. The eleven curvature/equation kinds dispatch through `validator-registry.ts` to `connection-validators.ts` (for `riemann-tensor`), `curvature.ts`, `weyl-validators.ts`, `curvature-invariants.ts`, `einstein-equation.ts`, `killing-validators.ts` and `stress-energy-validators.ts` (which also validates `cosmological-constant`). The validator tracks free (uncontracted) indices in a mutable `Map` that threads through the recursion.

**Metric and connection layer** (`metric.ts`, `metric-validators.ts`, `connection.ts`, `connection-validators.ts`): Types and validators for the tensor-specific AST kinds. The kinds include metric tensor, Kronecker delta, tensor partial derivative, covariant derivative, `RiemannTensorNode`. The `christoffel()` function in `connection.ts` builds the Γ^λ_μν formula as a composite `ExprNode` tree from the user-supplied metric nodes.

**Curvature layer** (`curvature.ts`, `curvature-composite.ts`, `curvature-invariants.ts`, `weyl-validators.ts`, `einstein-equation.ts`): The GR curvature AST. `curvature.ts` houses the Ricci/Einstein/Bianchi validators and the `ricci`/`einstein`/`bianchiResidual` helpers. `curvature-composite.ts` is the shipped `CurvatureCompositeNode<K,S>` factory + `CURVATURE_KIND_REGISTRY` that all six curvature node kinds (Riemann, Ricci, Einstein, Bianchi, Weyl, Kretschmann) are built from. `curvature-invariants.ts` holds the Kretschmann validator, `weyl-validators.ts` the Weyl validator, and `einstein-equation.ts` `validateEinsteinFieldEquation`. The node types themselves (`KretschmannScalarNode`, `WeylTensorNode`, `EinsteinFieldEquationNode`) are declared in `ast-types.ts`.

### `numerical/` (39 files)

The numerical module implements the evaluation backend.

**TensorEngine interface** (`tensor-engine.ts`): The compute contract. Defines `EngineTensor` (an opaque rank-N tensor handle), `EinsumSpec` (the engine-agnostic contraction plan), and `TensorEngine` (the interface both engines satisfy). Also defines `ForwardGradResult` / `ReverseGradResult` and `hasAutogradSupport()`.

**Float64ReferenceEngine** (`float64-engine.ts`): The zero-dependency, Float64Array-backed reference implementation. Naive O(n) algorithms: a correctness baseline, not a performance target. Includes inline dual-number forward-mode AD and tape-recording reverse-mode AD.

**MathTSEngine adapter** (available via the `universal-physics-tensor/numerical/mathts-engine` subpath export, not from the main index): The adapter wrapping `@danielsimonjr/mathts-tensor`. Not imported at main index level to avoid forcing the optional dependency on all consumers.

**Lowering** (`lowering.ts`): Translates an `ExprNode` tree into a sequence of `TensorEngine` calls. The lowering is the bridge between the symbolic layer and the numeric layer. The deferred-evaluator node kinds are dispatched through `DEFERRED_EVALUATOR_REGISTRY` — a registry-consulting default arm with compile-time exhaustiveness — instead of five hand-written switch arms.

**Geodesic integrators** (`geodesic-integrator.ts`, `gl4-integrator.ts`): `geodesic-integrator.ts` is the fixed-step RK4 integrator. The RK4 integrator takes a Christoffel-symbol closure `(x, out?) => Float64Array(64)` (flat, index 16·λ + 4·μ + ν). The RK4 integrator integrates the (x, v) phase-space system forward in proper time. `gl4-integrator.ts` is the GL4 (Gauss–Legendre 4th-order) symplectic integrator on the canonical (x, p) state, with the inverse metric and its derivatives as inputs. The GL4 integrator is the alternative for long-time integration where energy drift matters. Neither has a `TensorEngine` dependency — both are self-contained and operate on plain JS arrays.

**Perihelion finder** (`perihelion-finder.ts`): locates the perihelion in GL4 `(tau, x, p)` snapshots — a cubic-Hermite root of dr/dτ, refined by bisection on the polynomial when needed. The finder underpins the BE-52 Mercury demonstration.

**Curvature / GR evaluators**:

- `killing.ts` provides `verifyKillingEquation`, `checkKillingEquation` (the tolerance verdict on the relative residual) and `evaluateConservedCharge`.
- `einstein-equation.ts` provides `evaluateEinsteinEquationResidual` (the scale-normalized Einstein field-equation residual).
- `kretschmann.ts` provides `computeKretschmann` (the Kretschmann-scalar contraction). The function accepts `number[][] | Float64Array` metric inputs. The function uses an exact factored index-raising algorithm instead of the naive O(4⁸) contraction; `benchmarks.md` records the speed-up.
- `christoffel-flat.ts` provides `christoffelFnFlat` (the flat-layout Christoffel accessor).

`curvature-lowering-helpers.ts` handles the lowering of curvature AST node kinds. The module is the home of the `MetricFnFlat` alias — metric closures returning row-major `Float64Array(16)`, the layout the Schwarzschild fixture and Painlevé–Gullstrand metrics use.

**Klein-Gordon dispersion evaluator** (`klein-gordon.ts`): `evaluateKGDispersionResidual` + `verifyKleinGordonPlaneWave` — the plane-wave-sector numerical companion to the dimensional layer's `KleinGordonEquationNode`.

**Engine registry** (`engine-registry.ts`): `getActiveEngine()` / `setActiveEngine()` — global active-engine management for the `evaluateNumerical()` default-engine path.

### `core/` (11 files)

The core module contains:

- the `UniversalTensor` class (the original high-level facade, predating the dimensional and numerical layers);
- the `PhysicalConstants` lookup (SI values of G, c, ℏ, k_B, etc.);
- `constants.ts` — the flat CODATA 2018 / SI-defined constants (`C_SI`, `G_SI`, `HBAR_SI`, …), the single source of truth for physical constants across the numerical, dimensional, and bridge layers.

The `UniversalTensor`/`PhysicalConstants` parts are the oldest in the codebase and predate the AST-first design; they remain on the public surface for backward compatibility. The intelligent-index / regime layer lives here (`labeled-tensor.ts`, `axes-registry.ts`, `universal-index.ts`, `cell.ts`, `flux-rules.ts`, `regime-registry.ts` and the regime builtins) — see `docs/architecture/intelligent-index-tutorial.md`. The `compose()` factory lives with `UniversalTensor` in `tensor.ts`, which keeps `cell.ts` and `tensor.ts` free of a runtime cycle. Runtime and type-only circular dependencies are both **0**: the recursive `ExprNode` union lives in the leaf module `dimensional/ast-types.ts`.

---

## Key Types and Entry Points

### `ExprNode` (`src/dimensional/ast-types.ts`)

The AST union. Every physics expression in UPT is an `ExprNode`:

```typescript
type ExprNode =
  | { kind: 'symbol'; name: string; dim: Dimension }
  | { kind: 'op'; op: '+' | '-' | '*' | '/' | '^'; args: ExprNode[] }
  | { kind: 'integral'; over: ExprNode; integrand: ExprNode; lower?: ExprNode; upper?: ExprNode }
  | { kind: 'derivative'; of: ExprNode; wrt: ExprNode }
  | { kind: 'dirac-delta'; arg: ExprNode }
  | { kind: 'variational-derivative'; functional: ExprNode; field: ExprNode; over: ExprNode }
  | { kind: 'transcendental'; fn: TranscendentalFn; arg: ExprNode }
  | { kind: 'abs'; arg: ExprNode }
  | TensorSymbolNode
  | TensorProductNode
  | MetricTensorNode
  | KroneckerDeltaNode
  | TensorPartialDerivativeNode
  | CovariantDerivativeNode
  | RiemannTensorNode
  | RicciTensorNode
  | EinsteinTensorNode
  | BianchiResidualNode
  | KillingVectorNode
  | ConservedChargeNode
  | StressEnergyTensorNode
  | CosmologicalConstantNode
  | EinsteinFieldEquationNode
  | WeylTensorNode
  | KretschmannScalarNode;
```

The `symbol` kind is the leaf: it carries an SI `Dimension` inline. All other kinds build structure from sub-expressions.

### `Dimension` (`src/dimensional/types.ts`)

The seven base SI dimensions as a plain record of exponents. Rational exponents (`1/2` for a square-root dimension) are supported. All dimension algebra is implemented as pure functions over this type.

### `TensorEngine` (`src/numerical/tensor-engine.ts`)

The compute contract. Implementations provide `fromNested`, `toNested`, `einsum`, `matMul`, `transpose`, `reshape`, and element-wise arithmetic. The optional `forwardGrad` / `reverseGrad` methods are the AD surface; `hasAutogradSupport(engine)` guards whether they are present.

### `evaluateNumerical` (`src/numerical/index.ts`)

The main numerical entry point. The entry point takes an `ExprNode` and a `NumericalInputs` bundle (mapping symbol names to concrete tensor values). The entry point then validates the AST and lowers the AST to engine calls via `lowering.ts`. The entry point returns a `NumericalResult` carrying the output value, inferred dimension, free indices, and any warnings.

---

## TensorEngine Architecture

The engine architecture follows a strict three-part structure:

**1. Interface** (`tensor-engine.ts`): The `TensorEngine` interface is the only engine contract the evaluator (`numerical/index.ts`) and the lowering pass (`lowering.ts`) use. `lowering.ts` imports no concrete engine class. `numerical/index.ts` re-exports `Float64ReferenceEngine` for the public surface, but its evaluator code reaches an engine only through `getActiveEngine()` or the `EvaluateOptions.engine` override.

**2. Implementations**: Two implementations exist:

- `Float64ReferenceEngine`: Pure TypeScript, Float64Array-backed. Zero runtime dependencies. Available from the main package entry point. Its AD implementation uses dual numbers for forward mode and a tape-record approach for reverse mode, both implemented inline in `float64-engine.ts`.
- `MathTSEngine`: Wraps `@danielsimonjr/mathts-tensor`. Available only via the `universal-physics-tensor/numerical/mathts-engine` exports subpath (a conditional import that keeps the optional dependency tree-shakeable). Its AD delegates to `@danielsimonjr/mathts-autograd`.

**3. Conformance suite**: A parameterized test suite (`tests/numerical/engine-conformance.test.ts`) defines the behavioral contract shared by both engines. The suite is run against each engine independently. Any engine that passes the suite is a valid drop-in for `evaluateNumerical()`.

---

## Bridge Catalog Architecture

Each bridge-equation module (`src/bridges/equations/be-*.ts`) follows a consistent pattern:

1. Import `ExprNode`, `validate`, `validateEquation` from the dimensional module.
2. Build LHS and RHS as `ExprNode` trees using `symbol`, `op`, `integral`, `derivative`, `tensor-product`, and `metric-tensor` nodes as needed.
3. Export the AST constants (e.g., `DECOHERENCE_RATE_LHS`, `DECOHERENCE_RATE_RHS`) so consumers can inspect or extend the trees.
4. Export (most modules; be-22, 32, 35, 50 and 53 do not) a `validate*Dimensions(): DimensionValidationReport` helper that calls `validateEquation(LHS, RHS)` and returns `{ ok, lhsDim, rhsDim }`.
5. Export an `evaluate*()` function: plain JS over a typed input interface. The function returns a number or a result object with named fields. Only BE-37 evaluates through `evaluateNumerical()`.

The index module (`src/bridges/index.ts`) re-exports the flagship evaluator functions (`evaluateGravitationalLensing`, `evaluatePerihelionPrecession`) alongside the `BRIDGE_EQUATIONS` catalog array. Bridge metadata in the catalog (`dimensional_signature`, `status`, `known_issues`) is maintained by hand, informed by the per-module validators. There is no code-generation path from module outputs to catalog entries. The catalog is also published as a generated JSON artifact (`data/bridge-catalog.json`, regenerated via `npm run catalog:json` and schema-checked against `data/bridge-catalog.schema.json`). `membership.ts` adjudicates bridge-vs-law membership mechanically, with the `rejected.ts` negative catalog as overlay (see `v0.8.0-catalog-adjudication.md`).

---

## Validation Pipeline

When a caller invokes `validate(node)`:

1. The recursive walker `infer(node, ctx)` traverses the `ExprNode` tree.
2. At each `symbol` leaf, the `dim` field is returned directly.
3. At each `op` node, the algebra functions (`multiply`, `divide`, `power`, `add`, `subtract`) are applied to the children's inferred dimensions. `add` / `subtract` additionally check that all operands share the same free-index signature (to prevent tensor+scalar mixups).
4. At tensor-aware nodes, specialized sub-validators handle index tracking and Einstein contraction (`computeContraction` in `tensor.ts`).
5. Dimensional mismatches are accumulated as violations in a mutable `violations: Violation[]` array on the context object. Structural errors throw instead, and `validate()` does not catch them. Examples are `FreeIndexMismatchError` (operands of `+`/`-` with different free-index signatures), `TensorInScalarOpError` (a tensor operand in a scalar-only op) and `IndexLabelCollisionError`. Each violation has a location (tree path string), expected and actual dimensions, and a human-readable note. Each violation also has an optional severity (`'error'` or `'warning'`).
6. `validate()` returns a `ValidationResult` with `ok`, `inferredDimension`, `freeIndices`, and `violations`. `ok` is `true` only when no error-severity violation is present and a dimension was inferred.

`evaluateNumerical()` calls `validate()` first and throws `NumericalBackendError` if `ok` is false — numerical evaluation on an invalid AST is not permitted.

---

## Automatic Differentiation Architecture

### What is implemented

Both engines implement optional `forwardGrad` and `reverseGrad` methods on the `TensorEngine` interface. These operate on **user-supplied function closures** of the form `(x: EngineTensor) => EngineTensor`. The caller wraps the computation they want to differentiate in a closure; the engine handles the bookkeeping.

- `forwardGrad(fn, x)` returns `{ value, jacobian }` — the Jacobian-vector product with unit tangent.
- `reverseGrad(fn, x, cotangent?)` returns `{ value, gradient }` — the vector-Jacobian product, defaulting to ones-like cotangent.

Both return `Promise` for uniform async semantics, even though `Float64ReferenceEngine`'s implementations are synchronous internally.

### What is NOT implemented

AD does not differentiate `ExprNode` trees symbolically: differentiating an `ExprNode` to produce another `ExprNode` is not implemented. In the lowering, `derivativeStrategy: 'computed'` (the default) on a `MetricTensorNode` treats a raw-tensor metric as constant, ∂g = 0. Exact AD over a bridge's RHS AST exists as a separate numeric path, `bridgeGradientAST` (`src/diff/`), through the optional autograd peer.

### Float64ReferenceEngine internals

Forward mode uses the dual-number representation: `EngineDualTensor` carries both a primal `Float64Array` and a tangent `Float64Array`. All arithmetic operations propagate both. Reverse mode uses a tape-record approach: the private `EngineTape` records closures during the forward pass; its `backward()` walks them in reverse, accumulating gradients.

### MathTSEngine delegation

`MathTSEngine` delegates `forwardGrad` and `reverseGrad` to `@danielsimonjr/mathts-autograd`. The UPT-level contract is the same; the implementation is in the separate `mathts-autograd` package which follows its own release cadence.

---

## Key Design Decisions

- **Dep-shape, not perf**: `MathTSEngine` is the intended default not for performance reasons but to exercise the monorepo dep boundary. `Float64ReferenceEngine` remains the zero-dep fallback and is what `getActiveEngine()` returns unless both optional MathTS peers are present.

- **No entry-point coupling to optional deps**: `MathTSEngine` is excluded from the main `src/index.ts` re-export surface. Importing from the main entry point never triggers an optional-dependency resolution error.

- **`christoffel()` builds trees, not values**: The Christoffel formula builder returns an `ExprNode` composite, not a number. This keeps it in the symbolic layer and makes the result inspectable, validatable, and extensible before any numerical evaluation.

- **Validator tracks index structure**: The validator tracks free indices (label + upper/lower count). `validateEquation` checks valence homogeneity across `=`. A transcendental argument that carries a dimension is a violation.

- **`'computed'` means constant in the lowering**: For a raw-tensor metric input, the lowering treats `derivativeStrategy: 'computed'` (the default) as ∂g = 0 and Γ = 0. The lowering neither finite-differences nor differentiates through the metric. Metric closures in `inputs.fields` take the curvature paths, which finite-difference the closures. This distinction matters for users who expect exact derivatives.

- **Bridge catalog and evaluator layers are separate**: A bridge entry in `BRIDGE_EQUATIONS` can exist without a corresponding `be-*.ts` evaluator module. (Per-bridge evaluator coverage is in `bridge-coverage-audit.md`; the layers remain architecturally distinct, and conflating them would give a misleading picture if they diverge.)

---

## Testing Strategy

| Directory | Purpose |
|-----------|---------|
| `tests/dimensional/` | Per-function validator and algebra tests |
| `tests/bridges/` | Per-bridge dimension-validation and evaluator tests |
| `tests/numerical/` | Engine conformance suite (runs against both engines) |
| `tests/api/` | Public API stability snapshot (`public-surface.test.ts`) |
| `tests/composition/probe/` | Product B expression-search unit + Family B fixture tests |

The public API snapshot test (`tests/api/public-surface.test.ts`) enforces that no symbol enters or leaves the public surface without a deliberate update to the snapshot. It checks both runtime value exports (`Object.keys(root)`) and type-only exports (via source-text grep on `src/index.ts` and `dist/index.d.ts`).

The suite also includes fast-check property tests (e.g., dimension-algebra and composition properties). The suite runs in CI via `.github/workflows/ci.yml`: build + full test suite on push, plus the strict whole-repo typecheck gate `tsc -p tsconfig.tests.json`. Suite size and per-file coverage are generated, not stated here: see `TEST_COVERAGE.md` and `NOTES.md`. Contribution conventions live in `CONTRIBUTING.md`.

---

Dated historical records live in `docs/architecture/archive/`. See `OVERVIEW.md` for the high-level orientation. See `COMPONENTS.md` for the per-file component breakdown. See `DATAFLOW.md` for concrete data-flow traces. See `API.md` for the public API reference.

---

**Maintained by**: Daniel Simon Jr.

## Verification

Generated by `repo_map.py map`.
Regenerate: `python repo_map.py map <repo> --out <dir>` · Check: `python repo_map.py check <repo> --docs docs/architecture`

| Claim | Value | Source |
|---|---|---|
| totalSourceFiles | 976 | dependency-graph.json |
| totalExports | 3533 | dependency-graph.json |
| runtimeCircularDeps | 0 | dependency-graph.json |
| typeOnlyCircularDeps | 0 | dependency-graph.json |

**Two scopes, both correct.** The table above is **whole-repository** — `repo_map` counts
every TypeScript file git tracks, including `tests/`, `bench/`, `examples/` and `tools/`. The prose in this
document uses the **`src/` scope** produced by this repository's own generator
(`bun run docs:deps`): 383 files, 2777 exports, 1335 of them re-exports. 976 and 383 do not
contradict each other; they answer different questions. Every figure states its scope.
