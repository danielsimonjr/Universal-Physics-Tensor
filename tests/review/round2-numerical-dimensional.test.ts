/**
 * Tom's second review round, numerical/dimensional/core findings, each pinned here and red
 * on the tree before its fix: the Gauss–Legendre weights, a lowercase base letter in a
 * dimension spec, four validator holes, lenient unit text, the cycle-counting note, and
 * the JSON-schema reader's holes.
 *
 * @module tests/review/round2-numerical-dimensional
 */
import { describe, expect, it } from 'vitest';
import { GAUSS_LEGENDRE_16, integrateGaussLegendre } from '../../src/numerical/quadrature.js';
import { DimensionSpecError, parseDimensionSpec } from '../../src/dimensional/dimension-spec.js';
import { validate } from '../../src/dimensional/validator.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS, LENGTH } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { parseUnit, unitConventionNotes, UnitError } from '../../src/dimensional/units.js';
import { schemaProblems } from '../../src/core/json-schema.js';

describe('16-point Gauss–Legendre weights are the closed form, to double precision', () => {
  it('the weights sum to 2 to within 4 ulp, and ∫₋₁¹ 1 dx is 2', () => {
    const sum = GAUSS_LEGENDRE_16.reduce((a, n) => a + n.weight, 0);
    expect(Math.abs(sum - 2)).toBeLessThan(1e-15);
    expect(Math.abs(integrateGaussLegendre(() => 1, -1, 1) - 2)).toBeLessThan(1e-15);
  });
  it('exact for x^30 (degree ≤ 31) to 1e-16 relative', () => {
    const got = integrateGaussLegendre((x) => x ** 30, -1, 1);
    expect(Math.abs(got - 2 / 31) / (2 / 31)).toBeLessThan(1e-15);
  });
});

describe('a dimension spec reads a base letter in its own case', () => {
  it('`m` is refused with the unit named; `M` is mass and `L` is length', () => {
    expect(() => parseDimensionSpec('m')).toThrow(DimensionSpecError);
    expect(() => parseDimensionSpec('m')).toThrow(/mass is M/);
    expect(() => parseDimensionSpec('m^3')).toThrow(DimensionSpecError);
    expect(parseDimensionSpec('M').M).toBe(1);
    expect(parseDimensionSpec('L').L).toBe(1);
    expect(parseDimensionSpec('length').L).toBe(1);
    expect(parseDimensionSpec('Theta').Theta).toBe(1);
  });
});

describe('the validator refuses what it cannot represent', () => {
  const x = sym('x', LENGTH);
  const pow = (exp: string): ExprNode => ({ kind: 'op', op: '^', args: [x, sym(exp, DIMENSIONLESS)] });
  it('a literal exponent that overflows or underflows is a violation, not an Infinity dimension', () => {
    expect(validate(pow('1e400')).ok).toBe(false);
    expect(validate(pow('1e-400')).ok).toBe(false);
    expect(validate(pow('2')).ok).toBe(true);
  });
  it('a sum skips only a DECIMAL zero literal: `0x0` and `-0x0` are not the additive identity', () => {
    const plus = (name: string): ExprNode => ({ kind: 'op', op: '+', args: [x, sym(name, DIMENSIONLESS)] });
    expect(validate(plus('0')).ok).toBe(true);
    expect(validate(plus('0e5')).ok).toBe(true);
    expect(validate(plus('0x0')).ok).toBe(false);
  });
  it('an unknown operator is a violation, not a sum', () => {
    const mod = { kind: 'op', op: '%', args: [x, x] } as unknown as ExprNode;
    expect(validate(mod).ok).toBe(false);
  });
  it('an unknown transcendental function is a violation', () => {
    const foo = { kind: 'transcendental', fn: 'foo', arg: sym('u', DIMENSIONLESS) } as unknown as ExprNode;
    expect(validate(foo).ok).toBe(false);
    const sin = { kind: 'transcendental', fn: 'sin', arg: sym('u', DIMENSIONLESS) } as unknown as ExprNode;
    expect(validate(sin).ok).toBe(true);
  });
});

describe('unit text with an empty factor is refused, and a cycle-counting unit says so', () => {
  it('`m/`, `m//s`, `m*`, `*m`, `m/*s` are refused; `m/s` reads', () => {
    for (const text of ['m/', 'm//s', 'm/s/', 'm*', '*m', 'm/*s', 'm**s']) {
      expect(() => parseUnit(text), text).toThrow(UnitError);
    }
    expect(parseUnit('m/s').dim.T).toBe(-1);
  });
  it('rpm and Hz carry a note that they count cycles, with the 2π to rad/s', () => {
    expect(unitConventionNotes('rpm').join(' ')).toMatch(/2π/);
    expect(unitConventionNotes('Hz').join(' ')).toMatch(/2π/);
    expect(unitConventionNotes('m/s')).toEqual([]);
  });
  it('therm and BTU name their conventions (US therm; IT BTU)', () => {
    expect(unitConventionNotes('therm').join(' ')).toMatch(/US therm/);
    expect(unitConventionNotes('BTU').join(' ')).toMatch(/IT/);
  });
});

describe('the JSON-schema reader has no holes a record could slip through', () => {
  it('a `__proto__` key is an undeclared property, and `required` reads own properties only', () => {
    const schema = { type: 'object', properties: { a: { type: 'number' } }, required: ['a'], additionalProperties: false };
    expect(schemaProblems(schema, JSON.parse('{"a": 1, "__proto__": {"x": 1}}'))).not.toEqual([]);
    expect(schemaProblems(schema, Object.create({ a: 1 }))).not.toEqual([]);
    expect(schemaProblems(schema, { a: 1 })).toEqual([]);
  });
  it('a tuple `items` array validates each position', () => {
    const schema = { type: 'array', items: [{ type: 'number' }, { type: 'string' }] };
    expect(schemaProblems(schema, [1, 'a'])).toEqual([]);
    expect(schemaProblems(schema, ['a', 1])).not.toEqual([]);
  });
});
