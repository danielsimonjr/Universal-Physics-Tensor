/**
 * Tests for `src/diff/bridge-gradient.ts` — v0.9 Proposal 8.
 *
 * Per P8 Adam-H1: `mathts-autograd` may not be installed in CI
 * (the dev env's node_modules/@danielsimonjr/ was EMPTY at HEAD
 * verification). Tests guard real-AD assertions with
 * `hasAutogradSupport(engine)` — degrade gracefully per the
 * v0.4.0 MathTSEngine pattern.
 *
 * Type-level surface tests (always run): spec shape, error paths
 * when AD is absent, gradientToNamed unpack.
 *
 * @module tests/diff/bridge-gradient
 */

import { describe, it, expect } from 'vitest';
import {
  bridgeGradient,
  bridgeGradientNumerical,
  gradientToNamed,
  type BridgeDiffSpec,
} from '../../src/diff/bridge-gradient.js';
import {
  BE37_SHAPIRO_DIFF,
  BE52_PERIHELION_DIFF,
  BE42_HAWKING_DIFF,
  BE11_DECOHERENCE_DIFF,
  DIFFERENTIABLE_BRIDGE_SPECS,
} from '../../src/diff/bridge-specs.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';
import { EngineCapabilityError } from '../../src/numerical/errors.js';

// ---------------------------------------------------------------------------
// Always-on tests: shape, graceful degradation
// ---------------------------------------------------------------------------

describe('BridgeDiffSpec — shape', () => {
  it('every shipped spec has bridgeId, name, paramNames, defaults, evaluate', () => {
    for (const spec of DIFFERENTIABLE_BRIDGE_SPECS) {
      expect(spec.bridgeId).toMatch(/^BE-\d+$/);
      expect(typeof spec.name).toBe('string');
      expect(spec.paramNames.length).toBeGreaterThan(0);
      expect(typeof spec.evaluate).toBe('function');
    }
  });

  it('BE-37 Shapiro spec uses verified field names (M_kg, R_far_m, R_near_m)', () => {
    expect([...BE37_SHAPIRO_DIFF.paramNames]).toEqual(['M_kg', 'R_far_m', 'R_near_m']);
  });

  it('BE-52 Perihelion spec includes T_yr in defaults (non-differentiable)', () => {
    expect(BE52_PERIHELION_DIFF.defaults).toEqual({ T_yr: 1 });
  });

  it('BE-42 Hawking has single-param tensor (M_kg only)', () => {
    expect(BE42_HAWKING_DIFF.paramNames).toHaveLength(1);
    expect(BE42_HAWKING_DIFF.paramNames[0]).toBe('M_kg');
  });

  it('BE-11 Decoherence uses verified field names (gamma0_per_s, lambda, lambda0)', () => {
    expect([...BE11_DECOHERENCE_DIFF.paramNames]).toEqual(['gamma0_per_s', 'lambda', 'lambda0']);
  });
});

describe('bridgeGradient — graceful degradation when AD absent', () => {
  // Mock engine WITHOUT forwardGrad/reverseGrad methods to simulate
  // an engine lacking AD support. Real engines (MathTSEngine
  // + MathTSEngine) both implement the AD methods, but neither can trace
  // a plain-JS bridge evaluator: tape/dual AD only sees ops routed through
  // engine-traced tensors, and the bridges use raw `Math.*` arithmetic
  // (P8 Decision #1). Differentiate those via bridgeGradientNumerical.
  const noADEngine = {
    name: 'NoADEngine',
    fromNested: () => ({ shape: [] }),
    toNested: () => 0,
    einsum: () => ({ shape: [] }),
    matMul: () => ({ shape: [] }),
    transpose: () => ({ shape: [] }),
    reshape: () => ({ shape: [] }),
    add: () => ({ shape: [] }),
    sub: () => ({ shape: [] }),
    mul: () => ({ shape: [] }),
    scale: () => ({ shape: [] }),
    identity: () => ({ shape: [] }),
    normInf: () => 0,
    // No forwardGrad, no reverseGrad — hasAutogradSupport returns false.
  } as never;

  it('hasAutogradSupport returns false on engines lacking AD methods (sanity)', () => {
    expect(hasAutogradSupport(noADEngine)).toBe(false);
  });

  it('throws EngineCapabilityError when engine lacks AD support', async () => {
    await expect(
      bridgeGradient(BE42_HAWKING_DIFF, noADEngine, { M_kg: 1.989e30 }),
    ).rejects.toThrow(EngineCapabilityError);
  });

  it('error message identifies the missing capability (engineName + missingMethod)', async () => {
    try {
      await bridgeGradient(BE42_HAWKING_DIFF, noADEngine, { M_kg: 1e30 });
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(EngineCapabilityError);
      if (e instanceof EngineCapabilityError) {
        expect(e.engineName).toBe('NoADEngine');
        expect(e.missingMethod).toBe('reverseGrad');
      }
    }
  });
});

describe('bridgeGradient — MathTSEngine AD limitation (P8 honest scope)', () => {
  // MathTSEngine's dual-number AD can ONLY trace functions
  // that use engine-traced operations (engine.add, engine.mul, ...).
  // Bridge evaluators are plain-JS arithmetic on raw numbers; they
  // strip the dual-number tracking, so the AD path throws. MathTSEngine
  // has the same limitation (verified in the MathTSEngine describe below):
  // tape AD also cannot trace raw Math.*. Use bridgeGradientNumerical.

  const engine = new MathTSEngine();

  it('hasAutogradSupport returns true (Float64 implements AD methods)', () => {
    expect(hasAutogradSupport(engine)).toBe(true);
  });

  it('rejects when bridge uses plain-JS arithmetic (Float64 AD cannot trace)', async () => {
    // The bridge evaluator returns a plain number, NOT a dual-number-
    // tracked tensor; Float64's AD pipeline can't trace through plain
    // Math.* and throws somewhere in the pipeline (the exact error
    // message depends on where the trace is lost — toNested,
    // AD-traceable check, or shape-mismatch).
    // This is the "Float64 AD won't trace bridges" honest limitation
    // (MathTSEngine shares it — see the next describe block).
    await expect(
      bridgeGradient(BE42_HAWKING_DIFF, engine, { M_kg: 1.989e30 }),
    ).rejects.toThrow();
  });
});

describe('bridgeGradient — param validation', () => {
  // Use a mock engine that claims autograd support to bypass the
  // capability check, so we can hit the validation paths.
  const mockEngine = {
    name: 'mock',
    fromNested: (x: number | number[], shape: ReadonlyArray<number>) => ({ shape }),
    toNested: () => 0,
    einsum: () => ({ shape: [] }),
    matMul: () => ({ shape: [] }),
    transpose: () => ({ shape: [] }),
    reshape: () => ({ shape: [] }),
    add: () => ({ shape: [] }),
    sub: () => ({ shape: [] }),
    mul: () => ({ shape: [] }),
    scale: () => ({ shape: [] }),
    identity: () => ({ shape: [] }),
    normInf: () => 0,
    forwardGrad: async () => ({ value: { shape: [] }, jacobian: { shape: [] } }),
    reverseGrad: async () => ({ value: { shape: [] }, gradient: { shape: [1] } }),
  } as never;

  it('throws TypeError when a required paramName is missing from params', async () => {
    await expect(
      bridgeGradient(BE37_SHAPIRO_DIFF, mockEngine, { M_kg: 1e30 } as Record<string, number>),
    ).rejects.toThrow(/missing or non-numeric param/);
  });

  it('throws TypeError when a paramName has non-numeric value', async () => {
    await expect(
      bridgeGradient(BE37_SHAPIRO_DIFF, mockEngine, {
        M_kg: 1e30,
        R_far_m: 'not a number',
        R_near_m: 1e6,
      } as unknown as Record<string, number>),
    ).rejects.toThrow(/missing or non-numeric param/);
  });
});

describe('gradientToNamed — unpack helper', () => {
  const engine = new MathTSEngine();

  it('unpacks a 1-D gradient tensor into a named record', () => {
    const grad = engine.fromNested([1.0, 2.0, 3.0], [3]);
    const named = gradientToNamed(BE37_SHAPIRO_DIFF, grad, engine);
    expect(named).toEqual({
      M_kg: 1.0,
      R_far_m: 2.0,
      R_near_m: 3.0,
    });
  });

  it('respects paramNames order', () => {
    const grad = engine.fromNested([10, 20, 30], [3]);
    const named = gradientToNamed(BE11_DECOHERENCE_DIFF, grad, engine);
    expect(named.gamma0_per_s).toBe(10);
    expect(named.lambda).toBe(20);
    expect(named.lambda0).toBe(30);
  });

  it('throws when the gradient length does not match paramNames (no silent undefined)', () => {
    // BE-37 Shapiro has 3 paramNames; a length-2 gradient would silently leave
    // R_near_m = undefined without the guard.
    const tooShort = engine.fromNested([1.0, 2.0], [2]);
    expect(() => gradientToNamed(BE37_SHAPIRO_DIFF, tooShort, engine)).toThrow(
      /length/i,
    );
  });
});

// ---------------------------------------------------------------------------
// Real gradient tests — numerical finite-difference path.
//
// Reverse-/forward-mode AD (bridgeGradient) CANNOT differentiate the catalog
// bridge evaluators: per P8 Decision #1 they are plain-JS scalar functions
// (`Math.pow`, raw `*`/`/` on numbers), so a tape/dual engine sees no traced
// ops — empirically `bridgeGradient(spec, MathTSEngine, …)` throws (the
// TapedTensor never survives `engine.toNested`). The supported way to
// differentiate a plain-JS evaluator without rewriting it is numerical
// finite differences, which `bridgeGradientNumerical` provides. These tests
// validate it against closed-form analytic gradients.
// ---------------------------------------------------------------------------

describe('bridgeGradientNumerical — analytic cross-checks', () => {
  it('BE-42 Hawking: dT_H/dM matches analytic -T_H/M (T_H ∝ 1/M)', () => {
    const M = 1.989e30;
    const { value, gradient } = bridgeGradientNumerical(BE42_HAWKING_DIFF, { M_kg: M });

    // T_H = ℏc³/(8πGM k_B) ⇒ dT_H/dM = -ℏc³/(8πG k_B M²) = -T_H/M (exact).
    const analytic = -value / M;
    expect(value).toBeGreaterThan(0);
    expect(gradient.M_kg).toBeCloseTo(analytic, 12);
    expect(Math.abs((gradient.M_kg - analytic) / analytic)).toBeLessThan(1e-6);
  });

  it('BE-11 Decoherence: multi-param gradient matches analytic (γ = γ₀(λ/λ₀)²)', () => {
    const params = { gamma0_per_s: 1, lambda: 2, lambda0: 1 };
    const { value, gradient } = bridgeGradientNumerical(BE11_DECOHERENCE_DIFF, params);

    const { gamma0_per_s: g0, lambda: l, lambda0: l0 } = params;
    // ∂γ/∂γ₀ = (λ/λ₀)²; ∂γ/∂λ = 2γ₀λ/λ₀²; ∂γ/∂λ₀ = -2γ₀λ²/λ₀³.
    expect(value).toBeCloseTo(g0 * (l / l0) ** 2, 12);
    expect(gradient.gamma0_per_s).toBeCloseTo((l / l0) ** 2, 6);
    expect(gradient.lambda).toBeCloseTo((2 * g0 * l) / l0 ** 2, 6);
    expect(gradient.lambda0).toBeCloseTo((-2 * g0 * l * l) / l0 ** 3, 6);
  });

  it('returns gradient keyed by every paramName, in the spec order', () => {
    const { gradient } = bridgeGradientNumerical(BE37_SHAPIRO_DIFF, {
      M_kg: 1.989e30,
      R_far_m: 1.496e11,
      R_near_m: 6.96e8,
    });
    expect(Object.keys(gradient)).toEqual([...BE37_SHAPIRO_DIFF.paramNames]);
    for (const v of Object.values(gradient)) expect(Number.isFinite(v)).toBe(true);
  });

  it('throws on a missing / non-finite param (same contract as bridgeGradient)', () => {
    expect(() =>
      bridgeGradientNumerical(BE37_SHAPIRO_DIFF, { M_kg: 1e30 } as Record<string, number>),
    ).toThrow(/missing or non-finite param/);
  });

  it('throws on a NaN param (typeof NaN === "number" used to slip through)', () => {
    expect(() =>
      bridgeGradientNumerical(BE42_HAWKING_DIFF, { M_kg: NaN }),
    ).toThrow(/non-finite param/);
  });

  it('throws on a non-positive relStep (would collapse the FD denominator)', () => {
    expect(() =>
      bridgeGradientNumerical(BE42_HAWKING_DIFF, { M_kg: 1.989e30 }, { relStep: 0 }),
    ).toThrow(/relStep must be a positive finite number/);
  });
});

// ---------------------------------------------------------------------------
// Honest limitation: reverse-mode AD of a plain-JS bridge is unsupported.
// Documents (and guards) that bridgeGradient throws even with MathTSEngine —
// correcting the prior optimistic claim that the autograd package "would handle
// this case".
// ---------------------------------------------------------------------------

describe('bridgeGradient — plain-JS bridges are not AD-traceable (MathTSEngine)', () => {
  it('throws even with MathTSEngine (tape cannot trace plain-JS)', async () => {
    await expect(
      bridgeGradient(BE42_HAWKING_DIFF, new MathTSEngine(), { M_kg: 1.989e30 }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Bridge-evaluator sanity (always-on, no AD needed)
// ---------------------------------------------------------------------------

describe('bridge evaluators (sanity — confirms struct-arg signatures)', () => {
  it('BE-37 Shapiro returns a finite positive number for Sun-scale params', () => {
    const result = BE37_SHAPIRO_DIFF.evaluate({
      M_kg: 1.989e30,
      R_far_m: 1.496e11,
      R_near_m: 6.96e8,
    });
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('BE-52 Perihelion returns Mercury-consistent ~43 arcsec/century via dphi_rad', () => {
    const result = BE52_PERIHELION_DIFF.evaluate({
      M_kg: 1.989e30,
      a_m: 5.7909e10,
      e: 0.20563,
      T_yr: 0.2408,
    });
    // 43 arcsec/century × (π/180) × (1/3600) × (0.2408 yr / 100 yr_per_century)
    // ≈ 5e-7 rad/orbit — order-of-magnitude sanity.
    expect(result).toBeGreaterThan(1e-8);
    expect(result).toBeLessThan(1e-6);
  });

  it('BE-42 Hawking returns nanokelvin-scale for solar-mass BH', () => {
    const result = BE42_HAWKING_DIFF.evaluate({ M_kg: 1.989e30 });
    // T_H(M_sun) ≈ 6e-8 K — sanity check.
    expect(result).toBeGreaterThan(1e-9);
    expect(result).toBeLessThan(1e-6);
  });

  it('BE-11 Decoherence returns gamma0 * (lambda/lambda0)^2', () => {
    const result = BE11_DECOHERENCE_DIFF.evaluate({
      gamma0_per_s: 1.0,
      lambda: 2.0,
      lambda0: 1.0,
    });
    expect(result).toBe(4.0); // 1.0 * (2/1)^2
  });
});
