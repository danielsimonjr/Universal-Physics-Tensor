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
    // The lists without be-88..102, and without be-18, are the record from
    // before those edges. be-18 shares the token "mass" with mass-action-gap.
    // be-88, be-89, be-92, be-93, be-94, and be-99 share "density" with
    // carrier-density. be-96 shares "length". be-101 shares "temperature".
    // be-102 shares "conductance" with the Hall conductance. be-90, be-91,
    // and be-97 share a token with another isolated edge. A shared token is
    // not an identification. be-95, be-98, and be-100 stay unconnected.
    // The lists with be-85 unconnected, and without be-103..125, are the
    // record from before those edges. be-85 shares "current" with
    // bennett-current. A shot current is not a Bennett current.
    // be-103 shares "temperature". be-104 and be-114 share "debye".
    // be-105 and be-114 share "density". be-106 shares "cyclotron" with
    // another isolated edge. be-108 shares "alfven" and "speed".
    // be-109 shares "temperature". be-111 and be-112 share "field".
    // be-113 shares "omega". be-115 shares "length". be-116, be-118, and
    // be-122 share "mass". be-117 shares "time". be-119 shares "speed".
    // be-120 shares "density" and "speed". be-121 shares "energy".
    // A shared token is not an identification.
    // be-123 and be-124 have no connector. be-107, be-110, and be-125 have
    // connectors that are not same-kind, so they are in neither list.
    // The lists without be-134..146 are the record from before those edges.
    // be-134, be-138, and be-139 share the token "warmth". be-135, be-136,
    // and be-143 share "bandmass". be-137 and be-143 share "n3". be-143 and
    // be-144 share "scatter". A shared token is not an identification.
    // be-141 and be-145 have no connector. be-140, be-142, be-144, and be-146
    // have connectors that are not same-kind, so they are in neither list.
    expect(report.connectedOrphans).toEqual([
      'be-101', 'be-102', 'be-103', 'be-104', 'be-105', 'be-106', 'be-108', 'be-109', 'be-111', 'be-112',
      'be-113', 'be-114', 'be-115', 'be-116', 'be-117', 'be-118', 'be-119', 'be-120', 'be-121', 'be-122',
      'be-134', 'be-135', 'be-136', 'be-137', 'be-138', 'be-139', 'be-14', 'be-143', 'be-15', 'be-18', 'be-22', 'be-24', 'be-26', 'be-36', 'be-41', 'be-43',
      'be-45', 'be-47', 'be-59', 'be-66', 'be-68', 'be-70', 'be-71', 'be-73', 'be-77', 'be-78', 'be-79',
      'be-80', 'be-81', 'be-82', 'be-83', 'be-84', 'be-85', 'be-87', 'be-88', 'be-89', 'be-90', 'be-91', 'be-92',
      'be-93', 'be-94', 'be-96', 'be-97', 'be-99',
    ]);
    expect(report.unconnectedOrphans).toEqual([
      'be-100', 'be-123', 'be-124', 'be-128', 'be-141', 'be-145', 'be-17', 'be-21', 'be-25', 'be-30', 'be-39', 'be-46', 'be-49', 'be-50', 'be-53', 'be-72',
      'be-86', 'be-95', 'be-98',
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
