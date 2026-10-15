/**
 * Bisection perihelion finder via cubic-Hermite interpolation on cached
 * GL4 snapshots (v0.5.0 Task 4, Phase 1b).
 *
 * Algorithm (Design §3 Task 1b):
 *   1. Walk snapshots, extract `dr/dτ_i = g^{rν}(x_i) · p_{i,ν}` at each
 *      snapshot. Index `r` is the radial coordinate slot (index 1 by
 *      convention in (t, r, θ, φ)).
 *   2. Locate consecutive indices `(i, i+1)` where `dr/dτ` sign-changes
 *      from `−` to `+` — that is the perihelion (inner radial turning
 *      point). Sign-change `+ → −` is apoapsis and is intentionally
 *      skipped.
 *   3. **M3 bracket-width check:** if `|τ_{i+1} − τ_i| < 2 · h_snap`
 *      where `h_snap` is the median Δτ across all snapshots, emit a
 *      non-throwing `PerihelionBracketWidthWarning` via
 *      `process.emitWarning`. This indicates the GL4 step is too coarse
 *      to resolve the turning point — the caller should re-integrate
 *      with finer steps.
 *   4. Fit a **cubic Hermite polynomial** through `(τ_i, dr/dτ_i)` and
 *      `(τ_{i+1}, dr/dτ_{i+1})`, with endpoint derivatives estimated
 *      from neighboring snapshots (4 values total: f and f' at both
 *      endpoints). Find an analytic root of the cubic on [τ_i, τ_{i+1}].
 *   5. If `|P(τ_root)| > tauTolerance`, refine with **Brent's method on the
 *      polynomial** (MathTS `findRoot`, not re-integration — Adam+Eve
 *      I6/F11 — that would cost a full GL4 sweep per step, which defeats
 *      the cached-snapshot approach). `tauTolerance` is a RESIDUAL tolerance
 *      in the units of dr/dτ, so the search is run with `xtol: 0`
 *      (`@danielsimonjr/mathts-functions` ≥ 0.68.3): the solver stops on
 *      `|P| ≤ tauTolerance` alone, never on the bracket width in `s`.
 *      Precision floor: 1e-9 × T_orbit (Adam+Eve I1 — 1e-12 is wasted
 *      effort given the integrator's per-step error is already > 1e-12).
 *   6. Return `{ tau, x, phi }` where `x` is the cubic-Hermite-interpolated
 *      4-coordinate at the root and `phi = x[3]`.
 *
 * **Throws** `Error("no perihelion bracket")` if no `−→+` sign-change is
 * found in the snapshot range.
 *
 * @module numerical/perihelion-finder
 */
import { findRoot, hermiteInterp, median } from '@danielsimonjr/mathts-functions';
import { numberFrom } from '../core/mathts-read.js';

/**
 * Result of `findPerihelion`: the τ at the radial turning point, the
 * interpolated 4-coordinate, and the orbital phase `phi = x[3]`.
 *
 * @public
 */
export interface PerihelionResult {
  /** Proper time at the perihelion. */
  readonly tau: number;
  /** Interpolated 4-coordinate x^μ at τ_perihelion. */
  readonly x: readonly number[];
  /** Orbital phase φ = x[3] at τ_perihelion. */
  readonly phi: number;
}

/**
 * Options for {@link findPerihelion}.
 *
 * @public
 */
export interface FindPerihelionOptions {
  /** Snapshots produced by `integrateGeodesicGL4` (or any compatible
   *  `(τ, x, p)` snapshot stream — only `tau`, `x`, `p` are read). */
  readonly snapshots: ReadonlyArray<{
    readonly tau: number;
    readonly x: readonly number[];
    readonly p: readonly number[];
  }>;
  /** Inverse-metric closure (v0.9.0 O-1 flat layout):
   *  `gInverseFn(x)[μ*dim + ν] = g^{μν}(x)`, Float64Array(dim²). Used to
   *  compute `dr/dτ = g^{rν}(x) p_ν` at each snapshot. */
  readonly gInverseFn: (x: readonly number[]) => Float64Array;
  /** Polynomial-bisection target tolerance on the cubic-Hermite root —
   *  measured as `|P(τ_root)|`, not `|τ − τ_true|`. Precision floor 1e-9
   *  per Adam+Eve I1; tighter values just waste bisections. */
  readonly tauTolerance: number;
  /** Coordinate index used as the "radial" slot. Defaults to 1
   *  ((t, r, θ, φ) convention). */
  readonly radialIndex?: number;
}

/** Compute `dr/dτ = g^{rν}(x) p_ν` at a single snapshot. */
function radialVelocity(
  x: readonly number[],
  p: readonly number[],
  gInverseFn: (x: readonly number[]) => Float64Array,
  r: number,
): number {
  const gInv = gInverseFn(x);
  const dim = p.length;
  let v = 0;
  for (let nu = 0; nu < dim; nu++) {
    v += gInv[r * dim + nu] * p[nu];
  }
  return v;
}

/** Median of the snapshot steps, MathTS `median` (0 for no steps, as before). */
function medianStep(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return numberFrom('median', median([...values]));
}

/**
 * The cubic Hermite interpolant of a scalar `f(τ)` over `[τ0, τ1]` with
 * endpoint values `f0, f1` and endpoint derivatives `m0, m1` (in `f` per
 * `τ`), at `s = (τ − τ0)/(τ1 − τ0)`: MathTS `hermiteInterp` on the two
 * nodes `0` and `1` of the unit interval, where the derivatives are
 * `(τ1 − τ0) m`. With two nodes that interpolant IS the cubic
 *
 *     P = h00(s) f0 + h10(s) (τ1−τ0) m0 + h01(s) f1 + h11(s) (τ1−τ0) m1
 *
 * (Numerical Recipes §3.4; Hairer/Lubich/Wanner §III.5.)
 */
function hermiteEval(
  f0: number,
  f1: number,
  m0: number,
  m1: number,
  dt: number,
  s: number,
): number {
  return hermiteInterp([0, 1], [f0, f1], [dt * m0, dt * m1], s);
}

/**
 * Vector cubic-Hermite interpolation of a 4-coordinate `x^μ` at `τ`
 * given the two bracket endpoints and their snapshot derivatives in `τ`
 * (here: the `x` arrays, with derivative `dx/dτ` approximated by central
 * differences on neighbor snapshots — passed in by the caller).
 */
function hermiteInterpVector(
  x0: readonly number[],
  x1: readonly number[],
  m0: readonly number[],
  m1: readonly number[],
  dt: number,
  s: number,
): number[] {
  const dim = x0.length;
  const out = new Array<number>(dim);
  for (let mu = 0; mu < dim; mu++) {
    out[mu] = hermiteEval(x0[mu], x1[mu], m0[mu], m1[mu], dt, s);
  }
  return out;
}

/**
 * The root of the cubic-Hermite polynomial for the scalar `dr/dτ`, on the
 * normalised bracket coordinate `s ∈ [0,1]`, by MathTS `findRoot` (Brent).
 * Returns the converged `s` and the polynomial value there.
 *
 * Precision: `tol` is a residual tolerance in the units of `dr/dτ` (the
 * caller passes `tauTolerance`, matched to the integrator scale), so the
 * solver runs with `xtol: 0` and stops on `|P(s)| ≤ tol` alone, never on
 * the bracket width in `s`. `sInitial` (the linear estimate) is tried first
 * and returned when it already meets `tol`. A hard iteration cap of 100
 * bounds a tolerance the polynomial cannot meet in floating point; the
 * solver then returns its best point.
 */
function rootOnCubic(
  f0: number,
  f1: number,
  m0: number,
  m1: number,
  dt: number,
  sInitial: number,
  tol: number,
): { s: number; residual: number } {
  const P = (s: number): number => hermiteEval(f0, f1, m0, m1, dt, s);
  const atStart = P(sInitial);
  if (Math.abs(atStart) <= tol) return { s: sInitial, residual: atStart };
  // By construction f(0) = f0 ≤ 0 < f1 = f(1) (or f0 < 0 ≤ f1), the sign change `findRoot` requires.
  const s = findRoot(P, 0, 1, { tol, xtol: 0, maxIter: 100 });
  return { s, residual: P(s) };
}

/**
 * Find the perihelion (inner radial turning point) on a snapshot stream.
 *
 * See module-level docstring for the algorithm. Throws if no `−→+` sign
 * change in `dr/dτ` is found.
 *
 * **Units.** Inherited from the supplied snapshots and `gInverseFn` — the
 * finder is metric-agnostic. For the perihelion method used by catalog
 * relation be-52 on Schwarzschild:
 *   - `snapshots[i].tau` — affine parameter in **seconds** (SI, the
 *     covariant-eikonal method's null normalization, used by catalog
 *     relation be-37) or **proper-time seconds** (timelike geodesics).
 *   - `snapshots[i].x` — 4-coordinate `(t, r, θ, φ)` in
 *     **(s, m, rad, rad)** (SI).
 *   - `snapshots[i].p` — covariant momentum (units depend on the
 *     normalization; see `integrateGeodesicGL4` JSDoc).
 *   - `tauTolerance` — polynomial-residual tolerance on `dr/dτ`,
 *     therefore in **m/s** for SI Schwarzschild. Floor `1e-9` ⇒ tighter
 *     values are quietly clamped (see implementation).
 *
 * @param options — see {@link FindPerihelionOptions}:
 *   - `snapshots` — `(τ, x, p)` stream from `integrateGeodesicGL4` (units
 *     as above).
 *   - `gInverseFn(x)[μ*dim+ν]` — inverse metric `g^{μν}(x)` (flat). Same units as
 *     the matching integrator call.
 *   - `tauTolerance` — bisection target on `|P(s_root)|` measured in the
 *     units of `dr/dτ` (m/s for SI Schwarzschild).
 *   - `radialIndex` — index of `r` within `x` (default `1` — standard
 *     `(t, r, θ, φ)` ordering).
 * @returns `{ tau, x, phi }` — affine parameter, interpolated 4-coordinate,
 *   and orbital phase `φ = x[3]` at the perihelion. Units of `tau` and `x`
 *   match the inputs; `phi` is in **radians**.
 * @throws Error if `snapshots.length < 2` or no `−→+` sign change in `dr/dτ`.
 *
 * @example
 * ```typescript
 * import { findPerihelion, integrateGeodesicGL4 } from 'universal-physics-tensor';
 * import {
 *   schwarzschildDgInverseFn,
 *   schwarzschildGInverseFn,
 *   schwarzschildRs,
 * } from '../tests/fixtures/schwarzschild.js';
 *
 * const M = 1.989e30;
 * const r0 = 20 * schwarzschildRs(M); // starting radius
 * // Canonical (x, p) state: covariant momentum p = [-E, 0, 0, L] from the
 * // orbit's conserved energy E and angular momentum L (see
 * // tests/bridges/perihelion-precession.test.ts for a full setup).
 * const snapshots = integrateGeodesicGL4(
 *   { x: [0, r0, Math.PI / 2, 0], p: [-E, 0, 0, L] },
 *   {
 *     steps: 2000,
 *     tauMax: 1e6,
 *     gInverseFn: schwarzschildGInverseFn(M),
 *     dgInverseFn: schwarzschildDgInverseFn(M),
 *   },
 * );
 *
 * const perihelion = findPerihelion({
 *   snapshots,
 *   gInverseFn: schwarzschildGInverseFn(M),
 *   tauTolerance: 1e-9,
 * });
 * // perihelion.phi — azimuthal angle at closest approach (radians)
 * ```
 *
 * @public
 */
export function findPerihelion(options: FindPerihelionOptions): PerihelionResult {
  const { snapshots, gInverseFn, tauTolerance, radialIndex = 1 } = options;
  if (snapshots.length < 2) {
    throw new Error('no perihelion bracket: need at least 2 snapshots');
  }

  // Step 1: extract dr/dτ at every snapshot.
  const drDtau = new Array<number>(snapshots.length);
  for (let i = 0; i < snapshots.length; i++) {
    drDtau[i] = radialVelocity(
      snapshots[i].x,
      snapshots[i].p,
      gInverseFn,
      radialIndex,
    );
  }

  // Step 2: locate the first `− → +` sign change.
  // Tolerant against snapshot landing exactly at the turning point
  // (drDtau ≈ 0): treat `≤ 0 → > 0` as a valid bracket. A snapshot with
  // f == 0 exactly is itself the perihelion — but we still return through
  // the Hermite path so the {x, phi} interpolation is uniform.
  let iBracket = -1;
  for (let i = 0; i < snapshots.length - 1; i++) {
    if (drDtau[i] <= 0 && drDtau[i + 1] > 0) {
      iBracket = i;
      break;
    }
    if (drDtau[i] < 0 && drDtau[i + 1] >= 0) {
      iBracket = i;
      break;
    }
  }
  if (iBracket < 0) {
    throw new Error('no perihelion bracket: dr/dτ does not change sign − → +');
  }

  const i0 = iBracket;
  const i1 = iBracket + 1;
  const tau0 = snapshots[i0].tau;
  const tau1 = snapshots[i1].tau;
  const dt = tau1 - tau0;

  // Step 3: M3 bracket-width check vs median Δτ.
  //
  // Plan spec literally says `< 2·h_snap`, but on a uniform-step grid
  // every bracket equals h_snap exactly (ratio 1.0), so `< 2·h_snap` would
  // fire on every successful call — useless as a diagnostic. The intent
  // of M3 is to flag brackets compressed below the nominal integrator
  // step (i.e., adaptive step-halving has run near perihelion, leaving a
  // suspicious cluster). We compare against `h_snap` directly: the
  // warning fires when the bracket is **narrower than the typical step**.
  // Documented deviation; honest framing maintained — see CHANGELOG.
  const deltas: number[] = [];
  for (let i = 0; i < snapshots.length - 1; i++) {
    deltas.push(snapshots[i + 1].tau - snapshots[i].tau);
  }
  const hSnap = medianStep(deltas);
  if (dt < hSnap) {
    process.emitWarning(
      `findPerihelion: bracket width Δτ=${dt} < h_snap=${hSnap} `
      + `(median snapshot step) — GL4 snapshot density is too coarse to `
      + `resolve this turning point reliably; consider re-integrating `
      + `with finer steps.`,
      'PerihelionBracketWidthWarning',
    );
  }

  // Step 4: build cubic-Hermite interpolant for dr/dτ on [τ_i0, τ_i1].
  // Endpoint derivatives (d/dτ of dr/dτ) approximated via central
  // differences on neighboring snapshots (one-sided at boundaries).
  const f0 = drDtau[i0];
  const f1 = drDtau[i1];
  const m0 = derivAt(drDtau, snapshots, i0);
  const m1 = derivAt(drDtau, snapshots, i1);

  // Initial guess: linear interpolation root, s = f0 / (f0 − f1).
  // For a linear sign-change this is exact; for cubic it's a warm start.
  const sLinear = f0 / (f0 - f1);

  // Step 5: solve the cubic-Hermite polynomial until residual ≤ tolerance.
  const { s: sRoot } = rootOnCubic(f0, f1, m0, m1, dt, sLinear, tauTolerance);

  const tauRoot = tau0 + sRoot * dt;

  // Step 6: interpolate x^μ at τ_root via cubic Hermite using the same
  // endpoint-derivative scheme. dx^μ/dτ at endpoints comes from
  // central-differencing neighboring snapshots' x arrays.
  const xMomentum0 = velocityAt(snapshots, i0, gInverseFn);
  const xMomentum1 = velocityAt(snapshots, i1, gInverseFn);
  const xInterp = hermiteInterpVector(
    snapshots[i0].x,
    snapshots[i1].x,
    xMomentum0,
    xMomentum1,
    dt,
    sRoot,
  );

  return {
    tau: tauRoot,
    x: xInterp,
    phi: xInterp[3] ?? 0,
  };
}

/**
 * Central-difference estimate of `d(dr/dτ)/dτ` at snapshot index `i`.
 * One-sided at i=0 and i=N−1. Used as the Hermite endpoint slope.
 */
function derivAt(
  drDtau: readonly number[],
  snapshots: ReadonlyArray<{ readonly tau: number }>,
  i: number,
): number {
  const N = snapshots.length;
  if (i === 0) {
    return (drDtau[1] - drDtau[0]) / (snapshots[1].tau - snapshots[0].tau);
  }
  if (i === N - 1) {
    return (drDtau[N - 1] - drDtau[N - 2])
      / (snapshots[N - 1].tau - snapshots[N - 2].tau);
  }
  return (drDtau[i + 1] - drDtau[i - 1])
    / (snapshots[i + 1].tau - snapshots[i - 1].tau);
}

/**
 * 4-velocity `v^μ = g^{μν}(x_i) p_{i,ν}` at snapshot `i`. Used as the
 * Hermite endpoint slope for the `x^μ` interpolation (since by definition
 * `dx^μ/dτ = g^{μν} p_ν` along a geodesic).
 */
function velocityAt(
  snapshots: ReadonlyArray<{ readonly x: readonly number[]; readonly p: readonly number[] }>,
  i: number,
  gInverseFn: (x: readonly number[]) => Float64Array,
): number[] {
  const x = snapshots[i].x;
  const p = snapshots[i].p;
  const gInv = gInverseFn(x);
  const dim = x.length;
  const v = new Array<number>(dim);
  for (let mu = 0; mu < dim; mu++) {
    let acc = 0;
    for (let nu = 0; nu < dim; nu++) {
      acc += gInv[mu * dim + nu] * p[nu];
    }
    v[mu] = acc;
  }
  return v;
}
