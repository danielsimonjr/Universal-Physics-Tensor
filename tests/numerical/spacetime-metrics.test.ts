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
  kerrKretschmann,
  schwarzschildCircularOrbit,
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
    expect(r.signatureNote).toMatch(/\(\+,-,-,-\)/);
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
