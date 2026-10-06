/**
 * Symbolic exponents on a dimensionless base (v0.13 — `^` grammar extension,
 * Adam+Eve-vetted; docs/planning/v0.13-Symbolic-Exponent-Design.md).
 *
 * A non-literal (input-dependent) exponent is sound iff the base is
 * dimensionless: dimensionless^(dimensionless) = dimensionless. Literal
 * exponents (any base) are unchanged; a dimensionful base with a non-literal
 * exponent still violates (the pinned shape). The real consumer is BE-33's
 * faithful Hertz-Millis form `ξ_0·(T/T_0)^(−1/z)`.
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/dimensional/validator.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { equals } from '../../src/dimensional/algebra.js';
import { TensorInScalarOpError } from '../../src/dimensional/errors.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { catalogEdgeKey } from '../../src/bridges/catalog-load.js';
import { catalogEdge } from '../../src/composition/index.js';

const edge33 = catalogEdge(catalogEdgeKey(33));
import {
  LENGTH,
  TEMPERATURE,
  VELOCITY,
  ENERGY,
  DIMENSIONLESS,
  type Dimension,
} from '../../src/dimensional/types.js';

const s = (name: string, dim: Dimension = DIMENSIONLESS): ExprNode => ({ kind: 'symbol', name, dim });
const op = (o: '+' | '-' | '*' | '/' | '^', ...args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args });

describe('validator `^` — symbolic exponent on a dimensionless base', () => {
  it('dimensionless base + dimensionless variable exponent → dimensionless', () => {
    // (x/x)^n : base cancels to dimensionless, exponent n is a dimensionless var.
    const expr = op('^', op('/', s('x', LENGTH), s('x', LENGTH)), s('n', DIMENSIONLESS));
    const r = validate(expr);
    expect(r.ok).toBe(true);
    expect(equals(r.inferredDimension!, DIMENSIONLESS)).toBe(true);
  });

  it("the BE-33 faithful form ξ_0·(T/T_0)^(−1/z) validates to [length]", () => {
    const r = validate(edge33.symbolic!);
    expect(r.ok).toBe(true);
    expect(equals(r.inferredDimension!, LENGTH)).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it('dimensionFUL base + non-literal exponent is REJECTED (the pinned shape)', () => {
    const expr = op('^', s('x', LENGTH), s('n', DIMENSIONLESS));
    const r = validate(expr);
    expect(r.ok).toBe(false);
    const v = r.violations.find((x) => /\^ exponent must be/.test(x.note));
    expect(v).toBeDefined();
    expect(v!.expected).toEqual(DIMENSIONLESS);
  });

  it('dimensionless base + DIMENSIONFUL exponent → "exponent must be dimensionless"', () => {
    const expr = op('^', s('r', DIMENSIONLESS), s('E', ENERGY));
    const r = validate(expr);
    expect(r.ok).toBe(false);
    expect(r.violations.some((x) => /exponent must be dimensionless/.test(x.note))).toBe(true);
  });

  it('a literal exponent is unchanged on a dimensionful base (c^3 → velocity³)', () => {
    const r = validate(op('^', s('c', VELOCITY), s('3', DIMENSIONLESS)));
    expect(r.ok).toBe(true);
    expect(equals(r.inferredDimension!, { L: 3, M: 0, T: -3, I: 0, Theta: 0, N: 0, J: 0 })).toBe(true);
  });

  it('a TENSOR exponent on a dimensionless base throws TensorInScalarOpError', () => {
    const tensorExp: ExprNode = {
      kind: 'tensor-symbol',
      name: 'V',
      indices: [{ label: 'a', variance: 'upper' }],
      dim: DIMENSIONLESS,
    };
    expect(() => validate(op('^', s('r', DIMENSIONLESS), tensorExp))).toThrow(TensorInScalarOpError);
  });
});

describe('evalExpr `^` — general exponent', () => {
  it('evaluates a variable (input-dependent) exponent', () => {
    // (a/b)^(c) with a=9,b=1,c=0.5 → 9^0.5 = 3
    const expr = op('^', op('/', s('a'), s('b')), s('c'));
    expect(evalExpr(expr, { a: 9, b: 1, c: 0.5 })).toBeCloseTo(3, 12);
  });

  it('the BE-33 form evaluates (T/T_0)^(−1/z) matching the closed form', () => {
    // ξ_0·(T/T_0)^(−1/z), {ξ_0:1e-9, T:300, T_0:100, z:2} → 1e-9·3^(−0.5)
    const v = evalExpr(edge33.symbolic!, {
      'reference-correlation-length': 1e-9,
      temperature: 300,
      'reference-temperature': 100,
      'dynamic-exponent-z': 2,
    });
    expect(Math.abs(v - 1e-9 * Math.pow(3, -0.5)) / (1e-9 * Math.pow(3, -0.5))).toBeLessThan(1e-12);
  });
});
