/**
 * The study's effective σ through the one GUM path (proposal 12): MathTS `propagateUncertainty`,
 * as `composition/uncertainty.ts` already uses it, instead of a hand-coded central difference.
 * The step floor for an input that is exactly zero is kept by shifting that input by 1e3·σ_x
 * (the derivative of f(x) and of f(z − c) agree), so MathTS's relative step 1e-6·|z| is the old
 * absolute floor 1e-3·σ_x there. A port without that shift takes h = 1e-36 at x = 0 and reads a
 * zero slope: that mutation was run and failed the first test here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { propagateUncertainty } from '@danielsimonjr/mathts-functions';
import { effectiveSigma, type StudyObservation } from '../../../src/composition/probe/study.js';

const row = (inputs: Record<string, number>, inputSigma: Record<string, number>, sigma: number): StudyObservation => ({
  id: 'r', role: 'exploratory', source: 's', inputs, observed: 0, sigma, inputSigma,
});

describe('effectiveSigma through propagateUncertainty', () => {
  it('an input that is exactly zero still gets a finite derivative (the 1e-3·σ_x step floor is kept)', () => {
    // f = 3x + 1: the slope is 3 everywhere; at x = 0 a purely relative step cannot see it. The
    // shifted step is formed at the scale of the shift (c/h = 1e6), so the slope carries about
    // 1e-10 relative rounding there: immaterial for a σ, and why this is 9 places, not 12.
    const r = row({ x: 0 }, { x: 0.1 }, 0.02);
    expect(effectiveSigma(r, (v) => 3 * v.x! + 1)).toBeCloseTo(Math.hypot(0.02, 0.3), 9);
    // A curved model at zero: f = x² + x, slope 1 at x = 0.
    expect(effectiveSigma(r, (v) => v.x! ** 2 + v.x!)).toBeCloseTo(Math.hypot(0.02, 0.1), 9);
    // Two inputs, one zero: each slope is read at the recorded point of the other.
    const two = row({ x: 0, y: 2 }, { x: 0.1, y: 0.5 }, 0);
    expect(effectiveSigma(two, (v) => v.x! * v.y! + 3 * v.y!)).toBeCloseTo(Math.hypot(2 * 0.1, 3 * 0.5), 9);
  });

  it('is the GUM path itself: σ_eff² − σ_y² equals the MathTS propagateUncertainty variance for a non-zero input', () => {
    const f = (v: Record<string, number>) => 2 * Math.PI * Math.sqrt(v.length! / v.gravity!);
    const inputs = { length: 0.7, gravity: 9.81 };
    const sigmas = { length: 0.004, gravity: 0.03 };
    const r = row(inputs, sigmas, 0.002);
    const gum = propagateUncertainty((v) => f(v), inputs, sigmas, { relativeStep: 1e-6 });
    expect(effectiveSigma(r, f) ** 2 - 0.002 ** 2).toBeCloseTo(gum.sigma ** 2, 14);
    // Paired check: the analytic partials give the same variance to the finite-difference precision.
    const dL = f(inputs) / (2 * inputs.length);
    const dg = -f(inputs) / (2 * inputs.gravity);
    expect(Math.abs(gum.sigma ** 2 / ((dL * 0.004) ** 2 + (dg * 0.03) ** 2) - 1)).toBeLessThan(1e-9);
  });

  it('an input with no σ contributes nothing, and a non-finite slope is refused by row', () => {
    const r = row({ x: 1 }, {}, 0.5);
    expect(effectiveSigma(r, (v) => 1 / v.x!)).toBe(0.5);
    const bad = row({ x: 0 }, { x: 0.1 }, 0.5);
    expect(() => effectiveSigma(bad, (v) => Math.sqrt(v.x! - 0.5))).toThrow(/slope in x is not finite on row r/);
  });

  it('the study reads propagateUncertainty and no longer carries its own central difference', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../src/composition/probe/study.ts'), 'utf8');
    expect(src).toMatch(/propagateUncertainty/);
    expect(src).not.toMatch(/\/ \(2 \* h\)/);
  });
});
