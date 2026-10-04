/**
 * Composition edges for BE-88 through BE-102.
 *
 * Each edge's endpoints share the classical electromagnetic attributes,
 * so `kind` is `law`. The overlay `formalRef` is kind `bridge`.
 * Confidence stays `established`. A proof does not promote it.
 * Landau diamagnetism and the BCS coherence length are not edges.
 *
 * @module composition/edges/condensed-r5
 */

import { evaluateFermiSea } from '../../bridges/be88-fermi-sea.js';
import { evaluateDebyeCutoff } from '../../bridges/be89-debye-cutoff.js';
import { evaluateDebyeHeat } from '../../bridges/be90-debye-heat.js';
import { evaluateEinsteinSolid } from '../../bridges/be91-einstein-solid.js';
import { evaluateSommerfeldHeat } from '../../bridges/be92-sommerfeld-heat.js';
import { evaluateCurieWeiss } from '../../bridges/be93-curie-weiss.js';
import { evaluatePauliParamagnetism } from '../../bridges/be94-pauli-paramagnetism.js';
import { evaluateGinzburgLandau } from '../../bridges/be95-ginzburg-landau.js';
import { evaluateUpperCritical } from '../../bridges/be96-upper-critical.js';
import { evaluateAmbegaokarBaratoff } from '../../bridges/be97-ambegaokar-baratoff.js';
import { evaluateBcsJump } from '../../bridges/be98-bcs-jump.js';
import { evaluateMassAction } from '../../bridges/be99-mass-action.js';
import { evaluateLyddaneSachsTeller } from '../../bridges/be100-lyddane-sachs-teller.js';
import { evaluateBktJump } from '../../bridges/be101-bkt-jump.js';
import { evaluateLandauerConductance } from '../../bridges/be102-landauer-conductance.js';
import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import { withBoundAliases, type BridgeEdge } from '../edge.js';
import type { Quantity } from '../quantity.js';
import {
  ambegaokarGapQ,
  ambegaokarProductQ,
  bcsHeatJumpQ,
  bcsQuarticQ,
  bktStiffnessQ,
  bktTemperatureQ,
  conductionDosQ,
  curieDensityQ,
  curieGFactorQ,
  curieMagnetonQ,
  curieSpinQ,
  curieTemperatureQ,
  curieWeissSusceptibilityQ,
  debyeAtomCountQ,
  debyeAtomDensityQ,
  debyeCutoffFrequencyQ,
  debyeHeatCapacityQ,
  debyeSoundSpeedQ,
  debyeTemperatureQ,
  debyeThetaQ,
  einsteinAtomCountQ,
  einsteinHeatCapacityQ,
  einsteinSolidTemperatureQ,
  einsteinThetaQ,
  fermiSeaDensityQ,
  fermiSeaMassQ,
  fermiWavevectorQ,
  glKappaQ,
  glTrialFactorQ,
  landauerChannelConductanceQ,
  landauerTransmissionQ,
  lstInfinityQ,
  lstRatioQ,
  lstStaticQ,
  massActionDensityQ,
  massActionGapQ,
  massActionTemperatureQ,
  pauliDensityQ,
  pauliFermiEnergyQ,
  pauliMagnetonQ,
  pauliSusceptibilityQ,
  sommerfeldDensityQ,
  sommerfeldFermiEnergyQ,
  sommerfeldHeatCapacityQ,
  sommerfeldTemperatureQ,
  upperCriticalFieldQ,
  upperCriticalLengthQ,
  valenceDosQ,
  weissTemperatureQ,
} from '../quantities.js';

const finite = Number.isFinite;
const qsym = (q: Quantity): ExprNode => ({ kind: 'symbol', name: q.name, dim: q.dim });
const csym = (name: keyof typeof CONSTANTS): ExprNode => ({ kind: 'symbol', name, dim: CONSTANTS[name].dim });
const lit = (n: number): ExprNode => ({ kind: 'symbol', name: String(n), dim: DIMENSIONLESS });
const prod = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const plus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '+', args: [a, b] });
const ratio = (num: ExprNode, den: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [num, den] });
const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });
const expOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'exp', arg });
/** π as a dimensionless leaf. `piMultipleValue` resolves the name. */
const pi: ExprNode = { kind: 'symbol', name: 'pi', dim: DIMENSIONLESS };
/** μ0 = 1/(ε0 c²). */
const mu0: ExprNode = ratio(lit(1), prod(csym('epsilon_0'), pow(csym('c'), lit(2))));

/** k_F = (3 π² n)^{1/3}. The parabola is not this leaf. */
const BE88_SYMBOLIC: ExprNode = pow(
  prod(lit(3), pow(pi, lit(2)), qsym(fermiSeaDensityQ)),
  lit(1 / 3),
);

/** ω_D = v_s (6 π² n)^{1/3}. */
const BE89_SYMBOLIC: ExprNode = prod(
  qsym(debyeSoundSpeedQ),
  pow(prod(lit(6), pow(pi, lit(2)), qsym(debyeAtomDensityQ)), lit(1 / 3)),
);

/** C_V = (12 π⁴/5) N k_B (T/θ_D)³. π⁴/15 is a hypothesis inside the 12/5. */
const BE90_SYMBOLIC: ExprNode = prod(
  ratio(prod(lit(12), pow(pi, lit(4))), lit(5)),
  qsym(debyeAtomCountQ),
  csym('k_B'),
  pow(ratio(qsym(debyeTemperatureQ), qsym(debyeThetaQ)), lit(3)),
);

/** C_V = 3 N k_B x² e^x / (e^x − 1)² with x = θ_E/T. */
const BE91_X: ExprNode = ratio(qsym(einsteinThetaQ), qsym(einsteinSolidTemperatureQ));
const BE91_SYMBOLIC: ExprNode = prod(
  lit(3),
  qsym(einsteinAtomCountQ),
  csym('k_B'),
  pow(BE91_X, lit(2)),
  ratio(expOf(BE91_X), pow(plus(expOf(BE91_X), lit(-1)), lit(2))),
);

/** c_V = (π²/2) n k_B² T / E_F. */
const BE92_SYMBOLIC: ExprNode = ratio(
  prod(ratio(pow(pi, lit(2)), lit(2)), qsym(sommerfeldDensityQ), pow(csym('k_B'), lit(2)), qsym(sommerfeldTemperatureQ)),
  qsym(sommerfeldFermiEnergyQ),
);

/** χ = C/(T−θ), C = μ₀ n g² μ_B² S(S+1)/(3 k_B). */
const BE93_C: ExprNode = ratio(
  prod(
    mu0,
    qsym(curieDensityQ),
    pow(qsym(curieGFactorQ), lit(2)),
    pow(qsym(curieMagnetonQ), lit(2)),
    qsym(curieSpinQ),
    plus(qsym(curieSpinQ), lit(1)),
  ),
  prod(lit(3), csym('k_B')),
);
const BE93_SYMBOLIC: ExprNode = ratio(
  BE93_C,
  plus(qsym(curieTemperatureQ), prod(lit(-1), qsym(weissTemperatureQ))),
);

/** χ_P = μ₀ μ_B² (3 n)/(2 E_F). */
const BE94_SYMBOLIC: ExprNode = ratio(
  prod(mu0, pow(qsym(pauliMagnetonQ), lit(2)), lit(3), qsym(pauliDensityQ)),
  prod(lit(2), qsym(pauliFermiEnergyQ)),
);

/** Trial factor 1/κ² − 2. */
const BE95_SYMBOLIC: ExprNode = plus(ratio(lit(1), pow(qsym(glKappaQ), lit(2))), lit(-2));

/** B_c2 = ℏ / (2 e ξ²). */
const BE96_SYMBOLIC: ExprNode = ratio(
  csym('hbar'),
  prod(lit(2), csym('e'), pow(qsym(upperCriticalLengthQ), lit(2))),
);

/** I_c R_n = π Δ / (2 e). */
const BE97_SYMBOLIC: ExprNode = ratio(prod(pi, qsym(ambegaokarGapQ)), prod(lit(2), csym('e')));

/** ΔC/C_n = 12/(7 ζ). */
const BE98_SYMBOLIC: ExprNode = ratio(lit(12), prod(lit(7), qsym(bcsQuarticQ)));

/** n_i = √(N_c N_v) exp(−E_g/(2 k_B T)). */
const BE99_SYMBOLIC: ExprNode = prod(
  pow(prod(qsym(conductionDosQ), qsym(valenceDosQ)), lit(0.5)),
  expOf(
    prod(
      lit(-1),
      ratio(qsym(massActionGapQ), prod(lit(2), csym('k_B'), qsym(massActionTemperatureQ))),
    ),
  ),
);

/** ω_LO²/ω_TO² = ε(0)/ε(∞). */
const BE100_SYMBOLIC: ExprNode = ratio(qsym(lstStaticQ), qsym(lstInfinityQ));

/** T = π J / (2 k_B). */
const BE101_SYMBOLIC: ExprNode = ratio(prod(pi, qsym(bktStiffnessQ)), prod(lit(2), csym('k_B')));

/** G = (2 e²/h) Σ T_n. */
const BE102_SYMBOLIC: ExprNode = prod(
  ratio(prod(lit(2), pow(csym('e'), lit(2))), csym('h')),
  qsym(landauerTransmissionQ),
);

/**
 * BE-88 two-spin Fermi wavevector. The edge value is k_F.
 * E_F and v_F are the same evaluator and are not this target.
 *
 * @public
 */
export const be88Edge: BridgeEdge = withBoundAliases({
  id: 'be-88',
  beId: 88,
  kind: 'law',
  label: 'Fermi wavevector k_F = (3 π² n)^{1/3}',
  sources: [fermiSeaDensityQ, fermiSeaMassQ],
  aliases: {
    'fermi-sea-density': ['n_per_m3'],
    'fermi-sea-mass': ['m_kg'],
  },
  target: fermiWavevectorQ,
  confidence: 'established',
  domain: {
    description: 'n > 0, m* > 0; two spins, T = 0, isotropic parabola',
    predicate: (i) => finite(i['fermi-sea-density']) && i['fermi-sea-density'] > 0 && finite(i['fermi-sea-mass']) && i['fermi-sea-mass'] > 0,
  },
  evaluate: (i) => evaluateFermiSea({ n_per_m3: i['fermi-sea-density'], m_kg: i['fermi-sea-mass'] }).k_F_per_m,
  symbolic: BE88_SYMBOLIC,
  citation:
    'PhysJS.FermiSea.fermi_sea. One spin is k_F³ = 6 π² n. Not a lattice band. The band, the two-spin count, and T = 0 are hypotheses.',
});

/**
 * BE-89 Debye cutoff. Three branches fill 3n states.
 *
 * @public
 */
export const be89Edge: BridgeEdge = withBoundAliases({
  id: 'be-89',
  beId: 89,
  kind: 'law',
  label: 'Debye cutoff ω_D = v_s (6 π² n)^{1/3}',
  sources: [debyeSoundSpeedQ, debyeAtomDensityQ],
  aliases: {
    'debye-sound-speed': ['v_m_per_s'],
    'debye-atom-density': ['n_per_m3'],
  },
  target: debyeCutoffFrequencyQ,
  confidence: 'established',
  domain: {
    description: 'v_s > 0, n > 0; three acoustic branches, one speed',
    predicate: (i) => finite(i['debye-sound-speed']) && i['debye-sound-speed'] > 0 && finite(i['debye-atom-density']) && i['debye-atom-density'] > 0,
  },
  evaluate: (i) =>
    evaluateDebyeCutoff({ v_m_per_s: i['debye-sound-speed'], n_per_m3: i['debye-atom-density'] }).omega_D_rad_per_s,
  symbolic: BE89_SYMBOLIC,
  citation:
    'PhysJS.DebyeCutoff.debye_cutoff. Equating the three-branch sum to n gives k_D³ = 2 π² n. The branch count and the common speed are hypotheses.',
});

/**
 * BE-90 Debye heat capacity. π⁴/15 is a hypothesis.
 *
 * @public
 */
export const be90Edge: BridgeEdge = withBoundAliases({
  id: 'be-90',
  beId: 90,
  kind: 'law',
  label: 'Debye heat capacity C_V = (12 π⁴/5) N k_B (T/θ_D)³',
  sources: [debyeAtomCountQ, debyeTemperatureQ, debyeThetaQ],
  aliases: {
    'debye-atom-count': ['N'],
    'debye-temperature': ['T_K'],
    'debye-theta': ['thetaD_K'],
  },
  target: debyeHeatCapacityQ,
  confidence: 'established',
  domain: {
    description: 'N > 0, T > 0, θ_D > 0; I = π⁴/15 is assumed',
    predicate: (i) =>
      finite(i['debye-atom-count']) && i['debye-atom-count'] > 0 &&
      finite(i['debye-temperature']) && i['debye-temperature'] > 0 &&
      finite(i['debye-theta']) && i['debye-theta'] > 0,
  },
  evaluate: (i) =>
    evaluateDebyeHeat({
      N: i['debye-atom-count'],
      T_K: i['debye-temperature'],
      thetaD_K: i['debye-theta'],
    }).C_V_J_per_K,
  symbolic: BE90_SYMBOLIC,
  citation:
    'PhysJS.DebyeHeat.debye_heat. I = π⁴/15 is a hypothesis, not an evaluation of the Bose integral. The energy prefactor 3 π⁴/5 is not the heat capacity.',
});

/**
 * BE-91 Einstein solid. Three oscillators. The zero-point is constant.
 *
 * @public
 */
export const be91Edge: BridgeEdge = withBoundAliases({
  id: 'be-91',
  beId: 91,
  kind: 'law',
  label: 'Einstein heat capacity of three oscillators',
  sources: [einsteinAtomCountQ, einsteinSolidTemperatureQ, einsteinThetaQ],
  aliases: {
    'einstein-atom-count': ['N'],
    'einstein-solid-temperature': ['T_K'],
    'einstein-theta': ['thetaE_K'],
  },
  target: einsteinHeatCapacityQ,
  confidence: 'established',
  domain: {
    description: 'N > 0, T > 0, θ_E > 0; three Einstein oscillators',
    predicate: (i) =>
      finite(i['einstein-atom-count']) && i['einstein-atom-count'] > 0 &&
      finite(i['einstein-solid-temperature']) && i['einstein-solid-temperature'] > 0 &&
      finite(i['einstein-theta']) && i['einstein-theta'] > 0,
  },
  evaluate: (i) =>
    evaluateEinsteinSolid({
      N: i['einstein-atom-count'],
      T_K: i['einstein-solid-temperature'],
      thetaE_K: i['einstein-theta'],
    }).C_V_J_per_K,
  symbolic: BE91_SYMBOLIC,
  citation:
    'PhysJS.EinsteinSolid.einstein_heat. The high-temperature limit is 3 N k_B. One oscillator tends to N k_B. The zero-point is constant.',
});

/**
 * BE-92 Sommerfeld electronic heat. √E density, not a flat density.
 *
 * @public
 */
export const be92Edge: BridgeEdge = withBoundAliases({
  id: 'be-92',
  beId: 92,
  kind: 'law',
  label: 'Sommerfeld heat c_V = (π²/2) n k_B² T / E_F',
  sources: [sommerfeldDensityQ, sommerfeldTemperatureQ, sommerfeldFermiEnergyQ],
  aliases: {
    'sommerfeld-density': ['n_per_m3'],
    'sommerfeld-temperature': ['T_K'],
    'sommerfeld-fermi-energy': ['E_F_J'],
  },
  target: sommerfeldHeatCapacityQ,
  confidence: 'established',
  domain: {
    description: 'n > 0, T > 0, E_F > 0; δU is a hypothesis; √E density',
    predicate: (i) =>
      finite(i['sommerfeld-density']) && i['sommerfeld-density'] > 0 &&
      finite(i['sommerfeld-temperature']) && i['sommerfeld-temperature'] > 0 &&
      finite(i['sommerfeld-fermi-energy']) && i['sommerfeld-fermi-energy'] > 0,
  },
  evaluate: (i) =>
    evaluateSommerfeldHeat({
      n_per_m3: i['sommerfeld-density'],
      T_K: i['sommerfeld-temperature'],
      E_F_J: i['sommerfeld-fermi-energy'],
    }).c_V_J_per_K_m3,
  symbolic: BE92_SYMBOLIC,
  citation:
    'PhysJS.SommerfeldHeat.electronic_heat. A flat density leaves π²/3. Not the Wiedemann–Franz law and not a second proof of be-61.',
});

/**
 * BE-93 Curie–Weiss law. θ is the mean-field hypothesis.
 *
 * @public
 */
export const be93Edge: BridgeEdge = withBoundAliases({
  id: 'be-93',
  beId: 93,
  kind: 'law',
  label: 'Curie–Weiss susceptibility χ = C/(T−θ)',
  sources: [curieDensityQ, curieGFactorQ, curieSpinQ, curieMagnetonQ, curieTemperatureQ, weissTemperatureQ],
  aliases: {
    'curie-density': ['n_per_m3'],
    'curie-g-factor': ['g'],
    'curie-spin': ['spin'],
    'curie-magneton': ['muB_J_per_T'],
    'curie-temperature': ['T_K'],
    'weiss-temperature': ['theta_K'],
  },
  target: curieWeissSusceptibilityQ,
  confidence: 'established',
  domain: {
    description: 'n > 0, μ_B > 0, spin ≥ 0, T ≠ θ; second moment and mean field are hypotheses',
    predicate: (i) =>
      finite(i['curie-density']) && i['curie-density'] > 0 &&
      finite(i['curie-g-factor']) &&
      finite(i['curie-spin']) && i['curie-spin'] >= 0 &&
      finite(i['curie-magneton']) && i['curie-magneton'] > 0 &&
      finite(i['curie-temperature']) && finite(i['weiss-temperature']) &&
      i['curie-temperature'] !== i['weiss-temperature'],
  },
  evaluate: (i) =>
    evaluateCurieWeiss({
      n_per_m3: i['curie-density'],
      g: i['curie-g-factor'],
      spin: i['curie-spin'],
      muB_J_per_T: i['curie-magneton'],
      T_K: i['curie-temperature'],
      theta_K: i['weiss-temperature'],
    }).chi,
  symbolic: BE93_SYMBOLIC,
  citation:
    'PhysJS.CurieWeiss.curie_weiss. θ = 0 is C/T. Not an su(2) derivation. The second moment and the mean-field shift are hypotheses.',
});

/**
 * BE-94 Pauli paramagnetism. Not Landau diamagnetism.
 *
 * @public
 */
export const be94Edge: BridgeEdge = withBoundAliases({
  id: 'be-94',
  beId: 94,
  kind: 'law',
  label: 'Pauli susceptibility χ_P = μ₀ μ_B² (3 n)/(2 E_F)',
  sources: [pauliDensityQ, pauliFermiEnergyQ, pauliMagnetonQ],
  aliases: {
    'pauli-density': ['n_per_m3'],
    'pauli-fermi-energy': ['E_F_J'],
    'pauli-magneton': ['muB_J_per_T'],
  },
  target: pauliSusceptibilityQ,
  confidence: 'established',
  domain: {
    description: 'n > 0, E_F > 0, μ_B > 0; Zeeman imbalance is a hypothesis',
    predicate: (i) =>
      finite(i['pauli-density']) && i['pauli-density'] > 0 &&
      finite(i['pauli-fermi-energy']) && i['pauli-fermi-energy'] > 0 &&
      finite(i['pauli-magneton']) && i['pauli-magneton'] > 0,
  },
  evaluate: (i) =>
    evaluatePauliParamagnetism({
      n_per_m3: i['pauli-density'],
      E_F_J: i['pauli-fermi-energy'],
      muB_J_per_T: i['pauli-magneton'],
    }).chi_P,
  symbolic: BE94_SYMBOLIC,
  citation:
    'PhysJS.PauliParamagnetism.pauli. A flat density leaves the factor 1. Not Landau diamagnetism.',
});

/**
 * BE-95 trial-wall sign. Not every minimizer.
 *
 * @public
 */
export const be95Edge: BridgeEdge = withBoundAliases({
  id: 'be-95',
  beId: 95,
  kind: 'law',
  label: 'GL trial-wall factor 1/κ² − 2',
  sources: [glKappaQ],
  aliases: { 'gl-kappa': ['kappa'] },
  target: glTrialFactorQ,
  confidence: 'established',
  domain: {
    description: 'κ > 0; the factor multiplies this trial, not every minimizer',
    predicate: (i) => finite(i['gl-kappa']) && i['gl-kappa'] > 0,
  },
  evaluate: (i) => evaluateGinzburgLandau({ kappa: i['gl-kappa'] }).trial_factor,
  symbolic: BE95_SYMBOLIC,
  citation:
    'PhysJS.GinzburgLandau.type_boundary. Negative when κ > 1/√2. The positive side is this trial, not every minimizer.',
});

/**
 * BE-96 upper critical field. Charge 2e. The Landau level is a hypothesis.
 *
 * @public
 */
export const be96Edge: BridgeEdge = withBoundAliases({
  id: 'be-96',
  beId: 96,
  kind: 'law',
  label: 'Upper critical field B_c2 = ℏ/(2 e ξ²)',
  sources: [upperCriticalLengthQ],
  aliases: { 'upper-critical-length': ['xi_m'] },
  target: upperCriticalFieldQ,
  confidence: 'established',
  domain: {
    description: 'ξ > 0; charge q = 2e; the Landau level is a hypothesis',
    predicate: (i) => finite(i['upper-critical-length']) && i['upper-critical-length'] > 0,
  },
  evaluate: (i) => evaluateUpperCritical({ xi_m: i['upper-critical-length'] }).B_c2_T,
  symbolic: BE96_SYMBOLIC,
  citation:
    'PhysJS.UpperCritical.critical_field. Charge e instead of 2e is a different field. Not the spectrum of the covariant Laplacian.',
});

/**
 * BE-97 Ambegaokar–Baratoff at T = 0. No temperature input.
 *
 * @public
 */
export const be97Edge: BridgeEdge = withBoundAliases({
  id: 'be-97',
  beId: 97,
  kind: 'law',
  label: 'Ambegaokar–Baratoff I_c R_n = π Δ/(2 e) at T = 0',
  sources: [ambegaokarGapQ],
  aliases: { 'ambegaokar-gap': ['Delta_J'] },
  target: ambegaokarProductQ,
  confidence: 'established',
  domain: {
    description: 'Δ > 0; T = 0 and identical gaps are hypotheses',
    predicate: (i) => finite(i['ambegaokar-gap']) && i['ambegaokar-gap'] > 0,
  },
  evaluate: (i) => evaluateAmbegaokarBaratoff({ Delta_J: i['ambegaokar-gap'] }).IcRn_V,
  symbolic: BE97_SYMBOLIC,
  citation:
    'PhysJS.AmbegaokarBaratoff.ambegaokar_baratoff. A coefficient other than π/2 fails. Not the finite-temperature tanh factor.',
});

/**
 * BE-98 BCS jump. ζ is the quartic coefficient.
 *
 * @public
 */
export const be98Edge: BridgeEdge = withBoundAliases({
  id: 'be-98',
  beId: 98,
  kind: 'law',
  label: 'BCS heat jump ΔC/C_n = 12/(7 ζ)',
  sources: [bcsQuarticQ],
  aliases: { 'bcs-quartic': ['zeta'] },
  target: bcsHeatJumpQ,
  confidence: 'established',
  domain: {
    description: 'ζ finite and nonzero; ζ is the quartic coefficient',
    predicate: (i) => finite(i['bcs-quartic']) && i['bcs-quartic'] !== 0,
  },
  evaluate: (i) => evaluateBcsJump({ zeta: i['bcs-quartic'] }).ratio,
  symbolic: BE98_SYMBOLIC,
  citation:
    'PhysJS.BcsJump.heat_jump. ζ is the quartic coefficient, not a series evaluation. One spin in C_n misses the ratio.',
});

/**
 * BE-99 mass action. The 2 in the exponent stays.
 *
 * @public
 */
export const be99Edge: BridgeEdge = withBoundAliases({
  id: 'be-99',
  beId: 99,
  kind: 'law',
  label: 'Mass action n_i = √(N_c N_v) exp(−E_g/(2 k_B T))',
  sources: [conductionDosQ, valenceDosQ, massActionGapQ, massActionTemperatureQ],
  aliases: {
    'conduction-dos': ['N_c_per_m3'],
    'valence-dos': ['N_v_per_m3'],
    'mass-action-gap': ['E_g_J'],
    'mass-action-temperature': ['T_K'],
  },
  target: massActionDensityQ,
  confidence: 'established',
  domain: {
    description: 'N_c > 0, N_v > 0, T > 0; Boltzmann tails are hypotheses',
    predicate: (i) =>
      finite(i['conduction-dos']) && i['conduction-dos'] > 0 &&
      finite(i['valence-dos']) && i['valence-dos'] > 0 &&
      finite(i['mass-action-gap']) &&
      finite(i['mass-action-temperature']) && i['mass-action-temperature'] > 0,
  },
  evaluate: (i) =>
    evaluateMassAction({
      N_c_per_m3: i['conduction-dos'],
      N_v_per_m3: i['valence-dos'],
      E_g_J: i['mass-action-gap'],
      T_K: i['mass-action-temperature'],
    }).n_i_per_m3,
  symbolic: BE99_SYMBOLIC,
  citation:
    'PhysJS.MassAction.mass_action. Dropping the 2 in the exponent is a different density. Not a Fermi–Dirac integral.',
});

/**
 * BE-100 Lyddane–Sachs–Teller. No damping.
 *
 * @public
 */
export const be100Edge: BridgeEdge = withBoundAliases({
  id: 'be-100',
  beId: 100,
  kind: 'law',
  label: 'Lyddane–Sachs–Teller ω_LO²/ω_TO² = ε(0)/ε(∞)',
  sources: [lstStaticQ, lstInfinityQ],
  aliases: {
    'lst-static': ['eps_static'],
    'lst-infinity': ['eps_inf'],
  },
  target: lstRatioQ,
  confidence: 'established',
  domain: {
    description: 'ε(∞) ≠ 0; no damping is a hypothesis',
    predicate: (i) => finite(i['lst-static']) && finite(i['lst-infinity']) && i['lst-infinity'] !== 0,
  },
  evaluate: (i) =>
    evaluateLyddaneSachsTeller({ eps_static: i['lst-static'], eps_inf: i['lst-infinity'] }).frequency_ratio_sq,
  symbolic: BE100_SYMBOLIC,
  citation:
    'PhysJS.LyddaneSachsTeller.lst. The unsquared frequency ratio fails when ω_LO ≠ ω_TO. No damping is a hypothesis.',
});

/**
 * BE-101 BKT jump from energy and entropy. Not the RG flow.
 *
 * @public
 */
export const be101Edge: BridgeEdge = withBoundAliases({
  id: 'be-101',
  beId: 101,
  kind: 'law',
  label: 'BKT unbinding k_B T = π J/2',
  sources: [bktStiffnessQ],
  aliases: { 'bkt-stiffness': ['J_J'] },
  target: bktTemperatureQ,
  confidence: 'established',
  domain: {
    description: 'J > 0; area entropy of core positions is the hypothesis',
    predicate: (i) => finite(i['bkt-stiffness']) && i['bkt-stiffness'] > 0,
  },
  evaluate: (i) => evaluateBktJump({ J_J: i['bkt-stiffness'] }).T_K,
  symbolic: BE101_SYMBOLIC,
  citation:
    'PhysJS.BktJump.bkt_jump. Circumference entropy unbinds at π J. Not the renormalization-group flow.',
});

/**
 * BE-102 two-spin Landauer conductance. Not the Hall conductance.
 *
 * @public
 */
export const be102Edge: BridgeEdge = withBoundAliases({
  id: 'be-102',
  beId: 102,
  kind: 'law',
  label: 'Landauer conductance G = (2 e²/h) Σ T_n',
  sources: [landauerTransmissionQ],
  aliases: { 'landauer-transmission': ['sum_Tn'] },
  target: landauerChannelConductanceQ,
  confidence: 'established',
  domain: {
    description: 'Σ T_n finite; spin = 2 and Δμ = e V are hypotheses',
    predicate: (i) => finite(i['landauer-transmission']),
  },
  evaluate: (i) => evaluateLandauerConductance({ sum_Tn: i['landauer-transmission'] }).G_S,
  symbolic: BE102_SYMBOLIC,
  citation:
    'PhysJS.LandauerConductance.conductance_eq. One spin is e²/h. Not the Hall conductance and not Landauer erasure.',
});

/** The condensed-matter edges of PhysJS #65, in catalog-id order. @public */
export const CONDENSED_R5_EDGES: readonly BridgeEdge[] = [
  be88Edge,
  be89Edge,
  be90Edge,
  be91Edge,
  be92Edge,
  be93Edge,
  be94Edge,
  be95Edge,
  be96Edge,
  be97Edge,
  be98Edge,
  be99Edge,
  be100Edge,
  be101Edge,
  be102Edge,
];
