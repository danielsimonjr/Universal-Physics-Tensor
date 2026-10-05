/**
 * Bridge Equation 56 — Casimir effect (quantum vacuum ↔ classical force).
 *
 * Two neutral, parallel, perfectly-conducting plates in vacuum attract, because
 * the boundary conditions restrict the allowed electromagnetic vacuum modes
 * between them. The ideal zero-temperature force per unit area is
 *
 *     F/A = − π² ℏ c / (240 d⁴),
 *
 * (negative = attractive), d the plate separation. This bridges the QUANTUM
 * vacuum (zero-point field fluctuations) to a CLASSICAL, macroscopic, measurable
 * force. Predicted by Casimir 1948; measured by Lamoreaux 1997 and Mohideen &
 * Roy 1998 (see `be56-casimir-confrontation.ts`).
 *
 * Closed-form evaluator (BE-51/52 pattern; no AST round-trip). Dimensional
 * signature: pressure [L⁻¹ M T⁻²]. Note the REAL experiments use sphere-plate
 * geometry and require finite-conductivity/roughness/temperature corrections —
 * this ideal formula is the leading term, and the confrontation is honest about
 * the corrections (Adam/Eve vet 2026-07-05, Eve YELLOW: systematics-dominated).
 *
 * @module bridges/be56-casimir
 */
import { HBAR_SI, C_SI } from '../core/constants.js';

/** Inputs for the ideal Casimir pressure. @internal */
export interface CasimirInputs {
  /** Plate separation d (m), > 0. */
  readonly d_m: number;
}

/** Result of evaluating the ideal Casimir pressure. @internal */
export interface CasimirResult {
  readonly d_m: number;
  /** Force per unit area F/A = −π²ℏc/(240 d⁴) (Pa; negative = attractive). */
  readonly pressure_Pa: number;
}

/**
 * Evaluate the ideal (perfect-conductor, T=0) Casimir pressure at separation d.
 *
 * @internal
 */
export function evaluateCasimir({ d_m }: CasimirInputs): CasimirResult {
  if (!(d_m > 0)) {
    throw new Error('evaluateCasimir: d_m (plate separation) must be > 0');
  }
  const pressure_Pa = -(Math.PI * Math.PI * HBAR_SI * C_SI) / (240 * d_m ** 4);
  return { d_m, pressure_Pa };
}
