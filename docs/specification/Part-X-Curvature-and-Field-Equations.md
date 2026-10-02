# Part X — Connection, Curvature & Field-Equation Layers

> **Scope:** the v0.4.0–v0.7 growth of UPT's `ExprNode` grammar beyond the
> Part-VII (v0.2.0 tensor algebra) and Part-VIII (v0.3.0 metric) layers:
> the connection layer (`covariant-derivative`), the curvature node family
> (Riemann through Kretschmann), the isometry layer (Killing vectors), the
> Einstein-field-equation layer, and the v0.7 structural predicate families
> (RG flow, Friedmann variants, gauge-field time symmetry, tensor trace).
>
> **Character of this part (added 2026-06-10):** unlike Parts VII/VIII,
> which were written alongside their implementations and are machine-checked
> via `TENSOR-RULE` markers, Part-X is a **descriptive, code-first spec**
> written after the layers shipped. The authoritative definitions are the
> TypeScript interfaces and validators cited per section; where this
> document and the code disagree, the code + its test suite win. No
> `TENSOR-RULE` markers are used here.

## §X.1 Grammar overview

The live `ExprNode` union (`src/dimensional/validator.ts`) carries **21
kinds**: the 4 scalar primitives (`symbol`, `op`, `integral`, `derivative`),
the 2 Part-VII tensor-algebra kinds, the 3 Part-VIII metric kinds, and the
12 kinds spec'd in §X.2–§X.5 below. A further family of **structural
predicate nodes** (§X.6) validates separately and is *not* part of the
`ExprNode` union — those nodes assert equation-level well-formedness rather
than producing a dimensioned value.

| Layer | Release | Kinds | Spec'd in |
|---|---|---|---|
| Scalar core | v0.1.x | `symbol` `op` `integral` `derivative` | Part-I/III grammar notes |
| Tensor algebra | v0.2.0 | `tensor-symbol` `tensor-product` | Part-VII |
| Metric | v0.3.0 | `metric-tensor` `kronecker-delta` `tensor-partial-derivative` | Part-VIII |
| Connection | v0.4.0 | `covariant-derivative` | §X.2 |
| Curvature | v0.5.0–v0.6.0 | `riemann-tensor` `ricci-tensor` `einstein-tensor` `bianchi-residual` `weyl-tensor` `kretschmann-scalar` | §X.3 |
| Isometry | v0.6.0 | `killing-vector` `conserved-charge` | §X.4 |
| Field equation | v0.6.0–v0.7 | `stress-energy` `cosmological-constant` `einstein-equation` (+ non-union `klein-gordon-equation`) | §X.5 |
| Structural predicates | v0.7 | `beta-function` `rg-coupling` `friedmann-equation` `gauge-field` `time-symmetry-predicate` `tensor-trace` `scalar-field` (none in `ExprNode`) | §X.6 |

## §X.2 Connection layer (v0.4.0)

**`covariant-derivative`** (`CovariantDerivativeNode`,
`src/dimensional/connection-validators.ts`; validator
`validateCovariantDerivative`). Fields: `of` (operand), `wrt` (coordinate,
dimension carrier), `wrtIndex` (a `lower`-variance index label), `gLower` /
`gInverse` (the metric pair consumed internally by the implicit Christoffel
contraction — their indices do **not** propagate to the output; this
"internal-metric" convention, tagged H1 in the validators, recurs across
the curvature family). Output dimension is `of.dim / wrt.dim`; output free
indices are `of`'s plus `{wrtIndex.label: lower}`. Rejected: non-`lower`
`wrtIndex` variance, malformed metric-pair signatures, and label collision
between `wrtIndex` and `of`'s free indices. Numerical lowering: full
Christoffel machinery in `src/numerical/lowering.ts` /
`derivative-lowering.ts` (Christoffel symbols via `src/dimensional/
connection.ts`, finite-difference metric derivatives via `pderiv`,
4th-order default since v0.6.0).

## §X.3 Curvature layer (v0.5.0–v0.6.0)

All six curvature kinds are built through the
**`CurvatureCompositeNode<K, S>`** intersection-type factory
(`src/dimensional/curvature-composite.ts`): `{ kind: K } & S`, with the
per-kind slot payload `S` carried structurally. The companion
`CURVATURE_KIND_REGISTRY` records each kind's free-index shape and
component dimension. Dimension conventions (geometric, coordinate-basis):
Christoffel ~ [L⁻¹], Riemann/Ricci/Einstein/Weyl **[L⁻²]**, Bianchi
residual **[L⁻³]**, Kretschmann **[L⁻⁴]**.

- **`riemann-tensor`** (`RiemannTensorNode`,
  `src/dimensional/connection-validators.ts`, `validateRiemannTensor`).
  Index structure `R^ρ_{σμν}`: one `upperIndex` + exactly three
  `lowerIndices`, all four labels pairwise distinct. Slots `gLower`,
  `gInverse`, `xCoord` are internal (H1). Output free indices
  `{ρ:upper, σ:lower, μ:lower, ν:lower}`, dim [L⁻²].
- **`ricci-tensor`** (`RicciTensorNode`, `src/dimensional/curvature.ts`,
  `ricci()` constructor). Contraction `R_{μν} = R^λ{}_{μλν}` (Carroll
  Eq. 3.91): the upper index contracts against the **second** lower slot
  (`lowerIndices[1]`); the surviving free indices are `lowerIndices[0]`
  and `lowerIndices[2]`. ⚠ This slot choice is the site of the historical
  v0.5.0 "ricci-slot" bug (contracting `lowerIndices[0]` instead silently
  breaks de Sitter `R = 4Λ`); it is pinned by tests and must not be
  "simplified".
- **`einstein-tensor`** (`EinsteinTensorNode`,
  `src/dimensional/curvature.ts`). `G_{μν} = R_{μν} − ½R·g_{μν}` with the
  scalar trace `R = g^{μν}R_{μν}` formed from the internal `gInverse`.
  Free indices and dimension identical to Ricci.
- **`bianchi-residual`** (`BianchiResidualNode`,
  `src/dimensional/curvature.ts`). Second-Bianchi cyclic sum
  `∇_λ R_{ρσμν} + ∇_ρ R_{σλμν} + ∇_σ R_{λρμν}` as a residual that must
  vanish; rank-5 all-lower output (two synthesised labels + the Riemann
  free labels, collision-checked), dim [L⁻³].
- **`weyl-tensor`** (`WeylTensorNode`,
  `src/dimensional/weyl-validators.ts`, `validateWeylTensor`). Trace-free
  part `C^ρ_{σμν}` of Riemann; same index structure and [L⁻²] dimension as
  Riemann; spacetime dimension n = 4 is hard-coded in the subtraction
  coefficients.
- **`kretschmann-scalar`** (`KretschmannScalarNode`,
  `src/dimensional/curvature-invariants.ts`). Full self-contraction
  `K = R_{ρσμν}R^{ρσμν}`; scalar output (no free indices), dim [L⁻⁴].
  Curvature-singularity diagnostic (e.g., Schwarzschild `K = 12r_s²/r⁶`;
  near-horizon behaviour exercised via the Painlevé-Gullstrand metric in
  `src/numerical/painleve-gullstrand-metric.ts`).

All six lower numerically via the finite-difference pipeline in
`src/numerical/lowering.ts` + `curvature-lowering-helpers.ts`
(`christoffelAt` → `dGammaAt` → `buildRiemann`, then per-kind
contractions; Weyl in `weyl-lowering.ts`).

## §X.4 Isometry layer (v0.6.0)

- **`killing-vector`** (`KillingVectorNode`,
  `src/dimensional/killing-validators.ts`, `validateKillingVector`).
  Wraps a rank-1 **upper**-variance `tensor-symbol` ξ^μ plus the metric
  whose isometry it generates. The Killing equation
  `∇_μ ξ_ν + ∇_ν ξ_μ = 0` (Carroll Eq. 3.174) is operator-valued and is
  checked **numerically**, not dimensionally — `verifyKillingEquation` in
  `src/numerical/killing.ts`.
- **`conserved-charge`** (`ConservedChargeNode`, same file,
  `validateConservedCharge`). `Q = ξ^μ p_μ`: full contraction of the
  Killing vector with a rank-1 **lower** momentum sharing its index label.
  Scalar output, dim = product of the operand dims. Geodesic constancy of
  Q is the v0.6.0 integrator-diagnostic (bit-exact conservation was the
  PC-1.5 evidence that cleared the GL4 integrator as the Shapiro-residual
  suspect).

## §X.5 Field-equation layer (v0.6.0–v0.7)

- **`stress-energy`** (`StressEnergyTensorNode`,
  `src/dimensional/stress-energy-validators.ts`). Rank-2 lower-lower
  symmetric `T_{μν}`, fixed `symbol: 'T'`, per-component dim
  [M·L⁻¹·T⁻²] (energy density). Antisymmetric / Belinfante-Rosenfeld
  variants are out of scope (symmetry is locked to `'symmetric'`).
  *Naming note:* the kind string is `'stress-energy'`; the string
  `'stress-energy-tensor'` appears only in a docstring example and is not
  a live kind.
- **`cosmological-constant`** (`CosmologicalConstantNode`, same file).
  Scalar `Λ`, dimension **enforced** to [L⁻²]; optional numeric `value`
  (e.g., 1.1056×10⁻⁵² m⁻² for ΛCDM).
- **`einstein-equation`** (`EinsteinFieldEquationNode`,
  `src/dimensional/einstein-equation.ts`,
  `validateEinsteinFieldEquation`). The predicate
  `G_{μν} + Λg_{μν} = (8πG/c⁴) T_{μν}` with fields `lhs` (Einstein
  tensor), `cosmological` (**`null` means the Λ term is omitted, which is
  semantically distinct from Λ = 0**), `metric`, `rhs` (stress-energy),
  and symbolic `coupling: 'einstein'` (no inline numeric). Three
  structural checks: free-index-label agreement across all terms,
  per-component dimensional homogeneity (every term reduces to [L⁻²]),
  and symmetry agreement. This node closes the historical BE-17 "Einstein
  field equation cannot be encoded" gap.
- **`klein-gordon-equation`** (+ helper **`scalar-field`**)
  (`KleinGordonEquationNode`, `ScalarFieldNode`,
  `src/dimensional/klein-gordon-equation.ts`). `(□ + m²)φ = J` with
  `field` φ, `mass` m² (dim enforced [L⁻²]), nullable `source` J, and
  symbolic `coupling: 'klein-gordon'`. Every term shares per-component
  dim `[field.dim · L⁻²]`. **Not** in the `ExprNode` union — it is the
  first demonstrator of the thin-validator field-equation pattern built
  on `field-equation-helpers.ts` (index-agreement, dim-homogeneity, and
  symmetry-agreement helpers shared with the EFE validator).

## §X.6 Structural predicate families (v0.7)

These nodes validate separately (each module exports its own
`validate*`), are **not** `ExprNode` members, and exist to give bridges
canonical machine-checkable structure. Wrapper nodes (`rg-coupling`,
`scalar-field`, `gauge-field`) carry name + dimension + discriminator
tags; predicate nodes assert relations over them.

| Family | Kinds | File | Consuming bridges |
|---|---|---|---|
| RG flow | `beta-function`, `rg-coupling` | `src/dimensional/rg-flow.ts` | BE-39 (asymptotic-safety NGFP), BE-53 (Yang-Mills asymptotic freedom) |
| Modified Friedmann | `friedmann-equation` (variant: `classical \| lqc \| brane \| dgp \| massive`) | `src/dimensional/friedmann-equation.ts` | BE-19 (`lqc`), BE-54 (`brane`) |
| Time symmetry | `gauge-field` (arrowOfTime: `retarded \| advanced \| symmetric`), `time-symmetry-predicate` | `src/dimensional/gauge-field.ts` | BE-50 (Wheeler-Feynman absorber condition) |
| Tensor trace | `tensor-trace` over the structural `TracableTensorNode` interface | `src/dimensional/tensor-trace.ts` | BE-13 (Einstein trace reduction, `R = 4Λ − (8πG/c⁴) T`) |

Key rules:

- **`beta-function`**: `β_n ≡ k ∂_k g_n`; all couplings dimensionless
  (RG discipline — the validator hard-rejects any non-`DIMENSIONLESS`
  `rg-coupling`), the `polynomialExpansion` is an ordinary `ExprNode`
  that must itself validate to dimensionless, `target ∈ couplings`, and
  the optional `fixedPoint` array must match `couplings.length`. The
  same primitive expresses both the BE-39 non-Gaussian fixed point
  `(g*, λ*) ≠ 0` and the BE-53 Gaussian UV fixed point `g* = 0` —
  flow-direction-agnostic by design.
- **`friedmann-equation`**: `H² = (8πG/3)·ρ·[correction]` with
  `hubble.dim ∈ {[T⁻¹], [T⁻²]}`, `density.dim = [M·L⁻³]`, and the
  variant discriminator enforcing `correction === null` iff
  `variant === 'classical'` (the `lqc` correction must additionally be
  dimensionless). Output dim [T⁻²].
- **`time-symmetry-predicate`**: asserts the Wheeler-Feynman absorber
  bound `|A_ret − A_adv| / |A_ret + A_adv| ≤ ε` over a retarded/advanced
  `gauge-field` pair; the two fields must share a dimension (the ratio is
  dimensionless by cancellation) and carry matching `arrowOfTime` tags.
- **`tensor-trace`**: `g^{μν} T_{μν}` over any rank-2 all-lower node
  satisfying `TracableTensorNode` (`indices`, `componentDim`,
  `symmetry`); inverse metric is dimensionless, so the scalar output
  inherits `componentDim` unchanged.

## §X.7 Lowering status

Every `ExprNode` union member of §X.2–§X.5 has numerical lowering in
`src/numerical/` (reference engine: `Float64ReferenceEngine`; optional
`MathTSEngine` via the subpath import). The §X.6 predicate families are
**symbolically validated only** — their numerical content lives in the
per-bridge evaluators (`src/bridges/equations/be-NN-*.ts`), which is
deliberate: the predicates pin structure and dimensions; bridges own the
physics numerics. `klein-gordon-equation` has a free-field
dispersion-relation evaluator (`src/numerical/klein-gordon.ts`:
`evaluateKGDispersionResidual` returns the dimensionless residual of
ω² = c²k² + (mc²/ℏ)²; `verifyKleinGordonPlaneWave` is the plane-wave
closure check), but **no FD wave-operator evaluator** — numerically
applying `□φ` to a field on a coordinate grid remains future work.

## §X.8 Cross-layer invariants

1. **Internal-metric convention (H1).** Metric slots embedded in
   connection/curvature nodes (`gLower`, `gInverse`, `xCoord`, `metric`)
   are consumed by the implied contractions; their index labels never
   propagate to the node's free-index output.
2. **Geometric-dimension ladder.** Γ [L⁻¹] → R^ρ_{σμν}, R_{μν}, G_{μν},
   C^ρ_{σμν} [L⁻²] → ∇R [L⁻³] → K [L⁻⁴]. Validators enforce these as
   fixed component dimensions, not inferred ones.
3. **Contraction-slot pins.** Ricci contracts `lowerIndices[1]`
   (Carroll Eq. 3.91); Kretschmann contracts all four index pairs. Both
   are regression-pinned after the v0.5.0 plan-level slot bug.
4. **Symbolic couplings.** Equation-level nodes carry coupling *tags*
   (`'einstein'`, `'klein-gordon'`, `'friedmann'`) rather than inline
   numerics; physical constants enter only at lowering/evaluation time
   from `src/core/constants.ts`.
5. **Null ≠ zero.** `EinsteinFieldEquationNode.cosmological: null` means
   "no Λ term", not "Λ = 0"; `FriedmannEquationNode.correction: null` is
   legal only for the `classical` variant.
6. **Label hygiene.** All multi-index nodes reject free-label collisions;
   synthesised labels (Bianchi's internal `λ`, contraction dummies) are
   collision-checked against operand labels (`fresh-label.ts`).
