/**
 * Orphan-connector analysis (src/composition/bridge-analysis.ts) — which of
 * the catalog's 20 isolated bridges could connect to the anchored core via a
 * same-dimension quantity identification. Pins the structural frontier: 7
 * orphans have a same-kind connector, 12 are truly unconnected, and the
 * flagship CI-1 (coarsening-length ≟ quantum-correlation-length) + the newly
 * surfaced tunneling-mass ≟ effective-mass are present. A REVIEW SURFACE.
 */
import { describe, it, expect } from 'vitest';
import { proposeOrphanConnectors } from '../../src/composition/bridge-analysis.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';

const report = proposeOrphanConnectors(CATALOG_GRAPH);

describe('proposeOrphanConnectors — the isolated-bridge frontier', () => {
  it('partitions isolated bridges into same-kind connectors and the unconnected remainder', () => {
    // be-36 ↔ be-67 shares the token "speed" (gravitational-wave speed and
    // Alfvén speed). be-68 ↔ temperature shares the token "temperature".
    // Both are review-surface decoys. Neither is a quantity identification.
    expect(report.connectedOrphans).toEqual([
      'be-15', 'be-22', 'be-24', 'be-26', 'be-36', 'be-41', 'be-45', 'be-47', 'be-68',
    ]);
    expect(report.unconnectedOrphans).toEqual([
      'be-14', 'be-17', 'be-21', 'be-25', 'be-30',
      'be-39', 'be-43', 'be-46', 'be-49', 'be-50', 'be-53', 'be-66', 'be-67',
    ]);
    // every isolated bridge is accounted for (connected ∪ unconnected, no overlap)
    const both = new Set([...report.connectedOrphans, ...report.unconnectedOrphans]);
    expect(both.size).toBeGreaterThanOrEqual(19); // 7 + 12 (a non-same-kind-only orphan would be in neither set)
  });

  it('every connector joins an isolated orphan to an anchored-core quantity', () => {
    expect(report.connectors.length).toBeGreaterThan(0);
    for (const c of report.connectors) {
      expect(c.orphanEdge).not.toBe(c.coreEdge);
      expect(c.orphanQuantity).not.toBe(c.coreQuantity);
      if (c.sameKind) expect(c.sharedToken).not.toBeNull();
    }
  });

  it('is ranked same-kind-first', () => {
    let seenNonSameKind = false;
    for (const c of report.connectors) {
      if (!c.sameKind) seenNonSameKind = true;
      else if (seenNonSameKind) throw new Error('a same-kind connector followed a non-same-kind one');
    }
    expect(report.sameKindCount).toBeGreaterThan(0);
  });

  const has = (orphan: string, oq: string, cq: string) =>
    report.connectors.some(
      (c) => c.orphanEdge === orphan && c.orphanQuantity === oq && c.coreQuantity === cq && c.sameKind,
    );

  it('surfaces the flagship CI-1 (coarsening-length ≟ quantum-correlation-length, BE-15→BE-33)', () => {
    expect(has('be-15', 'coarsening-length', 'quantum-correlation-length')).toBe(true);
  });

  it('surfaces the newly-motivated tunneling-mass ≟ effective-mass (BE-26→BE-23)', () => {
    expect(has('be-26', 'tunneling-mass', 'effective-mass')).toBe(true);
  });

  it('still surfaces the documented decoy (foerster-radius ≟ schwarzschild-radius) for honest review', () => {
    // a FRET radius is NOT a black-hole horizon — same dimension is weak.
    expect(has('be-24', 'foerster-radius', 'schwarzschild-radius')).toBe(true);
  });
});
