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
 * ## An observed order is REPORTED beside the ratio, from three or more resolutions
 *
 * A spec may name further resolutions (`orderResolutions`). With three or
 * more in all, MathTS `linearRegression` of log|error| on log(1/resolution)
 * gives an OBSERVED order with the slope's standard error, carried as
 * {@link ObservedOrder}. The same rule applies: nothing compares it with an
 * expected order, and it changes no verdict. The extra resolutions are
 * evaluated after the two-resolution verdict is fixed; one that throws, is
 * non-finite, or lands exactly on the target drops the fit and nothing else.
 *
 * @module atlas/witness-numeric
 * @internal
 */

import { linearRegression } from '@danielsimonjr/mathts-functions';
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

/**
 * The observed order of convergence over `n` resolutions: `slope` is the
 * fitted exponent p in |error| ∝ h^p with h = 1/resolution (the slope of
 * log|error| against log(1/resolution)), `stdErr` the standard error of that
 * slope from the fit (n − 2 degrees of freedom). Reported, never asserted.
 * @internal
 */
export interface ObservedOrder {
  readonly slope: number;
  readonly stdErr: number;
  readonly n: number;
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
  /**
   * Further resolutions, beyond `coarseResolution` and `fineResolution`,
   * evaluated only to fit the observed order. They enter no verdict, no
   * convergence record and no detail sentence.
   */
  readonly orderResolutions?: readonly number[];
}

/** A result that also carries the two-resolution record, when one was produced. */
export interface NumericWitnessRunResult extends WitnessRunResult {
  readonly kind: 'numeric';
  /** Absent only when evaluation threw before any number existed. */
  readonly convergence?: Convergence;
  /** Present only when `orderResolutions` gave three or more finite, non-zero errors to fit. */
  readonly observedOrder?: ObservedOrder;
}

/**
 * The observed order over the resolutions whose errors are all finite and
 * positive, or `undefined` when fewer than three are, or an extra
 * evaluation throws. The fit is log|error| against log(1/resolution).
 */
function observedOrderOf(
  spec: NumericWitnessSpec,
  errors: readonly { readonly resolution: number; readonly error: number }[],
): ObservedOrder | undefined {
  const points = [...errors];
  try {
    for (const resolution of spec.orderResolutions ?? []) {
      points.push({ resolution, error: Math.abs(spec.evaluate(resolution) - spec.target) });
    }
  } catch {
    return undefined;
  }
  if (points.length < 3) return undefined;
  if (!points.every((p) => Number.isFinite(p.error) && p.error > 0 && Number.isFinite(p.resolution) && p.resolution > 0)) {
    return undefined;
  }
  const x = points.map((p) => -Math.log(p.resolution));
  const y = points.map((p) => Math.log(p.error));
  const fit = linearRegression(x, y);
  if (!Number.isFinite(fit.slope) || !Number.isFinite(fit.intercept)) return undefined;
  // From @danielsimonjr/mathts-functions 0.68.5 (MathTS #371) the slope's standard error is the
  // residual form √(Σ(y − ŷ)²/((n − 2) Σ(x − x̄)²)); before it, `syy − slope·sxy` cancelled on a
  // near-exact fit and went negative, so an exact power law with rounded errors reported NaN and
  // this runner recomputed the residual form itself. A non-finite value is still not reported.
  const stdErr: number = fit.stdErr;
  if (!Number.isFinite(stdErr)) return undefined;
  return { slope: fit.slope, stdErr, n: points.length };
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
  const order = observedOrderOf(spec, [
    { resolution: spec.coarseResolution, error: coarse },
    { resolution: spec.fineResolution, error: fine },
  ]);
  const observed = order === undefined ? {} : { observedOrder: order };

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
      ...observed,
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
      ...observed,
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
    ...observed,
    detail:
      `Fine error ${fine} is within tolerance ${spec.tolerance}, and refinement ` +
      `reduced the error by a factor of ${ratio}.`,
    elapsedMs: elapsed(),
  };
}
