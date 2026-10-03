/**
 * NEW-1 (v0.5.1 Task 16): Flat-Minkowski zero-tests for the entire v0.5.0
 * curvature pipeline.
 *
 * Adam's "miss-case" finding (v0.5.1 audit): every existing curvature test
 * lives on a curved fixture (Schwarzschild / de Sitter) where FD truncation
 * floors hide convention bugs. Minkowski has all-zero curvature analytically,
 * so any non-zero output is a real bug — and FD-truncation noise on
 * x-independent metric closures collapses to machine precision (no
 * cancellation between competing O(1/L²) terms).
 *
 * **Geometrized metric note.** Tests use `geometrizedMinkowskiGFn` (c=1) rather
 * than the SI `minkowskiGFn` (g_tt = −c²) — same precedent and reasoning as
 * `tests/dimensional/bianchi-residual.test.ts`'s
 * `geometrizedSchwarzschildGFn`: the SI c²-on-g_tt scaling pushes
 * machine-epsilon cancellation in any FD-driven curvature contraction to
 * O(c²·eps) ≈ O(10–1000) absolute. Curvature identities are
 * metric-rescaling-invariant, so c→1 is a physically-equivalent and
 * numerically-clean test fixture for the "curvature ≡ 0" assertion. SI
 * variant remains exported for non-curvature consumers.
 *
 * Tests (all 5 asserted to machine-precision tolerances ≤1e-12):
 *   1. Riemann lowering — all 256 components |R^ρ_{σμν}(x)| ≤ 1e-12.
 *   2. Ricci R_μν ≡ 0.
 *   3. Einstein G_μν ≡ 0.
 *   4. Ricci scalar R = g^μν R_μν is zero.
 *   5. Bianchi residual evaluateMax is zero (vacuum self-consistency).
 *
 * ESCALATION (per plan Task 16): ANY failure here is a v0.5.1 release-blocker
 * — a flat-spacetime convention regression. STOP and report.
 *
 * Spec: docs/planning/v0.5.1-Implementation-Plan.md Task 16 / Design Decision #5.
 */
import { describe, it, expect } from 'vitest';
import { ricci, einstein } from '../../src/dimensional/curvature.js';
import { bianchiResidual } from '../../src/numerical/bianchi-residual.js';
import { evaluateNumerical } from '../../src/numerical/index.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import type { ExprNode, RiemannTensorNode } from '../../src/dimensional/validator.js';
import { tsym } from '../../src/dimensional/tensor.js';
import { metric } from '../../src/dimensional/metric.js';
import { LENGTH, DIMENSIONLESS } from '../../src/dimensional/types.js';
import {
  geometrizedMinkowskiGFn as minkowskiGFn,
  geometrizedMinkowskiGInverseFn as minkowskiGInverseFlatFn,
} from '../fixtures/minkowski.js';

/**
 * O-4 sibling-fixture unification (2026-06-11): the fixture now returns a
 * row-major Float64Array(16); unflatten at the nested-array
 * evaluateNumerical boundary (same shim shape as the v0.9.0 Schwarzschild
 * consumers). Keeps the five test bodies untouched.
 */
function minkowskiGInverseFn(): (xs: ReadonlyArray<number>) => number[][] {
  const flatFn = minkowskiGInverseFlatFn();
  return (xs: ReadonlyArray<number>): number[][] => {
    const flat = flatFn(xs);
    return Array.from({ length: 4 }, (_, mu) =>
      Array.from({ length: 4 }, (_, nu) => flat[mu * 4 + nu]),
    );
  };
}

/** Build a RiemannTensorNode wired to the canonical 'g' / 'g_inv' / 'x' inputs. */
function buildRiemann(): RiemannTensorNode {
  const gLower = metric(
    'g',
    [
      { label: 'a', variance: 'lower' },
      { label: 'b', variance: 'lower' },
    ],
    DIMENSIONLESS,
    '+,-,-,-',
  );
  const gInverse = metric(
    'g_inv',
    [
      { label: 'a', variance: 'upper' },
      { label: 'b', variance: 'upper' },
    ],
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

function buildMetricNodes() {
  const gLower = metric(
    'g',
    [
      { label: 'a', variance: 'lower' },
      { label: 'b', variance: 'lower' },
    ],
    DIMENSIONLESS,
    '+,-,-,-',
  );
  const gInverse = metric(
    'g_inv',
    [
      { label: 'a', variance: 'upper' },
      { label: 'b', variance: 'upper' },
    ],
    DIMENSIONLESS,
    '+,-,-,-',
  );
  return { gLower, gInverse };
}

/** Canonical Minkowski sample point — non-zero spatial coords so FD step
 * h = 1e-4·max(|x|,1) doesn't pin to the absolute-1 floor on a 0-vector. */
const x = [0, 1.0, 1.0, 1.0];

describe('Minkowski curvature zero-tests (NEW-1: flat-spacetime sanity)', () => {
  it('Riemann lowering: all 256 R^ρ_{σμν} components |·| ≤ 1e-12 (machine-precision flat-space)', async () => {
    // The v0.5.0 lowering for a bare riemann-tensor node returns R^ρ_{σμν}
    // in its upper-first form (per src/numerical/lowering.ts case
    // 'riemann-tensor'). On a flat metric every component must be analytically
    // zero; FD truncation on x-independent g collapses to numerical noise far
    // below the curved-fixture 8e-10 / 5e-9 floors.
    const R = buildRiemann();
    const gFn = minkowskiGFn();
    const gInverseFn = minkowskiGInverseFn();

    const result = await evaluateNumerical(R as ExprNode, {
      tensors: new Map<string, number[] | number[][]>([
        ['g', gFn(x)],
        ['g_inv', gInverseFn(x)],
        ['x', x],
      ]),
      fields: new Map([
        ['g', (xs: ReadonlyArray<number>) => gFn(xs) as unknown as number[][]],
        ['g_inv', (xs: ReadonlyArray<number>) => gInverseFn(xs) as unknown as number[][]],
      ]),
      dimension: 4,
    });

    // Walk the (possibly nested) value, collect every numeric leaf.
    let maxAbs = 0;
    let count = 0;
    const walk = (v: unknown): void => {
      if (typeof v === 'number') {
        const a = Math.abs(v);
        if (a > maxAbs) maxAbs = a;
        count++;
        return;
      }
      if (Array.isArray(v)) for (const c of v) walk(c);
    };
    walk(result.value);
    expect(count).toBe(256); // 4×4×4×4 — sanity that we covered the full tensor.
    expect(maxAbs).toBeLessThan(1e-12);
  });

  it('Ricci R_μν ≡ 0 on Minkowski (|R_μν| ≤ 1e-12 across all 16 components)', async () => {
    const ricciNode = ricci(buildRiemann());
    const gFn = minkowskiGFn();
    const gInverseFn = minkowskiGInverseFn();

    const result = await evaluateNumerical(ricciNode as ExprNode, {
      tensors: new Map<string, number[] | number[][]>([
        ['g', gFn(x)],
        ['g_inv', gInverseFn(x)],
        ['x', x],
      ]),
      fields: new Map([
        ['g', (xs: ReadonlyArray<number>) => gFn(xs) as unknown as number[][]],
        ['g_inv', (xs: ReadonlyArray<number>) => gInverseFn(xs) as unknown as number[][]],
      ]),
      dimension: 4,
    });
    const Ric = result.value as unknown as number[][];
    expect(Array.isArray(Ric)).toBe(true);
    expect(Ric.length).toBe(4);

    let maxAbs = 0;
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        maxAbs = Math.max(maxAbs, Math.abs(Ric[mu][nu]));
      }
    }
    expect(maxAbs).toBeLessThan(1e-12);
  });

  it('Einstein G_μν ≡ 0 on Minkowski (|G_μν| ≤ 1e-12 across all 16 components)', async () => {
    const R = buildRiemann();
    const { gLower, gInverse } = buildMetricNodes();
    const einsteinNode = einstein(R, gLower, gInverse);
    const gFn = minkowskiGFn();
    const gInverseFn = minkowskiGInverseFn();

    const result = await evaluateNumerical(einsteinNode as ExprNode, {
      tensors: new Map<string, number[] | number[][]>([
        ['g', gFn(x)],
        ['g_inv', gInverseFn(x)],
        ['x', x],
      ]),
      fields: new Map([
        ['g', (xs: ReadonlyArray<number>) => gFn(xs) as unknown as number[][]],
        ['g_inv', (xs: ReadonlyArray<number>) => gInverseFn(xs) as unknown as number[][]],
      ]),
      dimension: 4,
    });
    const G = result.value as unknown as number[][];
    let maxAbs = 0;
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        maxAbs = Math.max(maxAbs, Math.abs(G[mu][nu]));
      }
    }
    expect(maxAbs).toBeLessThan(1e-12);
  });

  it('Ricci scalar R = g^μν R_μν is zero on Minkowski (|R| ≤ 1e-12)', async () => {
    const ricciNode = ricci(buildRiemann());
    const gFn = minkowskiGFn();
    const gInverseFn = minkowskiGInverseFn();

    const result = await evaluateNumerical(ricciNode as ExprNode, {
      tensors: new Map<string, number[] | number[][]>([
        ['g', gFn(x)],
        ['g_inv', gInverseFn(x)],
        ['x', x],
      ]),
      fields: new Map([
        ['g', (xs: ReadonlyArray<number>) => gFn(xs) as unknown as number[][]],
        ['g_inv', (xs: ReadonlyArray<number>) => gInverseFn(xs) as unknown as number[][]],
      ]),
      dimension: 4,
    });
    const Ric = result.value as unknown as number[][];
    const gInv = gInverseFn(x);

    let R_scalar = 0;
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        R_scalar += gInv[mu][nu] * Ric[mu][nu];
      }
    }
    expect(Math.abs(R_scalar)).toBeLessThan(1e-12);
  });

  it('Bianchi residual evaluateMax is zero on Minkowski (vacuum self-consistency, |B| ≤ 1e-12)', async () => {
    const R = buildRiemann();
    const br = bianchiResidual(R);
    const gFn = minkowskiGFn();
    const gInverseFn = minkowskiGInverseFn();
    const engine = new MathTSEngine();

    const inputs = {
      tensors: new Map<string, number[] | number[][]>([
        ['g', gFn(x)],
        ['g_inv', gInverseFn(x)],
        ['x', x],
      ]),
      fields: new Map([
        ['g', (xs: ReadonlyArray<number>) => gFn(xs) as unknown as number[][]],
        ['g_inv', (xs: ReadonlyArray<number>) => gInverseFn(xs) as unknown as number[][]],
      ]),
      dimension: 4,
    };

    const maxResidual = await br.evaluateMax(engine, inputs);
    expect(Number.isFinite(maxResidual)).toBe(true);
    expect(Math.abs(maxResidual)).toBeLessThan(1e-12);
  });
});
