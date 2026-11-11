/**
 * The formula name set is built once, and a catalog expression is rewritten
 * once per text. The rewrite is a pure function of the text, so a memo of it
 * must give the same numbers as a fresh rewrite on every call.
 */
import { describe, expect, it } from 'vitest';
import { evaluateFormula, formulaNames } from '../../src/bridges/expr-parse.js';
import * as oracle from '../fixtures/oracles/expr-parse-oracle.js';

describe('formulaNames', () => {
  it('returns the same Set on every call', () => {
    expect(formulaNames()).toBe(formulaNames());
  });
});

describe('evaluateFormula on hyphenated expressions', () => {
  // The oracle rewrites the text again on every call. Interleaving two texts
  // fails a memo that returns a cached rewrite for the wrong key.
  const A = ['newton-coupling-dimensionless * 2', { 'newton-coupling-dimensionless': 3 }] as const;
  const B = ['reduced-planck-constant * omega', { omega: 5 }] as const;

  it('equals a fresh rewrite for each text, interleaved A, B, A', () => {
    for (const [expression, inputs] of [A, B, A]) {
      expect(evaluateFormula(expression, inputs)).toBe(oracle.evaluateFormula(expression, inputs));
    }
    expect(evaluateFormula(...A)).toBe(6);
  });
});
