/**
 * Atlas Phase 4, S4.2 — the numeric witness runner.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §2.3.
 *
 * A numeric witness evaluates a claim at TWO resolutions and reports whether
 * refinement moved the answer toward the target. Two resolutions are the
 * minimum that can say anything at all: one number agreeing with a target is
 * consistent with a scheme that is simply wrong by an amount the tolerance
 * happens to admit.
 *
 * ## The ratio is REPORTED, never compared against an expected order
 *
 * `convergence.ratio = |coarse − target| / |fine − target|` is the factor by
 * which refinement reduced the error. A second-order scheme halving its step
 * should give ≈ 4; a first-order one ≈ 2. **Nothing here asserts which.** The
 * witnesses in hand do not all record their scheme's order, and asserting an
 * order nobody wrote down would be fabrication of exactly the kind this sprint
 * forbids. The number goes into the results artifact; a reviewer reads it.
 *
 * What the runner DOES decide is the weaker, checkable thing: a ratio at or
 * below 1 means refinement did NOT improve the answer, and that earns
 * `'unresolved'` rather than `'checked'` — a fine value that happens to land
 * inside the tolerance while refinement is not converging is agreement by
 * accident, and the tolerance alone cannot tell the two apart.
 *
 * @module atlas/witness-numeric
 * @internal
 */

import type { WitnessRunResult } from './witness-result.js';

/** The two-resolution error record a numeric witness carries. @internal */
export interface Convergence {
  /** |coarse − target| in the witness's own units. */
  readonly coarse: number;
  /** |fine − target|. */
  readonly fine: number;
  /**
   * `coarse / fine`. Greater than 1 ⇒ refinement helped. `Infinity` when the
   * fine error is exactly zero and the coarse one is not, which is a
   * legitimate outcome for an exact scheme and must not be reported as a
   * failure. `NaN` when BOTH errors are exactly zero: `0/0` has no value,
   * and the run is `'unresolved'` with reason `'no-error-to-reduce'`.
   */
  readonly ratio: number;
}

/** What a numeric witness asserts, and how to evaluate it. @internal */
export interface NumericWitnessSpec {
  /** The `Witness.id`. */
  readonly id: string;
  /**
   * Evaluate the claim at a resolution. The meaning of the argument is the
   * witness's own (a step count, a grid size, a truncation order); the runner
   * only requires that `fineResolution` is the more refined of the two.
   */
  readonly evaluate: (resolution: number) => number;
  /** The value the claim should reproduce. A non-finite target is `'unresolved'`. */
  readonly target: number;
  readonly coarseResolution: number;
  readonly fineResolution: number;
  /**
   * Absolute tolerance the FINE evaluation must meet. Required: a default
   * tolerance is a claim about accuracy that the caller, not this module,
   * is entitled to make. A tolerance that is not a finite number ≥ 0 is
   * `'unresolved'`: `fine > NaN` is false, so a NaN here would otherwise
   * report `'checked'` for any fine value.
   */
  readonly tolerance: number;
}

/** A result that also carries the two-resolution record, when one was produced. */
export interface NumericWitnessRunResult extends WitnessRunResult {
  readonly kind: 'numeric';
  /** Absent only when evaluation threw before any number existed. */
  readonly convergence?: Convergence;
}

/**
 * Run one numeric witness at two resolutions.
 *
 * @param spec - the claim and its two resolutions.
 * @returns a result carrying `convergence`; **never throws** — an evaluation
 * that throws is `'unresolved'` with `'parse-error'`, because a scheme that
 * blew up has not refuted the physics it was evaluating.
 * @internal
 */
export function runNumericWitness(spec: NumericWitnessSpec): NumericWitnessRunResult {
  const started = Date.now();
  const base = { witnessId: spec.id, kind: 'numeric' as const };
  const elapsed = (): number => Date.now() - started;

  // A NaN target or tolerance makes every comparison below false, which
  // would read as `'checked'`. Nothing is evaluated against a claim that
  // does not state a finite target and a finite, non-negative tolerance.
  if (!Number.isFinite(spec.target) || !Number.isFinite(spec.tolerance) || spec.tolerance < 0) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'parse-error',
      detail:
        `The claim does not state a finite target and a finite non-negative tolerance ` +
        `(target ${spec.target}, tolerance ${spec.tolerance}). Nothing is concluded from it.`,
      elapsedMs: elapsed(),
    };
  }

  let coarseValue: number;
  let fineValue: number;
  try {
    coarseValue = spec.evaluate(spec.coarseResolution);
    fineValue = spec.evaluate(spec.fineResolution);
  } catch (err) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'parse-error',
      detail: `Evaluation threw rather than producing a number: ${String(err)}.`,
      elapsedMs: elapsed(),
    };
  }

  if (!Number.isFinite(coarseValue) || !Number.isFinite(fineValue)) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'parse-error',
      detail:
        `Evaluation produced a non-finite value (coarse ${coarseValue}, fine ` +
        `${fineValue}). Nothing is concluded from it.`,
      elapsedMs: elapsed(),
    };
  }

  const coarse = Math.abs(coarseValue - spec.target);
  const fine = Math.abs(fineValue - spec.target);
  // fine === 0 ⇒ an exact scheme. Infinity is the honest ratio there, and the
  // comparisons below treat it as "refinement helped", which it did. Both
  // zero is 0/0: no ratio exists, and that case is reported on its own below.
  const ratio = fine === 0 ? (coarse === 0 ? Number.NaN : Infinity) : coarse / fine;
  const convergence: Convergence = { coarse, fine, ratio };

  if (coarse === 0 && fine === 0) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'no-error-to-reduce',
      convergence,
      detail:
        'Both resolutions reproduce the target exactly, so there was no error for ' +
        'refinement to reduce. Agreement is recorded; convergence is not shown.',
      elapsedMs: elapsed(),
    };
  }

  if (fine > spec.tolerance) {
    return {
      ...base,
      status: 'refuted',
      convergence,
      detail:
        `The fine evaluation misses the target by ${fine}, outside the stated ` +
        `tolerance ${spec.tolerance}.`,
      elapsedMs: elapsed(),
    };
  }

  if (ratio <= 1) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'no-convergence',
      convergence,
      detail:
        `Refinement did not reduce the error (ratio ${ratio}). The fine value is ` +
        'inside tolerance, but agreement that does not improve with refinement is ' +
        'not evidence that the scheme converges to the target.',
      elapsedMs: elapsed(),
    };
  }

  return {
    ...base,
    status: 'checked',
    convergence,
    detail:
      `Fine error ${fine} is within tolerance ${spec.tolerance}, and refinement ` +
      `reduced the error by a factor of ${ratio}.`,
    elapsedMs: elapsed(),
  };
}
