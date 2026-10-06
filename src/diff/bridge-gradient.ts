/**
 * Bridge-parameter differentiation — v0.9 Proposal 8 core layer.
 *
 * Wraps catalog bridge evaluators (typed scalar functions with
 * named-field struct inputs like `evaluateShapiroDelay(input:
 * ShapiroInputs): number`) into the shape expected by
 * `TensorEngine.reverseGrad`: `(paramTensor: EngineTensor) →
 * outputScalar`. Returns gradients with respect to a chosen subset
 * of the bridge's input parameters.
 *
 * Per P8 Decision #1, this lives in `src/diff/` (NOT in
 * `src/bridges/`), keeping bridge evaluators untouched. The AD
 * dependency `mathts-autograd` is a required dependency. Installing it
 * does not make AD of the plain-JS bridges work: the tape still cannot
 * trace `Math.*` (see the AD limitation below).
 *
 * IMPORTANT — AD limitation (verified empirically): `bridgeGradient`
 * does NOT actually differentiate the catalog evaluators. Because P8
 * Decision #1 keeps those evaluators as plain-JS scalar functions
 * (`Math.*` / raw arithmetic on numbers), neither reverse-mode (tape)
 * nor forward-mode (dual) AD can trace them — the tape/dual instrument
 * only sees ops routed through engine-traced tensors. With
 * `MathTSEngine` the autograd `TapedTensor` does not survive
 * `engine.toNested`. `bridgeGradient` therefore only works for
 * functions written in engine ops — not the plain-JS bridges.
 *
 * The SUPPORTED way to differentiate a plain-JS bridge evaluator is
 * {@link bridgeGradientNumerical} (central finite differences, no engine).
 *
 * @module diff/bridge-gradient
 */

import type { EngineTensor, TensorEngine } from '../numerical/tensor-engine.js';
import { hasAutogradSupport } from '../numerical/tensor-engine.js';
import { EngineCapabilityError } from '../numerical/errors.js';

/**
 * Specification of a differentiable bridge: which parameters can
 * vary, in what order they get packed into a 1-D parameter
 * tensor, how to unpack the tensor back into the bridge's input
 * struct, and the bridge evaluator itself.
 *
 * `paramNames` is the canonical pack/unpack order. For
 * `evaluateShapiroDelay(input: { r: number; b: number; M: number })`
 * with `paramNames: ['r', 'b', 'M']`, the gradient returned by
 * `bridgeGradient` has shape `[3]` with entries
 * `[dS/dr, dS/db, dS/dM]` in that order.
 *
 * @public
 */
export interface BridgeDiffSpec<Input> {
  /** Catalog id used in error messages (for example the relation that uses the covariant-eikonal method). */
  readonly bridgeId: string;
  /** Display name (e.g., 'Shapiro time delay'). */
  readonly name: string;
  /**
   * Pack/unpack order: which Input keys correspond to which axis
   * of the parameter tensor. All names must be present in the
   * frozen `Input` struct as `number`-valued keys.
   */
  readonly paramNames: ReadonlyArray<keyof Input & string>;
  /**
   * Fill in the non-differentiable input fields (those NOT in
   * `paramNames`). Returns the full struct merged from `defaults`
   * + the unpacked differentiable params. Typed as
   * `Partial<Input>` for ergonomics — runtime check in
   * `bridgeGradient` would catch missing required defaults if
   * the bridge evaluator needs them.
   */
  readonly defaults: Partial<Input>;
  /** The bridge's scalar evaluator. */
  readonly evaluate: (input: Input) => number;
}

/**
 * Result of `bridgeGradient`. `value` is the bridge's scalar
 * output at the supplied parameter point; `gradient` is the
 * 1-D `EngineTensor` of partial derivatives in `paramNames`
 * order.
 *
 * @public
 */
export interface BridgeGradientResult {
  readonly value: number;
  readonly gradient: EngineTensor;
}

/**
 * Compute the gradient of a bridge evaluator with respect to its
 * differentiable parameters via reverse-mode AD. The supplied
 * `params` map must contain every key in `spec.paramNames`.
 *
 * Throws `EngineCapabilityError` if the engine doesn't support
 * autograd (the standard graceful-degradation path from v0.4.0;
 * see `MathTSEngine.reverseGrad`).
 *
 * @public
 */
export async function bridgeGradient<Input>(
  spec: BridgeDiffSpec<Input>,
  engine: TensorEngine,
  params: Record<string, number>,
): Promise<BridgeGradientResult> {
  if (!hasAutogradSupport(engine)) {
    throw new EngineCapabilityError(engine.name, 'reverseGrad');
  }

  // Pack params into a 1-D tensor in spec.paramNames order.
  const packed: number[] = spec.paramNames.map((k) => {
    const v = params[k];
    if (typeof v !== 'number') {
      throw new TypeError(
        `bridgeGradient: ${spec.bridgeId}: missing or non-numeric param '${k}' ` +
        `(got ${typeof v}). All paramNames must be numbers in the params object.`,
      );
    }
    return v;
  });
  const paramTensor = engine.fromNested(packed, [packed.length]);

  // Build the (paramTensor) → scalar function the engine's
  // reverseGrad expects. The function unpacks the tensor back
  // into the bridge's Input struct, calls evaluate, and returns
  // a rank-0 tensor.
  const fn = (x: EngineTensor): EngineTensor => {
    const unpacked = engine.toNested(x) as number[];
    const input = { ...spec.defaults } as unknown as Input;
    spec.paramNames.forEach((k, i) => {
      (input as Record<string, unknown>)[k] = unpacked[i];
    });
    const scalar = spec.evaluate(input);
    return engine.fromNested(scalar, []);
  };

  const { value, gradient } = await engine.reverseGrad!(fn, paramTensor);
  const valueNumber = engine.toNested(value) as number;
  return { value: valueNumber, gradient };
}

/**
 * Convenience: unpack a 1-D gradient tensor into a named-field
 * record matching the spec's `paramNames` order.
 *
 * @public
 */
export function gradientToNamed<Input>(
  spec: BridgeDiffSpec<Input>,
  gradient: EngineTensor,
  engine: TensorEngine,
): Record<string, number> {
  const arr = engine.toNested(gradient) as number[];
  if (arr.length !== spec.paramNames.length) {
    throw new RangeError(
      `gradientToNamed: ${spec.bridgeId}: gradient length ${arr.length} does not ` +
      `match paramNames length ${spec.paramNames.length} — a mismatch would ` +
      `silently leave some params undefined or drop gradient entries.`,
    );
  }
  const out: Record<string, number> = {};
  spec.paramNames.forEach((k, i) => {
    out[k] = arr[i];
  });
  return out;
}

/**
 * Result of {@link bridgeGradientNumerical}: the bridge's scalar `value`
 * at the supplied point, plus the `gradient` of partial derivatives keyed
 * by `paramName` (insertion follows `spec.paramNames` order).
 *
 * @public
 */
export interface BridgeNumericalGradientResult {
  readonly value: number;
  readonly gradient: Readonly<Record<string, number>>;
}

/**
 * Relative step for central differences: `cbrt(eps)` balances the `O(h²)`
 * truncation error against the `O(eps/h)` round-off error (the central-diff
 * optimum). `sqrt(eps)` — the FORWARD-diff optimum — would leave precision on
 * the table for central differences.
 */
const CENTRAL_DIFF_REL_STEP = Math.cbrt(Number.EPSILON); // ≈ 6.06e-6

/**
 * Gradient of a bridge evaluator by **central finite differences** — the
 * supported way to differentiate the catalog's plain-JS evaluators.
 *
 * Reverse-/forward-mode AD ({@link bridgeGradient}) cannot trace these
 * evaluators: per P8 Decision #1 they are plain-JS scalar functions
 * (`Math.*` / raw arithmetic on numbers), so a tape/dual engine observes no
 * traced ops. `bridgeGradientNumerical` perturbs the inputs instead, so it
 * needs no engine and is synchronous.
 *
 * For each differentiable param with value `x` it uses a relative step
 * `h = max(|x|, 1)·cbrt(eps)` and the ACTUAL representable denominator
 * `dx = (x + h) − (x − h)` — so the perturbation survives floating-point
 * rounding even at astrophysical scales (e.g. `M ≈ 2e30 kg`). The supplied
 * `params` must contain every key in `spec.paramNames`; non-differentiable
 * fields come from `spec.defaults`.
 *
 * @public
 */
export function bridgeGradientNumerical<Input>(
  spec: BridgeDiffSpec<Input>,
  params: Record<string, number>,
  opts?: { readonly relStep?: number },
): BridgeNumericalGradientResult {
  const relStep = opts?.relStep ?? CENTRAL_DIFF_REL_STEP;
  if (!Number.isFinite(relStep) || relStep <= 0) {
    throw new RangeError(
      `bridgeGradientNumerical: ${spec.bridgeId}: relStep must be a positive finite number, got ${relStep} ` +
      `(a zero/non-finite step collapses the central-difference denominator to 0 → NaN gradients).`,
    );
  }

  // Same contract as bridgeGradient: every paramName must be a FINITE number.
  // (`typeof NaN === 'number'`, so a bare typeof check let NaN/∞ flow into a
  // silently non-finite gradient.)
  for (const k of spec.paramNames) {
    if (!Number.isFinite(params[k])) {
      throw new TypeError(
        `bridgeGradientNumerical: ${spec.bridgeId}: missing or non-finite param '${k}' ` +
        `(got ${params[k]}). All paramNames must be finite numbers in the params object.`,
      );
    }
  }

  // Build the full Input struct (defaults + differentiable params), with an
  // optional single-param override for the perturbed evaluations.
  const buildInput = (override?: { key: string; val: number }): Input => {
    const input = { ...spec.defaults } as Record<string, unknown>;
    for (const k of spec.paramNames) input[k] = params[k];
    if (override) input[override.key] = override.val;
    return input as unknown as Input;
  };

  const value = spec.evaluate(buildInput());

  const gradient: Record<string, number> = {};
  for (const k of spec.paramNames) {
    const x = params[k];
    const h = Math.max(Math.abs(x), 1) * relStep;
    const dx = x + h - (x - h); // actual representable step (huge-x safe)
    const fp = spec.evaluate(buildInput({ key: k, val: x + h }));
    const fm = spec.evaluate(buildInput({ key: k, val: x - h }));
    gradient[k] = (fp - fm) / dx;
  }

  return { value, gradient };
}
