/**
 * Covariant-eikonal method, used by catalog relation be-37.
 *
 * Provides `evaluateCovariantEikonalNumerical`, which encodes the
 * covariant-eikonal equation
 *
 *   g^μν ∇_μ ∇_ν S = 0
 *
 * via the connection layer (Tasks 2-3 + 12-14 of v0.4.0). The eikonal
 * residual is **0 by construction**: the null wave-covector
 *
 *   k_μ = ∂_μ S = (E, E, 0, 0)   (energy + radial component only)
 *
 * satisfies g^μν k_μ k_ν = 0 identically for the +,−,−,− Schwarzschild
 * metric. No numerical integration is performed for this quantity.
 *
 * `shapiroDelaySec` is computed by **GL4-driven null-geodesic integration**
 * on the canonical (x, p) state in the Schwarzschild spacetime (v0.5.0 Task
 * 12, Phase 2c). The photon propagates from `r = R_far_m` down to
 * `r = R_near_m`; coordinate time at the endpoint minus the flat-space
 * straight-line transit time is returned as the Shapiro delay.
 *
 * For the default radial geometry (impact parameter `b_m = 0`) the
 * integrator reproduces the closed-form `(2GM/c³) · ln(R_far/R_near)`
 * (Task 11 cross-checks this to ±2×10⁻³).
 *
 * @see tests/numerical/covariant-eikonal-real.test.ts (Task 12 [U])
 * @see tests/dimensional/covariant-derivative-preview.test.ts (Task 17 [U]/Task 11 [U])
 * @see docs/planning/v0.5.0-Implementation-Plan.md Task 12
 * @module numerical/covariant-eikonal
 * @public
 */

import { integrateGeodesicGL4 } from './gl4-integrator.js';
import { C_SI, G_SI } from '../core/constants.js';
import { reconstructNullPr } from './null-ic.js';

// ─── Physical constants (canonical CODATA 2018 + exact-SI definitions) ────
// Imported from src/core/constants.ts (v0.5.1 PC-1 canonicalization).
const c_SI = C_SI;
const c2_SI = c_SI * c_SI;

/**
 * Input parameters for the covariant-eikonal method, used by catalog relation be-37.
 * @public
 */
export interface CovariantEikonalInputs {
  /** Gravitational source mass in kilograms (must be > 0). */
  readonly M_kg: number;
  /** Far-point radius in metres, i.e. the signal origin (must be > 0). */
  readonly R_far_m: number;
  /** Near-point radius in metres, i.e. the signal destination
   *  (must be > 0, ≤ R_far_m, and outside the Schwarzschild horizon). */
  readonly R_near_m: number;
  /**
   * Optional impact parameter `b` in metres for the null geodesic. The
   * photon's angular momentum is set such that the minimum r (closest
   * approach) is `b` in the flat-space limit; `p_φ = b · c` in the
   * affine-parameter normalization used here (`p_t = −c²`).
   *
   * Default `0` — purely radial null geodesic, which reproduces the
   * closed-form `(2GM/c³) · ln(R_far/R_near)` Shapiro delay. Non-zero
   * `b` modifies the geometry and the closed-form comparator changes
   * to `(2GM/c³) · ln((R_far + √(R_far²−b²)) / (R_near + √(R_near²−b²)))`
   * for the single-leg path (closest-approach not crossed).
   *
   * Must satisfy `b ≤ R_near` if non-zero (otherwise the photon cannot
   * reach `R_near` without crossing closest approach).
   */
  readonly b_m?: number;
  /**
   * Optional GL4 step count override. Default `2048` — sufficient for
   * the default radial geometry to reach ≤1e-6 relative agreement with
   * `evaluateShapiroDelay` on Earth/Mars/Sun scales (Task 11).
   */
  readonly steps?: number;
}

/**
 * Result of `evaluateCovariantEikonalNumerical`.
 * @public
 */
export interface CovariantEikonalResult {
  /**
   * Dimensionless relative residual of the eikonal equation g^μν p_μ p_ν = 0,
   * COMPUTED at the initial wave-covector p_μ (whose radial component is solved
   * by `reconstructNullPr` to make the covector genuinely null at r = R_far).
   *
   * Reported as |g^μν p_μ p_ν| normalized by the sum of the |term| magnitudes
   * (the raw contraction is a near-cancellation of ~1e16-scale terms). A
   * well-constructed null covector yields ~machine-ε, confirming the
   * construction numerically rather than asserting it.
   */
  readonly eikonalResidual: number;

  /**
   * Shapiro coordinate-time delay in seconds, computed via GL4
   * null-geodesic integration on the canonical (x, p) state.
   *
   * **v0.5.0 Task 12:** real value (was a documented stub returning 0 in
   * v0.4.0). For the default radial geometry (`b_m = 0`) this agrees with
   * the closed-form `(2GM/c³) · ln(R_far/R_near)` to ≤1e-6 relative at
   * the default step count (Task 11 [U]).
   */
  readonly shapiroDelaySec: number;

  /**
   * Optional closed-form cross-check value (seconds). Not populated by
   * this evaluator — callers cross-check externally against
   * `evaluateShapiroDelay`.
   */
  readonly closedFormDelaySec?: number;
}

/**
 * Schwarzschild radius `r_s = 2GM/c²`.
 *
 * Mirrors `tests/fixtures/schwarzschild.ts` (kept private here to avoid
 * a src→tests dependency).
 *
 * @internal
 */
function schwarzschildRs(M_kg: number): number {
  return (2 * G_SI * M_kg) / c2_SI;
}

/**
 * Returns the contravariant Schwarzschild metric closure g^{μν}(x).
 *
 * SI convention with c² on `g_{tt}` — mirrors the test fixture so the
 * coordinate time `t = x^0` carries seconds and `p_t = −c²` produces
 * `dt/dτ ≈ 1` (τ ≈ coord time far from horizon).
 *
 * @internal
 */
function buildGInverseFn(
  M_kg: number,
): (x: ReadonlyArray<number>) => Float64Array {
  const r_s = schwarzschildRs(M_kg);
  return function gInverse(x: ReadonlyArray<number>): Float64Array {
    // v0.9.0 O-1: flat row-major Float64Array(16), gInv[mu*4+nu] = g^{μν}.
    const r = x[1];
    const theta = x[2];
    const f = 1 - r_s / r;
    const sinT = Math.sin(theta);
    const gInv = new Float64Array(16);
    gInv[0 * 4 + 0] = -1 / (f * c2_SI);
    gInv[1 * 4 + 1] = f;
    gInv[2 * 4 + 2] = 1 / (r * r);
    gInv[3 * 4 + 3] = 1 / (r * r * sinT * sinT);
    return gInv;
  };
}

/**
 * Returns ∂_λ g^{μν}(x) as a flat row-major Float64Array(64) with
 * index order `dg[λ*16 + μ*4 + ν]` (v0.9.0 O-1, Decision #1 layout).
 *
 * Only ∂_r and ∂_θ entries are non-zero (static, axisymmetric metric).
 * Sign of `dg[1*16+0*4+0] = ∂_r g^{tt} = +r_s/(r²(1−r_s/r)²c²)` matches the
 * Task 0 fixture fix (positive — incorrectly negative in the v0.5.0
 * pre-Task-3 fixture; reversal would push the photon outward).
 *
 * @internal
 */
function buildDgInverseFn(
  M_kg: number,
): (x: ReadonlyArray<number>) => Float64Array {
  const r_s = schwarzschildRs(M_kg);
  return function dgInverse(x: ReadonlyArray<number>): Float64Array {
    const r = x[1];
    const theta = x[2];
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const f = 1 - r_s / r;
    const dg = new Float64Array(64);
    // ∂_r entries (axis 1)
    dg[1 * 16 + 0 * 4 + 0] = r_s / (r * r * f * f * c2_SI);
    dg[1 * 16 + 1 * 4 + 1] = r_s / (r * r);
    dg[1 * 16 + 2 * 4 + 2] = -2 / (r * r * r);
    dg[1 * 16 + 3 * 4 + 3] = -2 / (r * r * r * sinT * sinT);
    // ∂_θ entry (axis 2)
    dg[2 * 16 + 3 * 4 + 3] = (-2 * cosT) / (r * r * sinT * sinT * sinT);
    return dg;
  };
}

/**
 * Covariant-eikonal method, used by catalog relation be-37.
 *
 * Returns:
 *  - `eikonalResidual`: the computed relative residual of g^μν p_μ p_ν on the
 *    null wave-covector (~machine-ε; confirms the null construction).
 *  - `shapiroDelaySec`: GL4-integrated coordinate-time delay relative to
 *    the flat-space straight-line transit, in seconds.
 *
 * **Algorithm — null geodesic in Schwarzschild via GL4.**
 *
 * 1. Schwarzschild radius `r_s = 2GM/c²`. Domain guard `R_near_m > r_s`
 *    (else the photon path crosses the event horizon).
 * 2. Set initial state at `(t=0, r=R_far_m, θ=π/2, φ=0)`. Affine-parameter
 *    normalization `p_t = −c²` → `dt/dτ = 1/(1−r_s/r) ≈ 1` far from the
 *    horizon (τ ≈ coord time). Set `p_θ = 0` (motion confined to equatorial
 *    plane), `p_φ = b_m · c` (Killing-vector angular momentum
 *    corresponding to flat-limit impact parameter `b_m`).
 * 3. Solve `p_r` from the null condition `g^μν p_μ p_ν = 0` at the
 *    initial point, take the negative root (inward motion: `dr/dτ < 0`
 *    since `dr/dτ = g^rr p_r = (1−r_s/r) p_r`).
 * 4. Integrate via `integrateGeodesicGL4` for `tauMax` chosen to overshoot
 *    `r = R_near_m` (safety factor 1.5 on the flat-space transit time).
 * 5. Walk snapshots; find the first index where `r ≤ R_near_m`. Linearly
 *    interpolate `t` between the bracketing snapshots to land exactly on
 *    `r = R_near_m`. Take that `t` as the geodesic coord-time transit.
 * 6. Flat-space reference: for a straight-line null ray with impact
 *    parameter `b`, time to go from `r_far` to `r_near` (single leg, no
 *    closest-approach crossing) is `(√(r_far²−b²) − √(r_near²−b²))/c`.
 *    For `b = 0` (default) this reduces to `(R_far − R_near)/c`.
 * 7. `shapiroDelaySec = t_geodesic − t_flat`.
 *
 * **Sign convention.** Shapiro delay is positive (light slowed by the
 * gravitational potential). A negative result indicates an integration
 * or reference-frame bug.
 *
 * **Impact parameter `b_m`.** Default `0` (radial). The default geometry
 * reproduces the closed-form `evaluateShapiroDelay` to ≤1e-6 relative at
 * 2048 steps for solar-scale Earth/Mars distances (Task 11 cross-check).
 * Non-zero `b_m` requires `b_m ≤ R_near_m` (closest approach `r_min ≈ b`
 * must not lie between R_far and R_near).
 *
 * @param inputs - Source mass + far/near radii (+ optional `b_m`, `steps`):
 *   - `M_kg` — gravitational source mass in **kilograms** (SI). Must be a
 *     finite positive number.
 *   - `R_far_m` — origin radial coordinate in **metres** (SI). The signal
 *     start point.
 *   - `R_near_m` — destination radial coordinate in **metres** (SI). Must
 *     satisfy `0 < R_near_m ≤ R_far_m` and `R_near_m > 1.01 · r_s` (stay
 *     comfortably outside the Schwarzschild horizon `r_s = 2GM/c²`).
 *   - `b_m` — optional impact parameter in **metres** (SI). Default `0`
 *     (purely radial geodesic). Non-zero `b_m` requires `b_m ≤ R_near_m`.
 *   - `steps` — optional GL4 integrator step count (dimensionless). Default
 *     2048. Higher = tighter agreement with closed-form Shapiro at
 *     additional CPU cost.
 * @returns `{ eikonalResidual, shapiroDelaySec }`:
 *   - `eikonalResidual` — **dimensionless** relative residual of
 *     `g^μν p_μ p_ν = 0`, computed on the null wave-covector (~machine-ε).
 *   - `shapiroDelaySec` — gravitational-time-delay in **seconds** (SI).
 *     Positive by sign convention (light is slowed in the potential well).
 * @throws RangeError on out-of-domain inputs.
 *
 * @example
 * ```typescript
 * import { evaluateCovariantEikonalNumerical, G_SI, C_SI } from 'universal-physics-tensor';
 *
 * const M_SUN = 1.989e30; // kg
 * // Radial null geodesic: signal from Earth orbit to solar surface
 * const R_far_m = 1.496e11; // ~1 AU
 * const R_near_m = 6.957e8; // ~solar radius
 *
 * const result = await evaluateCovariantEikonalNumerical({
 *   M_kg: M_SUN,
 *   R_far_m,
 *   R_near_m,
 * });
 * // result.eikonalResidual ≈ 1e-16 (computed; confirms the null construction)
 * // result.shapiroDelaySec ≈ 2e-4 s (Shapiro delay near the Sun)
 * ```
 *
 * @public
 */
export async function evaluateCovariantEikonalNumerical(
  inputs: CovariantEikonalInputs,
): Promise<CovariantEikonalResult> {
  const { M_kg, R_far_m, R_near_m, b_m = 0, steps = 2048 } = inputs;

  // ─── Domain guards ──────────────────────────────────────────────────────
  if (!Number.isFinite(M_kg) || M_kg <= 0) {
    throw new RangeError(
      `evaluateCovariantEikonalNumerical: M_kg must be a finite positive number, got ${M_kg}`,
    );
  }
  if (!Number.isFinite(R_far_m) || R_far_m <= 0) {
    throw new RangeError(
      `evaluateCovariantEikonalNumerical: R_far_m must be a finite positive number, got ${R_far_m}`,
    );
  }
  if (!Number.isFinite(R_near_m) || R_near_m <= 0) {
    throw new RangeError(
      `evaluateCovariantEikonalNumerical: R_near_m must be a finite positive number, got ${R_near_m}`,
    );
  }
  if (R_near_m > R_far_m) {
    throw new RangeError(
      `evaluateCovariantEikonalNumerical: R_near_m (${R_near_m}) must be ≤ R_far_m (${R_far_m})`,
    );
  }
  if (!Number.isFinite(b_m) || b_m < 0) {
    throw new RangeError(
      `evaluateCovariantEikonalNumerical: b_m must be a finite non-negative number, got ${b_m}`,
    );
  }
  if (b_m > R_near_m) {
    throw new RangeError(
      `evaluateCovariantEikonalNumerical: b_m (${b_m}) must be ≤ R_near_m (${R_near_m}); closest-approach geometry not supported`,
    );
  }
  const r_s = schwarzschildRs(M_kg);
  if (R_near_m <= r_s * 1.01) {
    throw new RangeError(
      `evaluateCovariantEikonalNumerical: R_near_m (${R_near_m}) must be safely outside the Schwarzschild horizon r_s=${r_s}`,
    );
  }

  // ─── Shapiro delay via GL4 null-geodesic integration ────────────────────
  const gInverseFn = buildGInverseFn(M_kg);
  const dgInverseFn = buildDgInverseFn(M_kg);

  // Initial state at (t=0, r=R_far, θ=π/2, φ=0). Equatorial plane (p_θ=0).
  // Affine-parameter normalization: p_t = -c² makes dt/dτ ≈ 1 far from
  // horizon, so τ ≈ coord time t and tauMax can be set in units of seconds.
  const x0: number[] = [0, R_far_m, Math.PI / 2, 0];
  const p_t = -c2_SI;
  const p_phi = b_m * c_SI; // Killing-vector conservation: classical b = p_φ/(|p_t|/c²·c) = p_φ/c.
  const p_theta = 0;

  // Solve null condition g^μν p_μ p_ν = 0 for p_r at the initial point.
  // Delegated to reconstructNullPr (src/numerical/null-ic.ts) so PC-1.5
  // bench harnesses measure the same production arithmetic.
  const gInv0 = gInverseFn(x0);
  let p_r: number;
  try {
    p_r = reconstructNullPr(gInv0, p_t, p_phi);
  } catch {
    throw new RangeError(
      `evaluateCovariantEikonalNumerical: null condition has no real p_r at R_far=${R_far_m} (impact parameter b=${b_m} too large for this geometry)`,
    );
  }

  const initialState = {
    x: x0,
    p: [p_t, p_r, p_theta, p_phi],
  };

  // ─── Eikonal residual ────────────────────────────────────────────────────
  // The eikonal equation is g^μν ∂_μS ∂_νS = 0; the wave-covector is the
  // geodesic momentum p_μ, with p_r solved by reconstructNullPr so the covector
  // is genuinely null at the initial point. Report the ACTUAL contraction
  // g^μν p_μ p_ν, normalized by the sum of |term| magnitudes to a dimensionless
  // relative residual (the raw value is a near-cancellation of ~1e16-scale
  // terms). This is computed, not asserted: ~machine-ε confirms the null
  // construction rather than the earlier hardcoded 0 on a non-null (E,E,0,0).
  let rawResidual = 0;
  let residualScale = 0;
  for (let mu = 0; mu < 4; mu++) {
    for (let nu = 0; nu < 4; nu++) {
      const term = gInv0[mu * 4 + nu] * initialState.p[mu] * initialState.p[nu];
      rawResidual += term;
      residualScale += Math.abs(term);
    }
  }
  const eikonalResidual = residualScale > 0 ? Math.abs(rawResidual) / residualScale : 0;

  // Choose tauMax to overshoot R_near with safety margin. With p_t = -c²
  // and far from horizon, dr/dτ ≈ -c for b=0 (radial); slightly slower for
  // non-zero b. Flat-space single-leg time = (√(R_far² − b²) − √(R_near² − b²))/c.
  const flatLegFar = Math.sqrt(R_far_m * R_far_m - b_m * b_m);
  const flatLegNear = Math.sqrt(R_near_m * R_near_m - b_m * b_m);
  const t_flat = (flatLegFar - flatLegNear) / c_SI;
  const tauMax = t_flat * 1.5;

  const snapshots = integrateGeodesicGL4(initialState, {
    steps,
    tauMax,
    gInverseFn,
    dgInverseFn,
    domainMinRadius: r_s * 1.01,
  });

  // Find the first snapshot with r ≤ R_near_m and linearly interpolate t.
  let t_geodesic: number | undefined;
  for (let i = 1; i < snapshots.length; i++) {
    const rPrev = snapshots[i - 1].x[1];
    const rCurr = snapshots[i].x[1];
    if (rPrev > R_near_m && rCurr <= R_near_m) {
      const tPrev = snapshots[i - 1].x[0];
      const tCurr = snapshots[i].x[0];
      // Linear interpolation: alpha = (R_near - rPrev) / (rCurr - rPrev), in [0, 1].
      const alpha = (R_near_m - rPrev) / (rCurr - rPrev);
      t_geodesic = tPrev + alpha * (tCurr - tPrev);
      break;
    }
  }
  if (t_geodesic === undefined) {
    const rFinal = snapshots[snapshots.length - 1].x[1];
    throw new Error(
      `evaluateCovariantEikonalNumerical: photon did not reach R_near=${R_near_m} within tauMax=${tauMax} s; final r=${rFinal}. Try increasing steps or tauMax.`,
    );
  }

  const shapiroDelaySec = t_geodesic - t_flat;

  return { eikonalResidual, shapiroDelaySec };
}
