/**
 * Standard gravity and the Julian year are rows of `data/units.json`
 * (`standard_gravity`, `julian_year`). The two applied cases restated them as
 * literals; each is read through the unit table now, and the value is the
 * same double.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { G_STANDARD } from '../../src/cases/brownian-sphere.js';
import { JULIAN_YEAR_S } from '../../src/cases/kepler-rv.js';
import { convertValue } from '../../src/dimensional/units.js';

const source = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('case constants read the unit table', () => {
  it('G_STANDARD is the table’s standard gravity, the same double as before', () => {
    expect(G_STANDARD).toBe(9.80665);
    expect(G_STANDARD).toBe(convertValue('1 kgf/kg', 'm/s^2').value);
    expect(source('../../src/cases/brownian-sphere.ts')).not.toMatch(/= 9\.80665/);
  });

  it('JULIAN_YEAR_S is the table’s Julian year, the same double as before', () => {
    expect(JULIAN_YEAR_S).toBe(31557600);
    expect(JULIAN_YEAR_S).toBe(convertValue('1 yr', 's').value);
    expect(source('../../src/cases/kepler-rv.ts')).not.toMatch(/365\.25 \* 86400/);
  });
});
