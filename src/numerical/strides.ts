/**
 * Shared stride and flat-index utilities for row-major tensor storage.
 *
 * Used by connection-lowering-helpers.ts (Christoffel / contraction loops).
 * Extracted in v0.4.6 to eliminate duplicate implementations.
 *
 * @module numerical/strides
 * @internal
 */

/**
 * Compute row-major strides for a given shape.
 * strides[k] = product of shape[k+1..end], so that
 * flatIndex = sum(idx[k] * strides[k]).
 */
export function rowMajorStrides(shape: ReadonlyArray<number>): number[] {
  const strides = new Array<number>(shape.length);
  let s = 1;
  for (let k = shape.length - 1; k >= 0; k--) {
    strides[k] = s;
    s *= shape[k];
  }
  return strides;
}

/**
 * Compute the flat (linear) index from a multi-index and precomputed strides.
 * flatIndex = sum_k(idx[k] * strides[k]).
 */
export function flatIndex(
  idx: ReadonlyArray<number>,
  strides: ReadonlyArray<number>,
): number {
  let f = 0;
  for (let k = 0; k < idx.length; k++) f += idx[k] * strides[k];
  return f;
}

/**
 * Check if two shape arrays are element-wise equal.
 */
export function sameShape(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
