/**
 * Per-kind validation for v0.4.0 connection-layer AST nodes.
 *
 * Mirrors the pattern of `metric-validators.ts`: each validator is a pure
 * function returning a local `{dim, freeIndices, role?}` carrier that
 * validator.ts merges into its InferContext accumulator.
 *
 * Per v0.4.0-Design.md §4 + §7 (docs/specification/Part-IX-Connection-Layer.md
 * — pending).
 *
 * @module dimensional/connection-validators
 */

import type { Dimension } from './types.js';
import type { ExprNode } from './ast-types.js';
import type {
  Role,
  TensorSymbolNode,
  MetricTensorNode,
  CovariantIndex,
  UpperIndex,
  CovariantDerivativeNode,
  RiemannTensorNode,
} from './ast-types.js';
import { divide } from './algebra.js';
import type { PartialDerivativeChildResult } from './metric-validators.js';
import {
  PartialDerivativeIndexVarianceError,
  MetricSignatureError,
  DuplicateCoordinateWarning,
  IndexLabelCollisionError,
} from './errors.js';

// Node/index types now live in the leaf `ast-types.ts`; re-exported so existing
// importers of `… from './connection-validators.js'` are unchanged.
export type { UpperIndex, CovariantDerivativeNode, RiemannTensorNode } from './ast-types.js';

// v0.6.1: dropped export — internal-only validation-result shape.
interface CovariantDerivativeValidationResult {
  readonly dim: Dimension;
  readonly freeIndices: Map<string, { upper: number; lower: number }>;
  readonly role?: Role;
}

/**
 * Validate a covariant-derivative node. Pure-function module-cycle-free
 * pattern (matches validatePartialDerivative). Recursion via the
 * `validateChild` callback supplied by the caller (validator.ts's
 * `infer()` dispatch).
 *
 * Throws:
 *   - PartialDerivativeIndexVarianceError if wrtIndex.variance !== 'lower'
 *   - MetricSignatureError if gLower is not both-lower or gInverse is not both-upper
 *
 * Note: the gLower / gInverse free indices are CONSUMED INTERNALLY by the
 * Christoffel formula's contractions and do NOT propagate upward. The
 * output freeIndices is just `of.freeIndices ∪ {wrtIndex.label: lower}`
 * (same structural rule as tensor-partial-derivative).
 */
export function validateCovariantDerivative(
  node: CovariantDerivativeNode,
  validateChild: (child: ExprNode) => PartialDerivativeChildResult,
): CovariantDerivativeValidationResult {
  if (node.wrtIndex.variance !== 'lower') {
    throw new PartialDerivativeIndexVarianceError(node.wrtIndex.label);
  }
  if (
    node.gLower.indices[0].variance !== 'lower' ||
    node.gLower.indices[1].variance !== 'lower'
  ) {
    throw new MetricSignatureError(
      node.gLower.name,
      `covariant-derivative requires gLower to be both-lower (got ` +
      `[${node.gLower.indices[0].variance}, ${node.gLower.indices[1].variance}])`,
    );
  }
  if (
    node.gInverse.indices[0].variance !== 'upper' ||
    node.gInverse.indices[1].variance !== 'upper'
  ) {
    throw new MetricSignatureError(
      node.gInverse.name,
      `covariant-derivative requires gInverse to be both-upper (got ` +
      `[${node.gInverse.indices[0].variance}, ${node.gInverse.indices[1].variance}])`,
    );
  }

  const ofResult = validateChild(node.of);
  const wrtResult = validateChild(node.wrt);

  // gLower and gInverse are NOT validated via validateChild — their dims are
  // structurally fixed (known from the signature checks above at lines 71-88),
  // and any malformed metric would have already thrown there. Their free
  // indices are deliberately discarded: the Christoffel contractions inside
  // ∇_μ consume them internally.

  // Per §VIII.4 (pderiv-label-collision-rejected analog):
  // wrtIndex.label must not collide with of.freeIndices.
  //
  // I1 HYBRID DECISION: throw by default (soundness > friendliness);
  // env var UPT_ALLOW_COORD_SHADOW=1 downgrades to process.emitWarning.
  // Task 13 covers BOTH paths (default throws; env=1 warns).
  if (ofResult.freeIndices.has(node.wrtIndex.label)) {
    const conflict = node.wrtIndex.label;
    if (typeof process !== 'undefined' && process.env?.UPT_ALLOW_COORD_SHADOW === '1') {
      process.emitWarning(new DuplicateCoordinateWarning(conflict, conflict));
    } else {
      throw new MetricSignatureError(
        `covariant-derivative`,
        `wrt='${conflict}' shadows an existing free index '${conflict}'. ` +
        `Rename the operand's free index or set UPT_ALLOW_COORD_SHADOW=1 to ` +
        `downgrade to a warning.`,
      );
    }
  }

  // Output freeIndices = of.freeIndices ∪ {wrtIndex.label: lower}.
  const freeIndices = new Map<string, { upper: number; lower: number }>();
  for (const [label, counts] of ofResult.freeIndices) freeIndices.set(label, counts);
  freeIndices.set(node.wrtIndex.label, { upper: 0, lower: 1 });

  // Output dim = divide(of.dim, wrt.dim) — same as pderiv.
  const dim = divide(ofResult.dim, wrtResult.dim);

  // Role passthrough: propagate of.role only when the child has one; omit
  // otherwise. Mirrors the `role?: Role` optional declaration on
  // CovariantDerivativeValidationResult — don't force a 'field' default when
  // the child has no role (e.g. a plain scalar operand).
  return ofResult.role !== undefined
    ? { dim, freeIndices, role: ofResult.role }
    : { dim, freeIndices };
}

// ─────────────────────────────────────────────────────────────────────────────
// v0.5.0 Task 5: RiemannTensorNode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * v0.5.0 (Task 1c-i): Riemann curvature tensor AST node R^ρ_{σμν}.
 *
 * Index convention per Carroll Ch. 3 §3.4 (Adam+Eve F4/S3):
 *   R^ρ_σμν = ∂_μ Γ^ρ_σν − ∂_ν Γ^ρ_σμ + Γ^ρ_λμ Γ^λ_σν − Γ^ρ_λν Γ^λ_σμ
 * (σ in SECOND lower slot of each Γ.)
 *
 * Dimension F8/I3: Riemann is 1/L² (inverse length squared), NOT
 * dimensionless. Carroll Ch. 3 §3.4: R^ρ_σμν has units of (∂Γ) where
 * Γ ~ 1/L and ∂ ~ 1/L → R ~ 1/L².
 *
 * H1 (v0.4.0 pattern): gLower, gInverse, xCoord sub-nodes are present for
 * downstream consumers (numerical lowering at Task 6), but their free
 * indices are NOT propagated — the Riemann formula's contractions consume
 * them internally. Same rule as CovariantDerivativeNode.
 */
// v0.6.1: dropped export — internal-only validation-result shape.
interface RiemannTensorValidationResult {
  readonly dim: Dimension;
  readonly freeIndices: Map<string, { upper: number; lower: number }>;
}

/**
 * Validate a riemann-tensor node.
 *
 * Throws:
 *   - PartialDerivativeIndexVarianceError if upperIndex.variance !== 'upper'
 *     or any lowerIndices[i].variance !== 'lower'
 *   - MetricSignatureError if gLower / gInverse signature is wrong (reuses
 *     CovariantDerivativeNode's structural checks)
 *   - IndexLabelCollisionError if the 4 free-index labels {ρ, σ, μ, ν} are
 *     not pairwise distinct (M9: disjointness only on the riemann node's
 *     own free labels; raise/lower aliasing in surrounding algebra remains
 *     legal — we do NOT compare against gLower/gInverse/xCoord labels).
 *
 * H1 (v0.4.0 pattern): gLower/gInverse/xCoord are NOT validated via the
 * validateChild callback, so their free indices do not propagate. They are
 * signature-checked here for early structural error reporting; their
 * numerical contents are consumed by Task 6's lowering helper.
 */
export function validateRiemannTensor(
  node: RiemannTensorNode,
): RiemannTensorValidationResult {
  if (node.upperIndex.variance !== 'upper') {
    throw new PartialDerivativeIndexVarianceError(
      `riemann-tensor: upperIndex '${node.upperIndex.label}' must be 'upper', ` +
        `got '${(node.upperIndex as { variance: string }).variance}'`,
    );
  }
  for (let i = 0; i < 3; i++) {
    const idx = node.lowerIndices[i] as { label: string; variance: string };
    if (idx.variance !== 'lower') {
      throw new PartialDerivativeIndexVarianceError(
        `riemann-tensor: lowerIndices[${i}] '${idx.label}' must be 'lower', ` +
          `got '${idx.variance}'`,
      );
    }
  }
  if (
    node.gLower.indices[0].variance !== 'lower' ||
    node.gLower.indices[1].variance !== 'lower'
  ) {
    throw new MetricSignatureError(
      node.gLower.name,
      `riemann-tensor requires gLower to be both-lower (got ` +
        `[${node.gLower.indices[0].variance}, ${node.gLower.indices[1].variance}])`,
    );
  }
  if (
    node.gInverse.indices[0].variance !== 'upper' ||
    node.gInverse.indices[1].variance !== 'upper'
  ) {
    throw new MetricSignatureError(
      node.gInverse.name,
      `riemann-tensor requires gInverse to be both-upper (got ` +
        `[${node.gInverse.indices[0].variance}, ${node.gInverse.indices[1].variance}])`,
    );
  }

  // M9: disjointness on the riemann-tensor's own 4 free labels only.
  // Repeated labels across {ρ, σ, μ, ν} would imply an implicit contraction
  // (e.g. R^μ_μνλ = R_νλ), which is the Ricci-tensor node's job — not the
  // bare Riemann node's. We deliberately do NOT compare against gLower /
  // gInverse / xCoord labels: those are H1-suppressed dummies, and legal
  // post-raise/lower algebra may reuse those labels (see plan §M9).
  const labels = [
    node.upperIndex.label,
    node.lowerIndices[0].label,
    node.lowerIndices[1].label,
    node.lowerIndices[2].label,
  ];
  const seen = new Set<string>();
  for (const label of labels) {
    if (seen.has(label)) {
      throw new IndexLabelCollisionError(label, 2, ['riemann-tensor']);
    }
    seen.add(label);
  }

  const freeIndices = new Map<string, { upper: number; lower: number }>();
  freeIndices.set(node.upperIndex.label, { upper: 1, lower: 0 });
  for (const idx of node.lowerIndices) {
    freeIndices.set(idx.label, { upper: 0, lower: 1 });
  }

  // F8/I3: Riemann carries inverse-length-squared. Hard-coded — same shape
  // as the dim is structurally fixed for every Riemann tensor regardless of
  // metric dim. (The metric is treated as dimensionless per our convention.)
  const dim: Dimension = { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

  // Role intentionally omitted — Riemann is a derived curvature object,
  // not a primary field; downstream tensor-product / equation consumers
  // don't need a role tag here. Mirrors CovariantDerivativeNode's
  // role-on-passthrough-only pattern.
  return { dim, freeIndices };
}
