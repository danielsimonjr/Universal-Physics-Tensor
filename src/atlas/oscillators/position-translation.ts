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
 * Fourier series, which is quoted, not derived here.
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

import type { ObservableTranslation } from '../translation.js';
import type { DominanceWitnessSpec } from '../witness-dominance.js';
import type { NumericWitnessSpec } from '../witness-numeric.js';
import { pendulumPeriodErrorAt } from './bridges-limits.js';
import { linearAccel, pendulumAccel, pendulumNome, rk4Step, theta0OfPeriodError } from './pendulum-motion.js';

const TWO_PI = 2 * Math.PI;

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
export const POSITION_POINT_MAX_PERIODS = 512;
/** Samples per T0 both resolutions report at. */
const SAMPLES_PER_PERIOD = 200;

/**
 * |θ(t) − θ_lin(t)| from RK4 of both motions, and B(t) at the same samples,
 * over `periods` of T0; `stepsPerPeriod` must be a multiple of 200.
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
export function measureFundamental(theta0: number, stepsPerPeriod: number): number {
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
    'the classical Fourier series of the pendulum (all aₙ > 0, Σ (−1)ⁿ aₙ = θ0) — quoted, not derived here',
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
  ],
  checks: [dominanceSpec('W7x', W7X_EPS, 1, 1), W7XA],
  pointCheck: positionPointCheck,
};
