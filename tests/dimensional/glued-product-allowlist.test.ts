/**
 * A glued unit spelling is a product only when its own key is a row of `data/units.json` `products`.
 * A row with `prefixFirst` true also admits a prefix on its first factor. A prefix on a later
 * factor never matches. Thus `kgs` is not k·g·s or kg·s, and `kmh` is not km·h: both are unknown.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { capture } from '../helpers/cli.js';
import { A5_DELEGATED_TEXTS } from '../../src/dimensional/mathts-unit-wrapper.js';
import { splitPrefix, UNIT_DATA } from '../../src/dimensional/unit-data.js';
import { convertValue, formatReading, isListedProduct, parseUnit, segmentations, UnknownUnitError } from '../../src/dimensional/units.js';

describe('an unlisted glued product is refused', () => {
  for (const token of ['kgs', 'kmh', 'gm', 'gc', 'Pac', 'cms', 'kms', 'mms', 'zqx', 'zqxs', 'gzqal', 'kgzqx']) {
    it(`parseUnit refuses ${token}`, () => {
      expect(() => parseUnit(token)).toThrow(UnknownUnitError);
      expect(() => parseUnit(token)).toThrow(`unknown unit '${token}'`);
    });
  }
  it('upt eval refuses x=1kmh with a non-zero exit', async () => {
    const cap = capture();
    const code = await runCli(['eval', 'x', 'x=1kmh'], cap.io);
    expect(code).not.toBe(0);
  });
});

describe('a listed glued product reads as one product', () => {
  const scales: Array<[string, number]> = [
    ['kWh', 3.6e6], ['MWh', 3.6e9], ['GWh', 3.6e12], ['mWh', 3.6], ['mAh', 3.6], ['kNm', 1e3], ['kNs', 1e3],
    ['Pas', 1], ['mPas', 1e-3], ['mAs', 1e-3], ['kVA', 1e3], ['W/m2K', 1], ['W/µmK', 1e6], ['W/μmK', 1e6],
    ['W/umK', 1e6], ['J/kgK', 1], ['J/molK', 1], ['cm^2/Vs', 1e-4], ['mmK', 1e-3], ['cmK', 1e-2],
  ];
  for (const [token, scale] of scales) {
    it(`${token} has scale ${scale}`, () => {
      expect(parseUnit(token).scale).toBeCloseTo(scale, 9);
    });
  }
  it('1 mAh is 3.6 C, and 1 W/mK is 1 W/(m*K)', () => {
    expect(convertValue('1 mAh', 'C').value).toBeCloseTo(3.6, 12);
    expect(convertValue('1 W/mK', 'W/(m*K)').value).toBeCloseTo(1, 12);
  });
});

describe('the MathTS A5 texts', () => {
  // The A5 texts read through MathTS, not through tokenWays. Each glued token in them must
  // still read locally as a listed product, so the two grammars cannot disagree.
  it('every glued token of an A5 text has a listed reading in the local grammar', () => {
    const oneFactor = (token: string): boolean => {
      const base = token.replace(/\^?-?\d+$/, '');
      return UNIT_DATA.units.has(base) || splitPrefix(base) !== null || UNIT_DATA.affine.some((row) => row.symbols.includes(base));
    };
    const glued = A5_DELEGATED_TEXTS.flatMap((text) => text.split('/')).filter((token) => !oneFactor(token));
    expect(glued.sort()).toEqual(['Vs', 'Vs', 'm2K', 'm2K']);
    for (const token of glued) {
      const ways = segmentations(token);
      expect(ways.some(isListedProduct), `${token} reads as ${ways.map(formatReading).join(' | ')}`).toBe(true);
    }
  });
  it('the guard fails on a glued token with no row', () => {
    expect(segmentations('NN').some(isListedProduct)).toBe(false);
  });
});
