/**
 * The token splitter reads MathTS `Unit.readingsWithSource` and keeps UPT's labels.
 *
 * The labels and error texts below are the values on master at eb8f4bcd, before the
 * splitter moved to MathTS. The swap must not change one byte of them. The readings of
 * `1/<token>` changed with issue 676: a split is a reading only when it matches a row of
 * data/units.json `products`, so an unlisted split is an unknown unit.
 */
import { Unit } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import { splitPrefix, UNIT_DATA } from '../../src/dimensional/unit-data.js';
import {
  AmbiguousUnitError,
  formatReading,
  parseUnit,
  readUnit,
  segmentations,
  UnitRefusedError,
} from '../../src/dimensional/units.js';

const labels = (token: string): string[] => segmentations(token).filter((way) => way.length > 1).map(formatReading).sort();

const readLabel = (text: string): string => {
  try {
    return readUnit(text).label;
  } catch (error) {
    return `${(error as Error).name}: ${(error as Error).message}`;
  }
};

describe('M6 splitter: labels keep the token spelling', () => {
  const pins: Array<[string, string[], string]> = [
    ['Ωm', ['Ω·m'], '1/(Ω·m)'],
    ['°m', ['°·m'], "UnknownUnitError: unknown unit '°m'"],
    ['Å2m', ['Å^2·m'], "UnknownUnitError: unknown unit 'Å2m'"],
    ['Åm', ['Å·m'], "UnknownUnitError: unknown unit 'Åm'"],
    ['°Rm', ['°R·m', '°·Rm'], "UnknownUnitError: unknown unit '°Rm'"],
    ['µmK', ['µm·K'], '1/(µm·K)'],
    ['μmK', ['μm·K'], '1/(μm·K)'],
    ['m⁺²K', ['m^2·K'], '1/(m^2·K)'],
    ['kWh', ['kW·h'], '1/(kW·h)'],
    ['umK', ['um·K', 'u·mK', 'u·m·K'], '1/(um·K)'],
    ['mmK', ['mm·K', 'm·mK'], '1/(mm·K)'],
    ['mm2K', ['mm^2·K'], '1/(mm^2·K)'],
    ['mm²K', ['mm^2·K'], '1/(mm^2·K)'],
    ['mm2', [], '1/mm^2'],
    ['mAs', ['mA·s', 'm·A·s'], '1/(mA·s)'],
  ];

  for (const [token, ways, read] of pins) {
    it(`${token}: the product readings and the label of 1/${token}`, () => {
      expect(labels(token)).toEqual(ways);
      expect(readLabel(`1/${token}`)).toBe(read);
    });
  }

  it('a degree-Celsius spelling inside a compound is still refused', () => {
    expect(readLabel('1/°Cm')).toBe('UnitRefusedError: an affine temperature cannot be part of a compound unit; give K');
    expect(() => parseUnit('W/℃')).toThrow(UnitRefusedError);
  });

  it('W/umK is one reading: um·K matches the m·K row with a prefix on its first factor', () => {
    expect(readLabel('W/umK')).toBe('W/(um·K)');
  });

  it('mm is not read as m·m', () => {
    expect(labels('mm')).toEqual([]);
    expect(readLabel('1/mm')).toBe('1/mm');
  });
});

describe('M6 splitter: MathTS drops the plain X·X run, not a run with a power', () => {
  /** The unprefixed unit a prefix spelling attaches to, or null when `symbol` is exact. */
  const attachedUnit = (symbol: string): string | null =>
    UNIT_DATA.units.has(symbol) ? null : (splitPrefix(symbol)?.base ?? null);

  const mathtsReadsUnit = (symbol: string): boolean => {
    try {
      return Unit.exactScale(symbol) !== null;
    } catch {
      return false;
    }
  };

  it('for every unit X, X·X is a reading of XX exactly when XX is not X with its own prefix', () => {
    const disagree: string[] = [];
    let doubled = 0;
    for (const symbol of UNIT_DATA.units.keys()) {
      // The comparison needs a MathTS reading of the symbol itself (Bq, Gy, Sv and kat have none).
      if (!mathtsReadsUnit(symbol)) continue;
      const token = symbol + symbol;
      const run = Unit.readingsWithSource(token).some(
        (reading) => reading.length === 2 && reading[0]!.source === symbol && reading[1]!.source === symbol,
      );
      if (attachedUnit(token) === symbol) doubled++;
      if (run !== (attachedUnit(token) !== symbol)) disagree.push(token);
    }
    expect(doubled).toBeGreaterThan(0);
    expect(disagree).toEqual([]);
  });

  it('MathTS keeps m·m^2 in mm2, so UPT keeps its own prefix-run rule', () => {
    const run = Unit.readingsWithSource('mm2').some((r) => r.length === 2 && r[0]!.source === 'm' && r[1]!.source === 'm2');
    expect(run).toBe(true);
    expect(labels('mm2')).toEqual([]);
  });
});
