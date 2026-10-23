# Universal Physics Tensor — Project Overview

---

## What Is This?

Universal Physics Tensor (UPT) is a **TypeScript dimensional-analyzer and bridge-equation library** for exploring unified physics through tensor formalism. The library provides a machine-readable catalog of bridge equations in `data/bridge-catalog.json`. The equations connect distinct physics regimes (quantum to classical, gravity to gauge, thermodynamics to information theory). A layered computational backend can validate, symbolically analyze, and numerically evaluate those equations. `evaluateRelation` is that evaluation. Where the same concept is implemented more than once, the reading is `INTEGRATION_MAP.md`. `tests/fixtures/catalog-census.json` holds the counts of the catalog, and `DEPENDENCY_GRAPH.md` holds the counts of the source files.

The library serves two audiences. Researchers want to query the bridge-equation catalog and catch dimensional errors in novel formulations. Implementors want to evaluate tensor contractions numerically, compute Christoffel symbols, or integrate geodesics in an arbitrary Lorentzian manifold.

---

## North Stars

Four goals govern every design choice in UPT:

1. **Bridges drive the work.** The catalog records in `data/bridge-catalog.json` are the scientific core. Tooling, tests, and new capabilities exist to serve the catalog, not the other way around. A new feature earns its place by enabling or improving a bridge record.

2. **MathTS first-class.** `@danielsimonjr/mathts-tensor` is the numerical backend. The `TensorEngine` interface is the seam. `MathTSEngine` is the engine class, and the MathTS packages are required dependencies. The selection is a deliberate signal about the dependency shape of the ecosystem, not a performance claim.

3. **Integrated scientific environment.** UPT aims to be a self-contained environment for computational physics. The environment covers Christoffel symbols, geodesic integration, curvature (Riemann/Ricci/Einstein/Weyl/Kretschmann), and Killing-vector and Einstein-field-equation machinery. The environment also covers symbolic composition and simplification (`src/composition/compose-symbolic.ts`, `src/composition/expr-simplify.ts`). All of these share a common AST and type system.

4. **An honest falsification instrument.** UPT is an instrument on which a physicist can stake a claim. The instrument gives a trustworthy **no** and an extraordinary **yes**. The *no* is `upt discover`'s vetting funnel plus the epistemic-grounding ledger (`src/composition/grounding.ts`). On every verdict, the ledger records which falsifiers actually passed and which gaps remain. The adjudication ledger (`adjudications` in `data/bridge-catalog.json`) records each human verdict on a candidate: `genuine`, `decoy`, `entailed` or `deferred`. Physics, not vocabulary, isolates the isolated-bridge frontier. The frontier is not a vocabulary gap that the tool can close. The *yes* is the evidence spine (`upt confront`): the real-data confrontations of catalog bridges, which `data/bridge-catalog.json` records. The spine includes three tests of general relativity: Mercury perihelion, Shapiro delay and gravitational lensing. Each lies within 1σ, and `upt confront` prints each residual. Perihelion and lensing are two of the three classic tests; Shapiro delay is the fourth. Shapiro delay and light deflection each test the PPN parameter γ at a relative precision near 10⁻⁵. Mercury perihelion tests the closed-form advance at about 1 %. The confrontation records are not equal confirmations.

---

## Five-Layer Architecture

UPT is organized into five conceptual layers that build on each other:

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 5: Curvature / GR                                     │
│  Riemann / Ricci / Einstein / Bianchi / Weyl / Kretschmann   │
│  composite nodes + CurvatureCompositeNode<K,S> factory +     │
│  GL4 symplectic integrator + perihelion finder + Killing     │
│  machinery + EinsteinFieldEquationNode + Einstein residual   │
├──────────────────────────────────────────────────────────────┤
│  Layer 4: Numerical Backend                                  │
│  TensorEngine interface + MathTSEngine (the MathTS           │
│  packages are required) + AD (forwardGrad /                  │
│  reverseGrad) + RK4 geodesic integrator                      │
├──────────────────────────────────────────────────────────────┤
│  Layer 3: Metric / Connection                                │
│  MetricTensorNode / KroneckerDeltaNode / christoffel()       │
│  builder / CovariantDerivativeNode / inverse-metric check    │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Dimensional AST + Algebra                          │
│  ExprNode union / validate() / validateEquation() /          │
│  SI Dimension algebra (multiply / divide / power / format)   │
├──────────────────────────────────────────────────────────────┤
│  Layer 1: Bridge Catalog                                     │
│  data/bridge-catalog.json + catalog-load.ts +                │
│  BridgeEquationEntry + membership criterion /                │
│  negative catalog                                            │
└──────────────────────────────────────────────────────────────┘
```

A catalog record at Layer 1 is parsed into AST nodes at Layer 2 and checked with the dimensional algebra. Layer 3 metric primitives build on Layer 2, and Layer 4 evaluates the resulting trees numerically. Layer 5 (the curvature / general-relativity layer) is built on top of Layers 2–4. Its curvature node kinds are `ExprNode` members with their own validators and lowering arms. The GL4 integrator takes the inverse metric and its derivative as closures. The Layer-4 RK4 integrator takes a Christoffel-symbol closure. A caller who only wants catalog metadata (status, known issues, references) calls nothing in layers 2–5. Layers 1 to 5 describe the data flow, not the import order. The import order is the tier table in `tools/layer-order/check.ts`, which `bun run layer:check` enforces.

Beside the layers sits a **composition graph** (`src/composition/`). `CATALOG_GRAPH` in `src/composition/catalog-graph.ts` holds each catalog relation as a `BridgeEdge` over `Quantity` endpoints, composable via `composeEdges`. Catalog membership is computable (`src/bridges/membership.ts` + the `src/bridges/rejected.ts` negative catalog — see [the catalog adjudication report](v0.8.0-catalog-adjudication.md)). The graph also has:

- a Phase-D candidate enumerator (`enumerateCompositions`);
- first-order uncertainty propagation (`propagateUncertainty`);
- a name-collision namespacing gate (`CompositionAliasError` + `SOURCE_ALIAS_DISPOSITIONS`). Graph quantities are projected from `data/quantities.json` by `src/composition/quantities.ts`.

The catalog is checked against the **canonical L-layer** (`src/canonical/`). The L-layer is the textbook ground truth that the catalog's bridges are checked against. The real-data confrontations form an **evidence spine** (`upt confront` / `upt coverage`). `src/bridges/confrontations.ts` projects that spine from the catalog. `tests/fixtures/catalog-census.json` holds the counts.

---

## Atlas

Beside the catalog sits an atlas of typed relations between models (`src/atlas/`). A relation carries its type, side conditions, regime, and an error bound with a horizon. `formally-proved` is derived from a reviewed `formalRef` and is never hand-set. The references use `system: 'lean4-physjs'` and name theorems in this repository's `lean/`. CI builds and axiom-audits that directory, and `formal/lean/manifest.json` records each statement. Every catalog record carries a proof status (`full`, `weak` or `pending`). A record with a reviewed formal reference also carries its theorem. `tests/fixtures/catalog-census.json` (`formalRefs`) holds the count for catalog equations.

## History and plans

The repository root holds `CHANGELOG.md` (what shipped, and when), `ACTIVE.md` (open work), `ROADMAP.md` (the direction) and `todo.md` (the closed task ledger). The per-release planning documents are under `docs/planning/`.

See `ARCHITECTURE.md` for detailed module design. See `COMPONENTS.md` for per-file component breakdown. See `DATAFLOW.md` for concrete data-flow traces through the system. See `API.md` for the public API reference.

---

## Verification

Generated by `repo-tools map`.
Regenerate: `repo-tools map . --out=<dir>` · Check: `repo-tools check . --docs=docs/architecture`

| Claim | Value | Source |
|---|---|---|
| totalSourceFiles | 1150 | `dependency-graph.json` `statistics.totalSourceFiles` |
| totalExports | 3777 | `dependency-graph.json` `statistics.totalExports` |
| runtimeCircularDeps | 0 | `dependency-graph.json` `statistics.runtimeCircularDeps` |
| typeOnlyCircularDeps | 0 | `dependency-graph.json` `statistics.typeOnlyCircularDeps` |

The four counts cover the whole repository, tests and tools included. `repo-tools map` uses this scope by default. The project generator `bun run docs:deps` reads `src/` only, and `DEPENDENCY_GRAPH.md` holds its counts. The `dependency-graph.json` in the Source column is the output of `repo-tools map`. The committed `docs/architecture/dependency-graph.json` is a different file, which `bun run docs:deps` writes for `src/`. The catalog counts are not metrics of the dependency graph. `tests/fixtures/catalog-census.json` holds them, and a test pins them.

---

## Product A vs Product B (expression search)

`upt discover` is the **quantity-identification** funnel (`VettedCandidate`, `a ≡ b`).
That funnel is frozen and is not an AST generator. **Product B** (`src/composition/probe/`,
CLI `upt probe`, experimental subpath `universal-physics-tensor/probe`) searches scalar
expressions against residuals under a budget, with exploratory/holdout isolation and
corpus-relative novelty wording. Relation-link gaps stay Product A — `upt probe run`
abstains (`non-identifiable`) and redirects to `upt discover`. See
`docs/planning/Scientific-Bridge-Discovery-v1-Integration.md`.

