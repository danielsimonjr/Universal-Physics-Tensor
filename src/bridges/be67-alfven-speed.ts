/**
 * BE-67 — Alfvén speed in SI,
 *   v_A = B / √(μ0 ρ),
 * with `ρ` the total mass density. Proton-only density `n m_p` is the
 * named special case {@link alfvenProtonOnlyDensity}, not the default.
 *
 * `C = 1` is the SI hypothesis. Units do not fix it. The Gaussian
 * `1/√(4π)` is a unit dictionary and is not a second evaluator.
 *
 * Unproven. There is no PhysJS key and no `formalRef`.
 *
 * @module bridges/be67-alfven-speed
 */
import { MU0_SI } from '../dimensional/formula-names.js';

/**
 * Proton mass, kg. The same CODATA value stored privately by BE-64.
 * @public
 */
export const M_PROTON_SI = 1.67262192369e-27;

/** @public */
export interface AlfvenInputs {
  /** Magnetic flux density, tesla. */
  readonly B_T: number;
  /** Total mass density, kg/m³. Not a number density. */
  readonly rho_kg_per_m3: number;
}

/** @public */
export interface AlfvenResult {
  readonly B_T: number;
  readonly rho_kg_per_m3: number;
  /** Alfvén speed, m/s. */
  readonly v_m_per_s: number;
}

/**
 * Proton-only mass density `n m_p`. The caller passes the result as
 * `rho_kg_per_m3`. A number density passed in place of a mass density
 * is not this function.
 *
 * @public
 */
export function alfvenProtonOnlyDensity(n_per_m3: number): number {
  if (!Number.isFinite(n_per_m3) || n_per_m3 < 0) {
    throw new Error('alfvenProtonOnlyDensity: n_per_m3 must be finite and ≥ 0');
  }
  return n_per_m3 * M_PROTON_SI;
}

/**
 * Evaluate `v_A = B / √(μ0 ρ)` with `ρ` the supplied total mass density.
 *
 * @public
 */
export function evaluateAlfvenSpeed({ B_T, rho_kg_per_m3 }: AlfvenInputs): AlfvenResult {
  if (!Number.isFinite(B_T) || B_T < 0) {
    throw new Error('evaluateAlfvenSpeed: B_T must be finite and ≥ 0');
  }
  if (!Number.isFinite(rho_kg_per_m3) || rho_kg_per_m3 <= 0) {
    throw new Error('evaluateAlfvenSpeed: rho_kg_per_m3 must be finite and > 0');
  }
  const v_m_per_s = B_T / Math.sqrt(MU0_SI * rho_kg_per_m3);
  return { B_T, rho_kg_per_m3, v_m_per_s };
}
