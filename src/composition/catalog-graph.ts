/**
 * The composition graph is the edge projection of `registerBridge`.
 * 83 is the record from before be-103..125. 68 is the record from before
 * be-88..102.
 *
 * @module composition/catalog-graph
 */

import type { BridgeEdge } from './edge.js';
import { bridgeRegistry, registerBridge } from '../bridges/registry.js';
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
import { APPLIED_PHYSICIST_EDGES } from './edges/applied-physicist.js';
import { CONDENSED_R5_EDGES } from './edges/condensed-r5.js';
import { PLASMA_SPACE_EDGES } from './edges/plasma-space.js';

/**
 * Every registered `BridgeEdge`, in registration order. 83 is the record
 * from before be-103..125. 68 is the record from before be-88..102.
 *
 * @public
 */
const EDGE_ROWS: readonly BridgeEdge[] = [
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
  ...APPLIED_PHYSICIST_EDGES,
  ...CONDENSED_R5_EDGES,
  ...PLASMA_SPACE_EDGES,
];

for (const edge of EDGE_ROWS) registerBridge({ edge });

/** The edge projection of `registerBridge`. @public */
export const CATALOG_GRAPH: readonly BridgeEdge[] = bridgeRegistry.edges() as unknown as readonly BridgeEdge[];
