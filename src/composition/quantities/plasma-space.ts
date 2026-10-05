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

/** Bohm electron temperature quantity. */
export const bohmElectronTemperatureQ = q('bohm-electron-temperature', 'T_e', TEMPERATURE);
/** Bohm ion mass quantity. */
export const bohmIonMassQ = q('bohm-ion-mass', 'm_i', MASS);
/** Bohm ion speed quantity. */
export const bohmIonSpeedQ = q('bohm-ion-speed', 'u_0', VELOCITY);

/** Ion acoustic wavenumber quantity. */
export const ionAcousticWavenumberQ = q('ion-acoustic-wavenumber', 'k', INV_LENGTH);
/** Ion acoustic sound quantity. */
export const ionAcousticSoundQ = q('ion-acoustic-sound', 'c_s', VELOCITY);
/** Ion acoustic debye quantity. */
export const ionAcousticDebyeQ = q('ion-acoustic-debye', 'λ_De', LENGTH);
/** Ion acoustic frequency quantity. */
export const ionAcousticFrequencyQ = q('ion-acoustic-frequency', 'ω', FREQUENCY);

/** Upper hybrid density quantity. */
export const upperHybridDensityQ = q('upper-hybrid-density', 'n', NUMBER_DENSITY);
/** Upper hybrid field quantity. */
export const upperHybridFieldQ = q('upper-hybrid-field', 'B', TESLA);
/** Upper hybrid mass quantity. */
export const upperHybridMassQ = q('upper-hybrid-mass', 'm', MASS);
/** Upper hybrid frequency quantity. */
export const upperHybridFrequencyQ = q('upper-hybrid-frequency', 'ω_UH', FREQUENCY);

/** Cutoff cyclotron quantity. */
export const cutoffCyclotronQ = q('cutoff-cyclotron', 'ω_c', FREQUENCY);
/** Cutoff plasma quantity. */
export const cutoffPlasmaQ = q('cutoff-plasma', 'ω_p', FREQUENCY);
/** Cutoff r frequency quantity. */
export const cutoffRFrequencyQ = q('cutoff-r-frequency', 'ω_R', FREQUENCY);

/** Lower hybrid ion plasma quantity. */
export const lowerHybridIonPlasmaQ = q('lower-hybrid-ion-plasma', 'ω_pi', FREQUENCY);
/** Lower hybrid ion cyclotron quantity. */
export const lowerHybridIonCyclotronQ = q('lower-hybrid-ion-cyclotron', 'ω_ci', FREQUENCY);
/** Lower hybrid electron cyclotron quantity. */
export const lowerHybridElectronCyclotronQ = q('lower-hybrid-electron-cyclotron', 'ω_ce', FREQUENCY);
/** Lower hybrid frequency quantity. */
export const lowerHybridFrequencyQ = q('lower-hybrid-frequency', 'ω_LH', FREQUENCY);

/** Oblique sound quantity. */
export const obliqueSoundQ = q('oblique-sound', 'c_s', VELOCITY);
/** Oblique alfven quantity. */
export const obliqueAlfvenQ = q('oblique-alfven', 'v_A', VELOCITY);
/** Oblique angle quantity. */
export const obliqueAngleQ = q('oblique-angle', 'θ', DIMENSIONLESS);
/** Oblique fast speed quantity. */
export const obliqueFastSpeedQ = q('oblique-fast-speed', 'v_+', VELOCITY);

/** Bennett line density quantity. */
export const bennettLineDensityQ = q('bennett-line-density', 'N', INV_LENGTH);
/** Bennett temperature quantity. */
export const bennettTemperatureQ = q('bennett-temperature', 'T', TEMPERATURE);
/** Bennett current quantity. */
export const bennettCurrentQ = q('bennett-current', 'I', AMPERE);

/** Loss cone throat quantity. */
export const lossConeThroatQ = q('loss-cone-throat', 'B_0', TESLA);
/** Loss cone mirror quantity. */
export const lossConeMirrorQ = q('loss-cone-mirror', 'B_m', TESLA);
/** Loss cone pitch quantity. */
export const lossConePitchQ = q('loss-cone-pitch', 'sin²θ_lc', DIMENSIONLESS);

/** Gradb mass quantity. */
export const gradbMassQ = q('gradb-mass', 'm', MASS);
/** Gradb perp speed quantity. */
export const gradbPerpSpeedQ = q('gradb-perp-speed', 'v_⊥', VELOCITY);
/** Gradb gradient quantity. */
export const gradbGradientQ = q('gradb-gradient', '|∇B|', GRAD_B);
/** Gradb charge quantity. */
export const gradbChargeQ = q('gradb-charge', 'q', CHARGE);
/** Gradb field quantity. */
export const gradbFieldQ = q('gradb-field', 'B', TESLA);
/** Gradb drift quantity. */
export const gradbDriftQ = q('gradb-drift', 'v_∇B', VELOCITY);

/** Exb field x quantity. */
export const exbFieldXQ = q('exb-field-x', 'E_x', E_FIELD);
/** Exb field y quantity. */
export const exbFieldYQ = q('exb-field-y', 'E_y', E_FIELD);
/** Exb field quantity. */
export const exbFieldQ = q('exb-field', 'B', TESLA);
/** Exb speed quantity. */
export const exbSpeedQ = q('exb-speed', 'v_E', VELOCITY);

/** Landau omega quantity. */
export const landauOmegaQ = q('landau-omega', 'ω', FREQUENCY);
/** Landau wavenumber quantity. */
export const landauWavenumberQ = q('landau-wavenumber', 'k', INV_LENGTH);
/** Landau thermal quantity. */
export const landauThermalQ = q('landau-thermal', 'v_t', VELOCITY);
/** Landau gamma quantity. */
export const landauGammaQ = q('landau-gamma', 'γ', FREQUENCY);

/** Debye sphere density quantity. */
export const debyeSphereDensityQ = q('debye-sphere-density', 'n', NUMBER_DENSITY);
/** Debye sphere length quantity. */
export const debyeSphereLengthQ = q('debye-sphere-length', 'λ_D', LENGTH);
/** Debye sphere argument quantity. */
export const debyeSphereArgumentQ = q('debye-sphere-argument', 'Λ', DIMENSIONLESS);

/** Multi debye 1 quantity. */
export const multiDebye1Q = q('multi-debye-1', 'λ_1', LENGTH);
/** Multi debye 2 quantity. */
export const multiDebye2Q = q('multi-debye-2', 'λ_2', LENGTH);
/** Multi debye length quantity. */
export const multiDebyeLengthQ = q('multi-debye-length', 'λ_D', LENGTH);

/** Lorentz charge state quantity. */
export const lorentzChargeStateQ = q('lorentz-charge-state', 'Z', DIMENSIONLESS);
/** Lorentz coulomb log quantity. */
export const lorentzCoulombLogQ = q('lorentz-coulomb-log', 'lnΛ', DIMENSIONLESS);
/** Lorentz temperature quantity. */
export const lorentzTemperatureQ = q('lorentz-temperature', 'T', TEMPERATURE);
/** Lorentz mass quantity. */
export const lorentzMassQ = q('lorentz-mass', 'm', MASS);
/** Lorentz resistivity quantity. */
export const lorentzResistivityQ = q('lorentz-resistivity', 'η', RESISTIVITY);

/** Slab conductivity quantity. */
export const slabConductivityQ = q('slab-conductivity', 'σ', CONDUCTIVITY);
/** Slab width quantity. */
export const slabWidthQ = q('slab-width', 'L', LENGTH);
/** Slab time quantity. */
export const slabTimeQ = q('slab-time', 'τ', TIME);

/** Parker sound quantity. */
export const parkerSoundQ = q('parker-sound', 'c_s', VELOCITY);
/** Parker mass quantity. */
export const parkerMassQ = q('parker-mass', 'M', MASS);
/** Parker radius quantity. */
export const parkerRadiusQ = q('parker-radius', 'r_c', LENGTH);

/** Spiral omega quantity. */
export const spiralOmegaQ = q('spiral-omega', 'Ω', FREQUENCY);
/** Spiral radius quantity. */
export const spiralRadiusQ = q('spiral-radius', 'r', LENGTH);
/** Spiral colatitude quantity. */
export const spiralColatitudeQ = q('spiral-colatitude', 'θ', DIMENSIONLESS);
/** Spiral radial speed quantity. */
export const spiralRadialSpeedQ = q('spiral-radial-speed', 'v_r', VELOCITY);
/** Spiral ratio quantity. */
export const spiralRatioQ = q('spiral-ratio', 'B_φ/B_r', DIMENSIONLESS);

/** Standoff field quantity. */
export const standoffFieldQ = q('standoff-field', 'B_E', TESLA);
/** Standoff density quantity. */
export const standoffDensityQ = q('standoff-density', 'ρ', MASS_DENSITY);
/** Standoff speed quantity. */
export const standoffSpeedQ = q('standoff-speed', 'v', VELOCITY);
/** Standoff sixth quantity. */
export const standoffSixthQ = q('standoff-sixth', '(R/R_E)^6', DIMENSIONLESS);

/** Lawson temperature quantity. */
export const lawsonTemperatureQ = q('lawson-temperature', 'T', TEMPERATURE);
/** Lawson reactivity quantity. */
export const lawsonReactivityQ = q('lawson-reactivity', '⟨σv⟩', REACTIVITY);
/** Lawson energy quantity. */
export const lawsonEnergyQ = q('lawson-energy', 'E', ENERGY_DIM);
/** Lawson product quantity. */
export const lawsonProductQ = q('lawson-product', 'nτ', N_TAU);

/** Probe electron mass quantity. */
export const probeElectronMassQ = q('probe-electron-mass', 'm_e', MASS);
/** Probe ion mass quantity. */
export const probeIonMassQ = q('probe-ion-mass', 'm_i', MASS);
/** Probe potential ratio quantity. */
export const probePotentialRatioQ = q('probe-potential-ratio', 'eΦ/kT', DIMENSIONLESS);

/** Cross field alpha quantity. */
export const crossFieldAlphaQ = q('cross-field-alpha', 'α', DIMENSIONLESS);
/** Cross field ratio quantity. */
export const crossFieldRatioQ = q('cross-field-ratio', 'D_⊥/D_∥', DIMENSIONLESS);

/** Firehose beta parallel quantity. */
export const firehoseBetaParallelQ = q('firehose-beta-parallel', 'β_∥', DIMENSIONLESS);
/** Firehose beta perp quantity. */
export const firehoseBetaPerpQ = q('firehose-beta-perp', 'β_⊥', DIMENSIONLESS);
/** Firehose margin quantity. */
export const firehoseMarginQ = q('firehose-margin', 'β_∥−β_⊥', DIMENSIONLESS);

/** Mirror beta perp quantity. */
export const mirrorBetaPerpQ = q('mirror-beta-perp', 'β_⊥', DIMENSIONLESS);
/** Mirror t perp quantity. */
export const mirrorTPerpQ = q('mirror-t-perp', 'T_⊥', TEMPERATURE);
/** Mirror t parallel quantity. */
export const mirrorTParallelQ = q('mirror-t-parallel', 'T_∥', TEMPERATURE);
/** Mirror margin quantity. */
export const mirrorMarginQ = q('mirror-margin', 'β_⊥(T_⊥/T_∥−1)', DIMENSIONLESS);
