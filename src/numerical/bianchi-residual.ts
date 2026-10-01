/**
 * Evaluator for the second-Bianchi-identity residual.
 *
 * The validators stay in `dimensional/curvature.ts`. This module holds the
 * constructor that calls `evaluateNumerical`, so `curvature.ts` does not
 * import `numerical`. `numerical/index.ts` does not import this file: that
 * edge would be a cycle, because this file imports `evaluateNumerical` from
 * the index.
 *
 * @module numerical/bianchi-residual
 */

import type {
  BianchiResidualNode,
  ExprNode,
  RiemannTensorNode,
} from '../dimensional/ast-types.js';
import type { TensorEngine } from './tensor-engine.js';
import type { NumericalInputs, NestedArray } from './types.js';
import { evaluateNumerical } from './index.js';

type LazyEvaluator = (
  engine: TensorEngine,
  inputs: NumericalInputs,
) => Promise<NestedArray>;

/**
 * Build the second-Bianchi-identity residual `B_{λμνρσ}` as a composite
 * object with both an AST representation and evaluator closures.
 *
 * **Return shape (deviates from `ricci()`/`einstein()`'s plain-ExprNode
 * return):** Bianchi is a 5-index residual tensor whose primary purpose is
 * to be EVALUATED and reduced to its max-absolute value. Callers that just
 * want the scalar self-consistency check use `evaluateMax`; callers that
 * want to inspect per-component residual structure use `evaluate`. The
 * underlying `residual: ExprNode` is exposed for downstream symbolic
 * consumers (validator, equation-homogeneity checks).
 *
 * **Convention.** Carroll Eq. 3.95 cyclic form on the first three lower
 * indices of the all-lower Riemann:
 *
 *   B_{λμνρσ} = ∇_λ R_{μνρσ} + ∇_μ R_{νλρσ} + ∇_ν R_{λμρσ} = 0
 *
 * **Implementation (Approach 1 — full ∇, not raw ∂).** Lowering computes
 * each `∇_λ R_{μνρσ}` term with full Christoffel corrections (one per lower
 * index of R), then sums cyclically. The lowered Riemann itself is computed
 * by lowering the upper-ρ of R^ρ_{σμν} on the JS side after the Riemann
 * lowering pipeline (Task 6) — no v0.3.0 `lower()` AST round-trip per FD
 * sample.
 *
 * **Numerical-noise discussion.** The cyclic sum involves one extra
 * coordinate-derivative on R_{μνρσ}, which itself sits on a ∂g→Γ→∂Γ→R FD
 * stack. Schwarzschild + de Sitter empirical residuals are reported in
 * `tests/dimensional/bianchi-residual.test.ts`; expected per-component
 * noise floor is ~1e-7 to 1e-8 — much looser than the Task 6 Riemann floor
 * (~8e-10) because of the extra FD layer.
 *
 * @public
 */
export function bianchiResidual(R: RiemannTensorNode): {
  residual: ExprNode;
  evaluate: LazyEvaluator;
  evaluateMax: (engine: TensorEngine, inputs: NumericalInputs) => Promise<number>;
} {
  const residual: BianchiResidualNode = { kind: 'bianchi-residual', riemann: R };

  const evaluate: LazyEvaluator = async (engine, inputs) => {
    const result = await evaluateNumerical(residual as ExprNode, inputs, { engine });
    return result.value;
  };

  const evaluateMax = async (
    engine: TensorEngine,
    inputs: NumericalInputs,
  ): Promise<number> => {
    const value = await evaluate(engine, inputs);
    // Walk the 5-deep nested array (or any depth) and return max |x|.
    // v0.5.1 TS-3: signature accepts `NestedArray` (the public type from
    // evaluate()) plus a typed-array escape hatch; unexpected shapes throw
    // rather than being silently ignored.
    let max = 0;
    const walk = (v: NestedArray | readonly number[]): void => {
      if (typeof v === 'number') {
        const a = Math.abs(v);
        if (a > max) max = a;
        return;
      }
      if (Array.isArray(v)) {
        for (const c of v) walk(c);
        return;
      }
      throw new Error(
        `bianchiResidual.evaluateMax: unexpected value shape — expected `
        + `number | NestedArray, got ${typeof v}`,
      );
    };
    walk(value);
    return max;
  };

  return { residual: residual as ExprNode, evaluate, evaluateMax };
}
