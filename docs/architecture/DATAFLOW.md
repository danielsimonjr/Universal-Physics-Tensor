# Universal Physics Tensor — Data Flow Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Flow 1: Bridge Validation](#flow-1-bridge-validation)
3. [Flow 2: Numerical Evaluation](#flow-2-numerical-evaluation)
4. [Flow 3: Automatic Differentiation](#flow-3-automatic-differentiation)
5. [Flow 4: Bridge Catalog Query](#flow-4-bridge-catalog-query)
6. [Flow 5: Geodesic Integration (RK4 + GL4)](#flow-5-geodesic-integration-rk4--gl4)
7. [Flow 6: Curvature-Node Lowering](#flow-6-curvature-node-lowering)
8. [Flow 7: Einstein-Equation Residual](#flow-7-einstein-equation-residual)
9. [Flow 8: Bridge-Edge Composition](#flow-8-bridge-edge-composition)
10. [Flow 9: Phase-D Enumeration + Uncertainty Propagation](#flow-9-phase-d-enumeration--uncertainty-propagation)
11. [Flow 10: Confrontation (`upt confront`)](#flow-10-confrontation-upt-confront)
12. [Flow 11: Discovery Funnel + Epistemic Grounding (`upt discover`)](#flow-11-discovery-funnel--epistemic-grounding-upt-discover)
13. [Flow 12: Expression / Residual Search (`upt probe`)](#flow-12-expression--residual-search-upt-probe)
14. [Flow 13: Atlas Path Query (`upt path`, `upt regime`)](#flow-13-atlas-path-query-upt-path-upt-regime)
15. [Error Handling](#error-handling)

---

## Overview

Data in UPT flows through a layered system. The dimensional AST (`ExprNode`) is the central artifact — it travels from the caller through the validator and into the numerical backend. The bridge catalog (`BRIDGE_EQUATIONS`) is a separate data store that is queried independently of the AST pipeline.

```
┌───────────────────────────────────────────────────────────────────┐
│  Caller                                                           │
│  ├── Constructs ExprNode tree (or imports one from a be-* module) │
│  ├── Optionally calls validate() for symbolic check               │
│  ├── Optionally calls evaluateNumerical() for numeric evaluation  │
│  └── Optionally queries BRIDGE_EQUATIONS for catalog metadata     │
└───────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────────┐
           ▼                  ▼                       ▼
    dimensional/         numerical/              bridges/
    validator.ts         index.ts                index.ts
    (validate)           (evaluateNumerical)     (BRIDGE_EQUATIONS)
           │                  │
           ▼                  ▼
    ValidationResult    TensorEngine
    (ok, dim,           (einsum, matMul,
     freeIndices,        forwardGrad, ...)
     violations)
```

---

## Flow 1: Bridge Validation

**Purpose**: Check that a bridge equation is dimensionally consistent without evaluating it numerically.

**Entry point**: `validate(node: ExprNode): ValidationResult`

```
Caller builds an ExprNode tree
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. CONSTRUCT AST                                             │
│    const lhs = { kind: 'symbol', name: 'ρ', dim: MASS };   │
│    const rhs = { kind: 'op', op: '*', args: [c, c] };      │
│    // (simplified) — real bridges use tensor nodes          │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CALL validate() or validateEquation()                     │
│    const result = validate(lhs);                            │
│    // OR: const eq = validateEquation(lhs, rhs);            │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RECURSIVE TREE WALK (validator.ts infer())               │
│    For each node:                                           │
│    ├── 'symbol'              → return node.dim              │
│    ├── 'op' *,/              → multiply / divide dims       │
│    ├── 'op' +,-              → add / subtract (a dimension  │
│    │                           mismatch appends an error-   │
│    │                           severity Violation; throws   │
│    │                           FreeIndexMismatchError if    │
│    │                           free-index maps differ)      │
│    ├── 'op' ^                → power(baseDim, n)            │
│    ├── 'integral'            → multiply(f.dim, dx.dim)      │
│    ├── 'derivative'          → divide(f.dim, wrt.dim)       │
│    ├── 'tensor-symbol'       → validateTensorSymbol()       │
│    │                           (builds freeIndices map)     │
│    ├── 'tensor-product'      → computeContraction()         │
│    │                           (Einstein summation algebra) │
│    ├── 'metric-tensor'       → validateMetricTensor()       │
│    ├── 'kronecker-delta'     → validateKroneckerDelta()     │
│    ├── 'tensor-partial-      → validatePartialDerivative()  │
│    │    derivative'                                         │
│    ├── 'covariant-derivative'→ validateCovariantDerivative()│
│    ├── 'riemann-tensor'      → validateRiemannTensor()      │
│    ├── 'ricci-/einstein-/    → curvature.ts validators      │
│    │    bianchi-...'                                          │
│    ├── 'weyl-tensor'         → validateWeylTensor()         │
│    ├── 'kretschmann-scalar'  → validateKretschmannScalar()  │
│    └── 'einstein-equation'   → validateEinsteinFieldEquation│
│                                ()                            │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ACCUMULATE VIOLATIONS                                     │
│    Each mismatch appends a Violation entry:                 │
│    { location, expected, actual, note, severity }           │
│    Warning violations do not set ok=false.                  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RETURN ValidationResult                                   │
│    {                                                        │
│      ok: boolean,          // no error-severity violations  │
│      inferredDimension,    // Dimension | null              │
│      freeIndices,          // Map<label, {upper,lower}>     │
│      violations,           // Violation[]                   │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Caller inspects result
```

**Bridge module variant**: A per-bridge module's `validate*Dimensions()` helper wraps `validateEquation(LHS, RHS)` and returns a simpler `DimensionValidationReport { ok, lhsDim, rhsDim }`.

---

## Flow 2: Numerical Evaluation

**Purpose**: Evaluate a dimensionally valid AST to a concrete numerical result.

**Entry point**: `evaluateNumerical(node: ExprNode, inputs: NumericalInputs, options?: EvaluateOptions): Promise<NumericalResult>`

```
Caller provides ExprNode tree + NumericalInputs
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. VALIDATE (prepare() internal)                             │
│    vr = validate(node)                                      │
│    if (!vr.ok) throw NumericalBackendError                  │
│    // Numerical evaluation on an invalid AST is forbidden.  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. RESOLVE ENGINE                                            │
│    engine = options?.engine ?? await getActiveEngine()      │
│    // Default: MathTSEngine (the MathTS packages are        │
│    // required; there is no fallback engine)                │
│    // Override: pass engine in EvaluateOptions              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. LOWERING PASS (lowering.ts lowerNode())                  │
│    Recursively translates ExprNode → EngineTensor:          │
│    ├── 'symbol'         → engine.fromNested(inputs[name])  │
│    ├── 'op' +,-        → engine.add / engine.sub            │
│    ├── 'op' *,/,^      → rank-0 only: computed in JS, then  │
│    │                    lifted back with engine.fromNested  │
│    ├── 'tensor-product' → engine.einsum(EinsumSpec, ...)   │
│    │   [contraction plan built by computeContraction()]     │
│    ├── 'integral'       → numerical quadrature (if present) │
│    └── other kinds      → corresponding engine ops          │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. OPTIONAL INVERSE-METRIC CHECK                             │
│    If the AST contains a lower/upper metric pair:           │
│    ├── scanForMetricPair(node) identifies the pair          │
│    └── evaluateMetricInverse(...) checks g^{ab}g_{bc}≈δ^a_c │
│        and emits a warning Violation if not.                │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. MATERIALIZE + RETURN NumericalResult                      │
│    {                                                        │
│      value: engine.toNested(tensor),   // NestedArray       │
│      dim: Dimension,                   // inferred SI dim   │
│      freeIndices: Map<...>,                                 │
│      warnings: Violation[],                                 │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

**Raw variant**: `evaluateNumericalRaw` skips step 5's `toNested()` call and returns the live `EngineTensor` for chaining. The caller is responsible for calling `.dispose()`.

---

## Flow 3: Automatic Differentiation

**Purpose**: Compute the Jacobian or gradient of a user-supplied tensor-valued function.

**Entry points**:
- `engine.forwardGrad(fn, x): Promise<ForwardGradResult>`
- `engine.reverseGrad(fn, x, cotangent?): Promise<ReverseGradResult>`

Both methods are optional on `TensorEngine`. Always check `hasAutogradSupport(engine)` first.

```
Caller wraps computation in a closure
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. CAPABILITY CHECK                                          │
│    if (!hasAutogradSupport(engine)) {                       │
│      throw new EngineCapabilityError(engine.name, 'forwardGrad') │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2a. FORWARD-MODE (forwardGrad)                               │
│    MathTSEngine path (the one engine):                      │
│    ├── x is converted to a MathTS tensor; fn is passed      │
│    │   UNCHANGED to mathts-autograd forwardGrad, which      │
│    │   wraps x as a DualTensor and runs fn                  │
│    ├── MathTSEngine's mul/add/sub/scale dispatch a          │
│    │   DualTensor input to the dual arithmetic, so the      │
│    │   tangent propagates through fn                        │
│    └── { value, jacobian } converted back to EngineTensor   │
│                                                             │
│    A missing mathts-autograd import throws                  │
│    EngineCapabilityError.                                   │
└─────────────────────────────────────────────────────────────┘
          │    OR
┌─────────────────────────────────────────────────────────────┐
│ 2b. REVERSE-MODE (reverseGrad)                               │
│    MathTSEngine path (the one engine):                      │
│    ├── x (and the cotangent, if given) converted to MathTS  │
│    │   tensors; fn passed UNCHANGED to mathts-autograd     │
│    │   reverseGrad, which wraps x as a TapedTensor         │
│    ├── MathTSEngine's ops dispatch a TapedTensor input to  │
│    │   the tape arithmetic; the backward pass is autograd's│
│    └── { value, gradient } converted back to EngineTensor  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RETURN RESULT                                             │
│    ForwardGradResult: { value: EngineTensor,                │
│                          jacobian: EngineTensor }           │
│    ReverseGradResult: { value: EngineTensor,                │
│                          gradient: EngineTensor }           │
└─────────────────────────────────────────────────────────────┘
```

**Honest note**: `forwardGrad` / `reverseGrad` operate on user-supplied closures, not on `ExprNode` trees. Exact AD over a bridge's scalar RHS AST is a separate path: `bridgeGradientAST` (`src/diff/bridge-ast-gradient.ts`) lowers the AST through `@danielsimonjr/mathts-autograd`. In the AST evaluation path, the `derivativeStrategy: 'computed'` default on `MetricTensorNode` lowers ∂g to zero (`src/numerical/derivative-lowering.ts`). The reason: a metric-tensor input carries constant values. This path does not route through `forwardGrad` / `reverseGrad`.

---

## Flow 4: Bridge Catalog Query

**Purpose**: Retrieve metadata about bridge equations without touching the dimensional or numerical layers.

**Entry point**: `BRIDGE_EQUATIONS: BridgeEquationEntry[]`

```
import { BRIDGE_EQUATIONS } from 'universal-physics-tensor';

          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ FILTER by status / category / tractability                   │
│                                                             │
│ // All active (non-invalid) established bridges:            │
│ const established = BRIDGE_EQUATIONS                        │
│   .filter(e => e.status === 'established');                 │
│                                                             │
│ // Computationally tractable, active bridges:               │
│ // (isActiveStatus is NOT on the main public surface —      │
│ //  compare status directly.)                                │
│ const tractable = BRIDGE_EQUATIONS                          │
│   .filter(e => e.status !== 'invalid' &&                    │
│     (e.tractability_class === 'closed-form' ||              │
│      e.tractability_class === 'numerical-tractable'));       │
│                                                             │
│ // Bridges with known dimensional issues:                   │
│ const dimensionalIssues = BRIDGE_EQUATIONS                  │
│   .filter(e => e.known_issues.some(                        │
│     i => i.severity === 'dimensional'));                     │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ ACCESS METADATA FIELDS                                       │
│                                                             │
│ entry.id                  // 11–68                          │
│ entry.name                // verbatim spec heading          │
│ entry.status              // BridgeEquationStatus           │
│ entry.formula_latex       // primary equation as LaTeX      │
│ entry.dimensional_signature // '[energy]' | null           │
│ entry.tractability_class  // BridgeTractabilityClass        │
│ entry.known_issues        // KnownIssue[]                   │
│ entry.references          // arXiv IDs, etc.               │
│ entry.dependencies        // ids of referenced bridges      │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Caller uses metadata (no dimensional or numerical layer touched)
```

The catalog is `data/bridge-catalog.json`. `dimensional_signature` is a string on every catalog entry. The sentence that the catalog was a static array, and that some bridges had no AST encoding under `src/bridges/equations/`, is the record from before the catalog engine. `tests/bridges/dimensional-signature-catalog.test.ts` pins the signature against the record.

Two derived views sit beside the array. `adjudicateCatalog()` applies the bridge-membership criterion, with the `rejected.ts` negative catalog as overlay. The function returns a `CatalogAdjudicationReport`: bridge ids grouped by verdict into `bridges`, `notABridges` and `unadjudicated`. The per-entry `BridgeVerdict` comes from `adjudicateBridgeEntry()`. `data/bridge-catalog.json` is the generated JSON artifact (`npm run catalog:json`).

---

## Flow 5: Geodesic Integration (RK4 + GL4)

**Purpose**: Integrate a test-particle geodesic in an arbitrary Lorentzian manifold.

**Entry points**:
- `integrateGeodesic(inputs: GeodesicIntegratorInputs): GeodesicIntegratorResult` — fixed-step RK4.
- `integrateGeodesicGL4(initialState: GL4State, options: GL4Options): readonly GL4Snapshot[]` — GL4 Gauss–Legendre 4th-order symplectic integrator.

The RK4 path is traced below. The GL4 path does not take the RK4 shape. GL4 works on the canonical state `GL4State` (x, p), with p the covariant momentum. GL4 takes the inverse metric `gInverseFn` and its derivatives `dgInverseFn` instead of a Christoffel closure. GL4 does not use the explicit 4-stage Butcher tableau. Per step, GL4 solves the implicit 2-stage Gauss–Legendre system by Picard fixed-point iteration on the stage values. The result is a symplectic update for the geodesic Hamiltonian H = ½ g^{μν} p_μ p_ν. GL4 returns `GL4Snapshot` entries `{ tau, x, p, v? }`. GL4 is the preferred path for long-time integration where energy drift matters. The `findPerihelion` finder consumes `(tau, x, p)` snapshots: GL4 output, not an RK4 trajectory, which carries positions only. The finder locates the − to + sign change of dr/dτ = g^{rν} p_ν and fits a cubic Hermite polynomial on that bracket. When the analytic root misses `tauTolerance`, the finder refines the root by bisection on the polynomial.

```
Caller prepares Christoffel-symbol closure + initial conditions
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. INPUT BUNDLE                                              │
│    {                                                        │
│      christoffelFn: (x, out?) => Float64Array(64),          │
│                  // Γ^λ_{μν} at index 16·λ + 4·μ + ν        │
│      x0: [t, r, θ, φ],                   // initial pos    │
│      v0: [dt/dτ, dr/dτ, dθ/dτ, dφ/dτ], // initial vel    │
│      tauStart, tauEnd: number,        // proper-time span   │
│      steps: number,                   // RK4 step count     │
│      domainMinRadius?: number,        // optional r floor   │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VALIDATE INPUTS                                           │
│    Throw NumericalBackendError if steps is not a positive   │
│    integer, or if x0[1] < domainMinRadius (when supplied).  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RK4 INTEGRATION LOOP                                      │
│    Cast geodesic ODE as first-order system on (x, v):       │
│      dx^μ/dτ = v^μ                                         │
│      dv^μ/dτ = −Γ^μ_{νρ}(x) v^ν v^ρ                       │
│                                                             │
│    dτ = (tauEnd − tauStart) / steps                         │
│    For each step i = 0 … steps-1:                           │
│    ├── k1 = f(x_i, v_i)         // slope at start           │
│    ├── k2 = f(x_i+dτ/2·k1_x,   // slope at midpoint (k1)  │
│    │         v_i+dτ/2·k1_v)                                │
│    ├── k3 = f(x_i+dτ/2·k2_x,   // slope at midpoint (k2)  │
│    │         v_i+dτ/2·k2_v)                                │
│    ├── k4 = f(x_i+dτ·k3_x,     // slope at end             │
│    │         v_i+dτ·k3_v)                                  │
│    └── x_{i+1} = x_i + dτ/6·(k1+2k2+2k3+k4)_x            │
│        v_{i+1} = v_i + dτ/6·(k1+2k2+2k3+k4)_v            │
│                                                             │
│    christoffelFn(x) is called 4× per step.                 │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. COLLECT TRAJECTORY                                        │
│    trajectory: positions x^μ only — the initial point plus  │
│    one sample every max(1, ⌊steps/100⌋) steps.              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   GeodesicIntegratorResult { xFinal, vFinal, trajectory }
```

The integrator has no `TensorEngine` dependency. The integrator accepts a plain JS closure for the Christoffel symbol. The caller can build the closure with `christoffel()` and evaluate it numerically. The caller can also supply the closure analytically (e.g., the closed-form Schwarzschild Christoffel coefficients).

---

## Flow 6: Curvature-Node Lowering

**Purpose**: Numerically evaluate a curvature composite AST node (`RiemannTensorNode`, `RicciTensorNode`, `EinsteinTensorNode`, `BianchiResidualNode`, `WeylTensorNode`, `KretschmannScalarNode`).

**Entry point**: `evaluateNumerical(node, inputs)` — the same entry point as Flow 2; curvature nodes are ordinary `ExprNode` members.

```
Caller builds a curvature node (ricci(R), einstein(R,g,gI), …)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. VALIDATE                                                  │
│    validate(node) dispatches on node.kind to the curvature  │
│    validators (curvature.ts / weyl-validators.ts /          │
│    curvature-invariants.ts). Dimensional check only — no    │
│    numeric work.                                            │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LOWERING — lowerCurvature() dispatcher (lowering.ts)      │
│    A single dispatcher switches on node.kind for all six    │
│    curvature kinds:                                         │
│    ├── 'riemann-tensor', 'weyl-tensor', 'kretschmann-       │
│    │   scalar', 'bianchi-residual': build Riemann from the  │
│    │   metric closures in inputs.fields (christoffelAt,     │
│    │   dGammaAt, buildRiemann / riemannLowerAt helpers)     │
│    ├── 'ricci-tensor': lowerCurvature calls itself on the   │
│    │   inner RiemannTensorNode and materializes it via      │
│    │   engine.toNested                                      │
│    ├── 'einstein-tensor': lowerCurvature calls itself on an │
│    │   inner 'ricci-tensor' node and materializes the       │
│    │   Ricci; g and g⁻¹ come from inputs.tensors            │
│    ├── Contract on the JS side (Ricci trace, Einstein       │
│    │   combination, Bianchi cyclic sum, Weyl trace removal, │
│    │   Kretschmann full contraction)                         │
│    └── Lift the result back via engine.fromNested           │
│    "Walk-directly philosophy": no AST                       │
│    rewrite into a tensor-product einsum.                    │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RETURN NumericalResult                                    │
│    value (NestedArray), dim, freeIndices, warnings — as in  │
│    Flow 2.                                                  │
└─────────────────────────────────────────────────────────────┘
```

`computeKretschmann` is the standalone numerical path for the Kretschmann scalar. It uses factored index-raising: four single-index raisings instead of the O(4⁸) naive contraction. Use it for direct sample-point diagnostics without a full AST node.

---

## Flow 7: Einstein-Equation Residual

**Purpose**: Measure how well a metric + stress-energy configuration satisfies the Einstein field equation at a coordinate point.

**Entry point**: `evaluateEinsteinEquationResidual(input: EinsteinEquationResidualInput): number`

```
Caller supplies metric closures + stress-energy closure + point
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. INPUT BUNDLE (EinsteinEquationResidualInput)              │
│    ├── metric closure(s) — MetricClosure: x ↦ g_μν(x)       │
│    ├── stress-energy closure — x ↦ T_μν(x)                  │
│    ├── cosmological constant Λ (required; 0 for vacuum)     │
│    └── evaluation point — Vec4                              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ASSEMBLE G_μν                                             │
│    Finite-difference the metric closure to get ∂g, ∂²g →    │
│    Christoffels → Riemann → Ricci → Einstein tensor G_μν.   │
│    4th-order stencil; the FD truncation error sets the      │
│    residual floor (typically < 1e-8 relative for            │
│    Schwarzschild vacuum, per the module doc).               │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RESIDUAL                                                  │
│    r_μν = G_μν + Λ g_μν − κ T_μν,   κ = 8πG/c⁴             │
│    residual = max over (μ,ν) of |r_μν| / max(|g_μν|, 1)     │
│    (per-component scale-normalized, dimensionless)          │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Returns a single dimensionless number.
   For Schwarzschild vacuum (T=0, Λ=0) it is the FD floor.
```

The `verifyKillingEquation` flow is analogous. It takes caller-supplied exact Christoffels through `christoffelAt` and returns the maximum of |∇_μ ξ_ν + ∇_ν ξ_μ| at a point. By default (`constantKilling: true`) it uses metric compatibility and no finite differences. With `constantKilling: false` it uses finite differences: for ∂ξ only when `dMetricFn` is supplied, and for the whole lowered field otherwise. `verifyKillingEquation` does not compare the residual against a tolerance. `checkKillingEquation` makes that comparison. The check applies `KillingEquationOptions.tolerance` (default 1e-10) to the relative residual, residual / max(max|g_μν|, 1), and returns `withinTolerance`.

---

## Flow 8: Bridge-Edge Composition

**Purpose**: Chain two bridge edges through a shared quantity into a derived relation. The pool of composable edges is `CATALOG_GRAPH`, projected from `data/bridge-catalog.json`; the edge count is `NOTES.md`. The sentence that named a 49-edge graph assembled from calibration, tranche, seed and applied-physicist files is the record from before the catalog engine.

**Entry point**: `composeEdges(first: BridgeEdge, second: BridgeEdge, opts?: ComposeOptions): BridgeEdge`

```
Caller picks two edges (e.g., be42Edge: M → T_H, be16Edge: T → E_min)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. JUNCTION SEARCH                                           │
│    Match first.target against second.sources by name, then  │
│    via QUANTITY_IDENTIFICATIONS (+ opts.identifications).    │
│    No match → throw CompositionJunctionError.                │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DIMENSION CHECK at the junction                           │
│    equals(first.target.dim, junction.dim) or throw          │
│    CompositionDimensionError.                                │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ALIAS GATE (namespacing gate, Option D)                   │
│    For every source-quantity name appearing in BOTH          │
│    operands (outside the junction):                          │
│    ├── look up SOURCE_ALIAS_DISPOSITIONS[composedId],        │
│    │   then opts.aliases                                     │
│    ├── 'shared'        → one input feeds both slots          │
│    ├── {renameSecond}  → second operand's slot renamed +     │
│    │                     inputs remapped                     │
│    └── no disposition  → throw CompositionAliasError         │
│    (Forcing example: be-42>>be-12 would silently feed one    │
│    'mass' to both the black-hole and particle slots.)        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DERIVED EDGE                                              │
│    evaluate = pipe(first.evaluate → second.evaluate);        │
│    confidence = minConfidence(first, second);                │
│    kind = 'law' only if both operands are laws; beId = null. │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Derived BridgeEdge — e.g., CT-1: E_min(M) = ℏc³ln2/(8πGM)
   from BE-42∘BE-16, checkable via consistencyRatio().
```

---

## Flow 9: Phase-D Enumeration + Uncertainty Propagation

**Purpose**: Mechanically enumerate all valid two-edge compositions over the graph (the Part-IX Phase-D loop), and attach observational uncertainty to any edge's prediction.

**Entry points**:
- `enumerateCompositions(edges: readonly BridgeEdge[]): EnumerationReport`
- `propagateUncertainty(edge, inputs, uncertainties): UncertaintyResult`

```
Caller supplies an edge pool (e.g., CATALOG_FULL_EDGES + named edges)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. PAIRWISE SWEEP (enumerate.ts)                             │
│    For every ordered pair (A, B), A ≠ B:                    │
│    attempt composeEdges(A, B) and classify the outcome:     │
│    ├── success → CompositionCandidate                       │
│    │   ├── id in REGISTERED_COMPOSITION_IDS → registered    │
│    │   │   (completeness check)                              │
│    │   └── else → NOVEL candidate (review surface)          │
│    ├── CompositionJunctionError / CompositionDimensionError │
│    │   → skipped: a silent non-pair, not reported           │
│    └── CompositionAliasError → requiresDisposition[]        │
│        (held at the gate, not silently composed)            │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   EnumerationReport { all, registered, novel, requiresDisposition }.
   Novel candidates are review surfaces:
   docs/research/v0.1{0,1}.0-novel-candidates.md.

Uncertainty path (uncertainty.ts):
┌─────────────────────────────────────────────────────────────┐
│ propagateUncertainty(edge, inputs, σ_inputs)                 │
│    ├── central-difference Jacobian of edge.evaluate at the  │
│    │   input point (first-order)                             │
│    └── σ_out² = Σᵢ (∂f/∂xᵢ · σᵢ)²                          │
│    Works on composed edges for free (they are BridgeEdges). │
│    No module in src/ calls it. confrontBE36With-            │
│    Uncertainty (Δt = 1.74±0.05 s → σ ≈ 1.9e-17 on the       │
│    BE-36 bound) and confrontBE23WithUncertainty compute     │
│    σ analytically instead: each is linear in its one        │
│    uncertain input.                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 10: Confrontation (`upt confront`)

**Purpose**: Compare a bridge's prediction — or, for a bound-type bridge, its encoded bound — against an INDEPENDENT, cited real-world observation. Confrontation is orthogonal to the discovery funnel (Flow 11): it operates only on catalog bridges (established and speculative), never on discovery candidates.

**Entry point**: CLI `upt confront [--bridge=be-XX] [--sensitivity] [--json]` (`src/cli/commands/confront.ts`) → `listConfrontations()` / `runConfrontation(bridgeId)` (`src/bridges/confrontations.ts`).

```
Caller runs `upt confront` (all bridges) or `upt confront --bridge=be-37`
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. REGISTRY LOOKUP                                           │
│    CONFRONTATIONS: Map<bridgeId, ConfrontationEntry>          │
│    One entry per confronted bridge; listConfrontations()     │
│    returns them in bridge-id order.                          │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. RUN — entry.run()                                         │
│    Calls the per-bridge confront*() function                │
│    (be*-confrontation.ts), which either:                    │
│    ├── recomputes a prediction from the bridge's closed      │
│    │   form (e.g. confrontBE37() → Shapiro-delay PPN γ), or │
│    └── reads an encoded bound (e.g. confrontBE36() → the    │
│        GW170817 speed-of-gravity bound)                     │
│    and pairs it with an independently-sourced observation    │
│    record carrying an ObservationProvenance (citation, year, │
│    retrieved date, optional note).                           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. NORMALIZE — wrap into a ConfrontationOutcome               │
│    (observations/types.ts) — a discriminated union on `kind`,│
│    each arm carrying only the fields it can honestly         │
│    populate:                                                 │
│    ├── 'value'        → predicted, observed, sigma,          │
│    │                    residualInSigma() (|Δ|/σ),           │
│    │                    withinObserved (≤1σ)                 │
│    ├── 'upper-bound'  → predicted (encoded bound), bound      │
│    │                    (observational bound), satisfied,     │
│    │                    optional `caveat` — e.g. BE-36's      │
│    │                    one-sided caveat (the encoded         │
│    │                    ± bound only tests the + side of an   │
│    │                    asymmetric GW170817 interval)         │
│    ├── 'consistency'  → predicted, approaches, fractionalGap  │
│    │                    (e.g. BE-21 KSS bound vs QGP, BE-11   │
│    │                    collisional decoherence)              │
│    └── 'table'        → rows[] of {predicted, observed,      │
│                          sigma, residualInSigma}              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. OPTIONAL SENSITIVITY (--sensitivity, value-kind only)      │
│    decidingMeasurement(bridgeId) ranks the prediction's       │
│    inputs by elasticity — which input the prediction depends │
│    on most STRONGLY, NOT which dominates the uncertainty      │
│    budget (that needs input sigma, not elasticity).           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Text summary (predicted/observed/σ/residual, within/outside 1σ,
   source citation) or --json envelope. Always carries the honest
   epistemics line: "confrontation is consistency, not confirmation;
   a passing confrontation does not prove the bridge."
```

---

## Flow 11: Discovery Funnel + Epistemic Grounding (`upt discover`)

**Purpose**: Hypothesize a cross-cluster quantity identification `a ≡ b` and vet it through an ordered falsifier stack. Then annotate every survivor with an honest ledger of what was actually tested. A physicist who reads `promising` then knows exactly how much weight the verdict bears.

**Entry point**: CLI `upt discover [--source=catalog|canonical|both] [--derive] [--max-orders] [--anchor] [--show-adjudicated] [--json]` (`src/cli/commands/discover.ts`).

```
Caller runs `upt discover`
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. PROPOSE — dimensional filter                              │
│    proposeLinkCandidates() (bridge-analysis.ts) surfaces      │
│    cross-cluster quantity pairs sharing an SI dimension       │
│    (the raw, weak-prior coincidence pool).                   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VET — rankDiscoveries() (composition/discovery.ts)         │
│    For each candidate a≡b, the funnel computes:             │
│    ├── magnitude gate — orders of magnitude apart (from       │
│    │   REPRESENTATIVE_VALUES or anchor-derived); > N orders   │
│    │   (default maxOrdersOfMagnitude=3) → 'magnitude-clash'   │
│    │   a ratio the anchor probe (×1e3) cannot move is         │
│    │   graph-fixed: an identity, shown as a grounding gap     │
│    ├── axis gate — scale/force RegimeAttributes agreement;    │
│    │   a clash → 'axis-clash' (a regime-label prior, no test) │
│    ├── structural signals — mergesComponents (union-find       │
│    │   over the quantity graph), unlocksFromAnchor            │
│    │   (forwardClosure), numericallyConsistent (retrodict     │
│    │   over the anchor-reachable subgraph); a contradiction   │
│    │   → 'contradictory'                                      │
│    └── verdict, in precedence order: 'magnitude-clash',     │
│        then 'contradictory' (not numerically consistent),   │
│        then 'axis-clash', then 'promising' (merges          │
│        components AND unlocks ≥1 quantity AND is not a      │
│        subsuming identification), else 'inert'              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ADJUDICATION LEDGER OVERLAY                                │
│    annotateAdjudications() (composition/adjudication.ts)      │
│    attaches any physicist-recorded verdict — 'genuine' |      │
│    'decoy' | 'entailed' | 'deferred' — sourced from            │
│    docs/research/*-adjudication.md. 'decoy'/'entailed'        │
│    candidates fold out of the printed PROMISING list by       │
│    default (--show-adjudicated relists them).                 │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CONSEQUENCE ANNOTATION                                     │
│    annotateConsequences() (composition/consequence.ts)        │
│    derives each promising candidate's monomial algebraic       │
│    consequence (deriveProposedBridges) and classifies it via   │
│    classifyProposal() against the canonical registry's        │
│    normalForm:                                                │
│    ├── 'entailed'           → re-derives a known canonical law│
│    ├── 'novel-consequence'  → valid, unadjudicated, no match  │
│    └── 'inconclusive'       → no monomial consequence derived │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. EPISTEMIC-GROUNDING LEDGER                                 │
│    describeGrounding() (composition/grounding.ts) — a pure,   │
│    annotation-only view over the candidate's already-computed│
│    falsifier results (never changes the verdict/score):      │
│    ├── passed — gates that ran a real comparison AND the      │
│    │   candidate survived (numerical-consistency, magnitude,  │
│    │   axis-compatible, consequence: entailed)                │
│    ├── gaps — gates that could NOT test it, or produced an    │
│    │   unadjudicated result (no representative value, no      │
│    │   resolved axis, consequence: novel/inconclusive)         │
│    └── the PERMANENT honest ceiling: mechanismTested: false    │
│        and dataTested: false — no mechanism-proxy gate and no │
│        propose→confront loop are buildable on dimensional      │
│        candidates alone (both assessed and correctly NOT       │
│        built; real mechanism/data confrontation                │
│        live in the ESTABLISHED-bridge world, Flow 10, reached  │
│        only after a candidate graduates via human review).     │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Text funnel summary (N candidates → promising/inert/magnitude-
   clash/contradictory/axis-clash counts), with each promising
   candidate's unlocks, consequence signal, grounding line, and any
   recorded adjudication; or --json envelope with the per-candidate
   result array + an adjudicationSummary tally. Always carries the
   review-surface epistemics line: "`promising` means 'worth a
   physicist's minute', not 'true'."
```

---

## Flow 12: Expression / Residual Search (`upt probe`)

**Purpose**: Bounded search for scalar expressions that explain a residual / unexplained-observation gap. Orthogonal to Flow 11. A trustworthy `no-credible-candidate` is a success.

**Entry point**: CLI `upt probe <scan|show|run|…>` (`src/cli/commands/probe.ts`) → `runProbeSearch` (`src/composition/probe/pipeline.ts`).

```
Caller runs `upt probe run --problem=FILE`
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 0. GATE — relation-link / regime-transition /               │
│    non-searchable / parametrically non-identifiable         │
│    → stopReason 'non-identifiable' (use `upt discover`)     │
└─────────────────────────────────────────────────────────────┘
          │ searchable residual gap
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. GENERATE — generateNative() Buckingham monomials         │
│    under SearchBudget (never unbounded)                     │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DEDUP + VALIDATE — fingerprint (normalForm hash);        │
│    dimensionally invalid → rejected                         │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FIT — fitPrefactor on exploratory rows only              │
│    Holdout leakage throws. No data → insufficient-evidence  │
│    or equivalent-known (corpus).                            │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. HOLDOUT + FALSIFY + PARETO                               │
│    Failed holdout → rejected / no-credible-candidate        │
│    Corpus match after holdout → equivalent-known            │
│    Survivors → expert-review-required (not a discovery)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 13: Atlas Path Query (`upt path`, `upt regime`)

**The interesting property of this flow is what it REFUSES to produce.**

```
upt path model-pendulum model-lc --at theta0=0.2 T0=1 t=10
        │
        ▼
  findPath(family, from, to)            src/atlas/path-bound.ts
        │   breadth-first over single-premise bridges; an exact-equivalence
        │   edge is traversable in BOTH directions. A multi-premise bridge is
        │   a JOIN, not a link, and is skipped rather than silently reduced
        │   to its first premise.
        │   Returns a ROUTE, not a warrant.
        ▼
  boundPath(bridges)                    four gates, in this order
        │
        ├── 1. RELATION. composeRelation folded along the path. The moment
        │      the running composite is 'no-composite-claim' the path has NO
        │      bound, and the function returns BEFORE any arithmetic — so no
        │      number is ever computed for a path that cannot carry one.
        │
        ├── 2. UNIFORMITY. Any bound whose uniformity is null or empty is
        │      not yet analysed: the path returns 'uniformity-unanalysed'
        │      and no Lipschitz arithmetic runs. An edge with no bound does
        │      not fail this gate.
        │
        ├── 3. LIPSCHITZ. composeBoundPath folds the per-edge (K, delta)
        │      pairs, outer-after-inner: (K2*K1, K2*d1 + d2). A null — an
        │      edge neither bounded nor exact — is tolerated ONLY as the last
        │      entry, where it terminates the claim; anywhere else it throws
        │      MissingLipschitzError rather than inventing a constant.
        │
        └── 4. NORM. Every stated norm on the path must be the SAME, and no
               unnormed exact map may carry a normed claim. IDENTITY_BOUND is
               the identity ONLY IN THE NORM A BRIDGE STATES, and an
               exact-equivalence bridge carries no bound, hence states no
               norm — so it contributes IDENTITY_BOUND in NO norm, UNLESS it
               declares a norm transport (AtlasBridge.normTransports) for the
               crossed direction whose `from` is the running norm and whose
               time map is uniform. Then it contributes (K_Φ, 0) in the
               transport's `to` norm, and each horizon before it is restated
               through the transport's time map (horizonOnRoute).
               docs/planning/ADR-transported-norm-composition.md.
        │
        ▼
  { kind: 'bound', bound, terminal, relation, norm, transports? }
        or
  { kind: 'no-claim', reason, detail }   ← carries NO number, by type
```

**Why the discriminated union rather than a nullable number.** A caller cannot read `.bound` off
a no-claim, because a no-claim has no `.bound`. The type enforces the refusal, not a documented
convention. The type is what stops a downstream reader treating "no bound" as zero.

**The composed number would often be unchanged. That the number is unchanged is the danger.** Composing
with the identity is arithmetically a no-op. So a path mixing a normed approximation with an
unnormed exact equivalence yields the RIGHT MAGNITUDE ATTACHED TO THE WRONG NORM. The gate exists because the
error is invisible in the arithmetic.

`upt regime <family> [--at group=value ...]` shares the regime machinery and reports each model as
valid, VIOLATED (naming the failed inequality), or UNKNOWN. **`regimeHolds` is TRI-STATE**: a
coordinate that `--at` never supplied is UNKNOWN, which is a failure to confirm validity and is
NOT a pass. Collapsing it to a boolean would turn every unchecked group into a silent green.

---

## Error Handling

UPT uses three distinct error-signalling mechanisms:

| Mechanism | Used For | Example |
|-----------|----------|---------|
| `throw` | Programmer errors, invalid ASTs, invariant violations | `NumericalBackendError`, `DimensionMismatchError`, `EngineCapabilityError`, the composition errors (`CompositionJunctionError`, `CompositionDimensionError`, `CompositionAliasError`, `DomainViolationError`), `NumericalBackendError` from bad inputs to `integrateGeodesic` |
| `Violation` entries in `ValidationResult` | Expected dimensional mismatches the caller should inspect | Non-homogeneous equation, mismatched free-index signatures |
| `warnings` in `NumericalResult` | Non-fatal numerical observations | Inverse-metric inconsistency. `DuplicateCoordinateWarning` is not here: validation throws `MetricSignatureError` by default, and emits the warning as a Node process warning only when `UPT_ALLOW_COORD_SHADOW=1` |

Error-severity violations make `ValidationResult.ok = false` and cause `evaluateNumerical()` to throw. Warning-severity violations appear in `NumericalResult.warnings` but do not block evaluation.

---

See `ARCHITECTURE.md` for the module design context. See `COMPONENTS.md` for per-component descriptions. See `API.md` for the public surface reference.

---

**Maintained by**: Daniel Simon Jr.

## Verification

Generated by `repo_map.py map`.
Regenerate: `python repo_map.py map <repo> --out <dir>` · Check: `python repo_map.py check <repo> --docs docs/architecture`

| Claim | Value | Source |
|---|---|---|
| runtimeCircularDeps | 0 | `dependency-graph.json` `statistics` |
| package export files the generator marks reachable | 4 | `docs:deps` log on `b1db6b66` (`package.json` `exports`: `.`, `numerical/mathts-engine`, `probe`, `atlas`) |

`entryRoots` and `reachableFiles` are not fields of the current `dependency-graph.json`. The previous table said 5 and 388. `repo_map.py` was not re-run. `src/cli/main.ts` is still reached from `bin/upt.mjs` by a runtime path, which a static import walk does not follow. The runtime call graph is `INTEGRATION_MAP.md`.

**`entryRoots` is 5.** The roots are `src/index.ts`, the subpath entries
`src/numerical/mathts-engine.ts`, `src/atlas/index.ts` and `src/composition/probe/index.ts`, and
`src/cli/main.ts`. The last is the interesting one: only
`bin/upt.mjs` reaches it. That launcher loads `dist/cli/main.js` via a path assembled at runtime. A
static resolver cannot follow that path, so `repo_map` recovers `src/cli/main.ts` as a root from
`bin/upt.mjs`.
