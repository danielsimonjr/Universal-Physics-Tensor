/**
 * Conversion is the source map followed by the inverse of the target map, under one
 * reading. An affine target (degC, degF) is therefore a valid target.
 */
import { describe, expect, it } from 'vitest';
import { UnitError, convertValue } from '../../src/dimensional/units.js';

describe('convertValue into an affine target', () => {
  it('converts an absolute reading from degF to degC, naming the source unit only', () => {
    expect(convertValue('100 degF', 'degC')).toEqual({ value: 340 / 9, given: 'degF', affine: 'fahrenheit' });
    expect(convertValue('300 K', 'degC')).toEqual({ value: 26.85, given: 'K' });
  });

  it('is exact: one rounding', () => {
    expect(convertValue('300 K', 'degF').value).toBe(80.33);
    expect(convertValue('0 degC', 'degF').value).toBe(32);
    expect(convertValue('-40 degC', 'degF').value).toBe(-40);
  });

  it('a difference reading adds no offset to the target', () => {
    expect(convertValue('100 degF', 'degC', 'difference').value).toBe(500 / 9);
    expect(convertValue('10 degC', 'degF', 'difference').value).toBe(18);
    expect(convertValue('5 K', 'degC', 'difference').value).toBe(5);
  });

  it.each(['absolute', 'difference'] as const)('round-trips under the %s reading', (reading) => {
    for (const x of [-12.5, 0, 37.25]) {
      const f = convertValue(`${x} degC`, 'degF', reading).value;
      expect(convertValue(`${f} degF`, 'degC', reading).value).toBeCloseTo(x, 12);
      const k = convertValue(`${x} degC`, 'K', reading).value;
      expect(convertValue(`${k} K`, 'degC', reading).value).toBeCloseTo(x, 12);
    }
  });

  it('still refuses a dimension mismatch', () => {
    expect(() => convertValue('1 m', 'degC')).toThrow(UnitError);
  });
});
