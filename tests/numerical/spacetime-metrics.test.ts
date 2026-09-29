/**
 * Closed forms for the curvature command, and the finite-difference tensors
 * against those forms.
 */
import { describe, expect, it } from 'vitest';
import { C_SI, G_SI } from '../../src/core/constants.js';
import {
  curvatureReport,
  flrwRicciScalar,
  friedmannSides,
  kerrChristoffelFdGap,
  kerrEquatorialCircular,
  kerrGeodesic,
  kerrIscoRadius,
  kerrKretschmann,
  kerrPhotonRadius,
  kerrSphericalPhoton,
  kerrSphericalTimelike,
  kerrTurningPointOrbit,
  schwarzschildCircularOrbit,
  schwarzschildGeodesic,
  schwarzschildKretschmann,
} from '../../src/numerical/spacetime-metrics.js';

const rel = (got: number, want: number): number => Math.abs(got - want) / Math.max(Math.abs(want), 1e-30);

describe('closed forms', () => {
  it('Schwarzschild Kretschmann is 48 G² M² / (c⁴ r⁶)', () => {
    const M = 2;
    const r = 5;
    expect(schwarzschildKretschmann(M, r, 3, 7)).toBeCloseTo((48 * 49 * 4) / (81 * r ** 6), 12);
  });

  it('Kerr Kretschmann at a = 0 is the Schwarzschild value in geometrized units', () => {
    expect(kerrKretschmann(3, 10, 0, 1)).toBeCloseTo(48 * 9 / 1e6, 12);
  });

  it('flat dust Friedmann holds, and a curvature term moves the right-hand side', () => {
    const flat = friedmannSides({ t: 2, a0: 1, t0: 1, n: 2 / 3, k: 0, r: 0.3, rho: 0, lambda: 0 });
    const rho = (3 * flat.H2) / (8 * Math.PI * G_SI);
    const dust = friedmannSides({ t: 2, a0: 1, t0: 1, n: 2 / 3, k: 0, r: 0.3, rho, lambda: 0 });
    expect(rel(dust.H2, dust.rhs)).toBeLessThan(1e-12);
    const curved = friedmannSides({ t: 2, a0: 1, t0: 1, n: 2 / 3, k: 1, r: 0.3, rho, lambda: 0 });
    expect(curved.rhs).toBeLessThan(curved.H2);
    const a2 = (2 / 1) ** (4 / 3);
    expect(rel(curved.H2 - curved.rhs, (C_SI * C_SI) / a2)).toBeLessThan(1e-9);
  });
});

describe('finite-difference curvature', () => {
  it('Minkowski is flat', () => {
    const r = curvatureReport('minkowski');
    expect(Math.abs(r.ricciScalar)).toBeLessThan(1e-8);
    expect(Math.abs(r.kretschmann)).toBeLessThan(1e-6);
    expect(r.christoffel).toEqual([]);
  });

  it('Schwarzschild Kretschmann matches 48 G² M² / (c⁴ r⁶) and Ricci vanishes', () => {
    const r = curvatureReport('schwarzschild', ['M=1.989e30', 'r=1e8']);
    const want = r.closedForm.kretschmann!;
    expect(rel(r.kretschmann, want)).toBeLessThan(1e-4);
    expect(Math.abs(r.ricciScalar)).toBeLessThan(1e-12);
    expect(r.signature).toBe('(-,+,+,+)');
    expect(r.signatureNote).toMatch(/canonical Einstein-equation metric node/);
  });

  it('flat-dust FLRW Ricci scalar is 3 H²/c² and Friedmann holds', () => {
    const r = curvatureReport('flrw', ['k=0', 't=2']);
    expect(rel(r.ricciScalar, r.closedForm.ricciScalar!)).toBeLessThan(1e-2);
    expect(rel(r.closedForm.ricciScalar!, flrwRicciScalar(2, 1, 1, 2 / 3, 0, 0.3))).toBeLessThan(1e-12);
    expect(rel(r.closedForm.H2!, r.closedForm.friedmannRhs!)).toBeLessThan(1e-9);
  });

  it('FLRW with k ≠ 0 keeps the curvature term in the Friedmann right-hand side', () => {
    const r = curvatureReport('flrw', ['k=1', 't=2', 'rho=0', 'Lambda=0']);
    expect(r.closedForm.friedmannRhs).not.toBe(r.closedForm.H2);
    expect(r.notes.join(' ')).toMatch(/k c²\/a²/);
  });

  it('Kerr Kretschmann matches the closed form, and a = 0 matches Schwarzschild', () => {
    const spin = curvatureReport('kerr', ['M=1.989e30', 'a=1e3', 'r=1e8', 'theta=1.2']);
    expect(rel(spin.kretschmann, spin.closedForm.kretschmann!)).toBeLessThan(5e-3);
    const round = curvatureReport('kerr', ['M=1.989e30', 'a=0', 'r=1e8']);
    const Mgeom = (G_SI * 1.989e30) / (C_SI * C_SI);
    expect(rel(round.closedForm.kretschmann!, 48 * Mgeom * Mgeom / 1e8 ** 6)).toBeLessThan(1e-9);
    expect(rel(round.kretschmann, round.closedForm.kretschmann!)).toBeLessThan(5e-3);
  });
});

describe('Schwarzschild circular orbit', () => {
  it('stays at its radius for a short arc', () => {
    const o = schwarzschildCircularOrbit({ fraction: 0.01 });
    expect(Math.abs(o.rEnd - o.r0) / o.r0).toBeLessThan(1e-6);
    expect(o.phiAdvance).toBeGreaterThan(0);
  });
});

describe('Kerr geodesics', () => {
  it('ISCO radii are 6M at a = 0, and M and 9M at a = M', () => {
    const zero = kerrIscoRadius(0);
    expect(zero.prograde).toBeCloseTo(6, 12);
    expect(zero.retrograde).toBeCloseTo(6, 12);
    const ext = kerrIscoRadius(1);
    expect(ext.prograde).toBeCloseTo(1, 12);
    expect(ext.retrograde).toBeCloseTo(9, 12);
  });

  it('the photon orbit is 3M at a = 0 and 1M prograde at a = M', () => {
    expect(kerrPhotonRadius(0).prograde).toBeCloseTo(3, 12);
    expect(kerrPhotonRadius(0).retrograde).toBeCloseTo(3, 12);
    expect(kerrPhotonRadius(1).prograde).toBeCloseTo(1, 12);
    expect(kerrPhotonRadius(1).retrograde).toBeCloseTo(4, 12);
  });

  it('an equatorial circular orbit keeps r, E and L, and holds Q at 0', () => {
    const o = kerrEquatorialCircular({ aOverM: 0.5, rOverM: 10, fraction: 0.01, steps: 40 });
    expect(Math.abs(o.rEnd - o.r0) / o.r0).toBeLessThan(1e-3);
    expect(Math.abs(o.EEnd - o.E0) / Math.abs(o.E0)).toBeLessThan(1e-3);
    expect(Math.abs(o.LEnd - o.L0) / Math.abs(o.L0)).toBeLessThan(1e-3);
    expect(Math.abs(o.Q0)).toBeLessThan(1e-8);
    expect(Math.abs(o.QEnd)).toBeLessThan(1e-6);
    expect(Math.abs(o.norm0 + 1)).toBeLessThan(1e-12);
    expect(Math.abs(o.normEnd - o.norm0)).toBeLessThan(1e-9);
    expect(Math.abs(o.phiAdvance)).toBeGreaterThan(0);
  });

  it('analytic Kerr Christoffel symbols match a finite difference of the metric', () => {
    expect(kerrChristoffelFdGap(1, 0.6, 8, 1.1)).toBeLessThan(1e-5);
    expect(kerrChristoffelFdGap(1, 0, 10, Math.PI / 2)).toBeLessThan(1e-5);
  });

  it('a timelike spherical orbit with Q > 0 keeps r, E, L, Q and the 4-velocity norm', () => {
    const spin = kerrSphericalTimelike({ aOverM: 0.5, rOverM: 10, Q: 0.8 });
    expect(Math.abs(spin.R)).toBeLessThan(1e-8);
    expect(Math.abs(spin.Rp)).toBeLessThan(1e-8);
    const o = kerrGeodesic({
      aOverM: 0.5,
      rOverM: 10,
      theta: Math.PI / 2,
      E: spin.E,
      L: spin.L,
      Q: 0.8,
      mu2: 1,
      fraction: 0.02,
      steps: 80,
    });
    expect(Math.abs(o.rEnd - o.r0) / o.r0).toBeLessThan(1e-9);
    expect(rel(o.EEnd, o.E0)).toBeLessThan(1e-9);
    expect(rel(o.LEnd, o.L0)).toBeLessThan(1e-9);
    expect(rel(o.QEnd, o.Q0)).toBeLessThan(1e-9);
    expect(Math.abs(o.normEnd - o.norm0)).toBeLessThan(1e-9);
    expect(Math.abs(o.norm0 + 1)).toBeLessThan(1e-12);
    expect(Math.abs(o.thetaEnd - Math.PI / 2)).toBeGreaterThan(1e-3);
    const mino = minoProperTime({
      a: 0.5,
      r: 10,
      theta: Math.PI / 2,
      E: spin.E,
      L: spin.L,
      Q: 0.8,
      mu2: 1,
      signTheta: 1,
      fraction: 0.02,
      steps: 80,
    });
    expect(rel(o.thetaEnd, mino.theta)).toBeLessThan(1e-6);
    expect(rel(o.phiAdvance, mino.phi)).toBeLessThan(1e-6);
  });

  it('a shifted axial angular momentum moves r, so the constant-r check can fail', () => {
    const spin = kerrSphericalTimelike({ aOverM: 0.5, rOverM: 10, Q: 0.8 });
    const moved = kerrGeodesic({
      aOverM: 0.5,
      rOverM: 10,
      E: spin.E,
      L: spin.L * 1.05,
      Q: 0.8,
      fraction: 0.02,
      steps: 80,
      allowOffShell: true,
    });
    expect(Math.abs(moved.rEnd - moved.r0) / moved.r0).toBeGreaterThan(1e-4);
  });

  it('an inclined turning-point orbit keeps the constants and leaves its starting θ', () => {
    const theta = 1.2;
    const turn = kerrTurningPointOrbit({ aOverM: 0.4, rOverM: 12, theta });
    const o = kerrGeodesic({
      aOverM: 0.4,
      rOverM: 12,
      theta,
      E: turn.E,
      L: turn.L,
      Q: turn.Q,
      fraction: 0.03,
      steps: 120,
    });
    expect(Math.abs(o.rEnd - o.r0) / o.r0).toBeLessThan(1e-6);
    expect(rel(o.EEnd, o.E0)).toBeLessThan(1e-9);
    expect(rel(o.LEnd, o.L0)).toBeLessThan(1e-9);
    expect(rel(o.QEnd, o.Q0)).toBeLessThan(1e-8);
    expect(Math.abs(o.norm0 + 1)).toBeLessThan(1e-12);
    expect(Math.abs(o.normEnd - o.norm0)).toBeLessThan(1e-9);
    expect(o.thetaEnd).toBeGreaterThan(theta + 1e-3);
  });

  it('a spherical photon orbit keeps r, E, L, Q and a null norm, and θ moves', () => {
    const a = 0.8;
    const radii = kerrPhotonRadius(a);
    const r = 0.5 * (radii.prograde + radii.retrograde);
    const ph = kerrSphericalPhoton({ aOverM: a, rOverM: r });
    const Phi = -(r ** 3 - 3 * r * r + a * a * r + a * a) / (a * (r - 1));
    const qOverE2 = -(r ** 3 * (r ** 3 - 6 * r * r + 9 * r - 4 * a * a)) / (a * a * (r - 1) ** 2);
    expect(ph.L).toBeCloseTo(Phi, 12);
    expect(ph.Q).toBeCloseTo(qOverE2, 10);
    expect(ph.Q).toBeGreaterThan(0);
    const o = kerrGeodesic({
      aOverM: a,
      rOverM: r,
      theta: Math.PI / 2,
      E: ph.E,
      L: ph.L,
      Q: ph.Q,
      mu2: 0,
      fraction: 0.005,
      steps: 200,
    });
    expect(Math.abs(o.rEnd - r) / r).toBeLessThan(1e-8);
    expect(rel(o.EEnd, o.E0)).toBeLessThan(1e-9);
    expect(rel(o.LEnd, o.L0)).toBeLessThan(1e-9);
    expect(rel(o.QEnd, o.Q0)).toBeLessThan(1e-9);
    expect(Math.abs(o.norm0)).toBeLessThan(1e-12);
    expect(Math.abs(o.normEnd)).toBeLessThan(1e-8);
    expect(Math.abs(o.thetaEnd - Math.PI / 2)).toBeGreaterThan(1e-3);
  });

  it('a = 0 matches a Schwarzschild geodesic and the circular closed form', () => {
    const r = 10;
    const K = (r * r) / (r - 3);
    const Q = 1;
    const E = (1 - 2 / r) / Math.sqrt(1 - 3 / r);
    const L = Math.sqrt(K - Q);
    const solved = kerrSphericalTimelike({ aOverM: 0, rOverM: r, Q });
    expect(rel(solved.E, E)).toBeLessThan(1e-12);
    expect(rel(solved.L * solved.L + Q, K)).toBeLessThan(1e-12);
    const shared = { rOverM: r, theta: Math.PI / 2, E, L, Q, fraction: 0.02, steps: 160 };
    const kerr = kerrGeodesic({ aOverM: 0, ...shared, mu2: 1 });
    const schw = schwarzschildGeodesic(shared);
    expect(rel(kerr.rEnd, schw.rEnd)).toBeLessThan(1e-8);
    expect(rel(kerr.thetaEnd, schw.thetaEnd)).toBeLessThan(1e-8);
    expect(rel(kerr.phiAdvance, schw.phiAdvance)).toBeLessThan(1e-8);
    expect(Math.abs(kerr.normEnd + 1)).toBeLessThan(1e-9);
    const eq = kerrEquatorialCircular({ aOverM: 0, rOverM: r, fraction: 0.01, steps: 80 });
    const circ = schwarzschildCircularOrbit({ M: 1, r, c: 1, G: 1, fraction: 0.01 });
    expect(Math.abs(eq.rEnd - r) / r).toBeLessThan(1e-8);
    expect(Math.abs(circ.rEnd - r) / r).toBeLessThan(1e-8);
    expect(rel(eq.phiAdvance, circ.phiAdvance)).toBeLessThan(1e-4);
    const isco = kerrIscoRadius(0).prograde;
    const atIsco = kerrSphericalTimelike({ aOverM: 0, rOverM: isco, Q: 0 });
    expect(Number.isFinite(atIsco.E)).toBe(true);
    expect(Math.abs(atIsco.R)).toBeLessThan(1e-8);
  });
});

/** First-order Carter motion in proper time, independent of the Christoffel integrator. */
function minoProperTime(opts: {
  readonly a: number;
  readonly r: number;
  readonly theta: number;
  readonly E: number;
  readonly L: number;
  readonly Q: number;
  readonly mu2: number;
  readonly signTheta: number;
  readonly fraction: number;
  readonly steps: number;
}): { readonly theta: number; readonly phi: number } {
  const M = 1;
  const vel = (r: number, th: number) => {
    const c = Math.cos(th);
    const s = Math.sin(th);
    const Sigma = r * r + opts.a * opts.a * c * c;
    const Delta = r * r - 2 * M * r + opts.a * opts.a;
    const P = opts.E * (r * r + opts.a * opts.a) - opts.a * opts.L;
    const R = P * P - Delta * (opts.mu2 * r * r + (opts.L - opts.a * opts.E) ** 2 + opts.Q);
    const Theta = opts.Q - c * c * (opts.a * opts.a * (opts.mu2 - opts.E * opts.E) + (opts.L * opts.L) / (s * s));
    return {
      ut: ((r * r + opts.a * opts.a) * P) / Delta / Sigma - (opts.a * (opts.a * opts.E * s * s - opts.L)) / Sigma,
      ur: Math.sqrt(Math.max(R, 0)) / Sigma,
      uth: (opts.signTheta * Math.sqrt(Math.max(Theta, 0))) / Sigma,
      up:
        (opts.a * P) / Delta / Sigma +
        opts.L / (s * s * Sigma) -
        (opts.a * opts.E) / Sigma,
    };
  };
  const u0 = vel(opts.r, opts.theta);
  const angular = Math.max(Math.abs(u0.up), Math.abs(u0.uth), 1e-12);
  const h = ((2 * Math.PI) / angular) * opts.fraction / opts.steps;
  let r = opts.r;
  let th = opts.theta;
  let phi = 0;
  for (let n = 0; n < opts.steps; n++) {
    const k1 = vel(r, th);
    const k2 = vel(r + (h / 2) * k1.ur, th + (h / 2) * k1.uth);
    const k3 = vel(r + (h / 2) * k2.ur, th + (h / 2) * k2.uth);
    const k4 = vel(r + h * k3.ur, th + h * k3.uth);
    r += (h / 6) * (k1.ur + 2 * k2.ur + 2 * k3.ur + k4.ur);
    th += (h / 6) * (k1.uth + 2 * k2.uth + 2 * k3.uth + k4.uth);
    phi += (h / 6) * (k1.up + 2 * k2.up + 2 * k3.up + k4.up);
  }
  return { theta: th, phi };
}
