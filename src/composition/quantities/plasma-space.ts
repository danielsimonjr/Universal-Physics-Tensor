/**
 * Quantity nodes for BE-103 through BE-125.
 *
 * Names are new. Reusing `temperature`, `sound-speed`, `resistivity`, or
 * `magnetic-flux-density` would join these edges to those nodes.
 *
 * @module composition/quantities/plasma-space
 */
import type { Quantity } from '../quantity.js';
import { CHARGE, DIMENSIONLESS, FREQUENCY, LENGTH, MASS, TEMPERATURE, TIME, VELOCITY } from '../../dimensional/types.js';
import { ENERGY_DIM, INV_LENGTH, MASS_DENSITY, NUMBER_DENSITY, RESISTIVITY } from './_dims.js';

const CLASSICAL = { scale: 'classical', force: 'electromagnetic' } as const;
const TESLA = { L: 0, M: 1, T: -2, I: -1, Theta: 0, N: 0, J: 0 } as const;
const AMPERE = { L: 0, M: 0, T: 0, I: 1, Theta: 0, N: 0, J: 0 } as const;
const E_FIELD = { L: 1, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 } as const;
const GRAD_B = { L: -1, M: 1, T: -2, I: -1, Theta: 0, N: 0, J: 0 } as const;
const CONDUCTIVITY = { L: -3, M: -1, T: 3, I: 2, Theta: 0, N: 0, J: 0 } as const;
const REACTIVITY = { L: 3, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 } as const;
const N_TAU = { L: -3, M: 0, T: 1, I: 0, Theta: 0, N: 0, J: 0 } as const;

const q = (name: string, symbol: string, dim: Quantity['dim']): Quantity => ({
  name,
  symbol,
  dim,
  attributes: CLASSICAL,
});

export const bohmElectronTemperatureQ = q('bohm-electron-temperature', 'T_e', TEMPERATURE);
export const bohmIonMassQ = q('bohm-ion-mass', 'm_i', MASS);
export const bohmIonSpeedQ = q('bohm-ion-speed', 'u_0', VELOCITY);

export const ionAcousticWavenumberQ = q('ion-acoustic-wavenumber', 'k', INV_LENGTH);
export const ionAcousticSoundQ = q('ion-acoustic-sound', 'c_s', VELOCITY);
export const ionAcousticDebyeQ = q('ion-acoustic-debye', 'λ_De', LENGTH);
export const ionAcousticFrequencyQ = q('ion-acoustic-frequency', 'ω', FREQUENCY);

export const upperHybridDensityQ = q('upper-hybrid-density', 'n', NUMBER_DENSITY);
export const upperHybridFieldQ = q('upper-hybrid-field', 'B', TESLA);
export const upperHybridMassQ = q('upper-hybrid-mass', 'm', MASS);
export const upperHybridFrequencyQ = q('upper-hybrid-frequency', 'ω_UH', FREQUENCY);

export const cutoffCyclotronQ = q('cutoff-cyclotron', 'ω_c', FREQUENCY);
export const cutoffPlasmaQ = q('cutoff-plasma', 'ω_p', FREQUENCY);
export const cutoffRFrequencyQ = q('cutoff-r-frequency', 'ω_R', FREQUENCY);

export const lowerHybridIonPlasmaQ = q('lower-hybrid-ion-plasma', 'ω_pi', FREQUENCY);
export const lowerHybridIonCyclotronQ = q('lower-hybrid-ion-cyclotron', 'ω_ci', FREQUENCY);
export const lowerHybridElectronCyclotronQ = q('lower-hybrid-electron-cyclotron', 'ω_ce', FREQUENCY);
export const lowerHybridFrequencyQ = q('lower-hybrid-frequency', 'ω_LH', FREQUENCY);

export const obliqueSoundQ = q('oblique-sound', 'c_s', VELOCITY);
export const obliqueAlfvenQ = q('oblique-alfven', 'v_A', VELOCITY);
export const obliqueAngleQ = q('oblique-angle', 'θ', DIMENSIONLESS);
export const obliqueFastSpeedQ = q('oblique-fast-speed', 'v_+', VELOCITY);

export const bennettLineDensityQ = q('bennett-line-density', 'N', INV_LENGTH);
export const bennettTemperatureQ = q('bennett-temperature', 'T', TEMPERATURE);
export const bennettCurrentQ = q('bennett-current', 'I', AMPERE);

export const lossConeThroatQ = q('loss-cone-throat', 'B_0', TESLA);
export const lossConeMirrorQ = q('loss-cone-mirror', 'B_m', TESLA);
export const lossConePitchQ = q('loss-cone-pitch', 'sin²θ_lc', DIMENSIONLESS);

export const gradbMassQ = q('gradb-mass', 'm', MASS);
export const gradbPerpSpeedQ = q('gradb-perp-speed', 'v_⊥', VELOCITY);
export const gradbGradientQ = q('gradb-gradient', '|∇B|', GRAD_B);
export const gradbChargeQ = q('gradb-charge', 'q', CHARGE);
export const gradbFieldQ = q('gradb-field', 'B', TESLA);
export const gradbDriftQ = q('gradb-drift', 'v_∇B', VELOCITY);

export const exbFieldXQ = q('exb-field-x', 'E_x', E_FIELD);
export const exbFieldYQ = q('exb-field-y', 'E_y', E_FIELD);
export const exbFieldQ = q('exb-field', 'B', TESLA);
export const exbSpeedQ = q('exb-speed', 'v_E', VELOCITY);

export const landauOmegaQ = q('landau-omega', 'ω', FREQUENCY);
export const landauWavenumberQ = q('landau-wavenumber', 'k', INV_LENGTH);
export const landauThermalQ = q('landau-thermal', 'v_t', VELOCITY);
export const landauGammaQ = q('landau-gamma', 'γ', FREQUENCY);

export const debyeSphereDensityQ = q('debye-sphere-density', 'n', NUMBER_DENSITY);
export const debyeSphereLengthQ = q('debye-sphere-length', 'λ_D', LENGTH);
export const debyeSphereArgumentQ = q('debye-sphere-argument', 'Λ', DIMENSIONLESS);

export const multiDebye1Q = q('multi-debye-1', 'λ_1', LENGTH);
export const multiDebye2Q = q('multi-debye-2', 'λ_2', LENGTH);
export const multiDebyeLengthQ = q('multi-debye-length', 'λ_D', LENGTH);

export const lorentzChargeStateQ = q('lorentz-charge-state', 'Z', DIMENSIONLESS);
export const lorentzCoulombLogQ = q('lorentz-coulomb-log', 'lnΛ', DIMENSIONLESS);
export const lorentzTemperatureQ = q('lorentz-temperature', 'T', TEMPERATURE);
export const lorentzMassQ = q('lorentz-mass', 'm', MASS);
export const lorentzResistivityQ = q('lorentz-resistivity', 'η', RESISTIVITY);

export const slabConductivityQ = q('slab-conductivity', 'σ', CONDUCTIVITY);
export const slabWidthQ = q('slab-width', 'L', LENGTH);
export const slabTimeQ = q('slab-time', 'τ', TIME);

export const parkerSoundQ = q('parker-sound', 'c_s', VELOCITY);
export const parkerMassQ = q('parker-mass', 'M', MASS);
export const parkerRadiusQ = q('parker-radius', 'r_c', LENGTH);

export const spiralOmegaQ = q('spiral-omega', 'Ω', FREQUENCY);
export const spiralRadiusQ = q('spiral-radius', 'r', LENGTH);
export const spiralColatitudeQ = q('spiral-colatitude', 'θ', DIMENSIONLESS);
export const spiralRadialSpeedQ = q('spiral-radial-speed', 'v_r', VELOCITY);
export const spiralRatioQ = q('spiral-ratio', 'B_φ/B_r', DIMENSIONLESS);

export const standoffFieldQ = q('standoff-field', 'B_E', TESLA);
export const standoffDensityQ = q('standoff-density', 'ρ', MASS_DENSITY);
export const standoffSpeedQ = q('standoff-speed', 'v', VELOCITY);
export const standoffSixthQ = q('standoff-sixth', '(R/R_E)^6', DIMENSIONLESS);

export const lawsonTemperatureQ = q('lawson-temperature', 'T', TEMPERATURE);
export const lawsonReactivityQ = q('lawson-reactivity', '⟨σv⟩', REACTIVITY);
export const lawsonEnergyQ = q('lawson-energy', 'E', ENERGY_DIM);
export const lawsonProductQ = q('lawson-product', 'nτ', N_TAU);

export const probeElectronMassQ = q('probe-electron-mass', 'm_e', MASS);
export const probeIonMassQ = q('probe-ion-mass', 'm_i', MASS);
export const probePotentialRatioQ = q('probe-potential-ratio', 'eΦ/kT', DIMENSIONLESS);

export const crossFieldAlphaQ = q('cross-field-alpha', 'α', DIMENSIONLESS);
export const crossFieldRatioQ = q('cross-field-ratio', 'D_⊥/D_∥', DIMENSIONLESS);

export const firehoseBetaParallelQ = q('firehose-beta-parallel', 'β_∥', DIMENSIONLESS);
export const firehoseBetaPerpQ = q('firehose-beta-perp', 'β_⊥', DIMENSIONLESS);
export const firehoseMarginQ = q('firehose-margin', 'β_∥−β_⊥', DIMENSIONLESS);

export const mirrorBetaPerpQ = q('mirror-beta-perp', 'β_⊥', DIMENSIONLESS);
export const mirrorTPerpQ = q('mirror-t-perp', 'T_⊥', TEMPERATURE);
export const mirrorTParallelQ = q('mirror-t-parallel', 'T_∥', TEMPERATURE);
export const mirrorMarginQ = q('mirror-margin', 'β_⊥(T_⊥/T_∥−1)', DIMENSIONLESS);
