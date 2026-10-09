/**
 * Tiny pure builders for dimensional ASTs — `sym` (a symbol leaf) and `dim`
 * (a `Dimension` from its first five base exponents). These were copy-pasted
 * across the bridge-equation helpers, the canonical L1 builder, the
 * composition layer, and the formula transpiler; this module is their single
 * source of truth.
 *
 * Deliberately depends only on TYPES (`ExprNode`, `Dimension`), so it has no
 * runtime imports and can be imported from any layer without risking a cycle.
 * `_be-helpers` and `_l1-build` re-export `sym`/`dim` for their existing
 * importers, so most call sites are unchanged.
 *
 * @module dimensional/ast-builders
 */

import type { ExprNode } from './validator.js';
import type { Dimension } from './types.js';

/** A symbol-leaf `ExprNode` carrying its name and SI dimension. */
export function sym(name: string, dim: Dimension): ExprNode {
  return { kind: 'symbol', name, dim };
}

/**
 * Build a `Dimension` from its base exponents. Arg order is
 * (L, M, T, **I**, **Θ**, N, J) — note I precedes Θ; every omitted exponent
 * is 0, so the amount-of-substance (N) and luminous-intensity (J) exponents
 * are reachable from the one builder.
 */
export function dim(L = 0, M = 0, T = 0, I = 0, Theta = 0, N = 0, J = 0): Dimension {
  return { L, M, T, I, Theta, N, J };
}
