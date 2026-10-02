/**
 * Centralized Quantity nodes — gravitation / cosmology / nuclear-network domain.
 * One object per canonical name; consumed (mainly) by `edges/catalog-gravitation-cosmology.ts`.
 * Split from the former `quantities.ts` god-file (2026-06-22); re-exported
 * through the `quantities.ts` barrel so every importer is unchanged. Name
 * uniqueness is pinned by tests/composition/quantities.test.ts.
 *
 * @module composition/quantities/gravitation-cosmology
 */
import type { Quantity } from '../quantity.js';
import {
  AREA,
  DIMENSIONLESS,
  ENTROPY,
  FREQUENCY,
  LENGTH,
} from '../../dimensional/types.js';
import {
  MASS_DENSITY,
  NUMBER_DENSITY,
  NUMBER_DENSITY_RATE,
  ENERGY_DIM2,
} from './_dims.js';

/** Canonical node for `causal-set-count-0` (N_0, dimensionless). */
export const causalSetCount0Q: Quantity = {
  name: 'causal-set-count-0',
  symbol: 'N_0',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `causal-set-count-1` (N_1, dimensionless). */
export const causalSetCount1Q: Quantity = {
  name: 'causal-set-count-1',
  symbol: 'N_1',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `causal-set-count-2` (N_2, dimensionless). */
export const causalSetCount2Q: Quantity = {
  name: 'causal-set-count-2',
  symbol: 'N_2',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `causal-set-count-3` (N_3, dimensionless). */
export const causalSetCount3Q: Quantity = {
  name: 'causal-set-count-3',
  symbol: 'N_3',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `planck-length` (ℓ_P, [L]). */
export const planckLengthQ: Quantity = {
  name: 'planck-length',
  symbol: 'ℓ_P',
  dim: LENGTH,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `lambda-mass-density` (ρ_Λ, [M L⁻³]). */
export const lambdaMassDensityQ: Quantity = {
  name: 'lambda-mass-density',
  symbol: 'ρ_Λ',
  dim: MASS_DENSITY,
  attributes: { scale: 'cosmological', force: 'gravitational' },
};
/** Canonical node for `modular-hamiltonian-variation` (δ⟨H_R⟩, nats). */
export const modularHamiltonianVariationQ: Quantity = {
  name: 'modular-hamiltonian-variation',
  symbol: 'δ⟨H_R⟩',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', information: 'von-neumann' },
};
/** Canonical node for `entanglement-entropy-variation` (δS_EE, nats). */
export const entanglementEntropyVariationQ: Quantity = {
  name: 'entanglement-entropy-variation',
  symbol: 'δS_EE',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', information: 'von-neumann' },
};
/** Canonical node for `wormhole-cross-section-area` (A_wormhole, [L²]). */
export const wormholeCrossSectionAreaQ: Quantity = {
  name: 'wormhole-cross-section-area',
  symbol: 'A_wh',
  dim: AREA,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `wormhole-entanglement-entropy` (S, J/K). */
// rationale: same ER=EPR wormhole family as wormhole-cross-section-area
// (already force: gravitational).
export const wormholeEntanglementEntropyQ: Quantity = {
  name: 'wormhole-entanglement-entropy',
  symbol: 'S_ER',
  dim: ENTROPY,
  attributes: { scale: 'quantum', information: 'von-neumann', force: 'gravitational' },
};
/** Canonical node for `inflation-hubble-energy` (H_inf, energy / natural units). */
export const inflationHubbleEnergyQ: Quantity = {
  name: 'inflation-hubble-energy',
  symbol: 'H_inf',
  dim: ENERGY_DIM2,
  attributes: { scale: 'cosmological', force: 'gravitational' },
};
/** Canonical node for `planck-mass-energy` (M_P in energy units, natural units). */
export const planckMassEnergyQ: Quantity = {
  name: 'planck-mass-energy',
  symbol: 'M_P(E)',
  dim: ENERGY_DIM2,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `tensor-to-scalar-ratio` (r, dimensionless). */
export const tensorToScalarRatioQ: Quantity = {
  name: 'tensor-to-scalar-ratio',
  symbol: 'r',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological', force: 'gravitational' },
};
/** Canonical node for `tcc-correction-coefficient` (γ, dimensionless O(1)). */
export const tccCorrectionCoefficientQ: Quantity = {
  name: 'tcc-correction-coefficient',
  symbol: 'γ_tcc',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `max-efolds` (N_e_max, dimensionless). */
export const maxEfoldsQ: Quantity = {
  name: 'max-efolds',
  symbol: 'N_e_max',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological', force: 'gravitational' },
};
/** Canonical node for `measure-normalization` (A, dimensionless). */
export const measureNormalizationQ: Quantity = {
  name: 'measure-normalization',
  symbol: 'A_norm',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `anthropic-model-parameter` (α, dimensionless). */
export const anthropicModelParameterQ: Quantity = {
  name: 'anthropic-model-parameter',
  symbol: 'α_anth',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `landscape-parameter` (Λ, dimensionless ratio component). */
export const landscapeParameterQ: Quantity = {
  name: 'landscape-parameter',
  symbol: 'Λ_land',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `anthropic-probability` (P(Λ), dimensionless). */
export const anthropicProbabilityQ: Quantity = {
  name: 'anthropic-probability',
  symbol: 'P(Λ)',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `hubble-rate` (H, [T⁻¹]). */
export const hubbleRateQ: Quantity = {
  name: 'hubble-rate',
  symbol: 'H',
  dim: FREQUENCY,
  attributes: { scale: 'cosmological', force: 'gravitational' },
};
/** Canonical node for `nucleon-yield-density` (Y, [L⁻³]). */
export const nucleonYieldDensityQ: Quantity = {
  name: 'nucleon-yield-density',
  symbol: 'Y',
  dim: NUMBER_DENSITY,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `sm-reaction-rate-coefficient` (⟨σv⟩_SM, [L³ T⁻¹]). */
export const smReactionRateCoefficientQ: Quantity = {
  name: 'sm-reaction-rate-coefficient',
  symbol: '⟨σv⟩_SM',
  dim: { L: 3, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 },
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `proton-density` (n_p, [L⁻³]). */
export const protonDensityQ: Quantity = {
  name: 'proton-density',
  symbol: 'n_p',
  dim: NUMBER_DENSITY,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `neutron-density` (n_n, [L⁻³]). */
export const neutronDensityQ: Quantity = {
  name: 'neutron-density',
  symbol: 'n_n',
  dim: NUMBER_DENSITY,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `dark-reaction-rate-coefficient` (⟨σv⟩_dark, [L³ T⁻¹]). */
export const darkReactionRateCoefficientQ: Quantity = {
  name: 'dark-reaction-rate-coefficient',
  symbol: '⟨σv⟩_dark',
  dim: { L: 3, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 },
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `dark-species-density` (n_χ, [L⁻³]). */
export const darkSpeciesDensityQ: Quantity = {
  name: 'dark-species-density',
  symbol: 'n_χ',
  dim: NUMBER_DENSITY,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `transfer-efficiency` (ε, dimensionless). */
export const transferEfficiencyQ: Quantity = {
  name: 'transfer-efficiency',
  symbol: 'ε',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `nucleon-yield-rate` (dY/dt, [L⁻³ T⁻¹]). */
export const nucleonYieldRateQ: Quantity = {
  name: 'nucleon-yield-rate',
  symbol: 'dY/dt',
  dim: NUMBER_DENSITY_RATE,
  attributes: { scale: 'cosmological' },
};
/** Canonical node for `lane-emden-omega-3` (ω₃⁰, dimensionless Lane-Emden n=3 surface value). */
export const laneEmdenOmega3Q: Quantity = {
  name: 'lane-emden-omega-3',
  symbol: 'ω₃⁰',
  dim: DIMENSIONLESS,
  attributes: {},
};
/** Canonical node for `mean-molecular-weight-per-electron` (μ_e, dimensionless). */
export const meanMolecularWeightPerElectronQ: Quantity = {
  name: 'mean-molecular-weight-per-electron',
  symbol: 'μ_e',
  dim: DIMENSIONLESS,
  attributes: {},
};
