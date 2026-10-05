/**
 * BE-59 — AC Josephson effect: f = 2eV/h (K_J = 2e/h, the Josephson constant).
 *
 * A Josephson junction biased at DC voltage V emits radiation at frequency
 * f = K_J·V, with K_J = 2e/h — the second quantum electrical standard (the volt),
 * completing the metrology triangle with BE-55 (R_K = h/e², the ohm) and BE-58
 * (k_B via Johnson noise). The factor 2e is the Cooper-pair charge: the effect is
 * a macroscopic quantum coherence of a BOSONIC condensate of Cooper pairs.
 *
 * Post-2019 SI fixes K_J = 483597.8484... GHz/V EXACTLY, so the empirical content
 * is the UNIVERSALITY (junction/material-independence), not the value — confronted
 * accordingly in be59-ac-josephson-confrontation.ts. Adam/Eve vet 2026-07-05:
 * GREEN/GREEN.
 *
 * @module bridges/be59-ac-josephson
 */
import { H_SI, E_SI } from '../core/constants.js';

/** Josephson constant K_J = 2e/h (Hz/V) — exact in the post-2019 SI. @public */
export const JOSEPHSON_CONSTANT_SI = (2 * E_SI) / H_SI;

/** @internal */
export interface ACJosephsonInputs {
  /** DC bias voltage across the junction (volts). */
  readonly V_volts: number;
}
/** @internal */
export interface ACJosephsonResult {
  readonly V_volts: number;
  /** Emitted (Shapiro-step) frequency f = K_J·V (Hz). */
  readonly f_Hz: number;
  /** The Josephson constant K_J = 2e/h (Hz/V). */
  readonly K_J_Hz_per_V: number;
}

/**
 * Evaluate the AC Josephson frequency f = 2eV/h for a bias voltage.
 *
 * @internal
 */
export function evaluateACJosephson({ V_volts }: ACJosephsonInputs): ACJosephsonResult {
  if (!Number.isFinite(V_volts)) {
    throw new Error('evaluateACJosephson: V_volts must be a finite number');
  }
  return {
    V_volts,
    f_Hz: JOSEPHSON_CONSTANT_SI * V_volts,
    K_J_Hz_per_V: JOSEPHSON_CONSTANT_SI,
  };
}
