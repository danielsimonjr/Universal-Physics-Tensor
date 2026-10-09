/**
 * The dominance witness runner: a claimed UPPER BOUND checked against a
 * measured quantity at every sample, at two resolutions.
 *
 * `witness-numeric.ts` checks agreement with a target, which is the wrong
 * shape for a bound: a bound that holds is not equal to anything. Here each
 * resolution returns the measured quantity and the bound at the SAME samples.
 * At each sample the coarse-to-fine difference of the measurement, plus the
 * coarse-to-fine difference of the bound when the bound itself is computed
 * numerically, is taken as the numerical uncertainty `u`, and the fine margin
 * `bound − measured` is judged against it:
 *
 * - `'refuted'` iff at some sample the measurement exceeds the bound by more
 *   than `u` there;
 * - `'checked'` iff at every sample the bound exceeds the measurement by more
 *   than `u` there;
 * - `'unresolved'` (`'no-convergence'`) otherwise: the two resolutions do not
 *   settle which side the bound is on at some sample.
 *
 * `u` is conservative: for a convergent scheme the fine error is smaller than
 * the coarse-to-fine difference.
 *
 * @module atlas/witness-dominance
 * @internal
 */

import type { WitnessRunResult } from './witness-result.js';

/** The executable specification for checking a measured quantity against a claimed upper bound. @internal */
export interface DominanceWitnessSpec {
  readonly id: string;
  readonly kind: 'dominance';
  /** At a resolution: the measured quantity and the claimed bound, sample by sample. */
  readonly evaluate: (resolution: number) => { readonly measured: readonly number[]; readonly bound: readonly number[] };
  readonly coarseResolution: number;
  readonly fineResolution: number;
}

/** The numeric outcome of one dominance-witness run, including margin and tightness. @internal */
export interface DominanceRunResult extends WitnessRunResult {
  readonly kind: 'numeric';
  /** min(bound − measured) at the fine resolution; absent when evaluation failed. */
  readonly margin?: number;
  /** max |measured_fine − measured_coarse|. */
  readonly uncertainty?: number;
  /** max(measured / bound) at the fine resolution: how close the bound comes to the measurement. */
  readonly tightness?: number;
}

/** Run one dominance witness. Never throws: an evaluation that throws is `'unresolved'`. @internal */
export function runDominanceWitness(spec: DominanceWitnessSpec): DominanceRunResult {
  const started = Date.now();
  const base = { witnessId: spec.id, kind: 'numeric' as const };
  const elapsed = (): number => Date.now() - started;
  let coarse: ReturnType<DominanceWitnessSpec['evaluate']>;
  let fine: ReturnType<DominanceWitnessSpec['evaluate']>;
  try {
    coarse = spec.evaluate(spec.coarseResolution);
    fine = spec.evaluate(spec.fineResolution);
  } catch (err) {
    return { ...base, status: 'unresolved', reason: 'parse-error', detail: `Evaluation threw: ${String(err)}.`, elapsedMs: elapsed() };
  }
  const n = fine.measured.length;
  const finite = (xs: readonly number[]): boolean => xs.every(Number.isFinite);
  if (
    n === 0 ||
    coarse.measured.length !== n ||
    fine.bound.length !== n ||
    coarse.bound.length !== n ||
    !finite(fine.measured) ||
    !finite(coarse.measured) ||
    !finite(fine.bound) ||
    !finite(coarse.bound)
  ) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'parse-error',
      detail: 'The two resolutions did not produce the same number of finite samples; nothing is concluded.',
      elapsedMs: elapsed(),
    };
  }
  let margin = Infinity;
  let uncertainty = 0;
  let tightness = 0;
  let holds = true;
  let exceeds = false;
  for (let i = 0; i < n; i++) {
    const m = fine.measured[i]!;
    const b = fine.bound[i]!;
    // A closed-form bound is the same at both resolutions and adds nothing;
    // a bound that moved between them is uncertain by that movement.
    const u = Math.abs(m - coarse.measured[i]!) + Math.abs(b - coarse.bound[i]!);
    margin = Math.min(margin, b - m);
    uncertainty = Math.max(uncertainty, u);
    if (b > 0) tightness = Math.max(tightness, m / b);
    if (!(b - m > u)) holds = false;
    if (m - b > u) exceeds = true;
  }
  const record = { margin, uncertainty, tightness };
  const numbers =
    `smallest margin bound − measured = ${margin}, largest numerical uncertainty ${uncertainty}, ` +
    `max measured/bound = ${tightness} over ${n} samples`;
  if (exceeds) {
    return { ...base, status: 'refuted', ...record, detail: `The measurement exceeds the bound by more than its uncertainty: ${numbers}.`, elapsedMs: elapsed() };
  }
  if (holds) {
    return { ...base, status: 'checked', ...record, detail: `The bound holds at every sample by more than its uncertainty: ${numbers}.`, elapsedMs: elapsed() };
  }
  return {
    ...base,
    status: 'unresolved',
    reason: 'no-convergence',
    ...record,
    detail: `The two resolutions do not settle which side of the bound the measurement is on: ${numbers}.`,
    elapsedMs: elapsed(),
  };
}
