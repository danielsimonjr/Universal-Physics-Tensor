/**
 * SI dimensional types.
 *
 * Base dimensions per BIPM SI Brochure, 9th edition (2019), Table 3:
 *   length L, mass M, time T, electric current I, thermodynamic temperature Theta,
 *   amount of substance N, luminous intensity J.
 *
 * Named-dimension constants below are derived per NIST SP 811 (2008) §4
 * (derived SI units) and standard physics references:
 *   - Goldstein, "Classical Mechanics" 3rd ed.
 *   - Sakurai, "Modern Quantum Mechanics" 2nd ed.
 *   - Wald, "General Relativity" (1984)
 *
 * All exponents are stored as `number` (allowing rational e.g. 1/2 if needed).
 *
 * @module dimensional/types
 */

export interface Dimension {
  /** Length (metre, m). */
  L: number;
  /** Mass (kilogram, kg). */
  M: number;
  /** Time (second, s). */
  T: number;
  /** Electric current (ampere, A). */
  I: number;
  /** Thermodynamic temperature (kelvin, K). */
  Theta: number;
  /** Amount of substance (mole, mol). */
  N: number;
  /** Luminous intensity (candela, cd). */
  J: number;
}

export const DIMENSIONLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

// --- Mechanics ---
//
// Named-dimension constants are exported only when there is at least one
// real consumer (a bridge encoding, a constant, or an active test). The
// previously-exported VOLUME, MOMENTUM, ANGULAR_MOMENTUM, PRESSURE,
// DENSITY, VOLTAGE, ELECTRIC_FIELD, MAGNETIC_FIELD were unreferenced and
// were removed 2026-05-04 per simplifier F-01 (no flexibility/configura-
// bility that wasn't requested). Re-add them precisely when a bridge
// encoding or test references them.
export const LENGTH:        Dimension = { L: 1, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
export const AREA:          Dimension = { L: 2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
export const TIME:          Dimension = { L: 0, M: 0, T: 1, I: 0, Theta: 0, N: 0, J: 0 };
export const FREQUENCY:     Dimension = { L: 0, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
export const MASS:          Dimension = { L: 0, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
/** Mass density, kilogram per cubic metre. */
export const MASS_DENSITY:  Dimension = { L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
export const VELOCITY:      Dimension = { L: 1, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
export const ACCELERATION:  Dimension = { L: 1, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
export const FORCE:         Dimension = { L: 1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 }; // newton
export const ENERGY:        Dimension = { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 }; // joule
export const POWER:         Dimension = { L: 2, M: 1, T: -3, I: 0, Theta: 0, N: 0, J: 0 }; // watt
export const ACTION:        Dimension = { L: 2, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 }; // J·s

// --- Thermodynamics ---
export const TEMPERATURE:   Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 1, N: 0, J: 0 };
export const ENTROPY:       Dimension = { L: 2, M: 1, T: -2, I: 0, Theta: -1, N: 0, J: 0 }; // J/K

// --- Electromagnetism (SI) ---
export const CHARGE:        Dimension = { L: 0, M: 0, T: 1, I: 1, Theta: 0, N: 0, J: 0 }; // coulomb = A·s

// --- Curated lookup table for `format()` to recognize named SI dimensions. ---
// Order matters only for tie-breaks; the first matching name wins.
export const NAMED_DIMENSIONS: ReadonlyArray<readonly [string, Dimension]> = [
  ['dimensionless', DIMENSIONLESS],
  ['length', LENGTH],
  ['area', AREA],
  ['time', TIME],
  ['frequency', FREQUENCY],
  ['mass', MASS],
  ['velocity', VELOCITY],
  ['acceleration', ACCELERATION],
  // action carries the same SI shape (J·s) as angular momentum; we keep
  // 'action' as the canonical name since hbar (the only consumer today)
  // is action-typed.
  ['action', ACTION],
  ['force', FORCE],
  ['energy', ENERGY],
  ['power', POWER],
  ['temperature', TEMPERATURE],
  ['entropy', ENTROPY],
  ['charge', CHARGE],
];
