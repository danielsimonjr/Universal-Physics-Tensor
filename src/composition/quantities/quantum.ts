/**
 * Centralized Quantity nodes — quantum / information / open-system / biological-quantum domain.
 * One object per canonical name; consumed (mainly) by `edges/catalog-quantum.ts`.
 * Split from the former `quantities.ts` god-file (2026-06-22); re-exported
 * through the `quantities.ts` barrel so every importer is unchanged. Name
 * uniqueness is pinned by tests/composition/quantities.test.ts.
 *
 * @module composition/quantities/quantum
 */
import type { Quantity } from '../quantity.js';
import {
  DIMENSIONLESS,
  FREQUENCY,
  LENGTH,
  MASS,
} from '../../dimensional/types.js';
import {
  FREQUENCY_DIM,
  ENERGY_DENSITY,
  VECTOR_POTENTIAL,
  ENERGY_DIM2,
} from './_dims.js';

/** Canonical node for `decoherence-rate`. */
// audit 2026-07-02: scale stripped — adjudicator split → abstain.
export const decoherenceRateQ: Quantity = {
  name: 'decoherence-rate',
  symbol: 'Γ_dec',
  dim: FREQUENCY_DIM,
  attributes: {},
};
/** Canonical node for `relaxation-rate`. */
// audit 2026-07-02: scale stripped — adjudicator split → abstain.
export const relaxationRateQ: Quantity = {
  name: 'relaxation-rate',
  symbol: 'γ_relax',
  dim: FREQUENCY_DIM,
  attributes: {},
};
/** Canonical node for `system-environment-coupling` (BE-11 λ; dimensionless). */
export const systemEnvironmentCouplingQ: Quantity = {
  name: 'system-environment-coupling',
  symbol: 'λ',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `reference-coupling` (BE-11 λ₀; dimensionless). */
export const referenceCouplingQ: Quantity = {
  name: 'reference-coupling',
  symbol: 'λ₀',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `stress-energy-trace` (T = g^μν T_μν, energy density). */
export const stressEnergyTraceQ: Quantity = {
  name: 'stress-energy-trace',
  symbol: 'T',
  dim: ENERGY_DENSITY,
  attributes: { force: 'gravitational' },
};
/** Canonical node for `donor-acceptor-distance` (R, [L]). */
// rationale: FRET donor-acceptor distance is dipole-dipole (Förster)
// coupling — an EM interaction by definition.
export const donorAcceptorDistanceQ: Quantity = {
  name: 'donor-acceptor-distance',
  symbol: 'R',
  dim: LENGTH,
  attributes: { scale: 'mesoscopic', force: 'electromagnetic' },
};
/** Canonical node for `foerster-radius` (R_0, [L]). */
// rationale: same FRET/dipole-dipole (EM) physics as donor-acceptor-distance.
export const foersterRadiusQ: Quantity = {
  name: 'foerster-radius',
  symbol: 'R_0',
  dim: LENGTH,
  attributes: { scale: 'mesoscopic', force: 'electromagnetic' },
};
/** Canonical node for `fret-efficiency` (η, dimensionless ∈ [0,1]). */
export const fretEfficiencyQ: Quantity = {
  name: 'fret-efficiency',
  symbol: 'η',
  dim: DIMENSIONLESS,
  attributes: { scale: 'mesoscopic' },
};
/** Canonical node for `conditional-probability` (p(s̃|s), dimensionless). */
export const conditionalProbabilityQ: Quantity = {
  name: 'conditional-probability',
  symbol: 'p(s̃|s)',
  dim: DIMENSIONLESS,
  attributes: { information: 'shannon' },
};
/** Canonical node for `marginal-probability` (p(s̃), dimensionless). */
export const marginalProbabilityQ: Quantity = {
  name: 'marginal-probability',
  symbol: 'p(s̃)',
  dim: DIMENSIONLESS,
  attributes: { information: 'shannon' },
};
/** Canonical node for `intrinsic-information` (ii, bits — dimensionless). */
export const intrinsicInformationQ: Quantity = {
  name: 'intrinsic-information',
  symbol: 'ii',
  dim: DIMENSIONLESS,
  attributes: { information: 'shannon' },
};
/** Canonical node for `attempt-frequency` (ν₀, [T⁻¹]). */
export const attemptFrequencyQ: Quantity = {
  name: 'attempt-frequency',
  symbol: 'ν₀',
  dim: FREQUENCY,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `tunneling-mass` (m, proton mass — DISTINCT from gravitational `mass`). */
export const tunnelingMassQ: Quantity = {
  name: 'tunneling-mass',
  symbol: 'm',
  dim: MASS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `barrier-height` (V−E, energy). */
export const barrierHeightQ: Quantity = {
  name: 'barrier-height',
  symbol: 'V−E',
  dim: ENERGY_DIM2,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `barrier-width` (L, [L]). */
export const barrierWidthQ: Quantity = {
  name: 'barrier-width',
  symbol: 'L_barrier',
  dim: LENGTH,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `biological-rate-correction` (f(T,pH,EM), dimensionless). */
export const biologicalRateCorrectionQ: Quantity = {
  name: 'biological-rate-correction',
  symbol: 'f',
  dim: DIMENSIONLESS,
  attributes: { scale: 'mesoscopic' },
};
/** Canonical node for `mutation-rate` (Γ_mutation, [T⁻¹]). */
export const mutationRateQ: Quantity = {
  name: 'mutation-rate',
  symbol: 'Γ_mut',
  dim: FREQUENCY,
  attributes: { scale: 'mesoscopic' },
};
/** Canonical node for `total-mutual-information` (I(S:E), dimensionless). */
export const totalMutualInformationQ: Quantity = {
  name: 'total-mutual-information',
  symbol: 'I(S:E)',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', information: 'von-neumann' },
};
/** Canonical node for `darwinism-magnitude` (α, dimensionless prefactor). */
export const darwinismMagnitudeQ: Quantity = {
  name: 'darwinism-magnitude',
  symbol: 'α_QD',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `fragment-count` (k, dimensionless). */
export const fragmentCountQ: Quantity = {
  name: 'fragment-count',
  symbol: 'k',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `darwinism-decay-exponent` (β, dimensionless). */
export const darwinismDecayExponentQ: Quantity = {
  name: 'darwinism-decay-exponent',
  symbol: 'β_QD',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum' },
};
/** Canonical node for `fragment-mutual-information` (I(S:F_k), dimensionless). */
export const fragmentMutualInformationQ: Quantity = {
  name: 'fragment-mutual-information',
  symbol: 'I(S:F_k)',
  dim: DIMENSIONLESS,
  attributes: { scale: 'quantum', information: 'von-neumann' },
};
/** Canonical node for `retarded-field-amplitude` (A_ret, [A] = V·s/m). */
export const retardedFieldAmplitudeQ: Quantity = {
  name: 'retarded-field-amplitude',
  symbol: 'A_ret',
  dim: VECTOR_POTENTIAL,
  attributes: { force: 'electromagnetic' },
};
/** Canonical node for `advanced-field-amplitude` (A_adv, [A] = V·s/m). */
export const advancedFieldAmplitudeQ: Quantity = {
  name: 'advanced-field-amplitude',
  symbol: 'A_adv',
  dim: VECTOR_POTENTIAL,
  attributes: { force: 'electromagnetic' },
};
/** Canonical node for `time-symmetry-residual` (r_TS, dimensionless). */
export const timeSymmetryResidualQ: Quantity = {
  name: 'time-symmetry-residual',
  symbol: 'r_TS',
  dim: DIMENSIONLESS,
  attributes: { force: 'electromagnetic' },
};
/** Canonical node for `time-symmetric-field-amplitude` (A = (A_ret + A_adv)/2). */
export const timeSymmetricFieldAmplitudeQ: Quantity = {
  name: 'time-symmetric-field-amplitude',
  symbol: 'A_TS',
  dim: VECTOR_POTENTIAL,
  attributes: { force: 'electromagnetic' },
};
