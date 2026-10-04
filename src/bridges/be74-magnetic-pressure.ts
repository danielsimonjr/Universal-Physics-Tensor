/**
 * BE-74 — magnetic pressure of a long solenoid,
 *   p_B = B² / (2 μ0).
 *
 * The 2 is the inductor integral U = (L/2) I². Homogeneity in B and μ0
 * only gives p = C B²/μ0. C = 1 is the battery work per volume, not this
 * pressure. `μ0` is `1/(ε0 c²)`, the same product the Alfvén evaluator uses.
 *
 * The overlay formalRef is `PhysJS.MagneticPressure.pressure_eq`.
 *
 * @module bridges/be74-magnetic-pressure
 */
import { MU0_SI } from '../dimensional/formula-names.js';

/**
 * Inputs for {@link evaluateMagneticPressure}.
 * @public
 */
export interface MagneticPressureInputs {
  /** Magnetic flux density, tesla. The formula uses `B²`. */
  readonly B_T: number;
}

/**
 * Result of {@link evaluateMagneticPressure}.
 * @public
 */
export interface MagneticPressureResult {
  readonly B_T: number;
  /** Magnetic pressure, pascal. */
  readonly p_Pa: number;
}

/**
 * Evaluate `p_B = B² / (2 μ0)`.
 *
 * The factor 2 is the stored-energy half of the battery work. It is not
 * recovered from the dimensions of B and μ0.
 *
 * @public
 */
export function evaluateMagneticPressure({ B_T }: MagneticPressureInputs): MagneticPressureResult {
  if (!Number.isFinite(B_T)) {
    throw new Error('evaluateMagneticPressure: B_T must be finite');
  }
  const p_Pa = (B_T * B_T) / (2 * MU0_SI);
  return { B_T, p_Pa };
}
