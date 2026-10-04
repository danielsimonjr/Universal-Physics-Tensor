/**
 * Quantity nodes for BE-66 through BE-76.
 *
 * Names are new. `mass-density` is the cosmological node. `temperature`
 * and `hawking-temperature` are the thermal nodes be-42 already uses.
 * Reusing either name would join these edges to a different law.
 * BE-72 does not reuse `metric-g00` or `proper-temperature`: those are
 * BE-68, and the frequency ratio is not the Tolman invariant.
 * BE-69 does not reuse `alfven-speed`: `c_s = 0` recovers that number
 * for a different polarization.
 *
 * @module composition/quantities/applied-physicist
 */
import type { Quantity } from '../quantity.js';
import { DIMENSIONLESS, LENGTH, TEMPERATURE, VELOCITY } from '../../dimensional/types.js';
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

/** Sound speed of the compressional closure. Not `alfven-speed`. */
export const soundSpeedQ: Quantity = {
  name: 'sound-speed',
  symbol: 'c_s',
  dim: VELOCITY,
  attributes: CLASSICAL_EM,
};

/** Perpendicular fast magnetosonic phase speed. Not `alfven-speed`. */
export const fastMagnetosonicSpeedQ: Quantity = {
  name: 'fast-magnetosonic-speed',
  symbol: '|ω/k|',
  dim: VELOCITY,
  attributes: CLASSICAL_EM,
};

const ELECTRICAL_MOBILITY = { L: 0, M: -1, T: 2, I: 1, Theta: 0, N: 0, J: 0 } as const;
/** Diffusivity [L² T⁻¹]. */
const DIFFUSIVITY = { L: 2, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;

/** Electrical mobility, drift speed per electric field. */
export const electricalMobilityQ: Quantity = {
  name: 'electrical-mobility',
  symbol: 'μ',
  dim: ELECTRICAL_MOBILITY,
  attributes: CLASSICAL_EM,
};

/** Temperature in the Einstein relation. Not `temperature` and not `proper-temperature`. */
export const einsteinTemperatureQ: Quantity = {
  name: 'einstein-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Carrier charge in the Einstein relation. Not the constant `e`. */
export const carrierChargeQ: Quantity = {
  name: 'carrier-charge',
  symbol: 'q',
  dim: { L: 0, M: 0, T: 1, I: 1, Theta: 0, N: 0, J: 0 },
  attributes: CLASSICAL_EM,
};

/** Diffusivity `D = μ k_B T / q`. */
export const diffusivityQ: Quantity = {
  name: 'diffusivity',
  symbol: 'D',
  dim: DIFFUSIVITY,
  attributes: CLASSICAL_EM,
};

const CLASSICAL_PHASE = { scale: 'classical', force: 'emergent' } as const;
/** Specific latent heat [L² T⁻²] (J/kg). */
const SPECIFIC_ENERGY = { L: 2, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 } as const;
/** Specific volume [L³ M⁻¹]. */
const SPECIFIC_VOLUME = { L: 3, M: -1, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
/** Pressure per temperature. */
const CLAPEYRON_SLOPE = { L: -1, M: 1, T: -2, I: 0, Theta: -1, N: 0, J: 0 } as const;

/**
 * Specific latent heat `L = T (s2 − s1)`, joules per kilogram.
 * Not `latent-heat`: that node is the energy `Q = m L`.
 */
export const latentHeatQ: Quantity = {
  name: 'specific-latent-heat',
  symbol: 'L',
  dim: SPECIFIC_ENERGY,
  attributes: CLASSICAL_PHASE,
};

/** Temperature on the coexistence curve. Not `temperature`. */
export const clapeyronTemperatureQ: Quantity = {
  name: 'clapeyron-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_PHASE,
};

/** Specific-volume change `v2 − v1`. */
export const specificVolumeChangeQ: Quantity = {
  name: 'specific-volume-change',
  symbol: 'Δv',
  dim: SPECIFIC_VOLUME,
  attributes: CLASSICAL_PHASE,
};

/** Clapeyron slope `dP/dT`. */
export const clapeyronSlopeQ: Quantity = {
  name: 'clapeyron-slope',
  symbol: 'dP/dT',
  dim: CLAPEYRON_SLOPE,
  attributes: CLASSICAL_PHASE,
};

/**
 * Static `g_00` of the first redshift observer. Not `metric-g00`.
 * Sharing that name would let BE-72 compose into BE-68.
 */
export const redshiftMetricG00OneQ: Quantity = {
  name: 'redshift-metric-g00-1',
  symbol: 'g_1',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_GRAV,
};

/** Static `g_00` of the second redshift observer. Not `metric-g00`. */
export const redshiftMetricG00TwoQ: Quantity = {
  name: 'redshift-metric-g00-2',
  symbol: 'g_2',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_GRAV,
};

/** Frequency ratio `ν1/ν2`. Not `tolman-invariant`. */
export const gravitationalFrequencyRatioQ: Quantity = {
  name: 'gravitational-frequency-ratio',
  symbol: 'ν1/ν2',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_GRAV,
};

const SEEBECK = { L: 2, M: 1, T: -3, I: -1, Theta: -1, N: 0, J: 0 } as const;
/** Peltier coefficient, dimension voltage. Not the Josephson `voltage` node. */
const PELTIER = { L: 2, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 } as const;

/** Seebeck coefficient, voltage per temperature. */
export const seebeckCoefficientQ: Quantity = {
  name: 'seebeck-coefficient',
  symbol: 'S',
  dim: SEEBECK,
  attributes: CLASSICAL_EM,
};

/** Temperature in the Kelvin relation. Not `temperature`. */
export const peltierTemperatureQ: Quantity = {
  name: 'peltier-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Isothermal Peltier coefficient `Π = S T`. */
export const peltierCoefficientQ: Quantity = {
  name: 'peltier-coefficient',
  symbol: 'Π',
  dim: PELTIER,
  attributes: CLASSICAL_EM,
};

/**
 * Magnetic pressure `p_B = B²/(2 μ0)`. Not `radiation-pressure` and not
 * the hydrostatic `pressure` node.
 */
export const magneticPressureQ: Quantity = {
  name: 'magnetic-pressure',
  symbol: 'p_B',
  dim: ENERGY_DENSITY,
  attributes: CLASSICAL_EM,
};

/**
 * London penetration depth. The attributes match `effective-mass` and
 * `carrier-density`, the carriers this length screens.
 */
export const londonPenetrationDepthQ: Quantity = {
  name: 'london-penetration-depth',
  symbol: 'λ_L',
  dim: LENGTH,
  attributes: { scale: 'quantum', force: 'electromagnetic', statistics: 'fermionic' },
};

/** Plasma beta `p_gas / p_B`. Dimensionless. Not a plasma-β inequality. */
export const plasmaBetaQ: Quantity = {
  name: 'plasma-beta',
  symbol: 'β',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};
