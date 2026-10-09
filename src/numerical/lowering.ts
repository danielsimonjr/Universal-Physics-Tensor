/**
 * AST → EngineTensor lowering. Walks a validated ExprNode tree and emits
 * TensorEngine calls. The tensor-product case turns computeContraction()'s
 * contractionPairs into an EinsumSpec (v0.3.5-Design.md §5).
 *
 * v0.3.5 scope: flat tensor-products of contractable operands (the three
 * index-carrying nodes + tensor-partial-derivative) + scalar operands.
 * Nested products, integral/derivative numerical eval are out of scope and
 * throw clearly.
 *
 * @module numerical/lowering
 */

import type { ExprNode } from '../dimensional/validator.js';
import { callBuiltinFunction } from './formula-contract.js';
import { validate } from '../dimensional/validator.js';
import type { TensorIndex, TensorSymbolNode } from '../dimensional/tensor.js';
import type { Dimension } from '../dimensional/types.js';
import { computeContraction, validateTensorSymbol } from '../dimensional/tensor.js';
import { pderivGrid, pderivNumericalFn, pderivSymbolic } from './pderiv.js';
import {
  validateMetricTensor,
  validateKroneckerDelta,
  validatePartialDerivative,
} from '../dimensional/metric-validators.js';
import type { MetricTensorNode } from '../dimensional/metric-validators.js';
import type { CovariantDerivativeNode, RiemannTensorNode } from '../dimensional/connection-validators.js';
import type { RicciTensorNode, EinsteinTensorNode, BianchiResidualNode } from '../dimensional/curvature.js';
import type { WeylTensorNode } from '../dimensional/weyl-validators.js';
import type { KretschmannScalarNode } from '../dimensional/curvature-invariants.js';
import type { CurvatureKind } from '../dimensional/curvature-composite.js';
import type {
  EngineTensor, TensorEngine, EinsumSpec, EinsumContraction,
} from './tensor-engine.js';
import type { NumericalInputs, NestedArray } from './types.js';
import { NumericalBackendError } from './errors.js';
import { integrateGaussLegendre } from './quadrature.js';
import {
  zeroTensor,
  zeroTensorLike,
  flatToNested,
  flattenNA,
  tensorAdd,
  tensorAddScaled,
  computeChristoffelTensor,
  contractChristoffelWithOperand,
  getMetricDerivFlat,
} from './connection-lowering-helpers.js';
import {
  christoffelAt,
  dGammaAt,
  buildRiemann,
  contractRiemannJS,
  // v0.6.1 Phase 2: the bianchi-residual + weyl-tensor arms moved into
  // these two helpers (full FD pipeline + result-wrap).
  lowerBianchiResidual,
  lowerWeylTensor,
  lowerKretschmannScalar,
  type MetricFn,
} from './curvature-lowering-helpers.js';
// v0.7 follow-up to v0.6.1's LOC-target miss: the four private helpers
// (isMetricTensorNode, dimensionOf, requireValue, flattenNestedArray)
// live in lowering-utils.ts so the new derivative-lowering.ts can
// share them without a forward-import cycle.
import {
  isMetricTensorNode,
  dimensionOf,
  requireValue,
  flattenNestedArray,
} from './lowering-utils.js';
// v0.7 follow-up: tensor-partial-derivative + covariant-derivative
// case arms extracted (was lines 523-820, ~298 LOC). The recursive
// lowerNode call is threaded as a thunk to keep the module graph
// acyclic.
import {
  lowerTensorPartialDerivative,
  lowerCovariantDerivative,
} from './derivative-lowering.js';

/** Operand kinds a flat tensor-product can lower in v0.3.5: the three
 *  index-carrying nodes plus tensor-partial-derivative (whose effective
 *  indices are `of`'s indices followed by its wrtIndex).
 *
 *  NOTE: Explicitly enumerated rather than structural Extract to avoid
 *  accidentally including future index-carrying nodes (e.g.,
 *  StressEnergyTensorNode) that are not contractable in the einsum sense. */
type ContractableNode =
  | Extract<ExprNode, { kind: 'tensor-symbol' }>
  | Extract<ExprNode, { kind: 'metric-tensor' }>
  | Extract<ExprNode, { kind: 'kronecker-delta' }>
  | Extract<ExprNode, { kind: 'tensor-partial-derivative' }>;

function isContractable(node: ExprNode): node is ContractableNode {
  return node.kind === 'tensor-symbol'
    || node.kind === 'metric-tensor'
    || node.kind === 'kronecker-delta'
    || node.kind === 'tensor-partial-derivative';
}

/** The effective index list of a contractable operand, in the SAME axis
 *  order as its lowered EngineTensor. For the three index-carrying nodes
 *  that is `node.indices`. For ∂_μ(of) the lowered tensor has shape
 *  [...ofShape, N] (Task 10), so the effective indices are `of`'s indices
 *  (v0.3.5: `of` is a tensor-symbol or metric-tensor) followed by the wrtIndex. */
function operandIndices(node: ContractableNode): ReadonlyArray<TensorIndex> {
  if (node.kind === 'tensor-partial-derivative') {
    const of = node.of as ExprNode;
    if (of.kind !== 'tensor-symbol' && of.kind !== 'metric-tensor') {
      throw new NumericalBackendError(
        `lowering: a tensor-partial-derivative operand requires a tensor-symbol or `
        + `metric-tensor 'of' in v0.3.5/v0.4.0 — got '${of.kind}'`,
      );
    }
    return [...of.indices, node.wrtIndex];
  }
  return node.indices;
}

/**
 * Build the EinsumSpec for a flat tensor-product.
 *
 * NOTE: this function does NOT decide which indices contract. That authority
 * belongs to `computeContraction()` (v0.2.0 symbolic-layer) — variance-aware,
 * implicit-identity-metric rule — which already classified every label as
 * contracted or free. buildEinsumSpec only maps those already-classified
 * labels to their (operand, axis) sites. There is exactly one
 * contraction-decision implementation in the codebase.
 *
 * v0.6.1: dropped export — was @internal-tagged with no external consumer.
 * `lowerTensorProduct` (this file) is the only call site.
 */
function buildEinsumSpec(
  operands: ReadonlyArray<ContractableNode>,
  contractionPairs: ReadonlyArray<{ label: string }>,
  freeIndices: ReadonlyMap<string, { upper: number; lower: number }>,
): EinsumSpec {
  // Map every label to its (operand, axis) sites — via operandIndices() so a
  // tensor-partial-derivative operand contributes its [...of.indices, wrtIndex]
  // effective axes.
  const sites = new Map<string, Array<[number, number]>>();
  operands.forEach((op, opIndex) => {
    operandIndices(op).forEach((idx, axis) => {
      const list = sites.get(idx.label) ?? [];
      list.push([opIndex, axis]);
      sites.set(idx.label, list);
    });
  });

  // Contractions: computeContraction told us exactly which labels contract.
  const contractions: EinsumContraction[] = [];
  for (const { label } of contractionPairs) {
    const locs = sites.get(label);
    if (!locs || locs.length !== 2) {
      throw new NumericalBackendError(
        `buildEinsumSpec: contracted label "${label}" must occur at exactly 2 `
        + `operand sites, found ${locs?.length ?? 0}`,
      );
    }
    contractions.push({ pair: [locs[0], locs[1]] });
  }

  // Free axes in computeContraction's freeIndices order — the symbolic
  // layer's canonical ordering, so the numerical result's axis order
  // matches what the rest of UPT expects.
  const free: Array<{ operand: number; axis: number }> = [];
  for (const label of freeIndices.keys()) {
    const locs = sites.get(label);
    if (!locs || locs.length !== 1) {
      throw new NumericalBackendError(
        `buildEinsumSpec: free label "${label}" must occur at exactly 1 `
        + `operand site, found ${locs?.length ?? 0}`,
      );
    }
    free.push({ operand: locs[0][0], axis: locs[0][1] });
  }

  return { contractions, free };
}

/** Lower a contractable operand to a concrete EngineTensor. */
function lowerContractable(
  node: ContractableNode, inputs: NumericalInputs, engine: TensorEngine,
): EngineTensor {
  const N = dimensionOf(inputs);
  if (node.kind === 'kronecker-delta') return engine.identity(N);
  if (node.kind === 'tensor-partial-derivative') {
    // Delegate to lowerNode, which handles all three numericalForm paths.
    return lowerNode(node, inputs, engine);
  }
  // tensor-symbol / metric-tensor: shape is N per index.
  const shape = node.indices.map(() => N);
  return engine.fromNested(requireValue(node.name, inputs), shape);
}

/**
 * Dispatcher for the six curvature-composite AST kinds.
 *
 * v0.6.0 Task 3.10e: extracted from `lowerNode`'s switch so all curvature
 * lowering logic lives in one named helper. It switches on `node.kind`
 * directly; `CURVATURE_KIND_REGISTRY` is not read here. The numerical paths
 * are preserved verbatim from the prior per-kind arms — no logic changes.
 *
 * Called from `lowerNode` for all `CurvatureKind` discriminants.
 * @internal
 */
function lowerCurvature(
  node: ExprNode & { kind: CurvatureKind },
  inputs: NumericalInputs,
  engine: TensorEngine,
): EngineTensor {
  switch (node.kind) {
    case 'ricci-tensor': {
      // v0.5.0 Task 7 — Ricci R_μν = R^λ_{μλν} (Carroll Eq. 3.91). Lowers
      // the embedded Riemann tensor via the 'riemann-tensor' case (so all
      // FD machinery is shared), then contracts upper-ρ with the SECOND
      // lower slot (the μ slot of R^ρ_σμν — i.e., axis index 2 in the
      // [ρ, σ, μ, ν] storage) by summing R[λ][σ][λ][ν] over λ. The
      // surviving free axes are lowerIndices[0] (the σ slot, becoming
      // Ricci's first free index μ_out) and lowerIndices[2] (the ν slot,
      // becoming Ricci's second free index ν_out).
      //
      // Convention note (deviates from the Task 7 prompt's stated S1 rule
      // but agrees with Carroll Eq. 3.91 and the constant-curvature
      // identity R_μν = (n-1)·K·g_μν → R = 4Λ for de Sitter in n=4): the
      // prompt's "contract upper↔lowerIndices[0] (σ)" trace is the
      // first-pair antisymmetric trace `R^λ_λμν`, which is identically
      // zero for the (lowered) Riemann's first-pair antisymmetry — it
      // would zero out the de-Sitter Ricci scalar, contradicting both the
      // closed-form fixture and the test target R_scalar = 4Λ. The
      // mathematically correct contraction that satisfies the de-Sitter
      // test target is upper↔lowerIndices[1] (the middle/μ slot),
      // matching Carroll Eq. 3.91 verbatim.
      //
      // No new AST primitive in the contraction: the inner Riemann
      // returns an [N,N,N,N] EngineTensor; we materialise it via
      // engine.toNested, contract on the JS side, and lift back via
      // engine.fromNested. (Mirrors the philosophy of Task 6: walk the
      // composite node directly, no rewrite into a tensor-product.)
      const ricciNode = node as RicciTensorNode;
      const N = dimensionOf(inputs);
      // RiemannTensorNode is a member of ExprNode and CurvatureKind — cast is safe.
      const innerR = lowerCurvature(
        ricciNode.riemann as ExprNode & { kind: CurvatureKind },
        inputs,
        engine,
      );
      const flatR = flattenNestedArray(engine.toNested(innerR) as NestedArray, N * N * N * N);

      // Contract R[λ][μ_out][λ][ν_out] → Ricci[μ_out][ν_out] via the shared
      // `contractRiemannJS` helper (AS-1, v0.5.1). On R^ρ_{σμν} stored as
      // R[ρ][σ][μ][ν], the Carroll Eq. 3.91 contraction is upperAxis=0 (ρ)
      // against lowerAxis=2 (μ); free outputs are axes [1, 3] = (σ, ν).
      const ricci2d = contractRiemannJS(flatR, N, {
        upperAxis: 0, lowerAxis: 2, outAxes: [1, 3],
      });
      return engine.fromNested(ricci2d as NestedArray, [N, N]);
    }

    case 'einstein-tensor': {
      // v0.5.0 Task 8 — Einstein G_μν = R_μν − ½ R g_μν.
      //
      // Lowers in three steps and folds them on the JS side (same
      // walk-directly philosophy as ricci-tensor — no AST rewrite into a
      // 'op'/'-' tree with a tensor-valued scalar-multiply, which the
      // v0.3.5 tensor-product einsum does not natively support):
      //
      //   1. Lower the inner ricci-tensor → R_μν   (4×4 number[][])
      //   2. Look up g_μν and g^μν from inputs.tensors (constant raw values
      //      at the coordinate point — same pattern as the riemann-tensor
      //      case uses for `xCoord` / inputs.fields).
      //   3. Compute scalar R = Σ_{μν} g^{μν} R_{μν} on the JS side.
      //   4. Form G_{μν} = R_{μν} − ½ R · g_{μν} elementwise.
      //
      // Trace identity g^μν G_μν = −R is preserved EXACTLY in the
      // arithmetic (modulo cancellation noise) because both R and the
      // ½ R g_μν trace term are constructed from the same `Ric` and `g`
      // matrices — the test pins this to machine precision.
      const eNode = node as EinsteinTensorNode;
      const N = dimensionOf(inputs);

      // Step 1: inner Ricci R_μν via the ricci-tensor case (which itself
      // walks the riemann-tensor case for ∂Γ etc).
      const ricciNodeInner: RicciTensorNode = {
        kind: 'ricci-tensor', riemann: eNode.riemann,
      };
      const innerR = lowerCurvature(ricciNodeInner, inputs, engine);
      const Ric = engine.toNested(innerR) as number[][];

      // Step 2: g_μν and g^μν from inputs.tensors (raw constant matrices at
      // the test coordinate point). Mirrors how ricci-tensor's de-Sitter
      // closed-form test sources its metrics.
      const gFlat = flattenNestedArray(requireValue(eNode.gLower.name, inputs), N * N);
      const gInvFlat = flattenNestedArray(requireValue(eNode.gInverse.name, inputs), N * N);

      // Step 3: scalar R = Σ g^{μν} R_{μν}.
      let Rscalar = 0;
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          Rscalar += gInvFlat[mu * N + nu] * Ric[mu][nu];
        }
      }

      // Step 4: G_{μν} = R_{μν} − ½ R · g_{μν}.
      const G: number[][] = new Array(N);
      for (let i = 0; i < N; i++) {
        const row = new Array<number>(N);
        for (let j = 0; j < N; j++) row[j] = 0;
        G[i] = row;
      }
      const halfR = 0.5 * Rscalar;
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          G[mu][nu] = Ric[mu][nu] - halfR * gFlat[mu * N + nu];
        }
      }
      return engine.fromNested(G as NestedArray, [N, N]);
    }

    case 'bianchi-residual': {
      // v0.5.0 Task 9 — Bianchi-identity residual B_{λμνρσ}.
      // Extracted into `lowerBianchiResidual` in v0.6.1 Phase 2; the body
      // here is just the type-narrowed dispatch.
      return lowerBianchiResidual(node as BianchiResidualNode, inputs, engine);
    }

    case 'riemann-tensor': {
      // v0.5.0 Task 6 (Phase 1c-ii). Walks the node directly (no AST rewrite
      // into pderiv-of-Γ): evaluates Γ(x) via the v0.4.0
      // `computeChristoffelTensor` helper, then computes ∂Γ via centered FD
      // (M11 — pderiv-style, not a new AST kind or AD pass).
      const rNode = node as RiemannTensorNode;
      const N = dimensionOf(inputs);

      // Coordinate value: read from inputs.tensors[xCoord.name] (a flat
      // number[] of length N). This mirrors the test fixture's
      // 'x' tensor convention.
      const xCoordName = rNode.xCoord.name;
      const xRaw = requireValue(xCoordName, inputs);
      const x = flattenNestedArray(xRaw, N);

      // Coordinate-dependent metric closures: required for ∂g (inner FD) and
      // ∂Γ (outer FD). Looked up by name in inputs.fields.
      const gName = rNode.gLower.name;
      const gInvName = rNode.gInverse.name;
      const gFn = inputs.fields?.get(gName) as MetricFn | undefined;
      const gInverseFn = inputs.fields?.get(gInvName) as MetricFn | undefined;
      if (!gFn || !gInverseFn) {
        throw new NumericalBackendError(
          `lowering: riemann-tensor numerical evaluation requires coordinate-` +
          `dependent metric closures in inputs.fields for "${gName}" and "${gInvName}" ` +
          `(constant-metric Riemann is identically zero — the test wouldn't fire here). ` +
          `Got fields=[${[...(inputs.fields?.keys() ?? [])].join(',')}].`,
        );
      }

      // Γ^ρ_{σν}(x) and ∂_λ Γ^ρ_{σν}(x).
      const gamma = christoffelAt(x, gFn, gInverseFn, N, engine);
      const dGamma = dGammaAt(x, gFn, gInverseFn, N, engine);

      // R[ρ][σ][μ][ν] per the Carroll formula (Adam+Eve F4-S3).
      const R = buildRiemann(gamma, dGamma, N);

      // Materialise back into an EngineTensor in [N,N,N,N] shape.
      return engine.fromNested(R as NestedArray, [N, N, N, N]);
    }

    case 'weyl-tensor': {
      // v0.6.0 Task 3.2 — Weyl C^ρ_{σμν}.
      // Extracted into `lowerWeylTensor` in v0.6.1 Phase 2; the body here
      // is just the type-narrowed dispatch.
      return lowerWeylTensor(node as WeylTensorNode, inputs, engine);
    }

    case 'kretschmann-scalar': {
      return lowerKretschmannScalar(node as KretschmannScalarNode, inputs, engine);
    }

    default: {
      // Compile-time exhaustiveness: in this default arm `node` is the
      // union of the deferred kinds (all others have explicit arms).
      // Excluding the registry-covered kinds must leave `never` — if a
      // new ExprNode kind lands without an arm OR a registry entry,
      // this assignment errors at tsc (Adam A-8 mitigation).
      const _exhaustive: never = node as Exclude<
        typeof node,
        { kind: DeferredNodeKind }
      >;
      void _exhaustive;
      throw new NumericalBackendError(
        `lowerCurvature: unhandled curvature kind ${JSON.stringify((node as { kind?: unknown }).kind)}`,
      );
    }
  }
}

/**
 * S-9 (v0.9.0): deferred-evaluator registry — the single source of
 * truth for AST kinds whose numerical evaluation lives in a dedicated
 * module instead of the lowering switch. The default arm consults this
 * registry and raises a descriptive error naming the canonical
 * evaluator; the per-kind explicit arms it replaces had drifted into
 * 5 near-identical bodies (v0.7.1 S-9 finding).
 *
 * Exhaustiveness is pinned by tests/numerical/lowering-deferred-arms.test.ts
 * (Adam A-8 mitigation: silent prose drift between registry and arms).
 */
interface DeferredEvaluatorEntry {
  readonly canonicalEvaluatorName: string;
  readonly moduleHint: string;
}

type DeferredNodeKind =
  | 'killing-vector'
  | 'conserved-charge'
  | 'stress-energy'
  | 'cosmological-constant'
  | 'einstein-equation';

export const DEFERRED_EVALUATOR_REGISTRY: Record<DeferredNodeKind, DeferredEvaluatorEntry> = {
  'killing-vector': {
    canonicalEvaluatorName: 'verifyKillingEquation',
    moduleHint: 'src/numerical/killing.ts',
  },
  'conserved-charge': {
    canonicalEvaluatorName: 'evaluateConservedCharge',
    moduleHint: 'src/numerical/killing.ts',
  },
  'stress-energy': {
    canonicalEvaluatorName: 'evaluateEinsteinEquationResidual',
    moduleHint: 'src/numerical/einstein-equation.ts',
  },
  'cosmological-constant': {
    canonicalEvaluatorName: 'evaluateEinsteinEquationResidual',
    moduleHint: 'src/numerical/einstein-equation.ts',
  },
  'einstein-equation': {
    canonicalEvaluatorName: 'evaluateEinsteinEquationResidual',
    moduleHint: 'src/numerical/einstein-equation.ts',
  },
};

function isDeferredNodeKind(kind: string): kind is DeferredNodeKind {
  return Object.prototype.hasOwnProperty.call(DEFERRED_EVALUATOR_REGISTRY, kind);
}

/** Lower a validated ExprNode to an EngineTensor.
 *  @internal — cross-module/test use only; not part of the consumer surface. */
export function lowerNode(
  node: ExprNode,
  inputs: NumericalInputs,
  engine: TensorEngine,
): EngineTensor {
  switch (node.kind) {
    case 'symbol':
      return engine.fromNested(requireValue(node.name, inputs), []);

    case 'tensor-symbol':
    case 'metric-tensor':
    case 'kronecker-delta':
      return lowerContractable(node, inputs, engine);

    case 'op': {
      if (node.op === '+' || node.op === '-') {
        if (node.args.length === 0) return engine.fromNested(0, []);
        let acc = lowerNode(node.args[0], inputs, engine);
        for (let i = 1; i < node.args.length; i++) {
          const next = lowerNode(node.args[i], inputs, engine);
          acc = node.op === '+' ? engine.add(acc, next) : engine.sub(acc, next);
        }
        return acc;
      }
      // '*' / '/' / '^' are scalar-only. Empty-op convention is aligned with
      // the validator (validator.ts: '*'/'/' with 0 args → DIMENSIONLESS) and
      // expr-eval ('*'/'/' empty → 1): an empty '/' is the multiplicative
      // identity, NOT an error, and the ≥1-arg case left-folds (1-arg → the
      // operand) consistently across all three layers. '^' still requires
      // exactly 2 operands everywhere (raw arity guard against an unvalidated
      // AST surfacing a silent NaN).
      if (node.op === '/' && node.args.length === 0) {
        return engine.fromNested(1, []);
      }
      if (node.op === '^' && node.args.length !== 2) {
        throw new NumericalBackendError(
          `lowering: op '^' requires exactly 2 operands (base, exponent), got ${node.args.length}`,
        );
      }
      // '*' / '/' / '^' are scalar-only (the validator rejects tensor
      // operands). Lower each to rank-0, do the arithmetic in JS, lift back.
      const scalars = node.args.map((a) => {
        const t = lowerNode(a, inputs, engine);
        if (t.shape.length !== 0) {
          throw new NumericalBackendError(
            `lowering: op '${node.op}' got a rank-${t.shape.length} operand — scalar ops require rank-0`,
          );
        }
        return engine.toNested(t) as number;
      });
      let value: number;
      if (node.op === '*') value = scalars.reduce((a, b) => a * b, 1);
      else if (node.op === '/') value = scalars.reduce((a, b) => a / b);
      else value = callBuiltinFunction('pow', scalars); // '^': the one table's body
      return engine.fromNested(value, []);
    }

    case 'transcendental': {
      // Scalar transcendental of a rank-0 dimensionless argument. Materialise
      // the arg to a number and apply the one function table's body (same
      // lower-to-JS pattern as the scalar 'op' case above). Each grammar node
      // name is a table key.
      const argT = lowerNode(node.arg, inputs, engine);
      if (argT.shape.length !== 0) {
        throw new NumericalBackendError(
          `lowering: transcendental '${node.fn}' requires a rank-0 (scalar) argument, `
          + `got rank-${argT.shape.length}`,
        );
      }
      const x = engine.toNested(argT) as number;
      return engine.fromNested(callBuiltinFunction(node.fn, [x]), []);
    }

    case 'abs': {
      const argT = lowerNode(node.arg, inputs, engine);
      if (argT.shape.length !== 0) {
        throw new NumericalBackendError(
          `lowering: abs requires a rank-0 (scalar) argument, got rank-${argT.shape.length}`,
        );
      }
      return engine.fromNested(callBuiltinFunction('abs', [engine.toNested(argT) as number]), []);
    }

    case 'tensor-product': {
      for (const arg of node.args) {
        if (arg.kind === 'tensor-product') {
          throw new NumericalBackendError(
            'lowering: nested tensor-product numerical evaluation is not supported in v0.3.5 — '
            + 'flatten the contraction into a single product',
          );
        }
      }
      // Contractable operands (tensor-symbol / metric-tensor / kronecker-delta
      // / tensor-partial-derivative) participate in the einsum; everything
      // else must be a rank-0 scalar factor.
      const operands = node.args.filter(isContractable);
      const scalarArgs = node.args.filter((a) => !isContractable(a));
      // computeContraction is the single authority on WHICH indices contract
      // (variance-aware, implicit-metric rule). See buildEinsumSpec JSDoc.
      // The recursive validateContractionChild resolves tensor-partial-derivative
      // operands via validatePartialDerivative.
      function validateContractionChild(child: ExprNode): {
        dim: Dimension;
        freeIndices: Map<string, { upper: number; lower: number }>;
      } {
        if (child.kind === 'tensor-symbol') return validateTensorSymbol(child);
        if (child.kind === 'metric-tensor') return validateMetricTensor(child);
        if (child.kind === 'kronecker-delta') return validateKroneckerDelta(child);
        if (child.kind === 'tensor-partial-derivative') {
          const r = validatePartialDerivative(child, (g) =>
            validateContractionChild(g as ExprNode),
          );
          return { dim: r.dim, freeIndices: r.freeIndices };
        }
        throw new NumericalBackendError(
          `lowering: unexpected operand '${child.kind}' in tensor-product einsum`,
        );
      }
      const { contractionPairs, freeIndices } = computeContraction(
        operands, validateContractionChild,
      );
      const spec = buildEinsumSpec(operands, contractionPairs, freeIndices);
      const operandTensors = operands.map((n) => lowerContractable(n, inputs, engine));
      let result = engine.einsum(spec, ...operandTensors);
      // Scalar operands multiply the whole contraction.
      for (const s of scalarArgs) {
        const st = lowerNode(s, inputs, engine);
        if (st.shape.length !== 0) {
          throw new NumericalBackendError(
            'lowering: non-scalar non-contractable operand in tensor-product',
          );
        }
        result = engine.scale(result, engine.toNested(st) as number);
      }
      return result;
    }

    case 'tensor-partial-derivative':
      // v0.7 follow-up to v0.6.1 LOC miss: body extracted to
      // derivative-lowering.ts. No recursive lowerNode call from
      // this arm, so the thunk parameter is not needed.
      return lowerTensorPartialDerivative(node, inputs, engine);

    case 'covariant-derivative':
      // v0.7 follow-up to v0.6.1 LOC miss: body extracted to
      // derivative-lowering.ts. Recursive lowerNode call threaded
      // via thunk to keep the module graph acyclic.
      return lowerCovariantDerivative(node, inputs, engine, lowerNode);

    case 'integral': {
      // A DEFINITE integral (with bounds) is evaluated by 16-point
      // Gauss–Legendre quadrature; the integration variable `over.name` is
      // scope-bound to each abscissa. A bound-LESS integral stays abstract
      // (dimensional-only) and is not numerically evaluated.
      if (!node.lower || !node.upper) {
        throw new NumericalBackendError(
          `lowering: an abstract (bound-less) 'integral' is not numerically evaluated; `
          + 'supply lower/upper bounds for a definite integral',
        );
      }
      if (node.over.kind !== 'symbol') {
        throw new NumericalBackendError(
          `lowering: integral 'over' must be a symbol (the integration variable), `
          + `got '${node.over.kind}'`,
        );
      }
      const overName = node.over.name;
      const toScalar = (n: ExprNode): number => {
        const t = lowerNode(n, inputs, engine);
        if (t.shape.length !== 0) {
          throw new NumericalBackendError(
            `lowering: integral bound must be rank-0 (scalar), got rank-${t.shape.length}`,
          );
        }
        return engine.toNested(t) as number;
      };
      const a = toScalar(node.lower);
      const b = toScalar(node.upper);
      const integrand = node.integrand;
      const value = integrateGaussLegendre(
        (x) => {
          const scoped: NumericalInputs = {
            ...inputs,
            tensors: new Map(inputs.tensors).set(overName, x),
          };
          const t = lowerNode(integrand, scoped, engine);
          if (t.shape.length !== 0) {
            throw new NumericalBackendError(
              `lowering: integral integrand must be rank-0 (scalar), got rank-${t.shape.length}`,
            );
          }
          return engine.toNested(t) as number;
        },
        a,
        b,
      );
      return engine.fromNested(value, []);
    }

    case 'derivative':
      throw new NumericalBackendError(
        `lowering: 'derivative' is not numerically evaluated in v0.3.5 — `
        + 'use tensor-partial-derivative for differentiation',
      );

    // v0.14 distributional/variational primitives — dimensional-grammar only,
    // not numerically evaluable (δ(0)=∞; a functional derivative needs the
    // functional's explicit form). They never appear in a composable symbolic
    // form, so the throw is correct.
    case 'dirac-delta':
    case 'variational-derivative':
      throw new NumericalBackendError(
        `lowering: '${node.kind}' is a dimensional-grammar primitive (v0.14) `
        + 'and is not numerically evaluated',
      );

    // v0.6.0 Task 3.10e: ricci-tensor, einstein-tensor, bianchi-residual,
    // riemann-tensor, weyl-tensor, kretschmann-scalar all delegate to
    // lowerCurvature — the extracted curvature-composite dispatcher.
    case 'ricci-tensor':
    case 'einstein-tensor':
    case 'bianchi-residual':
    case 'riemann-tensor':
    case 'weyl-tensor':
    case 'kretschmann-scalar':
      return lowerCurvature(node, inputs, engine);

    // S-9 (v0.9.0): the five deferred-evaluator arms (killing-vector,
    // conserved-charge, stress-energy, cosmological-constant,
    // einstein-equation) collapsed into the registry-consulting default
    // arm below. Message wording unified (no test pinned the old
    // per-arm text — verified before consolidation).
    default: {
      if (isDeferredNodeKind(node.kind)) {
        const entry = DEFERRED_EVALUATOR_REGISTRY[node.kind];
        throw new NumericalBackendError(
          `lowering: '${node.kind}' numerical evaluation is not yet implemented ` +
          `in the lowering layer. Use ${entry.canonicalEvaluatorName}() from ` +
          `${entry.moduleHint} instead.`,
        );
      }
      // Compile-time exhaustiveness: in this default arm `node` is the
      // union of the deferred kinds (all others have explicit arms).
      // Excluding the registry-covered kinds must leave `never` — if a
      // new ExprNode kind lands without an arm OR a registry entry,
      // this assignment errors at tsc (Adam A-8 mitigation).
      const _exhaustive: never = node as Exclude<
        typeof node,
        { kind: DeferredNodeKind }
      >;
      void _exhaustive;
      throw new NumericalBackendError(
        `lowering: unknown ExprNode.kind ${JSON.stringify((node as { kind?: unknown }).kind)}`,
      );
    }
  }
}
