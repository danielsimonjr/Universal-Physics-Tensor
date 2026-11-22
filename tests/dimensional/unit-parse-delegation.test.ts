/**
 * Part A step A5: agreed spellings parse through `Unit.parse`; gap rows stay local.
 */
import { describe, expect, it } from 'vitest';
import { tryMathtsA5Reading } from '../../src/dimensional/mathts-unit-wrapper.js';
import {
  AmbiguousUnitError,
  convertValue,
  parseUnit,
  UnitRefusedError,
  UnknownUnitError,
  unitReadingsSource,
  readUnit,
} from '../../src/dimensional/units.js';

const inSet = ['km', 'degC', 'g/cm^3', 'mN/m', 'kohm', 'GeV', 'km/s/Mpc', 'd', 'day', 'Angstrom', 'K²', 'm2K', 'Vs', 'cm^2/Vs', 'W/m2K'] as const;
const outOfSetLocal = ['bit', 'mpc', 'mAs'] as const;
const outOfSetThrow = ['ton', 'dB', 'degC/s', 'furlong'] as const;

describe('Unit.parse delegation set (A5)', () => {
  it.each(inSet)('%s uses the MathTS parser path', (text) => {
    readUnit(text);
    expect(unitReadingsSource(text)).toBe('mathts');
  });

  it.each(outOfSetLocal)('%s stays on the local grammar', (text) => {
    readUnit(text);
    expect(unitReadingsSource(text)).toBe('local');
  });

  it.each(outOfSetThrow)('%s stays on the local grammar', (text) => {
    expect(() => readUnit(text)).toThrow();
  });

  it('a glued product keeps its dimension through MathTS (heat-transfer coefficient)', () => {
    expect(parseUnit('W/m2K').dim).toMatchObject({ M: 1, T: -3, Theta: -1, L: 0 });
    expect(parseUnit('m2K').dim).toMatchObject({ L: 2, Theta: 1 });
  });

  it.each([
    ['m2K', 1, { L: 2, Theta: 1 }],
    ['Vs', 1, { M: 1, L: 2, T: -2, I: -1 }],
    ['cm^2/Vs', 1e-4, { M: -1, T: 2, I: 1 }],
    ['W/m2K', 1, { M: 1, T: -3, Theta: -1 }],
  ] as const)('%s read through MathTS has the pinned SI scale and dimension', (text, scale, dim) => {
    const u = parseUnit(text);
    expect(Math.abs(u.scale - scale) / scale).toBeLessThan(1e-15);
    expect(u.dim).toMatchObject(dim);
  });

  it('out-of-set rows keep today UPT error classes', () => {
    expect(() => parseUnit('ton')).toThrow(UnitRefusedError);
    expect(() => parseUnit('dB')).toThrow(UnitRefusedError);
    expect(() => parseUnit('furlong')).toThrow(UnknownUnitError);
    expect(parseUnit('mAs').scale).toBeCloseTo(1e-3, 15);
    expect(() => parseUnit('kg/ms')).toThrow(AmbiguousUnitError);
    expect(parseUnit('mol/mL').scale).toBeCloseTo(1e6, 6);
    expect(() => parseUnit('degC/s')).toThrow(UnitRefusedError);
  });

  it('difference readings stay on the local affine branch', () => {
    expect(convertValue('25 degC', 'K', 'difference').value).toBe(25);
    expect(unitReadingsSource('degC')).toBe('mathts');
  });

  it('the day symbol and its compounds read through MathTS 0.21.0', () => {
    expect(parseUnit('d').scale).toBe(86400);
    expect(parseUnit('dm').scale).toBe(0.1);
    expect(unitReadingsSource('d')).toBe('mathts');
  });

  it('the MathTS refusal registry refusal keeps the UPT class', () => {
    expect(() => parseUnit('dB')).toThrow(UnitRefusedError);
    expect(() => parseUnit('Np')).toThrow(UnitRefusedError);
    expect(() => parseUnit('Mach')).toThrow(UnitRefusedError);
  });
});

// S10 predicate (scratch-derived, 2026-11-22): every bare symbol in
// `UNIT_DATA.units` plus `UNIT_DATA.affine` where `getUnitRow(symbol) !== undefined`,
// `symbol !== 'bit'`, `UNIT_DATA.units.get(symbol)?.cycles !== true`, `Unit.parse(symbol)`
// does not throw, and `exactScaleToNumber(Unit.exactScale(symbol)!)` equals
// `parseUnit(symbol).scale` within 1e-15 relative. 98 new candidates on top of the
// 8 existing A5 spellings = 106 total direct bare symbols.
const s10Candidates = [
  'm', 'g', 's', 'K', 'A', 'mol', 'N', 'Pa', 'J', 'W', 'C', 'V', 'ohm', 'Ω', 'Ohm', 'S', 'F',
  'eV', 'nat', 'rad', 'deg', 'min', 'h', 'yr', 'au', 'AU', 'Msun', 'Msun_iau', 'T', 'G',
  'gauss', 'Gauss', 'bar', 'atm', 'pc', 'ly', 'L', 'l', 'cal', 'BTU', 'mmHg', 'P', 'degR',
  'hp', 'H', 'Wb', 'sr', 'cd', 'lm', 'lx', 'arcsec', 'arcsecond', 'arcmin', 'mas', 'uas',
  '%', 'percent', 'ppm', 'ppb', 'M', 'u', 'amu', 'Da', 'erg', 'cc', 'dyn', 'Jy', 'Lsun',
  'Rsun', 'Rearth', 'Rjup', 'Mearth', 'Mjup', 'hr', 'poise', 'St', 'rayl', 'in', 'inch',
  'ft', 'mile', 'mi', 'gallon', 'mil', 'lb', 'lbm', 'lbf', 'kgf', 'mph', 'knot', 'psia',
  'ksi', 'mmH2O', 'inHg', 'tonne', 'therm', 'c', 'degF',
] as const;

// Excluded from the direct path: `bit` (UPT keeps ln 2), MathTS-absent rows, the
// five Unicode degree spellings, cycle units, the sub-kilo parsec, refused tokens,
// ambiguous-in-MathTS spellings, glued products and non-spellings.
const s10Excluded = [
  'bit', 'Bq', 'Gy', 'Sv', 'kat', '°', '°R', '°C', '℃', '°F',
  'Hz', 'rpm', 'mpc', 'dB', 'dBm', 'dBW', 'Np', 'Pas', 'mAs',
  'furlong', 'ton', 'tons', 'Mach', 'mach', 'ln2',
] as const;

describe('S10: bare shared non-cycle spellings read directly through MathTS', () => {
  it.each(s10Candidates)('%s has a direct MathTS A5 reading', (symbol) => {
    expect(tryMathtsA5Reading(symbol)).not.toBeNull();
  });

  it.each(s10Excluded)('%s has no direct MathTS A5 reading', (symbol) => {
    expect(tryMathtsA5Reading(symbol)).toBeNull();
  });

  it.each(s10Candidates)('%s still reads with one unchanged reading', (symbol) => {
    const reading = readUnit(symbol);
    expect(reading.cycles).toBe(0);
  });

  it('the acceptance invariants survive the expansion', () => {
    expect(parseUnit('bit').scale).toBe(Math.LN2);
    expect(() => parseUnit('dB')).toThrow(UnitRefusedError);
    expect(parseUnit('Bq').scale).toBe(1);
    expect(parseUnit('Pas').scale).toBe(1);
    expect(convertValue('1 Hz', 'rad/s')).toMatchObject({ value: 1, cycles: 1 });
    expect(convertValue('25 degC', 'K', 'difference').value).toBe(25);
  });
});
