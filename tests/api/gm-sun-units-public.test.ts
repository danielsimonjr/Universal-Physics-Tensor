/**
 * `GM_SUN_SI` and the unit reader are on the package root. A deep import of
 * `core/constants.js` or `dimensional/units.js` is not a public path.
 */
import { describe, expect, it } from 'vitest';
import {
  convertValue,
  G_SI,
  GM_SUN_SI,
  M_SUN_SI,
  parseUnit,
  UnitError,
} from '../../src/index.js';
import type { ParsedUnit, TemperatureReading } from '../../src/index.js';

describe('package root exports GM_SUN_SI and unit conversion', () => {
  it('GM_SUN_SI is the IAU value, and it is not G_SI times M_SUN_SI', () => {
    expect(GM_SUN_SI).toBe(1.3271244e20);
    const product = G_SI * M_SUN_SI;
    expect(product).not.toBe(GM_SUN_SI);
    expect(Math.abs(product - GM_SUN_SI) / GM_SUN_SI).toBeGreaterThan(1e-4);
  });

  it('convertValue and parseUnit read a temperature and a length', () => {
    expect(convertValue('25degC', 'K')).toEqual({ value: 298.15, given: 'degC' });
    const metres: ParsedUnit = parseUnit('m');
    expect(metres.dim.L).toBe(1);
    const reading: TemperatureReading = 'difference';
    expect(convertValue('25degC', 'K', reading).value).toBe(25);
  });

  it('an unknown unit throws UnitError', () => {
    expect(() => parseUnit('smoot')).toThrow(UnitError);
    expect(() => convertValue('1smoot', 'm')).toThrow(UnitError);
  });
});
