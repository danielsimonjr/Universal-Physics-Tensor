/**
 * Exact rational exponents in proposals and shapes (proposal 5).
 *
 * `proposed-bridges.ts` and `formula-shape.ts` carried exponents as doubles,
 * so solving for a cubed leaf wrote `0.6666666666666666` into a Part XI
 * proposal, two routes to the same relation could differ in the last bit and
 * fail to dedupe, and an exact zero test could miss a cancellation. The
 * exponents are core `Fraction`s now; the AST literal is the double built
 * from the fraction, and the LaTeX is rendered from the fraction.
 */
import { describe, expect, it } from 'vitest';
import { Fraction } from '@danielsimonjr/mathts-core';
import { monomialExponents, monomialExponentsExact } from '../../src/composition/formula-shape.js';
import {
  dedupByNormalForm,
  fromMonomial,
  isolateLeaf,
  latexFromMono,
  toMonomial,
  type ProposedBridge,
} from '../../src/composition/proposed-bridges.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { format } from '../../src/dimensional/algebra.js';
import { validate } from '../../src/dimensional/validator.js';

const L = { ...DIMENSIONLESS, L: 1 };
const sym = (name: string, dim = DIMENSIONLESS): ExprNode => ({ kind: 'symbol', name, dim });
const pow = (base: ExprNode, exp: string): ExprNode => ({ kind: 'op', op: '^', args: [base, sym(exp)] });
const mul = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const div = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [a, b] });
const frac = (n: number, d = 1) => new Fraction(n, d);

describe('monomialExponentsExact', () => {
  it('reads a literal exponent as the rational it stands for', () => {
    const m = monomialExponentsExact(pow(sym('x', L), '0.3333333333333333'))!;
    expect(m.get('x')!.equals(frac(1, 3))).toBe(true);
    const half = monomialExponentsExact(div(pow(mul(sym('a', L), sym('b', L)), '0.5'), sym('c', L)))!;
    expect(half.get('a')!.equals(frac(1, 2))).toBe(true);
    expect(half.get('b')!.equals(frac(1, 2))).toBe(true);
    expect(half.get('c')!.equals(frac(-1))).toBe(true);
  });

  it('is undefined for a sum, and the numeric reader is its projection', () => {
    expect(monomialExponentsExact({ kind: 'op', op: '+', args: [sym('a', L), sym('b', L)] })).toBeUndefined();
    const node = div(pow(mul(sym('a', L), sym('b', L)), '0.5'), sym('c', L));
    const numeric = monomialExponents(node)!;
    const exact = monomialExponentsExact(node)!;
    for (const [name, f] of exact) expect(numeric.get(name)).toBe(Number(f.numerator) / Number(f.denominator));
  });

  it('a cancellation is an exact zero: (x^(1/3))^3 / x', () => {
    const m = monomialExponentsExact(div(pow(pow(sym('x', L), '0.3333333333333333'), '3'), sym('x', L)))!;
    expect(m.get('x')!.isZero()).toBe(true);
  });
});

describe('toMonomial carries Fractions', () => {
  it('a literal exponent is exact and a repeated leaf adds exactly', () => {
    const m = toMonomial(mul(pow(sym('x', L), '0.3333333333333333'), pow(sym('x', L), '0.6666666666666666')));
    expect(m.get('x')!.exp.equals(frac(1))).toBe(true);
  });
});

describe('solving y = x³ for x', () => {
  const m1 = toMonomial(sym('y', { ...DIMENSIONLESS, L: 3 }));
  const m2 = toMonomial(pow(sym('x', L), '3'));
  const solved = isolateLeaf(m1, m2, { name: 'x', dim: L, exp: frac(3) });

  it('prints ^{1/3} in the LaTeX, from the fraction', () => {
    expect(latexFromMono(solved)).toBe('y^{1/3}');
  });

  it('the AST literal is the double built from 1/3 and reads back as exactly 1/3', () => {
    const ast = fromMonomial(solved);
    expect(ast).toEqual(pow(sym('y', { ...DIMENSIONLESS, L: 3 }), String(1 / 3)));
    expect(monomialExponentsExact(ast)!.get('y')!.equals(frac(1, 3))).toBe(true);
    expect(format(validate(ast).inferredDimension!)).toBe(format(L));
  });
});

describe('dedupByNormalForm — two proposals that differ by rounding are one', () => {
  const proposal = (id: string, literal: string): ProposedBridge => {
    const scalarAst = pow(sym('y', { ...DIMENSIONLESS, L: 3 }), literal);
    return {
      id,
      derivedFrom: { identification: { a: `a-${id}`, b: `b-${id}`, dim: '[length]' }, sourceEquationIds: ['E1', 'E2'], solvedFor: 'x' },
      target: { name: 'x', dim: L },
      governing: [{ name: 'y', dim: { ...DIMENSIONLESS, L: 3 } }],
      formulaLatex: `x = y^{1/3}`,
      scalarAst,
      dimensionalSignature: format(L),
      provenance: 'synthetic',
      alsoDerivableFrom: [],
      status: 'unadjudicated',
      evaluate: () => 0,
    };
  };

  it('0.3333333333333333 and 0.33333333333333337 are both 1/3, so the second folds into the first', () => {
    const deduped = dedupByNormalForm([proposal('p1', '0.3333333333333333'), proposal('p2', '0.33333333333333337')]);
    expect(deduped.map((p) => p.id)).toEqual(['p1']);
    expect(deduped[0]!.alsoDerivableFrom).toEqual(['a-p2 ≡ b-p2']);
  });

  it('control: 1/3 and 1/2 stay two proposals', () => {
    const deduped = dedupByNormalForm([proposal('p1', '0.3333333333333333'), proposal('p2', '0.5')]);
    expect(deduped.map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});
