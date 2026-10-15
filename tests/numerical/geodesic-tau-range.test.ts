/**
 * `integrateGeodesic` accepted a τ range it could not integrate — `tauEnd`
 * NaN, infinite, or equal to `tauStart` — and returned the start state as if
 * nothing had been asked. Each is a refusal now, the same class as a bad
 * `steps`.
 */
import { describe, expect, it } from 'vitest';
import { integrateGeodesic } from '../../src/numerical/geodesic-integrator.js';
import { NumericalBackendError } from '../../src/numerical/errors.js';

const run = (tauStart: number, tauEnd: number) =>
  integrateGeodesic({
    christoffelFn: () => new Float64Array(64),
    x0: [0, 10, Math.PI / 2, 0],
    v0: [1, 0, 0, 0],
    tauStart,
    tauEnd,
    steps: 8,
  });

describe('integrateGeodesic refuses a τ range it cannot integrate', () => {
  it('tauEnd NaN', () => {
    expect(() => run(0, Number.NaN)).toThrow(NumericalBackendError);
    expect(() => run(0, Number.NaN)).toThrow(/tauEnd/);
  });

  it('tauEnd infinite', () => {
    expect(() => run(0, Number.POSITIVE_INFINITY)).toThrow(NumericalBackendError);
  });

  it('tauStart not finite', () => {
    expect(() => run(Number.NaN, 1)).toThrow(NumericalBackendError);
    expect(() => run(Number.NaN, 1)).toThrow(/tauStart/);
  });

  it('tauEnd equal to tauStart (a zero step is not an integration)', () => {
    expect(() => run(1, 1)).toThrow(NumericalBackendError);
    expect(() => run(1, 1)).toThrow(/tauEnd must differ from tauStart/);
  });

  it('the control: a finite, non-empty range integrates and moves the coordinate', () => {
    const out = run(0, 1);
    expect(out.xFinal[0]).toBeCloseTo(1, 12);
  });
});
