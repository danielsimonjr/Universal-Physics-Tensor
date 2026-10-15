/**
 * `ab-pendulum-linear`'s declared translation from its bound's quantity, the
 * relative period error ε, into an UPPER BOUND on the pointwise position error
 * |θ(t) − θ_lin(t)|, in rad.
 *
 * Both motions start from rest at θ0. The pendulum is θ(t) = F(φ), φ = 2πt/T,
 * with the classical Fourier series of the elliptic solution
 *
 *   F(φ) = Σ_{n≥0} (−1)ⁿ aₙ cos((2n+1)φ),  aₙ = 8 q^{n+½} / ((2n+1)(1 + q^{2n+1})),
 *
 * q the nome of k = sin(θ0/2); F(0) = θ0 = Σ (−1)ⁿ aₙ. The linear motion is
 * θ0 cos φ_lin, φ_lin = 2πt/T0. Splitting at θ0 cos φ,
 *
 *   |θ − θ_lin| ≤ |F(φ) − θ0 cos φ| + θ0 |cos φ − cos φ_lin|
 *              ≤ 2 Σ_{n≥1} aₙ + 2θ0 |sin(Δφ/2)|,
 *
 * because F(φ) − θ0 cos φ = Σ_{n≥1} (−1)ⁿ aₙ (cos((2n+1)φ) − cos φ). With
 * aₙ ≤ (8/3) q^{n+½} for n ≥ 1 the first term is at most
 * W̄ = (16/3) q^{3/2}/(1 − q) ≈ θ0³/96, and Δφ = 2π(t/T0) ε/(1+ε) is the
 * exact phase lead of `phase-translation.ts`. So
 *
 *   B(t) = W̄ + 2θ0 sin(min(Δφ(t), π)/2)
 *
 * bounds the error at every t; the clamp at π keeps B non-decreasing in t and
 * is still a bound, since |cos a − cos b| ≤ 2. It is rigorous GIVEN the
 * Fourier series, which is quoted, not derived here. The exact check
 * (`fourierSeriesExactDeviation`, run by `tests/atlas/pendulum-exact.test.ts`;
 * not a registered witness, because it has no resolution for a runner to
 * refine) compares the series with the EXACT solution θ = 2 asin(k sn(K − ω0t, k²))
 * (`exactPendulumAngle`) over a dense grid of amplitudes and phases at
 * 1e-12 rad (1e-13 above θ0 = 0.002; the floor below that is the nome's, see
 * `FOURIER_SERIES_EXACT_TOLERANCE`), and W7xs against RK4 over one period at
 * six amplitudes at 1e-9;
 * both are checks at grid points, not a derivation. The coefficients also
 * have a second route, the FFT of one exact period (`fourierCoefficientsByFft`).
 *
 * B is an upper bound, not the error: past its horizon the BOUND exceeds the
 * tolerance, and the error may not. It is near-sharp where Δφ → π (the
 * motions are in antiphase and the error reaches 2θ0), and the waveform term
 * cannot be dropped: without W̄, RK4 finds the error above 2θ0 sin(Δφ/2) by
 * about 3% (witness control).
 *
 * @module atlas/oscillators/position-translation
 * @internal
 */

import { rfft } from '@danielsimonjr/mathts-functions';
import type { ObservableTranslation } from '../translation.js';
import type { DominanceWitnessSpec } from '../witness-dominance.js';
import type { NumericWitnessSpec } from '../witness-numeric.js';
import { pendulumPeriodErrorAt } from './bridges-limits.js';
import {
  exactPendulumAngle,
  linearAccel,
  pendulumAccel,
  pendulumNome,
  rk4Step,
  theta0OfPeriodError,
  TWO_PI,
} from './pendulum-motion.js';

/** W̄ = (16/3) q^{3/2}/(1 − q): the bound on the waveform distortion |F(φ) − θ0 cos φ|. @internal */
export function waveformBound(theta0: number): number {
  const q = pendulumNome(theta0);
  return ((16 / 3) * q ** 1.5) / (1 - q);
}

/** The pendulum's fundamental Fourier coefficient a₀ = 8√q/(1 + q). @internal */
export function fundamentalCoefficient(theta0: number): number {
  const q = pendulumNome(theta0);
  return (8 * Math.sqrt(q)) / (1 + q);
}

const lead = (eps: number, tOverT0: number): number => (TWO_PI * tOverT0 * eps) / (1 + eps);

/** B(t/T0) at θ0 recovered from ε; `drift` and `waveform` scale its two terms (1, 1 is B itself). */
function positionBound(eps: number, drift = 1, waveform = 1): (tOverT0: number) => number {
  const theta0 = theta0OfPeriodError(eps);
  const floor = waveform * waveformBound(theta0);
  return (tOverT0) => floor + drift * 2 * theta0 * Math.sin(Math.min(lead(eps, tOverT0), Math.PI) / 2);
}

function positionHorizon(eps: number, tolerance: number, T0: number | undefined): number {
  if (T0 === undefined || !Number.isFinite(T0) || T0 <= 0 || !Number.isFinite(eps) || eps < 0) return Number.NaN;
  if (eps === 0) return Infinity;
  const theta0 = theta0OfPeriodError(eps);
  const floor = waveformBound(theta0);
  if (tolerance < floor) return Number.NaN;
  const r = (tolerance - floor) / (2 * theta0);
  if (r >= 1) return Infinity;
  return (2 * Math.asin(r) * T0 * (1 + eps)) / (TWO_PI * eps);
}

/** The point witness integrates at most this many periods of T0. */
const POSITION_POINT_MAX_PERIODS = 512;
/** Samples per T0 both resolutions report at. */
const SAMPLES_PER_PERIOD = 200;

/**
 * |θ(t) − θ_lin(t)| from RK4 of both motions, and B(t) at the same samples,
 * over `periods` of T0; `stepsPerPeriod` must be a multiple of 200. The
 * exact route is {@link exactDominanceSpec}; this one is what W7x registers,
 * so the integrator stays part of what the witness exercises.
 */
function dominanceSamples(theta0: number, periods: number, stepsPerPeriod: number, bound: (t: number) => number) {
  const stride = stepsPerPeriod / SAMPLES_PER_PERIOD;
  const h = 1 / stepsPerPeriod;
  const measured: number[] = [];
  const b: number[] = [];
  let x = theta0;
  let v = 0;
  let y = theta0;
  let u = 0;
  const steps = Math.floor(periods * SAMPLES_PER_PERIOD) * stride;
  for (let i = 1; i <= steps; i++) {
    [x, v] = rk4Step(x, v, h, pendulumAccel);
    [y, u] = rk4Step(y, u, h, linearAccel);
    if (i % stride === 0) {
      measured.push(Math.abs(x - y));
      b.push(bound(i * h));
    }
  }
  return { measured, bound: b };
}

/** The window a dominance witness covers: up to antiphase (Δφ = π), past which B ≥ 2θ0 holds trivially, capped. */
function dominanceWindow(eps: number): number {
  return Math.min(POSITION_POINT_MAX_PERIODS, (1 + eps) / (2 * eps));
}

/**
 * The exact route to W7x's measured value: |θ_exact(t) − θ0 cos(2πt)| from the
 * closed forms, at the same 200 samples per T0 as {@link dominanceSamples},
 * against B(t) at θ0 recovered from `eps`. The resolution is ignored, so the
 * runner's coarse-to-fine uncertainty u is exactly 0 here and its rule
 * `bound − measured > u` is `bound > measured`: u is a property of the RK4
 * route, not of the claim. The registered W7x keeps the RK4 route.
 *
 * @internal
 */
export function exactDominanceSpec(id: string, eps: number): DominanceWitnessSpec {
  const theta0 = theta0OfPeriodError(eps);
  const periods = dominanceWindow(eps);
  const bound = positionBound(eps);
  const samples = Math.floor(periods * SAMPLES_PER_PERIOD);
  return {
    id,
    kind: 'dominance',
    evaluate: () => {
      const measured: number[] = [];
      const b: number[] = [];
      for (let i = 1; i <= samples; i++) {
        const t = i / SAMPLES_PER_PERIOD;
        measured.push(Math.abs(exactPendulumAngle(theta0, t) - theta0 * Math.cos(TWO_PI * t)));
        b.push(bound(t));
      }
      return { measured, bound: b };
    },
    coarseResolution: 200,
    fineResolution: 800,
  };
}

function dominanceSpec(id: string, eps: number, drift: number, waveform: number): DominanceWitnessSpec {
  const theta0 = theta0OfPeriodError(eps);
  const periods = dominanceWindow(eps);
  return {
    id,
    kind: 'dominance',
    evaluate: (stepsPerPeriod) => dominanceSamples(theta0, periods, stepsPerPeriod, positionBound(eps, drift, waveform)),
    coarseResolution: 200,
    fineResolution: 800,
  };
}

/** a₀ measured by projecting one RK4 pendulum period onto cos φ (trapezoid, exact for a periodic integrand). */
function measureFundamental(theta0: number, stepsPerPeriod: number): number {
  const T = 1 + pendulumPeriodErrorAt({ theta0 });
  const h = T / stepsPerPeriod;
  let x = theta0;
  let v = 0;
  let sum = theta0;
  for (let i = 1; i < stepsPerPeriod; i++) {
    [x, v] = rk4Step(x, v, h, pendulumAccel);
    sum += x * Math.cos((TWO_PI * i) / stepsPerPeriod);
  }
  return (2 * sum) / stepsPerPeriod;
}

/** The θ0 at which W7xs checks the Fourier series: a grid across the bridge's domain θ0 ≤ 0.5. @internal */
export const FOURIER_SERIES_THETA0S: readonly number[] = [0.01, 0.1, 0.2, 0.3, 0.4, 0.5];
const FOURIER_SERIES_TERMS = 20;
const FOURIER_SERIES_TOLERANCE = 1e-9;

/** aₙ = 8 q^{n+½}/((2n+1)(1 + q^{2n+1})) from the nome; `'minus'` is the (1 − q^{2n+1}) transcription error the controls use. */
function coefficientFromNome(q: number, n: number, variant: 'plus' | 'minus'): number {
  const odd = 2 * n + 1;
  return (8 * q ** (n + 0.5)) / (odd * (variant === 'plus' ? 1 + q ** odd : 1 - q ** odd));
}

/** The pendulum's Fourier coefficient aₙ at amplitude θ0 (the closed form, from the nome). @internal */
export function fourierCoefficient(theta0: number, n: number, variant: 'plus' | 'minus' = 'plus'): number {
  return coefficientFromNome(pendulumNome(theta0), n, variant);
}

/**
 * F(φ) = Σ_{n<20} (−1)ⁿ aₙ cos((2n+1)φ). `'minus'` puts (1 − q^{2n+1}) in the
 * denominator of aₙ, a transcription error the control uses.
 */
function fourierSeries(theta0: number, phi: number, variant: 'plus' | 'minus'): number {
  const q = pendulumNome(theta0);
  let s = 0;
  for (let n = 0; n < FOURIER_SERIES_TERMS; n++) {
    const a = coefficientFromNome(q, n, variant);
    s += (n % 2 === 0 ? a : -a) * Math.cos((2 * n + 1) * phi);
  }
  return s;
}

/** The grid the exact check runs on: amplitudes θ0 = 0.5 j/500, j = 1..500, and phases φ = 2π i/256. @internal */
export const FOURIER_SERIES_EXACT_GRID = { amplitudes: 500, phases: 256 } as const;
/**
 * The exact check's tolerance over the whole grid, in rad. The measured deviation is
 * 2.3e-13, all of it at the smallest amplitude θ0 = 0.001 and on the SERIES
 * side: the nome's K′ = K(cos²(θ0/2)) is read from a complementary parameter
 * that rounds at 1e-16 absolute, 4e-10 relative at m = 2.5e-7, so a₀ is low
 * by 2.3e-10 of θ0 there. The exact solution agrees with an independent AGM
 * sn to the bit at that point.
 * @internal
 */
export const FOURIER_SERIES_EXACT_TOLERANCE = 1e-12;
/** Above θ0 = 0.002 the same check holds at 1e-13 rad (measured 3.8e-14 at θ0 = 0.002, below 1.5e-14 from θ0 = 0.01). @internal */
export const FOURIER_SERIES_EXACT_TIGHT = { theta0Min: 0.002, tolerance: 1e-13 } as const;

/**
 * The exact check, or its control: max over the grid of |θ_exact(t) − F(φ)|, t = φT/2π,
 * with θ_exact the elliptic solution (`exactPendulumAngle`) and F the 20-term
 * series, over the amplitudes at or above `theta0Min`. A closed form against
 * a closed form, so no resolution and no convergence ratio: the number is the
 * deviation itself, held to {@link FOURIER_SERIES_EXACT_TOLERANCE} over the
 * whole grid and to {@link FOURIER_SERIES_EXACT_TIGHT} above its floor by the
 * test.
 *
 * @internal
 */
export function fourierSeriesExactDeviation(
  variant: 'plus' | 'minus' = 'plus',
  grid: { readonly amplitudes: number; readonly phases: number } = FOURIER_SERIES_EXACT_GRID,
  theta0Min = 0,
): number {
  let worst = 0;
  for (let j = 1; j <= grid.amplitudes; j++) {
    const theta0 = (0.5 * j) / grid.amplitudes;
    if (theta0 < theta0Min) continue;
    const T = 1 + pendulumPeriodErrorAt({ theta0 });
    const q = pendulumNome(theta0);
    const a = Array.from({ length: FOURIER_SERIES_TERMS }, (_, n) => coefficientFromNome(q, n, variant));
    for (let i = 0; i < grid.phases; i++) {
      const phi = (TWO_PI * i) / grid.phases;
      let s = 0;
      for (let n = 0; n < FOURIER_SERIES_TERMS; n++) s += (n % 2 === 0 ? a[n]! : -a[n]!) * Math.cos((2 * n + 1) * phi);
      worst = Math.max(worst, Math.abs(exactPendulumAngle(theta0, (i * T) / grid.phases) - s));
    }
  }
  return worst;
}

/**
 * The first `count` coefficients aₙ from the FFT of one exact period sampled
 * at `samples` points, MathTS `rfft`: aₙ = (−1)ⁿ 2 re[2n+1]/N. A second
 * route to the series, independent of the nome. `samples` must exceed
 * 2·count + 1.
 *
 * @internal
 */
export function fourierCoefficientsByFft(theta0: number, samples: number, count: number): number[] {
  if (!Number.isInteger(samples) || samples <= 2 * count + 1) {
    throw new RangeError(`fourierCoefficientsByFft: ${samples} samples cannot resolve ${count} odd harmonics`);
  }
  const T = 1 + pendulumPeriodErrorAt({ theta0 });
  const { re } = rfft(Array.from({ length: samples }, (_, i) => exactPendulumAngle(theta0, (i * T) / samples)));
  return Array.from({ length: count }, (_, n) => ((n % 2 === 0 ? 2 : -2) * re[2 * n + 1]!) / samples);
}

/** max over the grid, and over one period T = T0(1+ε) sampled at every RK4 step, of |θ_RK4(t) − F(2πt/T)|. */
function fourierSeriesDeviation(stepsPerPeriod: number, variant: 'plus' | 'minus'): number {
  let worst = 0;
  for (const theta0 of FOURIER_SERIES_THETA0S) {
    const h = (1 + pendulumPeriodErrorAt({ theta0 })) / stepsPerPeriod;
    let x = theta0;
    let v = 0;
    worst = Math.max(worst, Math.abs(x - fourierSeries(theta0, 0, variant)));
    for (let i = 1; i <= stepsPerPeriod; i++) {
      [x, v] = rk4Step(x, v, h, pendulumAccel);
      worst = Math.max(worst, Math.abs(x - fourierSeries(theta0, (TWO_PI * i) / stepsPerPeriod, variant)));
    }
  }
  return worst;
}

/**
 * W7xs, or its control: the Fourier series against RK4 of the pendulum, at 200
 * and 800 steps per period, within 1e-9 rad at every step and every grid θ0.
 * @internal
 */
export function fourierSeriesCheck(id: string, variant: 'plus' | 'minus' = 'plus'): NumericWitnessSpec {
  return {
    id,
    evaluate: (stepsPerPeriod) => fourierSeriesDeviation(stepsPerPeriod, variant),
    target: 0,
    coarseResolution: 200,
    fineResolution: 800,
    tolerance: FOURIER_SERIES_TOLERANCE,
  };
}

const W7X_THETA0 = 0.3;
const W7X_EPS = pendulumPeriodErrorAt({ theta0: W7X_THETA0 });

const W7XA: NumericWitnessSpec = {
  id: 'W7xa',
  evaluate: (stepsPerPeriod) => measureFundamental(W7X_THETA0, stepsPerPeriod),
  target: fundamentalCoefficient(W7X_THETA0),
  coarseResolution: 200,
  fineResolution: 800,
  tolerance: 1e-10,
};

function positionPointCheck(eps: number): ReturnType<ObservableTranslation['pointCheck']> {
  if (!Number.isFinite(eps) || eps <= 0) return { unavailable: `θ0 = 0 at ε = ${eps}: both motions are at rest and the error is 0` };
  const theta0 = theta0OfPeriodError(eps);
  const periods = dominanceWindow(eps);
  const capped = periods === POSITION_POINT_MAX_PERIODS ? `, capped at ${POSITION_POINT_MAX_PERIODS} T0 (antiphase is at ${(1 + eps) / (2 * eps)} T0)` : ' (to antiphase, Δφ = π)';
  return {
    claim:
      `RK4 |θ − θ_lin| ≤ B(t) at every sample, θ0 = ${Number(theta0.toPrecision(8))} (recovered from ε), over t ≤ ${periods} T0${capped}; ` +
      `200 and 800 steps per T0, sampled 200 per T0; the coarse-to-fine difference is the uncertainty`,
    check: dominanceSpec('W7x@point', eps, 1, 1),
    control: dominanceSpec('W7x@point-control', eps, 1, 0),
    controlClaim: 'the same bound without its waveform term W̄, 2θ0 sin(Δφ/2) alone',
  };
}

/** @internal */
export const PENDULUM_POSITION_TRANSLATION: ObservableTranslation = {
  bridgeId: 'ab-pendulum-linear',
  observable: 'position',
  unit: 'rad',
  fromNorm: 'relative period error, normalized by the value of the reduced model',
  errorKind: 'upper-bound',
  definition: 'the pointwise angle error |θ(t) − θ_lin(t)| of the two motions released from rest at θ0',
  derivation:
    'an UPPER BOUND B(t) = W̄ + 2θ0 sin(min(Δφ(t), π)/2), Δφ = 2π (t/T0) ε/(1+ε) the exact phase lead and ' +
    'W̄ = (16/3) q^{3/2}/(1−q) ≈ θ0³/96 the waveform term (q the nome of sin(θ0/2); θ0 is recovered from ε). ' +
    'From the Fourier series θ = Σ (−1)ⁿ aₙ cos((2n+1)φ): |θ − θ0 cos φ| ≤ 2 Σ_{n≥1} aₙ ≤ W̄, and θ0|cos φ − cos φ_lin| ≤ 2θ0|sin(Δφ/2)|. ' +
    'B increases with ε, so the domain supremum of ε gives the shortest horizon over the domain',
  premises: [
    'both motions are released from rest at the same θ0 at t = 0',
    'T0 = 2π √(ℓ/g) is the linear period, in the unit t is given in',
    'the classical Fourier series of the pendulum (all aₙ > 0, Σ (−1)ⁿ aₙ = θ0) — quoted, not derived here; ' +
      `machine-checked against the elliptic solution θ = 2 asin(k sn(K − ω0t, k²)) over ${FOURIER_SERIES_EXACT_GRID.amplitudes} amplitudes in (0, 0.5] ` +
      `and ${FOURIER_SERIES_EXACT_GRID.phases} phases within ${FOURIER_SERIES_EXACT_TOLERANCE} rad, and within ${FOURIER_SERIES_EXACT_TIGHT.tolerance} rad ` +
      `above θ0 = ${FOURIER_SERIES_EXACT_TIGHT.theta0Min} (tests/atlas/pendulum-exact.test.ts), and against RK4 at θ0 ∈ {${FOURIER_SERIES_THETA0S.join(', ')}} (W7xs)`,
  ],
  parameters: ['T0'],
  timeUnit: 'the unit of T0',
  errorAt: (eps, t, { T0 }) => {
    if (T0 === undefined || !Number.isFinite(T0) || T0 <= 0 || !Number.isFinite(eps) || eps < 0 || !Number.isFinite(t)) return Number.NaN;
    return positionBound(eps)(t / T0);
  },
  horizonFor: (eps, tolerance, { T0 }) => positionHorizon(eps, tolerance, T0),
  floor: (eps) => waveformBound(theta0OfPeriodError(eps)),
  boundary:
    'inclusive: certified iff t ≤ t*, i.e. B(t) ≤ the tolerance; past t* the BOUND exceeds it and the error may not (undetermined, not inadequate)',
  notCovered: ['the phase (declared separately: --tolerance=phase:EPS)', 'the angular velocity', 'the amplitude'],
  witnesses: [
    {
      id: 'W7x',
      kind: 'numeric',
      test: 'tests/atlas/pendulum-position-translation.test.ts',
      tolerance: `RK4 |θ − θ_lin| ≤ B(t) at every sample to antiphase, θ0 = ${W7X_THETA0}, by more than the coarse-to-fine difference`,
    },
    {
      id: 'W7xa',
      kind: 'numeric',
      test: 'tests/atlas/pendulum-position-translation.test.ts',
      tolerance: `RK4-projected fundamental coefficient at θ0 = ${W7X_THETA0} within 1e-10 of 8√q/(1+q)`,
    },
    {
      id: 'W7xs',
      kind: 'numeric',
      test: 'tests/atlas/pendulum-position-translation.test.ts',
      tolerance:
        `the Fourier series (${FOURIER_SERIES_TERMS} terms) within ${FOURIER_SERIES_TOLERANCE} rad of RK4 at every step of one period, ` +
        `at θ0 ∈ {${FOURIER_SERIES_THETA0S.join(', ')}}`,
    },
  ],
  checks: [dominanceSpec('W7x', W7X_EPS, 1, 1), W7XA, fourierSeriesCheck('W7xs')],
  pointCheck: positionPointCheck,
};
