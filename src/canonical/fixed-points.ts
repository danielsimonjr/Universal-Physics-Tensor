/**
 * One owner for "a constant times that one".
 *
 * Several callers decide whether two formulas agree up to a constant: the
 * derivation audit, the canonical comparison, the linkage recovery, explain's
 * monomial check and `upt derive`. Each once carried its own sample points,
 * its own ratio statistic and its own tolerance, so the same question could be
 * answered differently in different commands. The three pieces live here, and
 * every caller passes the base, step, exponent schedule, statistic and
 * tolerance it used before, so no verdict moved
 * (`tests/canonical/fixed-point-verdicts.test.ts` is the pin).
 *
 * A sample point gives variable `i` (in the caller's name order) the value
 * `(base + step·i)^p`. Each variable has its own base, so the RATIOS between
 * variables change from point to point too: a common scale factor would leave
 * every ratio such as ℓ/g fixed, and `T ∝ ℓ/g` would then pass as the form of
 * `T ∝ √(ℓ/g)`.
 *
 * @module canonical/fixed-points
 */

import { ratioSpread } from '../numerical/statistics.js';

/**
 * The exponent schedule the canonical comparison and the linkage recovery
 * share: three points, so a constant ratio is checked at three places.
 *
 * @internal
 */
export const FIXED_POINT_EXPONENTS: readonly number[] = [1, 1.3, 1.6];

/** The per-variable base and step of a sample scheme. @internal */
export interface FixedPointScheme {
  /** The base of the first variable. */
  readonly base: number;
  /** Added to the base once per later variable. */
  readonly step: number;
}

/**
 * The sample point at exponent `p`: `names[i]` takes `(base + step·i)^p`.
 *
 * @internal
 */
export function fixedPoint(
  names: readonly string[],
  p: number,
  scheme: FixedPointScheme,
): Record<string, number> {
  const point: Record<string, number> = {};
  names.forEach((name, i) => {
    point[name] = Math.pow(scheme.base + scheme.step * i, p);
  });
  return point;
}

/** The statistic a constancy decision rests on. @internal */
export type RatioStatistic = 'max-rel-err' | 'cv';

/** Options of {@link constantRatio}. @internal */
export interface ConstantRatioOptions {
  /**
   * `max-rel-err` (the default): the largest `|r/r0 − 1|` over the ratios,
   * `r0` the first; the value is `r0`. `cv`: the population standard
   * deviation over the absolute mean (`ratioSpread`); the value is the mean.
   */
  readonly statistic?: RatioStatistic;
}

/** Whether a list of ratios is one constant, and what it is. @internal */
export interface ConstantRatio {
  /** True when the statistic is within `tolerance`. */
  readonly constant: boolean;
  /** The constant: the first ratio, or the mean under `cv`. */
  readonly value: number;
  /** The statistic: the largest relative departure, or the coefficient of variation. */
  readonly maxRelErr: number;
}

/**
 * Decide whether `ratios` are one constant to within `tolerance`. An empty
 * list, a zero, or a non-finite ratio is never constant.
 *
 * @internal
 */
export function constantRatio(
  ratios: readonly number[],
  tolerance: number,
  options: ConstantRatioOptions = {},
): ConstantRatio {
  const r0 = ratios[0];
  if (r0 === undefined || ratios.some((r) => !Number.isFinite(r) || r === 0)) {
    return { constant: false, value: r0 ?? Number.NaN, maxRelErr: Number.NaN };
  }
  if ((options.statistic ?? 'max-rel-err') === 'cv') {
    const { mean, cv } = ratioSpread(ratios);
    return { constant: cv < tolerance, value: mean, maxRelErr: cv };
  }
  const maxRelErr = Math.max(...ratios.map((r) => Math.abs((r - r0) / r0)));
  return { constant: maxRelErr <= tolerance, value: r0, maxRelErr };
}

/** The scheme `upt derive` recovers a prefactor with. @internal */
export interface PrefactorRecoveryScheme extends FixedPointScheme {
  /** The exponents sampled, one point each. */
  readonly exponents: readonly number[];
  readonly tolerance: number;
  readonly statistic: RatioStatistic;
}

/** The outcome of {@link recoverMonomialPrefactor}. @internal */
export interface PrefactorRecovery {
  /** True when `evaluate / monomial` is one constant over the points. */
  readonly matches: boolean;
  /** That constant, present only when `matches`. */
  readonly prefactor?: number;
  /** The ratio statistic over the points. */
  readonly spread: number;
}

/**
 * Recover the constant in front of a monomial: evaluate the caller's formula
 * at each point of the scheme, divide by the monomial there, and ask
 * {@link constantRatio}. The formula is called with the point keyed by
 * `names`; a caller whose formula spells a name differently maps it inside
 * `evaluate`. An exponent the monomial does not state is 0.
 *
 * @internal
 */
export function recoverMonomialPrefactor(
  evaluate: (point: Readonly<Record<string, number>>) => number,
  monomial: Readonly<Record<string, number>>,
  names: readonly string[],
  scheme: PrefactorRecoveryScheme,
): PrefactorRecovery {
  const ratios = scheme.exponents.map((p) => {
    const point = fixedPoint(names, p, scheme);
    let candidate = 1;
    for (const name of names) candidate *= Math.pow(point[name]!, monomial[name] ?? 0);
    return evaluate(point) / candidate;
  });
  const decided = constantRatio(ratios, scheme.tolerance, { statistic: scheme.statistic });
  return decided.constant
    ? { matches: true, prefactor: decided.value, spread: decided.maxRelErr }
    : { matches: false, spread: decided.maxRelErr };
}
