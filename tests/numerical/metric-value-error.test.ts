/**
 * The metric library's value refusals are one typed class, `MetricValueError`,
 * not a plain `Error` the CLI had to recognise by `e.constructor === Error`;
 * and a parameter given twice is refused instead of the last one silently
 * winning (`metricParams` overwrote the earlier value).
 */
import { describe, expect, it } from 'vitest';
import { curvatureReport, kerrGeodesic, MetricMassError, MetricValueError } from '../../src/numerical/spacetime-metrics.js';

describe('MetricValueError', () => {
  it('is an exported Error subclass (so the instance checks below cannot pass vacuously)', () => {
    expect(typeof MetricValueError).toBe('function');
    const e = new MetricValueError('x');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('MetricValueError');
    expect(e.constructor).not.toBe(Error);
  });

  it('is the class of a point inside the horizon, a bad Kerr point and a bad polar angle', () => {
    expect(() => curvatureReport('schwarzschild', ['r=1'])).toThrow(MetricValueError);
    expect(() => curvatureReport('schwarzschild', ['r=1'])).toThrow(/outside the horizon/);
    expect(() => curvatureReport('kerr', ['a=1e9', 'r=1'])).toThrow(MetricValueError);
    expect(() => curvatureReport('kerr', ['a=1e9', 'r=1'])).toThrow(/Kerr finite difference wants/);
    expect(() => curvatureReport('schwarzschild', ['theta=0'])).toThrow(MetricValueError);
  });

  it('is the class of an unknown parameter and a token that is not key=value', () => {
    expect(() => curvatureReport('schwarzschild', ['mass=1'])).toThrow(MetricValueError);
    expect(() => curvatureReport('schwarzschild', ['mass=1'])).toThrow(/unknown parameter 'mass'/);
    expect(() => curvatureReport('schwarzschild', ['M'])).toThrow(MetricValueError);
    expect(() => curvatureReport('schwarzschild', ['M'])).toThrow(/must be key=value/);
  });

  it('is the class of a geodesic refusal', () => {
    expect(() => kerrGeodesic({ M: 1, aOverM: 2, E: 1, L: 1, Q: 0 })).toThrow(MetricValueError);
    expect(() => kerrGeodesic({ M: 1, aOverM: 2, E: 1, L: 1, Q: 0 })).toThrow(/Kerr geodesic wants/);
  });

  it('a non-positive mass stays MetricMassError, which is not a MetricValueError', () => {
    expect(() => curvatureReport('schwarzschild', ['M=0'])).toThrow(MetricMassError);
    expect(() => curvatureReport('schwarzschild', ['M=0'])).not.toThrow(MetricValueError);
  });
});

describe('a parameter given twice', () => {
  it('is refused, naming the parameter, instead of the last value winning', () => {
    expect(() => curvatureReport('schwarzschild', ['M=1.989e30', 'M=3e30'])).toThrow(MetricValueError);
    expect(() => curvatureReport('schwarzschild', ['M=1.989e30', 'M=3e30'])).toThrow(/'M' is given twice/);
  });

  it('the control: the same parameter once is read', () => {
    const r = curvatureReport('schwarzschild', ['M=1.989e30', 'r=1e8']);
    expect(r.parameters.M).toBe(1.989e30);
  });
});
