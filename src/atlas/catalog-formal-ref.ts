/**
 * Catalog formal references, keyed by bridge id.
 *
 * These used to be `formalRef: physjsFormalRef('be-N')` on the catalog
 * rows in `src/bridges/index.ts`. That import was an upward edge. The
 * catalog row does not keep a second copy. A reader that needs the
 * reference calls {@link catalogFormalRef}.
 *
 * The reference is built by `physjsFormalRef`, so kind, url, and covers
 * are the manifest's, not a hand copy. An id this map does not contain
 * resolves to no reference. Evidence tags stay derived: this module
 * does not store a tag.
 *
 * @module atlas/catalog-formal-ref
 */

import type { FormalRef } from '../relations/types.js';
import { physjsFormalRef } from './physjs-ref.js';

/**
 * Catalog ids that had a `physjsFormalRef` call on the bridge row.
 * File order of those calls. `be-20` is absent: its Friedmann corollary
 * stays nested on `be-13`.
 */
const CATALOG_FORMAL_REF_IDS = [
  11, 12, 13, 14, 15, 16, 17, 19, 21, 22, 24, 27, 28, 29, 30, 32, 33, 34, 35, 37, 38, 40, 42, 43,
  50, 51, 54, 53, 55, 58, 59, 60, 61, 63, 64, 65, 66, 67, 68,
] as const;

const BY_ID: ReadonlyMap<number, FormalRef> = new Map(
  CATALOG_FORMAL_REF_IDS.map((id) => [id, physjsFormalRef(`be-${id}`)]),
);

/**
 * The reviewed PhysJS reference for a catalog id, or `undefined` when
 * this overlay has none.
 *
 * @internal
 */
export function catalogFormalRef(id: number): FormalRef | undefined {
  return BY_ID.get(id);
}
