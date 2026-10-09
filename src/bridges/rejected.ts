/**
 * Negative catalog — NOT-A-BRIDGE adjudications, projected from the
 * `rejections` ledger of `data/bridge-catalog.json`.
 *
 * Each record is the outcome of applying the graph-native membership
 * criterion (*a bridge is an edge whose endpoint quantities differ in at
 * least one regime attribute*) to a catalog row, with the physics reason and
 * a citation. Rejected rows REMAIN in `BRIDGE_EQUATIONS` (their formulas are
 * still valid physics); this projection is the adjudication overlay
 * `membership.ts` consumes — an id listed here reports `'not-a-bridge'`
 * regardless of its `bridges` tuple (design r2-4 precedence).
 *
 * @module bridges/rejected
 */

import { catalogRejections } from './catalog-load.js';

/** A NOT-A-BRIDGE adjudication record. @public */
export interface RejectedBridgeAdjudication {
  readonly beId: number;
  readonly name: string;
  readonly verdict: 'not-a-bridge';
  /** Why the endpoints do NOT differ in regime attributes. */
  readonly reason: string;
  readonly citation: string;
}

/**
 * The negative catalog, in ledger order. Adjudicated 2026-06-11 (v0.8.0
 * Phase 4); BE-42 was REVERSED to a bridge and BE-44/46/50 remain contested
 * (`docs/architecture/v0.8.0-catalog-adjudication.md`).
 *
 * @public
 */
export const REJECTED_BRIDGE_ADJUDICATIONS: ReadonlyArray<RejectedBridgeAdjudication> = catalogRejections().map(
  (row) => ({ beId: row.catalogId, name: row.name, verdict: 'not-a-bridge', reason: row.reason, citation: row.citation }),
);

/** The rejected ids as a Set, for overlay lookups. @public */
export const REJECTED_BRIDGE_IDS: ReadonlySet<number> = new Set(
  REJECTED_BRIDGE_ADJUDICATIONS.map((r) => r.beId),
);
