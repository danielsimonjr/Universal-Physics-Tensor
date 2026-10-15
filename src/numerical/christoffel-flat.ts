/**
 * Flat-array Christoffel evaluator (v0.6.0 Phase 2, Task 2.8 — BR-2 BREAKING).
 *
 * Returns Float64Array(64) instead of nested number[4][4][4]. Layout
 * locked from Task 2.0 profiling: λ-major encoding (16λ + 4μ + ν).
 *
 * Formulas verified against the authoritative fixture at
 * tests/fixtures/schwarzschild.ts:10-18 (Carroll Ch. 5 / Hartle Ch. 9;
 * −,+,+,+ signature). Schwarzschild has 9 non-zero independent Christoffel
 * components, related by symmetry Γ^λ_{μν} = Γ^λ_{νμ} for 13 non-zero
 * array entries out of 64.
 *
 * Nonzero independent components:
 *   Γ^t_{tr} = Γ^t_{rt} = r_s / (2·r·(r − r_s))
 *   Γ^r_{tt} = c² · r_s · (r − r_s) / (2·r³)
 *   Γ^r_{rr} = -r_s / (2·r·(r − r_s))
 *   Γ^r_{θθ} = -(r − r_s)
 *   Γ^r_{φφ} = -(r − r_s) · sin²θ
 *   Γ^θ_{rθ} = Γ^θ_{θr} = 1/r
 *   Γ^θ_{φφ} = -sinθ · cosθ
 *   Γ^φ_{rφ} = Γ^φ_{φr} = 1/r
 *   Γ^φ_{θφ} = Γ^φ_{φθ} = cosθ / sinθ
 *
 * where r_s = 2GM/c². All other entries are zero. Float64Array zero-initialises
 * by default, so we write only the 13 non-zero slots.
 *
 * @module numerical/christoffel-flat
 * @public
 */

// Use canonical SI constants per v0.5.1 PC-1 (do NOT inline truncated literals):
import { C_SI } from '../core/constants.js';
import { schwarzschildRadius } from './schwarzschild.js';

/**
 * Encodes a Christoffel index triple (λ, μ, ν) into a flat array offset.
 *
 * Layout: λ-major — `16·λ + 4·μ + ν`.
 * Locked from Task 2.0 profiling (dual-condition gate; λ-major is default).
 */
export function encodeChristoffelIndex(lambda: number, mu: number, nu: number): number {
  return 16 * lambda + 4 * mu + nu;
}

/**
 * Returns a Christoffel-symbol closure for the Schwarzschild metric at a
 * given gravitational mass M (SI, kg).
 *
 * The returned closure maps a coordinate 4-vector x = [t, r, θ, φ] to a
 * Float64Array of length 64 containing Γ^λ_{μν} values in λ-major order.
 * Access element (λ, μ, ν) via `encodeChristoffelIndex(λ, μ, ν)`.
 *
 * This is the BR-2 breaking-change replacement for the nested `number[][][]`
 * returned by `schwarzschildChristoffelFn`. Consumer migration lands in Task 2.9.
 *
 * Scratch-buffer reuse (perf): the returned closure accepts an OPTIONAL
 * `out` Float64Array(64). When provided it is filled and returned (no
 * allocation) — the hot geodesic loop passes a single reused buffer to avoid
 * ~160k Float64Array(64) allocations per integration. Only the 13 nonzero
 * Schwarzschild slots are written; the other 51 are always zero, so a buffer
 * reused ONLY by this closure (or a fresh zero buffer) stays correct without
 * re-zeroing. When `out` is omitted a fresh array is allocated — the original
 * (and default) behavior, unchanged for external callers that retain results.
 */
export function christoffelFnFlat(
  M: number,
): (x: [number, number, number, number], out?: Float64Array) => Float64Array {
  return (x, out) => {
    const [_t, r, theta, _phi] = x;
    const r_s = schwarzschildRadius(M);
    const arr = out ?? new Float64Array(64); // 64 zeros by default when fresh
    const dr_factor = r - r_s;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    const Gt_tr       = r_s / (2 * r * dr_factor);
    const Gr_tt       = (C_SI * C_SI * r_s * dr_factor) / (2 * r * r * r);
    const Gr_rr       = -r_s / (2 * r * dr_factor);
    const Gr_thth     = -dr_factor;
    const Gr_phiphi   = -dr_factor * sinTheta * sinTheta;
    const Gth_rth     = 1 / r;
    const Gth_phiphi  = -sinTheta * cosTheta;
    const Gphi_rphi   = 1 / r;
    const Gphi_thphi  = cosTheta / sinTheta;

    // Index encoding: 16*lambda + 4*mu + nu (λ-major)
    arr[16*0 + 4*0 + 1] = Gt_tr;       // Γ^t_{tr}
    arr[16*0 + 4*1 + 0] = Gt_tr;       // Γ^t_{rt} (symmetric)
    arr[16*1 + 4*0 + 0] = Gr_tt;       // Γ^r_{tt}
    arr[16*1 + 4*1 + 1] = Gr_rr;       // Γ^r_{rr}
    arr[16*1 + 4*2 + 2] = Gr_thth;     // Γ^r_{θθ}
    arr[16*1 + 4*3 + 3] = Gr_phiphi;   // Γ^r_{φφ}
    arr[16*2 + 4*1 + 2] = Gth_rth;     // Γ^θ_{rθ}
    arr[16*2 + 4*2 + 1] = Gth_rth;     // Γ^θ_{θr}
    arr[16*2 + 4*3 + 3] = Gth_phiphi;  // Γ^θ_{φφ}
    arr[16*3 + 4*1 + 3] = Gphi_rphi;   // Γ^φ_{rφ}
    arr[16*3 + 4*3 + 1] = Gphi_rphi;   // Γ^φ_{φr}
    arr[16*3 + 4*2 + 3] = Gphi_thphi;  // Γ^φ_{θφ}
    arr[16*3 + 4*3 + 2] = Gphi_thphi;  // Γ^φ_{φθ}

    return arr;
  };
}
