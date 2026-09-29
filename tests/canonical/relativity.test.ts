/**
 * Relativity canonical entries (Task 9): EFE at L2 (its field-equation node must
 * pass the existing structural validator) and Friedmann at L1 (scalar form
 * validates dimensionally).
 *
 * @module tests/canonical/relativity
 */
import { describe, it, expect } from 'vitest';
import { validateEinsteinFieldEquation } from '../../src/dimensional/einstein-equation.js';
import { validate } from '../../src/dimensional/validator.js';
import { canonicalById } from '../../src/canonical/registry.js';
import { RELATIVITY } from '../../src/canonical/entries/relativity.js';

const RELATIVITY_IDS = [
  'CE-einstein-field-eq',
  'CE-friedmann',
  'CE-friedmann-curvature',
  'CE-hawking-temperature',
  'CE-light-deflection',
  'CE-perihelion-precession',
  // Folded in from the former l1-gravity-thermo batch file (2026-06-22
  // god-file split): the gravitation-domain entries.
  'CE-bekenstein-hawking',
  'CE-newton-gravitation',
].sort();

describe('canonical relativity entries', () => {
  it('has the relativity/gravitation law set', () => {
    expect(RELATIVITY.map((e) => e.id).sort()).toEqual(RELATIVITY_IDS);
  });

  it('CE-einstein-field-eq carries a field-equation node that validates (L2)', () => {
    const efe = canonicalById('CE-einstein-field-eq');
    expect(efe).toBeDefined();
    expect(efe?.fieldEquation).toBeDefined();
    const result = validateEinsteinFieldEquation(efe!.fieldEquation!);
    // EFE is a rank-2 lower-lower identity with per-component dim [L⁻²].
    expect(result.dim).toEqual({ L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 });
    expect(result.freeIndices.size).toBe(2);
    expect(efe?.fieldEquation?.metric.signature).toBe('-,+,+,+');
  });

  it('CE-friedmann scalar form validates to [T⁻²] (L1)', () => {
    const fr = canonicalById('CE-friedmann');
    expect(fr?.scalarAst).toBeDefined();
    const res = validate(fr!.scalarAst!);
    expect(res.ok).toBe(true);
    expect(res.inferredDimension).toEqual({
      L: 0,
      M: 0,
      T: -2,
      I: 0,
      Theta: 0,
      N: 0,
      J: 0,
    });
  });

  const TEMP = { L: 0, M: 0, T: 0, I: 0, Theta: 1, N: 0, J: 0 };
  const DLESS = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
  const ENTROPY = { L: 2, M: 1, T: -2, I: 0, Theta: -1, N: 0, J: 0 };
  const FORCE = { L: 1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
  const newGR: Array<[string, typeof TEMP]> = [
    ['CE-hawking-temperature', TEMP],
    ['CE-light-deflection', DLESS],
    ['CE-perihelion-precession', DLESS],
    ['CE-bekenstein-hawking', ENTROPY],
    ['CE-newton-gravitation', FORCE],
  ];
  for (const [id, dim] of newGR) {
    it(`${id} scalar form validates to its target dimension`, () => {
      const e = canonicalById(id);
      expect(e?.scalarAst).toBeDefined();
      const res = validate(e!.scalarAst!);
      expect(res.ok).toBe(true);
      expect(res.inferredDimension).toEqual(dim);
    });
  }
});
