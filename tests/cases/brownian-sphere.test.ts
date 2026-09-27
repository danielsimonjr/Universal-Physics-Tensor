/**
 * case-brownian-sphere (audit §14 I20b). The audit's numbers (§5.2) are the
 * reference: T = 293.15 K, η = 1e-3 Pa·s, radius 1 µm → D = 2.1471978227748074e-13
 * m²/s; radius 0.5 µm (a 1 µm diameter) → 4.294395645549615e-13. Each value is
 * checked by a second route: hand arithmetic from the exact k_B, the canonical
 * entry's own expression tree, the atlas witness WD5, force balance, and the
 * Ornstein–Uhlenbeck mean-square displacement.
 */
import { describe, expect, it } from 'vitest';
import { BROWNIAN_SPHERE_CASE as C } from '../../src/cases/brownian-sphere.js';
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
