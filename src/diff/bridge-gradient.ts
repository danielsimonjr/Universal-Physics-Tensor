/**
 * Bridge-parameter differentiation by central finite differences.
 *
 * A {@link BridgeDiffSpec} wraps one catalog closed form (a plain-JS scalar
 * function over a named-field struct) and names which fields vary.
 * {@link bridgeGradientNumerical} perturbs those fields and returns the
 * gradient keyed by field name.
 *
 * There is no engine-AD path over a spec. `evaluate` returns a `number`, and
 * a number carries no autograd tape, so reverse- or forward-mode AD of a spec
 * is unreachable by construction; the function that once offered it
 * (`bridgeGradient`) threw for every shipped spec and was removed. The exact
 * AD path is {@link bridgeGradientAST} in `bridge-ast-gradient.ts`, which
 * lowers the bridge's symbolic RHS through `@danielsimonjr/mathts-autograd`.
 *
 * This module lives in `src/diff/` (P8 Decision #1), not in `src/bridges/`,
 * so the catalog closed forms stay untouched.
 *
 * @module diff/bridge-gradient
 */

import { centralPartial } from '../numerical/finite-difference.js';

/**
 * Specification of a differentiable bridge: which parameters can vary, in
 * what order the gradient reports them, the fixed inputs, and the bridge's
 * scalar evaluator.
 *
 * `paramNames` is the report order. For a Shapiro-delay spec with
 * `paramNames: ['M_kg', 'R_far_m', 'R_near_m']`, the gradient returned by
 * `bridgeGradientNumerical` has keys in that insertion order.
 *
 * @public
 */
export interface BridgeDiffSpec<Input> {
  /** Catalog id used in error messages (for example the relation that uses the covariant-eikonal method). */
  readonly bridgeId: string;
  /** Display name (e.g., 'Shapiro time delay'). */
  readonly name: string;
  /**
   * Which Input keys vary, in report order. All names must be present in the
   * frozen `Input` struct as `number`-valued keys.
   */
  readonly paramNames: ReadonlyArray<keyof Input & string>;
  /**
   * The non-differentiable input fields (those NOT in `paramNames`). The
   * evaluator receives `defaults` merged with the varying params.
   */
  readonly defaults: Partial<Input>;
  /** The bridge's scalar evaluator. */
  readonly evaluate: (input: Input) => number;
  /**
   * The smallest magnitude the relative step is taken against, per parameter:
   * for `|x| < floor` the step is `floor·relStep`. A parameter that is zero at
   * a point of interest (an eccentricity on a circular orbit) needs its scale
   * stated here, because a relative step at zero is no step. A parameter not
   * named here has no floor: the step is `|x|·relStep`, and `x = 0` is refused.
   */
  readonly stepFloors?: Readonly<Partial<Record<keyof Input & string, number>>>;
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
 * way to differentiate the catalog's plain-JS closed forms without
 * rewriting them. Needs no engine and is synchronous.
 *
 * For each differentiable param with value `x` it uses the relative step
 * `h = max(|x|, floor)·cbrt(eps)`, where `floor` is the spec's
 * {@link BridgeDiffSpec.stepFloors} entry for that param (0 when the spec
 * states none), and the ACTUAL representable denominator
 * `dx = (x + h) − (x − h)` (`numerical/finite-difference`) — so the
 * perturbation survives floating-point rounding at astrophysical scales
 * (`M ≈ 2e30 kg`) and stays relative at atomic ones (a charge of 1.6e-19
 * takes a step of 1e-24, not the 6e-6 an absolute floor of 1 gave). A param
 * at exactly 0 with no stated floor is refused with a `RangeError`: there is
 * no scale to step by. The supplied `params` must contain every key in
 * `spec.paramNames`; non-differentiable fields come from `spec.defaults`.
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

  // Every paramName must be a FINITE number. (`typeof NaN === 'number'`, so a
  // bare typeof check let NaN/∞ flow into a silently non-finite gradient.)
  for (const k of spec.paramNames) {
    if (!Number.isFinite(params[k])) {
      throw new TypeError(
        `bridgeGradientNumerical: ${spec.bridgeId}: missing or non-finite param '${k}' ` +
        `(got ${params[k]}). All paramNames must be finite numbers in the params object.`,
      );
    }
  }

  // Build the full Input struct (defaults + differentiable params), with an
  // optional single-param override for the perturbed evaluations. The
  // `Input` generic has no runtime schema: `spec.paramNames` is declared as
  // keys of `Input`, and `defaults` is a `Partial<Input>`, so the merged
  // record is an `Input` by the spec's own contract; the cast states that.
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
    const floor = spec.stepFloors?.[k] ?? 0;
    const h = Math.max(Math.abs(x), floor) * relStep;
    if (!(h > 0)) {
      throw new RangeError(
        `bridgeGradientNumerical: ${spec.bridgeId}: param '${k}' is ${x} and the spec states no stepFloors['${k}'], ` +
        `so a relative central-difference step has no scale; state the parameter's scale in the spec's stepFloors.`,
      );
    }
    gradient[k] = centralPartial((p) => spec.evaluate(buildInput({ key: k, val: p[k]! })), { [k]: x }, k, h);
  }

  return { value, gradient };
}
