/**
 * Catalog-evaluator benchmark: one pass of `evaluateBridge` over every
 * evaluator, using the same sample inputs as the test
 * `every spec run is callable with its declared inputs`
 * (tests/bridges/evaluators.test.ts).
 *
 * Baselines, not thresholds: no assertion gates the printed hz lines.
 * Input records are built OUTSIDE the bench callback so the loop measures
 * evaluation cost, not record-building cost.
 */
import { bench, describe } from 'vitest';
import { BRIDGE_EVALUATORS, evaluateBridge } from '../src/bridges/evaluators.js';

// The sample values every required evaluator input binds. Copied verbatim from
// tests/bridges/evaluators.test.ts (`every spec run is callable with its
// declared inputs`); if an evaluator gains a key, add it there and here.
const sample: Record<string, number> = {
  M_kg: 1.989e30, b_m: 7e10, a_m: 5.79e10, eccentricity: 0.2056, T_yr: 0.24, temperature_K: 300,
  C: 1, d_m: 1e-6, a_m_s2: 9.8, T_K: 300, R_ohm: 1000, V_volts: 1e-3,
  nu: 1 / 3, sigma_S_per_m: 6e7, T_c_K: 1.2, mu_e: 2, rho_kg_per_m3: 3.8e-16, mu: 2.3,
  I_W_per_m2: 1e6, R: 0, theta_rad: 0, B_T: 5e-13, g_00: -0.81,
  cs_m_per_s: 1e5, mu_m2_per_Vs: 1e-8, q_C: 1.602176634e-19,
  L_J_per_kg: 2.26e6, delta_v_m3_per_kg: 1.672,
  g1: -1, g2: -4, S_V_per_K: 2e-4,
  m_kg: 9.1093837015e-31, n_per_m3: 1e28, p_B_Pa: 1,
  R_m: 0.01, deltaP_Pa: 1000, mu_Pa_s: 0.001, L_m: 1,
  E_Pa: 2e11, I_m4: 1e-8, k_N_per_m: 1, g0_m: 1e-6, A_m2: 1e-6,
  eps: 8.8541878128e-12, I_s_A: 1e-12, dS_dT_V_per_K2: 1e-6,
  N: 1, v_m_per_s: 1e3, thetaD_K: 4000, thetaE_K: 200, E_F_J: 1e-18,
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
  A_Hz: 1e13, Ea_J_per_mol: 5e4, dG_J: 1e-20, dH_J_per_mol: 4e4,
  K: 2, E0_volts: 1.1, Q: 1, T1_K: 300, T2_K: 350, Psat_Pa: 1e5,
  cp_J_per_kg_K: 4180, Lc_m: 0.1, D_m2_per_s: 1e-9, km_m_per_s: 1e-4,
  T_L_K: 400, T_0_K: 300, c_J_per_kg_K: 4180, V_m3: 1e-3, t_s: 10,
  theta_difference_K: 20, r: 8, gamma: 1.4, dv_dT_m3_per_kg_K: 1e-6,
  v_m3_per_kg: 1e-3, nu_Hz: 1e14, wien_x: 4.965114231744276, nQ_per_m3: 1e32,
  I_J: 2.18e-18, phi_J: 4e-19, L12: 3, R_near_m: 6.957e8, R_far_m: 1.496e11,
};

// One input record per evaluator, built once outside the bench loop.
const EVALUATOR_INPUTS: readonly (readonly [number, Record<string, number>])[] = [
  ...BRIDGE_EVALUATORS,
].map(([id, spec]) => [id, Object.fromEntries(spec.inputKeys.map((k) => [k, sample[k]]))]);

describe('bridge catalog evaluators', () => {
  bench('evaluateBridge over every evaluator, sample inputs', () => {
    for (const [id, inputs] of EVALUATOR_INPUTS) evaluateBridge(id, inputs);
  });
});
