/**
 * The canonical evaluator is the dimensional monomial. A fully-quantitative
 * AST's dimensionless count is not in that monomial, so ideal-gas explain
 * returned `k_B T/V` and perihelion dropped `1-e²`. Issue #387.
 */
import { capture, text } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { C_SI, G_SI, HBAR_SI, K_B_SI } from '../../src/core/constants.js';

function recovered(body: string): number | undefined {
  const m = /Recovered value: ([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(body);
  return m === null ? undefined : Number(m[1]);
}

const N_A = 6.02214076e23;
const KB = String(K_B_SI);

describe('canonical formula counts', () => {
  it('ideal-gas explain without N does not return k_B T/V', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'pressure', `boltzmann-constant=${KB}`, 'temperature=300', 'V=0.0224', '--source=canonical'],
        cap.io,
      ),
    ).toBe(0);
    const body = text(cap);
    expect(recovered(body)).toBeUndefined();
    expect(body).toMatch(/\bN\b/);
    expect(body).not.toMatch(/1\.84908348214286e-19/);
  });

  it('ideal-gas explain with N returns N k_B T/V', async () => {
    const cap = capture();
    expect(
      await runCli(
        ['explain', 'pressure', `boltzmann-constant=${KB}`, 'temperature=300', 'V=0.0224', `N=${N_A}`, '--source=canonical'],
        cap.io,
      ),
    ).toBe(0);
    const body = text(cap);
    const expected = (N_A * K_B_SI * 300) / 0.0224;
    expect(recovered(body)).toBeCloseTo(expected, 4);
    // k_B is baked (2026-10-09), so {temperature, V, N} alone do not fix the dimension and no ∝ line
    // prints; the count N is a leaf of the derivation and the value is N k_B T / V.
    expect(body).toMatch(/\[from leaves: N, V, temperature\]/);
    expect(recovered(body)).not.toBeCloseTo((K_B_SI * 300) / 0.0224, 6);
  });

  it('a null monomial still evaluates the fully-quantitative AST', () => {
    const edge = CANONICAL_GRAPH.find((e) => e.id === 'CE-hawking-temperature');
    expect(edge).toBeDefined();
    const mass = 1.9885e30;
    const expected = (HBAR_SI * C_SI ** 3) / (8 * Math.PI * G_SI * mass * K_B_SI);
    expect(edge!.evaluate({ mass })).toBeCloseTo(expected, 6);
  });

  it('perihelion precession divides by one_minus_e_sq and keeps 6π', () => {
    const edge = CANONICAL_GRAPH.find((e) => e.id === 'CE-perihelion-precession');
    expect(edge).toBeDefined();
    const mass = 1.989e30;
    const a = 5.79e10;
    const skeleton = (G_SI * mass) / (C_SI * C_SI * a);
    const full = edge!.evaluate({ mass, a, one_minus_e_sq: 1 });
    expect(full / skeleton).toBeCloseTo(6 * Math.PI, 8);
    expect(edge!.evaluate({ mass, a, one_minus_e_sq: 0.5 }) / full).toBeCloseTo(2, 8);
  });
});
