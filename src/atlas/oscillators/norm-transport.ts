/**
 * `ab-spring-lc`'s declared norm transport: the spring → LC map carries a bound
 * in RELATIVE PERIOD ERROR unchanged. Design:
 * `docs/planning/ADR-transported-norm-composition.md`.
 *
 * The bridge's composed map is q(t_LC) = (q0/x0)·x(t) with t_LC = t·ω_s/ω_LC:
 * an amplitude scale and a uniform time scale. A period is a time, so every
 * period on the spring side is multiplied by the same ω_s/ω_LC on the circuit
 * side, and the ratio T_full/T_reduced − 1 is unchanged. K = 1, with no
 * additive term.
 *
 * Declared in ONE direction and ONE norm:
 *
 * - LC → spring is not declared. The same algebra gives K = 1 there too, but no
 *   witness checks it and no route in the atlas uses it, and a declaration
 *   without its own witness is what the ADR forbids.
 * - The absolute period error (factor ω_s/ω_LC) and the trajectory error
 *   (factor q0/x0, metres to coulombs) are not declared: the map is not an
 *   isometry of either, and a route in those norms stays refused.
 *
 * @module atlas/oscillators/norm-transport
 * @internal
 */

import type { NormTransport } from '../types.js';
import { RELATIVE_PERIOD_NORM } from './norms.js';

/** @internal */
export const SPRING_LC_TRANSPORT_TEST = 'tests/atlas/spring-lc-norm-transport.test.ts';

/**
 * The circuit W1τ integrates in: L = 0.5, C = 0.25 (W1a's circuit), so
 * ω_LC = 2√2 while the spring side's ω_s = 2 — the time map is not the identity.
 * q0 > 0 is the release charge, and θ0 = 0.5 is the edge of ab-pendulum-linear's
 * domain, where its error is largest.
 *
 * @internal
 */
export const W1TAU_FIXTURE = { L: 0.5, C: 0.25, q0: 1e-3, theta0: 0.5, omegaS: 2 } as const;

/** @internal */
export const SPRING_LC_RELATIVE_PERIOD_TRANSPORT: NormTransport = {
  id: 'nt-spring-lc-relative-period',
  fromModel: 'model-spring',
  toModel: 'model-lc',
  from: RELATIVE_PERIOD_NORM,
  to: RELATIVE_PERIOD_NORM,
  K: 1,
  KAt: () => 1,
  domain: "every m, k, L, C > 0 and x0, q0 ≠ 0 (the bridge's side conditions); K is the same constant throughout",
  derivation:
    'q(t_LC) = (q0/x0)·x(t) with t_LC = t·ω_s/ω_LC scales every period by the same ω_s/ω_LC, so a ratio of two ' +
    'periods, T_full/T_reduced − 1, is unchanged: K = 1 and nothing is added',
  timeMap: {
    map: 't_LC = t·ω_s/ω_LC, one constant factor for every t',
    uniform: true,
    horizon:
      'a horizon that reads time only through t/T0 holds unchanged with t read on the circuit clock and ' +
      'T0 = 2π√(LC): a uniform time scale leaves t/T0 invariant',
    restateHorizon: (holds) => holds,
  },
  uniformity: "preserved: K is one constant over the whole domain, so the incoming bound's uniformity holds unchanged",
  witness: {
    id: 'W1τ',
    kind: 'numeric',
    test: SPRING_LC_TRANSPORT_TEST,
    tolerance:
      "RK4 relative period error of the pendulum's image q'' = −ω_LC²(q0/θ0) sin(θ0 q/q0) against the LC period, " +
      'in circuit time (L = 0.5, C = 0.25, ω_LC = 2√2 ≠ ω_s = 2), at 640 steps per LC period within 1e-9 of K ' +
      'times the closed-form elliptic error at θ0 = 0.5; 160 steps is the coarse resolution',
  },
  basis: 'numerically-supported',
};
