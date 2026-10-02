/**
 * Scalar leaves come from one MathTS symbol filter.
 *
 * `governingOf` and `makeObservable` used to each walk `ExprNode`. The names
 * now come from `scalarSymbolsFromMathTs`. A curvature node contributes
 * none. `exp(1)` does not invent a leaf named `e`. A bare `e` is the
 * elementary charge: it is a governing symbol, and it is not a free leaf
 * the way `x` is.
 *
 * @module tests/composition/mathts-scalar-symbols
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { governingOf } from '../../src/atlas/chain-pipeline.js';
import { makeObservable } from '../../src/composition/compose-symbolic.js';
import { scalarSymbolsFromMathTs } from '../../src/composition/mathts-scalar-symbols.js';
import { CHARGE, DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const sym = (name: string, dim: typeof DIMENSIONLESS = DIMENSIONLESS): ExprNode => ({
  kind: 'symbol',
  name,
  dim: { ...dim },
});

function names(expr: ExprNode): string[] {
  return scalarSymbolsFromMathTs(expr)
    .map((leaf) => leaf.name)
    .sort();
}

describe('scalar leaves are the MathTS symbol filter', () => {
  it('reads a nested transcendental from both call sites', () => {
    const expr: ExprNode = {
      kind: 'transcendental',
      fn: 'ln',
      arg: {
        kind: 'op',
        op: '+',
        args: [
          sym('x'),
          { kind: 'transcendental', fn: 'sin', arg: sym('y') },
        ],
      },
    };
    const fromFilter = names(expr);
    const fromGoverning = governingOf(expr, 'target').map((leaf) => leaf.name);
    const fromLeaves = [...makeObservable('out', 'Y', { ...DIMENSIONLESS }, expr).leaves];
    expect(fromFilter).toEqual(['x', 'y']);
    expect(fromGoverning).toEqual(fromFilter);
    expect(fromLeaves).toEqual(fromFilter);
  });

  it('reads no governing symbol from a curvature node', () => {
    const expr = { kind: 'ricci-tensor' } as ExprNode;
    expect(names(expr)).toEqual([]);
    expect(governingOf(expr, 'target')).toEqual([]);
    expect([...makeObservable('out', 'Y', { ...DIMENSIONLESS }, expr).leaves]).toEqual([]);
  });

  it('does not add a leaf named e for exp(1)', () => {
    const expr: ExprNode = { kind: 'transcendental', fn: 'exp', arg: sym('1') };
    expect(names(expr)).not.toContain('e');
    expect(governingOf(expr, 'target').map((leaf) => leaf.name)).not.toContain('e');
    expect([...makeObservable('out', 'Y', { ...DIMENSIONLESS }, expr).leaves]).not.toContain('e');
  });

  it('keeps bare e as the charge and not as a free leaf', () => {
    const charge = sym('e', CHARGE);
    const free = sym('x', CHARGE);
    expect(scalarSymbolsFromMathTs(charge)).toEqual([{ name: 'e', dim: CHARGE }]);
    expect(governingOf(charge, 'target')).toEqual([{ name: 'e', dim: CHARGE }]);
    expect([...makeObservable('out', 'Y', CHARGE, charge).leaves]).not.toContain('e');
    expect([...makeObservable('out', 'Y', CHARGE, free).leaves]).toEqual(['x']);
  });

  it('is the reader both call sites use', () => {
    const pipeline = readFileSync('src/atlas/chain-pipeline.ts', 'utf8');
    const symbolic = readFileSync('src/composition/compose-symbolic.ts', 'utf8');
    expect(pipeline).toContain('scalarSymbolsFromMathTs');
    expect(symbolic).toContain('scalarSymbolsFromMathTs');
    expect(pipeline).not.toContain('function collectSymbols');
    expect(symbolic).not.toContain('function collectSymbols');
  });
});
