/**
 * Plan task P2e: UPT and MathTS agree on which units count cycles, and no
 * A5 delegated text counts cycles, because `tryMathtsA5Reading` returns
 * `cycles: 0` for every A5 text.
 */
import { getUnitRow, Unit } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import { A5_DELEGATED_TEXTS } from '../../src/dimensional/mathts-unit-wrapper.js';
import { UNIT_DATA } from '../../src/dimensional/unit-data.js';

/** Net cycles of a MathTS parse: the sum of each component's cycle flag times its power. */
function mathtsNetCycles(text: string): number {
  const u = Unit.parse(text) as unknown as { units: { unit: { cycles?: true | number }; power: number }[] };
  return u.units.reduce((n, c) => n + (c.unit.cycles ? 1 : 0) * c.power, 0);
}

describe('cycle-counting units (P2e)', () => {
  it('every UPT unit row that MathTS also has carries the same cycle flag', () => {
    const shared = [...UNIT_DATA.units].filter(([symbol]) => getUnitRow(symbol) !== undefined);
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.filter(([, row]) => row.cycles === true).length).toBeGreaterThan(0);
    const disagree = shared
      .filter(([symbol, row]) => (getUnitRow(symbol)!.cycles === true) !== (row.cycles === true))
      .map(([symbol]) => symbol);
    expect(disagree).toEqual([]);
  });

  it('MathTS counts the cycles of a parsed cycle unit', () => {
    expect(mathtsNetCycles('Hz')).toBe(1);
    expect(mathtsNetCycles('rpm/s')).toBe(1);
    expect(mathtsNetCycles('s')).toBe(0);
  });

  it('no A5 delegated text counts cycles', () => {
    expect(A5_DELEGATED_TEXTS.filter((text) => mathtsNetCycles(text) !== 0)).toEqual([]);
  });
});
