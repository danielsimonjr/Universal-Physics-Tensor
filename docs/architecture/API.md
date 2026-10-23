# Universal Physics Tensor — Public API Reference

> The public surface is snapshot-tested in `tests/api/public-surface.test.ts`: a snapshot pins every runtime export of the package root, and the `PRESENT` and `ALL_TYPE_EXPORTS` lists pin named symbols. A symbol tagged `@internal` can change at any time. The package root and the `numerical/mathts-engine` subpath export the `@public` symbols. The `probe` and `atlas` subpaths export `@internal` symbols.

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
18. [Other Root Exports](#other-root-exports)
19. [Verification](#verification)

---

## Stability Tiers

| Tier | Meaning | Version guarantee |
|------|---------|-------------------|
| `@public` | Stable surface | Breaking changes require a major-version bump |
| `@internal` | Implementation detail. A subpath of `package.json` `exports` can still expose it | May change at any time |

> **Coverage note**: the intelligent-index layer (`LabeledTensor`, `Cell`/regime registry, the bridge parameter gradients `bridgeGradientNumerical`/`bridgeGradientAST`, catalog adapter) is on the snapshot-tested public surface. The tutorials (`intelligent-index-tutorial.md`, `bridge-gradient-tutorial.md`) cover `LabeledTensor`, `Axes` and the bridge gradients. `Cell`, the regime registry and the catalog adapter are in the snapshot test only. The closed-form evaluation `evaluateRelation` is itemized in the Bridge Catalog section. The composition layer is summarized in [§10](#composition--membership--confrontation-layer) and [§11](#phase-cd-analysis-namespacing-gate-and-related-exports). These are likewise on the surface but deferred to the snapshot test + `CHANGELOG.md`: the `composeSymbolic`/Observable symbolic-composition layer, the public geometrized-units adapters `toGeometrized`/`fromGeometrized`/`geometrizedFactor`/`NonGeometrizableDimensionError`, and the `LabeledTensor` `axisOrder`/`axisOf` + `mergeAxes`/`splitAxis` extension with its `AxisOrderError`/`AxisMergeError`/`AxisSplitError`. The adjudication ledger, consequence propagation, the unified confrontation registry and the epistemic-grounding ledger are itemized in [§13](#discovery-adjudication-ledger-and-consequence-propagation), [§14](#real-data-confrontation-subsystem), and [§15](#epistemic-grounding-ledger). `tests/api/public-surface.test.ts` is the authoritative enumeration.

All symbols in this document are `@public` unless annotated otherwise.

---

## Bridge Catalog

### `BRIDGE_EQUATIONS` — constant array

The catalog holds one entry per bridge equation, in id order. `BRIDGE_EQUATIONS` is the projection of `data/bridge-catalog.json`. That file is the source. `npm run catalog:json` checks it.

**Kind**: constant (`readonly BridgeEquationEntry[]`)
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

`kind` is `bridge`, `property`, `cross-check`, `reduction`, `limit`, or `derivation-step`. `url` is a permalink to that theorem's Lean file at the release tag. `version` names the same tag. `SpringLc` and `DampedRlc` are namespaces inside `lean/OscillatorDictionary.lean`.

Passing the reference to `deriveEvidence` (the atlas subpath) lights `formally-proved` only when `kind` is `bridge`. A property lights `formally-proved-property`. A cross-check lights `formally-proved-cross-check`. Those two labels are shown and are not a proved bridge. A reduction, a limit, and a derivation-step light none of the three. The catalog evidence path passes a kind-`bridge` reference, so an adjudicated row's catalog evidence includes `formally-proved`. An unadjudicated row stays `proposed`.

### Filtering invalid entries

No status predicate is exported, and `package.json` `exports` has no bridges subpath. To exclude invalid entries, compare `status` with `'invalid'`.

```typescript
import { BRIDGE_EQUATIONS } from 'universal-physics-tensor';

const active = BRIDGE_EQUATIONS.filter(e => e.status !== 'invalid');
```

### Evaluating a catalog relation — `evaluateRelation(id, bindings)`

The light-bending deflection (BE-51) and the perihelion advance (BE-52) are catalog relations and evaluate through the one evaluator, by id. `id` is a string or a number. The result is an `Evaluation`: check `kind === 'value'` before you read `value`.

**Kind**: function
**Stability**: `@public`

```typescript
import { evaluateRelation } from 'universal-physics-tensor';

const deflection = evaluateRelation('be-51', {
  M_kg: 1.989e30,  // kg — solar mass
  b_m: 6.96e8,     // m — impact parameter (solar radius for grazing ray)
});
if (deflection.kind === 'value') {
  // deflection.value is the deflection angle in radians (8.49e-6)
}

const advance = evaluateRelation('be-52', {
  M_kg: 1.989e30,       // kg — central mass
  a_m: 5.79e10,         // m — orbital semi-major axis
  eccentricity: 0.205,  // orbital eccentricity (a bare e is the elementary charge)
});
if (advance.kind === 'value') {
  // advance.value is Δφ per orbit in radians (5.02e-7)
}
```

---

## Constants

Physical constants in SI units, the single source of truth across the numerical, dimensional, and bridge layers. Most are CODATA 2022 or SI-defined values. `H0_SI`, `M_SUN_SI` and `GM_SUN_SI` are conventional values. Defined in `src/core/constants.ts`; each is a bare `number` in SI units.

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
- `GM_SUN_SI` (IAU nominal solar gravitational parameter, m³ s⁻²)
- `M_SUN_KG` (solar mass in kilograms, the same value as `M_SUN_SI`)
- `VON_KLITZING_SI` (von Klitzing constant, h/e²)
- `JOSEPHSON_CONSTANT_SI` (Josephson constant, 2e/h)
- `LORENZ_NUMBER_SI` (Lorenz number)
- `BCS_GAP_RATIO` (weak-coupling BCS gap ratio, dimensionless)
- `LANE_EMDEN_OMEGA3` (Lane–Emden n = 3 dimensionless radius)
- `THOMSON_CROSS_SECTION_SI` (Thomson cross section)
- `M_PROTON_SI` (proton mass; tagged `@internal`)

The `PhysicalConstants` lookup object (see [Core](#core)) is a separate surface. Prefer the `*_SI` constants.

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
import { add, ENERGY, LENGTH } from 'universal-physics-tensor';

add(ENERGY, ENERGY); // returns ENERGY
add(ENERGY, LENGTH); // throws DimensionMismatchError
```

### `equals(a, b)` / `format(d)` — functions

`equals` compares two `Dimension` values. `format` returns a string such as `[energy]` for a named dimension, `[L^2 M T^-2]` for any other, and `[1]` for dimensionless.

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

Infers the dimension of each side. It reports a violation when the dimensions differ or when the free indices differ. `inferredDimension` is the dimension of `lhs`.

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

Infers the SI dimension of one bridge expression. If `EXPECTED_DIMENSION_BY_BRIDGE` has the bridge id, the inferred dimension is cross-checked against it. Returns `null` when the expression is dimensionally inconsistent or fails that check. A caller uses it to check an `ExprNode` against the dimension that the catalog row records.

**Kind**: function
**Stability**: `@public`

---

## Numerical Backend

### `evaluateNumerical(node, inputs, options?)` — function

Validates an `ExprNode` AST and evaluates it numerically. Throws `NumericalBackendError` if the AST is invalid.

**Kind**: async function
**Stability**: `@public`

```typescript
import { evaluateNumerical } from 'universal-physics-tensor';
import type { NumericalInputs } from 'universal-physics-tensor';

const inputs: NumericalInputs = {
  tensors: new Map([
    ['E', [[1.0, 0.0], [0.0, 1.0]]],  // 2×2 identity
    ['m', [[9.109e-31]]],              // electron mass
  ]),
};
const result = await evaluateNumerical(myNode, inputs);
// result.value — NestedArray (plain JS)
// result.dim   — inferred Dimension
// result.warnings — Violation[] (non-fatal)
```

### `evaluateNumericalRaw(node, inputs, options?)` — function

Like `evaluateNumerical` but returns a `NumericalRawResult`. Its `value` is a live `EngineTensor`. Call `result.dispose()` when you finish with the tensor.

**Kind**: async function
**Stability**: `@public`

### `evaluateMetricInverse(gInverse, g, inputs, tolerance?, options?)` — function

Numerically checks g^{ab} g_{bc} ≈ δ^a_c. Returns `{ residualNorm, warning?: Violation }`.

**Kind**: async function
**Stability**: `@public`

### Engine classes

No engine class is exported from the package root. `MathTSEngine` (implements `TensorEngine`) is on the `universal-physics-tensor/numerical/mathts-engine` subpath and is the engine `getActiveEngine()` returns.

```typescript
import { setActiveEngine } from 'universal-physics-tensor';
import { MathTSEngine } from 'universal-physics-tensor/numerical/mathts-engine';

setActiveEngine(new MathTSEngine());
```

### `getActiveEngine()` / `setActiveEngine(engine)` — functions

Global active-engine management for the `evaluateNumerical()` default-engine path. `getActiveEngine()` is async and returns a `Promise<TensorEngine>`. `setActiveEngine(engine)` is synchronous.

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

`MathTSEngine` throws it when the autograd package cannot load. A caller throws it when `hasAutogradSupport(engine)` returns false.

**Kind**: error class
**Stability**: `@public`

### `DuplicateCoordinateWarning` — warning class

A warning class for a covariant derivative whose `wrt` coordinate label collides with a free index of the operand. By default the collision throws `MetricSignatureError`. Only when `UPT_ALLOW_COORD_SHADOW=1` is set does validation emit this class through `process.emitWarning` instead. It never appears in `NumericalResult.warnings`.

**Kind**: warning class
**Stability**: `@public`

### `evaluateCovariantEikonalNumerical(inputs)` — function

Numerical evaluation of the covariant eikonal phase for bridge equation BE-37 (Shapiro delay).

**Kind**: async function
**Stability**: `@public`

---

## Connection Layer

### `christoffel(gLower, gInverse, upper, lowerA, lowerB, xCoord)` — function

Builds the Christoffel symbol Γ^λ_μν as a composite `ExprNode` tree. Returns an AST node, not a number — it can be validated and passed to `evaluateNumerical()`. Both metric nodes must be dimensionless (geometrized). A dimensional metric throws `TypeError`.

**Kind**: function
**Stability**: `@public`

```typescript
import { christoffel } from 'universal-physics-tensor';

// Build Γ^t_tr for the Schwarzschild metric
const gamma = christoffel(
  gLowerNode,    // MetricTensorNode (covariant)
  gUpperNode,    // MetricTensorNode (contravariant)
  't',           // free upper index λ
  't',           // first free lower index μ
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
import { integrateGeodesic, G_SI, C_SI } from 'universal-physics-tensor';

const M = 1.989e30;                // central mass in kg
const rs = (2 * G_SI * M) / C_SI ** 2;  // Schwarzschild radius

const result = integrateGeodesic({
  christoffelFn: myChristoffelFn,  // your closure: (x, out?) => Float64Array(64)
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

Wraps a `RiemannTensorNode` and produces the contracted Ricci tensor R_μν = R^λ_{μλν} as a composite `ExprNode` (own validator + lowering arms — no AST rewrite).

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

Perihelion finder over `(tau, x, p)` snapshots from `integrateGeodesicGL4`. The finder estimates the root of dr/dτ by linear interpolation on the bracket. If the cubic Hermite polynomial misses `tauTolerance` at that estimate, the finder calls MathTS `findRoot` (Brent method) on the polynomial. The finder returns a `PerihelionResult`. Options are `FindPerihelionOptions`. Defined in `src/numerical/perihelion-finder.ts`.

**Kind**: function
**Stability**: `@public`

---

## Killing / Einstein-Equation / Curvature-Invariant Layer

This layer holds Killing-vector machinery, the Einstein field-equation node + numerical residual, and the Kretschmann curvature invariant.

### `verifyKillingEquation(...)` — function

Numerically checks the Killing equation ∇_μ ξ_ν + ∇_ν ξ_μ = 0 at a point. The default path uses exact Christoffels and metric compatibility, with no finite differences. Set `constantKilling: false` for a field that varies; pass `dMetricFn` to give exact metric derivatives. The function returns the raw max residual in the metric's units and does not read `KillingEquationOptions.tolerance`. Options are `KillingEquationOptions`; the layout-agnostic Christoffel accessor type is `ChristoffelAccess`. Defined in `src/numerical/killing.ts`.

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

> `WeylTensorNode`, `CurvatureCompositeNode<K,S>` and `CurvatureKind` are root type exports. The Weyl validator `validateWeylTensor` is not a root export. See `COMPONENTS.md`, section Curvature composite layer.

---

## Composition / Membership / Confrontation Layer

This layer holds the composition graph (`src/composition/`), the computable bridge-membership criterion + negative catalog (`src/bridges/membership.ts`, `src/bridges/rejected.ts`), and the catalog confrontations (`src/bridges/confrontations.ts`). All symbols below are `@public` and re-exported from `src/index.ts`.

### Composition graph (`src/composition/`)

- **`composeEdges(...)`** — the composition operator: chains compatible `BridgeEdge`s into a derived edge. Note the name — `composeEdges`, **not** `compose`. `compose` is a different function: it builds a `UniversalTensor` from three cell arrays and a `TensorConfig`.
- **`evaluateEdge(...)`** — apply a single edge's transfer function.
- **`regimesDiffer(a, b)`** — returns true when one registry axis has two different stated values in the two `RegimeAttributes`. Pass the `attributes` of each `Quantity` endpoint.
- **`consistencyRatio(a, b, inputs)`** — evaluates two edges that share source quantities on the same `inputs` and returns a/b. It throws `DomainViolationError` when an input leaves a validity domain.
- **`minConfidence(...)`** / **`QUANTITY_IDENTIFICATIONS`** — confidence combination and quantity-identification table used by `composeEdges`.
- **`CompositionJunctionError`**: no junction quantity matches. **`CompositionDimensionError`**: the junction dimensions differ. **`DomainViolationError`**: an input is outside the validity domain; `evaluateEdge` throws it.
- **Catalog graph** — `CATALOG_GRAPH` is every catalog relation, projected by `src/composition/catalog-graph.ts`. `evaluateRelation` evaluates a record. See `INTEGRATION_MAP.md`. See [§11](#phase-cd-analysis-namespacing-gate-and-related-exports).

```typescript
import { CATALOG_GRAPH, evaluateRelation } from 'universal-physics-tensor';

const landauer = evaluateRelation('be-16', { temperature: 300 });
```

### Membership criterion + negative catalog (`src/bridges/membership*.ts`, `rejected.ts`)

- **`adjudicateBridgeEntry(entry)`** — returns a `BridgeVerdict` (`'bridge' | 'not-a-bridge' | 'unadjudicated'`) for one catalog entry (tuple proxy + rejected-registry overlay). A tuple with two equal members is also `not-a-bridge`.
- **`adjudicateCatalog(...)`** — whole-catalog adjudication; returns a `CatalogAdjudicationReport`.
- **`REJECTED_BRIDGE_ADJUDICATIONS`** / **`REJECTED_BRIDGE_IDS`** — the negative catalog: BE-28/29/32/35/40 adjudicated NOT-A-BRIDGE with reasons. BE-42 is adjudicated a bridge (`['gravity','quantum']`); BE-44/46/50 are unadjudicated. See `docs/architecture/v0.8.0-catalog-adjudication.md`.

### Catalog confrontations (`src/bridges/confrontations.ts`)

- **`runConfrontation(bridgeId)`** — runs the confrontation recorded for that catalog id, or returns `undefined`.
- **`listConfrontations()`** — every confrontation, in catalog order.
- The GW-speed comparison and the Planckian-dissipation comparison are catalog records.

Type-only additions: `Quantity`, `RegimeAttributes`, `BridgeEdge`, `EdgeConfidence`, `ValidityDomain`, `ComposeOptions`, `QuantityIdentification`, `BridgeVerdict`, `CatalogAdjudicationReport`, `RejectedBridgeAdjudication`, `ConfrontationOutcome`.

---

## Phase C/D Analysis, Namespacing Gate, and Related Exports

Everything in this section is `@public` and re-exported from `src/index.ts` unless noted otherwise.

### Phase-D enumeration + uncertainty propagation

- **`enumerateCompositions(edges, opts?)`** — the Phase-D candidate enumerator: walks all ordered edge pairs, attempts composition, and returns an `EnumerationReport` of `CompositionCandidate`s (`all`, split into `registered` vs. `novel` against `REGISTERED_COMPOSITION_IDS`) and the alias collisions held at the gate (`requiresDisposition`, typed `DispositionRequired`). `opts` (`EnumerationOptions`) sets `registeredIds` and `seedIds`. With `seedIds`, the report also fills `proofTargets` (pairs `composeSymbolic` accepts) and `notSubstitutable`. A junction refusal, a dimension refusal and a symbolic-evaluation refusal are skipped, not reported.
- **`propagateUncertainty(edge, inputs, sigmas, opts?)`** — first-order uncertainty propagation over an edge's transfer function. The function calls `evaluateEdge` for the central value and MathTS `propagateUncertainty` for the partial derivatives. The function returns an `UncertaintyResult`. It works on composed edges for free. The `opts` type `UncertaintyOptions` is tagged `@internal`.
- **`runConfrontation(bridgeId)`** — the catalog confrontation for that id.
- **`classifyIdentifiability(edges, knownNames, targetName, opts?)`** / **`classifyAll(...)`** / **`forwardClosure(...)`** — the structural identifiability classifier. Counts a target's independent derivations from a known-quantity set. Returns an `IdentifiabilityResult` with an `IdentifiabilityVerdict`: `under-determined` / `exactly-determined` / `over-determined` / `given`. The over-determined surplus are falsifiable consistency constraints. Structural, not parametric; honors `QUANTITY_IDENTIFICATIONS`; excludes circular self-support. Types: `IdentifiabilityVerdict`, `IdentifiabilityResult`, `IdentifiabilityOptions`.
- **`retrodict(edges, groundTruth, opts?)`** / **`retrodictNode(...)`** — the retrodiction harness (the framework's own falsification benchmark). Masks each over-determined node, recomputes it via every independent derivation from `groundTruth` values, and scores the spread (`consistent` / `inconsistent` / `single` / `unrecoverable`; headline `allConsistent`). Optional `references` add external-value scoring. The default tolerance is a relative spread of 1e-6. Types: `RetrodictionOutcome`, `RetrodictionPrediction`, `RetrodictionResult`, `RetrodictionReport`, `RetrodictionOptions`.
- **`explainQuantity(edges, target, known, opts?)`** — the unified entry point. It combines the identifiability classifier, the retrodiction harness and the Buckingham-π check into one `QuantityExplanation`, which holds:
  - the identifiability verdict;
  - per-derivation values + the consistency check (when `known` is a `name → value` map);
  - the dimensional sufficiency of the known set (Buckingham-π);
  - a plain-language `summary`.

   Each `DerivationExplanation` carries the `beId` of the bridge its last edge encodes. The summary counts independence by bridge, not by edge. Two routes with the same `beId` (`be-42` and `be-42-via-rs`) restate one bridge. Their agreement is agreement by construction, not a consistency check.

   `known` may be a name list (structural + dimensional only) or values (adds recovery + consistency); `extraDimensions` declares dims for non-graph knowns (raw `G`, `c`, …). Types: `QuantityExplanation`, `DerivationExplanation`, `ExplainOptions`.

```typescript
import { enumerateCompositions, CATALOG_GRAPH } from 'universal-physics-tensor';

const report = enumerateCompositions(CATALOG_GRAPH);
// report.all / report.registered / report.novel / report.requiresDisposition
// report.proofTargets / report.notSubstitutable (filled when opts.seedIds is set)
```

### Namespacing gate

- **`CompositionAliasError`** — thrown by `composeEdges` when both operands carry a same-named source quantity and no disposition is recorded.
- **`SOURCE_ALIAS_DISPOSITIONS`** — the reviewable registry of per-composition `AliasDisposition`s (`'shared'` or `{renameSecond}` with input remap); `composeEdges(…, { aliases })` is the per-call escape hatch.
- Type-only: `AliasDisposition`, `DispositionRequired`.
- Graph quantity nodes are projected from `data/quantities.json` by `src/composition/quantities.ts`. They are not on the root surface.

### Klein-Gordon dispersion evaluator

- **`evaluateKGDispersionResidual(input)`** / **`verifyKleinGordonPlaneWave(input)`** — plane-wave-sector dispersion check ω² = c²k² + (mc²/ℏ)². Types: `KGDispersionResidualInput`, `KGPlaneWaveVerifyInput`, `KGPlaneWaveVerifyResult`.

### Planckian data confrontation

The Planckian-dissipation comparison is a catalog confrontation projected by `src/bridges/confrontations.ts`. `runConfrontation(23)` returns its outcome.

---

## Canonical-Equation Registry (the L-layer)

The **L-layer**: the textbook-physics "answer key" the catalog bridges are
validated against (Π = L + B + E). Each `CanonicalEquation` is multi-fidelity —
L0 dimensional signature / L1 scalar-AST / L2 field-equation — with
epistemic-honesty (`epistemicStatus`) and provenance fields. All symbols below are re-exported from `src/index.ts`, and the graph helpers are tagged `@internal`; verify the
authoritative set in `tests/api/public-surface.test.ts`.

### Registry and accessors (`src/canonical/registry.ts`)

- **`CANONICAL_EQUATIONS`** — the assembled array of all `CanonicalEquation`
  entries (the L-layer registry).
- **`CANONICAL_BY_ID`** — a `Readonly<Record<string, CanonicalEquation>>` keyed by equation id.
- **`canonicalById(id)`** — look up a single equation by id.
- **`canonicalByDomain(domain)`** — all equations in a `CanonicalDomain`
  (mechanics, gravitation, general-relativity, cosmology, electromagnetism, quantum,
  thermodynamics, statistical, information, condensed-matter).
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
  `--source=canonical` graph). One `law` edge exists for each canonical equation. Tagged `@internal`.
- **`canonicalToEdges(...)`** — derive graph edges from canonical equations. Tagged `@internal`.
- **`CANONICAL_CONSTANTS`** — the canonical physical-constant set used by the
  canonical graph.

### Structural normal form and linkage (`src/canonical/`)

- **`normalForm(node)`** / **`structurallyEqual(a, b)`** — the structural hash
  (equal up to dimensionless *constants*; named non-constant stubs like
  `ln⟨e^−βW⟩` are kept distinct) and its equality predicate
  (`src/canonical/normal-form.ts`).
- **`classifyLinkage(canonicalId, bridgeId)`** / **`scanLinkages()`** — the bridge↔canonical
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
`magnitude-clash` / `contradictory` / `axis-clash` / `promising` / `promising-unchecked` / `inert`).
`promising-unchecked` has the structure of `promising`; the magnitude test did not run or could not fail.

Product B (`upt probe`, `src/composition/probe/`) is **not** on this root surface.
Import `universal-physics-tensor/probe` for the experimental barrel, or use the CLI.
Those symbols are `@internal` and may change without a major version bump.

### Adjudication ledger

Human verdicts on identification hypotheses (`a ≟ b`) as review memory — once
a physicist has disposed of a candidate, the funnel must not re-surface it as
fresh. Verdicts never mutate the catalog or graphs; they annotate discovery
output only.

- **`candidateId(a, b)`** — stable order-normalized identity for an
  identification hypothesis (`a~b`, sorted). It throws when a name is not a kebab-case slug.
- **`ADJUDICATIONS`** — `bridgeCatalog().adjudications`, a `readonly CatalogAdjudication[]`.
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

Type-only: `AdjudicationVerdict`, `CatalogAdjudication`, `AnnotatedCandidate`.

### Consequence propagation

A post-pass annotator over ranked candidates (mirrors `annotateAdjudications`).
For each candidate in the `promising` or `promising-unchecked` tier, it derives the monomial algebraic consequence
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
returns them in catalog file order.

### Typed observation + outcome layer (`src/bridges/observations/types.ts`)

- **`ConfrontationOutcome`** — the normalized result, discriminated on `kind`
  so each confrontation carries only the fields it can honestly populate:
  - `'value'` — `predicted`/`observed`/`sigma`/`residualInSigma`/`withinObserved`, plus an optional `measured`.
  - `'upper-bound'` — `predicted`/`bound`/`satisfied`, plus an optional
    **`caveat`** field that surfaces an honesty note, such as a
    one-sided pass against a symmetric encoded bound (BE-36). An optional
    **`predictedIs`** field holds `'point'` or `'encoded-bound'`.
  - `'consistency'` — `predicted`/`approaches`/`fractionalGap`/`fractionalGapIs`
    (`'agreement-bound'` or `'observed-difference'`), plus an optional `predictedIs`
    (`'reference'` or `'lower-limit'`).
  - `'table'` — a `rows` array of per-row value comparisons.
  - Every arm also carries `units`, `provenance`, `preprocessing` and `independence`.
- **`residualInSigma(predicted, observed, sigma)`** — `|predicted − observed|`
  in units of the observed 1σ.
- **`combineInQuadrature(components)`** — combined 1σ from named
  `SigmaComponent[]` (root-sum-square).

**Kind**: functions + discriminated-union type
**Stability**: `@public`

Type-only: `ObservationProvenance` (citation, year and retrieved date are mandatory
on every observation record; note is optional), `SigmaComponent`, `ObservationKind`
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
- **`listConfrontations()`** — all entries, in catalog file order.
- **`runConfrontation(bridgeId)`** — run one confrontation; `undefined` if the
  id is not registered.

**Kind**: functions + constant
**Stability**: `@public`

Type-only: `ConfrontationEntry` (`bridgeId`, `title`, `kind`, `run()`).

### Catalog confrontations

Each confrontation is a record in `data/bridge-catalog.json`, projected by
`src/bridges/confrontations.ts`. `runConfrontation(id)` returns that record's
outcome. There is no per-bridge `confront*` export.

```typescript
import { runConfrontation } from 'universal-physics-tensor';

const result = runConfrontation(52);
```

### Deciding-measurement elasticity (`src/bridges/sensitivity.ts`)

**`decidingMeasurement(catalogId)`** — for a value-kind confrontation, ranks
its numeric inputs by dimensionless log-sensitivity
`E_i = |∂P/∂x_i|·x_i/P` (central finite differences, descending). The ranking
shows which input the prediction depends on MOST STRONGLY, not which
dominates the uncertainty budget. Returns `[]` when the id is not registered, is not value-kind, or stores no prediction point. Only BE-52 stores one.

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
results. Annotation-only: it changes no verdict, score, or count.

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

A rank-6 sparse store of law, bridge and emergence cells, indexed by regime coordinates. Construct it with `new UniversalTensor(config: TensorConfig)` (rank 3 to 6), or build it from cell arrays with `compose(laws, bridges, emergences, config)`.

**Kind**: class
**Stability**: `@public`

### `PhysicalConstants` — constant object

SI values of fundamental physical constants. The properties are `c`, `h`, `hbar`, `G`, `kB`, `e`, `alpha`, `lP`, `tP`, `mP` and `H0`.

**Kind**: constant
**Stability**: `@public`

```typescript
import { PhysicalConstants } from 'universal-physics-tensor';

const rs = 2 * PhysicalConstants.G * solarMass / (PhysicalConstants.c ** 2);
```

---

## Type-Only Exports

The following are type-only symbols erased at runtime. They appear in `src/index.ts` as `export type { ... }` and in `dist/index.d.ts` but are not present in `Object.keys(root)`.

> The table below lists the core, dimensional, numerical, curvature and Killing/field-equation types. The intelligent-index types, the types listed in [§10](#composition--membership--confrontation-layer), [§11](#phase-cd-analysis-namespacing-gate-and-related-exports) and [§13](#discovery-adjudication-ledger-and-consequence-propagation)–[§15](#epistemic-grounding-ledger), and the types of the symbolic-composition layer, the public geometrized adapters and the `LabeledTensor` axis-order / `mergeAxes`-`splitAxis` extension are all pinned by `tests/api/public-surface.test.ts` (`ALL_TYPE_EXPORTS`) but not rowed in the table below.

`Declared in` gives the module path under `src/`, without the file extension.

| Symbol | Declared in | Description |
|--------|-------------|-------------|
| `Dimension` | `dimensional/types` | Seven-component SI dimension record |
| `ExprNode` | `dimensional/ast-types` | The AST union type |
| `ValidationResult` | `dimensional/validator` | Return type of `validate()` |
| `Violation` | `dimensional/validator` | Single dimensional mismatch entry |
| `TensorEngine` | `numerical/tensor-engine` | The compute contract interface |
| `EngineTensor` | `numerical/tensor-engine` | Opaque rank-N tensor handle |
| `EinsumSpec` | `numerical/tensor-engine` | Engine-agnostic contraction plan |
| `NumericalResult` | `numerical/index` | Resolved value of `evaluateNumerical()` |
| `NumericalRawResult` | `numerical/index` | Resolved value of `evaluateNumericalRaw()` |
| `EvaluateOptions` | `numerical/index` | Per-call options for the evaluator |
| `NumericalInputs` | `numerical/types` | Input bundle mapping names to tensors |
| `NestedArray` | `numerical/types` | A number, a nested array, or a `Float64Array` |
| `GridField` | `numerical/types` | Spatial grid data for `NumericalInputs.grids` |
| `BridgeEquationEntry` | `bridges/types` | Single catalog entry shape |
| `BridgeEquationStatus` | `bridges/types` | Status discriminated union |
| `BridgeIssueSeverity` | `bridges/types` | Known-issue severity |
| `BridgeIssueFixable` | `bridges/types` | Known-issue fixability |
| `KnownIssue` | `bridges/types` | Single known-issue entry |
| `GeodesicIntegratorInputs` | `numerical/geodesic-integrator` | Input bundle for `integrateGeodesic` |
| `GeodesicIntegratorResult` | `numerical/geodesic-integrator` | Return type of `integrateGeodesic` |
| `CovariantDerivativeNode` | `dimensional/ast-types` | AST node for ∇_μ |
| `ForwardGradResult` | `numerical/tensor-engine` | Return type of `engine.forwardGrad()` |
| `ReverseGradResult` | `numerical/tensor-engine` | Return type of `engine.reverseGrad()` |
| `GL4State` | `numerical/gl4-integrator` | GL4 integrator trajectory state |
| `GL4Snapshot` | `numerical/gl4-integrator` | Per-step GL4 snapshot |
| `GL4Options` | `numerical/gl4-integrator` | GL4 integrator options |
| `PerihelionResult` | `numerical/perihelion-finder` | Return type of `findPerihelion` |
| `FindPerihelionOptions` | `numerical/perihelion-finder` | Options for `findPerihelion` |
| `RiemannTensorNode` | `dimensional/ast-types` | AST node for the Riemann tensor |
| `WeylTensorNode` | `dimensional/ast-types` | AST node for the Weyl tensor |
| `RicciTensorNode` | `dimensional/ast-types` | AST node for R_μν (via `ricci`) |
| `EinsteinTensorNode` | `dimensional/ast-types` | AST node for G_μν (via `einstein`) |
| `BianchiResidualNode` | `dimensional/ast-types` | AST node for the Bianchi residual |
| `KillingEquationOptions` | `numerical/killing` | Options for `verifyKillingEquation` and `checkKillingEquation` |
| `KillingEquationCheck` | `numerical/killing` | Return type of `checkKillingEquation` |
| `ChristoffelAccess` | `numerical/killing` | Layout-agnostic Christoffel accessor |
| `EinsteinEquationResidualInput` | `numerical/einstein-equation` | Input bundle for `evaluateEinsteinEquationResidual` |
| `MetricClosure` | `numerical/einstein-equation` | Metric-closure callback type |
| `Vec4` | `numerical/einstein-equation` | 4-vector coordinate tuple |
| `EinsteinFieldEquationNode` | `dimensional/ast-types` | AST node for the Einstein field equation |
| `EinsteinFieldEquationValidationResult` | `dimensional/einstein-equation` | Return type of `validateEinsteinFieldEquation` |
| `KretschmannScalarNode` | `dimensional/ast-types` | AST node for the Kretschmann scalar |
| `KretschmannScalarValidationResult` | `dimensional/curvature-invariants` | Return type of `validateKretschmannScalar` |
| `TensorConfig` / `TensorIndices` | `src/core/types.ts` | Core tensor metadata types |
| `PhysicalLaw` / `BridgeEquation` / `EmergentPhenomenon` | `src/core/types.ts` | High-level physics ontology types |
| `PhysicalScale` / `Force` / `Symmetry` / `InformationMeasure` | `src/core/types.ts` | High-level physics ontology types |

---

## Other Root Exports

This section lists each root export that no other section of this document names. A row gives the symbol, its kind, its stability tag and the file that declares it. The tag `internal` marks a symbol that can change at any time. `untagged` means the declaration carries no stability tag. `tests/api/public-surface.test.ts` pins the runtime names.

### Declared in `src/bridges/`

| Symbol | Kind | Tag | Declared in |
|--------|------|-----|-------------|
| `CONFRONTATION_RIGOR` | `const` | public | `src/bridges/confrontations.ts` |
| `CallerTableHit` | `interface` | public | `src/bridges/caller-table.ts` |
| `CallerTableRefusal` | `interface` | public | `src/bridges/caller-table.ts` |
| `CallerTableRequest` | `interface` | public | `src/bridges/caller-table.ts` |
| `CallerTableResult` | `type` | public | `src/bridges/caller-table.ts` |
| `CarrierSignError` | `class` | public | `src/bridges/carrier-sign.ts` |
| `CatalogEntryStatus` | `interface` | public | `src/bridges/catalog-adapter.ts` |
| `CatalogEvaluatorOutput` | `interface` | public | `src/bridges/catalog-types.ts` |
| `CatalogIngestionError` | `class` | public | `src/bridges/catalog-adapter.ts` |
| `CatalogIngestionReport` | `interface` | public | `src/bridges/catalog-adapter.ts` |
| `ConfrontationDataHandling` | `interface` | public | `src/bridges/observations/types.ts` |
| `ConfrontationIndependence` | `type` | public | `src/bridges/observations/types.ts` |
| `ConfrontationPreprocessing` | `type` | public | `src/bridges/observations/types.ts` |
| `ConsistencyComparison` | `interface` | public | `src/bridges/observations/types.ts` |
| `ConstantInputError` | `class` | public | `src/bridges/evaluation-errors.ts` |
| `ContractAlternate` | `interface` | public | `src/bridges/input-contract.ts` |
| `DomainInput` | `interface` | public | `src/bridges/evaluation-errors.ts` |
| `DomainViolation` | `interface` | public | `src/bridges/evaluation-errors.ts` |
| `DuplicateInputError` | `class` | public | `src/bridges/evaluation-errors.ts` |
| `EvaluationWant` | `type` | public | `src/bridges/input-contract.ts` |
| `EvaluatorParameter` | `interface` | public | `src/bridges/evaluators.ts` |
| `EvaluatorSpec` | `interface` | public | `src/bridges/evaluators.ts` |
| `GeometryRole` | `type` | public | `src/bridges/evaluators.ts` |
| `InputContract` | `interface` | public | `src/bridges/input-contract.ts` |
| `InputSlot` | `interface` | public | `src/bridges/input-contract.ts` |
| `InputTypeError` | `class` | public | `src/bridges/evaluation-errors.ts` |
| `MeasuredCouplingRow` | `interface` | public | `src/bridges/caller-table.ts` |
| `MissingInputError` | `class` | public | `src/bridges/evaluation-errors.ts` |
| `NonFiniteInputError` | `class` | public | `src/bridges/evaluation-errors.ts` |
| `OneLoopCoefficientSign` | `type` | public | `src/bridges/coefficient-statement.ts` |
| `OneLoopCoefficientStatement` | `interface` | public | `src/bridges/coefficient-statement.ts` |
| `ParameterAlternate` | `interface` | public | `src/bridges/evaluators.ts` |
| `RigorTier` | `type` | public | `src/bridges/confrontations.ts` |
| `RunningProcedure` | `interface` | public | `src/bridges/caller-table.ts` |
| `RunningProcedureRecord` | `interface` | public | `src/bridges/caller-table.ts` |
| `SourceRef` | `type` | public | `src/bridges/observations/types.ts` |
| `SourceRefs` | `type` | public | `src/bridges/observations/types.ts` |
| `UnknownInputError` | `class` | public | `src/bridges/evaluation-errors.ts` |
| `catalogToCells` | `function` | public | `src/bridges/catalog-adapter.ts` |
| `confrontationRigor` | `function` | public | `src/bridges/confrontations.ts` |
| `consistencyComparison` | `function` | public | `src/bridges/observations/types.ts` |
| `ingestCatalog` | `function` | public | `src/bridges/catalog-adapter.ts` |
| `ingestionReportToFluxReport` | `function` | public | `src/bridges/catalog-adapter.ts` |
| `inputContract` | `function` | public | `src/bridges/input-contract.ts` |
| `oneLoopCoefficientStatement` | `function` | public | `src/bridges/coefficient-statement.ts` |
| `requestCallerTableConfrontation` | `function` | public | `src/bridges/caller-table.ts` |
| `rigorDistribution` | `function` | public | `src/bridges/confrontations.ts` |
| `scanCatalog` | `function` | public | `src/bridges/catalog-adapter.ts` |

### Declared in `src/canonical/`

| Symbol | Kind | Tag | Declared in |
|--------|------|-----|-------------|
| `SourcedGroupPrefactor` | `interface` | untagged | `src/canonical/canonical-equation.ts` |
| `SourcedPrefactor` | `interface` | untagged | `src/canonical/canonical-equation.ts` |

### Declared in `src/composition/`

| Symbol | Kind | Tag | Declared in |
|--------|------|-----|-------------|
| `AnalyzeUserEquationOptions` | `interface` | internal | `src/composition/user-equation.ts` |
| `CoefficientUnsetError` | `class` | public | `src/composition/edge.ts` |
| `ComposeSymbolicOptions` | `interface` | public | `src/composition/compose-symbolic.ts` |
| `ConstantDef` | `interface` | public | `src/composition/canonical-graph.ts` |
| `DimensionAdjacency` | `interface` | untagged | `src/composition/dimension-adjacency.ts` |
| `DiscoveryOptions` | `interface` | internal | `src/composition/discovery.ts` |
| `EquationAnalysis` | `interface` | public | `src/composition/user-equation.ts` |
| `EquationHint` | `interface` | untagged | `src/composition/user-equation.ts` |
| `EquationLanding` | `interface` | public | `src/composition/user-equation.ts` |
| `ExtraOutput` | `interface` | public | `src/composition/evaluate-relation.ts` |
| `ForceAxis` | `type` | internal | `src/composition/axes.ts` |
| `InformationAxis` | `type` | internal | `src/composition/axes.ts` |
| `ProposedBridge` | `interface` | internal | `src/composition/proposed-bridges.ts` |
| `RankIdentifiability` | `interface` | public | `src/composition/identifiability.ts` |
| `RepresentativeValue` | `interface` | internal | `src/composition/representative-values.ts` |
| `RetrodictionRefusal` | `interface` | public | `src/composition/retrodiction.ts` |
| `ScaleAxis` | `type` | internal | `src/composition/axes.ts` |
| `ShortBinding` | `interface` | untagged | `src/composition/user-equation.ts` |
| `StatisticsAxis` | `type` | internal | `src/composition/axes.ts` |
| `SvgRendererUnavailableError` | `class` | public | `src/composition/graph-viz-svg.ts` |
| `SymbolicCompositionError` | `class` | public | `src/composition/compose-symbolic.ts` |
| `SymbolicEvalError` | `class` | public | `src/composition/expr-eval.ts` |
| `SymmetryAxis` | `type` | internal | `src/composition/axes.ts` |
| `TopologyAxis` | `type` | internal | `src/composition/axes.ts` |
| `UserEquation` | `interface` | public | `src/composition/user-equation.ts` |
| `UserEquationError` | `class` | public | `src/composition/user-equation.ts` |
| `VizCluster` | `interface` | public | `src/composition/graph-viz.ts` |
| `VizFilterStats` | `interface` | public | `src/composition/graph-viz.ts` |
| `VizJunction` | `interface` | public | `src/composition/graph-viz.ts` |
| `VizModel` | `interface` | public | `src/composition/graph-viz.ts` |
| `VizOptions` | `interface` | public | `src/composition/graph-viz.ts` |
| `VizStatus` | `type` | public | `src/composition/graph-viz.ts` |
| `analyzeUserEquation` | `function` | public | `src/composition/user-equation.ts` |
| `buildVizModel` | `function` | public | `src/composition/graph-viz.ts` |
| `dimensionAdjacency` | `function` | public | `src/composition/dimension-adjacency.ts` |
| `edgeToJunction` | `function` | untagged | `src/composition/graph-viz.ts` |
| `equationLanding` | `function` | public | `src/composition/user-equation.ts` |
| `identifiabilityByRank` | `function` | public | `src/composition/identifiability.ts` |
| `parseUserEquation` | `function` | untagged | `src/composition/user-equation.ts` |
| `renderDotToSvg` | `function` | public | `src/composition/graph-viz-svg.ts` |
| `suggestByDimension` | `function` | public | `src/composition/user-equation.ts` |
| `suggestQuantities` | `function` | public | `src/composition/user-equation.ts` |
| `validityDomain` | `function` | public | `src/composition/edge.ts` |

### Declared in `src/core/`

| Symbol | Kind | Tag | Declared in |
|--------|------|-----|-------------|
| `AxesRegistry` | `interface` | public | `src/core/axes-registry.ts` |
| `AxisConvenience` | `type` | public | `src/core/regime-registry.ts` |
| `AxisMismatchError` | `class` | public | `src/core/labeled-tensor.ts` |
| `AxisName` | `type` | public | `src/core/universal-index.ts` |
| `BridgeCell` | `interface` | public | `src/core/cell.ts` |
| `CellBase` | `interface` | public | `src/core/cell.ts` |
| `CellConfidence` | `type` | public | `src/core/cell.ts` |
| `EmergenceCell` | `interface` | public | `src/core/cell.ts` |
| `FluxDiagnostic` | `interface` | public | `src/core/flux-rules.ts` |
| `FluxReport` | `interface` | public | `src/core/flux-rules.ts` |
| `FluxRuleKind` | `type` | internal | `src/core/flux-rules.ts` |
| `FluxViolationError` | `class` | public | `src/core/flux-rules.ts` |
| `ForceAxes` | `type` | public | `src/core/axes-registry.ts` |
| `IdentityConflictError` | `class` | public | `src/core/labeled-tensor.ts` |
| `IndexNameMismatchError` | `class` | public | `src/core/labeled-tensor.ts` |
| `InformationAxes` | `type` | public | `src/core/axes-registry.ts` |
| `LabeledTensorConstructionError` | `class` | public | `src/core/labeled-tensor.ts` |
| `LawCell` | `interface` | public | `src/core/cell.ts` |
| `MakeIndexOptions` | `interface` | public | `src/core/universal-index.ts` |
| `RankPreservationError` | `class` | public | `src/core/labeled-tensor.ts` |
| `RegimeCollisionError` | `class` | public | `src/core/regime-registry.ts` |
| `RegimeProvenance` | `interface` | public | `src/core/regime-registry.ts` |
| `RegimeSpec` | `interface` | public | `src/core/regime-registry.ts` |
| `RegimeValueBase` | `interface` | public | `src/core/regime-registry.ts` |
| `ScaleAxes` | `type` | public | `src/core/axes-registry.ts` |
| `SymmetryAxes` | `type` | public | `src/core/axes-registry.ts` |
| `UniversalIndex` | `interface` | public | `src/core/universal-index.ts` |
| `UniversalIndexId` | `type` | public | `src/core/universal-index.ts` |
| `attachRegimesToCell` | `function` | public | `src/core/regime-registry.ts` |
| `defineDimension` | `const` | public | `src/core/regime-registry.ts` |
| `defineForce` | `const` | public | `src/core/regime-registry.ts` |
| `defineInformation` | `const` | public | `src/core/regime-registry.ts` |
| `defineRegime` | `function` | public | `src/core/regime-registry.ts` |
| `defineScale` | `const` | public | `src/core/regime-registry.ts` |
| `defineSymmetry` | `const` | public | `src/core/regime-registry.ts` |
| `defineTopology` | `const` | public | `src/core/regime-registry.ts` |
| `getCellRegimes` | `function` | public | `src/core/regime-registry.ts` |
| `listRegimesByAxis` | `function` | public | `src/core/regime-registry.ts` |
| `lookupRegime` | `function` | public | `src/core/regime-registry.ts` |
| `makeIndex` | `function` | public | `src/core/universal-index.ts` |
| `provenanceFor` | `function` | public | `src/core/regime-registry.ts` |

### Declared in `src/diff/`

| Symbol | Kind | Tag | Declared in |
|--------|------|-----|-------------|
| `ASTGradientResult` | `interface` | public | `src/diff/bridge-ast-gradient.ts` |
| `BridgeDiffSpec` | `interface` | public | `src/diff/bridge-gradient.ts` |
| `BridgeNumericalGradientResult` | `interface` | public | `src/diff/bridge-gradient.ts` |
| `DECOHERENCE_RATE_DIFF` | `const` | public | `src/diff/bridge-specs.ts` |
| `DIFFERENTIABLE_RELATIONS` | `const` | public | `src/diff/bridge-specs.ts` |
| `DecoherenceInput` | `interface` | public | `src/diff/bridge-specs.ts` |
| `HAWKING_TEMPERATURE_DIFF` | `const` | public | `src/diff/bridge-specs.ts` |
| `HawkingInput` | `interface` | public | `src/diff/bridge-specs.ts` |
| `PERIHELION_ADVANCE_DIFF` | `const` | public | `src/diff/bridge-specs.ts` |
| `PerihelionInput` | `interface` | public | `src/diff/bridge-specs.ts` |
| `SHAPIRO_DELAY_DIFF` | `const` | public | `src/diff/bridge-specs.ts` |
| `ShapiroInput` | `interface` | public | `src/diff/bridge-specs.ts` |
| `astDifferentiableBridgeIds` | `function` | public | `src/diff/bridge-ast-gradient.ts` |
| `bridgeGradientASTById` | `function` | public | `src/diff/bridge-ast-gradient.ts` |

### Declared in `src/dimensional/`

| Symbol | Kind | Tag | Declared in |
|--------|------|-----|-------------|
| `AffineTemperature` | `type` | public | `src/dimensional/units.ts` |
| `AmbiguousUnitError` | `class` | public | `src/dimensional/units.ts` |
| `ArrowOfTime` | `type` | public | `src/dimensional/gauge-field.ts` |
| `BetaFunctionNode` | `interface` | public | `src/dimensional/rg-flow.ts` |
| `BetaFunctionValidationResult` | `interface` | public | `src/dimensional/rg-flow.ts` |
| `BuckinghamResult` | `interface` | public | `src/dimensional/buckingham.ts` |
| `BuckinghamVerdict` | `type` | public | `src/dimensional/buckingham.ts` |
| `ConservedChargeNode` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `ConvertedValue` | `interface` | public | `src/dimensional/units.ts` |
| `CosmologicalConstantNode` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `CovariantIndex` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `DimensionalDeterminationResult` | `interface` | public | `src/dimensional/buckingham.ts` |
| `DimensionalVariable` | `interface` | public | `src/dimensional/buckingham.ts` |
| `FriedmannEquationNode` | `interface` | public | `src/dimensional/friedmann-equation.ts` |
| `FriedmannEquationValidationResult` | `interface` | public | `src/dimensional/friedmann-equation.ts` |
| `FriedmannVariant` | `type` | public | `src/dimensional/friedmann-equation.ts` |
| `GaugeFieldNode` | `interface` | public | `src/dimensional/gauge-field.ts` |
| `KillingVectorNode` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `KleinGordonEquationNode` | `interface` | public | `src/dimensional/klein-gordon-equation.ts` |
| `KleinGordonEquationValidationResult` | `interface` | public | `src/dimensional/klein-gordon-equation.ts` |
| `KroneckerDeltaNode` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `ParsedUnit` | `interface` | public | `src/dimensional/units.ts` |
| `PiGroup` | `interface` | public | `src/dimensional/buckingham.ts` |
| `RGCouplingNode` | `interface` | public | `src/dimensional/rg-flow.ts` |
| `RationalizationError` | `class` | public | `src/dimensional/buckingham.ts` |
| `Role` | `type` | untagged | `src/dimensional/ast-types.ts` |
| `ScalarFieldNode` | `interface` | public | `src/dimensional/klein-gordon-equation.ts` |
| `StressEnergyTensorNode` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `TemperatureReading` | `type` | public | `src/dimensional/units.ts` |
| `TensorIndex` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `TensorPartialDerivativeNode` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `TensorProductNode` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `TensorTraceNode` | `interface` | public | `src/dimensional/tensor-trace.ts` |
| `TensorTraceOptions` | `interface` | public | `src/dimensional/tensor-trace.ts` |
| `TensorTraceValidationResult` | `interface` | public | `src/dimensional/tensor-trace.ts` |
| `TimeSymmetryPredicateNode` | `interface` | public | `src/dimensional/gauge-field.ts` |
| `TimeSymmetryPredicateValidationResult` | `interface` | public | `src/dimensional/gauge-field.ts` |
| `TracableTensorNode` | `interface` | public | `src/dimensional/tensor-trace.ts` |
| `TranscendentalFn` | `type` | untagged | `src/dimensional/ast-types.ts` |
| `UPTError` | `class` | untagged | `src/dimensional/errors.ts` |
| `UnitError` | `class` | public | `src/dimensional/units.ts` |
| `UnitMode` | `type` | internal | `src/dimensional/natural-units.ts` |
| `UnitRefusedError` | `class` | public | `src/dimensional/units.ts` |
| `UnknownUnitError` | `class` | public | `src/dimensional/units.ts` |
| `UpperIndex` | `interface` | untagged | `src/dimensional/ast-types.ts` |
| `Variance` | `type` | untagged | `src/dimensional/ast-types.ts` |
| `buckinghamPi` | `function` | public | `src/dimensional/buckingham.ts` |
| `convertValue` | `function` | public | `src/dimensional/units.ts` |
| `dimensionallyDetermines` | `function` | public | `src/dimensional/buckingham.ts` |
| `inferUnknownDimension` | `function` | public | `src/dimensional/dimension-inference.ts` |
| `parseUnit` | `function` | public | `src/dimensional/units.ts` |
| `resolveQuantityName` | `function` | public | `src/dimensional/formula-names.ts` |
| `rgCoupling` | `function` | public | `src/dimensional/rg-flow.ts` |
| `substituteSymbolDim` | `function` | public | `src/dimensional/dimension-inference.ts` |
| `validateBetaFunction` | `function` | public | `src/dimensional/rg-flow.ts` |
| `validateFriedmannEquation` | `function` | public | `src/dimensional/friedmann-equation.ts` |
| `validateGaugeField` | `function` | public | `src/dimensional/gauge-field.ts` |
| `validateKleinGordonEquation` | `function` | public | `src/dimensional/klein-gordon-equation.ts` |
| `validateRGCoupling` | `function` | public | `src/dimensional/rg-flow.ts` |
| `validateTensorTrace` | `function` | public | `src/dimensional/tensor-trace.ts` |
| `validateTimeSymmetryPredicate` | `function` | public | `src/dimensional/gauge-field.ts` |

### Declared in `src/numerical/`

| Symbol | Kind | Tag | Declared in |
|--------|------|-----|-------------|
| `ChristoffelAtFn` | `type` | public | `src/numerical/killing.ts` |
| `CovariantEikonalInputs` | `interface` | public | `src/numerical/covariant-eikonal.ts` |
| `CovariantEikonalResult` | `interface` | public | `src/numerical/covariant-eikonal.ts` |
| `EinsumContraction` | `interface` | public | `src/numerical/tensor-engine.ts` |
| `EinsumFreeAxis` | `interface` | public | `src/numerical/tensor-engine.ts` |
| `FormulaDimensionError` | `class` | public | `src/numerical/formula-dimension.ts` |
| `KillingFn` | `type` | public | `src/numerical/killing.ts` |
| `KillingMetricFn` | `type` | public | `src/numerical/killing.ts` |
| `ParsedPhysics` | `interface` | untagged | `src/numerical/formula-dimension.ts` |
| `parsePhysics` | `function` | public | `src/numerical/formula-registry.ts` |

### Declared in `src/relations/`

| Symbol | Kind | Tag | Declared in |
|--------|------|-----|-------------|
| `Conventions` | `interface` | internal | `src/relations/types.ts` |
| `RelationContract` | `type` | internal | `src/relations/types.ts` |

---

See `ARCHITECTURE.md` for module design context. See `COMPONENTS.md` for per-component breakdown. See `DATAFLOW.md` for concrete data-flow traces through the system.

---

## Verification

Generated by `repo-tools map`.
Regenerate: `repo-tools map . --out=<dir>` · Check: `repo-tools check . --docs=docs/architecture`

| Claim | Value | Source |
|---|---|---|
| totalExports | 3777 | `dependency-graph.json` `statistics.totalExports` |
| unusedExportsCount | 202 | `dependency-graph.json` `statistics.unusedExportsCount` |

Both counts cover the whole repository, which is the default scope of `repo-tools map`. The project generator `bun run docs:deps` reads `src/` only and reports other numbers. The `dependency-graph.json` in the Source column is the output of `repo-tools map`. The committed `docs/architecture/dependency-graph.json` is a different file, which `bun run docs:deps` writes for `src/`.

The public-surface walk (`--api-surface`, entry `src/index.ts`) lists 481 symbols: 233 runtime symbols and 248 type-only symbols. By kind the walk counts 126 functions, 66 constants, 41 classes, 173 interfaces, 74 type aliases and 1 namespace. By tag it counts 356 `@public`, 18 `@internal` and 107 untagged. This walk is a direct measurement and is not a gated claim. `tests/api/public-surface.test.ts` pins the runtime names.

**`unusedExportsCount` is not a deletion list.** It counts exports with no importer *inside
this repository*. The package is a published library: its public surface exists for consumers who are
not in the graph. Confirm with a second method before removing anything.
