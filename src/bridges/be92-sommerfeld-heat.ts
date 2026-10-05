/**
 * BE-92 — electronic heat capacity of a √E density of states,
 *   c_V = (π²/2) n k_B² T / E_F.
 *
 * The Sommerfeld energy correction δU = (π²/6) (k_B T)² g(E_F) is a
 * hypothesis. Its temperature derivative is c_V = (π²/3) k_B² T g(E_F).
 * PhysJS.FermiSea.dos_factor supplies g(E_F) = (3/2) n/E_F, which
 * produces the factor π²/2. A flat density g = n/E_F leaves π²/3.
 * Not the Wiedemann–Franz law and not a second proof of be-61.
 *
 * The overlay formalRef is `PhysJS.SommerfeldHeat.electronic_heat`.
 *
 * @module bridges/be92-sommerfeld-heat
 */
import { K_B_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateSommerfeldHeat}.
 * @internal
 */
export interface SommerfeldHeatInputs {
  /** Electron number density, per cubic metre. */
  readonly n_per_m3: number;
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
  /** Fermi energy, joules. */
  readonly E_F_J: number;
}

/**
 * Result of {@link evaluateSommerfeldHeat}.
 * @internal
 */
export interface SommerfeldHeatResult {
  readonly n_per_m3: number;
  readonly T_K: number;
  readonly E_F_J: number;
  /** Heat capacity per volume, joules per kelvin per cubic metre. */
  readonly c_V_J_per_K_m3: number;
}

/**
 * Evaluate the √E Sommerfeld heat capacity. The flat-density factor is not used.
 *
 * @internal
 */
export function evaluateSommerfeldHeat({ n_per_m3, T_K, E_F_J }: SommerfeldHeatInputs): SommerfeldHeatResult {
  if (!Number.isFinite(n_per_m3) || n_per_m3 <= 0) {
    throw new Error('evaluateSommerfeldHeat: n_per_m3 must be finite and > 0');
  }
  if (!Number.isFinite(T_K) || T_K <= 0) {
    throw new Error('evaluateSommerfeldHeat: T_K must be finite and > 0');
  }
  if (!Number.isFinite(E_F_J) || E_F_J <= 0) {
    throw new Error('evaluateSommerfeldHeat: E_F_J must be finite and > 0');
  }
  const c_V_J_per_K_m3 = ((Math.PI ** 2) / 2) * n_per_m3 * K_B_SI ** 2 * T_K / E_F_J;
  return { n_per_m3, T_K, E_F_J, c_V_J_per_K_m3 };
}
