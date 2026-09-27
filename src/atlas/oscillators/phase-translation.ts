/**
 * `ab-pendulum-linear`'s declared translation from its bound's quantity, the
 * relative period error, into the accumulated PHASE error.
 *
 * Both motions start from rest at θ0 at t = 0. The phase is the angle
 * variable: 0 at release and advancing by 2π per period, uniformly in time,
 * so the pendulum's is 2π t/T and the linear oscillator's 2π t/T0. With the
 * bound's `ε = T/T0 − 1` (normalised by the reduced model's period),
 *
 *   Δφ(t) = 2π t/T0 − 2π t/T = 2π (t/T0) · ε/(1 + ε),
 *
 * which reaches a tolerance Δ at `t* = Δ · T0 · (1 + ε)/(2π ε)`. Nothing is
 * truncated: the map is exact in ε, and ε itself is the bound's closed form.
 *
 * It is NOT a bound on the pointwise position error |θ(t) − θ_lin(t)|: the
 * pendulum's waveform carries a third harmonic of amplitude ≈ θ0³/192, which
 * is not a phase, and the position error at a given phase error depends on
 * where in the cycle the observation falls.
 *
 * The witness W7p integrates BOTH equations of motion and reads each phase off
 * its zero crossings — crossing k is at phase π/2 + kπ by the symmetry of a
 * release from rest, and the angle variable is linear in time between them —
 * so it measures the drift without using ε or the elliptic integral.
 *
 * @module atlas/oscillators/phase-translation
 * @internal
 */

import type { ObservableTranslation } from '../translation.js';
import { pendulumPeriodErrorAt } from './bridges-limits.js';

const TWO_PI = 2 * Math.PI;

function rk4Step(x: number, v: number, h: number, accel: (x: number) => number): [number, number] {
  const k1x = v;
  const k1v = accel(x);
  const k2x = v + 0.5 * h * k1v;
  const k2v = accel(x + 0.5 * h * k1x);
  const k3x = v + 0.5 * h * k2v;
  const k3v = accel(x + 0.5 * h * k2x);
  const k4x = v + h * k3v;
  const k4v = accel(x + h * k3x);
  return [x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x), v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)];
}

/** Zero-crossing times of a release from rest at `theta0`, over `periods` of T0 = 1. */
function crossingTimes(accel: (x: number) => number, theta0: number, stepsPerPeriod: number, periods: number): number[] {
  const h = 1 / stepsPerPeriod;
  const out: number[] = [];
  let x = theta0;
  let v = 0;
  for (let i = 0; i < stepsPerPeriod * periods; i++) {
    const [nx, nv] = rk4Step(x, v, h, accel);
    if (nx === 0 || x > 0 !== nx > 0) out.push(i * h + (h * x) / (x - nx));
    x = nx;
    v = nv;
  }
  return out;
}

/** The phase at `t`, interpolated through the anchors (0, 0) and (c_k, π/2 + kπ). */
function phaseAt(crossings: readonly number[], t: number): number {
  let prevT = 0;
  let prevPhase = 0;
  for (let k = 0; k < crossings.length; k++) {
    const c = crossings[k]!;
    const phase = Math.PI / 2 + k * Math.PI;
    if (t <= c) return prevPhase + ((phase - prevPhase) * (t - prevT)) / (c - prevT);
    prevT = c;
    prevPhase = phase;
  }
  return Number.NaN;
}

/**
 * The time, in units of T0, at which the MEASURED phase lead of the linear
 * oscillator over the pendulum first reaches `tolerance` rad, both integrated
 * by RK4 at `stepsPerPeriod` steps of T0.
 *
 * @returns NaN if the drift does not reach `tolerance` within 2^16 periods.
 * @internal
 */
export function measurePhaseHorizon(theta0: number, tolerance: number, stepsPerPeriod: number): number {
  const w2 = TWO_PI ** 2;
  for (let periods = 16; periods <= 2 ** 16; periods *= 2) {
    const pend = crossingTimes((x) => -w2 * Math.sin(x), theta0, stepsPerPeriod, periods);
    const lin = crossingTimes((x) => -w2 * x, theta0, stepsPerPeriod, periods);
    let prevT = 0;
    let prevDrift = 0;
    for (let k = 0; k < pend.length; k++) {
      const c = pend[k]!;
      const drift = phaseAt(lin, c) - (Math.PI / 2 + k * Math.PI);
      if (!Number.isFinite(drift)) break;
      if (drift >= tolerance) return prevT + ((tolerance - prevDrift) * (c - prevT)) / (drift - prevDrift);
      prevT = c;
      prevDrift = drift;
    }
  }
  return Number.NaN;
}

/** `t* = Δ T0 (1+ε)/(2π ε)`; `Infinity` at ε = 0, where no phase accumulates. */
function phaseHorizon(eps: number, tolerance: number, T0: number | undefined): number {
  if (T0 === undefined || !Number.isFinite(T0) || T0 <= 0 || !Number.isFinite(eps) || eps < 0) return Number.NaN;
  return eps === 0 ? Infinity : (tolerance * T0 * (1 + eps)) / (TWO_PI * eps);
}

const W7P_THETA0 = 0.2;
const W7P_TOLERANCE = 1;

/** @internal */
export const PENDULUM_PHASE_TRANSLATION: ObservableTranslation = {
  bridgeId: 'ab-pendulum-linear',
  observable: 'phase',
  unit: 'rad',
  fromNorm: 'relative period error, normalized by the value of the reduced model',
  definition:
    'the angle variable of each motion (0 at release from rest at θ0, 2π per period); the error is the ' +
    "linear oscillator's lead over the pendulum, Δφ(t) = 2πt/T0 − 2πt/T",
  derivation:
    'with ε = T/T0 − 1, Δφ(t) = 2π (t/T0) ε/(1+ε), exact in ε; it reaches Δ at t* = Δ T0 (1+ε)/(2π ε). ' +
    'ε/(1+ε) increases with ε, so the domain supremum of ε gives the shortest horizon over the domain',
  premises: [
    'both motions are released from rest at the same θ0 at t = 0',
    'T0 = 2π √(ℓ/g) is the linear period, in the unit t is given in',
  ],
  parameters: ['T0'],
  timeUnit: 'the unit of T0',
  errorAt: (eps, t, { T0 }) => {
    if (T0 === undefined || !Number.isFinite(T0) || T0 <= 0 || !Number.isFinite(eps) || !Number.isFinite(t)) return Number.NaN;
    return (TWO_PI * (t / T0) * eps) / (1 + eps);
  },
  horizonFor: (eps, tolerance, { T0 }) => phaseHorizon(eps, tolerance, T0),
  boundary: 'inclusive: adequate iff t ≤ t*, i.e. Δφ(t) ≤ the tolerance',
  notCovered: [
    'the pointwise position error |θ(t) − θ_lin(t)| (the waveform carries a third harmonic ≈ θ0³/192 that is not a phase)',
    'the amplitude',
  ],
  witnesses: [
    {
      id: 'W7p',
      kind: 'numeric',
      test: 'tests/atlas/pendulum-phase-translation.test.ts',
      tolerance: `RK4-measured time to ${W7P_TOLERANCE} rad of phase drift at θ0 = ${W7P_THETA0} within 1e-4 T0 of t*`,
    },
  ],
  checks: [
    {
      id: 'W7p',
      evaluate: (stepsPerPeriod) => measurePhaseHorizon(W7P_THETA0, W7P_TOLERANCE, stepsPerPeriod),
      target: phaseHorizon(pendulumPeriodErrorAt({ theta0: W7P_THETA0 }), W7P_TOLERANCE, 1),
      coarseResolution: 50,
      fineResolution: 200,
      tolerance: 1e-4,
    },
  ],
};
