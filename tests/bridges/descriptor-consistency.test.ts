/**
 * Cross-registry consistency guard for the unified bridge descriptor
 * (Round-2 architecture: collapse the per-bridge registries onto one descriptor).
 *
 * The catalog keeps three id-keyed registries — metadata (`BRIDGE_EQUATIONS`),
 * RHS ASTs (`BRIDGE_RHS_BY_ID`), and graph edges (`CATALOG_GRAPH`). They drifted
 * silently before (stale `DATA_CONFRONTED`, the 6.075e-12 value): an id present
 * in one but inconsistent with another shipped green. `BRIDGE_DESCRIPTORS` joins
 * them; this guard fails loudly on any cross-registry mismatch so the single
 * descriptor stays a faithful join.
 *
 * @module tests/bridges/descriptor-consistency
 */
import { describe, it, expect } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import {
  BRIDGE_DESCRIPTORS,
  getBridge,
} from '../../src/composition/descriptor.js';

const catalogIds = new Set(BRIDGE_EQUATIONS.map((e) => e.id));

describe('bridge descriptor — cross-registry consistency', () => {
  it('catalog ids are unique', () => {
    expect(catalogIds.size).toBe(BRIDGE_EQUATIONS.length);
  });

  it('every RHS-registry id is a catalogued bridge', () => {
    const orphans = [...BRIDGE_RHS_BY_ID.keys()].filter((id) => !catalogIds.has(id));
    expect(orphans).toEqual([]);
  });

  it('every non-null edge beId is a catalogued bridge', () => {
    const orphans = [
      ...new Set(
        CATALOG_GRAPH.map((e) => e.beId).filter((b): b is number => b !== null),
      ),
    ].filter((id) => !catalogIds.has(id));
    expect(orphans).toEqual([]);
  });

  it('descriptors cover exactly the catalog (no more, no fewer)', () => {
    expect([...BRIDGE_DESCRIPTORS.keys()].sort((a, b) => a - b)).toEqual(
      [...catalogIds].sort((a, b) => a - b),
    );
  });

  it('each descriptor faithfully joins its three registries', () => {
    for (const entry of BRIDGE_EQUATIONS) {
      const d = BRIDGE_DESCRIPTORS.get(entry.id);
      expect(d).toBeDefined();
      expect(d!.entry).toBe(entry);
      expect(d!.rhs).toBe(BRIDGE_RHS_BY_ID.get(entry.id));
      const expectedEdges = CATALOG_GRAPH.filter((e) => e.beId === entry.id);
      expect(d!.edges).toEqual(expectedEdges);
    }
  });

  it('getBridge resolves number / "42" / "BE-42" to the same descriptor', () => {
    const sample = BRIDGE_EQUATIONS[0].id;
    const byNum = getBridge(sample);
    expect(getBridge(String(sample))).toBe(byNum);
    expect(getBridge(`BE-${sample}`)).toBe(byNum);
  });

  it('getBridge throws on an uncatalogued id', () => {
    expect(() => getBridge(9999)).toThrow(/no catalogued bridge/);
  });

  it('control: an id in one registry and absent from another is the mismatch', () => {
    const absent = 9999;
    expect(catalogIds.has(absent)).toBe(false);
    const rhsMismatch = [...BRIDGE_RHS_BY_ID.keys(), absent].filter((id) => !catalogIds.has(id));
    expect(rhsMismatch).toEqual([absent]);
    const edgeMismatch = [absent].filter((id) => !catalogIds.has(id));
    expect(edgeMismatch).toEqual([absent]);
    const dropped = [...BRIDGE_DESCRIPTORS.keys()].filter((id) => id !== BRIDGE_EQUATIONS[0]!.id);
    expect(dropped.sort((a, b) => a - b)).not.toEqual([...catalogIds].sort((a, b) => a - b));
  });
});
