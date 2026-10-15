/**
 * Scalar statistics read from MathTS, typed back as the numbers they are.
 *
 * The typed MathTS functions (`mean`, `std`) are dispatch objects whose
 * declared return is `unknown`; each reader here checks the number it gets
 * for a number array, so a caller never carries an `unknown` into arithmetic.
 *
 * @module numerical/statistics
 */
import { mean, std } from '@danielsimonjr/mathts-functions';

/** MathTS `mean` of a non-empty number array. @throws RangeError on an empty array. @internal */
export function meanOf(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('meanOf: no values');
  const v: unknown = mean([...values]);
  if (typeof v !== 'number') throw new TypeError('mean did not return a number for a number array');
  return v;
}

/**
 * MathTS `std` with the `uncorrected` (population, divide by n) normalization.
 * @throws RangeError on an empty array.
 */
function populationStd(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('populationStd: no values');
  const v: unknown = std([...values], 'uncorrected');
  if (typeof v !== 'number') throw new TypeError('std did not return a number for a number array');
  return v;
}

/** The mean of a set of ratios and their coefficient of variation (population σ over |mean|). @internal */
export interface RatioSpread {
  readonly mean: number;
  /** `σ/|mean|`; `NaN` when the mean is 0 or any ratio is not finite. */
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
