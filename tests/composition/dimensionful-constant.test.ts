/**
 * "Carries dimensionful constants" is the span failure, not every
 * undetermined monomial.
 *
 * Two dimensionless metric components do not fix a unique monomial for a
 * dimensionless frequency ratio. Nothing dimensionful is missing. Hawking
 * temperature from mass alone is the other case: the temperature is not in
 * the span of mass, and the encoded formula does carry ℏ, c, G, and k_B.
 */
import { describe, it, expect } from 'vitest';
import { explainQuantity } from '../../src/composition/explain.js';
import { CATALOG_GRAPH, M_SUN_KG } from '../../src/composition/index.js';
import { dimensionallyDetermines } from '../../src/dimensional/buckingham.js';
import { DIMENSIONLESS, MASS, TEMPERATURE } from '../../src/dimensional/types.js';

describe('the dimensionful-constant judgement is the span failure', () => {
  it('gravitational-frequency-ratio does not claim dimensionful constants', () => {
    const x = explainQuantity(CATALOG_GRAPH, 'gravitational-frequency-ratio', {
      'redshift-metric-g00-1': -1,
      'redshift-metric-g00-2': -4,
    });
    expect(x.recoveredValue).toBeCloseTo(2, 12);
    expect(x.summary).not.toMatch(/dimensionful constants/);
    expect(x.summary).toMatch(/do not fix a unique monomial/);
    expect(x.dimensional?.outsideGoverningSpan).toBe(false);
  });

  it('hawking temperature from mass alone still carries dimensionful constants', () => {
    const x = explainQuantity(CATALOG_GRAPH, 'hawking-temperature', { mass: M_SUN_KG });
    expect(x.summary).toMatch(/dimensionful constants/);
    expect(x.dimensional?.outsideGoverningSpan).toBe(true);
  });

  it('Kelvin stays a proportionality', () => {
    const x = explainQuantity(CATALOG_GRAPH, 'peltier-coefficient', {
      'seebeck-coefficient': 2e-4,
      'peltier-temperature': 300,
    });
    expect(x.recoveredValue).toBeCloseTo(0.06, 10);
    expect(x.summary).toMatch(/∝/);
    expect(x.summary).not.toMatch(/dimensionful constants/);
  });

  it('a dimensionless pair is not outside the governing span', () => {
    const g = { name: 'g', dim: DIMENSIONLESS };
    const res = dimensionallyDetermines(
      { name: 'ratio', dim: DIMENSIONLESS },
      [g, { name: 'g2', dim: DIMENSIONLESS }],
    );
    expect(res.determined).toBe(false);
    expect(res.outsideGoverningSpan).toBe(false);
  });

  it('a temperature from mass alone is outside the governing span', () => {
    const res = dimensionallyDetermines(
      { name: 'temperature', dim: TEMPERATURE },
      [{ name: 'mass', dim: MASS }],
    );
    expect(res.determined).toBe(false);
    expect(res.outsideGoverningSpan).toBe(true);
  });
});
