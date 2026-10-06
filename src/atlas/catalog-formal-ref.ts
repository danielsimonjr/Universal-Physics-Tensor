/**
 * Catalog formal references.
 *
 * The catalog row stores the manifest key. This module asks PhysJS for that
 * key. It does not parse an id out of text, and it does not store an evidence
 * tag.
 *
 * @module atlas/catalog-formal-ref
 */

import type { FormalRef } from '../relations/types.js';
import { catalogEntry } from '../bridges/catalog-load.js';
import { physjsFormalRef } from './physjs-ref.js';

/**
 * The reviewed PhysJS reference for a catalog id, or `undefined` when the
 * row records no manifest key.
 *
 * @internal
 */
export function catalogFormalRef(id: number): FormalRef | undefined {
  const key = catalogEntry(id)?.formalKey;
  if (key === undefined) return undefined;
  return physjsFormalRef(key);
}
