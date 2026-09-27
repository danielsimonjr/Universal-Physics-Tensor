/**
 * Numeric-prefactor guards (Task 6, review finding F3). Dimensional validation
 * cannot catch area-vs-radius, log-base, or flux-vs-power slips — they all
 * balance dimensionally. Evaluating the scalar-AST and asserting the leading
 * constant does catch them. Gated on the constants resolving via `evalExpr`.
 *
 * @module tests/canonical/numeric-prefactor
 */
import { describe, it, expect } from 'vitest';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { canonicalById } from '../../src/canonical/registry.js';
import {
  C_SI,
  G_SI,
  HBAR_SI,
  K_B_SI,
  H_SI,
  B_WIEN_SI,
} from '../../src/core/constants.js';

const rel = (a: number, b: number) => Math.abs((a - b) / b);

describe('canonical numeric-prefactor guards', () => {
  it('Landauer E(300 K) = k_B·T·ln2 (natural log)', () => {
    const ast = canonicalById('CE-landauer')!.scalarAst!;
    const got = evalExpr(ast, { T: 300 });
    const expected = K_B_SI * 300 * Math.LN2; // ≈ 2.871e-21 J
    expect(rel(got, expected)).toBeLessThan(1e-12);
    // A log₁₀ slip would be ~3.32× larger — pin the order of magnitude too.
    expect(got).toBeGreaterThan(2.8e-21);
    expect(got).toBeLessThan(2.95e-21);
  });

  it('Stefan–Boltzmann j(5778 K) = σ·T⁴ (flux, fourth power)', () => {
    const ast = canonicalById('CE-stefan-boltzmann')!.scalarAst!;
    const got = evalExpr(ast, { T: 5778 });
    const expected = 5.670374419e-8 * Math.pow(5778, 4); // ≈ 6.3e7 W/m²
    expect(rel(got, expected)).toBeLessThan(1e-9);
    // T³ instead of T⁴ would be ~5778× smaller — guard the magnitude.
    expect(got).toBeGreaterThan(6e7);
    expect(got).toBeLessThan(6.5e7);
  });

  it('Bekenstein–Hawking consumes AREA and carries the 1/4 c³/(Għ) factor', () => {
    const ast = canonicalById('CE-bekenstein-hawking')!.scalarAst!;
    // Passing { A } (area) — if the AST used a radius leaf this would throw.
    const got = evalExpr(ast, { A: 1 });
    const expected = (K_B_SI * Math.pow(C_SI, 3) * 1) / (4 * G_SI * HBAR_SI);
    expect(rel(got, expected)).toBeLessThan(1e-12);
  });
});

describe('canonical universal-constant resolution (h, b register correctly)', () => {
  it('Planck–Einstein E = h·ν resolves h from CONSTANTS', () => {
    const ast = canonicalById('CE-planck-einstein')!.scalarAst!;
    const got = evalExpr(ast, { nu: 6e14 });
    expect(rel(got, H_SI * 6e14)).toBeLessThan(1e-12);
  });

  it('de Broglie λ = h/p resolves h from CONSTANTS', () => {
    const ast = canonicalById('CE-de-broglie')!.scalarAst!;
    const got = evalExpr(ast, { p: 1e-24 });
    expect(rel(got, H_SI / 1e-24)).toBeLessThan(1e-12);
  });

  it('Wien λ_max = b/T resolves b from CONSTANTS (~501 nm at the Sun)', () => {
    const ast = canonicalById('CE-wien')!.scalarAst!;
    const got = evalExpr(ast, { T: 5778 });
    expect(rel(got, B_WIEN_SI / 5778)).toBeLessThan(1e-12);
    expect(got).toBeGreaterThan(4.9e-7);
    expect(got).toBeLessThan(5.1e-7);
  });
});
