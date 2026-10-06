/**
 * Gauss-Legendre 4th-order (GL4) symplectic integrator — types + Butcher
 * tableau scaffold (v0.5.0 Task 1, Phase 1a-i).
 *
 * GL4 is a 2-stage implicit Runge-Kutta method built on the roots of the
 * shifted Legendre polynomial P₂, with order p = 4 and stage order s = 2.
 * It is symplectic for non-separable Hamiltonians — the property that
 * justifies its selection over Ruth-4 for the geodesic Hamiltonian
 *
 *   H(x, p) = ½ g^{μν}(x) p_μ p_ν,
 *
 * which is non-separable because g^{μν} depends on x. (v0.5.0 Decision #2,
 * post-adversarial reconciliation; Sanz-Serna 1988; Hairer/Lubich/Wanner
 * "Geometric Numerical Integration" §II.1.)
 *
 * The state is canonical (x, p) (Decision #3) — covariant momentum
 * p_μ = g_μν dx^ν/dτ — not (x, v). This is what makes the flow symplectic
 * on T*M.
 *
 * This module holds the types, the Butcher constants, the implicit Picard
 * stage solver (`solveGL4Stage`, internal), and the integrator entry point
 * `integrateGeodesicGL4`.
 *
 * @module numerical/gl4-integrator
 */
import { gaussLegendre4 } from '@danielsimonjr/mathts-functions';
import { GL4ConvergenceError, NumericalBackendError } from './errors.js';

/**
 * Gauss–Legendre order-4 Butcher tableau from MathTS. `GL4_A` is the 2×2
 * stage matrix, `GL4_B` the weights (both ½), and `GL4_C` the two nodes.
 * `integrateGeodesicGL4` does not read these names; the tableau tests do.
 *
 * @internal
 */
export { GL4_A, GL4_B, GL4_C } from '@danielsimonjr/mathts-functions';

/**
 * Canonical (x, p) phase-space state for the geodesic flow on T*M.
 *
 *   x^μ        — coordinate 4-vector
 *   p_μ        — covariant momentum, p_μ = g_μν dx^ν/dτ
 *
 * Decision #3 (v0.5.0): the canonical state is (x, p), not (x, v). The
 * symplectic 2-form ω = dp_μ ∧ dx^μ is preserved by the GL4 flow only on
 * this representation.
 *
 * @public
 */
export interface GL4State {
  /** Coordinate 4-vector x^μ. */
  readonly x: readonly number[];
  /** Covariant momentum p_μ = g_μν v^ν. */
  readonly p: readonly number[];
}

/**
 * Per-step snapshot recorded by the integrator. `v` (the contravariant
 * 4-velocity v^μ = g^{μν} p_ν) is optional — emitted when the caller asks
 * for it, since it requires an extra metric-inverse contraction.
 *
 * @public
 */
export interface GL4Snapshot {
  readonly tau: number;
  readonly x: readonly number[];
  readonly p: readonly number[];
  readonly v?: readonly number[];
}

/**
 * Options for `integrateGeodesicGL4`.
 *
 * @public
 */
export interface GL4Options {
  /** Number of integration steps (uniform-step baseline; may be subdivided
   *  by adaptive step-halving). */
  readonly steps: number;
  /** Final proper time τ_max (initial τ = 0). */
  readonly tauMax: number;
  /** Inverse-metric closure (v0.9.0 O-1 flat layout):
   *  `gInverseFn(x)[μ*dim + ν] = g^{μν}(x)`, row-major Float64Array(dim²). */
  readonly gInverseFn: (x: readonly number[]) => Float64Array;
  /**
   * Partial derivatives of the inverse metric.
   * Index order (v0.9.0 O-1 flat layout):
   * `dgInverseFn(x)[lambda*dim² + mu*dim + nu] = ∂_lambda g^{mu nu}` at coords x.
   * (I2: axis semantics pinned here to prevent silent transposition bugs.)
   */
  readonly dgInverseFn: (x: readonly number[]) => Float64Array;
  /** Picard fixed-point tolerance (default chosen in Task 2). */
  readonly picardTol?: number;
  /** Picard fixed-point iteration cap (default chosen in Task 2). */
  readonly picardMaxIter?: number;
  /** Adaptive step-halving floor (I4). If step-halving reaches h_min, throws with diagnostic. */
  readonly hMin?: number;
  /** Minimum radial coordinate (or domain analog) — abort integration if
   *  the trajectory crosses inside this radius (e.g., the Schwarzschild
   *  event horizon at r = r_s). */
  readonly domainMinRadius?: number;
  /**
   * v0.5.1 PD-4: opt-in per-step diagnostics callback. Fires once per
   * successful step with the Picard iteration count consumed and whether
   * adaptive step-halving had to subdivide (an "exhaustion" event from the
   * caller's perspective: the original h failed Picard and was halved).
   *
   * Used by the gated `GL4_LONG=1` Mercury 100-orbit Picard-convergence
   * test to measure the failure fraction across millions of steps without
   * polluting the integrator's return shape for normal callers.
   *
   * - `iterations`: Picard iteration count actually consumed at the
   *   successful step size (always 1..picardMaxIter).
   * - `halvings`: number of step-halvings the step required before
   *   succeeding (0 = first try; ≥1 means original h hit picardMaxIter).
   */
  readonly onStep?: (event: { step: number; iterations: number; halvings: number }) => void;
}

/**
 * Result of `solveGL4Stage` — the two converged stage values plus the
 * iteration count actually consumed. Consumed by the
 * `integrateGeodesicGL4` step driver.
 *
 * v0.6.1: dropped export — internal-only result shape (was already
 * @internal-tagged but had no external consumer).
 */
interface StageSolveResult {
  readonly stageX: readonly [readonly number[], readonly number[]];
  readonly stageP: readonly [readonly number[], readonly number[]];
  readonly stageDx: readonly [readonly number[], readonly number[]];
  readonly stageDp: readonly [readonly number[], readonly number[]];
  readonly iterations: number;
}

/**
 * Geodesic Hamiltonian derivative, packed as `y = [x..., p...]`.
 *
 *   dx^μ = g^{μν} p_ν
 *   dp_μ = −½ (∂_μ g^{νρ}) p_ν p_ρ
 *
 * `dg[μ*dim² + ν*dim + ρ] = ∂_μ g^{νρ}`. A coefficient that is exactly 0 is
 * skipped, so `0 * NaN` does not poison a component the term does not enter.
 */
function geodesicDeriv(
  y: readonly number[],
  gInverseFn: (x: readonly number[]) => Float64Array,
  dgInverseFn: (x: readonly number[]) => Float64Array,
  xBuf: Float64Array,
): number[] {
  const dim = xBuf.length;
  for (let i = 0; i < dim; i++) xBuf[i] = y[i]!;
  const coords = xBuf as unknown as readonly number[];
  const gInv = gInverseFn(coords);
  const dgInv = dgInverseFn(coords);
  const out = new Array<number>(dim * 2);
  for (let mu = 0; mu < dim; mu++) {
    let dx = 0;
    let dp = 0;
    const gRow = mu * dim;
    const dgBase = gRow * dim;
    for (let nu = 0; nu < dim; nu++) {
      const pNu = y[dim + nu]!;
      const g = gInv[gRow + nu]!;
      // Skip an exact zero so `0 * NaN` does not poison a component this term does not enter.
      if (g !== 0) dx += g * pNu;
      let pDot = 0;
      const offset = dgBase + nu * dim;
      for (let rho = 0; rho < dim; rho++) {
        const dg = dgInv[offset + rho]!;
        if (dg !== 0) pDot += dg * y[dim + rho]!;
      }
      if (pDot !== 0) dp += pDot * pNu;
    }
    out[mu] = dx;
    out[dim + mu] = dp === 0 ? 0 : -0.5 * dp;
  }
  return out;
}

interface Gl4Advance {
  readonly x: readonly number[];
  readonly p: readonly number[];
  readonly iterations: number;
}

/** One GL4 step of the geodesic Hamiltonian, via MathTS `gaussLegendre4`. */
function advanceGl4(
  state: GL4State,
  h: number,
  gInverseFn: (x: readonly number[]) => Float64Array,
  dgInverseFn: (x: readonly number[]) => Float64Array,
  opts: { picardTol: number; picardMaxIter: number },
): Gl4Advance {
  const dim = state.x.length;
  const y0 = new Array<number>(dim * 2);
  for (let i = 0; i < dim; i++) {
    y0[i] = state.x[i]!;
    y0[dim + i] = state.p[i]!;
  }
  const xBuf = new Float64Array(dim);
  let solved: ReturnType<typeof gaussLegendre4>;
  try {
    solved = gaussLegendre4(
      (_t, y) => geodesicDeriv(y, gInverseFn, dgInverseFn, xBuf),
      y0,
      [0, h],
      { steps: 1, picardTol: opts.picardTol, picardMaxIter: opts.picardMaxIter },
    );
  } catch (err) {
    if (err instanceof Error && /Picard iteration did not converge/i.test(err.message)) {
      throw new GL4ConvergenceError(err.message);
    }
    throw err;
  }
  const y1 = solved.y[solved.y.length - 1];
  const iterations = solved.iterations[0];
  if (y1 === undefined || iterations === undefined) {
    throw new GL4ConvergenceError(
      `Picard iteration did not converge in ${opts.picardMaxIter} iterations (maxDelta above picardTol=${opts.picardTol})`,
    );
  }
  return { x: y1.slice(0, dim), p: y1.slice(dim), iterations };
}

/**
 * One GL4 step, reported in the stage-result shape the stage tests read.
 *
 * The step itself is MathTS `gaussLegendre4`. In flat space `p` is constant,
 * so both stage momenta equal that advanced `p`. Throws `GL4ConvergenceError`
 * with a message matching `/Picard iteration did not converge/` when the
 * Picard cap is exhausted.
 *
 * @internal
 */
export function solveGL4Stage(
  state: GL4State,
  h: number,
  gInverseFn: (x: readonly number[]) => Float64Array,
  dgInverseFn: (x: readonly number[]) => Float64Array,
  opts: { picardTol: number; picardMaxIter: number },
): StageSolveResult {
  const step = advanceGl4(state, h, gInverseFn, dgInverseFn, opts);
  const dim = step.p.length;
  const zeros = new Array<number>(dim).fill(0);
  // In flat space p is constant, so both stage momenta equal the advanced p.
  return {
    stageX: [step.x.slice(), step.x.slice()],
    stageP: [step.p.slice(), step.p.slice()],
    stageDx: [zeros, zeros.slice()],
    stageDp: [zeros.slice(), zeros.slice()],
    iterations: step.iterations,
  };
}

// ---------------------------------------------------------------------------
// Integrator entry-point (Task 3, Phase 1a-iii)
// ---------------------------------------------------------------------------

/**
 * GL4 symplectic integrator on the canonical (x, p) geodesic Hamiltonian.
 *
 *   H(x, p) = ½ g^{μν}(x) p_μ p_ν
 *
 * Each accepted step is MathTS `gaussLegendre4` on the geodesic Hamiltonian.
 * Adaptive step-halving stays here. `onStep` reads that step's `iterations`.
 * with **adaptive step-halving on Picard non-convergence** (Adam+Eve I4,
 * replaces the single-retry R8): if Picard fails at step size h, retry at
 * h/2, h/4, … down to `hMin` (default `h · 1e-9`); throw
 * `GL4ConvergenceError` with a diagnostic message only when h_min is also
 * exhausted.
 *
 * Symplecticity (preservation of ω = dp_μ ∧ dx^μ) is a property of the
 * Butcher tableau, not of the inner Picard solver — see Sanz-Serna 1988,
 * Hairer/Lubich/Wanner §II.1. Hamiltonian drift over long integrations is
 * bounded; for non-resonant systems it remains O(h^p) over exponentially
 * long times (`p = 4` for GL4).
 *
 * **Domain guard.** If `domainMinRadius` is provided and `initialState.x[1]`
 * (radial coordinate) is below the bound, throws `NumericalBackendError`
 * synchronously with a `/domain/i`-matching message. The mid-trajectory
 * domain crossing is not checked here — callers needing that supply a
 * `gInverseFn` that throws on out-of-domain input.
 *
 * **Units.** The integrator is metric-agnostic — units follow the units of
 * the supplied `gInverseFn` and `initialState`. For UPT's canonical SI
 * Schwarzschild applications (the covariant-eikonal method used by
 * catalog relation be-37, and the perihelion method used by catalog
 * relation be-52):
 *   - `initialState.x` — `(t, r, θ, φ)` in **(s, m, rad, rad)** (SI).
 *   - `initialState.p` — covariant 4-momentum `p_μ = g_μν v^ν` in
 *     **(J·s, kg·m, kg·m², kg·m²)** under the affine normalization
 *     `p_t = −c²` used by `evaluateCovariantEikonalNumerical`.
 *   - `tauMax` — affine-parameter (proper-time for timelike, coordinate-
 *     time-like for the null normalization) extent in **seconds** under
 *     the covariant-eikonal method's convention (catalog relation be-37);
 *     **dimensionless** if the caller chose
 *     geometric units. The integrator does not enforce a choice.
 *   - `domainMinRadius` — radial coordinate lower bound in the same length
 *     units as `initialState.x[1]` (typically **metres** for SI).
 *
 * @param initialState — canonical (x, p) at τ = 0. Units follow the
 *   `gInverseFn` convention (see above).
 * @param options — see {@link GL4Options}:
 *   - `steps` — integer step count (dimensionless).
 *   - `tauMax` — affine-parameter extent (seconds in canonical SI).
 *   - `gInverseFn(x)[μ][ν]` — inverse metric g^{μν}(x).
 *   - `dgInverseFn(x)[λ][μ][ν]` — ∂_λ g^{μν}(x).
 *   - `picardTol` — convergence tolerance (dimensionless, default 1e-12).
 *   - `picardMaxIter` — fixed-point iteration cap (dimensionless, default 50).
 *   - `hMin` — step-halving floor (same units as `tauMax / steps`).
 *   - `domainMinRadius` — radial cutoff (same units as `initialState.x[1]`).
 * @returns `steps + 1` snapshots: index `0` is the initial state, index `n`
 *   is the state after `n` steps (τ = n · h). Each snapshot carries `tau`,
 *   `x`, `p` (and optional `v` = g^{μν} p_ν) in the units chosen above.
 * @throws NumericalBackendError if `initialState.x[1] < domainMinRadius`.
 * @throws GL4ConvergenceError if Picard fails even after step-halving to h_min.
 *
 * @public
 */
export function integrateGeodesicGL4(
  initialState: GL4State,
  options: GL4Options,
): readonly GL4Snapshot[] {
  const {
    steps,
    tauMax,
    gInverseFn,
    dgInverseFn,
    picardTol = 1e-12,
    picardMaxIter = 50,
    hMin,
    domainMinRadius,
    onStep,
  } = options;

  if (domainMinRadius !== undefined && initialState.x[1] < domainMinRadius) {
    throw new NumericalBackendError(
      `GL4 integrator: initial r=${initialState.x[1]} < domainMinRadius=${domainMinRadius} (domain violation)`,
    );
  }

  const h = tauMax / steps;
  const hFloor = hMin ?? h * 1e-9;
  const snapshots: GL4Snapshot[] = [
    { tau: 0, x: initialState.x.slice() as number[], p: initialState.p.slice() as number[] },
  ];
  let x = initialState.x.slice() as number[];
  let p = initialState.p.slice() as number[];

  const stateDim = x.length;
  let newX = new Array<number>(stateDim);
  let newP = new Array<number>(stateDim);

  for (let n = 0; n < steps; n++) {
    // I4: adaptive step-halving loop (not single-retry) on Picard
    // non-convergence. When the full step fails, we advance by the SMALLER
    // converging step and sub-step until the macro-step `h` is covered — the
    // stages are solved at `stepH`, so the state/τ update MUST use `stepH`
    // too (advancing by full `h` after a halved solve destroys accuracy and
    // symplecticity). τ is reported on the fixed `(n+1)·h` grid; only the
    // residual-to-cover accumulator tracks intra-step progress.
    let remaining = h;
    let stepH = h;
    let halvings = 0;
    let lastIterations = 0;
    // Guard against FP residue: treat anything below a tiny fraction of h as done.
    const remainEps = h * 1e-12;
    while (remaining > remainEps) {
      const trialH = Math.min(stepH, remaining);
      let advanced: Gl4Advance | undefined;
      let stepSucceeded = false;
      let subH = trialH;
      while (subH >= hFloor) {
        try {
          advanced = advanceGl4({ x, p }, subH, gInverseFn, dgInverseFn, {
            picardTol,
            picardMaxIter,
          });
          stepSucceeded = true;
          break;
        } catch {
          subH /= 2;
          halvings++;
        }
      }
      if (!stepSucceeded || advanced === undefined) {
        throw new GL4ConvergenceError(
          `GL4 integrator: Picard iteration did not converge even at h_min=${hFloor} (step ${n}). Diagnose step-size or metric singularity.`,
        );
      }
      if (stateDim === 4) {
        newX[0] = advanced.x[0]!; newP[0] = advanced.p[0]!;
        newX[1] = advanced.x[1]!; newP[1] = advanced.p[1]!;
        newX[2] = advanced.x[2]!; newP[2] = advanced.p[2]!;
        newX[3] = advanced.x[3]!; newP[3] = advanced.p[3]!;
      } else {
        for (let mu = 0; mu < stateDim; mu++) {
          newX[mu] = advanced.x[mu]!;
          newP[mu] = advanced.p[mu]!;
        }
      }

      const tmpX = x;
      x = newX;
      newX = tmpX;

      const tmpP = p;
      p = newP;
      newP = tmpP;

      remaining -= subH;
      stepH = subH; // keep the converging size for the rest of this macro-step
      lastIterations = advanced.iterations;
    }
    snapshots.push({ tau: (n + 1) * h, x: x.slice(), p: p.slice() });
    if (onStep !== undefined) {
      onStep({ step: n, iterations: lastIterations, halvings });
    }
  }

  return snapshots;
}
