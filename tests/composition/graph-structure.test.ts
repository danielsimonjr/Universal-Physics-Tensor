/**
 * Map structure from graph algorithms (`src/composition/graph-structure.ts`): layout communities
 * (Louvain, heuristic) over the largest component's quantity graph, derivation cycles (strongly
 * connected components of the directed source→target graph) and hub ranking by betweenness
 * centrality, on demand. Hand-built graphs prove each reading; the catalog graph's result is
 * pinned once.
 *
 * @module tests/composition/graph-structure
 */
import { describe, it, expect } from 'vitest';
import { communitiesOf, derivationCycles, quantityGraph, rankHubs } from '../../src/composition/graph-structure.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { validityDomain } from '../../src/composition/edge.js';

const q = (name: string): Quantity => ({ name, symbol: name, dim: DIMENSIONLESS, attributes: {} });

const edge = (id: string, sources: string[], target: string): BridgeEdge => ({
  id,
  beId: null,
  kind: 'bridge',
  label: id,
  sources: sources.map(q),
  target: q(target),
  confidence: 'speculative',
  domain: validityDomain('true'),
  evaluate: () => 0,
  citation: 'synthetic',
});

// Two dense clusters {a,b,c,d} and {p,q,r,s}, joined only through the quantity x (c → x → r).
const TWO_CLUSTERS: BridgeEdge[] = [
  edge('e1', ['a', 'b'], 'c'),
  edge('e2', ['b', 'c'], 'd'),
  edge('e3', ['a', 'd'], 'b'),
  edge('f1', ['p', 'q'], 'r'),
  edge('f2', ['q', 'r'], 's'),
  edge('f3', ['p', 's'], 'q'),
  edge('g1', ['c'], 'x'),
  edge('g2', ['x'], 'r'),
];

describe('communitiesOf — layout communities (Louvain, heuristic), never physics', () => {
  it('splits two dense clusters joined by one quantity into two communities', () => {
    const report = communitiesOf(TWO_CLUSTERS);
    expect(report.method).toBe('layout communities (Louvain, heuristic)');
    expect(report.componentSize).toBe(9);
    expect(report.communities).toHaveLength(2);
    const sets = report.communities.map((c) => new Set(c.quantities));
    const side = (name: string): number => sets.findIndex((s) => s.has(name));
    for (const n of ['a', 'b', 'c', 'd']) expect(side(n)).toBe(side('a'));
    for (const n of ['p', 'q', 'r', 's']) expect(side(n)).toBe(side('p'));
    expect(side('a')).not.toBe(side('p'));
  });

  it('is deterministic and sorted: largest community first, then by first quantity', () => {
    const a = communitiesOf(TWO_CLUSTERS);
    const b = communitiesOf(TWO_CLUSTERS);
    expect(a).toEqual(b);
    for (let i = 1; i < a.communities.length; i++) {
      expect(a.communities[i].size).toBeLessThanOrEqual(a.communities[i - 1].size);
    }
    for (const c of a.communities) expect([...c.quantities]).toEqual([...c.quantities].sort());
  });

  it('an empty graph has no component and no community', () => {
    const report = communitiesOf([]);
    expect(report.componentSize).toBe(0);
    expect(report.communities).toEqual([]);
  });
});

describe('rankHubs — betweenness centrality, on demand', () => {
  it('the one quantity joining two clusters has the highest betweenness', async () => {
    const hubs = await rankHubs(TWO_CLUSTERS);
    expect(hubs[0].quantity).toBe('x');
    expect(hubs[0].betweenness).toBeGreaterThan(hubs[1].betweenness);
    // Normalised by (n−1)(n−2): a score is a fraction of the ordered pairs, never above 1.
    for (const h of hubs) {
      expect(h.betweenness).toBeGreaterThanOrEqual(0);
      expect(h.betweenness).toBeLessThanOrEqual(1);
    }
    expect(hubs.map((h) => h.quantity).sort()).toEqual(['a', 'b', 'c', 'd', 'p', 'q', 'r', 's', 'x']);
  });

  it('ties break by name, and a leaf quantity scores zero', async () => {
    const star = [edge('s1', ['hub'], 'leaf-a'), edge('s2', ['hub'], 'leaf-b'), edge('s3', ['hub'], 'leaf-c')];
    const hubs = await rankHubs(star);
    expect(hubs[0]).toEqual({ quantity: 'hub', betweenness: 1, degree: 3 });
    expect(hubs.slice(1).map((h) => h.quantity)).toEqual(['leaf-a', 'leaf-b', 'leaf-c']);
    for (const h of hubs.slice(1)) expect(h.betweenness).toBe(0);
  });
});

describe('derivationCycles — strongly connected components of the directed source→target graph', () => {
  it('lists an A→B→C→A cycle with the edges that close it', () => {
    const cycle = [edge('ab', ['A'], 'B'), edge('bc', ['B'], 'C'), edge('ca', ['C'], 'A'), edge('cd', ['C'], 'D')];
    expect(derivationCycles(cycle)).toEqual([{ quantities: ['A', 'B', 'C'], edges: ['ab', 'bc', 'ca'] }]);
  });

  it('lists none on a tree', () => {
    const tree = [edge('ab', ['A'], 'B'), edge('ac', ['A'], 'C'), edge('bd', ['B'], 'D')];
    expect(derivationCycles(tree)).toEqual([]);
  });

  it('a quantity that is both a source and the target of one edge is not a cycle of the graph', () => {
    // A self-loop is an equation stated in terms of itself, not two routes between two quantities.
    expect(derivationCycles([edge('self', ['A', 'B'], 'A')])).toEqual([]);
  });

  it('orders cycles largest first, then by first quantity', () => {
    const two = [
      edge('xy', ['X'], 'Y'),
      edge('yx', ['Y'], 'X'),
      edge('ab', ['A'], 'B'),
      edge('bc', ['B'], 'C'),
      edge('ca', ['C'], 'A'),
    ];
    expect(derivationCycles(two).map((c) => c.quantities)).toEqual([['A', 'B', 'C'], ['X', 'Y']]);
  });
});

describe('the live graphs, pinned once', () => {
  // A number here is a measurement, not a target: when the catalog changes, re-measure, read
  // the diff, and record the move in the change's CHANGELOG entry.
  it('NEGATIVE RESULT: no graph has a derivation cycle — the source→target quantity graph is acyclic', () => {
    // The hand-built A→B→C→A case above is the positive control that the listing can fire.
    expect(derivationCycles(CATALOG_GRAPH)).toEqual([]);
    expect(derivationCycles(CANONICAL_GRAPH)).toEqual([]);
    expect(derivationCycles([...CATALOG_GRAPH, ...CANONICAL_GRAPH])).toEqual([]);
  });

  it('layout communities of the catalog graph: a 50-quantity component in six communities', () => {
    const report = communitiesOf(CATALOG_GRAPH);
    expect(quantityGraph(CATALOG_GRAPH).names).toHaveLength(531);
    expect(report.componentSize).toBe(50);
    expect(report.communities.map((c) => c.size)).toEqual([16, 12, 8, 6, 5, 3]);
    // The two largest hold the map's two hubs, as the drawing has always shown them.
    expect(report.communities[0].quantities).toContain('mass');
    expect(report.communities[1].quantities).toContain('temperature');
  });

  it('layout communities of the canonical and both graphs', () => {
    const canonical = communitiesOf(CANONICAL_GRAPH);
    expect(canonical.componentSize).toBe(124);
    expect(canonical.communities.map((c) => c.size)).toEqual([28, 23, 18, 18, 15, 8, 7, 7]);
    const both = communitiesOf([...CATALOG_GRAPH, ...CANONICAL_GRAPH]);
    expect(both.componentSize).toBe(183);
    expect(both.communities.map((c) => c.size)).toEqual([40, 27, 26, 22, 18, 18, 11, 9, 7, 5]);
  });

  it('hubs by betweenness on the catalog graph: temperature, then mass', async () => {
    const hubs = await rankHubs(CATALOG_GRAPH);
    expect(hubs.slice(0, 2).map((h) => h.quantity)).toEqual(['temperature', 'mass']);
    expect(hubs[0].degree).toBe(17);
    expect(hubs[1].degree).toBe(17);
  });
});
