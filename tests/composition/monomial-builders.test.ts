/**
 * Two monomial builders, one shared core, and why they stay two.
 *
 * `monomialToExpr` (src/composition/probe/generator.ts) writes `Π xᵢ^eᵢ` as ONE product with
 * negative exponents, names in code-unit order (`sort()`). `fromMonomial`
 * (src/composition/proposed-bridges.ts) writes a numerator over a denominator with positive
 * exponents, names in `localeCompare` order. Their outputs are different trees for the same
 * monomial (pinned below), and those trees are printed (`upt probe` candidates, `upt discover
 * --derive` proposals) and hashed, so merging the two would move printed text. They share the
 * one piece that is the same in both, a base raised to an exponent with the exponent 1 left bare
 * (`symbolPower`, src/dimensional/ast-builders.ts), and each says beside it why it is not merged.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Fraction } from '@danielsimonjr/mathts-core';
import { dim, sym, symbolPower } from '../../src/dimensional/ast-builders.js';
import { monomialToExpr } from '../../src/composition/probe/generator.js';
import { fromMonomial, type Mono } from '../../src/composition/proposed-bridges.js';

const ROOT = join(import.meta.dirname, '../..');
const L = dim(1);
const T = dim(0, 0, 1);
const ZERO = dim();

describe('symbolPower — the shared core', () => {
  it('leaves exponent 1 bare and writes any other as base ^ literal', () => {
    const x = sym('x', L);
    expect(symbolPower(x, 1)).toBe(x);
    expect(symbolPower(x, -0.5)).toEqual({ kind: 'op', op: '^', args: [x, sym('-0.5', ZERO)] });
    expect(symbolPower(x, 1 / 3)).toEqual({ kind: 'op', op: '^', args: [x, sym('0.3333333333333333', ZERO)] });
  });

  it('both builders call it, and each states why it is not merged with the other', () => {
    const generator = readFileSync(join(ROOT, 'src/composition/probe/generator.ts'), 'utf8');
    const proposed = readFileSync(join(ROOT, 'src/composition/proposed-bridges.ts'), 'utf8');
    expect(generator).toMatch(/symbolPower\(/);
    expect(proposed).toMatch(/symbolPower\(/);
    expect(generator).toMatch(/not merged with `fromMonomial`/);
    expect(proposed).toMatch(/not merged with `monomialToExpr`/);
  });
});

describe('NEGATIVE RESULT: the two builders give different trees for one monomial', () => {
  it('Z·g²/a^(1/2): one product with negative exponents against a quotient, and two name orders', () => {
    const vars = [
      { name: 'Z', dim: L },
      { name: 'a', dim: T },
      { name: 'g', dim: L },
    ];
    const probe = monomialToExpr({ Z: 1, a: -0.5, g: 2 }, vars);
    expect(probe).toEqual({
      kind: 'op',
      op: '*',
      args: [sym('Z', L), { kind: 'op', op: '^', args: [sym('a', T), sym('-0.5', ZERO)] }, { kind: 'op', op: '^', args: [sym('g', L), sym('2', ZERO)] }],
    });
    const m: Mono = new Map([
      ['Z', { dim: L, exp: new Fraction(1, 1) }],
      ['a', { dim: T, exp: new Fraction(-1, 2) }],
      ['g', { dim: L, exp: new Fraction(2, 1) }],
    ]);
    const proposed = fromMonomial(m);
    // localeCompare orders a, g, Z; sort() orders Z, a, g.
    expect(proposed).toEqual({
      kind: 'op',
      op: '/',
      args: [
        { kind: 'op', op: '*', args: [{ kind: 'op', op: '^', args: [sym('g', L), sym('2', ZERO)] }, sym('Z', L)] },
        { kind: 'op', op: '^', args: [sym('a', T), sym('0.5', ZERO)] },
      ],
    });
    expect(['a', 'Z'].sort()).toEqual(['Z', 'a']);
    expect(['Z', 'a', 'g'].sort((x, y) => x.localeCompare(y))).toEqual(['a', 'g', 'Z']);
  });
});
