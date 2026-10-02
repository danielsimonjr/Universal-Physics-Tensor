/**
 * Catalog ids with a committed real-data confrontation.
 *
 * `DATA_CONFRONTED_IDS` is a sorted projection of `CONFRONTATIONS`.
 * `composition/bridge-analysis.ts` imports it in the allowed direction.
 * The coverage audit that scans `CATALOG_GRAPH` lives in
 * `composition/audit-coverage.ts`. This file does not import `composition/`.
 *
 * @module bridges/confrontation-coverage
 */

import { CONFRONTATIONS } from './confrontations.js';

/**
 * Catalog ids with a committed real-data confrontation — a SORTED
 * projection of the confrontation registry's keyset (single source of
 * truth; adding a `ConfrontationEntry` grows this set automatically).
 * Consumed by `composition/bridge-analysis.ts` for the scorecard's
 * data-confrontation flag.
 *
 * @internal
 */
export const DATA_CONFRONTED_IDS: ReadonlySet<number> = new Set(
  [...CONFRONTATIONS.keys()].sort((a, b) => a - b),
);
