/**
 * Norm names the oscillator records share, so a bound and the transport that
 * carries it name the same norm by the same string. `boundPath` compares norms
 * verbatim, and a norm spelled twice is a norm that can drift.
 *
 * @module atlas/oscillators/norms
 * @internal
 */

/** The norm `ab-pendulum-linear` states its bound in. @internal */
export const RELATIVE_PERIOD_NORM = 'relative period error, normalized by the value of the reduced model';
