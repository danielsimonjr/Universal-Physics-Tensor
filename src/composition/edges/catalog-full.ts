/**
 * Catalog-full edges — the v0.11 headline: migrate the remaining catalog
 * bridges (those with a USABLE numerical evaluator) to composition-graph
 * `BridgeEdge`s, extending the v0.8.0 calibration + v0.10.0 catalog-tranche
 * sets. Each edge wraps an EXISTING validated catalog evaluator (the catalog
 * stays authoritative — design D-4) and carries a first-class validity
 * domain (G-8) mirroring exactly what the wrapped evaluator enforces.
 *
 * Quantity-name discipline (v0.11 namespacing gate, Option D): every node is
 * defined ONCE in `src/composition/quantities.ts`. Where the physics matches
 * an existing canonical node we REUSE it (`relaxation-rate`, `decoherence-rate`,
 * `temperature`, `mass`, `mass-density`); where the name would collide but the
 * physics DIFFERS we pick a distinct name — e.g. BE-23/BE-26 carrier/proton
 * masses become `effective-mass` / `tunneling-mass`, NOT the gravitational
 * `mass`. BE-13 and BE-31 share the `ricci-scalar` target (both produce the
 * scalar curvature R [L⁻²]).
 *
 * NOT-A-BRIDGE entries — NO edges in this array (per src/bridges/rejected.ts
 * REJECTED_BRIDGE_IDS): BE-28 (Onsager/MEPP), BE-29 (Jarzynski), BE-32
 * (quantum reference frames), BE-35 (conformal bootstrap), BE-40 (composite
 * Higgs). Rejected adjudications are not bridges. BE-40's proved potential
 * is a law edge in `proved-seeds.ts`, outside this array: the rejection is
 * the single-regime adjudication, and the theorem still states V(h).
 *
 * Other skips (no scalar-Record evaluator): BE-44 soft-hair — its evaluator
 * `evaluateBE44SoftHairCharge` takes a `number[]` news-sample array + grid
 * spacing, not a `Record<string, number>` of scalar quantities, so it cannot
 * be lowered onto the (sources → scalars) edge contract without an array
 * quantity primitive the graph does not yet have.
 *
 * @module composition/edges/catalog-full
 */

import type { BridgeEdge } from '../edge.js';
import {
  be11Edge,
  be13Edge,
  be24Edge,
  be25Edge,
  be26Edge,
  be49Edge,
  be50Edge,
} from './catalog-quantum.js';
import {
  be20Edge,
  be30Edge,
  be31Edge,
  be43Edge,
  be45Edge,
  be46Edge,
  be47Edge,
} from './catalog-gravitation-cosmology.js';
import {
  be17Edge,
  be18Edge,
  be36Edge,
  be38Edge,
  be39Edge,
  be41Edge,
} from './catalog-fields.js';
import {
  be15Edge,
  be22Edge,
  be23Edge,
  be27Edge,
  be33Edge,
  be34Edge,
} from './catalog-condensed-matter.js';

export {
  be11Edge,
  be13Edge,
  be24Edge,
  be25Edge,
  be26Edge,
  be49Edge,
  be50Edge,
} from './catalog-quantum.js';
export {
  be20Edge,
  be30Edge,
  be31Edge,
  be43Edge,
  be45Edge,
  be46Edge,
  be47Edge,
} from './catalog-gravitation-cosmology.js';
export {
  be17Edge,
  be18Edge,
  be36Edge,
  be38Edge,
  be39Edge,
  be41Edge,
} from './catalog-fields.js';
export {
  be15Edge,
  be22Edge,
  be23Edge,
  be27Edge,
  be33Edge,
  be34Edge,
} from './catalog-condensed-matter.js';

/**
 * All catalog-full edges, in catalog-id order. Convenience array for the
 * drift-guard test and downstream graph assembly. @public
 */
export const CATALOG_FULL_EDGES: readonly BridgeEdge[] = [
  be11Edge,
  be13Edge,
  be15Edge,
  be17Edge,
  be18Edge,
  be20Edge,
  be22Edge,
  be23Edge,
  be24Edge,
  be25Edge,
  be26Edge,
  be27Edge,
  be30Edge,
  be31Edge,
  be33Edge,
  be34Edge,
  be36Edge,
  be38Edge,
  be39Edge,
  be41Edge,
  be43Edge,
  be45Edge,
  be46Edge,
  be47Edge,
  be49Edge,
  be50Edge,
];
