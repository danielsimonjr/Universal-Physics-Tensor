/**
 * `integrateGeodesicGL4` option guards and error discrimination.
 *
 * Two defects from the 9.0.0 audit (§2 N1, N2):
 *   - the step-halving loop caught EVERY error, so a programming error inside
 *     `gInverseFn` (or the domain-crossing throw the module doc tells callers
 *     to use) was halved down to `hMin` and reported as a Picard failure;
 *   - a negative or non-finite `tauMax` integrated nothing and still reported
 *     `steps + 1` snapshots, and a non-integer `steps` ran past `tauMax`.
 *
 * The metric is flat, so Picard converges in one iteration and nothing here
 * depends on step-halving firing.
 *
 * @module tests/numerical/gl4-integrator-options
 */
import { describe, expect, it } from 'vitest';
import { integrateGeodesicGL4 } from '../../src/numerical/gl4-integrator.js';
import { GL4ConvergenceError, NumericalBackendError } from '../../src/numerical/errors.js';

const DIM = 1;
const flat = (_x: readonly number[]): Float64Array => Float64Array.from([1]);
const flatDg = (_x: readonly number[]): Float64Array => new Float64Array(1);
const free = { x: [0], p: [1] };

describe('integrateGeodesicGL4 rethrows an error that is not a Picard failure (N1)', () => {
  it('a TypeError thrown by gInverseFn mid-trajectory propagates as that TypeError', () => {
    let calls = 0;
    const buggy = (x: readonly number[]): Float64Array => {
      calls++;
      if (calls > 3) throw new TypeError('bug in the metric closure');
      return flat(x);
    };
    expect(() =>
      integrateGeodesicGL4(free, { steps: 4, tauMax: 1, gInverseFn: buggy, dgInverseFn: flatDg }),
    ).toThrow(TypeError);
    // One throw, not thirty halvings down to h_min.
    expect(calls).toBeLessThan(10);
  });

  it('a domain-crossing RangeError from gInverseFn propagates with its own message', () => {
    const crossing = (x: readonly number[]): Float64Array => {
      if (x[0]! > 0.5) throw new RangeError('out of domain');
      return flat(x);
    };
    expect(() =>
      integrateGeodesicGL4(free, { steps: 4, tauMax: 1, gInverseFn: crossing, dgInverseFn: flatDg }),
    ).toThrow(/out of domain/);
  });

  it('a Picard failure is still halved and, at h_min, reported as GL4ConvergenceError', () => {
    // A metric whose Picard contraction is weak enough that one iteration never reaches 1e-12.
    const curved = (x: readonly number[]): Float64Array => Float64Array.from([1 + Math.sin(3 * x[0]!)]);
    const curvedDg = (x: readonly number[]): Float64Array => Float64Array.from([3 * Math.cos(3 * x[0]!)]);
    expect(() =>
      integrateGeodesicGL4(free, {
        steps: 1,
        tauMax: 1,
        gInverseFn: curved,
        dgInverseFn: curvedDg,
        picardMaxIter: 1,
        hMin: 1e-3,
      }),
    ).toThrow(GL4ConvergenceError);
  });
});

describe('integrateGeodesicGL4 validates steps and tauMax before integrating (N2)', () => {
  const run = (steps: number, tauMax: number): readonly { tau: number; x: readonly number[] }[] =>
    integrateGeodesicGL4(free, { steps, tauMax, gInverseFn: flat, dgInverseFn: flatDg });

  it('a positive integer step count over a positive tauMax lands on tauMax', () => {
    const out = run(2, 1);
    expect(out).toHaveLength(3);
    expect(out[2]!.tau).toBe(1);
    expect(out[2]!.x[0]).toBeCloseTo(1, 12);
  });

  it('a negative tauMax is refused, not reported as snapshots of nothing', () => {
    expect(() => run(2, -1)).toThrow(NumericalBackendError);
    expect(() => run(2, -1)).toThrow(/tauMax/);
  });

  it.each([0, Number.NaN, Number.POSITIVE_INFINITY])('tauMax = %s is refused', (tauMax) => {
    expect(() => run(2, tauMax)).toThrow(/tauMax/);
  });

  it.each([0, -1, 2.5, Number.NaN])('steps = %s is refused', (steps) => {
    expect(() => run(steps, 1)).toThrow(NumericalBackendError);
    expect(() => run(steps, 1)).toThrow(/steps/);
  });

  it('the guard runs before any metric evaluation', () => {
    let calls = 0;
    const counting = (x: readonly number[]): Float64Array => {
      calls++;
      return flat(x);
    };
    expect(() =>
      integrateGeodesicGL4(free, { steps: 2.5, tauMax: 1, gInverseFn: counting, dgInverseFn: flatDg }),
    ).toThrow();
    expect(calls).toBe(0);
  });
});

describe('the flat-space fixture integrates (control for the guards above)', () => {
  it(`dimension ${DIM}: x advances by p per unit tau`, () => {
    const out = integrateGeodesicGL4(free, { steps: 10, tauMax: 2, gInverseFn: flat, dgInverseFn: flatDg });
    expect(out[10]!.x[0]).toBeCloseTo(2, 12);
    expect(out[10]!.p[0]).toBeCloseTo(1, 12);
  });
});
