/**
 * Right-hand side of each catalog id that has a relation, projected from
 * that relation's expression.
 *
 * @module bridges/rhs-registry
 */

import type { ExprNode } from '../dimensional/ast-types.js';
import { catalogEntries, parseBridgeId, primaryRelation } from './catalog-load.js';
import { parseCatalogExpression } from './expr-parse.js';

/** Parse `42`, `be-42`, or `BE-42` into a catalog id. This module re-exports the only parser. */
export { parseBridgeId };

/** Catalog id → expression tree of its primary relation. */
export const BRIDGE_RHS_BY_ID: ReadonlyMap<number, ExprNode> = new Map(
  catalogEntries().flatMap((entry) => {
    const expression = primaryRelation(entry.id)?.expression ?? entry.scalarExpression;
    if (expression === undefined) return [];
    return [[entry.id, parseCatalogExpression(expression)] as const];
  }),
);
