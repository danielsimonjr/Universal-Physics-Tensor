/**
 * UPT error hierarchy. All UPT-source errors subclass UPTError so
 * downstream consumers (mathjs, threejs, TensorJS) can discriminate
 * with `err instanceof UPTError`.
 *
 * @module dimensional/errors
 */

import { Dimension } from './types.js';

/** Base class for all UPT-source errors. */
export class UPTError extends Error {
  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = 'UPTError';
    // Restore prototype chain (needed for instanceof after ES5 transpilation).
    Object.setPrototypeOf(this, UPTError.prototype);
  }
}

/**
 * Thrown by add/sub and equation-level checks when dimensions disagree.
 * (Moved from src/dimensional/algebra.ts as part of the v0.2.0 UPTError
 * refactor. Behavior unchanged.)
 */
export class DimensionMismatchError extends UPTError {
  public readonly expected: Dimension;
  public readonly actual: Dimension;
  constructor(message: string, expected: Dimension, actual: Dimension) {
    super(message);
    this.name = 'DimensionMismatchError';
    this.expected = expected;
    this.actual = actual;
    Object.setPrototypeOf(this, DimensionMismatchError.prototype);
  }
}

/**
 * Thrown when a tensor-symbol's indices list contains the same label
 * more than once (e.g., T^μ_μ_μ). Per Part-VII §VII.4.
 *
 * NOTE: this error fires on DECLARATION-TIME duplicates within a single
 * tensor-symbol's indices list. Those indices are *free*, not "dummy"
 * (a dummy index in tensor calculus is one that is summed over). The
 * earlier name `RepeatedDummyLabelError` was a misnomer; that deprecated
 * alias was removed in v0.4.5.
 */
export class DuplicateIndexLabelError extends UPTError {
  public readonly tensorName: string;
  public readonly label: string;
  constructor(tensorName: string, label: string) {
    super(
      `Tensor '${tensorName}' has repeated index label '${label}'. ` +
      `A label may appear at most twice (once upper, once lower) within ` +
      `a single tensor-symbol's indices list.`,
    );
    this.name = 'DuplicateIndexLabelError';
    this.tensorName = tensorName;
    this.label = label;
    Object.setPrototypeOf(this, DuplicateIndexLabelError.prototype);
  }
}

/**
 * Thrown when an index label appears more than twice across a
 * tensor-product's operands. Einstein contraction requires exactly two
 * occurrences (one upper + one lower) per dummy label. Per Part-VII §VII.4.
 */
export class IndexLabelCollisionError extends UPTError {
  public readonly label: string;
  public readonly totalCount: number;
  /**
   * Tensor names that contributed occurrences of the colliding label,
   * if the caller has them available. May be undefined for callers that
   * don't track per-operand provenance.
   */
  public readonly sources?: ReadonlyArray<string>;
  constructor(
    label: string,
    totalCount: number,
    sources?: ReadonlyArray<string>,
  ) {
    const sourceClause =
      sources && sources.length > 0
        ? ` (sources: ${sources.join(', ')})`
        : '';
    super(
      `Index label '${label}' appears ${totalCount} times across the ` +
      `tensor-product operands${sourceClause} (max allowed: 2 for Einstein ` +
      `contraction). Rename one of the offending indices.`,
    );
    this.name = 'IndexLabelCollisionError';
    this.label = label;
    this.totalCount = totalCount;
    this.sources = sources;
    Object.setPrototypeOf(this, IndexLabelCollisionError.prototype);
  }
}

/**
 * Thrown when an index label appears twice in a tensor-product but both
 * occurrences share the same variance (both upper or both lower). v0.2.0
 * has no metric tensor available to raise/lower indices, so such a
 * contraction is rejected at validation time. Per Part-VII §VII.4.
 */
export class VarianceMismatchError extends UPTError {
  public readonly label: string;
  public readonly variance: 'upper' | 'lower';
  constructor(label: string, variance: 'upper' | 'lower') {
    super(
      `Index label '${label}' appears twice but both with variance '${variance}'. ` +
      `Einstein contraction requires one upper and one lower. ` +
      `If this is intentional, use raise(operand, gInverse, '${label}') or ` +
      `lower(operand, g, '${label}') to traverse variance via the metric ` +
      `before contracting.`,
    );
    this.name = 'VarianceMismatchError';
    this.label = label;
    this.variance = variance;
    Object.setPrototypeOf(this, VarianceMismatchError.prototype);
  }
}

/**
 * Thrown by `op '*'` / `'/'` / `'^'` when an operand carries non-empty
 * freeIndices. Scalar operators in v0.2.0 are strict: any tensor-valued
 * operand must instead pass through `tensor-product`. Per Part-VII §VII.5
 * (op-tensor boundary rules).
 */
export class TensorInScalarOpError extends UPTError {
  public readonly op: string;
  constructor(op: string) {
    super(
      `Operator '${op}' is scalar-only; received a tensor argument with ` +
      `non-empty freeIndices. Use 'tensor-product' for tensor multiplication.`,
    );
    this.name = 'TensorInScalarOpError';
    this.op = op;
    Object.setPrototypeOf(this, TensorInScalarOpError.prototype);
  }
}

/**
 * Thrown by `op '+'` / `'-'` when the operand freeIndices maps differ.
 * Addition / subtraction across tensors requires identical free-index
 * signatures (same labels, same per-label upper/lower counts). Per
 * Part-VII §VII.5.
 */
export class FreeIndexMismatchError extends UPTError {
  constructor(message: string) {
    super(message);
    this.name = 'FreeIndexMismatchError';
    Object.setPrototypeOf(this, FreeIndexMismatchError.prototype);
  }
}

/**
 * Thrown by the validator's tensor-product child resolver when a non-tensor
 * operand to a `tensor-product` fails dimension inference. Subclassing
 * UPTError (rather than throwing a plain `Error`) preserves the §14.7
 * forward-compat invariant that downstream consumers can discriminate
 * UPT-source errors with `err instanceof UPTError`.
 */
export class TensorProductChildInferenceError extends UPTError {
  constructor(message: string) {
    super(message);
    this.name = 'TensorProductChildInferenceError';
    Object.setPrototypeOf(this, TensorProductChildInferenceError.prototype);
  }
}

/**
 * Thrown when a `metric-tensor` node has rank other than 2. Per
 * Part-VIII §VIII.2 (metric-tensor-rank-2-only TENSOR-RULE). The metric
 * is fundamentally a rank-2 object in v0.3.0; higher-rank generalizations
 * are out of scope.
 */
export class InvalidMetricRankError extends UPTError {
  public readonly tensorName: string;
  public readonly actualRank: number;
  constructor(tensorName: string, actualRank: number) {
    super(
      `Metric tensor '${tensorName}' has rank ${actualRank}, but a ` +
      `metric must be rank-2 (exactly two indices). Per Part-VIII §VIII.2.`,
    );
    this.name = 'InvalidMetricRankError';
    this.tensorName = tensorName;
    this.actualRank = actualRank;
    Object.setPrototypeOf(this, InvalidMetricRankError.prototype);
  }
}

/**
 * Thrown when a `metric-tensor` has mixed-variance indices, an empty
 * signature, an invalid signature string, or other structural problem
 * orthogonal to rank. Per Part-VIII §VIII.2 and §VIII.5 (raise/lower
 * variance requirements).
 */
export class MetricSignatureError extends UPTError {
  public readonly tensorName: string;
  public readonly reason: string;
  constructor(tensorName: string, reason: string) {
    super(
      `Metric tensor '${tensorName}': ${reason}. Per Part-VIII §VIII.2.`,
    );
    this.name = 'MetricSignatureError';
    this.tensorName = tensorName;
    this.reason = reason;
    Object.setPrototypeOf(this, MetricSignatureError.prototype);
  }
}

/**
 * Thrown when a `kronecker-delta` node has rank other than 2.
 * Per Part-VIII §VIII.3.
 */
export class InvalidKroneckerRankError extends UPTError {
  public readonly actualRank: number;
  constructor(actualRank: number) {
    super(
      `Kronecker delta has rank ${actualRank}, but must be rank-2 ` +
      `(exactly one upper + one lower index). Per Part-VIII §VIII.3.`,
    );
    this.name = 'InvalidKroneckerRankError';
    this.actualRank = actualRank;
    Object.setPrototypeOf(this, InvalidKroneckerRankError.prototype);
  }
}

/**
 * Thrown when a `kronecker-delta`'s two indices share the same variance
 * (both upper or both lower). Per Part-VIII §VIII.3, the canonical
 * δ^μ_ν requires mixed variance.
 */
export class KroneckerVarianceError extends UPTError {
  public readonly bothVariance: 'upper' | 'lower';
  constructor(bothVariance: 'upper' | 'lower') {
    super(
      `Kronecker delta indices both have variance '${bothVariance}'; ` +
      `must be one upper + one lower (canonical δ^μ_ν form). ` +
      `Per Part-VIII §VIII.3.`,
    );
    this.name = 'KroneckerVarianceError';
    this.bothVariance = bothVariance;
    Object.setPrototypeOf(this, KroneckerVarianceError.prototype);
  }
}

/**
 * Thrown when a `tensor-partial-derivative` node's `wrtIndex.variance`
 * is `'upper'`. The differentiation operator ∂/∂x^μ is fundamentally
 * covariant (lower) regardless of the variance of the coordinate. Per
 * Part-VIII §VIII.4 (pderiv-wrtIndex-always-lower TENSOR-RULE).
 */
export class PartialDerivativeIndexVarianceError extends UPTError {
  public readonly label: string;
  constructor(label: string) {
    super(
      `Partial-derivative index '${label}' has variance 'upper', but ` +
      `∂_μ is fundamentally covariant — wrtIndex.variance must always ` +
      `be 'lower'. Per Part-VIII §VIII.4.`,
    );
    this.name = 'PartialDerivativeIndexVarianceError';
    this.label = label;
    Object.setPrototypeOf(this, PartialDerivativeIndexVarianceError.prototype);
  }
}

/**
 * Emitted (not thrown) via `process.emitWarning` when a covariant-derivative's
 * `wrt` coordinate label collides with an existing free index of the operand
 * and the env var `UPT_ALLOW_COORD_SHADOW=1` has opted in to downgraded
 * handling. By default the collision throws `MetricSignatureError` (soundness
 * over friendliness — silent wrong results are the worst failure mode).
 *
 * Lives here (dimensional/errors.ts) rather than numerical/index.ts to avoid
 * a dimensional → numerical import cycle; re-exported from numerical/index.ts
 * for the public API surface per v0.4.0-Implementation-Plan Task 13.
 *
 * Uses `Object.setPrototypeOf` for correct `instanceof` after ES5 transpilation.
 *
 * @public
 */
export class DuplicateCoordinateWarning extends Error {
  constructor(coord: string, conflictingIndex: string) {
    super(
      `Covariant-derivative wrt='${coord}' collides with existing free index ` +
      `'${conflictingIndex}' of the operand; result will silently misbehave. ` +
      `Rename the operand's free index or pick a different wrt label.`,
    );
    this.name = 'DuplicateCoordinateWarning';
    Object.setPrototypeOf(this, DuplicateCoordinateWarning.prototype);
  }
}
