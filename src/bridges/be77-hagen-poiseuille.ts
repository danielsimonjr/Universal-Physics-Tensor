/**
 * BE-77 — Hagen–Poiseuille flux,
 *   Q = π R⁴ ΔP / (8 μ L).
 *
 * Steady axisymmetric Newtonian flow with d/dr (r du/dr) = (G/μ) r,
 * centerline slope 0, and no-slip u(R) = 0 integrates to the parabola.
 * G = −ΔP/L. The flux is the integral of that profile. Darcy's
 * definitions then give f_D Re = 64. The Fanning product is 16, and a
 * square duct is a different eigenvalue. Neither is this flux.
 *
 * The overlay formalRef is `PhysJS.HagenPoiseuille.flow_eq`.
 *
 * @module bridges/be77-hagen-poiseuille
 */

/**
 * Inputs for {@link evaluateHagenPoiseuille}.
 * @public
 */
export interface HagenPoiseuilleInputs {
  /** Pipe radius, metres. */
  readonly R_m: number;
  /** Pressure drop along the pipe, pascal. */
  readonly deltaP_Pa: number;
  /** Dynamic viscosity, pascal-seconds. Nonzero. */
  readonly mu_Pa_s: number;
  /** Pipe length, metres. Nonzero. */
  readonly L_m: number;
}

/**
 * Result of {@link evaluateHagenPoiseuille}.
 * @public
 */
export interface HagenPoiseuilleResult {
  readonly R_m: number;
  readonly deltaP_Pa: number;
  readonly mu_Pa_s: number;
  readonly L_m: number;
  /** Volume flux, cubic metres per second. */
  readonly Q_m3_per_s: number;
}

/**
 * Evaluate `Q = π R⁴ ΔP / (8 μ L)`.
 *
 * The 8 is the integral of the no-slip parabola. It is not the Fanning
 * factor 16, and it is not a square-duct eigenvalue.
 *
 * @public
 */
export function evaluateHagenPoiseuille({
  R_m,
  deltaP_Pa,
  mu_Pa_s,
  L_m,
}: HagenPoiseuilleInputs): HagenPoiseuilleResult {
  if (!Number.isFinite(R_m) || R_m <= 0) {
    throw new Error('evaluateHagenPoiseuille: R_m must be finite and > 0');
  }
  if (!Number.isFinite(deltaP_Pa)) {
    throw new Error('evaluateHagenPoiseuille: deltaP_Pa must be finite');
  }
  if (!Number.isFinite(mu_Pa_s) || mu_Pa_s === 0) {
    throw new Error('evaluateHagenPoiseuille: mu_Pa_s must be finite and nonzero');
  }
  if (!Number.isFinite(L_m) || L_m === 0) {
    throw new Error('evaluateHagenPoiseuille: L_m must be finite and nonzero');
  }
  const Q_m3_per_s = (Math.PI * R_m ** 4 * deltaP_Pa) / (8 * mu_Pa_s * L_m);
  return { R_m, deltaP_Pa, mu_Pa_s, L_m, Q_m3_per_s };
}
