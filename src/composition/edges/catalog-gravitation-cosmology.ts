/**
 * Gravitation & cosmology bridges (cosmological-quantum, emergent-spacetime, information-paradox, cosmological-puzzles).
 *
 * Catalog edge definitions, split by physics domain from the former
 * `catalog-full.ts` god-file (re-exported via `catalog-full.ts`).
 *
 * @module composition/edges/catalog-gravitation-cosmology
 */

import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { sym } from '../../dimensional/ast-builders.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import { evaluateBBNDark } from '../../bridges/equations/be-47-bbn-dark-sector.js';
import { evaluateBenincasaDowker } from '../../bridges/equations/be-31-causal-set-bd.js';
import { evaluateCosmologicalConstantDensity } from '../../bridges/equations/be-20-vacuum-energy.js';
import { evaluateEREPRBound } from '../../bridges/equations/be-43-er-epr.js';
import { evaluateFLMFirstLaw } from '../../bridges/equations/be-30-flm-first-law.js';
import { evaluateTCC } from '../../bridges/equations/be-45-tcc.js';
import { evaluateWeinbergVilenkinP } from '../../bridges/equations/be-46-multiverse-measure.js';
import type { BridgeEdge } from '../edge.js';
import {
  anthropicModelParameterQ,
  anthropicProbabilityQ,
  causalSetCount0Q,
  causalSetCount1Q,
  causalSetCount2Q,
  causalSetCount3Q,
  cosmologicalConstantCurvatureQ,
  darkReactionRateCoefficientQ,
  darkSpeciesDensityQ,
  entanglementEntropyVariationQ,
  hubbleRateQ,
  inflationHubbleEnergyQ,
  lambdaMassDensityQ,
  landscapeParameterQ,
  maxEfoldsQ,
  measureNormalizationQ,
  modularHamiltonianVariationQ,
  neutronDensityQ,
  nucleonYieldDensityQ,
  nucleonYieldRateQ,
  planckLengthQ,
  planckMassEnergyQ,
  protonDensityQ,
  ricciScalarQ,
  smReactionRateCoefficientQ,
  tccCorrectionCoefficientQ,
  tensorToScalarRatioQ,
  transferEfficiencyQ,
  wormholeCrossSectionAreaQ,
  wormholeEntanglementEntropyQ,
} from '../quantities.js';
import { isFin, BE20_SYMBOLIC, BE30_SYMBOLIC } from './_catalog-helpers.js';

/**
 * BE-20 cosmological-constant mass density:
 * cosmological-constant-curvature → ρ_Λ = c² Λ / (8πG). Wraps
 * `evaluateCosmologicalConstantDensity` (Λ in m⁻²; returns kg/m³). Reuses the
 * BE-13/BE-31 `cosmological-constant-curvature` source node (the same Λ in
 * [L⁻²]).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be20Edge: BridgeEdge = {
  id: 'be-20',
  beId: 20,
  kind: 'bridge',
  label: 'Cosmological-constant density ρ_Λ = c² Λ / (8πG)',
  sources: [cosmologicalConstantCurvatureQ],
  target: lambdaMassDensityQ,
  confidence: 'speculative',
  domain: {
    description: 'Λ ≥ 0 and finite (m⁻²)',
    predicate: (i) =>
      isFin(i['cosmological-constant-curvature']) &&
      i['cosmological-constant-curvature'] >= 0,
  },
  evaluate: (i) =>
    evaluateCosmologicalConstantDensity({
      Lambda_per_m2: i['cosmological-constant-curvature'],
    }),
  symbolic: BE20_SYMBOLIC,
  citation: 'Carroll 2001 Living Rev. Relativity 4:1; Planck 2020 A&A 641:A6',
};

/**
 * BE-30 FLM first law of entanglement entropy: modular-hamiltonian-variation →
 * δS_EE = δ⟨H_R⟩. Wraps `evaluateFLMFirstLaw` (nats; tautological identity).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be30Edge: BridgeEdge = {
  id: 'be-30',
  beId: 30,
  kind: 'bridge',
  label: 'FLM first law δS_EE = δ⟨H_R⟩',
  sources: [modularHamiltonianVariationQ],
  target: entanglementEntropyVariationQ,
  confidence: 'speculative',
  domain: {
    description: 'δ⟨H_R⟩ finite (nats)',
    predicate: (i) => isFin(i['modular-hamiltonian-variation']),
  },
  evaluate: (i) =>
    evaluateFLMFirstLaw({ delta_avg_H_R: i['modular-hamiltonian-variation'] }),
  symbolic: BE30_SYMBOLIC,
  citation: 'Faulkner, Lewkowycz & Maldacena 2013 JHEP 11:074; Blanco et al. 2013 JHEP 08:060',
};

/**
 * BE-31 Benincasa-Dowker discrete Ricci scalar (d=4): (causal-set-count-0..3,
 * planck-length) → R(p) = (4/√6)ℓ_P⁻²·[1 + N_0 − 9N_1 + 16N_2 − 8N_3]. Wraps
 * `evaluateBenincasaDowker` (N_k dimensionless, ℓ_P in m; returns m⁻²). Shares
 * the `ricci-scalar` target with {@link be13Edge}.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be31Edge: BridgeEdge = {
  id: 'be-31',
  beId: 31,
  kind: 'bridge',
  label: 'Benincasa-Dowker R(p) = (4/√6)ℓ_P⁻²·[1+N_0−9N_1+16N_2−8N_3]',
  sources: [causalSetCount0Q, causalSetCount1Q, causalSetCount2Q, causalSetCount3Q, planckLengthQ],
  target: ricciScalarQ,
  confidence: 'speculative',
  domain: {
    description: 'N_0..N_3 finite, ℓ_P > 0',
    predicate: (i) =>
      isFin(i['causal-set-count-0']) &&
      isFin(i['causal-set-count-1']) &&
      isFin(i['causal-set-count-2']) &&
      isFin(i['causal-set-count-3']) &&
      isFin(i['planck-length']) &&
      i['planck-length'] > 0,
  },
  evaluate: (i) =>
    evaluateBenincasaDowker({
      N_0: i['causal-set-count-0'],
      N_1: i['causal-set-count-1'],
      N_2: i['causal-set-count-2'],
      N_3: i['causal-set-count-3'],
      l_P_m: i['planck-length'],
    }),
  citation: 'Benincasa & Dowker 2010 PRL 104:181301',
};

/**
 * BE-43 ER=EPR wormhole-entropy bound: wormhole-cross-section-area →
 * S = k_B A / (4 ℓ_P²). Wraps `evaluateEREPRBound` (A in m²; returns J/K).
 * Mirrors BE-14's SI convention; uses a distinct `wormhole-*` source/target so
 * it does not silently fuse with the BE-14 Ryu-Takayanagi nodes (different
 * geometry: bulk minimal surface vs. ER bridge cross-section).
 * S = k_B c³ A / (4 G ℏ), which is k_B A / (4 ℓ_P²).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
const BE43_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '/',
  args: [
    {
      kind: 'op',
      op: '*',
      args: [
        sym('k_B', CONSTANTS.k_B.dim),
        { kind: 'op', op: '^', args: [sym('c', CONSTANTS.c.dim), sym('3', DIMENSIONLESS)] },
        sym(wormholeCrossSectionAreaQ.name, wormholeCrossSectionAreaQ.dim),
      ],
    },
    {
      kind: 'op',
      op: '*',
      args: [
        sym('4', DIMENSIONLESS),
        sym('G', CONSTANTS.G.dim),
        sym('hbar', CONSTANTS.hbar.dim),
      ],
    },
  ],
};

export const be43Edge: BridgeEdge = {
  id: 'be-43',
  beId: 43,
  kind: 'bridge',
  label: 'ER=EPR entropy S = k_B A_wh / (4 ℓ_P²)',
  sources: [wormholeCrossSectionAreaQ],
  target: wormholeEntanglementEntropyQ,
  confidence: 'speculative',
  domain: {
    description: 'A_wh ≥ 0 and finite',
    predicate: (i) =>
      isFin(i['wormhole-cross-section-area']) &&
      i['wormhole-cross-section-area'] >= 0,
  },
  evaluate: (i) =>
    evaluateEREPRBound({ area_m2: i['wormhole-cross-section-area'] }),
  symbolic: BE43_SYMBOLIC,
  citation: 'Maldacena & Susskind 2013 Fortschr. Phys. 61:781; Bekenstein 1973 PRD 7:2333',
};

/**
 * BE-45 TCC max e-folds: (planck-mass-energy, inflation-hubble-energy,
 * tensor-to-scalar-ratio, tcc-correction-coefficient) →
 * N_e_max = ln(M_P/H_inf) − γ ln(r/0.01). Wraps `evaluateTCC` (M_P, H_inf in
 * GeV-equivalent natural units; returns dimensionless e-folds).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be45Edge: BridgeEdge = {
  id: 'be-45',
  beId: 45,
  kind: 'bridge',
  label: 'TCC e-folds N_e_max = ln(M_P/H_inf) − γ ln(r/0.01)',
  sources: [planckMassEnergyQ, inflationHubbleEnergyQ, tensorToScalarRatioQ, tccCorrectionCoefficientQ],
  target: maxEfoldsQ,
  confidence: 'speculative',
  domain: {
    description: 'M_P > 0, H_inf > 0, r > 0, γ finite',
    predicate: (i) =>
      isFin(i['planck-mass-energy']) &&
      i['planck-mass-energy'] > 0 &&
      isFin(i['inflation-hubble-energy']) &&
      i['inflation-hubble-energy'] > 0 &&
      isFin(i['tensor-to-scalar-ratio']) &&
      i['tensor-to-scalar-ratio'] > 0 &&
      isFin(i['tcc-correction-coefficient']),
  },
  evaluate: (i) =>
    evaluateTCC({
      M_P_GeV: i['planck-mass-energy'],
      H_inf_GeV: i['inflation-hubble-energy'],
      r: i['tensor-to-scalar-ratio'],
      gamma: i['tcc-correction-coefficient'],
    }),
  citation: 'Bedroya & Vafa 2019 (arXiv:1909.11063)',
};

/**
 * BE-46 Weinberg-Vilenkin anthropic probability: (measure-normalization,
 * anthropic-model-parameter, landscape-parameter) → P(Λ) = A exp(−α/Λ). Wraps
 * `evaluateWeinbergVilenkinP` (all dimensionless; returns dimensionless P).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be46Edge: BridgeEdge = {
  id: 'be-46',
  beId: 46,
  kind: 'bridge',
  label: 'Anthropic probability P(Λ) = A exp(−α/Λ)',
  sources: [measureNormalizationQ, anthropicModelParameterQ, landscapeParameterQ],
  target: anthropicProbabilityQ,
  confidence: 'highly-speculative',
  domain: {
    description: 'A, α finite, Λ > 0',
    predicate: (i) =>
      isFin(i['measure-normalization']) &&
      isFin(i['anthropic-model-parameter']) &&
      isFin(i['landscape-parameter']) &&
      i['landscape-parameter'] > 0,
  },
  evaluate: (i) =>
    evaluateWeinbergVilenkinP({
      normalization: i['measure-normalization'],
      alpha: i['anthropic-model-parameter'],
      lambda: i['landscape-parameter'],
    }),
  citation: 'Vilenkin 1995 PRL 74:846; Weinberg 1987 PRL 59:2607',
};

/**
 * BE-47 BBN dark-sector Boltzmann rate: (hubble-rate, nucleon-yield-density,
 * sm-reaction-rate-coefficient, proton-density, neutron-density,
 * dark-reaction-rate-coefficient, dark-species-density, transfer-efficiency) →
 * dY/dt = ⟨σv⟩_SM n_p n_n − ⟨σv⟩_dark n_χ² ε − 3HY. Wraps `evaluateBBNDark`
 * (SI; returns m⁻³ s⁻¹).
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
export const be47Edge: BridgeEdge = {
  id: 'be-47',
  beId: 47,
  kind: 'bridge',
  label: 'BBN dark-sector dY/dt = ⟨σv⟩_SM n_p n_n − ⟨σv⟩_dark n_χ² ε − 3HY',
  sources: [
    hubbleRateQ,
    nucleonYieldDensityQ,
    smReactionRateCoefficientQ,
    protonDensityQ,
    neutronDensityQ,
    darkReactionRateCoefficientQ,
    darkSpeciesDensityQ,
    transferEfficiencyQ,
  ],
  target: nucleonYieldRateQ,
  confidence: 'speculative',
  domain: {
    description: 'all eight Boltzmann inputs finite',
    predicate: (i) =>
      isFin(i['hubble-rate']) &&
      isFin(i['nucleon-yield-density']) &&
      isFin(i['sm-reaction-rate-coefficient']) &&
      isFin(i['proton-density']) &&
      isFin(i['neutron-density']) &&
      isFin(i['dark-reaction-rate-coefficient']) &&
      isFin(i['dark-species-density']) &&
      isFin(i['transfer-efficiency']),
  },
  evaluate: (i) =>
    evaluateBBNDark({
      H: i['hubble-rate'],
      Y: i['nucleon-yield-density'],
      sigmav_SM: i['sm-reaction-rate-coefficient'],
      n_p: i['proton-density'],
      n_n: i['neutron-density'],
      sigmav_dark: i['dark-reaction-rate-coefficient'],
      n_chi: i['dark-species-density'],
      eps_transfer: i['transfer-efficiency'],
    }),
  citation: 'Kolb & Turner 1990 §5.2; Pitrou et al. 2018 Phys. Rep. 754:1',
};
