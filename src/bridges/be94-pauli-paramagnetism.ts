/**
 * BE-94 — Pauli paramagnetism for a √E density of states,
 *   χ_P = μ₀ μ_B² (3 n) / (2 E_F).
 *
 * The Zeeman imbalance M = μ_B² g(E_F) B is a hypothesis, and
 * χ_P = μ₀ M/B is μ₀ μ_B² g(E_F). dos_factor supplies
 * g(E_F) = (3/2) n/E_F. A flat density leaves the factor 1,
 * χ_P = μ₀ μ_B² n/E_F. Not Landau diamagnetism. μ_B is an input.
 *
 * The overlay formalRef is `PhysJS.PauliParamagnetism.pauli`.
 *
 * @module bridges/be94-pauli-paramagnetism
 */
import { MU0_SI } from '../dimensional/formula-names.js';

/**
 * Inputs for {@link evaluatePauliParamagnetism}.
 * @public
 */
export interface PauliParamagnetismInputs {
  /** Electron number density, per cubic metre. */
  readonly n_per_m3: number;
  /** Fermi energy, joules. */
  readonly E_F_J: number;
  /** Bohr magneton, joules per tesla. */
  readonly muB_J_per_T: number;
}

/**
 * Result of {@link evaluatePauliParamagnetism}.
 * @public
 */
export interface PauliParamagnetismResult {
  readonly n_per_m3: number;
  readonly E_F_J: number;
  readonly muB_J_per_T: number;
  /** Dimensionless Pauli susceptibility. */
  readonly chi_P: number;
}

/**
 * Evaluate the √E Pauli susceptibility. Not χ_L = −χ_P/3.
 *
 * @public
 */
export function evaluatePauliParamagnetism({
  n_per_m3,
  E_F_J,
  muB_J_per_T,
}: PauliParamagnetismInputs): PauliParamagnetismResult {
  if (!Number.isFinite(n_per_m3) || n_per_m3 <= 0) {
    throw new Error('evaluatePauliParamagnetism: n_per_m3 must be finite and > 0');
  }
  if (!Number.isFinite(E_F_J) || E_F_J <= 0) {
    throw new Error('evaluatePauliParamagnetism: E_F_J must be finite and > 0');
  }
  if (!Number.isFinite(muB_J_per_T) || muB_J_per_T <= 0) {
    throw new Error('evaluatePauliParamagnetism: muB_J_per_T must be finite and > 0');
  }
  const chi_P = (MU0_SI * muB_J_per_T ** 2 * 3 * n_per_m3) / (2 * E_F_J);
  return { n_per_m3, E_F_J, muB_J_per_T, chi_P };
}
