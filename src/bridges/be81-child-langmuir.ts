/**
 * BE-81 — Child–Langmuir current,
 *   J = (4 ε0 / 9) √(2 e / m) V^{3/2} / d².
 *
 * Collisionless energy (1/2) m v² = e φ, J = ρ v, and Poisson
 * φ'' = ρ/ε0 give a current independent of x only for φ ∝ x^{4/3}.
 * The profile φ = V (x/d)^{4/3} has cathode field 0. Poisson is not
 * claimed at x = 0. `e` is the elementary charge. The Mott–Gurney
 * exponent does not cancel. Not a drift-only solid.
 *
 * The overlay formalRef is `PhysJS.ChildLangmuir.current_eq`.
 *
 * @module bridges/be81-child-langmuir
 */
import { E_SI } from '../core/constants.js';
import { EPS0_SI } from '../dimensional/formula-names.js';

/**
 * Inputs for {@link evaluateChildLangmuir}.
 * @public
 */
export interface ChildLangmuirInputs {
  /** Particle mass, kilograms. */
  readonly m_kg: number;
  /** Anode voltage, volts. Must be positive so V^{3/2} is real. */
  readonly V_volts: number;
  /** Gap, metres. */
  readonly d_m: number;
}

/**
 * Result of {@link evaluateChildLangmuir}.
 * @public
 */
export interface ChildLangmuirResult {
  readonly m_kg: number;
  readonly V_volts: number;
  readonly d_m: number;
  /** Current density, amperes per square metre. */
  readonly J_A_per_m2: number;
}

/**
 * Evaluate `J = (4 ε0 / 9) √(2 e / m) V^{3/2} / d²`.
 *
 * `e` is `E_SI`, the elementary charge, not an input and not Euler's
 * number. `ε0` is the vacuum permittivity.
 *
 * @public
 */
export function evaluateChildLangmuir({ m_kg, V_volts, d_m }: ChildLangmuirInputs): ChildLangmuirResult {
  if (!Number.isFinite(m_kg) || m_kg <= 0) {
    throw new Error('evaluateChildLangmuir: m_kg must be finite and > 0');
  }
  if (!Number.isFinite(V_volts) || V_volts <= 0) {
    throw new Error('evaluateChildLangmuir: V_volts must be finite and > 0');
  }
  if (!Number.isFinite(d_m) || d_m <= 0) {
    throw new Error('evaluateChildLangmuir: d_m must be finite and > 0');
  }
  const J_A_per_m2 =
    ((4 * EPS0_SI) / 9) * Math.sqrt((2 * E_SI) / m_kg) * V_volts ** 1.5 / d_m ** 2;
  return { m_kg, V_volts, d_m, J_A_per_m2 };
}
