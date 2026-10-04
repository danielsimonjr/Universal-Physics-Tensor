/**
 * Bridge-evaluator registry — the dispatch surface behind `upt evaluate`.
 * @module tests/bridges/evaluators
 */
import { describe, it, expect } from 'vitest';
import { BRIDGE_EVALUATORS, evaluateBridge } from '../../src/bridges/evaluators.js';
import { parseUnit } from '../../src/dimensional/units.js';
import { APPLIED_CASES } from '../../src/cases/index.js';

describe('BRIDGE_EVALUATORS', () => {
  it('covers the closed-form / spacetime bridges (51/52/55..102)', () => {
    expect([...BRIDGE_EVALUATORS.keys()].sort((a, b) => a - b)).toEqual([
      51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
      77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
      101, 102,
    ]);
  });

  it('evaluateBridge(63, {mu_e:2}) → Chandrasekhar mass ≈ 1.44 M_⊙', () => {
    const r = evaluateBridge(63, { mu_e: 2 }) as { M_Ch_solar: number };
    expect(r.M_Ch_solar).toBeGreaterThan(1.3);
    expect(r.M_Ch_solar).toBeLessThan(1.6);
  });

  it('evaluateBridge(55, {C:1}) → von Klitzing resistance', () => {
    const r = evaluateBridge(55, { C: 1 }) as { R_H_ohm: number };
    expect(r.R_H_ohm).toBeCloseTo(25812.807, 2);
  });

  it('throws on an id with no evaluator', () => {
    expect(() => evaluateBridge(11, { x: 1 })).toThrow(/no evaluator/);
  });

  it('throws on a missing / non-finite required input', () => {
    expect(() => evaluateBridge(63, {})).toThrow(/missing|mu_e/);
    expect(() => evaluateBridge(65, { T_K: 10, rho_kg_per_m3: 1e-16 })).toThrow(/mu/);
  });

  it('every evaluator declares each input key once, in order, with a unit that parses', () => {
    for (const [id, s] of BRIDGE_EVALUATORS) {
      expect(s.parameters.map((p) => p.key), `be-${id}`).toEqual([...s.inputKeys]);
      for (const p of s.parameters) expect(() => parseUnit(p.unit), `be-${id} ${p.key}`).not.toThrow();
    }
  });

  // An independent second source: the unit the key's own suffix names. A
  // declaration that disagrees with its key would convert `d_m=1um` wrongly.
  it("each declared unit agrees with the unit its key's suffix names (bridges and applied cases)", () => {
    const SUFFIX: readonly (readonly [RegExp, string])[] = [
      [/_kg_per_m3$/, 'kg/m^3'],
      [/_S_per_m$/, 'S/m'],
      [/_ohm_m$/, 'ohm*m'],
      [/_m2_per_Vs$/, 'm^2/(V·s)'],
      [/_m3_per_kg$/, 'm^3/kg'],
      [/_J_per_kg$/, 'J/kg'],
      [/_J_per_T$/, 'J/T'],
      [/_V_per_K$/, 'V/K'],
      [/_J$/, 'J'],
      [/_m_per_s$/, 'm/s'],
      [/_J_per_kg_K$/, 'J/(kg*K)'],
      [/_W_per_m_K$/, 'W/(m*K)'],
      [/_W_per_m2_K$/, 'W/(m^2*K)'],
      [/_W_per_m2$/, 'W/m^2'],
      [/_m_s2$/, 'm/s^2'],
      [/_Pa_s$/, 'Pa*s'],
      [/_N_per_m$/, 'N/m'],
      [/_V2_per_Hz$/, 'V^2/Hz'],
      [/_A2_per_Hz$/, 'A^2/Hz'],
      [/_per_m3$/, 'm^-3'],
      [/_Pa$/, 'Pa'],
      [/_kg$/, 'kg'],
      [/_m$/, 'm'],
      [/_K$/, 'K'],
      [/_T$/, 'T'],
      [/_ohm$/, 'ohm'],
      [/_volts$/, 'V'],
      [/_yr$/, 'yr'],
      [/_Hz$/, 'Hz'],
      [/_C$/, 'C'],
      [/_F$/, 'F'],
      [/_s$/, 's'],
    ];
    const declared = [
      ...[...BRIDGE_EVALUATORS].map(([id, s]) => [`be-${id}`, s.parameters] as const),
      ...[...APPLIED_CASES.values()].map((c) => [c.id, c.parameters] as const),
    ];
    for (const [label, parameters] of declared) {
      for (const p of parameters) {
        const expected = SUFFIX.find(([re]) => re.test(p.key))?.[1] ?? '';
        expect(p.unit, `${label} ${p.key}`).toBe(expected);
        expect(p.temperature === 'absolute', `${label} ${p.key}`).toBe(expected === 'K');
      }
    }
  });

  it('every spec run is callable with its declared inputs', () => {
    const sample: Record<string, number> = {
      M_kg: 1.989e30, b_m: 7e8, a_m: 5.79e10, e: 0.2056, T_yr: 0.24,
      C: 1, d_m: 1e-6, a_m_s2: 9.8, T_K: 300, R_ohm: 1000, V_volts: 1e-3,
      nu: 1 / 3, sigma_S_per_m: 6e7, T_c_K: 1.2, mu_e: 2, rho_kg_per_m3: 3.8e-16, mu: 2.3,
      I_W_per_m2: 1e6, R: 0, theta_rad: 0, B_T: 12e-9, g_00: -0.81,
      cs_m_per_s: 1e5, mu_m2_per_Vs: 1e-8, q_C: 1.602176634e-19,
      L_J_per_kg: 2.26e6, delta_v_m3_per_kg: 1.672,
      g1: -1, g2: -4, S_V_per_K: 2e-4,
      m_kg: 9.1093837015e-31, n_per_m3: 1e28, p_B_Pa: 1,
      R_m: 0.01, deltaP_Pa: 1000, mu_Pa_s: 0.001, L_m: 1,
      E_Pa: 2e11, I_m4: 1e-8, k_N_per_m: 1, g0_m: 1e-6, A_m2: 1e-6,
      eps: 8.8541878128e-12, I_s_A: 1e-12, dS_dT_V_per_K2: 1e-6,
      N: 1, v_m_per_s: 1e3, thetaD_K: 200, thetaE_K: 200, E_F_J: 1e-18,
      g: 2, spin: 0.5, muB_J_per_T: 9.274e-24, theta_K: 10, kappa: 1,
      xi_m: 1e-7, Delta_J: 1e-22, zeta: 1, N_c_per_m3: 1e25, N_v_per_m3: 1e25,
      E_g_J: 1e-19, eps_static: 10, eps_inf: 2, J_J: 1e-21, sum_Tn: 1,
      I_A: 1e-3, C_f: 0.004, C_F: 1e-12,
    };
    for (const [id, spec] of BRIDGE_EVALUATORS) {
      const inputs = Object.fromEntries(spec.inputKeys.map((k) => [k, sample[k]]));
      expect(() => evaluateBridge(id, inputs), `be-${id}`).not.toThrow();
    }
  });
});
