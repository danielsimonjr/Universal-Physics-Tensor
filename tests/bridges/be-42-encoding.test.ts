/**
 * Tier-5 AST encoding test for BE-42 — Hawking temperature
 * (canonical 1975 derivation, post Wave Y reformulation).
 *
 * Formula: T_H = ℏ c³ / (8π G M k_B).
 *
 * @see src/bridges/equations/be-42-hawking-temperature.ts
 */

import { describe, it, expect } from 'vitest';
import {
  BE42_HAWKING_TEMPERATURE_RHS,
  BE42_HAWKING_TEMPERATURE_LHS,
  evaluateHawkingTemperature,
  validateBE42Dimensions,
} from '../../src/bridges/equations/be-42-hawking-temperature.js';
import { validate, validateEquation } from '../../src/dimensional/validator.js';
import { TEMPERATURE } from '../../src/dimensional/types.js';
import { PhysicalConstants } from '../../src/core/types.js';
import { expectBridgeInIndex, expectDimRoundTrip } from './_helpers.js';

describe('BE-42 Hawking temperature — Tier 5 AST encoding', () => {
  describe('Catalog round-trip', () => {
    it('exists', () => {
      expectBridgeInIndex(42);
    });

    it("dimensional_signature is '[temperature]'", () => {
      const be42 = expectBridgeInIndex(42);
      expect(be42.dimensional_signature).toBe('[temperature]');
    });

    it('round-trips: format(infer(RHS)) === dimensional_signature', () => {
      expectDimRoundTrip(BE42_HAWKING_TEMPERATURE_RHS, '[temperature]');
    });

    it("status pinned 'highly-speculative' (firewall framing remains)", () => {
      expectBridgeInIndex(42, 'highly-speculative');
    });

    it('formula_latex contains the canonical T_H = ℏc³/(8πGMk_B) form', () => {
      const be42 = expectBridgeInIndex(42);
      expect(be42.formula_latex).toMatch(/T_H/);
      expect(be42.formula_latex).toMatch(/\\hbar c\^3/);
      expect(be42.formula_latex).toMatch(/8\\pi G M k_B/);
    });

    it('formula_latex no longer carries the firewall-superposition Hilbert-space decomposition', () => {
      const be42 = expectBridgeInIndex(42);
      const f = be42.formula_latex;
      expect(f).not.toMatch(/\\psi/);
      expect(f).not.toMatch(/firewall/);
      expect(f).not.toMatch(/smooth/);
    });

    it('references include canonical Hawking 1975', () => {
      const be42 = expectBridgeInIndex(42);
      const refs = be42.references.join(' | ');
      expect(refs).toMatch(/Hawking 1975/);
      expect(refs).toMatch(/43:199/);
    });

    it('notes mention Wave Y reformulation', () => {
      const be42 = expectBridgeInIndex(42);
      expect(be42.notes).toMatch(/Wave Y/);
      expect(be42.notes).toMatch(/2026-05-07/);
    });
  });

  describe('Dimensional structure', () => {
    it('LHS is [temperature]', () => {
      const r = validate(BE42_HAWKING_TEMPERATURE_LHS);
      expect(r.ok).toBe(true);
      expect(r.inferredDimension).toEqual(TEMPERATURE);
    });

    it('RHS is [temperature]', () => {
      const r = validate(BE42_HAWKING_TEMPERATURE_RHS);
      expect(r.ok).toBe(true);
      expect(r.inferredDimension).toEqual(TEMPERATURE);
    });

    it('full equation validates', () => {
      const eq = validateEquation(BE42_HAWKING_TEMPERATURE_LHS, BE42_HAWKING_TEMPERATURE_RHS);
      expect(eq.ok).toBe(true);
    });

    it('validateBE42Dimensions reports both sides as [temperature]', () => {
      const r = validateBE42Dimensions();
      expect(r.ok).toBe(true);
      expect(r.lhsDim).toEqual(TEMPERATURE);
      expect(r.rhsDim).toEqual(TEMPERATURE);
    });
  });

  describe('Numerical evaluator — bracket checks', () => {
    const M_solar = 1.989e30; // kg

    it('solar-mass BH gives T_H ≈ 6.17e-8 K (textbook Hawking temperature)', () => {
      const T = evaluateHawkingTemperature({ M_kg: M_solar });
      expect(T).toBeGreaterThan(6.0e-8);
      expect(T).toBeLessThan(6.3e-8);
    });

    it('inverse mass scaling: T_H(2M) = T_H(M) / 2', () => {
      const T1 = evaluateHawkingTemperature({ M_kg: M_solar });
      const T2 = evaluateHawkingTemperature({ M_kg: 2 * M_solar });
      expect(T1 / T2).toBeCloseTo(2, 12);
    });

    it('inverse mass scaling for arbitrary factor: T_H(αM) = T_H(M)/α', () => {
      const M_ref = 1e20;
      const T_ref = evaluateHawkingTemperature({ M_kg: M_ref });
      for (const alpha of [0.1, 5, 100, 1e6]) {
        const T_alpha = evaluateHawkingTemperature({ M_kg: alpha * M_ref });
        expect(T_alpha * alpha).toBeCloseTo(T_ref, 6);
      }
    });

    it('Planck-mass BH gives T_H ≈ T_Planck/(8π)', () => {
      const { mP, hbar, c, kB } = PhysicalConstants;
      const T_planck_temp = Math.sqrt((hbar * c * c * c * c * c) / (PhysicalConstants.G * kB * kB));
      const T = evaluateHawkingTemperature({ M_kg: mP });
      // T_H(m_P) = ℏc³/(8π G m_P k_B). T_Planck = √(ℏc⁵/(G k_B²)).
      // T_H(m_P)/T_Planck = (1/(8π)) · ℏc³/(G m_P k_B) · √(G k_B²/(ℏc⁵)) = 1/(8π).
      expect(T / T_planck_temp).toBeCloseTo(1 / (8 * Math.PI), 6);
    });

    it('supermassive BH (M ~ 10⁹ M_sol) gives T_H ~ 10⁻¹⁷ K', () => {
      const T = evaluateHawkingTemperature({ M_kg: 1e9 * M_solar });
      expect(T).toBeLessThan(1e-16);
      expect(T).toBeGreaterThan(1e-18);
    });

    it('tiny-mass BH gives a large T_H (Hawking-evaporation regime)', () => {
      // Mini-BH at 10^12 kg → T_H ≈ 10^11 K (textbook hot-evaporation regime).
      const T = evaluateHawkingTemperature({ M_kg: 1e12 });
      expect(T).toBeGreaterThan(1e10);
      expect(T).toBeLessThan(1e12);
    });

    it('algebraic identity: T_H = ℏc³/(8π G M k_B)', () => {
      const { hbar, c, G, kB } = PhysicalConstants;
      const M = 1e25;
      const T = evaluateHawkingTemperature({ M_kg: M });
      const expected = (hbar * c * c * c) / (8 * Math.PI * G * M * kB);
      expect(T).toBeCloseTo(expected, 25);
    });

    it('positivity for any positive mass', () => {
      for (const M of [1, 1e10, 1e20, 1e30, 1e40]) {
        const T = evaluateHawkingTemperature({ M_kg: M });
        expect(T).toBeGreaterThan(0);
        expect(Number.isFinite(T)).toBe(true);
      }
    });
  });

  describe('Input validation', () => {
    it('rejects zero or negative mass', () => {
      expect(() => evaluateHawkingTemperature({ M_kg: 0 })).toThrow(RangeError);
      expect(() => evaluateHawkingTemperature({ M_kg: -1 })).toThrow(RangeError);
    });

    it('rejects non-finite mass', () => {
      expect(() => evaluateHawkingTemperature({ M_kg: Number.NaN })).toThrow(RangeError);
      expect(() => evaluateHawkingTemperature({ M_kg: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    });

    it('rejects a finite mass whose temperature is not finite', () => {
      expect(() => evaluateHawkingTemperature({ M_kg: 1e-300 })).toThrow(RangeError);
      expect(() => evaluateHawkingTemperature({ M_kg: 1e-300 })).toThrow(/not a finite number/);
      const finite = evaluateHawkingTemperature({ M_kg: 1e-200 });
      expect(Number.isFinite(finite)).toBe(true);
      expect(JSON.stringify(finite)).not.toBe('null');
    });
  });
});
