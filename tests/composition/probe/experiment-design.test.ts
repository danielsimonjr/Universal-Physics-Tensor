/**
 * parseDesignBounds + suggestDiscriminatingPoint edge coverage.
 */
import { describe, it, expect } from 'vitest';
import { parseDesignBounds, suggestDiscriminatingPoint } from '../../../src/composition/probe/experiment-design.js';
import { sym } from '../../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../../../src/dimensional/types.js';

describe('parseDesignBounds', () => {
  it('accepts a well-formed bounds object', () => {
    const b = parseDesignBounds(
      {
        variables: { x: { min: 0, max: 1, steps: 4 } },
        forbidden: [{ x: { min: 0.9, max: 1 } }],
        sigma: 2,
      },
      'test.json',
    );
    expect(b.variables.x).toEqual({ min: 0, max: 1, steps: 4 });
    expect(b.sigma).toBe(2);
    expect(b.forbidden).toHaveLength(1);
  });

  it('rejects non-object roots', () => {
    expect(() => parseDesignBounds(null, 'x')).toThrow(/not an object/);
    expect(() => parseDesignBounds([], 'x')).toThrow(/not an object/);
  });

  it('rejects missing variables', () => {
    expect(() => parseDesignBounds({}, 'x')).toThrow(/missing variables/);
    expect(() => parseDesignBounds({ variables: [] }, 'x')).toThrow(/missing variables/);
  });

  it('rejects bad variable specs', () => {
    expect(() => parseDesignBounds({ variables: { x: null } }, 'x')).toThrow(/variables\.x is not an object/);
    expect(() => parseDesignBounds({ variables: { x: { min: 1, max: NaN } } }, 'x')).toThrow(/finite min\/max/);
    expect(() => parseDesignBounds({ variables: { x: { min: 2, max: 1 } } }, 'x')).toThrow(/min > max/);
    expect(() => parseDesignBounds({ variables: { x: { min: 0, max: 1, steps: 0 } } }, 'x')).toThrow(
      /steps must be a positive integer/,
    );
  });

  it('rejects bad forbidden and sigma', () => {
    expect(() => parseDesignBounds({ variables: { x: { min: 0, max: 1 } }, forbidden: {} }, 'x')).toThrow(
      /forbidden must be an array/,
    );
    expect(() =>
      parseDesignBounds({ variables: { x: { min: 0, max: 1 } }, forbidden: [null] }, 'x'),
    ).toThrow(/forbidden\[0\] is not an object/);
    expect(() =>
      parseDesignBounds(
        { variables: { x: { min: 0, max: 1 } }, forbidden: [{ x: { min: 0, max: NaN } }] },
        'x',
      ),
    ).toThrow(/forbidden\[0\]\.x needs finite min\/max/);
    expect(() =>
      parseDesignBounds({ variables: { x: { min: 0, max: 1 } }, sigma: -1 }, 'x'),
    ).toThrow(/sigma must be a positive number/);
  });
});

describe('suggestDiscriminatingPoint — eval failures', () => {
  it('abstains when every grid point yields non-finite predictions', () => {
    const h1 = { kind: 'op' as const, op: '/' as const, args: [sym('1', DIMENSIONLESS), sym('x', DIMENSIONLESS)] };
    const h2 = sym('x', DIMENSIONLESS);
    const s = suggestDiscriminatingPoint(h1, h2, {
      variables: { x: { min: 0, max: 0, steps: 2 } },
    });
    expect(s.abstained).toBe(true);
    expect(s.reason).toMatch(/forbidden or non-finite/);
  });
});
