/**
 * case-kepler-rv (audit §14 I20, astrophysical). K and a are checked by hand
 * and by integrating the Newtonian two-body problem numerically (both bodies,
 * no Kepler III used); the GR advance by the independent rate form
 * 3(2π/P)^{5/3}(GM/c³)^{2/3}/(1 − e²), by Mercury's 42.98″/century, and for
 * consistency against the published timing solution of the double pulsar.
 */
import { describe, expect, it } from 'vitest';
import { KEPLER_RV_CASE as C } from '../../src/cases/kepler-rv.js';
import { C_SI, GM_SUN_SI, G_SI } from '../../src/core/constants.js';

const M_SUN = 1.989e30;
const base = { M_star_kg: M_SUN, m_p_kg: 1.898e27, P_s: 4332.59 * 86400, e: 0.0489, sin_i: 1, R_star_m: 6.957e8, T_obs_s: 12 * 365.25 * 86400 };
const run = (i: Partial<typeof base> = {}) => C.run({ ...base, ...i });
const out = (i: Partial<typeof base> = {}) => run(i).outputs as Record<string, number>;
const failed = (i: Partial<typeof base>) => run(i).checks.filter((k) => !k.holds).map((k) => k.id);
/** A mass in kg whose G·m is the IAU nominal GM☉ times `solar`. */
const solarMasses = (solar: number) => (solar * GM_SUN_SI) / G_SI;

/**
 * RK4 on both bodies of a planar Newtonian binary (G M m/r² each way), started
 * at periastron with separation a(1 − e) and the vis-viva relative speed.
 * Returns the period (first return of the relative angle to 2π) and the
 * star's line-of-sight semi-amplitude sin i·(max − min)/2 of v·(cos φ, sin φ).
 */
function integrateBinary(M: number, m: number, a: number, e: number, phi: number, steps: number): { P: number; K: number } {
  const mu = G_SI * (M + m);
  const rp = a * (1 - e);
  const vp = Math.sqrt((mu * (1 + e)) / rp);
  // state: star (x, y, vx, vy), companion (x, y, vx, vy), barycentre at rest at the origin.
  let s = [(-m / (M + m)) * rp, 0, 0, (-m / (M + m)) * vp, (M / (M + m)) * rp, 0, 0, (M / (M + m)) * vp];
  const deriv = (u: number[]) => {
    const dx = u[4]! - u[0]!, dy = u[5]! - u[1]!;
    const r3 = Math.hypot(dx, dy) ** 3;
    return [u[2]!, u[3]!, (G_SI * m * dx) / r3, (G_SI * m * dy) / r3, u[6]!, u[7]!, (-G_SI * M * dx) / r3, (-G_SI * M * dy) / r3];
  };
  const pEstimate = 2 * Math.PI * Math.sqrt(a ** 3 / mu);
  const dt = (1.2 * pEstimate) / steps;
  let vMax = -Infinity, vMin = Infinity;
  let angle = 0, prevRaw = 0, P = NaN;
  for (let n = 0; n < steps && Number.isNaN(P); n++) {
    const k1 = deriv(s);
    const k2 = deriv(s.map((x, j) => x + (dt / 2) * k1[j]!));
    const k3 = deriv(s.map((x, j) => x + (dt / 2) * k2[j]!));
    const k4 = deriv(s.map((x, j) => x + dt * k3[j]!));
    s = s.map((x, j) => x + (dt / 6) * (k1[j]! + 2 * k2[j]! + 2 * k3[j]! + k4[j]!));
    const v = s[2]! * Math.cos(phi) + s[3]! * Math.sin(phi);
    vMax = Math.max(vMax, v);
    vMin = Math.min(vMin, v);
    const raw = Math.atan2(s[5]! - s[1]!, s[4]! - s[0]!);
    let d = raw - prevRaw;
    if (d < -Math.PI) d += 2 * Math.PI;
    const before = angle;
    angle += d;
    prevRaw = raw;
    if (angle >= 2 * Math.PI) P = n * dt + ((2 * Math.PI - before) / (angle - before)) * dt;
  }
  return { P, K: (vMax - vMin) / 2 };
}

describe('case-kepler-rv — K and a', () => {
  it('the Sun and Jupiter, edge-on: K = (2πG/P)^{1/3} m_p/M^{2/3}/√(1 − e²) ≈ 12.48 m/s by hand', () => {
    const hand = Math.cbrt((2 * Math.PI * G_SI) / base.P_s) * 1.898e27 / Math.cbrt(M_SUN ** 2) / Math.sqrt(1 - 0.0489 ** 2);
    expect(out().K_m_per_s).toBeCloseTo(hand, 12);
    expect(out().K_m_per_s).toBeCloseTo(12.48, 2);
  });

  it('K/K_2b − 1 is exactly (1 + q)^{2/3} − 1, and K scales with sin i', () => {
    for (const m of [1e27, 1e29, 1e30]) {
      const o = out({ m_p_kg: m });
      expect(o.two_body_deviation).toBeCloseTo((1 + m / M_SUN) ** (2 / 3) - 1, 12);
    }
    expect(out({ sin_i: 0.5 }).K_m_per_s / out().K_m_per_s).toBeCloseTo(0.5, 14);
  });

  it('numerical two-body integration (q = 0.3, e = 0.6; both bodies, no Kepler III): P, a and K_2b agree to 1e-6, and the test-mass K is 19% high', () => {
    const M = M_SUN, m = 0.3 * M_SUN, a = 1.495978707e11, e = 0.6;
    for (const phi of [0.3, 2.0]) {
      const num = integrateBinary(M, m, a, e, phi, 400000);
      const o = out({ M_star_kg: M, m_p_kg: m, P_s: num.P, e, sin_i: 1, R_star_m: 7e8 });
      expect(Math.abs(o.a_m / a - 1), `φ ${phi}`).toBeLessThan(1e-6);
      expect(Math.abs(o.K_two_body_m_per_s / num.K - 1), `φ ${phi}`).toBeLessThan(1e-6);
      expect(o.K_m_per_s / num.K - 1).toBeCloseTo(1.3 ** (2 / 3) - 1, 5);
    }
  });

  it('control: the integration tells the two-body K from the test-mass K at q = 0.3 (they differ by 19%, the check by 1e-6)', () => {
    const num = integrateBinary(M_SUN, 0.3 * M_SUN, 1.495978707e11, 0.6, 0.3, 400000);
    const o = out({ m_p_kg: 0.3 * M_SUN, P_s: num.P, e: 0.6 });
    expect(Math.abs(o.K_m_per_s / num.K - 1)).toBeGreaterThan(0.1);
  });
});

describe('case-kepler-rv — the GR apsidal advance', () => {
  it('equals the rate form 3(2π/P)^{5/3}(G M_tot/c³)^{2/3}/(1 − e²) (Robertson 1938; Taylor & Weisberg 1982)', () => {
    for (const i of [{}, { M_star_kg: 1.3381 * M_SUN, m_p_kg: 1.2489 * M_SUN, P_s: 0.10225156248 * 86400, e: 0.0877775 }]) {
      const p = { ...base, ...i };
      const rate = (3 * ((2 * Math.PI) / p.P_s) ** (5 / 3) * ((G_SI * (p.M_star_kg + p.m_p_kg)) / C_SI ** 3) ** (2 / 3)) / (1 - p.e ** 2);
      const degPerYr = (rate * 365.25 * 86400 * 180) / Math.PI;
      expect(Math.abs(out(i).omega_dot_deg_per_yr / degPerYr - 1)).toBeLessThan(1e-12);
    }
  });

  it("Mercury about the Sun (GM☉ nominal): 42.98″ per Julian century", () => {
    const o = out({ M_star_kg: solarMasses(1), m_p_kg: 3.3011e23, P_s: 87.9691 * 86400, e: 0.20563, R_star_m: 6.957e8 });
    expect(o.omega_dot_deg_per_yr * 3600 * 100).toBeCloseTo(42.98, 1);
  });

  it('double pulsar J0737−3039A/B: ω̇ = 16.8995°/yr and K_A = 2πc x_A/(P√(1 − e²)) with x_A = 1.415032 lt-s (Kramer et al. 2006), to 1e-4 and 5e-4', () => {
    // Consistency, not an independent test: the published masses were fitted assuming GR's ω̇ and this mass function.
    // They are given to ±0.0007 M☉, which alone moves K_A by ≈ 5e-4.
    const o = out({ M_star_kg: solarMasses(1.3381), m_p_kg: solarMasses(1.2489), P_s: 0.10225156248 * 86400, e: 0.0877775, sin_i: 0.99974, R_star_m: 1.2e4, T_obs_s: 365.25 * 86400 });
    expect(Math.abs(o.omega_dot_deg_per_yr / 16.89947 - 1)).toBeLessThan(1e-4);
    const kA = (2 * Math.PI * C_SI * 1.415032) / (0.10225156248 * 86400 * Math.sqrt(1 - 0.0877775 ** 2));
    expect(Math.abs(o.K_two_body_m_per_s / kA - 1)).toBeLessThan(5e-4);
    expect(o.K_m_per_s / kA - 1).toBeGreaterThan(0.5);
  });
});

describe('case-kepler-rv — regime checks', () => {
  it('the test-mass threshold at q = 0.01', () => {
    expect(failed({ m_p_kg: 0.01 * M_SUN * 0.999 })).toEqual([]);
    expect(failed({ m_p_kg: 0.01 * M_SUN * 1.001 })).toEqual(['test-mass']);
    expect(out({ m_p_kg: 0.01 * M_SUN }).two_body_deviation).toBeLessThan(0.0067);
  });

  it('point-mass: R_* against the periastron a(1 − e), not a', () => {
    const a = out().a_m;
    expect(failed({ R_star_m: 0.1 * a * (1 - 0.0489) * 0.999 })).toEqual([]);
    expect(failed({ R_star_m: 0.1 * a * (1 - 0.0489) * 1.001 })).toEqual(['point-mass']);
  });

  it('weak-field fails for a close orbit about a compact star (a planet at ~1500 km from a neutron star)', () => {
    const i = { M_star_kg: 1.4 * M_SUN, m_p_kg: 1e25, P_s: 1, e: 0, R_star_m: 1.2e4 };
    expect(out(i).weak_field).toBeCloseTo((G_SI * (1.4 * M_SUN + 1e25)) / (C_SI ** 2 * out(i).a_m), 15);
    expect(failed(i)).toEqual(['weak-field']);
  });

  it('apsidal: zero on a circular orbit whatever the baseline; otherwise linear in T_obs', () => {
    expect(out({ e: 0, T_obs_s: 1e12 }).apsidal_misfit).toBe(0);
    expect(out({ T_obs_s: 2 * base.T_obs_s }).apsidal_misfit / out().apsidal_misfit).toBeCloseTo(2, 12);
  });

  it('refuses e outside [0, 1), sin i outside (0, 1] and a non-positive mass', () => {
    expect(() => run({ e: 1 })).toThrow(/e must be in/);
    expect(() => run({ e: -0.1 })).toThrow(/e must be in/);
    expect(() => run({ sin_i: 1.01 })).toThrow(/sin_i must be/);
    expect(() => run({ sin_i: 0 })).toThrow(/sin_i must be/);
    expect(() => run({ m_p_kg: 0 })).toThrow(/m_p_kg must be/);
  });
});
