/**
 * Plan task P5, RED (a) and (a′): the MathTS `ScalarNode` → UPT `ExprNode` converter and the
 * UPT `Dimension` → MathTS `RationalDimension` converter of `composition/probe/scalar-search`.
 */
import { describe, expect, it } from 'vitest';
import { createScalarBuilder } from '@danielsimonjr/mathts-expression';
import { unitToRationalDimension } from '@danielsimonjr/mathts-functions';
import {
  dimensionToRational,
  scalarNodeToExpr,
} from '../../../src/composition/probe/scalar-search.js';
import type { Dimension } from '../../../src/dimensional/types.js';

const Z: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const LEN: Dimension = { ...Z, L: 1 };
const TIME: Dimension = { ...Z, T: 1 };
const b = createScalarBuilder();
const vars = new Map<string, Dimension>([['x', LEN], ['t', TIME]]);
const sym = (name: string, dim: Dimension) => ({ kind: 'symbol', name, dim });

describe('scalarNodeToExpr', () => {
  it('maps symbols to the governing dimension and numbers to dimensionless literals', () => {
    const tree = b.op('*', [b.number(2), b.op('/', [b.symbol('x'), b.symbol('t')])]);
    expect(scalarNodeToExpr(tree, vars)).toEqual({
      kind: 'op',
      op: '*',
      args: [sym('2', Z), { kind: 'op', op: '/', args: [sym('x', LEN), sym('t', TIME)] }],
    });
  });

  it('maps log to log10 and ln to ln, and abs to the abs node', () => {
    expect(scalarNodeToExpr(b.call('ln', b.symbol('x')), vars)).toEqual({
      kind: 'transcendental', fn: 'ln', arg: sym('x', LEN),
    });
    expect(scalarNodeToExpr(b.call('log', b.symbol('x')), vars)).toEqual({
      kind: 'transcendental', fn: 'log10', arg: sym('x', LEN),
    });
    expect(scalarNodeToExpr(b.call('abs', b.symbol('t')), vars)).toEqual({
      kind: 'abs', arg: sym('t', TIME),
    });
  });

  it('maps sqrt(x) to x ^ 0.5', () => {
    expect(scalarNodeToExpr(b.call('sqrt', b.symbol('x')), vars)).toEqual({
      kind: 'op', op: '^', args: [sym('x', LEN), sym('0.5', Z)],
    });
  });

  it('throws on a symbol that is not a governing variable, and on atan', () => {
    expect(() => scalarNodeToExpr(b.symbol('c'), vars)).toThrow(/unknown symbol 'c'/);
    expect(() => scalarNodeToExpr(b.call('atan', b.symbol('x')), vars)).toThrow(/'atan' has no UPT form/);
  });
});

describe('dimensionToRational', () => {
  it('agrees per axis with MathTS unitToRationalDimension (catches an axis-order error)', () => {
    const cases: Array<[string, Dimension]> = [
      ['N', { ...Z, L: 1, M: 1, T: -2 }],
      ['V', { ...Z, L: 2, M: 1, T: -3, I: -1 }],
      ['mol/cd', { ...Z, N: 1, J: -1 }],
      ['K', { ...Z, Theta: 1 }],
    ];
    for (const [unit, dim] of cases) {
      const ours = dimensionToRational(dim).map((f) => f.toString());
      const theirs = unitToRationalDimension(unit).map((f) => f.toString());
      expect(ours, unit).toEqual(theirs);
    }
  });

  it('keeps a half-integer exponent exact and throws on one that does not rationalize', () => {
    expect(dimensionToRational({ ...Z, L: 0.5 })[0].toString()).toBe('1/2');
    expect(() => dimensionToRational({ ...Z, L: Math.PI })).toThrow(/L = 3.14\d* is not rational/);
  });
});
