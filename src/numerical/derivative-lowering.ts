/**
 * Derivative-arm lowering — extracted from `lowering.ts`'s switch
 * to close the v0.6.1 sprint-target LOC miss (903 vs ≤890).
 *
 * Exports two pure functions:
 *   - `lowerTensorPartialDerivative` (∂_μ over tensor-symbol or
 *     metric-tensor `of` operands, three numericalForm strategies)
 *   - `lowerCovariantDerivative` (∇_μ over tensor-symbol or
 *     metric-tensor `of`; sign rule applied per free index)
 *
 * Both functions take a `recur` thunk for the recursive `lowerNode`
 * call (the covariant-derivative arm needs it twice, once to lower
 * the `of` operand and once to lower a synthesized
 * `tensor-partial-derivative` for the partial component of ∇).
 * Threading the recursion via parameter avoids a forward-import
 * cycle between this module and `lowering.ts`.
 *
 * @module numerical/derivative-lowering
 */

import type { ExprNode } from '../dimensional/validator.js';
import { validate } from '../dimensional/validator.js';
import type { TensorSymbolNode } from '../dimensional/tensor.js';
import type { MetricTensorNode } from '../dimensional/metric-validators.js';
import type { CovariantDerivativeNode } from '../dimensional/connection-validators.js';
import { pderivGrid, pderivNumericalFn, pderivSymbolic } from './pderiv.js';
import type { EngineTensor, TensorEngine } from './tensor-engine.js';
import type { NumericalInputs, NestedArray } from './types.js';
import { NumericalBackendError } from './errors.js';
import {
  zeroTensor,
  zeroTensorLike,
  flatToNested,
  tensorAdd,
  tensorAddScaled,
  computeChristoffelTensor,
  contractChristoffelWithOperand,
  getMetricDerivFlat,
} from './connection-lowering-helpers.js';
import {
  isMetricTensorNode,
  dimensionOf,
  requireValue,
  flattenNestedArray,
} from './lowering-utils.js';

/**
 * Thunk signature for the recursive `lowerNode` call. `lowering.ts`
 * passes its own `lowerNode` as this argument; the derivative arms
 * use it to lower sub-expressions (the `of` operand of a covariant
 * derivative, and a synthesized partial-derivative subtree).
 *
 * @internal
 */
type LowerNodeRecur = (
  node: ExprNode,
  inputs: NumericalInputs,
  engine: TensorEngine,
) => EngineTensor;

// ---------------------------------------------------------------------------
// tensor-partial-derivative arm
// ---------------------------------------------------------------------------

/**
 * Lower a `tensor-partial-derivative` node (∂_μ over an `of` operand).
 *
 * v0.3.5/v0.4.0 scope: `of` is a tensor-symbol or metric-tensor.
 * ∂_μ(of) adds the wrtIndex as a trailing axis — the result shape is
 * [...ofShape, N], NOT ofShape. (For the covariant-eikonal method, used
 * by catalog relation be-37, `of` = the scalar S is
 * rank-0, so ∂_μ S is the rank-1 wave covector k_μ, shape [N].)
 *
 * Three numericalForm dispatches: 'symbolic' (caller-supplied
 * derivatives map), 'numerical-fn' (rank-0 scalar field, all-axes
 * stack), 'grid' (sampled derivative field).
 *
 * @internal
 */
export function lowerTensorPartialDerivative(
  node: Extract<ExprNode, { kind: 'tensor-partial-derivative' }>,
  inputs: NumericalInputs,
  engine: TensorEngine,
): EngineTensor {
  const of = node.of as ExprNode;

  // v0.4.0 extension: metric-tensor pderiv dispatch.
  if (of.kind === 'metric-tensor') {
    const mNode = of as MetricTensorNode;
    const strategy = mNode.derivativeStrategy ?? 'computed';
    const N = dimensionOf(inputs);
    const coordLabel = node.wrtIndex.label;
    const ofShape = mNode.indices.map(() => N);
    const resultShape = [...ofShape, N];

    if (strategy === 'zero') {
      // ∂g = 0 everywhere (constant/flat metric).
      return zeroTensor(resultShape, engine);
    }
    if (strategy === 'supplied') {
      // Look up the N slices ∂_mu g for mu=0..N-1 and stack them as the
      // trailing axis. Key format: `${metricName}/${coordLabel}_${mu}`.
      const size = resultShape.reduce((a, b) => a * b, 1);
      const flat = new Array<number>(size).fill(0);
      for (let mu = 0; mu < N; mu++) {
        const key = `${mNode.name}/${coordLabel}_${mu}`;
        const slice = inputs.metricDerivatives?.get(key);
        if (slice === undefined) {
          throw new NumericalBackendError(
            `lowering: metric-tensor pderiv with strategy='supplied': ` +
            `no metricDerivatives entry for "${key}"`,
          );
        }
        const flatSlice = flattenNestedArray(slice, N * N);
        for (let ij = 0; ij < N * N; ij++) {
          flat[ij * N + mu] = flatSlice[ij];
        }
      }
      return engine.fromNested(flatToNested(flat, resultShape), resultShape);
    }

    // strategy === 'computed': constant-tensor metrics carry no
    // coordinate dependence — ∂_μ g = 0.
    return zeroTensor(resultShape, engine);
  }

  if (of.kind !== 'tensor-symbol') {
    throw new NumericalBackendError(
      `lowering: tensor-partial-derivative numerical eval requires a tensor-symbol `
      + `or metric-tensor 'of' operand in v0.3.5/v0.4.0 — got '${of.kind}'`,
    );
  }
  const sym = of as TensorSymbolNode;
  const form = sym.numericalForm ?? 'symbolic';
  const coordLabel = node.wrtIndex.label;
  const N = dimensionOf(inputs);
  const ofShape = sym.indices.map(() => N);
  const resultShape = [...ofShape, N];

  if (form === 'symbolic') {
    const d = pderivSymbolic(sym.name, coordLabel, inputs.derivatives ?? new Map());
    return engine.fromNested(d, resultShape);
  }

  if (form === 'numerical-fn') {
    // 'numerical-fn' lowering is scoped to a rank-0 `of` (scalar
    // field). ∂_μ ranges over all N coordinate axes — stack the N
    // single-axis derivatives into the rank-1 result.
    if (ofShape.length !== 0) {
      throw new NumericalBackendError(
        `lowering: 'numerical-fn' pderiv lowering supports a rank-0 'of' in v0.3.5; `
        + `"${sym.name}" is rank ${ofShape.length}`,
      );
    }
    const fn = inputs.fields?.get(sym.name);
    if (!fn) {
      throw new NumericalBackendError(
        `lowering: 'numerical-fn' tensor-symbol "${sym.name}" has no field fn in inputs.fields`,
      );
    }
    const coordValues = inputs.coords ? [...inputs.coords.values()] : [];
    const components: number[] = [];
    for (let axis = 0; axis < N; axis++) {
      components.push(pderivNumericalFn(fn, coordValues, axis) as number);
    }
    return engine.fromNested(components, [N]);
  }

  // form === 'grid': the GridField is sampled over space and
  // pderivGrid returns the derivative field sampled on that grid.
  const grid = inputs.grids?.get(sym.name);
  if (!grid) {
    throw new NumericalBackendError(
      `lowering: 'grid' tensor-symbol "${sym.name}" has no GridField in inputs.grids`,
    );
  }
  const gridAxis = inputs.coords ? [...inputs.coords.keys()].indexOf(coordLabel) : 0;
  const flat = pderivGrid(grid, gridAxis < 0 ? 0 : gridAxis);
  return engine.fromNested(flat.length === 1 ? flat[0] : flat, grid.shape);
}

// ---------------------------------------------------------------------------
// covariant-derivative arm
// ---------------------------------------------------------------------------

/**
 * Lower a `covariant-derivative` node (∇_μ over an `of` operand).
 *
 * Calls `recur` to lower the `of` subtree and a synthesized
 * `tensor-partial-derivative` (the ∂ component of ∇). The Christoffel
 * correction (Γ^α_{μν} sign rule per free index of `of`) builds on
 * the metric-derivative data supplied via `inputs.metricDerivatives`.
 *
 * v0.4.0 contract: `of.derivativeStrategy === 'zero'` short-circuits
 * to a zero result. `'computed'` on a raw-tensor metric reduces to
 * the partial only (constant metric → Γ = 0). `'supplied'` invokes
 * the full Christoffel pipeline.
 *
 * @internal
 */
export function lowerCovariantDerivative(
  node: Extract<ExprNode, { kind: 'covariant-derivative' }>,
  inputs: NumericalInputs,
  engine: TensorEngine,
  recur: LowerNodeRecur,
): EngineTensor {
  // S2(a) fix: `of.freeIndices` does NOT exist on the raw ExprNode.
  // Re-validate the `of` subtree to obtain its free-index structure.
  const covNode = node as CovariantDerivativeNode;
  const ofExpr = covNode.of as ExprNode;
  // TS-2 runtime guard: `covNode.of` is typed as `unknown` (module-cycle
  // prevents ExprNode import in connection-validators.ts). A malformed
  // AST bypassing validate() would produce a cryptic TypeError at
  // `ofExpr.kind` below. Throw a clear message now.
  if (typeof (ofExpr as { kind?: unknown }).kind !== 'string') {
    throw new NumericalBackendError(
      `lowering: CovariantDerivativeNode.of must have a string 'kind' field ` +
      `(got ${JSON.stringify((ofExpr as Record<string, unknown>).kind)}). ` +
      `Always call validate() before evaluateNumericalRaw().`,
    );
  }
  const ofValidation = validate(ofExpr);
  // Build ordered list of free indices: [{label, variance, pos}].
  const ofFreeIndices: Array<{ label: string; variance: 'upper' | 'lower'; pos: number }> = [];
  const ofIndices = (ofExpr as { indices?: ReadonlyArray<{ label: string; variance: 'upper' | 'lower' }> }).indices;
  if (ofIndices) {
    for (const idx of ofIndices) {
      const counts = ofValidation.freeIndices.get(idx.label);
      if (counts === undefined) continue; // contracted — not a free axis
      ofFreeIndices.push({
        label: idx.label,
        variance: idx.variance,
        pos: ofFreeIndices.length,
      });
    }
  } else {
    // Fallback for future of-kinds without .indices.
    let axisPos = 0;
    for (const [label, counts] of ofValidation.freeIndices) {
      for (let i = 0; i < counts.upper; i++) {
        ofFreeIndices.push({ label, variance: 'upper', pos: axisPos++ });
      }
      for (let i = 0; i < counts.lower; i++) {
        ofFreeIndices.push({ label, variance: 'lower', pos: axisPos++ });
      }
    }
  }

  // Lower the operand tensor via the injected recur thunk.
  const ofTensor = recur(ofExpr, inputs, engine);
  const N = dimensionOf(inputs);

  // TS-2 runtime guard: gLower must be a metric-tensor node.
  if (!isMetricTensorNode(covNode.gLower)) {
    throw new NumericalBackendError(
      `lowering: CovariantDerivativeNode.gLower must be a metric-tensor node ` +
      `(got kind='${(covNode.gLower as { kind?: unknown }).kind}')`,
    );
  }
  const strategy = covNode.gLower.derivativeStrategy ?? 'computed';

  // S2(b): strategy='zero' → flat space, Γ=0, ∇_μ T = ∂_μ T.
  // For constant tensors ∂_μ T = 0, result is zero of shape [...ofShape, N].
  if (strategy === 'zero') {
    const outShape = [...ofTensor.shape, N];
    return zeroTensor(outShape, engine);
  }

  // v0.4.0 CRITICAL FIX (Finding #1): 'computed' on a raw-tensor metric means
  // constant metric → Γ = 0 → covariant-derivative = partial only.
  // This early return MUST come before Christoffel construction.
  if (ofExpr.kind !== 'tensor-symbol' && ofExpr.kind !== 'metric-tensor') {
    throw new NumericalBackendError(
      `lowering: covariant-derivative 'of' must be tensor-symbol or metric-tensor ` +
      `(got '${(ofExpr as { kind: string }).kind}') — validated nodes cannot reach this point`,
    );
  }
  const pdNode: ExprNode = {
    kind: 'tensor-partial-derivative',
    of: ofExpr,
    wrt: covNode.wrt as ExprNode,
    wrtIndex: covNode.wrtIndex,
  };
  const partial = recur(pdNode, inputs, engine);

  if (strategy === 'computed') {
    return partial;
  }

  // S2(c) + S2(d): Build Γ^α_{μν} from metric data and apply
  // the sign rule to all free indices of `of`:
  //   ∇_μ T^α_β = ∂_μ T^α_β + Γ^α_{μλ} T^λ_β − Γ^λ_{μβ} T^α_λ
  if (ofFreeIndices.length === 0) {
    return partial;
  }

  // gLower narrowed to MetricTensorNode by the predicate above (TS-2).
  const gLowerNode: MetricTensorNode = covNode.gLower;
  const gInverseNode = covNode.gInverse as MetricTensorNode;
  const gInverseData = flattenNestedArray(requireValue(gInverseNode.name, inputs), N * N);

  const coordLabel = covNode.wrtIndex.label;

  // getMetricDeriv(mu): returns flat [N*N] of ∂_{mu} g.
  // 'supplied' strategy is the only remaining possibility here.
  const getMetricDeriv = (mu: number): number[] =>
    getMetricDerivFlat(
      gLowerNode.name,
      coordLabel,
      mu,
      'supplied',
      N,
      inputs.metricDerivatives,
    );

  // Compute Γ^α_{μν} from metric data.
  const GammaTensor = computeChristoffelTensor(gInverseData, getMetricDeriv, N, engine);
  const GammaFlat = flattenNestedArray(engine.toNested(GammaTensor) as NestedArray, N * N * N);

  // Apply the Christoffel correction for each free index of `of`.
  // S2(d) sign rule: upper → +Γ, lower → −Γ.
  const ofFlat = flattenNestedArray(engine.toNested(ofTensor) as NestedArray,
    ofTensor.shape.reduce((a: number, b: number) => a * b, 1));
  const ofShapeArr = [...ofTensor.shape];

  let correction = zeroTensorLike(partial, engine);
  for (const freeIdx of ofFreeIndices) {
    const term = contractChristoffelWithOperand(
      GammaFlat,
      ofFlat,
      ofShapeArr,
      freeIdx.pos,
      freeIdx.variance,
      N,
      engine,
    );
    const sign = freeIdx.variance === 'upper' ? 1 : -1;
    correction = tensorAddScaled(correction, term, sign as 1 | -1, engine);
  }

  return tensorAdd(partial, correction, engine);
}
