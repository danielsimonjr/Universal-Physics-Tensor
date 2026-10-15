/**
 * One owner for the scalar-leaf walk of an `ExprNode` and the literal rule.
 *
 * Thirteen walks over the leaves and six spellings of "is this name a number"
 * once lived in the funnel, the probe and the canonical layer, and they
 * disagreed on the edges: one accepted `0x2`, one rejected `1e3`, and several
 * accepted the empty string (`Number('')` is `0`). The rule here is the
 * validator's decimal-literal grammar, so a formula is read the same way
 * everywhere it is read.
 *
 * The walker descends into `op` arguments always. Every other arm is opted
 * into by the caller through {@link LeafWalkArms}, because the callers it
 * replaced did not agree on which arms they walked (the evaluator reads
 * `transcendental` and `abs`; the simplifier reads an integral's measure and
 * integrand but not its bounds), and the behaviour of each is kept by passing
 * its own set.
 *
 * @module dimensional/ast-leaves
 */

import type { ExprNode } from './ast-types.js';

/** A scalar leaf: a symbol with its dimension. @internal */
export type ScalarLeaf = Extract<ExprNode, { kind: 'symbol' }>;

/**
 * The decimal-literal grammar: an optional sign, digits with an optional
 * fraction (or a bare fraction), and an optional exponent. `1e3` and `2.` are
 * literals; `0x2`, `Infinity` and the empty string are not. This is the
 * validator's rule for a literal exponent.
 *
 * @internal
 */
export const DECIMAL_LITERAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/** True when `name` is a decimal literal under {@link DECIMAL_LITERAL}. @internal */
export function isDecimalLiteral(name: string): boolean {
  return DECIMAL_LITERAL.test(name);
}

/**
 * The number a decimal-literal symbol names, or `undefined` for any other
 * node. The dimension stored on the symbol is not read: a caller that needs
 * the literal to be dimensionless checks that itself.
 *
 * @internal
 */
export function literalValue(node: ExprNode): number | undefined {
  if (node.kind !== 'symbol' || !isDecimalLiteral(node.name)) return undefined;
  return Number(node.name);
}

/**
 * Which non-`op` arms a walk descends into. `op` arguments are always walked.
 * An arm left out is not entered, and its leaves are not visited.
 *
 * @internal
 */
export interface LeafWalkArms {
  /** `exp`, `ln`, the trigonometric functions: their argument. */
  readonly transcendental?: boolean;
  /** `abs`: its argument. */
  readonly abs?: boolean;
  /** `dirac-delta`: its argument. */
  readonly diracDelta?: boolean;
  /** `integral`: the measure and the integrand, or those and both bounds. */
  readonly integral?: 'over+integrand' | 'all';
  /** `derivative`: `of` and `wrt`. */
  readonly derivative?: boolean;
  /** `variational-derivative`: the functional, the field and the measure. */
  readonly variationalDerivative?: boolean;
  /** `tensor-product`: its arguments. */
  readonly tensorProduct?: boolean;
}

/** The children a walk enters under `arms`, in source order. */
function walkedChildren(node: ExprNode, arms: LeafWalkArms): readonly ExprNode[] {
  switch (node.kind) {
    case 'op':
      return node.args;
    case 'transcendental':
      return arms.transcendental ? [node.arg] : [];
    case 'abs':
      return arms.abs ? [node.arg] : [];
    case 'dirac-delta':
      return arms.diracDelta ? [node.arg] : [];
    case 'integral':
      if (arms.integral === undefined) return [];
      if (arms.integral === 'over+integrand') return [node.over, node.integrand];
      return [
        node.over,
        node.integrand,
        ...(node.lower === undefined ? [] : [node.lower]),
        ...(node.upper === undefined ? [] : [node.upper]),
      ];
    case 'derivative':
      return arms.derivative ? [node.of, node.wrt] : [];
    case 'variational-derivative':
      return arms.variationalDerivative ? [node.functional, node.field, node.over] : [];
    case 'tensor-product':
      return arms.tensorProduct ? node.args : [];
    default:
      return [];
  }
}

/**
 * Visit every scalar leaf of `node` reachable through `op` arguments and the
 * arms in `arms`, in source order. A leaf is visited once per occurrence.
 *
 * @internal
 */
export function forEachScalarLeaf(
  node: ExprNode,
  visit: (leaf: ScalarLeaf) => void,
  arms: LeafWalkArms,
): void {
  if (node.kind === 'symbol') {
    visit(node);
    return;
  }
  for (const child of walkedChildren(node, arms)) forEachScalarLeaf(child, visit, arms);
}

/** Rebuild `node` with the walked children replaced, keeping the node when none changed. */
function rebuild(node: ExprNode, arms: LeafWalkArms, children: readonly ExprNode[]): ExprNode {
  switch (node.kind) {
    case 'op':
      return { ...node, args: [...children] };
    case 'transcendental':
    case 'abs':
    case 'dirac-delta':
      return { ...node, arg: children[0]! };
    case 'integral': {
      if (arms.integral === 'over+integrand') return { ...node, over: children[0]!, integrand: children[1]! };
      let i = 2;
      const lower = node.lower === undefined ? undefined : children[i++];
      const upper = node.upper === undefined ? undefined : children[i++];
      return {
        ...node,
        over: children[0]!,
        integrand: children[1]!,
        ...(lower === undefined ? {} : { lower }),
        ...(upper === undefined ? {} : { upper }),
      };
    }
    case 'derivative':
      return { ...node, of: children[0]!, wrt: children[1]! };
    case 'variational-derivative':
      return { ...node, functional: children[0]!, field: children[1]!, over: children[2]! };
    case 'tensor-product':
      return { ...node, args: [...children] };
    default:
      return node;
  }
}

/**
 * Replace each scalar leaf reachable under `arms` by `f(leaf)`. A subtree in
 * which no leaf changed is returned by reference, so an arm the walk did not
 * enter, and an unchanged tree, are the same objects the caller passed.
 *
 * @internal
 */
export function mapScalarLeaves(
  node: ExprNode,
  f: (leaf: ScalarLeaf) => ExprNode,
  arms: LeafWalkArms,
): ExprNode {
  if (node.kind === 'symbol') return f(node);
  const children = walkedChildren(node, arms);
  if (children.length === 0) return node;
  let changed = false;
  const mapped = children.map((child) => {
    const next = mapScalarLeaves(child, f, arms);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? rebuild(node, arms, mapped) : node;
}
