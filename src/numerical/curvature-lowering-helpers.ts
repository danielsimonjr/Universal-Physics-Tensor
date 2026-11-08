/**
 * Numerical helpers for Riemann-curvature lowering (Task 6 [U] / v0.5.0 1c-ii).
 *
 * Mirrors `connection-lowering-helpers.ts`: produces Γ and ∂Γ tensors from
 * coordinate-dependent metric closures, then assembles the Riemann tensor via
 * the corrected (Carroll-Ch.3 §3.4 / Adam+Eve F4-S3) formula:
 *
 *   R^ρ_{σμν} = ∂_μ Γ^ρ_{σν} − ∂_ν Γ^ρ_{σμ} + Σ_λ (Γ^ρ_{λμ} Γ^λ_{σν} − Γ^ρ_{λν} Γ^λ_{σμ})
 *
 * Index conventions (pinned via JSDoc + a runtime assert):
 *   - Γ[ρ][σ][ν] = Γ^ρ_{σν}  (matches computeChristoffelTensor's [α][μ][ν] with
 *     σ ↔ μ — i.e., the SECOND axis is σ, the THIRD is ν, per Carroll Ch.5).
 *   - dGamma[λ][ρ][σ][ν] = ∂_λ Γ^ρ_{σν}     (I3)
 *   - R[ρ][σ][μ][ν] = R^ρ_{σμν}              (Carroll)
 *
 * NOTE on the σ/μ swap vs `computeChristoffelTensor`:
 *   `computeChristoffelTensor` was authored for v0.4.0 covariant-derivative
 *   lowering, which sums Γ^α_{μλ} T^λ over the middle index `μ` (the wrt index
 *   of the cov-deriv). v0.5.0 Riemann needs σ in the SECOND-lower slot of every
 *   Γ. Because Γ is symmetric in its two lower indices (Christoffel symmetry),
 *   the two storage conventions are numerically identical — we use the
 *   existing [α][middle][last] storage and access it with σ in the middle slot.
 *
 * The fast path uses the v0.4.0 `computeChristoffelTensor` infrastructure
 * (no new tensor-engine code) and the v0.4.0 `pderivNumericalFn` pattern
 * (centered finite differences). M11: ∂Γ is computed by repeated centered
 * finite-differences on `christoffel()`, not a new AST node type or AD pass.
 *
 * @module numerical/curvature-lowering-helpers
 */

import type { EngineTensor, TensorEngine } from './tensor-engine.js';
import type { NestedArray, NumericalInputs } from './types.js';
import { NumericalBackendError } from './errors.js';
import { computeChristoffelTensor, flattenNA } from './connection-lowering-helpers.js';
import { pderivNumericalFn } from './pderiv.js';
import type { BianchiResidualNode } from '../dimensional/curvature.js';
import type { WeylTensorNode } from '../dimensional/weyl-validators.js';
import type { KretschmannScalarNode } from '../dimensional/curvature-invariants.js';
import { computeWeylTensor } from './weyl-lowering.js';
import { computeKretschmann } from './kretschmann.js';
import { dimensionOf, requireValue, flattenNestedArray, requireMetricClosures } from './lowering-utils.js';
import type { MetricFn } from './lowering-utils.js';

/** A coordinate-dependent rank-2 closure returning the FLAT layout:
 *  f(x) → Float64Array(N²), row-major `flat[mu*N + nu]` (v0.9.0
 *  Task 1.1; mirrors the v0.6.0 BR-2 christoffelFn convention). */
export type MetricFnFlat = (x: ReadonlyArray<number>) => Float64Array;

/** A coordinate-dependent rank-2 closure returning the legacy nested
 *  layout: f(x) → number[][] (sibling fixtures de-sitter / flrw /
 *  minkowski stay nested for this release per Decision #8). */
type MetricFnNested = (x: ReadonlyArray<number>) => number[][];

/** A coordinate-dependent metric closure. The type lives in `lowering-utils.ts`. */
export type { MetricFn } from './lowering-utils.js';

/**
 * dGamma[λ][ρ][σ][ν] = ∂_λ Γ^ρ_{σν} at the given coordinates (I3).
 *
 * 4-deep nested number array — readonly to mark this as an output container
 * the helper produces but does not mutate after construction.
 *
 * v0.6.1: dropped `export` — file-internal only (used by `dGammaAt` +
 * `buildRiemann` + `riemannLowerAt`).
 */
type DGammaTensor = readonly (readonly (readonly (readonly number[])[])[])[];

/** Gamma[ρ][σ][ν] = Γ^ρ_{σν} — same index order as `computeChristoffelTensor`
 *  output (just renamed for the Riemann use).
 *  v0.6.1: dropped `export` — file-internal only. */
type GammaTensor = readonly (readonly (readonly number[])[])[];

// ---------------------------------------------------------------------------
// Zero-tensor allocators
// ---------------------------------------------------------------------------

/** A fresh N×N×N×N zero tensor (independent inner arrays). */
function nestedZeros4(N: number): number[][][][] {
  // Bolt: V8 fast-path literal allocation bypasses `new Array` and looping overhead for fixed small sizes.
  if (N === 4) {
    return [
      [
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]]
      ],
      [
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]]
      ],
      [
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]]
      ],
      [
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
        [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]]
      ]
    ];
  }

  // Bolt: nested manual allocation is faster than Array.from and .fill
  const out = new Array<number[][][]>(N);
  for (let i = 0; i < N; i++) {
    const arr3 = new Array<number[][]>(N);
    for (let j = 0; j < N; j++) {
      const arr2 = new Array<number[]>(N);
      for (let k = 0; k < N; k++) {
        const arr1 = new Array<number>(N);
        for (let l = 0; l < N; l++) arr1[l] = 0.0;
        arr2[k] = arr1;
      }
      arr3[j] = arr2;
    }
    out[i] = arr3;
  }
  return out;
}

/** A fresh N×N×N×N×N zero tensor (independent inner arrays). */
function nestedZeros5(N: number): number[][][][][] {
  if (N === 4) {
    return [
      nestedZeros4(4),
      nestedZeros4(4),
      nestedZeros4(4),
      nestedZeros4(4)
    ];
  }

  const out = new Array<number[][][][]>(N);
  for (let i = 0; i < N; i++) out[i] = nestedZeros4(N);
  return out;
}

// ---------------------------------------------------------------------------
// Finite-difference step
// ---------------------------------------------------------------------------

/**
 * Step size for finite differences on the Christoffel function.
 *
 * Inner step (∂g for one Γ evaluation) uses the v0.4.0 default
 * `1e-6·max(|x|,1)` via `pderivNumericalFn`-style centered FD. This gives ∂g
 * with relative precision ≈ 1e-11 on Schwarzschild components (verified by
 * inspection at r=3·r_s).
 *
 * Outer step (∂Γ for one R evaluation) is `1e-4·max(|x|,1)` and we use a
 * **4th-order centered stencil**:
 *
 *   f'(x) ≈ [−f(x+2h) + 8 f(x+h) − 8 f(x-h) + f(x-2h)] / (12 h)
 *
 * Truncation O(h⁴) instead of O(h²). At h=0.886 m (r=3·r_s, M=M_sun),
 * truncation ≈ h⁴·Γ⁽⁵⁾/Γ ~ 1e-13 relative, round-off ε·|Γ|/h ~ 1e-15 relative.
 * Both sit well below the 1e-9 gate.
 *
 * The 2nd-order outer FD that v0.4.0 covariant-derivative lowering uses
 * leaves ~3e-6 relative error on R^t_{rtr} due to noise propagation through
 * the c²-scaled g_{tt} component — 4th-order outer FD recovers the precision.
 */
function outerStep(x: number): number {
  return 1e-4 * Math.max(Math.abs(x), 1);
}

/**
 * Build a flat ∂_μ g sampler around point x using a **4th-order centered
 * stencil**:
 *
 *   ∂_μ g ≈ [−g(x+2h) + 8 g(x+h) − 8 g(x−h) + g(x−2h)] / (12 h)
 *
 * Returned function matches the `getMetricDeriv` signature expected by
 * `computeChristoffelTensor`.
 *
 * Inner step `h_i = 1e-3·max(|x|,1)` is intentionally LARGER than the v0.4.0
 * 1e-6 default to compensate for the c²·g_{tt} ~ 6e16 cancellation noise: a
 * 4th-order stencil at h_i ≈ 8.86 m around r=3·r_s gives truncation
 * O(h_i⁴·g⁽⁵⁾) ~ 1e-13 relative on each ∂g component while keeping round-off
 * ε|g|/h_i ~ 1e-15 relative — orders below the 1e-9 component-match gate.
 */
function makeInnerGradFn(
  gFn: MetricFn,
  x0: ReadonlyArray<number>,
  N: number,
): (mu: number) => number[] {
  // v0.5.1 PD-7: delegates to the shared `pderivNumericalFn(..., {order: 4})`
  // 4th-order centered stencil. The explicit `h = 1e-3·max(|x|,1)` override
  // is load-bearing: the c²·g_{tt} cancellation noise on Schwarzschild
  // demands a larger step than the v0.5.0-default 1e-4 to balance truncation
  // vs round-off at the ≤1e-9 component-match gate. (See module JSDoc.)
  return (mu: number): number[] => {
    const xc = x0[mu];
    const h = 1e-3 * Math.max(Math.abs(xc), 1);
    const d = pderivNumericalFn(gFn, x0, mu, { order: 4, h });
    const flat = Array.isArray(d) ? (d as number[]) : [d as number];
    if (flat.length !== N * N) {
      throw new NumericalBackendError(
        `curvature-lowering: metric closure returned wrong shape — expected ${N * N}, ` +
        `got ${flat.length}`,
      );
    }
    return flat;
  };
}

/**
 * Compute Γ^ρ_{σν} at coordinate x. Internally builds a centered-FD ∂g sampler
 * around x and delegates to `computeChristoffelTensor` (the v0.4.0 helper).
 *
 * Returns a fully-materialised 3-deep nested array Γ[ρ][σ][ν]. (We do NOT keep
 * the EngineTensor wrapper because we immediately rebuild dGamma and R as
 * plain nested arrays — round-tripping through the engine on every FD sample
 * would dominate the cost.)
 */
export function christoffelAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
): number[][][] {
  const gInvFlat = flattenNA(gInverseFn(x));
  if (gInvFlat.length !== N * N) {
    throw new NumericalBackendError(
      `curvature-lowering: gInverseFn returned wrong shape — expected ${N * N}, got ${gInvFlat.length}`,
    );
  }
  const gradFn = makeInnerGradFn(gFn, x, N);
  const tensor = computeChristoffelTensor(gInvFlat, gradFn, N, engine);
  const nested = engine.toNested(tensor) as NestedArray;
  engine.dispose?.(tensor);

  // Cast to the expected nested shape; computeChristoffelTensor produces
  // shape [N,N,N] so this is structurally [ρ][middle][last]. We treat
  // [middle] as σ and [last] as ν (Christoffel symmetry makes the two
  // lower-slot conventions numerically interchangeable).
  return nested as number[][][];
}

/**
 * dGamma[λ][ρ][σ][ν] = ∂_λ Γ^ρ_{σν} via centered FD on `christoffelAt`. (I3)
 *
 * Includes a runtime index-assert verifying `dGamma[1][1][1][1]` is finite
 * before returning (catches silent shape-permutation bugs introduced by future
 * edits to `computeChristoffelTensor`'s output ordering).
 */
export function dGammaAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
): DGammaTensor {
  return dGammaSampled(x, gFn, gInverseFn, N, engine, null).dGamma;
}

/**
 * The outer difference of `dGammaAt`, and its error bound when `gammaBound` is given.
 *
 * The stencil is the 4th-order centered form of `pderivNumericalFn`, with the same step
 * `h = 1e-4·max(|x|,1)` and the same rule that a component which is equal at every stencil
 * point has the derivative 0, and that component has the bound 0. The bound of any other
 * component of ∂_λ Γ is the sum of three terms:
 * the truncation estimate |D4 − D2|, where D2 is the 2nd-order form on the ±h samples; the
 * propagated error 1.5·δΓ/h of the sampled Γ; and the rounding of the stencil sum.
 */
function dGammaSampled(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
  gammaBound: GammaTensor | null,
): { dGamma: DGammaTensor; bound: number[][][][] | null } {
  const dGamma: number[][][][] = nestedZeros4(N);
  const bound: number[][][][] | null = gammaBound === null ? null : nestedZeros4(N);
  const christFn = (xs: ReadonlyArray<number>): number[] =>
    flattenNA(christoffelAt(xs, gFn, gInverseFn, N, engine));
  const N2 = N * N;
  for (let lam = 0; lam < N; lam++) {
    const xl = x[lam];
    const h = 1e-4 * Math.max(Math.abs(xl), 1);
    const p1 = [...x]; p1[lam] = xl + h;
    const m1 = [...x]; m1[lam] = xl - h;
    const p2 = [...x]; p2[lam] = xl + 2 * h;
    const m2 = [...x]; m2[lam] = xl - 2 * h;
    const fp1 = christFn(p1);
    const fm1 = christFn(m1);
    const fp2 = christFn(p2);
    const fm2 = christFn(m2);
    if (fp1.length !== N * N2 || fm1.length !== N * N2 || fp2.length !== N * N2 || fm2.length !== N * N2) {
      throw new NumericalBackendError(
        `dGammaAt: christoffelAt derivative shape mismatch — expected ${N * N2}, got ${fp1.length}`,
      );
    }
    const inv12h = 1 / (12 * h);
    for (let rho = 0; rho < N; rho++) {
      for (let sigma = 0; sigma < N; sigma++) {
        for (let nu = 0; nu < N; nu++) {
          const i = rho * N2 + sigma * N + nu;
          const still = fp1[i] === fm1[i] && fp1[i] === fp2[i] && fp1[i] === fm2[i];
          const d4 = still ? 0 : (-fp2[i] + 8 * fp1[i] - 8 * fm1[i] + fm2[i]) * inv12h;
          dGamma[lam][rho][sigma][nu] = d4;
          if (bound !== null && gammaBound !== null && !still) {
            const d2 = still ? 0 : (fp1[i] - fm1[i]) / (2 * h);
            const sum = Math.abs(fp2[i]) + 8 * Math.abs(fp1[i]) + 8 * Math.abs(fm1[i]) + Math.abs(fm2[i]);
            bound[lam][rho][sigma][nu] =
              Math.abs(d4 - d2) + (1.5 * gammaBound[rho][sigma][nu]) / h + ROUND * 4 * sum * inv12h;
          }
        }
      }
    }
  }

  // I3 runtime index-assert: verify the container is populated as expected.
  // dGamma[1][1][1][1] is ∂_r Γ^r_{rr} for Schwarzschild — a non-trivial real
  // number, so a `Number.isFinite` check catches both shape regressions and
  // numerical blow-ups.
  const probe = dGamma[1]?.[1]?.[1]?.[1];
  if (typeof probe !== 'number' || !Number.isFinite(probe)) {
    throw new NumericalBackendError(
      `curvature-lowering: dGamma index-assert failed — dGamma[1][1][1][1] is ` +
      `${probe} (expected finite number). Shape regression in christoffelAt?`,
    );
  }

  return { dGamma: dGamma as DGammaTensor, bound };
}

/**
 * Build the full 4×4×4×4 Riemann tensor R^ρ_{σμν} from Γ and ∂Γ per the
 * Carroll formula (Adam+Eve F4-S3):
 *
 *   R[ρ][σ][μ][ν] = ∂_μ Γ[ρ][σ][ν] − ∂_ν Γ[ρ][σ][μ]
 *                 + Σ_λ (Γ[ρ][λ][μ] Γ[λ][σ][ν] − Γ[ρ][λ][ν] Γ[λ][σ][μ])
 *
 * σ in the SECOND lower slot of each Γ (F4/S3 correction).
 */
export function buildRiemann(
  gamma: GammaTensor,
  dGamma: DGammaTensor,
  N: number,
): number[][][][] {
  // Bolt: Unroll and cache inner loop constants for N=4, creating 4D array in-place
  // without relying on `nestedZeros4` or excessive repetitive lookups. This drops overhead significantly
  // over creating an empty multi-dimensional array and repeatedly fetching `dGamma[mu][rho][sigma][nu]`.
  if (N === 4) {
    const R = new Array(4);

    for (let rho = 0; rho < 4; rho++) {
      const R_rho = new Array(4);
      const gamma_rho = gamma[rho];
      const g_rho_0 = gamma_rho[0];
      const g_rho_1 = gamma_rho[1];
      const g_rho_2 = gamma_rho[2];
      const g_rho_3 = gamma_rho[3];

      for (let sigma = 0; sigma < 4; sigma++) {
        const R_rho_sigma = new Array(4);
        const g_0_sig = gamma[0][sigma];
        const g_1_sig = gamma[1][sigma];
        const g_2_sig = gamma[2][sigma];
        const g_3_sig = gamma[3][sigma];

        for (let mu = 0; mu < 4; mu++) {
          const dG_mu = dGamma[mu][rho][sigma];

          const g_rho_0_mu = g_rho_0[mu];
          const g_rho_1_mu = g_rho_1[mu];
          const g_rho_2_mu = g_rho_2[mu];
          const g_rho_3_mu = g_rho_3[mu];

          const g_0_sig_mu = g_0_sig[mu];
          const g_1_sig_mu = g_1_sig[mu];
          const g_2_sig_mu = g_2_sig[mu];
          const g_3_sig_mu = g_3_sig[mu];

          const R_rho_sigma_mu = new Array(4);
          for (let nu = 0; nu < 4; nu++) {
            let value = dG_mu[nu] - dGamma[nu][rho][sigma][mu];
            value += g_rho_0_mu * g_0_sig[nu] - g_rho_0[nu] * g_0_sig_mu;
            value += g_rho_1_mu * g_1_sig[nu] - g_rho_1[nu] * g_1_sig_mu;
            value += g_rho_2_mu * g_2_sig[nu] - g_rho_2[nu] * g_2_sig_mu;
            value += g_rho_3_mu * g_3_sig[nu] - g_rho_3[nu] * g_3_sig_mu;
            R_rho_sigma_mu[nu] = value;
          }
          R_rho_sigma[mu] = R_rho_sigma_mu;
        }
        R_rho[sigma] = R_rho_sigma;
      }
      R[rho] = R_rho;
    }
    return R;
  }

  const R: number[][][][] = nestedZeros4(N);

  for (let rho = 0; rho < N; rho++) {
    for (let sigma = 0; sigma < N; sigma++) {
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          // ∂_μ Γ^ρ_{σν} − ∂_ν Γ^ρ_{σμ}
          let value = dGamma[mu][rho][sigma][nu] - dGamma[nu][rho][sigma][mu];
          // Σ_λ (Γ^ρ_{λμ} Γ^λ_{σν} − Γ^ρ_{λν} Γ^λ_{σμ})
          for (let lam = 0; lam < N; lam++) {
            value += gamma[rho][lam][mu] * gamma[lam][sigma][nu]
                  -  gamma[rho][lam][nu] * gamma[lam][sigma][mu];
          }
          R[rho][sigma][mu][nu] = value;
        }
      }
    }
  }

  return R;
}

// ---------------------------------------------------------------------------
// v0.5.0 Task 9: helpers for bianchiResidual()
// ---------------------------------------------------------------------------

/**
 * Compute the upper-Riemann tensor R^ρ_{σμν} at coordinate x using the same
 * Γ + ∂Γ pipeline as the riemann-tensor lowering case. Encapsulates the
 * full christoffelAt + dGammaAt + buildRiemann sequence so callers (Task 9
 * Bianchi residual) can sample R at perturbed coordinates without
 * re-implementing the FD machinery. The curvature report of `upt metric`
 * reads it too.
 * @internal
 */
export function riemannUpperAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
  // Optional precomputed Γ^ρ_{σν} at x — `christoffelAt` is a pure function of
  // x, so reusing the caller's center evaluation is numerically identical and
  // avoids one redundant Christoffel compute (the Bianchi path already has it).
  gammaAtX?: number[][][],
): number[][][][] {
  const gamma = gammaAtX ?? christoffelAt(x, gFn, gInverseFn, N, engine);
  const dGamma = dGammaAt(x, gFn, gInverseFn, N, engine);
  return buildRiemann(gamma, dGamma, N);
}

/**
 * Lower the upper-ρ index of R^ρ_{σμν} via the covariant metric g_{aρ}:
 *
 *   R_{aσμν} = Σ_ρ g_{aρ} R^ρ_{σμν}
 *
 * Output index order: `[a][σ][μ][ν]` — all four lower. (a is the freshly
 * lowered index in the first slot.)
 * @internal
 */
export function lowerFirstIndex(
  R: number[][][][],
  gLowerFlat: ReadonlyArray<number>,
  N: number,
): number[][][][] {
  // Bolt: Exploit physical 4D spacetime constraints to fully unroll the first-index
  // tensor lowering loop. By eliminating repetitive `a * N + rho` multi-dimensional
  // arithmetic operations and creating fully formed array closures without
  // generic `nestedZeros4` logic, we eliminate redundant garbage collection pressure.
  if (N === 4) {
    const Rlow: number[][][][] = new Array(4);
    for (let a = 0; a < 4; a++) {
      const a_offset = a * 4;
      const g0 = gLowerFlat[a_offset];
      const g1 = gLowerFlat[a_offset + 1];
      const g2 = gLowerFlat[a_offset + 2];
      const g3 = gLowerFlat[a_offset + 3];

      if (g0 === 0.0 && g1 === 0.0 && g2 === 0.0 && g3 === 0.0) {
        Rlow[a] = [
          [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
          [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
          [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
          [[0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 0.0]]
        ];
        continue;
      }

      const Rlow_a = new Array(4);
      for (let sig = 0; sig < 4; sig++) {
        const Rlow_a_sig = new Array(4);
        const R0 = R[0][sig];
        const R1 = R[1][sig];
        const R2 = R[2][sig];
        const R3 = R[3][sig];

        for (let mu = 0; mu < 4; mu++) {
          const R0_mu = R0[mu];
          const R1_mu = R1[mu];
          const R2_mu = R2[mu];
          const R3_mu = R3[mu];
          Rlow_a_sig[mu] = [
            g0 * R0_mu[0] + g1 * R1_mu[0] + g2 * R2_mu[0] + g3 * R3_mu[0],
            g0 * R0_mu[1] + g1 * R1_mu[1] + g2 * R2_mu[1] + g3 * R3_mu[1],
            g0 * R0_mu[2] + g1 * R1_mu[2] + g2 * R2_mu[2] + g3 * R3_mu[2],
            g0 * R0_mu[3] + g1 * R1_mu[3] + g2 * R2_mu[3] + g3 * R3_mu[3]
          ];
        }
        Rlow_a[sig] = Rlow_a_sig;
      }
      Rlow[a] = Rlow_a;
    }
    return Rlow;
  }

  const Rlow: number[][][][] = nestedZeros4(N);
  for (let a = 0; a < N; a++) {
    for (let sig = 0; sig < N; sig++) {
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          let sum = 0;
          for (let rho = 0; rho < N; rho++) {
            sum += gLowerFlat[a * N + rho] * R[rho][sig][mu][nu];
          }
          Rlow[a][sig][mu][nu] = sum;
        }
      }
    }
  }
  return Rlow;
}

/**
 * Sample the all-lower Riemann tensor R_{αβγδ}(x) — combines `riemannUpperAt`
 * with `lowerFirstIndex` for the single-coordinate evaluation. Used both as
 * the base sample and (with perturbed x) as the FD inputs for ∂_λ R_{αβγδ}.
 */
export function riemannLowerAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
  /** Optional precomputed Γ at x — forwarded to `riemannUpperAt` to skip the
   *  redundant Christoffel compute when the caller already has it. */
  gammaAtX?: number[][][],
): number[][][][] {
  const Rup = riemannUpperAt(x, gFn, gInverseFn, N, engine, gammaAtX);
  const gFlat = flattenNA(gFn(x));
  if (gFlat.length !== N * N) {
    throw new NumericalBackendError(
      `bianchi-residual: gFn returned wrong shape — expected ${N * N}, got ${gFlat.length}`,
    );
  }
  return lowerFirstIndex(Rup, gFlat, N);
}

/**
 * Compute ∂_λ R_{αβγδ}(x) via a 4th-order centered stencil on
 * `riemannLowerAt`. Index order: `dR[λ][α][β][γ][δ] = ∂_λ R_{αβγδ}`.
 *
 * Uses the same outer step (`outerStep`) as Task 6's dGammaAt so the
 * FD-noise compounding pattern matches. This is one extra layer of FD on top
 * of the Christoffel-of-Christoffel double-FD already inside `riemannLowerAt`
 * — total: ∂(∂(∂g)) at 4th order in each layer. Empirical noise floor reached
 * by the per-component value is documented in the test report.
 */
function dRiemannLowerAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
): number[][][][][] {
  const dR: number[][][][][] = nestedZeros5(N);

  // v0.5.1 PD-7: 4th-order centered stencil via the shared
  // `pderivNumericalFn(..., {order: 4})` — default h = 1e-4·max(|x|,1) matches
  // the v0.5.0 `outerStep`. Each axis call returns a flat number[] of length
  // N⁴ (riemannLowerAt produces [N,N,N,N]); unflatten into the
  // `dR[λ][a][b][c][d]` axis-0 slab.
  const RlowerFn = (xs: ReadonlyArray<number>): NestedArray =>
    riemannLowerAt(xs, gFn, gInverseFn, N, engine);
  const N2 = N * N;
  const N3 = N * N * N;
  for (let lam = 0; lam < N; lam++) {
    const flat = pderivNumericalFn(RlowerFn, x, lam, { order: 4 }) as number[];
    if (!Array.isArray(flat) || flat.length !== N2 * N2) {
      throw new NumericalBackendError(
        `dRiemannLowerAt: derivative shape mismatch — expected ${N2 * N2}, got ${
          Array.isArray(flat) ? flat.length : 'scalar'
        }`,
      );
    }
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        for (let c = 0; c < N; c++) {
          for (let d = 0; d < N; d++) {
            dR[lam][a][b][c][d] = flat[a * N3 + b * N2 + c * N + d];
          }
        }
      }
    }
  }

  return dR;
}

/**
 * Compute ∇_λ R_{μνρσ} via partial + Christoffel-correction terms (Approach 1).
 *
 *   ∇_λ R_{μνρσ} = ∂_λ R_{μνρσ}
 *                  − Γ^α_{λμ} R_{ανρσ}
 *                  − Γ^α_{λν} R_{μαρσ}
 *                  − Γ^α_{λρ} R_{μνασ}
 *                  − Γ^α_{λσ} R_{μνρα}
 *
 * Index order: `covR[λ][μ][ν][ρ][σ] = ∇_λ R_{μνρσ}`.
 *
 * Approach choice (full ∇, not raw ∂): the second Bianchi identity
 * ∇_{[λ} R_{μν]ρσ} = 0 is the canonical statement. Using raw ∂ would give a
 * residual dominated by the (cyclic-non-cancelling) Christoffel-correction
 * terms, masking the identity check with O(1) algebraic clutter. Full ∇
 * makes the test a genuine self-consistency check of the lowered Riemann.
 */
export function covariantDerivRiemannLowerAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
): number[][][][][] {
  const gamma = christoffelAt(x, gFn, gInverseFn, N, engine);
  // Reuse the center Γ — riemannLowerAt(x) would otherwise recompute it.
  const R = riemannLowerAt(x, gFn, gInverseFn, N, engine, gamma);
  const dR = dRiemannLowerAt(x, gFn, gInverseFn, N, engine);

  const covR: number[][][][][] = nestedZeros5(N);

  for (let lam = 0; lam < N; lam++) {
    for (let mu = 0; mu < N; mu++) {
      for (let nu = 0; nu < N; nu++) {
        for (let rho = 0; rho < N; rho++) {
          for (let sig = 0; sig < N; sig++) {
            let value = dR[lam][mu][nu][rho][sig];
            // Subtract Γ^α_{λμ} R_{ανρσ} (correction for the μ index)
            // Subtract Γ^α_{λν} R_{μαρσ} (correction for the ν index)
            // Subtract Γ^α_{λρ} R_{μνασ} (correction for the ρ index)
            // Subtract Γ^α_{λσ} R_{μνρα} (correction for the σ index)
            for (let a = 0; a < N; a++) {
              value -= gamma[a][lam][mu] * R[a][nu][rho][sig];
              value -= gamma[a][lam][nu] * R[mu][a][rho][sig];
              value -= gamma[a][lam][rho] * R[mu][nu][a][sig];
              value -= gamma[a][lam][sig] * R[mu][nu][rho][a];
            }
            covR[lam][mu][nu][rho][sig] = value;
          }
        }
      }
    }
  }

  return covR;
}

/**
 * Build the second-Bianchi-identity residual (cyclic over first three indices):
 *
 *   B_{λμνρσ} = ∇_λ R_{μνρσ} + ∇_μ R_{νλρσ} + ∇_ν R_{λμρσ}
 *
 * Carroll Eq. 3.95: B ≡ 0 in any (torsion-free) Lorentzian manifold. The
 * residual measures the FD-truncation + cancellation noise on the lowered
 * Riemann tensor through one extra ∂ layer.
 *
 * Index order: `B[λ][μ][ν][ρ][σ]` — all five lower.
 */
function bianchiResidualAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
): number[][][][][] {
  const covR = covariantDerivRiemannLowerAt(x, gFn, gInverseFn, N, engine);

  const B: number[][][][][] = nestedZeros5(N);

  for (let lam = 0; lam < N; lam++) {
    for (let mu = 0; mu < N; mu++) {
      for (let nu = 0; nu < N; nu++) {
        for (let rho = 0; rho < N; rho++) {
          for (let sig = 0; sig < N; sig++) {
            B[lam][mu][nu][rho][sig] =
              covR[lam][mu][nu][rho][sig]   // ∇_λ R_{μνρσ}
              + covR[mu][nu][lam][rho][sig] // ∇_μ R_{νλρσ}
              + covR[nu][lam][mu][rho][sig]; // ∇_ν R_{λμρσ}
          }
        }
      }
    }
  }

  return B;
}

/**
 * JS-side contraction of a flat 4-axis tensor R[a][b][c][d] (length N⁴, row-major)
 * down to a 2-tensor by summing one upper axis against one lower axis.
 *
 * Configuration:
 *   - `upperAxis`: the axis index (0..3) that contracts WITH `lowerAxis` (dummy slot).
 *   - `lowerAxis`: the partner axis (0..3) forming the dummy pair.
 *   - `outAxes`:   the two surviving axes [i, j] that become the (free output)
 *                  rows/cols of the returned N×N matrix.
 *
 * For Carroll Eq. 3.91 Ricci R_μν = R^λ_{μλν} on Riemann stored as R[ρ][σ][μ][ν]:
 *   contractRiemannJS(flatR, N, { upperAxis: 0, lowerAxis: 2, outAxes: [1, 3] })
 * sums `R[λ][μ_out][λ][ν_out]` over λ.
 *
 * Pre-flattened input convention: row-major `R[a][b][c][d] = flatR[a*N³ + b*N² + c*N + d]`.
 * (Matches `flattenNestedArray` output for an [N,N,N,N] EngineTensor.)
 *
 * @internal — extracted from `lowering.ts` ricci-tensor arm (AS-1, v0.5.1). Kept
 * deliberately narrow (4-axis source → 2-axis output) to match the v0.5.0 GR
 * curvature pipeline; generalisation deferred to v0.6.0 if Weyl/Kretschmann
 * arrives (see `docs/architecture/COMPONENTS.md` curvature-layer pattern note).
 */
export function contractRiemannJS(
  flatR: ReadonlyArray<number>,
  N: number,
  config: {
    upperAxis: 0 | 1 | 2 | 3;
    lowerAxis: 0 | 1 | 2 | 3;
    outAxes: readonly [number, number];
  },
): number[][] {
  const { upperAxis, lowerAxis, outAxes } = config;
  if (upperAxis === lowerAxis) {
    throw new NumericalBackendError(
      `contractRiemannJS: upperAxis (${upperAxis}) and lowerAxis (${lowerAxis}) must differ`,
    );
  }
  const [outA, outB] = outAxes;
  if (outA === outB) {
    throw new NumericalBackendError(
      `contractRiemannJS: outAxes [${outA},${outB}] must be distinct`,
    );
  }
  if (outA === upperAxis || outA === lowerAxis || outB === upperAxis || outB === lowerAxis) {
    throw new NumericalBackendError(
      `contractRiemannJS: outAxes [${outA},${outB}] must not overlap dummy pair [${upperAxis},${lowerAxis}]`,
    );
  }
  if (flatR.length !== N * N * N * N) {
    throw new NumericalBackendError(
      `contractRiemannJS: flatR length ${flatR.length} != N⁴ = ${N * N * N * N}`,
    );
  }

  // Row-major strides for R[a][b][c][d].
  const N2 = N * N;
  const N3 = N * N * N;
  const strides = [N3, N2, N, 1] as const;
  const strideDummy = strides[upperAxis] + strides[lowerAxis];
  const strideOutA = strides[outA];
  const strideOutB = strides[outB];

  if (N === 4) {
    const strideUpper = strides[upperAxis];
    const strideLower = strides[lowerAxis];
    const dummy1 = strideUpper + strideLower;
    const dummy2 = dummy1 * 2;
    const dummy3 = dummy1 * 3;

    const out4 = [
      [0.0, 0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, 0.0],
    ];

    for (let i = 0; i < 4; i++) {
      const baseI = i * strideOutA;
      const row = out4[i];
      for (let j = 0; j < 4; j++) {
        const baseIJ = baseI + j * strideOutB;
        row[j] = flatR[baseIJ] + flatR[baseIJ + dummy1] + flatR[baseIJ + dummy2] + flatR[baseIJ + dummy3];
      }
    }
    return out4;
  }

  // Bolt: Manual allocation is faster than Array.from
  const out: number[][] = new Array<number[]>(N);
  for (let k = 0; k < N; k++) {
    const row = new Array<number>(N);
    for (let l = 0; l < N; l++) row[l] = 0.0;
    out[k] = row;
  }
  for (let i = 0; i < N; i++) {
    const baseI = i * strideOutA;
    for (let j = 0; j < N; j++) {
      const baseIJ = baseI + j * strideOutB;
      let sum = 0;
      for (let lam = 0; lam < N; lam++) {
        sum += flatR[baseIJ + lam * strideDummy];
      }
      out[i][j] = sum;
    }
  }
  return out;
}


// ===========================================================================
// v0.6.1 Phase 2 Proposal 2 — Arm extractions from lowering.ts
// ===========================================================================
//
// Two FD pipelines (`bianchi-residual` and `weyl-tensor`) were inlined as
// switch arms in `lowering.ts`'s `lowerCurvature` dispatcher. Each was a
// self-contained block of input-resolution + helper-pipeline + result-wrap
// boilerplate; together they accounted for ~125 LOC of lowering.ts. Moving
// them here (a) keeps the dispatcher readable, (b) co-locates the FD
// machinery with its consumers, and (c) makes the per-arm pipeline
// independently unit-testable in the future.

/**
 * Lower a `bianchi-residual` AST node to a 5-rank EngineTensor B_{λμνρσ}.
 *
 * Extracted from `lowering.ts` `lowerCurvature` switch arm in v0.6.1 Phase 2.
 * Wires `inputs.tensors[xCoord.name]` (the coordinate vector) and
 * `inputs.fields[gLower.name]` / `inputs.fields[gInverse.name]` (the metric
 * closures) into the existing `bianchiResidualAt` FD helper.
 *
 * Approach (cyclic ∇R sum):
 *   B_{λμνρσ} = ∇_λ R_{μνρσ} + ∇_μ R_{νλρσ} + ∇_ν R_{λμρσ}
 * Each ∇_λ R_{μνρσ} is computed with the four Christoffel-correction terms.
 *
 * @returns engine.fromNested(B, [N,N,N,N,N])
 */
export function lowerBianchiResidual(
  node: BianchiResidualNode,
  inputs: NumericalInputs,
  engine: TensorEngine,
): EngineTensor {
  const rNode = node.riemann;
  const N = dimensionOf(inputs);
  const x = flattenNestedArray(requireValue(rNode.xCoord.name, inputs), N);
  const { gFn, gInverseFn } = requireMetricClosures('bianchi-residual', inputs, rNode.gLower.name, rNode.gInverse.name);
  const B = bianchiResidualAt(x, gFn, gInverseFn, N, engine);
  return engine.fromNested(B as NestedArray, [N, N, N, N, N]);
}

/**
 * Lower a `weyl-tensor` AST node to a 4-rank EngineTensor C^ρ_{σμν}.
 *
 * Extracted from `lowering.ts` `lowerCurvature` switch arm in v0.6.1 Phase 2.
 * Implements the F-5 Weyl-formula pipeline:
 *
 *   1. Resolve `x`, `g`, `g_inv`, `g(x)`, `g_inv(x)` from `inputs`.
 *   2. Compute Riemann R^ρ_{σμν} and its error bound via `riemannUpperWithBoundAt`.
 *   3. Contract Ricci R_{μν} = R^λ_{μλν} via `contractRiemannJS`.
 *   4. Compute Ricci scalar R = Σ_{μν} g^{μν} R_{μν}.
 *   5. Assemble Weyl via `computeWeylTensor({...})` using the F-5 formula.
 *
 * Naming convention (must match the caller's inputs map):
 *   inputs.tensors[metricName]          — g_{μν} at x
 *   inputs.tensors[metricName + '_inv'] — g^{μν} at x
 *   inputs.tensors['x']                 — coordinate 4-vector
 *   inputs.fields[metricName]           — coordinate-dependent g closure
 *   inputs.fields[metricName + '_inv']  — coordinate-dependent g^{-1} closure
 *
 * @returns engine.fromNested(C, [N,N,N,N])
 */
export function lowerWeylTensor(
  node: WeylTensorNode,
  inputs: NumericalInputs,
  engine: TensorEngine,
): EngineTensor {
  const N = dimensionOf(inputs);
  const metricName = node.metric.name;
  const metricInvName = `${metricName}_inv`;

  const x = flattenNestedArray(requireValue('x', inputs), N);
  const { gFn, gInverseFn } = requireMetricClosures('weyl-tensor', inputs, metricName, metricInvName);

  // Point samples of the covariant metric and its inverse.
  const gFlat = flattenNestedArray(requireValue(metricName, inputs), N * N);
  const gInvFlat = flattenNestedArray(requireValue(metricInvName, inputs), N * N);
  const gMat: number[][] = new Array(N);
  const gInvMat: number[][] = new Array(N);
  for (let i = 0; i < N; i++) {
    gMat[i] = gFlat.slice(i * N, i * N + N);
    gInvMat[i] = gInvFlat.slice(i * N, i * N + N);
  }

  // Riemann, Ricci, the Ricci scalar and Weyl through the bounded pipeline; the lowering
  // returns the value. `weylTensorWithBoundAt` gives the bound to a caller that needs it.
  const C = weylTensorWithBoundAt(x, gFn, gInverseFn, gMat, gInvMat, N, engine).weyl;
  return engine.fromNested(C as NestedArray, [N, N, N, N]);
}

/**
 * Lower a `kretschmann-scalar` node to the scalar K = R_{ρσμν} R^{ρσμν}.
 *
 * Uses the FD Riemann pipeline (`riemannLowerAt`) plus `computeKretschmann`.
 * Naming convention matches {@link lowerWeylTensor}.
 */
export function lowerKretschmannScalar(
  node: KretschmannScalarNode,
  inputs: NumericalInputs,
  engine: TensorEngine,
): EngineTensor {
  const N = dimensionOf(inputs);
  const metricName = node.metric.name;
  const metricInvName = `${metricName}_inv`;

  const x = flattenNestedArray(requireValue('x', inputs), N);
  const { gFn, gInverseFn } = requireMetricClosures('kretschmann-scalar', inputs, metricName, metricInvName);

  const rLower = riemannLowerAt(x, gFn, gInverseFn, N, engine);
  // `flattenNestedArray` has checked the length is N·N, so the flat row-major form is the one
  // `computeKretschmann` reads as a Float64Array; it never was a number[][] here.
  const gInvFlat = flattenNestedArray(requireValue(metricInvName, inputs), N * N);
  const K = computeKretschmann(rLower, Float64Array.from(gInvFlat));
  return engine.fromNested(K, []);
}

// ---------------------------------------------------------------------------
// Error bound of the finite-difference curvature pipeline
// ---------------------------------------------------------------------------

/** The unit roundoff of a double, 2⁻⁵³. */
const ROUND = Number.EPSILON / 2;

/**
 * The rounding of one metric-closure value, in units of `ROUND` times the size of the value.
 * A closure such as `−c²(1 − r_s/r)` rounds its result a few times. The factor 4 covers that.
 */
const METRIC_ROUNDING = 4;

/** The inner step of `makeInnerGradFn`. */
function innerStep(x: number): number {
  return 1e-3 * Math.max(Math.abs(x), 1);
}

/**
 * The error bound of each component of ∂_μ g_{ab} that `makeInnerGradFn` returns.
 *
 * The bound adds two terms. The roundoff term is 1.5·κ·u·max|g_{ab}|/h. The maximum is over
 * the stencil points. u is the unit roundoff. κ is `METRIC_ROUNDING`. The truncation term is
 * |D4(h) − D4(2h)|/7, about two times the Richardson estimate of the error of D4(h). A
 * component that is bit-equal at all six samples gets the bound 0. The difference of the
 * closure, as the closure is evaluated, is then exactly 0.
 *
 * @returns dg[μ][a·N + b], the bound of ∂_μ g_{ab}.
 */
function metricDerivBound(gFn: MetricFn, x: ReadonlyArray<number>, N: number): number[][] {
  const out: number[][] = [];
  for (let mu = 0; mu < N; mu++) {
    const h = innerStep(x[mu]);
    const at = (k: number): number[] => {
      const y = [...x];
      y[mu] = x[mu] + k * h;
      return flattenNA(gFn(y));
    };
    const m4 = at(-4);
    const m2 = at(-2);
    const m1 = at(-1);
    const p1 = at(1);
    const p2 = at(2);
    const p4 = at(4);
    const row: number[] = new Array(N * N);
    for (let i = 0; i < N * N; i++) {
      const v = m4[i];
      if (m2[i] === v && m1[i] === v && p1[i] === v && p2[i] === v && p4[i] === v) {
        row[i] = 0;
        continue;
      }
      const big = Math.max(
        Math.abs(m4[i]), Math.abs(m2[i]), Math.abs(m1[i]), Math.abs(p1[i]), Math.abs(p2[i]), Math.abs(p4[i]),
      );
      const d4h = (-p2[i] + 8 * p1[i] - 8 * m1[i] + m2[i]) / (12 * h);
      const d42h = (-p4[i] + 8 * p2[i] - 8 * m2[i] + m4[i]) / (24 * h);
      row[i] = (1.5 * METRIC_ROUNDING * ROUND * big) / h + Math.abs(d4h - d42h) / 7;
    }
    out.push(row);
  }
  return out;
}

/** The N×N matrix of the absolute values of a metric value. */
function absMatrix(m: NestedArray, N: number): number[][] {
  const flat = flattenNA(m);
  return Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => Math.abs(flat[i * N + j])));
}

/**
 * The error bound of each Christoffel symbol Γ^ρ_{σν} at x, as `christoffelAt` computes it.
 *
 * Γ^ρ_{σν} = ½ Σ_λ g^{ρλ} B_{λσν}, with B_{λσν} = ∂_σ g_{λν} + ∂_ν g_{λσ} − ∂_λ g_{σν} = 2 Γ_{λσν}.
 * The bound is ½ Σ_λ (|g^{ρλ}| δB + δg^{ρλ} |B|), plus the rounding of the sum. δB is the
 * sum of three `metricDerivBound` terms. δg^{ρλ} is the first-order bound of the inverse,
 * Σ |g^{ρa}| κu|g_{ab}| |g^{bλ}|, plus the rounding of g^{ρλ}.
 */
function christoffelBoundAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  gamma: GammaTensor,
  N: number,
): number[][][] {
  const dgB = metricDerivBound(gFn, x, N);
  const gFlat = flattenNA(gFn(x));
  const gA = absMatrix(gFlat, N);
  const giA = absMatrix(gInverseFn(x), N);
  const giErr: number[][] = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, l) => {
      let s = METRIC_ROUNDING * ROUND * giA[r][l];
      for (let a = 0; a < N; a++) {
        for (let b = 0; b < N; b++) s += giA[r][a] * METRIC_ROUNDING * ROUND * gA[a][b] * giA[b][l];
      }
      return s;
    }),
  );
  const out: number[][][] = Array.from({ length: N }, () => Array.from({ length: N }, () => new Array<number>(N).fill(0)));
  for (let rho = 0; rho < N; rho++) {
    for (let sigma = 0; sigma < N; sigma++) {
      for (let nu = 0; nu < N; nu++) {
        let s = 0;
        let size = 0;
        for (let lam = 0; lam < N; lam++) {
          let low = 0;
          for (let p = 0; p < N; p++) low += gFlat[lam * N + p] * gamma[p][sigma][nu];
          const B = 2 * Math.abs(low);
          const dB = dgB[sigma][lam * N + nu] + dgB[nu][lam * N + sigma] + dgB[lam][sigma * N + nu];
          s += giA[rho][lam] * dB + giErr[rho][lam] * B;
          size += giA[rho][lam] * B;
        }
        out[rho][sigma][nu] = 0.5 * s + (N + 3) * ROUND * 0.5 * size;
      }
    }
  }
  return out;
}

/**
 * The Riemann tensor R^ρ_{σμν} at x, and an upper bound of its finite-difference error.
 *
 * The bound is componentwise, in the coordinate units of each component. Compare a component
 * only with its own bound. The bound covers the truncation of both differences, an
 * a-posteriori estimate from the stencil values. The bound covers the roundoff of the metric
 * closure, which both differences amplify by 1/h. The bound covers the rounding of the sums.
 * The bound is an estimate that over-covers, not a proof. A closure that rounds by more than
 * `METRIC_ROUNDING` units can exceed the bound. A metric with a large fifth derivative on the
 * stencil can exceed the bound.
 *
 * The bound is relative to the closure as the closure is evaluated in double. The bound does
 * not include the representation error of the closure. De Sitter at Λ = 1.1e-52 m⁻² and
 * r = 1e3 m gives `1 − Λr²/3 = 1` exactly, so the closure holds no curvature. There the
 * computed value is noise inside its bound, and the value is unresolved.
 *
 * When |R| ≤ bound, the difference does not resolve the value.
 * @internal
 */
export function riemannUpperWithBoundAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  N: number,
  engine: TensorEngine,
  gammaAtX?: number[][][],
): { riemann: number[][][][]; bound: number[][][][] } {
  const gamma = gammaAtX ?? christoffelAt(x, gFn, gInverseFn, N, engine);
  const dG = christoffelBoundAt(x, gFn, gInverseFn, gamma, N);
  const sampled = dGammaSampled(x, gFn, gInverseFn, N, engine, dG);
  const dGamma = sampled.dGamma;
  const b = sampled.bound as number[][][][];
  const riemann = buildRiemann(gamma, dGamma, N);
  const bound = nestedZeros4(N);
  for (let rho = 0; rho < N; rho++) {
    for (let sigma = 0; sigma < N; sigma++) {
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          let e = b[mu][rho][sigma][nu] + b[nu][rho][sigma][mu];
          let size = Math.abs(dGamma[mu][rho][sigma][nu]) + Math.abs(dGamma[nu][rho][sigma][mu]);
          for (let lam = 0; lam < N; lam++) {
            const a1 = Math.abs(gamma[rho][lam][mu]);
            const a2 = Math.abs(gamma[lam][sigma][nu]);
            const a3 = Math.abs(gamma[rho][lam][nu]);
            const a4 = Math.abs(gamma[lam][sigma][mu]);
            e += dG[rho][lam][mu] * a2 + a1 * dG[lam][sigma][nu] + dG[rho][lam][mu] * dG[lam][sigma][nu];
            e += dG[rho][lam][nu] * a4 + a3 * dG[lam][sigma][mu] + dG[rho][lam][nu] * dG[lam][sigma][mu];
            size += a1 * a2 + a3 * a4;
          }
          bound[rho][sigma][mu][nu] = e + (2 * N + 2) * ROUND * size;
        }
      }
    }
  }
  return { riemann, bound };
}

/** T'[a][b][c][d] = Σ M0[a][p] M1[b][q] M2[c][r] M3[d][s] T[p][q][r][s], one index at a time. */
function transform4(T: number[][][][], M: readonly (readonly (readonly number[])[])[], N: number): number[][][][] {
  let cur = T;
  for (let axis = 0; axis < 4; axis++) {
    const m = M[axis];
    const next = nestedZeros4(N);
    const idx = [0, 0, 0, 0];
    for (let a = 0; a < N; a++) {
      for (let b = 0; b < N; b++) {
        for (let c = 0; c < N; c++) {
          for (let d = 0; d < N; d++) {
            idx[0] = a; idx[1] = b; idx[2] = c; idx[3] = d;
            const outIndex = idx[axis];
            let s = 0;
            for (let p = 0; p < N; p++) {
              idx[axis] = p;
              s += m[outIndex][p] * cur[idx[0]][idx[1]][idx[2]][idx[3]];
            }
            next[a][b][c][d] = s;
          }
        }
      }
    }
    cur = next;
  }
  return cur;
}

const absTensor4 = (T: number[][][][]): number[][][][] => T.map((x) => x.map((y) => y.map((z) => z.map(Math.abs))));

/**
 * The Kretschmann scalar K = R^a_{bcd} R_a^{bcd}, and an upper bound of its error, from a
 * Riemann tensor and its componentwise bound (`riemannUpperWithBoundAt`).
 *
 * K is a scalar, so the bound needs no frame. S is R_a^{bcd}. δS is the same transform of δR
 * through |g| and |g⁻¹|. The bound is Σ (|S| δR + |R| δS + δR δS), plus the rounding of
 * the contractions. `resolved` is |K| > bound.
 * @internal
 */
export function kretschmannWithBound(
  riemann: number[][][][],
  bound: number[][][][],
  g: number[][],
  gInv: number[][],
): { value: number; bound: number; resolved: boolean } {
  const N = g.length;
  const gA = g.map((r) => r.map(Math.abs));
  const giA = gInv.map((r) => r.map(Math.abs));
  const S = transform4(riemann, [g, gInv, gInv, gInv], N);
  const Sabs = transform4(absTensor4(riemann), [gA, giA, giA, giA], N);
  const dS = transform4(bound, [gA, giA, giA, giA], N);
  let value = 0;
  let err = 0;
  let size = 0;
  for (let a = 0; a < N; a++) {
    for (let b = 0; b < N; b++) {
      for (let c = 0; c < N; c++) {
        for (let d = 0; d < N; d++) {
          const r = riemann[a][b][c][d];
          const dr = bound[a][b][c][d];
          value += r * S[a][b][c][d];
          err += Sabs[a][b][c][d] * dr + Math.abs(r) * dS[a][b][c][d] + dr * dS[a][b][c][d];
          size += Math.abs(r) * Sabs[a][b][c][d];
        }
      }
    }
  }
  const total = err + (4 * N + 2) * ROUND * size;
  return { value, bound: total, resolved: Math.abs(value) > total };
}

/**
 * The Ricci tensor R_{σν} = R^ρ_{σρν}, the Ricci scalar, and their bounds, from a Riemann
 * tensor and its componentwise bound. Each Ricci component has its own bound, in its own
 * coordinate units.
 * @internal
 */
export function ricciWithBound(
  riemann: number[][][][],
  bound: number[][][][],
  gInv: number[][],
): { ricci: number[][]; ricciBound: number[][]; scalar: number; scalarBound: number } {
  const N = gInv.length;
  const ricci: number[][] = [];
  const ricciBound: number[][] = [];
  for (let s = 0; s < N; s++) {
    const row: number[] = [];
    const brow: number[] = [];
    for (let n = 0; n < N; n++) {
      let v = 0;
      let e = 0;
      let size = 0;
      for (let r = 0; r < N; r++) {
        v += riemann[r][s][r][n];
        e += bound[r][s][r][n];
        size += Math.abs(riemann[r][s][r][n]);
      }
      row.push(v);
      brow.push(e + N * ROUND * size);
    }
    ricci.push(row);
    ricciBound.push(brow);
  }
  let scalar = 0;
  let scalarBound = 0;
  let size = 0;
  for (let a = 0; a < N; a++) {
    for (let b = 0; b < N; b++) {
      scalar += gInv[a][b] * ricci[a][b];
      scalarBound += Math.abs(gInv[a][b]) * ricciBound[a][b];
      size += Math.abs(gInv[a][b] * ricci[a][b]);
    }
  }
  return { ricci, ricciBound, scalar, scalarBound: scalarBound + N * N * ROUND * size };
}

/**
 * The Weyl tensor C^ρ_{σμν} at x, and a componentwise bound, from the bounded Riemann tensor.
 *
 * C = R − ½(δ^ρ_μ R_{σν} − δ^ρ_ν R_{σμ} − g_{σμ} R^ρ_ν + g_{σν} R^ρ_μ) + (R/6)(δ^ρ_μ g_{σν} − δ^ρ_ν g_{σμ}).
 * The bound is δR plus the same terms, with each factor in absolute value and each curvature
 * replaced by its bound. `lowerWeylTensor` calls this function and returns the value.
 * @internal
 */
export function weylTensorWithBoundAt(
  x: ReadonlyArray<number>,
  gFn: MetricFn,
  gInverseFn: MetricFn,
  g: number[][],
  gInv: number[][],
  N: number,
  engine: TensorEngine,
): { weyl: number[][][][]; bound: number[][][][] } {
  const { riemann, bound: dR } = riemannUpperWithBoundAt(x, gFn, gInverseFn, N, engine);
  const flatRup = flattenNestedArray(riemann as unknown as NestedArray, N * N * N * N);
  const Ric = contractRiemannJS(flatRup, N, { upperAxis: 0, lowerAxis: 2, outAxes: [1, 3] });
  let Rscalar = 0;
  for (let mu = 0; mu < N; mu++) {
    for (let nu = 0; nu < N; nu++) Rscalar += gInv[mu][nu] * Ric[mu][nu];
  }
  const weyl = computeWeylTensor({ riemann, ricci: Ric, ricciScalar: Rscalar, metric: g, metricInverse: gInv });
  const { ricciBound: dRic, scalarBound: dRs } = ricciWithBound(riemann, dR, gInv);
  const gA = g.map((r) => r.map(Math.abs));
  const giA = gInv.map((r) => r.map(Math.abs));
  const dRicUp: number[][] = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, n) => {
      let s = 0;
      for (let a = 0; a < N; a++) s += giA[r][a] * dRic[a][n];
      return s;
    }),
  );
  const bound = nestedZeros4(N);
  for (let rho = 0; rho < N; rho++) {
    for (let sigma = 0; sigma < N; sigma++) {
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          const dm = rho === mu ? 1 : 0;
          const dn = rho === nu ? 1 : 0;
          const lin = 0.5 * (
            dm * dRic[sigma][nu] + dn * dRic[sigma][mu] + gA[sigma][mu] * dRicUp[rho][nu] + gA[sigma][nu] * dRicUp[rho][mu]
          );
          const sc = (dRs / 6) * (dm * gA[sigma][nu] + dn * gA[sigma][mu]);
          const size = Math.abs(riemann[rho][sigma][mu][nu]) + Math.abs(weyl[rho][sigma][mu][nu]);
          bound[rho][sigma][mu][nu] = dR[rho][sigma][mu][nu] + lin + sc + 16 * ROUND * size;
        }
      }
    }
  }
  return { weyl, bound };
}
