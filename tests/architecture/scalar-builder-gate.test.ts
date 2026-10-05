/**
 * Phase 6 lowers a scalar `ExprNode` through MathTS.
 * The parent gate expected `createScalarBuilder` to be absent. On
 * `@danielsimonjr/mathts-expression` 0.10.0 that name is present, and
 * `src/composition/expr-eval.ts` still called `Math.pow`.
 * A formula string is not parsed.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as expression from '@danielsimonjr/mathts-expression';
import * as functions from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { evalExpr } from '../../src/composition/expr-eval.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const evalSource = readFileSync(resolve(root, 'src/composition/expr-eval.ts'), 'utf8');

const sym = (name: string): ExprNode => ({ kind: 'symbol', name, dim: DIMENSIONLESS });
const op = (operator: '+' | '-' | '*' | '/' | '^', args: ExprNode[]): ExprNode => ({
  kind: 'op',
  op: operator,
  args,
});

/** The host arithmetic the parent interpreter called. A comment that names the call is a hit too. */
export function localArithmetic(source: string): boolean {
  return /Math\.(?:pow|exp|log2|log10|log|sin|cos|tan|sinh|cosh|tanh|abs)\s*\(/.test(source);
}

describe('MathTS scalar builder', () => {
  it('is the numeric body of a scalar tree', () => {
    expect('createScalarBuilder' in expression).toBe(true);
    expect('SCALAR_FUNCTIONS' in expression).toBe(true);
    expect('scalar' in functions).toBe(true);
    expect('evaluateScalar' in functions).toBe(true);
    expect(evalSource).toMatch(/createScalarBuilder\s*\(/);
    expect(evalSource).toMatch(/evaluateScalar\s*\(/);
    expect(localArithmetic(evalSource)).toBe(false);
    expect(evalSource).not.toMatch(/\bparse\s*\(/);
  });

  it('a host Math.pow call is the parent pattern', () => {
    // The marker matches `return finite(Math.pow(base, exp), node)` on the parent tree.
    expect(localArithmetic('return finite(Math.pow(base, exp), node);')).toBe(true);
    expect(localArithmetic('return evaluateScalar(lowered, scope);')).toBe(false);
  });

  it('matches the deleted arithmetic on one fixture, and a mutated tree differs', () => {
    const quotient = op('/', [sym('a'), sym('b')]);
    expect(evalExpr(quotient, { a: 12, b: 3 })).toBe(4);
    const product = op('*', [sym('a'), sym('b')]);
    expect(evalExpr(product, { a: 12, b: 3 })).toBe(36);
    expect(evalExpr(product, { a: 12, b: 3 })).not.toBe(evalExpr(quotient, { a: 12, b: 3 }));
    expect(evalExpr(sym('6pi'))).toBe(6 * Math.PI);
    expect(evalExpr({ kind: 'transcendental', fn: 'ln', arg: sym('x') }, { x: Math.E })).toBe(1);
  });
});
