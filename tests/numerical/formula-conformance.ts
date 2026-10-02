/**
 * Parameterized FormulaParser conformance suite. Both the self-contained
 * Path B parser (`defaultFormulaParser`) and the MathTS-backed Path A
 * parser must pass this identical suite — it is the contract that makes
 * the two interchangeable behind the `FormulaParser` interface (the
 * registry swaps them transparently).
 *
 * Not a *.test.ts file: it exports a function each parser's own *.test.ts
 * wraps (same discipline as engine-conformance.ts).
 *
 * KNOWN, ACCEPTED divergence (deliberately NOT in the shared cases):
 * factorial, erf, gamma() and juxtaposition such as `2pi` are MathTS-only.
 * Both parsers read a bare `e` as the elementary charge and `exp(1)` as
 * Euler's number. The name `euler` is refused.
 *
 * @module tests/numerical/formula-conformance
 */
import { describe, it, expect } from 'vitest';
import type { FormulaParser } from '../../src/numerical/formula-contract.js';
import { FUNCTION_EQUIVALENTS } from '../../src/numerical/formula-contract.js';
import { E_SI } from '../../src/core/constants.js';

/** (expr, scope) → expected scalar value — both parsers must agree. */
const VALUE_CASES: ReadonlyArray<
  readonly [string, Record<string, number>, number]
> = [
  ['2 + 3 * 4', {}, 14],
  ['(2 + 3) * 4', {}, 20],
  ['10 / 2 / 5', {}, 1], // left-assoc
  ['-2 ^ 2', {}, -4], // ^ tighter than unary minus
  ['2 ^ -2', {}, 0.25],
  ['2 ^ 3 ^ 2', {}, 512], // right-assoc power
  ['1.6e-19', {}, 1.6e-19],
  ['e', {}, E_SI],
  ['e^2', {}, E_SI * E_SI],
  ['exp(1)', {}, Math.E],
  ['sqrt(16)', {}, 4],
  ['log(exp(3))', {}, 3], // log = natural
  // Every function the built-in parser documents must evaluate in both
  // (audit F03: `ln(2)` failed under MathTS while `log(2)` worked).
  ['ln(2)', {}, Math.LN2],
  ['ln(exp(3))', {}, 3],
  ['log10(1000)', {}, 3],
  ['log2(8)', {}, 3],
  ['cbrt(27)', {}, 3],
  ['atan2(1, 1)', {}, Math.PI / 4],
  ['sinh(1) + cosh(1)', {}, Math.E],
  ['k_B*T*ln(2)', { k_B: 1.380649e-23, T: 300 }, 1.380649e-23 * 300 * Math.LN2],
  ['pow(2, 10)', {}, 1024],
  ['abs(-7)', {}, 7],
  ['2 * pi * r', { r: 1 }, 2 * Math.PI],
  ['a * b^2 / c', { a: 2, b: 3, c: 4 }, 4.5],
  ['mass ^ -0.5', { mass: 4 }, 0.5],
  [
    'hbar*c^3/(8*pi*G*M*k_B)',
    {
      hbar: 1.054571817e-34,
      c: 299792458,
      G: 6.6743e-11,
      M: 1.989e30,
      k_B: 1.380649e-23,
    },
    6.168429712630829e-8,
  ],
];

/** expr → sorted free variables — both parsers must agree. */
const VARIABLE_CASES: ReadonlyArray<readonly [string, string[]]> = [
  ['2 * pi * r', ['r']], // pi excluded
  ['a * b + sin(c)', ['a', 'b', 'c']], // function callee `sin` excluded
  ['tau * x', ['x']], // tau is a constant in both
  ['ln(x) + log10(y)', ['x', 'y']], // function callees excluded
  ['hbar*c^3/(8*pi*G*M*k_B)', ['G', 'M', 'c', 'hbar', 'k_B']],
];

const rel = (got: number, want: number): number =>
  Math.abs(got - want) / Math.max(1, Math.abs(want));

/** Run the shared conformance suite against one parser. */
export function runFormulaConformance(
  parser: FormulaParser,
  label: string,
): void {
  describe(`[${label}] formula conformance — values`, () => {
    for (const [expr, scope, expected] of VALUE_CASES) {
      it(`evaluates ${expr}`, () => {
        expect(rel(parser.parse(expr).evaluate(scope), expected)).toBeLessThan(
          1e-12,
        );
      });
    }
  });

  describe(`[${label}] formula conformance — free variables`, () => {
    for (const [expr, vars] of VARIABLE_CASES) {
      it(`extracts variables of ${expr}`, () => {
        expect([...parser.parse(expr).variables]).toEqual(vars);
      });
    }
  });

  describe(`[${label}] formula conformance — errors`, () => {
    it('an unsupplied variable throws at evaluate', () => {
      expect(() => parser.parse('x + 1').evaluate({})).toThrow();
    });
    it('an unknown function still fails rather than being reinterpreted', () => {
      expect(() => parser.parse('lnn(2)').evaluate({})).toThrow();
    });
    it('the name euler is refused and the error names exp(x)', () => {
      expect(() => parser.parse('euler')).toThrow(/exp\(x\)/);
    });
    // Audit I4: a name from another convention fails, and the message names the documented
    // function that computes it. The suggestion is a message, never a silent reinterpretation.
    it.each([
      ['lg(100)', 'lg', 'log10'],
      ['arcsin(0.5)', 'arcsin', 'asin'],
      ['arctan(1)', 'arctan', 'atan'],
      ['Sin(1)', 'Sin', 'sin'],
      ['LOG10(10)', 'LOG10', 'log10'],
    ])('%s fails and names %s → %s', (expr, name, use) => {
      expect(() => parser.parse(expr).evaluate({})).toThrow(
        new RegExp(`unknown function '${name}'.* use ${use}\\(`),
      );
    });
    it('a name with no equivalent suggests none and lists the functions it knows', () => {
      let message = '';
      try {
        parser.parse('lnn(2)').evaluate({});
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toMatch(/unknown function 'lnn'/);
      expect(message).not.toMatch(/ use /);
      expect(message).toMatch(/functions: sqrt, cbrt, exp, ln, log \(natural, = ln\), log10, log2, /);
    });
    it('every suggested equivalent evaluates here to the value the foreign name means', () => {
      // The value each foreign name means, computed without either parser.
      const meaning: Record<string, readonly [string, number]> = {
        lg: ['100', 2],
        lb: ['8', 3],
        ld: ['8', 3],
        arcsin: ['0.5', Math.PI / 6],
        arccos: ['0.5', Math.PI / 3],
        arctan: ['1', Math.PI / 4],
        arctg: ['1', Math.PI / 4],
        tg: [String(Math.PI / 4), 1],
        fabs: ['-3', 3],
        power: ['2, 10', 1024],
        arctan2: ['1, 1', Math.PI / 4],
      };
      expect(Object.keys(FUNCTION_EQUIVALENTS).sort()).toEqual(Object.keys(meaning).sort());
      for (const [foreign, { use }] of Object.entries(FUNCTION_EQUIVALENTS)) {
        const [argsText, want] = meaning[foreign]!;
        expect(rel(parser.parse(`${use}(${argsText})`).evaluate({}), want), foreign).toBeLessThan(1e-12);
      }
    });
    it('an empty formula throws at parse', () => {
      expect(() => parser.parse('   ')).toThrow();
    });
  });
}
