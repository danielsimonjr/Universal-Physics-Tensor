/**
 * One central-difference rule (`numerical/finite-difference`), with the
 * representable-step denominator `dx = (x + h) − (x − h)`, read by the
 * elasticity ranking and the public bridge gradient. The gradient's step was
 * `max(|x|, 1)·∛ε`: absolute below |x| = 1, a 1e13× step on a charge of
 * 1.6e-19. It is relative now, with a floor the spec states per parameter.
 */
import { describe, expect, it } from 'vitest';
import { centralPartial } from '../../src/numerical/finite-difference.js';
import { bridgeGradientNumerical, type BridgeDiffSpec } from '../../src/diff/bridge-gradient.js';
import {
  DECOHERENCE_RATE_DIFF,
  HAWKING_TEMPERATURE_DIFF,
  PERIHELION_ADVANCE_DIFF,
  SHAPIRO_DELAY_DIFF,
} from '../../src/diff/bridge-specs.js';

describe('centralPartial', () => {
  it('is (f(x+h) − f(x−h)) / ((x+h) − (x−h)) for the named key only', () => {
    const f = (p: Record<string, number>): number => p.a! * p.a! * p.b!;
    // At h = 1e-3 the difference of two O(10) values is rounded at ~1e-15·10, divided by 2e-3: ~1e-11.
    expect(centralPartial(f, { a: 3, b: 2 }, 'a', 1e-3)).toBeCloseTo(12, 9);
    expect(centralPartial(f, { a: 3, b: 2 }, 'b', 1e-3)).toBeCloseTo(9, 9);
  });

  it('uses the representable step, so a huge x does not collapse the denominator', () => {
    const x = 2e30;
    const h = x * 1e-6;
    const dx = x + h - (x - h);
    expect(dx).not.toBe(2 * h);
    const f = (p: Record<string, number>): number => 2 * p.x!;
    expect(centralPartial(f, { x }, 'x', h)).toBe(2);
  });
});

describe('bridgeGradientNumerical takes a relative step', () => {
  const cube: BridgeDiffSpec<{ q: number }> = {
    bridgeId: 'test-cube',
    name: 'q³',
    paramNames: ['q'],
    defaults: {},
    evaluate: (i) => i.q ** 3,
  };

  it('differentiates q³ at a charge of 1.6e-19 to 1e-6 relative (the old absolute step gave h²)', () => {
    const q = 1.602176634e-19;
    const { gradient } = bridgeGradientNumerical(cube, { q });
    expect(Math.abs(gradient.q! / (3 * q * q) - 1)).toBeLessThan(1e-6);
  });

  it('refuses a parameter at exactly 0 unless the spec states a floor for it', () => {
    expect(() => bridgeGradientNumerical(cube, { q: 0 })).toThrow(RangeError);
    expect(() => bridgeGradientNumerical(cube, { q: 0 })).toThrow(/stepFloors/);
    const floored: BridgeDiffSpec<{ q: number }> = { ...cube, stepFloors: { q: 1 } };
    expect(bridgeGradientNumerical(floored, { q: 0 }).gradient.q).toBeCloseTo(0, 9);
  });

  it('keeps the shipped specs’ results at their test points bit for bit: the floor is below every parameter there', () => {
    // The rule the public gradient used before: h = max(|x|, 1)·∛ε, representable denominator.
    const oldRule = <I>(spec: BridgeDiffSpec<I>, params: Record<string, number>): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const k of spec.paramNames) {
        const x = params[k]!;
        const h = Math.max(Math.abs(x), 1) * Math.cbrt(Number.EPSILON);
        const at = (v: number): number => spec.evaluate({ ...spec.defaults, ...params, [k]: v } as unknown as I);
        out[k] = (at(x + h) - at(x - h)) / (x + h - (x - h));
      }
      return out;
    };
    const unchanged = <I>(spec: BridgeDiffSpec<I>, params: Record<string, number>): void => {
      const { gradient } = bridgeGradientNumerical(spec, params);
      const old = oldRule(spec, params);
      for (const k of spec.paramNames) expect(gradient[k], `${spec.bridgeId} ${k}`).toBe(old[k]);
    };
    const M = 1.989e30;
    unchanged(HAWKING_TEMPERATURE_DIFF, { M_kg: M });
    unchanged(SHAPIRO_DELAY_DIFF, { M_kg: M, R_far_m: 1.5e11, R_near_m: 7e8 });
    unchanged(PERIHELION_ADVANCE_DIFF, { M_kg: M, a_m: 5.79e10, eccentricity: 0.2056 });
    unchanged(DECOHERENCE_RATE_DIFF, { gamma0_per_s: 1, lambda: 2, lambda0: 1 });
    // And the analytic cross-checks hold at the central-difference truncation (h² ≈ 4e-11 relative).
    const hawking = bridgeGradientNumerical(HAWKING_TEMPERATURE_DIFF, { M_kg: M });
    expect(hawking.gradient.M_kg! / (-hawking.value / M)).toBeCloseTo(1, 9);
    const dec = bridgeGradientNumerical(DECOHERENCE_RATE_DIFF, { gamma0_per_s: 1, lambda: 2, lambda0: 1 });
    expect(dec.gradient.lambda).toBeCloseTo(4, 6);
  });

  it('the perihelion spec states the eccentricity floor, so a circular orbit differentiates', () => {
    expect(PERIHELION_ADVANCE_DIFF.stepFloors?.eccentricity).toBe(1);
    const peri = bridgeGradientNumerical(PERIHELION_ADVANCE_DIFF, { M_kg: 1.989e30, a_m: 5.79e10, eccentricity: 0 });
    expect(Number.isFinite(peri.gradient.eccentricity!)).toBe(true);
  });
});
