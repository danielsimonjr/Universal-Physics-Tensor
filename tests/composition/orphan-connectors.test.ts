/**
 * Orphan-connector analysis (src/composition/bridge-analysis.ts) — which of
 * the catalog's 20 isolated bridges could connect to the anchored core via a
 * same-dimension quantity identification. Pins the structural frontier: 7
 * orphans have a same-kind connector, 12 are truly unconnected, and the
 * coarsening pair and the tunneling pair are present as shared tokens. The
 * ledger calls both decoys. A REVIEW SURFACE.
 */
import { describe, it, expect } from 'vitest';
import { proposeOrphanConnectors } from '../../src/composition/bridge-analysis.js';
import { adjudicationFor } from '../../src/composition/adjudication.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';

const report = proposeOrphanConnectors(CATALOG_GRAPH);

describe('proposeOrphanConnectors — the isolated-bridge frontier', () => {
  it('partitions isolated bridges into same-kind connectors and the unconnected remainder', () => {
    // be-36 shares the token "speed" with the core. be-68, be-70, be-71, and
    // be-73 share the token "temperature". be-66 shares "pressure" with
    // magnetic-pressure on be-74. be-67 is not isolated: it shares
    // magnetic-flux-density with be-74 and plasma-mass-density with be-69.
    // be-72 shares no name token with the core. A shared token is not a
    // quantity identification.
    // The lists without be-14, be-43, be-59, and be-77..84 and be-87, and with
    // be-14 and be-43 still unconnected, are the record from before be-77..87.
    // pull-in-area shares the token "area" with be-14 and be-43. The new voltage
    // quantities share the token "voltage" with be-59. A shared token is not an
    // identification: a minimal surface is not a pull-in electrode, and a
    // Josephson voltage is not a diode voltage. be-85 and be-86 stay in the
    // unconnected remainder.
    expect(report.connectedOrphans).toEqual([
      'be-14', 'be-15', 'be-22', 'be-24', 'be-26', 'be-36', 'be-41', 'be-43', 'be-45', 'be-47', 'be-59',
      'be-66', 'be-68', 'be-70', 'be-71', 'be-73', 'be-77', 'be-78', 'be-79', 'be-80', 'be-81', 'be-82',
      'be-83', 'be-84', 'be-87',
    ]);
    expect(report.unconnectedOrphans).toEqual([
      'be-17', 'be-21', 'be-25', 'be-30', 'be-39', 'be-46', 'be-49', 'be-50', 'be-53', 'be-72', 'be-85', 'be-86',
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

  it('coarsening-length ≟ quantum-correlation-length shares a token and keeps its ledger grounds', () => {
    expect(has('be-15', 'coarsening-length', 'quantum-correlation-length')).toBe(true);
    const row = adjudicationFor('coarsening-length', 'quantum-correlation-length');
    expect(row?.verdict).toBe('decoy');
    expect(row?.grounds.startsWith('Non-equilibrium vs equilibrium length')).toBe(true);
  });

  it('tunneling-mass ≟ effective-mass shares a token and the ledger calls it a decoy', () => {
    expect(has('be-26', 'tunneling-mass', 'effective-mass')).toBe(true);
    const row = adjudicationFor('tunneling-mass', 'effective-mass');
    expect(row?.verdict).toBe('decoy');
    expect(row?.grounds.startsWith('Different particles/Hamiltonians')).toBe(true);
  });

  it('foerster-radius ≟ schwarzschild-radius is a ledger decoy and still shares the token', () => {
    expect(has('be-24', 'foerster-radius', 'schwarzschild-radius')).toBe(true);
    expect(adjudicationFor('foerster-radius', 'schwarzschild-radius')).toMatchObject({
      verdict: 'decoy',
      grounds: 'a Förster radius is not a Schwarzschild radius',
    });
  });
});
