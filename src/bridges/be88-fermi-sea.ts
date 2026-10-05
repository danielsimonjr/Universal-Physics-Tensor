/**
 * BE-88 — two-spin Fermi sphere,
 *   k_F = (3 π² n)^{1/3},
 *   E_F = ℏ² k_F² / (2 m*),
 *   v_F = ℏ k_F / m*.
 *
 * Two spin states times the sphere (4π/3) k_F³/(2π)³ give n, so
 * k_F³ = 3 π² n. One spin is k_F³ = 6 π² n. The isotropic parabola
 * is a hypothesis, and so are the band, the two-spin count, and
 * T = 0. Not a lattice band. ℏ⁻² times the second derivative of
 * that parabola is 1/m*; this evaluator does not return that curvature.
 *
 * The overlay formalRef is `PhysJS.FermiSea.fermi_sea`.
 *
 * @module bridges/be88-fermi-sea
 */
import { HBAR_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateFermiSea}.
 * @internal
 */
export interface FermiSeaInputs {
  /** Number density of electrons, per cubic metre. */
  readonly n_per_m3: number;
  /** Isotropic effective mass, kilograms. */
  readonly m_kg: number;
}

/**
 * Result of {@link evaluateFermiSea}.
 * @internal
 */
export interface FermiSeaResult {
  readonly n_per_m3: number;
  readonly m_kg: number;
  /** Fermi wavevector, per metre. */
  readonly k_F_per_m: number;
  /** Fermi energy on the isotropic parabola, joules. */
  readonly E_F_J: number;
  /** Fermi velocity, metres per second. */
  readonly v_F_m_per_s: number;
}

/**
 * Evaluate the two-spin Fermi sphere and the isotropic parabola at k_F.
 *
 * @internal
 */
export function evaluateFermiSea({ n_per_m3, m_kg }: FermiSeaInputs): FermiSeaResult {
  if (!Number.isFinite(n_per_m3) || n_per_m3 <= 0) {
    throw new Error('evaluateFermiSea: n_per_m3 must be finite and > 0');
  }
  if (!Number.isFinite(m_kg) || m_kg <= 0) {
    throw new Error('evaluateFermiSea: m_kg must be finite and > 0');
  }
  const k_F_per_m = (3 * Math.PI ** 2 * n_per_m3) ** (1 / 3);
  const E_F_J = (HBAR_SI ** 2 * k_F_per_m ** 2) / (2 * m_kg);
  const v_F_m_per_s = (HBAR_SI * k_F_per_m) / m_kg;
  return { n_per_m3, m_kg, k_F_per_m, E_F_J, v_F_m_per_s };
}
