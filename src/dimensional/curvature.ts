/**
 * Curvature-derived helpers — Ricci and Einstein (v0.5.0 Phase 1d).
 *
 * Module hosts the layer of GR objects derived by contraction of a
 * `RiemannTensorNode`:
 *
 *   - `ricci(R)`    → R_μν = R^λ_{λμν}
 *   - `einstein(R)` → G_μν = R_μν − ½ g_μν R
 *
 * The Bianchi validator stays here. `bianchiResidual`, the evaluator that
 * calls `evaluateNumerical`, lives in `numerical/bianchi-residual.ts` so
 * this module does not import `numerical`.
 *
 * Separation rationale (Design §3 Task 1d): the bare `RiemannTensorNode`
 * stays in `connection-validators.ts` next to `CovariantDerivativeNode`
 * (both are *primary* curvature objects: connection + first-derivative).
 * Everything *contracted from* Riemann lives here — keeps the module
 * graph: tensor → metric → connection-validators → curvature.
 *
 * @module dimensional/curvature
 */

import type { Dimension } from './types.js';
// Node/index types + ExprNode now live in the leaf `ast-types.ts` — no longer
// imported from validator.ts (that back-edge formed a type-only cycle). The
// curvature node types are re-exported below for existing importers.
import type {
  ExprNode,
  CovariantIndex,
  RiemannTensorNode,
  MetricTensorNode,
  RicciTensorNode,
  EinsteinTensorNode,
  BianchiResidualNode,
} from './ast-types.js';
import { IndexLabelCollisionError } from './errors.js';

export type { RicciTensorNode, EinsteinTensorNode, BianchiResidualNode } from './ast-types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared pattern-B callback type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared callback shape used by every pattern-B validator (`validate
 * RicciTensor`, `validateEinsteinTensor`, `validateBianchiResidual`).
 *
 * The callback re-enters the Riemann validator for an embedded
 * `RiemannTensorNode`, returning the validated `{dim, freeIndices}`
 * pair without the surrounding validator-result envelope (the caller
 * is responsible for merging or discarding the free-index map per
 * the contraction it is performing).
 *
 * Co-located here with the three consumer functions (rather than in
 * `validator-registry.ts`) to avoid a `curvature.ts ↔ validator-
 * registry.ts` import cycle — the registry imports the validators
 * from this module, so this module must own the callback type.
 *
 * @internal
 */
export type RiemannChildCallback = (child: RiemannTensorNode) => {
  dim: Dimension;
  freeIndices: Map<string, { upper: number; lower: number }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// RicciTensorNode — new ExprNode kind
// ─────────────────────────────────────────────────────────────────────────────

/**
 * v0.5.0 Task 7: Ricci tensor AST node R_μν.
 *
 * Internally wraps a RiemannTensorNode and represents the contraction
 *
 *     R_μν = R^λ_{μλν}     (Carroll Eq. 3.91)
 *
 * Index-map on the wrapped Riemann (R^ρ_σμν per RiemannTensorNode):
 *
 *     R^ρ    σ    μ    ν
 *     │     │   │   │
 *     │     │   └── lowerIndices[1] = the dummy contraction slot (λ)
 *     │     │       contracts against upperIndex.label (ρ ↔ λ)
 *     │     └── lowerIndices[0] = free output index #1 (μ_out, lower)
 *     └── upperIndex (ρ) — contracts against lowerIndices[1]
 *                              lowerIndices[2] = free output index #2 (ν_out, lower)
 *
 * After contraction: R_μν free indices = {μ_out: lower, ν_out: lower}, dim {L: -2}.
 *
 * NOTE (post-S1 correction, commit `76628c4`): prior to v0.5.0 Task 7 this
 * docstring incorrectly said `lowerIndices[0]` was the dummy slot. Carroll
 * Eq. 3.91 contracts on the SECOND lower (the μ slot in R^ρ_σμν), giving
 * R_σν after the contraction. The implementation in `validateRicciTensor`
 * below (lines ~87-101) is the authoritative reference. See memory entry
 * `feedback_v0_5_0_ricci_contraction_bug.md` for the bug history.
 *
 * The node is its own validation arm in validator.ts and its own lowering
 * arm in numerical/lowering.ts — same pattern as RiemannTensorNode (no
 * AST-rewrite; the contraction is a single primitive walked directly).
 *
 * @public
 */
/**
 * v0.6.0 Task 3.10b: RicciTensorNode expressed via CurvatureCompositeNode<K, S>.
 * The runtime shape is identical — pure type-alias migration.
 */
/**
 * Result of validating a RicciTensorNode.
 * @public
 */
interface RicciTensorValidationResult {
  readonly dim: Dimension;
  readonly freeIndices: Map<string, { upper: number; lower: number }>;
}

/**
 * Validate a `ricci-tensor` node.
 *
 * Throws:
 *   - IndexLabelCollisionError if the embedded Riemann's two free output
 *     labels (the σ slot — lowerIndices[0] — and the ν slot —
 *     lowerIndices[2]) collide. (The contracted middle slot
 *     lowerIndices[1] is invisible to this check; any label is allowed
 *     there because it's a dummy.)
 *
 * The Riemann sub-node is validated structurally by re-entering its own
 * validator via the `validateRiemannChild` callback (so its signature
 * checks fire), but its free indices are NOT propagated — the ρ slot
 * collapses into the contraction with the μ slot (Carroll Eq. 3.91:
 * `R_μν = R^λ_{μλν}`), and the surviving σ / ν slots become the new
 * free indices of the Ricci tensor.
 */
export function validateRicciTensor(
  node: RicciTensorNode,
  validateRiemannChild: RiemannChildCallback,
): RicciTensorValidationResult {
  // Re-validate the embedded Riemann so its signature checks (upperIndex /
  // lowerIndices variance, gLower / gInverse signature, free-index
  // disjointness) fire here too. We discard its freeIndices map: the ρ slot
  // and the μ slot (lowerIndices[1]) are the contraction; the surviving σ
  // (lowerIndices[0]) and ν (lowerIndices[2]) are reconstructed below from
  // the authoritative axis source.
  const rResult = validateRiemannChild(node.riemann);

  // Dim is inherited 1:1 from the Riemann (contraction does not change
  // per-component units — multiplying by δ^ρ_μ is dimensionless).
  const dim = rResult.dim;

  // Surviving free indices: Ricci's μ_out ← lowerIndices[0] (σ slot),
  // Ricci's ν_out ← lowerIndices[2] (ν slot). Contracted middle slot
  // (lowerIndices[1]) is dummied and not surfaced as free.
  const muOutIdx: CovariantIndex = node.riemann.lowerIndices[0];
  const nuOutIdx: CovariantIndex = node.riemann.lowerIndices[2];
  if (muOutIdx.label === nuOutIdx.label) {
    throw new IndexLabelCollisionError(muOutIdx.label, 2, ['ricci-tensor']);
  }

  const freeIndices = new Map<string, { upper: number; lower: number }>();
  freeIndices.set(muOutIdx.label, { upper: 0, lower: 1 });
  freeIndices.set(nuOutIdx.label, { upper: 0, lower: 1 });

  return { dim, freeIndices };
}

// ─────────────────────────────────────────────────────────────────────────────
// ricci() — user-facing constructor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the Ricci tensor R_μν = R^λ_{μλν} as a composite ExprNode.
 *
 * **Convention (Carroll Eq. 3.91).** Contract upper-ρ against the SECOND
 * lower slot — the μ position in R^ρ_σμν, i.e., `lowerIndices[1]` in the
 * RiemannTensorNode storage. The surviving free indices are the σ slot
 * (`lowerIndices[0]`) → Ricci's first free output μ_out, and the ν slot
 * (`lowerIndices[2]`) → Ricci's second free output ν_out.
 *
 * Index mapping after contraction:
 *   - upperIndex (ρ) → contracted with lowerIndices[1] (the μ slot, λ dummy)
 *   - lowerIndices[0] (σ) → Ricci's free output index 0 (μ_out)
 *   - lowerIndices[2] (ν) → Ricci's free output index 1 (ν_out)
 *   Result: R_μν with free indices {σ_label: lower, ν_label: lower}
 *
 * Index-map diagram:
 *   R^ρ  _  σ  _  μ  _  ν       (RiemannTensorNode slots)
 *       ↑           ↑
 *   upper        lower[1]   <- contract these two (ρ = μ = λ)
 *            lower[0]    lower[2]  <- become R_μν free indices
 *
 * **Why not "upper ↔ lowerIndices[0]" (the first-lower trace)?** The trace
 * `R^λ_{λμν}` over the first pair (ρ ↔ σ) is identically zero by the
 * first-pair antisymmetry of the (lowered) Riemann tensor — for any
 * metric, including non-vacuum solutions like de Sitter. The
 * constant-curvature identity `R_μν = (n-1) K g_μν` (Carroll §8.1,
 * `R = 4Λ` in n=4) only matches the upper↔second-lower contraction.
 * The de-Sitter Ricci-scalar test in `tests/dimensional/ricci.test.ts`
 * is the discriminating fixture that pins this convention.
 *
 * The returned tree is a single `ricci-tensor` node wrapping the supplied
 * Riemann. Validator and numerical lowering each have a dedicated arm —
 * no AST rewrite into a `tensor-product`-of-Riemann happens here (the
 * RiemannTensorNode is not contractable in the v0.3.5 tensor-product
 * einsum sense; the contraction is a primitive operation walked directly).
 *
 * @public
 */
export function ricci(R: RiemannTensorNode): ExprNode {
  return { kind: 'ricci-tensor', riemann: R };
}

// ─────────────────────────────────────────────────────────────────────────────
// EinsteinTensorNode — new ExprNode kind (Task 8)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * v0.5.0 Task 8: Einstein tensor AST node G_μν = R_μν − ½ R g_μν.
 *
 * Wraps a `RiemannTensorNode` (contracted via the same Carroll-Eq.-3.91
 * convention as `RicciTensorNode` — see ricci()'s JSDoc) plus the metric
 * pair needed for the scalar trace `R = g^μν R_μν` and the `½ R g_μν`
 * subtraction term. Storage mirrors the `RicciTensorNode` pattern: own
 * validator + lowering arms, no AST rewrite into op('-', ricci, scale·g).
 *
 * Free indices match `R.lowerIndices[0]` and `R.lowerIndices[2]` — same as
 * ricci(R), with the same Carroll-Eq.-3.91 contraction; the embedded
 * Riemann's middle slot lowerIndices[1] is the dummy λ.
 *
 * Dim: {L: -2} — inherited from Riemann/Ricci (both `R_μν` and `R · g_μν`
 * carry 1/L²; subtraction preserves dim).
 *
 * @public
 */
/**
 * v0.6.0 Task 3.10b: EinsteinTensorNode expressed via CurvatureCompositeNode<K, S>.
 * The runtime shape is identical — pure type-alias migration.
 */
/**
 * Result of validating an EinsteinTensorNode.
 * @public
 */
interface EinsteinTensorValidationResult {
  readonly dim: Dimension;
  readonly freeIndices: Map<string, { upper: number; lower: number }>;
}

/**
 * Validate an `einstein-tensor` node.
 *
 * Delegates structural checks to the embedded Riemann via the
 * `validateRiemannChild` callback (same pattern as `validateRicciTensor`)
 * and reuses `validateRicciTensor` for the surviving free-index labels —
 * an Einstein tensor's free indices are exactly the Ricci tensor's free
 * indices (subtracting `½ R g_μν` with matching {μ_out, ν_out} labels
 * preserves the index structure).
 *
 * The `gLower` / `gInverse` sub-nodes are deliberately NOT propagated as
 * free indices — they are consumed internally by the scalar-trace
 * contraction and the `½ R g_μν` multiplication (same H1 discipline as
 * RiemannTensorNode for its gLower/gInverse fields).
 *
 * Throws:
 *   - Everything `validateRicciTensor` throws (IndexLabelCollisionError on
 *     surviving free-index collision; MetricSignatureError /
 *     PartialDerivativeIndexVarianceError from the inner Riemann).
 */
export function validateEinsteinTensor(
  node: EinsteinTensorNode,
  validateRiemannChild: RiemannChildCallback,
): EinsteinTensorValidationResult {
  // Delegate to Ricci validation — the surviving free-index labels and dim
  // are identical (R_μν has the same {μ_out, ν_out} as G_μν, dim {L:-2}).
  const ricciNode: RicciTensorNode = { kind: 'ricci-tensor', riemann: node.riemann };
  const r = validateRicciTensor(ricciNode, validateRiemannChild);

  // Defense in depth: the `½ R g_μν` term involves g_μν, but its free
  // indices are NOT propagated — they are the same {μ_out, ν_out} as Ricci
  // by construction (we contract them down to a 4×4 in the same axis order
  // during lowering). Mirrors H1: gLower / gInverse on RiemannTensorNode.
  return { dim: r.dim, freeIndices: r.freeIndices };
}

// ─────────────────────────────────────────────────────────────────────────────
// einstein() — user-facing constructor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the Einstein tensor G_μν = R_μν − ½ R g_μν as a composite ExprNode.
 *
 * **Convention.** The Einstein tensor adds the scalar-trace subtraction
 * term `½ R g_μν` to Ricci — it does NOT introduce a new contraction
 * convention. The inner Ricci `R_μν` inherits Carroll Eq. 3.91 from
 * `ricci(R)` (contraction on `lowerIndices[1]`, the middle/μ slot in
 * R^ρ_σμν; see RicciTensorNode JSDoc for the index-map diagram). The
 * scalar trace is `R = g^μν R_μν`. The result `G_μν` shares free indices
 * {μ_out, ν_out} with `ricci(R)`.
 *
 * **Algebra (sanity check).**
 *   - de Sitter (n=4): `R_μν = Λ g_μν`, `R = 4Λ` ⇒
 *     `G_μν = Λ g_μν − ½·4Λ·g_μν = −Λ g_μν`. Vacuum Einstein equation
 *     `G_μν + Λ g_μν = 0` holds.
 *   - Schwarzschild (vacuum): `R_μν ≡ 0`, `R = 0` ⇒ `G_μν ≡ 0`.
 *   - Trace identity (any metric, n=4): `g^μν G_μν = R − ½·R·4 = −R`.
 *
 * **AST shape.** Single `einstein-tensor` node wrapping `R`, `gLower`,
 * `gInverse`. Validator and numerical lowering each have a dedicated arm;
 * no AST rewrite into `ricci(R) − ½ R g_μν` happens (the subtraction term
 * would need a tensor-valued scalar-multiply that the v0.3.5 tensor-product
 * einsum does not support directly). Same walk-directly pattern as Ricci.
 *
 * **Matter coupling is out of scope.** The vacuum / cosmological-constant
 * tests pin G_μν only; `G_μν = κ T_μν` (Einstein field equations with a
 * stress-energy source) is deferred to v0.6.0+.
 *
 * @public
 */
export function einstein(
  R: RiemannTensorNode,
  g: MetricTensorNode,
  gInverse: MetricTensorNode,
): ExprNode {
  return { kind: 'einstein-tensor', riemann: R, gLower: g, gInverse };
}

// ─────────────────────────────────────────────────────────────────────────────
// BianchiResidualNode — new ExprNode kind (Task 9)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * v0.5.0 Task 9: Second-Bianchi-identity residual AST node.
 *
 * Represents the cyclic-over-first-three-indices sum that vanishes by the
 * second Bianchi identity (Carroll Eq. 3.95):
 *
 *   B_{λμνρσ} = ∇_λ R_{μνρσ} + ∇_μ R_{νλρσ} + ∇_ν R_{λμρσ} ≡ 0
 *
 * Storage: wraps the originating RiemannTensorNode. Lowering computes B
 * numerically by:
 *   1. Lowering the upper-ρ of the Riemann tensor JS-side via g_{aρ}.
 *   2. Computing ∂_λ R_{αβγδ} via a 4th-order centered FD (one MORE layer
 *      on top of the Riemann lowering's already-FD-laden Γ + ∂Γ stack).
 *   3. Adding Christoffel-correction terms to form ∇_λ R_{μνρσ} (Approach 1:
 *      canonical, not partial-only).
 *   4. Summing cyclically over (λ, μ, ν) with (ρ, σ) fixed.
 *
 * **Dim L⁻³.** R_{μνρσ} has dim L⁻² (inherited from R^ρ_{σμν}, since lowering
 * with the dimensionless metric preserves dim per our convention). One ∂/∂x
 * divides by L, giving L⁻³ on ∇R and on the cyclic sum B.
 *
 * **Free indices (5 lower):** λ, μ, ν, ρ, σ — taken from the same axis
 * convention as RiemannTensorNode.lowerIndices plus a fresh λ slot. To avoid
 * label collisions we synthesise `lambda` as the 5th index and reuse
 * R.lowerIndices[0..2] for {μ_out, ν_out, ρ_out}; the 4th wrapped slot
 * surfaces as `sigma_out`. (See `validateBianchiResidual` below for the
 * label-collision rule.)
 *
 * **Why not lower via the v0.3.0 `lower()` AST function?** lower() returns a
 * `tensor-product` node referencing the metric and operand by label/free-
 * index merge, intended for compositional expressions. The lowered Riemann
 * here is consumed point-wise by the FD stencil; building an AST product +
 * re-validating + re-lowering on every of the 25 FD samples is needless
 * machinery for a closed JS-side contraction. Matches the walk-directly
 * philosophy of Tasks 6, 7, 8.
 *
 * @public
 */
/**
 * v0.6.0 Task 3.10c: BianchiResidualNode expressed via CurvatureCompositeNode<K, S>.
 * The runtime shape is identical — pure type-alias migration.
 */
/**
 * Result of validating a BianchiResidualNode.
 * @public
 */
interface BianchiResidualValidationResult {
  readonly dim: Dimension;
  readonly freeIndices: Map<string, { upper: number; lower: number }>;
}

/**
 * Validate a `bianchi-residual` node.
 *
 * Inherits all structural checks from the embedded Riemann via
 * `validateRiemannChild`. The output freeIndices are 5 lower labels:
 *
 *   - `lambda` — the synthesised FIRST cyclic-derivative axis (a new label;
 *     must not collide with the wrapped Riemann's free labels)
 *   - The Riemann's `lowerIndices[0]` label → μ_out
 *   - The Riemann's `lowerIndices[1]` label → ν_out
 *   - The Riemann's `lowerIndices[2]` label → ρ_out
 *   - A synthesised `sigma_out` — the fourth Riemann index after lowering ρ.
 *
 * Throws:
 *   - IndexLabelCollisionError if the synthesised `lambda` / `sigma_out`
 *     labels collide with any wrapped-Riemann label.
 */
export function validateBianchiResidual(
  node: BianchiResidualNode,
  validateRiemannChild: RiemannChildCallback,
): BianchiResidualValidationResult {
  // Re-validate the embedded Riemann for its own signature/index checks.
  validateRiemannChild(node.riemann);

  // Build the 5 free-index labels. The Riemann's lowerIndices[0..2] become
  // the μ_out, ν_out, ρ_out of the all-lower Riemann (after lowering ρ to a
  // synthesised 'sigma_out'... wait — the convention here is:
  //   ∇_λ R_{αβγδ} has 5 indices: λ + 4 from the lowered Riemann.
  //   The 4 from the lowered Riemann are: the freshly-lowered ρ (renamed
  //   from `upperIndex.label`) + lowerIndices[0..2].
  // We use literal label `lambda` for the cyclic-deriv axis. The freshly-
  // lowered ρ takes a literal `alpha_lower` label.
  //
  // Collision rule: `lambda` and `alpha_lower` must not collide with any of
  // {upperIndex.label, lowerIndices[0..2].label}.
  const wrappedLabels = new Set<string>([
    node.riemann.upperIndex.label,
    node.riemann.lowerIndices[0].label,
    node.riemann.lowerIndices[1].label,
    node.riemann.lowerIndices[2].label,
  ]);
  const synthesised = ['lambda', 'alpha_lower'];
  for (const s of synthesised) {
    if (wrappedLabels.has(s)) {
      throw new IndexLabelCollisionError(s, 2, ['bianchi-residual']);
    }
  }

  // Per Design §3 Task 1f / F8 / I3: Bianchi residual carries 1/L³ (one
  // covariant derivative on R, which is 1/L²).
  const dim: Dimension = { L: -3, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

  // 5 free indices, all lower.
  const freeIndices = new Map<string, { upper: number; lower: number }>();
  freeIndices.set('lambda', { upper: 0, lower: 1 });
  freeIndices.set('alpha_lower', { upper: 0, lower: 1 });
  freeIndices.set(node.riemann.lowerIndices[0].label, { upper: 0, lower: 1 });
  freeIndices.set(node.riemann.lowerIndices[1].label, { upper: 0, lower: 1 });
  freeIndices.set(node.riemann.lowerIndices[2].label, { upper: 0, lower: 1 });

  return { dim, freeIndices };
}
