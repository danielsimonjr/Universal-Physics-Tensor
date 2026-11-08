/**
 * Exact bridge-gradients over the symbolic RHS AST.
 *
 * The catalog's plain-JS evaluators cannot be differentiated by AD (they run
 * raw `Math.*` arithmetic and return a number, which carries no tape; see
 * `bridge-gradient.ts`). But each bridge also carries a faithful symbolic
 * encoding of its RHS (`*_RHS: ExprNode`). This module lowers that scalar AST
 * with the MathTS scalar builder and differentiates it with MathTS
 * `compileScalarGradient`: the chosen variable is the one parameter, and every
 * other symbol is a constant. The result is the EXACT derivative (machine
 * precision); the plain-JS evaluators stay untouched (P8 Decision #1).
 *
 * Scope: the scalar grammar is `symbol` + `op(+ − * / ^)` + `transcendental` +
 * `abs`. A bridge encoded with a typed stub differentiates with respect to the
 * stub, not the physics inside it; fully-expanded encodings (e.g. BE-42
 * `ℏc³/(8πGM·k_B)`) differentiate exactly. A `^` exponent must be constant: a
 * UPT pre-check refuses the differentiation variable in an exponent before
 * MathTS sees the tree.
 *
 * A point where the value overflows gives `NaN` for the value and the
 * gradient (MathTS marks the row invalid), not `±Infinity`.
 *
 * @module diff/bridge-ast-gradient
 */

import { ScalarBuildError } from '@danielsimonjr/mathts-expression';
import { compileScalarGradient } from '@danielsimonjr/mathts-functions';
import type { ExprNode } from '../dimensional/validator.js';
import { forEachScalarLeaf, isDecimalLiteral } from '../dimensional/ast-leaves.js';
import { constantScope } from '../dimensional/symbolic-constants.js';
import { toScalarNode } from '../dimensional/scalar-lowering.js';
import { BRIDGE_RHS_BY_ID, parseBridgeId } from '../bridges/rhs-registry.js';

/**
 * Result of {@link bridgeGradientAST}: the bridge's scalar `value` at the
 * supplied point and the exact `gradient` d(value)/d(varName).
 *
 * @public
 */
export interface ASTGradientResult {
  readonly value: number;
  readonly gradient: number;
}

/**
 * Named physical constants the bridge encodings reference as bare symbols:
 * every registered spelling, from the constant registry, plus π and its
 * registered multiples, so the AST evaluates to the SAME number as the
 * numeric evaluator. Callers can override or extend via the `bindings` argument.
 */
const NAMED_CONSTANTS: Readonly<Record<string, number>> = constantScope();

/** Resolve a symbol's numeric value: caller bindings → named constants → numeric literal. */
function resolveConstant(
  name: string,
  bindings: Record<string, number>,
): number {
  if (Object.hasOwn(bindings, name))
    return bindings[name];
  if (Object.hasOwn(NAMED_CONSTANTS, name))
    return NAMED_CONSTANTS[name];
  const asNumber = Number(name);
  if (name.trim() !== '' && Number.isFinite(asNumber)) return asNumber;
  throw new TypeError(
    `bridgeGradientAST: unknown symbol '${name}' — not a binding, a named constant ` +
      `(${Object.keys(NAMED_CONSTANTS).join(', ')}), or a numeric literal. Supply it in bindings.`,
  );
}

/** Resolve a `^` exponent to a numeric constant expression.
 *
 * The exponent may contain scalar arithmetic over constants/bindings (for
 * example `-1/z`) as long as it is independent of the differentiation
 * variable. UPT keeps the constant-power contract, so the differentiation
 * variable in an exponent is refused before MathTS reads the tree.
 */
function resolveExponent(
  node: ExprNode,
  varName: string,
  bindings: Record<string, number>,
): number {
  if (node.kind === 'symbol') {
    if (node.name === varName) {
      throw new TypeError(
        `bridgeGradientAST: differentiation variable '${varName}' appears as an exponent — ` +
          `variable exponents are not supported (only constant powers).`,
      );
    }
    return resolveConstant(node.name, bindings);
  }
  if (node.kind === 'op') {
    const values = node.args.map((arg) => resolveExponent(arg, varName, bindings));
    if (values.length === 0) {
      throw new TypeError(`bridgeGradientAST: '${node.op}' exponent expression has no operands.`);
    }
    switch (node.op) {
      case '+': return values.reduce((a, b) => a + b);
      case '-': return values.length === 1 ? -values[0] : values.slice(1).reduce((a, b) => a - b, values[0]);
      case '*': return values.reduce((a, b) => a * b);
      case '/': return values.slice(1).reduce((a, b) => a / b, values[0]);
      case '^': return values.slice(1).reduce((a, b) => a ** b, values[0]);
    }
  }
  throw new TypeError(
    `bridgeGradientAST: '^' exponent must be a constant scalar expression, got node kind '${node.kind}'.`,
  );
}

/**
 * Refuse the differentiation variable in any `^` exponent, and check that every
 * exponent is a constant scalar expression. MathTS would differentiate a
 * variable exponent; UPT keeps the constant-power contract.
 */
function checkExponents(node: ExprNode, varName: string, bindings: Record<string, number>): void {
  if (node.kind === 'op') {
    if (node.op === '^' && node.args.length === 2) resolveExponent(node.args[1], varName, bindings);
    for (const arg of node.args) checkExponents(arg, varName, bindings);
  } else if (node.kind === 'transcendental' || node.kind === 'abs') {
    checkExponents(node.arg, varName, bindings);
  }
}

/**
 * Differentiate a scalar bridge RHS AST with respect to one symbol through
 * MathTS `compileScalarGradient`. Every symbol other than `varName` is resolved
 * to a constant (caller `bindings`, then {@link NAMED_CONSTANTS}, then numeric
 * literal); the `bindings` must contain `varName` (its value sets the point of
 * evaluation).
 *
 * @throws TypeError when `varName` is not bound, a symbol cannot be resolved,
 * `varName` appears in an exponent, or a node kind is outside the scalar grammar.
 * @public
 */
export function bridgeGradientAST(
  rhs: ExprNode,
  varName: string,
  bindings: Record<string, number>,
): ASTGradientResult {
  if (!Object.hasOwn(bindings, varName)) {
    throw new TypeError(
      `bridgeGradientAST: bindings must contain the differentiation variable '${varName}'.`,
    );
  }
  checkExponents(rhs, varName, bindings);

  let lowered: ReturnType<typeof toScalarNode>;
  try {
    lowered = toScalarNode(rhs);
  } catch (err) {
    if (!(err instanceof ScalarBuildError)) throw err;
    throw new TypeError(
      `bridgeGradientAST: unsupported node kind — ${err.message}. The differentiable grammar is ` +
        `symbol + op(+ − * / ^) + transcendental + abs. Other encodings (tensor/curvature, integrals, ` +
        `or physics hidden in a typed-stub symbol) are not exactly differentiable.`,
    );  }

  const constants: Record<string, number> = {};
  forEachScalarLeaf(
    rhs,
    (leaf) => {
      if (leaf.name === varName) return;
      // A literal spelling stays MathTS's literal unless the caller bound that name.
      if (isDecimalLiteral(leaf.name) && !Object.hasOwn(bindings, leaf.name)) return;
      constants[leaf.name] = resolveConstant(leaf.name, bindings);
    },
    { transcendental: true, abs: true },
  );

  const compiled = compileScalarGradient(lowered, { variables: [], parameters: [varName], constants });
  const { values, grad } = compiled.evaluate([], [bindings[varName]]);
  return { value: values[0]!, gradient: grad[0]! };
}

/**
 * Convenience wrapper around {@link bridgeGradientAST} that looks the RHS AST up
 * by catalog bridge id. `bridgeId` accepts a number, `'42'`, or `'BE-42'`.
 *
 * Throws if the id has no encoded RHS in {@link BRIDGE_RHS_BY_ID} (e.g. BE-51/52,
 * which are closed-form evaluators without an AST). If the bridge's RHS is not in
 * the differentiable scalar grammar (a tensor, integral or curvature encoding), the
 * delegated `bridgeGradientAST` throws the "unsupported node kind" error — use
 * {@link astDifferentiableBridgeIds} to discover which ids are AD-eligible.
 *
 * @public
 */
export function bridgeGradientASTById(
  bridgeId: number | string,
  varName: string,
  bindings: Record<string, number>
): ASTGradientResult {
  const id = parseBridgeId(bridgeId);
  const rhs = BRIDGE_RHS_BY_ID.get(id);
  if (rhs === undefined) {
    throw new TypeError(
      `bridgeGradientASTById: BE-${id} has no encoded RHS AST in the registry ` +
        `(BE-51/52 are closed-form; ${BRIDGE_RHS_BY_ID.size} bridges have an encoded AST).`
    );
  }
  return bridgeGradientAST(rhs, varName, bindings);
}

/** Whether an AST consists solely of the differentiable scalar grammar (symbol + op(+ − * / ^) + transcendental + abs). */
function isDifferentiableScalarAST(node: ExprNode): boolean {
  if (node.kind === 'symbol') return true;
  if (node.kind === 'op') {
    if (!['+', '-', '*', '/', '^'].includes(node.op)) return false;
    return node.args.every(isDifferentiableScalarAST);
  }
  if (node.kind === 'transcendental' || node.kind === 'abs') return isDifferentiableScalarAST(node.arg);
  return false;
}

/**
 * The catalog bridge ids whose encoded RHS lies entirely in the differentiable
 * scalar grammar. `bridgeGradientASTById` differentiates each of them exactly
 * with respect to any variable that is not in an exponent; a variable in an
 * exponent is refused (`checkExponents`).
 * Bridges encoded with tensor, integral or curvature nodes (or whose physics is
 * hidden behind a typed-stub symbol) are excluded from EXACT differentiation
 * (a stub still differentiates w.r.t. the stub symbol, but not the physics
 * inside it). Returned sorted ascending.
 *
 * @public
 */
export function astDifferentiableBridgeIds(): number[] {
  const ids: number[] = [];
  for (const [id, rhs] of BRIDGE_RHS_BY_ID) {
    if (isDifferentiableScalarAST(rhs)) ids.push(id);
  }
  return ids.sort((a, b) => a - b);
}
