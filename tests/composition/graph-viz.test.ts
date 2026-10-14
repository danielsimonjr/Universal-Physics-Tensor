/**
 * Physics-map visualization — the bipartite, clustered render model and its
 * Mermaid / Graphviz-DOT serializers. Quantities are nodes; equations
 * (laws / bridges / proposed) are junction nodes (n sources → 1 target).
 *
 * The model computes its own connected components over the junctions (so a
 * `--proposed` overlay participates), and a drift-guard test pins that count
 * to the authoritative `linkageMap` for the pure-edge case.
 *
 * @module tests/composition/graph-viz
 */
import { describe, it, expect } from 'vitest';
import {
  buildVizModel,
  edgeToJunction,
  type VizJunction,
} from '../../src/composition/graph-viz.js';
import { linkageMap } from '../../src/composition/bridge-analysis.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { validityDomain } from '../../src/composition/edge.js';

const q = (name: string): Quantity => ({
  name,
  symbol: name,
  dim: DIMENSIONLESS,
  attributes: {},
});

const edge = (
  id: string,
  sourceNames: string[],
  targetName: string,
  kind: 'bridge' | 'law' = 'bridge',
  confidence: BridgeEdge['confidence'] = 'speculative',
): BridgeEdge => ({
  id,
  beId: null,
  kind,
  label: id,
  sources: sourceNames.map(q),
  target: q(targetName),
  confidence,
  domain: validityDomain('true'),
  evaluate: () => 0,
  citation: 'synthetic',
});

// Fixture: two components.
//   {e1: a→b (law), e2: (b,c)→d (speculative)}  linked via b
//   {e3: x→y (established bridge)}               isolated
const FIXTURE: BridgeEdge[] = [
  edge('e1', ['a'], 'b', 'law'),
  edge('e2', ['b', 'c'], 'd', 'bridge', 'speculative'),
  edge('e3', ['x'], 'y', 'bridge', 'established'),
];

describe('edgeToJunction — status mapping', () => {
  it('maps kind=law → status "law"', () => {
    expect(edgeToJunction(edge('l', ['a'], 'b', 'law')).status).toBe('law');
  });
  it('maps a bridge to its confidence grade', () => {
    expect(edgeToJunction(edge('s', ['a'], 'b', 'bridge', 'speculative')).status).toBe(
      'speculative',
    );
    expect(
      edgeToJunction(edge('e', ['a'], 'b', 'bridge', 'established')).status,
    ).toBe('established');
    expect(
      edgeToJunction(edge('h', ['a'], 'b', 'bridge', 'highly-speculative')).status,
    ).toBe('highly-speculative');
  });
  it('carries sources and target as quantity names', () => {
    const j = edgeToJunction(edge('e2', ['b', 'c'], 'd'));
    expect(j.sources).toEqual(['b', 'c']);
    expect(j.target).toBe('d');
    expect(j.id).toBe('e2');
  });
});

describe('buildVizModel — structure', () => {
  const model = buildVizModel(FIXTURE);

  it('has one junction per edge', () => {
    expect(model.junctions).toHaveLength(3);
    expect(model.junctions.map((j) => j.id).sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('groups junctions into connected components (clusters)', () => {
    expect(model.clusters).toHaveLength(2);
    const sizes = model.clusters.map((c) => c.size).sort((a, b) => b - a);
    expect(sizes).toEqual([2, 1]);
  });

  it('cluster count matches the authoritative linkageMap (drift guard)', () => {
    expect(model.clusters.length).toBe(linkageMap(FIXTURE).componentCount);
  });

  it('marks a cluster anchored when it has a law/established junction', () => {
    const big = model.clusters.find((c) => c.size === 2)!;
    expect(big.anchored).toBe(true); // contains the law edge e1
    const iso = model.clusters.find((c) => c.size === 1)!;
    expect(iso.anchored).toBe(true); // e3 is established
  });

  it('lists each cluster\'s quantity names', () => {
    const big = model.clusters.find((c) => c.size === 2)!;
    expect([...big.quantities].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('buildVizModel — proposed overlay (firewall)', () => {
  const proposed: VizJunction = {
    id: 'IC-prop',
    label: 'proposed: a≟x',
    status: 'proposed',
    sources: ['a'],
    target: 'x',
  };

  it('has no proposed junction without an overlay', () => {
    const m = buildVizModel(FIXTURE);
    expect(m.junctions.some((j) => j.status === 'proposed')).toBe(false);
  });

  it('includes proposed junctions when supplied as extraJunctions', () => {
    const m = buildVizModel(FIXTURE, { extraJunctions: [proposed] });
    expect(m.junctions.some((j) => j.id === 'IC-prop')).toBe(true);
    // it bridges the two previously-disjoint components (a in big, x in iso)
    expect(m.clusters.length).toBeLessThan(linkageMap(FIXTURE).componentCount + 1);
  });

  it('throws (loudly) on a duplicate junction id rather than silently dropping', () => {
    const clash: VizJunction = { ...proposed, id: 'e1' }; // collides with an edge id
    expect(() => buildVizModel(FIXTURE, { extraJunctions: [clash] })).toThrow(
      /duplicate junction id/,
    );
  });
});

describe('buildVizModel — user-equation junction (status "user")', () => {
  const userEq: VizJunction = {
    id: 'user-equation',
    label: 'period = 2*pi*sqrt(a/b)',
    status: 'user',
    sources: ['a'],
    target: 'd',
  };

  it('renders a user junction with its own classDef in Mermaid', () => {
    const src = buildVizModel(FIXTURE, { extraJunctions: [userEq] }).toMermaid();
    expect(src).toContain(':::user');
    expect(src).toMatch(/classDef user/);
  });

  it('styles the user junction in DOT', () => {
    const src = buildVizModel(FIXTURE, { extraJunctions: [userEq] }).toDot();
    // violet fill assigned to the user status
    expect(src).toContain('#e9d8fd');
  });

  it('does not appear without an overlay', () => {
    const m = buildVizModel(FIXTURE);
    expect(m.junctions.some((j) => j.status === 'user')).toBe(false);
  });
});

describe('toMermaid — label escaping', () => {
  it('XML-escapes &, <, >, and " in labels', () => {
    const j: VizJunction = {
      id: 'X1',
      label: 'a<b> & "c"',
      status: 'proposed',
      sources: ['a'],
      target: 'z',
    };
    const src = buildVizModel(FIXTURE, { extraJunctions: [j] }).toMermaid();
    expect(src).toContain('&lt;');
    expect(src).toContain('&gt;');
    expect(src).toContain('&amp;');
    expect(src).toContain('&quot;');
    expect(src).not.toContain('a<b>'); // raw, unescaped form must not appear
  });

  it('replaces embedded newlines with spaces in labels', () => {
    const j: VizJunction = {
      id: 'X2',
      label: 'line1\nline2',
      status: 'user',
      sources: ['a'],
      target: 'z',
    };
    const mermaid = buildVizModel(FIXTURE, { extraJunctions: [j] }).toMermaid();
    const dot = buildVizModel(FIXTURE, { extraJunctions: [j] }).toDot();
    expect(mermaid).not.toContain('line1\nline2');
    expect(mermaid).toContain('line1 line2');
    expect(dot).not.toContain('line1\nline2');
    expect(dot).toContain('line1 line2');
  });
});

describe('toMermaid — output', () => {
  const src = buildVizModel(FIXTURE).toMermaid();

  it('is a flowchart with a subgraph per cluster', () => {
    expect(src).toMatch(/^flowchart /m);
    expect((src.match(/subgraph /g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('emits every quantity and junction', () => {
    for (const name of ['a', 'b', 'c', 'd', 'x', 'y']) {
      expect(src).toContain(name);
    }
    for (const id of ['e1', 'e2', 'e3']) expect(src).toContain(id);
  });

  it('uses only valid Mermaid node identifiers (no raw hyphens/spaces)', () => {
    // node decls look like `q_xxx([...])` or `j_xxx[...]`; ids are [A-Za-z0-9_]
    const ids = [...src.matchAll(/^\s*([A-Za-z0-9_]+)[(\[]/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_]+$/);
  });

  it('declares a classDef per status used', () => {
    expect(src).toMatch(/classDef law/);
    expect(src).toMatch(/classDef speculative/);
  });
});

describe('toDot — output', () => {
  const src = buildVizModel(FIXTURE).toDot();

  it('is a digraph with subgraph clusters', () => {
    expect(src).toMatch(/^digraph /m);
    expect((src.match(/subgraph cluster_/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('emits ellipse quantities and filled box junctions', () => {
    expect(src).toMatch(/shape=ellipse/);
    expect(src).toMatch(/shape=box/);
    expect(src).toMatch(/style="?filled/);
  });

  it('emits directed edges (source → junction → target)', () => {
    expect(src).toMatch(/->/);
  });
});

describe('buildVizModel — real CATALOG_GRAPH', () => {
  const model = buildVizModel(CATALOG_GRAPH);

  it('renders the whole catalog with cluster count == linkageMap', () => {
    expect(model.junctions).toHaveLength(CATALOG_GRAPH.length);
    expect(model.clusters.length).toBe(linkageMap(CATALOG_GRAPH).componentCount);
  });

  it('produces non-empty, parseable-looking Mermaid and DOT', () => {
    expect(model.toMermaid()).toMatch(/^flowchart /m);
    expect(model.toDot()).toMatch(/^digraph /m);
  });
});
