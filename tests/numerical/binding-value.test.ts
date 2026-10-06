/**
 * One reader for every binding: a bare number, a unit literal, or an
 * expression of constants and units. The built-in parser evaluates it.
 * A control that cannot fail: garbage is still refused, and `0.6*c` is not
 * the unit `*c`.
 */
import { describe, expect, it } from 'vitest';
import { C_SI, E_SI, G_SI, H_SI, M_SUN_SI } from '../../src/core/constants.js';
import { CHARGE } from '../../src/dimensional/types.js';
import { convertValue, unitConventionNotes } from '../../src/dimensional/units.js';
import {
  bindingInUnit,
  readBinding,
  readNamedBinding,
  readParameter,
} from '../../src/numerical/binding-value.js';
import { temperatureQuantityRole } from '../../src/dimensional/formula-names.js';
import { MASS, TIME } from '../../src/dimensional/types.js';

describe('readBinding', () => {
  it('keeps a bare number and a scientific literal in the caller unit', () => {
    expect(readBinding('1')).toMatchObject({ value: 1, dimensioned: false });
    expect(readBinding('1e-10').value).toBe(1e-10);
    expect(readBinding('1e-10').dimensioned).toBe(false);
  });

  it('converts a whole-string unit the way convertValue does, including the Msun note', () => {
    const sun = readBinding('1Msun');
    expect(sun.value).toBe(M_SUN_SI);
    expect(sun.dimensioned).toBe(true);
    expect(sun.notes).toEqual(unitConventionNotes('Msun'));
    expect(readBinding('1km').value).toBe(convertValue('1km', 'm').value);
    expect(readBinding('25degC').value).toBe(convertValue('25degC', 'K').value);
    expect(readBinding('25degC', { reading: 'difference' }).value).toBe(
      convertValue('25degC', 'K', 'difference').value,
    );
    expect(readBinding('90deg').value).toBeCloseTo(Math.PI / 2, 12);
    expect(readBinding('1h').value).toBe(3600);
    expect(readBinding('1G').value).toBe(1e-4);
    expect(readBinding('1G').notes.join(' ')).toMatch(/gauss/);
  });

  it('evaluates constant expressions and unit literals inside them', () => {
    expect(readBinding('pi/2').value).toBeCloseTo(Math.PI / 2, 12);
    expect(readBinding('pi/2').dimensioned).toBe(false);
    expect(readBinding('0.6*c').value).toBeCloseTo(0.6 * C_SI, 6);
    expect(readBinding('0.6*c').dimensioned).toBe(true);
    const rs = (2 * G_SI * M_SUN_SI) / (C_SI * C_SI);
    expect(readBinding('2*G*M_sun/c^2').value).toBeCloseTo(rs, 6);
    expect(readBinding('2*1km').value).toBe(2000);
    expect(readBinding('2*h').value).toBe(2 * H_SI);
    expect(readBinding('2*1h').value).toBe(7200);
    // A whole token `1/s` is the unit. `1/h` is per hour, the unit `h`, not 1/Planck.
    expect(readBinding('1/s').value).toBe(1);
    expect(readBinding('1/h').value).toBeCloseTo(1 / 3600, 12);
  });

  it('uses c = 1 under --natural, and a bare e is the elementary charge', () => {
    const v = readBinding('0.6*c', { mode: 'natural' });
    expect(v.value).toBeCloseTo(0.6, 12);
    expect(v.dimensioned).toBe(false);
    expect(
      readNamedBinding('intrinsic-information', '0.6*c', {
        mode: 'natural',
      }),
    ).toMatchObject({ value: 0.6, dimensioned: false });
    expect(readBinding('e').value).toBeCloseTo(E_SI, 15);
    expect(readBinding('e').dimension).toEqual(CHARGE);
    expect(readBinding('e').dimensioned).toBe(true);
    expect(() => readBinding('euler')).toThrow(/exp\(x\)/);
    expect(readBinding('exp(1)').value).toBeCloseTo(Math.E, 12);
    expect(() => readBinding('sigma')).toThrow(/is not a number with an optional unit/);
    expect(readBinding('sigma_sb').value).toBeGreaterThan(5e-8);
    expect(readBinding('sigma_sb').value).toBeLessThan(6e-8);
  });

  it('refuses a non-finite literal and a dimension that does not match the parameter', () => {
    expect(() => readBinding('1e500')).toThrow(/not a finite number/);
    expect(() => readBinding('abc')).toThrow(/is not a number with an optional unit/);
    expect(readBinding('80degF').value).toBeCloseTo((80 - 32) * (5 / 9) + 273.15, 9);
    expect(() => readParameter('1s', MASS)).toThrow(/time/);
    expect(readParameter('1s', TIME).value).toBe(1);
    expect(readParameter('pi/2', TIME).value).toBeCloseTo(Math.PI / 2, 12);
  });

  it('converts an expression into a declared unit and leaves a bare number there', () => {
    expect(bindingInUnit('0.6*c', 'm/s').value).toBeCloseTo(0.6 * C_SI, 6);
    expect(bindingInUnit('pi/2', '1').value).toBeCloseTo(Math.PI / 2, 12);
    expect(bindingInUnit('90deg', 'deg').value).toBeCloseTo(90, 12);
    expect(bindingInUnit('1', 'kg').value).toBe(1);
    expect(bindingInUnit('1Msun', 'kg').value).toBe(convertValue('1Msun', 'kg').value);
    expect(() => bindingInUnit('1Msun', 'm')).toThrow(/mass/);
  });
});

describe('affine temperature role', () => {
  const point = (unit: string, value: number): number => {
    if (unit === 'degC' || unit === '°C') return value + 273.15;
    return (value - 32) * (5 / 9) + 273.15;
  };
  const interval = (unit: string, value: number): number => {
    if (unit === 'degC' || unit === '°C') return value;
    return value * (5 / 9);
  };

  it('an interval name drops the offset and a point name keeps it, for every affine unit', () => {
    for (const unit of ['degC', '°C', 'degF', '°F']) {
      expect(readNamedBinding('temperature', `10${unit}`).value).toBeCloseTo(point(unit, 10), 8);
      expect(readNamedBinding('T', `10${unit}`).value).toBeCloseTo(point(unit, 10), 8);
      expect(readNamedBinding('temperature-change', `10${unit}`).value).toBeCloseTo(interval(unit, 10), 8);
      expect(readNamedBinding('dT', `10${unit}`).value).toBeCloseTo(interval(unit, 10), 8);
      expect(readNamedBinding('delta-T', `10${unit}`).value).toBeCloseTo(interval(unit, 10), 8);
    }
    expect(temperatureQuantityRole('hot-reservoir-temperature')).toBe('absolute');
    expect(temperatureQuantityRole('T2')).toBe('absolute');
    expect(temperatureQuantityRole('temperature_change')).toBe('difference');
    const hot = readNamedBinding('T2', '100degC').value;
    const cold = readNamedBinding('T1', '20degC').value;
    expect(hot - cold).toBeCloseTo(80, 8);
    expect(readNamedBinding('T_K', '10degC', { reading: 'difference' }).value).toBe(10);
    expect(readNamedBinding('temperature-change', '10degC', { declaredUnit: 'K' }).value).toBe(10);
    expect(readNamedBinding('T', '25degC', { declaredUnit: 'K' }).value).toBeCloseTo(298.15, 8);
  });
});
