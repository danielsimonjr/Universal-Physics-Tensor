# MEMORY.md — stateless facts (nothing here carries an "as of")

The law is `AGENTS.md`. Anything with a date, a version, or a count that will change belongs in
`NOTES.md` — **not here**. This file is what stays true regardless of when you
read it.

## Names and shapes

- Repo `universal-physics-tensor`. Default branch is **`master`**, not `main`. **Direct-push
  workflow** for local work, no human PR flow; cloud and agent sessions land through auto-PRs.
- SemVer applies from v0.1.0 onward.
- The atlas public surface is a **namespace facade** — `export * as atlas from './atlas/public.js'`
  — added *alongside* the existing named exports in `src/index.ts`, changing none of them.
- `src/atlas/public.ts` is the **single list** of public atlas names. The count is **derived from
  that file by the test and stated nowhere else**, so a list and a number cannot disagree.
- Witness kinds are **numeric** and **CAS**. They are counted separately.
- Tiering intent: promote only what is stable, defer what is in flux, keep benchmark and
  prediction internals internal.

## Stack

- **TypeScript 7** (native compiler). It ships **no JavaScript compiler API**, so a test cannot
  `import ts from 'typescript'`; scan source text instead, with controls.
- Node is the shipped runtime. ESM (`"type": "module"`): relative imports must include the `.js`
  extension.
- **Bun** is the local and CI package manager and script driver (`bun install`, `bun run …`).
  **Node remains what the published library runs on.** Do not replace `node` in script bodies with
  `bun`; `bun run` already drives them.
- Test runner: **vitest**. No Python in the codebase.
- **Required dependencies:** the `@danielsimonjr/mathts-*` packages (core, expression,
  functions, matrix, tensor, autograd, parallel, wasm, workerpool). The library does not
  start without them. `@danielsimonjr/mathts-gpu` arrives as MathTS's dependency.
  `@viz-js/viz` (SVG map rendering) stays an optional peer and must degrade when absent.
- The lockfile is **`bun.lock` only** (no `package-lock.json`). Dependabot uses
  **`package-ecosystem: npm`**. Do NOT switch it to `bun`: Dependabot's bun parser supports only
  `bun.lock` lockfileVersion 1 while this repo writes version 2, so it would stop proposing updates
  at all. The consequence of the npm ecosystem is that **Dependabot never writes `bun.lock`**, so
  every Dependabot PR fails CI at `bun install --frozen-lockfile` until the lockfile is regenerated.

## Source map

Top-level layout; each subsystem's local `README.md` has depth.

| Path | Purpose |
|---|---|
| `src/index.ts` | Public-API manifest (every `@public` symbol). **`MathTSEngine` is intentionally NOT re-exported here**; it is reachable only through the `universal-physics-tensor/numerical/mathts-engine` subpath. |
| `src/core/` | `UniversalTensor`, runtime law/bridge/emergent-phenomenon types (`tensor.ts`, `types.ts`). |
| `src/bridges/` | The bridge catalog. `index.ts` is the catalog registry (`BRIDGE_EQUATIONS`); `equations/` holds per-bridge AST modules; closed-form evaluators (`gravitational-lensing.ts`, `perihelion-precession.ts`, `be55…be62-*.ts`) sit at this level. **Catalog ≠ graph:** catalog bridges project to composition-graph edges (`CATALOG_GRAPH`), and two DIFFERENT sets must not be conflated: bridges with no AST (no `BRIDGE_RHS_BY_ID` entry) and bridges with no graph edge. BE-51 and BE-52 have edges (`be51Edge`, `be52Edge` in `src/composition/edges/calibration.ts`) but no AST. The graph is sparse; most cross-cluster "links" are dimensional coincidences (`upt discover`, `docs/research/`), so the rank-6 tensor framing is aspirational about connectivity. `DATA_CONFRONTED_IDS` in `confrontation-coverage.ts` is a sorted projection of `CONFRONTATIONS`. |
| `src/dimensional/` | Scalar AST validator over the 7 base SI dimensions (L, M, T, I, Θ, N, J in `types.ts`'s `Dimension`; `NAMED_DIMENSIONS` adds named/derived shapes for `format()`). **`ast-types.ts` is the leaf module owning the `ExprNode` union and all node interfaces**; the origin modules re-export from it and keep only validation functions, which is what holds type-only circular dependencies at zero. `ast-builders.ts` is the single source of the `sym`/`dim` builders; `validator.ts` is the validation engine; `algebra.ts` the dimension calculus; `buckingham.ts` the exact-rational Buckingham-π enumerator (the float `nullspace` is not that basis); `units.ts` is the one unit reader (`readUnit`, `parseUnit`, `convertValue`, `readQuantityLiteral`) over exact scales from `exact-scale.ts`, rounded once, with MathTS `toSI` only as a test's second method, and the `Dimension` record stays; `bridge-check.ts` houses `inferDimensionForBridge` and `EXPECTED_DIMENSION_BY_BRIDGE`; `dimension-inference.ts` the single-unknown `inferUnknownDimension`; `connection.ts` (Christoffel) requires dimensionless (geometrized) metrics. |
| `src/composition/` | The composition-graph layer. `edges/` holds the `BridgeEdge` definitions (`catalog-full.ts` is a barrel over `catalog-{quantum,gravitation-cosmology,fields,condensed-matter}.ts`; `quantities.ts` is a barrel over `quantities/{quantum,…,common}.ts`). `axes.ts` is the **extensible tensor-axis registry**, the single source for the classification axes (each a typed union plus an `AxisSpec` entry; `GATE_AXES` = `AXES.filter(gated)`). `axis-audit.ts` (`auditAxisDiscrimination`) is the anti-inert-metadata gate: an axis stays UNGATED until it MEASURABLY fires on the funnel. The SI `Dimension` axis is NOT a registry axis. `bridge-analysis.ts` (linkage map, priority, orphan connectors); `discovery.ts`, `retrodiction.ts`, `identifiability.ts` (the vetting funnel behind `upt discover`); `compose-symbolic.ts`/`expr-simplify.ts` (symbolic composition); `canonical-graph.ts` (textbook-only graph, `--source=canonical`); `proposed-bridges.ts` (identity-consequence surfacer, firewalled `'unadjudicated'`); `graph-viz*.ts` (`upt map --format=mermaid\|dot\|svg`); `user-equation.ts` (`--equation` injection, never written to the catalog); `chain-candidate.ts` (`orderChainCandidates`: confirmation, then restatement, then a unique monomial, then an unfixed PhysJS.Dimensional shape, then a shorter chain, then the ordered edge ids). `descriptor.ts` (`getBridge` / `BRIDGE_DESCRIPTORS`) joins catalog metadata, the RHS AST, and `CATALOG_GRAPH` into one per-bridge view. `audit-coverage.ts` (`auditCoverage`) scans that graph for the grounding report and reads `DATA_CONFRONTED_IDS` from `bridges/`. |
| `src/composition/probe/` | **Product B** experimental expression/residual search (`upt probe`), orthogonal to Product A (`discovery.ts` / `VettedCandidate`). Native Buckingham monomial enumerator, MHC/holdout, budgets, corpus-relative novelty, optional NDJSON workers. Not re-exported from `src/index.ts`; subpath `universal-physics-tensor/probe`. Relation-link gaps are not searchable there; use `upt discover`. |
| `src/diff/` | Bridge parameter gradients: `bridge-ast-gradient.ts` (exact reverse-mode AD over the symbolic RHS AST via the autograd peer; evaluators stay plain JS), `bridge-gradient.ts` (central-FD fallback and engine-AD wrapper). |
| `src/cli/`, `bin/upt.mjs`, `src/cli-api.ts` | The `upt` CLI (reference in `cli/README.md`). `bin/upt.mjs` is a thin shim: it imports `dist/cli/main.js` and maps the returned exit code onto `process.exitCode` (not `process.exit`, so piped stdout is not truncated). All logic lives in typed `src/cli/`: the `FlagSpec` parser (`args.ts`) rejects unknown flags with exit 2; the command registry (`command.ts`, `commands/`); the `--json` envelope and non-finite-safe sanitizer (`output.ts`); `runCli` (`main.ts`, returns an exit code, never calls `process.exit`). `main.ts` is the one module that imports the `src/cli-api.ts` barrel; commands reach it only through the injected `CommandCtx.api`. A Kerr `--geodesic` with a non-positive mass or with `|a|` above GM/c² throws `CliError` (exit 1); a missing metric name stays `UsageError` (exit 2). Extend the barrel when the CLI needs a new internal module; never deep-import from `src/cli/`. |
| `src/numerical/` | `TensorEngine` interface and `MathTSEngine`. AST→engine lowering in `lowering.ts`; geodesic RK4 in `geodesic-integrator.ts` and `null-ray-integrator.ts` calls MathTS `solveODESystem` with `dt` (classical RK4); `gl4-integrator.ts` stays the local symplectic integrator; covariant eikonal evaluator in `covariant-eikonal.ts`. `quadrature.ts` is the 16-point Gauss–Legendre rule whose nodes are MathTS `rootsLegendre(16)`. |
| `src/atlas/` | Typed relations BETWEEN models, as opposed to the bridge catalog's relations between QUANTITIES. `types.ts` (`RelationType`, `EvidenceTag`, `Regime`, `ApproximationBound` with a mandatory machine `horizonHolds`, `AtlasBridge`, `AtlasRejection`); `error-algebra.ts` (`composeBounds`, `IDENTITY_BOUND`, `composeBoundPath`, outer-after-inner: `delta` accumulates as `outer.K*inner.delta + outer.delta`); `regime.ts` (π-groups via `buckinghamPi`, keyed by `PiGroup.formula`; dimensionless inputs are passed IN as zero-dimension variables and emerge as trivial groups, never synthesized separately, which would double-add them); the families `oscillators/`, `diffusion/` and `waves/` (a bridge may end in another family's model rather than redefine it); `families.ts` (`ATLAS_FAMILIES`: whole-atlas gates iterate this, never one family by name); `witness-{symbolic,numeric,result,specs,artifact}.ts` (the runners and the registry behind `data/atlas/witness-results.json`, written only by `bun run atlas:witness-results`); `benchmark/` (the invalid-bridge benchmark); `public.ts` (the public set, reached as the root `atlas` namespace; everything else is `@internal` on the `universal-physics-tensor/atlas` subpath). **THE INVARIANT IS: NEVER THE BARREL.** `src/bridges/` and `src/composition/` must not import `src/atlas/index.ts`, which would close a cycle `docs:deps` reports. They may import individual atlas modules, types or values. A rule stricter than the invariant it protects gets silently violated by working code. |
| `src/canonical/` | Canonical-equation registry: the textbook **L-layer** ground truth bridges are validated against. `canonical-equation.ts` owns `CanonicalEquation` (L0 dimensional / L1 scalar-AST / L2 field-equation fidelity, `epistemicStatus`/`freeDimensionlessGroups`, `restatesBridge`/`partnerBridges`); `registry.ts` the assembled array, accessors and coverage helpers; `dimensional-fields.ts` derives L0 fields from the Buckingham engine; `entries/` holds the equation modules; `seed-l-layer.ts` populates the tensor via `addLaw`. `residual.ts` puts an entry in residual form, `target − scalarAst`, the form a claim `lhs − rhs` is compared in. `normal-form.ts` is the structural hash (equal up to dimensionless *constants*; named non-constant stubs such as `ln⟨e^−βW⟩` stay distinct); `structural.ts` (`classifyStructure`) is the shared structural classifier: same dimension, that hash, and the F4 `restatesBridge` guard. A chain that matches a catalog right-hand side the registry did not pre-declare confirms that catalog id and writes nothing. A chain that matches a canonical equation whose `restatesBridge` names the bridge is a restatement. Any other chain receives a provisional `chain-` id, the edge ids in chain order, which `parseBridgeId` rejects and which is not a catalog id. `linkage.ts` calls that function and then runs numerical recovery (`classifyLinkage`/`scanLinkages`, surfaced by `upt recover`). Numerical agreement is not a confirmation. `composition/chain-match.ts` calls the same function. |
| `tests/fixtures/schwarzschild.ts` | Canonical GR fixture, extended each release (`gInverseFn`, `dgInverseFn` typed `dg[lambda][mu][nu]`). |
| `docs/specification/` | Formal spec: core Parts I–VI (theoretical foundation, catalog, algorithms, validation, advanced math, governance) and supplements (VII tensor algebra, VIII metric layer, IX composition Phase A, X curvature and field-equation layers, **XI proposed equations**, NON-NORMATIVE and unadjudicated). Its `README.md` is the index. |
| `docs/planning/` | Design and intent only. `v0.X.Y-{Design,Implementation-Plan,Review-Findings}.md` are per-release records. |
| `docs/architecture/` | Auto-generated dependency graph, hand-written architecture, and per-release audit reports (`benchmarks.md`, `bridge-coverage-audit.md`, …). |
| `bench/` | Vitest bench suites (sanity, AD, covariant eikonal, Schwarzschild geodesic). |
| `examples/` | Usage examples; `test-example.js` is the smoke entry. |

## Dimensional AST grammar

Scalar (operator-blind) `ExprNode` primitives: `symbol | op (* / + - ^) | integral (optionally
bounded) | derivative | transcendental (exp/ln/log/trig) | abs | dirac-delta |
variational-derivative`, plus the tensor and curvature node families (`CovariantDerivativeNode`,
`RiemannTensorNode`, …). Numbers are dimensionless symbols. The validator enforces:

- the `^` arity guard (base, exponent); a non-literal exponent is legal only on a DIMENSIONLESS base;
- transcendental arguments must be dimensionless (`exp(energy)` is rejected);
- a dimensionless literal zero in a sum is the additive identity, so `x - 0` has the dimension of `x`;
- switch exhaustiveness (`never` arm);
- integral and derivative shape guards;
- `validateInverseMetricPair` consistency between `g` and `g⁻¹` (emits `InverseMetricInconsistencyWarning`).

Round-trip invariant: every catalog entry's encoded RHS validates back to its registered
`dimensional_signature`, pinned by `tests/bridges/dimensional-signature-catalog.test.ts`.

## Bridge-encoding patterns

When encoding or reformulating a bridge, prefer these; they avoid grammar extensions:

- **Typed stubs** for transcendentals and operator-valued interiors: absorb `log`, `exp` and tensor
  contractions into one dimensioned symbol.
- **Squared form** to avoid fractional exponents (`S²`, `L² = Γt`, `Q_soft²`).
- **Ensemble-average stubs** for averaged exponentials (Jarzynski `⟨exp(-βW)⟩`).
- **Observational-bound dimensionless ratios** (GW170817 `|c_GW - c| / c`).
- **Integral primitive** for boundary integrals (BE-26 WKB, BE-44 soft-hair L²-norm).
- **Bridge reformulation**: replace a broken or contested formulation with the canonical literature
  form while keeping the bridge label. Precedents: BE-25 Penrose-Hameroff → IIT Φ_max; BE-16 →
  Landauer; BE-37 → Shapiro delay; BE-28 → Onsager σ (with a `⚠ CRITICAL WARNING` docstring: the
  encoded `σ = Σᵢ Jᵢ Xᵢ` is the *definiendum* of MEPP, not the variational maximization principle).

## Invariants that must keep holding

- The public surface is **closed under type references**: no public declaration may reference a
  non-public type. A private type reachable through a public one is a leak whatever the tag says.
- The frozen-set hash is **bound by a test** to the LAST hash recorded in the pre-registration.
  When the set changes, that test **must go RED** until an amendment records the new hash. If it
  stays green, the change did not take.
- A **numeric** control asserts the wrong hypothesis is **refuted**. A **CAS** control can only
  assert **not checked** — a weaker guarantee, because the simplifier failing on everything
  would also produce it. Each control therefore carries a meta-check that the *true* claim
  resolves, and the two result kinds are never merged into one count.
- The public benchmark files never carry the answer; `kind` and `failureKind` live only in
  `scorer/labels.json`.

## Where things live

- What shipped and when: `CHANGELOG.md`. What is in flight, and the authorization gate:
  `ACTIVE.md`. `todo.md` is the historical ledger. The current version: `package.json`. What is on the registry: the
  registry itself (`WORKFLOWS.md`, Release step 7).
- Out-of-tree Lean proofs belong to the **`PhysJS`** repo, outside this one. That Lean
  project requires Mathlib and the Physlib package (the library Daniel calls PhysLean;
  repository `leanprover-community/physlib`). Both requires are firm. UPT records a reviewed
  `formalRef` and does not run Lean.
- Peer and fleet context lives on the peer's machine. Ask rather than assume; two honest
  observers disagreeing usually means *different objects*, not a broken instrument.
