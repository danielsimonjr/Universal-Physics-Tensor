/**
 * BE-88 through BE-102.
 *
 * Each number is the one the Lean theorem states. A nearby count
 * (one spin, the cutoff equated to n, the energy prefactor, a flat
 * density, charge e, circumference entropy) is a different equation.
 * The Bose integral, the trial wall, T = 0, the quartic coefficient,
 * and the energy-entropy argument stay hypotheses.
 */
import { describe, expect, it } from 'vitest';
import { evaluateFermiSea } from '../../src/bridges/be88-fermi-sea.js';
import { evaluateDebyeCutoff } from '../../src/bridges/be89-debye-cutoff.js';
import { evaluateDebyeHeat } from '../../src/bridges/be90-debye-heat.js';
import { evaluateEinsteinSolid } from '../../src/bridges/be91-einstein-solid.js';
import { evaluateSommerfeldHeat } from '../../src/bridges/be92-sommerfeld-heat.js';
import { evaluateCurieWeiss } from '../../src/bridges/be93-curie-weiss.js';
import { evaluatePauliParamagnetism } from '../../src/bridges/be94-pauli-paramagnetism.js';
import { evaluateGinzburgLandau } from '../../src/bridges/be95-ginzburg-landau.js';
import { evaluateUpperCritical } from '../../src/bridges/be96-upper-critical.js';
import { evaluateAmbegaokarBaratoff } from '../../src/bridges/be97-ambegaokar-baratoff.js';
import { evaluateBcsJump } from '../../src/bridges/be98-bcs-jump.js';
import { evaluateMassAction } from '../../src/bridges/be99-mass-action.js';
import { evaluateLyddaneSachsTeller } from '../../src/bridges/be100-lyddane-sachs-teller.js';
import { evaluateBktJump } from '../../src/bridges/be101-bkt-jump.js';
import { evaluateLandauerConductance } from '../../src/bridges/be102-landauer-conductance.js';
import { E_SI, H_SI, HBAR_SI, K_B_SI } from '../../src/core/constants.js';
import { MU0_SI } from '../../src/dimensional/formula-names.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { PHYSJS_COMMIT } from '../../src/atlas/physjs-ref.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';

const SHA = '03e8bb77c952f720bdd2730af2afc6a7f2d36243';
const N = 1e28;
const M = 9.1093837015e-31;

describe('BE-88 Fermi sea', () => {
  it('is the two-spin root, not the one-spin root', () => {
    const k = evaluateFermiSea({ n_per_m3: N, m_kg: M }).k_F_per_m;
    const two = (3 * Math.PI ** 2 * N) ** (1 / 3);
    const one = (6 * Math.PI ** 2 * N) ** (1 / 3);
    expect(k).toBeCloseTo(two, 6);
    expect(Math.abs(k / one - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-89 Debye cutoff', () => {
  it('fills 3n states, so k_D³ = 6 π² n and not 2 π² n', () => {
    const v = 3e3;
    const w = evaluateDebyeCutoff({ v_m_per_s: v, n_per_m3: N }).omega_D_rad_per_s;
    const threeN = v * (6 * Math.PI ** 2 * N) ** (1 / 3);
    const equatedToN = v * (2 * Math.PI ** 2 * N) ** (1 / 3);
    expect(w).toBeCloseTo(threeN, 6);
    expect(Math.abs(w / equatedToN - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-90 Debye heat', () => {
  it('differentiates to 12 π⁴/5 and does not return the energy prefactor 3 π⁴/5', () => {
    const heat = evaluateDebyeHeat({ N: 2, T_K: 5, thetaD_K: 300 }).C_V_J_per_K;
    const factor = (T: number) => 2 * K_B_SI * (T / 300) ** 3;
    const capacity = ((12 * Math.PI ** 4) / 5) * factor(5);
    const energy = ((3 * Math.PI ** 4) / 5) * factor(5);
    expect(heat).toBeCloseTo(capacity, 8);
    expect(Math.abs(heat / energy - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-91 Einstein solid', () => {
  it('is three oscillators, and one oscillator is a third of that', () => {
    const cv = evaluateEinsteinSolid({ N: 4, T_K: 100, thetaE_K: 200 }).C_V_J_per_K;
    const x = 2;
    const kernel = (x ** 2 * Math.exp(x)) / (Math.exp(x) - 1) ** 2;
    const three = 3 * 4 * K_B_SI * kernel;
    expect(cv).toBeCloseTo(three, 8);
    expect(Math.abs(cv / (4 * K_B_SI * kernel) - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-92 Sommerfeld heat', () => {
  it('uses the √E density, and a flat density leaves π²/3', () => {
    const c = evaluateSommerfeldHeat({ n_per_m3: N, T_K: 10, E_F_J: 1e-18 }).c_V_J_per_K_m3;
    const parabolic = (Math.PI ** 2 / 2) * N * K_B_SI ** 2 * 10 / 1e-18;
    const flat = (Math.PI ** 2 / 3) * N * K_B_SI ** 2 * 10 / 1e-18;
    expect(c).toBeCloseTo(parabolic, 6);
    expect(Math.abs(c / flat - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-93 Curie–Weiss', () => {
  it('uses S(S+1)/3, and S = 1/2 gives the moment 1/4', () => {
    const spin = 0.5;
    expect((spin * (spin + 1)) / 3).toBeCloseTo(0.25, 12);
    const chi = evaluateCurieWeiss({
      n_per_m3: N,
      g: 2,
      spin,
      muB_J_per_T: 9.2740100783e-24,
      T_K: 300,
      theta_K: 0,
    }).chi;
    const moment = 2 ** 2 * (9.2740100783e-24) ** 2 * spin * (spin + 1);
    const curie = (MU0_SI * N * moment) / (3 * K_B_SI * 300);
    expect(chi).toBeCloseTo(curie, 6);
  });
});

describe('BE-94 Pauli paramagnetism', () => {
  it('carries the √E factor 3/2, and a flat density leaves 1', () => {
    const chi = evaluatePauliParamagnetism({
      n_per_m3: N,
      E_F_J: 1e-18,
      muB_J_per_T: 9.274e-24,
    }).chi_P;
    const parabolic = MU0_SI * (9.274e-24) ** 2 * (3 * N) / (2 * 1e-18);
    const flat = MU0_SI * (9.274e-24) ** 2 * N / 1e-18;
    expect(chi).toBeCloseTo(parabolic, 6);
    expect(Math.abs(chi / flat - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-95 Ginzburg–Landau trial wall', () => {
  it('is negative, zero, and positive on this trial, which is not a minimizer search', () => {
    const at = (kappa: number) => evaluateGinzburgLandau({ kappa }).trial_factor;
    expect(at(1)).toBeCloseTo(-1, 12);
    expect(at(1 / Math.sqrt(2))).toBeCloseTo(0, 12);
    expect(at(0.5)).toBeCloseTo(2, 12);
    expect(at(1)).toBeLessThan(0);
    expect(at(0.5)).toBeGreaterThan(0);
  });
});

describe('BE-96 upper critical field', () => {
  it('uses charge 2e, and charge e is twice that field', () => {
    const xi = 4e-8;
    const b = evaluateUpperCritical({ xi_m: xi }).B_c2_T;
    const twoE = HBAR_SI / (2 * E_SI * xi ** 2);
    const oneE = HBAR_SI / (E_SI * xi ** 2);
    expect(b).toBeCloseTo(twoE, 8);
    expect(Math.abs(b / oneE - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-97 Ambegaokar–Baratoff', () => {
  it('is π/2 at T = 0, and a different coefficient is a different product', () => {
    const gap = 2e-22;
    const product = evaluateAmbegaokarBaratoff({ Delta_J: gap }).IcRn_V;
    expect(product).toBeCloseTo((Math.PI * gap) / (2 * E_SI), 8);
    expect(Math.abs(product / (gap / E_SI) - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-98 BCS jump', () => {
  it('treats ζ as the quartic coefficient, so ζ = 1 is 12/7', () => {
    const ratio = evaluateBcsJump({ zeta: 1 }).ratio;
    expect(ratio).toBeCloseTo(12 / 7, 12);
    const zeta3 = 1.202056903159594;
    expect(evaluateBcsJump({ zeta: zeta3 }).ratio).toBeCloseTo(12 / (7 * zeta3), 12);
    expect(Math.abs(evaluateBcsJump({ zeta: zeta3 }).ratio / (12 / 7) - 1)).toBeGreaterThan(0.01);
  });
});

describe('BE-99 mass action', () => {
  it('keeps the 2 in the exponent', () => {
    const n = evaluateMassAction({
      N_c_per_m3: 1e25,
      N_v_per_m3: 4e25,
      E_g_J: 1.6e-19,
      T_K: 300,
    }).n_i_per_m3;
    const root = Math.sqrt(1e25 * 4e25);
    const withTwo = root * Math.exp(-1.6e-19 / (2 * K_B_SI * 300));
    const dropped = root * Math.exp(-1.6e-19 / (K_B_SI * 300));
    expect(n).toBeCloseTo(withTwo, 6);
    expect(Math.abs(n / dropped - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-100 Lyddane–Sachs–Teller', () => {
  it('returns the squared frequency ratio, which is the dielectric ratio', () => {
    const ratio = evaluateLyddaneSachsTeller({ eps_static: 10, eps_inf: 2 }).frequency_ratio_sq;
    expect(ratio).toBeCloseTo(5, 12);
    expect(Math.abs(ratio / Math.sqrt(5) - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-101 BKT jump', () => {
  it('unbinds at π J / 2, and circumference entropy unbinds at π J', () => {
    const t = evaluateBktJump({ J_J: 1e-21 }).T_K;
    const area = (Math.PI * 1e-21) / (2 * K_B_SI);
    const circumference = (Math.PI * 1e-21) / K_B_SI;
    expect(t).toBeCloseTo(area, 6);
    expect(Math.abs(t / circumference - 1)).toBeGreaterThan(0.1);
  });
});

describe('BE-102 Landauer conductance', () => {
  it('is two spins, and one spin is e²/h', () => {
    const g = evaluateLandauerConductance({ sum_Tn: 0.4 }).G_S;
    const two = (2 * E_SI ** 2 / H_SI) * 0.4;
    const one = (E_SI ** 2 / H_SI) * 0.4;
    expect(g).toBeCloseTo(two, 8);
    expect(Math.abs(g / one - 1)).toBeGreaterThan(0.1);
  });
});

describe('catalog evidence for BE-88 through BE-102', () => {
  it('each id is formally-proved through the PhysJS #65 file', () => {
    expect(PHYSJS_COMMIT).toBe(SHA);
    const files = [
      'FermiSea.lean',
      'DebyeCutoff.lean',
      'DebyeHeat.lean',
      'EinsteinSolid.lean',
      'SommerfeldHeat.lean',
      'CurieWeiss.lean',
      'PauliParamagnetism.lean',
      'GinzburgLandau.lean',
      'UpperCritical.lean',
      'AmbegaokarBaratoff.lean',
      'BcsJump.lean',
      'MassAction.lean',
      'LyddaneSachsTeller.lean',
      'BktJump.lean',
      'LandauerConductance.lean',
    ];
    for (let id = 88; id <= 102; id++) {
      const ref = catalogFormalRef(id);
      expect(ref?.kind, `be-${id}`).toBe('bridge');
      expect(ref?.url).toBe(`https://github.com/danielsimonjr/PhysJS/blob/${SHA}/lean/${files[id - 88]}`);
      expect(ref?.covers.startsWith('derivation-step:'), `be-${id}`).toBe(true);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(true);
    }
  });
});
