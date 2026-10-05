/**
 * BE-101 — Berezinskii–Kosterlitz–Thouless unbinding from energy and entropy,
 *   k_B T = π J / 2.
 *
 * The phase gradient of a θ = φ vortex integrates to π J ln(R/a)
 * between the core and radius R. The entropy hypothesis is the area
 * of core positions, S = k_B ln((R/a)²) = 2 k_B ln(R/a). The free
 * energy E − T S vanishes at a radius past the core only when
 * k_B T = π J/2. Circumference entropy unbinds at π J. J is the
 * stiffness in the vortex energy. Not the renormalization-group flow.
 *
 * The overlay formalRef is `PhysJS.BktJump.bkt_jump`.
 *
 * @module bridges/be101-bkt-jump
 */
import { K_B_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateBktJump}.
 * @internal
 */
export interface BktJumpInputs {
  /** Vortex stiffness, joules. */
  readonly J_J: number;
}

/**
 * Result of {@link evaluateBktJump}.
 * @internal
 */
export interface BktJumpResult {
  readonly J_J: number;
  /** Unbinding temperature, kelvin. */
  readonly T_K: number;
}

/**
 * Evaluate T = π J / (2 k_B). Not the RG flow and not π J / k_B.
 *
 * @internal
 */
export function evaluateBktJump({ J_J }: BktJumpInputs): BktJumpResult {
  if (!Number.isFinite(J_J) || J_J <= 0) {
    throw new Error('evaluateBktJump: J_J must be finite and > 0');
  }
  const T_K = (Math.PI * J_J) / (2 * K_B_SI);
  return { J_J, T_K };
}
