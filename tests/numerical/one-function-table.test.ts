/**
 * One scalar-function table, one numeric path (9.0.0 audit §2 N9, N11,
 * N15, N20 and the `GLUED_NUMBER` nit).
 *
 * The audit found three function tables (`formula-contract.ts FUNCTIONS`,
 * `lowering.ts TRANSCENDENTAL_FNS`, `formula-dimension.ts TRANSCENDENTAL_FN`)
 * and a hand interpreter over the MathTS parse tree in `binding-value.ts`
 * that re-implemented the arity checks the first table already had. The
 * table is now `SCALAR_FUNCTIONS` in `formula-contract.ts`, carrying each
 * function's arity, numeric body and dimension rule; lowering, the
 * dimension checker and the binding reader read it, and the binding reader's
 * number comes from the MathTS formula parser.
 *
 * Part of this file is a source-text scan (TypeScript 7 ships no compiler
 * API), with a control that the scan sees what it looks for.
 *
 * @module tests/numerical/one-function-table
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BUILTIN_FUNCTION_NAMES,
  callBuiltinFunction,
  FormulaError,
  SCALAR_FUNCTIONS,
} from '../../src/numerical/formula-contract.js';
import { parsePhysics, getFormulaParserKind } from '../../src/numerical/formula-registry.js';
import { FormulaDimensionError } from '../../src/numerical/formula-dimension.js';
import { readBinding, readNamedBinding } from '../../src/numerical/binding-value.js';
import { propagateEvaluatorUncertainty } from '../../src/numerical/evaluator-uncertainty.js';
import { evaluateNumerical } from '../../src/numerical/index.js';
import type { ExprNode, TranscendentalFn } from '../../src/dimensional/ast-types.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS, LENGTH, TIME } from '../../src/dimensional/types.js';
import { C_SI } from '../../src/core/constants.js';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../../src');
const read = (rel: string): string => readFileSync(resolve(SRC, rel), 'utf-8');
const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** Every `TranscendentalFn` of the dimensional grammar, read from its declaration. */
function transcendentalFnNames(): string[] {
  const src = stripComments(read('dimensional/ast-types.ts'));
  const m = /export type TranscendentalFn\s*=([^;]*);/.exec(src);
  expect(m, 'TranscendentalFn declaration').not.toBeNull();
  return [...m![1]!.matchAll(/'([a-z0-9]+)'/g)].map((x) => x[1]!);
}

describe('SCALAR_FUNCTIONS is the one table (N9)', () => {
  it('names every documented function, with an arity and a dimension rule', () => {
    expect(Object.keys(SCALAR_FUNCTIONS).sort()).toEqual([...BUILTIN_FUNCTION_NAMES].sort());
    for (const [name, fn] of Object.entries(SCALAR_FUNCTIONS)) {
      expect(fn.arity, name).toBeGreaterThan(0);
      expect(typeof fn.apply, name).toBe('function');
      expect(typeof fn.dimension.kind, name).toBe('string');
    }
  });

  it('carries every transcendental node of the dimensional grammar under its own name', () => {
    for (const name of transcendentalFnNames()) {
      const fn = SCALAR_FUNCTIONS[name];
      expect(fn, name).toBeDefined();
      expect(fn!.dimension, name).toEqual({ kind: 'transcendental', node: name });
    }
    // `log` is the natural logarithm and lowers to the `ln` node.
    expect(SCALAR_FUNCTIONS.log!.dimension).toEqual({ kind: 'transcendental', node: 'ln' });
  });

  it('the control: the scan finds the names it looks for in a fixture', () => {
    expect(/\bMath\.(exp|sin|pow|abs)\b/.test('return Math.pow(a, b);')).toBe(true);
    expect(/\bMath\.(exp|sin|pow|abs)\b/.test('return pow(a, b);')).toBe(false);
  });

  it('lowering, the dimension checker and the binding reader hold no function table of their own', () => {
    const lowering = stripComments(read('numerical/lowering.ts'));
    expect(lowering).not.toMatch(/TRANSCENDENTAL_FNS/);
    expect(lowering).not.toMatch(/\bMath\.(exp|log|log2|log10|sin|cos|tan|sinh|cosh|tanh|pow|abs|sqrt|cbrt)\b/);
    const dimension = stripComments(read('numerical/formula-dimension.ts'));
    expect(dimension).not.toMatch(/TRANSCENDENTAL_FN\b|TRANSCENDENTAL_STUB/);
    const binding = stripComments(read('numerical/binding-value.ts'));
    expect(binding).not.toMatch(/\bMath\.(exp|log|sin|cos|tan|pow|abs|sqrt|cbrt|atan2)\b/);
    expect(binding).not.toMatch(/function evalOp\b|function evalCall\b/);
  });

  it('the binding reader takes its number from the MathTS formula parser, not a hand interpreter', () => {
    const binding = stripComments(read('numerical/binding-value.ts'));
    expect(binding).toMatch(/mathtsFormulaParser/);
  });

  it('callBuiltinFunction checks arity from the table', () => {
    expect(callBuiltinFunction('pow', [2, 3])).toBe(8);
    expect(() => callBuiltinFunction('pow', [2])).toThrow(FormulaError);
    expect(() => callBuiltinFunction('sin', [1, 2])).toThrow(/sin expects 1 argument/);
    expect(() => callBuiltinFunction('nope', [1])).toThrow(/unknown function 'nope'/);
  });
});

describe('the binding reader reads the one table (N9)', () => {
  it('evaluates every function kind with the table dimension rule', () => {
    expect(readBinding('sqrt(4*1m^2)')).toMatchObject({ value: 2, dimension: LENGTH, dimensioned: true });
    expect(readBinding('cbrt(27*1m^3)')).toMatchObject({ value: 3, dimension: LENGTH });
    expect(readBinding('abs(-3*1s)')).toMatchObject({ value: 3, dimension: TIME });
    expect(readBinding('pow(1m, 2)').dimension).toEqual({ ...DIMENSIONLESS, L: 2 });
    expect(readBinding('atan2(1m, 1m)')).toMatchObject({ value: Math.PI / 4, dimension: DIMENSIONLESS });
    expect(readBinding('exp(1)').value).toBeCloseTo(Math.E, 12);
    expect(readBinding('log(exp(2))').value).toBeCloseTo(2, 12);
    expect(readBinding('0.6*c').value).toBeCloseTo(0.6 * C_SI, 6);
  });

  it('refuses a dimensioned transcendental argument, a mismatched atan2 and a bad arity', () => {
    expect(() => readBinding('sin(1m)')).toThrow(/sin expects a dimensionless argument/);
    expect(() => readBinding('atan2(1m, 1s)')).toThrow(/atan2 arguments must have the same dimension/);
    expect(() => readBinding('sqrt(1, 2)')).toThrow(/sqrt expects 1 argument/);
    expect(() => readBinding('pow(1m, 1s)')).toThrow(/exponent must be a dimensionless number/);
    expect(() => readBinding('1m^(1s)')).toThrow(/exponent must be a dimensionless number/);
  });
});

describe('lowering reads the one table (N9)', () => {
  it('lowers each transcendental node through the table', async () => {
    const x = sym('x', DIMENSIONLESS);
    const inputs = { tensors: new Map<string, number>([['x', 0.5]]) };
    for (const name of transcendentalFnNames()) {
      const node: ExprNode = { kind: 'transcendental', fn: name as TranscendentalFn, arg: x };
      const got = await evaluateNumerical(node, inputs);
      expect(got.value, name).toBeCloseTo(SCALAR_FUNCTIONS[name]!.apply([0.5]), 12);
    }
  });
});

describe('a call with the wrong number of arguments is a dimension error, not a crash (N11)', () => {
  it('sin() names the function and the arity', async () => {
    await expect(parsePhysics('sin()', {})).rejects.toThrow(FormulaDimensionError);
    await expect(parsePhysics('sin()', {})).rejects.toThrow(/sin\(\) expects 1 argument, got 0/);
  });

  it('sin(1, 2) is refused rather than silently dropping the second argument', async () => {
    await expect(parsePhysics('sin(1, 2)', {})).rejects.toThrow(/sin\(\) expects 1 argument, got 2/);
    await expect(parsePhysics('pow(2)', {})).rejects.toThrow(/pow\(\) expects 2 arguments, got 1/);
  });

  it('atan2 of two like dimensions is dimensionless (the table rule, now reachable here)', async () => {
    const parsed = await parsePhysics('atan2(y, x)', { x: LENGTH, y: LENGTH });
    expect(parsed.dimension).toEqual(DIMENSIONLESS);
    await expect(parsePhysics('atan2(y, x)', { x: LENGTH, y: TIME })).rejects.toThrow(/atan2/);
  });
});

describe('a catch-all no longer masks a programming error (N15)', () => {
  it('a TypeError thrown by the evaluator next to an input propagates', () => {
    const f = (inputs: Record<string, number>): Record<string, unknown> => {
      if (inputs.x !== 1) throw new TypeError('bug in the evaluator');
      return { y: 2 };
    };
    expect(() => propagateEvaluatorUncertainty(f, { x: 1 }, { x: 0.1 }, new Map())).toThrow(TypeError);
  });

  it('an evaluator that is undefined next to an input is still reported, not thrown (control)', () => {
    const f = (inputs: Record<string, number>): Record<string, unknown> => ({ y: inputs.x! > 1 ? Number.NaN : 2 });
    const out = propagateEvaluatorUncertainty(f, { x: 1 }, { x: 0.5 }, new Map());
    expect(out.y!.contributions.x!.note).toMatch(/undefined next to this input/);
  });

  it('a sibling binding that does not parse is skipped (control), and the catches are narrowed', () => {
    const value = readNamedBinding('T', '300', { siblings: [{ name: 'k_B', raw: 'not a value' }] });
    expect(value.value).toBe(300);
    const binding = stripComments(read('numerical/binding-value.ts'));
    const uncertainty = stripComments(read('numerical/evaluator-uncertainty.ts'));
    for (const [name, src] of [['binding-value.ts', binding], ['evaluator-uncertainty.ts', uncertainty]] as const) {
      expect(src, `${name}: a bare catch`).not.toMatch(/catch\s*\{/);
      for (const m of src.matchAll(/catch \((\w+)\) \{([^}]*)\}/g)) {
        expect(m[2], `${name}: catch (${m[1]}) must discriminate`).toMatch(/instanceof/);
      }
    }
  });
});

describe('the parser kind has one value (N20)', () => {
  it('getFormulaParserKind is mathts, and the type has no dead builtin member', async () => {
    expect(await getFormulaParserKind()).toBe('mathts');
    expect(stripComments(read('numerical/formula-registry.ts'))).not.toMatch(/'builtin'/);
  });
});

describe('GLUED_NUMBER carries no unused flag (nit)', () => {
  it('is declared without g, and the reader builds its own global copy', () => {
    const binding = stripComments(read('numerical/binding-value.ts'));
    const decl = /const GLUED_NUMBER = \/[^\n]*\/(\w*);/.exec(binding);
    expect(decl, 'declaration').not.toBeNull();
    expect(decl![1]).toBe('');
  });
});
