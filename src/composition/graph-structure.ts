/**
 * Map structure from graph algorithms, over the QUANTITY graph of a composition graph.
 *
 * The quantity graph has one node per canonical quantity name (`quantityCanonicalizer`). Two
 * quantities are linked, undirected, when they occur in one equation together (sources and
 * target), weighted by how many equations hold both. A directed arc runs from each source
 * quantity to its equation's target. Three readings of it, each stated for what it is:
 *
 *   - {@link communitiesOf} — LAYOUT communities of the largest component (MathTS
 *     `louvainCommunities`, a modularity heuristic). A community is where a drawing may place
 *     quantities near each other. It is never a physics claim: two quantities in one community
 *     share equations, which the map already showed; a community boundary is not a regime
 *     boundary and not a cluster of related physics.
 *   - {@link derivationCycles} — strongly connected components (MathTS
 *     `stronglyConnectedComponents`) of the directed source→target graph: the sets of quantities
 *     each of which can be derived from the others round a loop. That is where over-determination
 *     lives, and where `retrodict` has two routes to compare.
 *   - {@link rankHubs} — betweenness centrality (MathTS `betweennessCentrality`, normalised),
 *     ON DEMAND ONLY: Brandes' algorithm is O(n·m) per call over about five hundred quantity nodes,
 *     so the default `upt map` path does not call it. A hub by betweenness is a cut quantity of
 *     the drawing, not a central quantity of physics.
 *
 * @module composition/graph-structure
 */

import {
  betweennessCentrality,
  connectedComponents,
  louvainCommunities,
  stronglyConnectedComponents,
} from '@danielsimonjr/mathts-functions';
import type { BridgeEdge } from './edge.js';
import { quantityCanonicalizer } from './quantity-clusters.js';

/** The label every community report and printout carries, so a reader never takes a layout for physics. @internal */
export const COMMUNITY_METHOD = 'layout communities (Louvain, heuristic)' as const;

/** The quantity graph of a composition graph. @internal */
export interface QuantityGraph {
  /** Canonical quantity names, in first-seen order; the index of each is its node. */
  readonly names: readonly string[];
  /** Symmetric co-occurrence weights: `undirected[i][j]` is the number of equations holding both. */
  readonly undirected: number[][];
  /** Directed arcs: `directed[i][j]` is 1 when an equation derives `j` from a source set containing `i`. */
  readonly directed: number[][];
}

/**
 * Build the quantity graph of `edges` (canonical names). An equation whose target is also one of
 * its sources contributes no self-arc and no self-link.
 *
 * @internal
 */
export function quantityGraph(edges: readonly BridgeEdge[]): QuantityGraph {
  const canon = quantityCanonicalizer();
  const index = new Map<string, number>();
  const names: string[] = [];
  const nodeOf = (raw: string): number => {
    const name = canon(raw);
    let i = index.get(name);
    if (i === undefined) {
      i = names.length;
      names.push(name);
      index.set(name, i);
    }
    return i;
  };
  const members = edges.map((e) => ({
    sources: [...new Set(e.sources.map((s) => nodeOf(s.name)))],
    target: nodeOf(e.target.name),
  }));
  const n = names.length;
  const undirected = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const directed = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const m of members) {
    const all = [...new Set([...m.sources, m.target])];
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        undirected[all[a]][all[b]] += 1;
        undirected[all[b]][all[a]] += 1;
      }
    }
    for (const s of m.sources) if (s !== m.target) directed[s][m.target] = 1;
  }
  return { names, undirected, directed };
}

/** One layout community: a set of quantities a drawing may place together. @internal */
export interface LayoutCommunity {
  /** Sorted canonical quantity names. */
  readonly quantities: readonly string[];
  readonly size: number;
}

/** The community report of the largest connected component. @internal */
export interface CommunityReport {
  /** Always {@link COMMUNITY_METHOD}: the reading is a layout heuristic. */
  readonly method: typeof COMMUNITY_METHOD;
  /** Quantity nodes in the largest component (0 on an empty graph). */
  readonly componentSize: number;
  /** Communities, largest first, then by first quantity. */
  readonly communities: readonly LayoutCommunity[];
}

/** 0/1 copy of a weighted adjacency. */
function binary(weighted: readonly (readonly number[])[]): number[][] {
  return weighted.map((row) => row.map((w) => (w > 0 ? 1 : 0)));
}

/** The connected components of the undirected quantity graph, largest first, each sorted by node index. */
function undirectedComponents(g: QuantityGraph): number[][] {
  if (g.names.length === 0) return [];
  const comps = connectedComponents(binary(g.undirected)).map((c) => [...c].sort((a, b) => a - b));
  comps.sort((a, b) => b.length - a.length || g.names[a[0]].localeCompare(g.names[b[0]]));
  return comps;
}

/**
 * Layout communities (Louvain, heuristic) of the largest component's quantity graph, over the
 * co-occurrence weights. MathTS's Louvain is deterministic (no seed is taken, none is offered)
 * and not guaranteed optimal. Presented as layout, never as physics: see the module note.
 *
 * @internal
 */
export function communitiesOf(edges: readonly BridgeEdge[]): CommunityReport {
  const g = quantityGraph(edges);
  const comps = undirectedComponents(g);
  if (comps.length === 0) return { method: COMMUNITY_METHOD, componentSize: 0, communities: [] };
  const largest = comps[0];
  const sub = largest.map((i) => largest.map((j) => g.undirected[i][j]));
  const partition = louvainCommunities(sub);
  const communities: LayoutCommunity[] = partition.map((group) => {
    const quantities = group.map((k) => g.names[largest[k]]).sort();
    return { quantities, size: quantities.length };
  });
  communities.sort((a, b) => b.size - a.size || a.quantities[0].localeCompare(b.quantities[0]));
  return { method: COMMUNITY_METHOD, componentSize: largest.length, communities };
}

/** One derivation cycle: quantities each derivable from the others round a loop, and the equations closing it. @internal */
export interface DerivationCycle {
  /** Sorted canonical quantity names of the strongly connected component (at least two). */
  readonly quantities: readonly string[];
  /** Ids of the equations with a source and the target inside the component, in graph order. */
  readonly edges: readonly string[];
}

/**
 * The derivation cycles of `edges`: strongly connected components of size two or more in the
 * directed source→target quantity graph (MathTS `stronglyConnectedComponents`). An equation
 * whose target is one of its own sources is not a cycle. Largest first, then by first quantity.
 *
 * @internal
 */
export function derivationCycles(edges: readonly BridgeEdge[]): DerivationCycle[] {
  const g = quantityGraph(edges);
  if (g.names.length === 0) return [];
  const canon = quantityCanonicalizer();
  const index = new Map(g.names.map((name, i) => [name, i]));
  const cycles: DerivationCycle[] = [];
  for (const scc of stronglyConnectedComponents(g.directed)) {
    if (scc.length < 2) continue;
    const inside = new Set(scc);
    const quantities = scc.map((i) => g.names[i]).sort();
    const closing = edges
      .filter((e) => {
        const t = index.get(canon(e.target.name));
        if (t === undefined || !inside.has(t)) return false;
        return e.sources.some((s) => {
          const si = index.get(canon(s.name));
          return si !== undefined && si !== t && inside.has(si);
        });
      })
      .map((e) => e.id);
    cycles.push({ quantities, edges: closing });
  }
  cycles.sort((a, b) => b.quantities.length - a.quantities.length || a.quantities[0].localeCompare(b.quantities[0]));
  return cycles;
}

/** One quantity's hub rank. @internal */
export interface HubRank {
  readonly quantity: string;
  /** Normalised betweenness centrality in the undirected quantity graph: 0 for a leaf, 1 for the centre of a star. */
  readonly betweenness: number;
  /** Distinct quantities it shares an equation with. */
  readonly degree: number;
}

/**
 * Rank quantities by betweenness centrality (MathTS `betweennessCentrality`, Brandes, normalised
 * by `(n−1)(n−2)`), highest first, ties by name. ON DEMAND ONLY: not called by the default map
 * path. A graph of fewer than three quantities has no interior path, so every score is 0.
 *
 * @internal
 */
export async function rankHubs(edges: readonly BridgeEdge[]): Promise<HubRank[]> {
  const g = quantityGraph(edges);
  const n = g.names.length;
  const adjacency = binary(g.undirected);
  const degree = adjacency.map((row) => row.reduce((acc, x) => acc + x, 0));
  let scores: number[];
  if (n < 3) {
    scores = new Array<number>(n).fill(0);
  } else {
    const result = await betweennessCentrality(adjacency, { directed: false, normalized: true });
    const centrality: unknown = result.centrality;
    if (!(centrality instanceof Float64Array) || centrality.length !== n) {
      throw new TypeError(`betweennessCentrality returned ${String(centrality)} for ${n} nodes`);
    }
    scores = Array.from(centrality);
  }
  const ranks = g.names.map((quantity, i) => ({ quantity, betweenness: scores[i], degree: degree[i] }));
  ranks.sort((a, b) => b.betweenness - a.betweenness || a.quantity.localeCompare(b.quantity));
  return ranks;
}
