/**
 * The one component owner: items that share a (canonical) quantity are one cluster.
 *
 * `linkageMap` (equations sharing a quantity), `buildVizModel` (junctions sharing a quantity,
 * with a proposed or user overlay) and the discovery funnel (quantities sharing an equation or
 * an identification) each once ran their own union-find with the same ordering. This module is
 * that partition, computed through MathTS `connectedComponents` over an adjacency of item
 * indices, with the ordering every caller used: a cluster keeps its items in input order, and
 * clusters come largest first, then by the id of their first item. The anchoring rules differ
 * between callers on purpose (`graph-viz.ts` anchors on `law` or `established` status,
 * `bridge-analysis.ts` on `established` confidence) and stay with each caller.
 *
 * @module composition/quantity-clusters
 */

import { connectedComponents } from '@danielsimonjr/mathts-functions';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';

/**
 * Quantity-name canonicalizer honouring `QUANTITY_IDENTIFICATIONS`: maps each name to its
 * identified representative (`hawking-temperature` → `temperature`) and leaves every other
 * name alone. The linkage substrate of `linkageMap`, `proposeLinkCandidates` and the visual
 * map. `anchoringDistance` deliberately does NOT use it (it links on raw names; its 0/∞
 * distance contract is pinned).
 *
 * @internal
 */
export function quantityCanonicalizer(): (name: string) => string {
  const alias = new Map<string, string>(QUANTITY_IDENTIFICATIONS.map((id) => [id.from, id.to]));
  return (n: string): string => alias.get(n) ?? n;
}

/**
 * Group items by one key, keys in first-seen order, members in input order. The group-by
 * every cluster consumer once re-inlined as `if (!m.has(k)) m.set(k, []); m.get(k)!.push(v)`.
 *
 * @internal
 */
export function groupInto<K, V>(items: readonly V[], keyOf: (item: V) => K): Map<K, V[]> {
  const out = new Map<K, V[]>();
  for (const item of items) {
    const k = keyOf(item);
    const group = out.get(k);
    if (group === undefined) out.set(k, [item]);
    else group.push(item);
  }
  return out;
}

/**
 * Partition `items` into clusters of items that share at least one key (transitively): the
 * connected components, through MathTS `connectedComponents`, of the graph whose nodes are item
 * indices and whose links join items with a key in common. Each cluster lists its items in
 * input order; clusters come largest first, then by `idOf` of their first item (by that item's
 * input position when no `idOf` is given). An item with no key is a cluster of its own; an
 * empty input is no cluster.
 *
 * Cost: `connectedComponents` takes a dense n×n adjacency matrix, so memory is O(n²) in the
 * number of items (8·n² bytes as numbers: about 4 MB at n = 700, the order of the quantity
 * names one discovery context clusters, once per context; 800 MB at n = 10 000). A caller with
 * thousands of items should expect that, or cluster with a union-find over the key lists.
 *
 * @internal
 */
export function clusterBySharedKeys<T>(
  items: readonly T[],
  keysOf: (item: T) => readonly string[],
  idOf?: (item: T) => string,
): T[][] {
  const n = items.length;
  if (n === 0) return [];
  // Items sharing a key: the first holder of the key is linked to every later holder, which is
  // enough for connectivity (a star joins the whole set).
  const holders = new Map<string, number[]>();
  items.forEach((item, i) => {
    for (const key of keysOf(item)) {
      const list = holders.get(key);
      if (list === undefined) holders.set(key, [i]);
      else list.push(i);
    }
  });
  const adjacency: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const idxs of holders.values()) {
    for (let k = 1; k < idxs.length; k++) {
      adjacency[idxs[0]][idxs[k]] = 1;
      adjacency[idxs[k]][idxs[0]] = 1;
    }
  }
  const components = connectedComponents(adjacency);
  const clusters = components.map((idxs) => [...idxs].sort((a, b) => a - b));
  const first = (c: readonly number[]): string =>
    idOf === undefined ? String(c[0]).padStart(12, '0') : idOf(items[c[0]]);
  clusters.sort((a, b) => b.length - a.length || first(a).localeCompare(first(b)));
  // Every item is placed exactly once: a component listing that dropped or repeated an index
  // would be the instrument reporting its own breakage, so say so rather than render it.
  const placed = clusters.reduce((acc, c) => acc + c.length, 0);
  if (placed !== n || new Set(clusters.flat()).size !== n) {
    throw new Error(`clusterBySharedKeys: ${placed} placements over ${n} items`);
  }
  return clusters.map((c) => c.map((i) => items[i]));
}
