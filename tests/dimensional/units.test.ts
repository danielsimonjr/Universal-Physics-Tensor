/**
 * Unit parsing (audit §14 I6): values with units convert into a declared unit
 * only when the dimensions agree, °C is read as absolute or as a difference,
 * and a radius is never taken for a diameter.
 */
import { describe, expect, it } from 'vitest';
import { AmbiguousUnitError, convertValue, parseUnit, readUnit, UnitError, UnknownUnitError } from '../../src/dimensional/units.js';
import { C_SI, G_SI, GM_SUN_SI, M_SUN_SI } from '../../src/core/constants.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import type { EvaluatorParameter } from '../../src/bridges/evaluators.js';

describe('parseUnit', () => {
  it('reads a glued exponent and a superscript as the caret form', () => {
    expect(parseUnit('K2')).toEqual(parseUnit('K^2'));
    expect(parseUnit('K²')).toEqual(parseUnit('K^2'));
    expect(parseUnit('V/K2').dim).toEqual(parseUnit('V/K^2').dim);
    expect(parseUnit('m2').dim).toEqual(parseUnit('m^2').dim);
    expect(convertValue('1e-6V/K2', 'V/K^2').value).toBeCloseTo(1e-6, 20);
  });

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

  it('reads the four 2022 SI prefixes quecto, ronto, ronna and quetta at their exact powers', () => {
    expect(parseUnit('Qm')).toMatchObject({ scale: 1e30, dim: { L: 1 } });
    expect(parseUnit('qg')).toMatchObject({ scale: 1e-33, dim: { M: 1 } });
    expect(parseUnit('Rg')).toMatchObject({ scale: 1e24, dim: { M: 1 } });
    expect(parseUnit('rs')).toMatchObject({ scale: 1e-27, dim: { T: 1 } });
    expect(convertValue('2 QW', 'W').value).toBe(2e30);
    // The exact symbols that begin with r or R stay exact: rad, rpm, rayl, Rsun.
    expect(parseUnit('rpm').scale).toBe(1 / 60);
    expect(parseUnit('Rsun').dim).toMatchObject({ L: 1 });
  });

  it('a glued product after degR, sr, hr or Rsun has no products row, so the token is an unknown unit', () => {
    // `degR·m`, `deg·Rm`, `sr·m` and the others are not rows of data/units.json `products` (issue 676).
    for (const [glued, spaced] of [['W/degRm', 'W/(degR*m)'], ['W/srm', 'W/(sr*m)'], ['W/hrm', 'W/(hr*m)'], ['W/Rsunm', 'W/(Rsun*m)']] as const) {
      expect(() => parseUnit(glued), glued).toThrow(UnknownUnitError);
      expect(() => parseUnit(spaced), spaced).not.toThrow();
    }
  });

  it('a bare degree sign is the angle degree, and the affine spellings read as before', () => {
    expect(parseUnit('°')).toEqual(parseUnit('deg'));
    expect(() => parseUnit('W/°Rm')).toThrow(UnknownUnitError);
    expect(parseUnit('°R').scale).toBe(parseUnit('degR').scale);
    expect(parseUnit('°C').affine).toBe('celsius');
    expect(() => parseUnit('° C/s')).toThrow(UnitError);
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
    expect(parseUnit('pc').scale).toBe(30856775814913670);
    expect(parseUnit('Mpc').scale).toBeCloseTo(30856775814913670 * 1e6, -6);
    expect(parseUnit('ly').scale).toBe(C_SI * 365.25 * 86400);
    expect(parseUnit('AU').scale).toBe(149597870700);
    expect(parseUnit('au').scale).toBe(parseUnit('AU').scale);
    expect(parseUnit('Msun').scale).toBe(M_SUN_SI);
    expect(parseUnit('Msun_iau').scale).toBe(GM_SUN_SI / G_SI);
    // The exact product, rounded once: 31557.6, not the float chain's 31557.600000000002.
    expect(parseUnit('myr').scale).toBe(31557.6);
    expect(parseUnit('Myr').scale).toBe(1e6 * 365.25 * 86400);
  });

  it('reads equivalent fractional noise-density units and compound temperature intervals', () => {
    const expected = { L: 2, M: 1, T: -2.5, I: -1 };
    for (const unit of ['V/sqrt(Hz)', 'V*Hz^-0.5', 'V/Hz^0.5', 'V/Hz^(1/2)']) {
      expect(parseUnit(unit)).toMatchObject({ scale: 1, dim: expected });
    }
    expect(convertValue('1BTU/(h*ft*degF)', 'W/(m*K)').value).toBeCloseTo(1.730735, 5);
    expect(parseUnit('degF/s')).toMatchObject({ scale: 5 / 9, dim: { Theta: 1, T: -1 } });
    expect(parseUnit('degF/s').affine).toBeUndefined();
  });

  it('refuses what it cannot read rather than guessing', () => {
    // The candela is a unit now (issue 475); an unknown letter run still refuses.
    expect(parseUnit('V/sqrt(Hz)^2')).toEqual(parseUnit('V/Hz'));
    expect(parseUnit('s^(1/10000000)').dim.T).toBe(1e-7);
    expect(() => parseUnit('sqrt(Hz) @root0@')).toThrow(UnitError);
    expect(() => parseUnit('sqrt(\t)')).toThrow(UnitError);
    expect(() => parseUnit('cdx')).toThrow(UnitError);
    expect(() => parseUnit('furlong')).toThrow(/unknown unit 'furlong'/);
    // A chain of slashes reads left to right (issue 477): m/s/s is m/s².
    expect(parseUnit('m/s/s')).toEqual(parseUnit('m/s^2'));
    expect(parseUnit('degF').affine).toBe('fahrenheit');
    expect(parseUnit('degF').scale).toBeCloseTo(5 / 9, 12);
    expect(parseUnit('degC/s')).toEqual(parseUnit('K/s'));
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
    expect(convertValue('32degF', 'K').value).toBeCloseTo(273.15, 9);
    expect(convertValue('212degF', 'K').value).toBeCloseTo(373.15, 9);
    expect(convertValue('18degF', 'K', 'difference').value).toBeCloseTo(10, 9);
    expect(convertValue('9degR', 'K').value).toBeCloseTo(5, 9);
    expect(convertValue('0degR', 'K').value).toBeCloseTo(0, 12);
  });

  it('reads the length units in, inch and mil at their stated values, and they do not take a prefix', () => {
    expect(parseUnit('in').scale).toBe(0.0254);
    expect(parseUnit('in').dim).toMatchObject({ L: 1 });
    expect(parseUnit('inch').scale).toBe(0.0254);
    expect(parseUnit('inch').dim).toMatchObject({ L: 1 });
    expect(parseUnit('mil').scale).toBe(2.54e-5);
    expect(parseUnit('mil').dim).toMatchObject({ L: 1 });
    // Non-prefixable: a prefix letter before them is refused, not read.
    expect(() => parseUnit('kin')).toThrow(UnknownUnitError);
    expect(() => parseUnit('kmil')).toThrow(UnknownUnitError);
    // Existing readings keep theirs: 'min' stays the minute, and 'mm' stays
    // the millimetre, so neither new spelling shadows a prefixed parse.
    expect(convertValue('1min', 's').value).toBe(60);
    expect(parseUnit('mm').scale).toBe(0.001);
    // Compounds square the length, as the be-78 psi bindings rely on.
    expect(convertValue('1in^2', 'm^2').value).toBeCloseTo(0.0254 ** 2, 15);
    expect(convertValue('1mil^2', 'm^2').value).toBeCloseTo(2.54e-5 ** 2, 15);
  });

  it('reads the defined engineering units, including a prefix', () => {
    const pound = 0.45359237;
    const gravity = 9.80665;
    const inch = 0.0254;
    expect(parseUnit('L').scale).toBeCloseTo(1e-3, 12);
    expect(parseUnit('l').scale).toBe(parseUnit('L').scale);
    expect(parseUnit('mL').scale).toBeCloseTo(1e-6, 12);
    expect(parseUnit('ml').scale).toBeCloseTo(1e-6, 12);
    expect(parseUnit('cal').scale).toBeCloseTo(4.184, 12);
    expect(parseUnit('kcal').scale).toBeCloseTo(4184, 9);
    expect(parseUnit('BTU').scale).toBeCloseTo((4.1868 * 453.59237) / 1.8, 9);
    expect(parseUnit('psi').scale).toBeCloseTo((pound * gravity) / inch ** 2, 6);
    expect(parseUnit('torr').scale).toBeCloseTo(101325 / 760, 9);
    expect(parseUnit('mmHg').scale).toBeCloseTo(133.322387415, 9);
    expect(parseUnit('mmHg').scale).not.toBeCloseTo(101325 / 760, 6);
    expect(parseUnit('P').scale).toBeCloseTo(0.1, 12);
    expect(parseUnit('cP').scale).toBeCloseTo(0.001, 12);
    expect(convertValue('1cP', 'Pa*s').value).toBeCloseTo(0.001, 12);
    expect(convertValue('1mol/mL', 'mol/m^3').value).toBeCloseTo(1e6, 6);
    expect(parseUnit('mol/mL').scale).toBeCloseTo(1e6, 6);
    expect(parseUnit('rpm').scale).toBeCloseTo(1 / 60, 12);
    expect(convertValue('60rpm', 'Hz').value).toBeCloseTo(1, 12);
    expect(parseUnit('hp').scale).toBeCloseTo(550 * 0.3048 * pound * gravity, 6);
    expect(parseUnit('PV').scale).toBe(1e15);
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

describe('a numerator 1 is the dimensionless unit (audit N6)', () => {
  // `1` alone and `/s` alone were read; `1/s` was "unknown unit '1'".
  it('1/s is a reciprocal second, the same reading as /s', () => {
    expect(parseUnit('1/s')).toEqual(parseUnit('/s'));
    expect(parseUnit('1/s').dim).toMatchObject({ T: -1 });
    expect(parseUnit('1/s').scale).toBe(1);
  });

  it('1/m^3 is a number density', () => {
    expect(parseUnit('1/m^3').dim).toMatchObject({ L: -3 });
    expect(convertValue('2 1/cm^3', '1/m^3').value).toBeCloseTo(2e6, 6);
  });

  it('1Hz converts into 1/s, and the hertz keeps its cycle count', () => {
    const c = convertValue('1Hz', '1/s');
    expect(c.value).toBe(1);
    expect(c.cycles).toBe(1);
  });

  it('the label of a reciprocal reads 1/s, not /s', () => {
    expect(readUnit('1/s').label).toBe('1/s');
    expect(readUnit('/s').label).toBe('1/s');
  });

  it('a bare 1 and an empty string stay dimensionless', () => {
    expect(parseUnit('1')).toEqual(parseUnit(''));
  });

  it('a 1 that is not the whole numerator is not a unit symbol', () => {
    expect(() => parseUnit('1*m')).toThrow(UnknownUnitError);
    expect(() => parseUnit('m/1')).toThrow(UnknownUnitError);
  });
});

describe('a homogeneous run does not compete inside a split either (audit N14)', () => {
  // The doc says `m·m` never competes, but the rule ran only when the whole
  // token was one factor; `mmin` listed `m·m·in` beside `m·min` and `mm·in`.
  it('mmin is an unknown unit: neither m·min nor mm·in is a products row (issue 676)', () => {
    expect(() => convertValue('1mmin', 's')).toThrow(UnknownUnitError);
    expect(() => convertValue('1mmin', 'm*s')).toThrow(UnknownUnitError);
  });

  it('a prefixed power keeps its one reading, and a glued product still splits', () => {
    expect(parseUnit('mm2').dim).toMatchObject({ L: 2 });
    expect(parseUnit('mm2').scale).toBeCloseTo(1e-6, 18);
    expect(parseUnit('m2K').dim).toMatchObject({ L: 2, Theta: 1 });
    expect(parseUnit('kg/mm').scale).toBe(1000);
  });

  it('m2min is an unknown unit (m·min is not a products row), and a power written as m2m is not a reading (write m3)', () => {
    expect(() => parseUnit('m2min')).toThrow(UnknownUnitError);
    expect(() => parseUnit('m2m')).toThrow(UnknownUnitError);
    expect(parseUnit('m3').dim).toMatchObject({ L: 3 });
  });

  it('a run of a unit that is not a prefix letter has no products row, so it is an unknown unit', () => {
    expect(() => parseUnit('NN')).toThrow(UnknownUnitError);
    expect(() => parseUnit('HzHz')).toThrow(UnknownUnitError);
    expect(parseUnit('N^2').dim).toMatchObject({ M: 2 });
  });
});
