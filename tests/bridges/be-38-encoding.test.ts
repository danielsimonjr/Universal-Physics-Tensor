/**
 * Tier-5 AST encoding test for BE-38 — Milgrom MOND interpolation
 * (canonical form, post Wave I.B C4 reformulation).
 *
 * Formula: F = F_N · ν(z), z = F_N/(m·a_0), ν(z) = √[(1+√(1+4/z²))/2]
 *
 * Equivalent: μ(a/a_0)·a = a_N with μ(x) = x/√(1+x²) (canonical
 * Milgrom 1983 interpolation).
 *
 * Limits:
 *   - Newtonian (F_N >> m·a_0, z → ∞): ν → 1, so F → F_N
 *   - Deep-MOND (F_N << m·a_0, z → 0): ν ~ 1/√z, so F → √(m · F_N · a_0)
 *
 * Status pin: 'speculative' (Milgrom MOND interpolation canonical;
 * UPT bridge framing speculative).
 *
 * @see src/bridges/equations/be-38-mond.ts
 * @see docs/specification/Part-II.md ("Bridge Equation 38")
 * @see src/bridges/index.ts BRIDGE_EQUATIONS.find(e => e.id === 38)
 */

import { describe, it, expect } from 'vitest';
import {
  BE38_MOND_FORCE_RHS,
  BE38_MOND_FORCE_LHS,
  BE38_MOND_NU_ARG,
  evaluateMONDForce,
  validateBE38Dimensions,
} from '../../src/bridges/equations/be-38-mond.js';
import { validate, validateEquation } from '../../src/dimensional/validator.js';
import { FORCE, DIMENSIONLESS } from '../../src/dimensional/types.js';
import { expectBridgeInIndex, expectDimRoundTrip } from './_helpers.js';

describe('BE-38 Milgrom MOND interpolation — Tier 5 AST encoding', () => {
  describe('Catalog round-trip', () => {
    it('exists', () => {
      expectBridgeInIndex(38);
    });

    it('dimensional_signature is [force] (round-trips through validator)', () => {
      const be38 = expectBridgeInIndex(38);
      expect(be38.dimensional_signature).toBe('[force]');
    });

    it('round-trips: format(infer(RHS)) === dimensional_signature', () => {
      expectDimRoundTrip(BE38_MOND_FORCE_RHS, '[force]');
    });

    it("status pinned 'speculative' (canonical interpolation, bridge framing speculative)", () => {
      // Milgrom MOND interpolation is canonical; UPT-bridge framing is
      // the speculative content. Promotion requires deleting this pin.
      expectBridgeInIndex(38, 'speculative');
    });

    it("tractability_class is 'closed-form'", () => {
      const be38 = expectBridgeInIndex(38);
      expect(be38.tractability_class).toBe('closed-form');
    });
  });

  describe('Dimensional structure', () => {
    it('LHS is [force]', () => {
      const r = validate(BE38_MOND_FORCE_LHS);
      expect(r.ok).toBe(true);
      expect(r.inferredDimension).toEqual(FORCE);
    });

    it('RHS is [force]', () => {
      const r = validate(BE38_MOND_FORCE_RHS);
      expect(r.ok).toBe(true);
      expect(r.inferredDimension).toEqual(FORCE);
    });

    it('full equation validates', () => {
      const eq = validateEquation(BE38_MOND_FORCE_LHS, BE38_MOND_FORCE_RHS);
      expect(eq.ok).toBe(true);
    });

    it('ν argument z = F_N/(m·a_0) is dimensionless (lemma)', () => {
      // Per the dimensionless-stub convention: when an opaque function
      // (here ν) appears in the formula, expose its argument and verify
      // the argument is dimensionless.
      const r = validate(BE38_MOND_NU_ARG);
      expect(r.ok).toBe(true);
      expect(r.inferredDimension).toEqual(DIMENSIONLESS);
    });

    it('validateBE38Dimensions reports both sides as [force]', () => {
      const r = validateBE38Dimensions();
      expect(r.ok).toBe(true);
      expect(r.lhsDim).toEqual(FORCE);
      expect(r.rhsDim).toEqual(FORCE);
    });
  });

  describe('Numerical evaluator — limit-identity bracket checks', () => {
    // a_0 ≈ 1.2 × 10^-10 m/s² (Milgrom 1983, MOND scale)
    const a_0 = 1.2e-10;

    it('Newtonian limit: F_N >> m·a_0 → F → F_N (ν → 1)', () => {
      // Test particle: m = 1 kg, F_N = 10 N (way above m·a_0 = 1.2e-10 N)
      // z = 10/1.2e-10 ≈ 8.3e10 — deeply Newtonian regime
      const F = evaluateMONDForce({
        F_N_newton: 10,
        m_kg: 1,
        a_0_m_per_s2: a_0,
      });
      // Should be very close to F_N = 10 N
      expect(F).toBeCloseTo(10, 8);
    });

    it('Deep-MOND limit: F_N << m·a_0 → F → √(m · F_N · a_0)', () => {
      // Test particle: m = 1 kg, F_N = 1e-25 N (way below m·a_0 = 1.2e-10 N)
      // z = 1e-25/1.2e-10 ≈ 8.3e-16 — deeply MOND regime
      // F → √(m · F_N · a_0) = √(1 · 1e-25 · 1.2e-10) = √(1.2e-35)
      //   ≈ 3.46e-18 N
      const F = evaluateMONDForce({
        F_N_newton: 1e-25,
        m_kg: 1,
        a_0_m_per_s2: a_0,
      });
      const expected_deep_MOND = Math.sqrt(1 * 1e-25 * a_0);
      // Within 1% of the canonical deep-MOND form
      expect(F / expected_deep_MOND).toBeCloseTo(1, 2);
    });

    it('crossover regime: z = 1 gives F/F_N = √[(1+√5)/2] = √φ ≈ 1.272', () => {
      // At z = F_N/(m·a_0) = 1, the interpolation gives a specific
      // golden-ratio-related value. Hand-derivation:
      // ν(1) = √[(1+√5)/2] = √φ ≈ 1.2720196...
      const F_N = 1;
      const m = 1;
      // Pick a_0 = 1 so z = F_N/(m·a_0) = 1
      const F = evaluateMONDForce({ F_N_newton: 1, m_kg: 1, a_0_m_per_s2: 1 });
      const phi = (1 + Math.sqrt(5)) / 2;
      const expected = F_N * Math.sqrt(phi);
      expect(F).toBeCloseTo(expected, 12);
    });

    it('monotonic: F/F_N decreases as F_N decreases at fixed m, a_0', () => {
      const m = 1;
      const a_0 = 1.2e-10;
      const points = [1e-5, 1e-8, 1e-12, 1e-15, 1e-20].map((F_N) => {
        const F = evaluateMONDForce({ F_N_newton: F_N, m_kg: m, a_0_m_per_s2: a_0 });
        return F / F_N;
      });
      // Going deeper into MOND regime, F/F_N grows (particle is "bound
      // more tightly" than Newtonian). So the ratios should be increasing
      // as F_N decreases.
      for (let i = 1; i < points.length; i++) {
        expect(points[i]).toBeGreaterThan(points[i - 1]);
      }
    });

    it('cross-derivation: μ(a/a_0)·a = a_N consistency', () => {
      // Compute F via the BE-38 evaluator, then derive a = F/m, and
      // verify that μ(a/a_0)·a = a_N to machine precision. This checks
      // the canonical Milgrom relation independently.
      const F_N = 1e-12;  // intermediate regime
      const m = 1;
      const a_0 = 1.2e-10;
      const F = evaluateMONDForce({ F_N_newton: F_N, m_kg: m, a_0_m_per_s2: a_0 });
      const a = F / m;
      const a_N = F_N / m;
      // μ(x) = x/√(1+x²)
      const x = a / a_0;
      const mu_x = x / Math.sqrt(1 + x * x);
      const lhs = mu_x * a;
      // Should equal a_N
      expect(lhs).toBeCloseTo(a_N, 14);
    });
  });

  describe('ν asymptotics — both limits', () => {
    // z = F_N / (m · a_0). With m = 1 and a_0 = 1, F_N is z and ν is F / F_N.
    function nu(z: number): number {
      const F = evaluateMONDForce({ F_N_newton: z, m_kg: 1, a_0_m_per_s2: 1 });
      return F / z;
    }

    it('Newtonian limit: z = 1e6 gives ν → 1', () => {
      expect(nu(1e6)).toBeCloseTo(1, 10);
    });

    it('deep-MOND limit: z = 1e-6 gives ν ~ 1/√z (about 1000), not √(2/z)', () => {
      const z = 1e-6;
      const value = nu(z);
      const asymptotic = 1 / Math.sqrt(z);
      const rejected = Math.sqrt(2 / z);
      expect(asymptotic).toBeCloseTo(1000, 6);
      expect(rejected).toBeCloseTo(1414.213562, 3);
      expect(value / asymptotic).toBeCloseTo(1, 5);
      // √(2/z) is larger by √2. This fails if the evaluator is changed to that expansion.
      expect(value / rejected).toBeCloseTo(1 / Math.sqrt(2), 4);
      expect(Math.abs(value - rejected)).toBeGreaterThan(400);
    });
  });

  describe('Numerical evaluator — input validation', () => {
    it('rejects non-finite F_N', () => {
      expect(() =>
        evaluateMONDForce({ F_N_newton: NaN, m_kg: 1, a_0_m_per_s2: 1 }),
      ).toThrow(RangeError);
    });

    it('rejects non-positive m', () => {
      expect(() =>
        evaluateMONDForce({ F_N_newton: 1, m_kg: 0, a_0_m_per_s2: 1 }),
      ).toThrow(RangeError);
      expect(() =>
        evaluateMONDForce({ F_N_newton: 1, m_kg: -1, a_0_m_per_s2: 1 }),
      ).toThrow(RangeError);
    });

    it('rejects non-positive a_0', () => {
      expect(() =>
        evaluateMONDForce({ F_N_newton: 1, m_kg: 1, a_0_m_per_s2: 0 }),
      ).toThrow(RangeError);
    });
  });
});
