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
16. [Verification](#verification)

---

## Overview

Data in UPT flows through a layered system. The dimensional AST (`ExprNode`) is the central artifact — it travels from the caller through the validator and into the numerical backend. The bridge catalog (`BRIDGE_EQUATIONS`) is a separate data store that is queried independently of the AST pipeline.

```
┌───────────────────────────────────────────────────────────────────┐
│  Caller                                                           │
│  ├── Constructs ExprNode tree (or reads BRIDGE_RHS_BY_ID)         │
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
    (ok,                (einsum, matMul,
     inferredDimension,  forwardGrad, ...)
     freeIndices,
     violations)
```

---

## Flow 1: Bridge Validation

**Purpose**: Check that a bridge equation is dimensionally consistent without evaluating it numerically.

**Entry point**: `validate(node: ExprNode): ValidationResult`

**Dispatch**: the curvature, Weyl, Kretschmann, Killing-vector, conserved-charge, stress-energy and cosmological-constant kinds dispatch through `validator-registry.ts` (`lookupValidatorEntry`, `dispatchValidator`). The validators are in `curvature.ts`, `connection-validators.ts`, `weyl-validators.ts` and `curvature-invariants.ts`.

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
│    ├── 'op' ^                → power(baseDim, n) when       │
│    │                           the exponent is a decimal    │
│    │                           literal. A non-literal       │
│    │                           exponent is legal only on a  │
│    │                           dimensionless base. Any      │
│    │                           other exponent appends an    │
│    │                           error Violation.             │
│    ├── 'integral'            → multiply(f.dim, dx.dim)      │
│    ├── 'derivative'          → divide(f.dim, wrt.dim)       │
│    ├── 'dirac-delta'         → power(argDim, -1)            │
│    ├── 'variational-derivative'                             │
│    │                         → divide(divide(F.dim,         │
│    │                           field.dim), over.dim)        │
│    ├── 'transcendental'      → dimensionless; the           │
│    │                           argument must be             │
│    │                           dimensionless                │
│    ├── 'abs'                 → the dimension of the         │
│    │                           argument                     │
│    ├── 'tensor-symbol'       → validateTensorSymbol()       │
│    │                           (builds freeIndices map)     │
│    ├── 'tensor-product'      → computeContraction()         │
│    │                           (Einstein summation algebra) │
│    ├── 'metric-tensor'       → validateMetricTensor()       │
│    ├── 'kronecker-delta'     → validateKroneckerDelta()     │
│    ├── 'tensor-partial-      → validatePartialDerivative()  │
│    │    derivative'                                         │
│    ├── 'covariant-derivative'→ validateCovariantDerivative()│
│    ├── 'riemann-tensor', 'ricci-tensor', 'einstein-tensor', │
│    │   'bianchi-residual', 'weyl-tensor',                   │
│    │   'kretschmann-scalar', 'einstein-equation',           │
│    │   'killing-vector', 'conserved-charge',                │
│    └── 'stress-energy', 'cosmological-constant'             │
│          → the validator that validator-registry.ts         │
│            returns for the kind                             │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ACCUMULATE VIOLATIONS                                     │
│    Each mismatch appends a Violation entry:                 │
│    { location, expected, actual, note, severity }           │
│    A warning does not set ok to false. ok is also false     │
│    when the inferred dimension is null.                     │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RETURN ValidationResult                                   │
│    {                                                        │
│      ok: boolean,          // no error Violation, dim known │
│      inferredDimension,    // Dimension | null              │
│      freeIndices,          // Map<label, {upper,lower}>     │
│      violations,           // Violation[]                   │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Caller inspects result
```

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
│    // Override: pass engine in EvaluateOptions, or call     │
│    // setActiveEngine                                       │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. LOWERING PASS (lowering.ts lowerNode())                  │
│    Recursively translates ExprNode → EngineTensor:          │
│    ├── 'symbol'         → engine.fromNested(value, [])      │
│    │                    (value: inputs.tensors, through     │
│    │                    requireValue)                       │
│    ├── 'op' +,-        → engine.add / engine.sub            │
│    ├── 'op' *,/,^      → rank-0 only: computed in JS, then  │
│    │                    lifted back with engine.fromNested  │
│    ├── 'tensor-product' → engine.einsum(EinsumSpec, ...)   │
│    │   [contraction plan built by computeContraction()]     │
│    ├── 'integral'       → 16-point Gauss-Legendre           │
│    │                    (integrateGaussLegendre). Both      │
│    │                    bounds are required. A bound-less   │
│    │                    integral throws                     │
│    │                    NumericalBackendError               │
│    ├── 'transcendental', 'abs' → computed in JS             │
│    ├── tensor partial and covariant derivative              │
│    │                    → derivative-lowering.ts            │
│    ├── curvature nodes  → lowerCurvature (Flow 6)           │
│    └── 'derivative', 'dirac-delta', 'variational-           │
│        derivative', 'killing-vector', 'conserved-           │
│        charge', 'stress-energy', 'cosmological-             │
│        constant', 'einstein-equation' → throw               │
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

**Raw variant**: `evaluateNumericalRaw` skips step 5's `toNested()` call and returns a `NumericalRawResult` (`value`, `dim`, `freeIndices`, `warnings` and `dispose()`). Its `value` is the live `EngineTensor`. The caller calls `result.dispose()`.

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

**Entry point**: `BRIDGE_EQUATIONS: readonly BridgeEquationEntry[]`. The array holds the catalog records in id order.

```
import { BRIDGE_EQUATIONS } from 'universal-physics-tensor';

          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ FILTER by status / category / known issue                   │
│                                                             │
│ // All active (non-invalid) established bridges:            │
│ const established = BRIDGE_EQUATIONS                        │
│   .filter(e => e.status === 'established');                 │
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
│ entry.id                  // integer, unique in the catalog │
│ entry.name                // display name. Most cross-      │
│                          // domain names equal a spec       │
│                          // heading; a standard one has none│
│ entry.status              // BridgeEquationStatus           │
│ entry.formula_latex       // primary equation as LaTeX      │
│ entry.dimensional_signature // string, e.g. '[energy]'      │
│ entry.known_issues        // KnownIssue[]                   │
│ entry.references          // arXiv IDs, etc.               │
│ entry.dependencies        // ids of referenced bridges      │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Caller uses metadata (no dimensional or numerical layer touched)
```

The catalog is `data/bridge-catalog.json`. `dimensional_signature` is a string on every catalog entry. `tests/bridges/dimensional-signature-catalog.test.ts` pins the signature against the record.

Two derived views sit beside the array. `adjudicateCatalog()` applies the bridge-membership criterion, with the `rejected.ts` negative catalog as overlay. The function returns a `CatalogAdjudicationReport`: bridge ids grouped by verdict into `bridges`, `notABridges` and `unadjudicated`. The per-entry `BridgeVerdict` comes from `adjudicateBridgeEntry()`. `data/bridge-catalog.json` is the source record. `npm run catalog:json` checks it.

---

## Flow 5: Geodesic Integration (RK4 + GL4)

**Purpose**: Integrate a test-particle geodesic in an arbitrary Lorentzian manifold.

**Entry points**:
- `integrateGeodesic(inputs: GeodesicIntegratorInputs): GeodesicIntegratorResult` — fixed-step RK4.
- `integrateGeodesicGL4(initialState: GL4State, options: GL4Options): readonly GL4Snapshot[]` — GL4 Gauss–Legendre 4th-order symplectic integrator.

The RK4 path is traced below. The GL4 path does not take the RK4 shape. GL4 works on the canonical state `GL4State` (x, p), with p the covariant momentum. GL4 takes the inverse metric `gInverseFn` and its derivatives `dgInverseFn` instead of a Christoffel closure. GL4 does not use the explicit 4-stage Butcher tableau. Each GL4 step calls `gl4Step`, which calls MathTS `gaussLegendre4`. MathTS solves the implicit 2-stage Gauss–Legendre system by Picard fixed-point iteration on the stage values. The result is a symplectic update for the geodesic Hamiltonian H = ½ g^{μν} p_μ p_ν. If the Picard iteration does not converge, GL4 halves the step, down to `hMin` (default `h × 1e-9`). It then throws `GL4ConvergenceError`. The options `picardTol` (default 1e-12), `picardMaxIter` (default 50), `hMin`, `domainMinRadius` and `onStep` control this. The result holds `steps + 1` `GL4Snapshot` entries. Each snapshot holds `tau`, `x` and `p`. The type has an optional `v` that the integrator leaves unset. GL4 is the preferred path for long-time integration where energy drift matters. The `findPerihelion` finder consumes `(tau, x, p)` snapshots: GL4 output, not an RK4 trajectory, which carries positions only. The finder locates the − to + sign change of dr/dτ = g^{rν} p_ν. It estimates the root by linear interpolation of dr/dτ on that bracket. If the cubic Hermite polynomial through the bracket endpoints misses `tauTolerance` at that estimate, the finder calls MathTS `findRoot` (Brent method) on the polynomial.

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
│    Throw NumericalBackendError if tauStart or tauEnd is      │
│    not finite, if tauEnd equals tauStart, if x0[1] <         │
│    domainMinRadius (when supplied), or if steps is not a     │
│    positive integer.                                         │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RK4 INTEGRATION (rk4Trajectory)                         │
│    Cast geodesic ODE as first-order system on (x, v):      │
│      dx^μ/dτ = v^μ                                         │
│      dv^μ/dτ = −Γ^μ_{νρ}(x) v^ν v^ρ                       │
│                                                             │
│    dτ = (tauEnd − tauStart) / steps                         │
│    rk4Trajectory calls MathTS solveODESystem with dt = dτ. │
│    MathTS runs the classical RK4 stages for each step      │
│    i = 0 … steps-1:                                        │
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
│    rk4Trajectory throws if the state count is not          │
│    steps + 1. christoffelFn(x) is called 4× per step.      │
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

The integrator has no `TensorEngine` dependency. The integrator accepts a plain JS closure for the Christoffel symbol. The caller supplies the closure as a plain function. For Schwarzschild, `christoffel-flat.ts` builds the closure from the closed-form coefficients.

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
│    validate(node) looks up the validator in                  │
│    validator-registry.ts. The validators are in              │
│    curvature.ts, connection-validators.ts,                   │
│    weyl-validators.ts and curvature-invariants.ts.           │
│    Dimensional check only — no numeric work.                 │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LOWERING — lowerCurvature() dispatcher (lowering.ts)      │
│    A single dispatcher switches on node.kind for all six    │
│    curvature kinds:                                         │
│    ├── 'riemann-tensor', 'weyl-tensor', 'kretschmann-       │
│    │   scalar': build Riemann from the metric closures      │
│    │   in inputs.fields (christoffelAt, dGammaAt,           │
│    │   buildRiemann / riemannLowerAt helpers)               │
│    ├── 'bianchi-residual': bianchiResidualAt, which         │
│    │   calls covariantDerivRiemannLowerAt                   │
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

`computeKretschmann` is the contraction step of the `kretschmann-scalar` lowering. The function is also a root export. Call it with a lowered Riemann tensor and an inverse metric. It uses factored index-raising: four single-index raisings instead of the O(4⁸) naive contraction. Use it for direct sample-point diagnostics without a full AST node.

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
│    ├── metric closure gFn: x ↦ g_μν(x), and inverse-metric  │
│    │   closure gInvFn (both required)                       │
│    ├── stress-energy closure — x ↦ T_μν(x)                  │
│    ├── cosmological constant Λ (required; 0 for vacuum)     │
│    └── evaluation point — Vec4                              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ASSEMBLE G_μν                                             │
│    Build an einstein-tensor node and call lowerNode.         │
│    The lowering takes a fourth-order finite difference of    │
│    g and builds the Christoffel symbols. It takes a finite   │
│    difference of those symbols. The Riemann, Ricci and       │
│    Einstein arms then run, giving G_μν. The FD truncation    │
│    error sets the residual floor (typically < 1e-8           │
│    relative for Schwarzschild vacuum, per the module doc).   │
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

**Purpose**: Chain two bridge edges through a shared quantity into a derived relation. The pool of composable edges is `CATALOG_GRAPH`, projected from `data/bridge-catalog.json`.

**Entry point**: `composeEdges(first: BridgeEdge, second: BridgeEdge, opts?: ComposeOptions): BridgeEdge`

```
Caller picks two edges (for example `catalogEdge('be-42')`: mass to Hawking temperature, and `catalogEdge('be-16')`: temperature to Landauer erasure energy)
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. JUNCTION SEARCH                                           │
│    Match first.target against second.sources by name, then  │
│    via QUANTITY_IDENTIFICATIONS (+ opts.identifications).    │
│    No match → throw CompositionJunctionError.                │
│    If the match uses an identification, the composed edge    │
│    applies the convention factor of that identification.     │
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
│ 3. ALIAS GATE (name-collision rule)                          │
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
│    If both edges carry a relation, composeRelation           │
│    composes the relations. It throws                         │
│    UndefinedCompositionError when the composition table      │
│    has no cell. The function carries the regime, the         │
│    unset-coefficient flag, the even-input list and the       │
│    symbolic form. The composed evaluate checks both          │
│    validity domains and throws DomainViolationError on       │
│    a violation.                                              │
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
- `enumerateCompositions(edges: readonly BridgeEdge[], opts?: EnumerationOptions): EnumerationReport`
- `propagateUncertainty(edge, inputs, sigmas, opts?): UncertaintyResult`

```
Caller supplies an edge pool (for example CATALOG_GRAPH)
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
│    │   / UndefinedCompositionError / SymbolicEvalError      │
│    │   → skipped: a silent non-pair, not reported.          │
│    │   enumerateCompositionsWithRefusals reports            │
│    │   UndefinedCompositionError in relationRefusals.       │
│    │   Any other error is rethrown.                         │
│    └── CompositionAliasError → requiresDisposition[]        │
│        (held at the gate, not silently composed)            │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   EnumerationReport { all, registered, novel,
   requiresDisposition, proofTargets, notSubstitutable }.
   The last two fields stay empty without opts.seedIds.
   Novel candidates are review surfaces. The novel-candidate
   reports are in docs/research/.

Uncertainty path (uncertainty.ts):
┌─────────────────────────────────────────────────────────────┐
│ propagateUncertainty(edge, inputs, sigmas, opts?)          │
│    ├── evaluateEdge gives the central value; MathTS        │
│    │   propagateUncertainty gives the partial              │
│    │   derivatives (first-order)                           │
│    └── σ_out² = Σᵢ (∂f/∂xᵢ · σᵢ)²                          │
│    Works on composed edges for free (they are BridgeEdges). │
│    The library does not call it internally. Callers use    │
│    it directly.                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 10: Confrontation (`upt confront`)

**Purpose**: Compare the recorded prediction of a catalog bridge with a cited observation. For a bound-type bridge, compare the encoded bound with the observational bound. Each record states whether its prediction shares an input with the observation. Confrontation is separate from the discovery funnel (Flow 11). It works on catalog bridges only. It never works on discovery candidates.

**Entry point**: CLI `upt confront [be-XX] [--bridge=be-XX] [--rigor=stringent|moderate|loose] [--frontier] [--sensitivity] [--json]` (`src/cli/commands/confront.ts`). The command calls `listConfrontations()` through `ctx.api` (the `src/cli-api.ts` barrel), selects the entry, and calls `entry.run()`. `runConfrontation(id)` is a library export that the command does not call.

```
Caller runs `upt confront` (all bridges) or `upt confront --bridge=be-37`
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. LOAD — once, when the catalog loads                        │
│    catalogConfrontations() reads the `confrontations` of      │
│    data/bridge-catalog.json. The loader checks each stored    │
│    outcome and narrows it to a ConfrontationOutcome.          │
│    CONFRONTATIONS is a read-only map from catalog id to a     │
│    ConfrontationEntry (src/bridges/confrontations.ts).        │
│    listConfrontations() returns the entries in the order of   │
│    the catalog file.                                          │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SELECT                                                     │
│    parseBridgeId on the positional or --bridge id. A bad id,  │
│    or two different ids, is a usage error (exit 2). An id     │
│    with no confrontation is a command error (exit 1).         │
│    --rigor keeps one rigor tier. --frontier sorts the         │
│    σ-tests by their margin to the 1σ line.                    │
│    A catalog entry with `callerTable` (be-53) is not run. The │
│    command calls requestCallerTableConfrontation({}), prints  │
│    the missing inputs, and exits 0.                           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RUN — entry.run()                                          │
│    Returns the outcome that the catalog record stores. No     │
│    per-bridge function runs and nothing is recomputed.        │
│    The outcome is a discriminated union on `kind`. Each arm   │
│    carries only the fields it can honestly populate. Every    │
│    arm also carries `preprocessing` and `independence`.       │
│    ├── 'value'        → predicted, observed, sigma, units,   │
│    │                    provenance, optional `measured`,      │
│    │                    residualInSigma() (|Δ|/σ),            │
│    │                    withinObserved (≤1σ)                  │
│    ├── 'upper-bound'  → predicted, bound (observational       │
│    │                    bound), satisfied, optional `caveat`, │
│    │                    predictedIs ('point' or               │
│    │                    'encoded-bound'). BE-36 stores an     │
│    │                    encoded bound and a one-sided caveat: │
│    │                    the encoded ± bound only tests the +  │
│    │                    side of an asymmetric GW170817        │
│    │                    interval                              │
│    ├── 'consistency'  → predicted, approaches, fractionalGap, │
│    │                    fractionalGapIs ('agreement-bound' or │
│    │                    'observed-difference'), predictedIs   │
│    │                    ('reference' or 'lower-limit'). The   │
│    │                    decision of a 'lower-limit' record is  │
│    │                    observed ≥ predicted, not a gap       │
│    └── 'table'        → rows[] of {label, predicted,          │
│                          observed, sigma, residualInSigma}    │
│    Every record carries an ObservationProvenance (citation,   │
│    year, retrieved date, optional note).                      │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. OPTIONAL SENSITIVITY (--sensitivity)                       │
│    decidingMeasurement(bridgeId) (src/bridges/sensitivity.ts) │
│    ranks the prediction's inputs by elasticity — which input  │
│    the prediction depends on most STRONGLY, NOT which         │
│    dominates the uncertainty budget (that needs input sigma,  │
│    not elasticity). It returns an empty list unless the       │
│    record is of kind 'value' and stores a `prediction` point. │
│    The command then prints "no ranked-input model".           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Text summary or --json envelope. The text lists the rigor,
   the statistic, the data-handling distribution, and for each
   record the statistic, preprocessing, independence and notes.
   The JSON envelope adds `epistemics`, `rigorDistribution`,
   `statisticDistribution` and `dataHandlingDistribution`, and
   each result adds `comparison` and `statistic`. Both carry the
   honest epistemics line: "confrontation is consistency, not
   confirmation; a passing confrontation does not prove the bridge."
```

---

## Flow 11: Discovery Funnel + Epistemic Grounding (`upt discover`)

**Purpose**: Hypothesize a cross-cluster quantity identification `a ≡ b` and vet it through an ordered falsifier stack. Then annotate every survivor with an honest ledger of what was actually tested. A physicist who reads `promising` then knows exactly how much weight the verdict bears.

**Entry point**: CLI `upt discover [--source=catalog|canonical|both] [--derive] [--max-orders] [--anchor] [--show-adjudicated] [--require-falsifier] [--json]` (`src/cli/commands/discover.ts`). The command resolves the graph with `resolveGraph` (`src/cli/graphs.ts`) and reads its options with `parseDiscoveryOpts` (`src/cli/commands/_discovery-opts.ts`). An `--anchor` without `=` is a usage error (exit 2). A negative `--max-orders`, an unknown anchor name, an anchor with the wrong unit or dimension, and a duplicate anchor are command errors (exit 1).

```
Caller runs `upt discover`
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. PROPOSE + VET — rankDiscoveries()                          │
│    (composition/discovery.ts)                                 │
│    rankDiscoveries() first calls proposeLinkCandidates()      │
│    (composition/bridge-analysis.ts). That call surfaces       │
│    cross-cluster quantity pairs that share one non-           │
│    dimensionless SI dimension: the raw, weak-prior pool of    │
│    coincidences. Then, for each candidate a≡b, it computes:   │
│    ├── magnitude gate — orders of magnitude apart. A value    │
│    │   comes from the sourced table (REPRESENTATIVE_VALUES),  │
│    │   then from a registered constant that the graph fixes   │
│    │   with no anchor, then from the quantity's own equation  │
│    │   (deriveOwnEquationMagnitudes, only when its            │
│    │   uncertainty is at most one decade), then from the      │
│    │   anchor. More than N orders (default                    │
│    │   maxOrdersOfMagnitude=3) → 'magnitude-clash'.           │
│    │   A ratio that the anchor probe (×1e3) cannot move is    │
│    │   fixed by the graph: an identity. It shows as a         │
│    │   grounding gap and counts as no magnitude evidence, so  │
│    │   the row cannot be 'promising'. A clash stays a clash.  │
│    ├── axis gate — scale/force RegimeAttributes agreement;    │
│    │   a clash → 'axis-clash' (a regime-label prior, no test) │
│    ├── structural signals — mergesComponents (the shared      │
│    │   component partition, clusterBySharedKeys),             │
│    │   unlocksFromAnchor (forwardClosure), and                │
│    │   numericallyConsistent. It is false only when the       │
│    │   identification creates a new disagreement at a node    │
│    │   downstream of a or b (retrodictNode); disagreements    │
│    │   that the base graph already has do not count.          │
│    │   A contradiction → 'contradictory'                      │
│    └── verdict, in precedence order: 'magnitude-clash',       │
│        then 'contradictory' (not numerically consistent),     │
│        then 'axis-clash', then (merges components AND         │
│        unlocks ≥1 quantity AND is not a subsuming             │
│        identification) 'promising' when the magnitude gate    │
│        ran and could fail, or 'promising-unchecked' when it   │
│        did not, else 'inert'                                  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ADJUDICATION LEDGER OVERLAY                                │
│    annotateAdjudications() (composition/adjudication.ts)      │
│    attaches any physicist-recorded verdict — 'genuine' |      │
│    'decoy' | 'entailed' | 'deferred' — from the              │
│    `adjudications` block of data/bridge-catalog.json. Each    │
│    record names a document in docs/research/. 'decoy' and     │
│    'entailed' candidates fold out of both printed PROMISING   │
│    lists by default (--show-adjudicated relists them). The    │
│    --derive branch skips this step.                           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CONSEQUENCE ANNOTATION                                     │
│    annotateConsequences() (composition/consequence.ts)        │
│    derives the monomial algebraic consequence of each         │
│    candidate in either promising tier (deriveProposedBridges) │
│    and classifies it via classifyProposal() against the       │
│    canonical registry's normalForm:                           │
│    ├── 'entailed'           → re-derives a known canonical law│
│    ├── 'novel-consequence'  → valid, unadjudicated, no match  │
│    └── 'inconclusive'       → no monomial consequence derived │
│    The --derive branch skips this step. It calls              │
│    deriveProposedBridges() and describeDerivedClaim() and     │
│    prints each proposal.                                      │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. EPISTEMIC-GROUNDING LEDGER — computed at print time        │
│    describeGrounding() (composition/grounding.ts) — a pure,   │
│    annotation-only view over the candidate's already-computed │
│    falsifier results (never changes the verdict/score):      │
│    ├── passed — gates that ran a real comparison AND the      │
│    │   candidate survived (numerical-consistency, magnitude,  │
│    │   axis-compatible, consequence: entailed). A             │
│    │   magnitude-clash row has no magnitude line              │
│    ├── gaps — gates that could NOT test it, or produced an    │
│    │   unadjudicated result (no representative value, no      │
│    │   resolved axis, consequence: novel/inconclusive, a      │
│    │   magnitude that is anchor-invariant)                    │
│    └── the PERMANENT honest ceiling: mechanismTested: false    │
│        and dataTested: false. A dimensional candidate has no  │
│        mechanism proxy and no observable to confront. Real    │
│        mechanism and data confrontation live in the           │
│        ESTABLISHED-bridge world, Flow 10, reached only after  │
│        a candidate graduates via human review.                │
│    describeReadiness() adds a per-row and per-tier readiness  │
│    line. --require-falsifier keeps the rows for which an      │
│    independent falsifier ran and survived.                    │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
   Text funnel summary (N candidates → counts of promising,
   promising with the magnitude unchecked, inert, magnitude-clash,
   contradictory and axis-clash, then a readiness line per tier).
   Within a tier, rows are in order of consequence signal, then
   score. Each promising candidate shows its unlocks, consequence
   signal, grounding line, and any recorded adjudication. Other
   sections list the MAGNITUDE-CLASH (with p and basis),
   SUBSUMING, CONTRADICTORY and AXIS-CLASH rows. The --json
   envelope holds the source, the anchor, the options, the
   epistemics line, the readiness of both promising tiers, the
   per-candidate result array (each result with its grounding and
   readiness), and an adjudicationSummary tally. Always carries the
   review-surface epistemics line: "`promising` means 'worth a
   physicist's minute', not 'true'."
```

---

## Flow 12: Expression / Residual Search (`upt probe`)

**Purpose**: Bounded search for scalar expressions that explain a residual / unexplained-observation gap. Orthogonal to Flow 11. A trustworthy `no-credible-candidate` is a success.

**Entry point**: CLI `upt probe <scan|show|run|candidates|falsify|rank|design|reproduce|study>` (`src/cli/commands/probe.ts`). The subverbs `run`, `candidates`, `falsify`, `rank` and `reproduce` call `runProbeSearch` (`src/composition/probe/pipeline.ts`) through `ctx.api`. The subverbs `scan` and `show` call `scanWithExpressionGaps`, `design` calls `suggestDiscriminatingPoint`, and `study` calls `runProbeStudy` (`src/composition/probe/study.ts`).

The search subverbs load the problem with `loadSearchProblemFromJson` (`src/composition/probe/problem.ts`). A bad problem file is a command error (exit 1). A missing `--problem` is a usage error (exit 2). The flags `--budget-ms`, `--holdout-tol` and `--worker` set the budget, the holdout tolerance (it must be above 0) and an external worker script. The final step formats the result with `formatProbeReport`, or as a JSON envelope.

```
Caller runs `upt probe run --problem=FILE`
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 0. GATE — relation-link / regime-transition /               │
│    non-searchable / parametrically non-identifiable         │
│    → stopReason 'non-identifiable'. A relation-link or      │
│    regime-transition gap names `upt discover`. The other    │
│    two gaps give their own reasons.                         │
└─────────────────────────────────────────────────────────────┘
          │ searchable residual gap
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. GENERATE — generateNative() under SearchBudget           │
│    (never unbounded). It yields Buckingham monomials. When  │
│    the governing set leaves π-groups and exploratory rows   │
│    exist, it also yields a rational power law over the      │
│    π-groups. With --worker, candidates from an external     │
│    NDJSON worker are appended.                              │
└─────────────────────────────────────────────────────────────┘
          │ all candidates, before step 2 starts
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DEDUP + VALIDATE — for each candidate, in this order:    │
│    fingerprint (normalForm hash) and drop a duplicate;      │
│    reject a candidate that reads the target; reject a       │
│    dimensionally invalid candidate; reject a dimension      │
│    that is not the target's; compare with the corpus        │
│    (compareToCorpus). No data → insufficient-evidence or    │
│    equivalent-known.                                        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. FIT — fitPrefactor on exploratory rows only              │
│    fitPrefactor throws when a holdout row repeats an        │
│    exploratory row. The pipeline catches the error and      │
│    rejects that candidate. No holdout rows after the fit →  │
│    insufficient-evidence.                                   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. HOLDOUT + FALSIFY + PARETO                               │
│    Failed holdout → rejected / no-credible-candidate        │
│    Corpus match after holdout → equivalent-known            │
│    A failed falsification battery → falsified               │
│    Survivors → falsification-survivor, then                 │
│    expert-review-required (not a discovery)                 │
│    After the loop, rankPareto orders the survivors. The     │
│    stop reason is a budget stop, no-credible-candidate, or  │
│    exhausted-space.                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 13: Atlas Path Query (`upt path`, `upt regime`)

**The interesting property of this flow is what it REFUSES to produce.**

```
upt path model-pendulum model-lc --at theta0=0.2 T0=1 t=10
        │
        ▼
  selectRoute(from, to)                 src/cli/commands/_atlas-route.ts
        │   When both models are in one family, findPath(family, from, to)
        │   searches that family. When that finds no route, or the models
        │   are in different families, findAtlasPath(from, to) searches
        │   every family. Both are in src/atlas/path-bound.ts. Both search
        │   breadth-first over single-premise bridges; an exact-equivalence
        │   edge is traversable in BOTH directions. A multi-premise bridge
        │   is a JOIN, not a link, and is skipped rather than silently
        │   reduced to its first premise.
        │   Returns a ROUTE, not a warrant.
        ▼
  boundPath(bridges)                    five gates; the first to fail sets
        │                               the reason
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
        ├── 4. CROSS-FAMILY VOCABULARY. A norm that crosses a family
        │      boundary without a witnessed norm transport carries no bound:
        │      the path returns 'cross-family-unmapped'. A one-step route
        │      does not reach this gate.
        │
        └── 5. NORM. Every stated norm on the path must be the SAME
               ('norm-mismatch' otherwise), and no unnormed exact map may
               carry a normed claim ('norm-not-stated'). IDENTITY_BOUND is
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

The source comment of `boundPath` numbers the norm gate 4 and the vocabulary gate 5. The code runs the vocabulary gate first. The list above follows the order of execution.

**Why the discriminated union rather than a nullable number.** A caller cannot read `.bound` off
a no-claim, because a no-claim has no `.bound`. The type enforces the refusal, not a documented
convention. The type is what stops a downstream reader treating "no bound" as zero.

`boundPath` throws `MissingLipschitzError` when a step before the last has no Lipschitz constant. `upt path` catches it and reports the reason `missing-lipschitz`. That result also carries no number.

**The composed number would often be unchanged. That the number is unchanged is the danger.** Composing
with the identity is arithmetically a no-op. So a path mixing a normed approximation with an
unnormed exact equivalence yields the RIGHT MAGNITUDE ATTACHED TO THE WRONG NORM. The gate exists because the
error is invisible in the arithmetic.

`upt path` also checks the route at the `--at` point. Each bridge gets a regime check through `regimeHolds`, and the check is tri-state (`true`, `false` or `'unknown'`). A group name that two bridges define differently is left unchecked. The command checks the horizon of the route only when `t` is given. When every regime holds and every step has a closed-form `deltaAt`, it also re-runs `boundPath` with each `deltaAt` and prints the bound at the point. A violated regime or horizon withdraws the composed bound from the text and the JSON. The command exits 3 when a regime or a horizon is violated, or when a tolerance is inadequate. For a refusal, it lists what the path would need (`missingForComposite`).

`upt regime <family> [--at group=value ...] [--assume premise ...] [--deny premise ...] [--json]` shares the regime machinery. It reports every model and every bridge of the family as `valid`, `VIOLATED` (naming the failed inequality), `unknown` or `VACUOUS`. A record whose regime states no inequality is `VACUOUS`: no machine condition was evaluated. The `<family>` is one of the three atlas families, or one of the domain registrations `plasma`, `piezoelectricity` and `tolman`, which are single `VACUOUS` records. The command also prints the pairwise overlap and the uncovered regions of the `--at` box. It exits 3 when any record is `VIOLATED`. **`regimeHolds` is TRI-STATE**: a
coordinate that `--at` never supplied is UNKNOWN, which is a failure to confirm validity and is
NOT a pass. A violated inequality outranks a missing coordinate. Collapsing the result to a boolean would turn every unchecked group into a silent green.

---

## Error Handling

UPT signals a failure in four ways.

| Mechanism | Used For | Example |
|-----------|----------|---------|
| `throw` | Programmer errors, invalid ASTs, invariant violations | `NumericalBackendError` (also from bad inputs to `integrateGeodesic`), `DimensionMismatchError`, `FreeIndexMismatchError`, `EngineCapabilityError`, the composition errors (`CompositionJunctionError`, `CompositionDimensionError`, `CompositionAliasError`), `DomainViolationError` (bridge evaluators) |
| `Violation` entries in `ValidationResult` | Expected dimensional mismatches the caller should inspect | A non-homogeneous equation; a free-index mismatch between the two sides of an equation |
| `warnings` in `NumericalResult` | Non-fatal numerical observations | Inverse-metric inconsistency. `DuplicateCoordinateWarning` is not here: validation throws `MetricSignatureError` by default, and emits the warning as a Node process warning only when `UPT_ALLOW_COORD_SHADOW=1` |
| A typed refusal that carries no value | A function that must refuse rather than guess | The `no-claim` result of `boundPath`; the `abstain` result and stop reason of the probe pipeline; the `refused` status of a caller-table confrontation |

A free-index mismatch inside a sum throws `FreeIndexMismatchError`.

Error-severity violations make `ValidationResult.ok = false` and cause `evaluateNumerical()` to throw. Warning-severity violations appear in `NumericalResult.warnings` but do not block evaluation.

The `upt` command maps errors to exit codes. A usage error exits 2. A command error exits 1. A failed check exits 3 (`EXIT_CHECK_FAILED`, returned, not thrown). A defect exits 70.

---

See `ARCHITECTURE.md` for the module design context. See `COMPONENTS.md` for per-component descriptions. See `API.md` for the public surface reference.

---

## Verification

Regenerate: `repo-tools map <repo> --out=<dir>` · Check: `repo-tools check <repo> --docs=docs/architecture`

| Claim | Value | Source |
|---|---|---|
| runtimeCircularDeps | 0 | `dependency-graph.json` `statistics.runtimeCircularDeps` |

The claim covers the whole repository, tests and tools included. The `dependency-graph.json` in the Source column is the output of `repo-tools map`. The committed `docs/architecture/dependency-graph.json` is a different file, which `bun run docs:deps` writes for `src/`.

**Entry points.** The package has five entry points. The `exports` map of `package.json` names four: `.` (`src/index.ts`), `./numerical/mathts-engine` (`src/numerical/mathts-engine.ts`), `./probe` (`src/composition/probe/index.ts`) and `./atlas` (`src/atlas/index.ts`). The `bin` entry `upt` (`bin/upt.mjs`) is the fifth. It loads `dist/cli/main.js`, the compiled `src/cli/main.ts`, with an `import()` of a path built at run time. A static import walk does not follow that path. No `exports` entry reaches `src/cli/main.ts`, and no file under `src/` imports it. Production code reaches it only through the `bin` entry. Test files import it directly. `INTEGRATION_MAP.md` section 1 shows how the CLI loads and dispatches a command.

**Claims the gate cannot hold.** The gate does not read the entry points. They come from `package.json` and `bin/upt.mjs`. The other statements describe the source files that the text names, and the gate does not read them.
