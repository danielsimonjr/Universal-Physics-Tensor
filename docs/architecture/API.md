# Universal Physics Tensor — Public API Reference

> The public surface is snapshot-tested in `tests/api/public-surface.test.ts`: a snapshot pins every runtime export of the package root, and the `EXPECTED_RUNTIME_EXPORTS` and `ALL_TYPE_EXPORTS` lists pin named symbols. A symbol that the package root does not export is `@internal` and may change without notice.

---

## Table of Contents

1. [Stability Tiers](#stability-tiers)
2. [Bridge Catalog](#bridge-catalog)
3. [Constants](#constants)
4. [Dimensional Types and Algebra](#dimensional-types-and-algebra)
5. [AST and Validator](#ast-and-validator)
6. [Numerical Backend](#numerical-backend)
7. [Connection Layer](#connection-layer)
8. [Curvature Layer](#curvature-layer)
9. [Killing / Einstein-Equation / Curvature-Invariant Layer](#killing--einstein-equation--curvature-invariant-layer)
10. [Composition / Membership / Confrontation Layer](#composition--membership--confrontation-layer)
11. [Phase C/D Analysis, Namespacing Gate, and Related Exports](#phase-cd-analysis-namespacing-gate-and-related-exports)
12. [Canonical-Equation Registry (the L-layer)](#canonical-equation-registry-the-l-layer)
13. [Discovery Adjudication Ledger and Consequence Propagation](#discovery-adjudication-ledger-and-consequence-propagation)
14. [Real-Data Confrontation Subsystem](#real-data-confrontation-subsystem)
15. [Epistemic-Grounding Ledger](#epistemic-grounding-ledger)
16. [Core](#core)
17. [Type-Only Exports](#type-only-exports)

---

## Stability Tiers

| Tier | Meaning | Version guarantee |
|------|---------|-------------------|
| `@public` | Stable surface — symbols whose behavioral contract has settled across at least one minor release | Breaking changes require a major-version bump |
| `@internal` | Implementation detail — not re-exported from `src/index.ts` | May change at any time |

> **Coverage note**: the intelligent-index layer (`LabeledTensor`, `Cell`/regime registry, `bridgeGradient`, catalog adapter, BE-53/54 evaluators) is on the snapshot-tested public surface but is documented in its own tutorials (`intelligent-index-tutorial.md`, `bridge-gradient-tutorial.md`) rather than enumerated per-symbol here. The composition layer is summarized in [§10](#composition--membership--confrontation-layer) and [§11](#phase-cd-analysis-namespacing-gate-and-related-exports). These are likewise on the surface but deferred to the snapshot test + `CHANGELOG.md`: the `composeSymbolic`/Observable symbolic-composition layer, the public geometrized-units adapters `toGeometrized`/`fromGeometrized`/`geometrizedFactor`/`NonGeometrizableDimensionError`, the `BridgeEquations` evaluator facade, and the `LabeledTensor` `axisOrder`/`axisOf` + `mergeAxes`/`splitAxis` extension with its `AxisOrderError`/`AxisMergeError`/`AxisSplitError`. The adjudication ledger, consequence propagation, the unified confrontation registry and the epistemic-grounding ledger are itemized in [§13](#discovery-adjudication-ledger-and-consequence-propagation), [§14](#real-data-confrontation-subsystem), and [§15](#epistemic-grounding-ledger). `tests/api/public-surface.test.ts` remains the authoritative enumeration.

All symbols in this document are `@public` unless annotated otherwise.

---

## Bridge Catalog

### `BRIDGE_EQUATIONS` — constant array

The 58-entry bridge-equation catalog (IDs 11–68). Also published as a generated JSON artifact, `data/bridge-catalog.json` (`npm run catalog:json`).

**Kind**: constant (`BridgeEquationEntry[]`)
**Stability**: `@public`

```typescript
import { BRIDGE_EQUATIONS } from 'universal-physics-tensor';

// All established bridges
const established = BRIDGE_EQUATIONS.filter(e => e.status === 'established');

// Bridges bridging quantum and classical regimes
const qc = BRIDGE_EQUATIONS.filter(e =>
  e.bridges.includes('quantum') && e.bridges.includes('classical')
);
```

### Formal references for a catalog id

A `BRIDGE_EQUATIONS` entry does not carry `formalRef`. The reference for a catalog id is `catalogFormalRef` in `src/atlas/catalog-formal-ref.ts`. That function is not a package-root export. The object has `kind` and `url` in addition to `system`, `statement`, `version`, `axioms`, `fidelity`, and `covers`.

`kind` is `bridge`, `property`, `cross-check`, `reduction`, `limit`, or `derivation-step`. `url` is a permalink to that theorem's Lean file at the commit named in `version`. `SpringLc` and `DampedRlc` are namespaces inside `lean/PhysJS/OscillatorDictionary.lean`.

Passing the reference to `deriveEvidence` (the atlas subpath) lights `formally-proved` only when `kind` is `bridge`. A property lights `formally-proved-property`. A cross-check lights `formally-proved-cross-check`. Those two labels are shown and are not a proved bridge. A reduction, a limit, and a derivation-step light none of the three. The catalog evidence path still omits the reference, so a catalog row stays `proposed` or `contradicted`.

### `isActiveStatus(s)` — function

Type predicate that returns `true` for any status that is not `'invalid'`. Use to exclude deprecated catalog entries from active-research filters.

**Kind**: function
**Stability**: `@internal` to the main package entry — **not** re-exported from `src/index.ts`. `isActiveStatus` is defined in `src/bridges/index.ts`; `package.json` `exports` has no bridges subpath, so a consumer cannot import it at all. To filter out invalid entries from the main-package surface, compare `status` directly.

```typescript
import { BRIDGE_EQUATIONS } from 'universal-physics-tensor';

// isActiveStatus is not on the main public surface — compare status directly:
const active = BRIDGE_EQUATIONS.filter(e => e.status !== 'invalid');
```

### `evaluateGravitationalLensing(inputs)` — function

Evaluates the gravitational lensing deflection angle (bridge equation BE-51, Schwarzschild weak-field approximation).

**Kind**: function
**Stability**: `@public`

```typescript
import { evaluateGravitationalLensing } from 'universal-physics-tensor';

const result = evaluateGravitationalLensing({
  M_kg: 1.989e30,  // kg — solar mass
  b_m: 6.96e8,     // m — impact parameter (solar radius for grazing ray)
});
// result.alpha_rad: deflection in radians (result.alpha_arcsec in arc-seconds)
```

### `evaluatePerihelionPrecession(inputs)` — function

Evaluates the general-relativistic perihelion precession per orbit (bridge equation BE-52).

**Kind**: function
**Stability**: `@public`

```typescript
import { evaluatePerihelionPrecession } from 'universal-physics-tensor';

const result = evaluatePerihelionPrecession({
  M_kg: 1.989e30,  // kg — central mass
  a_m: 5.79e10,    // m — orbital semi-major axis
  e: 0.205,        // eccentricity
  T_yr: 0.2408,    // orbital period in years (per-century conversion)
});
// result.dphi_rad_per_orbit: radians per orbit
```

---

## Constants

Canonical flat CODATA 2018 / SI-defined physical constants — the single source of truth across the numerical, dimensional, and bridge layers (PC-1). Defined in `src/core/constants.ts`; each is a bare `number` in SI units.

**Kind**: constants (`number`)
**Stability**: `@public`

```typescript
import { C_SI, G_SI, HBAR_SI, K_B_SI } from 'universal-physics-tensor';

const rs = 2 * G_SI * solarMass / (C_SI ** 2);  // Schwarzschild radius
```

Full list:

- `C_SI` (speed of light)
- `G_SI` (Newtonian gravitation)
- `H_SI` (Planck)
- `HBAR_SI` (reduced Planck)
- `K_B_SI` (Boltzmann)
- `E_SI` (elementary charge)
- `ALPHA` (fine-structure constant, dimensionless)
- `M_P_SI` (Planck mass)
- `L_P_SI` (Planck length)
- `T_P_SI` (Planck time)
- `H0_SI` (Hubble constant)
- `M_SUN_SI` (solar mass)
- `M_E_SI` (electron mass)
- `B_WIEN_SI` (Wien displacement constant)

The legacy `PhysicalConstants` lookup object (see [Core](#core)) is a separate surface. Prefer the `*_SI` constants.

---

## Dimensional Types and Algebra

### `Dimension` — type

The seven base SI dimensions as a record of exponents.

**Kind**: interface
**Stability**: `@public`

```typescript
import type { Dimension } from 'universal-physics-tensor';

const energy: Dimension = { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
```

### Named dimension constants

Pre-built `Dimension` constants for common SI units.

**Kind**: constants
**Stability**: `@public`

```typescript
import { ENERGY, LENGTH, TIME, MASS, VELOCITY } from 'universal-physics-tensor';

// ENERGY ≡ { L:2, M:1, T:-2, ... }
// LENGTH ≡ { L:1, M:0, T:0, ... }
```

Full list: `DIMENSIONLESS`, `LENGTH`, `AREA`, `TIME`, `FREQUENCY`, `MASS`, `VELOCITY`, `ACCELERATION`, `FORCE`, `ENERGY`, `POWER`, `ACTION`, `TEMPERATURE`, `ENTROPY`, `CHARGE`.

### `multiply(a, b)` / `divide(a, b)` / `power(a, n)` — functions

Combine two `Dimension` values according to SI dimension algebra.

**Kind**: pure functions
**Stability**: `@public`

```typescript
import { multiply, divide, power, MASS, VELOCITY } from 'universal-physics-tensor';

const momentum = multiply(MASS, VELOCITY);        // kg·m/s
const kineticE  = multiply(MASS, power(VELOCITY, 2)); // J (up to factor 1/2)
```

### `add(a, b)` / `subtract(a, b)` — functions

Return the common `Dimension` if both operands agree; throw `DimensionMismatchError` otherwise.

**Kind**: pure functions
**Stability**: `@public`

```typescript
import { add, ENERGY } from 'universal-physics-tensor';

add(ENERGY, ENERGY); // returns ENERGY
add(ENERGY, LENGTH); // throws DimensionMismatchError
```

### `equals(a, b)` / `format(d)` — functions

`equals` compares two `Dimension` values. `format` returns a human-readable string (e.g., `"[energy]"`, `"L^2·M·T^-2"`).

**Kind**: pure functions
**Stability**: `@public`

```typescript
import { equals, format, ENERGY } from 'universal-physics-tensor';

equals(ENERGY, ENERGY); // true
format(ENERGY);          // '[energy]'
```

### `DimensionMismatchError` — error class

Thrown by `add` / `subtract` when operand dimensions disagree.

**Kind**: error class
**Stability**: `@public`

---

## AST and Validator

### `validate(node)` — function

Walks an `ExprNode` tree, infers SI dimensions, and returns a `ValidationResult`.

**Kind**: function
**Stability**: `@public`

```typescript
import { validate } from 'universal-physics-tensor';
import type { ExprNode } from 'universal-physics-tensor';
import { ENERGY } from 'universal-physics-tensor';

const node: ExprNode = { kind: 'symbol', name: 'E', dim: ENERGY };
const result = validate(node);
// result.ok === true
// result.inferredDimension === ENERGY
// result.violations === []
```

### `validateEquation(lhs, rhs)` — function

Validates two `ExprNode` trees independently and checks dimensional homogeneity.

**Kind**: function
**Stability**: `@public`

```typescript
import { validateEquation } from 'universal-physics-tensor';

const result = validateEquation(lhsNode, rhsNode);
// result.ok === false if lhs dim ≠ rhs dim
```

### `validateInverseMetricPair(gLower, gUpper)` — function

Opt-in structural check for a lower/upper metric pair. Returns warning-severity violations if the index structure suggests inconsistency.

**Kind**: function
**Stability**: `@public`

```typescript
import { validateInverseMetricPair } from 'universal-physics-tensor';

const warnings = validateInverseMetricPair(gLowerNode, gUpperNode);
// [] if structurally consistent, [Violation] if inconsistent
```

### `inferDimensionForBridge(bridgeId, expr)` — function

Infers the SI dimension of one bridge expression. If `EXPECTED_DIMENSION_BY_BRIDGE` has the bridge id, the inferred dimension is cross-checked against it. Returns `null` when the expression is dimensionally inconsistent or fails that check. Used by bridge modules that do not have full LHS/RHS AST encodings.

**Kind**: function
**Stability**: `@public`

---

## Numerical Backend

### `evaluateNumerical(node, inputs, options?)` — function

Validates an `ExprNode` AST and evaluates it numerically. Throws `NumericalBackendError` if the AST is invalid.

**Kind**: async function
**Stability**: `@public`

```typescript
import { evaluateNumerical, Float64ReferenceEngine } from 'universal-physics-tensor';
import type { NumericalInputs } from 'universal-physics-tensor';

const inputs: NumericalInputs = {
  E: [[1.0, 0.0], [0.0, 1.0]],  // 2×2 identity
  m: [[9.109e-31]],              // electron mass
};
const result = await evaluateNumerical(myNode, inputs);
// result.value — NestedArray (plain JS)
// result.dim   — inferred Dimension
// result.warnings — Violation[] (non-fatal)
```

### `evaluateNumericalRaw(node, inputs, options?)` — function

Like `evaluateNumerical` but returns a live `EngineTensor` for chaining. Call `.dispose()` when done.

**Kind**: async function
**Stability**: `@public`

### `evaluateMetricInverse(gInverse, g, inputs, tolerance?, options?)` — function

Numerically checks g^{ab} g_{bc} ≈ δ^a_c. Returns `{ residualNorm, warning?: Violation }`.

**Kind**: async function
**Stability**: `@public`

### `Float64ReferenceEngine` — class

The zero-dependency `TensorEngine` implementation. Default engine when no active engine has been set.

**Kind**: class (implements `TensorEngine`)
**Stability**: `@public`

```typescript
import { Float64ReferenceEngine, setActiveEngine } from 'universal-physics-tensor';

setActiveEngine(new Float64ReferenceEngine());
```

### `getActiveEngine()` / `setActiveEngine(engine)` — functions

Global active-engine management for the `evaluateNumerical()` default-engine path.

**Kind**: functions
**Stability**: `@public`

### `hasAutogradSupport(engine)` — function

Returns `true` iff the engine implements both `forwardGrad` and `reverseGrad`. Always check before invoking AD methods.

**Kind**: function
**Stability**: `@public`

```typescript
import { hasAutogradSupport, EngineCapabilityError } from 'universal-physics-tensor';

if (!hasAutogradSupport(engine)) {
  throw new EngineCapabilityError(engine.name, 'forwardGrad');
}
const { value, jacobian } = await engine.forwardGrad!(fn, x);
```

### `NumericalBackendError` — error class

Thrown by `evaluateNumerical()` when the AST fails validation or the lowering pass encounters an inconsistency.

**Kind**: error class
**Stability**: `@public`

### `EngineCapabilityError` — error class

Thrown when an AD method is invoked on an engine that does not implement it.

**Kind**: error class
**Stability**: `@public`

### `DuplicateCoordinateWarning` — warning class

A warning class for a covariant derivative whose `wrt` coordinate label collides with a free index of the operand. By default the collision throws `MetricSignatureError`. Only when `UPT_ALLOW_COORD_SHADOW=1` is set does validation emit this class through `process.emitWarning` instead. It never appears in `NumericalResult.warnings`.

**Kind**: warning class
**Stability**: `@public`

### `evaluateBE37CovariantEikonalNumerical(inputs)` — function

Numerical evaluation of the covariant eikonal phase for bridge equation BE-37 (Shapiro delay).

**Kind**: async function
**Stability**: `@public`

---

## Connection Layer

### `christoffel(gLower, gInverse, upper, lowerA, lowerB, xCoord)` — function

Builds the Christoffel symbol Γ^λ_μν as a composite `ExprNode` tree. Returns an AST node, not a number — it can be validated and passed to `evaluateNumerical()`.

**Kind**: function
**Stability**: `@public`

```typescript
import { christoffel } from 'universal-physics-tensor';

// Build Γ^t_rr for Schwarzschild metric
const gamma = christoffel(
  gLowerNode,    // MetricTensorNode (covariant)
  gUpperNode,    // MetricTensorNode (contravariant)
  't',           // free upper index λ
  'r',           // first free lower index μ
  'r',           // second free lower index ν
  xCoordNode,    // TensorSymbolNode for coordinate
);
// gamma is an ExprNode — pass to evaluateNumerical()
```

### `integrateGeodesic(inputs)` — function

RK4 integrator for the geodesic equation in an arbitrary Lorentzian manifold. No `TensorEngine` dependency.

**Kind**: function (synchronous)
**Stability**: `@public`

```typescript
import { integrateGeodesic } from 'universal-physics-tensor';

const result = integrateGeodesic({
  christoffelFn: schwarzschildChristoffelFn(M),  // (x, out?) => Float64Array(64)
  x0: [0, 100 * rs, Math.PI / 2, 0],  // start at r = 100·r_s
  v0: [1 / Math.sqrt(1 - rs / (100 * rs)), 0, 0, 0],
  tauStart: 0,
  tauEnd: 1000,
  steps: 1000,
});
// result.xFinal, result.vFinal: the final 4-position and 4-velocity
// result.trajectory: sampled 4-positions (about 100, plus the initial point)
```

---

## Curvature Layer

The curvature layer holds composite `ExprNode` helpers for the Ricci/Einstein/Bianchi objects, the GL4 symplectic integrator, and the perihelion finder.

### `ricci(R)` — function

Wraps a `RiemannTensorNode` and produces the contracted Ricci tensor R_μν = R^λ_{λμν} as a composite `ExprNode` (own validator + lowering arms — no AST rewrite).

**Kind**: function
**Stability**: `@public`

### `einstein(R, g, gInverse)` — function

Wraps a `RiemannTensorNode` plus a metric pair and produces the composite Einstein tensor G_μν = R_μν − ½ R g_μν as an `ExprNode`. Vacuum-Einstein scope.

**Kind**: function
**Stability**: `@public`

### `bianchiResidual(R)` — function

Returns `{ residual, evaluate, evaluateMax }` for the cyclic second-Bianchi-identity check ∇_{[λ} R_{μν]ρσ} = 0. Defined in `src/numerical/bianchi-residual.ts`.

**Kind**: function
**Stability**: `@public`

### `integrateGeodesicGL4(...)` — function

The GL4 (Gauss–Legendre 4th-order) symplectic integrator for the geodesic Hamiltonian — an alternative to the RK4 `integrateGeodesic` for long-time integration where energy drift matters. Signature: `integrateGeodesicGL4(initialState: GL4State, options: GL4Options): readonly GL4Snapshot[]`. The state is canonical (x, p), and the options take the inverse metric `gInverseFn` and its derivatives `dgInverseFn`. Defined in `src/numerical/gl4-integrator.ts`.

**Kind**: function
**Stability**: `@public`

### `findPerihelion(...)` — function

Perihelion finder over `(tau, x, p)` snapshots from `integrateGeodesicGL4`. The finder takes a cubic-Hermite root of dr/dτ. When the analytic root misses `tauTolerance`, the finder refines the root by bisection on the polynomial. The finder returns a `PerihelionResult`. Options are `FindPerihelionOptions`. Defined in `src/numerical/perihelion-finder.ts`.

**Kind**: function
**Stability**: `@public`

---

## Killing / Einstein-Equation / Curvature-Invariant Layer

This layer holds Killing-vector machinery, the Einstein field-equation node + numerical residual, and the Kretschmann curvature invariant.

### `verifyKillingEquation(...)` — function

Numerically checks the Killing equation ∇_μ ξ_ν + ∇_ν ξ_μ = 0 at a point, using a hybrid implementation (exact Christoffels + analytic metric derivatives). The function returns the raw max residual in the metric's units and does not read `KillingEquationOptions.tolerance`. Options are `KillingEquationOptions`; the layout-agnostic Christoffel accessor type is `ChristoffelAccess`. Defined in `src/numerical/killing.ts`.

**Kind**: function
**Stability**: `@public`

### `checkKillingEquation(...)` — function

Applies `KillingEquationOptions.tolerance` (default 1e-10) to the relative residual. It runs `verifyKillingEquation` and returns `{ residual, relativeResidual, withinTolerance }`, where `relativeResidual = residual / max(max|g_μν(x)|, 1)`. Throws `RangeError` when `tolerance` is not a finite positive number. The result type is `KillingEquationCheck`. Defined in `src/numerical/killing.ts`.

**Kind**: function
**Stability**: `@public`

### `evaluateConservedCharge(...)` — function

Evaluates the conserved charge Q = ξ^μ p_μ along a geodesic. Defined in `src/numerical/killing.ts`.

**Kind**: function
**Stability**: `@public`

### `validateEinsteinFieldEquation(node)` — function

Structural validator for an `EinsteinFieldEquationNode` (the AST predicate for G_μν + Λ g_μν = (8πG/c⁴) T_μν). Checks free-index agreement, per-component dim equality [L⁻²], and symmetry agreement. Returns an `EinsteinFieldEquationValidationResult`. Defined in `src/dimensional/einstein-equation.ts`.

**Kind**: function
**Stability**: `@public`

### `evaluateEinsteinEquationResidual(input)` — function

Computes the scale-normalized max residual |G_μν + Λ g_μν − κ T_μν| / |g_μν| at a coordinate point. Accepts metric closures (`MetricClosure`) + a stress-energy closure (`EinsteinEquationResidualInput`, `Vec4`); returns a dimensionless relative residual. For Schwarzschild vacuum the residual is the finite-difference truncation floor (~1e-10 relative). Defined in `src/numerical/einstein-equation.ts`.

**Kind**: function
**Stability**: `@public`

### `validateKretschmannScalar(node)` — function

Structural validator for a `KretschmannScalarNode` (K = R_{ρσμν} R^{ρσμν}; scalar, dim [L⁻⁴]). Returns a `KretschmannScalarValidationResult`. Defined in `src/dimensional/curvature-invariants.ts`.

**Kind**: function
**Stability**: `@public`

### `computeKretschmann(...)` — function

Numerical contraction of the Kretschmann scalar — uses factored index-raising (4×4⁵ multiply-adds instead of the O(4⁸) naive contraction), diagnostic/sample-point use only. Defined in `src/numerical/kretschmann.ts`.

**Kind**: function
**Stability**: `@public`

> The `WeylTensorNode` AST kind and the `CurvatureCompositeNode<K,S>` factory also exist, but are `@internal` to the main package entry — the Weyl validator is not re-exported from `src/index.ts`. See `COMPONENTS.md §Curvature composite factory`.

---

## Composition / Membership / Confrontation Layer

This layer holds the composition graph (`src/composition/`), the computable bridge-membership criterion + negative catalog (`src/bridges/membership.ts`, `src/bridges/rejected.ts`), and the GW170817 real-data confrontation. All symbols below are `@public` and re-exported from `src/index.ts`.

### Composition graph (`src/composition/`)

- **`composeEdges(...)`** — the composition operator: chains compatible `BridgeEdge`s into a derived edge. Note the name — `composeEdges`, **not** `compose` (`compose` is the Cell factory).
- **`evaluateEdge(...)`** — apply a single edge's transfer function.
- **`regimesDiffer(a, b)`** — graph-native membership criterion over two `Quantity` endpoints.
- **`consistencyRatio(...)`** — compare a composed chain against an independent route.
- **`minConfidence(...)`** / **`QUANTITY_IDENTIFICATIONS`** — confidence combination and quantity-identification table used by `composeEdges`.
- **`CompositionDimensionError`** / **`CompositionJunctionError`** / **`DomainViolationError`** — error classes for incompatible compositions.
- **Calibration edges** — `be16Edge`, `be42Edge`, `be42ViaRsEdge`, `be51Edge`, `be52Edge`, `lawSchwarzschildRadius` (the first diagonal-law edge), and the `M_SUN_KG` anchor constant, plus `be12Edge`, `be11ZurekEdge` (CT-3), and `be37Edge` (CT-4). The CT-1 target derives E_min(M) = ℏc³ln2/(8πGM) from BE-42∘BE-16.
- **Catalog edges** — the tranche `be14Edge`/`be19Edge`/`be21Edge`/`be48Edge`/`be53Edge`/`be54Edge` is individually on the root surface. The `CATALOG_FULL_EDGES` array adds 26 more edges: the array is on the root surface, and the per-edge exports stay at the composition barrel. Together with the 5 proved-seed edges they bring the graph to 46 edges. See [§11](#phase-cd-analysis-namespacing-gate-and-related-exports).

```typescript
import { composeEdges, be42Edge, be16Edge } from 'universal-physics-tensor';

const eMinOfM = composeEdges(be42Edge, be16Edge);  // M → T_H → E_min
```

### Membership criterion + negative catalog (`src/bridges/membership*.ts`, `rejected.ts`)

- **`adjudicateBridgeEntry(entry)`** — returns a `BridgeVerdict` (`'bridge' | 'not-a-bridge' | 'unadjudicated'`) for one catalog entry (tuple proxy + rejected-registry overlay).
- **`adjudicateCatalog(...)`** — whole-catalog adjudication; returns a `CatalogAdjudicationReport`.
- **`REJECTED_BRIDGE_ADJUDICATIONS`** / **`REJECTED_BRIDGE_IDS`** — the negative catalog: BE-28/29/32/35/40 adjudicated NOT-A-BRIDGE with reasons. BE-42 is adjudicated a bridge (`['gravity','quantum']`); BE-44/46/50 are unadjudicated. See `docs/architecture/v0.8.0-catalog-adjudication.md`.

### GW170817 confrontation (`src/bridges/be36-gw170817-confrontation.ts`)

- **`confrontBE36(...)`** — confronts the BE-36 GW-speed bound with a `GWSpeedObservation`; returns a `BE36ConfrontationResult`.
- **`GW170817`** — the multi-messenger observation constant (the first real-data record in the codebase).

Type-only additions: `Quantity`, `RegimeAttributes`, `BridgeEdge`, `EdgeConfidence`, `ValidityDomain`, `ComposeOptions`, `QuantityIdentification`, `BridgeVerdict`, `CatalogAdjudicationReport`, `RejectedBridgeAdjudication`, `BE36ConfrontationResult`, `GWSpeedObservation`.

---

## Phase C/D Analysis, Namespacing Gate, and Related Exports

Everything in this section is `@public` and re-exported from `src/index.ts` unless noted otherwise.

### Phase-D enumeration + uncertainty propagation

- **`enumerateCompositions(...)`** — the Phase-D candidate enumerator: walks all ordered edge pairs, attempts composition, and returns an `EnumerationReport` of `CompositionCandidate`s (`all`, split into `registered` vs. `novel` against `REGISTERED_COMPOSITION_IDS`) and the alias collisions held at the gate (`requiresDisposition`, typed `DispositionRequired`). Junction and dimension refusals are skipped, not reported.
- **`propagateUncertainty(...)`** — first-order uncertainty propagation via a central-difference Jacobian over an edge's transfer function; returns an `UncertaintyResult`. Works on composed edges for free.
- **`confrontBE36WithUncertainty(...)`** — GW170817 confrontation with propagated observational uncertainty (returns `BE36ConfrontationWithUncertainty`).
- **`classifyIdentifiability(edges, known, target, opts?)`** / **`classifyAll(...)`** / **`forwardClosure(...)`** — the structural identifiability classifier. Counts a target's independent derivations from a known-quantity set. Returns an `IdentifiabilityResult` with an `IdentifiabilityVerdict`: `under-determined` / `exactly-determined` / `over-determined` / `given`. The over-determined surplus are falsifiable consistency constraints. Structural, not parametric; honors `QUANTITY_IDENTIFICATIONS`; excludes circular self-support. Types: `IdentifiabilityVerdict`, `IdentifiabilityResult`, `IdentifiabilityOptions`.
- **`retrodict(edges, groundTruth, opts?)`** / **`retrodictNode(...)`** — the retrodiction harness (the framework's own falsification benchmark). Masks each over-determined node, recomputes it via every independent derivation from `groundTruth` values, and scores the spread (`consistent` / `inconsistent` / `single` / `unrecoverable`; headline `allConsistent`). Optional `references` add external-value scoring. Pass bar pre-registered (spread ≤ 1e-6). Types: `RetrodictionOutcome`, `RetrodictionPrediction`, `RetrodictionResult`, `RetrodictionReport`, `RetrodictionOptions`.
- **`explainQuantity(edges, target, known, opts?)`** — the unified entry point. It synthesizes the three primitives above into one `QuantityExplanation`, which holds:
  - the identifiability verdict;
  - per-derivation values + the consistency check (when `known` is a `name → value` map);
  - the dimensional sufficiency of the known set (Buckingham-π);
  - a plain-language `summary`.

   Each `DerivationExplanation` carries the `beId` of the bridge its last edge encodes. The summary counts independence by bridge, not by edge: two routes with the same `beId` (`be-42` and `be-42-via-rs`) restate one bridge, so their agreement is reported as agreement by construction, not as a consistency check.

   `known` may be a name list (structural + dimensional only) or values (adds recovery + consistency); `extraDimensions` declares dims for non-graph knowns (raw `G`, `c`, …). Types: `QuantityExplanation`, `DerivationExplanation`, `ExplainOptions`.

```typescript
import { enumerateCompositions, CATALOG_FULL_EDGES } from 'universal-physics-tensor';

const report = enumerateCompositions(CATALOG_FULL_EDGES);
// report.all / report.registered / report.novel / report.requiresDisposition
```

### Namespacing gate

- **`CompositionAliasError`** — thrown by `composeEdges` when both operands carry a same-named source quantity and no disposition is recorded.
- **`SOURCE_ALIAS_DISPOSITIONS`** — the reviewable registry of per-composition `AliasDisposition`s (`'shared'` or `{renameSecond}` with input remap); `composeEdges(…, { aliases })` is the per-call escape hatch.
- Type-only: `AliasDisposition`, `DispositionRequired`.
- The 131 centralized `Quantity` node constants live in `src/composition/quantities/`, and the `quantities.ts` barrel re-exports them. They are `@internal`: the edge files consume them, and they are not on the composition barrel or the root surface.

### Klein-Gordon dispersion evaluator

- **`evaluateKGDispersionResidual(input)`** / **`verifyKleinGordonPlaneWave(input)`** — plane-wave-sector dispersion check ω² = c²k² + (mc²/ℏ)². Types: `KGDispersionResidualInput`, `KGPlaneWaveVerifyInput`, `KGPlaneWaveVerifyResult`.

### BE-23 Planckian data confrontation

- **`confrontBE23(...)`** / **`confrontBE23WithUncertainty(...)`** — BE-23 SYK Planckian dissipation vs. the overdoped-cuprate aggregate (Legros et al. 2019). Constants: `PLANCKIAN_CUPRATES` (a `PlanckianObservation`), `PLANCKIAN_O1_BAND`. Result types: `BE23ConfrontationResult`, `BE23ConfrontationWithUncertainty`.

### Internal flat-metric types

`MetricFnFlat` and `DEFERRED_EVALUATOR_REGISTRY` are `@internal` (not on the root surface).

---

## Canonical-Equation Registry (the L-layer)

The **L-layer**: the textbook-physics "answer key" the catalog bridges are
validated against (Π = L + B + E). Each `CanonicalEquation` is multi-fidelity —
L0 dimensional signature / L1 scalar-AST / L2 field-equation — with
epistemic-honesty (`epistemicStatus`) and provenance fields. 109 equations. All symbols below are re-exported from `src/index.ts`; verify the
authoritative set in `tests/api/public-surface.test.ts`.

### Registry and accessors (`src/canonical/registry.ts`)

- **`CANONICAL_EQUATIONS`** — the assembled array of all `CanonicalEquation`
  entries (the L-layer registry).
- **`CANONICAL_BY_ID`** — a `Map` of equation id → `CanonicalEquation`.
- **`canonicalById(id)`** — look up a single equation by id.
- **`canonicalByDomain(domain)`** — all equations in a `CanonicalDomain`
  (mechanics, EM/circuits, fluids/waves, thermo, quantum/atomic, gravitation,
  cosmology, condensed-matter).
- **`partneredBridgeIds()`** — bridge ids that have a canonical partner.
- **`bridgesWithoutCanonicalPartner()`** — the complementary coverage gap (bridge
  ids with no canonical partner).

### Seeding the tensor (`src/canonical/seed-l-layer.ts`)

- **`canonicalToLaw(eq)`** — convert a `CanonicalEquation` to a `PhysicalLaw`.
- **`seedCanonicalLaws(tensor)`** — populate a `UniversalTensor`'s L-layer from
  the registry via `addLaw`.
- **`CANONICAL_TENSOR_CONFIG`** — the tensor configuration used for L-layer
  seeding.

### Canonical graph (`src/composition/`)

- **`CANONICAL_GRAPH`** — the textbook-physics-only composition graph (the
  `--source=canonical` graph; 109 `law` edges).
- **`canonicalToEdges(...)`** — derive graph edges from canonical equations.
- **`CANONICAL_CONSTANTS`** — the canonical physical-constant set used by the
  canonical graph.

### Structural normal form and linkage (`src/canonical/`)

- **`normalForm(node)`** / **`structurallyEqual(a, b)`** — the structural hash
  (equal up to dimensionless *constants*; named non-constant stubs like
  `ln⟨e^−βW⟩` are kept distinct) and its equality predicate
  (`src/canonical/normal-form.ts`).
- **`classifyLinkage(...)`** / **`scanLinkages(...)`** — the bridge↔canonical
  validator with the F4 circularity guard: distinguishes a genuine `recovers`
  from a `restates-canonical` self-reference (`src/canonical/linkage.ts`, surfaced
  via `upt recover`).

Types: **`CanonicalEquation`**, **`CanonicalDomain`**, **`EpistemicStatus`**,
**`CanonicalForms`**, **`FieldEquationNode`** (`canonical-equation.ts`);
**`LinkageResult`**, **`RecoveryOutcome`** (`linkage.ts`).

## Discovery Adjudication Ledger and Consequence Propagation

Review memory and a machine pre-classifier sit on top of the existing
discovery funnel
(`rankDiscoveries`, `src/composition/discovery.ts`). Both are annotation-only
passes: they never mutate the catalog, graphs, or funnel verdicts.

### Discovery funnel entry point

**`rankDiscoveries(...)`** — the discovery funnel's entry point (vets
link-candidate identifications against the inference suite). Exported from
the package root alongside `VettedCandidate`, so consumers can
build the adjudication/consequence/grounding annotators' input via public API
without reaching into `src/composition/discovery.js`.

**Kind**: function
**Stability**: `@public`

Type-only: `VettedCandidate` — the funnel's per-candidate output shape
(`dim`, `numericallyConsistent`, `magnitudeChecked`/`ordersApart`,
`axisChecked`/`axisClashes`, and the `verdict` discriminant:
`magnitude-clash` / `contradictory` / `axis-clash` / `promising` / `inert`).

Product B (`upt probe`, `src/composition/probe/`) is **not** on this root surface.
Import `universal-physics-tensor/probe` for the experimental barrel, or use the CLI.
Those symbols are `@internal` and may change without a major version bump.

### Adjudication ledger

Human verdicts on identification hypotheses (`a ≟ b`) as review memory — once
a physicist has disposed of a candidate, the funnel must not re-surface it as
fresh. Verdicts never mutate the catalog or graphs; they annotate discovery
output only.

- **`candidateId(a, b)`** — stable order-normalized identity for an
  identification hypothesis (`a~b`, sorted).
- **`ADJUDICATIONS`** — the seeded verdict array.
- **`adjudicationFor(a, b)`** — look up the verdict for an identification,
  order-insensitive.
- **`annotateAdjudications(candidates)`** — attaches each candidate's recorded
  verdict, if any; a pure map that preserves order and length.

```typescript
import { rankDiscoveries, annotateAdjudications } from 'universal-physics-tensor';

const ranked = rankDiscoveries(/* ... */);
const annotated = annotateAdjudications(ranked);
// annotated[i].adjudication?.verdict — 'genuine' | 'decoy' | 'entailed' | 'deferred'
```

**Kind**: functions + constant
**Stability**: `@public`

Type-only: `AdjudicationVerdict`, `CandidateAdjudication`, `AnnotatedCandidate`.

### Consequence propagation

A post-pass annotator over ranked candidates (mirrors `annotateAdjudications`).
For each `promising` candidate, it derives the monomial algebraic consequence
and compares the consequence against the canonical registry. The label is
`entailed` (re-derives known physics), `novel-consequence` (valid, no canonical
match), or `inconclusive` (no monomial consequence derivable).

- **`annotateConsequences(candidates)`** — generic over the input candidate
  type (`<T extends VettedCandidate>`), so it composes with
  `annotateAdjudications`'s output without losing fields.
- **`classifyProposal(proposal, canonical?)`** — classifies one derived
  proposal against the canonical registry (defaults to `CANONICAL_EQUATIONS`).

**Kind**: functions
**Stability**: `@public`

Type-only: `ConsequenceSignal` (`'entailed' | 'novel-consequence' | 'inconclusive'`),
`ConsequenceEvidence`, `ConsequenceAnnotatedCandidate`.

---

## Real-Data Confrontation Subsystem

`upt confront` and its underlying registry — the catalog's real-data spine.
The registry holds one entry per data-confronted bridge; `listConfrontations()`
returns them in bridge-id order.

### Typed observation + outcome layer (`src/bridges/observations/types.ts`)

- **`ConfrontationOutcome`** — the normalized result, discriminated on `kind`
  so each confrontation carries only the fields it can honestly populate:
  - `'value'` — `predicted`/`observed`/`sigma`/`residualInSigma`/`withinObserved`.
  - `'upper-bound'` — `predicted`/`bound`/`satisfied`, plus an optional
    **`caveat`** field surfacing an honesty note such as a
    one-sided pass against a symmetric encoded bound (BE-36).
  - `'consistency'` — `predicted`/`approaches`/`fractionalGap`.
  - `'table'` — a `rows` array of per-row value comparisons.
  - Every arm also carries `units` and `provenance`.
- **`residualInSigma(predicted, observed, sigma)`** — `|predicted − observed|`
  in units of the observed 1σ.
- **`combineInQuadrature(components)`** — combined 1σ from named
  `SigmaComponent[]` (root-sum-square).

**Kind**: functions + discriminated-union type
**Stability**: `@public`

Type-only: `ObservationProvenance` (citation/year/retrieved/note — mandatory
on every observation record), `SigmaComponent`, `ObservationKind`
(`'value' | 'upper-bound' | 'consistency' | 'table'`).

### Unified registry (`src/bridges/confrontations.ts`)

```typescript
import { CONFRONTATIONS, listConfrontations, runConfrontation } from 'universal-physics-tensor';

for (const entry of listConfrontations()) {
  const outcome = entry.run();
  // outcome.kind discriminates the shape — see ConfrontationOutcome above
}

const be36 = runConfrontation(36); // ConfrontationOutcome | undefined
```

- **`CONFRONTATIONS`** — the registry (`ReadonlyMap<number, ConfrontationEntry>`,
  keyed by bridge id).
- **`listConfrontations()`** — all entries, ascending bridge-id order.
- **`runConfrontation(bridgeId)`** — run one confrontation; `undefined` if the
  id is not registered.

**Kind**: functions + constant
**Stability**: `@public`

Type-only: `ConfrontationEntry` (`bridgeId`, `title`, `kind`, `run()`).

### Per-bridge confrontations

Each wraps a bridge's own evaluator/formula against an independently-sourced
observation. All are `@public` and individually re-exported from
`src/index.ts` (in addition to being reachable via the unified registry
above).

| Bridge | Function | Observation constant | Kind |
|---|---|---|---|
| BE-52 (Mercury perihelion) | `confrontBE52` | `MERCURY` | value |
| BE-37 (Shapiro delay) | `confrontBE37` | `CASSINI` | value |
| BE-48 (GRW collapse rate) | `confrontBE48` | `LISA_PATHFINDER_CSL` | upper-bound |
| BE-51 (light deflection) | `confrontBE51` | `VLBI_LAMBERT_2009` | value |
| BE-21 (KSS viscosity bound) | `confrontBE21` | `KSS_BOUND`, `QGP_BMB19` | consistency |
| BE-35 (conformal bootstrap) | `confrontBE35` | `BOOTSTRAP_NU`, `BOOTSTRAP_NU_SIGMA`, `ISING_PELISSETTO_VICARI_2002` | value |
| BE-11 (collisional decoherence) | `confrontBE11` | `DECOHERENCE_EXPERIMENTAL_TOLERANCE`, `COLLISIONAL_HORNBERGER_2003` | consistency |
| BE-36 (GW speed, GW170817) | `confrontBE36` / `confrontBE36WithUncertainty` | `GW170817` | upper-bound |
| BE-23 (Planckian dissipation) | `confrontBE23` / `confrontBE23WithUncertainty` | `PLANCKIAN_CUPRATES`, `PLANCKIAN_O1_BAND` | value |
| BE-55 (quantum Hall universality) | `confrontBE55` | `QH_UNIVERSALITY_JANSSEN_2012` | consistency |
| BE-56 (Casimir force) | `confrontBE56` | `CASIMIR_MOHIDEEN_ROY_1998` | consistency |
| BE-58 (Johnson-Nyquist noise) | `confrontBE58` | `JNT_FLOWERS_JACOBS_2017`, `K_B_CODATA_2014` | value |
| BE-59 (AC Josephson universality) | `confrontBE59` | `JOSEPHSON_UNIVERSALITY_BIPM` | consistency |
| BE-60 (fractional quantum Hall plateau) | `confrontBE60` | `FQH_PLATEAU_TSUI_1982` | consistency |
| BE-61 (Wiedemann-Franz Lorenz number) | `confrontBE61` | `LORENZ_SILVER_2023` | consistency |
| BE-62 (BCS gap ratio) | `confrontBE62` | `BCS_RATIO_TIN` | consistency |
| BE-63 (Chandrasekhar mass) | `confrontBE63` | `WHITE_DWARF_MAX_MASS` | consistency |
| BE-64 (Eddington luminosity) | `confrontBE64` | `EDDINGTON_RATIO_BRIGHT` | consistency |
| BE-65 (Jeans mass) | `confrontBE65` | `MOLECULAR_CLOUD_FRAGMENT` | consistency |

BE-36 and BE-23 predate the unified `ConfrontationOutcome` shape. Their native
result types — `BE36ConfrontationResult`, `BE23ConfrontationResult`, etc. —
stay the direct return type of their own `confront*` functions. The registry
above adapts those types to `ConfrontationOutcome` internally. Both bridges
are already documented in [§10](#composition--membership--confrontation-layer) and
[§11](#phase-cd-analysis-namespacing-gate-and-related-exports).

Each of the other seventeen confrontation functions' own result type is also
`@public` and exported:

- `BE52ConfrontationResult`/`PerihelionObservation`
- `BE37ConfrontationResult`/`CassiniObservation`
- `BE51ConfrontationResult`/`VLBIDeflectionObservation`
- `BE48ConfrontationResult`/`CollapseBoundObservation`
- `BE21ConfrontationResult`/`QGPViscosityObservation`
- `BE35ConfrontationResult`/`IsingExponentObservation`
- `BE11ConfrontationResult`/`CollisionalDecoherenceObservation`
- `BE55ConfrontationResult`/`QHUniversalityObservation`
- `BE56ConfrontationResult`/`CasimirAgreementObservation`
- `BE58ConfrontationResult`/`JNTObservation`
- `BE59ConfrontationResult`/`JosephsonUniversalityObservation`
- `BE60ConfrontationResult`/`FractionalQHObservation`
- `BE61ConfrontationResult`/`LorenzNumberObservation`
- `BE62ConfrontationResult`/`BCSRatioObservation`
- `BE63ConfrontationResult`/`WhiteDwarfMassObservation`
- `BE64ConfrontationResult`/`EddingtonRatioObservation`
- `BE65ConfrontationResult`/`CloudFragmentObservation`

```typescript
import { confrontBE52, MERCURY } from 'universal-physics-tensor';

const result = confrontBE52();
// result.predicted_arcsec_per_century / result.observed_arcsec_per_century
// result.residual_in_sigma / result.withinObserved
```

### Deciding-measurement elasticity (`src/bridges/sensitivity.ts`)

**`decidingMeasurement(bridgeId)`** — for a value-kind confrontation, ranks
its numeric inputs by dimensionless log-sensitivity
`E_i = |∂P/∂x_i|·x_i/P` (central finite differences, descending). The ranking
shows which input the prediction depends on MOST STRONGLY, not which
dominates the uncertainty budget. Returns `[]` for a non-value-kind or unregistered id.

```typescript
import { decidingMeasurement } from 'universal-physics-tensor';

const ranking = decidingMeasurement(52); // Elasticity[], descending by |E_i|
// ranking[0] — the input BE-52's prediction depends on most strongly
```

**Kind**: function
**Stability**: `@public`

Type-only: `Elasticity` (`{ input: string; elasticity: number }`).

---

## Epistemic-Grounding Ledger

A pure, derived view over a `VettedCandidate`'s already-computed falsifier
results. The view is part of the PI-instrument program, which reframes the
discovery funnel as an honest falsification instrument (a trustworthy *no*,
an extraordinary *yes*). Annotation-only: it changes no verdict, score, or
count.

**`describeGrounding(candidate, consequence?)`** — derives the ledger from a
candidate's existing falsifier results (and, optionally, its
`ConsequenceSignal` from `annotateConsequences`). The ledger reports:

- the gates that actually ran a real comparison, where the candidate survived (`passed`);
- the gates that could not test the candidate or produced an unadjudicated result (`gaps`);
- the honest, permanent ceiling for a dimensional discovery candidate:
  - `mechanismTested: false` (axis-compatibility is a regime proxy, not a
    mechanism test);
  - `dataTested: false` (candidates are unconfrontable until promoted to an
    established bridge).

```typescript
import { describeGrounding } from 'universal-physics-tensor';

const grounding = describeGrounding(candidate);
// grounding.passed  — e.g. ['numerical-consistency', 'magnitude (2.1 orders)']
// grounding.gaps    — e.g. ['axis (regime attributes unresolved)']
// grounding.mechanismTested === false
// grounding.dataTested === false
```

**Kind**: function
**Stability**: `@public`

Type-only: `CandidateGrounding`.

---

## Core

### `UniversalTensor` — class

The original high-level tensor facade. Provides a typed wrapper around tensor data with metadata.

**Kind**: class
**Stability**: `@public`

### `PhysicalConstants` — constant object

SI values of fundamental physical constants: G, c, ℏ, k_B, and others.

**Kind**: constant
**Stability**: `@public`

```typescript
import { PhysicalConstants } from 'universal-physics-tensor';

const rs = 2 * PhysicalConstants.G * solarMass / (PhysicalConstants.c ** 2);
```

---

## Type-Only Exports

The following are type-only symbols erased at runtime. They appear in `src/index.ts` as `export type { ... }` and in `dist/index.d.ts` but are not present in `Object.keys(root)`.

> The table below lists the core, dimensional, numerical, connection, curvature and Killing/field-equation types. The intelligent-index types, the types listed in [§10](#composition--membership--confrontation-layer), [§11](#phase-cd-analysis-namespacing-gate-and-related-exports) and [§13](#discovery-adjudication-ledger-and-consequence-propagation)–[§15](#epistemic-grounding-ledger), and the types of the symbolic-composition layer, the public geometrized adapters, the `BridgeEquations` facade and the `LabeledTensor` axis-order / `mergeAxes`-`splitAxis` extension are all pinned by `tests/api/public-surface.test.ts` (`ALL_TYPE_EXPORTS`) but not rowed in the table below.

| Symbol | Module | Description |
|--------|--------|-------------|
| `Dimension` | `dimensional/types` | Seven-component SI dimension record |
| `ExprNode` | `dimensional/validator` | The AST union type |
| `ValidationResult` | `dimensional/validator` | Return type of `validate()` |
| `Violation` | `dimensional/validator` | Single dimensional mismatch entry |
| `TensorEngine` | `numerical/tensor-engine` | The compute contract interface |
| `EngineTensor` | `numerical/tensor-engine` | Opaque rank-N tensor handle |
| `EinsumSpec` | `numerical/tensor-engine` | Engine-agnostic contraction plan |
| `NumericalResult` | `numerical/index` | Return type of `evaluateNumerical()` |
| `NumericalRawResult` | `numerical/index` | Return type of `evaluateNumericalRaw()` |
| `EvaluateOptions` | `numerical/index` | Per-call options for the evaluator |
| `NumericalInputs` | `numerical/types` | Input bundle mapping names to tensors |
| `NestedArray` | `numerical/types` | Recursive `number | NestedArray[]` type |
| `GridField` | `numerical/grid-field` | Spatial grid data for `NumericalInputs.grids` |
| `BridgeEquationEntry` | `bridges/index` | Single catalog entry shape |
| `BridgeEquationStatus` | `bridges/index` | Status discriminated union |
| `BridgeIssueSeverity` | `bridges/index` | Known-issue severity |
| `BridgeIssueFixable` | `bridges/index` | Known-issue fixability |
| `KnownIssue` | `bridges/index` | Single known-issue entry |
| `GravitationalLensingInputs` | `bridges/index` | Input type for `evaluateGravitationalLensing` |
| `GravitationalLensingResult` | `bridges/index` | Result type for `evaluateGravitationalLensing` |
| `PerihelionPrecessionInputs` | `bridges/index` | Input type for `evaluatePerihelionPrecession` |
| `PerihelionPrecessionResult` | `bridges/index` | Result type for `evaluatePerihelionPrecession` |
| `GeodesicIntegratorInputs` | `numerical/geodesic-integrator` | Input bundle for `integrateGeodesic` |
| `GeodesicIntegratorResult` | `numerical/geodesic-integrator` | Return type of `integrateGeodesic` |
| `CovariantDerivativeNode` | `dimensional/validator` | AST node for ∇_μ |
| `ForwardGradResult` | `numerical/tensor-engine` | Return type of `engine.forwardGrad()` |
| `ReverseGradResult` | `numerical/tensor-engine` | Return type of `engine.reverseGrad()` |
| `GL4State` | `numerical/index` | GL4 integrator trajectory state |
| `GL4Snapshot` | `numerical/index` | Per-step GL4 snapshot |
| `GL4Options` | `numerical/index` | GL4 integrator options |
| `PerihelionResult` | `numerical/index` | Return type of `findPerihelion` |
| `FindPerihelionOptions` | `numerical/index` | Options for `findPerihelion` |
| `RicciTensorNode` | `dimensional/validator` | AST node for R_μν (via `ricci`) |
| `EinsteinTensorNode` | `dimensional/validator` | AST node for G_μν (via `einstein`) |
| `BianchiResidualNode` | `dimensional/validator` | AST node for the Bianchi residual |
| `KillingEquationOptions` | `numerical/killing` | Options for `verifyKillingEquation` and `checkKillingEquation` |
| `KillingEquationCheck` | `numerical/killing` | Return type of `checkKillingEquation` |
| `ChristoffelAccess` | `numerical/killing` | Layout-agnostic Christoffel accessor |
| `EinsteinEquationResidualInput` | `numerical/einstein-equation` | Input bundle for `evaluateEinsteinEquationResidual` |
| `MetricClosure` | `numerical/einstein-equation` | Metric-closure callback type |
| `Vec4` | `numerical/einstein-equation` | 4-vector coordinate tuple |
| `EinsteinFieldEquationNode` | `dimensional/einstein-equation` | AST node for the Einstein field equation |
| `EinsteinFieldEquationValidationResult` | `dimensional/einstein-equation` | Return type of `validateEinsteinFieldEquation` |
| `KretschmannScalarNode` | `dimensional/curvature-invariants` | AST node for the Kretschmann scalar |
| `KretschmannScalarValidationResult` | `dimensional/curvature-invariants` | Return type of `validateKretschmannScalar` |
| `TensorConfig` / `TensorIndices` | `core/types` | Core tensor metadata types |
| `PhysicalLaw` / `BridgeEquation` / `EmergentPhenomenon` | `core/types` | High-level physics ontology types |
| `PhysicalScale` / `Force` / `Symmetry` / `InformationMeasure` | `core/types` | High-level physics ontology types |

---

See `ARCHITECTURE.md` for module design context. See `COMPONENTS.md` for per-component breakdown. See `DATAFLOW.md` for concrete data-flow traces through the system.

---

**Maintained by**: Daniel Simon Jr.

## Verification

Generated by `repo_map.py map`.
Regenerate: `python repo_map.py map <repo> --out <dir>` · Check: `python repo_map.py check <repo> --docs docs/architecture`

| Claim | Value | Source |
|---|---|---|
| totalExports | 3697 | dependency-graph.json |
| unusedExportsCount | 198 | dependency-graph.json |

**`unusedExportsCount` is not a deletion list.** It counts exports with no importer *inside
this repository*. The package is a published library: its public surface exists for consumers who are
not in the graph. Confirm with a second method before removing anything.
