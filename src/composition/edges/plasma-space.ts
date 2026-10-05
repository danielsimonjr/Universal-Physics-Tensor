/**
 * Composition edges for BE-103 through BE-125.
 *
 * Each edge calls the catalog evaluator. The symbolic form is the same
 * scalar. Kind is `law` because the endpoints share classical
 * electromagnetic attributes. The overlay formalRef is kind `bridge`.
 *
 * @module composition/edges/plasma-space
 */
import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import {
  evaluateBennettPinch,
  evaluateBohmSheath,
  evaluateChapmanFerraro,
  evaluateColdPlasmaCutoff,
  evaluateCrossFieldDiffusion,
  evaluateDebyeSphere,
  evaluateExBDrift,
  evaluateFirehose,
  evaluateGradBDrift,
  evaluateIonAcoustic,
  evaluateLandauDamping,
  evaluateLangmuirProbe,
  evaluateLawsonBreakeven,
  evaluateLorentzResistivity,
  evaluateLossCone,
  evaluateLowerHybrid,
  evaluateMirrorInstability,
  evaluateMultiDebye,
  evaluateObliqueMagnetosonic,
  evaluateParkerCritical,
  evaluateParkerSpiral,
  evaluateResistiveSlab,
  evaluateUpperHybrid,
} from '../../bridges/plasma-space.js';
import { withBoundAliases, type BridgeEdge } from '../edge.js';
import type { Quantity } from '../quantity.js';
import {
  bennettCurrentQ,
  bennettLineDensityQ,
  bennettTemperatureQ,
  bohmElectronTemperatureQ,
  bohmIonMassQ,
  bohmIonSpeedQ,
  crossFieldAlphaQ,
  crossFieldRatioQ,
  cutoffCyclotronQ,
  cutoffPlasmaQ,
  cutoffRFrequencyQ,
  debyeSphereArgumentQ,
  debyeSphereDensityQ,
  debyeSphereLengthQ,
  exbFieldQ,
  exbFieldXQ,
  exbFieldYQ,
  exbSpeedQ,
  firehoseBetaParallelQ,
  firehoseBetaPerpQ,
  firehoseMarginQ,
  gradbChargeQ,
  gradbDriftQ,
  gradbFieldQ,
  gradbGradientQ,
  gradbMassQ,
  gradbPerpSpeedQ,
  ionAcousticDebyeQ,
  ionAcousticFrequencyQ,
  ionAcousticSoundQ,
  ionAcousticWavenumberQ,
  landauGammaQ,
  landauOmegaQ,
  landauThermalQ,
  landauWavenumberQ,
  lawsonEnergyQ,
  lawsonProductQ,
  lawsonReactivityQ,
  lawsonTemperatureQ,
  lorentzChargeStateQ,
  lorentzCoulombLogQ,
  lorentzMassQ,
  lorentzResistivityQ,
  lorentzTemperatureQ,
  lossConeMirrorQ,
  lossConePitchQ,
  lossConeThroatQ,
  lowerHybridElectronCyclotronQ,
  lowerHybridFrequencyQ,
  lowerHybridIonCyclotronQ,
  lowerHybridIonPlasmaQ,
  mirrorBetaPerpQ,
  mirrorMarginQ,
  mirrorTParallelQ,
  mirrorTPerpQ,
  multiDebye1Q,
  multiDebye2Q,
  multiDebyeLengthQ,
  obliqueAlfvenQ,
  obliqueAngleQ,
  obliqueFastSpeedQ,
  obliqueSoundQ,
  parkerMassQ,
  parkerRadiusQ,
  parkerSoundQ,
  probeElectronMassQ,
  probeIonMassQ,
  probePotentialRatioQ,
  slabConductivityQ,
  slabTimeQ,
  slabWidthQ,
  spiralColatitudeQ,
  spiralOmegaQ,
  spiralRadialSpeedQ,
  spiralRadiusQ,
  spiralRatioQ,
  standoffDensityQ,
  standoffFieldQ,
  standoffSixthQ,
  standoffSpeedQ,
  upperHybridDensityQ,
  upperHybridFieldQ,
  upperHybridFrequencyQ,
  upperHybridMassQ,
} from '../quantities.js';

const finite = Number.isFinite;
const qsym = (q: Quantity): ExprNode => ({ kind: 'symbol', name: q.name, dim: q.dim });
const csym = (name: keyof typeof CONSTANTS): ExprNode => ({ kind: 'symbol', name, dim: CONSTANTS[name].dim });
const lit = (n: number): ExprNode => ({ kind: 'symbol', name: String(n), dim: DIMENSIONLESS });
const prod = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const plus = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '+', args });
const minus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '-', args: [a, b] });
const ratio = (num: ExprNode, den: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [num, den] });
const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });
const sqrt = (base: ExprNode): ExprNode => pow(base, lit(0.5));
const expOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'exp', arg });
const lnOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'ln', arg });
const sinOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'sin', arg });
const cosOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'cos', arg });
const absOf = (arg: ExprNode): ExprNode => ({ kind: 'abs', arg });
const pi: ExprNode = { kind: 'symbol', name: 'pi', dim: DIMENSIONLESS };
const mu0: ExprNode = ratio(lit(1), prod(csym('epsilon_0'), pow(csym('c'), lit(2))));

const domain = (description: string, predicate: (i: Record<string, number>) => boolean) => ({
  description,
  predicate,
});

/** BE-103 cold Bohm threshold. γ_i = 3 is the nested warm sound, not this edge. @public */
export const be103Edge: BridgeEdge = withBoundAliases({
  id: 'be-103',
  beId: 103,
  kind: 'law',
  label: 'Bohm cold threshold u0² = k_B T_e / m_i',
  sources: [bohmElectronTemperatureQ, bohmIonMassQ],
  aliases: { 'bohm-electron-temperature': ['T_e_K'], 'bohm-ion-mass': ['m_i_kg'] },
  target: bohmIonSpeedQ,
  confidence: 'established',
  domain: domain('m_i > 0', (i) => finite(i['bohm-ion-mass']) && i['bohm-ion-mass'] > 0),
  evaluate: (i) =>
    evaluateBohmSheath({ T_e_K: i['bohm-electron-temperature'], m_i_kg: i['bohm-ion-mass'] }).u0_m_s,
  symbolic: sqrt(ratio(prod(csym('k_B'), qsym(bohmElectronTemperatureQ)), qsym(bohmIonMassQ))),
  citation:
    'PhysJS.BohmSheath.cold_bohm_threshold. The sound-speed root is the non-negative one. γ_i = 5/3 is not the warm closure.',
});

/** BE-104 ion acoustic dispersion. Warm ions are not this row. @public */
export const be104Edge: BridgeEdge = withBoundAliases({
  id: 'be-104',
  beId: 104,
  kind: 'law',
  label: 'Ion acoustic ω² = k² c_s² / (1 + k² λ_De²)',
  sources: [ionAcousticWavenumberQ, ionAcousticSoundQ, ionAcousticDebyeQ],
  aliases: {
    'ion-acoustic-wavenumber': ['k_per_m'],
    'ion-acoustic-sound': ['c_s_m_per_s'],
    'ion-acoustic-debye': ['lambda_De_m'],
  },
  target: ionAcousticFrequencyQ,
  confidence: 'established',
  domain: domain('k ≠ 0', (i) => finite(i['ion-acoustic-wavenumber']) && i['ion-acoustic-wavenumber'] !== 0),
  evaluate: (i) =>
    evaluateIonAcoustic({
      k_per_m: i['ion-acoustic-wavenumber'],
      c_s_m_s: i['ion-acoustic-sound'],
      lambda_De_m: i['ion-acoustic-debye'],
    }).omega_rad_s,
  symbolic: sqrt(
    ratio(
      prod(pow(qsym(ionAcousticWavenumberQ), lit(2)), pow(qsym(ionAcousticSoundQ), lit(2))),
      plus(lit(1), prod(pow(qsym(ionAcousticWavenumberQ), lit(2)), pow(qsym(ionAcousticDebyeQ), lit(2)))),
    ),
  ),
  citation: 'PhysJS.IonAcoustic.dispersion_eq. Warm ions and a kinetic dispersion are not this row.',
});

/** BE-105 upper hybrid. Not a cyclotron monomial. @public */
export const be105Edge: BridgeEdge = withBoundAliases({
  id: 'be-105',
  beId: 105,
  kind: 'law',
  label: 'Upper hybrid ω² = ω_p² + ω_c²',
  sources: [upperHybridDensityQ, upperHybridFieldQ, upperHybridMassQ],
  aliases: { 'upper-hybrid-density': ['n_per_m3'], 'upper-hybrid-field': ['B_T'], 'upper-hybrid-mass': ['m_kg'] },
  target: upperHybridFrequencyQ,
  confidence: 'established',
  domain: domain('m > 0', (i) => finite(i['upper-hybrid-mass']) && i['upper-hybrid-mass'] > 0),
  evaluate: (i) =>
    evaluateUpperHybrid({
      n_per_m3: i['upper-hybrid-density'],
      B_T: i['upper-hybrid-field'],
      m_kg: i['upper-hybrid-mass'],
    }).omega_rad_s,
  symbolic: sqrt(
    plus(
      ratio(prod(qsym(upperHybridDensityQ), pow(csym('e'), lit(2))), prod(csym('epsilon_0'), qsym(upperHybridMassQ))),
      pow(ratio(prod(csym('e'), qsym(upperHybridFieldQ)), qsym(upperHybridMassQ)), lit(2)),
    ),
  ),
  citation: 'PhysJS.UpperHybrid.upper_hybrid_eq. e is the elementary charge. Not a cyclotron monomial.',
});

/** BE-106 R cutoff. The Stix index is a hypothesis. @public */
export const be106Edge: BridgeEdge = withBoundAliases({
  id: 'be-106',
  beId: 106,
  kind: 'law',
  label: 'R cutoff ω_R = (ω_c + sqrt(ω_c² + 4 ω_p²))/2',
  sources: [cutoffCyclotronQ, cutoffPlasmaQ],
  aliases: { 'cutoff-cyclotron': ['omega_c_rad_s'], 'cutoff-plasma': ['omega_p_rad_s'] },
  target: cutoffRFrequencyQ,
  confidence: 'established',
  domain: domain('ω_c ≥ 0; the Stix index is a hypothesis', (i) => finite(i['cutoff-cyclotron']) && i['cutoff-cyclotron'] >= 0),
  evaluate: (i) =>
    evaluateColdPlasmaCutoff({
      omega_c_rad_s: i['cutoff-cyclotron'],
      omega_p_rad_s: i['cutoff-plasma'],
    }).omega_R_rad_s,
  symbolic: ratio(
    plus(
      qsym(cutoffCyclotronQ),
      sqrt(plus(pow(qsym(cutoffCyclotronQ), lit(2)), prod(lit(4), pow(qsym(cutoffPlasmaQ), lit(2))))),
    ),
    lit(2),
  ),
  citation:
    'PhysJS.ColdPlasmaCutoff.cutoff_R. The cold Stix index n_R² = 1 − ω_p²/(ω(ω − ω_c)) is a hypothesis. The Stix dielectric is not re-derived.',
});

/** BE-107 lower hybrid. Dropping the leading 1 is a separate hypothesis. @public */
export const be107Edge: BridgeEdge = withBoundAliases({
  id: 'be-107',
  beId: 107,
  kind: 'law',
  label: 'Lower hybrid ω² = 1/(1/ω_pi² + 1/(ω_ci ω_ce))',
  sources: [lowerHybridIonPlasmaQ, lowerHybridIonCyclotronQ, lowerHybridElectronCyclotronQ],
  aliases: {
    'lower-hybrid-ion-plasma': ['omega_pi_rad_s'],
    'lower-hybrid-ion-cyclotron': ['omega_ci_rad_s'],
    'lower-hybrid-electron-cyclotron': ['omega_ce_rad_s'],
  },
  target: lowerHybridFrequencyQ,
  confidence: 'established',
  domain: domain('frequencies finite and nonzero', (i) =>
    i['lower-hybrid-ion-plasma'] !== 0 && i['lower-hybrid-ion-cyclotron'] !== 0 && i['lower-hybrid-electron-cyclotron'] !== 0,
  ),
  evaluate: (i) =>
    evaluateLowerHybrid({
      omega_pi_rad_s: i['lower-hybrid-ion-plasma'],
      omega_ci_rad_s: i['lower-hybrid-ion-cyclotron'],
      omega_ce_rad_s: i['lower-hybrid-electron-cyclotron'],
    }).omega_rad_s,
  symbolic: sqrt(
    ratio(
      lit(1),
      plus(
        ratio(lit(1), pow(qsym(lowerHybridIonPlasmaQ), lit(2))),
        ratio(lit(1), prod(qsym(lowerHybridIonCyclotronQ), qsym(lowerHybridElectronCyclotronQ))),
      ),
    ),
  ),
  citation: 'PhysJS.LowerHybrid.lower_hybrid_eq. Dropping the leading 1 leaves ω² = ω_ci ω_ce.',
});

/** BE-108 fast oblique root. The be-69 quartic is a hypothesis. @public */
export const be108Edge: BridgeEdge = withBoundAliases({
  id: 'be-108',
  beId: 108,
  kind: 'law',
  label: 'Oblique fast magnetosonic phase speed',
  sources: [obliqueSoundQ, obliqueAlfvenQ, obliqueAngleQ],
  aliases: { 'oblique-sound': ['c_s_m_per_s'], 'oblique-alfven': ['v_A_m_per_s'], 'oblique-angle': ['theta_rad'] },
  target: obliqueFastSpeedQ,
  confidence: 'established',
  domain: domain('c_s² and v_A² ≥ 0', (i) => finite(i['oblique-sound']) && finite(i['oblique-alfven'])),
  evaluate: (i) =>
    evaluateObliqueMagnetosonic({
      c_s_m_s: i['oblique-sound'],
      v_A_m_s: i['oblique-alfven'],
      theta_rad: i['oblique-angle'],
    }).v_fast_m_s,
  symbolic: sqrt(
    prod(
      lit(0.5),
      plus(
        plus(pow(qsym(obliqueSoundQ), lit(2)), pow(qsym(obliqueAlfvenQ), lit(2))),
        sqrt(
          minus(
            pow(plus(pow(qsym(obliqueSoundQ), lit(2)), pow(qsym(obliqueAlfvenQ), lit(2))), lit(2)),
            prod(lit(4), pow(qsym(obliqueSoundQ), lit(2)), pow(qsym(obliqueAlfvenQ), lit(2)), pow(cosOf(qsym(obliqueAngleQ)), lit(2))),
          ),
        ),
      ),
    ),
  ),
  citation: 'PhysJS.ObliqueMagnetosonic.phase_speed_eq. The be-69 quartic with k_∥ = k cos θ is a hypothesis.',
});

/** BE-109 equal-temperature Bennett current. The factor 8 is the single-population current. @public */
export const be109Edge: BridgeEdge = withBoundAliases({
  id: 'be-109',
  beId: 109,
  kind: 'law',
  label: 'Bennett current I = sqrt(16 π N k_B T / μ0)',
  sources: [bennettLineDensityQ, bennettTemperatureQ],
  aliases: { 'bennett-line-density': ['N_per_m'], 'bennett-temperature': ['T_K'] },
  target: bennettCurrentQ,
  confidence: 'established',
  domain: domain('N ≥ 0 and T ≥ 0', (i) => i['bennett-line-density'] >= 0 && i['bennett-temperature'] >= 0),
  evaluate: (i) =>
    evaluateBennettPinch({ N_per_m: i['bennett-line-density'], T_K: i['bennett-temperature'] }).I_A,
  symbolic: sqrt(
    ratio(prod(lit(16), pi, qsym(bennettLineDensityQ), csym('k_B'), qsym(bennettTemperatureQ)), mu0),
  ),
  citation:
    'PhysJS.BennettPinch.equal_temperature_current. N_e = N_i = N and T_e = T_i = T. The factor 8 is the single-population current.',
});

/** BE-110 loss cone. @public */
export const be110Edge: BridgeEdge = withBoundAliases({
  id: 'be-110',
  beId: 110,
  kind: 'law',
  label: 'Loss cone sin² θ_lc = B0/Bm',
  sources: [lossConeThroatQ, lossConeMirrorQ],
  aliases: { 'loss-cone-throat': ['B0_T'], 'loss-cone-mirror': ['Bm_T'] },
  target: lossConePitchQ,
  confidence: 'established',
  domain: domain('Bm ≠ 0', (i) => i['loss-cone-mirror'] !== 0),
  evaluate: (i) => evaluateLossCone({ B0_T: i['loss-cone-throat'], Bm_T: i['loss-cone-mirror'] }).sin2_theta,
  symbolic: ratio(qsym(lossConeThroatQ), qsym(lossConeMirrorQ)),
  citation: 'PhysJS.LossCone.loss_cone_eq. Pitch-angle scattering is not this statement.',
});

/** BE-111 grad-B drift. q stays signed. @public */
export const be111Edge: BridgeEdge = withBoundAliases({
  id: 'be-111',
  beId: 111,
  kind: 'law',
  label: 'Grad-B drift m v_⊥² |∇B| / (2 q B²)',
  sources: [gradbMassQ, gradbPerpSpeedQ, gradbGradientQ, gradbChargeQ, gradbFieldQ],
  aliases: {
    'gradb-mass': ['m_kg'],
    'gradb-perp-speed': ['v_perp_m_per_s'],
    'gradb-gradient': ['gradB_T_per_m'],
    'gradb-charge': ['q_C'],
    'gradb-field': ['B_T'],
  },
  target: gradbDriftQ,
  confidence: 'established',
  domain: domain('q ≠ 0 and B ≠ 0', (i) => i['gradb-charge'] !== 0 && i['gradb-field'] !== 0),
  evaluate: (i) =>
    evaluateGradBDrift({
      m_kg: i['gradb-mass'],
      v_perp_m_s: i['gradb-perp-speed'],
      gradB_T_per_m: i['gradb-gradient'],
      q_C: i['gradb-charge'],
      B_T: i['gradb-field'],
    }).v_m_s,
  symbolic: ratio(
    prod(qsym(gradbMassQ), pow(qsym(gradbPerpSpeedQ), lit(2)), absOf(qsym(gradbGradientQ))),
    prod(lit(2), qsym(gradbChargeQ), pow(qsym(gradbFieldQ), lit(2))),
  ),
  citation: 'PhysJS.GradBDrift.drift_magnitude. q is the signed charge. High-β curvature is a different vector.',
});

/** BE-112 E×B speed. Charge cancels. @public */
export const be112Edge: BridgeEdge = withBoundAliases({
  id: 'be-112',
  beId: 112,
  kind: 'law',
  label: 'E×B drift speed |E|/|B|',
  sources: [exbFieldXQ, exbFieldYQ, exbFieldQ],
  aliases: { 'exb-field-x': ['E_x_V_per_m'], 'exb-field-y': ['E_y_V_per_m'], 'exb-field': ['B_T'] },
  target: exbSpeedQ,
  confidence: 'established',
  domain: domain('B ≠ 0', (i) => i['exb-field'] !== 0),
  evaluate: (i) =>
    evaluateExBDrift({
      E_x_V_per_m: i['exb-field-x'],
      E_y_V_per_m: i['exb-field-y'],
      B_T: i['exb-field'],
    }).speed_m_s,
  symbolic: ratio(
    sqrt(plus(pow(qsym(exbFieldXQ), lit(2)), pow(qsym(exbFieldYQ), lit(2)))),
    absOf(qsym(exbFieldQ)),
  ),
  citation: 'PhysJS.ExBDrift.drift_eq. v_x = E_y/B and v_y = −E_x/B. Not a finite-Larmor-radius drift.',
});

/** BE-113 Landau rate. The residue formula is a hypothesis. @public */
export const be113Edge: BridgeEdge = withBoundAliases({
  id: 'be-113',
  beId: 113,
  kind: 'law',
  label: 'Landau damping γ from the Maxwellian slope',
  sources: [landauOmegaQ, landauWavenumberQ, landauThermalQ],
  aliases: { 'landau-omega': ['omega_rad_s'], 'landau-wavenumber': ['k_per_m'], 'landau-thermal': ['v_t_m_per_s'] },
  target: landauGammaQ,
  confidence: 'established',
  domain: domain('k ≠ 0 and v_t ≠ 0; the residue is a hypothesis', (i) => i['landau-wavenumber'] !== 0 && i['landau-thermal'] !== 0),
  evaluate: (i) =>
    evaluateLandauDamping({
      omega_rad_s: i['landau-omega'],
      k_per_m: i['landau-wavenumber'],
      v_t_m_s: i['landau-thermal'],
    }).gamma_rad_s,
  symbolic: prod(
    lit(-1),
    sqrt(ratio(pi, lit(8))),
    qsym(landauOmegaQ),
    pow(ratio(qsym(landauOmegaQ), prod(qsym(landauWavenumberQ), qsym(landauThermalQ))), lit(3)),
    expOf(
      prod(
        lit(-1),
        ratio(
          pow(qsym(landauOmegaQ), lit(2)),
          prod(lit(2), pow(qsym(landauWavenumberQ), lit(2)), pow(qsym(landauThermalQ), lit(2))),
        ),
      ),
    ),
  ),
  citation:
    'PhysJS.LandauDamping.damping_eq. The residue formula γ = (π ω³/(2 n k²)) (∂f/∂v)|_{ω/k} is a hypothesis, not a contour integral.',
});

/** BE-114 Λ = 9 N_D. @public */
export const be114Edge: BridgeEdge = withBoundAliases({
  id: 'be-114',
  beId: 114,
  kind: 'law',
  label: 'Debye sphere Λ = 9 N_D',
  sources: [debyeSphereDensityQ, debyeSphereLengthQ],
  aliases: { 'debye-sphere-density': ['n_per_m3'], 'debye-sphere-length': ['lambda_D_m'] },
  target: debyeSphereArgumentQ,
  confidence: 'established',
  domain: domain('n and λ_D finite', (i) => finite(i['debye-sphere-density']) && finite(i['debye-sphere-length'])),
  evaluate: (i) =>
    evaluateDebyeSphere({ n_per_m3: i['debye-sphere-density'], lambda_D_m: i['debye-sphere-length'] }).Lambda,
  symbolic: prod(
    lit(9),
    ratio(prod(lit(4), pi), lit(3)),
    qsym(debyeSphereDensityQ),
    pow(qsym(debyeSphereLengthQ), lit(3)),
  ),
  citation: 'PhysJS.DebyeSphere.coulomb_argument. The angular integral and ln Λ are not evaluated.',
});

/** BE-115 two-species Debye length. @public */
export const be115Edge: BridgeEdge = withBoundAliases({
  id: 'be-115',
  beId: 115,
  kind: 'law',
  label: 'Two-species Debye length',
  sources: [multiDebye1Q, multiDebye2Q],
  aliases: { 'multi-debye-1': ['lambda_1_m'], 'multi-debye-2': ['lambda_2_m'] },
  target: multiDebyeLengthQ,
  confidence: 'established',
  domain: domain('both lengths nonzero', (i) => i['multi-debye-1'] !== 0 && i['multi-debye-2'] !== 0),
  evaluate: (i) => evaluateMultiDebye({ lambda_1_m: i['multi-debye-1'], lambda_2_m: i['multi-debye-2'] }).lambda_D_m,
  symbolic: sqrt(
    ratio(
      lit(1),
      plus(ratio(lit(1), pow(qsym(multiDebye1Q), lit(2))), ratio(lit(1), pow(qsym(multiDebye2Q), lit(2)))),
    ),
  ),
  citation: 'PhysJS.MultiDebye.debye_two. Dropping a responding species leaves a different length.',
});

/** BE-116 kinetic resistivity. The reference closure is nested and is not this edge. @public */
export const be116Edge: BridgeEdge = withBoundAliases({
  id: 'be-116',
  beId: 116,
  kind: 'law',
  label: 'Kinetic Lorentz resistivity',
  sources: [lorentzChargeStateQ, lorentzCoulombLogQ, lorentzTemperatureQ, lorentzMassQ],
  aliases: {
    'lorentz-charge-state': ['Z'],
    'lorentz-coulomb-log': ['ln_Lambda'],
    'lorentz-temperature': ['T_K'],
    'lorentz-mass': ['m_kg'],
  },
  target: lorentzResistivityQ,
  confidence: 'established',
  domain: domain(
    'T > 0 and m > 0; the transport integrals are hypotheses',
    (i) => i['lorentz-temperature'] > 0 && i['lorentz-mass'] > 0,
  ),
  evaluate: (i) =>
    evaluateLorentzResistivity({
      Z: i['lorentz-charge-state'],
      ln_Lambda: i['lorentz-coulomb-log'],
      T_K: i['lorentz-temperature'],
      m_kg: i['lorentz-mass'],
    }).eta_ohm_m,
  symbolic: ratio(
    prod(
      ratio(prod(pi, sqrt(prod(lit(2), pi))), lit(8)),
      qsym(lorentzChargeStateQ),
      pow(csym('e'), lit(2)),
      sqrt(qsym(lorentzMassQ)),
      qsym(lorentzCoulombLogQ),
    ),
    prod(pow(prod(lit(4), pi, csym('epsilon_0')), lit(2)), pow(prod(csym('k_B'), qsym(lorentzTemperatureQ)), lit(1.5))),
  ),
  citation:
    'PhysJS.LorentzResistivity.resistivity_eq. σ_tr = 4π b0² ln Λ and the conductivity moment are hypotheses. The typed reference closure is nested.',
});

/** BE-117 resistive decay. η_m and the diffusion equation are hypotheses. @public */
export const be117Edge: BridgeEdge = withBoundAliases({
  id: 'be-117',
  beId: 117,
  kind: 'law',
  label: 'Resistive slab τ = μ0 σ L² / π²',
  sources: [slabConductivityQ, slabWidthQ],
  aliases: { 'slab-conductivity': ['sigma_S_per_m'], 'slab-width': ['L_m'] },
  target: slabTimeQ,
  confidence: 'established',
  domain: domain('σ and L finite', (i) => finite(i['slab-conductivity']) && finite(i['slab-width'])),
  evaluate: (i) => evaluateResistiveSlab({ sigma_S_per_m: i['slab-conductivity'], L_m: i['slab-width'] }).tau_s,
  symbolic: ratio(prod(mu0, qsym(slabConductivityQ), pow(qsym(slabWidthQ), lit(2))), pow(pi, lit(2))),
  citation: 'PhysJS.ResistiveSlab.decay_time. A denominator 4π is not π². Not the Reynolds analogy.',
});

/** BE-118 Parker critical radius. The 2 is spherical divergence. @public */
export const be118Edge: BridgeEdge = withBoundAliases({
  id: 'be-118',
  beId: 118,
  kind: 'law',
  label: 'Parker critical radius r_c = G M / (2 c_s²)',
  sources: [parkerSoundQ, parkerMassQ],
  aliases: { 'parker-sound': ['c_s_m_per_s'], 'parker-mass': ['M_kg'] },
  target: parkerRadiusQ,
  confidence: 'established',
  domain: domain('c_s ≠ 0', (i) => i['parker-sound'] !== 0),
  evaluate: (i) => evaluateParkerCritical({ c_s_m_s: i['parker-sound'], M_kg: i['parker-mass'] }).r_c_m,
  symbolic: ratio(prod(csym('G'), qsym(parkerMassQ)), prod(lit(2), pow(qsym(parkerSoundQ), lit(2)))),
  citation: 'PhysJS.ParkerCritical.critical_radius. The critical point also has v² = c_s².',
});

/** BE-119 Parker spiral. Dropping the sign is a different spiral. @public */
export const be119Edge: BridgeEdge = withBoundAliases({
  id: 'be-119',
  beId: 119,
  kind: 'law',
  label: 'Parker spiral B_φ/B_r = −Ω r sinθ / v_r',
  sources: [spiralOmegaQ, spiralRadiusQ, spiralColatitudeQ, spiralRadialSpeedQ],
  aliases: {
    'spiral-omega': ['Omega_rad_s'],
    'spiral-radius': ['r_m'],
    'spiral-colatitude': ['theta_rad'],
    'spiral-radial-speed': ['v_r_m_per_s'],
  },
  target: spiralRatioQ,
  confidence: 'established',
  domain: domain('v_r ≠ 0', (i) => i['spiral-radial-speed'] !== 0),
  evaluate: (i) =>
    evaluateParkerSpiral({
      Omega_rad_s: i['spiral-omega'],
      r_m: i['spiral-radius'],
      theta_rad: i['spiral-colatitude'],
      v_r_m_s: i['spiral-radial-speed'],
    }).ratio,
  symbolic: ratio(
    prod(lit(-1), qsym(spiralOmegaQ), qsym(spiralRadiusQ), sinOf(qsym(spiralColatitudeQ))),
    qsym(spiralRadialSpeedQ),
  ),
  citation: 'PhysJS.ParkerSpiral.spiral_ratio. Dropping the sign is a different spiral.',
});

/** BE-120 Chapman–Ferraro. The doubled dipole is a hypothesis. @public */
export const be120Edge: BridgeEdge = withBoundAliases({
  id: 'be-120',
  beId: 120,
  kind: 'law',
  label: 'Chapman–Ferraro (R/R_E)⁶ = 2 B_E² / (μ0 ρ v²)',
  sources: [standoffFieldQ, standoffDensityQ, standoffSpeedQ],
  aliases: { 'standoff-field': ['B_E_T'], 'standoff-density': ['rho_kg_per_m3'], 'standoff-speed': ['v_m_per_s'] },
  target: standoffSixthQ,
  confidence: 'established',
  domain: domain('ρ ≠ 0 and v ≠ 0', (i) => i['standoff-density'] !== 0 && i['standoff-speed'] !== 0),
  evaluate: (i) =>
    evaluateChapmanFerraro({
      B_E_T: i['standoff-field'],
      rho_kg_per_m3: i['standoff-density'],
      v_m_s: i['standoff-speed'],
    }).standoff_sixth,
  symbolic: ratio(
    prod(lit(2), pow(qsym(standoffFieldQ), lit(2))),
    prod(mu0, qsym(standoffDensityQ), pow(qsym(standoffSpeedQ), lit(2))),
  ),
  citation: 'PhysJS.ChapmanFerraro.standoff_eq. A doubled dipole is a hypothesis. Specular 2 ρ v² replaces the numerator 2 by 1.',
});

/** BE-121 Lawson product. The 12 is 4 × 3. @public */
export const be121Edge: BridgeEdge = withBoundAliases({
  id: 'be-121',
  beId: 121,
  kind: 'law',
  label: 'Lawson n τ = 12 k_B T / (⟨σv⟩ E)',
  sources: [lawsonTemperatureQ, lawsonReactivityQ, lawsonEnergyQ],
  aliases: { 'lawson-temperature': ['T_K'], 'lawson-reactivity': ['sigma_v_m3_per_s'], 'lawson-energy': ['E_J'] },
  target: lawsonProductQ,
  confidence: 'established',
  domain: domain('⟨σv⟩ ≠ 0 and E ≠ 0', (i) => i['lawson-reactivity'] !== 0 && i['lawson-energy'] !== 0),
  evaluate: (i) =>
    evaluateLawsonBreakeven({
      T_K: i['lawson-temperature'],
      sigma_v_m3_s: i['lawson-reactivity'],
      E_J: i['lawson-energy'],
    }).n_tau_s_per_m3,
  symbolic: ratio(
    prod(lit(12), csym('k_B'), qsym(lawsonTemperatureQ)),
    prod(qsym(lawsonReactivityQ), qsym(lawsonEnergyQ)),
  ),
  citation: 'PhysJS.LawsonBreakeven.breakeven_eq. The 12 is 4 × 3. The Maxwellian average is not computed.',
});

/** BE-122 floating potential. Not Child–Langmuir. @public */
export const be122Edge: BridgeEdge = withBoundAliases({
  id: 'be-122',
  beId: 122,
  kind: 'law',
  label: 'Floating potential eΦ/(k_B T) = (1/2) ln(2 π m_e/m_i) − 1/2',
  sources: [probeElectronMassQ, probeIonMassQ],
  aliases: { 'probe-electron-mass': ['m_e_kg'], 'probe-ion-mass': ['m_i_kg'] },
  target: probePotentialRatioQ,
  confidence: 'established',
  domain: domain('masses positive', (i) => i['probe-electron-mass'] > 0 && i['probe-ion-mass'] > 0),
  evaluate: (i) =>
    evaluateLangmuirProbe({ m_e_kg: i['probe-electron-mass'], m_i_kg: i['probe-ion-mass'] }).ePhi_over_kT,
  symbolic: minus(
    prod(lit(0.5), lnOf(ratio(prod(lit(2), pi, qsym(probeElectronMassQ)), qsym(probeIonMassQ)))),
    lit(0.5),
  ),
  citation: 'PhysJS.LangmuirProbe.floating_potential. The ion flux is the nested bohmFlux object. Not Child–Langmuir.',
});

/** BE-123 cross-field ratio. Einstein's relation is be-70 and is not re-proved. @public */
export const be123Edge: BridgeEdge = withBoundAliases({
  id: 'be-123',
  beId: 123,
  kind: 'law',
  label: 'Cross-field ratio D_⊥/D_∥ = 1/(1+α²)',
  sources: [crossFieldAlphaQ],
  aliases: { 'cross-field-alpha': ['alpha'] },
  target: crossFieldRatioQ,
  confidence: 'established',
  domain: domain('α finite', (i) => finite(i['cross-field-alpha'])),
  evaluate: (i) => evaluateCrossFieldDiffusion({ alpha: i['cross-field-alpha'] }).ratio,
  symbolic: ratio(lit(1), plus(lit(1), pow(qsym(crossFieldAlphaQ), lit(2)))),
  citation:
    'PhysJS.CrossFieldDiffusion.diffusion_ratio. Einstein relation on μ and on μ/(1+α²) is be-70 and is not re-proved. Bohm 1/16 equals this ratio only when α² = 15.',
});

/** BE-124 firehose margin. The CGL root is a hypothesis. @public */
export const be124Edge: BridgeEdge = withBoundAliases({
  id: 'be-124',
  beId: 124,
  kind: 'law',
  label: 'Firehose margin β_∥ − β_⊥',
  sources: [firehoseBetaParallelQ, firehoseBetaPerpQ],
  aliases: { 'firehose-beta-parallel': ['beta_parallel'], 'firehose-beta-perp': ['beta_perp'] },
  target: firehoseMarginQ,
  confidence: 'established',
  domain: domain('betas finite', (i) => finite(i['firehose-beta-parallel']) && finite(i['firehose-beta-perp'])),
  evaluate: (i) =>
    evaluateFirehose({ beta_parallel: i['firehose-beta-parallel'], beta_perp: i['firehose-beta-perp'] }).margin,
  symbolic: minus(qsym(firehoseBetaParallelQ), qsym(firehoseBetaPerpQ)),
  citation:
    'PhysJS.Firehose.firehose_threshold. The CGL root is a hypothesis. With β = 2 μ0 p/B² the threshold is β_∥ − β_⊥ > 2.',
});

/** BE-125 mirror margin. The kinetic integral is a hypothesis. @public */
export const be125Edge: BridgeEdge = withBoundAliases({
  id: 'be-125',
  beId: 125,
  kind: 'law',
  label: 'Mirror margin β_⊥ (T_⊥/T_∥ − 1)',
  sources: [mirrorBetaPerpQ, mirrorTPerpQ, mirrorTParallelQ],
  aliases: {
    'mirror-beta-perp': ['beta_perp'],
    'mirror-t-perp': ['T_perp_K'],
    'mirror-t-parallel': ['T_parallel_K'],
  },
  target: mirrorMarginQ,
  confidence: 'established',
  domain: domain(
    'T_∥ ≠ 0; the kinetic integral is a hypothesis',
    (i) => i['mirror-t-parallel'] !== 0,
  ),
  evaluate: (i) =>
    evaluateMirrorInstability({
      beta_perp: i['mirror-beta-perp'],
      T_perp_K: i['mirror-t-perp'],
      T_parallel_K: i['mirror-t-parallel'],
    }).margin,
  symbolic: prod(
    qsym(mirrorBetaPerpQ),
    minus(ratio(qsym(mirrorTPerpQ), qsym(mirrorTParallelQ)), lit(1)),
  ),
  citation:
    'PhysJS.MirrorInstability.mirror_threshold. The threshold β_⊥ (T_⊥/T_∥ − 1) > 1 is a hypothesis. The kinetic integral is not evaluated.',
});

/** Plasma and space edges, in catalog-id order. @public */
export const PLASMA_SPACE_EDGES: readonly BridgeEdge[] = [
  be103Edge,
  be104Edge,
  be105Edge,
  be106Edge,
  be107Edge,
  be108Edge,
  be109Edge,
  be110Edge,
  be111Edge,
  be112Edge,
  be113Edge,
  be114Edge,
  be115Edge,
  be116Edge,
  be117Edge,
  be118Edge,
  be119Edge,
  be120Edge,
  be121Edge,
  be122Edge,
  be123Edge,
  be124Edge,
  be125Edge,
];
