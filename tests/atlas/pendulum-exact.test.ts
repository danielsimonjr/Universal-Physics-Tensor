/**
 * W7xe — the exact pendulum beside RK4, for `ab-pendulum-linear`'s position
 * translation (proposal 15). The elliptic solution
 * θ(t) = 2 asin(k sn(K − ω0 t, m)), k = sin(θ0/2), m = k², is a closed form
 * independent of any integrator, so the Fourier-series premise can be checked
 * densely (every grid amplitude in (0, 0.5], every phase) at 1e-13, where W7xs
 * checks six amplitudes against RK4 at 1e-9. The series coefficients get a
 * second route through the FFT of one exact period. RK4 stays the third
 * method, and W7xs is unchanged.
 */
import { jacobiCN, jacobiDN, jacobiSN, random, seedProbabilityRng } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { pendulumPeriodErrorAt } from '../../src/atlas/oscillators/bridges-limits.js';
import { exactPendulumAngle, pendulumAccel, rk4Step, TWO_PI } from '../../src/atlas/oscillators/pendulum-motion.js';
import {
  exactDominanceSpec,
  FOURIER_SERIES_EXACT_GRID,
  FOURIER_SERIES_EXACT_TIGHT,
  FOURIER_SERIES_EXACT_TOLERANCE,
  fourierCoefficient,
  fourierCoefficientsByFft,
  fourierSeriesCheck,
  fourierSeriesExactDeviation,
  PENDULUM_POSITION_TRANSLATION as TR,
  waveformBound,
} from '../../src/atlas/oscillators/position-translation.js';
import { runTranslationCheck } from '../../src/atlas/translation-registry.js';
import { runDominanceWitness } from '../../src/atlas/witness-dominance.js';
import { rk4 } from './_ode.js';

describe('the exact check — the Fourier-series premise against the elliptic solution over a dense grid', () => {
  it('500 amplitudes in (0, 0.5] × 256 phases: the 20-term series is within 1e-12 rad of θ_exact everywhere, 1e-13 above θ0 = 0.002', () => {
    expect(FOURIER_SERIES_EXACT_GRID).toEqual({ amplitudes: 500, phases: 256 });
    expect(FOURIER_SERIES_EXACT_TOLERANCE).toBe(1e-12);
    expect(FOURIER_SERIES_EXACT_TIGHT).toEqual({ theta0Min: 0.002, tolerance: 1e-13 });
    const worst = fourierSeriesExactDeviation();
    expect(worst).toBeGreaterThan(0); // not vacuous: a real difference is measured
    expect(worst).toBeLessThan(FOURIER_SERIES_EXACT_TOLERANCE); // measured 2.3e-13, at θ0 = 0.001
    const above = fourierSeriesExactDeviation('plus', FOURIER_SERIES_EXACT_GRID, FOURIER_SERIES_EXACT_TIGHT.theta0Min);
    expect(above).toBeLessThan(FOURIER_SERIES_EXACT_TIGHT.tolerance); // measured 3.8e-14, at θ0 = 0.002
  });

  it('negative result: at θ0 = 0.001 the series side is 2.3e-13 off, from the nome’s K′ = K(cos²(θ0/2)); the exact side is not', () => {
    // The whole-grid deviation is above the tight tolerance, and it is the first amplitude.
    expect(fourierSeriesExactDeviation()).toBeGreaterThan(FOURIER_SERIES_EXACT_TIGHT.tolerance);
    expect(fourierSeriesExactDeviation('plus', { amplitudes: 500, phases: 1 })).toBeGreaterThan(2e-13);
    // At phase 0 the exact solution is θ0 itself, so the deviation there is the series’ a₀ sum alone.
    expect(exactPendulumAngle(0.001, 0)).toBe(0.001);
    let alternating = 0;
    for (let n = 0; n < 20; n++) alternating += (n % 2 === 0 ? 1 : -1) * fourierCoefficient(0.001, n);
    expect(Math.abs(alternating - 0.001)).toBeGreaterThan(2e-13);
    expect(Math.abs(alternating - 0.001)).toBeLessThan(3e-13);
  });

  it('control: the (1 − q^{2n+1}) transcription of aₙ is caught, by far more than the tolerance', () => {
    expect(fourierSeriesExactDeviation('minus')).toBeGreaterThan(1e-6);
  });

  it('is named by the premise through this test file (no resolution, so not a registered check), and W7xs (RK4, six amplitudes, 1e-9) is unchanged beside it', () => {
    expect(TR.witnesses.map((w) => w.id)).toEqual(['W7x', 'W7xa', 'W7xs']);
    expect(TR.checks.map((c) => c.id)).toEqual(['W7x', 'W7xa', 'W7xs']);
    const w7xs = fourierSeriesCheck('W7xs');
    expect(w7xs.tolerance).toBe(1e-9);
    expect(runTranslationCheck(w7xs).status).toBe('checked');
    expect(TR.premises.join(' ')).toMatch(/elliptic solution .* \(tests\/atlas\/pendulum-exact\.test\.ts\)/);
  });
});

describe('the elliptic solution itself', () => {
  it('satisfies θ″ + ω0² sin θ = 0 through the cn·dn identities at seeded random points', () => {
    seedProbabilityRng('pendulum-exact');
    for (let i = 0; i < 64; i++) {
      const theta0 = random(0.01, 0.5);
      const t = random(0, 3);
      const k = Math.sin(theta0 / 2);
      const m = k * k;
      const K = (Math.PI / 2) * (1 + pendulumPeriodErrorAt({ theta0 }));
      const u = K - TWO_PI * t;
      const theta = exactPendulumAngle(theta0, t);
      // sin(θ/2) = k sn u, so θ′ = −2ω0 k cn u and θ″ = −2ω0² k sn u dn u; sin θ = 2k sn u dn u.
      const thetaDD = -2 * TWO_PI ** 2 * k * jacobiSN(u, m) * jacobiDN(u, m);
      expect(Math.abs(thetaDD + TWO_PI ** 2 * Math.sin(theta))).toBeLessThan(1e-12 * TWO_PI ** 2);
      const thetaD = -2 * TWO_PI * k * jacobiCN(u, m);
      const h = 1e-5;
      const fd = (exactPendulumAngle(theta0, t + h) - exactPendulumAngle(theta0, t - h)) / (2 * h);
      expect(Math.abs(fd - thetaD)).toBeLessThan(1e-7);
    }
  });

  it('control: with the modulus k in place of the parameter m = k² the identity fails', () => {
    const theta0 = 0.4;
    const t = 0.37;
    const k = Math.sin(theta0 / 2);
    const K = (Math.PI / 2) * (1 + pendulumPeriodErrorAt({ theta0 }));
    const u = K - TWO_PI * t;
    const wrongTheta = 2 * Math.asin(k * jacobiSN(u, k));
    const thetaDD = -2 * TWO_PI ** 2 * k * jacobiSN(u, k) * jacobiDN(u, k);
    expect(Math.abs(thetaDD + TWO_PI ** 2 * Math.sin(wrongTheta))).toBeGreaterThan(1e-3);
  });

  it('starts at θ0 from rest, has the elliptic period, and agrees with RK4 (h = 1/4000, θ0 = 0.5) over [0, 1] to 1e-12', () => {
    for (const theta0 of [0.05, 0.3, 0.5]) {
      expect(exactPendulumAngle(theta0, 0)).toBeCloseTo(theta0, 15);
      const T = 1 + pendulumPeriodErrorAt({ theta0 });
      expect(exactPendulumAngle(theta0, T)).toBeCloseTo(theta0, 13);
      expect(exactPendulumAngle(theta0, T / 2)).toBeCloseTo(-theta0, 13);
    }
    const steps = 4000;
    let x = 0.5;
    let v = 0;
    let worst = 0;
    for (let i = 1; i <= steps; i++) {
      [x, v] = rk4Step(x, v, 1 / steps, pendulumAccel);
      worst = Math.max(worst, Math.abs(x - exactPendulumAngle(0.5, i / steps)));
    }
    expect(worst).toBeLessThan(1e-12); // measured 7e-14
    // And against the test suite's own integrator, at a dimensioned T0 = 2.
    const { samples } = rk4((_t, y) => [y[1]!, -((TWO_PI / 2) ** 2) * Math.sin(y[0]!)], [0.3, 0], 0, 2, 8000);
    for (const s of samples) expect(Math.abs(s.y[0]! - exactPendulumAngle(0.3, s.t / 2))).toBeLessThan(1e-12);
  });
});

describe('the series coefficients from the FFT of one exact period', () => {
  it('aₙ = (−1)ⁿ 2 re[2n+1]/N for n < 5 match 8 q^{n+½}/((2n+1)(1 + q^{2n+1})) to 1e-12', () => {
    for (const theta0 of [0.1, 0.3, 0.5]) {
      const byFft = fourierCoefficientsByFft(theta0, 1024, 5);
      expect(byFft).toHaveLength(5);
      for (let n = 0; n < 5; n++) {
        expect(Math.abs(byFft[n]! - fourierCoefficient(theta0, n))).toBeLessThan(1e-12); // measured 3.8e-14
      }
      // The even harmonics of a release from rest vanish: nothing hides in re[2n].
      expect(Math.abs(byFft[0]! - theta0)).toBeGreaterThan(theta0 ** 3 / 400);
    }
  });

  it('control: the transcription (1 − q^{2n+1}) moves a₀ by more than 1e-6, which the FFT route sees', () => {
    const theta0 = 0.5;
    expect(Math.abs(fourierCoefficientsByFft(theta0, 1024, 1)[0]! - fourierCoefficient(theta0, 0, 'minus'))).toBeGreaterThan(1e-6);
  });
});

describe('W7x through the exact θ: the dominance runner without a coarse-to-fine uncertainty', () => {
  it('the bound holds at every sample with u = 0, so the rule b − m > u is b > m there', () => {
    const eps = pendulumPeriodErrorAt({ theta0: 0.3 });
    const spec = exactDominanceSpec('W7x@exact', eps);
    const r = runDominanceWitness(spec);
    expect(r.status).toBe('checked');
    expect(r.uncertainty).toBe(0);
    expect(r.tightness).toBeGreaterThan(0.99);
    expect(r.tightness).toBeLessThan(1);
  });

  it('control: the bound without W̄ is refuted on the exact route too', () => {
    const eps = pendulumPeriodErrorAt({ theta0: 0.3 });
    const spec = exactDominanceSpec('W7x@exact-control', eps);
    const W = waveformBound(0.3);
    const r = runDominanceWitness({
      ...spec,
      evaluate: (res) => {
        const { measured, bound } = spec.evaluate(res);
        return { measured, bound: bound.map((b) => b - W) };
      },
    });
    expect(r.status).toBe('refuted');
  });
});
