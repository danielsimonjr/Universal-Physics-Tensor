/**
 * The MathTS parser and the builtin parser are not one language. This suite
 * pins where they agree and where they diverge, so a published install and a
 * clone install fail the same assertions.
 */
import { describe, expect, it } from 'vitest';
import { defaultFormulaParser, FormulaError } from '../../src/numerical/formula.js';
import { loadMathtsFormulaParser } from '../../src/numerical/formula-mathts.js';
import type { FormulaParser } from '../../src/numerical/formula.js';

const builtin = defaultFormulaParser;

async function both(): Promise<{ builtin: FormulaParser; mathts: FormulaParser }> {
  return { builtin, mathts: await loadMathtsFormulaParser() };
}

function value(parser: FormulaParser, expr: string, scope: Record<string, number> = {}): number {
  return parser.parse(expr).evaluate(scope);
}

describe('formula parsers agree on common arithmetic', () => {
  it('evaluates the same arithmetic, powers, calls and parentheses', async () => {
    const { mathts } = await both();
    const cases: readonly (readonly [string, Record<string, number>, number])[] = [
      ['1+2*3', {}, 7],
      ['(1+2)*3', {}, 9],
      ['2^3', {}, 8],
      ['sqrt(4)', {}, 2],
      ['sin(0)', {}, 0],
      ['ln(1)', {}, 0],
      ['a*b^2+1', { a: 3, b: 4 }, 49],
    ];
    for (const [expr, scope, expected] of cases) {
      expect(value(builtin, expr, scope)).toBeCloseTo(expected, 12);
      expect(value(mathts, expr, scope)).toBeCloseTo(expected, 12);
    }
    expect(value(builtin, 'pi')).toBeCloseTo(Math.PI, 12);
    expect(value(mathts, 'pi')).toBeCloseTo(Math.PI, 12);
  });
});

describe('formula parsers diverge where the languages differ', () => {
  it('bare e is Euler under MathTS and a free variable under the builtin parser', async () => {
    const { mathts } = await both();
    const m = mathts.parse('e');
    expect(m.variables).not.toContain('e');
    expect(m.evaluate({})).toBeCloseTo(Math.E, 12);
    const b = builtin.parse('e');
    expect(b.variables).toContain('e');
    expect(() => b.evaluate({})).toThrow(FormulaError);
    expect(b.evaluate({ e: 1.6e-19 })).toBeCloseTo(1.6e-19, 24);
  });

  it('factorial, erf, gamma() and juxtaposition 2pi are MathTS-only', async () => {
    const { mathts } = await both();
    expect(value(mathts, '5!')).toBe(120);
    expect(value(mathts, 'erf(0)')).toBeCloseTo(0, 12);
    expect(value(mathts, 'gamma(5)')).toBeCloseTo(24, 10);
    expect(value(mathts, '2pi')).toBeCloseTo(2 * Math.PI, 12);
    expect(() => builtin.parse('5!')).toThrow(FormulaError);
    expect(() => builtin.parse('2pi')).toThrow(FormulaError);
    expect(() => builtin.parse('erf(0)').evaluate({})).toThrow(/unknown function 'erf'/);
    expect(() => builtin.parse('gamma(5)').evaluate({})).toThrow(/unknown function 'gamma'/);
  });
});
