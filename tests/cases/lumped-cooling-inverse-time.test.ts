/**
 * case-lumped-cooling: `lumpedRadiatingTemperature` (RK4, one step per 1/100
 * of the local relaxation time) against the inverse-time quadrature
 *   t(T) = ∫_T^{T0} du / rate(u),  rate(u) = (3/(ρca)) [h(u − T∞) + εσ(u⁴ − T∞⁴)],
 * by MathTS `quad` with `atol: 0`, inverted with MathTS `findRoot` on the
 * order-one residual t(T)/t − 1 with `xtol: 0`. The integrand diverges
 * logarithmically at T∞, so the bracket stays above it.
 */
import { findRoot, quad } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { lumpedRadiatingTemperature, SIGMA_SB_SI, type LumpedRadiating } from '../../src/cases/lumped-cooling.js';

/** The oxidized steel ball of the linear-loss failure example: 711.22 K after 60 s. */
const STEEL: LumpedRadiating = { a: 5e-3, rho: 7854, c: 434, h: 10, eps: 0.8, T0: 1000, Tinf: 300, t: 60 };

function temperatureByInverseTime(p: LumpedRadiating, sigma = SIGMA_SB_SI): number {
  const k = 3 / (p.rho * p.c * p.a);
  const rate = (u: number): number => k * (p.h * (u - p.Tinf) + p.eps * sigma * (u ** 4 - p.Tinf ** 4));
  const timeTo = (T: number): number => {
    const { value, error } = quad((u) => 1 / rate(u), T, p.T0, { tol: 1e-12, atol: 0, maxDepth: 60 });
    if (!Number.isFinite(value) || error > 1e-10 * Math.abs(value)) throw new Error(`quad did not converge at T = ${T}`);
    return value;
  };
  // The lower end stays 1 K above T∞ (log divergence there); the upper end is T0, where t = 0.
  return findRoot((T) => timeTo(T) / p.t - 1, p.Tinf + 1, p.T0 * (1 - 1e-12), { tol: 1e-12, xtol: 0, maxIter: 200 });
}

describe('case-lumped-cooling — the radiating sphere by inverse-time quadrature beside RK4', () => {
  it('oxidized steel, 1000 K into 300 K for 60 s: both give 711.22143747 K, within 1e-8 K (measured 3.8e-10 K)', () => {
    const rk4 = lumpedRadiatingTemperature(STEEL);
    const inverse = temperatureByInverseTime(STEEL);
    expect(Math.abs(rk4 - inverse)).toBeLessThan(1e-8);
    expect(inverse).toBeCloseTo(711.22143747, 6);
  });

  it('a warming sphere (T0 below T∞) and a longer cooling agree the same way', () => {
    for (const p of [{ ...STEEL, T0: 250, Tinf: 900, t: 30 }, { ...STEEL, t: 600 }]) {
      // For warming the integral runs from T0 up, so the bracket is mirrored: the integrand's sign flips with it.
      const inverse = p.T0 < p.Tinf ? warmingByInverseTime(p) : temperatureByInverseTime(p);
      expect(Math.abs(lumpedRadiatingTemperature(p) - inverse), `T0 = ${p.T0}, t = ${p.t}`).toBeLessThan(1e-8);
    }
  });

  // A control with the radiative term's SIGN flipped is not usable: the rate then crosses zero near
  // 451.5 K, inside the integration range, so 1/rate has a pole there and the quadrature subdivides
  // without converging (the run never finished in 300 s). A wrong coefficient keeps the rate positive.
  it('control: a doubled radiative coefficient (2σ) moves the inverse-time answer by more than 1 K', () => {
    expect(Math.abs(temperatureByInverseTime(STEEL, 2 * SIGMA_SB_SI) - lumpedRadiatingTemperature(STEEL))).toBeGreaterThan(1);
  });
});

/** The warming case: t(T) = ∫_{T0}^{T} du / (−rate(u)), −rate > 0 below T∞; the bracket stays 1 K below T∞. */
function warmingByInverseTime(p: LumpedRadiating): number {
  const k = 3 / (p.rho * p.c * p.a);
  const rate = (u: number): number => k * (p.h * (u - p.Tinf) + p.eps * SIGMA_SB_SI * (u ** 4 - p.Tinf ** 4));
  const timeTo = (T: number): number => {
    const { value, error } = quad((u) => -1 / rate(u), p.T0, T, { tol: 1e-12, atol: 0, maxDepth: 60 });
    if (!Number.isFinite(value) || error > 1e-10 * Math.abs(value)) throw new Error(`quad did not converge at T = ${T}`);
    return value;
  };
  return findRoot((T) => timeTo(T) / p.t - 1, p.T0 * (1 + 1e-12), p.Tinf - 1, { tol: 1e-12, xtol: 0, maxIter: 200 });
}
