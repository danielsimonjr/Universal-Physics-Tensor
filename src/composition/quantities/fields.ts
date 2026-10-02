/**
 * Centralized Quantity nodes — field-theory / gravity-modification / swampland domain.
 * One object per canonical name; consumed (mainly) by `edges/catalog-fields.ts`.
 * Split from the former `quantities.ts` god-file (2026-06-22); re-exported
 * through the `quantities.ts` barrel so every importer is unchanged. Name
 * uniqueness is pinned by tests/composition/quantities.test.ts.
 *
 * @module composition/quantities/fields
 */
import type { Quantity } from '../quantity.js';
import {
  DIMENSIONLESS,
  ENERGY,
  FORCE,
  MASS,
} from '../../dimensional/types.js';
import {
  COUPLING_PREFACTOR_SQUARED,
  TORSION_CONTRACTION,
  SPIN_DENSITY_SQUARED,
  ENERGY_DIM2,
  ENERGY4,
} from './_dims.js';

/** Canonical node for `mass`. */
// audit 2026-07-02: stripped — generic (spans classical gravitating mass
// and quantum scalar-field mass; fold test fails).
export const massQ: Quantity = {
  name: 'mass',
  symbol: 'M',
  dim: MASS,
  attributes: {},
};
/** Canonical node for `einstein-coupling-prefactor-squared` ((c⁴/8πG)²). */
export const couplingPrefactorSquaredQ: Quantity = {
  name: 'einstein-coupling-prefactor-squared',
  symbol: '(c⁴/8πG)²',
  dim: COUPLING_PREFACTOR_SQUARED,
  attributes: { force: 'gravitational' },
};
/** Canonical node for `torsion-contraction-scalar` (T_λμν T^λμν). */
export const torsionContractionScalarQ: Quantity = {
  name: 'torsion-contraction-scalar',
  symbol: 'T·T',
  dim: TORSION_CONTRACTION,
  attributes: { force: 'gravitational' },
};
/** Canonical node for `spin-density-squared` (S²_spin). */
export const spinDensitySquaredQ: Quantity = {
  name: 'spin-density-squared',
  symbol: 'S²_spin',
  dim: SPIN_DENSITY_SQUARED,
  attributes: { force: 'gravitational' },
};
/** Canonical node for `yukawa-coupling` (g_dark, dimensionless). */
export const yukawaCouplingQ: Quantity = {
  name: 'yukawa-coupling',
  symbol: 'g_dark',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'weak' },
};
/** Canonical node for `vacuum-expectation-value` (v_dark, energy). */
export const vacuumExpectationValueQ: Quantity = {
  name: 'vacuum-expectation-value',
  symbol: 'v_dark',
  dim: ENERGY_DIM2,
  attributes: { scale: 'quantum', force: 'weak' },
};
/** Canonical node for `dark-fermion-mass` (m_dark, energy / natural units). */
export const darkFermionMassQ: Quantity = {
  name: 'dark-fermion-mass',
  symbol: 'm_dark',
  dim: ENERGY_DIM2,
  // statistics 'fermionic': a dark FERMION. Sourced tag for the 2026-07-05 axis
  // expansion — thin coverage; the statistics gate stays off until the audit earns it.
  attributes: { scale: 'quantum', force: 'weak', statistics: 'fermionic' },
};
/** Canonical node for `gravitational-wave-speed` (c_GW, velocity). */
export const gravitationalWaveSpeedQ: Quantity = {
  name: 'gravitational-wave-speed',
  symbol: 'c_GW',
  dim: { L: 1, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 },
  attributes: { scale: 'cosmological', force: 'gravitational' },
};
/** Canonical node for `gw-photon-speed-ratio` ((c_GW−c)/c, dimensionless). */
export const gwPhotonSpeedRatioQ: Quantity = {
  name: 'gw-photon-speed-ratio',
  symbol: 'Δv/c',
  dim: DIMENSIONLESS,
  attributes: { scale: 'cosmological', force: 'gravitational' },
};
/** Canonical node for `newtonian-force` (F_N, [N]). */
export const newtonianForceQ: Quantity = {
  name: 'newtonian-force',
  symbol: 'F_N',
  dim: FORCE,
  attributes: { scale: 'classical', force: 'gravitational' },
};
/** Canonical node for `mond-acceleration-scale` (a_0, [L T⁻²]). */
export const mondAccelerationScaleQ: Quantity = {
  name: 'mond-acceleration-scale',
  symbol: 'a_0',
  dim: { L: 1, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 },
  attributes: { scale: 'classical', force: 'gravitational' },
};
/** Canonical node for `mond-force` (F, [N]). */
export const mondForceQ: Quantity = {
  name: 'mond-force',
  symbol: 'F',
  dim: FORCE,
  attributes: { scale: 'classical', force: 'gravitational' },
};
/** Canonical node for `newton-coupling-dimensionless` (g = G k², dimensionless). */
export const newtonCouplingQ: Quantity = {
  name: 'newton-coupling-dimensionless',
  symbol: 'g',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `cosmological-constant-dimensionless` (λ = Λ/k², dimensionless). */
export const cosmologicalConstantDimensionlessQ: Quantity = {
  name: 'cosmological-constant-dimensionless',
  symbol: 'λ',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `truncation-coefficient-a` (A, dimensionless). */
export const truncationCoefficientAQ: Quantity = {
  name: 'truncation-coefficient-a',
  symbol: 'A',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `truncation-coefficient-b` (B, dimensionless). */
export const truncationCoefficientBQ: Quantity = {
  name: 'truncation-coefficient-b',
  symbol: 'B',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `truncation-coefficient-c` (C, dimensionless). */
export const truncationCoefficientCQ: Quantity = {
  name: 'truncation-coefficient-c',
  symbol: 'C',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `newton-coupling-beta` (β_g, dimensionless). */
export const newtonCouplingBetaQ: Quantity = {
  name: 'newton-coupling-beta',
  symbol: 'β_g',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `reference-mass` (m₀, [M]). */
export const referenceMassQ: Quantity = {
  name: 'reference-mass',
  symbol: 'm₀',
  dim: MASS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `swampland-coefficient` (α, dimensionless O(1)). */
export const swamplandCoefficientQ: Quantity = {
  name: 'swampland-coefficient',
  symbol: 'α_swamp',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `scalar-field-value` (φ, [M] canonically normalized). */
export const scalarFieldValueQ: Quantity = {
  name: 'scalar-field-value',
  symbol: 'φ',
  dim: MASS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `scalar-field-reference` (φ₀, [M]). */
export const scalarFieldReferenceQ: Quantity = {
  name: 'scalar-field-reference',
  symbol: 'φ₀',
  dim: MASS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `planck-mass` (M_P, [M]). */
export const planckMassQ: Quantity = {
  name: 'planck-mass',
  symbol: 'M_P',
  dim: MASS,
  attributes: { scale: 'quantum', force: 'gravitational' },
};
/** Canonical node for `swampland-tower-mass` (m(φ), [M]). */
export const swamplandTowerMassQ: Quantity = {
  name: 'swampland-tower-mass',
  symbol: 'm(φ)',
  dim: MASS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `higgs-field` (h, energy). Shared electroweak scale with the decay constant. */
export const higgsFieldQ: Quantity = {
  name: 'higgs-field',
  symbol: 'h',
  dim: ENERGY,
  attributes: { scale: 'quantum', force: 'weak' },
};
/** Canonical node for `higgs-decay-constant` (f, energy). */
export const higgsDecayConstantQ: Quantity = {
  name: 'higgs-decay-constant',
  symbol: 'f',
  dim: ENERGY,
  attributes: { scale: 'quantum', force: 'weak' },
};
/** Canonical node for `composite-higgs-alpha` (α, dimensionless Wilson coefficient). */
export const compositeHiggsAlphaQ: Quantity = {
  name: 'composite-higgs-alpha',
  symbol: 'α',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'weak' },
};
/** Canonical node for `composite-higgs-beta` (β, dimensionless Wilson coefficient). */
export const compositeHiggsBetaQ: Quantity = {
  name: 'composite-higgs-beta',
  symbol: 'β',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', force: 'weak' },
};
/** Canonical node for `composite-higgs-potential` (V, energy⁴). */
export const compositeHiggsPotentialQ: Quantity = {
  name: 'composite-higgs-potential',
  symbol: 'V',
  dim: ENERGY4,
  attributes: { scale: 'quantum', force: 'weak' },
};
