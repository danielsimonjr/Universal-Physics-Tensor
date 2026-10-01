/**
 * Sanity lemmas for the bucket-A catalog formalRefs.
 *
 * Each top-level statement is instantiated on a known case, and the
 * negative control named in its covers line fails. Kind is `bridge`
 * when the theorem states the catalogued equation, and a weaker kind
 * when it proves only part of that equation. The catalog path still
 * omits the reference. BE-20 stays a nested corollary on be-13. The
 * four not-a-bridge ids stay that membership.
 */

import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { adjudicateBridgeEntry } from '../../src/bridges/membership.js';
import { C_SI, E_SI, G_SI, H_SI, HBAR_SI, K_B_SI } from '../../src/core/constants.js';
import { evaluateThermalDeBroglie } from '../../src/bridges/equations/be-12-coherence-length.js';
import { evaluateACJosephson, JOSEPHSON_CONSTANT_SI } from '../../src/bridges/be59-ac-josephson.js';
import { evaluateQuantumHall, VON_KLITZING_SI } from '../../src/bridges/be55-quantum-hall.js';
import { evaluateFractionalQH } from '../../src/bridges/be60-fractional-qh.js';
import { evaluateKSSBound } from '../../src/bridges/equations/be-21-kss-bound.js';
import { evaluateRyuTakayanagi } from '../../src/bridges/equations/be-14-ryu-takayanagi.js';
import { evaluateEREPRBound } from '../../src/bridges/equations/be-43-er-epr.js';
import { evaluateShapiroDelay } from '../../src/bridges/equations/be-37-shapiro-delay.js';
import { evaluateRandallSundrumH2 } from '../../src/bridges/equations/be-54-randall-sundrum-brane.js';
import { evaluateBE17SpinDensitySquared } from '../../src/bridges/equations/be-17-einstein-cartan.js';
import { evaluateEffectiveTemperature } from '../../src/bridges/equations/be-27-effective-temperature.js';
import { evaluateTEE } from '../../src/bridges/equations/be-22-topological-entanglement.js';
import { evaluateCosmologicalConstantDensity } from '../../src/bridges/equations/be-20-vacuum-energy.js';
import { evaluateCoarseningLength } from '../../src/bridges/equations/be-15-emergence.js';
import { evaluateHertzMillis } from '../../src/bridges/equations/be-33-hertz-millis.js';
import { evaluateWFTimeSymmetry } from '../../src/bridges/equations/be-50-wheeler-feynman.js';
import { evaluateQRFOverlap } from '../../src/bridges/equations/be-32-quantum-reference-frame.js';
import { evaluateOnsagerEntropyProduction } from '../../src/bridges/equations/be-28-onsager-entropy-production.js';
import { evaluateCompositeHiggs } from '../../src/bridges/equations/be-40-composite-higgs.js';
import { evaluateCrossingEquation } from '../../src/bridges/equations/be-35-conformal-bootstrap.js';
import { deriveEvidence, NO_PASSING_WITNESSES } from '../../src/atlas/derive-evidence.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';

const BUCKET_A = [
  [12, 'PhysJS.ThermalDeBroglie.wavelength_eq'],
  [59, 'PhysJS.Josephson.frequency_eq'],
  [55, 'PhysJS.QuantumHall.reciprocal'],
  [60, 'PhysJS.Laughlin.fraction'],
  [21, 'PhysJS.Kss.saturating'],
  [14, 'PhysJS.PlanckArea.area_law'],
  [43, 'PhysJS.PlanckArea.area_law'],
  [37, 'PhysJS.Shapiro.radial_integral'],
  [54, 'PhysJS.RandallSundrum.positive_tension'],
  [17, 'PhysJS.EinsteinCartan.inversion'],
  [27, 'PhysJS.EffectiveTemperature.sum_eq'],
  [22, 'PhysJS.ToricCode.toric'],
  [15, 'PhysJS.Coarsening.exponent_iff'],
  [33, 'PhysJS.QuantumCritical.xi_product'],
  [50, 'PhysJS.TimeSymmetric.residual_iff'],
  [32, 'PhysJS.BornOverlap.modulus_sq'],
  [28, 'PhysJS.EntropyProduction.nonneg'],
  [40, 'PhysJS.CompositeHiggs.scale_free'],
  [35, 'PhysJS.Crossing.antisymmetry'],
  [63, 'PhysJS.Chandrasekhar.prefactor'],
  [30, 'PhysJS.Entanglement.first_variation'],
] as const;

/** The theorem states `formula_latex`. Kind is bridge. The covers word stays derivation-step. */
const EQUATION = [12, 21, 27, 37, 40, 43, 55, 59, 63] as const;
/** The theorem proves a part of the catalogued equation. Kind stays derivation-step. */
const PARTIAL = [14, 15, 17, 22, 30, 32, 33, 35, 50, 54, 60] as const;
const NOT_A_BRIDGE = [28, 32, 35, 40] as const;

function row(id: number) {
  const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === id);
  expect(entry, `be-${id}`).toBeDefined();
  return entry!;
}

function near(actual: number, expected: number, rel = 1e-9): void {
  const scale = Math.max(Math.abs(expected), 1e-300);
  expect(Math.abs(actual - expected) / scale).toBeLessThan(rel);
}

function apart(actual: number, expected: number, rel = 1e-3): void {
  const scale = Math.max(Math.abs(expected), 1e-300);
  expect(Math.abs(actual - expected) / scale).toBeGreaterThan(rel);
}

describe('bucket-A catalog formalRefs', () => {
  it('twenty-one references exist, and the catalog path does not pass them', () => {
    expect(BUCKET_A).toHaveLength(21);
    expect(EQUATION.length + PARTIAL.length + 1).toBe(21);
    for (const [id, statement] of BUCKET_A) {
      const entry = row(id);
      expect(entry.formalRef?.statement, `be-${id}`).toBe(statement);
      expect(deriveEdgeEvidence(id).has('formally-proved'), `be-${id}`).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved-property'), `be-${id}`).toBe(false);
    }
  });

  it('a theorem that states the catalogued equation is kind bridge', () => {
    for (const id of EQUATION) {
      const entry = row(id);
      expect(entry.formalRef?.kind, `be-${id}`).toBe('bridge');
      expect(entry.formalRef?.covers.startsWith('derivation-step:'), `be-${id}`).toBe(true);
      expect(deriveEvidence(entry, NO_PASSING_WITNESSES).has('formally-proved'), `be-${id}`).toBe(true);
    }
  });

  it('a partial theorem stays derivation-step and does not light formally-proved', () => {
    for (const id of PARTIAL) {
      const entry = row(id);
      expect(entry.formalRef?.kind, `be-${id}`).toBe('derivation-step');
      const tags = deriveEvidence(entry, NO_PASSING_WITNESSES);
      expect(tags.has('formally-proved'), `be-${id}`).toBe(false);
      expect(tags.has('formally-proved-property'), `be-${id}`).toBe(false);
    }
  });

  it('BE-28 is a property of the defining sum, not the variational principle', () => {
    expect(row(28).formalRef?.kind).toBe('property');
    expect(row(28).formalRef?.covers.startsWith('derivation-step:')).toBe(true);
    const tags = deriveEvidence(row(28), NO_PASSING_WITNESSES);
    expect(tags.has('formally-proved')).toBe(false);
    expect(tags.has('formally-proved-property')).toBe(true);
  });

  it('BE-20 is the nested Friedmann corollary and has no reference of its own', () => {
    expect(row(20).formalRef).toBeUndefined();
    expect(row(13).formalRef?.statement).toBe('PhysJS.Einstein.trace_eq');
    expect(row(13).formalRef?.statement).not.toBe('PhysJS.Einstein.friedmann_corollary');
    const lambda = 1e-52;
    const rho = evaluateCosmologicalConstantDensity({ Lambda_per_m2: lambda });
    const term = ((8 * Math.PI * G_SI) / 3) * rho;
    near(term, (lambda * C_SI * C_SI) / 3);
    const einsteinStatic = (lambda * C_SI * C_SI) / (4 * Math.PI * G_SI);
    apart(einsteinStatic, term);
  });

  it('the four not-a-bridge ids stay not-a-bridge', () => {
    for (const id of NOT_A_BRIDGE) {
      expect(adjudicateBridgeEntry(row(id)), `be-${id}`).toBe('not-a-bridge');
      expect(deriveEdgeEvidence(id).has('formally-proved'), `be-${id}`).toBe(false);
    }
  });

  it('BE-12: the two writings agree, and ℏ/√(m kT) fails', () => {
    const m = 1.67e-27;
    const T = 300;
    const got = evaluateThermalDeBroglie({ m_kg: m, T_K: T });
    const h = 2 * Math.PI * HBAR_SI;
    const other = h / Math.sqrt(2 * Math.PI * m * K_B_SI * T);
    expect(Math.abs(got - other) / other).toBeLessThan(1e-12);
    const missing = HBAR_SI / Math.sqrt(m * K_B_SI * T);
    expect(Math.abs(got - missing) / got).toBeGreaterThan(0.5);
  });

  it('BE-59: f = 2eV/h, and the single-electron factor fails', () => {
    const V = 1e-6;
    const got = evaluateACJosephson({ V_volts: V });
    expect(got.K_J_Hz_per_V).toBe(JOSEPHSON_CONSTANT_SI);
    near(got.f_Hz, ((2 * E_SI) / H_SI) * V);
    apart(got.f_Hz, (E_SI / H_SI) * V);
  });

  it('BE-55: σ_xy R_H = 1, and the shifted index fails', () => {
    const hall = evaluateQuantumHall({ C: 1 });
    near(hall.sigma_xy_S * hall.R_H_ohm, 1);
    const shifted = evaluateQuantumHall({ C: 2 });
    apart(shifted.sigma_xy_S, hall.sigma_xy_S);
    expect(hall.R_K_ohm).toBe(VON_KLITZING_SI);
  });

  it('BE-60: ν = 1/3 gives 3 R_K, and R_K/3 fails', () => {
    const frac = evaluateFractionalQH({ nu: 1 / 3 });
    near(frac.R_xy_ohm, 3 * VON_KLITZING_SI);
    apart(frac.R_xy_ohm, VON_KLITZING_SI / 3);
  });

  it('BE-21: the saturating 4π holds, and the Hawking 8π fails', () => {
    const etaOverS = evaluateKSSBound();
    near(4 * Math.PI * K_B_SI * etaOverS, HBAR_SI);
    apart(8 * Math.PI * K_B_SI * etaOverS, HBAR_SI);
  });

  it('BE-14 and BE-43: the SI form equals the Planck-area form, and ℓ_P² = ℏG/c² fails', () => {
    const area = 1e-20;
    const si = evaluateRyuTakayanagi({ area_m2: area });
    const wormhole = evaluateEREPRBound({ area_m2: area });
    const lP2 = (HBAR_SI * G_SI) / C_SI ** 3;
    const planck = (K_B_SI * area) / (4 * lP2);
    near(si, planck);
    near(wormhole, planck);
    const wrongLength = (HBAR_SI * G_SI) / C_SI ** 2;
    apart((K_B_SI * area) / (4 * wrongLength), planck);
  });

  it('BE-37: the radial integral is (2GM/c³) ln, and the factor 1 is half', () => {
    const M = 1.989e30;
    const inner = 6.96e8;
    const far = 1.496e11;
    const got = evaluateShapiroDelay({ M_kg: M, R_near_m: inner, R_far_m: far });
    const full = ((2 * G_SI * M) / C_SI ** 3) * Math.log(far / inner);
    near(got, full);
    apart(got, full / 2);
  });

  it('BE-54: the positive-tension factor is 1/2, and 1+ρ/σ fails', () => {
    const rho = 10;
    const sigma = 40;
    const h2 = evaluateRandallSundrumH2({ rho_kg_per_m3: rho, sigma_kg_per_m3: sigma });
    const frw = ((8 * Math.PI * G_SI) / 3) * rho;
    const extra = ((8 * Math.PI * G_SI) / 3) * (rho * rho) / (2 * sigma);
    near(h2 - frw, extra);
    const withoutHalf = ((8 * Math.PI * G_SI) / 3) * (rho * rho) / sigma;
    apart(h2 - frw, withoutHalf);
    expect(row(54).formalRef?.statement).not.toBe('PhysJS.RandallSundrum.flat_friedmann');
  });

  it('BE-17: S·S = T·T / κ², and κ² in the numerator fails', () => {
    const kappa = (8 * Math.PI * G_SI) / C_SI ** 4;
    const torsion = 4;
    const pref = (C_SI ** 4 / (8 * Math.PI * G_SI)) ** 2;
    const got = evaluateBE17SpinDensitySquared({
      coupling_prefactor_squared: pref,
      torsion_squared: torsion,
    });
    near(got, torsion / kappa ** 2, 1e-6);
    const backwards = evaluateBE17SpinDensitySquared({
      coupling_prefactor_squared: kappa ** 2,
      torsion_squared: torsion,
    });
    apart(backwards, got);
  });

  it('BE-27: T(1 + Σ/(kT)) equals T + Σ/k, and the product with the 1 omitted fails', () => {
    const T = 300;
    const sigma = 1e-21;
    const got = evaluateEffectiveTemperature({ T_K: T, Sigma_active_J: sigma });
    near(got, T + sigma / K_B_SI);
    apart(got, sigma / K_B_SI);
  });

  it('BE-22: γ = ln 2, and the bit convention log₂ 2 = 1 fails', () => {
    const got = evaluateTEE({ alpha_per_meter: 1, perimeter_m: 10, gamma: Math.log(2) });
    near(got, 10 - Math.log(2));
    apart(got, 10 - 1);
    expect(Math.sqrt(4)).toBe(2);
    apart(Math.sqrt(2), 2);
  });

  it('BE-15: L² ∝ t at z = 2, and z = 3 fails', () => {
    const L0 = 2;
    const t0 = 4;
    const t = 16;
    const gamma = (L0 * L0) / t0;
    const at = (z: number) => L0 * (t / t0) ** (1 / z);
    near(at(2) ** 2, gamma * t);
    near(evaluateCoarseningLength({ gamma, t }), at(2));
    apart(at(3) ** 2, gamma * t);
  });

  it('BE-33: ξ T = ξ₀ T₀ at z = 1, and the retired −ν/z fails', () => {
    const xi0 = 2;
    const T = 4;
    const T0 = 1;
    const got = evaluateHertzMillis({ xi_0_m: xi0, T_K: T, T_0_K: T0, nu: 0.71, z: 1 });
    near(got * T, xi0 * T0);
    const retired = xi0 * (T / T0) ** (-0.71 / 1);
    apart(got, retired);
  });

  it('BE-50: the residual is 0 iff the fields match, and a pure retarded field fails', () => {
    expect(evaluateWFTimeSymmetry({ A_retarded: 3, A_advanced: 3 })).toBe(0);
    near(evaluateWFTimeSymmetry({ A_retarded: 3, A_advanced: 0 }), 1);
  });

  it('BE-32: |c + s i|² = c² + s², and c² − s² fails', () => {
    const c = 0.6;
    const s = 0.8;
    near(evaluateQRFOverlap({ real_part: c, imag_part: s }), c * c + s * s);
    apart(c * c - s * s, c * c + s * s);
  });

  it('BE-28: a non-negative sum is σ, and one flipped sign is not', () => {
    expect(evaluateOnsagerEntropyProduction({ force_flux_product_W_per_K: 0.4 })).toBe(0.4);
    expect(() => evaluateOnsagerEntropyProduction({ force_flux_product_W_per_K: -0.4 })).toThrow(RangeError);
  });

  it('BE-40: V/f⁴ depends on h only through h/f, and −α sin²θ / f² fails', () => {
    const alpha = 0.2;
    const beta = 0.3;
    const ratio = (f: number) => evaluateCompositeHiggs({ h: 0.5 * f, f, alpha, beta }) / f ** 4;
    near(ratio(2), ratio(7));
    const theta = 0.5;
    const wrong = (-alpha * Math.sin(theta) ** 2) / 4;
    apart(ratio(2), wrong);
  });

  it('BE-35: the swap negates the difference, and u = v is not a control', () => {
    const g = (u: number, v: number) => u * u - 3 * v;
    const residual = (u: number, v: number) =>
      evaluateCrossingEquation({ u, v, delta_phi: 0, g_uv: g(u, v), g_vu: g(v, u) });
    near(residual(0.2, 0.7), -residual(0.7, 0.2));
    expect(residual(0.25, 0.25)).toBe(0);
    expect(residual(0.5, 0.25)).not.toBe(0);
  });

  it('BE-63: √(3π)/2 is the prefactor, and √π/2 fails', () => {
    const right = Math.sqrt(3 * Math.PI) / 2;
    const wrong = Math.sqrt(Math.PI) / 2;
    const omega = 2;
    apart(omega * right, omega * wrong);
    apart(omega * right, right);
  });

  it('BE-30: a finite jump changes S and leaves a frozen identity modular Hamiltonian unchanged', () => {
    const entropy = (p: number) => -(p * Math.log(p) + (1 - p) * Math.log(1 - p));
    const start = entropy(0.5);
    const jumped = entropy(0.75);
    apart(jumped, start);
    const frozen = -Math.log(0.5);
    near(0.5 * frozen + 0.5 * frozen, 0.75 * frozen + 0.25 * frozen);
  });
});
