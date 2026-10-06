/**
 * Bridge-evaluator registry — the dispatch surface behind `upt evaluate`.
 * @module tests/bridges/evaluators
 */
import { describe, it, expect } from 'vitest';
import { BRIDGE_EVALUATORS, evaluateBridge } from '../../src/bridges/evaluators.js';
import { temperatureQuantityRole } from '../../src/dimensional/formula-names.js';
import { parseUnit } from '../../src/dimensional/units.js';
import { APPLIED_CASES } from '../../src/cases/index.js';

describe('BRIDGE_EVALUATORS', () => {
  it('covers the closed-form / spacetime bridges (16/42/51/52/55..125)', () => {
    // The list that started at 51 is the record from before be-16 and be-42 evaluated by id.
    // The list that stopped at 102 is the record from before BE-103..125.
    expect([...BRIDGE_EVALUATORS.keys()].sort((a, b) => a - b)).toEqual([
      16, 42, 51, 52, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
      77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
      101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
      120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133,
      134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146,
      147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160,
      161, 162, 163, 164, 165, 166, 167, 168, 169, 170,
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
      [/_F_per_m$/, 'F/m'],
      [/_kg_per_s$/, 'kg/s'],
      [/_kg_per_m3$/, 'kg/m^3'],
      [/_S_per_m$/, 'S/m'],
      [/_ohm_m$/, 'ohm*m'],
      [/_m2_per_Vs$/, 'm^2/(V·s)'],
      [/_m3_per_kg_K$/, 'm^3/(kg*K)'],
      [/_m3_per_kg$/, 'm^3/kg'],
      [/_J_per_mol$/, 'J/mol'],
      [/_J_per_kg$/, 'J/kg'],
      [/_J_per_T$/, 'J/T'],
      [/_J_m2$/, 'J*m^2'],
      [/_ohm_m_s$/, 'ohm*m*s'],
      [/_V_per_K2$/, 'V/K^2'],
      [/_V_per_K$/, 'V/K'],
      [/_per_K$/, 'K^-1'],
      [/_J$/, 'J'],
      [/_m_per_s$/, 'm/s'],
      [/_J_per_kg_K$/, 'J/(kg*K)'],
      [/_W_per_m_K$/, 'W/(m*K)'],
      [/_W_per_m2_K$/, 'W/(m^2*K)'],
      [/_W_per_m2$/, 'W/m^2'],
      // Longer than `_m2` and `_s`. A diffusivity is m^2/s; a second moment is m^4.
      [/_m2_per_s$/, 'm^2/s'],
      [/_m4$/, 'm^4'],
      [/_per_m2$/, 'm^-2'],
      [/_m2$/, 'm^2'],
      [/_m_s2$/, 'm/s^2'],
      [/_Pa_s$/, 'Pa*s'],
      [/_N_per_m$/, 'N/m'],
      [/_V2_per_Hz$/, 'V^2/Hz'],
      [/_A2_per_Hz$/, 'A^2/Hz'],
      // Longer than `_per_m` and `_m`. A wavenumber is `m^-1`; a gradient is `T/m`.
      [/_T_per_m$/, 'T/m'],
      [/_V_per_m$/, 'V/m'],
      [/_per_m3$/, 'm^-3'],
      // Longer than `_m`. A volume is m^3; a density already matched `_per_m3`.
      [/_m3$/, 'm^3'],
      [/_m3_per_s$/, 'm^3/s'],
      [/_per_m$/, 'm^-1'],
      [/_rad_s$/, 'rad/s'],
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
      [/_A$/, 'A'],
      [/_F$/, 'F'],
      // The Mott–Gurney permittivity key does not carry a unit suffix. It is F/m.
      [/^eps$/, 'F/m'],
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
        // A kelvin suffix is a point unless the name is an interval. `theta_difference_K`
        // is an excess: the reader drops the affine offset, and the flag stays unset.
        const point = temperatureQuantityRole(p.key) === 'absolute';
        expect(p.temperature === 'absolute', `${label} ${p.key}`).toBe(expected === 'K' && point);
      }
    }
  });

  it('every spec run is callable with its declared inputs', () => {
    const sample: Record<string, number> = {
      M_kg: 1.989e30, b_m: 7e8, a_m: 5.79e10, e: 0.2056, T_yr: 0.24, temperature_K: 300,
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
      T_e_K: 300, m_i_kg: 1.67262192369e-27, k_per_m: 1e4, c_s_m_per_s: 1e4,
      lambda_De_m: 1e-4, omega_c_rad_s: 1e6, omega_p_rad_s: 1e7,
      omega_pi_rad_s: 1e6, omega_ci_rad_s: 1e5, omega_ce_rad_s: 1e8,
      v_A_m_per_s: 1e5, N_per_m: 1e18, B0_T: 0.1, Bm_T: 1,
      v_perp_m_per_s: 1e5, gradB_T_per_m: 0.01, E_x_V_per_m: 1, E_y_V_per_m: 1,
      omega_rad_s: 1e6, v_t_m_per_s: 1e5, lambda_D_m: 1e-4,
      lambda_1_m: 1e-4, lambda_2_m: 2e-4, Z: 1, ln_Lambda: 10,
      Omega_rad_s: 2.9e-6, r_m: 1.5e11, v_r_m_per_s: 4e5, B_E_T: 3.12e-5,
      sigma_v_m3_per_s: 1e-22, E_J: 2.8e-12,
      m_e_kg: 9.1093837015e-31, alpha: 1, beta_parallel: 1, beta_perp: 1,
      T_perp_K: 300, T_parallel_K: 200,
      n: 10, eps_F_per_m: 8.854e-12, h_m: 2e-4, g_m: 2e-6,
      Cd_F: 1e-15, Cox_F: 2e-15, D: 0.4,
      h_W_per_m2_K: 100, k_W_per_m_K: 200, t_m: 0.002, L_fin_m: 0.05,
      Th_K: 600, Tc_K: 400, Z_per_K: 0.001,
      dv_m_per_s: 1, K_Pa: 2.2e9, pipe_D_m: 0.1, wall_m: 0.005,
      c_kg_per_s: 2,
      zeta_3_2: 2.612375348685488, D_J_m2: 1e-40,
      NA_per_m3: 1e22, ND_per_m3: 1e21, ni_per_m3: 1e16,
      mh_kg: 4e-31, me_kg: 1e-31, Nc_per_m3: 1e25, EF_J: 1e-18,
      A_per_m2: 1e18, Ic_A: 1e-3, lambda_m: 1e-6, lambda0_m: 1e-7,
      tau_s: 1e-14, tau1_s: 1e-14, tau2_s: 2e-14, C_ohm_m_s: 1e-15,
      chi_P: 1, x: 0.2,
      A_Hz: 1e6, Ea_J_per_mol: 8e4, dG_J: 1e-19, dH_J_per_mol: 4e4,
      K: 10, E0_volts: 1.1, Q: 10, T1_K: 300, T2_K: 373.15, Psat_Pa: 101325,
      cp_J_per_kg_K: 4180, Lc_m: 0.01, D_m2_per_s: 1e-9,
      km_m_per_s: 1e-4, T_L_K: 400, T_0_K: 300, c_J_per_kg_K: 4180, V_m3: 0.001,
      t_s: 10, theta_difference_K: 18, r: 8, gamma: 1.4,
      dv_dT_m3_per_kg_K: 0.001, v_m3_per_kg: 0.001, nu_Hz: 1e14, wien_x: 4.5,
      nQ_per_m3: 1e30, I_J: 2e-18, phi_J: 4e-19, L12: 3, onsager_B_T: 0,
    };
    for (const [id, spec] of BRIDGE_EVALUATORS) {
      const inputs = Object.fromEntries(spec.inputKeys.map((k) => [k, sample[k]]));
      expect(() => evaluateBridge(id, inputs), `be-${id}`).not.toThrow();
    }
  });
});
