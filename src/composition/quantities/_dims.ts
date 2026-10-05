/**
 * Shared dimension aliases for the domain-split Quantity modules
 * (`quantities/{quantum,gravitation-cosmology,fields,condensed-matter}.ts` and
 * `quantities-common.ts`). Extracted verbatim from the former `quantities.ts`
 * god-file (2026-06-22 split). Internal to the `quantities/` folder — these are
 * NOT re-exported by the `quantities.ts` barrel (they were module-local consts).
 *
 * @module composition/quantities/_dims
 */
import { FREQUENCY } from '../../dimensional/types.js';
import type { Dimension } from '../../dimensional/types.js';

/** Joule [M L² T⁻²] — local alias for readability. */
export const ENERGY_DIM: Dimension = { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
/** [T⁻¹] alias. */
export const FREQUENCY_DIM = FREQUENCY;
/**
 * Mass-density [M L⁻³] (kg/m³). The dimensional export.
 *
 * @internal
 */
export { MASS_DENSITY } from '../../dimensional/types.js';
/** [T⁻²] (s⁻²) — H² and the c²-rescaled cosmological constant. */
export const T_INV2: Dimension = { L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

// --- v0.11 catalog-full dimension aliases ---

/** [L⁻²] — Ricci scalar / cosmological-constant curvature (inverse area). */
export const INV_AREA: Dimension = { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
/** [L⁻¹] — inverse length (TEE area-law coefficient). */
export const INV_LENGTH: Dimension = { L: -1, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
/** [M L⁻¹ T⁻²] — energy density (stress-energy trace). */
export const ENERGY_DENSITY: Dimension = { L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
/** [L² T⁻¹] — Model A kinetic coefficient (mobility). */
export const MOBILITY: Dimension = { L: 2, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
/** [L³ M T⁻³ I⁻²] — electrical resistivity (Ω·m). */
export const RESISTIVITY: Dimension = { L: 3, M: 1, T: -3, I: -2, Theta: 0, N: 0, J: 0 };
/** [L⁻³] — number density. */
export const NUMBER_DENSITY: Dimension = { L: -3, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
/** [L⁻³ T⁻¹] — number-density rate (Boltzmann dY/dt). */
export const NUMBER_DENSITY_RATE: Dimension = { L: -3, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };
/** [L¹ M¹ T⁻² I⁻¹] — magnetic vector potential A_μ (V·s/m). */
export const VECTOR_POTENTIAL: Dimension = { L: 1, M: 1, T: -2, I: -1, Theta: 0, N: 0, J: 0 };
/** [M² L² T⁻⁴] — squared Einstein-coupling inverse (c⁴/8πG)². */
export const COUPLING_PREFACTOR_SQUARED: Dimension = { L: 2, M: 2, T: -4, I: 0, Theta: 0, N: 0, J: 0 };
/** [T² L⁻⁴] — torsion-contraction scalar T_λμν T^λμν. */
export const TORSION_CONTRACTION: Dimension = { L: -4, M: 0, T: 2, I: 0, Theta: 0, N: 0, J: 0 };
/** [M² L⁻² T⁻²] — squared spin angular-momentum density. */
export const SPIN_DENSITY_SQUARED: Dimension = { L: -2, M: 2, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
/** Energy [M L² T⁻²] — joule (BE-18 VEV/mass, natural-units energy). */
export const ENERGY_DIM2: Dimension = ENERGY_DIM;
/** Electrical conductance [I² T³ M⁻¹ L⁻²] (siemens) — Hall conductance σ_xy. */
export const CONDUCTANCE: Dimension = { L: -2, M: -1, T: 3, I: 2, Theta: 0, N: 0, J: 0 };
/** Electric potential difference [M L² T⁻³ I⁻¹] (volt). */
export const VOLTAGE: Dimension = { L: 2, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 };
/** Energy⁴ [M⁴ L⁸ T⁻⁸] — natural-unit potential density (composite Higgs V). */
export const ENERGY4: Dimension = { L: 8, M: 4, T: -8, I: 0, Theta: 0, N: 0, J: 0 };

/** Canonical node for `boundary-entanglement-entropy`. */
