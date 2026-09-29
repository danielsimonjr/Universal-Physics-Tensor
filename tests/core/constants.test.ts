/**
 * v0.5.1 Task 0 — Constants canonicalization tests.
 *
 * Asserts each flat constant exported from `src/core/constants.ts` matches
 * its CODATA 2018 / SI-defined value. Defined-exact SI values use `toBe`
 * (bit-exact); measured constants use `toBeCloseTo` at appropriate precision.
 *
 * @module tests/core/constants
 */
import { describe, it, expect } from 'vitest';
import {
  C_SI,
  G_SI,
  H_SI,
  HBAR_SI,
  K_B_SI,
  E_SI,
  ALPHA,
  M_P_SI,
  L_P_SI,
  T_P_SI,
  H0_SI,
} from '../../src/core/constants.js';

describe('Flat CODATA / SI constants — src/core/constants.ts', () => {
  // ── Defined-exact SI values (1983/2019 SI redefinition) ──────────────────
  it('C_SI is the exact SI definition of the speed of light (m/s)', () => {
    expect(C_SI).toBe(299792458);
  });

  it('H_SI is the exact SI-defined Planck constant (J·s)', () => {
    expect(H_SI).toBe(6.62607015e-34);
  });

  it('K_B_SI is the exact SI-defined Boltzmann constant (J/K)', () => {
    expect(K_B_SI).toBe(1.380649e-23);
  });

  it('E_SI is the exact SI-defined elementary charge (C)', () => {
    expect(E_SI).toBe(1.602176634e-19);
  });

  // ── Measured constants (CODATA 2018 best values) ─────────────────────────
  it('G_SI matches CODATA 2018 gravitational constant', () => {
    expect(G_SI).toBeCloseTo(6.67430e-11, 16);
  });

  it('HBAR_SI is exactly H_SI / (2π)', () => {
    expect(HBAR_SI).toBe(H_SI / (2 * Math.PI));
  });

  it('ALPHA matches CODATA 2018 fine-structure constant', () => {
    expect(ALPHA).toBeCloseTo(7.2973525693e-3, 12);
  });

  it('M_P_SI matches Planck mass (CODATA 2018)', () => {
    expect(M_P_SI).toBeCloseTo(2.176434e-8, 14);
  });

  it('L_P_SI matches Planck length (CODATA 2018)', () => {
    expect(L_P_SI).toBeCloseTo(1.616255e-35, 40);
  });

  it('T_P_SI matches Planck time (CODATA 2018)', () => {
    expect(T_P_SI).toBeCloseTo(5.391247e-44, 49);
  });

  it('H0_SI matches Planck 2018 Hubble parameter (s⁻¹)', () => {
    expect(H0_SI).toBeCloseTo(67.4e3 / 3.0857e22, 25);
  });

  // ── Cross-consistency checks ─────────────────────────────────────────────
  it('HBAR_SI differs from the truncated CODATA display by a relative 6.127e-10', () => {
    const display = 1.054571817e-34;
    expect(Math.abs(HBAR_SI - display) / HBAR_SI).toBeCloseTo(6.127e-10, 12);
  });
});
