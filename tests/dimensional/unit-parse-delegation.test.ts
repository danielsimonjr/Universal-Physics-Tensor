/**
 * Part A step A5: agreed spellings parse through `Unit.parse`; gap rows stay local.
 */
import { describe, expect, it } from 'vitest';
import {
  AmbiguousUnitError,
  convertValue,
  parseUnit,
  UnitRefusedError,
  UnknownUnitError,
  unitReadingsSource,
  readUnit,
} from '../../src/dimensional/units.js';

const inSet = ['km', 'degC', 'g/cm^3', 'mN/m', 'kohm', 'GeV', 'km/s/Mpc', 'd', 'day', 'Angstrom', 'K²'] as const;
const outOfSetLocal = ['bit', 'm2K', 'mpc'] as const;
const outOfSetThrow = ['ton', 'dB', 'mAs', 'mol/mL', 'degC/s', 'furlong'] as const;

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

  it('out-of-set rows keep today UPT error classes', () => {
    expect(() => parseUnit('ton')).toThrow(UnitRefusedError);
    expect(() => parseUnit('dB')).toThrow(UnitRefusedError);
    expect(() => parseUnit('furlong')).toThrow(UnknownUnitError);
    expect(() => parseUnit('mAs')).toThrow(AmbiguousUnitError);
    expect(() => parseUnit('mol/mL')).toThrow(AmbiguousUnitError);
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
