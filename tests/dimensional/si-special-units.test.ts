/**
 * Every SI coherent derived unit with a special name (SI Brochure, Table 4: 22 units) reads
 * through the unit table with scale 1 and the Brochure dimension. The rows below are literal
 * records, written independently of the table, so a missing or wrong row fails.
 */
import { describe, expect, it } from 'vitest';
import { primaryUnitLabel } from '../../src/cli/expr-print.js';
import { UnknownUnitError, convertValue, parseUnit, readUnit, unitRows } from '../../src/dimensional/units.js';
import { dim } from '../../src/dimensional/ast-builders.js';

const TABLE_4 = [
  ['rad', dim()],
  ['sr', dim()],
  ['Hz', dim(0, 0, -1)],
  ['N', dim(1, 1, -2)],
  ['Pa', dim(-1, 1, -2)],
  ['J', dim(2, 1, -2)],
  ['W', dim(2, 1, -3)],
  ['C', dim(0, 0, 1, 1)],
  ['V', dim(2, 1, -3, -1)],
  ['ohm', dim(2, 1, -3, -2)],
  ['S', dim(-2, -1, 3, 2)],
  ['F', dim(-2, -1, 4, 2)],
  ['Wb', dim(2, 1, -2, -1)],
  ['T', dim(0, 1, -2, -1)],
  ['H', dim(2, 1, -2, -2)],
  ['degC', dim(0, 0, 0, 0, 1)],
  ['lm', dim(0, 0, 0, 0, 0, 0, 1)],
  ['lx', dim(-2, 0, 0, 0, 0, 0, 1)],
  ['Bq', dim(0, 0, -1)],
  ['Gy', dim(2, 0, -2)],
  ['Sv', dim(2, 0, -2)],
  ['kat', dim(0, 0, -1, 0, 0, 1)],
] as const;

describe('the SI special-name units (SI Brochure, Table 4)', () => {
  it('the census lists 22 units', () => {
    expect(TABLE_4).toHaveLength(22);
  });
  for (const [symbol, dimension] of TABLE_4) {
    it(`${symbol} reads with scale 1 and its Brochure dimension`, () => {
      const read = parseUnit(symbol);
      expect(read.scale).toBe(1);
      expect(read.dim).toEqual(dimension);
      if (symbol === 'degC') expect(read.affine).toBe('celsius');
    });
  }
});

describe('prefixes on Bq, Gy, Sv and kat', () => {
  const cases: [string, number][] = [
    ['mGy', 1e-3],
    ['kBq', 1e3],
    ['MBq', 1e6],
    ['GBq', 1e9],
    ['TBq', 1e12],
    ['mSv', 1e-3],
    ['µSv', 1e-6],
    ['uSv', 1e-6],
    ['nkat', 1e-9],
  ];
  for (const [text, scale] of cases) {
    it(`${text} has scale ${scale}`, () => {
      expect(parseUnit(text).scale).toBeCloseTo(scale, 15);
      expect(parseUnit(text).scale / scale).toBeCloseTo(1, 12);
    });
  }
  it('a prefixed unit in a denominator reads once', () => {
    const r = parseUnit('J/MBq');
    expect(r.dim).toEqual(dim(2, 1, -1));
    expect(r.scale / 1e-6).toBeCloseTo(1, 12);
  });
  it('J/(kg*Gy) is dimensionless', () => {
    expect(parseUnit('J/(kg*Gy)').dim).toEqual(dim());
  });
  it('converts across prefixes', () => {
    expect(convertValue('1 mSv', 'Sv').value).toBeCloseTo(1e-3, 15);
    expect(convertValue('2 kat', 'mol/s').value).toBe(2);
  });
});

describe('Bq counts no cycles', () => {
  it('Bq has cycles 0 and Hz has cycles 1', () => {
    expect(readUnit('Bq').cycles).toBe(0);
    expect(readUnit('Hz').cycles).toBe(1);
  });
});

describe('controls that must not change', () => {
  it('Gyr stays the gigayear, also in a denominator', () => {
    expect(parseUnit('Gyr').scale).toBeCloseTo(3.15576e16, 0);
    expect(parseUnit('Gyr').dim).toEqual(dim(0, 0, 1));
    expect(parseUnit('J/Gyr').dim).toEqual(dim(2, 1, -3));
  });
  it('mG stays the milligauss', () => {
    expect(parseUnit('mG').scale / 1e-7).toBeCloseTo(1, 12);
  });
  it('J/kg and mol/s are unchanged', () => {
    expect(parseUnit('J/kg').dim).toEqual(dim(2, 0, -2));
    expect(parseUnit('mol/s').dim).toEqual(dim(0, 0, -1, 0, 0, 1));
  });
  it('an unknown token is still refused', () => {
    expect(() => parseUnit('zqx')).toThrow(UnknownUnitError);
  });
});

describe('a unit that names one kind of its dimension is never a printed label', () => {
  // L^2 T^-2 is also a squared speed, T^-1 also a rate, N T^-1 also a molar flow: the dimension alone does not say "Gy", "Bq" or "kat".
  const api = { quantityRecord: () => undefined, unitRows };
  it('the label of T^-1, L^2 T^-2 and N T^-1 is the SI base form', () => {
    expect(primaryUnitLabel(api, 'zqx', dim(0, 0, -1))).toBe('s^-1');
    expect(primaryUnitLabel(api, 'zqx', dim(2, 0, -2))).toBe('m^2/s^2');
    expect(primaryUnitLabel(api, 'zqx', dim(0, 0, -1, 0, 0, 1))).toBe('mol/s');
  });
  it('control: a named coherent unit is still a label', () => {
    expect(primaryUnitLabel(api, 'zqx', dim(2, 1, -2))).toBe('J');
  });
});
