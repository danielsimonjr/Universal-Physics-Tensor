/**
 * BE-99 — intrinsic carrier density from Boltzmann tails,
 *   n_i = √(N_c N_v) exp(−E_g / (2 k_B T)).
 *
 * The tails n = N_c exp(−(E_c−μ)/(k_B T)) and
 * p = N_v exp(−(μ−E_v)/(k_B T)), with E_g = E_c − E_v, multiply to
 * N_c N_v exp(−E_g/(k_B T)). That product is the square of n_i.
 * Dropping the 2 in the exponent is a different density. The tails
 * are hypotheses. Not a Fermi–Dirac integral.
 *
 * The overlay formalRef is `PhysJS.MassAction.mass_action`.
 *
 * @module bridges/be99-mass-action
 */
import { K_B_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateMassAction}.
 * @internal
 */
export interface MassActionInputs {
  /** Conduction-band effective density of states, per cubic metre. */
  readonly N_c_per_m3: number;
  /** Valence-band effective density of states, per cubic metre. */
  readonly N_v_per_m3: number;
  /** Gap E_c − E_v, joules. */
  readonly E_g_J: number;
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
}

/**
 * Result of {@link evaluateMassAction}.
 * @internal
 */
export interface MassActionResult {
  readonly N_c_per_m3: number;
  readonly N_v_per_m3: number;
  readonly E_g_J: number;
  readonly T_K: number;
  /** Intrinsic density, per cubic metre. */
  readonly n_i_per_m3: number;
}

/**
 * Evaluate the mass-action intrinsic density. The 2 in the exponent stays.
 *
 * @internal
 */
export function evaluateMassAction({
  N_c_per_m3,
  N_v_per_m3,
  E_g_J,
  T_K,
}: MassActionInputs): MassActionResult {
  if (!Number.isFinite(N_c_per_m3) || N_c_per_m3 <= 0) {
    throw new Error('evaluateMassAction: N_c_per_m3 must be finite and > 0');
  }
  if (!Number.isFinite(N_v_per_m3) || N_v_per_m3 <= 0) {
    throw new Error('evaluateMassAction: N_v_per_m3 must be finite and > 0');
  }
  if (!Number.isFinite(E_g_J)) {
    throw new Error('evaluateMassAction: E_g_J must be finite');
  }
  if (!Number.isFinite(T_K) || T_K <= 0) {
    throw new Error('evaluateMassAction: T_K must be finite and > 0');
  }
  const n_i_per_m3 = Math.sqrt(N_c_per_m3 * N_v_per_m3) * Math.exp(-E_g_J / (2 * K_B_SI * T_K));
  return { N_c_per_m3, N_v_per_m3, E_g_J, T_K, n_i_per_m3 };
}
