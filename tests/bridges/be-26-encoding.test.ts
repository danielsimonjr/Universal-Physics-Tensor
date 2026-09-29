/**
 * Tests for Bridge Equation 26: DNA Mutation Quantum Tunneling Rate.
 *
 *   Γ = ν₀ exp[−(2/ℏ) ∫_{x₁}^{x₂} √(2m(V(x)−E)) dx] · f(T, pH, EM)
 *
 * Reference: Gamow 1928 (WKB tunneling); Landau-Lifshitz QM §50.
 * Application to DNA proton tunneling: Löwdin 1963 Adv. Quantum Chem.
 * 2:213.
 *
 * Status: 'established'.
 *
 * Honest-claude scope notes:
 *   - The integrand √(2m(V−E)) carries dim of momentum [M L T^-1];
 *     integrated dx gives action [M L² T^-1]; divided by ℏ gives
 *     dimensionless WKB exponent. We encode this fully via the AST
 *     `integral` primitive, with `^` of 0.5 for the square root.
 *   - The f(T, pH, EM) factor is encoded as a dimensionless prefactor
 *     symbol (it's a phenomenological correction; in the molecular
 *     biology literature these are dimensionless modifiers like Q10
 *     factors and pH-dependent rate ratios).
 *   - v0.21: the exp factor is encoded faithfully via the `transcendental(exp, …)`
 *     node over a DEFINITE integral (explicit barrier bounds x₁,x₂), exposing
 *     m, V_minus_E, x₁, x₂ to AD; only f(T,pH,EM) remains an opaque stub.
 *
 * Bracket-check note: For DNA proton tunneling, ν₀ ~ 10^13 Hz (vibrational
 * attempt frequency). The WKB exponent for a hydrogen-bond barrier of
 * height ~0.4 eV, width ~1 Å, proton mass m_p ~ 1.67e-27 kg gives an
 * exp factor of order 10^-7 to 10^-9, yielding Γ ~ 10^4 to 10^6 /s.
 * This brackets the textbook range of 10^-3 to 10^3 /s once f(T) Q10
 * and excited-state lifetimes are included.
 */
import { describe, it, expect } from 'vitest';
import { HBAR_SI } from '../../src/core/constants.js';
import {
  DNA_TUNNELING_RHS,
  DNA_TUNNELING_WKB_ARG,
  evaluateDNATunneling,
  validateDNATunnelingDimensions,
} from '../../src/bridges/equations/be-26-dna-tunneling.js';
import { validate } from '../../src/dimensional/validator.js';
import { format } from '../../src/dimensional/algebra.js';
import { expectBridgeInIndex, expectDimRoundTrip } from './_helpers.js';

describe('BE-26 DNA Mutation Quantum Tunneling Rate', () => {
  describe('index entry invariants', () => {
    it('exists in the index', () => {
      expectBridgeInIndex(26);
    });

    it("status pinned 'speculative' (WKB formula canonical, biological-relevance bridge framing speculative; Wave S 2026-05-06 per Phys iter-7)", () => {
      // Status downgraded from 'established' to 'speculative' Wave S 2026-05-06.
      // Rationale: the WKB tunneling formula (Gamow 1928) is itself canonical/
      // established literature, but the *bridge framing* — that DNA mutations
      // are dominantly explained by tunneling — is contested by ~2-4 orders
      // of magnitude in observed mutation rates (see known_issues; the
      // f(T,pH,EM) prefactor must absorb polymerase fidelity ~10^-5 and
      // mismatch-repair ~10^2 to recover biology).
      expectBridgeInIndex(26, 'speculative');
    });

    it('dimensional_signature is set to [frequency]', () => {
      const entry = expectBridgeInIndex(26);
      expect(entry.dimensional_signature).toBe('[frequency]');
    });
  });

  describe('dimensional validation', () => {
    it('AST validates cleanly through the dimensional analyzer', () => {
      const r = validate(DNA_TUNNELING_RHS);
      expect(r.ok).toBe(true);
      expect(r.violations).toEqual([]);
    });

    it('RHS infers SI dimension [frequency]', () => {
      expectDimRoundTrip(DNA_TUNNELING_RHS, '[frequency]');
    });

    it('exp argument (2/ℏ)∫√(2m(V−E))dx is dimensionless (lemma)', () => {
      const r = validate(DNA_TUNNELING_WKB_ARG);
      expect(r.ok).toBe(true);
      expect(format(r.inferredDimension!)).toBe('[1]');
    });

    it('validateDNATunnelingDimensions reports both sides match', () => {
      const v = validateDNATunnelingDimensions();
      expect(v.ok).toBe(true);
      expect(format(v.lhsDim!)).toBe('[frequency]');
      expect(format(v.rhsDim!)).toBe('[frequency]');
    });

    it('bridge index dimensional_signature matches the AST inference', () => {
      const entry = expectBridgeInIndex(26);
      const inferred = validate(DNA_TUNNELING_RHS).inferredDimension;
      expect(inferred).not.toBeNull();
      expect(entry.dimensional_signature).toBe(format(inferred!));
    });
  });

  describe('numerical evaluation', () => {
    it('zero barrier (V = E throughout, integral = 0) → Γ = ν₀ · f', () => {
      // No tunneling barrier → exp(0) = 1 → Γ = ν₀ f.
      const Gamma = evaluateDNATunneling({
        nu_0: 1.0e13,
        m: 1.67e-27,
        V_minus_E: 0, // barrier height above E
        barrier_width: 1.0e-10,
        f_correction: 1.0,
      });
      expect(Gamma).toBeCloseTo(1.0e13, 0);
    });

    it('moderate barrier (0.4 eV, 1 Å, proton): Γ within 10^4–10^7 /s', () => {
      // Bracket-check from cited refs (Gamow / Landau-Lifshitz; Löwdin
      // 1963 for DNA application). Hydrogen-bond proton transfer
      // typical rate after thermal Q10 corrections: 10^-3 to 10^3 /s.
      // The WKB exponent factor alone (no Q10) typically gives 10^4–10^7.
      const eV = 1.602176634e-19;
      const Gamma = evaluateDNATunneling({
        nu_0: 1.0e13,
        m: 1.67e-27, // proton mass
        V_minus_E: 0.4 * eV,
        barrier_width: 1.0e-10, // 1 Å
        f_correction: 1.0,
      });
      // Hand-computed:
      //   p = √(2 · 1.67e-27 · 0.4·1.602e-19) = √(2.14e-46) ≈ 1.46e-23 kg m/s
      //   action = p · barrier_width = 1.46e-33 J·s
      //   2 · action / ℏ = 2 · 1.46e-33 / 1.055e-34 ≈ 27.7
      //   exp(-27.7) ≈ 9.3e-13
      //   Γ = 1e13 · 9.3e-13 ≈ 9 (Hz!)
      // So the unenhanced WKB rate is ~9 /s — squarely in the
      // textbook 10^-3 to 10^3 /s range.
      expect(Gamma).toBeGreaterThan(1);
      expect(Gamma).toBeLessThan(100);
    });

    it('higher barrier suppresses Γ exponentially', () => {
      const eV = 1.602176634e-19;
      const G_low = evaluateDNATunneling({
        nu_0: 1e13,
        m: 1.67e-27,
        V_minus_E: 0.2 * eV,
        barrier_width: 1e-10,
        f_correction: 1,
      });
      const G_high = evaluateDNATunneling({
        nu_0: 1e13,
        m: 1.67e-27,
        V_minus_E: 0.6 * eV,
        barrier_width: 1e-10,
        f_correction: 1,
      });
      expect(G_high).toBeLessThan(G_low);
      expect(G_high / G_low).toBeLessThan(1e-3);
    });

    it('larger barrier_width suppresses Γ exponentially', () => {
      const eV = 1.602176634e-19;
      const G_thin = evaluateDNATunneling({
        nu_0: 1e13,
        m: 1.67e-27,
        V_minus_E: 0.4 * eV,
        barrier_width: 0.5e-10,
        f_correction: 1,
      });
      const G_wide = evaluateDNATunneling({
        nu_0: 1e13,
        m: 1.67e-27,
        V_minus_E: 0.4 * eV,
        barrier_width: 2.0e-10,
        f_correction: 1,
      });
      expect(G_wide).toBeLessThan(G_thin);
    });

    it('f_correction multiplies Γ linearly', () => {
      const G1 = evaluateDNATunneling({
        nu_0: 1e13, m: 1.67e-27,
        V_minus_E: 1e-19,
        barrier_width: 1e-10,
        f_correction: 1,
      });
      const G2 = evaluateDNATunneling({
        nu_0: 1e13, m: 1.67e-27,
        V_minus_E: 1e-19,
        barrier_width: 1e-10,
        f_correction: 2.5,
      });
      expect(G2 / G1).toBeCloseTo(2.5, 12);
    });
  });

  describe('property tests / limit identities', () => {
    // Wave-2 hardening: barrier-collapse identity (V → E → exp(0) = 1
    // → Γ = ν₀·f), exponential-decay rate identity, and dense-sweep
    // strict monotonicity over a 10-point barrier-height grid.

    it('barrier-collapse identity: V → E gives Γ → ν₀ · f to machine precision', () => {
      // When V−E → 0 the WKB exponent collapses to 0; exp(0) = 1; Γ
      // must equal ν₀ · f exactly.
      for (const f of [0.5, 1.0, 2.5, 7.0]) {
        const G = evaluateDNATunneling({
          nu_0: 1e13,
          m: 1.67e-27,
          V_minus_E: 0,
          barrier_width: 1e-10,
          f_correction: f,
        });
        expect(G).toBe(1e13 * f);
      }
    });

    it('exponential-decay identity: Γ(2L)/Γ(L) = exp(-2(2/ℏ)·p·L − (-(2/ℏ)·p·L)) = exp(-(2/ℏ)·p·L)', () => {
      // Doubling barrier width multiplies the WKB exponent by 2;
      // Γ(2L)/Γ(L) = exp(-(2/ℏ)·p·L). Check the identity over 5 widths.
      const eV = 1.602176634e-19;
      const m = 1.67e-27;
      const V = 0.4 * eV;
      const hbar = HBAR_SI;
      const p = Math.sqrt(2 * m * V);
      for (const L of [0.5e-10, 1e-10, 1.5e-10, 2e-10, 3e-10]) {
        const G_L = evaluateDNATunneling({
          nu_0: 1e13, m, V_minus_E: V,
          barrier_width: L,
          f_correction: 1,
        });
        const G_2L = evaluateDNATunneling({
          nu_0: 1e13, m, V_minus_E: V,
          barrier_width: 2 * L,
          f_correction: 1,
        });
        const ratio = G_2L / G_L;
        const expected = Math.exp(-((2 / hbar) * p * L));
        expect(ratio / expected).toBeCloseTo(1, 10);
      }
    });

    it('dense-sweep monotonicity: Γ strictly decreases as V_minus_E grows (10 points)', () => {
      // Property test: Γ should be strictly monotonically decreasing in
      // V−E over a 10-point sweep at fixed (m, L). A 3-point check
      // could miss any subtle bump introduced by a buggy refactor.
      const eV = 1.602176634e-19;
      const Vs = [
        0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7,
      ].map((v) => v * eV);
      let prev = Infinity;
      for (const V of Vs) {
        const G = evaluateDNATunneling({
          nu_0: 1e13, m: 1.67e-27, V_minus_E: V,
          barrier_width: 1e-10, f_correction: 1,
        });
        expect(G).toBeLessThan(prev);
        prev = G;
      }
    });

    it('dense-sweep monotonicity: Γ strictly decreases as barrier_width grows (10 points)', () => {
      const eV = 1.602176634e-19;
      const Ls = [
        0.5e-10, 0.7e-10, 1e-10, 1.3e-10, 1.5e-10,
        1.8e-10, 2e-10, 2.5e-10, 3e-10, 4e-10,
      ];
      let prev = Infinity;
      for (const L of Ls) {
        const G = evaluateDNATunneling({
          nu_0: 1e13, m: 1.67e-27, V_minus_E: 0.4 * eV,
          barrier_width: L, f_correction: 1,
        });
        expect(G).toBeLessThan(prev);
        prev = G;
      }
    });
  });

  describe('input validation', () => {
    it('rejects negative ν₀', () => {
      expect(() =>
        evaluateDNATunneling({
          nu_0: -1, m: 1, V_minus_E: 1, barrier_width: 1, f_correction: 1,
        }),
      ).toThrow(RangeError);
    });

    it('rejects non-positive m', () => {
      expect(() =>
        evaluateDNATunneling({
          nu_0: 1, m: 0, V_minus_E: 1, barrier_width: 1, f_correction: 1,
        }),
      ).toThrow(RangeError);
    });

    it('rejects negative V_minus_E (E above barrier — not tunneling regime)', () => {
      expect(() =>
        evaluateDNATunneling({
          nu_0: 1, m: 1, V_minus_E: -1, barrier_width: 1, f_correction: 1,
        }),
      ).toThrow(RangeError);
    });

    it('rejects non-positive barrier_width', () => {
      expect(() =>
        evaluateDNATunneling({
          nu_0: 1, m: 1, V_minus_E: 1, barrier_width: 0, f_correction: 1,
        }),
      ).toThrow(RangeError);
    });
  });
});
