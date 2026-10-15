/**
 * Single-unknown dimensional inference.
 *
 * Given a parsed scalar `ExprNode` (e.g. the RHS of a user equation) in which
 * exactly one symbol's dimension is unknown, and the known dimension the whole
 * expression must equal (the target), recover the unknown's dimension from
 * dimensional homogeneity — or abstain (`null`) when it is not uniquely pinned
 * (the unknown is sum-constrained, absent, or appears non-cleanly).
 *
 * Method (no symbolic differentiation): probe the unknown with two dimensions
 * and read off its net power. With the unknown set to `DIMENSIONLESS` the
 * expression has dimension `D0`; set to `LENGTH` it has `D1`. The unknown enters
 * the dimension as a single power `p`, so `D1 / D0 = LENGTH^p`; if that quotient
 * is a clean power of the probe (only the `L` component nonzero), then from
 * `target = D0 · unknown^p` we get `unknown = (target / D0)^(1/p)`. Pure; reuses
 * the dimensional `algebra`.
 *
 * @module dimensional/dimension-inference
 */

import type { Dimension } from './types.js';
import { DIMENSIONLESS, LENGTH } from './types.js';
import { BASES, divide, power, EXPONENT_TOL } from './algebra.js';
import type { ExprNode } from './validator.js';
import { validate } from './validator.js';

/**
 * Rebuild `node`, replacing the dimension of every `symbol` named `name` with
 * `dim`. Walks the scalar arms (`symbol`/`op`/`transcendental`/`abs`); other
 * arms are returned unchanged (they do not occur in parsed scalar expressions).
 *
 * @public
 */
export function substituteSymbolDim(node: ExprNode, name: string, dim: Dimension): ExprNode {
  switch (node.kind) {
    case 'symbol':
      return node.name === name ? { ...node, dim } : node;
    case 'op':
      return { ...node, args: node.args.map((a) => substituteSymbolDim(a, name, dim)) };
    case 'transcendental':
      return { ...node, arg: substituteSymbolDim(node.arg, name, dim) };
    case 'abs':
      return { ...node, arg: substituteSymbolDim(node.arg, name, dim) };
    default:
      return node;
  }
}

/** Homogeneous dimension of `node`, or `null` if it is not well-formed. */
function dimensionOrNull(node: ExprNode): Dimension | null {
  const r = validate(node);
  return r.ok && r.inferredDimension !== null ? r.inferredDimension : null;
}

/**
 * Infer the dimension of `unknown` in `expr` such that `expr` has dimension
 * `targetDim`, or `null` when it is not uniquely determined.
 *
 * @public
 */
export function inferUnknownDimension(
  expr: ExprNode,
  unknown: string,
  targetDim: Dimension,
): Dimension | null {
  const d0 = dimensionOrNull(substituteSymbolDim(expr, unknown, DIMENSIONLESS));
  const d1 = dimensionOrNull(substituteSymbolDim(expr, unknown, LENGTH));
  if (d0 === null || d1 === null) return null;

  // D1 / D0 must be a clean power of the probe (LENGTH): only the L exponent.
  const quotient = divide(d1, d0);
  const p = quotient.L;
  if (p === 0) return null; // the unknown does not affect the dimension
  for (const base of BASES) {
    if (base !== 'L' && quotient[base] !== 0) return null; // not a clean power
  }
  const result = power(divide(targetDim, d0), 1 / p);
  // Snap each exponent to its nearest integer within tolerance, then abstain if
  // any is GENUINELY fractional (e.g. x^2 = [length] ⟹ [length]^½ is not a real
  // physical dimension). The tolerance absorbs FP round-off that arrives in the
  // target from a v0.20 fractional-power computation, so a real integer answer
  // (L = 2 + ε) is not spuriously rejected — consistent with `equals` (bb15432).
  const snapped = { ...result };
  for (const base of BASES) {
    const rounded = Math.round(result[base]);
    if (Math.abs(result[base] - rounded) > EXPONENT_TOL) return null;
    snapped[base] = rounded;
  }
  return snapped;
}
