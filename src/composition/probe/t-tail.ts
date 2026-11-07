/**
 * The two-sided tail of Student's t, computed directly.
 *
 * MathTS `linearRegression.pValue` and `ols.pValues` are `2·(1 − studentTCDF)`
 * and round a far tail to 0 (TOOLS.md), so a probe never consumes them. The
 * tail here is `2·studentTCDF(−|t|, ν)`: the CDF at the negative point is the
 * lower tail itself, so it resolves where `1 − CDF` cannot.
 *
 * @internal
 */

import { studentTCDF } from '@danielsimonjr/mathts-functions';
import { numberFrom } from '../../core/mathts-read.js';

/**
 * P(|T_ν| ≥ |t|) for Student's t with ν degrees of freedom: `2·studentTCDF(−|t|, ν)`.
 * `t = 0` is 1, an infinite `t` is 0. @throws RangeError when ν is not positive. @internal
 */
export function studentTwoSidedP(t: number, df: number): number {
  if (!(df > 0)) throw new RangeError('studentTwoSidedP: degrees of freedom must be positive');
  if (Number.isNaN(t)) throw new RangeError('studentTwoSidedP: t is NaN');
  if (t === 0) return 1;
  if (!Number.isFinite(t)) return 0;
  const lower = numberFrom('studentTCDF', studentTCDF(-Math.abs(t), df));
  return Math.min(1, Math.max(0, 2 * lower));
}
