/**
 * Quantity nodes for BE-88 through BE-102.
 *
 * Names are new. `fermi-energy`, `fermi-velocity`, and `debye-frequency`
 * are canonical nodes whose prefactor is unset. Reusing those names
 * would join these edges to that monomial. `temperature` is the node
 * be-42 already uses. `landauer-erasure-energy` is be-16.
 *
 * @module composition/quantities/condensed-r5
 */
import type { Quantity } from '../quantity.js';
import { DIMENSIONLESS, FREQUENCY, MASS, TEMPERATURE, VELOCITY } from '../../dimensional/types.js';
import { ENERGY_DIM, INV_LENGTH, NUMBER_DENSITY } from './_dims.js';

const CLASSICAL_EM = { scale: 'classical', force: 'electromagnetic' } as const;

/** Heat capacity [M L² T⁻² Θ⁻¹] (J/K). */
const HEAT_CAPACITY = { L: 2, M: 1, T: -2, I: 0, Theta: -1, N: 0, J: 0 } as const;
/** Heat capacity per volume [M L⁻¹ T⁻² Θ⁻¹]. */
const HEAT_CAPACITY_DENSITY = { L: -1, M: 1, T: -2, I: 0, Theta: -1, N: 0, J: 0 } as const;
/** Magnetic moment [L² I] (J/T). */
const MAGNETIC_MOMENT = { L: 2, M: 0, T: 0, I: 1, Theta: 0, N: 0, J: 0 } as const;
/** Magnetic flux density [M T⁻² I⁻¹] (tesla). */
const TESLA = { L: 0, M: 1, T: -2, I: -1, Theta: 0, N: 0, J: 0 } as const;
/** Electric potential [M L² T⁻³ I⁻¹] (volt). */
const VOLT = { L: 2, M: 1, T: -3, I: -1, Theta: 0, N: 0, J: 0 } as const;
/** Electrical conductance [I² T³ M⁻¹ L⁻²] (siemens). */
const SIEMENS = { L: -2, M: -1, T: 3, I: 2, Theta: 0, N: 0, J: 0 } as const;

/** Electron density of the two-spin Fermi sphere. Not the canonical carrier density. */
export const fermiSeaDensityQ: Quantity = {
  name: 'fermi-sea-density',
  symbol: 'n',
  dim: NUMBER_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Isotropic band mass. Not `effective-mass` on the London edge. */
export const fermiSeaMassQ: Quantity = {
  name: 'fermi-sea-mass',
  symbol: 'm*',
  dim: MASS,
  attributes: CLASSICAL_EM,
};

/** Two-spin Fermi wavevector (3 π² n)^{1/3}. One spin is (6 π² n)^{1/3}. */
export const fermiWavevectorQ: Quantity = {
  name: 'fermi-wavevector',
  symbol: 'k_F',
  dim: INV_LENGTH,
  attributes: CLASSICAL_EM,
};

/** Common acoustic speed of the Debye branches. */
export const debyeSoundSpeedQ: Quantity = {
  name: 'debye-sound-speed',
  symbol: 'v_s',
  dim: VELOCITY,
  attributes: CLASSICAL_EM,
};

/** Atom density that the three acoustic branches fill as 3n states. */
export const debyeAtomDensityQ: Quantity = {
  name: 'debye-atom-density',
  symbol: 'n',
  dim: NUMBER_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Debye frequency v_s (6 π² n)^{1/3}. Not the canonical `debye-frequency`. */
export const debyeCutoffFrequencyQ: Quantity = {
  name: 'debye-cutoff-frequency',
  symbol: 'ω_D',
  dim: FREQUENCY,
  attributes: CLASSICAL_EM,
};

/** Number of atoms in the Debye heat capacity. */
export const debyeAtomCountQ: Quantity = {
  name: 'debye-atom-count',
  symbol: 'N',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Temperature in the Debye T³ law. */
export const debyeTemperatureQ: Quantity = {
  name: 'debye-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Debye temperature θ_D. */
export const debyeThetaQ: Quantity = {
  name: 'debye-theta',
  symbol: 'θ_D',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Debye heat capacity (12 π⁴/5) N k_B (T/θ_D)³. The energy prefactor is not this. */
export const debyeHeatCapacityQ: Quantity = {
  name: 'debye-heat-capacity',
  symbol: 'C_V',
  dim: HEAT_CAPACITY,
  attributes: CLASSICAL_EM,
};

/** Number of atoms in the Einstein solid. */
export const einsteinAtomCountQ: Quantity = {
  name: 'einstein-atom-count',
  symbol: 'N',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Temperature of the Einstein oscillators. */
export const einsteinSolidTemperatureQ: Quantity = {
  name: 'einstein-solid-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Einstein temperature θ_E. */
export const einsteinThetaQ: Quantity = {
  name: 'einstein-theta',
  symbol: 'θ_E',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Three-oscillator Einstein heat capacity. One oscillator tends to N k_B. */
export const einsteinHeatCapacityQ: Quantity = {
  name: 'einstein-heat-capacity',
  symbol: 'C_V',
  dim: HEAT_CAPACITY,
  attributes: CLASSICAL_EM,
};

/** Electron density in the Sommerfeld heat capacity. */
export const sommerfeldDensityQ: Quantity = {
  name: 'sommerfeld-density',
  symbol: 'n',
  dim: NUMBER_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Temperature of the Sommerfeld correction. */
export const sommerfeldTemperatureQ: Quantity = {
  name: 'sommerfeld-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Fermi energy supplied to the Sommerfeld formula. Not `fermi-energy`. */
export const sommerfeldFermiEnergyQ: Quantity = {
  name: 'sommerfeld-fermi-energy',
  symbol: 'E_F',
  dim: ENERGY_DIM,
  attributes: CLASSICAL_EM,
};

/** √E Sommerfeld heat capacity per volume. A flat density leaves π²/3. */
export const sommerfeldHeatCapacityQ: Quantity = {
  name: 'sommerfeld-heat-capacity',
  symbol: 'c_V',
  dim: HEAT_CAPACITY_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Moment density in the Curie law. */
export const curieDensityQ: Quantity = {
  name: 'curie-density',
  symbol: 'n',
  dim: NUMBER_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Landé g-factor. */
export const curieGFactorQ: Quantity = {
  name: 'curie-g-factor',
  symbol: 'g',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Spin in ⟨S_z²⟩ = S(S+1)/3. */
export const curieSpinQ: Quantity = {
  name: 'curie-spin',
  symbol: 'S',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Bohr magneton supplied to the Curie law. */
export const curieMagnetonQ: Quantity = {
  name: 'curie-magneton',
  symbol: 'μ_B',
  dim: MAGNETIC_MOMENT,
  attributes: CLASSICAL_EM,
};

/** Temperature in χ = C/(T−θ). */
export const curieTemperatureQ: Quantity = {
  name: 'curie-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Weiss temperature. Zero is C/T. */
export const weissTemperatureQ: Quantity = {
  name: 'weiss-temperature',
  symbol: 'θ',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Curie–Weiss susceptibility. */
export const curieWeissSusceptibilityQ: Quantity = {
  name: 'curie-weiss-susceptibility',
  symbol: 'χ',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Electron density in the Pauli susceptibility. */
export const pauliDensityQ: Quantity = {
  name: 'pauli-density',
  symbol: 'n',
  dim: NUMBER_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Fermi energy supplied to the Pauli formula. */
export const pauliFermiEnergyQ: Quantity = {
  name: 'pauli-fermi-energy',
  symbol: 'E_F',
  dim: ENERGY_DIM,
  attributes: CLASSICAL_EM,
};

/** Bohr magneton supplied to the Pauli formula. */
export const pauliMagnetonQ: Quantity = {
  name: 'pauli-magneton',
  symbol: 'μ_B',
  dim: MAGNETIC_MOMENT,
  attributes: CLASSICAL_EM,
};

/** Pauli susceptibility. Not Landau diamagnetism. */
export const pauliSusceptibilityQ: Quantity = {
  name: 'pauli-susceptibility',
  symbol: 'χ_P',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Ginzburg–Landau parameter of the trial wall. */
export const glKappaQ: Quantity = {
  name: 'gl-kappa',
  symbol: 'κ',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Trial-wall factor (1/κ² − 2). Not the energy of every minimizer. */
export const glTrialFactorQ: Quantity = {
  name: 'gl-trial-factor',
  symbol: '1/κ²−2',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Coherence length in B_c2 = ℏ/(2 e ξ²). Not the BCS ξ₀. */
export const upperCriticalLengthQ: Quantity = {
  name: 'upper-critical-length',
  symbol: 'ξ',
  dim: { L: 1, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  attributes: CLASSICAL_EM,
};

/** Upper critical field of charge 2e. */
export const upperCriticalFieldQ: Quantity = {
  name: 'upper-critical-field',
  symbol: 'B_c2',
  dim: TESLA,
  attributes: CLASSICAL_EM,
};

/** Gap of the T = 0 Ambegaokar–Baratoff product. */
export const ambegaokarGapQ: Quantity = {
  name: 'ambegaokar-gap',
  symbol: 'Δ',
  dim: ENERGY_DIM,
  attributes: CLASSICAL_EM,
};

/** Product I_c R_n at T = 0. Not the finite-temperature tanh factor. */
export const ambegaokarProductQ: Quantity = {
  name: 'ambegaokar-product',
  symbol: 'I_c R_n',
  dim: VOLT,
  attributes: CLASSICAL_EM,
};

/** GL quartic coefficient ζ. Not a zeta-function value. */
export const bcsQuarticQ: Quantity = {
  name: 'bcs-quartic',
  symbol: 'ζ',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Heat-capacity jump ratio 12/(7 ζ). */
export const bcsHeatJumpQ: Quantity = {
  name: 'bcs-heat-jump',
  symbol: 'ΔC/C_n',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Conduction-band effective density of states. */
export const conductionDosQ: Quantity = {
  name: 'conduction-dos',
  symbol: 'N_c',
  dim: NUMBER_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Valence-band effective density of states. */
export const valenceDosQ: Quantity = {
  name: 'valence-dos',
  symbol: 'N_v',
  dim: NUMBER_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Gap E_c − E_v in the mass-action law. */
export const massActionGapQ: Quantity = {
  name: 'mass-action-gap',
  symbol: 'E_g',
  dim: ENERGY_DIM,
  attributes: CLASSICAL_EM,
};

/** Temperature of the Boltzmann tails. */
export const massActionTemperatureQ: Quantity = {
  name: 'mass-action-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Intrinsic density √(N_c N_v) exp(−E_g/(2 k_B T)). */
export const massActionDensityQ: Quantity = {
  name: 'mass-action-density',
  symbol: 'n_i',
  dim: NUMBER_DENSITY,
  attributes: CLASSICAL_EM,
};

/** Static dielectric constant ε(0). */
export const lstStaticQ: Quantity = {
  name: 'lst-static',
  symbol: 'ε(0)',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** High-frequency dielectric constant ε(∞). */
export const lstInfinityQ: Quantity = {
  name: 'lst-infinity',
  symbol: 'ε(∞)',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Squared Lyddane–Sachs–Teller frequency ratio. */
export const lstRatioQ: Quantity = {
  name: 'lst-ratio',
  symbol: 'ω_LO²/ω_TO²',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Vortex stiffness in the energy-entropy argument. */
export const bktStiffnessQ: Quantity = {
  name: 'bkt-stiffness',
  symbol: 'J',
  dim: ENERGY_DIM,
  attributes: CLASSICAL_EM,
};

/** Unbinding temperature k_B T = π J/2. Not the RG flow. */
export const bktTemperatureQ: Quantity = {
  name: 'bkt-temperature',
  symbol: 'T',
  dim: TEMPERATURE,
  attributes: CLASSICAL_EM,
};

/** Sum of transmission eigenvalues. */
export const landauerTransmissionQ: Quantity = {
  name: 'landauer-transmission',
  symbol: 'Σ T_n',
  dim: DIMENSIONLESS,
  attributes: CLASSICAL_EM,
};

/** Two-spin Landauer conductance. Not the Hall conductance and not erasure. */
export const landauerChannelConductanceQ: Quantity = {
  name: 'landauer-channel-conductance',
  symbol: 'G',
  dim: SIEMENS,
  attributes: CLASSICAL_EM,
};
