/**
 * A glued unit spelling is a product only when its factor list is in `data/units.json` `products`.
 * `gal` is not gram times `al`: the pair `g·al` is not listed, so the token is an unknown unit.
 * A token that has a listed reading keeps every reading, so an ambiguity is still refused.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { capture } from '../helpers/cli.js';
import { A5_DELEGATED_TEXTS } from '../../src/dimensional/mathts-unit-wrapper.js';
import { AmbiguousUnitError, convertValue, formatReading, parseUnit, segmentations, UnknownUnitError } from '../../src/dimensional/units.js';
import { UNIT_DATA } from '../../src/dimensional/unit-data.js';

describe('an unlisted glued product is refused', () => {
  for (const token of ['gal', 'lbs', 'gm', 'kmh', 'kgs', 'gc', 'Pac']) {
    it(`parseUnit refuses ${token}`, () => {
      expect(() => parseUnit(token)).toThrow(UnknownUnitError);
      expect(() => parseUnit(token)).toThrow(`unknown unit '${token}'`);
    });
  }
  it('convertValue refuses 1 gal', () => {
    expect(() => convertValue('1 gal', 'L')).toThrow(UnknownUnitError);
  });
  it('the denominator path refuses W/gal', () => {
    expect(() => parseUnit('W/gal')).toThrow(UnknownUnitError);
  });
  it('control: ga stays unknown', () => {
    expect(() => parseUnit('ga')).toThrow("unknown unit 'ga'");
  });
  it('upt eval refuses x=1gal with a non-zero exit', async () => {
    const cap = capture();
    const code = await runCli(['eval', 'x', 'x=1gal'], cap.io);
    expect(code).not.toBe(0);
    expect(cap.err.join('')).toContain("'x=1gal' is not a finite number or a known unit");
  });
});

describe('a listed glued product keeps its reading', () => {
  const scales: Array<[string, number]> = [
    ['kWh', 3.6e6], ['kNm', 1000], ['kVA', 1000], ['kAh', 3.6e6], ['Nm', 1], ['NN', 1], ['Vs', 1],
    ['mmHg', 133.322387415], ['m2K', 1], ['m^2K', 1], ['Wh', 3600], ['Ah', 3600], ['VA', 1], ['Ns', 1], ['Js', 1], ['Wh', 3600]
  ];
  for (const [token, scale] of scales) {
    it(`${token} keeps its scale`, () => {
      expect(parseUnit(token).scale).toBeCloseTo(scale, 6);
    });
  }
  it('mAh and W/mK keep their values', () => {
    expect(convertValue('1 mAh', 'C').value).toBeCloseTo(3.6, 9);
    expect(convertValue('1 W/mK', 'W/(m*K)').value).toBeCloseTo(1, 9);
  });
  it('an operator product is unaffected', () => {
    expect(parseUnit('N*m').scale).toBe(1);
    expect(parseUnit('N.m').scale).toBe(1);
  });
  for (const token of ['gcm', 'cmK', 'mAs', 'mmK', 'umK', 'mmin', 'mPas', 'HzHz', 'Hzpc', 'W/°Rm']) {
    it(`${token} stays ambiguous`, () => {
      expect(() => parseUnit(token)).toThrow(AmbiguousUnitError);
    });
  }
});

describe('the product list', () => {
  // One spelling for each row of `products`: the token must read as that key, and the key must be listed.
  const rows: Array<[string, string]> = [
    ['kW·h', 'kWh'], ['kA·h', 'kAh'], ['mA·h', 'mAh'], ['kN·m', 'kNm'], ['N·m', 'Nm'], ['kV·A', 'kVA'],
    ['V·s', 'Vs'], ['N·N', 'NN'], ['m·K', 'm2K'], ['mm·K', 'mmK'], ['cm·K', 'cmK'], ['um·K', 'umK'],
    ['µm·K', 'µmK'], ['μm·K', 'μmK'], ['g·cm', 'gcm'], ['m·s', 'ms'], ['m·min', 'mmin'], ['mA·s', 'mAs'],
    ['mPa·s', 'mPas'], ['degR·m', 'degRm'], ['°R·m', '°Rm'], ['m·°R', 'm°R'], ['sr·m', 'srm'], ['hr·m', 'hrm'],
    ['Rsun·m', 'Rsunm'], ['Hz·Hz', 'HzHz'], ['Hz·pc', 'Hzpc'], ['Å·m', 'Åm'], ['Ω·m', 'Ωm'], ['°·m', '°m'],
    ['s·K', 'sK'], ['kg·K', 'kgK'], ['mol·K', 'molK'], ['W·h', 'Wh'], ['A·h', 'Ah'], ['V·A', 'VA'],
    ['N·s', 'Ns'], ['J·s', 'Js'],
  ];
  for (const [key, token] of rows) {
    it(`${key} is listed and ${token} reads as it`, () => {
      expect(UNIT_DATA.products.has(key)).toBe(true);
      expect(segmentations(token).map((way) => way.map((f) => f.base).join('·'))).toContain(key);
    });
  }
  it('has one row per key', () => {
    expect(UNIT_DATA.products.size).toBe(rows.length);
  });
});

describe('the MathTS A5 texts', () => {
  it('every glued A5 text has a listed product key in the local grammar', () => {
    for (const text of A5_DELEGATED_TEXTS) {
      for (const token of text.split(/[/*^\s]+/).filter((t) => t.length > 0)) {
        const ways = segmentations(token);
        if (ways.length === 0) continue;
        const listed = ways.some((way) => UNIT_DATA.products.has(way.map((f) => f.base).join('·')));
        // A token with a one-factor reading (km, Mpc) needs no row; only a glued product does.
        let single = true;
        try {
          parseUnit(token);
        } catch {
          single = false;
        }
        if (!single) expect(listed, `${text}: ${token} reads as ${ways.map(formatReading).join(' | ')}`).toBe(true);
      }
    }
  });
});
