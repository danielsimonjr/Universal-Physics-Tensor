/**
 * One component owner (`src/composition/quantity-clusters.ts`): `linkageMap`, `buildVizModel`
 * and the discovery funnel once each ran their own union-find over items sharing a canonical
 * quantity. This file pins the component ids and their order BEFORE the move
 * (`tests/fixtures/quantity-clusters-pin.json`, captured from the union-find implementations
 * at `0c3c67b` by a twenty-line script over the built `dist/` of that commit, recorded in the
 * batch report of the change that added this file) and tests the shared helper on a hand-built
 * set, so the migration can be proved to change nothing.
 *
 * @module tests/composition/quantity-clusters
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clusterBySharedKeys,
  groupInto,
  quantityCanonicalizer,
} from '../../src/composition/quantity-clusters.js';
import { linkageMap } from '../../src/composition/bridge-analysis.js';
import type { LinkCandidate } from '../../src/composition/bridge-analysis.js';
import { buildVizModel } from '../../src/composition/graph-viz.js';
import { rankDiscoveries, vetLinkCandidate } from '../../src/composition/discovery.js';
import { CATALOG_GRAPH, CANONICAL_GRAPH, QUANTITY_IDENTIFICATIONS } from '../../src/composition/index.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import { validityDomain } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { ENERGY } from '../../src/dimensional/types.js';

const here = dirname(fileURLToPath(import.meta.url));

interface PinnedGraph {
  readonly linkageClusters: readonly { edges: string[]; anchored: boolean; hubs: string[] }[];
  readonly isolated: readonly string[];
  readonly vizClusters: readonly { junctionIds: string[]; quantities: string[]; anchored: boolean }[];
}
interface Pin {
  readonly catalog: PinnedGraph;
  readonly canonical: PinnedGraph;
  readonly both: PinnedGraph;
  readonly discovery: { catalogCandidates: number; mergesComponents: number };
}
const PIN: Pin = JSON.parse(readFileSync(resolve(here, '../fixtures/quantity-clusters-pin.json'), 'utf8')) as Pin;

const GRAPHS = {
  catalog: CATALOG_GRAPH,
  canonical: CANONICAL_GRAPH,
  both: [...CATALOG_GRAPH, ...CANONICAL_GRAPH],
} as const;

describe('component ids and order are unchanged by the move to one owner (pinned before it)', () => {
  for (const name of ['catalog', 'canonical', 'both'] as const) {
    it(`linkageMap on the ${name} graph: every cluster, in order, with its anchoring and hubs`, () => {
      const m = linkageMap(GRAPHS[name]);
      expect(m.clusters.map((c) => ({ edges: [...c.edges], anchored: c.anchored, hubs: [...c.hubs] }))).toEqual(
        PIN[name].linkageClusters,
      );
      expect([...m.isolated]).toEqual(PIN[name].isolated);
      expect(m.componentCount).toBe(PIN[name].linkageClusters.length);
    });

    it(`buildVizModel on the ${name} graph: every cluster, in order, with its quantities and anchoring`, () => {
      const v = buildVizModel(GRAPHS[name]);
      expect(
        v.clusters.map((c) => ({ junctionIds: [...c.junctionIds], quantities: [...c.quantities], anchored: c.anchored })),
      ).toEqual(PIN[name].vizClusters);
    });
  }

  it('the pin is not vacuous: it holds the recorded component counts', () => {
    expect(PIN.catalog.linkageClusters.length).toBe(133);
    expect(PIN.canonical.linkageClusters.length).toBe(26);
    expect(PIN.both.linkageClusters.length).toBe(146);
  });

  it('the discovery funnel still sees every catalog candidate as cross-component', () => {
    const ranked = rankDiscoveries(CATALOG_GRAPH);
    expect(ranked.length).toBe(PIN.discovery.catalogCandidates);
    expect(ranked.filter((c) => c.mergesComponents).length).toBe(PIN.discovery.mergesComponents);
  });

  it('the target of a source-less equation is a component member of its own, so identifying it merges components', () => {
    // The owner's decision of 2026-10-16 (option 1): an all-constant right-hand side
    // (`CE-bohr-radius`) registers its target under its own key. Before it, the union-find
    // registered a name only when it took part in a union, so `mergesComponents` was false for
    // every identification touching such a target (eight canonical equations).
    const q = (name: string): Quantity => ({ name, symbol: name, dim: ENERGY, attributes: {} });
    const edge = (id: string, sources: string[], target: string): BridgeEdge => ({
      id,
      beId: null,
      kind: 'law',
      label: id,
      sources: sources.map(q),
      target: q(target),
      confidence: 'established',
      domain: validityDomain('true'),
      evaluate: () => 0,
      citation: 'synthetic',
    });
    const cand = (a: string, b: string): LinkCandidate => ({ a, b, dim: '[energy]', touchesCore: false, sameKind: false, sharedToken: null });
    const graph = [edge('constant-only', [], 'k'), edge('e1', ['a'], 'b'), edge('e2', ['c'], 'd')];
    expect(vetLinkCandidate(graph, cand('b', 'd'), { representativeValues: {} }).mergesComponents).toBe(true);
    expect(vetLinkCandidate(graph, cand('k', 'b'), { representativeValues: {} }).mergesComponents).toBe(true);
    // Two source-less targets are two components; a source-less target that another equation
    // also uses is in that equation's component.
    const twoConstants = [...graph, edge('constant-only-2', [], 'm'), edge('uses-k', ['k'], 'f')];
    expect(vetLinkCandidate(twoConstants, cand('k', 'm'), { representativeValues: {} }).mergesComponents).toBe(true);
    expect(vetLinkCandidate(twoConstants, cand('k', 'f'), { representativeValues: {} }).mergesComponents).toBe(false);
  });

  it('every source-less canonical target is a component member (eight equations on the canonical graph)', () => {
    const sourceless = CANONICAL_GRAPH.filter((e) => e.sources.length === 0).map((e) => e.id).sort();
    expect(sourceless).toEqual([
      'CE-bohr-magneton',
      'CE-bohr-radius',
      'CE-classical-electron-radius',
      'CE-planck-length',
      'CE-planck-mass',
      'CE-planck-time',
      'CE-rydberg-energy',
      'CE-uncertainty-principle',
    ]);
    const ranked = rankDiscoveries(CANONICAL_GRAPH);
    const touching = ranked.filter((c) => c.a === 'bohr-radius' || c.b === 'bohr-radius');
    expect(touching.length).toBeGreaterThan(0);
    expect(touching.every((c) => c.mergesComponents)).toBe(true);
  });
});

describe('clusterBySharedKeys — the one union over items sharing a key', () => {
  const items = [
    { id: 'A', keys: ['k1', 'k2'] },
    { id: 'B', keys: ['k2', 'k3'] },
    { id: 'C', keys: ['k4'] },
    { id: 'D', keys: ['k5', 'k1'] },
    { id: 'E', keys: ['k6'] },
  ];
  const keysOf = (x: { keys: string[] }): string[] => x.keys;

  it('joins items through any shared key and keeps each cluster in input order', () => {
    const clusters = clusterBySharedKeys(items, keysOf);
    expect(clusters.map((c) => c.map((x) => x.id))).toEqual([['A', 'B', 'D'], ['C'], ['E']]);
  });

  it('orders clusters largest first, then by the first item id', () => {
    const clusters = clusterBySharedKeys(
      [
        { id: 'z', keys: ['p'] },
        { id: 'y', keys: ['q'] },
        { id: 'x', keys: ['r'] },
      ],
      keysOf,
      (x) => x.id,
    );
    expect(clusters.map((c) => c.map((x) => x.id))).toEqual([['x'], ['y'], ['z']]);
  });

  it('an item with no key is its own cluster; an empty input is no cluster', () => {
    expect(clusterBySharedKeys([{ id: 'solo', keys: [] }], keysOf).map((c) => c.map((x) => x.id))).toEqual([['solo']]);
    expect(clusterBySharedKeys([], keysOf)).toEqual([]);
  });

  it('a duplicate key inside one item does not change the partition', () => {
    const clusters = clusterBySharedKeys(
      [
        { id: 'A', keys: ['k', 'k'] },
        { id: 'B', keys: ['k'] },
      ],
      keysOf,
    );
    expect(clusters.map((c) => c.map((x) => x.id))).toEqual([['A', 'B']]);
  });
});

describe('quantityCanonicalizer and groupInto', () => {
  it('maps every registered identification from → to, and leaves every other name alone', () => {
    const canon = quantityCanonicalizer();
    for (const ident of QUANTITY_IDENTIFICATIONS) expect(canon(ident.from)).toBe(ident.to);
    expect(canon('a-name-no-identification-mentions')).toBe('a-name-no-identification-mentions');
  });

  it('groupInto groups by key in first-seen order and keeps members in input order', () => {
    const g = groupInto([3, 1, 4, 1, 5, 9, 2, 6], (n) => (n % 2 === 0 ? 'even' : 'odd'));
    expect([...g.keys()]).toEqual(['odd', 'even']);
    expect(g.get('odd')).toEqual([3, 1, 1, 5, 9]);
    expect(g.get('even')).toEqual([4, 2, 6]);
  });
});
