/**
 * Buckingham filter (design step 6). A units-only shape names a
 * PhysJS.Dimensional theorem and stays a derivation-step. The filter
 * calls the dimensional engine. It does not import atlas or the probe.
 *
 * Before the span check, mass alone still produced a record for a
 * length. The absence test fails if that check is deleted.
 * A record that stores a filled-in constant fails the control.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  deriveEvidence,
  NO_PASSING_WITNESSES,
} from '../../src/atlas/derive-evidence.js';
import { buckinghamFilter } from '../../src/composition/buckingham-filter.js';
import type { DimensionalVariable } from '../../src/dimensional/buckingham.js';
import type { Dimension } from '../../src/dimensional/types.js';
import {
  ACCELERATION,
  DIMENSIONLESS,
  FORCE,
  LENGTH,
  MASS,
  TIME,
  VELOCITY,
} from '../../src/dimensional/types.js';

const v = (name: string, dim: Dimension): DimensionalVariable => ({ name, dim });

const GRAV_CONSTANT: Dimension = {
  L: 3, M: -1, T: -2, I: 0, Theta: 0, N: 0, J: 0,
};

function source(): string {
  return readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../src/composition/buckingham-filter.ts'),
    'utf8',
  );
}

/** True when the record does not store a numeric prefactor. */
function rejectsFilledConstant(record: object): boolean {
  return !('constant' in record) && !('value' in record) && !('prefactor' in record);
}

describe('buckingham filter', () => {
  it('calls the dimensional engine and does not import atlas or the probe', () => {
    const text = source();
    expect(text).toMatch(/dimensionallyDetermines/);
    expect(text).toMatch(/buckinghamPi/);
    expect(text).not.toMatch(/from ['"][^'"]*atlas/);
    expect(text).not.toMatch(/probe\/generator/);
    expect(text).not.toMatch(/function nullSpace|function rref/);
  });

  it('a determined monomial records the exponent tuple and names monomial_form', () => {
    const record = buckinghamFilter(v('period', TIME), [
      v('length', LENGTH),
      v('gravity', ACCELERATION),
    ]);
    expect(record).toBeDefined();
    expect(record!.theorem).toBe('PhysJS.Dimensional.monomial_form');
    expect(record!.monomial).toEqual({ length: 0.5, gravity: -0.5 });
    expect(record!.kind).toBe('derivation-step');
    expect(record!.covers.startsWith('derivation-step:')).toBe(true);
    expect(record!.covers).toContain('PhysJS.Dimensional.monomial_form');
    expect(record!.covers).toContain('f(1,…,1)');
    expect(record!.covers).toContain('unfixed');
    expect(record!.covers).toContain('length^0.5');
    expect(record!.covers).toContain('gravity^-0.5');
    expect(record!.covers).toMatch(/unit change/i);
    expect(rejectsFilledConstant(record!)).toBe(true);
  });

  it('a product of two magnitudes names product_shape', () => {
    const record = buckinghamFilter(v('force', FORCE), [
      v('mass', MASS),
      v('acceleration', ACCELERATION),
    ]);
    expect(record!.theorem).toBe('PhysJS.Dimensional.product_shape');
    expect(record!.monomial).toEqual({ mass: 1, acceleration: 1 });
    expect(record!.covers.startsWith('derivation-step:')).toBe(true);
    expect(record!.covers).toContain('PhysJS.Dimensional.product_shape');
    expect(record!.covers).toContain('f(1,1)');
    expect(record!.covers).toContain('unfixed');
    expect(rejectsFilledConstant(record!)).toBe(true);
  });

  it('one remaining ratio names ratio_shape', () => {
    const record = buckinghamFilter(v('period', TIME), [
      v('length', LENGTH),
      v('gravity', ACCELERATION),
      v('angle', DIMENSIONLESS),
    ]);
    expect(record!.theorem).toBe('PhysJS.Dimensional.ratio_shape');
    expect(record!.determined).toBe(false);
    expect(record!.monomial).toBeUndefined();
    expect(record!.covers.startsWith('derivation-step:')).toBe(true);
    expect(record!.covers).toContain('PhysJS.Dimensional.ratio_shape');
    expect(record!.covers).toContain('unfixed');
    expect(record!.kind).toBe('derivation-step');
  });

  it('an unfixed real power names ratio_power_invariant', () => {
    const record = buckinghamFilter(v('eta', DIMENSIONLESS), [
      v('a', LENGTH),
      v('b', LENGTH),
    ]);
    expect(record!.theorem).toBe('PhysJS.Dimensional.ratio_power_invariant');
    expect(record!.determined).toBe(false);
    expect(record!.covers.startsWith('derivation-step:')).toBe(true);
    expect(record!.covers).toContain('PhysJS.Dimensional.ratio_power_invariant');
    expect(record!.covers).toContain('unfixed');
    expect(record!.covers).toMatch(/\bp\b/);
  });

  it('a free π-group is not a unique monomial', () => {
    const record = buckinghamFilter(v('period', TIME), [
      v('length', LENGTH),
      v('gravity', ACCELERATION),
      v('angle', DIMENSIONLESS),
      v('phase', DIMENSIONLESS),
    ]);
    expect(record).toBeDefined();
    expect(record!.determined).toBe(false);
    expect(record!.theorem).not.toBe('PhysJS.Dimensional.monomial_form');
    expect(record!.monomial).toBeUndefined();
    expect(record!.kind).toBe('derivation-step');
    expect(record!.covers.startsWith('derivation-step:')).toBe(true);
    expect(record!.covers).toMatch(/free π-group/);
  });

  it('a chain that is not homogeneous is absent', () => {
    expect(
      buckinghamFilter(v('radius', LENGTH), [v('mass', MASS)]),
    ).toBeUndefined();
    expect(
      buckinghamFilter(v('length', LENGTH), [
        v('angle', DIMENSIONLESS),
        v('phase', DIMENSIONLESS),
        v('mass', MASS),
      ]),
    ).toBeUndefined();
  });

  it('CONTROL: a record that stores a filled-in constant fails', () => {
    const record = buckinghamFilter(v('period', TIME), [
      v('length', LENGTH),
      v('gravity', ACCELERATION),
    ])!;
    expect(rejectsFilledConstant(record)).toBe(true);
    expect(rejectsFilledConstant({ ...record, constant: 2 * Math.PI })).toBe(false);
  });

  it('a derivation-step never counts as formally-proved', () => {
    const record = buckinghamFilter(v('radius', LENGTH), [
      v('mass', MASS),
      v('G', GRAV_CONSTANT),
      v('c', VELOCITY),
    ])!;
    expect(record.theorem).toBe('PhysJS.Dimensional.monomial_form');
    expect(record.kind).toBe('derivation-step');
    const tags = deriveEvidence(
      { formalRef: { fidelity: 'sanity-lemmas', kind: record.kind } },
      NO_PASSING_WITNESSES,
    );
    expect(tags.has('formally-proved')).toBe(false);
    const flipped = deriveEvidence(
      { formalRef: { fidelity: 'sanity-lemmas', kind: 'bridge' } },
      NO_PASSING_WITNESSES,
    );
    expect(flipped.has('formally-proved')).toBe(true);
  });
});
