/**
 * The TensorEngine contract. `MathTSEngine` implements it. See docs/planning/
 * v0.3.5-Design.md §3, §5.
 *
 * `EngineTensor` is an opaque handle; consumers operate on it only through
 * a TensorEngine. The lowering pass (lowering.ts) builds an `EinsumSpec`
 * from `computeContraction()`'s `contractionPairs` and hands it to
 * `engine.einsum()`.
 *
 * @module numerical/tensor-engine
 */

import type { NestedArray } from './types.js';
/**
 * Thrown when an engine does not implement a requested capability.
 *
 * @public
 */
export { EngineCapabilityError } from './errors.js';

/** Opaque rank-N tensor handle. Each engine backs it with its own storage
 *  (Float64Array, a MathTS Tensor, a future WASM offset); consumers see
 *  only the shape.
 *  @public */
export interface EngineTensor {
  readonly shape: ReadonlyArray<number>;
}

/** One contracted index: the two (operand, axis) coordinates that the
 *  Einstein summation pairs and sums over. Named by the public
 *  {@link EinsumSpec}, so it is public too.
 *  @public */
export interface EinsumContraction {
  readonly pair: readonly [readonly [number, number], readonly [number, number]];
}

/** One surviving (free) index in the einsum output, in output-axis order:
 *  the operand and the axis of that operand it comes from. Exported because
 *  the public {@link EinsumSpec} names it (the surface is closed under type
 *  references).
 *  @public */
export interface EinsumFreeAxis {
  readonly operand: number;
  readonly axis: number;
}

/** The engine-agnostic einsum plan produced by lowering.ts.
 *  @public */
export interface EinsumSpec {
  readonly contractions: ReadonlyArray<EinsumContraction>;
  readonly free: ReadonlyArray<EinsumFreeAxis>;
}

/**
 * Result of a forward-mode automatic differentiation pass.
 * `value` is f(x); `jacobian` is the Jacobian of f at x (Jvp with tangent 1).
 * @public
 */
export interface ForwardGradResult {
  readonly value: EngineTensor;
  readonly jacobian: EngineTensor;
}

/**
 * Result of a reverse-mode automatic differentiation pass.
 * `value` is f(x); `gradient` is ∂L/∂x for cotangent dL/df (ones-like by default).
 * @public
 */
export interface ReverseGradResult {
  readonly value: EngineTensor;
  readonly gradient: EngineTensor;
}

/** The compute contract. MathTSEngine implements it.
 *  @public */
export interface TensorEngine {
  readonly name: string;

  fromNested(data: NestedArray, shape: ReadonlyArray<number>): EngineTensor;
  toNested(t: EngineTensor): NestedArray;

  einsum(spec: EinsumSpec, ...operands: EngineTensor[]): EngineTensor;
  matMul(a: EngineTensor, b: EngineTensor): EngineTensor;
  transpose(t: EngineTensor, perm?: ReadonlyArray<number>): EngineTensor;
  reshape(t: EngineTensor, shape: ReadonlyArray<number>): EngineTensor;

  add(a: EngineTensor, b: EngineTensor): EngineTensor;
  sub(a: EngineTensor, b: EngineTensor): EngineTensor;
  mul(a: EngineTensor, b: EngineTensor): EngineTensor;
  scale(t: EngineTensor, k: number): EngineTensor;

  identity(n: number): EngineTensor;
  normInf(t: EngineTensor): number;

  /** Optional — no-op for pure-JS engines; a future native engine implements
   *  real disposal. evaluateNumerical() never relies on it. */
  dispose?(t: EngineTensor): void;

  /**
   * Forward-mode AD (Jacobian-vector product). Always Promise-returning for
   * uniform consumer semantics (S6 reconciliation fix — no T | Promise<T> union).
   * Engines without AD support omit this method; call `hasAutogradSupport(engine)`
   * before invoking.
   * @public
   */
  forwardGrad?(
    fn: (x: EngineTensor) => EngineTensor,
    x: EngineTensor,
  ): Promise<ForwardGradResult>;

  /**
   * Reverse-mode AD (vector-Jacobian product). `cotangent` defaults to
   * ones-like(value) when omitted. Always Promise-returning (S6).
   * Engines without AD support omit this method; call `hasAutogradSupport(engine)`
   * before invoking.
   * @public
   */
  reverseGrad?(
    fn: (x: EngineTensor) => EngineTensor,
    x: EngineTensor,
    cotangent?: EngineTensor,
  ): Promise<ReverseGradResult>;
}

/**
 * Returns `true` iff the engine implements both `forwardGrad` and `reverseGrad`.
 * Use this before invoking AD methods so callers get a clear capability signal
 * rather than a runtime TypeError.
 *
 * @example
 * ```typescript
 * if (!hasAutogradSupport(engine)) {
 *   throw new EngineCapabilityError(engine.name, 'forwardGrad');
 * }
 * const { value, jacobian } = await engine.forwardGrad!(fn, x);
 * ```
 * @public
 */
export function hasAutogradSupport(engine: TensorEngine): boolean {
  return typeof engine.forwardGrad === 'function'
      && typeof engine.reverseGrad === 'function';
}

/** Runtime guard for EinsumSpec — validates structure before passing to
 *  engine.einsum(). Not called internally by the lowering pass (which builds
 *  specs via buildEinsumSpec and trusts the upstream AST validation). Available
 *  for consumers who construct EinsumSpec objects directly.
 *  @internal */
export function isEinsumSpec(x: unknown): x is EinsumSpec {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as { contractions?: unknown; free?: unknown };
  if (!Array.isArray(s.contractions) || !Array.isArray(s.free)) return false;
  for (const c of s.contractions) {
    if (typeof c !== 'object' || c === null) return false;
    const pair = (c as { pair?: unknown }).pair;
    if (!Array.isArray(pair) || pair.length !== 2) return false;
    for (const coord of pair) {
      if (!Array.isArray(coord) || coord.length !== 2) return false;
      if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') return false;
    }
  }
  for (const f of s.free) {
    if (typeof f !== 'object' || f === null) return false;
    const fa = f as { operand?: unknown; axis?: unknown };
    if (typeof fa.operand !== 'number' || typeof fa.axis !== 'number') return false;
  }
  return true;
}
