/**
 * MathTS 0.67.0 is the implementation behind the seams UPT used to keep
 * locally. These assertions fail while the local copies are still the
 * implementation.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { E_SI } from '../../src/core/constants.js';
import { buckinghamPi } from '../../src/dimensional/buckingham.js';
import { DIMENSIONLESS, LENGTH, TIME } from '../../src/dimensional/types.js';
import { parseFormula } from '../../src/numerical/formula-mathts.js';

function source(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), 'utf8');
}

describe('MathTS 0.67.0 delegation', () => {
  it('evaluates bare e through physics scalar mode, and a caller binding still wins', () => {
    const src = source('../../src/numerical/formula-mathts.ts');
    expect(src).toMatch(/charge:\s*'scalar'/);
    expect(src).not.toMatch(/PHYSICS_VALUES/);
    expect(parseFormula('1-e^2').evaluate({})).toBeCloseTo(1 - E_SI ** 2, 12);
    expect(parseFormula('e').evaluate({ e: 4 })).toBe(4);
    expect(parseFormula('exp(1)').evaluate({})).toBeCloseTo(Math.E, 12);
    expect(parseFormula('E').variables).toEqual(['E']);
  });

  it('the Buckingham null space is rationalNullspace, including a matrix with no rows', () => {
    expect(source('../../src/dimensional/buckingham.ts')).toMatch(/rationalNullspace/);
    const groups = buckinghamPi([
      { name: 'a', dim: DIMENSIONLESS },
      { name: 'b', dim: DIMENSIONLESS },
    ]);
    expect(groups.rank).toBe(0);
    expect(groups.piGroups.map((g) => g.exponents)).toEqual([
      { a: 1, b: 0 },
      { a: 0, b: 1 },
    ]);
    const pendulum = buckinghamPi([
      { name: 'period', dim: TIME },
      { name: 'length', dim: LENGTH },
      { name: 'gravity', dim: { L: 1, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 } },
    ]);
    expect(pendulum.piGroups.map((g) => g.exponents)).toEqual([
      { period: 2, length: -1, gravity: 1 },
    ]);
  });

  it('both uncertainty contracts and the GL4 step call MathTS', () => {
    expect(source('../../src/composition/uncertainty.ts')).toMatch(/relativeStep/);
    expect(source('../../src/numerical/evaluator-uncertainty.ts')).toMatch(/curvatureOffsets/);
    const gl4 = source('../../src/numerical/gl4-integrator.ts');
    expect(gl4).toMatch(/gaussLegendre4/);
    expect(gl4).not.toMatch(/solveODE/);
  });

  // The MathTS unit reading (`unit`, `toSI`, `toSiDimensionVector`) is the second method of the unit
  // table, checked row by row in tests/dimensional/exact-unit-scale.test.ts; conversion itself is exact.
});
