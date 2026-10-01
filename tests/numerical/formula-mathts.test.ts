/**
 * MathTS-backed parser (Path A) — behaviors specific to it, beyond the
 * shared conformance suite. Guarded on the optional peer.
 *
 * Pins the scalar-only seam guard (a non-number result is rejected rather
 * than leaking MathTS types). Bare `e` is the elementary charge on this
 * parser too; Euler's number is `exp(1)` or `euler`.
 */
import { describe, it, expect } from 'vitest';
import { E_SI } from '../../src/core/constants.js';

let parser: import('../../src/numerical/formula.js').FormulaParser | null = null;
try {
  const { loadMathtsFormulaParser } = await import(
    '../../src/numerical/formula-mathts.js'
  );
  parser = await loadMathtsFormulaParser();
  parser.parse('1+1').evaluate({}); // confirm it assembled
} catch {
  parser = null;
}

const d = parser ? describe : describe.skip;

d('formula-mathts (Path A specifics)', () => {
  it('reads bare e as a constant and leaves the other factor free', () => {
    expect([...parser!.parse('e * y').variables]).toEqual(['y']);
    expect(parser!.parse('e * y').evaluate({ y: 1 })).toBeCloseTo(E_SI, 15);
  });

  it('a quantity whose name is a MathTS function stays a free variable; the call stays a function', () => {
    // gamma() is Γ, and gamma is the adiabatic index. distance() is a metric,
    // and distance is a length. Swallowing the bare name made both formulas
    // fail as "undeclared symbol" / "got function".
    expect([...parser!.parse('sqrt(gamma*pressure/density)').variables]).toEqual([
      'density',
      'gamma',
      'pressure',
    ]);
    expect([...parser!.parse('mu_0*current/(2*pi*distance)').variables]).toEqual([
      'current',
      'distance',
      'mu_0',
    ]);
    expect([...parser!.parse('zeta*temperature').variables]).toEqual(['temperature', 'zeta']);
    expect(parser!.parse('gamma(5)').variables).toEqual([]);
    expect(parser!.parse('gamma(5)').evaluate({})).toBe(24);
    expect(parser!.parse('sqrt(gamma*p/rho)').evaluate({ gamma: 1.4, p: 101325, rho: 1.225 })).toBeCloseTo(
      Math.sqrt(1.4 * 101325 / 1.225),
      8,
    );
  });

  it('scalar-only guard: a non-number result is rejected, not leaked', () => {
    // A vector/array expression must throw rather than return a MathTS type.
    expect(() => parser!.parse('[1, 2, 3]').evaluate({})).toThrow();
  });

  it('still recovers a real physics value (Hawking temperature)', () => {
    const T = parser!.parse('hbar*c^3/(8*pi*G*M*k_B)').evaluate({
      hbar: 1.054571817e-34, c: 299792458, G: 6.6743e-11,
      M: 1.989e30, k_B: 1.380649e-23,
    });
    expect(T).toBeGreaterThan(6e-8);
    expect(T).toBeLessThan(6.3e-8);
  });

  it('empty-formula guard: whitespace-only input throws FormulaError before reaching mod.parse', async () => {
    const { FormulaError } = await import('../../src/numerical/formula.js');
    expect(() => parser!.parse('')).toThrow(FormulaError);
    expect(() => parser!.parse('')).toThrow('empty formula');
    expect(() => parser!.parse('   ')).toThrow('empty formula');
  });

  it('parse error: malformed syntax is wrapped as a FormulaError, not a raw MathTS error', async () => {
    const { FormulaError } = await import('../../src/numerical/formula.js');
    expect(() => parser!.parse('(1 +')).toThrow(FormulaError);
    expect(() => parser!.parse('(1 +')).toThrow(/parse error:/);
  });

  it('function callees are excluded from variables (only the argument is a free variable)', () => {
    expect([...parser!.parse('sin(x) + cos(y)').variables]).toEqual(['x', 'y']);
  });

  it('multiple free variables come back de-duplicated and sorted', () => {
    expect([...parser!.parse('z + a + z + b').variables]).toEqual(['a', 'b', 'z']);
  });

  it('a non-finite or non-number evaluation result throws FormulaError, whether MathTS itself throws or returns Infinity/NaN', async () => {
    const { FormulaError } = await import('../../src/numerical/formula.js');
    // Division by zero: whether MathTS returns Infinity/NaN (caught by the
    // `!Number.isFinite` guard) or throws internally (caught by the try/catch
    // around node.evaluate), the seam still surfaces a FormulaError either way.
    expect(() => parser!.parse('x / 0').evaluate({ x: 1 })).toThrow(FormulaError);
    // typeof Infinity is "number"; the message has to name Infinity or a
    // division by zero looks like a type error.
    expect(() => parser!.parse('x / 0').evaluate({ x: 1 })).toThrow(/Infinity/);
    // sqrt(-1) is a Complex object. "got object" reads as a type error.
    expect(() => parser!.parse('sqrt(-1)').evaluate({})).toThrow(/complex number/);
  });

  it('evaluate() wraps a scope-related evaluation failure as FormulaError', async () => {
    const { FormulaError } = await import('../../src/numerical/formula.js');
    // 'q' is never supplied in scope — MathTS throws inside node.evaluate().
    expect(() => parser!.parse('q + 1').evaluate({})).toThrow(FormulaError);
  });
});
