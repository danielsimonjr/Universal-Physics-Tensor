/**
 * Killing-equation numerical verification (v0.6.0 Phase 1, Task 1.3).
 *
 * F-3 reconciliation (hybrid impl):
 *   - Uses EXACT symbolic Christoffels for all Γ terms.
 *   - For the outer ∂_μ ξ_α = (∂_μ g_{αβ}) ξ^β + g_{αβ} ∂_μ ξ^β, two paths:
 *     1. constantKilling=true (default for constant ξ^β): uses metric
 *        compatibility ∂_μ g_{αβ} = Γ^λ_{μα} g_{λβ} + Γ^λ_{μβ} g_{αλ} to
 *        derive ∇_μ ξ_α = Γ^λ_{μβ} g_{αλ} ξ^β without any FD. Achieves
 *        machine precision RELATIVE to the metric scale for Schwarzschild.
 *        The residual itself is absolute, in the metric's units: with SI
 *        Schwarzschild (g_tt ≈ −c² ≈ −9e16) the exact time-translation field
 *        leaves 2.44e-4 at r = 3 r_s and 3.05e-5 at 10 r_s (≈ 3e-21 relative).
 *     2. constantKilling=false with dMetricFn supplied: uses exact analytic
 *        ∂_μ g_{αβ} + FD for ∂_μ ξ^β. Handles spatially-varying Killing fields.
 *     3. Fallback FD path: differentiates ξ_α(y) = g_{αβ}(y) ξ^β(y) via 4th-
 *        order FD. WARNING: suffers c²-cancellation noise for SI-scaled metrics.
 *
 * The Killing equation (Carroll Eq. 3.174):
 *   ∇_μ ξ_ν + ∇_ν ξ_μ = 0
 *
 * where ∇_μ ξ_ν = ∂_μ ξ_ν − Γ^λ_{μν} ξ_λ (covariant derivative of the
 * lowered Killing field ξ_ν = g_{νβ} ξ^β).
 *
 * @module numerical/killing
 */

import { pderivNumericalFn } from './pderiv.js';
import { validateFiniteInputs } from './input-validation.js';

/** Options for {@link verifyKillingEquation}.
 *
 *  @public */
export interface KillingEquationOptions {
  /**
   * Maximum tolerated RELATIVE residual, read only by {@link checkKillingEquation}:
   * ||∇_μ ξ_ν + ∇_ν ξ_μ||_∞ / max(max_{μν} |g_{μν}(x)|, 1) ≤ tolerance. Default 1e-10.
   * Must be finite and > 0. {@link verifyKillingEquation} ignores it and returns the
   * raw (absolute) residual.
   */
  readonly tolerance?: number;
  /**
   * Finite-difference stencil order for the outer ∂_μ ξ_α partials
   * (used only when constantKilling=false and dMetricFn is not supplied).
   * Default 4.
   */
  readonly order?: 2 | 4;
  /**
   * When true (default), assumes ξ^β is coordinate-independent (∂_μ ξ^β = 0)
   * and uses the metric-compatibility identity to compute the covariant
   * derivative purely algebraically:
   *
   *   ∇_μ ξ_α = Γ^λ_{μβ} g_{αλ} ξ^β  (for constant ξ^β)
   *
   * This avoids all FD and any c²-scale cancellation noise. Exactly correct for
   * the Schwarzschild time-translation (ξ^t = 1) and axial (ξ^φ = 1) fields.
   * Set to false for spatially-varying Killing fields.
   */
  readonly constantKilling?: boolean;
  /**
   * Optional exact partial derivatives of the covariant metric
   * (used only when constantKilling=false).
   * dMetricFn(x)[lambda][mu][nu] = ∂_lambda g_{mu nu}.
   * When supplied with constantKilling=false, ∂_μ g_{αβ} is exact;
   * ∂_μ ξ^β is computed via 4th-order FD.
   */
  readonly dMetricFn?: (x: ReadonlyArray<number>) => number[][][];
}

type Vec4 = [number, number, number, number];
/** A Killing-field factory: returns the field ξ^μ(x) as a function of the 4-position. @public */
export type KillingFn = () => (x: Vec4) => Vec4;
/** A covariant metric closure for the Killing checks: `g(x)[μ][ν] = g_{μν}(x)`, nested. @public */
export type KillingMetricFn = (x: ReadonlyArray<number>) => number[][];

/**
 * Layout-agnostic Christoffel accessor.
 *
 * P-3 fix: both nested (number[4][4][4]) and flat (Float64Array(64))
 * Christoffel producers can provide a ChristoffelAccess. This insulates
 * {@link verifyKillingEquation} from the Phase 2 BR-2 migration:
 * Task 2.9 changes how christoffelAt(x) is *constructed*, but consumers
 * only call `christoffelAt(x)(λ, μ, ν)`.
 *
 * @public
 */
export type ChristoffelAccess = (lambda: number, mu: number, nu: number) => number;

/** A Christoffel producer: the {@link ChristoffelAccess} at a 4-position. @public */
export type ChristoffelAtFn = (x: Vec4) => ChristoffelAccess;

/**
 * Compute `||∇_μ ξ_ν + ∇_ν ξ_μ||_∞` at point `x`, returning the maximum
 * absolute symmetrized residual over all 16 (μ, ν) pairs.
 *
 * For constant Killing fields (constantKilling=true, the default):
 *   Uses metric compatibility to derive ∇_μ ξ_α = Γ^λ_{μβ} g_{αλ} ξ^β
 *   algebraically — no FD at all. The residual is ABSOLUTE (metric units);
 *   for SI Schwarzschild it is at machine precision relative to |g_tt| ≈ c².
 *   `opts.tolerance` is not read here; use {@link checkKillingEquation} for a verdict.
 *
 * @param killingFn     - Factory returning ξ^μ(x) (upper index).
 * @param metricFn      - Covariant metric g_{μν}(x).
 * @param christoffelAt - Christoffel accessor factory (layout-agnostic).
 * @param x             - Evaluation point [t, r, θ, φ].
 * @param opts          - Optional overrides (see {@link KillingEquationOptions}).
 * @returns             Maximum absolute residual of the symmetrized Killing equation.
 *
 * @example
 * ```typescript
 * import { verifyKillingEquation } from 'universal-physics-tensor';
 * import {
 *   schwarzschildKillingT,
 *   schwarzschildGFn,
 *   schwarzschildChristoffelFn,
 *   schwarzschildRs,
 * } from '../tests/fixtures/schwarzschild.js'; // or your own metric closures
 *
 * const M = 1.989e30; // solar mass, kg
 * const r_s = schwarzschildRs(M);
 * const x: [number, number, number, number] = [0, 5 * r_s, Math.PI / 2, 0];
 *
 * // Christoffel accessor wrapping the flat Float64Array layout (BR-2)
 * const gammaFn = schwarzschildChristoffelFn(M);
 * const christoffelAccessAt = (pt: [number, number, number, number]) => {
 *   const arr = gammaFn(pt);
 *   return (lam: number, mu: number, nu: number) => arr[16 * lam + 4 * mu + nu];
 * };
 *
 * const residual = verifyKillingEquation(
 *   schwarzschildKillingT,
 *   schwarzschildGFn(M),
 *   christoffelAccessAt,
 *   x,
 *   { constantKilling: true },
 * );
 * // residual < 1e-12 for the exact time-translation Killing field
 * ```
 *
 * @public
 */
export function verifyKillingEquation(
  killingFn: KillingFn,
  metricFn: KillingMetricFn,
  christoffelAt: ChristoffelAtFn,
  x: Vec4,
  opts: KillingEquationOptions = {},
): number {
  const order = opts.order ?? 4;
  const constantKilling = opts.constantKilling ?? true;
  const xi = killingFn();
  const g = metricFn(x);
  const xiAtX = xi(x);
  const Gamma = christoffelAt(x);

  // Lowered Killing field: ξ_α = g_{αβ} ξ^β
  const xiLower: Vec4 = [0, 0, 0, 0];
  for (let a = 0; a < 4; a++) {
    let s = 0;
    for (let b = 0; b < 4; b++) s += g[a][b] * xiAtX[b];
    xiLower[a] = s;
  }

  // Covariant derivative ∇_μ ξ_α (4×4 matrix)
  const cov: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  if (constantKilling) {
    // Algebraic path (metric compatibility, ∂_μ ξ^β = 0):
    //   ∇_μ ξ_α = ∂_μ ξ_α − Γ^λ_{μα} ξ_λ
    //   where ∂_μ ξ_α = (Γ^λ_{μα} g_{λβ} + Γ^λ_{μβ} g_{αλ}) ξ^β
    //   cancelling Γ^λ_{μα} g_{λβ} ξ^β = Γ^λ_{μα} ξ_λ gives:
    //   ∇_μ ξ_α = Σ_β Σ_λ Γ^λ_{μβ} g_{αλ} ξ^β
    //
    // Symmetrized: ∇_μ ξ_α + ∇_α ξ_μ = Σ_β [Γ^λ_{μβ} g_{αλ} + Γ^λ_{αβ} g_{μλ}] ξ^β
    // This is the Killing equation in terms of Christoffels only.
    for (let mu = 0; mu < 4; mu++) {
      for (let a = 0; a < 4; a++) {
        let s = 0;
        for (let lam = 0; lam < 4; lam++) {
          for (let b = 0; b < 4; b++) {
            s += Gamma(lam, mu, b) * g[a][lam] * xiAtX[b];
          }
        }
        cov[mu][a] = s;
      }
    }
  } else if (opts.dMetricFn !== undefined) {
    // Exact dMetricFn + FD path for spatially-varying Killing fields.
    // ∂_μ ξ_α = (∂_μ g_{αβ}) ξ^β + g_{αβ} ∂_μ ξ^β
    const dg = opts.dMetricFn(x);

    // FD for ∂_μ ξ^β (upper components)
    const dxiUpper: number[][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    for (let b = 0; b < 4; b++) {
      const xiUpperB = (y: ReadonlyArray<number>): number => xi(y as Vec4)[b];
      for (let mu = 0; mu < 4; mu++) {
        const raw = pderivNumericalFn(xiUpperB, x, mu, { order });
        dxiUpper[mu][b] = typeof raw === 'number' ? raw : (raw as number[])[0];
      }
    }

    const partial: number[][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    for (let mu = 0; mu < 4; mu++) {
      for (let a = 0; a < 4; a++) {
        let s = 0;
        for (let b = 0; b < 4; b++) {
          s += dg[mu][a][b] * xiAtX[b];
          s += g[a][b] * dxiUpper[mu][b];
        }
        partial[mu][a] = s;
      }
    }

    for (let mu = 0; mu < 4; mu++) {
      for (let a = 0; a < 4; a++) {
        let connSum = 0;
        for (let lam = 0; lam < 4; lam++) connSum += Gamma(lam, mu, a) * xiLower[lam];
        cov[mu][a] = partial[mu][a] - connSum;
      }
    }
  } else {
    // Pure FD fallback: differentiate ξ_α(y) = g_{αβ}(y) ξ^β(y) numerically.
    // WARNING: large-scale SI metrics (c²·g_tt ~ 6e16) produce cancellation
    // noise at the ~1-10 absolute level. Use constantKilling=true for
    // constant Schwarzschild Killing fields.
    const partial: number[][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    for (let a = 0; a < 4; a++) {
      const xiLowerA = (y: ReadonlyArray<number>): number => {
        const gy = metricFn(y);
        const xy = xi(y as Vec4);
        let s = 0;
        for (let b = 0; b < 4; b++) s += gy[a][b] * xy[b];
        return s;
      };
      for (let mu = 0; mu < 4; mu++) {
        const raw = pderivNumericalFn(xiLowerA, x, mu, { order });
        partial[mu][a] = typeof raw === 'number' ? raw : (raw as number[])[0];
      }
    }
    for (let mu = 0; mu < 4; mu++) {
      for (let a = 0; a < 4; a++) {
        let connSum = 0;
        for (let lam = 0; lam < 4; lam++) connSum += Gamma(lam, mu, a) * xiLower[lam];
        cov[mu][a] = partial[mu][a] - connSum;
      }
    }
  }

  // Symmetrize ∇_μ ξ_ν + ∇_ν ξ_μ and find max|·| over 16 pairs.
  let maxResid = 0;
  for (let mu = 0; mu < 4; mu++) {
    for (let nu = 0; nu < 4; nu++) {
      const sym = cov[mu][nu] + cov[nu][mu];
      const ab = Math.abs(sym);
      if (ab > maxResid) maxResid = ab;
    }
  }
  return maxResid;
}

/**
 * Result of {@link checkKillingEquation}.
 *
 * @public
 */
export interface KillingEquationCheck {
  /** Raw max residual ||∇_μ ξ_ν + ∇_ν ξ_μ||_∞ in the metric's units — identical to
   *  {@link verifyKillingEquation}'s return value. */
  readonly residual: number;
  /** `residual / max(max_{μν} |g_{μν}(x)|, 1)`: dimensionless, the quantity the tolerance
   *  is applied to (the normalization `evaluateEinsteinEquationResidual` uses). */
  readonly relativeResidual: number;
  /** `relativeResidual <= tolerance` (default 1e-10). */
  readonly withinTolerance: boolean;
}

/**
 * Check the Killing equation ∇_μ ξ_ν + ∇_ν ξ_μ = 0 at `x` against a tolerance.
 *
 * Runs {@link verifyKillingEquation} with the same arguments and normalizes its absolute
 * residual by the metric scale at `x`: `relativeResidual = residual / max(max|g_μν(x)|, 1)`.
 * The floor of 1 keeps geometrized (order-1) metrics absolute. The verdict is
 * `relativeResidual <= opts.tolerance` (default 1e-10). A relative test matters for SI
 * metrics: an exact Killing field of SI Schwarzschild leaves an absolute residual up to
 * 2.44e-4 (g_tt ≈ −9e16), about 3e-21 relative.
 *
 * @param killingFn     - Factory returning ξ^μ(x) (upper index).
 * @param metricFn      - Covariant metric g_{μν}(x).
 * @param christoffelAt - Christoffel accessor factory (layout-agnostic).
 * @param x             - Evaluation point [t, r, θ, φ].
 * @param opts          - {@link KillingEquationOptions}; `tolerance` must be finite and > 0.
 * @returns `{ residual, relativeResidual, withinTolerance }`.
 * @throws RangeError when `opts.tolerance` is not a finite positive number.
 *
 * @public
 */
export function checkKillingEquation(
  killingFn: KillingFn,
  metricFn: KillingMetricFn,
  christoffelAt: ChristoffelAtFn,
  x: Vec4,
  opts: KillingEquationOptions = {},
): KillingEquationCheck {
  if (opts.tolerance !== undefined) {
    validateFiniteInputs(opts, [{ name: 'tolerance', min: 0, excludeMin: true }], 'checkKillingEquation');
  }
  const tolerance = opts.tolerance ?? 1e-10;
  const residual = verifyKillingEquation(killingFn, metricFn, christoffelAt, x, opts);
  let scale = 1;
  for (const row of metricFn(x)) for (const v of row) scale = Math.max(scale, Math.abs(v));
  const relativeResidual = residual / scale;
  return { residual, relativeResidual, withinTolerance: relativeResidual <= tolerance };
}

/**
 * Evaluate the conserved charge Q = ξ^μ p_μ at point x along a geodesic.
 *
 * Sign convention: raw contraction ξ^μ p_μ. For the time-translation
 * Killing field in (−,+,+,+) signature, p_t < 0 for forward-time motion,
 * so the physical energy of common usage is E = −Q (Carroll Eq. 8.30).
 * Use `|ΔQ / Q|` for drift diagnostics to stay sign-agnostic.
 *
 * @param killingFn     - Factory returning ξ^μ(x) (upper index).
 * @param momentumLower - Co-momentum p_μ at the geodesic point (lower index).
 * @param x             - Geodesic coordinate [t, r, θ, φ].
 * @returns             Q = ξ^μ p_μ (dimensioned as energy if p is 4-momentum).
 *
 * @example
 * ```typescript
 * import { evaluateConservedCharge } from 'universal-physics-tensor';
 * import { schwarzschildKillingT } from '../tests/fixtures/schwarzschild.js';
 *
 * // Co-momentum p_μ at a geodesic snapshot (p_t < 0 for forward-time motion)
 * const pLower: [number, number, number, number] = [-8.988e16, 0, 0, 0];
 * const x: [number, number, number, number] = [0, 1e7, Math.PI / 2, 0];
 *
 * const Q = evaluateConservedCharge(schwarzschildKillingT, pLower, x);
 * // Q = ξ^t · p_t = 1 · p_t = p_t (energy with sign from metric)
 * // Physical energy E = −Q (Carroll sign convention for (−,+,+,+))
 * ```
 *
 * @public
 */
export function evaluateConservedCharge(
  killingFn: KillingFn,
  momentumLower: Vec4,
  x: Vec4,
): number {
  const xi = killingFn()(x);
  let q = 0;
  for (let m = 0; m < 4; m++) q += xi[m] * momentumLower[m];
  return q;
}
