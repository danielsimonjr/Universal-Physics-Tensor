/**
 * Issue 678: the international mile and the US liquid gallon are admitted with the
 * exact MathTS definitions (NIST SP 811 B.8): 5280 ft and 231 in^3.
 */
import { describe, expect, it } from 'vitest';
import { convertValue, parseUnit, UnknownUnitError } from '../../src/dimensional/units.js';

describe('mile and gallon (issue 678)', () => {
  it('reads mile and mi as 1609.344 m', () => {
    expect(convertValue('1 mile', 'm').value).toBe(1609.344);
    expect(convertValue('1 mi', 'm').value).toBe(1609.344);
    expect(parseUnit('mile').dim).toMatchObject({ L: 1 });
    expect(convertValue('60 mile/h', 'mph').value).toBeCloseTo(60, 12);
  });

  it('reads gallon as the US liquid gallon, 231 in^3', () => {
    expect(convertValue('1 gallon', 'L').value).toBe(3.785411784);
    expect(parseUnit('gallon').dim).toMatchObject({ L: 3 });
    expect(parseUnit('gallon').scale).toBe(3.785411784e-3);
  });

  it('keeps the new rows prefix-free and leaves other spellings unknown', () => {
    expect(() => parseUnit('kmile')).toThrow(UnknownUnitError);
    expect(() => parseUnit('mgallon')).toThrow(UnknownUnitError);
    // `gal` names the CGS acceleration unit Gal too; it stays unknown by decision.
    expect(() => parseUnit('gal')).toThrow(UnknownUnitError);
    expect(() => parseUnit('gzqal')).toThrow(UnknownUnitError);
    expect(convertValue('1 min', 's').value).toBe(60);
    expect(parseUnit('mil').scale).toBe(2.54e-5);
  });
});
