/**
 * Unit parsing (audit §14 I6): values with units convert into a declared unit
 * only when the dimensions agree, °C is read as absolute or as a difference,
 * and a radius is never taken for a diameter.
 */
import { describe, expect, it } from 'vitest';
import { convertValue, parseUnit, UnitError } from '../../src/dimensional/units.js';
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

  it('an exact symbol wins over a prefix reading: min, Pa and mm', () => {
    expect(parseUnit('min')).toMatchObject({ scale: 60, dim: { T: 1 } });
    expect(parseUnit('Pa').scale).toBe(1);
    expect(parseUnit('mm').scale).toBeCloseTo(1e-3, 18);
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
    expect(convertValue('1um', 'm').value).toBeCloseTo(1e-6, 20);
    expect(convertValue('88 d', 'yr').value).toBeCloseTo(88 / 365.25, 15);
    expect(convertValue('3', 'm')).toEqual({ value: 3, given: '' });
    expect(() => convertValue('1kg', 'm')).toThrow(/'kg' is \[mass\], but this input is \[length\]/);
    expect(() => convertValue('2 m', '')).toThrow(/dimensionless/);
  });

  it('°C: an absolute temperature adds 273.15 K; a difference does not', () => {
    expect(convertValue('25degC', 'K', 'absolute').value).toBeCloseTo(298.15, 12);
    expect(convertValue('25degC', 'K', 'difference').value).toBe(25);
    expect(convertValue('25 K', 'K', 'difference').value).toBe(25);
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

  it('an undeclared key, or one input given twice, is refused', () => {
    expect(() => resolveEvaluatorInputs(SPHERE, ['size_m=1um'])).toThrow(/'size_m' is not an input here; the inputs are: radius_m, diameter_m/);
    expect(() => resolveEvaluatorInputs(SPHERE, ['radius_m=1um', 'diameter_m=2um'])).toThrow(/given twice \(once through an alternate\)/);
  });
});
