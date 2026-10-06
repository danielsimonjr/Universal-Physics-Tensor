/**
 * Composition edges for BE-134 through BE-146.
 *
 * Each edge calls the catalog evaluator. The symbolic form is the same
 * scalar. Kind is `law` because the endpoints share classical
 * electromagnetic attributes. The overlay formalRef is kind `bridge`.
 *
 * @module composition/edges/condensed-r8
 */
import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import {
  evaluateAcDrude,
  evaluateBlochLaw,
  evaluateBuiltinVoltage,
  evaluateDensityOfStates2D,
  evaluateDensityOfStates3D,
  evaluateGorterCasimir,
  evaluateJosephsonInductance,
  evaluateLowerCritical,
  evaluateMatthiessen,
  evaluateOnsagerFrequency,
  evaluateSemiconductorFermi,
  evaluateStoner,
  evaluateThomasFermi,
} from '../../bridges/condensed-r8.js';
import { withBoundAliases, type BridgeEdge } from '../edge.js';
import type { Quantity } from '../quantity.js';
import {
  acdrudeBandmassQ,
  acdrudeConductQ,
  acdrudeN3Q,
  acdrudeRadianQ,
  acdrudeScatterQ,
  blochlawDeficitQ,
  blochlawDstiffQ,
  blochlawMubQ,
  blochlawWarmthQ,
  blochlawZetaQ,
  builtinAcceptorQ,
  builtinDonorQ,
  builtinNiQ,
  builtinVbiQ,
  builtinWarmthQ,
  dos2dBandmassQ,
  dos2dStatesQ,
  dos3dAbscissaQ,
  dos3dBandmassQ,
  dos3dStatesQ,
  fermioffsetElecmassQ,
  fermioffsetHolemassQ,
  fermioffsetMuoffQ,
  fermioffsetWarmthQ,
  gortercasNsQ,
  gortercasTcQ,
  gortercasWarmthQ,
  josephsonlHenryQ,
  josephsonlIcQ,
  lowercritBc1Q,
  lowercritPenQ,
  lowercritXiQ,
  matthsumScatter1Q,
  matthsumScatter2Q,
  matthsumScatterQ,
  onsagerkKareaQ,
  onsagerkOrbitQ,
  stonerchiEnhancedQ,
  stonerchiIgQ,
  stonerchiPauliQ,
  tfscreenChemicalQ,
  tfscreenK2Q,
  tfscreenN3Q,
} from '../quantities.js';

const finite = Number.isFinite;
const qsym = (quantity: Quantity): ExprNode => ({ kind: 'symbol', name: quantity.name, dim: quantity.dim });
const csym = (name: keyof typeof CONSTANTS): ExprNode => ({ kind: 'symbol', name, dim: CONSTANTS[name].dim });
const lit = (n: number): ExprNode => ({ kind: 'symbol', name: String(n), dim: DIMENSIONLESS });
const prod = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const plus = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '+', args });
const minus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '-', args: [a, b] });
const ratio = (num: ExprNode, den: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [num, den] });
const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });
const lnOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'ln', arg });
const pi: ExprNode = { kind: 'symbol', name: 'pi', dim: DIMENSIONLESS };

const domain = (description: string, predicate: (i: Record<string, number>) => boolean) => ({
  description,
  predicate,
});

/** BE-134 Bloch deficit. g = 2 is not this edge. @public */
export const be134Edge: BridgeEdge = withBoundAliases({
  id: 'be-134',
  beId: 134,
  kind: 'law',
  label: 'Bloch deficit ΔM = μ_B ζ(3/2) (k_B T/(4 π D))^{3/2}',
  sources: [blochlawMubQ, blochlawZetaQ, blochlawWarmthQ, blochlawDstiffQ],
  aliases: {
    'blochlaw-mub': ['muB_J_per_T'],
    'blochlaw-zeta': ['zeta_3_2'],
    'blochlaw-warmth': ['T_K'],
    'blochlaw-dstiff': ['D_J_m2'],
  },
  target: blochlawDeficitQ,
  confidence: 'established',
  domain: domain(
    'D > 0 and T ≥ 0',
    (i) => finite(i['blochlaw-dstiff']) && i['blochlaw-dstiff'] > 0 && finite(i['blochlaw-warmth']) && i['blochlaw-warmth'] >= 0,
  ),
  evaluate: (i) =>
    evaluateBlochLaw({
      muB_J_per_T: i['blochlaw-mub'],
      zeta_3_2: i['blochlaw-zeta'],
      T_K: i['blochlaw-warmth'],
      D_J_m2: i['blochlaw-dstiff'],
    }).dM_A_per_m,
  symbolic: prod(
    qsym(blochlawMubQ),
    qsym(blochlawZetaQ),
    pow(ratio(prod(csym('k_B'), qsym(blochlawWarmthQ)), prod(csym('4pi'), qsym(blochlawDstiffQ))), lit(1.5)),
  ),
  citation:
    'PhysJS.BlochLaw.bloch_law. ζ(3/2) is not evaluated. g μ_B at g = 2 is not one Bohr magneton.',
});

/** BE-135 three-dimensional density of states. One spin is half. @public */
export const be135Edge: BridgeEdge = withBoundAliases({
  id: 'be-135',
  beId: 135,
  kind: 'law',
  label: 'g(E) = (1/(2 π²)) (2 m/ℏ²)^{3/2} √E',
  sources: [dos3dBandmassQ, dos3dAbscissaQ],
  aliases: {
    'dos3d-bandmass': ['m_kg'],
    'dos3d-abscissa': ['E_J'],
  },
  target: dos3dStatesQ,
  confidence: 'established',
  domain: domain(
    'm > 0 and E ≥ 0',
    (i) => finite(i['dos3d-bandmass']) && i['dos3d-bandmass'] > 0 && finite(i['dos3d-abscissa']) && i['dos3d-abscissa'] >= 0,
  ),
  evaluate: (i) =>
    evaluateDensityOfStates3D({ m_kg: i['dos3d-bandmass'], E_J: i['dos3d-abscissa'] }).g_per_J_m3,
  symbolic: prod(
    ratio(lit(1), prod(lit(2), pow(pi, lit(2)))),
    pow(ratio(prod(lit(2), qsym(dos3dBandmassQ)), pow(csym('hbar'), lit(2))), lit(1.5)),
    pow(qsym(dos3dAbscissaQ), lit(0.5)),
  ),
  citation: 'PhysJS.DensityOfStates3D.dos_3d. One spin replaces 1/(2 π²) by 1/(4 π²). Not be-88.',
});

/** BE-136 two-dimensional density of states. A valley factor is not 1. @public */
export const be136Edge: BridgeEdge = withBoundAliases({
  id: 'be-136',
  beId: 136,
  kind: 'law',
  label: 'g = m / (π ℏ²)',
  sources: [dos2dBandmassQ],
  aliases: { 'dos2d-bandmass': ['m_kg'] },
  target: dos2dStatesQ,
  confidence: 'established',
  domain: domain('m ≠ 0', (i) => finite(i['dos2d-bandmass']) && i['dos2d-bandmass'] !== 0),
  evaluate: (i) => evaluateDensityOfStates2D({ m_kg: i['dos2d-bandmass'] }).g_per_J_m2,
  symbolic: ratio(qsym(dos2dBandmassQ), prod(pi, pow(csym('hbar'), lit(2)))),
  citation: 'PhysJS.DensityOfStates2D.dos_2d. A valley factor other than 1 is not this density.',
});

/** BE-137 Thomas–Fermi wavevector squared. A flat density drops 3/2. @public */
export const be137Edge: BridgeEdge = withBoundAliases({
  id: 'be-137',
  beId: 137,
  kind: 'law',
  label: 'k_TF² = (e²/ε0) (3 n)/(2 E_F)',
  sources: [tfscreenN3Q, tfscreenChemicalQ],
  aliases: {
    'tfscreen-n3': ['n_per_m3'],
    'tfscreen-chemical': ['EF_J'],
  },
  target: tfscreenK2Q,
  confidence: 'established',
  domain: domain(
    'E_F > 0',
    (i) => finite(i['tfscreen-n3']) && finite(i['tfscreen-chemical']) && i['tfscreen-chemical'] > 0,
  ),
  evaluate: (i) => evaluateThomasFermi({ n_per_m3: i['tfscreen-n3'], EF_J: i['tfscreen-chemical'] }).k2_per_m2,
  symbolic: prod(
    ratio(pow(csym('e'), lit(2)), csym('epsilon_0')),
    ratio(prod(lit(3), qsym(tfscreenN3Q)), prod(lit(2), qsym(tfscreenChemicalQ))),
  ),
  citation: 'PhysJS.ThomasFermi.thomas_fermi. A flat density leaves the factor 1. Not the Debye length.',
});

/** BE-138 built-in voltage. The logarithm is the catalog value. @public */
export const be138Edge: BridgeEdge = withBoundAliases({
  id: 'be-138',
  beId: 138,
  kind: 'law',
  label: 'V_bi = (k_B T/e) ln(N_A N_D/n_i²)',
  sources: [builtinWarmthQ, builtinAcceptorQ, builtinDonorQ, builtinNiQ],
  aliases: {
    'builtin-warmth': ['T_K'],
    'builtin-acceptor': ['NA_per_m3'],
    'builtin-donor': ['ND_per_m3'],
    'builtin-ni': ['ni_per_m3'],
  },
  target: builtinVbiQ,
  confidence: 'established',
  domain: domain(
    'N_A > 0, N_D > 0, and n_i > 0',
    (i) =>
      finite(i['builtin-warmth']) &&
      finite(i['builtin-acceptor']) &&
      i['builtin-acceptor'] > 0 &&
      finite(i['builtin-donor']) &&
      i['builtin-donor'] > 0 &&
      finite(i['builtin-ni']) &&
      i['builtin-ni'] > 0,
  ),
  evaluate: (i) =>
    evaluateBuiltinVoltage({
      T_K: i['builtin-warmth'],
      NA_per_m3: i['builtin-acceptor'],
      ND_per_m3: i['builtin-donor'],
      ni_per_m3: i['builtin-ni'],
    }).V_bi_V,
  symbolic: prod(
    ratio(prod(csym('k_B'), qsym(builtinWarmthQ)), csym('e')),
    lnOf(ratio(prod(qsym(builtinAcceptorQ), qsym(builtinDonorQ)), pow(qsym(builtinNiQ), lit(2)))),
  ),
  citation: 'PhysJS.BuiltinVoltage.builtin_voltage. Not the ideal diode of be-82.',
});

/** BE-139 intrinsic Fermi offset. The extrinsic energy is not this edge. @public */
export const be139Edge: BridgeEdge = withBoundAliases({
  id: 'be-139',
  beId: 139,
  kind: 'law',
  label: 'E_F − (E_c+E_v)/2 = (3/4) k_B T ln(m_h*/m_e*)',
  sources: [fermioffsetWarmthQ, fermioffsetHolemassQ, fermioffsetElecmassQ],
  aliases: {
    'fermioffset-warmth': ['T_K'],
    'fermioffset-holemass': ['mh_kg'],
    'fermioffset-elecmass': ['me_kg'],
  },
  target: fermioffsetMuoffQ,
  confidence: 'established',
  domain: domain(
    'T ≠ 0, m_h* > 0, and m_e* > 0',
    (i) =>
      finite(i['fermioffset-warmth']) &&
      i['fermioffset-warmth'] !== 0 &&
      finite(i['fermioffset-holemass']) &&
      i['fermioffset-holemass'] > 0 &&
      finite(i['fermioffset-elecmass']) &&
      i['fermioffset-elecmass'] > 0,
  ),
  evaluate: (i) =>
    evaluateSemiconductorFermi({
      T_K: i['fermioffset-warmth'],
      mh_kg: i['fermioffset-holemass'],
      me_kg: i['fermioffset-elecmass'],
      Nc_per_m3: 1,
      ND_per_m3: 1,
    }).intrinsic_offset_J,
  symbolic: prod(
    ratio(lit(3), lit(4)),
    csym('k_B'),
    qsym(fermioffsetWarmthQ),
    lnOf(ratio(qsym(fermioffsetHolemassQ), qsym(fermioffsetElecmassQ))),
  ),
  citation:
    'PhysJS.SemiconductorFermi.fermi_level. The 3/4 is half of 3/2. The edge value is the intrinsic offset.',
});

/** BE-140 Onsager frequency. Dropping 2 π is not this field. @public */
export const be140Edge: BridgeEdge = withBoundAliases({
  id: 'be-140',
  beId: 140,
  kind: 'law',
  label: 'F = ℏ A / (2 π e)',
  sources: [onsagerkKareaQ],
  aliases: { 'onsagerk-karea': ['A_per_m2'] },
  target: onsagerkOrbitQ,
  confidence: 'established',
  domain: domain('A is finite', (i) => finite(i['onsagerk-karea'])),
  evaluate: (i) => evaluateOnsagerFrequency({ A_per_m2: i['onsagerk-karea'] }).F_T,
  symbolic: ratio(prod(csym('hbar'), qsym(onsagerkKareaQ)), prod(csym('2pi'), csym('e'))),
  citation: 'PhysJS.OnsagerFrequency.onsager_frequency. γ cancels. Δ(1/B) = 1/F.',
});

/** BE-141 Josephson inductance at φ = 0. @public */
export const be141Edge: BridgeEdge = withBoundAliases({
  id: 'be-141',
  beId: 141,
  kind: 'law',
  label: 'L_J = ℏ / (2 e I_c)',
  sources: [josephsonlIcQ],
  aliases: { 'josephsonl-ic': ['Ic_A'] },
  target: josephsonlHenryQ,
  confidence: 'established',
  domain: domain('I_c ≠ 0', (i) => finite(i['josephsonl-ic']) && i['josephsonl-ic'] !== 0),
  evaluate: (i) => evaluateJosephsonInductance({ Ic_A: i['josephsonl-ic'] }).L_H,
  symbolic: ratio(csym('hbar'), prod(lit(2), csym('e'), qsym(josephsonlIcQ))),
  citation: 'PhysJS.JosephsonInductance.inductance_eq. cos φ = 1 at φ = 0. Not be-59.',
});

/** BE-142 lower critical field. The 4 π stays. @public */
export const be142Edge: BridgeEdge = withBoundAliases({
  id: 'be-142',
  beId: 142,
  kind: 'law',
  label: 'B_c1 = (Φ₀/(4 π λ²)) ln(λ/ξ), Φ₀ = h/(2 e)',
  sources: [lowercritPenQ, lowercritXiQ],
  aliases: {
    'lowercrit-pen': ['lambda_m'],
    'lowercrit-xi': ['xi_m'],
  },
  target: lowercritBc1Q,
  confidence: 'established',
  domain: domain(
    '0 < ξ < λ',
    (i) =>
      finite(i['lowercrit-xi']) &&
      i['lowercrit-xi'] > 0 &&
      finite(i['lowercrit-pen']) &&
      i['lowercrit-pen'] > i['lowercrit-xi'],
  ),
  evaluate: (i) =>
    evaluateLowerCritical({ lambda_m: i['lowercrit-pen'], xi_m: i['lowercrit-xi'] }).B_c1_T,
  symbolic: prod(
    ratio(ratio(csym('h'), prod(lit(2), csym('e'))), prod(csym('4pi'), pow(qsym(lowercritPenQ), lit(2)))),
    lnOf(ratio(qsym(lowercritPenQ), qsym(lowercritXiQ))),
  ),
  citation: 'PhysJS.LowerCritical.lower_critical. Not be-96.',
});

/** BE-143 real AC Drude conductivity. The DC 1 stays. @public */
export const be143Edge: BridgeEdge = withBoundAliases({
  id: 'be-143',
  beId: 143,
  kind: 'law',
  label: 'Re σ = (n e² τ/m) / (1 + ω² τ²)',
  sources: [acdrudeN3Q, acdrudeBandmassQ, acdrudeScatterQ, acdrudeRadianQ],
  aliases: {
    'acdrude-n3': ['n_per_m3'],
    'acdrude-bandmass': ['m_kg'],
    'acdrude-scatter': ['tau_s'],
    'acdrude-radian': ['omega_rad_s'],
  },
  target: acdrudeConductQ,
  confidence: 'established',
  domain: domain(
    'τ > 0 and m ≠ 0',
    (i) =>
      finite(i['acdrude-n3']) &&
      finite(i['acdrude-bandmass']) &&
      i['acdrude-bandmass'] !== 0 &&
      finite(i['acdrude-scatter']) &&
      i['acdrude-scatter'] > 0 &&
      finite(i['acdrude-radian']),
  ),
  evaluate: (i) =>
    evaluateAcDrude({
      n_per_m3: i['acdrude-n3'],
      m_kg: i['acdrude-bandmass'],
      tau_s: i['acdrude-scatter'],
      omega_rad_s: i['acdrude-radian'],
    }).sigma_S_per_m,
  symbolic: ratio(
    prod(qsym(acdrudeN3Q), pow(csym('e'), lit(2)), qsym(acdrudeScatterQ)),
    prod(qsym(acdrudeBandmassQ), plus(lit(1), prod(pow(qsym(acdrudeRadianQ), lit(2)), pow(qsym(acdrudeScatterQ), lit(2))))),
  ),
  citation: 'PhysJS.AcDrude.ac_drude. Dropping the DC 1 is not this conductivity. Not be-123.',
});

/** BE-144 Matthiessen lifetime. One lifetime is not the parallel sum. @public */
export const be144Edge: BridgeEdge = withBoundAliases({
  id: 'be-144',
  beId: 144,
  kind: 'law',
  label: 'τ = 1 / (1/τ₁ + 1/τ₂)',
  sources: [matthsumScatter1Q, matthsumScatter2Q],
  aliases: {
    'matthsum-scatter1': ['tau1_s'],
    'matthsum-scatter2': ['tau2_s'],
  },
  target: matthsumScatterQ,
  confidence: 'established',
  domain: domain(
    'τ₁ ≠ 0, τ₂ ≠ 0, and 1/τ₁ + 1/τ₂ ≠ 0',
    (i) =>
      finite(i['matthsum-scatter1']) &&
      i['matthsum-scatter1'] !== 0 &&
      finite(i['matthsum-scatter2']) &&
      i['matthsum-scatter2'] !== 0 &&
      1 / i['matthsum-scatter1'] + 1 / i['matthsum-scatter2'] !== 0,
  ),
  evaluate: (i) =>
    evaluateMatthiessen({
      tau1_s: i['matthsum-scatter1'],
      tau2_s: i['matthsum-scatter2'],
      C_ohm_m_s: 1,
    }).tau_s,
  symbolic: ratio(
    lit(1),
    plus(ratio(lit(1), qsym(matthsumScatter1Q)), ratio(lit(1), qsym(matthsumScatter2Q))),
  ),
  citation: 'PhysJS.Matthiessen.matthiessen. The edge value is τ. ρ = ρ₁ + ρ₂ is the same rate sum.',
});

/** BE-145 Stoner susceptibility. Two bubbles are not the closed form. @public */
export const be145Edge: BridgeEdge = withBoundAliases({
  id: 'be-145',
  beId: 145,
  kind: 'law',
  label: 'χ = χ_P / (1 − I g(E_F))',
  sources: [stonerchiPauliQ, stonerchiIgQ],
  aliases: {
    'stonerchi-pauli': ['chi_P'],
    'stonerchi-ig': ['x'],
  },
  target: stonerchiEnhancedQ,
  confidence: 'established',
  domain: domain(
    '|x| < 1',
    (i) => finite(i['stonerchi-pauli']) && finite(i['stonerchi-ig']) && Math.abs(i['stonerchi-ig']) < 1,
  ),
  evaluate: (i) => evaluateStoner({ chi_P: i['stonerchi-pauli'], x: i['stonerchi-ig'] }).chi,
  symbolic: ratio(qsym(stonerchiPauliQ), minus(lit(1), qsym(stonerchiIgQ))),
  citation: 'PhysJS.Stoner.stoner. χ_P is be-94 and is not re-proved. The pole is the same formula.',
});

/** BE-146 Gorter–Casimir fraction. The edge value is n_s/n. @public */
export const be146Edge: BridgeEdge = withBoundAliases({
  id: 'be-146',
  beId: 146,
  kind: 'law',
  label: 'n_s/n = 1 − (T/T_c)^4',
  sources: [gortercasWarmthQ, gortercasTcQ],
  aliases: {
    'gortercas-warmth': ['T_K'],
    'gortercas-tc': ['Tc_K'],
  },
  target: gortercasNsQ,
  confidence: 'established',
  domain: domain(
    'T_c > 0 and 0 ≤ T < T_c',
    (i) =>
      finite(i['gortercas-tc']) &&
      i['gortercas-tc'] > 0 &&
      finite(i['gortercas-warmth']) &&
      i['gortercas-warmth'] >= 0 &&
      i['gortercas-warmth'] < i['gortercas-tc'],
  ),
  evaluate: (i) =>
    evaluateGorterCasimir({
      T_K: i['gortercas-warmth'],
      Tc_K: i['gortercas-tc'],
      lambda0_m: 1,
    }).ns_over_n,
  symbolic: minus(lit(1), pow(ratio(qsym(gortercasWarmthQ), qsym(gortercasTcQ)), lit(4))),
  citation:
    'PhysJS.GorterCasimir.gorter_casimir. The exponent 4 is a hypothesis. λ(T) is on the result and is not this edge. Not be-75.',
});

/** Condensed-matter edges, in catalog-id order. @public */
export const CONDENSED_R8_EDGES: readonly BridgeEdge[] = [
  be134Edge,
  be135Edge,
  be136Edge,
  be137Edge,
  be138Edge,
  be139Edge,
  be140Edge,
  be141Edge,
  be142Edge,
  be143Edge,
  be144Edge,
  be145Edge,
  be146Edge,
];
