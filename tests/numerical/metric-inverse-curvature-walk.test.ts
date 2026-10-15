/**
 * v0.5.1 Task 6 (PC-3): `scanForMetricPair` must walk the v0.4.0+v0.5.0
 * curvature AST kinds so that `InverseMetricInconsistencyWarning` actually
 * fires on the GR pipeline. Prior to this fix the walker stopped at
 * `op`/`tensor-product`/`integral`/`derivative`/`tensor-partial-derivative`
 * — every `riemann-tensor`, `ricci-tensor`, `einstein-tensor`,
 * `bianchi-residual`, and `covariant-derivative` node was a black box, so a
 * silently-inconsistent g/g⁻¹ pair would slip through.
 *
 * Strategy: build a real RiemannTensorNode against Schwarzschild closures
 * (so lowering succeeds), but feed `inputs.tensors` an INCONSISTENT
 * gLower/gInverse pair — these tensors are consumed by
 * `evaluateMetricInverse` (the residual-norm check), not by the FD
 * lowering (which reads `inputs.fields` closures). The lowering still
 * succeeds; the warning fires because `g·g⁻¹ ≠ I` on the supplied
 * `inputs.tensors` pair.
 */
import { describe, it, expect } from 'vitest';
import { evaluateNumerical } from '../../src/numerical/index.js';
import { scanForMetricPair } from '../../src/numerical/metric-inverse.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import type {
  EinsteinFieldEquationNode,
  EinsteinTensorNode,
  KretschmannScalarNode,
  RiemannTensorNode,
  StressEnergyTensorNode,
} from '../../src/dimensional/ast-types.js';
import { tsym } from '../../src/dimensional/tensor.js';
import { metric } from '../../src/dimensional/metric.js';
import { LENGTH, DIMENSIONLESS } from '../../src/dimensional/types.js';
import {
  schwarzschildRs,
  schwarzschildGFn,
  schwarzschildGInverseFn,
} from '../fixtures/schwarzschild.js';

function buildRiemannNode(): ExprNode {
  const gLower = metric(
    'g',
    [{ label: 'a', variance: 'lower' }, { label: 'b', variance: 'lower' }],
    DIMENSIONLESS,
    '+,-,-,-',
  );
  const gInverse = metric(
    'g_inv',
    [{ label: 'a', variance: 'upper' }, { label: 'b', variance: 'upper' }],
    DIMENSIONLESS,
    '+,-,-,-',
  );
  const xCoord = tsym('x', [{ label: 'c', variance: 'upper' }], LENGTH, 'coordinate');
  return {
    kind: 'riemann-tensor',
    upperIndex: { label: 'rho', variance: 'upper' },
    lowerIndices: [
      { label: 'sigma', variance: 'lower' },
      { label: 'mu', variance: 'lower' },
      { label: 'nu', variance: 'lower' },
    ],
    gLower,
    gInverse,
    xCoord,
  };
}

describe('scanForMetricPair walks v0.5.0 curvature node kinds (PC-3)', () => {
  it('fires InverseMetricInconsistencyWarning when gLower/gInverse inside a RiemannTensorNode disagree', async () => {
    const M_sun = 1.989e30;
    const r_s = schwarzschildRs(M_sun);
    const x = [0, 3 * r_s, Math.PI / 2, 0];
    const gFn = schwarzschildGFn(M_sun);
    const gInverseFn = schwarzschildGInverseFn(M_sun);

    // Inconsistent pair: identity vs non-identity (diag(2,2,2,2)) at this
    // coordinate. g·g⁻¹ = diag(2,2,2,2) ≠ I — should trigger the warning.
    const gBad: number[][] = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const gInvBad: number[][] = [
      [2, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 2, 0],
      [0, 0, 0, 2],
    ];

    const node = buildRiemannNode();
    const result = await evaluateNumerical(node, {
      tensors: new Map<string, number[][] | number[]>([
        ['g', gBad],
        ['g_inv', gInvBad],
        ['x', x],
      ]),
      // Fields use the good Schwarzschild closures so the FD lowering succeeds.
      fields: new Map([
        ['g', (xs: ReadonlyArray<number>) => gFn(xs) as unknown as number[][]],
        ['g_inv', (xs: ReadonlyArray<number>) => gInverseFn(xs) as unknown as number[][]],
      ]),
      dimension: 4,
    });

    expect(
      result.warnings.some((w) => w.note.includes('InverseMetricInconsistencyWarning')),
    ).toBe(true);
  });

  it('NO warning fires when gLower/gInverse inside a RiemannTensorNode are a true inverse pair', async () => {
    const M_sun = 1.989e30;
    const r_s = schwarzschildRs(M_sun);
    const x = [0, 3 * r_s, Math.PI / 2, 0];
    const gFn = schwarzschildGFn(M_sun);
    // v0.9.0: the fixture returns a row-major Float64Array(16); unflatten at
    // the nested-array evaluateNumerical boundary (O-4 deferral) so the
    // inverse-pair consistency scan sees a true number[][] pair.
    const gInverseFlatFn = schwarzschildGInverseFn(M_sun);
    const gInverseFn = (xs: ReadonlyArray<number>): number[][] => {
      const flat = gInverseFlatFn(xs);
      return Array.from({ length: 4 }, (_, mu) =>
        Array.from({ length: 4 }, (_, nu) => flat[mu * 4 + nu]),
      );
    };

    const node = buildRiemannNode();
    const result = await evaluateNumerical(node, {
      tensors: new Map<string, number[] | number[][]>([
        ['g', gFn(x) as unknown as number[][]],
        ['g_inv', gInverseFn(x)],
        ['x', x],
      ]),
      fields: new Map([
        ['g', (xs: ReadonlyArray<number>) => gFn(xs) as unknown as number[][]],
        ['g_inv', gInverseFn],
      ]),
      dimension: 4,
    });

    expect(
      result.warnings.some((w) => w.note.includes('InverseMetricInconsistencyWarning')),
    ).toBe(false);
  });
});

/**
 * The walk is an exhaustive switch over `ExprNode` now: a `kretschmann-scalar`
 * and an `einstein-equation` hold a metric and were not walked (no `never`
 * arm, so a new kind was silently a leaf). Checked on the scan directly: the
 * pair must be found inside each.
 */
describe('scanForMetricPair walks every node kind that holds a metric', () => {
  const riemann = buildRiemannNode() as RiemannTensorNode;

  it('finds the pair inside a kretschmann-scalar node', () => {
    const node: KretschmannScalarNode = { kind: 'kretschmann-scalar', riemann, metric: riemann.gLower };
    const pair = scanForMetricPair(node);
    expect(pair).not.toBeNull();
    expect(pair!.gLower).toBe(riemann.gLower);
    expect(pair!.gUpper).toBe(riemann.gInverse);
  });

  it('finds the pair inside an einstein-equation node', () => {
    const lhs: EinsteinTensorNode = { kind: 'einstein-tensor', riemann, gLower: riemann.gLower, gInverse: riemann.gInverse };
    const rhs: StressEnergyTensorNode = {
      kind: 'stress-energy',
      symbol: 'T',
      indices: [
        { label: 'mu', variance: 'lower' },
        { label: 'nu', variance: 'lower' },
      ],
      symmetry: 'symmetric',
      componentDim: DIMENSIONLESS,
    };
    const node: EinsteinFieldEquationNode = {
      kind: 'einstein-equation',
      lhs,
      cosmological: null,
      metric: riemann.gLower,
      rhs,
      coupling: 'einstein',
    };
    const pair = scanForMetricPair(node);
    expect(pair).not.toBeNull();
    expect(pair!.gUpper).toBe(riemann.gInverse);
  });

  it('the control: a riemann-tensor node is still found, and a bare symbol holds none', () => {
    expect(scanForMetricPair(riemann)).not.toBeNull();
    expect(scanForMetricPair({ kind: 'symbol', name: 'x', dim: DIMENSIONLESS })).toBeNull();
  });
});
