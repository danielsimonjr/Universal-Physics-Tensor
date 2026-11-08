/**
 * The two-sided tail of Student's t, computed directly.
 *
 * MathTS `linearRegression.pValue` and `ols.pValues` are `2·(1 − studentTCDF)`
 * and round a far tail to 0 (TOOLS.md), so a probe never consumes them. The
 * tail here is MathTS `studentTTwoSidedP`, which computes the tail directly
 * and so resolves where `1 − CDF` cannot. The guards stay in UPT: MathTS gives
 * NaN for a bad ν, and a probe must refuse that input.
 *
 * @internal
 */

import { studentTTwoSidedP } from '@danielsimonjr/mathts-functions';
import { numberFrom } from '../../core/mathts-read.js';

/**
 * P(|T_ν| ≥ |t|) for Student's t with ν degrees of freedom, MathTS `studentTTwoSidedP`.
 * `t = 0` is 1, an infinite `t` is 0. @throws RangeError when ν is not positive or t is NaN. @internal
 */
export function studentTwoSidedP(t: number, df: number): number {
  if (!(df > 0)) throw new RangeError('studentTwoSidedP: degrees of freedom must be positive');
  if (Number.isNaN(t)) throw new RangeError('studentTwoSidedP: t is NaN');
  return numberFrom('studentTTwoSidedP', studentTTwoSidedP(t, df));
}
