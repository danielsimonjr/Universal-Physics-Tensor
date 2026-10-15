/**
 * Proposal 18: an exact second method for the curvature pipeline.
 *
 * The library's Christoffels are finite differences of the metric, and its
 * ∂Γ finite differences of those (`christoffelAt`, `dGammaAt`), with a
 * Bianchi noise floor the existing test gates at 1e-5. Here the geometrized
 * Schwarzschild metric is written as expression strings and MathTS's
 * symbolic `derivative` is applied once for ∂g and twice for ∂∂g; Γ, ∂Γ and
 * the Riemann tensor are then assembled exactly and the finite-difference
 * pipeline is compared against them at a few radii. The pins are the errors
 * measured on this tree with a margin; the Bianchi residual of the FD
 * pipeline is compared against its exact value, 0.
 *
 * Coordinates (t, r, θ, φ), c = 1, r_s = 1: g = diag(−f, 1/f, r², r² sin²θ), f = 1 − r_s/r.
 */
import { describe, expect, it } from 'vitest';
import { derivative } from '@danielsimonjr/mathts-functions';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import {
  christoffelAt,
  covariantDerivRiemannLowerAt,
  dGammaAt,
  riemannUpperAt,
} from '../../src/numerical/curvature-lowering-helpers.js';

const N = 4;
const COORDS = ['t', 'r', 'theta', 'phi'] as const;
const RS = 1;

/** The diagonal metric components as MathTS expression text. */
const G_TEXT = ['-(1 - rs/r)', '1/(1 - rs/r)', 'r^2', 'r^2*sin(theta)^2'] as const;

interface SymbolicNode {
  evaluate(scope: Record<string, number>): unknown;
}

function symbolic(expr: string | SymbolicNode, by: string): SymbolicNode {
  return derivative(expr as never, by) as unknown as SymbolicNode;
}

function num(node: SymbolicNode, scope: Record<string, number>): number {
  const v = node.evaluate(scope);
  if (typeof v !== 'number') throw new TypeError('symbolic derivative did not evaluate to a number');
  return v;
}

/** ∂_λ g_μμ and ∂_κ ∂_λ g_μμ, exact, as MathTS nodes. */
const D1: SymbolicNode[][] = COORDS.map((c) => G_TEXT.map((g) => symbolic(g, c))); // [λ][μ]
const D2: SymbolicNode[][][] = COORDS.map((k) => COORDS.map((l) => G_TEXT.map((g) => symbolic(symbolic(g, l), k)))); // [κ][λ][μ]

const gFn = (x: ReadonlyArray<number>): number[][] => {
  const r = x[1]!;
  const theta = x[2]!;
  const f = 1 - RS / r;
  return [
    [-f, 0, 0, 0],
    [0, 1 / f, 0, 0],
    [0, 0, r * r, 0],
    [0, 0, 0, r * r * Math.sin(theta) ** 2],
  ];
};
const gInvFn = (x: ReadonlyArray<number>): number[][] => {
  const g = gFn(x);
  return g.map((row, i) => row.map((v, j) => (i === j ? 1 / v : 0)));
};

interface Exact {
  gamma: number[][][]; // Γ[ρ][μ][ν]
  dGamma: number[][][][]; // ∂_κ Γ[κ][ρ][μ][ν]
  riemann: number[][][][]; // R^ρ_{σμν} as [ρ][σ][μ][ν]
}

/** Γ, ∂Γ and R from the exact derivatives of a DIAGONAL metric. */
function exactAt(x: readonly number[]): Exact {
  const scope = { rs: RS, t: x[0]!, r: x[1]!, theta: x[2]!, phi: x[3]! };
  const g = gFn(x).map((row, i) => row[i]!);
  const dg = D1.map((row) => row.map((node) => num(node, scope))); // dg[λ][μ]
  const ddg = D2.map((plane) => plane.map((row) => row.map((node) => num(node, scope)))); // ddg[κ][λ][μ]
  const zeros3 = (): number[][][] => Array.from({ length: N }, () => Array.from({ length: N }, () => new Array<number>(N).fill(0)));
  const gamma = zeros3();
  const dGamma: number[][][][] = Array.from({ length: N }, zeros3);
  // ½ g^{ρρ} (∂_μ g_ρν + ∂_ν g_ρμ − ∂_ρ g_μν), with g_ρν nonzero only for ρ = ν.
  const half = (rho: number, mu: number, nu: number): number =>
    0.5 * ((rho === nu ? dg[mu]![rho]! : 0) + (rho === mu ? dg[nu]![rho]! : 0) - (mu === nu ? dg[rho]![mu]! : 0));
  const dHalf = (k: number, rho: number, mu: number, nu: number): number =>
    0.5 *
    ((rho === nu ? ddg[k]![mu]![rho]! : 0) + (rho === mu ? ddg[k]![nu]![rho]! : 0) - (mu === nu ? ddg[k]![rho]![mu]! : 0));
  for (let rho = 0; rho < N; rho++) {
    const gInv = 1 / g[rho]!;
    for (let mu = 0; mu < N; mu++) {
      for (let nu = 0; nu < N; nu++) {
        const bracket = half(rho, mu, nu);
        gamma[rho]![mu]![nu] = gInv * bracket;
        for (let k = 0; k < N; k++) {
          const dgInv = -dg[k]![rho]! / (g[rho]! * g[rho]!);
          dGamma[k]![rho]![mu]![nu] = dgInv * bracket + gInv * dHalf(k, rho, mu, nu);
        }
      }
    }
  }
  // R^ρ_{σμν} = ∂_μ Γ^ρ_{νσ} − ∂_ν Γ^ρ_{μσ} + Γ^ρ_{μλ} Γ^λ_{νσ} − Γ^ρ_{νλ} Γ^λ_{μσ}
  const riemann: number[][][][] = Array.from({ length: N }, zeros3);
  for (let rho = 0; rho < N; rho++) {
    for (let sig = 0; sig < N; sig++) {
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          let v = dGamma[mu]![rho]![nu]![sig]! - dGamma[nu]![rho]![mu]![sig]!;
          for (let lam = 0; lam < N; lam++) {
            v += gamma[rho]![mu]![lam]! * gamma[lam]![nu]![sig]! - gamma[rho]![nu]![lam]! * gamma[lam]![mu]![sig]!;
          }
          riemann[rho]![sig]![mu]![nu] = v;
        }
      }
    }
  }
  return { gamma, dGamma, riemann };
}

/** max |a − b| over a nested array, and max |b|, for a scale-free comparison. */
function maxDiff(a: unknown, b: unknown): { diff: number; scale: number } {
  let diff = 0;
  let scale = 0;
  const walk = (p: unknown, q: unknown): void => {
    if (typeof p === 'number' && typeof q === 'number') {
      diff = Math.max(diff, Math.abs(p - q));
      scale = Math.max(scale, Math.abs(q));
      return;
    }
    if (Array.isArray(p) && Array.isArray(q) && p.length === q.length) {
      for (let i = 0; i < p.length; i++) walk(p[i], q[i]);
      return;
    }
    throw new Error('shape mismatch');
  };
  walk(a, b);
  return { diff, scale };
}

const engine = new MathTSEngine();

/**
 * The three radii, each with the FD error ratios measured on this tree on
 * 2026-10-15 (max |FD − exact| over the largest exact component, and for the
 * Bianchi residual max |B| over max |R| / r) and the pin, ten times the
 * measurement or more. The Riemann ratio grows with r: R falls as r⁻³ while
 * the ∂Γ noise (a fixed relative step, 1e-4·r) does not, so at 100 r_s the FD
 * Riemann keeps about five digits and the FD Bianchi residual is noise of the
 * size of R/r itself (measured 0.45; a check there says nothing, and the pin
 * of 1 records that rather than hiding it).
 */
const POINTS: readonly { x: readonly number[]; gamma: number; dGamma: number; riemann: number; bianchi: number }[] = [
  // measured: gamma 8.5e-13, dGamma 1.8e-10, riemann 5.5e-10, bianchi 2.2e-5
  { x: [0, 3 * RS, Math.PI / 2, 0], gamma: 1e-11, dGamma: 5e-9, riemann: 1e-8, bianchi: 3e-4 },
  // measured: gamma 3.5e-14, dGamma 2.2e-10, riemann 1.6e-8, bianchi 1.0e-3
  { x: [0, 10 * RS, 1.1, 0.3], gamma: 1e-11, dGamma: 5e-9, riemann: 2e-7, bianchi: 1e-2 },
  // measured: gamma 1.6e-13, dGamma 4.0e-10, riemann 3.1e-6, bianchi 4.5e-1 (noise-dominated)
  { x: [0, 100 * RS, 2.0, 0], gamma: 1e-11, dGamma: 5e-9, riemann: 5e-5, bianchi: 1 },
];

describe('the exact Schwarzschild connection against the finite-difference pipeline', () => {
  it('the exact derivatives are self-consistent: Γ^r_tt = f f′/2 and Γ^t_tr = f′/(2f), the textbook forms', () => {
    const { gamma } = exactAt([0, 10, Math.PI / 2, 0]);
    const f = 1 - RS / 10;
    const fp = RS / 100;
    expect(gamma[1]![0]![0]).toBeCloseTo((f * fp) / 2, 15);
    expect(gamma[0]![0]![1]).toBeCloseTo(fp / (2 * f), 15);
    expect(gamma[1]![2]![2]).toBeCloseTo(-10 * f, 14);
    expect(gamma[2]![1]![2]).toBeCloseTo(1 / 10, 15);
  });

  it('christoffelAt agrees with the exact Γ to 1e-11 of its largest component at r = 3, 10, 100 r_s', () => {
    for (const { x, gamma: pin } of POINTS) {
      const { gamma } = exactAt(x);
      const fd = christoffelAt(x, gFn, gInvFn, N, engine);
      const { diff, scale } = maxDiff(fd, gamma);
      expect(diff / scale, `gamma r = ${x[1]} measured ${(diff / scale).toExponential(3)}`).toBeLessThan(pin);
    }
  });

  it('dGammaAt agrees with the exact ∂Γ to 5e-9 of its largest component', () => {
    for (const { x, dGamma: pin } of POINTS) {
      const { dGamma } = exactAt(x);
      const fd = dGammaAt(x, gFn, gInvFn, N, engine);
      const { diff, scale } = maxDiff(fd, dGamma);
      expect(diff / scale, `dGamma r = ${x[1]} measured ${(diff / scale).toExponential(3)}`).toBeLessThan(pin);
    }
  });

  it('riemannUpperAt agrees with the exact Riemann tensor to the per-radius pin (1e-8 at 3 r_s, 5e-5 at 100 r_s)', () => {
    for (const { x, riemann: pin } of POINTS) {
      const { riemann } = exactAt(x);
      const fd = riemannUpperAt(x, gFn, gInvFn, N, engine);
      const { diff, scale } = maxDiff(fd, riemann);
      expect(diff / scale, `riemann r = ${x[1]} measured ${(diff / scale).toExponential(3)}`).toBeLessThan(pin);
    }
  });

  it('the Bianchi residual of the FD pipeline against its exact value 0, scaled by max|R|/r: 3e-4 at 3 r_s, noise at 100 r_s', () => {
    for (const { x, bianchi: pin } of POINTS) {
      const covR = covariantDerivRiemannLowerAt(x, gFn, gInvFn, N, engine);
      const { riemann } = exactAt(x);
      let maxR = 0;
      const walk = (v: unknown): void => {
        if (typeof v === 'number') maxR = Math.max(maxR, Math.abs(v));
        else if (Array.isArray(v)) for (const c of v) walk(c);
      };
      walk(riemann);
      let maxB = 0;
      for (let lam = 0; lam < N; lam++) {
        for (let mu = 0; mu < N; mu++) {
          for (let nu = 0; nu < N; nu++) {
            for (let rho = 0; rho < N; rho++) {
              for (let sig = 0; sig < N; sig++) {
                const b = covR[lam]![mu]![nu]![rho]![sig]! + covR[mu]![nu]![lam]![rho]![sig]! + covR[nu]![lam]![mu]![rho]![sig]!;
                maxB = Math.max(maxB, Math.abs(b));
              }
            }
          }
        }
      }
      // B carries 1/L³; R/r is its scale. The measurements per radius are on POINTS.
      expect(maxB / (maxR / x[1]!), `bianchi r = ${x[1]} measured ${(maxB / (maxR / x[1]!)).toExponential(3)}`).toBeLessThan(pin);
    }
  });
});
