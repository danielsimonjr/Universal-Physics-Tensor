/**
 * case-brownian-sphere (audit §14 I20b). The audit's numbers (§5.2) are the
 * reference: T = 293.15 K, η = 1e-3 Pa·s, radius 1 µm → D = 2.1471978227748074e-13
 * m²/s; radius 0.5 µm (a 1 µm diameter) → 4.294395645549615e-13. Each value is
 * checked by a second route: hand arithmetic from the exact k_B, the canonical
 * entry's own expression tree, the atlas witness WD5, force balance, and the
 * Ornstein–Uhlenbeck mean-square displacement.
 */
import { describe, expect, it } from 'vitest';
import {
  BROWNIAN_SPHERE_CASE as C,
  ballisticDeficit,
  brennerPerpendicular,
  faxenParallel,
  hydrodynamicMsdRatio,
} from '../../src/cases/brownian-sphere.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { canonicalById } from '../../src/canonical/registry.js';
import { evalExpr } from '../../src/composition/expr-eval.js';

const K_B = 1.380649e-23;
const base = { T_K: 293.15, eta_Pa_s: 1e-3, a_m: 1e-6, rho_p_kg_per_m3: 2000, rho_f_kg_per_m3: 998, t_s: 1, d: 2 };
const run = (i: Partial<typeof base> = {}) => C.run({ ...base, ...i });
const out = (i: Partial<typeof base> = {}) => run(i).outputs as Record<string, number>;
const failed = (i: Partial<typeof base>) => run(i).checks.filter((k) => !k.holds).map((k) => k.id);
const fromArgs = (args: string[]) => C.run(resolveEvaluatorInputs(C.parameters, args).inputs).outputs as Record<string, number>;

describe('case-brownian-sphere — D and the MSD', () => {
  it('radius 1 µm at 293.15 K in η = 1e-3 Pa·s: D = 2.1471978227748074e-13 m²/s (audit §5.2), = k_BT/(6πηa) by hand', () => {
    const hand = (K_B * 293.15) / (6 * Math.PI * 1e-3 * 1e-6);
    expect(Math.abs(out().D_m2_per_s / hand - 1)).toBeLessThan(1e-15);
    expect(Math.abs(out().D_m2_per_s / 2.1471978227748074e-13 - 1)).toBeLessThan(1e-15);
  });

  it('a 2 µm diameter is the 1 µm radius; a 1 µm diameter gives the audit\'s 4.294395645549615e-13', () => {
    const viaDiameter = fromArgs(['T_K=293.15', 'eta_Pa_s=1e-3', 'diameter_m=2um', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1', 'd=2']);
    expect(viaDiameter.D_m2_per_s).toBeCloseTo(out().D_m2_per_s, 25);
    const oneMicronDiameter = fromArgs(['T_K=20degC', 'eta_Pa_s=1mPa*s', 'diameter_m=1um', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1', 'd=2']);
    expect(Math.abs(oneMicronDiameter.D_m2_per_s / 4.294395645549615e-13 - 1)).toBeLessThan(1e-12);
  });

  it('control: a diameter is not read as a radius (that would halve D)', () => {
    const d = fromArgs(['T_K=293.15', 'eta_Pa_s=1e-3', 'diameter_m=1um', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1', 'd=2']);
    expect(d.D_m2_per_s).not.toBeCloseTo(out().D_m2_per_s, 16);
    expect(d.D_m2_per_s / out().D_m2_per_s).toBeCloseTo(2, 12);
  });

  it('agrees with the atlas witness WD5 (radius 0.5 µm, η = 1.0016e-3 Pa·s → 4.2873e-13 m²/s)', () => {
    expect(out({ a_m: 0.5e-6, eta_Pa_s: 1.0016e-3 }).D_m2_per_s).toBeCloseTo(4.2873e-13, 16);
  });

  it('is CE-stokes-einstein divided by exactly the 6π that entry omits by design', () => {
    const ce = canonicalById('CE-stokes-einstein')!;
    expect(ce.epistemicStatus).toBe('scalar-up-to-constant');
    const upToConstant = evalExpr(ce.scalarAst!, {
      'boltzmann-constant': K_B,
      temperature: 293.15,
      'dynamic-viscosity': 1e-3,
      'particle-radius': 1e-6,
    });
    expect(Math.abs((out().D_m2_per_s * 6 * Math.PI) / upToConstant - 1)).toBeLessThan(1e-12);
  });

  it('MSD = 2 d D t per tracked axis count', () => {
    for (const d of [1, 2, 3]) expect(out({ d, t_s: 3 }).MSD_m2).toBeCloseTo(2 * d * out().D_m2_per_s * 3, 25);
    expect(out().rms_displacement_m).toBeCloseTo(Math.sqrt(4 * out().D_m2_per_s), 18);
  });
});

describe('case-brownian-sphere — the Langevin parent', () => {
  /** RK4 on the Langevin moment equations per axis: ⟨x²⟩′ = 2⟨xv⟩, ⟨xv⟩′ = k_BT/m − (γ/m)⟨xv⟩, from rest in x. */
  function momentMsd(kT: number, m: number, gamma: number, t: number, steps: number): number {
    const h = t / steps;
    let y1 = 0;
    let y2 = 0;
    const f = (b: number) => kT / m - (gamma / m) * b;
    for (let k = 0; k < steps; k++) {
      const a1 = 2 * y2, b1 = f(y2);
      const a2 = 2 * (y2 + (h / 2) * b1), b2 = f(y2 + (h / 2) * b1);
      const a3 = 2 * (y2 + (h / 2) * b2), b3 = f(y2 + (h / 2) * b2);
      const a4 = 2 * (y2 + h * b3), b4 = f(y2 + h * b3);
      y1 += (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
      y2 += (h / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
    }
    return y1;
  }

  it('the closed-form Langevin MSD matches RK4 on the moment equations at t = 0.01, 1 and 100 τ', () => {
    const gamma = 6 * Math.PI * 1e-3 * 1e-6;
    const tau = out().m_kg / gamma;
    for (const x of [0.01, 1, 100]) {
      const o = out({ t_s: x * tau, d: 1 });
      const rk = momentMsd(K_B * 293.15, o.m_kg, gamma, x * tau, 20000);
      expect(Math.abs(o.MSD_langevin_m2 / rk - 1), `t = ${x} τ`).toBeLessThan(1e-8);
    }
  });

  it('agrees with the atlas witness WD4b: at t = 0.1 τ the Langevin MSD is 0.0483742 of 2Dt', () => {
    const tau = out().m_kg / (6 * Math.PI * 1e-3 * 1e-6);
    expect(1 / (1 + out({ t_s: 0.1 * tau }).langevin_deviation)).toBeCloseTo(0.0483742, 6);
  });

  it('ballistic at short times: the Langevin MSD tends to d (k_BT/m) t², with no cancellation loss', () => {
    const o = out({ t_s: 1e-12, d: 3 });
    expect(Math.abs(o.MSD_langevin_m2 / ((3 * K_B * 293.15) / o.m_kg / 1e12 ** 2) - 1)).toBeLessThan(1e-5);
  });

  it('x − (1 − e^{−x}) is accurate across the series switch: against expm1 at x = 5e-4, against x²/2 at x = 1e-13', () => {
    // At 5e-4 the direct form loses only ~2ε/x ≈ 4e-13 relative, so it can referee the series.
    expect(Math.abs(ballisticDeficit(5e-4) / (5e-4 + Math.expm1(-5e-4)) - 1)).toBeLessThan(1e-10);
    expect(Math.abs(ballisticDeficit(1e-13) / (1e-26 / 2) - 1)).toBeLessThan(1e-12);
    expect(Math.abs(ballisticDeficit(2) / (2 + Math.expm1(-2)) - 1)).toBeLessThan(1e-15);
  });

  it('in the checked regime the diffusive MSD is within τ/t of the Langevin one; in the failure example it is far off', () => {
    expect(Math.abs(out().langevin_deviation)).toBeLessThan(1e-6);
    expect(out({ t_s: 1e-6 }).langevin_deviation).toBeGreaterThan(0.5);
  });
});

describe('case-brownian-sphere — regime checks', () => {
  it('τ_p includes the added mass: (4/3πa³)(ρ_p + ρ_f/2)/(6πηa), larger than the bare m/γ', () => {
    const v = (4 / 3) * Math.PI * 1e-18;
    const gamma = 6 * Math.PI * 1e-3 * 1e-6;
    expect(out().tau_p_s).toBeCloseTo((v * (2000 + 499)) / gamma, 20);
    expect(out().tau_p_s).toBeGreaterThan(out().m_kg / gamma);
  });

  it('the overdamped threshold means what it says: the Ornstein–Uhlenbeck MSD is within 1% of 2Dt there, and 30%+ off at 1 µs', () => {
    // ⟨x²⟩_OU = 2D[t − τ(1 − e^{−t/τ})] for equilibrium initial velocities.
    const tau = out().tau_p_s;
    const ratio = (t: number) => (t - tau * (1 - Math.exp(-t / tau))) / t;
    expect(1 - ratio(tau / 0.01)).toBeLessThanOrEqual(0.01 + 1e-12);
    expect(1 - ratio(tau / 0.01)).toBeGreaterThan(0.0099);
    expect(1 - ratio(1e-6)).toBeGreaterThan(0.3);
    expect(failed({ t_s: tau / 0.01 * 1.001 }).includes('overdamped')).toBe(false);
    expect(failed({ t_s: 1e-6 })).toEqual(['overdamped', 'memory']);
  });

  it('sedimentation speed is the Stokes force balance 6πηa v = (4/3)πa³(ρ_p − ρ_f)g', () => {
    const a = 50e-6;
    const i = { a_m: a, rho_p_kg_per_m3: 7800, t_s: 100, d: 3 };
    const weight = (4 / 3) * Math.PI * a ** 3 * (7800 - 998) * 9.80665;
    const v = weight / (6 * Math.PI * 1e-3 * a);
    expect(out(i).v_sed_m_per_s).toBeCloseTo(v, 14);
    expect(out(i).Re).toBeCloseTo((998 * a * v) / 1e-3, 10);
    expect(failed(i)).toEqual(['creeping-flow', 'drift']);
  });

  it('a light sphere rises (negative v_s) and |v_s| sets Re when it exceeds the thermal speed', () => {
    const i = { a_m: 50e-6, rho_p_kg_per_m3: 500, t_s: 100, d: 2 };
    expect(out(i).v_sed_m_per_s).toBeLessThan(0);
    expect(out(i).Re).toBeCloseTo((998 * 50e-6 * Math.abs(out(i).v_sed_m_per_s)) / 1e-3, 12);
  });

  it('the valid sphere: Re from the thermal speed √(k_BT/m), well inside creeping flow', () => {
    const m = (4 / 3) * Math.PI * 1e-18 * 2000;
    expect(out().Re).toBeCloseTo((998 * 1e-6 * Math.sqrt((K_B * 293.15) / m)) / 1e-3, 15);
    expect(failed({})).toEqual([]);
  });

  it('the drift check runs only when the vertical axis is tracked; otherwise it is stated, not checked', () => {
    expect(run({ d: 3 }).checks.map((k) => k.id)).toContain('drift');
    expect(run({ d: 2 }).checks.map((k) => k.id)).not.toContain('drift');
    expect(run({ d: 2 }).unchecked.join(' ')).toMatch(/tracked axes are horizontal/);
  });

  it('refuses a non-positive radius and a d outside 1..3', () => {
    expect(() => run({ a_m: 0 })).toThrow(/a_m must be/);
    expect(() => run({ d: 4 })).toThrow(/d must be 1, 2 or 3/);
    expect(() => run({ d: 1.5 })).toThrow(/d must be 1, 2 or 3/);
  });
});

// ── Hydrodynamic memory ─────────────────────────────────────────────────────
// A second method for the branch-cut integral: fixed-Talbot numerical inversion
// (Abate & Valkó 2004, Int. J. Numer. Meth. Eng. 60, 979) of the Laplace-domain
// VACF Ĉ(s) = k_BT/(M s + γ(1 + √(sτ_f))), in units k_BT = γ = 1 (so D = 1).

type Cx = { re: number; im: number };
const cx = (re: number, im = 0): Cx => ({ re, im });
const cadd = (a: Cx, b: Cx): Cx => cx(a.re + b.re, a.im + b.im);
const cmul = (a: Cx, b: Cx): Cx => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cdiv = (a: Cx, b: Cx): Cx => {
  const d = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const csqrt = (z: Cx): Cx => {
  const r = Math.hypot(z.re, z.im);
  return cx(Math.sqrt((r + z.re) / 2), (z.im < 0 ? -1 : 1) * Math.sqrt((r - z.re) / 2));
};
const cexp = (z: Cx): Cx => cx(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im));
function talbot(F: (s: Cx) => Cx, t: number, M = 32): number {
  const r = (2 * M) / (5 * t);
  let sum = 0.5 * F(cx(r)).re * Math.exp(r * t);
  for (let k = 1; k < M; k++) {
    const th = (k * Math.PI) / M;
    const cot = 1 / Math.tan(th);
    const s = cx(r * th * cot, r * th);
    sum += cmul(cmul(cexp(cx(s.re * t, s.im * t)), F(s)), cx(1, th + (th * cot - 1) * cot)).re;
  }
  return (r / M) * sum;
}
const vacfHat = (tauP: number, tauF: number) => (s: Cx) => cdiv(cx(1), cadd(cadd(cx(1), csqrt(cx(s.re * tauF, s.im * tauF))), cx(s.re * tauP, s.im * tauP)));
/** MSD/(2t) per axis by Talbot on 2Ĉ(s)/s². */
const talbotRatio = (tauP: number, tauF: number, t: number) => talbot((s) => cdiv(cmul(cx(2), vacfHat(tauP, tauF)(s)), cmul(s, s)), t) / (2 * t);

const runH = (i: Record<string, number>) => C.run({ ...base, ...i });
const outH = (i: Record<string, number>) => runH(i).outputs as Record<string, number | null>;
const failedH = (i: Record<string, number>) => runH(i).checks.filter((k) => !k.holds).map((k) => k.id);

describe('case-brownian-sphere — hydrodynamic memory (Langevin–Basset)', () => {
  it('the Basset term in the Laplace domain is γ√(sτ_f): 6a²√(πηρ_f)·√(πs) = 6πηa·a√(sρ_f/η), by hand at s = 1e5 s⁻¹', () => {
    const [a, eta, rho, s] = [1e-6, 1e-3, 998, 1e5];
    const basset = 6 * a * a * Math.sqrt(Math.PI * eta * rho) * Math.sqrt(Math.PI * s);
    const kernel = 6 * Math.PI * eta * a * Math.sqrt((s * rho * a * a) / eta);
    expect(basset / kernel - 1).toBeCloseTo(0, 14);
    // Control: without the Γ(1/2) = √π of the Laplace transform of t^{−1/2}, the two differ by √π.
    expect((6 * a * a * Math.sqrt(Math.PI * eta * rho) * Math.sqrt(s)) / kernel).toBeCloseTo(1 / Math.sqrt(Math.PI), 12);
  });

  it('the branch-cut integral agrees with Talbot inversion from t = 1e-3 τ_f to 1e6 τ_f, for dense, neutral and heavy spheres', () => {
    // τ_p/τ_f = (2ρ_p/ρ_f + 1)/9: polystyrene in water ≈ 0.345, silica ≈ 0.556, gold ≈ 4.4, a solid in a gas ≫ 1.
    for (const tauP of [0.345, 0.556, 4.4, 300]) {
      for (const t of [1e-3, 0.1, 1, 10, 1e3, 1e6]) {
        const want = talbotRatio(tauP, 1, t);
        expect(Math.abs(hydrodynamicMsdRatio(tauP / t, 1 / t) / want - 1), `τ_p = ${tauP} τ_f, t = ${t} τ_f`).toBeLessThan(1e-7);
      }
    }
  });

  it('long times: MSD/(2Dt) → 1 − 2√(τ_f/(πt)) + (τ_f − τ_p)/t, the √s expansion of Ĉ (error O(t^{-3/2}))', () => {
    for (const t of [1e6, 1e8]) {
      const asym = 1 - 2 * Math.sqrt(1 / (Math.PI * t)) + (1 - 0.556) / t;
      expect(Math.abs(hydrodynamicMsdRatio(0.556 / t, 1 / t) - asym), `t = ${t} τ_f`).toBeLessThan(3 * t ** -1.5);
    }
    // At the valid example the correction is ≈ 2√(τ_f/(πt)) = 1.1273e-3 (τ_f = 9.98e-7 s, t = 1 s), by hand.
    expect(out().hydro_deviation).toBeCloseTo(1.1281e-3, 7);
  });

  it('control: dropping the memory (a white-noise Langevin with the added mass) misses the √t correction', () => {
    const o = out();
    const ou = 2 * 2 * o.D_m2_per_s * o.tau_p_s * ballisticDeficit(1 / o.tau_p_s);
    expect(Math.abs(o.MSD_m2 / ou - 1)).toBeLessThan(1e-6);
    expect(Math.abs(o.MSD_m2 / o.MSD_hydro_m2 - 1)).toBeGreaterThan(1e-3);
  });

  it('the VACF tail is k_BT/(12 ρ_f (πνt)^{3/2}): Talbot-inverted Ĉ in SI, and the second derivative of the case\'s own MSD', () => {
    const [T, eta, a, rhoP, rhoF] = [293.15, 1e-3, 1e-6, 2000, 998];
    const gamma = 6 * Math.PI * eta * a;
    const tauF = (rhoF * a * a) / eta;
    const tauP = ((4 / 3) * Math.PI * a ** 3 * (rhoP + rhoF / 2)) / gamma;
    const tail = (t: number) => (K_B * T) / (12 * rhoF * (Math.PI * (eta / rhoF) * t) ** 1.5);
    const t = 1e5 * tauF;
    // Talbot in units k_BT = γ = 1 → C in SI is (k_BT/γ)·(1/s-scale): Ĉ_SI(s) = (k_BT/γ) Ĉ₁(s), so C_SI(t) = (k_BT/γ) C₁(t).
    const c = ((K_B * T) / gamma) * talbot(vacfHat(tauP, tauF), t);
    expect(Math.abs(c / tail(t) - 1)).toBeLessThan(5e-5);
    // ⟨Δx²⟩ = 2∫(t−s)C ⇒ C = ½ d²⟨Δx²⟩/dt²; the case's MSD (d = 1) differenced at step 0.02 t.
    const msd = (tt: number) => outH({ t_s: tt, d: 1 }).MSD_hydro_m2!;
    const h = 0.02 * t;
    const second = (msd(t + h) - 2 * msd(t) + msd(t - h)) / (h * h) / 2;
    expect(Math.abs(second / tail(t) - 1)).toBeLessThan(1e-3);
  });

  it('short times: the MSD tends to d (k_BT/M) t² with M = m + m_f/2 (incompressible), not the bare-mass k_BT/m', () => {
    const o = out({ t_s: 1e-13, d: 3 });
    const M = (4 / 3) * Math.PI * 1e-18 * (2000 + 998 / 2);
    expect(Math.abs(o.MSD_hydro_m2 / ((3 * K_B * 293.15) / M / 1e26) - 1)).toBeLessThan(2e-3);
    // m/M = 2000/2499: the bare mass would be 20% off.
    expect(Math.abs(o.MSD_hydro_m2 / ((3 * K_B * 293.15) / o.m_kg / 1e26) - 1)).toBeGreaterThan(0.19);
  });

  it('the memory check tracks the computed correction: it holds just past |MSD_H/MSD_OU − 1| = 0.01 and fails just before', () => {
    // 2√(τ_f/(πt)) = 0.01 at t = τ_f/(2.5e-5 π) to leading order; bracket the flip by ±5%.
    const t0 = out().tau_f_s / (2.5e-5 * Math.PI);
    expect(Math.abs(out({ t_s: t0 }).memory_correction) / 0.01).toBeCloseTo(1, 1);
    expect(failed({ t_s: 1.05 * t0 })).toEqual([]);
    expect(failed({ t_s: 0.95 * t0 })).toEqual(['memory']);
  });

  it('hydro_correction_m2 is MSD_H − MSD, ≈ −4dD√(τ_f t/π) at the valid example', () => {
    const o = out();
    expect(o.hydro_correction_m2).toBeCloseTo(o.MSD_hydro_m2 - o.MSD_m2, 28);
    expect(o.hydro_correction_m2 / (-4 * 2 * o.D_m2_per_s * Math.sqrt((o.tau_f_s * 1) / Math.PI)) - 1).toBeCloseTo(0, 3);
  });
});

// ── Wall corrections ────────────────────────────────────────────────────────
/** Brenner's series summed as printed (overflows beyond α ≈ 1.7 at 200 terms), to referee the rearranged sum. */
function brennerAsPrinted(hOverA: number): number {
  const al = Math.acosh(hOverA);
  let sum = 0;
  for (let n = 1; n < 200; n++) {
    const num = 2 * Math.sinh((2 * n + 1) * al) + (2 * n + 1) * Math.sinh(2 * al);
    const den = 4 * Math.sinh((n + 0.5) * al) ** 2 - (2 * n + 1) ** 2 * Math.sinh(al) ** 2;
    sum += ((n * (n + 1)) / ((2 * n - 1) * (2 * n + 3))) * (num / den - 1);
  }
  return (4 / 3) * Math.sinh(al) * sum;
}

describe('case-brownian-sphere — wall corrections (Faxén parallel, Brenner perpendicular)', () => {
  it("Brenner's rearranged sum equals the series as printed, where the printed one does not overflow", () => {
    // The printed form loses ~α⁻² ε to cancellation in its low-n denominators.
    for (const al of [0.1, 0.5, 1, 1.5]) expect(Math.abs(brennerPerpendicular(Math.cosh(al)) / brennerAsPrinted(Math.cosh(al)) - 1), `α = ${al}`).toBeLessThan(1e-12);
  });

  it('lubrication limit: λ − a/δ − (1/5) ln(a/δ) → 0.971 as the gap δ → 0 (Cox & Brenner 1967)', () => {
    const rest = (gap: number) => brennerPerpendicular(1 + gap) - 1 / gap - 0.2 * Math.log(1 / gap);
    expect(Math.abs(rest(1e-4) - 0.971)).toBeLessThan(1e-3);
    expect(Math.abs(rest(1e-5) - 0.971)).toBeLessThan(1e-3);
    // Control: the leading a/δ alone is off by the log and the constant (≈ 2.8 at δ = 1e-4 a).
    expect(brennerPerpendicular(1 + 1e-4) - 1e4).toBeGreaterThan(2.5);
  });

  it("far field: λ → 1 + (9/8)(a/h) (Lorentz 1907), and 1/λ = 1 − (9/8)ξ + (1/2)ξ³ + O(ξ⁴) with no ξ² term", () => {
    expect(((brennerPerpendicular(1e4) - 1) * 1e4) / (9 / 8) - 1).toBeCloseTo(0, 3);
    expect(((1 / brennerPerpendicular(1e3) - 1 + 9 / 8e3) * 1e9) / 0.5 - 1).toBeCloseTo(0, 2);
  });

  it("Faxén's leading −(9/16)ξ is half the perpendicular −(9/8)ξ that Brenner's exact series gives numerically (point-force image, leading order)", () => {
    const xi = 1e-5;
    const par = (1 - faxenParallel(xi)) / xi;
    const perp = (1 - 1 / brennerPerpendicular(1 / xi)) / xi;
    expect(par / perp).toBeCloseTo(0.5, 4);
  });

  it('D_∥ at h = 3a by hand: 1 − 3/16 + 1/216 − 45/20736 − 1/3888 = 0.81470229', () => {
    expect(faxenParallel(1 / 3)).toBeCloseTo(0.81470229, 8);
    const o = outH({ h_m: 3e-6 });
    expect(o.D_parallel_m2_per_s! / (o.D_m2_per_s! * 0.81470229) - 1).toBeCloseTo(0, 7);
    expect(o.D_perp_m2_per_s! * brennerPerpendicular(3)).toBeCloseTo(o.D_m2_per_s!, 25);
  });

  it('MSD_wall: horizontal tracked axes are parallel to the wall, a third is normal to it', () => {
    const o2 = outH({ h_m: 3e-6, d: 2 });
    expect(o2.MSD_wall_m2).toBeCloseTo(4 * o2.D_parallel_m2_per_s!, 28);
    const o3 = outH({ h_m: 3e-6, d: 3 });
    expect(o3.MSD_wall_m2).toBeCloseTo(2 * (2 * o3.D_parallel_m2_per_s! + o3.D_perp_m2_per_s!), 28);
    expect(o3.wall_deviation).toBeCloseTo(o3.MSD_m2! / o3.MSD_wall_m2! - 1, 14);
  });

  it('faxen-range: the last term (a/h)⁵/16 reaches 1% of the series between h = 1.54a and 1.61a', () => {
    const range = (h: number) => runH({ h_m: h * 1e-6, t_s: 1e-3 }).checks.find((k) => k.id === 'faxen-range')!;
    expect(range(1 / 0.62).holds).toBe(true);
    expect(range(1 / 0.65).holds).toBe(false);
  });

  it('wall-static counts diffusion and wall-slowed sedimentation normal to the wall, over the gap h − a', () => {
    const o = outH({ h_m: 100e-6 });
    const k = runH({ h_m: 100e-6 }).checks.find((c) => c.id === 'wall-static')!;
    const lambda = brennerPerpendicular(100);
    expect(k.value).toBeCloseTo((Math.sqrt(2 * o.D_perp_m2_per_s!) + o.v_sed_m_per_s! / lambda) / 99e-6, 12);
  });

  it('without h_m there are no wall outputs or wall checks; h_m ≤ a is refused', () => {
    const r = run();
    expect(r.outputs.D_parallel_m2_per_s).toBeNull();
    expect(r.outputs.MSD_wall_m2).toBeNull();
    expect(r.checks.map((k) => k.id)).toEqual(['creeping-flow', 'overdamped', 'memory']);
    expect(() => runH({ h_m: 1e-6 })).toThrow(/h_m must be/);
    expect(() => brennerPerpendicular(1)).toThrow(/h\/a > 1/);
  });
});
