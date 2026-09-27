/**
 * `ab-spring-lc`'s declaration that its map carries the PHASE unchanged, so
 * `ab-pendulum-linear`'s phase translation holds on the path
 * pendulum → spring → LC.
 *
 * The bridge's composed map is q(t_LC) = (q0/x0)·x(t) with t_LC = t·ω_s/ω_LC.
 * The charge is a fixed nonzero multiple of the displacement at the mapped
 * time, so the two share every zero crossing and turning point, and the angle
 * variable (0 at release from rest, 2π per period, uniform in time) of the
 * circuit at t_LC equals the spring's at t. A phase error against the spring
 * at t is therefore the same phase error against the circuit at t_LC: nothing
 * is added and nothing truncated.
 *
 * This is a claim about the phase only. It says nothing about the position
 * error — x and q are different quantities in different units, and a bound in
 * rad on the angle does not become one on the charge — so `ab-spring-lc`
 * declares no carriage for `position`.
 *
 * The witness W1φ integrates the two oscillators of W1a (m = 2, k = 8,
 * x0 = 0.37 and L = 0.5, C = 0.25, q0 = −1.9: ω_s = 2, ω_LC = 2√2, and a
 * NEGATIVE ratio q0/x0) by RK4 at the same step in physical time, and
 * compares the circuit's phase at the mapped time with the spring's at every
 * spring zero crossing. The angle variable of each motion is measured from its
 * own release, so the sign of q0/x0 does not enter.
 *
 * @module atlas/oscillators/phase-carriage
 * @internal
 */

import type { ObservableCarriage } from '../translation.js';
import type { NumericWitnessSpec } from '../witness-numeric.js';
import { phaseAt, rk4Step } from './pendulum-motion.js';

const [M, K, L, C, X0, Q0] = [2, 8, 0.5, 0.25, 0.37, -1.9];
const OMEGA_S = Math.sqrt(K / M);
const OMEGA_LC = Math.sqrt(1 / (L * C));
const SPRING_PERIODS = 20;

/** Zero crossings of u″ = −ω²u from rest at `u0`, stepping `h` in the oscillator's own time. */
function crossings(omega: number, u0: number, h: number, tEnd: number): number[] {
  const out: number[] = [];
  let x = u0;
  let v = 0;
  const w2 = omega * omega;
  for (let i = 0; i * h < tEnd; i++) {
    const [nx, nv] = rk4Step(x, v, h, (s) => -w2 * s);
    if (nx === 0 || x > 0 !== nx > 0) out.push(i * h + (h * x) / (x - nx));
    x = nx;
    v = nv;
  }
  return out;
}

/**
 * max over the spring's zero crossings c_k of |φ_LC(timeScale · c_k) − (π/2 + kπ)|,
 * both integrated at `stepsPerSpringPeriod` steps of the spring's period.
 * @internal
 */
export function measureCarriedPhaseError(stepsPerSpringPeriod: number, timeScale: number): number {
  const tSpring = SPRING_PERIODS * ((2 * Math.PI) / OMEGA_S);
  const h = (2 * Math.PI) / OMEGA_S / stepsPerSpringPeriod;
  const spring = crossings(OMEGA_S, X0, h, tSpring);
  const lc = crossings(OMEGA_LC, Q0, h, tSpring * Math.max(1, timeScale) + 1);
  let worst = 0;
  for (let k = 0; k < spring.length; k++) {
    worst = Math.max(worst, Math.abs(phaseAt(lc, timeScale * spring[k]!) - (Math.PI / 2 + k * Math.PI)));
  }
  return worst;
}

const W1PHI: NumericWitnessSpec = {
  id: 'W1φ',
  evaluate: (steps) => measureCarriedPhaseError(steps, OMEGA_S / OMEGA_LC),
  target: 0,
  coarseResolution: 100,
  fineResolution: 400,
  tolerance: 1e-6,
};

/** @internal */
export const SPRING_LC_PHASE_CARRIAGE: ObservableCarriage = {
  bridgeId: 'ab-spring-lc',
  observable: 'phase',
  map: 'the circuit\'s angle variable at t_LC = t·ω_s/ω_LC is the spring\'s at t, because q(t_LC) = (q0/x0)·x(t)',
  derivation:
    'a fixed nonzero multiple of the displacement at the mapped time shares its zero crossings and turning points, so the ' +
    'angle variable is the same function of the mapped time; a phase error against the spring at t is the same ' +
    'error against the circuit at t_LC, exactly',
  premises: [
    'the circuit is released from rest: q(0) = q0, i(0) = 0 (either sign of q0/x0: each phase is measured from its own release)',
    'lossless and unforced (the bridge\'s own side conditions)',
  ],
  timeMap: 't is read on the spring\'s clock (the unit of T0); the circuit is read at t·ω_s/ω_LC, the same t when LC = m/k',
  witnesses: [
    {
      id: 'W1φ',
      kind: 'numeric',
      test: 'tests/atlas/spring-lc-phase-carriage.test.ts',
      tolerance: `RK4 circuit phase at the mapped time within 1e-6 rad of the spring's at every crossing over ${SPRING_PERIODS} spring periods (W1a's m = 2, k = 8, x0 = 0.37; L = 0.5, C = 0.25, q0 = −1.9)`,
    },
  ],
  checks: [W1PHI],
};
