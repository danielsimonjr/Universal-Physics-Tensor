/**
 * Shared private utilities for the `numerical/lowering*.ts` modules.
 *
 * Carved out of `lowering.ts` in the v0.7 follow-up to its v0.6.1
 * sprint-target miss (LOC 903 vs ≤890). Centralizes the four helpers
 * that both `lowering.ts` and the v0.7 `derivative-lowering.ts`
 * need, avoiding both a forward-import cycle and code duplication.
 *
 * No public surface — every export carries an `@internal` JSDoc tag.
 *
 * @module numerical/lowering-utils
 */

import type { NumericalInputs, NestedArray } from './types.js';
import type { MetricTensorNode } from '../dimensional/metric-validators.js';
import { NumericalBackendError } from './errors.js';
import { flattenNA } from './connection-lowering-helpers.js';

/**
 * Module-private type predicate for the `metric-tensor` AST kind.
 * Replaces the duplicated `(n as { kind?: unknown }).kind ===
 * 'metric-tensor'` cast pattern. TypeScript narrows the operand to
 * `MetricTensorNode` after the predicate, removing follow-up `as
 * MetricTensorNode` casts.
 *
 * @internal
 */
export function isMetricTensorNode(n: unknown): n is MetricTensorNode {
  return typeof n === 'object' && n !== null
    && (n as { kind?: unknown }).kind === 'metric-tensor';
}

/**
 * Coordinate-space dimension supplied via `NumericalInputs.dimension`,
 * defaulting to 4 (spacetime). Read at most case-arms in lowering.
 *
 * @internal
 */
export function dimensionOf(inputs: NumericalInputs): number {
  return inputs.dimension ?? 4;
}

/**
 * Look up a named tensor's concrete value from
 * `NumericalInputs.tensors`, or throw with a clear message.
 *
 * @internal
 */
export function requireValue(name: string, inputs: NumericalInputs): NestedArray {
  const v = inputs.tensors.get(name);
  if (v === undefined) {
    throw new NumericalBackendError(`lowering: no value supplied for "${name}" in inputs.tensors`);
  }
  return v;
}

/**
 * Flatten a `NestedArray` to a plain `number[]` and check the result
 * matches `expectedSize`. Wraps the canonical `flattenNA()` with a
 * size-mismatch guard so consumers don't silently swallow bad input.
 *
 * @internal
 */
export function flattenNestedArray(data: NestedArray, expectedSize: number): number[] {
  const out = flattenNA(data);
  if (out.length !== expectedSize) {
    throw new NumericalBackendError(
      `lowering: flattenNestedArray: got ${out.length} elements, expected ${expectedSize}`,
    );
  }
  return out;
}

/** A coordinate-dependent rank-2 closure: f(x) → N×N as a NestedArray
 *  (number[][], Float64Array, or any form `flattenNA` can flatten —
 *  the union of `MetricFnFlat` and `MetricFnNested` plus deeper
 *  nestings; NestedArray itself admits Float64Array since v0.9.0). */
export type MetricFn = (x: ReadonlyArray<number>) => NestedArray;

/** The curvature lowerings that need the two metric closures. */
type ClosureKind = 'riemann-tensor' | 'bianchi-residual' | 'weyl-tensor' | 'kretschmann-scalar';

/**
 * Read the metric closure `gName` and the inverse-metric closure `gInvName` from `inputs.fields`.
 * The message of each `kind` is the message of that lowering before the closures were shared.
 *
 * @param kind - The lowering that needs the closures.
 * @param inputs - The numerical inputs.
 * @param gName - The field name of the metric closure.
 * @param gInvName - The field name of the inverse-metric closure.
 * @returns The two closures.
 * @throws NumericalBackendError if a closure is missing.
 * @internal
 */
export function requireMetricClosures(
  kind: ClosureKind,
  inputs: NumericalInputs,
  gName: string,
  gInvName: string,
): { readonly gFn: MetricFn; readonly gInverseFn: MetricFn } {
  const gFn = inputs.fields?.get(gName) as MetricFn | undefined;
  const gInverseFn = inputs.fields?.get(gInvName) as MetricFn | undefined;
  if (!gFn || !gInverseFn) {
    const what = kind === 'riemann-tensor' || kind === 'bianchi-residual' ? `${kind} numerical evaluation` : kind;
    const note = kind === 'riemann-tensor'
      ? ` (constant-metric Riemann is identically zero — the test wouldn't fire here)`
      : '';
    throw new NumericalBackendError(
      `lowering: ${what} requires coordinate-dependent metric closures in ` +
        `inputs.fields for "${gName}" and "${gInvName}"${note}. ` +
        `Got fields=[${[...(inputs.fields?.keys() ?? [])].join(',')}].`,
    );
  }
  return { gFn, gInverseFn };
}
