/**
 * InverseMetricInconsistencyWarning — numerical path. Builds g⁻¹ and g as
 * EngineTensors, computes ‖matMul(g⁻¹, g) − I‖_∞, and emits a
 * 'warning'-severity Violation when it exceeds tolerance. v0.3.5-Design.md
 * §7. Resolves the v0.3.0 §13 Q2 deferral. `scanForMetricPair` finds an
 * identifiable lower/upper metric pair in an AST so evaluateNumerical can
 * run the check automatically.
 *
 * @module numerical/metric-inverse
 */
import type { ExprNode, Violation } from '../dimensional/validator.js';
import type { MetricTensorNode } from '../dimensional/metric-validators.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import type { TensorEngine } from './tensor-engine.js';
import type { NumericalInputs } from './types.js';
import { getActiveEngine } from './engine-registry.js';
import { NumericalBackendError } from './errors.js';

const DEFAULT_TOLERANCE = 1e-10;

/** Compute ‖g⁻¹g − I‖_∞ and, if it exceeds tolerance, return a warning.
 *  @public */
export async function evaluateMetricInverse(
  gInverse: MetricTensorNode,
  g: MetricTensorNode,
  inputs: NumericalInputs,
  tolerance: number = DEFAULT_TOLERANCE,
  options?: { engine?: TensorEngine },
): Promise<{ residualNorm: number; warning?: Violation }> {
  const engine = options?.engine ?? await getActiveEngine();
  const N = inputs.dimension ?? 4;

  const gInvData = inputs.tensors.get(gInverse.name);
  const gData = inputs.tensors.get(g.name);
  if (gInvData === undefined) {
    throw new NumericalBackendError(
      `evaluateMetricInverse: missing tensor components for "${gInverse.name}" in inputs.tensors`,
    );
  }
  if (gData === undefined) {
    throw new NumericalBackendError(
      `evaluateMetricInverse: missing tensor components for "${g.name}" in inputs.tensors`,
    );
  }
  const gInvT = engine.fromNested(gInvData, [N, N]);
  const gT = engine.fromNested(gData, [N, N]);
  const residual = engine.sub(engine.matMul(gInvT, gT), engine.identity(N));
  const residualNorm = engine.normInf(residual);

  if (residualNorm > tolerance) {
    const warning: Violation = {
      location: `${gInverse.name}·${g.name}`,
      expected: DIMENSIONLESS,
      actual: DIMENSIONLESS,
      note: `InverseMetricInconsistencyWarning: ‖${gInverse.name}·${g.name} − I‖_∞ = `
        + `${residualNorm.toExponential(3)} exceeds tolerance ${tolerance.toExponential(1)} — `
        + `the supplied metrics are not numerical inverses`,
      severity: 'warning',
    };
    return { residualNorm, warning };
  }
  return { residualNorm };
}

/** Walk an ExprNode tree; return the first all-lower / all-upper
 *  metric-tensor pair found, or null. Cheap — evaluateNumerical already
 *  walks the tree to lower it.
 *  @internal — cross-module use only; not part of the consumer surface. */
export function scanForMetricPair(
  node: ExprNode,
): { gLower: MetricTensorNode; gUpper: MetricTensorNode } | null {
  const metrics: MetricTensorNode[] = [];
  // An exhaustive switch: a node kind added to `ExprNode` without an arm here
  // fails to compile at the `never` arm, instead of becoming a silent leaf (the
  // way `kretschmann-scalar` and `einstein-equation` were, so the warning never
  // fired on them). A kind with no metric inside is listed as a leaf on purpose.
  const walk = (n: ExprNode): void => {
    switch (n.kind) {
      case 'metric-tensor':
        metrics.push(n);
        break;
      case 'op':
      case 'tensor-product':
        n.args.forEach(walk);
        break;
      case 'integral':
        walk(n.over);
        walk(n.integrand);
        if (n.lower !== undefined) walk(n.lower);
        if (n.upper !== undefined) walk(n.upper);
        break;
      case 'derivative':
        walk(n.of);
        walk(n.wrt);
        break;
      case 'variational-derivative':
        walk(n.functional);
        walk(n.field);
        walk(n.over);
        break;
      case 'dirac-delta':
      case 'transcendental':
      case 'abs':
        walk(n.arg);
        break;
      case 'tensor-partial-derivative':
        walk(n.of);
        walk(n.wrt);
        break;
      case 'covariant-derivative':
        walk(n.of);
        walk(n.gLower);
        walk(n.gInverse);
        break;
      case 'riemann-tensor':
        walk(n.gLower);
        walk(n.gInverse);
        break;
      case 'ricci-tensor':
      case 'bianchi-residual':
        walk(n.riemann); // the inner Riemann holds the pair
        break;
      case 'einstein-tensor':
        walk(n.riemann);
        walk(n.gLower);
        walk(n.gInverse);
        break;
      case 'weyl-tensor':
        walk(n.metric);
        break;
      case 'kretschmann-scalar':
        walk(n.riemann);
        walk(n.metric);
        break;
      case 'killing-vector':
        walk(n.metric);
        break;
      case 'conserved-charge':
        walk(n.killing);
        break;
      case 'einstein-equation':
        walk(n.lhs);
        walk(n.metric);
        break;
      case 'symbol':
      case 'tensor-symbol':
      case 'kronecker-delta':
      case 'stress-energy':
      case 'cosmological-constant':
        break; // leaves: no metric inside
      default: {
        const unreachable: never = n;
        throw new NumericalBackendError(`scanForMetricPair: unhandled node kind ${String((unreachable as { kind: unknown }).kind)}`);
      }
    }
  };
  walk(node);
  const lower = metrics.find((m) => m.indices.every((i) => i.variance === 'lower'));
  const upper = metrics.find((m) => m.indices.every((i) => i.variance === 'upper'));
  return lower && upper ? { gLower: lower, gUpper: upper } : null;
}
