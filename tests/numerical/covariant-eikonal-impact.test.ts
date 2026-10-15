/**
 * The eikonal Shapiro delay with a NON-ZERO impact parameter, against an
 * independent reference: the coordinate-time excess of a Schwarzschild null
 * geodesic over its flat-space leg is the quadrature
 *
 *   Δt = (1/c) ∫_{R_near}^{R_far} [ 1/(f √(1 − b² f/r²)) − 1/√(1 − b²/r²) ] dr,  f = 1 − r_s/r,
 *
 * written as `(s0 − f s1)/(f s1 s0)` so the integrand does not cancel, and
 * integrated by MathTS `quad` with no absolute floor. The GL4 integrator is a
 * second method only if its crossing of `R_near` is located to the same order
 * as its steps: a straight line between two snapshots (O(h²) in the crossing)
 * was 25 % high at b = 5e10 m and 182 % high at b = 1e11 m, an excess that did
 * not depend on the mass, which is the signature of the crossing error.
 */
import { quad } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { C_SI, G_SI } from '../../src/core/constants.js';
import { evaluateCovariantEikonalNumerical } from '../../src/numerical/covariant-eikonal.js';

const M_SUN = 1.989e30;
const R_FAR = 2.279e11; // Mars–Sun
const R_NEAR = 1.496e11; // Earth–Sun

function quadratureDelay(M: number, b: number, rFar: number, rNear: number): number {
  const rs = (2 * G_SI * M) / (C_SI * C_SI);
  const g = (r: number): number => {
    const f = 1 - rs / r;
    const s0 = Math.sqrt(1 - (b * b) / (r * r));
    const s1 = Math.sqrt(1 - (b * b * f) / (r * r));
    return (s0 - f * s1) / (f * s1 * s0);
  };
  const { value, error } = quad(g, rNear, rFar, { tol: 1e-10, atol: 0, maxDepth: 24 });
  expect(error).toBeLessThan(1e-7 * Math.abs(value));
  return value / C_SI;
}

describe('eikonal Shapiro delay with an impact parameter', () => {
  it('at b = 0 the quadrature reproduces the closed form, and GL4 agrees with both', async () => {
    const rs = (2 * G_SI * M_SUN) / (C_SI * C_SI);
    const closed = (rs / C_SI) * Math.log((R_FAR - rs) / (R_NEAR - rs));
    const ref = quadratureDelay(M_SUN, 0, R_FAR, R_NEAR);
    expect(Math.abs(ref / closed - 1)).toBeLessThan(1e-8);
    const gl4 = await evaluateCovariantEikonalNumerical({ M_kg: M_SUN, R_far_m: R_FAR, R_near_m: R_NEAR, b_m: 0, steps: 2048 });
    expect(Math.abs(gl4.shapiroDelaySec / ref - 1)).toBeLessThan(1e-6);
  });

  it('at b = 5e10 m and 1e11 m the GL4 delay agrees with the quadrature to 1e-4 at 2048 steps', async () => {
    for (const b of [5e10, 1e11]) {
      const ref = quadratureDelay(M_SUN, b, R_FAR, R_NEAR);
      const gl4 = await evaluateCovariantEikonalNumerical({ M_kg: M_SUN, R_far_m: R_FAR, R_near_m: R_NEAR, b_m: b, steps: 2048 });
      expect(Math.abs(gl4.shapiroDelaySec / ref - 1), `b = ${b}`).toBeLessThan(1e-4);
    }
  });

  it('the crossing error, not the mass, was the excess: the delay scales with M', async () => {
    const b = 5e10;
    const heavy = await evaluateCovariantEikonalNumerical({ M_kg: M_SUN, R_far_m: R_FAR, R_near_m: R_NEAR, b_m: b, steps: 2048 });
    const light = await evaluateCovariantEikonalNumerical({ M_kg: M_SUN / 10, R_far_m: R_FAR, R_near_m: R_NEAR, b_m: b, steps: 2048 });
    expect(Math.abs(heavy.shapiroDelaySec / light.shapiroDelaySec / 10 - 1)).toBeLessThan(1e-3);
  });
});
