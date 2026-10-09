/**
 * Exact bridge-gradients via reverse-mode AD over the symbolic RHS AST.
 *
 * The catalog's plain-JS evaluators cannot be differentiated by AD (they run
 * raw `Math.*` arithmetic and return a number, which carries no tape; see
 * `bridge-gradient.ts`). But each bridge also carries a faithful symbolic
 * encoding of its RHS (`*_RHS: ExprNode`). This module lowers that scalar AST
 * through `@danielsimonjr/mathts-autograd`'s `TapedTensor` ops — binding the
 * chosen variable to a traced input and every other symbol to a constant tape
 * leaf — so `reverseGrad` returns the EXACT derivative (machine precision), with
 * the plain-JS evaluators left untouched (P8 Decision #1).
 *
 * Scope: the dimensional scalar grammar is `symbol` + `op(+ − * / ^)` (the
 * transcendentals of a bridge are absorbed into typed-stub *symbols*, so they
 * appear as opaque constants here). A bridge encoded with a typed stub therefore
 * differentiates with respect to the stub, not the physics inside it — faithful,
 * fully-expanded encodings (e.g. BE-42 `ℏc³/(8πGM·k_B)`) differentiate exactly.
 * `^` exponents must be constant (the differentiation variable may not appear in
 * an exponent).
 *
 * Loads `@danielsimonjr/mathts-autograd` at the call and throws
 * `EngineCapabilityError` when that import fails.
 *
 * @module diff/bridge-ast-gradient
 */

import type { ExprNode, TranscendentalFn } from '../dimensional/validator.js';
import { constantScope } from '../dimensional/symbolic-constants.js';
import { EngineCapabilityError } from '../numerical/errors.js';
import { BRIDGE_RHS_BY_ID, parseBridgeId } from '../bridges/rhs-registry.js';
import { GAUSS_LEGENDRE_16 } from '../numerical/quadrature.js';

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

// --- Structural views of the optional autograd/tensor peers (not full imports;
// the peers are absent during tsc, so we narrow the dynamic-import result). ---

type TapeHandle = unknown;

interface TapedScalar {
  readonly tape: TapeHandle;
  add(o: TapedScalar): TapedScalar;
  sub(o: TapedScalar): TapedScalar;
  mul(o: TapedScalar): TapedScalar;
  divide(o: TapedScalar): TapedScalar;
  scale(k: number): TapedScalar;
  pow(k: number): TapedScalar;
  exp(): TapedScalar;
  log(): TapedScalar;
  log2(): TapedScalar;
  log10(): TapedScalar;
  sin(): TapedScalar;
  cos(): TapedScalar;
  tan(): TapedScalar;
  sinh(): TapedScalar;
  cosh(): TapedScalar;
  tanh(): TapedScalar;
  abs(): TapedScalar;
}

/** Map a transcendental fn name to the TapedTensor method that traces it. */
function applyTranscendental(fn: TranscendentalFn, t: TapedScalar): TapedScalar {
  switch (fn) {
    case 'exp':
      return t.exp();
    case 'ln':
      return t.log();
    case 'log2':
      return t.log2();
    case 'log10':
      return t.log10();
    case 'sin':
      return t.sin();
    case 'cos':
      return t.cos();
    case 'tan':
      return t.tan();
    case 'sinh':
      return t.sinh();
    case 'cosh':
      return t.cosh();
    case 'tanh':
      return t.tanh();
  }
}

interface MathTSTensorLike {
  toNested(): unknown;
}

interface AutogradModuleLike {
  reverseGrad(
    fn: (x: TapedScalar) => TapedScalar,
    x: MathTSTensorLike,
    cotangent?: MathTSTensorLike,
  ): { value: MathTSTensorLike; gradient: MathTSTensorLike };
  TapedTensor: {
    fromTensorAsInput(t: MathTSTensorLike, tape: TapeHandle): TapedScalar;
  };
}

interface TensorModuleLike {
  Tensor: { fromNested(data: number, shape: number[]): MathTSTensorLike };
}

/**
 * Named physical constants the bridge encodings reference as bare symbols:
 * every registered spelling, from the constant registry, plus π and its
 * registered multiples, so a traced AST evaluates to the SAME number as the
 * numeric evaluator. Callers can override or extend via the `bindings` argument.
 */
const NAMED_CONSTANTS: Readonly<Record<string, number>> = constantScope();

/** Resolve a symbol's numeric value: caller bindings → named constants → numeric literal. */
function resolveConstant(
  name: string,
  bindings: Record<string, number>,
): number {
  if (Object.prototype.hasOwnProperty.call(bindings, name))
    return bindings[name];
  if (Object.prototype.hasOwnProperty.call(NAMED_CONSTANTS, name))
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
 * variable. Variable exponents require a traced `pow(base, exponent)` op,
 * which the current MathTS tape surface does not expose, so they are rejected
 * explicitly rather than being silently detached from AD.
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
 * Differentiate a scalar bridge RHS AST with respect to one symbol via
 * reverse-mode AD. Every symbol other than `varName` is resolved to a constant
 * (caller `bindings`, then {@link NAMED_CONSTANTS}, then numeric literal); the
 * `bindings` must contain `varName` (its value sets the point of evaluation).
 *
 * @public
 */
export async function bridgeGradientAST(
  rhs: ExprNode,
  varName: string,
  bindings: Record<string, number>,
): Promise<ASTGradientResult> {
  if (!Object.prototype.hasOwnProperty.call(bindings, varName)) {
    throw new TypeError(
      `bridgeGradientAST: bindings must contain the differentiation variable '${varName}'.`,
    );
  }

  let autograd: AutogradModuleLike;
  let tensorMod: TensorModuleLike;
  try {
    // The two modules are typed by the structural views above (the members
    // this lowering calls: reverseGrad, TapedTensor, Tensor.fromNested …).
    // The casts state that those members exist on the imported modules, which
    // their own type declarations guarantee; the full MathTS types are not
    // imported so this file compiles without the autograd types at hand.
    autograd =
      (await import('@danielsimonjr/mathts-autograd')) as unknown as AutogradModuleLike;
    tensorMod =
      (await import('@danielsimonjr/mathts-tensor')) as unknown as TensorModuleLike;
  } catch {
    throw new EngineCapabilityError('mathts-autograd', 'reverseGrad');
  }
  const { reverseGrad, TapedTensor } = autograd;
  const { Tensor } = tensorMod;

  // Build the (traced var) → scalar function reverseGrad expects. `x` arrives as
  // a TapedTensor; constants become extra tape leaves (their gradients are
  // computed and ignored — only `x`'s gradient is returned).
  const fn = (x: TapedScalar): TapedScalar => {
    const constLeaf = (v: number): TapedScalar =>
      TapedTensor.fromTensorAsInput(Tensor.fromNested(v, []), x.tape);

    // `boundVars` maps an integration variable name to its current (traced)
    // quadrature point; it is checked BEFORE the diff-var / constants so an
    // integration variable correctly shadows an outer symbol of the same name.
    const walk = (node: ExprNode, boundVars: ReadonlyMap<string, TapedScalar>): TapedScalar => {
      if (node.kind === 'symbol') {
        const bound = boundVars.get(node.name);
        if (bound !== undefined) return bound;
        return node.name === varName
          ? x
          : constLeaf(resolveConstant(node.name, bindings));
      }
      if (node.kind === 'op') {
        switch (node.op) {
          case '+':
            return node.args.map((a) => walk(a, boundVars)).reduce((a, b) => a.add(b));
          case '-': {
            const terms = node.args.map((a) => walk(a, boundVars));
            // Unary minus (0 − t); n-ary subtract folds left.
            return terms.length === 1
              ? constLeaf(0).sub(terms[0])
              : terms.reduce((a, b) => a.sub(b));
          }
          case '*':
            return node.args.map((a) => walk(a, boundVars)).reduce((a, b) => a.mul(b));
          case '/':
            return node.args.map((a) => walk(a, boundVars)).reduce((a, b) => a.divide(b));
          case '^':
            return walk(node.args[0], boundVars).pow(
              resolveExponent(node.args[1], varName, bindings),
            );
          default:
            throw new TypeError(
              `bridgeGradientAST: unsupported operator '${node.op}'.`,
            );
        }
      }
      if (node.kind === 'transcendental') {
        return applyTranscendental(node.fn, walk(node.arg, boundVars));
      }
      if (node.kind === 'abs') {
        return walk(node.arg, boundVars).abs();
      }
      if (node.kind === 'integral') {
        // Definite integral via 16-point Gauss–Legendre quadrature, built from
        // traced ops so reverse-mode AD yields the gradient w.r.t. integrand
        // parameters (Leibniz: ∫ ∂f/∂θ) and w.r.t. bounds (∂Q/∂b ≈ f(b)).
        // NOTE: the gradient is EXACT for the quadrature, which APPROXIMATES the
        // true integral for non-polynomial integrands (exact for constant /
        // polynomial-degree ≤ 31 integrands).
        if (!node.lower || !node.upper) {
          throw new TypeError(
            `bridgeGradientAST: an abstract (bound-less) integral is not differentiable; ` +
              `supply lower/upper bounds for a definite integral.`,
          );
        }
        if (node.over.kind !== 'symbol') {
          throw new TypeError(`bridgeGradientAST: integral 'over' must be a symbol.`);
        }
        const overName = node.over.name;
        if (overName === varName) {
          throw new TypeError(
            `bridgeGradientAST: cannot differentiate w.r.t. the integration variable '${overName}'.`,
          );
        }
        const lo = walk(node.lower, boundVars);
        const hi = walk(node.upper, boundVars);
        const half = hi.sub(lo).scale(0.5); // (b − a)/2
        const mid = lo.add(hi).scale(0.5); // (a + b)/2
        let sum: TapedScalar | null = null;
        for (const gl of GAUSS_LEGENDRE_16) {
          const xPoint = mid.add(half.scale(gl.node)); // (b−a)/2·ξ + (a+b)/2
          const env = new Map(boundVars);
          env.set(overName, xPoint);
          const term = walk(node.integrand, env).scale(gl.weight);
          sum = sum === null ? term : sum.add(term);
        }
        // GAUSS_LEGENDRE_16 is non-empty, so `sum` is set.
        return half.mul(sum as TapedScalar);
      }
      throw new TypeError(
        `bridgeGradientAST: unsupported node kind '${node.kind}' — the differentiable ` +
          `grammar is symbol + op(+ − * / ^) + transcendental + abs + definite integral. ` +
          `Other encodings (tensor/curvature, bound-less integrals, or physics hidden in ` +
          `a typed-stub symbol) are not exactly differentiable.`,
      );
    };

    return walk(rhs, new Map());
  };

  const xLeaf = Tensor.fromNested(bindings[varName], []);
  const { value, gradient } = reverseGrad(fn, xLeaf);
  return {
    value: value.toNested() as number,
    gradient: gradient.toNested() as number,
  };
}

/**
 * Convenience wrapper around {@link bridgeGradientAST} that looks the RHS AST up
 * by catalog bridge id. `bridgeId` accepts a number, `'42'`, or `'BE-42'`.
 *
 * Throws if the id has no encoded RHS in {@link BRIDGE_RHS_BY_ID} (e.g. BE-51/52,
 * which are closed-form evaluators without an AST). If the bridge's RHS is not in
 * the differentiable scalar grammar (a tensor/integral/curvature encoding), the
 * delegated `bridgeGradientAST` throws the "unsupported node kind" error — use
 * {@link astDifferentiableBridgeIds} to discover which ids are AD-eligible.
 *
 * @public
 */
export function bridgeGradientASTById(
  bridgeId: number | string,
  varName: string,
  bindings: Record<string, number>
): Promise<ASTGradientResult> {
  const id = parseBridgeId(bridgeId);
  const rhs = BRIDGE_RHS_BY_ID.get(id);
  if (rhs === undefined) {
    throw new TypeError(
      `bridgeGradientASTById: BE-${id} has no encoded RHS AST in the registry ` +
        `(BE-51/52 are closed-form; only ids ${[...BRIDGE_RHS_BY_ID.keys()].length} bridges are encoded).`
    );
  }
  return bridgeGradientAST(rhs, varName, bindings);
}

/** Whether an AST consists solely of the differentiable scalar grammar (symbol + op(+ − * / ^)). */
function isDifferentiableScalarAST(node: ExprNode): boolean {
  if (node.kind === 'symbol') return true;
  if (node.kind === 'op') {
    if (!['+', '-', '*', '/', '^'].includes(node.op)) return false;
    return node.args.every(isDifferentiableScalarAST);
  }
  if (node.kind === 'transcendental') return isDifferentiableScalarAST(node.arg);
  if (node.kind === 'abs') return isDifferentiableScalarAST(node.arg);
  if (node.kind === 'integral') {
    return (
      !!node.lower &&
      !!node.upper &&
      node.over.kind === 'symbol' &&
      isDifferentiableScalarAST(node.integrand) &&
      isDifferentiableScalarAST(node.lower) &&
      isDifferentiableScalarAST(node.upper)
    );
  }
  return false;
}

/**
 * The catalog bridge ids whose encoded RHS lies entirely in the differentiable
 * scalar grammar — i.e. those `bridgeGradientASTById` can differentiate exactly.
 * Bridges encoded with tensor/integral/curvature nodes (or whose physics is
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
