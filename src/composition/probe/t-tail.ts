/**
 * The two-sided tail of Student's t, computed directly.
 *
 * MathTS `linearRegression.pValue` and `ols.pValues` are `2·(1 − studentTCDF)`
 * and round a far tail to 0 (TOOLS.md), so a probe never consumes them. The
 * tail here is the regularized incomplete beta `I_{ν/(ν+t²)}(ν/2, 1/2)`, MathTS
 * `betainc`, which is the two-sided probability itself and resolves where
 * `1 − CDF` cannot.
 *
 * @internal
 */

import { betainc } from '@danielsimonjr/mathts-functions';

/**
 * P(|T_ν| ≥ |t|) for Student's t with ν degrees of freedom: `I_{ν/(ν+t²)}(ν/2, 1/2)`.
 * `t = 0` is 1, an infinite `t` is 0. @throws RangeError when ν is not positive. @internal
 */
export function studentTwoSidedP(t: number, df: number): number {
  if (!(df > 0)) throw new RangeError('studentTwoSidedP: degrees of freedom must be positive');
  if (Number.isNaN(t)) throw new RangeError('studentTwoSidedP: t is NaN');
  if (t === 0) return 1;
  if (!Number.isFinite(t)) return 0;
  const x = df / (df + t * t);
  const v: unknown = betainc(df / 2, 0.5, x);
  if (typeof v !== 'number') throw new TypeError('betainc did not return a number for number arguments');
  return Math.min(1, Math.max(0, v));
}
