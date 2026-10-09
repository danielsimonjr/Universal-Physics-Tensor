/**
 * Dimensional validation of definite-integral bounds: the lower/upper bounds are
 * points on the integration axis, so each must carry the integration variable's
 * dimension; the integral's dimension is dim(integrand)·dim(over) regardless.
 *
 * @module tests/dimensional/integral-bounds-validation
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/dimensional/validator.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { equals } from '../../src/dimensional/algebra.js';
import { DIMENSIONLESS, LENGTH, TIME } from '../../src/dimensional/types.js';
import { sym } from '../../src/dimensional/ast-builders.js';

describe('definite integral — bound dimensions', () => {
  it('∫ over LENGTH with LENGTH bounds and a dimensionless integrand → [length]', () => {
    const expr: ExprNode = {
      kind: 'integral',
      over: sym('x', LENGTH),
      integrand: sym('k', DIMENSIONLESS),
      lower: sym('a', LENGTH),
      upper: sym('b', LENGTH),
    };
    const r = validate(expr);
    expect(r.ok).toBe(true);
    expect(equals(r.inferredDimension!, LENGTH)).toBe(true);
  });

  it('rejects a bound whose dimension differs from the integration variable', () => {
    const expr: ExprNode = {
      kind: 'integral',
      over: sym('x', LENGTH),
      integrand: sym('k', DIMENSIONLESS),
      lower: sym('a', LENGTH),
      upper: sym('t', TIME), // wrong: a time bound on a length axis
    };
    const r = validate(expr);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => /integration variable's dimension/i.test(v.note ?? ''))).toBe(true);
  });

  it('bound-less integral still validates (abstract, dimensional-only)', () => {
    const expr: ExprNode = {
      kind: 'integral',
      over: sym('x', LENGTH),
      integrand: sym('k', DIMENSIONLESS),
    };
    const r = validate(expr);
    expect(r.ok).toBe(true);
    expect(equals(r.inferredDimension!, LENGTH)).toBe(true);
  });
});
