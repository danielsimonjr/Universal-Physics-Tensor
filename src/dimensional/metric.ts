/**
 * User-facing constructors and ergonomic helpers for v0.3.0 metric-layer
 * AST nodes. The substantive logic (alpha-conversion) lives in raise() /
 * lower() (added in Task 8 — this file's initial revision contains only
 * the trivial constructors).
 *
 * Per docs/specification/Part-VIII-Metric-Layer.md §VIII.5 (raise/lower
 * contract) and §VIII.1 (grammar).
 *
 * @module dimensional/metric
 */

import type { Dimension } from './types.js';
import { DIMENSIONLESS } from './types.js';
import { freshLabel } from './fresh-label.js';
import type { TensorIndex } from './tensor.js';
import type { TensorProductNode } from './tensor.js';
import type {
  MetricTensorNode,
  KroneckerDeltaNode,
  TensorPartialDerivativeNode,
  CovariantIndex,
} from './metric-validators.js';
import type { ExprNode } from './validator.js';
import { validate } from './validator.js';
import { MetricSignatureError, UPTError } from './errors.js';

/**
 * Construct a metric-tensor node.
 *
 * @param name       Symbolic name of the metric (e.g. `'g'`).
 * @param indices    Exactly two TensorIndex entries (rank-2 requirement).
 * @param dim        Physical dimension of the metric components.
 * @param signature  Comma-separated `'+'`/`'-'` signs (e.g. `'+,-,-,-'`).
 * @param derivativeStrategy  Optional hint for the numerical engine:
 *   how to compute ∂g for Christoffel / ∇_μ. `'zero'` = constant metric
 *   (∂g=0, Γ=0, ∇_μ=∂_μ); `'supplied'` = caller provides ∂g components;
 *   `'computed'` (the default) = the lowering treats a raw-tensor metric
 *   input as constant (∂g=0) — nothing is auto-differentiated. Metric
 *   closures in `inputs.fields` take the curvature paths, which
 *   finite-difference the closures.
 *   Omit to leave the field absent (engine defaults to `'computed'`).
 */
export function metric(
  name: string,
  indices: ReadonlyArray<TensorIndex>,
  dim: Dimension,
  signature: string,
  derivativeStrategy?: 'computed' | 'zero' | 'supplied',
): MetricTensorNode {
  const node: {
    kind: 'metric-tensor';
    name: string;
    indices: ReadonlyArray<TensorIndex>;
    signature: string;
    dim: Dimension;
    derivativeStrategy?: 'computed' | 'zero' | 'supplied';
  } = { kind: 'metric-tensor', name, indices, signature, dim };
  if (derivativeStrategy !== undefined) node.derivativeStrategy = derivativeStrategy;
  return node;
}

/**
 * Construct a Kronecker delta δ^upperLabel_lowerLabel.
 * Parameter order: upper first, lower second (canonical δ^μ_ν).
 * dim defaults to DIMENSIONLESS (Design §13 Q3 locked).
 */
export function kronecker(
  upperLabel: string,
  lowerLabel: string,
  dim: Dimension = DIMENSIONLESS,
): KroneckerDeltaNode {
  return {
    kind: 'kronecker-delta',
    indices: [
      { label: upperLabel, variance: 'upper' },
      { label: lowerLabel, variance: 'lower' },
    ],
    dim,
  };
}

/**
 * Construct a tensor-partial-derivative. wrtIndex.variance MUST be 'lower'
 * — TypeScript enforces this via the CovariantIndex type.
 */
export function pderiv(
  of: ExprNode,
  wrt: ExprNode,
  wrtIndex: CovariantIndex,
): TensorPartialDerivativeNode {
  return { kind: 'tensor-partial-derivative', of, wrt, wrtIndex };
}

/** Thrown by raise() / lower() when the operand's label is absent or has
 *  the wrong variance for the requested operation. Private to this module
 *  (not part of the public error surface per Design §6). */
class RaiseLowerInvalidLabelError extends UPTError {
  constructor(message: string) {
    super(message);
    this.name = 'RaiseLowerInvalidLabelError';
  }
}

/**
 * Collect free-index labels from an ExprNode by calling validate(). Returns
 * a map from label → variance (whichever side has count > 0). Note: this
 * performs a full subtree validation on `operand`; cost is acceptable for
 * typical raise/lower call sites (operand is a small subtree).
 */
function collectFreeIndexLabels(node: ExprNode): Map<string, 'upper' | 'lower'> {
  const result = validate(node);
  const labels = new Map<string, 'upper' | 'lower'>();
  for (const [label, counts] of result.freeIndices) {
    if (counts.upper > 0) labels.set(label, 'upper');
    else if (counts.lower > 0) labels.set(label, 'lower');
  }
  return labels;
}

/**
 * Raise an index of `operand` via the inverse metric `gInverse`.
 *
 * Internal alpha-conversion: one of `gInverse`'s labels is renamed to
 * match `label` (so the Einstein-summation contraction picks it up);
 * the other is renamed to a fresh label that doesn't collide with any
 * free index in `operand`. The fresh label becomes the resulting
 * tensor-product's only new free index.
 *
 * Per Part-VIII §VIII.5 (raise/lower contract).
 *
 * Throws:
 *   - MetricSignatureError if gInverse isn't both-upper
 *   - RaiseLowerInvalidLabelError if label is absent or already upper in operand
 */
export function raise(
  operand: ExprNode,
  gInverse: MetricTensorNode,
  label: string,
): TensorProductNode {
  return raiseOrLower(operand, gInverse, label, 'upper');
}

/**
 * Lower an index of `operand` via the covariant metric `g`.
 * Symmetric to raise(). Per Part-VIII §VIII.5.
 *
 * Throws:
 *   - MetricSignatureError if g isn't both-lower
 *   - RaiseLowerInvalidLabelError if label is absent or already lower in operand
 */
export function lower(
  operand: ExprNode,
  g: MetricTensorNode,
  label: string,
): TensorProductNode {
  return raiseOrLower(operand, g, label, 'lower');
}

/**
 * The shared body of raise() (`variance` 'upper', `metric` the inverse metric)
 * and lower() (`variance` 'lower', `metric` the covariant metric).
 * One index of `metric` gets the name `label`, so that the contraction finds the index.
 * The other index gets a new name that is not a free index of `operand`.
 *
 * @throws MetricSignatureError if an index of `metric` does not have `variance`.
 * @throws RaiseLowerInvalidLabelError if `label` is not free in `operand`, or already has `variance`.
 */
function raiseOrLower(
  operand: ExprNode,
  metric: MetricTensorNode,
  label: string,
  variance: 'upper' | 'lower',
): TensorProductNode {
  const fn = variance === 'upper' ? 'raise' : 'lower';
  const other = variance === 'upper' ? 'lower' : 'raise';
  if (
    metric.indices[0].variance !== variance ||
    metric.indices[1].variance !== variance
  ) {
    throw new MetricSignatureError(
      metric.name,
      `${fn}() requires both indices of ${variance === 'upper' ? 'the inverse metric' : 'the metric'} to have variance '${variance}'`,
    );
  }
  const operandLabels = collectFreeIndexLabels(operand);
  const operandVariance = operandLabels.get(label);
  if (operandVariance === undefined) {
    throw new RaiseLowerInvalidLabelError(
      `${fn}(): label '${label}' is not a free index of the operand. ` +
        `Operand free indices: ${Array.from(operandLabels.keys()).join(', ') || '(none)'}.`,
    );
  }
  if (operandVariance === variance) {
    throw new RaiseLowerInvalidLabelError(
      `${fn}(): label '${label}' is already '${variance}' in the operand. ` +
        `Use ${other}() to ${other} it, or pick a different label.`,
    );
  }

  // Alpha-conversion: rename metric[0] → label (the dummy that contracts);
  // metric[1] → freshLabel(metric[1].label, operand-free-labels).
  const taken = new Set(operandLabels.keys());
  taken.add(label);
  const renamed = freshLabel(metric.indices[1].label, taken);

  const renamedMetric: MetricTensorNode = {
    kind: 'metric-tensor',
    name: metric.name,
    indices: [
      { label, variance },
      { label: renamed, variance },
    ],
    signature: metric.signature,
    dim: metric.dim,
  };
  if (metric.derivativeStrategy !== undefined) {
    (renamedMetric as { derivativeStrategy: typeof metric.derivativeStrategy }).derivativeStrategy =
      metric.derivativeStrategy;
  }

  return { kind: 'tensor-product', args: [renamedMetric, operand] };
}
