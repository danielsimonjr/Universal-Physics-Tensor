/**
 * A literal exponent is a decimal literal carried by a DIMENSIONLESS symbol
 * (9.0.0 audit §2 N12), and the validator carries no dead guards (N13).
 *
 * The old test was `Number.isFinite(Number(expNode.name))`, which is true
 * for `''` and `' '` (both read as 0) and for `'0x2'`, and which never looked
 * at the exponent symbol's own dimension, so `x^(2 kg)` was `L^2`.
 *
 * @module tests/dimensional/validator-exponent-literal
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../../src/dimensional/validator.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS, LENGTH, MASS } from '../../src/dimensional/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const VALIDATOR = resolve(here, '../../src/dimensional/validator.ts');
const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });
const x = sym('x', LENGTH);

describe('a literal exponent is a dimensionless decimal literal (N12)', () => {
  it.each(['2', '-1', '0.5', '1e-3', '-1.5e0', '.5'])('x^%s raises the dimension (control)', (literal) => {
    const r = validate(pow(x, sym(literal, DIMENSIONLESS)));
    expect(r.ok).toBe(true);
    expect(r.inferredDimension!.L).toBeCloseTo(Number(literal), 12);
  });

  it.each(['', ' ', '0x2', ' 2', '2 ', 'Infinity', 'NaN'])('x^%j is not a literal exponent on a dimensioned base', (name) => {
    const r = validate(pow(x, sym(name, DIMENSIONLESS)));
    expect(r.ok, name).toBe(false);
  });

  it('a literal exponent symbol that carries a dimension is not a literal', () => {
    const r = validate(pow(x, sym('2', MASS)));
    expect(r.ok).toBe(false);
    expect(r.inferredDimension).toBeNull();
  });

  it('a non-literal dimensionless exponent on a dimensionless base is still fine', () => {
    const r = validate(pow(sym('a', DIMENSIONLESS), sym('n', DIMENSIONLESS)));
    expect(r.ok).toBe(true);
    expect(r.inferredDimension).toEqual(DIMENSIONLESS);
  });
});

describe('the validator carries no dead guards (N13, nit)', () => {
  const src = stripComments(readFileSync(VALIDATOR, 'utf-8'));

  it('has no try whose catch only rethrows', () => {
    expect(src).not.toMatch(/catch \(err\) \{\s*throw err;\s*\}/);
  });

  it('does not test an infer() result against undefined (infer returns Dimension | null)', () => {
    expect(src).not.toMatch(/probed !== undefined/);
    expect(src).not.toMatch(/dim !== undefined/);
    expect(src).not.toMatch(/dim \?\? null/);
  });

  it('types a partial-derivative child as ExprNode instead of casting unknown', () => {
    expect(src).not.toMatch(/node as ExprNode/);
    expect(src).not.toMatch(/expNode as \{ name: string \}/);
  });

  it('does not cite line numbers of a file that no longer exists', () => {
    expect(readFileSync(VALIDATOR, 'utf-8')).not.toMatch(/callsites at lines \d+/);
  });
});
