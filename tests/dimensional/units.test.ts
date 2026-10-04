/**
 * Unit parsing (audit §14 I6): values with units convert into a declared unit
 * only when the dimensions agree, °C is read as absolute or as a difference,
 * and a radius is never taken for a diameter.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { convertValue, parseUnit, UnitError } from '../../src/dimensional/units.js';
import { C_SI, G_SI, GM_SUN_SI, M_SUN_SI } from '../../src/core/constants.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import type { EvaluatorParameter } from '../../src/bridges/evaluators.js';

describe('parseUnit', () => {
  it('reads prefixes, compounds and non-SI units by their stated values', () => {
    expect(parseUnit('um').scale).toBeCloseTo(1e-6, 20);
    expect(parseUnit('µm').scale).toBeCloseTo(1e-6, 20);
    expect(parseUnit('kg/m^3')).toMatchObject({ scale: 1, dim: { M: 1, L: -3 } });
    expect(parseUnit('m/s^2').dim).toMatchObject({ L: 1, T: -2 });
    expect(parseUnit('W/(m*K)').dim).toEqual(parseUnit('W/m*K').dim);
    expect(parseUnit('kohm').scale).toBe(1000);
    expect(parseUnit('kΩ').scale).toBe(1000);
    expect(parseUnit('keV').scale).toBeCloseTo(1.602176634e-16, 28);
    expect(parseUnit('yr').scale).toBe(31557600);
  });

  it('the farad is C/V: 10pF converts to 1e-11 F, and a pF is not a Fahrenheit', () => {
    expect(parseUnit('F').dim).toEqual(parseUnit('C/V').dim);
    expect(convertValue('10pF', 'F').value).toBeCloseTo(1e-11, 24);
    expect(convertValue('1 fF', 'C/V').value).toBeCloseTo(1e-15, 28);
  });

  it('an exact symbol wins over a prefix reading: min, Pa and mm', () => {
    expect(parseUnit('min')).toMatchObject({ scale: 60, dim: { T: 1 } });
    expect(parseUnit('Pa').scale).toBe(1);
    expect(parseUnit('mm').scale).toBeCloseTo(1e-3, 18);
  });

  it('converts bits and nats by ln 2, and leaves a bit equal to itself', () => {
    expect(convertValue('1bit', 'nat').value).toBeCloseTo(Math.LN2, 12);
    expect(convertValue('1nat', 'bit').value).toBeCloseTo(1 / Math.LN2, 12);
    expect(convertValue('1bit', 'bit').value).toBe(1);
    expect(convertValue('1nat', 'nat').value).toBe(1);
  });

  it('reads the lab units a script reaches for, and keeps prefix rules', () => {
    expect(parseUnit('T')).toMatchObject({ scale: 1, dim: { M: 1, T: -2, I: -1 } });
    expect(parseUnit('nT').scale).toBe(1e-9);
    expect(parseUnit('uT').scale).toBe(1e-6);
    expect(parseUnit('Ts').scale).toBe(1e12);
    expect(parseUnit('G').scale).toBe(1e-4);
    expect(parseUnit('gauss').scale).toBe(1e-4);
    expect(parseUnit('Gauss').scale).toBe(1e-4);
    expect(parseUnit('GPa').scale).toBe(1e9);
    expect(parseUnit('bar').scale).toBe(1e5);
    expect(parseUnit('mbar').scale).toBe(100);
    expect(parseUnit('atm').scale).toBe(101325);
    expect(parseUnit('angstrom').scale).toBe(1e-10);
    expect(parseUnit('Å').scale).toBe(1e-10);
    expect(parseUnit('pc').scale).toBe(3.0856775814913673e16);
    expect(parseUnit('Mpc').scale).toBeCloseTo(3.0856775814913673e22, -6);
    expect(parseUnit('ly').scale).toBe(C_SI * 365.25 * 86400);
    expect(parseUnit('AU').scale).toBe(149597870700);
    expect(parseUnit('au').scale).toBe(parseUnit('AU').scale);
    expect(parseUnit('Msun').scale).toBe(M_SUN_SI);
    expect(parseUnit('Msun_iau').scale).toBe(GM_SUN_SI / G_SI);
    expect(parseUnit('myr').scale).toBe(0.001 * 365.25 * 86400);
    expect(parseUnit('Myr').scale).toBe(1e6 * 365.25 * 86400);
  });

  it('refuses what it cannot read rather than guessing', () => {
    expect(() => parseUnit('cd')).toThrow(UnitError);
    expect(() => parseUnit('furlong')).toThrow(/unknown unit 'furlong'/);
    expect(() => parseUnit('m/s/s')).toThrow(/more than one '\/'/);
    expect(() => parseUnit('degF')).toThrow(/Fahrenheit is not accepted/);
    expect(() => parseUnit('degC/s')).toThrow(/affine/);
  });
});

describe('convertValue', () => {
  it('converts into the declared unit and refuses a dimension mismatch', () => {
    expect(convertValue('1 gauss', 'T').value).toBe(1e-4);
    expect(convertValue('1gauss', 'T').value).toBe(convertValue('1G', 'T').value);
    expect(convertValue('1um', 'm').value).toBeCloseTo(1e-6, 20);
    expect(convertValue('88 d', 'yr').value).toBeCloseTo(88 / 365.25, 15);
    expect(convertValue('3', 'm')).toEqual({ value: 3, given: '' });
    expect(() => convertValue('1kg', 'm')).toThrow(/'kg' is \[mass\], but this input is \[length\]/);
    expect(() => convertValue('2 m', '')).toThrow(/dimensionless/);
  });

  it('°C: an absolute temperature adds 273.15 K; a difference does not', () => {
    expect(convertValue('25degC', 'K', 'absolute').value).toBeCloseTo(298.15, 12);
    expect(convertValue('25degC', 'K').value).toBeCloseTo(298.15, 12);
    expect(convertValue('1 kohm', 'ohm').value).toBe(1000);
    expect(convertValue('25degC', 'K', 'difference').value).toBe(25);
    expect(convertValue('25 K', 'K', 'difference').value).toBe(25);
  });

  it('conversion calls MathTS unit and toSI', () => {
    const src = readFileSync(new URL('../../src/dimensional/units.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/\.toSI\(/);
    expect(src).toMatch(/\bunit\(/);
  });

  it('an angle is dimensionless: rad (prefixable) and deg read at their stated values', () => {
    expect(parseUnit('rad')).toMatchObject({ scale: 1, dim: { L: 0, M: 0, T: 0 } });
    expect(parseUnit('mrad').scale).toBeCloseTo(1e-3, 18);
    expect(parseUnit('deg').scale).toBeCloseTo(Math.PI / 180, 15);
    expect(convertValue('30 deg', 'rad').value).toBeCloseTo(Math.PI / 6, 15);
    expect(convertValue('0.05 rad', '').value).toBeCloseTo(0.05, 15);
    expect(() => convertValue('1 rad', 'm')).toThrow(/'rad' is \[1\], but this input is \[length\]/);
  });
});

const SPHERE: readonly EvaluatorParameter[] = [
  {
    key: 'radius_m',
    quantity: 'particle radius',
    symbol: 'r',
    unit: 'm',
    meaning: 'radius of the sphere',
    geometry: 'radius',
    alternates: [{ key: 'diameter_m', meaning: 'the diameter 2r', toKey: 0.5 }],
  },
];

describe('resolveEvaluatorInputs — geometry is declared, never guessed', () => {
  it('a 1 µm radius and a 2 µm diameter are the same input; a 0.5 µm radius is half of it', () => {
    const r = resolveEvaluatorInputs(SPHERE, ['radius_m=1um']).inputs['radius_m']!;
    const d = resolveEvaluatorInputs(SPHERE, ['diameter_m=2um']).inputs['radius_m']!;
    const half = resolveEvaluatorInputs(SPHERE, ['radius_m=0.5um']).inputs['radius_m']!;
    expect(d).toBeCloseTo(r, 20);
    expect(half / r).toBeCloseTo(0.5, 12);
  });

  it('control: the diameter is not taken for the radius (the factor is applied)', () => {
    const d = resolveEvaluatorInputs(SPHERE, ['diameter_m=2um']);
    expect(d.inputs['radius_m']).not.toBeCloseTo(2e-6, 12);
    expect(d.resolved[0]!.note).toMatch(/diameter_m=2um is the diameter 2r; radius_m = 0.5 × /);
  });

  it('a milliyear and a solar mass say which convention the conversion used', () => {
    const time: EvaluatorParameter = { key: 't_s', quantity: 'duration', symbol: 't', unit: 's', meaning: 'a duration' };
    const mass: EvaluatorParameter = { key: 'M_kg', quantity: 'mass', symbol: 'M', unit: 'kg', meaning: 'a mass' };
    expect(resolveEvaluatorInputs([time], ['t_s=1myr']).resolved[0]!.note).toMatch(/milliyear/);
    const sun = resolveEvaluatorInputs([mass], ['M_kg=1Msun']);
    expect(sun.inputs['M_kg']).toBe(M_SUN_SI);
    expect(sun.resolved[0]!.note).toMatch(/M_SUN_SI/);
    expect(sun.resolved[0]!.note).toMatch(/Msun_iau/);
  });

  it('an undeclared key, or one input given twice, is refused', () => {
    expect(() => resolveEvaluatorInputs(SPHERE, ['size_m=1um'])).toThrow(/'size_m' is not an input here; the inputs are: radius_m, diameter_m/);
    expect(() => resolveEvaluatorInputs(SPHERE, ['radius_m=1um', 'diameter_m=2um'])).toThrow(/given twice \(once through an alternate\)/);
  });
});
