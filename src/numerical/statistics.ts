/**
 * Scalar statistics read from MathTS, typed back as the numbers they are.
 *
 * The typed MathTS functions (`mean`, `std`, `lgamma`) are dispatch objects
 * whose declared return is `unknown`; each reader here takes its number
 * through `core/mathts-read`, so a caller never carries an `unknown` into
 * arithmetic.
 *
 * @module numerical/statistics
 */
import { lgamma, mean, std } from '@danielsimonjr/mathts-functions';
import { numberFrom } from '../core/mathts-read.js';

/** MathTS `mean` of a non-empty number array. @throws RangeError on an empty array. @internal */
export function meanOf(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('meanOf: no values');
  return numberFrom('mean', mean([...values]));
}

/**
 * MathTS `std` with the `uncorrected` (population, divide by n) normalization.
 * @throws RangeError on an empty array.
 */
function populationStd(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('populationStd: no values');
  return numberFrom('std', std([...values], 'uncorrected'));
}

/** `log Γ(z)`, MathTS `lgamma`, read back as the number it is for a number. */
function logGamma(z: number): number {
  return numberFrom('lgamma', lgamma(z));
}

/**
 * `ln C(n, k) = ln Γ(n+1) − ln Γ(k+1) − ln Γ(n−k+1)`, through MathTS `lgamma`.
 * The one owner of the log binomial coefficient: the lattice random walk and
 * the McNemar tail both read it (`TOOLS.md`, how `lgamma` compares to a sum
 * of logs at large n).
 * @internal
 */
export function logChoose(n: number, k: number): number {
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/** The mean of a set of ratios and their coefficient of variation (population σ over |mean|). @internal */
export interface RatioSpread {
  readonly mean: number;
  /** `σ/|mean|`; `Infinity` when the mean is 0 and the ratios are not all 0, `NaN` when they are all 0 or any ratio is not finite. */
  readonly cv: number;
}

/**
 * How far a set of ratios is from one constant: the mean and `σ/|mean|`. A
 * monomial fit is accepted when the ratios of a formula to the candidate
 * monomial agree to a relative spread below the caller's threshold.
 * @internal
 */
export function ratioSpread(ratios: readonly number[]): RatioSpread {
  const m = meanOf(ratios);
  return { mean: m, cv: populationStd(ratios) / Math.abs(m) };
}
