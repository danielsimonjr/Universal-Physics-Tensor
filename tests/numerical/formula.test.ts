/**
 * MathTS scalar-formula parser.
 * Pins arithmetic, precedence (incl. right-assoc `^` and `-2^2 = -4`),
 * scientific notation, functions/constants, free-variable collection,
 * safety (unknown symbol → error, no implicit globals), and that real
 * physics formulas evaluate correctly — including the Hawking temperature
 * reproducing the catalog evaluator's value.
 */
import { describe, it, expect } from 'vitest';
import { FormulaError } from '../../src/numerical/formula-contract.js';
import { mathtsFormulaParser, parseFormula } from '../../src/numerical/formula-mathts.js';

const ev = (expr: string, scope: Record<string, number> = {}) =>
  parseFormula(expr).evaluate(scope);

describe('formula parser — arithmetic & precedence', () => {
  it('respects operator precedence and parentheses', () => {
    expect(ev('2 + 3 * 4')).toBe(14);
    expect(ev('(2 + 3) * 4')).toBe(20);
    expect(ev('2 * 3 + 4 * 5')).toBe(26);
    expect(ev('10 / 2 / 5')).toBe(1); // left-assoc
  });

  it('treats ^ as right-associative and tighter than unary minus', () => {
    expect(ev('2 ^ 3 ^ 2')).toBe(512); // 2^(3^2)
    expect(ev('-2 ^ 2')).toBe(-4); // -(2^2)
    expect(ev('2 ^ -2')).toBe(0.25); // negative exponent
    expect(ev('mass ^ -0.5', { mass: 4 })).toBe(0.5);
  });

  it('parses scientific notation', () => {
    expect(ev('1.6e-19')).toBeCloseTo(1.6e-19, 25);
    expect(ev('6.674e-11 * 2')).toBeCloseTo(1.3348e-10, 15);
    expect(ev('.5')).toBe(0.5);
  });
});

describe('formula parser — variables, constants, functions', () => {
  it('evaluates against a scope and exposes free variables', () => {
    const f = parseFormula('a * b^2 / c');
    expect(f.variables).toEqual(['a', 'b', 'c']);
    expect(f.evaluate({ a: 2, b: 3, c: 4 })).toBe(4.5);
  });

  it('knows pi/tau and excludes them from free variables', () => {
    const f = parseFormula('2 * pi * r');
    expect(f.variables).toEqual(['r']); // pi is a constant, not a variable
    expect(f.evaluate({ r: 1 })).toBeCloseTo(2 * Math.PI, 12);
  });

  it('supports a whitelist of functions', () => {
    expect(ev('sqrt(16)')).toBe(4);
    expect(ev('ln(1)')).toBe(0);
    expect(ev('log(exp(3))')).toBeCloseTo(3, 12); // log = natural
    expect(ev('pow(2, 10)')).toBe(1024);
    expect(ev('abs(-7)')).toBe(7);
  });

  it('reproduces a real physics formula (Hawking temperature)', () => {
    // T_H = ℏc³/(8π G M k_B) for a solar mass ≈ 6.17e-8 K
    const T = ev('hbar * c^3 / (8 * pi * G * M * k_B)', {
      hbar: 1.054571817e-34,
      c: 299792458,
      G: 6.6743e-11,
      M: 1.989e30,
      k_B: 1.380649e-23,
    });
    expect(T).toBeGreaterThan(6e-8);
    expect(T).toBeLessThan(6.3e-8);
  });
});

describe('formula parser — safety & errors', () => {
  it('rejects an unknown variable rather than reaching a global', () => {
    expect(() => ev('x + 1')).toThrow(FormulaError);
    expect(() => ev('process')).toThrow(/Undefined symbol process/);
  });

  it('rejects unknown functions and bad syntax', () => {
    expect(() => ev('frobnicate(2)')).toThrow(/unknown function/);
    expect(() => ev('2 +')).toThrow(FormulaError);
    expect(() => ev('(2 + 3')).toThrow(FormulaError);
    expect(() => ev('2 3')).toThrow(FormulaError);
    expect(() => ev('')).toThrow(FormulaError);
  });

  it('enforces function arity', () => {
    expect(() => ev('sqrt(1, 2)')).toThrow(FormulaError);
    expect(() => ev('pow(2)')).toThrow(/Too few arguments in function pow/);
  });
});

describe('FormulaParser interface (the Path A swap point)', () => {
  it('defaultFormulaParser implements parse → CompiledFormula', () => {
    const f = mathtsFormulaParser.parse('a + b');
    expect(f.source).toBe('a + b');
    expect(f.variables).toEqual(['a', 'b']);
    expect(f.evaluate({ a: 1, b: 2 })).toBe(3);
  });
});
