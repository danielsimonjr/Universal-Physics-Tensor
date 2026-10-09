/**
 * Bridge prediction — make the namesake `UniversalTensor` operational
 * (Direction 1).
 *
 * The premise: a bridge connects two physical regimes, so an EMPTY
 * off-diagonal cell between two regimes that ARE individually well
 * connected is a *predicted-but-undiscovered* bridge. This module
 * projects the composition graph (`CATALOG_GRAPH`) onto the
 * (scale × force) regime plane, populates a real `UniversalTensor` from
 * it (the catalog's structure, finally carried by the namesake), and
 * ranks the empty regime-pairs by a triadic-closure score — the classic
 * common-neighbours link-prediction heuristic.
 *
 * ⚠ Each prediction is a STRUCTURAL HYPOTHESIS for physicist review, NOT
 * a discovered bridge. "Two regimes share many bridge-neighbours but are
 * not directly linked" is a weak prior — exactly the review-surface
 * discipline `proposeLinkCandidates` follows. It says WHERE to look, not
 * WHAT the relation is.
 *
 * INTERNAL — not on the public surface (mirrors bridge-analysis.ts);
 * surfaced via `upt predict`.
 *
 * @module composition/bridge-prediction
 */

import { UniversalTensor } from '../core/tensor.js';
import type { PhysicalScale, Force, TensorIndices } from '../core/types.js';
import type { BridgeEdge } from './edge.js';
import type { Quantity } from './quantity.js';
import { FORCE_AXIS_VALUES, SCALE_AXIS_VALUES } from './axes.js';

// The axis registry owns the value lists; `ScaleAxis` and `ForceAxis` are the
// same unions as the tensor's `PhysicalScale` and `Force`.
const ALL_SCALES: readonly PhysicalScale[] = SCALE_AXIS_VALUES;
const ALL_FORCES: readonly Force[] = FORCE_AXIS_VALUES;

/**
 * A regime coordinate on the (scale, force) plane — the two axes that map
 * 1:1 between `RegimeAttributes` and `TensorIndices`. Sparse: a quantity
 * records only what is stated.
 */
interface Regime {
  readonly scale?: PhysicalScale;
  readonly force?: Force;
}

/** Canonical string key for a regime (set/Map identity). */
export function regimeKey(r: Regime): string {
  const parts: string[] = [];
  if (r.scale !== undefined) parts.push(`scale=${r.scale}`);
  if (r.force !== undefined) parts.push(`force=${r.force}`);
  return parts.join('|');
}

/**
 * Project a quantity onto the regime plane. Returns null when neither a
 * scale nor a force is stated (the quantity is not placeable — an honest
 * limit: only regime-tagged quantities enter the map).
 */
export function placeQuantity(q: Quantity): Regime | null {
  const r: Regime = {
    ...(q.attributes.scale !== undefined ? { scale: q.attributes.scale } : {}),
    ...(q.attributes.force !== undefined ? { force: q.attributes.force } : {}),
  };
  return r.scale === undefined && r.force === undefined ? null : r;
}

/** The distinct endpoint regimes an edge touches (sources ∪ target). */
function edgeRegimes(e: BridgeEdge): Regime[] {
  const seen = new Map<string, Regime>();
  for (const q of [...e.sources, e.target]) {
    const r = placeQuantity(q);
    if (r) seen.set(regimeKey(r), r);
  }
  return [...seen.values()];
}

/** Regime → TensorIndices (the two planes coincide on scale/force). */
function toIndices(r: Regime): TensorIndices {
  return {
    ...(r.scale !== undefined ? { scale: r.scale } : {}),
    ...(r.force !== undefined ? { force: r.force } : {}),
  };
}

/**
 * Populate a real `UniversalTensor` from the graph: every complete
 * (scale AND force) regime that appears becomes a diagonal law cell, and
 * every regime-spanning edge becomes off-diagonal bridge cells between its
 * endpoint regimes. The namesake now carries the catalog's structure —
 * `getStats()`, `getBridges()`, `unpopulatedNeighborhoods()` all reflect
 * real data.
 */
export function buildRegimeTensor(edges: readonly BridgeEdge[]): UniversalTensor {
  const tensor = new UniversalTensor({
    rank: 6,
    scales: [...ALL_SCALES],
    forces: [...ALL_FORCES],
  });

  // Diagonal: one law per complete occupied regime (both axes stated, so
  // addLaw's scale×force storage populates exactly one cell).
  const completeRegimes = new Map<string, Regime>();
  for (const e of edges) {
    for (const r of edgeRegimes(e)) {
      if (r.scale !== undefined && r.force !== undefined) {
        completeRegimes.set(regimeKey(r), r);
      }
    }
  }
  for (const [key, r] of completeRegimes) {
    tensor.addLaw({
      id: `regime:${key}`,
      name: key,
      equation: '',
      scales: [r.scale!],
      forces: [r.force!],
      symmetries: [],
      confidence: 0.5,
    });
  }

  // Off-diagonal: one bridge per regime-spanning edge endpoint pair.
  for (const e of edges) {
    const regimes = edgeRegimes(e);
    const target = placeQuantity(e.target);
    if (!target) continue;
    for (const r of regimes) {
      if (regimeKey(r) === regimeKey(target)) continue; // same regime — not a bridge
      tensor.addBridge({
        id: `${e.id}:${regimeKey(r)}->${regimeKey(target)}`,
        name: e.label,
        source: toIndices(r),
        target: toIndices(target),
        equation: '',
        confidence: 0.5,
        validated: false,
        description: e.id,
      });
    }
  }

  return tensor;
}

/** A predicted-but-absent bridge between two occupied regimes. @hypothesis */
interface BridgePrediction {
  /** The two regime keys (sorted) the predicted bridge would connect. */
  readonly regimeA: string;
  readonly regimeB: string;
  /**
   * Triadic-closure score: how many regimes are bridge-neighbours of BOTH
   * endpoints. Higher = more structurally surrounded = stronger prior that
   * a connection is missing. Always ≥1 (zero-overlap pairs are dropped).
   */
  readonly sharedNeighbors: number;
  /** The shared neighbour regime keys (the structural basis), sorted. */
  readonly via: readonly string[];
}

/** The regime-map prediction report. */
interface RegimePredictionReport {
  /** Empty regime-pairs ranked by triadic-closure score (desc). */
  readonly predictions: readonly BridgePrediction[];
  /** All occupied regime keys, sorted. */
  readonly occupiedRegimes: readonly string[];
  /** Number of distinct regime-pairs the catalog already bridges. */
  readonly linkedPairCount: number;
  /** Edges with ≥1 placeable endpoint (entered the map). */
  readonly placedEdges: number;
  /** Total edges considered. */
  readonly totalEdges: number;
  /**
   * Unexplored regimes: complete occupied regimes' single-axis-flip
   * neighbours that the catalog never touches — the tensor's own
   * `unpopulatedNeighborhoods()`, surfaced as "regimes adjacent to known
   * ones that no bridge reaches". Sorted.
   */
  readonly unexploredRegimes: readonly string[];
}

// U+0000 separates the two names: it does not occur in the catalog's quantity names.
const pairKey = (a: string, b: string): string => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/**
 * Predict missing bridges: rank the empty regime-pairs (occupied but not
 * directly linked) by shared bridge-neighbour count. See module docs for
 * the review-surface caveat.
 */
export function predictMissingBridges(
  edges: readonly BridgeEdge[],
): RegimePredictionReport {
  const occupied = new Set<string>();
  const neighbors = new Map<string, Set<string>>();
  const linked = new Set<string>();
  let placedEdges = 0;

  const link = (a: string, b: string) => {
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    neighbors.get(a)!.add(b);
  };

  for (const e of edges) {
    const regimes = edgeRegimes(e).map(regimeKey);
    if (regimes.length > 0) placedEdges++;
    for (const r of regimes) occupied.add(r);
    // Undirected regime adjacency over every distinct endpoint pair.
    for (let i = 0; i < regimes.length; i++) {
      for (let j = i + 1; j < regimes.length; j++) {
        if (regimes[i] === regimes[j]) continue;
        link(regimes[i], regimes[j]);
        link(regimes[j], regimes[i]);
        linked.add(pairKey(regimes[i], regimes[j]));
      }
    }
  }

  const regimeList = [...occupied].sort();
  const predictions: BridgePrediction[] = [];
  for (let i = 0; i < regimeList.length; i++) {
    for (let j = i + 1; j < regimeList.length; j++) {
      const a = regimeList[i];
      const b = regimeList[j];
      if (linked.has(pairKey(a, b))) continue; // already bridged
      const na = neighbors.get(a) ?? new Set();
      const nb = neighbors.get(b) ?? new Set();
      const shared = [...na].filter((x) => nb.has(x) && x !== a && x !== b).sort();
      if (shared.length === 0) continue; // no structural basis
      predictions.push({
        regimeA: a,
        regimeB: b,
        sharedNeighbors: shared.length,
        via: shared,
      });
    }
  }
  predictions.sort(
    (x, y) =>
      y.sharedNeighbors - x.sharedNeighbors ||
      x.regimeA.localeCompare(y.regimeA) ||
      x.regimeB.localeCompare(y.regimeB),
  );

  // Tensor-derived complementary surface: unexplored adjacent regimes.
  const tensor = buildRegimeTensor(edges);
  const unexplored = tensor
    .unpopulatedNeighborhoods()
    .map((idx) => regimeKey({ scale: idx.scale, force: idx.force }))
    .filter((k) => k !== '' && !occupied.has(k));

  return {
    predictions,
    occupiedRegimes: regimeList,
    linkedPairCount: linked.size,
    placedEdges,
    totalEdges: edges.length,
    unexploredRegimes: [...new Set(unexplored)].sort(),
  };
}
