/**
 * Sanity lemmas for the nine counted catalog `formalRef`s.
 *
 * Each block instantiates the top-level PhysJS statement on a known case and
 * shows the negative control fails. The nested theorems are not these
 * references. A catalog reference does not light `formally-proved`.
 */

import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { C_SI, E_SI, G_SI, K_B_SI } from '../../src/core/constants.js';
import { evaluateEddingtonLuminosity, THOMSON_CROSS_SECTION_SI } from '../../src/bridges/be64-eddington-luminosity.js';
import { computeB0 } from '../../src/bridges/equations/be-53-yang-mills-beta.js';
import { evaluateJohnsonNyquist } from '../../src/bridges/be58-johnson-nyquist.js';
import { evaluateMONDForce } from '../../src/bridges/equations/be-38-mond.js';
import { evaluateEinsteinTrace } from '../../src/bridges/equations/be-13-einstein-trace.js';
import { evaluateKibbleZurek } from '../../src/bridges/equations/be-34-kibble-zurek.js';
import { evaluateJeansMass } from '../../src/bridges/be65-jeans-mass.js';
import { evaluateGravitationalLensing } from '../../src/bridges/gravitational-lensing.js';
import { LORENZ_NUMBER_SI } from '../../src/bridges/be61-wiedemann-franz.js';
import { deriveEdgeEvidence } from '../../src/composition/graph-viz.js';

const COUNTED = [
  [64, 'PhysJS.Eddington.balance_iff'],
  [53, 'PhysJS.YangMills.b0_pos_iff_nf_le'],
  [58, 'PhysJS.JohnsonNyquist.tendsto_classical'],
  [38, 'PhysJS.Mond.tendsto_nu_limits'],
  [13, 'PhysJS.Einstein.trace_eq'],
  [34, 'PhysJS.KibbleZurek.exponent'],
  [65, 'PhysJS.Jeans.mass_eq'],
  [51, 'PhysJS.Deflection.line_integral'],
  [61, 'PhysJS.Sommerfeld.integral_eq'],
] as const;

function row(id: number) {
  const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === id);
  expect(entry, `be-${id}`).toBeDefined();
  return entry!;
}

describe('catalog formalRef sanity lemmas', () => {
  it('the nine counted references are sanity-lemmas and do not tag the row', () => {
    expect(COUNTED.map(([id]) => id)).toEqual([64, 53, 58, 38, 13, 34, 65, 51, 61]);
    for (const [id, statement] of COUNTED) {
      const entry = row(id);
      expect(entry.formalRef?.fidelity).toBe('sanity-lemmas');
      expect(entry.formalRef?.statement).toBe(statement);
      expect(entry.formalRef?.covers.startsWith('property')).toBe(false);
      expect(entry.formalRef?.covers.startsWith('cross-check')).toBe(false);
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(false);
    }
  });

  it('BE-64: the r² balance holds, and a factor of two does not', () => {
    expect(row(64).formalRef?.statement).toBe('PhysJS.Eddington.balance_iff');
    const mp = 1.67262192369e-27;
    const M = 2e30;
    const r = 3;
    const L = evaluateEddingtonLuminosity({ M_kg: M }).L_Edd_W;
    const left = (L * THOMSON_CROSS_SECTION_SI) / (4 * Math.PI * r * r * C_SI);
    const right = (G_SI * M * mp) / (r * r);
    expect(Math.abs(left - right) / right).toBeLessThan(1e-12);
    expect(Math.abs(left - 2 * right) / right).toBeGreaterThan(0.5);
  });

  it('BE-53: b₀ > 0 iff N_f ≤ 16, and N_f = 17 fails', () => {
    expect(row(53).formalRef?.statement).toBe('PhysJS.YangMills.b0_pos_iff_nf_le');
    expect(row(53).formalRef?.statement).not.toBe('PhysJS.YangMills.alphaRun_hasDerivAt');
    for (let n = 0; n <= 16; n += 1) expect(computeB0(3, n)).toBeGreaterThan(0);
    expect(computeB0(3, 16)).toBeCloseTo(1 / 3, 12);
    expect(computeB0(3, 17)).toBeCloseTo(-1 / 3, 12);
    expect(computeB0(3, 17)).toBeLessThan(0);
  });

  it('BE-58: the quantum parent tends to 4 kT R, and a +1 denominator does not', () => {
    expect(row(58).formalRef?.statement).toBe('PhysJS.JohnsonNyquist.tendsto_classical');
    const R = 1000;
    const T = 300;
    const classical = evaluateJohnsonNyquist({ T_K: T, R_ohm: R }).S_V_V2_per_Hz;
    expect(classical).toBe(4 * K_B_SI * T * R);
    const hbar = 1.054571817e-34;
    const x = 1e-6;
    const omega = (x * K_B_SI * T) / hbar;
    const quantum = (4 * R * hbar * omega) / (Math.exp(x) - 1);
    const wrong = (4 * R * hbar * omega) / (Math.exp(x) + 1);
    expect(Math.abs(quantum - classical) / classical).toBeLessThan(1e-6);
    expect(Math.abs(wrong - classical) / classical).toBeGreaterThan(0.5);
  });

  it('BE-38: ν → 1 and ν √z → 1, and ν √z → √2 fails', () => {
    expect(row(38).formalRef?.statement).toBe('PhysJS.Mond.tendsto_nu_limits');
    expect(row(38).formalRef?.statement).not.toBe('PhysJS.Mond.mu_inversion');
    const m = 2;
    const a0 = 1.2e-10;
    const newtonian = evaluateMONDForce({ F_N_newton: 1, m_kg: m, a_0_m_per_s2: a0 });
    expect(Math.abs(newtonian - 1)).toBeLessThan(1e-6);
    const z = 1e-8;
    const force = z * m * a0;
    const deep = evaluateMONDForce({ F_N_newton: force, m_kg: m, a_0_m_per_s2: a0 });
    const scale = Math.sqrt(m * force * a0);
    expect(Math.abs(deep / scale - 1)).toBeLessThan(1e-6);
    const nuSqrtZ = deep / scale;
    expect(Math.abs(nuSqrtZ - Math.SQRT2)).toBeGreaterThan(0.4);
  });

  it('BE-13: R = 4Λ − κ T with κ = 8πG/c⁴, and twice κ does not match', () => {
    expect(row(13).formalRef?.statement).toBe('PhysJS.Einstein.trace_eq');
    expect(row(13).formalRef?.statement).not.toBe('PhysJS.Einstein.vacuum_density');
    expect(row(20).formalRef).toBeUndefined();
    const lambda = 1.2e-52;
    const trace = 3.4e-10;
    const kappa = (8 * Math.PI * G_SI) / C_SI ** 4;
    const traced = evaluateEinsteinTrace({ Lambda_per_m2: lambda, T_trace_J_per_m3: trace });
    const stated = 4 * lambda - kappa * trace;
    expect(Math.abs(traced - stated) / Math.abs(stated)).toBeLessThan(1e-12);
    expect(Math.abs(traced - (4 * lambda - 2 * kappa * trace)) / Math.abs(stated)).toBeGreaterThan(1e-6);
  });

  it('BE-34: the freeze-out power holds, and omitting the 1 fails', () => {
    expect(row(34).formalRef?.statement).toBe('PhysJS.KibbleZurek.exponent');
    const tau0 = 2;
    const tauQ = 5;
    const z = 1.5;
    const nu = 0.7;
    const d = 3;
    const xi0 = 4;
    const eps = (tau0 / tauQ) ** (1 / (1 + z * nu));
    expect(tau0 * eps ** (-z * nu)).toBeCloseTo(eps * tauQ, 10);
    const power = (xi0 * eps ** (-nu)) ** (-d);
    const withOne = xi0 ** -d * (tauQ / tau0) ** ((-d * nu) / (1 + z * nu));
    const omitted = xi0 ** -d * (tauQ / tau0) ** ((-d * nu) / (z * nu));
    expect(power).toBeCloseTo(withOne, 8);
    expect(Math.abs(power - omitted) / Math.abs(power)).toBeGreaterThan(0.1);
    const density = evaluateKibbleZurek({
      tau_Q: tauQ,
      tau_0: tau0,
      d,
      nu,
      z,
      m_defect: 0,
      T_reh: 1,
    });
    expect(density).toBeCloseTo((tauQ / tau0) ** ((-d * nu) / (1 + z * nu)), 10);
  });

  it('BE-65: the virial factor 5 gives the encoded mass, and factor 3 does not', () => {
    expect(row(65).formalRef?.statement).toBe('PhysJS.Jeans.mass_eq');
    const k = 1.2;
    const T = 3;
    const G = 0.4;
    const mu = 2;
    const mU = 0.5;
    const rho = 1.5;
    const thermal = (5 * k * T) / (G * mu * mU);
    const density = 3 / (4 * Math.PI * rho);
    const R = Math.sqrt(thermal * density);
    const M = (4 * Math.PI * R ** 3 * rho) / 3;
    const virialLeft = (3 * M * k * T) / (mu * mU);
    const virialRight = (3 * G * M * M) / (5 * R);
    expect(Math.abs(virialLeft - virialRight) / virialRight).toBeLessThan(1e-12);
    const encoded = thermal ** 1.5 * density ** 0.5;
    expect(Math.abs(M - encoded) / encoded).toBeLessThan(1e-12);
    const factorThree = ((3 * k * T) / (G * mu * mU)) ** 1.5 * density ** 0.5;
    expect(Math.abs(factorThree - encoded) / encoded).toBeGreaterThan(0.4);
    const cloud = evaluateJeansMass({ T_K: 10, rho_kg_per_m3: 1e-18, mu: 2.3 });
    const stated =
      ((5 * K_B_SI * 10) / (G_SI * 2.3 * 1.6605390666e-27)) ** 1.5 *
      (3 / (4 * Math.PI * 1e-18)) ** 0.5;
    expect(Math.abs(cloud.M_J_kg - stated) / stated).toBeLessThan(1e-12);
  });

  it('BE-51: the line integral at γ = 1 is the encoded angle, and γ = 0 is half', () => {
    expect(row(51).formalRef?.statement).toBe('PhysJS.Deflection.line_integral');
    const G = G_SI;
    const M = 1.989e30;
    const b = 6.96e8;
    const steps = 4000;
    const dTheta = Math.PI / steps;
    let integral = 0;
    for (let i = 0; i < steps; i += 1) {
      const theta = -Math.PI / 2 + (i + 0.5) * dTheta;
      const cosine = Math.cos(theta);
      const z = b * Math.tan(theta);
      const dz = b / (cosine * cosine);
      integral += ((G * M * b) / (b * b + z * z) ** 1.5) * dz;
    }
    integral *= dTheta;
    const closed = (2 * G * M) / b;
    expect(Math.abs(integral - closed) / closed).toBeLessThan(1e-6);
    const gammaOne = ((1 + 1) / (C_SI * C_SI)) * integral;
    const encoded = evaluateGravitationalLensing({ M_kg: M, b_m: b }).alpha_rad;
    expect(Math.abs(gammaOne - encoded) / encoded).toBeLessThan(1e-6);
    expect(Math.abs(encoded - (4 * G * M) / (b * C_SI * C_SI)) / encoded).toBeLessThan(1e-12);
    const gammaZero = ((1 + 0) / (C_SI * C_SI)) * integral;
    expect(Math.abs(gammaZero - encoded / 2) / encoded).toBeLessThan(1e-6);
    expect(Math.abs(gammaZero - encoded) / encoded).toBeGreaterThan(0.4);
  });

  it('BE-61: the Sommerfeld integral is π²/3, and the half-line is not', () => {
    expect(row(61).formalRef?.statement).toBe('PhysJS.Sommerfeld.integral_eq');
    const integrand = (x: number) => {
      const exp = Math.exp(x);
      return (x * x * exp) / (1 + exp) ** 2;
    };
    const trap = (a: number, b: number, n: number) => {
      const h = (b - a) / n;
      let sum = 0.5 * integrand(a) + 0.5 * integrand(b);
      for (let i = 1; i < n; i += 1) sum += integrand(a + i * h);
      return sum * h;
    };
    const full = trap(-30, 30, 4000);
    const half = trap(0, 30, 2000);
    const pi2over3 = Math.PI ** 2 / 3;
    expect(Math.abs(full - pi2over3) / pi2over3).toBeLessThan(1e-9);
    expect(Math.abs(half - pi2over3 / 2) / (pi2over3 / 2)).toBeLessThan(1e-9);
    expect(Math.abs(half - pi2over3) / pi2over3).toBeGreaterThan(0.4);
    expect(LORENZ_NUMBER_SI).toBe((pi2over3) * (K_B_SI / E_SI) ** 2);
    const halfLineLorenz = (Math.PI ** 2 / 6) * (K_B_SI / E_SI) ** 2;
    expect(Math.abs(halfLineLorenz - LORENZ_NUMBER_SI) / LORENZ_NUMBER_SI).toBeGreaterThan(0.4);
  });
});
