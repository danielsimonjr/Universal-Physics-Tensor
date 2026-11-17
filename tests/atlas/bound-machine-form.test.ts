/**
 * The machine form of `ApproximationBound.delta`, and the EDGE witness for
 * every repaired bound.
 *
 * Both defects this file pins were edge-only. `ab-pendulum-linear` declared
 * the series `θ0²/16` at `θ0 = 0.5`, which is 1.456% BELOW the exact error at
 * that same `θ0` — violated at its own boundary, while passing at every
 * interior point anybody sampled. `ab-damped-massless` declared its formula
 * frozen at the fixture mass `m = 1e-3`, 40x below the true error at the edge
 * of its own overdamped range. So a fixture-point assertion is exactly the
 * instrument that cannot see this defect class, and every assertion below is
 * taken AT THE EDGE of the declared domain.
 *
 * Each repaired bound also carries a NEGATIVE CONTROL: the same edge
 * measurement run against the OLD frozen value, asserted to FAIL. A test that
 * has never been observed failing is a comment.
 */

import { describe, expect, it } from 'vitest';

import {
  AB_DAMPED_MASSLESS,
  AB_PENDULUM_LINEAR,
  dampedOffsetBoundAt,
  pendulumPeriodErrorAt,
} from '../../src/atlas/oscillators/bridges-limits.js';
import { BRIDGE_CHAIN_WAVE } from '../../src/atlas/oscillators/bridges-coarse.js';
import { admitApproximation } from '../../src/atlas/regime.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { findPath } from '../../src/atlas/path-bound.js';
import { MissingDeltaAtError } from '../../src/atlas/types.js';
import type { ApproximationBound, AtlasBridge } from '../../src/atlas/types.js';

/** The value `ab-pendulum-linear` declared before this repair. */
const OLD_PENDULUM_DELTA = 0.5 ** 2 / 16;
/** The value `ab-damped-massless` declared before this repair. */
const OLD_DAMPED_DELTA = 2 * (1 + 5) * 1e-3;

/**
 * True relative period error by an INDEPENDENT method: composite-trapezoid
 * quadrature of `T/T0 = (2/π) ∫₀^{π/2} dφ / √(1 − k² sin²φ)`.
 *
 * Deliberately not the AGM the bound itself uses — a bound checked against its
 * own evaluator checks arithmetic, not physics.
 */
function periodErrorByQuadrature(theta0: number, steps = 200_000): number {
  const k = Math.sin(theta0 / 2);
  const h = Math.PI / 2 / steps;
  let sum = 0;
  for (let i = 0; i <= steps; i++) {
    const phi = i * h;
    const f = 1 / Math.sqrt(1 - k * k * Math.sin(phi) ** 2);
    sum += (i === 0 || i === steps ? 0.5 : 1) * f;
  }
  return (2 / Math.PI) * sum * h - 1;
}

/** Real characteristic roots of `m r² + b r + k = 0`, overdamped. */
function roots(m: number, b: number, k: number): { slow: number; fast: number } {
  const disc = Math.sqrt(b * b - 4 * m * k);
  return { slow: (-b + disc) / (2 * m), fast: (-b - disc) / (2 * m) };
}

/**
 * `sup |x_full − x_reduced|` over the OUTER region `t ≥ 5 m/b`, for
 * `x(0) = 1, x′(0) = v0`, at the witness normalisation `b = k = 1`.
 */
function dampedOuterSup(m: number, v0: number, b = 1, k = 1): number {
  const { slow, fast } = roots(m, b, k);
  const A = (v0 - fast) / (slow - fast);
  const B = (slow - v0) / (slow - fast);
  const x = (t: number): number => A * Math.exp(slow * t) + B * Math.exp(fast * t);
  const reduced = (t: number): number => Math.exp((-k / b) * t);
  const t0 = (5 * m) / b;
  const tEnd = 60;
  let sup = 0;
  for (let i = 0; i <= 200_000; i++) {
    const t = t0 + (i * (tEnd - t0)) / 200_000;
    sup = Math.max(sup, Math.abs(x(t) - reduced(t)));
  }
  return sup;
}

describe('ApproximationBound.deltaAt — the machine form of delta', () => {
  it.each([AB_PENDULUM_LINEAR, AB_DAMPED_MASSLESS])(
    '$id carries deltaAt beside delta',
    (bridge) => {
      expect(typeof bridge.bound?.deltaAt).toBe('function');
      expect(Number.isFinite(bridge.bound?.delta)).toBe(true);
    },
  );

  it('admits both approximation bridges', () => {
    expect(admitApproximation(AB_PENDULUM_LINEAR)).toBe(AB_PENDULUM_LINEAR);
    expect(admitApproximation(AB_DAMPED_MASSLESS)).toBe(AB_DAMPED_MASSLESS);
  });

  it('refuses an approximation whose delta has no machine form', () => {
    const bound = AB_PENDULUM_LINEAR.bound as ApproximationBound;
    const { deltaAt: _dropped, ...frozen } = bound;
    const broken = { ...AB_PENDULUM_LINEAR, bound: frozen as ApproximationBound };
    expect(() => admitApproximation(broken)).toThrow(MissingDeltaAtError);
    expect(() => admitApproximation(broken)).toThrow(/ab-pendulum-linear/);
  });

  it('still admits the coarse-graining bridge, which carries no bound at all', () => {
    expect(BRIDGE_CHAIN_WAVE.bound).toBeUndefined();
    expect(admitApproximation(BRIDGE_CHAIN_WAVE as AtlasBridge)).toBe(BRIDGE_CHAIN_WAVE);
  });

  it('returns no finite bound when a required parameter is absent or unusable', () => {
    expect(pendulumPeriodErrorAt({})).toBe(Infinity);
    expect(pendulumPeriodErrorAt({ theta0: Math.PI })).toBe(Infinity);
    // A missing v0 must NOT quietly yield the smaller v0 = 0 bound.
    expect(dampedOffsetBoundAt({ m: 0.1, b: 1, k: 1, x0: 1 })).toBe(Infinity);
    expect(dampedOffsetBoundAt({ m: 0.1, b: 0, k: 1, x0: 1, v0: 5 })).toBe(Infinity);
  });
});

/**
 * Exact outer-region sup of `|x − x_reduced|` for `m x″ + b x′ + k x = 0`,
 * `x(0) = x0`, `x′(0) = v0`, over `t ≥ 5 m/b`, sampled on a grid that is dense
 * near the layer edge and runs to 40 slow time constants.
 */
function dampedOuterSupAt(m: number, b: number, k: number, x0: number, v0: number): number {
  const { slow, fast } = roots(m, b, k);
  const A = (v0 - fast * x0) / (slow - fast);
  const B = (slow * x0 - v0) / (slow - fast);
  const t0 = (5 * m) / b;
  const tEnd = t0 + (40 * b) / k;
  let sup = 0;
  for (let i = 0; i <= 20_000; i++) {
    const t = t0 + (tEnd - t0) * (i / 20_000) ** 2;
    sup = Math.max(sup, Math.abs(A * Math.exp(slow * t) + B * Math.exp(fast * t) - x0 * Math.exp((-k / b) * t)));
  }
  return sup;
}

/** The bound with the coefficient of its `k|x0|/b` term set to `c` (c = 1 is the record's). */
const boundWithC = (c: number, m: number, b: number, k: number, x0: number, v0: number): number =>
  (m / b) * (Math.abs(v0) + (c * k * Math.abs(x0)) / b);

/** The grid of the derivation: ε = m k/b² inside the overdamped range, up to its open edge. */
const GRID: { m: number; b: number; k: number; x0: number; v0: number }[] = [];
for (const eps of [1e-4, 1e-3, 1e-2, 0.05, 0.1, 0.2, 0.24, 0.2499]) {
  for (const b of [0.5, 1, 2, 4]) {
    for (const k of [0.3, 1, 3, 10]) {
      for (const x0 of [1, -2, 0.5]) {
        for (const v0 of [0, 5, -5, 2]) GRID.push({ m: (eps * b * b) / k, b, k, x0, v0 });
      }
    }
  }
}

describe('ab-damped-massless — deltaAt = (m/b)(|v0| + k|x0|/b) is dimensionally consistent (panel C3)', () => {
  it('scales exactly as a length under a consistent change of units (M = 3, T = 0.5, L = 7)', () => {
    const [M, T, L] = [3, 0.5, 7];
    const p = { m: 0.02, b: 1, k: 1, x0: 1, v0: 5 };
    const q = { m: M * p.m, b: (M / T) * p.b, k: (M / T ** 2) * p.k, x0: L * p.x0, v0: (L / T) * p.v0 };
    expect(dampedOffsetBoundAt(q) / dampedOffsetBoundAt(p)).toBeCloseTo(L, 12);
  });

  it.each([0, 5])('is finite off the normalisation and covers the true error at k = 100, v0 = %s', (v0) => {
    // m k / b² = 0.1 is inside the declared overdamped range.
    const bound = dampedOffsetBoundAt({ m: 1e-3, b: 1, k: 100, x0: 1, v0 });
    expect(Number.isFinite(bound)).toBe(true);
    expect(dampedOuterSupAt(1e-3, 1, 100, 1, v0)).toBeLessThanOrEqual(bound);
  });

  it(`covers the exact two-root sup on all ${GRID.length} grid points (c = 1 is a measured claim)`, () => {
    const misses = GRID.filter((g) => dampedOuterSupAt(g.m, g.b, g.k, g.x0, g.v0) > dampedOffsetBoundAt(g));
    expect(misses).toEqual([]);
  });

  it('NEGATIVE CONTROL: c = 0.5 is refuted on the same grid at v0 = 0', () => {
    const misses = GRID.filter(
      (g) => g.v0 === 0 && dampedOuterSupAt(g.m, g.b, g.k, g.x0, g.v0) > boundWithC(0.5, g.m, g.b, g.k, g.x0, g.v0),
    );
    expect(misses.length).toBeGreaterThan(0);
  });

  it('returns Infinity when k or x0 is missing, or when b or k is not positive or m is negative', () => {
    expect(dampedOffsetBoundAt({ m: 1e-3, b: 1, v0: 0 })).toBe(Infinity);
    expect(dampedOffsetBoundAt({ m: 1e-3, b: 1, k: 1, v0: 0 })).toBe(Infinity);
    expect(dampedOffsetBoundAt({ m: 1e-3, b: -1, k: 1, x0: 1, v0: 0 })).toBe(Infinity);
    expect(dampedOffsetBoundAt({ m: 1e-3, b: 1, k: 0, x0: 1, v0: 0 })).toBe(Infinity);
    expect(dampedOffsetBoundAt({ m: -1e-3, b: 1, k: 1, x0: 1, v0: 0 })).toBe(Infinity);
  });

  it('keeps delta at the witness normalisation, where the edge value is 1.5', () => {
    expect(dampedOffsetBoundAt({ m: 0.25, b: 1, k: 1, x0: 1, v0: 5 })).toBeCloseTo(1.5, 12);
    expect(AB_DAMPED_MASSLESS.bound?.delta).toBeCloseTo(1.5, 12);
  });
});

describe('ab-pendulum-linear — delta covers the true error AT THE DOMAIN EDGE', () => {
  const EDGE = 0.5; // the declared regime is θ0 ≤ 0.5 rad

  it('measures the exact edge error as 0.0158525311, by quadrature', () => {
    const measured = periodErrorByQuadrature(EDGE);
    expect(measured).toBeCloseTo(0.0158525311014, 10);
  });

  it('declares a delta that covers the edge error', () => {
    const measured = periodErrorByQuadrature(EDGE);
    const declared = AB_PENDULUM_LINEAR.bound?.delta ?? Number.NaN;
    // Sharp bound: equal to the error it bounds, up to quadrature error.
    expect(declared).toBeGreaterThanOrEqual(measured * (1 - 1e-9));
    expect(declared).toBeCloseTo(0.0158525311014, 10);
  });

  it('NEGATIVE CONTROL: the OLD frozen delta fails the same edge assertion', () => {
    const measured = periodErrorByQuadrature(EDGE);
    expect(OLD_PENDULUM_DELTA).toBeLessThan(measured);
    // ...and by how much: 1.456% short at its own boundary.
    expect((measured - OLD_PENDULUM_DELTA) / measured).toBeGreaterThan(0.014);
  });

  it('deltaAt is monotone, so the edge value IS the supremum over the range', () => {
    let previous = -Infinity;
    for (const theta0 of [0.05, 0.1, 0.2, 0.3, 0.4, 0.49, EDGE]) {
      const value = pendulumPeriodErrorAt({ theta0 });
      expect(value).toBeGreaterThan(previous);
      expect(value).toBeLessThanOrEqual(AB_PENDULUM_LINEAR.bound?.delta ?? Number.NaN);
      previous = value;
    }
  });

  it('deltaAt tracks the true error at interior points the scalar cannot', () => {
    for (const theta0 of [0.1, 0.2, 0.4]) {
      expect(pendulumPeriodErrorAt({ theta0 })).toBeCloseTo(
        periodErrorByQuadrature(theta0),
        10,
      );
    }
  });
});

describe('ab-damped-massless — delta covers the true error AT THE DOMAIN EDGE', () => {
  // Declared range: m k/b² < 1/4 with b = k = 1, so m < 1/4, and |v0| ≤ 5.
  // The edge is open, so it is approached at m just below 1/4.
  const EDGE_M = 0.2499;
  const EDGE_V0 = 5;

  it('measures a true edge error 40x the OLD frozen delta', () => {
    const measured = dampedOuterSup(EDGE_M, EDGE_V0);
    expect(measured).toBeGreaterThan(0.5);
    expect(measured / OLD_DAMPED_DELTA).toBeGreaterThan(40);
  });

  it('declares a delta that covers the edge error', () => {
    const declared = AB_DAMPED_MASSLESS.bound?.delta ?? Number.NaN;
    expect(declared).toBeCloseTo(1.5, 12);
    expect(declared).toBeGreaterThan(dampedOuterSup(EDGE_M, EDGE_V0));
  });

  it('NEGATIVE CONTROL: the OLD frozen delta fails the same edge assertion', () => {
    expect(OLD_DAMPED_DELTA).toBeLessThan(dampedOuterSup(EDGE_M, EDGE_V0));
  });

  it('covers the true error across the declared range, not only at the fixture', () => {
    for (const m of [1e-3, 1e-2, 1e-1, 0.24, EDGE_M]) {
      const measured = dampedOuterSup(m, EDGE_V0);
      expect(measured).toBeLessThan(dampedOffsetBoundAt({ m, b: 1, k: 1, x0: 1, v0: EDGE_V0 }));
      expect(measured).toBeLessThan(AB_DAMPED_MASSLESS.bound?.delta ?? Number.NaN);
    }
  });

  it('deltaAt never exceeds delta on the declared range', () => {
    const declared = AB_DAMPED_MASSLESS.bound?.delta ?? Number.NaN;
    for (const m of [1e-3, 1e-2, 1e-1, 0.24, EDGE_M]) {
      for (const v0 of [0, 1, 5]) {
        expect(dampedOffsetBoundAt({ m, b: 1, k: 1, x0: 1, v0 })).toBeLessThanOrEqual(declared);
      }
    }
  });
});

describe('ab-pendulum-linear — the series horizon is the conservative one (persona finding D8 stands)', () => {
  // The π/2-drift time is t = T0 (1 + e) / (4 e), with e the EXACT relative period error. The record's
  // horizon uses the series 4 T0/θ0². A horizon is safe when it is not LONGER than the exact one.
  it('4 T0/θ0² never exceeds the exact π/2-drift time on the domain θ0 ≤ 0.5', () => {
    for (let theta0 = 0.05; theta0 <= 0.5 + 1e-12; theta0 += 0.05) {
      const e = pendulumPeriodErrorAt({ theta0 });
      const exact = (1 + e) / (4 * e);
      const series = 4 / theta0 ** 2;
      expect(series).toBeLessThanOrEqual(exact);
    }
  });

  it('the gap is small: 100 T0 against 100.0208 T0 at θ0 = 0.2 (99.771 cycles of the true period)', () => {
    const e = pendulumPeriodErrorAt({ theta0: 0.2 });
    expect((1 + e) / (4 * e)).toBeCloseTo(100.0208, 3);
    expect(1 / (4 * e)).toBeCloseTo(99.7708, 3);
  });
});

/** The bounded approximations on a route, in route order. */
const boundedApproximations = (path: readonly AtlasBridge[]): readonly AtlasBridge[] =>
  path.filter((b) => b.relation === 'approximation' && (b.bound?.delta ?? 0) > 0);

describe('declared K is never multiplied into a nonzero δ (persona finding Q-c stands)', () => {
  // (K_o, δ_o) ∘ (K_i, δ_i) = (K_o K_i, K_o δ_i + δ_o). An approximation's K changes a composed δ only
  // when an inner edge on the same route has δ > 0, i.e. only on a route with TWO bounded
  // approximations. Every approximation declares K = 1 rather than deriving it (law 1); that is
  // harmless exactly while no such route exists. When this test fails, derive K first.
  it('no route that findPath returns, in any family, composes two bounded approximations', () => {
    const offenders: string[] = [];
    let routes = 0;
    for (const fam of ATLAS_FAMILIES) {
      for (const from of fam.models) {
        for (const to of fam.models) {
          if (from.id === to.id) continue;
          const path = findPath(fam.family, from.id, to.id);
          if (path === null) continue;
          routes++;
          if (boundedApproximations(path).length >= 2) offenders.push(`${fam.family}: ${path.map((b) => b.id).join(' → ')}`);
        }
      }
    }
    expect(routes).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it('NEGATIVE CONTROL: the detector flags a route that composes two bounded approximations', () => {
    expect(boundedApproximations([AB_PENDULUM_LINEAR, AB_DAMPED_MASSLESS])).toHaveLength(2);
  });
});
