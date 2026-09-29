/**
 * Formula dimensional check (Phase 2, src/numerical/formula-dimension.ts).
 * Transpiles a user formula's AST into UPT's ExprNode and validates
 * homogeneity + inferred dimension. The BUILT-IN (Path B) checker is always
 * available (no MathTS peer); a guarded block confirms the MathTS-backed
 * checker agrees with it case-for-case.
 */
import { describe, it, expect } from 'vitest';
import type { Dimension } from '../../src/dimensional/types.js';
import {
  builtinFormulaDimensionChecker,
  loadFormulaDimensionChecker,
} from '../../src/numerical/formula-dimension.js';
import type { FormulaDimensionChecker } from '../../src/numerical/formula-dimension.js';
import { D } from '../fixtures/dimension.js';

/** Cases the checker must get right (expr, dims, expected). */
const CASES: ReadonlyArray<readonly [string, Record<string, Dimension>, Dimension | 'error', RegExp?]> = [
  ['2*pi*sqrt(length/gravity)', { length: D(1), gravity: D(1, 0, -2) }, D(0, 0, 1)], // time
  ['2*G*mass/c^2', { G: D(3, -1, -2), mass: D(0, 1), c: D(1, 0, -1) }, D(1)], // length
  ['hbar*c^3/(8*pi*G*M*k_B)', { hbar: D(2, 1, -1), c: D(1, 0, -1), G: D(3, -1, -2), M: D(0, 1), k_B: D(2, 1, -2, -1) }, D(0, 0, 0, 1)], // temperature
  ['exp(a/b)', { a: D(1), b: D(1) }, D()], // dimensionless
  ['2*pi*r', { r: D(1) }, D(1)], // pi needs no declaration
  ['a + b', { a: D(1), b: D(0, 0, 1) }, 'error', /mismatch|add/i],
  ['sin(a)', { a: D(1) }, 'error', /dimensionless/],
  ['a^b', { a: D(1), b: D() }, 'error', /exponent must be/],
  ['mass * foo', { mass: D(0, 1) }, 'error', /undeclared symbol 'foo'/],
  // The example must not assign the user's own symbol the dimension length.
  ['mass * foo', { mass: D(0, 1) }, 'error', /for example x:length/],
];

function runChecks(checker: FormulaDimensionChecker, label: string): void {
  describe(`[${label}] formula dimensional check`, () => {
    for (const [expr, dims, expected, pattern] of CASES) {
      it(`checks ${expr}`, () => {
        const r = checker.check(expr, dims);
        if (expected === 'error') {
          expect(r.ok).toBe(false);
          if (pattern) expect(r.error).toMatch(pattern);
        } else {
          expect(r.ok).toBe(true);
          expect(r.dim).toEqual(expected);
        }
      });
    }
  });
}

// Path B — ALWAYS runs (no optional peer).
runChecks(builtinFormulaDimensionChecker(), 'builtin');

// Path A — runs when the MathTS peer is present; must agree case-for-case.
let mathts: FormulaDimensionChecker | null = null;
try {
  mathts = await loadFormulaDimensionChecker();
  mathts.check('1', {});
} catch {
  mathts = null;
}
if (mathts) {
  runChecks(mathts, 'mathts');
  describe('builtin ↔ mathts dimensional-check parity', () => {
    const builtin = builtinFormulaDimensionChecker();
    for (const [expr, dims] of CASES) {
      it(`agrees on ${expr}`, () => {
        const b = builtin.check(expr, dims);
        const m = mathts!.check(expr, dims);
        expect(m.ok).toBe(b.ok);
        if (b.ok) expect(m.dim).toEqual(b.dim);
      });
    }
  });
} else {
  describe.skip('mathts dimensional check (skipped: optional dep absent)', () => {});
}
