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
 * so it measures the drift without using ε or the elliptic integral. It runs
 * at the fixture θ0 = 0.2 as the regression anchor, and again at the caller's
 * point, bounded to 512 T0 of integration (`phasePointCheck`).
 *
 * @module atlas/oscillators/phase-translation
 * @internal
 */

import type { ObservableTranslation } from '../translation.js';
import { pendulumPeriodErrorAt } from './bridges-limits.js';
import { crossingTimes, linearAccel, pendulumAccel, phaseAt, theta0OfPeriodError } from './pendulum-motion.js';

const TWO_PI = 2 * Math.PI;

/**
 * The time, in units of T0, at which the MEASURED phase lead of the linear
 * oscillator over the pendulum first reaches `tolerance` rad, both integrated
 * by RK4 at `stepsPerPeriod` steps of T0.
 *
 * @returns NaN if the drift does not reach `tolerance` within 2^16 periods.
 * @internal
 */
export function measurePhaseHorizon(theta0: number, tolerance: number, stepsPerPeriod: number): number {
  for (let periods = 16; periods <= 2 ** 16; periods *= 2) {
    const t = measurePhaseHorizonWithin(theta0, tolerance, stepsPerPeriod, periods);
    if (!Number.isNaN(t)) return t;
  }
  return Number.NaN;
}

/** As `measurePhaseHorizon`, over exactly `periods` of T0; NaN if the drift does not reach `tolerance` in them. @internal */
export function measurePhaseHorizonWithin(theta0: number, tolerance: number, stepsPerPeriod: number, periods: number): number {
  const pend = crossingTimes(pendulumAccel, theta0, stepsPerPeriod, periods);
  const lin = crossingTimes(linearAccel, theta0, stepsPerPeriod, periods);
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
  return Number.NaN;
}

/** `t* = Δ T0 (1+ε)/(2π ε)`; `Infinity` at ε = 0, where no phase accumulates. */
function phaseHorizon(eps: number, tolerance: number, T0: number | undefined): number {
  if (T0 === undefined || !Number.isFinite(T0) || T0 <= 0 || !Number.isFinite(eps) || eps < 0) return Number.NaN;
  return eps === 0 ? Infinity : (tolerance * T0 * (1 + eps)) / (TWO_PI * eps);
}

const W7P_THETA0 = 0.2;
const W7P_TOLERANCE = 1;

/** The point witness integrates at most this many periods of T0, so its cost is bounded. */
export const PHASE_POINT_MAX_PERIODS = 512;
/**
 * The point witness measures the time to this much drift, or to the drift
 * reached at the cap if less: the map is linear in t, so its slope is what is
 * checked, whatever tolerance the caller asked about.
 */
const PHASE_POINT_DRIFT = 1;
/**
 * Below this measured drift the crossing-interpolation noise of the two
 * motions (measured: 9.5e-6 relative at 2e-4 rad, 1.2e-7 at 2e-2 rad, at 800
 * steps per T0) comes within a factor of ten of the witness tolerance.
 */
const PHASE_POINT_MIN_DRIFT = 1e-2;
const PHASE_POINT_RELATIVE_TOLERANCE = 1e-5;

/**
 * W7p at the caller's θ0 (recovered from ε) instead of the fixture: the time
 * the measured drift reaches min(1 rad, the drift at the cap), within 1e-5
 * relative of the closed form. Its control is the same measurement against
 * the horizon without the (1+ε) factor, which differs from the target by
 * ε/(1+ε) relative — so the control can fail only where that exceeds the
 * witness tolerance, and the caller is told when it does not.
 */
function phasePointCheck(eps: number): ReturnType<ObservableTranslation['pointCheck']> {
  if (!Number.isFinite(eps) || eps <= 0) return { unavailable: `no phase drift accumulates at ε = ${eps}` };
  const theta0 = theta0OfPeriodError(eps);
  const measured = Math.min(PHASE_POINT_DRIFT, (TWO_PI * PHASE_POINT_MAX_PERIODS * eps) / (1 + eps));
  if (measured < PHASE_POINT_MIN_DRIFT) {
    return {
      unavailable:
        `the drift within ${PHASE_POINT_MAX_PERIODS} T0 at θ0 = ${Number(theta0.toPrecision(8))} is ${measured} rad, below the ` +
        `${PHASE_POINT_MIN_DRIFT} rad this witness resolves; not run`,
    };
  }
  const target = phaseHorizon(eps, measured, 1);
  const periods = Math.ceil(target) + 2;
  const evaluate = (stepsPerPeriod: number): number => measurePhaseHorizonWithin(theta0, measured, stepsPerPeriod, periods);
  const spec = { evaluate, coarseResolution: 200, fineResolution: 800, tolerance: PHASE_POINT_RELATIVE_TOLERANCE * target };
  const capped = measured < PHASE_POINT_DRIFT ? ` (the drift reached in ${PHASE_POINT_MAX_PERIODS} T0)` : '';
  return {
    claim:
      `RK4-measured time to ${measured} rad${capped} of phase drift at θ0 = ${Number(theta0.toPrecision(8))} (recovered from ε) ` +
      `within ${PHASE_POINT_RELATIVE_TOLERANCE} relative of t* = ${target} T0; 200 and 800 steps per T0, ${periods} T0 integrated`,
    check: { id: 'W7p@point', ...spec, target },
    control: { id: 'W7p@point-control', ...spec, target: measured / (TWO_PI * eps) },
    controlClaim: 'the same measurement against the horizon without the (1+ε) factor, Δ T0/(2π ε)',
  };
}

/** @internal */
export const PENDULUM_PHASE_TRANSLATION: ObservableTranslation = {
  bridgeId: 'ab-pendulum-linear',
  observable: 'phase',
  unit: 'rad',
  fromNorm: 'relative period error, normalized by the value of the reduced model',
  errorKind: 'exact',
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
  pointCheck: phasePointCheck,
};
