/**
 * Tests for `src/dimensional/klein-gordon-equation.ts` — Phase 1
 * of the TensorEquationNode<LHS,RHS> generalization.
 *
 * First new field-equation node using the Phase 0 helpers.
 * Demonstrates that adding a new equation costs ~30-40 LOC of
 * predicate-validation logic (vs the 80-120 LOC of duplicated
 * boilerplate the helpers replaced).
 *
 * @module tests/dimensional/klein-gordon-equation
 */

import { describe, it, expect } from 'vitest';
import {
  validateKleinGordonEquation,
  type KleinGordonEquationNode,
  type ScalarFieldNode,
} from '../../src/dimensional/klein-gordon-equation.js';
import type { Dimension } from '../../src/dimensional/types.js';

const DIMENSIONLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const L_INV2: Dimension = { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const L_INV4: Dimension = { L: -4, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const M_OVER_L: Dimension = { L: -1, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const M_OVER_L3: Dimension = { L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

function scalarField(name: string, dim: Dimension): ScalarFieldNode {
  return { kind: 'scalar-field', name, dim, symmetry: 'scalar' };
}

const mass: ScalarFieldNode = scalarField('m_squared', L_INV2);

// ---------------------------------------------------------------------------
// Happy paths
// ---------------------------------------------------------------------------

describe('validateKleinGordonEquation — happy paths', () => {
  it('homogeneous (□+m²)φ = 0 with dimensionless field', () => {
    const node: KleinGordonEquationNode = {
      kind: 'klein-gordon-equation',
      field: scalarField('phi', DIMENSIONLESS),
      mass,
      source: null,
      coupling: 'klein-gordon',
    };
    const r = validateKleinGordonEquation(node);
    // Composed dim = dimensionless × L^-2 = L^-2.
    expect(r.dim).toEqual(L_INV2);
    expect(r.freeIndices.size).toBe(0);
  });

  it('sourced (□+m²)φ = J with matching dimensions', () => {
    const node: KleinGordonEquationNode = {
      kind: 'klein-gordon-equation',
      field: scalarField('phi', DIMENSIONLESS),
      mass,
      source: scalarField('J', L_INV2), // (□+m²)φ_dimensionless ~ L^-2
      coupling: 'klein-gordon',
    };
    const r = validateKleinGordonEquation(node);
    expect(r.dim).toEqual(L_INV2);
  });

  it('massive field with dimensional content (φ has dim [M/L])', () => {
    const node: KleinGordonEquationNode = {
      kind: 'klein-gordon-equation',
      field: scalarField('phi_density', M_OVER_L),
      mass,
      source: scalarField('J_density', M_OVER_L3),  // [M/L]·[L^-2] = [M/L^3]
      coupling: 'klein-gordon',
    };
    const r = validateKleinGordonEquation(node);
    expect(r.dim).toEqual(M_OVER_L3);
  });
});

// ---------------------------------------------------------------------------
// Predicate failures (uses helper error-keyword discipline)
// ---------------------------------------------------------------------------

describe('validateKleinGordonEquation — predicate failures', () => {
  it('throws with "dimension" when mass is not [L^-2]', () => {
    const node: KleinGordonEquationNode = {
      kind: 'klein-gordon-equation',
      field: scalarField('phi', DIMENSIONLESS),
      mass: scalarField('bad_mass', DIMENSIONLESS), // wrong: m² must be L^-2
      source: null,
      coupling: 'klein-gordon',
    };
    expect(() => validateKleinGordonEquation(node)).toThrow(/dimension/);
  });

  it('throws with "dimension" when source J does not match composed LHS', () => {
    const node: KleinGordonEquationNode = {
      kind: 'klein-gordon-equation',
      field: scalarField('phi', DIMENSIONLESS),
      mass,
      source: scalarField('J', L_INV4), // wrong: should be L^-2
      coupling: 'klein-gordon',
    };
    expect(() => validateKleinGordonEquation(node)).toThrow(/dimension/);
  });

  it('throws with "symmetry" when field is not "scalar"', () => {
    const node: KleinGordonEquationNode = {
      kind: 'klein-gordon-equation',
      field: { kind: 'scalar-field', name: 'phi', dim: DIMENSIONLESS, symmetry: 'symmetric' as 'scalar' },
      mass,
      source: null,
      coupling: 'klein-gordon',
    };
    expect(() => validateKleinGordonEquation(node)).toThrow(/symmetry/);
  });

  it('error message names the equationKind discriminator', () => {
    const node: KleinGordonEquationNode = {
      kind: 'klein-gordon-equation',
      field: scalarField('phi', DIMENSIONLESS),
      mass: scalarField('bad', DIMENSIONLESS),
      source: null,
      coupling: 'klein-gordon',
    };
    try {
      validateKleinGordonEquation(node);
      expect.fail('Should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('KleinGordonEquationNode');
    }
  });
});

// ---------------------------------------------------------------------------
// Helper-extraction-shape demonstrator
// ---------------------------------------------------------------------------

describe('Klein-Gordon as TensorEquationNode Phase 1 demonstrator', () => {
  // The "validator body is THIN" anchor that stood here asserted only that the import was a
  // function, which no change to the validator could fail (law 3); removed 2026-10-15. The
  // behaviour the helpers give it is the error-keyword vocabulary below.

  it('shares error-keyword vocabulary with EinsteinFieldEquationNode', () => {
    // Both should throw errors containing "dimension" / "symmetry" /
    // "index label" — the field-equation-helpers ensure this by
    // construction.
    const badDim: KleinGordonEquationNode = {
      kind: 'klein-gordon-equation',
      field: scalarField('phi', DIMENSIONLESS),
      mass: scalarField('bad', DIMENSIONLESS),
      source: null,
      coupling: 'klein-gordon',
    };
    try {
      validateKleinGordonEquation(badDim);
      expect.fail('Should have thrown');
    } catch (e) {
      // "dimension" keyword pinned across the helper extraction.
      expect((e as Error).message).toMatch(/dimension/);
    }
  });
});
