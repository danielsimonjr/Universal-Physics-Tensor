/**
 * The full composition graph as a single constant — the 46 `BridgeEdge`s
 * (9 calibration + 6 catalog-tranche + 26 catalog-full + 5 proved seeds).
 *
 * Single source of truth for "the catalog as a graph": the CLI, the
 * analysis functions, and the test suites consume this rather than each
 * hand-rebuilding the edge list (which silently drifts when an edge is
 * added). When the graph grows, this is the one place to update.
 *
 * @module composition/catalog-graph
 */

import type { BridgeEdge } from './edge.js';
import {
  be11ZurekEdge,
  be12Edge,
  be16Edge,
  be37Edge,
  be42Edge,
  be42ViaRsEdge,
  be51Edge,
  be52Edge,
  lawSchwarzschildRadius,
} from './edges/calibration.js';
import {
  be14Edge,
  be19Edge,
  be21Edge,
  be48Edge,
  be53Edge,
  be54Edge,
} from './edges/catalog-tranche.js';
import { CATALOG_FULL_EDGES } from './edges/catalog-full.js';
import { PROVED_SEED_EDGES } from './edges/proved-seeds.js';

/**
 * Every `BridgeEdge` in the composition graph (46 edges). The order is
 * calibration → tranche → catalog-full → proved seeds.
 *
 * @public
 */
export const CATALOG_GRAPH: readonly BridgeEdge[] = [
  be11ZurekEdge,
  be12Edge,
  be16Edge,
  be37Edge,
  be42Edge,
  be42ViaRsEdge,
  be51Edge,
  be52Edge,
  lawSchwarzschildRadius,
  be14Edge,
  be19Edge,
  be21Edge,
  be48Edge,
  be53Edge,
  be54Edge,
  ...CATALOG_FULL_EDGES,
  ...PROVED_SEED_EDGES,
];
