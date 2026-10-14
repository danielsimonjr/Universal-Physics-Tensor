/**
 * Direction 1 — make the UniversalTensor operational (bridge prediction).
 * Controlled fixtures pin the triadic-closure prediction (a 4-cycle of
 * regimes predicts its two missing diagonals) and the real-tensor
 * population; the real-graph block pins that CATALOG_GRAPH projects onto
 * the regime plane and yields a well-formed report.
 */
import { describe, it, expect } from 'vitest';
import {
  predictMissingBridges,
  buildRegimeTensor,
  placeQuantity,
  regimeKey,
} from '../../src/composition/bridge-prediction.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import type { PhysicalScale, Force } from '../../src/core/types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { validityDomain } from '../../src/composition/edge.js';

const Q = (name: string, scale: PhysicalScale, force: Force): Quantity => ({
  name,
  symbol: name,
  dim: DIMENSIONLESS,
  attributes: { scale, force },
});

const E = (id: string, source: Quantity, target: Quantity): BridgeEdge => ({
  id,
  beId: null,
  kind: 'bridge',
  label: id,
  sources: [source],
  target,
  confidence: 'speculative',
  domain: validityDomain('true'),
  evaluate: () => 0,
  citation: 'synthetic',
});

// A 4-cycle over the (scale × force) plane:
//   qg ── cg          qg = quantum/gravitational
//   │      │          cg = classical/gravitational
//   qe ── ce          qe = quantum/electromagnetic
//                     ce = classical/electromagnetic
// The cycle's two MISSING diagonals (qg–ce, cg–qe) are the predictions.
const qg = Q('a', 'quantum', 'gravitational');
const cg = Q('b', 'classical', 'gravitational');
const qe = Q('c', 'quantum', 'electromagnetic');
const ce = Q('d', 'classical', 'electromagnetic');

const CYCLE: BridgeEdge[] = [
  E('qg-cg', qg, cg),
  E('qg-qe', qg, qe),
  E('cg-ce', cg, ce),
  E('qe-ce', qe, ce),
];

describe('placeQuantity / regimeKey', () => {
  it('projects a quantity onto the (scale, force) plane', () => {
    expect(regimeKey(placeQuantity(qg)!)).toBe('scale=quantum|force=gravitational');
  });

  it('returns null for a quantity with no stated regime', () => {
    const bare: Quantity = { name: 'x', symbol: 'x', dim: DIMENSIONLESS, attributes: {} };
    expect(placeQuantity(bare)).toBeNull();
  });
});

describe('predictMissingBridges — the 4-cycle predicts its two diagonals', () => {
  const report = predictMissingBridges(CYCLE);

  it('places every edge and finds four occupied regimes', () => {
    expect(report.placedEdges).toBe(4);
    expect(report.totalEdges).toBe(4);
    expect(report.occupiedRegimes).toHaveLength(4);
    expect(report.linkedPairCount).toBe(4);
  });

  it('predicts exactly the two missing diagonals, each with 2 shared neighbours', () => {
    expect(report.predictions).toHaveLength(2);
    for (const p of report.predictions) expect(p.sharedNeighbors).toBe(2);
    const pairs = report.predictions.map((p) => [p.regimeA, p.regimeB].sort().join(' / '));
    expect(pairs).toContain(
      [
        'scale=quantum|force=gravitational',
        'scale=classical|force=electromagnetic',
      ].sort().join(' / '),
    );
    expect(pairs).toContain(
      [
        'scale=classical|force=gravitational',
        'scale=quantum|force=electromagnetic',
      ].sort().join(' / '),
    );
  });

  it('never predicts a pair that is already linked', () => {
    const linkedDiagonal = report.predictions.find(
      (p) =>
        (p.regimeA.includes('quantum|force=gravitational') &&
          p.regimeB.includes('classical|force=gravitational')),
    );
    expect(linkedDiagonal).toBeUndefined();
  });
});

describe('buildRegimeTensor — the namesake carries the catalog structure', () => {
  it('populates diagonal regime laws and off-diagonal bridges', () => {
    const tensor = buildRegimeTensor(CYCLE);
    const stats = tensor.getStats();
    expect(stats.knownLaws).toBe(4); // four complete regimes
    expect(stats.bridgeEquations).toBe(4); // four regime-spanning edges
    expect(tensor.getBridges().length).toBe(4);
  });
});

describe('predictMissingBridges — real CATALOG_GRAPH projection', () => {
  const report = predictMissingBridges(CATALOG_GRAPH);

  it('projects a non-trivial fraction of the catalog onto the regime plane', () => {
    expect(report.placedEdges).toBeGreaterThan(0);
    expect(report.placedEdges).toBeLessThanOrEqual(CATALOG_GRAPH.length);
    expect(report.occupiedRegimes.length).toBeGreaterThan(0);
  });

  it('predictions are sorted by shared-neighbour count and never re-propose a linked pair', () => {
    for (let i = 1; i < report.predictions.length; i++) {
      expect(report.predictions[i].sharedNeighbors).toBeLessThanOrEqual(
        report.predictions[i - 1].sharedNeighbors,
      );
    }
    // every prediction has a real structural basis
    expect(report.predictions.every((p) => p.sharedNeighbors >= 1)).toBe(true);
    expect(report.predictions.every((p) => p.via.length === p.sharedNeighbors)).toBe(true);
  });
});
