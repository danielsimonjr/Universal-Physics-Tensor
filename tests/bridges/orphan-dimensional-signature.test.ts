/**
 * A dimensional signature is encoded when the catalog expression parses,
 * and an orphan when it does not. The two sets are the registry, not a
 * hand list of bridge numbers.
 *
 * The hand list that ended at BE-146 is the record from before every
 * catalog expression was that right-hand side.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';

function partition(rhsIds: ReadonlySet<number>): { encoded: number[]; orphans: number[] } {
  const encoded: number[] = [];
  const orphans: number[] = [];
  for (const entry of BRIDGE_EQUATIONS) {
    if (entry.dimensional_signature === null) continue;
    if (rhsIds.has(entry.id)) encoded.push(entry.id);
    else orphans.push(entry.id);
  }
  return { encoded, orphans };
}

describe('dimensional signatures follow the parsed expression', () => {
  const rhsIds = new Set(BRIDGE_RHS_BY_ID.keys());
  const { encoded, orphans } = partition(rhsIds);

  it('a signature with no expression is an orphan, and the rest are encoded', () => {
    expect(orphans).toEqual([28, 32, 35, 44]);
    expect(encoded).toContain(29);
    expect(encoded).toContain(147);
    expect(encoded).toContain(170);
    expect(encoded.length + orphans.length).toBe(
      BRIDGE_EQUATIONS.filter((entry) => entry.dimensional_signature !== null).length,
    );
  });

  it('CONTROL: withholding an encoded expression makes that signature an orphan', () => {
    const withheld = new Set(rhsIds);
    expect(withheld.delete(11)).toBe(true);
    const dropped = partition(withheld);
    expect(dropped.orphans).toEqual([11, 28, 32, 35, 44]);
    expect(dropped.encoded).not.toContain(11);
  });
});
