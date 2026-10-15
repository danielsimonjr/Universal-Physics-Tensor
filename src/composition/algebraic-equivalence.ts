/**
 * Equality of two scalar expressions up to a dimensionless constant, decided
 * by MathTS `simplify` (proposal 2).
 *
 * `normalForm` is the cheap structural key: it flattens products and drops
 * dimensionless constants, but `a/(b/c)` and `a·c/b`, or `a·a` and `a²`, hash
 * differently, and a chain that recovers a known law in another spelling was
 * filed as provisional. This module answers the question the hash cannot: it
 * renders both sides to the gensym string `expr-simplify.ts` uses (one gensym
 * per leaf NAME, shared by both sides, so the same leaf cancels; a
 * dimensionless registered constant becomes its number, as the hash drops
 * it), asks `simplify` for `(A)/(B)`, and reads a constant node as "equal up
 * to that constant". Anything else, a symbol left over, an arm the renderer
 * does not carry, a throw inside the simplifier, is NOT SHOWN EQUAL: a
 * negative answer here is an absence of proof, never a proof of difference.
 *
 * MathTS `symbolicEqual` is not used. Before `@danielsimonjr/mathts-functions`
 * 0.68.4 it passed an empty rule list and compared every pair false; from
 * 0.68.4 it simplifies with the default rules, and it is the same simplifier
 * this step calls, so it would be the same method, not a second one.
 *
 * The first use runs inside the one console-silencing window
 * `mathts-quiet.ts` describes, as `mathts-scalar-symbols.ts` does for its
 * first parse; every later call runs with the console untouched.
 *
 * @module composition/algebraic-equivalence
 */

import { parse as mathtsParse, simplify as mathtsSimplify } from '@danielsimonjr/mathts-functions';
import type { ExprNode } from '../dimensional/validator.js';
import { mapScalarLeaves } from '../dimensional/ast-leaves.js';
import { equals } from '../dimensional/algebra.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import { CONSTANTS, isRegisteredConstant, piMultipleValue } from '../dimensional/symbolic-constants.js';
import { renderGensym, type LeafMeta } from './expr-simplify.js';
import { quietlySync } from './mathts-quiet.js';

/** The outcome: equal with the constant `A/B`, or not shown equal. @internal */
export type AlgebraicEquivalence = { readonly equal: true; readonly constant: number } | { readonly equal: false };

/** The bits of a simplified MathTS node this module reads. */
interface MathNode {
  readonly type?: string;
  readonly isConstantNode?: boolean;
  readonly value?: unknown;
}

interface Simplifier {
  (text: string): MathNode;
}

const NOT_EQUAL: AlgebraicEquivalence = { equal: false };

let cached: Simplifier | null | undefined;

/**
 * `simplify ∘ parse`, bound once, after a smoke test that it CANCELS
 * (`(g0*g1)/(g1*g0)` must come back as the constant 1). A simplifier that
 * fails the smoke is `null`, and every answer is then "not shown equal".
 */
function simplifier(): Simplifier | null {
  if (cached !== undefined) return cached;
  cached = quietlySync(() => {
    try {
      const run: Simplifier = (text) => mathtsSimplify(mathtsParse(text)) as unknown as MathNode;
      const smoke = run('(g0*g1)/(g1*g0)');
      return isConstant(smoke) && smoke.value === 1 ? run : null;
    } catch {
      return null;
    }
  });
  return cached;
}

/** A finite numeric constant node. */
function isConstant(node: MathNode): node is MathNode & { readonly value: number } {
  return (
    (node.isConstantNode === true || node.type === 'ConstantNode') &&
    typeof node.value === 'number' &&
    Number.isFinite(node.value)
  );
}

/**
 * The number a dimensionless leaf stands for when `normalForm` would drop it
 * as a constant: a registered dimensionless constant, a spelled multiple of
 * π, or BE-16's `ln_2_constant`. Undefined for every other leaf.
 */
function droppableConstantValue(name: string): number | undefined {
  if (name === 'ln_2_constant') return Math.LN2;
  if (isRegisteredConstant(name)) {
    const c = CONSTANTS[name]!;
    return equals(c.dim, DIMENSIONLESS) ? c.value : undefined;
  }
  return piMultipleValue(name);
}

/** Dimensionless named constants become literals, so the ratio of two forms that differ by one is a number. */
function constantsAsLiterals(expr: ExprNode): ExprNode {
  return mapScalarLeaves(
    expr,
    (leaf) => {
      const value = droppableConstantValue(leaf.name);
      return value === undefined ? leaf : { kind: 'symbol', name: String(value), dim: DIMENSIONLESS };
    },
    {},
  );
}

/**
 * Whether `a` and `b` are equal up to a dimensionless constant, and that
 * constant (`a/b`). See the module docs for what a negative answer means.
 *
 * @internal
 */
export function equalUpToConstant(a: ExprNode, b: ExprNode): AlgebraicEquivalence {
  const run = simplifier();
  if (run === null) return NOT_EQUAL;
  const gensymOf = new Map<string, string>();
  const meta = new Map<string, LeafMeta>();
  let text: string;
  try {
    // One gensym table for both sides: the same leaf name is the same symbol.
    const left = renderGensym(constantsAsLiterals(a), gensymOf, meta);
    const right = renderGensym(constantsAsLiterals(b), gensymOf, meta);
    text = `(${left})/(${right})`;
  } catch {
    return NOT_EQUAL; // an arm the renderer does not carry
  }
  let node: MathNode;
  try {
    node = run(text);
  } catch {
    return NOT_EQUAL; // the simplifier threw: not shown equal
  }
  return isConstant(node) ? { equal: true, constant: node.value } : NOT_EQUAL;
}
