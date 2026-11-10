/**
 * The token splitter reads MathTS `Unit.readingsWithSource` and keeps UPT's labels.
 *
 * The labels and error texts below are the values on master at eb8f4bcd, before the
 * splitter moved to MathTS. The swap must not change one byte of them.
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
    ['°m', ['°·m'], '1/(°·m)'],
    ['Å2m', ['Å^2·m'], '1/(Å^2·m)'],
    ['Åm', ['Å·m'], '1/(Å·m)'],
    ['°Rm', ['°R·m', '°·Rm'], "AmbiguousUnitError: '1/°Rm' is ambiguous: 1/(°R·m) or 1/(°·Rm)"],
    ['µmK', ['µm·K'], '1/(µm·K)'],
    ['μmK', ['μm·K'], '1/(μm·K)'],
    ['m⁺²K', ['m^2·K'], '1/(m^2·K)'],
    ['kWh', ['kW·h'], '1/(kW·h)'],
    ['umK', ['um·K', 'u·mK', 'u·m·K'], "AmbiguousUnitError: '1/umK' is ambiguous: 1/(um·K) or 1/(u·mK) or 1/(u·m·K)"],
    ['mmK', ['mm·K', 'm·mK'], "AmbiguousUnitError: '1/mmK' is ambiguous: 1/(mm·K) or 1/(m·mK)"],
    ['mm2K', ['mm^2·K'], '1/(mm^2·K)'],
    ['mm²K', ['mm^2·K'], '1/(mm^2·K)'],
    ['mm2', [], '1/mm^2'],
    ['mAs', ['mA·s', 'm·A·s'], "AmbiguousUnitError: '1/mAs' is ambiguous: 1/(mA·s) or 1/(m·A·s)"],
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

  it('the AmbiguousUnitError text of W/umK is byte for byte the master text', () => {
    let caught: unknown;
    try {
      parseUnit('W/umK');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AmbiguousUnitError);
    expect((caught as Error).message).toBe("'W/umK' is ambiguous: W/(um·K) or W/(u·mK) or W/(u·m·K)");
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

  it('for every unit X, X·X is a reading of XX exactly when XX is not X with its own prefix', () => {
    const disagree: string[] = [];
    let doubled = 0;
    for (const symbol of UNIT_DATA.units.keys()) {
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
