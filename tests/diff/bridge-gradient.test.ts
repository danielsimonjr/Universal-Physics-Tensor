/**
 * Tests for `src/diff/bridge-gradient.ts` and `src/diff/bridge-specs.ts`.
 *
 * The catalog's closed forms are plain-JS scalar functions
 * (`BridgeDiffSpec.evaluate: (input) => number`). A function that returns a
 * `number` cannot carry an autograd tape, so engine AD of a spec is
 * unreachable by construction; the 9.0.0 audit (§2 N3) found the root
 * export `bridgeGradient` throwing an unrelated `NumericalBackendError` for
 * every shipped spec. That function, its result type and its unpack helper
 * are gone. The two live paths are `bridgeGradientNumerical` (central
 * differences over a spec) and `bridgeGradientAST` (exact AD over the
 * symbolic RHS, tested in its own file).
 *
 * @module tests/diff/bridge-gradient
 */

import { describe, it, expect } from 'vitest';
import * as bridgeGradientModule from '../../src/diff/bridge-gradient.js';
import * as bridgeSpecsModule from '../../src/diff/bridge-specs.js';
import * as root from '../../src/index.js';
import { bridgeGradientNumerical } from '../../src/diff/bridge-gradient.js';
import {
  SHAPIRO_DELAY_DIFF,
  PERIHELION_ADVANCE_DIFF,
  HAWKING_TEMPERATURE_DIFF,
  DECOHERENCE_RATE_DIFF,
  DIFFERENTIABLE_RELATIONS,
  requireCatalogId,
} from '../../src/diff/bridge-specs.js';
import { catalogRelations } from '../../src/bridges/catalog-load.js';

// ---------------------------------------------------------------------------
// Surface: the unreachable engine-AD path is not exported (audit N3)
// ---------------------------------------------------------------------------

describe('engine AD of a plain-JS spec is not offered (N3)', () => {
  it.each(['bridgeGradient', 'gradientToNamed'])('%s is not exported by the diff module', (name) => {
    expect(name in bridgeGradientModule, name).toBe(false);
  });

  it.each(['bridgeGradient', 'gradientToNamed'])('%s is not exported from the package root', (name) => {
    expect(name in root, name).toBe(false);
  });

  it('BridgeDiffSpec.evaluate returns a number, which no tape can trace (the reason the path is gone)', () => {
    expect(typeof HAWKING_TEMPERATURE_DIFF.evaluate({ M_kg: 1.989e30 })).toBe('number');
    expect(typeof DECOHERENCE_RATE_DIFF.evaluate({ gamma0_per_s: 1, lambda: 2, lambda0: 1 })).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Spec shape
// ---------------------------------------------------------------------------

describe('BridgeDiffSpec — shape', () => {
  it('every shipped spec has bridgeId, name, paramNames, defaults, evaluate', () => {
    for (const spec of DIFFERENTIABLE_RELATIONS) {
      expect(spec.bridgeId).toMatch(/^be-\d+$/);
      expect(typeof spec.name).toBe('string');
      expect(spec.paramNames.length).toBeGreaterThan(0);
      expect(typeof spec.evaluate).toBe('function');
      expect(typeof spec.defaults).toBe('object');
    }
  });

  it('DIFFERENTIABLE_RELATIONS is the four shipped specs', () => {
    expect(DIFFERENTIABLE_RELATIONS).toHaveLength(4);
    expect(DIFFERENTIABLE_RELATIONS).toContain(SHAPIRO_DELAY_DIFF);
    expect(DIFFERENTIABLE_RELATIONS).toContain(PERIHELION_ADVANCE_DIFF);
    expect(DIFFERENTIABLE_RELATIONS).toContain(HAWKING_TEMPERATURE_DIFF);
    expect(DIFFERENTIABLE_RELATIONS).toContain(DECOHERENCE_RATE_DIFF);
  });

  it('BE-37 Shapiro uses verified field names (M_kg, R_far_m, R_near_m)', () => {
    expect([...SHAPIRO_DELAY_DIFF.paramNames]).toEqual(['M_kg', 'R_far_m', 'R_near_m']);
  });

  it('BE-52 Perihelion uses verified field names (M_kg, a_m, eccentricity)', () => {
    expect([...PERIHELION_ADVANCE_DIFF.paramNames]).toEqual(['M_kg', 'a_m', 'eccentricity']);
  });

  it('BE-42 Hawking uses verified field name (M_kg)', () => {
    expect([...HAWKING_TEMPERATURE_DIFF.paramNames]).toEqual(['M_kg']);
  });

  it('BE-11 Decoherence uses verified field names (gamma0_per_s, lambda, lambda0)', () => {
    expect([...DECOHERENCE_RATE_DIFF.paramNames]).toEqual(['gamma0_per_s', 'lambda', 'lambda0']);
  });
});

// ---------------------------------------------------------------------------
// A spec is labelled by its relation's catalog id, never by a default (audit N18)
// ---------------------------------------------------------------------------

describe('requireCatalogId (N18)', () => {
  const shapiro = catalogRelations().find((row) => row.sources.includes('far-radius'))!;

  it('returns the catalog id of a catalog relation', () => {
    expect(shapiro.catalogId).not.toBeNull();
    expect(requireCatalogId(shapiro)).toBe(shapiro.catalogId);
  });

  it('throws for a relation with no catalog id instead of labelling it be-0', () => {
    expect(() => requireCatalogId({ ...shapiro, catalogId: null })).toThrow(/no catalog id/);
  });

  it('every shipped spec carries its relation id, and none is be-0', () => {
    for (const spec of DIFFERENTIABLE_RELATIONS) expect(spec.bridgeId).not.toBe('be-0');
    expect('requireCatalogId' in bridgeSpecsModule).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Real gradient tests — numerical finite-difference path, validated against
// closed-form analytic gradients.
// ---------------------------------------------------------------------------

describe('bridgeGradientNumerical — analytic cross-checks', () => {
  it('BE-42 Hawking: dT_H/dM matches analytic -T_H/M (T_H ∝ 1/M)', () => {
    const M = 1.989e30;
    const { value, gradient } = bridgeGradientNumerical(HAWKING_TEMPERATURE_DIFF, { M_kg: M });

    // T_H = ℏc³/(8πGM k_B) ⇒ dT_H/dM = -ℏc³/(8πG k_B M²) = -T_H/M (exact).
    const analytic = -value / M;
    expect(value).toBeGreaterThan(0);
    expect(gradient.M_kg).toBeCloseTo(analytic, 12);
    expect(Math.abs((gradient.M_kg - analytic) / analytic)).toBeLessThan(1e-6);
  });

  it('BE-11 Decoherence: multi-param gradient matches analytic (γ = γ₀(λ/λ₀)²)', () => {
    const params = { gamma0_per_s: 1, lambda: 2, lambda0: 1 };
    const { value, gradient } = bridgeGradientNumerical(DECOHERENCE_RATE_DIFF, params);

    const { gamma0_per_s: g0, lambda: l, lambda0: l0 } = params;
    // ∂γ/∂γ₀ = (λ/λ₀)²; ∂γ/∂λ = 2γ₀λ/λ₀²; ∂γ/∂λ₀ = -2γ₀λ²/λ₀³.
    expect(value).toBeCloseTo(g0 * (l / l0) ** 2, 12);
    expect(gradient.gamma0_per_s).toBeCloseTo((l / l0) ** 2, 6);
    expect(gradient.lambda).toBeCloseTo((2 * g0 * l) / l0 ** 2, 6);
    expect(gradient.lambda0).toBeCloseTo((-2 * g0 * l * l) / l0 ** 3, 6);
  });

  it('returns gradient keyed by every paramName, in the spec order', () => {
    const { gradient } = bridgeGradientNumerical(SHAPIRO_DELAY_DIFF, {
      M_kg: 1.989e30,
      R_far_m: 1.496e11,
      R_near_m: 6.96e8,
    });
    expect(Object.keys(gradient)).toEqual([...SHAPIRO_DELAY_DIFF.paramNames]);
    for (const v of Object.values(gradient)) expect(Number.isFinite(v)).toBe(true);
  });

  it('throws on a missing / non-finite param', () => {
    expect(() =>
      bridgeGradientNumerical(SHAPIRO_DELAY_DIFF, { M_kg: 1e30 } as Record<string, number>),
    ).toThrow(/missing or non-finite param/);
  });

  it('throws on a NaN param (typeof NaN === "number" used to slip through)', () => {
    expect(() =>
      bridgeGradientNumerical(HAWKING_TEMPERATURE_DIFF, { M_kg: NaN }),
    ).toThrow(/non-finite param/);
  });

  it('throws on a non-positive relStep (would collapse the FD denominator)', () => {
    expect(() =>
      bridgeGradientNumerical(HAWKING_TEMPERATURE_DIFF, { M_kg: 1.989e30 }, { relStep: 0 }),
    ).toThrow(/relStep must be a positive finite number/);
  });
});

// ---------------------------------------------------------------------------
// Bridge-evaluator sanity (confirms struct-arg signatures)
// ---------------------------------------------------------------------------

describe('bridge evaluators (sanity — confirms struct-arg signatures)', () => {
  it('BE-37 Shapiro returns a finite positive number for Sun-scale params', () => {
    const result = SHAPIRO_DELAY_DIFF.evaluate({
      M_kg: 1.989e30,
      R_far_m: 1.496e11,
      R_near_m: 6.96e8,
    });
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('BE-52 Perihelion returns Mercury-consistent ~43 arcsec/century via dphi_rad', () => {
    const result = PERIHELION_ADVANCE_DIFF.evaluate({
      M_kg: 1.989e30,
      a_m: 5.7909e10,
      eccentricity: 0.20563,
      T_yr: 0.2408,
    });
    // 43 arcsec/century × (π/180) × (1/3600) × (0.2408 yr / 100 yr_per_century)
    // ≈ 5e-7 rad/orbit — order-of-magnitude sanity.
    expect(result).toBeGreaterThan(1e-8);
    expect(result).toBeLessThan(1e-6);
  });

  it('BE-42 Hawking returns nanokelvin-scale for solar-mass BH', () => {
    const result = HAWKING_TEMPERATURE_DIFF.evaluate({ M_kg: 1.989e30 });
    // T_H(M_sun) ≈ 6e-8 K — sanity check.
    expect(result).toBeGreaterThan(1e-9);
    expect(result).toBeLessThan(1e-6);
  });

  it('BE-11 Decoherence returns gamma0 * (lambda/lambda0)^2', () => {
    const result = DECOHERENCE_RATE_DIFF.evaluate({
      gamma0_per_s: 1.0,
      lambda: 2.0,
      lambda0: 1.0,
    });
    expect(result).toBe(4.0); // 1.0 * (2/1)^2
  });
});
