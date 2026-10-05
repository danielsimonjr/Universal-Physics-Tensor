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
import { PHYSJS_ENTRIES } from './physjs-entries.generated.js';
import { physjsFormalRef } from './physjs-ref.js';

/**
 * Catalog ids whose generated manifest key is `be-<id>`.
 * Derived from that table, so a new `be-*` key is not a second hand list.
 * `be-20` is absent: its Friedmann corollary stays nested on `be-13`.
 * The hand list that stopped at 102 is the record from before BE-103–125.
 */
const CATALOG_FORMAL_REF_IDS: readonly number[] = PHYSJS_ENTRIES.flatMap((entry) => {
  const match = /^be-(\d+)$/.exec(entry.key);
  return match === null ? [] : [Number(match[1])];
});

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
