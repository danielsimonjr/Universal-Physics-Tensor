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
// Named-dimension constants: one owner for each shape. The atlas families and
// the canonical entries each spelled PRESSURE, SPRING_CONSTANT, CAPACITANCE,
// INDUCTANCE, RESISTANCE, THERMAL_CONDUCTIVITY, SPECIFIC_HEAT, VISCOSITY,
// VOLUME, PERMITTIVITY, MOMENTUM and ELECTRIC_FIELD by exponents; those shapes
// are named here, as are LINEAR_DENSITY, WAVENUMBER, DIFFUSIVITY, ENERGY_FLUX,
// GRAVITATIONAL_CONSTANT and RESISTIVITY, each stated by exponents in two or
// more of those modules. A shape named here is NOT a row of NAMED_DIMENSIONS unless
// `format()` is meant to print its name: adding a row changes every printed
// dimension of that shape.
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
/** Volume, cubic metre. */
export const VOLUME:        Dimension = { L: 3, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
/** Momentum, kilogram metre per second. */
export const MOMENTUM:      Dimension = { L: 1, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
/** Pressure, pascal. */
export const PRESSURE:      Dimension = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
/** Spring constant, newton per metre. */
export const SPRING_CONSTANT: Dimension = { L: 0, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
/** Dynamic viscosity, pascal second. */
export const VISCOSITY:     Dimension = { L: -1, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
/** Linear mass density, kilogram per metre. */
export const LINEAR_DENSITY: Dimension = { L: -1, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
/** Wavenumber (any inverse length: a spatial frequency, a turn density), per metre. */
export const WAVENUMBER:    Dimension = { L: -1, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
/** Diffusivity (mass, thermal or momentum), square metre per second. */
export const DIFFUSIVITY:   Dimension = { L: 2, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
/** Energy flux density (power per area: intensity, a Poynting or radiative flux), watt per square metre. */
export const ENERGY_FLUX:   Dimension = { L: 0, M: 1, T: -3, I: 0, Theta: 0, N: 0, J: 0 };
/** The dimension of Newton's constant G, cubic metre per kilogram second squared. */
export const GRAVITATIONAL_CONSTANT: Dimension = { L: 3, M: -1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

// --- Thermodynamics ---
export const TEMPERATURE:   Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 1, N: 0, J: 0 };
export const ENTROPY:       Dimension = { L: 2, M: 1, T: -2, I: 0, Theta: -1, N: 0, J: 0 }; // J/K
/** Thermal conductivity, watt per metre kelvin. */
export const THERMAL_CONDUCTIVITY: Dimension = { L: 1, M: 1, T: -3, I: 0, Theta: -1, N: 0, J: 0 };
/** Specific heat capacity, joule per kilogram kelvin. */
export const SPECIFIC_HEAT: Dimension = { L: 2, M: 0, T: -2, I: 0, Theta: -1, N: 0, J: 0 };

// --- Electromagnetism (SI) ---
export const CHARGE:        Dimension = { L: 0, M: 0, T: 1, I: 1, Theta: 0, N: 0, J: 0 }; // coulomb = A·s
/** Capacitance, farad. */
export const CAPACITANCE:   Dimension = { L: -2, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 };
/** Inductance, henry. */
export const INDUCTANCE:    Dimension = { L: 2, M: 1, T: -2, I: -2, Theta: 0, N: 0, J: 0 };
/** Resistance, ohm. */
export const RESISTANCE:    Dimension = { L: 2, M: 1, T: -3, I: -2, Theta: 0, N: 0, J: 0 };
/** Permittivity, farad per metre. */
export const PERMITTIVITY:  Dimension = { L: -3, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 };
/** Electric field, volt per metre. */
export const ELECTRIC_FIELD: Dimension = { L: 1, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 };
/** Electrical resistivity, ohm metre. */
export const RESISTIVITY:   Dimension = { L: 3, M: 1, T: -3, I: -2, Theta: 0, N: 0, J: 0 };

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
