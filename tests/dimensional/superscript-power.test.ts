/**
 * A superscript power is another spelling of the caret power.
 *
 * The caret reads any integer (`^([+-]?\d+)`), so a superscript run reads the same set:
 * the ten digits `⁰` to `⁹`, more than one digit, and an optional `⁻` or `⁺`.
 * Control: each row also reads the caret spelling, so a superscript that reads as a
 * different power fails the equality, and a refused superscript fails the parse.
 */
import { describe, expect, it } from 'vitest';
import { parseUnit, UnknownUnitError } from '../../src/dimensional/units.js';
import { superscriptPower } from '../../src/dimensional/unit-data.js';

describe('superscriptPower', () => {
  it('reads every superscript digit, a digit run and a sign', () => {
    expect(superscriptPower('m⁰')).toEqual({ base: 'm', exp: 0 });
    expect(superscriptPower('m⁴')).toEqual({ base: 'm', exp: 4 });
    expect(superscriptPower('m¹⁰')).toEqual({ base: 'm', exp: 10 });
    expect(superscriptPower('K⁻⁴')).toEqual({ base: 'K', exp: -4 });
    expect(superscriptPower('s⁺²')).toEqual({ base: 's', exp: 2 });
    expect(superscriptPower('m⁻¹²')).toEqual({ base: 'm', exp: -12 });
    for (const digit of '⁰¹²³⁴⁵⁶⁷⁸⁹') expect(superscriptPower(`m${digit}`)?.exp, digit).toBe('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(digit));
  });

  it('is null with no base, with no digit, or with no superscript', () => {
    expect(superscriptPower('²')).toBeNull();
    expect(superscriptPower('m⁻')).toBeNull();
    expect(superscriptPower('m2')).toBeNull();
    expect(superscriptPower('m')).toBeNull();
  });
});

describe('a superscript power reads as its caret spelling', () => {
  it.each([
    ['m⁴', 'm^4'],
    ['m⁰', 'm^0'],
    ['m¹⁰', 'm^10'],
    ['K⁻⁴', 'K^-4'],
    ['m⁴K', 'm^4*K'],
    ['W/m⁴K', 'W/(m^4*K)'],
    ['mK⁻⁴', 'mK^-4'],
    ['W/m⁴K', 'W/m^4K'],
    ['W/m⁰K', 'W/(m^0*K)'],
    ['W/m¹⁰K', 'W/(m^10*K)'],
  ] as const)('%s = %s', (superscript, caret) => {
    expect(parseUnit(superscript)).toEqual(parseUnit(caret));
  });

  it('a superscript with no unit before it is still unknown', () => {
    expect(() => parseUnit('⁴')).toThrow(UnknownUnitError);
  });
});
