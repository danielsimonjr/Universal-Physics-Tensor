/**
 * case-lumped-cooling (audit §14 I20, thermodynamic). τ and T(t) are checked
 * by hand; the eigenvalues against the exact roots at Bi_a = 1 and Incropera
 * Table 5.1; the series solution against an independent finite-volume
 * integration of the sphere's heat equation; the radiation bound against the
 * lumped equation integrated with the T⁴ loss kept.
 */
import { describe, expect, it } from 'vitest';
import { LUMPED_COOLING_CASE as C, SIGMA_SB_SI, sphereEigenvalues, sphereSeries } from '../../src/cases/lumped-cooling.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';

const base = {
  a_m: 5e-3, rho_kg_per_m3: 8933, c_J_per_kg_K: 385, k_W_per_m_K: 401, h_W_per_m2_K: 20,
  emissivity: 0.05, T0_K: 373.15, T_inf_K: 293.15, t_s: 300,
};
const run = (i: Partial<typeof base> = {}) => C.run({ ...base, ...i });
const out = (i: Partial<typeof base> = {}) => run(i).outputs as Record<string, number>;
const failed = (i: Partial<typeof base>) => run(i).checks.filter((k) => !k.holds).map((k) => k.id);

/**
 * Finite volumes on ρc ∂T/∂t = k ∇²T in a sphere of radius 1 (k = ρc = 1, so
 * t is Fo), N shells, Crank–Nicolson; the surface cell loses h(T_s − 0) through
 * a half-cell conduction resistance. Starts at θ = 1; returns the volume mean,
 * the centre (quadratic extrapolation of the first cells) and the surface.
 */
function finiteVolumeSphere(bi: number, fo: number, N = 400, steps = 4000): { mean: number; centre: number; surface: number } {
  const dr = 1 / N;
  const vol = Array.from({ length: N }, (_, j) => ((j + 1) ** 3 - j ** 3) * dr ** 3 / 3);
  const face = Array.from({ length: N + 1 }, (_, j) => (j * dr) ** 2);
  const surfG = 1 / (dr / 2 / face[N]! + 1 / (bi * face[N]!));
  const dt = fo / steps;
  let T = new Array<number>(N).fill(1);
  // A T = Σ conductances; CN: (V/dt − A/2) T' = (V/dt + A/2) T.
  const lower = new Array<number>(N).fill(0), upper = new Array<number>(N).fill(0), diag = new Array<number>(N).fill(0);
  for (let j = 0; j < N; j++) {
    const gL = j === 0 ? 0 : face[j]! / dr;
    const gR = j === N - 1 ? surfG : face[j + 1]! / dr;
    lower[j] = gL;
    upper[j] = j === N - 1 ? 0 : gR;
    diag[j] = -(gL + gR);
  }
  const cp = new Array<number>(N).fill(0), dp = new Array<number>(N).fill(0);
  for (let n = 0; n < steps; n++) {
    const rhs = T.map((x, j) => (vol[j]! / dt) * x + 0.5 * (diag[j]! * x + (j > 0 ? lower[j]! * T[j - 1]! : 0) + (j < N - 1 ? upper[j]! * T[j + 1]! : 0)));
    for (let j = 0; j < N; j++) {
      const a = j > 0 ? -0.5 * lower[j]! : 0;
      const b = vol[j]! / dt - 0.5 * diag[j]!;
      const c = j < N - 1 ? -0.5 * upper[j]! : 0;
      const denom = b - (j > 0 ? a * cp[j - 1]! : 0);
      cp[j] = c / denom;
      dp[j] = (rhs[j]! - (j > 0 ? a * dp[j - 1]! : 0)) / denom;
    }
    const next = new Array<number>(N).fill(0);
    for (let j = N - 1; j >= 0; j--) next[j] = dp[j]! - (j < N - 1 ? cp[j]! * next[j + 1]! : 0);
    T = next;
  }
  const mean = T.reduce((s, x, j) => s + x * vol[j]!, 0) / (1 / 3);
  // Cell centres at (j + ½)dr; T is even in r, so fit T0 + c r² through the first two cells.
  const r0 = 0.5 * dr, r1 = 1.5 * dr;
  const centre = T[0]! - ((T[1]! - T[0]!) / (r1 * r1 - r0 * r0)) * r0 * r0;
  const surface = (T[N - 1]! * (face[N]! / (dr / 2))) / (face[N]! / (dr / 2) + bi * face[N]!);
  return { mean, centre, surface };
}

describe('case-lumped-cooling — τ and T(t)', () => {
  it('copper ball, a = 5 mm, h = 20: τ = ρca/(3h) = 286.6 s by hand, T(300 s) = T∞ + 80 K e^{−300/τ}', () => {
    const tau = (8933 * 385 * 5e-3) / (3 * 20);
    expect(out().tau_s).toBeCloseTo(tau, 10);
    expect(tau).toBeCloseTo(286.6, 1);
    expect(out().T_K).toBeCloseTo(293.15 + 80 * Math.exp(-300 / tau), 10);
  });

  it('τ = ρcV/(hA) from the volume and area, not from a/3 (a second route to the same number)', () => {
    const V = (4 / 3) * Math.PI * 5e-3 ** 3;
    const A = 4 * Math.PI * 5e-3 ** 2;
    expect(out().tau_s / ((8933 * 385 * V) / (20 * A)) - 1).toBeCloseTo(0, 14);
    expect(out().Bi / ((20 * (V / A)) / 401) - 1).toBeCloseTo(0, 14);
  });

  it('Q = ρcV(T0 − T(t)) by energy balance; negative when the sphere warms', () => {
    const V = (4 / 3) * Math.PI * 5e-3 ** 3;
    expect(out().Q_J).toBeCloseTo(8933 * 385 * V * (373.15 - out().T_K), 9);
    expect(out({ T0_K: 280 }).Q_J).toBeLessThan(0);
  });

  it('a diameter is converted to the radius', () => {
    const args = ['diameter_m=1cm', 'rho_kg_per_m3=8933', 'c_J_per_kg_K=385', 'k_W_per_m_K=401', 'h_W_per_m2_K=20', 'emissivity=0.05', 'T0_K=100degC', 'T_inf_K=20degC', 't_s=300'];
    const o = C.run(resolveEvaluatorInputs(C.parameters, args).inputs).outputs as Record<string, number>;
    expect(o.tau_s).toBeCloseTo(out().tau_s, 10);
    expect(o.T_K).toBeCloseTo(out().T_K, 10);
  });
});

describe('case-lumped-cooling — the parent series', () => {
  it('eigenvalues: exactly (n − ½)π at Bi_a = 1, and Incropera Table 5.1 at Bi_a = 0.1 and 10', () => {
    sphereEigenvalues(1, 6).forEach((z, n) => expect(Math.abs(z / ((n + 0.5) * Math.PI) - 1)).toBeLessThan(1e-14));
    const c1 = (z: number) => (4 * (Math.sin(z) - z * Math.cos(z))) / (2 * z - Math.sin(2 * z));
    const [z01] = sphereEigenvalues(0.1, 1);
    expect(z01).toBeCloseTo(0.5423, 4);
    expect(c1(z01!)).toBeCloseTo(1.0298, 4);
    const [z10] = sphereEigenvalues(10, 1);
    expect(z10).toBeCloseTo(2.8363, 4);
    expect(c1(z10!)).toBeCloseTo(1.9249, 4);
  });

  it('every root solves 1 − ζ cot ζ = Bi_a and lies in its own interval', () => {
    for (const bi of [1e-4, 0.3, 5, 100]) {
      sphereEigenvalues(bi, 50).forEach((z, n) => {
        expect(Math.abs(1 - z / Math.tan(z) - bi), `Bi ${bi} n ${n}`).toBeLessThan(1e-8 * (1 + bi + z));
        expect(z > n * Math.PI && z < (n + 1) * Math.PI).toBe(true);
      });
    }
  });

  // Bi_a = 1 alone would hide an error in C_n's sin 2ζ term: there ζ_n = (n − ½)π and sin 2ζ_n = 0.
  it('series = an independent finite-volume integration of the heat equation (Bi_a = 0.3, 1, 5; Fo = 0.02, 0.2, 1): mean, centre, surface to 1e-5', () => {
    for (const bi of [0.3, 1, 5]) {
      for (const fo of [0.02, 0.2, 1]) {
        const s = sphereSeries(bi, fo);
        const fv = finiteVolumeSphere(bi, fo);
        expect(Math.abs(s.mean - fv.mean), `mean Bi ${bi} Fo ${fo}`).toBeLessThan(1e-5);
        expect(Math.abs(s.centre - fv.centre), `centre Bi ${bi} Fo ${fo}`).toBeLessThan(1e-5);
        expect(Math.abs(s.surface - fv.surface), `surface Bi ${bi} Fo ${fo}`).toBeLessThan(1e-5);
      }
    }
  });

  it('control: the finite-volume solution tells a wrong series apart (Bi_a = 3 against Bi_a = 1 differs by ≫ 1e-5)', () => {
    expect(Math.abs(sphereSeries(3, 0.2).mean - finiteVolumeSphere(1, 0.2).mean)).toBeGreaterThan(0.05);
  });

  it('θ = 1 at t = 0; a Fo too small for the series is refused', () => {
    expect(sphereSeries(0.5, 0)).toEqual({ mean: 1, centre: 1, surface: 1 });
    expect(() => sphereSeries(0.5, 1e-12)).toThrow(/too small for the series/);
  });

  it('the lumped limit: parent_deviation → 0 in proportion to Bi (at t = τ)', () => {
    const dev = (bi: number) => {
      const h = (bi * 3 * 401) / 5e-3;
      const tau = (8933 * 385 * 5e-3) / (3 * h);
      return out({ h_W_per_m2_K: h, t_s: tau, emissivity: 0 }).parent_deviation;
    };
    expect(dev(0.001) / dev(0.002)).toBeCloseTo(0.5, 2);
    expect(Math.abs(dev(1e-4))).toBeLessThan(1e-4);
  });

  it('negative result: Bi ≤ 0.1 does not bound the relative error at late times — at Bi = 0.1 it is −5.5% at t = τ and −16% at t = 3τ', () => {
    const h = (0.1 * 3 * 401) / 5e-3;
    const tau = (8933 * 385 * 5e-3) / (3 * h);
    const at = (x: number) => out({ h_W_per_m2_K: h, t_s: x * tau, emissivity: 0 }).parent_deviation;
    expect(at(1)).toBeCloseTo(-0.0549, 3);
    expect(at(3)).toBeCloseTo(-0.158, 2);
    expect(failed({ h_W_per_m2_K: h, t_s: 3 * tau, emissivity: 0 })).toEqual([]);
  });
});

describe('case-lumped-cooling — regime checks', () => {
  it('Bi threshold at 0.1, with L_c = a/3', () => {
    const h = (0.1 * 3 * 401) / 5e-3;
    expect(failed({ h_W_per_m2_K: h * 0.999, emissivity: 0 })).toEqual([]);
    expect(failed({ h_W_per_m2_K: h * 1.001, emissivity: 0 })).toEqual(['lumped']);
  });

  it('σ_SB from the exact constants is CODATA 2018 5.670374419e-8; h_rad by hand at the hotter end', () => {
    expect(Math.abs(SIGMA_SB_SI / 5.670374419e-8 - 1)).toBeLessThan(1e-9);
    const hr = 0.05 * SIGMA_SB_SI * (373.15 + 293.15) * (373.15 ** 2 + 293.15 ** 2);
    expect(out().h_rad_max_W_per_m2_K).toBeCloseTo(hr, 12);
    expect(out({ T0_K: 250 }).h_rad_max_W_per_m2_K).toBeCloseTo(0.05 * SIGMA_SB_SI * (2 * 293.15) * (2 * 293.15 ** 2), 12);
  });

  it('what the linear-loss check bounds: integrating the lumped equation WITH the T⁴ loss moves T(t) by ≈ h_rad/h of the decay', () => {
    // RK4 on ρcV dT/dt = −A[h(T − T∞) + εσ(T⁴ − T∞⁴)].
    const lumpedWithRadiation = (i: typeof base) => {
      const k = (3 / (i.rho_kg_per_m3 * i.c_J_per_kg_K * i.a_m));
      const f = (T: number) => -k * (i.h_W_per_m2_K * (T - i.T_inf_K) + i.emissivity * SIGMA_SB_SI * (T ** 4 - i.T_inf_K ** 4));
      let T = i.T0_K;
      const n = 20000, dt = i.t_s / n;
      for (let s = 0; s < n; s++) {
        const k1 = f(T), k2 = f(T + (dt / 2) * k1), k3 = f(T + (dt / 2) * k2), k4 = f(T + dt * k3);
        T += (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      }
      return T;
    };
    // Valid example: h_rad/h ≈ 0.021, and the radiating θ is within 2.2% of the Newton θ.
    const thetaRad = (lumpedWithRadiation(base) - 293.15) / 80;
    expect(Math.abs(thetaRad / out().theta - 1)).toBeLessThan(0.022);
    expect(Math.abs(thetaRad / out().theta - 1)).toBeGreaterThan(0.005);
    // Failure example: radiation dominates, and the Newton T(t) is far off.
    const hot = { ...base, a_m: 5e-3, rho_kg_per_m3: 7854, c_J_per_kg_K: 434, k_W_per_m_K: 60.5, h_W_per_m2_K: 10, emissivity: 0.8, T0_K: 1000, T_inf_K: 300, t_s: 60 };
    const newton = (C.run(hot).outputs as Record<string, number>).T_K;
    expect(newton - lumpedWithRadiation(hot)).toBeGreaterThan(100);
    expect(C.run(hot).checks.filter((k) => !k.holds).map((k) => k.id)).toEqual(['linear-loss']);
  });

  it('with ε = 0 the linear-loss check holds whatever the temperatures', () => {
    expect(failed({ emissivity: 0, T0_K: 3000 })).toEqual([]);
  });

  it('refuses an emissivity outside [0, 1], a negative time and a non-positive radius', () => {
    expect(() => run({ emissivity: 1.2 })).toThrow(/emissivity must be/);
    expect(() => run({ t_s: -1 })).toThrow(/t_s must be/);
    expect(() => run({ a_m: 0 })).toThrow(/a_m must be/);
  });
});
