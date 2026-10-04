/**
 * BE-82 — Shockley diode equation at ideality 1,
 *   I = I_s (exp(e V / (k_B T)) − 1).
 *
 * Quasi-equilibrium multiplies the equilibrium flux by
 * exp(e V / (η k_B T)). Ideality 1 sets η = 1. Detailed balance sets
 * the reverse flux equal to the forward flux at V = 0, and low
 * injection keeps that reverse flux under bias. Zero bias carries zero
 * current. Ideality 2 is not this current when e V ≠ 0. Not a
 * diffusion-length ODE. `e` is the elementary charge.
 *
 * The overlay formalRef is `PhysJS.ShockleyDiode.shockley_eq`.
 *
 * @module bridges/be82-shockley-diode
 */
import { E_SI, K_B_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateShockleyDiode}.
 * @public
 */
export interface ShockleyDiodeInputs {
  /** Saturation current, amperes. */
  readonly I_s_A: number;
  /** Bias voltage, volts. */
  readonly V_volts: number;
  /** Absolute temperature, kelvin. Nonzero. */
  readonly T_K: number;
}

/**
 * Result of {@link evaluateShockleyDiode}.
 * @public
 */
export interface ShockleyDiodeResult {
  readonly I_s_A: number;
  readonly V_volts: number;
  readonly T_K: number;
  /** Diode current, amperes. */
  readonly I_A: number;
}

/**
 * Evaluate `I = I_s (exp(e V / (k_B T)) − 1)` with ideality 1.
 *
 * `e` is the elementary charge. Euler's number is `exp`, not a bare `e`.
 *
 * @public
 */
export function evaluateShockleyDiode({ I_s_A, V_volts, T_K }: ShockleyDiodeInputs): ShockleyDiodeResult {
  if (!Number.isFinite(I_s_A)) {
    throw new Error('evaluateShockleyDiode: I_s_A must be finite');
  }
  if (!Number.isFinite(V_volts)) {
    throw new Error('evaluateShockleyDiode: V_volts must be finite');
  }
  if (!Number.isFinite(T_K) || T_K === 0) {
    throw new Error('evaluateShockleyDiode: T_K must be finite and nonzero');
  }
  const I_A = I_s_A * (Math.exp((E_SI * V_volts) / (K_B_SI * T_K)) - 1);
  return { I_s_A, V_volts, T_K, I_A };
}
