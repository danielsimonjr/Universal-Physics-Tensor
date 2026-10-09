/**
 * Numerical partial derivative — two-way dispatch (v0.3.5-Design.md §6).
 *   'grid'         — centered finite-difference over a GridField.
 *   'numerical-fn' — centered finite-difference over a caller-supplied fn.
 *   'symbolic'     — no CAS in v0.3.5; consumes an explicit pre-supplied
 *                    derivative from NumericalInputs.derivatives.
 *
 * @module numerical/pderiv
 */
import type { GridField } from './grid-field.js';
import type { NestedArray } from './types.js';
import { NumericalBackendError } from './errors.js';
import { flattenNA } from './connection-lowering-helpers.js';

/**
 * Centered finite-difference of a GridField along `axis`. Returns a flat
 * number[] of the same total size as the grid. O(h²) interior stencil;
 * edges follow `grid.boundary`:
 *   - 'clamp'    — one-sided (forward/backward) difference at the edge.
 *   - 'periodic' — wraps to the opposite edge.
 *
 * @internal — consumed by the lowering pass; not part of the consumer surface.
 */
export function pderivGrid(grid: GridField, axis: number): number[] {
  if (axis < 0 || axis >= grid.shape.length) {
    throw new NumericalBackendError(`pderivGrid: axis ${axis} out of range for shape [${grid.shape}]`);
  }
  const h = grid.spacing[axis];
  if (!(h > 0)) {
    throw new NumericalBackendError(`pderivGrid: non-positive spacing ${h} on axis ${axis}`);
  }
  const flat = flattenNA(grid.data);
  const shape = grid.shape;
  const strides: number[] = new Array(shape.length);
  let acc = 1;
  for (let k = shape.length - 1; k >= 0; k--) { strides[k] = acc; acc *= shape[k]; }
  const out = new Array<number>(flat.length).fill(0);
  const n = shape[axis];
  const step = strides[axis];

  // Walk every multi-index; compute the axis position from the flat index.
  for (let f = 0; f < flat.length; f++) {
    const pos = Math.floor(f / step) % n;
    if (pos > 0 && pos < n - 1) {
      out[f] = (flat[f + step] - flat[f - step]) / (2 * h);
    } else if (grid.boundary === 'periodic') {
      const next = pos === n - 1 ? f - (n - 1) * step : f + step;
      const prev = pos === 0 ? f + (n - 1) * step : f - step;
      out[f] = (flat[next] - flat[prev]) / (2 * h);
    } else { // 'clamp' — one-sided difference at the edge
      out[f] = pos === 0
        ? (flat[f + step] - flat[f]) / h
        : (flat[f] - flat[f - step]) / h;
    }
  }
  return out;
}

/**
 * Options for {@link pderivNumericalFn}.
 *
 * - `order` — stencil order. Default **4** as of v0.6.0 (was 2 in v0.5.x,
 *   Decision #7). `4` uses the 4-point centered
 *   `(−f(x+2h) + 8 f(x+h) − 8 f(x−h) + f(x−2h)) / (12 h)`
 *   form with adaptive `h = 1e-4·max(|x|,1)`. 4th-order has ~2× FD
 *   evaluations vs 2nd-order but ~10⁴× lower truncation error; preferred
 *   default for curvature/Schwarzschild-scale computations where
 *   c²·g_tt ~ 6e16 causes 2nd-order cancellation noise.
 *   `2` uses the classic centered `(f(x+h) − f(x−h)) / (2h)` form with
 *   adaptive `h = 1e-6·max(|x|,1)`. Use `{ order: 2 }` explicitly to
 *   preserve v0.5.x 2nd-order semantics.
 *   v0.5.1 PD-7 introduced the parameter; v0.6.0 Task 2.12 flipped the default.
 *
 * - `h` — optional explicit step override. Used by
 *   `curvature-lowering-helpers.ts` for its inner ∂g sampler where the
 *   c²-scaled g_tt cancellation noise needs a larger-than-default step
 *   (`1e-3·max(|x|,1)`) to balance truncation vs round-off. If supplied,
 *   the adaptive default is bypassed entirely.
 */
// v0.6.1: dropped export — internal-only options shape for pderivNumericalFn.
interface PderivOptions {
  readonly order?: 2 | 4;
  readonly h?: number;
}

/**
 * Centered finite-difference of a caller-supplied scalar (or tensor-valued)
 * field with respect to coordinate `axis`.
 *
 * - 4th-order (default as of v0.6.0): step h = 1e-4 · max(|x|, 1).
 *   ~2× FD evaluations vs 2nd-order; ~10⁴× lower truncation error.
 *   Preferred for curvature/Schwarzschild-scale computations.
 * - 2nd-order (`options.order === 2`): step h = 1e-6 · max(|x|, 1)
 *   (v0.3.5-Design.md §13 Q3). Use `{ order: 2 }` to preserve v0.5.x semantics.
 *
 * @internal — consumed by the lowering pass; not part of the consumer surface.
 */
export function pderivNumericalFn(
  fn: (coords: ReadonlyArray<number>) => NestedArray,
  coords: ReadonlyArray<number>,
  axis: number,
  options?: PderivOptions,
): NestedArray {
  if (axis < 0 || axis >= coords.length) {
    throw new NumericalBackendError(`pderivNumericalFn: axis ${axis} out of range`);
  }
  const order = options?.order ?? 4;
  if (order !== 2 && order !== 4) {
    throw new NumericalBackendError(
      `pderivNumericalFn: unsupported order ${order} — only 2 or 4 are supported`,
    );
  }
  const x = coords[axis];
  const defaultH = (order === 4 ? 1e-4 : 1e-6) * Math.max(Math.abs(x), 1);
  const h = options?.h ?? defaultH;
  if (!(h > 0) || !Number.isFinite(h)) {
    throw new NumericalBackendError(
      `pderivNumericalFn: non-positive or non-finite step h=${h}`,
    );
  }

  if (order === 2) {
    const plus = [...coords]; plus[axis] = x + h;
    const minus = [...coords]; minus[axis] = x - h;
    const fp = flattenNA(fn(plus));
    const fm = flattenNA(fn(minus));
    if (fp.length !== fm.length) {
      throw new NumericalBackendError('pderivNumericalFn: field returned inconsistent shapes');
    }
    const len = fp.length;
    const d = new Array(len);
    const inv2h = 1 / (2 * h);
    for (let i = 0; i < len; i++) {
      // A component that is the same number at every stencil point does not
      // move: its derivative is exactly 0, not the stencil's roundoff over h.
      d[i] = fp[i] === fm[i] ? 0 : (fp[i] - fm[i]) * inv2h;
    }
    return d.length === 1 ? d[0] : d;
  }

  // order === 4: f'(x) ≈ (−f(x+2h) + 8 f(x+h) − 8 f(x−h) + f(x−2h)) / (12 h)
  const p1 = [...coords]; p1[axis] = x + h;
  const m1 = [...coords]; m1[axis] = x - h;
  const p2 = [...coords]; p2[axis] = x + 2 * h;
  const m2 = [...coords]; m2[axis] = x - 2 * h;
  const fp1 = flattenNA(fn(p1));
  const fm1 = flattenNA(fn(m1));
  const fp2 = flattenNA(fn(p2));
  const fm2 = flattenNA(fn(m2));
  if (
    fp1.length !== fm1.length || fp1.length !== fp2.length || fp1.length !== fm2.length
  ) {
    throw new NumericalBackendError('pderivNumericalFn: field returned inconsistent shapes');
  }
  const inv12h = 1 / (12 * h);
  const len = fp1.length;
  const d = new Array(len);
  for (let i = 0; i < len; i++) {
    // A component that is the same number at every stencil point does not
    // move: its derivative is exactly 0. The stencil cancels a large constant
    // (g_tt = −c²) only up to the roundoff of 8·f, and that roundoff over h
    // is a fake derivative of order 10⁴.
    const still = fp1[i] === fm1[i] && fp1[i] === fp2[i] && fp1[i] === fm2[i];
    d[i] = still ? 0 : (-fp2[i] + 8 * fp1[i] - 8 * fm1[i] + fm2[i]) * inv12h;
  }
  return d.length === 1 ? d[0] : d;
}

/**
 * 'symbolic' numericalForm path: v0.3.5 has no CAS, so the caller supplies
 * the derivative explicitly, keyed `${symbolName}/${coordLabel}`.
 *
 * @internal — consumed by the lowering pass; not part of the consumer surface.
 */
export function pderivSymbolic(
  symbolName: string,
  coordLabel: string,
  derivatives: ReadonlyMap<string, NestedArray>,
): NestedArray {
  const key = `${symbolName}/${coordLabel}`;
  const d = derivatives.get(key);
  if (d === undefined) {
    throw new NumericalBackendError(
      `pderivSymbolic: no explicit derivative supplied for "${key}" — `
      + `a 'symbolic' tensor-symbol under a partial-derivative requires `
      + `inputs.derivatives to contain its pre-computed components (v0.3.5 has no CAS)`,
    );
  }
  return d;
}

/**
 * 'supplied' derivativeStrategy path: v0.4.0 metric derivative looked up
 * from explicit caller-supplied components. Keyed `${metricName}/${coordLabel}`.
 * Mirror of `pderivSymbolic` for the metric-tensor lowering path.
 * Throws NumericalBackendError with a clear message when absent.
 */
export function metricDerivSupplied(
  metricName: string,
  coordLabel: string,
  metricDerivatives: ReadonlyMap<string, NestedArray>,
): NestedArray {
  const key = `${metricName}/${coordLabel}`;
  const d = metricDerivatives.get(key);
  if (d === undefined) {
    throw new NumericalBackendError(
      `metricDerivSupplied: no metric derivative supplied for "${key}" — `
      + `a metric-tensor with derivativeStrategy='supplied' under a `
      + `christoffel/covariant-derivative requires inputs.metricDerivatives `
      + `to contain its pre-computed ∂g components`,
    );
  }
  return d;
}
