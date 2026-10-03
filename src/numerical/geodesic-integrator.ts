/**
 * Fixed-step RK4 integrator for the geodesic equation in an arbitrary
 * Lorentzian manifold (v0.4.0, Task 14 [U]).
 *
 * Solves the second-order ODE system
 *
 *   d²x^μ/dτ² + Γ^μ_{νρ}(x) (dx^ν/dτ)(dx^ρ/dτ) = 0
 *
 * by casting it as a first-order system on the (x, v) phase space:
 *
 *   dx^μ/dτ  = v^μ
 *   dv^μ/dτ  = −Γ^μ_{νρ}(x) v^ν v^ρ    (Einstein summation over ν, ρ)
 *
 * The Christoffel symbol Γ^μ_{νρ} is supplied as a plain-JS closure that
 * maps a 4-coordinate array to a [4][4][4] tensor.  No TensorEngine
 * dependency — the integrator is self-contained. The fixed steps are
 * MathTS `solveODESystem` with `dt` set, which is that library's classical
 * RK4. Adaptive `solveODE` is not this step.
 *
 * Validated against the cycloid parametric form for radial Schwarzschild
 * infall to ±1e-6 (Task 14 test, η = 0.5).
 *
 * @module numerical/geodesic-integrator
 */
import { solveODESystem } from '@danielsimonjr/mathts-functions';
import { NumericalBackendError } from './errors.js';

/**
 * Input bundle for `integrateGeodesic`.
 * @public
 */
export interface GeodesicIntegratorInputs {
  /**
   * Christoffel-symbol closure.  Maps a 4-coordinate array x^μ to a
   * Float64Array(64) containing Γ^μ_{νρ}(x) in λ-major layout:
   * index (λ, μ, ν) → 16·λ + 4·μ + ν.
   *
   * BR-2 (v0.6.0 Task 2.9): migrated from nested number[][][] to flat
   * Float64Array(64). Consumers call `arr[16*mu + 4*nu + rho]`.
   *
   * The optional `out` buffer lets the integrator pass a reused scratch
   * Float64Array(64) so the hot loop avoids per-call allocation. A function
   * that ignores `out` (e.g. allocates fresh each call) still satisfies this
   * type — the optimization is opt-in.
   */
  christoffelFn: (x: ReadonlyArray<number>, out?: Float64Array) => Float64Array;

  /** Initial 4-position x^μ(τ₀) = [t, r, θ, φ]. */
  x0: readonly [number, number, number, number];

  /**
   * Initial 4-velocity dx^μ/dτ at τ₀.
   *
   * I2 fix: for a Schwarzschild radial timelike geodesic starting at
   * coordinate radius r₀, use
   *   v0 = [1/√(1 − r_s/r₀), 0, 0, 0]
   * so that g_{μν} u^μ u^ν = −c² holds.  At r₀ = 100·r_s this gives
   * dt/dτ ≈ 1.005, not 1.
   */
  v0: readonly [number, number, number, number];

  /** Proper-time parameter at the start of integration. */
  tauStart: number;

  /** Proper-time parameter at the end of integration. */
  tauEnd: number;

  /** Number of fixed RK4 steps.  Must be a positive integer. */
  steps: number;

  /**
   * E11 fix: explicit domain-validity option in place of the
   * `(christoffelFn as any).r_s` monkey-patch.  If supplied, the
   * integrator throws `NumericalBackendError` when `x0[1] < domainMinRadius`
   * (e.g. for Schwarzschild: caller passes `3 * r_s` to enforce the
   * v0.4.0 domain restriction r ≥ 3·r_Schwarz).
   */
  domainMinRadius?: number;
}

/**
 * Result of `integrateGeodesic`.
 * @public
 */
export interface GeodesicIntegratorResult {
  /** Final 4-position x^μ(τEnd). */
  readonly xFinal: readonly [number, number, number, number];

  /** Final 4-velocity v^μ(τEnd). */
  readonly vFinal: readonly [number, number, number, number];

  /**
   * Sampled trajectory positions (approximately 100 evenly-spaced snapshots
   * plus the initial point).  Useful for visualisation and diagnostics.
   */
  readonly trajectory: ReadonlyArray<readonly [number, number, number, number]>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Vec4 = [number, number, number, number];

/**
 * Evaluate the Christoffel acceleration −Γ^μ_{νρ} v^ν v^ρ at position x
 * with 4-velocity v.  Returns (dx/dτ, dv/dτ) = (v, accel).
 *
 * BR-2 (v0.6.0 Task 2.9): christoffelFn now returns Float64Array(64).
 * Index access: G[16*mu + 4*nu + rho] (λ-major layout).
 */
function geodesicRHS(
  christoffelFn: (x: ReadonlyArray<number>, out?: Float64Array) => Float64Array,
  x: Vec4,
  v: Vec4,
  // Reused scratch buffer for the Christoffel evaluation. Safe: G is fully
  // consumed into `dv` below before geodesicRHS returns, so the next call may
  // overwrite it. `dx`/`dv` are fresh arrays and never alias G.
  scratch?: Float64Array,
): { dx: Vec4; dv: Vec4 } {
  const G = christoffelFn(x, scratch);
  const v0 = v[0], v1 = v[1], v2 = v[2], v3 = v[3];
  let dv0 = 0, dv1 = 0, dv2 = 0, dv3 = 0;

  for (let mu = 0; mu < 4; mu++) {
    // Bolt: Hoist the invariant 16 * mu multiplication outside the nu, rho loops
    const mu16 = mu * 16;
    let acc = 0;
    let accTerm = 0;
    let g = 0;

    // Bolt: Fully unroll the inner `nu` and `rho` loops for a fixed 4D spacetime
    // to eliminate loop overhead and index arithmetic, caching `v` into scalar variables.

    // nu = 0
    let offset = mu16;
    accTerm = 0;
    g = G[offset]; if (g !== 0) accTerm += g * v0;
    g = G[offset+1]; if (g !== 0) accTerm += g * v1;
    g = G[offset+2]; if (g !== 0) accTerm += g * v2;
    g = G[offset+3]; if (g !== 0) accTerm += g * v3;
    if (accTerm !== 0) acc += accTerm * v0;

    // nu = 1
    offset += 4;
    accTerm = 0;
    g = G[offset]; if (g !== 0) accTerm += g * v0;
    g = G[offset+1]; if (g !== 0) accTerm += g * v1;
    g = G[offset+2]; if (g !== 0) accTerm += g * v2;
    g = G[offset+3]; if (g !== 0) accTerm += g * v3;
    if (accTerm !== 0) acc += accTerm * v1;

    // nu = 2
    offset += 4;
    accTerm = 0;
    g = G[offset]; if (g !== 0) accTerm += g * v0;
    g = G[offset+1]; if (g !== 0) accTerm += g * v1;
    g = G[offset+2]; if (g !== 0) accTerm += g * v2;
    g = G[offset+3]; if (g !== 0) accTerm += g * v3;
    if (accTerm !== 0) acc += accTerm * v2;

    // nu = 3
    offset += 4;
    accTerm = 0;
    g = G[offset]; if (g !== 0) accTerm += g * v0;
    g = G[offset+1]; if (g !== 0) accTerm += g * v1;
    g = G[offset+2]; if (g !== 0) accTerm += g * v2;
    g = G[offset+3]; if (g !== 0) accTerm += g * v3;
    if (accTerm !== 0) acc += accTerm * v3;

    if (mu === 0) dv0 = -acc;
    else if (mu === 1) dv1 = -acc;
    else if (mu === 2) dv2 = -acc;
    else dv3 = -acc;
  }

  return { dx: [v0, v1, v2, v3], dv: [dv0, dv1, dv2, dv3] };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Numerically integrate the geodesic equation for a timelike (or null)
 * worldline in an arbitrary curved spacetime using a fixed-step classical
 * fourth-order Runge-Kutta scheme.
 *
 * @public
 */
export function integrateGeodesic(
  inputs: GeodesicIntegratorInputs,
): GeodesicIntegratorResult {
  const { christoffelFn, x0, v0, tauStart, tauEnd, steps, domainMinRadius } = inputs;
  // BR-2: christoffelFn now returns Float64Array(64); geodesicRHS reads flat layout.

  // E11 fix: explicit option in place of monkey-patched .r_s on the closure.
  // Callers (e.g. the Schwarzschild test fixture) pass `3 * r_s` directly.
  if (typeof domainMinRadius === 'number' && x0[1] < domainMinRadius) {
    throw new NumericalBackendError(
      `integrateGeodesic: initial radius r0=${x0[1]} < domainMinRadius=${domainMinRadius}. ` +
      `Position is outside the valid integration domain. ` +
      `For Schwarzschild geodesics this restriction is r ≥ 3·r_Schwarz (v0.4.0).`,
    );
  }

  if (!Number.isInteger(steps) || steps <= 0) {
    throw new NumericalBackendError(
      `integrateGeodesic: steps must be a positive integer, got ${steps}`,
    );
  }

  const h = (tauEnd - tauStart) / steps;
  const y0 = [x0[0], x0[1], x0[2], x0[3], v0[0], v0[1], v0[2], v0[3]];

  // One scratch buffer reused across all Christoffel evaluations (4 per step).
  // Each geodesicRHS consumes its Γ before the next call, so reuse is safe and
  // avoids ~4·steps Float64Array(64) allocations per integration.
  const scratch = new Float64Array(64);
  const sol = solveODESystem(
    (_tau, y) => {
      const x: Vec4 = [y[0], y[1], y[2], y[3]];
      const v: Vec4 = [y[4], y[5], y[6], y[7]];
      const s = geodesicRHS(christoffelFn, x, v, scratch);
      return [s.dx[0], s.dx[1], s.dx[2], s.dx[3], s.dv[0], s.dv[1], s.dv[2], s.dv[3]];
    },
    y0,
    [tauStart, tauEnd],
    { dt: h },
  );

  const asVec4 = (row: readonly number[]): Vec4 => [row[0], row[1], row[2], row[3]];
  const sampleEvery = Math.max(1, Math.floor(steps / 100));
  const trajectory: Vec4[] = [asVec4(sol.y[0] ?? y0)];
  for (let i = 0; i < steps; i++) {
    if ((i + 1) % sampleEvery === 0) {
      const row = sol.y[i + 1] ?? sol.y[sol.y.length - 1] ?? y0;
      trajectory.push(asVec4(row));
    }
  }
  const last = sol.y[sol.y.length - 1] ?? y0;

  return {
    xFinal: asVec4(last),
    vFinal: [last[4], last[5], last[6], last[7]],
    trajectory,
  };
}
