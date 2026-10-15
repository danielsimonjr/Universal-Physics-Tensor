/**
 * Proposal 17, test-side: exact partners beside the integrators.
 *
 * W8b (`measureMasslessOffset`) and WD4 (`langevinMsdRatio`) integrate linear
 * constant-coefficient systems with RK4; the matrix exponential (MathTS
 * `matrixExpm`, Padé-13) is their exact propagator, and WD4 also has a closed
 * form. W9 (`measureChainDispersionError`) reads ω off an RK4 zero crossing;
 * the ring's Laplacian is a circulant whose eigenvalues are the DFT of its
 * first row (MathTS `eigvals`, `rfft`), so ω² = −(κ/m) λ₁ exactly. Each
 * agreement is pinned with a margin over the measured value, and a
 * sign-flipped integrator is shown to be caught by its partner.
 */
import { rfft } from '@danielsimonjr/mathts-functions';
import { DenseMatrix, eigvals, matrixExpm } from '@danielsimonjr/mathts-matrix';
import { describe, expect, it } from 'vitest';
import { langevinMsdRatio } from '../../src/atlas/diffusion/numerics.js';
import {
  measureChainDispersionError,
  measureMasslessOffset,
  W8B_FIXTURE,
  W9_FIXTURE,
} from '../../src/atlas/oscillators/limit-witnesses.js';
import { WD4_FIXTURE } from '../../src/atlas/witness-specs.js';
import { rk4Trajectory } from '../../src/numerical/rk4-trajectory.js';

/** expm(A·h) as a plain array, every entry read back as a number. */
function propagator(A: number[][], h: number): number[][] {
  const E = matrixExpm(DenseMatrix.fromArray(A.map((row) => row.map((v) => v * h)))).toArray();
  return E.map((row) => row.map((v) => {
    if (typeof v !== 'number') throw new TypeError('matrixExpm did not return numbers');
    return v;
  }));
}
const apply = (E: number[][], y: number[]): number[] => E.map((row) => row.reduce((s, e, j) => s + e * y[j]!, 0));

describe('W8b — the damped spring’s offset from its massless reduction: expm beside RK4', () => {
  const { b, k, x0, v0, tEnd, stepsPerMass } = W8B_FIXTURE;
  /** sup over the outer region of |x_i − x0 e^{−k t_i/b}|, x from the exact one-step propagator iterated. */
  const expmOffset = (m: number): number => {
    const h = m / stepsPerMass;
    const layerSteps = Math.ceil((5 * stepsPerMass) / b);
    const steps = Math.ceil(tEnd / h);
    const E = propagator([[0, 1], [-k / m, -b / m]], h);
    let y = [x0, v0];
    let sup = 0;
    for (let i = 1; i <= steps; i++) {
      y = apply(E, y);
      if (i >= layerSteps) sup = Math.max(sup, Math.abs(y[0]! - x0 * Math.exp((-k / b) * i * h)));
    }
    return sup;
  };

  it('at the fine mass m = 0.01 the two sups agree to 1e-8 (measured 1.1e-10: 0.05740000240 expm, 0.05740000229 RK4)', () => {
    for (const m of [W8B_FIXTURE.m, W8B_FIXTURE.m / 2]) {
      const rk4 = measureMasslessOffset(m);
      const exact = expmOffset(m);
      expect(Math.abs(rk4 - exact), `m = ${m}`).toBeLessThan(1e-8);
    }
    expect(expmOffset(0.01)).toBeCloseTo(0.0574000024, 9);
  });

  it('control: an integrator with the damping sign flipped is caught by the exact partner', () => {
    const m = 0.01;
    const h = m / stepsPerMass;
    const steps = Math.ceil(tEnd / h);
    const layerSteps = Math.ceil((5 * stepsPerMass) / b);
    const flipped = rk4Trajectory((_t, y) => [y[1]!, -(-b * y[1]! + k * y[0]!) / m], [x0, v0], 0, steps * h, steps);
    let sup = 0;
    for (let i = layerSteps; i <= steps; i++) {
      const x = flipped[i]![0]!;
      if (!Number.isFinite(x)) { sup = Infinity; break; }
      sup = Math.max(sup, Math.abs(x - x0 * Math.exp((-k / b) * i * h)));
    }
    expect(Math.abs(sup - expmOffset(m))).toBeGreaterThan(1);
  });
});

describe('WD4 — the Langevin second moments: expm of the affine system, and the closed form, beside RK4', () => {
  const f = WD4_FIXTURE;
  const tauP = f.m / f.gamma;
  const v2 = f.kT / f.m;
  const D = f.kT / f.gamma;
  /** [⟨x²⟩, ⟨xv⟩, 1] propagated by expm(A t) in one shot: exact. */
  const expmRatio = (resolution: number): number => {
    const t = resolution * tauP;
    const E = propagator([[0, 2, 0], [0, -1 / tauP, v2], [0, 0, 0]], t);
    return apply(E, [0, 0, 1])[0]! / (2 * D * t);
  };
  /** ⟨x²⟩ = 2 v² τ_p (t − τ_p (1 − e^{−t/τ_p})). */
  const closedRatio = (resolution: number): number => {
    const t = resolution * tauP;
    return (2 * v2 * tauP * (t - tauP * -Math.expm1(-t / tauP))) / (2 * D * t);
  };

  it('at the registered resolutions 10 and 100 the RK4 ratio agrees with expm and with the closed form to 1e-9', () => {
    for (const r of [10, 100]) {
      const rk4 = langevinMsdRatio(r, f);
      expect(Math.abs(rk4 - expmRatio(r)), `expm, resolution ${r}`).toBeLessThan(1e-9);
      expect(Math.abs(rk4 - closedRatio(r)), `closed form, resolution ${r}`).toBeLessThan(1e-9);
      expect(Math.abs(expmRatio(r) - closedRatio(r)), `expm vs closed, resolution ${r}`).toBeLessThan(1e-13);
    }
  });

  it('control: an integrator with the friction sign flipped is caught by the exact partner', () => {
    const r = 10;
    const t = r * tauP;
    const steps = Math.max(2000, Math.ceil(200 * r));
    const end = rk4Trajectory((_s, y) => [2 * y[1]!, v2 + y[1]! / tauP], [0, 0], 0, t, steps)[steps]!;
    expect(Math.abs(end[0]! / (2 * D * t) - expmRatio(r))).toBeGreaterThan(1);
  });
});

describe('W9 — the ring’s longest mode: the circulant’s eigenvalue beside the RK4 zero crossing', () => {
  const { kappa, m, a } = W9_FIXTURE;
  const w = kappa / m;
  const firstRow = (N: number): number[] => Array.from({ length: N }, (_, i) => (i === 0 ? -2 : i === 1 || i === N - 1 ? 1 : 0));
  const circulant = (N: number): number[][] => Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => firstRow(N)[(j - i + N) % N]!));
  const dispersionError = (lambda1: number, N: number): number => {
    const omega = Math.sqrt(-w * lambda1);
    return 1 - omega / (a * Math.sqrt(w) * ((2 * Math.PI) / (N * a)));
  };

  it('eigvals of the circulant and rfft of its first row give λ₁, and 1 − ω/(cq) agrees with the integrated ring to 1e-12 at N = 16 and 32', () => {
    for (const N of [16, 32]) {
      const eig = eigvals(circulant(N));
      const nonzero = eig.map((e) => e.re).filter((re) => Math.abs(re) > 1e-6);
      const lambda1 = nonzero.reduce((best, re) => (Math.abs(re) < Math.abs(best) ? re : best));
      const { re } = rfft(firstRow(N));
      expect(Math.abs(re[1]! - lambda1), `N = ${N}: rfft vs eigvals`).toBeLessThan(1e-12);
      expect(Math.abs(lambda1 - -4 * Math.sin(Math.PI / N) ** 2), `N = ${N}: −4 sin²(π/N)`).toBeLessThan(1e-12);
      const integrated = measureChainDispersionError(N);
      expect(Math.abs(integrated - dispersionError(lambda1, N)), `N = ${N}: eigvals vs RK4`).toBeLessThan(1e-12); // measured 1e-14
      expect(Math.abs(integrated - dispersionError(re[1]!, N)), `N = ${N}: rfft vs RK4`).toBeLessThan(1e-12);
    }
  });

  it('control: an integrator with the coupling sign flipped (anti-restoring) finds no crossing and is caught', () => {
    const N = 16;
    const h = 1 / W9_FIXTURE.stepsPerUnitTime;
    // Growth rate √(w)·2 sin(π/N) ≈ 0.39 per unit time: by t = 6 the mode has grown about tenfold.
    const steps = 6000;
    const states = rk4Trajectory(
      (_t, y) => {
        const out = new Array<number>(2 * N);
        for (let n = 0; n < N; n++) {
          out[n] = y[N + n]!;
          out[N + n] = -w * (y[(n + 1) % N]! - 2 * y[n]! + y[(n - 1 + N) % N]!);
        }
        return out;
      },
      [...Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * n) / N)), ...new Array<number>(N).fill(0)],
      0,
      steps * h,
      steps,
    );
    const crossing = states.findIndex((s, i) => i > 0 && states[i - 1]![0]! > 0 && s[0]! <= 0);
    expect(crossing).toBe(-1);
    expect(states[steps]![0]!).toBeGreaterThan(5);
  });
});
