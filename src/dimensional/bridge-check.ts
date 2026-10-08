/**
 * Expected catalog dimensions, projected from the catalog record.
 * A mismatch between a parsed expression and that record returns null.
 *
 * @module dimensional/bridge-check
 */

import { checkedDataFile } from '../core/data-file.js';
import type { Dimension } from './types.js';
import { equals } from './algebra.js';
import type { ExprNode } from './validator.js';
import { validate } from './validator.js';

interface CatalogDimensionFile {
  readonly entries: readonly { readonly id: number; readonly dimension?: Dimension }[];
}

function loadExpected(): ReadonlyMap<number, Dimension> {
  // The same checked read as `bridges/catalog-load.ts`; this layer cannot import that module.
  const parsed = checkedDataFile('bridge-catalog.json') as CatalogDimensionFile;
  const map = new Map<number, Dimension>();
  for (const entry of parsed.entries) {
    if (entry.dimension !== undefined) map.set(entry.id, entry.dimension);
  }
  return map;
}

/** Catalog id → dimension recorded on that row. */
export const EXPECTED_DIMENSION_BY_BRIDGE: ReadonlyMap<number, Dimension> = loadExpected();

/**
 * Infer the SI dimension of a bridge expression and cross-check it against
 * the catalog record when that record declares one.
 *
 * @returns The inferred dimension, or `null` when the expression is
 *          dimensionally inconsistent or disagrees with the catalog record.
 */
export function inferDimensionForBridge(
  bridgeId: number,
  expr: ExprNode,
): Dimension | null {
  const r = validate(expr);
  if (!r.ok || r.inferredDimension === null) return null;
  const expected = EXPECTED_DIMENSION_BY_BRIDGE.get(bridgeId);
  if (expected !== undefined && !equals(r.inferredDimension, expected)) {
    return null;
  }
  return r.inferredDimension;
}
