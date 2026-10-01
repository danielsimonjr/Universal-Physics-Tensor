/**
 * The MathTS parser and the builtin parser are not one language. This suite
 * pins where they agree and where they diverge, so a published install and a
 * clone install fail the same assertions.
 */
import { describe, expect, it } from 'vitest';
import { E_SI } from '../../src/core/constants.js';
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

describe('formula parsers agree on the elementary charge and on Euler', () => {
  it('bare e is the elementary charge, and exp(1) and euler are Euler\'s number', async () => {
    const { mathts } = await both();
    for (const parser of [builtin, mathts]) {
      const charge = parser.parse('e');
      expect(charge.variables).not.toContain('e');
      expect(charge.evaluate({})).toBeCloseTo(E_SI, 15);
      expect(parser.parse('e^2').evaluate({})).toBeCloseTo(E_SI * E_SI, 30);
      expect(parser.parse('e').evaluate({ e: 3 })).toBe(3);
      expect(parser.parse('exp(1)').evaluate({})).toBeCloseTo(Math.E, 12);
      const euler = parser.parse('euler');
      expect(euler.variables).not.toContain('euler');
      expect(euler.evaluate({})).toBeCloseTo(Math.E, 12);
      expect(parser.parse('m_e').variables).toContain('m_e');
      expect(parser.parse('e_charge').variables).toContain('e_charge');
      expect(parser.parse('1.6e-19').evaluate({})).toBeCloseTo(1.6e-19, 24);
      expect(parser.parse('E').variables).toContain('E');
    }
  });
});

describe('formula parsers diverge where the languages differ', () => {

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
