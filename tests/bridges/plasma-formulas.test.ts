/**
 * BE-103 through BE-125, checked against the formulas written here.
 *
 * The equal-temperature Bennett current is not the factor-8 current.
 * The Lorentz catalog value is the kinetic closure, not the reference.
 * Four proofs assume the key step as a hypothesis, and the covers line says so.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { E_SI, G_SI, K_B_SI } from '../../src/core/constants.js';
import { EPS0_SI, MU0_SI } from '../../src/dimensional/formula-names.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { PLASMA_CATALOG_ROWS } from '../../src/bridges/plasma-catalog.js';
import {
  bennettSinglePopulationCurrent,
  evaluateBennettPinch,
  evaluateBohmSheath,
  evaluateBohmWarmSound,
  evaluateCrossFieldVelocity,
  evaluateLandauDamping,
  evaluateLorentzResistivity,
  evaluateParkerCritical,
  lorentzReferenceOverKinetic,
} from '../../src/bridges/plasma-space.js';

describe('plasma and space formulas', () => {
  it('cold Bohm speed is sqrt(k_B T_e / m_i), and warm sound is a different number', () => {
    const T = 20;
    const m = 2;
    const cold = Math.sqrt((K_B_SI * T) / m);
    expect(evaluateBohmSheath({ T_e_K: T, m_i_kg: m }).u0_m_s).toBeCloseTo(cold, 8);
    const warm = Math.sqrt((K_B_SI * T + 3 * K_B_SI * 5) / m);
    expect(evaluateBohmWarmSound(T, 5, m)).toBeCloseTo(warm, 8);
    expect(Math.abs(warm - cold) / cold).toBeGreaterThan(0.1);
  });

  it('equal-temperature Bennett current uses 16 π, and the factor 8 is a different current', () => {
    const N = 1e18;
    const T = 50;
    const equal = Math.sqrt((16 * Math.PI * N * K_B_SI * T) / MU0_SI);
    expect(evaluateBennettPinch({ N_per_m: N, T_K: T }).I_A).toBeCloseTo(equal, 6);
    const single = Math.sqrt((8 * Math.PI * N * K_B_SI * T) / MU0_SI);
    expect(bennettSinglePopulationCurrent(N, T)).toBeCloseTo(single, 6);
    expect(equal).not.toBeCloseTo(single, 4);
  });

  it('Landau damping uses the residue prefactor, which the covers line calls a hypothesis', () => {
    const omega = 2;
    const k = 0.5;
    const vt = 4;
    const x = omega / (k * vt);
    const gamma = -Math.sqrt(Math.PI / 8) * omega * x ** 3 * Math.exp(-(omega * omega) / (2 * k * k * vt * vt));
    expect(evaluateLandauDamping({ omega_rad_s: omega, k_per_m: k, v_t_m_s: vt }).gamma_rad_s).toBeCloseTo(gamma, 10);
    expect(catalogFormalRef(113)?.covers).toMatch(/residue formula/);
    expect(catalogFormalRef(113)?.covers).toMatch(/is a hypothesis/);
  });

  it('Lorentz resistivity is the kinetic closure, and the reference is 32/(3π) times that', () => {
    const Z = 2;
    const lnL = 12;
    const T = 80;
    const m = 3;
    const pref = (Math.PI * Math.sqrt(2 * Math.PI)) / 8;
    const kt = K_B_SI * T;
    const kinetic = (pref * Z * E_SI * E_SI * Math.sqrt(m) * lnL) / ((4 * Math.PI * EPS0_SI) ** 2 * kt ** 1.5);
    const eta = evaluateLorentzResistivity({ Z, ln_Lambda: lnL, T_K: T, m_kg: m }).eta_ohm_m;
    expect(eta).toBeCloseTo(kinetic, 8);
    expect(lorentzReferenceOverKinetic()).toBeCloseTo(32 / (3 * Math.PI), 12);
    expect(eta * lorentzReferenceOverKinetic()).not.toBeCloseTo(eta, 4);
    expect(catalogFormalRef(116)?.covers).toMatch(/σ_tr = 4π b0² ln Λ is a hypothesis/);
    expect(catalogFormalRef(116)?.covers).toMatch(/conductivity moment/);
  });

  it('records the Stix index, the residue, the transport integrals, and the mirror integral as hypotheses', () => {
    expect(catalogFormalRef(106)?.covers).toMatch(/cold Stix index n_R² = 1 − ω_p²\/\(ω\(ω − ω_c\)\) is a hypothesis/);
    expect(catalogFormalRef(113)?.covers).toMatch(/residue formula/);
    expect(catalogFormalRef(116)?.covers).toMatch(/conductivity moment/);
    expect(catalogFormalRef(125)?.covers).toMatch(/mirror threshold/);
    expect(catalogFormalRef(125)?.covers).toMatch(/kinetic integral is not evaluated/);
    const manifest = JSON.parse(readFileSync('formal/physjs/manifest.json', 'utf8')) as {
      entries: { key: string; equalTemperature?: { covers: string } }[];
    };
    const bennett = manifest.entries.find((entry) => entry.key === 'be-109');
    expect(bennett?.equalTemperature?.covers).toMatch(/I = sqrt\(16 π N k_B T \/ μ0\)/);
    expect(bennett?.equalTemperature?.covers).toMatch(/factor 8 is the single-population current/);
  });

  it('cross-field velocity is μ (E + α × E) / (1 + α²), and the catalog row is the ratio', () => {
    const mu = 2;
    const alpha = 3;
    const Ex = 1;
    const Ey = 4;
    const denom = 1 + alpha * alpha;
    const got = evaluateCrossFieldVelocity(mu, alpha, Ex, Ey);
    expect(got.v_x).toBeCloseTo((mu * (Ex + alpha * Ey)) / denom, 8);
    expect(got.v_y).toBeCloseTo((mu * (Ey - alpha * Ex)) / denom, 8);
    const row = PLASMA_CATALOG_ROWS.find((entry) => entry.id === 123);
    expect(row?.bridges).toEqual(['fluid', 'plasma']);
    expect(PLASMA_CATALOG_ROWS).toHaveLength(23);
  });

  it('Parker radius is G M / (2 c_s²)', () => {
    const c = 3e4;
    const M = 2e30;
    expect(evaluateParkerCritical({ c_s_m_s: c, M_kg: M }).r_c_m).toBeCloseTo(G_SI * M / (2 * c * c), 4);
  });
});
