/**
 * The single-leg Shapiro delay with an impact parameter, by quadrature: the
 * coordinate-time excess of a Schwarzschild null geodesic over its flat leg,
 *
 *   Δt = (1/c) ∫_{R_near}^{R_far} [ 1/(f √(1 − b² f/r²)) − 1/√(1 − b²/r²) ] dr,  f = 1 − r_s/r,
 *
 * written as `(s0 − f s1)/(f s1 s0)` so that the integrand does not cancel,
 * and integrated by MathTS `quad` with no absolute floor. It throws when the
 * quadrature error is above 1e-7 of the value.
 */
import { quad } from '@danielsimonjr/mathts-functions';
import { C_SI, G_SI } from '../../src/core/constants.js';

export function quadratureDelay(M: number, b: number, rFar: number, rNear: number): number {
  const rs = (2 * G_SI * M) / (C_SI * C_SI);
  const g = (r: number): number => {
    const f = 1 - rs / r;
    const s0 = Math.sqrt(1 - (b * b) / (r * r));
    const s1 = Math.sqrt(1 - (b * b * f) / (r * r));
    return (s0 - f * s1) / (f * s1 * s0);
  };
  const { value, error } = quad(g, rNear, rFar, { tol: 1e-10, atol: 0, maxDepth: 24 });
  if (!(error < 1e-7 * Math.abs(value))) throw new Error(`quadrature error ${error} is above 1e-7 of ${value}`);
  return value / C_SI;
}
