/**
 * Bridge-membership criterion (v0.8.0 G-2) — the computable form.
 *
 * **Criterion:** *a bridge is an edge whose endpoint quantities differ
 * in at least one regime attribute; a law is an edge whose endpoints
 * share all stated regime attributes.* For graph edges this is
 * `regimesDiffer` (src/composition/quantity.ts). For catalog entries —
 * not yet graph-encoded — the `bridges: [a, b]` tuple is the proxy.
 *
 * Adjudication precedence (design r2-4): the negative catalog
 * (the `rejections` ledger of `data/bridge-catalog.json`, projected by
 * `rejected.ts`) overlays the tuple proxy — an id listed there is
 * `'not-a-bridge'` regardless of its tuple (the repo's
 * `['unknown','unknown']` convention historically marked NOT-A-BRIDGE
 * entries, so the tuple alone cannot distinguish "rejected" from
 * "never adjudicated"). Only after the overlay does an
 * `'unknown'`-containing tuple mean `'unadjudicated'`.
 *
 * @module bridges/membership
 */

import type { BridgeEquationEntry } from './index.js';
import { REJECTED_BRIDGE_ADJUDICATIONS, REJECTED_BRIDGE_IDS, type RejectedBridgeAdjudication } from './rejected.js';

/** Adjudication verdict for a catalog entry. @public */
export type BridgeVerdict = 'bridge' | 'not-a-bridge' | 'unadjudicated';

/**
 * Apply the membership criterion to one catalog entry (tuple proxy +
 * rejected-registry overlay).
 *
 * @public
 */
export function adjudicateBridgeEntry(entry: BridgeEquationEntry): BridgeVerdict {
  if (REJECTED_BRIDGE_IDS.has(entry.id)) return 'not-a-bridge';
  const [a, b] = entry.bridges;
  if (a === 'unknown' || b === 'unknown') return 'unadjudicated';
  return a === b ? 'not-a-bridge' : 'bridge';
}

/** Whole-catalog adjudication report. @public */
export interface CatalogAdjudicationReport {
  readonly bridges: ReadonlyArray<number>;
  readonly notABridges: ReadonlyArray<number>;
  readonly unadjudicated: ReadonlyArray<number>;
}

/**
 * Adjudicate every entry of a catalog under the membership criterion.
 *
 * @public
 */
export function adjudicateCatalog(
  catalog: ReadonlyArray<BridgeEquationEntry>,
): CatalogAdjudicationReport {
  const bridges: number[] = [];
  const notABridges: number[] = [];
  const unadjudicated: number[] = [];
  for (const entry of catalog) {
    const verdict = adjudicateBridgeEntry(entry);
    if (verdict === 'bridge') bridges.push(entry.id);
    else if (verdict === 'not-a-bridge') notABridges.push(entry.id);
    else unadjudicated.push(entry.id);
  }
  return { bridges, notABridges, unadjudicated };
}

// Re-exports: the negative catalog travels with the criterion it overlays.
export { REJECTED_BRIDGE_ADJUDICATIONS, REJECTED_BRIDGE_IDS };
export type { RejectedBridgeAdjudication };
