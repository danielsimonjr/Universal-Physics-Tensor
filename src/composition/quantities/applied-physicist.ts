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

/** Continuum mechanics and pipe flow. Not the electromagnetic nodes above. */
const CLASSICAL_CONTINUUM = { scale: 'classical', force: 'emergent' } as const;

/** Volume flux [L³ T⁻¹]. */
const VOLUME_FLUX = { L: 3, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;
/** Dynamic viscosity [M L⁻¹ T⁻¹]. */
const VISCOSITY = { L: -1, M: 1, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;
/** Second moment of area [L⁴]. */
const AREA_MOMENT = { L: 4, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } as const;
/** Force [M L T⁻²]. */
const FORCE_DIM = { L: 1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 } as const;
/** Stiffness [M T⁻²]. */
const STIFFNESS = { L: 0, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 } as const;
/** Voltage [M L² T⁻³ I⁻¹]. */
const VOLTAGE_DIM = { L: 2, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 } as const;
/** Permittivity [M⁻¹ L⁻³ T⁴ I²]. */
const PERMITTIVITY_DIM = { L: -3, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 } as const;
/** Current density [I L⁻²]. */
const CURRENT_DENSITY = { L: -2, M: 0, T: 0, I: 1, Theta: 0, N: 0, J: 0 } as const;
/** Current [I]. */
const CURRENT_DIM = { L: 0, M: 0, T: 0, I: 1, Theta: 0, N: 0, J: 0 } as const;
/** Resistance [M L² T⁻³ I⁻²]. */
const RESISTANCE_DIM = { L: 2, M: 1, T: -3, I: -2, Theta: 0, N: 0, J: 0 } as const;
/** Seebeck slope [voltage / temperature²]. */
const SEEBECK_SLOPE = { L: 2, M: 1, T: -3, I: -1, Theta: -2, N: 0, J: 0 } as const;
/** Current spectral density [I² T]. */
const CURRENT_PSD = { L: 0, M: 0, T: 1, I: 2, Theta: 0, N: 0, J: 0 } as const;
/** Capacitance [M⁻¹ L⁻² T⁴ I²]. */
const CAPACITANCE_DIM = { L: -2, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 } as const;
/** Mean square voltage [voltage²]. */
const VOLTAGE_SQUARED = { L: 4, M: 2, T: -6, I: -2, Theta: 0, N: 0, J: 0 } as const;

/** Pipe radius. Not a generic `length`. */
export const pipeRadiusQ: Quantity = {
  name: 'pipe-radius',
  symbol: 'R',
  dim: LENGTH,
  attributes: CLASSICAL_CONTINUUM,
};

/** Axial pressure drop of a straight pipe. Not `magnetic-pressure`. */
export const pipePressureDropQ: Quantity = {
  name: 'pipe-pressure-drop',
  symbol: 'ΔP',
  dim: ENERGY_DENSITY,
  attributes: CLASSICAL_CONTINUUM,
};

/** Newtonian dynamic viscosity of the Hagen–Poiseuille balance. */
export const dynamicViscosityQ: Quantity = {
  name: 'dynamic-viscosity',
  symbol: 'μ',
  dim: VISCOSITY,
  attributes: CLASSICAL_CONTINUUM,
};

/** Pipe length. Not `column-length`. */
export const pipeLengthQ: Quantity = {
  name: 'pipe-length',
  symbol: 'L',
  dim: LENGTH,
  attributes: CLASSICAL_CONTINUUM,
};

/** Hagen–Poiseuille volume flux `Q = π R⁴ ΔP / (8 μ L)`. */
export const poiseuilleFlowQ: Quantity = {
  name: 'poiseuille-flow',
  symbol: 'Q',
  dim: VOLUME_FLUX,
  attributes: CLASSICAL_CONTINUUM,
};

/** Young's modulus of a pinned column. */
export const youngsModulusQ: Quantity = {
  name: 'youngs-modulus',
  symbol: 'E',
  dim: ENERGY_DENSITY,
  attributes: CLASSICAL_CONTINUUM,
};

/** Second moment of area. Not a current. */
export const areaMomentQ: Quantity = {
  name: 'area-moment',
  symbol: 'I',
  dim: AREA_MOMENT,
  attributes: CLASSICAL_CONTINUUM,
};

/** Length between pinned ends. Not `pipe-length`. */
export const columnLengthQ: Quantity = {
  name: 'column-length',
  symbol: 'L',
  dim: LENGTH,
  attributes: CLASSICAL_CONTINUUM,
};

/** Lowest pinned–pinned Euler load `π² E I / L²`. */
export const bucklingLoadQ: Quantity = {
  name: 'buckling-load',
  symbol: 'P_cr',
  dim: FORCE_DIM,
  attributes: CLASSICAL_CONTINUUM,
};

/** Linear spring stiffness of a parallel-plate actuator. */
export const pullInStiffnessQ: Quantity = {
  name: 'pull-in-stiffness',
  symbol: 'k',
  dim: STIFFNESS,
  attributes: CLASSICAL_EM,
};

/** Rest gap of a parallel-plate actuator. Not the fold gap. */
export const pullInGapQ: Quantity = {
  name: 'pull-in-gap',
  symbol: 'g_0',
  dim: LENGTH,
  attributes: CLASSICAL_EM,
};

/** Parallel-plate area. Fringing is not this area. */
export const pullInAreaQ: Quantity = {
  name: 'pull-in-area',
  symbol: 'A',
  dim: { L: 2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  attributes: CLASSICAL_EM,
};

/** Pull-in voltage at the fold `g = 2 g0/3`. */
export const pullInVoltageQ: Quantity = {
  name: 'pull-in-voltage',
  symbol: 'V_pi',
  dim: VOLTAGE_DIM,
  attributes: CLASSICAL_EM,
};

/** Permittivity in the Mott–Gurney solid. Not necessarily `ε0`. */
export const mottPermittivityQ: Quantity = {
  name: 'mott-permittivity',
  symbol: 'ε',
  dim: PERMITTIVITY_DIM,
  attributes: CLASSICAL_EM,
};

/** Drift mobility of the Mott–Gurney law. Not `electrical-mobility`. */
export const mottMobilityQ: Quantity = {
  name: 'mott-mobility',
  symbol: 'μ',
  dim: ELECTRICAL_MOBILITY,
  attributes: CLASSICAL_EM,
};

/** Voltage across the Mott–Gurney film. */
export const mottVoltageQ: Quantity = {
  name: 'mott-voltage',
  symbol: 'V',
  dim: VOLTAGE_DIM,
  attributes: CLASSICAL_EM,
};

/** Film thickness. Not the Child–Langmuir gap. */
export const mottThicknessQ: Quantity = {
  name: 'mott-thickness',
  symbol: 'd',
  dim: LENGTH,
  attributes: CLASSICAL_EM,
};

/** Mott–Gurney current density `(9/8) ε μ V² / d³`. */
export const mottGurneyCurrentQ: Quantity = {
  name: 'mott-gurney-current',
  symbol: 'J',
  dim: CURRENT_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Particle mass in the Child–Langmuir law. Not `effective-mass`. */
export const childCarrierMassQ: Quantity = {
  name: 'child-carrier-mass',
  symbol: 'm',
  dim: { L: 0, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  attributes: CLASSICAL_EM,
};

/** Anode voltage of a vacuum diode. */
export const childVoltageQ: Quantity = {
  name: 'child-voltage',
  symbol: 'V',
  dim: VOLTAGE_DIM,
  attributes: CLASSICAL_EM,
};

/** Vacuum-diode gap. Not `mott-thickness`. */
export const childGapQ: Quantity = {
  name: 'child-gap',
  symbol: 'd',
  dim: LENGTH,
  attributes: CLASSICAL_EM,
};

/** Child–Langmuir current density. Not `mott-gurney-current`. */
export const childLangmuirCurrentQ: Quantity = {
  name: 'child-langmuir-current',
  symbol: 'J',
  dim: CURRENT_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Shockley saturation current. */
export const shockleySaturationQ: Quantity = {
  name: 'shockley-saturation',
  symbol: 'I_s',
  dim: CURRENT_DIM,
  attributes: CLASSICAL_EM,
};

/** Diode bias. Not `pull-in-voltage`. */
export const shockleyVoltageQ: Quantity = {
  name: 'shockley-voltage',
  symbol: 'V',
  dim: VOLTAGE_DIM,
  attributes: CLASSICAL_EM,
};

/** Diode temperature. Not `peltier-temperature`. */
export const shockleyTemperatureQ: Quantity = {
  name: 'shockley-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Shockley current at ideality 1. */
export const shockleyCurrentQ: Quantity = {
  name: 'shockley-current',
  symbol: 'I',
  dim: CURRENT_DIM,
  attributes: CLASSICAL_EM,
};

/** Temperature at which the Thomson coefficient is read. Not `peltier-temperature`. */
export const thomsonTemperatureQ: Quantity = {
  name: 'thomson-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** dS/dT. Not the Seebeck coefficient itself. */
export const seebeckSlopeQ: Quantity = {
  name: 'seebeck-slope',
  symbol: 'dS/dT',
  dim: SEEBECK_SLOPE,
  attributes: CLASSICAL_EM,
};

/** Thomson coefficient `μ_T = T dS/dT`. Not `peltier-coefficient`. */
export const thomsonCoefficientQ: Quantity = {
  name: 'thomson-coefficient',
  symbol: 'μ_T',
  dim: SEEBECK,
  attributes: CLASSICAL_EM,
};

/** Inner-pair voltage of a collinear four-point probe. */
export const fourPointVoltageQ: Quantity = {
  name: 'four-point-voltage',
  symbol: 'V',
  dim: VOLTAGE_DIM,
  attributes: CLASSICAL_EM,
};

/** Current of a collinear four-point probe. */
export const fourPointCurrentQ: Quantity = {
  name: 'four-point-current',
  symbol: 'I',
  dim: CURRENT_DIM,
  attributes: CLASSICAL_EM,
};

/** Sheet resistance `(π / ln 2) (V/I)`. Not a conformal crossing. */
export const sheetResistanceQ: Quantity = {
  name: 'sheet-resistance',
  symbol: 'R_s',
  dim: RESISTANCE_DIM,
  attributes: CLASSICAL_EM,
};

/** Current in the Poisson mean of shot noise. */
export const shotCurrentQ: Quantity = {
  name: 'shot-current',
  symbol: 'I',
  dim: CURRENT_DIM,
  attributes: CLASSICAL_EM,
};

/** One-sided shot-noise density `2 e I`. Not Johnson–Nyquist. */
export const shotNoiseQ: Quantity = {
  name: 'shot-noise',
  symbol: 'S_I',
  dim: CURRENT_PSD,
  attributes: CLASSICAL_EM,
};

/** Skin-friction coefficient, already normalized by `ρ U²/2`. */
export const skinFrictionQ: Quantity = {
  name: 'skin-friction',
  symbol: 'C_f',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_CONTINUUM,
};

/** Stanton number at Pr = 1 with matched wall slopes. */
export const stantonNumberQ: Quantity = {
  name: 'stanton-number',
  symbol: 'St',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_CONTINUUM,
};

/** Temperature of the capacitor Boltzmann weight. */
export const capacitorTemperatureQ: Quantity = {
  name: 'capacitor-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Capacitance of one quadratic energy term. */
export const capacitanceQ: Quantity = {
  name: 'capacitance',
  symbol: 'C',
  dim: CAPACITANCE_DIM,
  attributes: CLASSICAL_EM,
};

/** Mean square voltage `k_B T / C`. Not `(3/2) k_B T / C`. */
export const capacitorVoltageVarianceQ: Quantity = {
  name: 'capacitor-voltage-variance',
  symbol: '⟨v²⟩',
  dim: VOLTAGE_SQUARED,
  attributes: CLASSICAL_EM,
};
