/**
 * Compiled-formula memoization in the MathTS parser (S4 of the optimization
 * plan): one `compileExpr` per unique expression text, scope never cached,
 * the cached object frozen against caller mutation, the cache bounded,
 * parse-time errors never cached, and an unknown-callee formula cached
 * while `evaluate` still throws.
 *
 * Every test drives a counting spy wrapped around the real mathts-functions
 * module through `createMathtsFormulaParser`, so no module state is mutated
 * and the numbers are real parse behavior.
 */
import { describe, it, expect } from 'vitest';
import {
  compileExpr as realCompileExpr,
  parse as realParse,
} from '@danielsimonjr/mathts-functions';
import {
  createMathtsFormulaParser,
  MAX_FORMULA_CACHE_ENTRIES,
} from '../../src/numerical/formula-mathts.js';
import { FormulaError } from '../../src/numerical/formula-contract.js';
import { E_SI } from '../../src/core/constants.js';

function countingModule() {
  const compileExprCalls: string[] = [];
  const parseCalls: string[] = [];
  const mod = {
    parse: (expr: string) => {
      parseCalls.push(expr);
      return realParse(expr);
    },
    compileExpr: (expr: string, opts: { physics: true }) => {
      compileExprCalls.push(expr);
      return realCompileExpr(expr, opts);
    },
  };
  return { mod, compileExprCalls, parseCalls };
}

describe('formula parse cache', () => {
  it('compiles a repeated expression once, but evaluates each scope fresh', () => {
    const { mod, compileExprCalls, parseCalls } = countingModule();
    const parser = createMathtsFormulaParser(mod);
    const f = parser.parse('2*pi*sqrt(L/g)');
    const f2 = parser.parse('2*pi*sqrt(L/g)');
    expect(compileExprCalls).toEqual(['2*pi*sqrt(L/g)']);
    // The underlying MathTS `parse` ran once: the second `parse` call hits the
    // cache above it and never reaches MathTS.
    expect(parseCalls.filter((e) => e === '2*pi*sqrt(L/g)')).toEqual(['2*pi*sqrt(L/g)']);
    // Same compiled object is reused (that is the point of the cache)...
    expect(f2).toBe(f);
    // ...but the two evaluations see their own scope values.
    expect(f.evaluate({ L: 1, g: 9.81 })).not.toBe(f.evaluate({ L: 4, g: 9.81 }));
    expect(f.evaluate({ L: 1, g: 9.81 })).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 9.81), 12);
    expect(f.evaluate({ L: 4, g: 9.81 })).toBeCloseTo(2 * Math.PI * Math.sqrt(4 / 9.81), 12);
  });

  it('a scope entry for e still overrides the E_SI default on a cached formula', () => {
    const { mod, compileExprCalls } = countingModule();
    const parser = createMathtsFormulaParser(mod);
    const first = parser.parse('e * y');
    const second = parser.parse('e * y');
    expect(second).toBe(first);
    expect(compileExprCalls).toEqual(['e * y']);
    // Bare `e` is the elementary charge by default...
    expect(second.evaluate({ y: 1 })).toBeCloseTo(E_SI, 15);
    // ...and a scope `e` still wins on the cached object.
    expect(second.evaluate({ y: 1, e: 2.718281828459045 })).toBeCloseTo(2.718281828459045, 12);
  });

  it('the returned formula is frozen: a caller cannot corrupt the cached entry', () => {
    const { mod } = countingModule();
    const parser = createMathtsFormulaParser(mod);
    const f = parser.parse('sqrt(x)');
    expect(Object.isFrozen(f)).toBe(true);
    expect(Object.isFrozen(f.variables)).toBe(true);
    // Both mutations must be refused: variables and the object itself.
    expect(() => {
      (f.variables as string[]).push('ghost');
    }).toThrow();
    expect(() => {
      (f as unknown as { source: string }).source = 'mutated';
    }).toThrow();
    // A fresh parse of the same text still reads the untouched cache entry.
    const g = parser.parse('sqrt(x)');
    expect(g.source).toBe('sqrt(x)');
    expect([...g.variables]).toEqual(['x']);
    expect(g.evaluate({ x: 9 })).toBe(3);
  });

  it('the cache stays bounded: re-parsing evicted entries recompiles instead of growing', () => {
    const { mod, compileExprCalls } = countingModule();
    const parser = createMathtsFormulaParser(mod);
    const filler = (i: number) => `x${i}+1`;
    for (let i = 0; i < MAX_FORMULA_CACHE_ENTRIES + 100; i++) {
      parser.parse(filler(i));
    }
    // One compile per unique text so far.
    expect(compileExprCalls.length).toBe(MAX_FORMULA_CACHE_ENTRIES + 100);
    // The oldest 100 were evicted: re-parsing them recompiles...
    for (let i = 0; i < 100; i++) parser.parse(filler(i));
    expect(compileExprCalls.length).toBe(MAX_FORMULA_CACHE_ENTRIES + 200);
    // ...while the newest 100 are still cached (no recompile for them).
    for (let i = MAX_FORMULA_CACHE_ENTRIES; i < MAX_FORMULA_CACHE_ENTRIES + 100; i++) {
      parser.parse(filler(i));
    }
    expect(compileExprCalls.length).toBe(MAX_FORMULA_CACHE_ENTRIES + 200);
  });

  it('a parse-time error is never cached: every attempt re-parses, so no negative cache entry forms', () => {
    const { mod, compileExprCalls, parseCalls } = countingModule();
    const parser = createMathtsFormulaParser(mod);
    // `euler` is refused before compilation, every time.
    expect(() => parser.parse('euler + 1')).toThrow(/euler/);
    expect(() => parser.parse('euler + 1')).toThrow(/euler/);
    // A syntactically bad formula throws every time too.
    expect(() => parser.parse('2 +* 3')).toThrow();
    expect(() => parser.parse('2 +* 3')).toThrow();
    // The underlying MathTS `parse` ran on every attempt (the shim warm-up runs
    // its own probe parses first): a negative cache would have swallowed the
    // four repeats.
    expect(parseCalls.filter((e) => e === 'euler + 1' || e === '2 +* 3')).toEqual([
      'euler + 1',
      'euler + 1',
      '2 +* 3',
      '2 +* 3',
    ]);
    // No formula was compiled, so no cache entry exists.
    expect(compileExprCalls).toEqual([]);
    // And a good formula after the errors still compiles and evaluates.
    expect(parser.parse('1+1').evaluate({})).toBe(2);
    expect(compileExprCalls).toEqual(['1+1']);
  });

  it('an unknown-callee formula is cached, and evaluate still throws FormulaError', () => {
    const { mod, compileExprCalls } = countingModule();
    const parser = createMathtsFormulaParser(mod);
    const first = parser.parse('lnn(2)');
    const second = parser.parse('lnn(2)');
    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(compileExprCalls).toEqual(['lnn(2)']);
    expect(() => first.evaluate({})).toThrow(FormulaError);
    expect(() => second.evaluate({})).toThrow(/unknown function 'lnn'/);
    expect(compileExprCalls).toEqual(['lnn(2)']);
  });
});
