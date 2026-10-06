/**
 * Tests for `src/dimensional/friedmann-equation.ts` — BE-19's
 * structural primitive for modified-cosmology predicates.
 *
 * Per `docs/architecture/archive/v0.7-be-x-reencoding-design-note.md`
 * §"BE-19 — `FriedmannEquationNode`". Variant-heavy primitive —
 * the discriminator unlocks future LQC / brane / DGP / dRGT
 * encodings.
 *
 * Coverage targets:
 *   - Happy paths per variant ('classical', 'lqc', 'brane', 'dgp',
 *     'massive')
 *   - Predicate failures per variant (dim mismatches, symmetry
 *     violations, classical-correction inconsistency, unknown variant)
 *   - LQC-specific dimensionless-correction discipline
 *   - Demo: encode the LQC `H² = (8πG/3)·ρ·(1 − ρ/ρ_crit)` shape and
 *     validate it
 *   - Error-keyword discipline meta-test (`"dimension"`, `"symmetry"`,
 *     `"variant"`)
 *
 * @module tests/dimensional/friedmann-equation
 */

import { describe, it, expect } from 'vitest';
import {
  validateFriedmannEquation,
  type FriedmannEquationNode,
  type FriedmannVariant,
} from '../../src/dimensional/friedmann-equation.js';
import type { ScalarFieldNode } from '../../src/dimensional/klein-gordon-equation.js';
import type { Dimension } from '../../src/dimensional/types.js';

const DIMLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const T_INV2: Dimension = { L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
const T_INV1: Dimension = { L: 0, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
const MASS_DENSITY: Dimension = { L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const ENERGY_DENSITY: Dimension = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

function scalarField(name: string, dim: Dimension): ScalarFieldNode {
  return { kind: 'scalar-field', name, dim, symmetry: 'scalar' };
}

const H_SQ: ScalarFieldNode = scalarField('H_squared', T_INV2);
const H_LINEAR: ScalarFieldNode = scalarField('H', T_INV1);
const RHO: ScalarFieldNode = scalarField('rho', MASS_DENSITY);
const BOUNCE_FACTOR: ScalarFieldNode = scalarField('one_minus_rho_over_rho_crit', DIMLESS);

// ---------------------------------------------------------------------------
// Happy paths — one per variant
// ---------------------------------------------------------------------------

describe('validateFriedmannEquation — happy paths', () => {
  it("variant 'classical' with correction === null (canonical FRW)", () => {
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    const r = validateFriedmannEquation(node);
    expect(r.dim).toEqual(T_INV2);
    expect(r.freeIndices.size).toBe(0);
    expect(r.variant).toBe<FriedmannVariant>('classical');
  });

  it("variant 'lqc' with dimensionless (1 − ρ/ρ_crit) correction", () => {
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: BOUNCE_FACTOR,
      variant: 'lqc',
      coupling: 'friedmann',
    };
    const r = validateFriedmannEquation(node);
    expect(r.dim).toEqual(T_INV2);
    expect(r.variant).toBe<FriedmannVariant>('lqc');
  });

  it("variant 'brane' with Randall-Sundrum (1 + ρ/(2σ)) correction (dimensionless)", () => {
    const braneFactor = scalarField('one_plus_rho_over_2sigma', DIMLESS);
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: braneFactor,
      variant: 'brane',
      coupling: 'friedmann',
    };
    const r = validateFriedmannEquation(node);
    expect(r.dim).toEqual(T_INV2);
    expect(r.variant).toBe<FriedmannVariant>('brane');
  });

  it("variant 'dgp' with H/r_c stub correction (variant-only discriminator; dim deferred)", () => {
    // DGP's H/r_c term has dim [T^-1·L^-1] in SI; we stub as a stand-in
    // scalar — fine-grained dim discipline is deferred per design note.
    const dgpCorrection = scalarField('H_over_r_c', {
      L: -1, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0,
    });
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: dgpCorrection,
      variant: 'dgp',
      coupling: 'friedmann',
    };
    const r = validateFriedmannEquation(node);
    expect(r.variant).toBe<FriedmannVariant>('dgp');
  });

  it("variant 'massive' with graviton-mass^2 stub correction", () => {
    // dRGT graviton mass^2 has dim [T^-2] in natural units; we just
    // stub a scalar — dim discipline deferred to per-bridge landing.
    const gravitonMass2 = scalarField('m_g_squared', T_INV2);
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: gravitonMass2,
      variant: 'massive',
      coupling: 'friedmann',
    };
    const r = validateFriedmannEquation(node);
    expect(r.variant).toBe<FriedmannVariant>('massive');
  });

  it("accepts hubble.dim = [T^-1] (un-squared H) for the classical form", () => {
    // The validator accepts both H ([T^-1]) and H² ([T^-2]) as the
    // hubble field's dim — the user states which they're encoding.
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_LINEAR,
      density: RHO,
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    const r = validateFriedmannEquation(node);
    // Result dim is always the equation-level [T^-2] (the H² shape).
    expect(r.dim).toEqual(T_INV2);
  });
});

// ---------------------------------------------------------------------------
// Predicate failures — variant discriminator + classical consistency
// ---------------------------------------------------------------------------

describe('validateFriedmannEquation — variant discriminator failures', () => {
  it("throws with 'variant' on unknown discriminator", () => {
    const node = {
      kind: 'friedmann-equation' as const,
      hubble: H_SQ,
      density: RHO,
      correction: null,
      variant: 'kaluza-klein' as unknown as FriedmannVariant,
      coupling: 'friedmann' as const,
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/variant/);
  });

  it("throws with 'variant' when classical carries a non-null correction", () => {
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: BOUNCE_FACTOR, // wrong: classical demands null
      variant: 'classical',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/variant/);
  });

  it("throws with 'variant' when non-classical variant has correction === null", () => {
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: null, // wrong: 'lqc' requires a correction
      variant: 'lqc',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/variant/);
  });
});

// ---------------------------------------------------------------------------
// Predicate failures — dimensional / symmetry
// ---------------------------------------------------------------------------

describe('validateFriedmannEquation — dimensional failures', () => {
  it("throws with 'dimension' when hubble.dim is neither [T^-1] nor [T^-2]", () => {
    const badHubble = scalarField('H_bad', DIMLESS); // dimensionless is wrong
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: badHubble,
      density: RHO,
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/dimension/);
  });

  it("throws with 'dimension' when density is energy-density [M·L^-1·T^-2] instead of mass-density", () => {
    // Friedmann's encoding fixes the convention to mass-density
    // [M·L^-3]; passing energy-density should be flagged.
    const badRho = scalarField('rho_energy', ENERGY_DENSITY);
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: badRho,
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/dimension/);
  });

  it("throws with 'dimension' when LQC correction is NOT dimensionless", () => {
    const badCorrection = scalarField('bad_lqc_factor', T_INV2);
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: badCorrection,
      variant: 'lqc',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/dimension/);
  });
});

describe('validateFriedmannEquation — symmetry failures', () => {
  it("throws with 'symmetry' when hubble is not 'scalar'", () => {
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: { kind: 'scalar-field', name: 'H', dim: T_INV2, symmetry: 'symmetric' as 'scalar' },
      density: RHO,
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/symmetry/);
  });

  it("throws with 'symmetry' when density is not 'scalar'", () => {
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: { kind: 'scalar-field', name: 'rho', dim: MASS_DENSITY, symmetry: 'tensor' as 'scalar' },
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/symmetry/);
  });

  it("throws with 'symmetry' when correction is not 'scalar'", () => {
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: RHO,
      correction: { kind: 'scalar-field', name: 'factor', dim: DIMLESS, symmetry: 'antisymmetric' as 'scalar' },
      variant: 'lqc',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/symmetry/);
  });
});

// ---------------------------------------------------------------------------
// Demonstrator — encode BE-19's LQC modified Friedmann
// ---------------------------------------------------------------------------

describe('FriedmannEquationNode as BE-19 LQC structural encoding', () => {
  it("encodes H² = (8πG/3)·ρ·(1 − ρ/ρ_crit) as variant: 'lqc' and validates", () => {
    // Mirrors what the LQC Friedmann structural form (to be exported from
    // src/bridges/equations/be-19-quantum-bounce.ts) will look like.
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: scalarField('H_squared', T_INV2),
      density: scalarField('rho', MASS_DENSITY),
      correction: scalarField('1_minus_rho_over_rho_crit', DIMLESS),
      variant: 'lqc',
      coupling: 'friedmann',
    };
    const r = validateFriedmannEquation(node);
    expect(r.dim).toEqual(T_INV2);
    expect(r.variant).toBe<FriedmannVariant>('lqc');
    expect(r.freeIndices.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Error-keyword discipline + discriminator meta-test
// ---------------------------------------------------------------------------

describe('FriedmannEquationNode error-keyword discipline', () => {
  it('error messages include the equationKind discriminator', () => {
    const node: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: H_SQ,
      density: scalarField('rho_bad', DIMLESS),
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    try {
      validateFriedmannEquation(node);
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('FriedmannEquationNode');
    }
  });

  it("shares 'dimension' / 'symmetry' vocabulary with EinsteinFieldEquationNode + KleinGordonEquationNode", () => {
    // Both 'dimension' and 'symmetry' keywords are pinned by the
    // field-equation-helpers — any predicate failure surfaces them.
    const dimFailNode: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: scalarField('rho_in_hubble_slot', MASS_DENSITY),
      density: RHO,
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(dimFailNode)).toThrow(/dimension/);

    const symFailNode: FriedmannEquationNode = {
      kind: 'friedmann-equation',
      hubble: { kind: 'scalar-field', name: 'H', dim: T_INV2, symmetry: 'symmetric' as 'scalar' },
      density: RHO,
      correction: null,
      variant: 'classical',
      coupling: 'friedmann',
    };
    expect(() => validateFriedmannEquation(symFailNode)).toThrow(/symmetry/);
  });

  it("'variant' keyword surfaces on discriminator-class violations", () => {
    const node = {
      kind: 'friedmann-equation' as const,
      hubble: H_SQ,
      density: RHO,
      correction: null,
      variant: 'fish' as unknown as FriedmannVariant,
      coupling: 'friedmann' as const,
    };
    expect(() => validateFriedmannEquation(node)).toThrow(/variant/);
  });
});
