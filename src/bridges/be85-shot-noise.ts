/**
 * BE-85 — one-sided shot noise,
 *   S_I = 2 e I.
 *
 * In a window of length T the count N has mean (I/e) T, and the Poisson
 * premise is Var(N) = mean(N). Charge e scales the variance by e² and
 * the windowed current divides by T, so Var(I) = e I / T. The one-sided
 * bandwidth of that window is Δf = 1/(2 T), and S_I = Var(I)/Δf is
 * 2 e I. The two-sided bandwidth Δf = 1/T gives e I. `e` is the
 * elementary charge. Not a Fourier theorem and not Johnson–Nyquist.
 *
 * The overlay formalRef is `PhysJS.ShotNoise.shot_eq`.
 *
 * @module bridges/be85-shot-noise
 */
import { E_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateShotNoise}.
 * @internal
 */
export interface ShotNoiseInputs {
  /**
   * Current in the Poisson mean N = (I/e) T, amperes. The theorem is
   * linear in I. It does not take the absolute value.
   */
  readonly I_A: number;
}

/**
 * Result of {@link evaluateShotNoise}.
 * @internal
 */
export interface ShotNoiseResult {
  readonly I_A: number;
  /** One-sided current spectral density, amperes squared per hertz. */
  readonly S_I_A2_per_Hz: number;
}

/**
 * Evaluate the one-sided spectrum `S_I = 2 e I`.
 *
 * `e` is the elementary charge. The two-sided convention e I is not
 * this result.
 *
 * @internal
 */
export function evaluateShotNoise({ I_A }: ShotNoiseInputs): ShotNoiseResult {
  if (!Number.isFinite(I_A)) {
    throw new Error('evaluateShotNoise: I_A must be finite');
  }
  const S_I_A2_per_Hz = 2 * E_SI * I_A;
  return { I_A, S_I_A2_per_Hz };
}
