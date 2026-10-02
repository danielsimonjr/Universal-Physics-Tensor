/**
 * Bridge Equation 42 — Hawking temperature (canonical 1975 derivation,
 * post Wave Y reformulation).
 *
 *   T_H = ℏ c³ / (8π G M k_B)
 *
 * The temperature scale at which the firewall paradox lives: a black
 * hole of mass M radiates a thermal Hawking spectrum at temperature
 * T_H, and the firewall question concerns whether an infalling
 * observer encounters a fiery transition at the horizon. The
 * reformulated BE-42 encodes the temperature scalar; the firewall
 * complement-principle quantum-state superposition `|ψ⟩ = α|smooth⟩
 * + β|firewall⟩` is the AST-unencodable bridge framing that motivates
 * BE-42's catalog placement.
 *
 * Reference: Hawking 1975 *Commun. Math. Phys.* 43:199 (canonical
 * derivation of the Hawking temperature from quantum-field-theory in
 * Schwarzschild background); Bardeen-Carter-Hawking 1973 *Commun.
 * Math. Phys.* 31:161 (the four laws of black-hole mechanics that
 * pre-figure thermodynamic interpretation).
 *
 * Status: highly-speculative.
 *
 * Honest-claude scope notes:
 *   - The Hawking temperature itself is canonical; the original BE-42
 *     framing (firewall complement principle as a quantum-state
 *     superposition) is the AST-unencodable speculative element.
 *   - Numerical bracket: solar-mass black hole (M = 1.989×10³⁰ kg)
 *     gives T_H ≈ 6.17×10⁻⁸ K — the textbook Hawking temperature for
 *     a stellar-mass BH (Wald *General Relativity* Eq. 14.3.7;
 *     Birrell-Davies *Quantum Fields in Curved Space* §8.1).
 *   - Dim check: [ℏ c³] = [J·s · m³/s³] = [J·m³/s²] = [M L⁵ T⁻⁴];
 *     [G M k_B] = [m³/(kg·s²)] · [kg] · [J/K] = [J·m³/(s²·K)] =
 *     [M L⁵ T⁻⁴ Θ⁻¹]. Ratio = [Θ] ✓.
 *
 * @see docs/specification/Part-II.md ("Bridge Equation 42")
 * @see src/bridges/index.ts BRIDGE_EQUATIONS.find(e => e.id === 42)
 * @module bridges/equations/be-42-hawking-temperature
 */

import type { ExprNode, DimensionValidationReport } from '../../dimensional/validator.js';
import {
  DIMENSIONLESS,
  MASS,
  TEMPERATURE,
} from '../../dimensional/types.js';
import {
  hbar as DIM_hbar,
  c as DIM_c,
  G as DIM_G,
  k_B as DIM_kB,
} from '../../dimensional/constants.js';
import { PhysicalConstants } from '../../core/types.js';
import { sym, validateFiniteInputs, validateBEDimensions } from './_be-helpers.js';

/**
 * RHS of the Hawking temperature:
 *   T_H = ℏ c³ / (8π G M k_B)
 *
 * Encoded as `ℏ · c³ / (8π · G · M · k_B)`.
 */
export const BE42_HAWKING_TEMPERATURE_RHS: ExprNode = {
  kind: 'op', op: '/',
  args: [
    {
      // numerator: ℏ · c³
      kind: 'op', op: '*',
      args: [
        sym('hbar', DIM_hbar),
        {
          kind: 'op', op: '^',
          args: [sym('c', DIM_c), sym('3', DIMENSIONLESS)],
        },
      ],
    },
    {
      // denominator: 8π · G · M · k_B
      kind: 'op', op: '*',
      args: [
        sym('8pi', DIMENSIONLESS),
        sym('G', DIM_G),
        sym('M', MASS),
        sym('k_B', DIM_kB),
      ],
    },
  ],
};

/** LHS: T_H has dimension [temperature]. */
/** @internal */
export const BE42_HAWKING_TEMPERATURE_LHS: ExprNode = sym('T_H', TEMPERATURE);

// --- Numerical evaluator ---

export interface HawkingTemperatureInputs {
  /** Black-hole mass M (kg). Must be > 0 and finite. */
  M_kg: number;
}

/**
 * Evaluate the Hawking temperature
 *
 *   T_H = ℏ c³ / (8π G M k_B)
 *
 * @returns Hawking temperature in K (SI).
 * @throws {RangeError} when `M_kg` is not a finite positive number, or when
 *   the SI evaluation overflows to a non-finite temperature. A non-finite
 *   return would become `null` under `JSON.stringify`.
 */
export function evaluateHawkingTemperature(input: HawkingTemperatureInputs): number {
  validateFiniteInputs(
    input,
    [{ name: 'M_kg', min: 0, excludeMin: true }],
    'evaluateHawkingTemperature',
  );
  const { M_kg } = input;
  const { hbar, c, G, kB } = PhysicalConstants;
  const temperature = (hbar * c * c * c) / (8 * Math.PI * G * M_kg * kB);
  if (!Number.isFinite(temperature)) {
    throw new RangeError(
      `evaluateHawkingTemperature: T_H is not a finite number for M_kg=${M_kg} (the SI evaluation overflowed to ${temperature}).`,
    );
  }
  return temperature;
}

// --- Self-validation ---

/**
 * Run the AST through the dimensional analyzer; both sides should be
 * [temperature].
 */
/** @internal */
export function validateBE42Dimensions(): DimensionValidationReport {
  return validateBEDimensions(
    BE42_HAWKING_TEMPERATURE_LHS,
    BE42_HAWKING_TEMPERATURE_RHS,
    'BE42',
  );
}
