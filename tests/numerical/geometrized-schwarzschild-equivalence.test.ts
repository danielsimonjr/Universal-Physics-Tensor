/**
 * G-9 increment 2 — SI ↔ geometrized equivalence at the boundary.
 *
 * Demonstrates the geometrized GR path is physically equivalent to the SI path,
 * with the conversion adapter exercised where it has teeth: the MASS input.
 *
 *   M_geom = toGeometrized(M_kg, MASS) = G·M_kg/c²   (factor G/c², non-trivial)
 *
 * The Kretschmann scalar K is dimension L⁻⁴ (pure length), so converting K's
 * OUTPUT would be the identity (geometrizedFactor(L⁻⁴)=G⁰c⁰=1) — a no-op, which
 * is why we drive the adapter through the mass, not the scalar. The closed forms
 * then coincide exactly:  48 G²M²/(c⁴r⁶) = 48 (GM/c²)²/r⁶ = 48 M_geom²/r⁶.
 */
import { describe, it, expect } from 'vitest';
import { computeKretschmann } from '../../src/numerical/kretschmann.js';
import { riemannLowerAt } from '../../src/numerical/curvature-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { toGeometrized, geometrizedFactor } from '../../src/numerical/geometrized.js';
import { MASS } from '../../src/dimensional/types.js';
import { C_SI, G_SI } from '../../src/core/constants.js';
import { schwarzschildRs, schwarzschildGFn, schwarzschildGInverseFn } from '../fixtures/schwarzschild.js';
import {
  schwarzschildGeometrizedRs,
  schwarzschildGeometrizedGFn,
  schwarzschildGeometrizedGInverseFn,
  schwarzschildGeometrizedKretschmann,
} from '../fixtures/schwarzschild-geometrized.js';

const M_SUN = 1.989e30; // kg
const N = 4;
const engine = new MathTSEngine();

// The adapter does the c/G work on the mass: M_geom = G·M_kg/c² (a length).
const M_geom = toGeometrized(M_SUN, MASS);

describe('geometrized adapter — the mass input is where the factor has teeth', () => {
  it('toGeometrized(M_sun, MASS) = G·M_sun/c² (geometrizedFactor(MASS)=G/c²)', () => {
    expect(geometrizedFactor(MASS)).toBeCloseTo(G_SI / (C_SI * C_SI), 30);
    expect(M_geom).toBeCloseTo((G_SI * M_SUN) / (C_SI * C_SI), 6);
    // ~1477 m for the Sun (the standard NR value).
    expect(M_geom).toBeGreaterThan(1476);
    expect(M_geom).toBeLessThan(1478);
  });

  it('the geometrized r_s = 2·M_geom equals the SI r_s = 2GM/c² (same physical metres)', () => {
    expect(schwarzschildGeometrizedRs(M_geom)).toBeCloseTo(schwarzschildRs(M_SUN), 6);
  });
});

describe('geometrized Schwarzschild fixture — validates on its own closed form', () => {
  const gFn = schwarzschildGeometrizedGFn(M_geom);
  const gInvFn = schwarzschildGeometrizedGInverseFn(M_geom);
  const r_s = schwarzschildGeometrizedRs(M_geom);
  const radii = [2, 3, 5, 10, 50].map((k) => k * r_s);

  // Measure-then-lock (4th-order FD, M_geom ≈ 1477 m): observed relErr
  //   k=2: 1.08e-10  k=3: 1.40e-9  k=5: 6.27e-10  k=10: 1.25e-9  k=50: 4.06e-7 ← max
  // The far-field floor (k=50) is ~14× the SI fixture's (2.95e-8) because the
  // dimensionless g_tt = −f ≈ −1 here scales the FD step differently than the
  // SI chart's g_tt = −f·c² ≈ −9e16 — the FD floor is chart-dependent (the
  // RELATIVE error stays small either way). TOL = ~2.5 × max_observed.
  it.each(radii)('K_numerical ≈ 48 M_geom²/r⁶ at r=%d m', (r) => {
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
    const rLower = riemannLowerAt(x, gFn, gInvFn, N, engine);
    const K_num = computeKretschmann(rLower, gInvFn(x));
    const K_closed = schwarzschildGeometrizedKretschmann(M_geom, r);
    expect(Math.abs(K_num / K_closed - 1)).toBeLessThan(1e-6);
  });
});

describe('SI ↔ geometrized equivalence — same K at matched (r, θ)', () => {
  const gFnSI = schwarzschildGFn(M_SUN);
  const gInvFnSI = schwarzschildGInverseFn(M_SUN);
  const gFnGeo = schwarzschildGeometrizedGFn(M_geom);
  const gInvFnGeo = schwarzschildGeometrizedGInverseFn(M_geom);
  const r_s = schwarzschildRs(M_SUN); // identical to the geometrized r_s (asserted above)
  const radii = [3, 5, 10].map((k) => k * r_s);

  it.each(radii)('K_SI ≈ K_geom through the full pipeline at r=%d m', (r) => {
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];

    const K_si = computeKretschmann(riemannLowerAt(x, gFnSI, gInvFnSI, N, engine), gInvFnSI(x));
    const K_geo = computeKretschmann(riemannLowerAt(x, gFnGeo, gInvFnGeo, N, engine), gInvFnGeo(x));

    // K is L⁻⁴ (factor 1) — geometrized and SI K are the SAME number, not a
    // unit-converted one. The two charts (x⁰=ct vs x⁰=t) differ by a constant
    // single-axis rescale that leaves the invariant scalar K untouched.
    expect(Math.abs(K_geo / K_si - 1)).toBeLessThan(1e-6);
  });

  it('the closed forms coincide exactly: 48 G²M²/(c⁴r⁶) = 48 M_geom²/r⁶', () => {
    const r = 7 * schwarzschildRs(M_SUN);
    const K_si_closed = (48 * G_SI * G_SI * M_SUN * M_SUN) / (Math.pow(C_SI, 4) * Math.pow(r, 6));
    const K_geo_closed = schwarzschildGeometrizedKretschmann(M_geom, r);
    expect(K_geo_closed).toBeCloseTo(K_si_closed, 30);
  });
});
