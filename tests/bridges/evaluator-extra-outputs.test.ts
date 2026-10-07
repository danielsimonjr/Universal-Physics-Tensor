import { describe, expect, it } from 'vitest';
import { BRIDGE_EVALUATORS, unusedInputKeys } from '../../src/bridges/evaluators.js';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';

const H = 6.62607015e-34;
const HBAR = H / (2 * Math.PI);
const KB = 1.380649e-23;
const run = (id: number, inputs: Record<string, number>): Record<string, number> =>
  BRIDGE_EVALUATORS.get(id)!.run(inputs) as Record<string, number>;

describe('a record may return a second number beside its value (issues 451, 479)', () => {
  it('returns E_F and v_F with k_F, from independently computed formulas', () => {
    const n = 8.47e28;
    const m = 9.1093837015e-31;
    const kF = (3 * Math.PI ** 2 * n) ** (1 / 3);
    const r = run(88, { n_per_m3: n, m_kg: m });
    expect(r.value).toBeCloseTo(kF, -2);
    expect(r.E_F_J).toBeCloseTo((HBAR ** 2 * kF ** 2) / (2 * m), 27);
    expect(r.v_F_m_per_s).toBeCloseTo((HBAR * kF) / m, 3);
  });
  it('returns the conduction edge above the Fermi level, and its inputs are no longer unused', () => {
    const r = run(139, { T_K: 300, mh_kg: 1e-30, me_kg: 1e-30, Nc_per_m3: 1e25, ND_per_m3: 1e21 });
    expect(r.Ec_minus_EF_J).toBeCloseTo(KB * 300 * Math.log(1e4), 30);
    expect(unusedInputKeys(BRIDGE_EVALUATORS.get(139)!)).not.toContain('Nc_per_m3');
  });
  it('returns the resistivity sum and the London depth', () => {
    expect(run(144, { tau1_s: 1e-14, tau2_s: 1e-14, C_ohm_m_s: 1e-22 }).rho_ohm_m).toBeCloseTo(2e-8, 20);
    const r = run(146, { T_K: 3.6, Tc_K: 7.2, lambda0_m: 5e-8 });
    expect(r.value).toBe(0.9375);
    expect(r.lambda_m).toBeCloseTo(5e-8 / Math.sqrt(0.9375), 20);
  });
  it('gives Mercury about 43 arcsec per century only when T_yr is supplied', () => {
    const base = { M_kg: 1.989e30, a_m: 5.79e10, e: 0.2056 };
    expect(run(52, base).precession_arcsec_per_century).toBeUndefined();
    const r = run(52, { ...base, T_yr: 0.2408 });
    expect(r.precession_arcsec_per_century).toBeGreaterThan(42.9);
    expect(r.precession_arcsec_per_century).toBeLessThan(43.1);
    expect(() => run(52, { ...base, T_yr: -1 })).toThrow(/T_yr must be > 0/);
  });
  it('evaluateRelation still returns the primary value, not the extra', () => {
    const ev = evaluateRelation(88, { n_per_m3: 8.47e28, m_kg: 9.1093837015e-31 });
    expect(ev.kind).toBe('value');
    if (ev.kind === 'value') expect(ev.value).toBeCloseTo((3 * Math.PI ** 2 * 8.47e28) ** (1 / 3), -2);
  });
  it('a mutation that drops the extras is caught', () => {
    // control: a record without outputs returns only value
    expect(Object.keys(run(16, { temperature_K: 300 }))).toEqual(['value']);
  });
});
