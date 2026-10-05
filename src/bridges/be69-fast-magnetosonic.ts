/**
 * BE-69 — perpendicular fast magnetosonic phase speed,
 *   |ω/k| = √(c_s² + B²/(μ0 ρ)),
 * from the linearized ideal-MHD premises in
 * `PhysJS.FastMagnetosonic.speed_eq`. `c_s = 0` recovers the Alfvén
 * number of a different polarization. That recovery is not an
 * identification with BE-67.
 *
 * `μ0` is `1/(ε0 c²)`, the same product the Alfvén evaluator uses.
 * The nested `perpendicularQuartic` theorem is not this function.
 *
 * @module bridges/be69-fast-magnetosonic
 */
import { MU0_SI } from '../dimensional/formula-names.js';

/**
 * Inputs for {@link evaluateFastMagnetosonic}.
 * @internal
 */
export interface FastMagnetosonicInputs {
  /** Sound speed, m/s. Zero is the Alfvén number of this polarization. */
  readonly cs_m_per_s: number;
  /** Magnetic flux density, tesla. The formula uses `B²`. */
  readonly B_T: number;
  /** Total mass density, kg/m³. */
  readonly rho_kg_per_m3: number;
}

/**
 * Result of {@link evaluateFastMagnetosonic}.
 * @internal
 */
export interface FastMagnetosonicResult {
  readonly cs_m_per_s: number;
  readonly B_T: number;
  readonly rho_kg_per_m3: number;
  /** Phase speed, m/s. */
  readonly v_m_per_s: number;
}

/**
 * Evaluate `√(c_s² + B²/(μ0 ρ))`.
 *
 * @internal
 */
export function evaluateFastMagnetosonic({
  cs_m_per_s,
  B_T,
  rho_kg_per_m3,
}: FastMagnetosonicInputs): FastMagnetosonicResult {
  if (!Number.isFinite(cs_m_per_s) || cs_m_per_s < 0) {
    throw new Error('evaluateFastMagnetosonic: cs_m_per_s must be finite and ≥ 0');
  }
  if (!Number.isFinite(B_T)) {
    throw new Error('evaluateFastMagnetosonic: B_T must be finite');
  }
  if (!Number.isFinite(rho_kg_per_m3) || rho_kg_per_m3 <= 0) {
    throw new Error('evaluateFastMagnetosonic: rho_kg_per_m3 must be finite and > 0');
  }
  const v_m_per_s = Math.sqrt(cs_m_per_s * cs_m_per_s + (B_T * B_T) / (MU0_SI * rho_kg_per_m3));
  return { cs_m_per_s, B_T, rho_kg_per_m3, v_m_per_s };
}
