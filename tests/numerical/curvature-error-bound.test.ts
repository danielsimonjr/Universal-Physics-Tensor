/**
 * The error bound of the finite-difference Riemann pipeline (`riemannUpperWithBoundAt`).
 *
 * Each test checks two things. The bound covers the actual error against a closed-form
 * Riemann tensor, component by component. The bound is also small where the difference
 * resolves the curvature, so a bound of Infinity fails.
 *
 * De Sitter at Λ = 1.1e-52 m⁻² and r = 1e3 m: `1 − Λr²/3` is exactly 1 in double, so the
 * metric closure holds no curvature. The pipeline must report that point as unresolved.
 * r = 5e25 m is the control: there the difference resolves R to about 1e-8.
 */
import { describe, expect, it } from 'vitest';
import {
  kretschmannWithBound,
  riemannUpperWithBoundAt,
  weylTensorWithBoundAt,
} from '../../src/numerical/curvature-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { curvatureReport, schwarzschildKretschmann } from '../../src/numerical/spacetime-metrics.js';
import type { NestedArray } from '../../src/numerical/types.js';
import { schwarzschildGFn, schwarzschildGInverseFn, schwarzschildRiemannFn, schwarzschildRs } from '../fixtures/schwarzschild.js';
import { deSitterGFn, deSitterGInverseFn, deSitterRiemannFn } from '../fixtures/de-sitter.js';

type T4 = number[][][][];
type Fn = (x: ReadonlyArray<number>) => NestedArray;
const engine = new MathTSEngine();
const LAMBDA_SI = 1.1e-52;
const M_SUN = 1.989e30;

const square = (v: NestedArray): number[][] => {
  const a = v as unknown as number[] | number[][];
  return Array.isArray(a[0]) ? (a as number[][]) : [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (a as number[])[i * 4 + j]!));
};

/** The largest actual error over the bound, over every component with a nonzero error. */
function worstErrorOverBound(fd: T4, exact: T4, bound: T4): number {
  let worst = 0;
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++)
      for (let c = 0; c < 4; c++)
        for (let d = 0; d < 4; d++) {
          const e = Math.abs(fd[a]![b]![c]![d]! - exact[a]![b]![c]![d]!);
          if (e > 0) worst = Math.max(worst, e / bound[a]![b]![c]![d]!);
        }
  return worst;
}

/**
 * The largest bound over |exact|, over the components whose closed form is not zero. Each
 * component is compared with its own bound, so the coordinate units cancel. A component that
 * is zero by symmetry has a bound and no scale, so it is not in this measure.
 */
function worstRelativeBound(bound: T4, exact: T4): number {
  let worst = 0;
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++)
      for (let c = 0; c < 4; c++)
        for (let d = 0; d < 4; d++) {
          const e = Math.abs(exact[a]![b]![c]![d]!);
          if (e > 0) worst = Math.max(worst, bound[a]![b]![c]![d]! / e);
        }
  return worst;
}

/** Every computed component lies within its own bound: the difference resolves none of them. */
function withinBound(fd: T4, bound: T4): boolean {
  return fd.every((x, a) => x.every((y, b) => y.every((z, c) => z.every((v, d) => Math.abs(v) <= bound[a]![b]![c]![d]!))));
}

function run(gFn: Fn, giFn: Fn, x: number[]) {
  const out = riemannUpperWithBoundAt(x, gFn as never, giFn as never, 4, engine);
  const g = square(gFn(x));
  const gi = square(giFn(x));
  return { ...out, g, gi, k: kretschmannWithBound(out.riemann, out.bound, g, gi) };
}

describe('finite-difference Riemann error bound', () => {
  const rs = schwarzschildRs(M_SUN);
  // At 1.05 r_s the truncation estimate |D4 − D2| is loose: the bound is about 0.2 of R where
  // the actual error is 3.9e-6 of R. It still covers the error and resolves K.
  for (const [k, tol] of [[1.05, 0.5], [1.5, 1e-3], [3, 1e-3], [10, 1e-3], [100, 1e-3]] as const) {
    it(`Schwarzschild r = ${k} r_s: the bound covers the error and resolves R and K`, () => {
      const x = [0, k * rs, Math.PI / 3, 0];
      const { riemann, bound, k: K } = run(schwarzschildGFn(M_SUN) as never, schwarzschildGInverseFn(M_SUN) as never, x);
      const exact = schwarzschildRiemannFn(M_SUN)(x);
      expect(worstErrorOverBound(riemann, exact, bound)).toBeLessThanOrEqual(1);
      expect(worstRelativeBound(bound, exact)).toBeLessThan(tol);
      // The Kretschmann bound covers the error against 48 G²M²/(c⁴r⁶).
      const Kexact = schwarzschildKretschmann(M_SUN, x[1]!);
      expect(Math.abs(K.value - Kexact)).toBeLessThanOrEqual(K.bound);
      expect(K.bound / Kexact).toBeLessThan(tol);
      expect(K.resolved).toBe(true);
    });
  }

  it('Schwarzschild r = 5e25 m: 1 − r_s/r is 1 in double, so K is unresolved', () => {
    const { k: K } = run(schwarzschildGFn(M_SUN) as never, schwarzschildGInverseFn(M_SUN) as never, [0, 5e25, Math.PI / 2, 0]);
    expect(K.resolved).toBe(false);
    expect(Math.abs(K.value)).toBeLessThanOrEqual(K.bound);
  });

  it('de Sitter Λ = 1, r = 1: the bound covers the error and resolves K', () => {
    const x = [0, 1, Math.PI / 4, 0];
    const { riemann, bound, k: K } = run(deSitterGFn(1) as never, deSitterGInverseFn(1) as never, x);
    const exact = deSitterRiemannFn(1)(x);
    expect(worstErrorOverBound(riemann, exact, bound)).toBeLessThanOrEqual(1);
    expect(worstRelativeBound(bound, exact)).toBeLessThan(1e-4);
    expect(Math.abs(K.value - 8 / 3)).toBeLessThanOrEqual(K.bound);
    expect(K.resolved).toBe(true);
  });

  it('de Sitter at the SI Λ, r = 5e25 m (control): resolved, and the bound covers the error', () => {
    const x = [0, 5e25, Math.PI / 4, 0];
    const { riemann, bound, k: K } = run(deSitterGFn(LAMBDA_SI) as never, deSitterGInverseFn(LAMBDA_SI) as never, x);
    const exact = deSitterRiemannFn(LAMBDA_SI)(x);
    expect(worstErrorOverBound(riemann, exact, bound)).toBeLessThanOrEqual(1);
    expect(worstRelativeBound(bound, exact)).toBeLessThan(1e-4);
    expect(K.bound / ((8 / 3) * LAMBDA_SI * LAMBDA_SI)).toBeLessThan(1e-4);
    expect(Math.abs(K.value - (8 / 3) * LAMBDA_SI * LAMBDA_SI)).toBeLessThanOrEqual(K.bound);
    expect(K.resolved).toBe(true);
  });

  it('de Sitter at the SI Λ, r = 1e3 m: the metric holds no curvature, so the result is unresolved', () => {
    // The bound covers the error of the difference against the closure as it is evaluated.
    // Here the closure is flat in double, so the true curvature (3.7e-53 m⁻²) is not in it,
    // and no bound built from the closure can cover the error against the closed form.
    // What it can say, and must: every computed component is noise inside its own bound.
    const x = [0, 1e3, Math.PI / 4, 0];
    const { riemann, bound, k: K } = run(deSitterGFn(LAMBDA_SI) as never, deSitterGInverseFn(LAMBDA_SI) as never, x);
    expect(1 - (LAMBDA_SI * x[1]! * x[1]!) / 3).toBe(1);
    expect(withinBound(riemann, bound)).toBe(true);
    expect(K.resolved).toBe(false);
    expect(Math.abs(K.value)).toBeLessThanOrEqual(K.bound);
  });

  it('the Weyl path inherits the bound: de Sitter is conformally flat, so C is unresolved, never refused', () => {
    const x = [0, 1, Math.PI / 4, 0];
    const gFn = deSitterGFn(1);
    const giFn = deSitterGInverseFn(1);
    const { weyl, bound } = weylTensorWithBoundAt(x, gFn as never, giFn as never, square(gFn(x)), square(giFn(x) as NestedArray), 4, engine);
    for (let a = 0; a < 4; a++)
      for (let b = 0; b < 4; b++)
        for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) expect(Math.abs(weyl[a]![b]![c]![d]!)).toBeLessThanOrEqual(bound[a]![b]![c]![d]!);
  });
});

describe('curvatureReport bounds', () => {
  it('Minkowski is unresolved, not refused', () => {
    const rep = curvatureReport('minkowski');
    expect(rep.kretschmann).toBe(0);
    expect(rep.kretschmannResolved).toBe(false);
    expect(rep.ricciScalarResolved).toBe(false);
    expect(rep.kretschmannBound).toBeGreaterThanOrEqual(0);
  });

  it('Schwarzschild defaults: K is resolved and its bound covers the closed form', () => {
    const rep = curvatureReport('schwarzschild');
    const K = rep.closedForm.kretschmann!;
    expect(rep.kretschmannResolved).toBe(true);
    expect(Math.abs(rep.kretschmann - K)).toBeLessThanOrEqual(rep.kretschmannBound);
    expect(rep.ricciScalarResolved).toBe(false);
  });

  it('Kerr and FLRW defaults: K is resolved', () => {
    expect(curvatureReport('kerr').kretschmannResolved).toBe(true);
    const flrw = curvatureReport('flrw');
    expect(flrw.kretschmannResolved).toBe(true);
    expect(flrw.ricciScalarResolved).toBe(true);
    expect(Math.abs(flrw.ricciScalar - flrw.closedForm.ricciScalar!)).toBeLessThanOrEqual(flrw.ricciScalarBound);
  });

  it('FLRW at c = 1: each Ricci component carries its own bound and is resolved', () => {
    const rep = curvatureReport('flrw', ['c=1']);
    expect(rep.ricci.length).toBeGreaterThan(0);
    for (const c of rep.ricci) {
      expect(c.bound).toBeGreaterThan(0);
      expect(c.resolved).toBe(true);
      expect(c.bound!).toBeLessThan(1e-4 * Math.abs(c.value));
    }
  });

  it('FLRW with spatial curvature: the difference in T = c t matches the closed form within its bound (#527)', () => {
    // Before #527 the c = 1 difference dropped the k c²/a² term, and the report put the closed form in its place.
    const rep = curvatureReport('flrw', ['k=1', 't=2']);
    expect(rep.ricciScalarBound).toBeGreaterThan(0);
    expect(Math.abs(rep.ricciScalar - rep.closedForm.ricciScalar!)).toBeLessThanOrEqual(rep.ricciScalarBound);
    expect(rep.ricciScalarResolved).toBe(true);
  });

  it('Schwarzschild far out (r = 5e25 m): K is unresolved, not refused', () => {
    const rep = curvatureReport('schwarzschild', ['r=5e25']);
    expect(rep.kretschmannResolved).toBe(false);
    expect(Math.abs(rep.kretschmann)).toBeLessThanOrEqual(rep.kretschmannBound);
  });
});
