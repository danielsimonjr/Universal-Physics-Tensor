/**
 * Quantity nodes for BE-66, BE-67, and BE-68.
 *
 * Names are new. `mass-density` is the cosmological node. `temperature`
 * and `hawking-temperature` are the thermal nodes be-42 already uses.
 * Reusing either name would join these edges to a different law.
 *
 * @module composition/quantities/applied-physicist
 */
import type { Quantity } from '../quantity.js';
import { DIMENSIONLESS, TEMPERATURE, VELOCITY } from '../../dimensional/types.js';
import { ENERGY_DENSITY, MASS_DENSITY } from './_dims.js';

/** Intensity [M T⁻³] (W/m²). */
const INTENSITY = { L: 0, M: 1, T: -3, I: 0, Theta: 0, N: 0, J: 0 } as const;
/** Magnetic flux density [M T⁻² I⁻¹] (tesla). */
const MAGNETIC_FLUX_DENSITY = { L: 0, M: 1, T: -2, I: -1, Theta: 0, N: 0, J: 0 } as const;

const CLASSICAL_EM = { scale: 'classical', force: 'electromagnetic' } as const;
const CLASSICAL_GRAV = { scale: 'classical', force: 'gravitational' } as const;

/** Time-averaged Poynting-flux magnitude. Not the canonical `CE-poynting-flux` node. */
export const poyntingFluxQ: Quantity = {
  name: 'poynting-flux',
  symbol: 'I',
  dim: INTENSITY,
  attributes: CLASSICAL_EM,
};

/** Intensity reflectance of an opaque surface. */
export const reflectanceQ: Quantity = {
  name: 'reflectance',
  symbol: 'R',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Angle from the outward normal, radians. */
export const incidenceAngleQ: Quantity = {
  name: 'incidence-angle',
  symbol: 'θ',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Normal radiation pressure. Not the hydrostatic `pressure` node. */
export const radiationPressureQ: Quantity = {
  name: 'radiation-pressure',
  symbol: 'P_n',
  dim: ENERGY_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Magnetic flux density of the background field. */
export const magneticFluxDensityQ: Quantity = {
  name: 'magnetic-flux-density',
  symbol: 'B',
  dim: MAGNETIC_FLUX_DENSITY,
  attributes: CLASSICAL_EM,
};

/**
 * Total plasma mass density. Not `mass-density` (cosmological, gravitational).
 * Proton-only density is a caller-supplied value of this same quantity.
 */
export const plasmaMassDensityQ: Quantity = {
  name: 'plasma-mass-density',
  symbol: 'ρ',
  dim: MASS_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Alfvén speed. Not `gravitational-wave-speed`. */
export const alfvenSpeedQ: Quantity = {
  name: 'alfven-speed',
  symbol: 'v_A',
  dim: VELOCITY,
  attributes: CLASSICAL_EM,
};

/** Proper temperature on a static metric. Not `temperature` and not `hawking-temperature`. */
export const properTemperatureQ: Quantity = {
  name: 'proper-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_GRAV,
};

/** Static metric component `g_00`, dimensionless, negative. */
export const metricG00Q: Quantity = {
  name: 'metric-g00',
  symbol: 'g_00',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_GRAV,
};

/** Tolman–Ehrenfest invariant `T √(−g_00)`. Dimension temperature. */
export const tolmanInvariantQ: Quantity = {
  name: 'tolman-invariant',
  symbol: 'T√(−g_00)',
  dim: TEMPERATURE,
  attributes: CLASSICAL_GRAV,
};
