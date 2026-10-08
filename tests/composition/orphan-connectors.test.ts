/**
 * Orphan-connector analysis (src/composition/bridge-analysis.ts): which of
 * the catalog's isolated bridges could connect to the anchored core through a
 * same-dimension quantity identification. The report is a partition of the
 * isolated set, stated here as invariants rather than as a copy of today's
 * lists; the three named pairs are the ledger's decoys. A REVIEW SURFACE.
 */
import { describe, it, expect } from 'vitest';
import { linkageMap, proposeOrphanConnectors } from '../../src/composition/bridge-analysis.js';
import { adjudicationFor } from '../../src/composition/adjudication.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';

const report = proposeOrphanConnectors(CATALOG_GRAPH);
const isolated = new Set(linkageMap(CATALOG_GRAPH).isolated);

describe('proposeOrphanConnectors — the isolated-bridge frontier', () => {
  it('partitions the isolated bridges: connected (a same-kind connector) and unconnected (no connector), disjoint and sorted', () => {
    expect(isolated.size).toBeGreaterThan(0);
    for (const id of [...report.connectedOrphans, ...report.unconnectedOrphans]) expect(isolated.has(id), id).toBe(true);
    const overlap = report.connectedOrphans.filter((id) => report.unconnectedOrphans.includes(id));
    expect(overlap).toEqual([]);
    expect([...report.connectedOrphans]).toEqual([...report.connectedOrphans].sort());
    expect([...report.unconnectedOrphans]).toEqual([...report.unconnectedOrphans].sort());
    const sameKindOrphans = new Set(report.connectors.filter((c) => c.sameKind).map((c) => c.orphanEdge));
    const anyConnector = new Set(report.connectors.map((c) => c.orphanEdge));
    expect([...report.connectedOrphans].sort()).toEqual([...sameKindOrphans].sort());
    expect([...report.unconnectedOrphans].sort()).toEqual([...isolated].filter((id) => !anyConnector.has(id)).sort());
    // An isolated bridge with only non-same-kind connectors is in neither list, by definition.
    const neither = [...isolated].filter((id) => !sameKindOrphans.has(id) && anyConnector.has(id));
    expect(report.connectedOrphans.length + report.unconnectedOrphans.length + neither.length).toBe(isolated.size);
  });

  it('every connector joins an isolated orphan to an anchored-core quantity', () => {
    expect(report.connectors.length).toBeGreaterThan(0);
    for (const c of report.connectors) {
      expect(isolated.has(c.orphanEdge), c.orphanEdge).toBe(true);
      expect(isolated.has(c.coreEdge), c.coreEdge).toBe(false);
      expect(c.orphanEdge).not.toBe(c.coreEdge);
      expect(c.orphanQuantity).not.toBe(c.coreQuantity);
      if (c.sameKind) expect(c.sharedToken).not.toBeNull();
      else expect(c.sharedToken).toBeNull();
    }
  });

  it('is ranked same-kind-first, and sameKindCount is that count', () => {
    let seenNonSameKind = false;
    for (const c of report.connectors) {
      if (!c.sameKind) seenNonSameKind = true;
      else if (seenNonSameKind) throw new Error('a same-kind connector followed a non-same-kind one');
    }
    expect(report.sameKindCount).toBe(report.connectors.filter((c) => c.sameKind).length);
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
