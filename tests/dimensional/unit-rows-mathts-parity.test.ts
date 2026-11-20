/**
 * A unit row that MathTS also defines has the scale MathTS gives it. The rule keeps
 * the hand-kept UPT table from drifting away from the engine it delegates to.
 */
import { describe, expect, it } from 'vitest';
import { Unit, exactScaleToNumber, getUnitRow } from '@danielsimonjr/mathts-core';
import { scaleToNumber } from '../../src/dimensional/exact-scale.js';
import { UNIT_DATA } from '../../src/dimensional/unit-data.js';

/** UPT reads `bit` as ln 2 nat by policy, and MathTS reads 1; the delegation excludes it the same way. */
const POLICY_DIFFERENCES = ['bit'];

function differs(symbol: string): boolean {
  const local = scaleToNumber(UNIT_DATA.units.get(symbol)!.scale);
  const exact = Unit.exactScale(symbol);
  return exact === null || exactScaleToNumber(exact) !== local;
}

describe('unit rows agree with MathTS', () => {
  const shared = [...UNIT_DATA.units.keys()].filter((s) => getUnitRow(s) !== undefined);

  it('shares many rows, so the check is not empty', () => {
    expect(shared.length).toBeGreaterThan(50);
    expect(shared).toContain('mile');
    expect(shared).toContain('gallon');
  });

  it('every shared row has the MathTS scale, except the policy differences', () => {
    expect(shared.filter((s) => !POLICY_DIFFERENCES.includes(s) && differs(s))).toEqual([]);
  });

  it('every policy difference does differ, so the list cannot go stale', () => {
    for (const s of POLICY_DIFFERENCES) expect(differs(s), s).toBe(true);
  });
});
