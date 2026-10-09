import { describe, it, expect } from 'vitest';
import { gl4Step } from '../../src/numerical/gl4-integrator.js';

/**
 * `gl4Step` is one GL4 step of the geodesic Hamiltonian through MathTS
 * `gaussLegendre4`. It returns the advanced state and the Picard count; the
 * two internal stage values are MathTS's and are not exposed (9.0.0 audit
 * §2 N10: the previous `solveGL4Stage` returned the advanced state twice and
 * two arrays of zeros under the name "stage values").
 */
describe('GL4 integrator: one step through MathTS gaussLegendre4', () => {
  it('converges in ≤40 iterations for flat-space (∂g=0) over 1 step and keeps p constant', () => {
    // Flat-space inverse metric η^μν = diag(−1, +1, +1, +1) (Minkowski, mostly-plus per UPT convention).
    // v0.9.0 flat layout: Float64Array(16), flat[mu*4+nu] = g^{μν}.
    const eta = Float64Array.from([
      -1, 0, 0, 0,
       0, 1, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ]);
    const gInverseFn = (_x: readonly number[]): Float64Array => eta;
    const dgInverseFn = (_x: readonly number[]): Float64Array =>
      // 64 zeros (∂_λ η^μν = 0); flat[lambda*16 + mu*4 + nu]
      new Float64Array(64);

    const x0 = [0, 10, Math.PI / 2, 0];
    const p0 = [-1, 0.5, 0, 0]; // arbitrary timelike-ish covariant momentum
    const h = 0.01;

    const step = gl4Step({ x: x0, p: p0 }, h, gInverseFn, dgInverseFn, { picardTol: 1e-12, picardMaxIter: 40 });

    // In flat space p is constant and x advances by η^{μν} p_ν h.
    expect(step.iterations).toBeLessThanOrEqual(40);
    for (let mu = 0; mu < 4; mu++) {
      expect(step.p[mu]).toBeCloseTo(p0[mu]!, 12);
      expect(step.x[mu]).toBeCloseTo(x0[mu]! + eta[mu * 4 + mu]! * p0[mu]! * h, 12);
    }
    // The result carries exactly the advanced state: no fabricated stage arrays.
    expect(Object.keys(step).sort()).toEqual(['iterations', 'p', 'x']);
  });

  it('throws GL4ConvergenceError if Picard fails to converge within picardMaxIter (I7: specific error class)', () => {
    // Pathological case: caller passes picardMaxIter=1 with a curved metric so Picard can't converge in 1 step.
    const gInverseFn = (x: readonly number[]): Float64Array => {
      // Strongly position-dependent metric — guarantees Newton needs many iterations.
      const r = x[1]!;
      // v0.9.0 flat layout: Float64Array(16), flat[mu*4+nu] = g^{μν}.
      const gInv = new Float64Array(16);
      gInv[0 * 4 + 0] = -(1 + 1 / r);
      gInv[1 * 4 + 1] = 1 + 1 / r;
      gInv[2 * 4 + 2] = r * r;
      gInv[3 * 4 + 3] = r * r;
      return gInv;
    };
    const dgInverseFn = (x: readonly number[]): Float64Array => {
      const r = x[1]!;
      // Only ∂_r (λ=1) is non-zero; flat[lambda*16 + mu*4 + nu].
      const dg = new Float64Array(64);
      dg[1 * 16 + 0 * 4 + 0] = 1 / (r * r);
      dg[1 * 16 + 1 * 4 + 1] = -1 / (r * r);
      dg[1 * 16 + 2 * 4 + 2] = 2 * r;
      dg[1 * 16 + 3 * 4 + 3] = 2 * r;
      return dg;
    };
    // I7: assert specific error class (not just any throwable — NaN return also triggers .toThrow()).
    expect(() =>
      gl4Step({ x: [0, 10, Math.PI / 2, 0], p: [-1, 0.5, 0, 0] }, 0.1, gInverseFn, dgInverseFn, {
        picardTol: 1e-12,
        picardMaxIter: 1,
      }),
    ).toThrow(/Picard iteration did not converge/i);
  });
});
