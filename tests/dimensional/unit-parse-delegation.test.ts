/**
 * Part A step A5: agreed spellings parse through `Unit.parse`; gap rows stay local.
 *
 * Disclosure (AGENTS.md Law 2): `tryMathtsA5Reading === null` alone does not prove
 * set exclusion for the 12 guard-excluded names (`Bq`, `Gy`, `Sv`, `kat`, `Pas`,
 * `mAs`, `mpc`, `ton`, `tons`, `Mach`, `mach`, `ln2`). Only `mpc` is decided
 * before the membership check: `isSubKiloParsec` runs first and returns null
 * there. The other 11 are decided AFTER `isA5DelegatedText`: they pass the
 * membership check and then return null because `Unit.parse` throws or
 * `exactScale === null`, so a control that adds one of them to
 * `A5_DELEGATED_TEXTS` still passes the null half. The
 * `isA5DelegatedText === false` assertion is the membership pin for both
 * groups. The 13 set-excluded names
 * (`bit`, `°`, `°R`, `°C`, `℃`, `°F`, `Hz`, `rpm`, `dB`, `dBm`, `dBW`, `Np`,
 * `furlong`) also fail `tryMathtsA5Reading === null` when wrongly added to the set.
 */
import { describe, expect, it } from 'vitest';
import { dim } from '../../src/dimensional/ast-builders.js';
import {
  A5_DELEGATED_TEXTS,
  isA5DelegatedText,
  tryMathtsA5Reading,
} from '../../src/dimensional/mathts-unit-wrapper.js';
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
const outOfSetThrow = ['ton', 'dB', 'furlong'] as const;

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
    expect(parseUnit('degC/s')).toEqual(parseUnit('K/s'));
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

// Pre-S10 A5 texts (the original 25). Independent of `A5_DELEGATED_TEXTS` order:
// a `.slice(25)` would silently pass if a spelling were inserted into the
// original block. Set equality of `s10Candidates` against everything in the
// delegated list that is not one of these originals is the sync claim.
const a5PreS10Texts = [
  'km', 'degC', 'g/cm^3', 'mN/m', 'kohm', 'GeV', 'km/s/Mpc', 'd', 'day',
  'Angstrom', 'angstrom', 'Å', 'psi', 'torr', 'kpsi', 'Mpsi', 'mtorr', 'utorr',
  'kpc', 'Mpc', 'Gpc', 'm2K', 'Vs', 'cm^2/Vs', 'W/m2K',
] as const;

// Set-excluded (13): MathTS would admit these if they were on `A5_DELEGATED_TEXTS`,
// so `tryMathtsA5Reading === null` is a real membership pin. Mutating only
// `A5_DELEGATED_TEXTS` by adding one of these must fail this case.
const s10SetExcluded = [
  'bit', '°', '°R', '°C', '℃', '°F', 'Hz', 'rpm', 'dB', 'dBm', 'dBW', 'Np', 'furlong',
] as const;

// Guard-excluded (12): `tryMathtsA5Reading` returns null from its own guards
// even when the symbol is on the set. Disclosure (AGENTS.md Law 2): only
// `mpc` is null BEFORE set membership (`isSubKiloParsec` runs first); the
// other 11 reach the membership check and are nulled by the `Unit.parse`
// throw (MathTS 0.28.0: none of those 11 return `exactScale === null` — parse
// throws, so `Unit.exactScale` is never reached), so
// `tryMathtsA5Reading === null` alone does not prove they are off the set —
// a control that only adds the symbol to `A5_DELEGATED_TEXTS` still passes
// the null half. `isA5DelegatedText === false` is the membership pin.
const s10GuardExcluded = [
  'Bq', 'Gy', 'Sv', 'kat', 'Pas', 'mAs', 'mpc', 'ton', 'tons', 'Mach', 'mach', 'ln2',
] as const;

describe('S10: bare shared non-cycle spellings read directly through MathTS', () => {
  it('s10Candidates is exactly the non-original A5 delegated texts', () => {
    // Sync guard — `s10Candidates` is the independent predicate oracle (`it.each`
    // must not be driven from src). The claim is set equality against the
    // non-original entries, not array order or a magic `.slice(25)` index.
    const original = new Set<string>(a5PreS10Texts);
    const s10FromSrc = A5_DELEGATED_TEXTS.filter((text) => !original.has(text));
    expect(new Set(s10FromSrc)).toEqual(new Set(s10Candidates));
    expect(s10FromSrc).toHaveLength(s10Candidates.length);
  });

  it('set-excluded and guard-excluded partition the 25 excluded names', () => {
    expect(s10SetExcluded).toHaveLength(13);
    expect(s10GuardExcluded).toHaveLength(12);
    expect(new Set([...s10SetExcluded, ...s10GuardExcluded])).toEqual(
      new Set([
        'bit', 'Bq', 'Gy', 'Sv', 'kat', '°', '°R', '°C', '℃', '°F',
        'Hz', 'rpm', 'mpc', 'dB', 'dBm', 'dBW', 'Np', 'Pas', 'mAs',
        'furlong', 'ton', 'tons', 'Mach', 'mach', 'ln2',
      ]),
    );
  });

  it.each(s10Candidates)('%s has a direct MathTS A5 reading', (symbol) => {
    expect(tryMathtsA5Reading(symbol)).not.toBeNull();
  });

  it.each(s10SetExcluded)('%s is off the A5 set (set-excluded)', (symbol) => {
    expect(isA5DelegatedText(symbol), symbol).toBe(false);
    expect(tryMathtsA5Reading(symbol), symbol).toBeNull();
  });

  it.each(s10GuardExcluded)('%s is off the A5 set (guard-excluded)', (symbol) => {
    expect(isA5DelegatedText(symbol), symbol).toBe(false);
    expect(tryMathtsA5Reading(symbol), symbol).toBeNull();
  });

  it.each([
    ['rad', dim()],
    ['deg', dim()],
    ['sr', dim()],
    ['lm', dim(0, 0, 0, 0, 0, 0, 1)],
    ['lx', dim(-2, 0, 0, 0, 0, 0, 1)],
    ['arcsec', dim()],
    ['arcsecond', dim()],
    ['arcmin', dim()],
    ['mas', dim()],
    ['uas', dim()],
  ] as const)('%s A5 reading keeps the UPT row dimension (catch-path hint)', (symbol, expected) => {
    const reading = tryMathtsA5Reading(symbol);
    expect(reading, symbol).not.toBeNull();
    expect(reading!.dim).toEqual(expected);
  });

  it.each(s10Candidates)('%s reads with the scale, dimension and cycles of its direct A5 reading', (symbol) => {
    // The public parse routes through `tryMathtsA5Reading` for these symbols
    // (that is the S10 claim), so the composite reading must equal the direct
    // reading in scale and dimension, and stay cycle-free.
    const direct = tryMathtsA5Reading(symbol);
    expect(direct, symbol).not.toBeNull();
    const reading = readUnit(symbol);
    expect(reading.scale, `${symbol} scale`).toBe(direct!.scale);
    expect(reading.dim, `${symbol} dim`).toEqual(direct!.dim);
    expect(reading.cycles, `${symbol} cycles`).toBe(0);
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
