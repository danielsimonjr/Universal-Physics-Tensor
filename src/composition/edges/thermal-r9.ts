/**
 * Composition edges for BE-147 through BE-170.
 *
 * Each edge calls the catalog evaluator. The symbolic form is the same
 * scalar, including the sums and exponentials the scalar-AST path evaluates.
 * Kind is `law` because the endpoints share classical electromagnetic
 * attributes. The overlay formalRef is kind `bridge`.
 *
 * @module composition/edges/thermal-r9
 */
import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import {
  evaluateArrhenius,
  evaluateBiot,
  evaluateClausiusClapeyron,
  evaluateEyring,
  evaluateFourierConduction,
  evaluateGibbsIsotherm,
  evaluateJouleThomson,
  evaluateNernstGibbs,
  evaluateNewtonCooling,
  evaluateNusselt,
  evaluateOnsagerReciprocity,
  evaluateOtto,
  evaluatePlanckSpectrum,
  evaluatePrandtl,
  evaluateRaoult,
  evaluateReynoldsNumber,
  evaluateRichardsonDushman,
  evaluateSackurTetrode,
  evaluateSaha,
  evaluateSchmidt,
  evaluateSherwood,
  evaluateStefanBoltzmann,
  evaluateVanTHoff,
  evaluateWienDisplacement,
} from '../../bridges/thermal-r9.js';
import { withBoundAliases, type BridgeEdge } from '../edge.js';
import type { Quantity } from '../quantity.js';
import {
  arrhbarrierQ,
  arrhprefacQ,
  arrhrateQ,
  arrhwarmthQ,
  biotfilmQ,
  biotkQ,
  biotlengthQ,
  biotratioQ,
  clapintlatentQ,
  clapintlnQ,
  clapintwarm1Q,
  clapintwarm2Q,
  eyringbarrierQ,
  eyringrateQ,
  eyringwarmthQ,
  fourierslabendQ,
  fourierslabfluxQ,
  fourierslabkQ,
  fourierslablenQ,
  fourierslabstartQ,
  gibbsisodGQ,
  gibbsisoKQ,
  gibbsisowarmthQ,
  jtcpQ,
  jtcdvdtQ,
  jtcmuQ,
  jtcvolumeQ,
  jtcwarmthQ,
  nernstgE0Q,
  nernstgEQ,
  nernstgQQ,
  nernstgnQ,
  nernstgwarmthQ,
  newtonareaQ,
  newtoncpQ,
  newtonfilmQ,
  newtonrhoQ,
  newtontheta0Q,
  newtonthetaQ,
  newtontimeQ,
  newtonvolQ,
  nusseltfilmQ,
  nusseltkQ,
  nusseltlenQ,
  nusseltratioQ,
  onsagerb0Q,
  onsagerl12Q,
  onsagerl21Q,
  ottogammaQ,
  ottoetaQ,
  ottoratioQ,
  planckfreqQ,
  planckuQ,
  planckwarmthQ,
  prandtlcpQ,
  prandtlkQ,
  prandtlmuQ,
  prandtlratioQ,
  raoultmoleQ,
  raoultsatQ,
  raoultvaporQ,
  reynumlenQ,
  reynummuQ,
  reynumratioQ,
  reynumrhoQ,
  reynumvelQ,
  richardsjQ,
  richardsmassQ,
  richardsphiQ,
  richardswarmthQ,
  sackurcountQ,
  sackurdensityQ,
  sackurentropyQ,
  sackurquantumQ,
  sahaconstQ,
  sahaionQ,
  sahamassQ,
  sahawarmthQ,
  schmidtdiffQ,
  schmidtmuQ,
  schmidtratioQ,
  schmidtrhoQ,
  sherwooddiffQ,
  sherwoodkmQ,
  sherwoodlenQ,
  sherwoodratioQ,
  stefansigmaQ,
  vanthoffenthalpyQ,
  vanthoffslopeQ,
  vanthoffwarmthQ,
  wienbQ,
  wienrootQ,
} from '../quantities.js';

const finite = Number.isFinite;
const qsym = (quantity: Quantity): ExprNode => ({ kind: 'symbol', name: quantity.name, dim: quantity.dim });
const csym = (name: keyof typeof CONSTANTS): ExprNode => ({ kind: 'symbol', name, dim: CONSTANTS[name].dim });
const lit = (n: number): ExprNode => ({ kind: 'symbol', name: String(n), dim: DIMENSIONLESS });
const prod = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const minus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '-', args: [a, b] });
const ratio = (num: ExprNode, den: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [num, den] });
const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });
const lnOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'ln', arg });
const expOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'exp', arg });
const pi: ExprNode = { kind: 'symbol', name: 'pi', dim: DIMENSIONLESS };
const gasR = prod(csym('N_A'), csym('k_B'));

const domain = (description: string, predicate: (i: Record<string, number>) => boolean) => ({
  description,
  predicate,
});

/** BE-147 Arrhenius rate. The Eyring identification of A is not this edge. @public */
export const be147Edge: BridgeEdge = withBoundAliases({
  id: 'be-147',
  beId: 147,
  kind: 'law',
  label: 'k = A exp(−Ea/(R T)), R = N_A k_B',
  sources: [arrhprefacQ, arrhbarrierQ, arrhwarmthQ],
  aliases: {
    arrhprefac: ['A_Hz'],
    arrhbarrier: ['Ea_J_per_mol'],
    arrhwarmth: ['T_K'],
  },
  target: arrhrateQ,
  confidence: 'established',
  domain: domain('T ≠ 0', (i) => finite(i.arrhwarmth) && i.arrhwarmth !== 0),
  evaluate: (i) =>
    evaluateArrhenius({ A_per_s: i.arrhprefac, Ea_J_per_mol: i.arrhbarrier, T_K: i.arrhwarmth }).k_per_s,
  symbolic: prod(qsym(arrhprefacQ), expOf(minus(lit(0), ratio(qsym(arrhbarrierQ), prod(gasR, qsym(arrhwarmthQ)))))),
  citation:
    'PhysJS.Arrhenius.arrhenius_eq. The prefactor is temperature-independent. Not the Eyring identification of A.',
});

/** BE-148 Eyring rate. The molar form calls BE-147 and is not a second edge. @public */
export const be148Edge: BridgeEdge = withBoundAliases({
  id: 'be-148',
  beId: 148,
  kind: 'law',
  label: 'k = (k_B T/h) exp(−ΔG‡/(k_B T))',
  sources: [eyringbarrierQ, eyringwarmthQ],
  aliases: { eyringbarrier: ['dG_J'], eyringwarmth: ['T_K'] },
  target: eyringrateQ,
  confidence: 'established',
  domain: domain('T ≠ 0', (i) => finite(i.eyringwarmth) && i.eyringwarmth !== 0),
  evaluate: (i) => evaluateEyring({ dG_J: i.eyringbarrier, T_K: i.eyringwarmth }).k_per_s,
  symbolic: prod(
    ratio(prod(csym('k_B'), qsym(eyringwarmthQ)), csym('h')),
    expOf(minus(lit(0), ratio(qsym(eyringbarrierQ), prod(csym('k_B'), qsym(eyringwarmthQ))))),
  ),
  citation:
    'PhysJS.Eyring.eyring_eq. The molar form calls Arrhenius. Ea = ΔH‡ + R T at that prefactor differs by exp(−1). Transmission coefficient 1.',
});

/** BE-149 van 't Hoff slope. Not a second proof of BE-150. @public */
export const be149Edge: BridgeEdge = withBoundAliases({
  id: 'be-149',
  beId: 149,
  kind: 'law',
  label: 'd ln K/dT = ΔH°/(R T²)',
  sources: [vanthoffenthalpyQ, vanthoffwarmthQ],
  aliases: { vanthoffenthalpy: ['dH_J_per_mol'], vanthoffwarmth: ['T_K'] },
  target: vanthoffslopeQ,
  confidence: 'established',
  domain: domain('T ≠ 0', (i) => finite(i.vanthoffwarmth) && i.vanthoffwarmth !== 0),
  evaluate: (i) => evaluateVanTHoff({ dH_J_per_mol: i.vanthoffenthalpy, T_K: i.vanthoffwarmth }).slope_per_K,
  symbolic: ratio(qsym(vanthoffenthalpyQ), prod(gasR, qsym(vanthoffwarmthQ), qsym(vanthoffwarmthQ))),
  citation: 'PhysJS.VanTHoff.vant_hoff. equilibrium_log is Gibbs. Not a plot and not a second proof of be-150.',
});

/** BE-150 Gibbs isotherm. Not an activity model. @public */
export const be150Edge: BridgeEdge = withBoundAliases({
  id: 'be-150',
  beId: 150,
  kind: 'law',
  label: 'ΔG° = −R T ln K',
  sources: [gibbsisoKQ, gibbsisowarmthQ],
  aliases: { gibbsisok: ['K'], gibbsisowarmth: ['T_K'] },
  target: gibbsisodGQ,
  confidence: 'established',
  domain: domain('K > 0 and T ≠ 0', (i) => finite(i.gibbsisok) && i.gibbsisok > 0 && finite(i.gibbsisowarmth) && i.gibbsisowarmth !== 0),
  evaluate: (i) => evaluateGibbsIsotherm({ K: i.gibbsisok, T_K: i.gibbsisowarmth }).dG_J_per_mol,
  symbolic: prod(lit(-1), gasR, qsym(gibbsisowarmthQ), lnOf(qsym(gibbsisoKQ))),
  citation: 'PhysJS.GibbsIsotherm.gibbs_eq. Σ ν_i μ_i = 0. Not an activity model.',
});

/** BE-151 Nernst voltage. Not a second proof of BE-150. @public */
export const be151Edge: BridgeEdge = withBoundAliases({
  id: 'be-151',
  beId: 151,
  kind: 'law',
  label: 'E = E° − (R T/(n F)) ln Q, F = N_A e',
  sources: [nernstgE0Q, nernstgnQ, nernstgQQ, nernstgwarmthQ],
  aliases: { nernstge0: ['E0_volts'], nernstgn: ['n'], nernstgq: ['Q'], nernstgwarmth: ['T_K'] },
  target: nernstgEQ,
  confidence: 'established',
  domain: domain(
    'n ≠ 0 and Q > 0',
    (i) => finite(i.nernstgn) && i.nernstgn !== 0 && finite(i.nernstgq) && i.nernstgq > 0,
  ),
  evaluate: (i) =>
    evaluateNernstGibbs({ E0_V: i.nernstge0, n: i.nernstgn, Q: i.nernstgq, T_K: i.nernstgwarmth }).E_V,
  symbolic: minus(
    qsym(nernstgE0Q),
    prod(ratio(prod(gasR, qsym(nernstgwarmthQ)), prod(qsym(nernstgnQ), csym('N_A'), csym('e'))), lnOf(qsym(nernstgQQ))),
  ),
  citation: 'PhysJS.NernstGibbs.nernst_eq. The standard state is Gibbs. e is the elementary charge. Not a second proof of be-150.',
});

/** BE-152 integrated Clausius–Clapeyron. Not a second proof of BE-71. @public */
export const be152Edge: BridgeEdge = withBoundAliases({
  id: 'be-152',
  beId: 152,
  kind: 'law',
  label: 'ln(P2/P1) = −(ΔH/R)(1/T2 − 1/T1)',
  sources: [clapintlatentQ, clapintwarm1Q, clapintwarm2Q],
  aliases: { clapintlatent: ['dH_J_per_mol'], clapintwarm1: ['T1_K'], clapintwarm2: ['T2_K'] },
  target: clapintlnQ,
  confidence: 'established',
  domain: domain(
    'T1 > 0 and T2 > 0',
    (i) => finite(i.clapintwarm1) && i.clapintwarm1 > 0 && finite(i.clapintwarm2) && i.clapintwarm2 > 0,
  ),
  evaluate: (i) =>
    evaluateClausiusClapeyron({ dH_J_per_mol: i.clapintlatent, T1_K: i.clapintwarm1, T2_K: i.clapintwarm2 }).ln_ratio,
  symbolic: prod(
    lit(-1),
    ratio(qsym(clapintlatentQ), gasR),
    minus(ratio(lit(1), qsym(clapintwarm2Q)), ratio(lit(1), qsym(clapintwarm1Q))),
  ),
  citation:
    'PhysJS.ClausiusClapeyron.integrated_eq. ideal_vapor_slope calls Clapeyron slope_eq, be-71. A separate liquid volume is not this row.',
});

/** BE-153 Raoult pressure. A nonideal activity is not this edge. @public */
export const be153Edge: BridgeEdge = withBoundAliases({
  id: 'be-153',
  beId: 153,
  kind: 'law',
  label: 'P = x P*',
  sources: [raoultmoleQ, raoultsatQ],
  aliases: { raoultmole: ['x'], raoultsat: ['Psat_Pa'] },
  target: raoultvaporQ,
  confidence: 'established',
  domain: domain('P* > 0', (i) => finite(i.raoultsat) && i.raoultsat > 0),
  evaluate: (i) => evaluateRaoult({ x: i.raoultmole, Psat_Pa: i.raoultsat }).P_Pa,
  symbolic: prod(qsym(raoultmoleQ), qsym(raoultsatQ)),
  citation: 'PhysJS.Raoult.raoult_eq. Gibbs on the ideal mixture and the pure liquid. Not a second proof of be-150.',
});

/** BE-154 Prandtl number. Not BE-86. @public */
export const be154Edge: BridgeEdge = withBoundAliases({
  id: 'be-154',
  beId: 154,
  kind: 'law',
  label: 'Pr k = μ c_p',
  sources: [prandtlmuQ, prandtlcpQ, prandtlkQ],
  aliases: { prandtlmu: ['mu_Pa_s'], prandtlcp: ['cp_J_per_kg_K'], prandtlk: ['k_W_per_m_K'] },
  target: prandtlratioQ,
  confidence: 'established',
  domain: domain('k ≠ 0', (i) => finite(i.prandtlk) && i.prandtlk !== 0),
  evaluate: (i) =>
    evaluatePrandtl({ mu_Pa_s: i.prandtlmu, cp_J_per_kg_K: i.prandtlcp, k_W_per_m_K: i.prandtlk }).Pr,
  symbolic: ratio(prod(qsym(prandtlmuQ), qsym(prandtlcpQ)), qsym(prandtlkQ)),
  citation: 'PhysJS.Prandtl.prandtl_eq. Not a heat-transfer correlation and not the Reynolds analogy of be-86.',
});

/** BE-155 Reynolds number. Not BE-77. @public */
export const be155Edge: BridgeEdge = withBoundAliases({
  id: 'be-155',
  beId: 155,
  kind: 'law',
  label: 'Re μ = ρ v L',
  sources: [reynumrhoQ, reynumvelQ, reynumlenQ, reynummuQ],
  aliases: { reynumrho: ['rho_kg_per_m3'], reynumvel: ['v_m_per_s'], reynumlen: ['L_m'], reynummu: ['mu_Pa_s'] },
  target: reynumratioQ,
  confidence: 'established',
  domain: domain('μ ≠ 0', (i) => finite(i.reynummu) && i.reynummu !== 0),
  evaluate: (i) =>
    evaluateReynoldsNumber({
      rho_kg_per_m3: i.reynumrho,
      v_m_per_s: i.reynumvel,
      L_m: i.reynumlen,
      mu_Pa_s: i.reynummu,
    }).Re,
  symbolic: ratio(prod(qsym(reynumrhoQ), qsym(reynumvelQ), qsym(reynumlenQ)), qsym(reynummuQ)),
  citation: 'PhysJS.ReynoldsNumber.reynolds_eq. Not a friction correlation and not the pipe factor of be-77.',
});

/** BE-156 Biot number. Not a lumped-capacitance criterion. @public */
export const be156Edge: BridgeEdge = withBoundAliases({
  id: 'be-156',
  beId: 156,
  kind: 'law',
  label: 'Bi k = h L_c',
  sources: [biotfilmQ, biotlengthQ, biotkQ],
  aliases: { biotfilm: ['h_W_per_m2_K'], biotlength: ['Lc_m'], biotk: ['k_W_per_m_K'] },
  target: biotratioQ,
  confidence: 'established',
  domain: domain('k ≠ 0', (i) => finite(i.biotk) && i.biotk !== 0),
  evaluate: (i) => evaluateBiot({ h_W_per_m2_K: i.biotfilm, Lc_m: i.biotlength, k_W_per_m_K: i.biotk }).Bi,
  symbolic: ratio(prod(qsym(biotfilmQ), qsym(biotlengthQ)), qsym(biotkQ)),
  citation: 'PhysJS.Biot.biot_eq. With L_c = V/A, Bi = h V/(k A). Not a lumped-capacitance criterion.',
});

/** BE-157 Nusselt number. Not a correlation. @public */
export const be157Edge: BridgeEdge = withBoundAliases({
  id: 'be-157',
  beId: 157,
  kind: 'law',
  label: 'Nu k = h L',
  sources: [nusseltfilmQ, nusseltlenQ, nusseltkQ],
  aliases: { nusseltfilm: ['h_W_per_m2_K'], nusseltlen: ['L_m'], nusseltk: ['k_W_per_m_K'] },
  target: nusseltratioQ,
  confidence: 'established',
  domain: domain('k ≠ 0', (i) => finite(i.nusseltk) && i.nusseltk !== 0),
  evaluate: (i) => evaluateNusselt({ h_W_per_m2_K: i.nusseltfilm, L_m: i.nusseltlen, k_W_per_m_K: i.nusseltk }).Nu,
  symbolic: ratio(prod(qsym(nusseltfilmQ), qsym(nusseltlenQ)), qsym(nusseltkQ)),
  citation: 'PhysJS.Nusselt.nusselt_eq. Not a correlation for Nu.',
});

/** BE-158 Schmidt number. Lewis number is not this edge. @public */
export const be158Edge: BridgeEdge = withBoundAliases({
  id: 'be-158',
  beId: 158,
  kind: 'law',
  label: 'Sc ρ D = μ',
  sources: [schmidtmuQ, schmidtrhoQ, schmidtdiffQ],
  aliases: { schmidtmu: ['mu_Pa_s'], schmidtrho: ['rho_kg_per_m3'], schmidtdiff: ['D_m2_per_s'] },
  target: schmidtratioQ,
  confidence: 'established',
  domain: domain('ρ ≠ 0 and D ≠ 0', (i) => finite(i.schmidtrho) && i.schmidtrho !== 0 && finite(i.schmidtdiff) && i.schmidtdiff !== 0),
  evaluate: (i) =>
    evaluateSchmidt({ mu_Pa_s: i.schmidtmu, rho_kg_per_m3: i.schmidtrho, D_m2_per_s: i.schmidtdiff }).Sc,
  symbolic: ratio(qsym(schmidtmuQ), prod(qsym(schmidtrhoQ), qsym(schmidtdiffQ))),
  citation: 'PhysJS.Schmidt.schmidt_eq. Le = Sc/Pr is the second conjunct and is not a second edge.',
});

/** BE-159 Sherwood number. Not a correlation. @public */
export const be159Edge: BridgeEdge = withBoundAliases({
  id: 'be-159',
  beId: 159,
  kind: 'law',
  label: 'Sh D = k_m L',
  sources: [sherwoodkmQ, sherwoodlenQ, sherwooddiffQ],
  aliases: { sherwoodkm: ['km_m_per_s'], sherwoodlen: ['L_m'], sherwooddiff: ['D_m2_per_s'] },
  target: sherwoodratioQ,
  confidence: 'established',
  domain: domain('D ≠ 0', (i) => finite(i.sherwooddiff) && i.sherwooddiff !== 0),
  evaluate: (i) => evaluateSherwood({ km_m_per_s: i.sherwoodkm, L_m: i.sherwoodlen, D_m2_per_s: i.sherwooddiff }).Sh,
  symbolic: ratio(prod(qsym(sherwoodkmQ), qsym(sherwoodlenQ)), qsym(sherwooddiffQ)),
  citation: 'PhysJS.Sherwood.sherwood_eq. Not a correlation for Sh.',
});

/** BE-160 integrated Fourier slab. Temperature-dependent conductivity is not this edge. @public */
export const be160Edge: BridgeEdge = withBoundAliases({
  id: 'be-160',
  beId: 160,
  kind: 'law',
  label: 'q L = −k (T(L) − T(0))',
  sources: [fourierslabkQ, fourierslabendQ, fourierslabstartQ, fourierslablenQ],
  aliases: { fourierslabk: ['k_W_per_m_K'], fourierslabend: ['T_L_K'], fourierslabstart: ['T_0_K'], fourierslablen: ['L_m'] },
  target: fourierslabfluxQ,
  confidence: 'established',
  domain: domain(
    'k ≠ 0 and L ≠ 0',
    (i) => finite(i.fourierslabk) && i.fourierslabk !== 0 && finite(i.fourierslablen) && i.fourierslablen !== 0,
  ),
  evaluate: (i) =>
    evaluateFourierConduction({
      k_W_per_m_K: i.fourierslabk,
      T_L_K: i.fourierslabend,
      T_0_K: i.fourierslabstart,
      L_m: i.fourierslablen,
    }).q_W_per_m2,
  symbolic: ratio(
    prod(lit(-1), qsym(fourierslabkQ), minus(qsym(fourierslabendQ), qsym(fourierslabstartQ))),
    qsym(fourierslablenQ),
  ),
  citation: 'PhysJS.FourierConduction.fourier_eq. Constant flux integrates across the slab. The sign is part of the statement.',
});

/** BE-161 Newton cooling. Radiation in T^4 is not this edge. @public */
export const be161Edge: BridgeEdge = withBoundAliases({
  id: 'be-161',
  beId: 161,
  kind: 'law',
  label: 'θ(t) = θ(0) exp(−t/τ), τ = ρ c V/(h A)',
  sources: [newtonrhoQ, newtoncpQ, newtonvolQ, newtonfilmQ, newtonareaQ, newtontimeQ, newtontheta0Q],
  aliases: {
    newtonrho: ['rho_kg_per_m3'],
    newtoncp: ['c_J_per_kg_K'],
    newtonvol: ['V_m3'],
    newtonfilm: ['h_W_per_m2_K'],
    newtonarea: ['A_m2'],
    newtontime: ['t_s'],
    newtontheta0: ['theta_difference_K'],
  },
  target: newtonthetaQ,
  confidence: 'established',
  domain: domain(
    'ρ c V ≠ 0 and h A ≠ 0',
    (i) =>
      finite(i.newtonrho) &&
      finite(i.newtoncp) &&
      finite(i.newtonvol) &&
      i.newtonrho * i.newtoncp * i.newtonvol !== 0 &&
      finite(i.newtonfilm) &&
      finite(i.newtonarea) &&
      i.newtonfilm * i.newtonarea !== 0,
  ),
  evaluate: (i) =>
    evaluateNewtonCooling({
      rho_kg_per_m3: i.newtonrho,
      c_J_per_kg_K: i.newtoncp,
      V_m3: i.newtonvol,
      h_W_per_m2_K: i.newtonfilm,
      A_m2: i.newtonarea,
      t_s: i.newtontime,
      theta_difference_K: i.newtontheta0,
    }).theta_K,
  symbolic: prod(
    qsym(newtontheta0Q),
    expOf(
      minus(
        lit(0),
        ratio(prod(qsym(newtontimeQ), qsym(newtonfilmQ), qsym(newtonareaQ)), prod(qsym(newtonrhoQ), qsym(newtoncpQ), qsym(newtonvolQ))),
      ),
    ),
  ),
  citation: 'PhysJS.NewtonCooling.newton_eq. The flux law is the ODE hypothesis. Radiation in T^4 is not this row.',
});

/** BE-162 Otto efficiency. A temperature-dependent heat capacity is not this edge. @public */
export const be162Edge: BridgeEdge = withBoundAliases({
  id: 'be-162',
  beId: 162,
  kind: 'law',
  label: 'η = 1 − r^(1−γ)',
  sources: [ottoratioQ, ottogammaQ],
  aliases: { ottoratio: ['r'], ottogamma: ['gamma'] },
  target: ottoetaQ,
  confidence: 'established',
  domain: domain('r > 0 and γ > 1', (i) => finite(i.ottoratio) && i.ottoratio > 0 && finite(i.ottogamma) && i.ottogamma > 1),
  evaluate: (i) => evaluateOtto({ r: i.ottoratio, gamma: i.ottogamma }).eta,
  symbolic: minus(lit(1), pow(qsym(ottoratioQ), minus(lit(1), qsym(ottogammaQ)))),
  citation: 'PhysJS.Otto.otto_eq. Cold-air standard, constant γ > 1. The exponent γ−1 is not 1−γ.',
});

/** BE-163 Joule–Thomson coefficient. Not an inversion curve. @public */
export const be163Edge: BridgeEdge = withBoundAliases({
  id: 'be-163',
  beId: 163,
  kind: 'law',
  label: 'μ_JT c_p = T (∂v/∂T)_p − v',
  sources: [jtcwarmthQ, jtcdvdtQ, jtcvolumeQ, jtcpQ],
  aliases: {
    jtcwarmth: ['T_K'],
    jtcdvdt: ['dv_dT_m3_per_kg_K'],
    jtcvolume: ['v_m3_per_kg'],
    jtcp: ['cp_J_per_kg_K'],
  },
  target: jtcmuQ,
  confidence: 'established',
  domain: domain('c_p ≠ 0', (i) => finite(i.jtcp) && i.jtcp !== 0),
  evaluate: (i) =>
    evaluateJouleThomson({
      T_K: i.jtcwarmth,
      dv_dT_m3_per_kg_K: i.jtcdvdt,
      v_m3_per_kg: i.jtcvolume,
      cp_J_per_kg_K: i.jtcp,
    }).mu_K_per_Pa,
  symbolic: ratio(minus(prod(qsym(jtcwarmthQ), qsym(jtcdvdtQ)), qsym(jtcvolumeQ)), qsym(jtcpQ)),
  citation:
    'PhysJS.JouleThomson.joule_thomson_eq. The enthalpy differential is a hypothesis. The ideal-gas bracket v = R T/P vanishes. Not a measured inversion curve.',
});

/** BE-164 Planck spectrum. The frequency integral is BE-165. @public */
export const be164Edge: BridgeEdge = withBoundAliases({
  id: 'be-164',
  beId: 164,
  kind: 'law',
  label: 'u (exp(hν/kT) − 1) c³ = 8 π h ν³',
  sources: [planckfreqQ, planckwarmthQ],
  aliases: { planckfreq: ['nu_Hz'], planckwarmth: ['T_K'] },
  target: planckuQ,
  confidence: 'established',
  domain: domain('ν > 0 and T > 0', (i) => finite(i.planckfreq) && i.planckfreq > 0 && finite(i.planckwarmth) && i.planckwarmth > 0),
  evaluate: (i) => evaluatePlanckSpectrum({ nu_Hz: i.planckfreq, T_K: i.planckwarmth }).u_J_s_per_m3,
  symbolic: ratio(
    prod(csym('8pi'), csym('h'), pow(qsym(planckfreqQ), lit(3))),
    prod(pow(csym('c'), lit(3)), minus(expOf(ratio(prod(csym('h'), qsym(planckfreqQ)), prod(csym('k_B'), qsym(planckwarmthQ)))), lit(1))),
  ),
  citation: 'PhysJS.PlanckSpectrum.planck_eq. The mode density 8π, two polarizations, is a hypothesis. One polarization is not this density.',
});

/** BE-165 Stefan–Boltzmann constant. Not a radiometer. @public */
export const be165Edge: BridgeEdge = withBoundAliases({
  id: 'be-165',
  beId: 165,
  kind: 'law',
  label: 'σ = π² k_B⁴ / (60 ℏ³ c²)',
  sources: [],
  aliases: {},
  target: stefansigmaQ,
  confidence: 'established',
  domain: domain('no variable input', () => true),
  evaluate: () => evaluateStefanBoltzmann().sigma_W_per_m2_K4,
  symbolic: ratio(prod(pow(pi, lit(2)), pow(csym('k_B'), lit(4))), prod(lit(60), pow(csym('hbar'), lit(3)), pow(csym('c'), lit(2)))),
  citation:
    'PhysJS.StefanBoltzmann.stefan_boltzmann_eq. The integral is π⁴/15. h = 2 π ℏ. The mode density 8π is the hypothesis of be-164. Not a radiometer measurement.',
});

/** BE-166 Wien displacement. The decimal root is not evaluated. @public */
export const be166Edge: BridgeEdge = withBoundAliases({
  id: 'be-166',
  beId: 166,
  kind: 'law',
  label: 'b k_B x = h c, with x in (4, 5)',
  sources: [wienrootQ],
  aliases: { wienroot: ['wien_x'] },
  target: wienbQ,
  confidence: 'established',
  domain: domain('4 < x < 5', (i) => finite(i.wienroot) && i.wienroot > 4 && i.wienroot < 5),
  evaluate: (i) => evaluateWienDisplacement({ x: i.wienroot }).b_m_K,
  symbolic: ratio(prod(csym('h'), csym('c')), prod(csym('k_B'), qsym(wienrootQ))),
  citation:
    'PhysJS.WienDisplacement.wien_eq. The unique positive root of 5 − x = 5 exp(−x) lies in (4, 5). The decimal is not evaluated. x = 0 is extraneous.',
});

/** BE-167 Sackur–Tetrode entropy. Not a second proof of BE-12. @public */
export const be167Edge: BridgeEdge = withBoundAliases({
  id: 'be-167',
  beId: 167,
  kind: 'law',
  label: 'S = N k_B (ln(n_Q/n) + 5/2)',
  sources: [sackurcountQ, sackurquantumQ, sackurdensityQ],
  aliases: { sackurcount: ['N'], sackurquantum: ['nQ_per_m3'], sackurdensity: ['n_per_m3'] },
  target: sackurentropyQ,
  confidence: 'established',
  domain: domain(
    'n_Q > 0 and n > 0',
    (i) => finite(i.sackurquantum) && i.sackurquantum > 0 && finite(i.sackurdensity) && i.sackurdensity > 0,
  ),
  evaluate: (i) =>
    evaluateSackurTetrode({ N: i.sackurcount, nQ_per_m3: i.sackurquantum, n_per_m3: i.sackurdensity }).S_J_per_K,
  symbolic: prod(
    qsym(sackurcountQ),
    csym('k_B'),
    {
      kind: 'op',
      op: '+',
      args: [lnOf(ratio(qsym(sackurquantumQ), qsym(sackurdensityQ))), lit(2.5)],
    },
  ),
  citation:
    'PhysJS.SackurTetrode.sackur_tetrode. n_Q uses ThermalDeBroglie.wavelength_eq, be-12. Stirling is ln N! = N ln N − N, not the series.',
});

/** BE-168 Saha constant. The spin weight 2 is not this edge. @public */
export const be168Edge: BridgeEdge = withBoundAliases({
  id: 'be-168',
  beId: 168,
  kind: 'law',
  label: 'K = (2 π m k_B T/h²)^{3/2} exp(−I/(k_B T))',
  sources: [sahamassQ, sahawarmthQ, sahaionQ],
  aliases: { sahamass: ['m_kg'], sahawarmth: ['T_K'], sahaion: ['I_J'] },
  target: sahaconstQ,
  confidence: 'established',
  domain: domain('m > 0 and T > 0', (i) => finite(i.sahamass) && i.sahamass > 0 && finite(i.sahawarmth) && i.sahawarmth > 0),
  evaluate: (i) => evaluateSaha({ m_kg: i.sahamass, T_K: i.sahawarmth, I_J: i.sahaion }).K_per_m3,
  symbolic: prod(
    pow(ratio(prod(csym('2pi'), qsym(sahamassQ), csym('k_B'), qsym(sahawarmthQ)), pow(csym('h'), lit(2))), lit(1.5)),
    expOf(minus(lit(0), ratio(qsym(sahaionQ), prod(csym('k_B'), qsym(sahawarmthQ))))),
  ),
  citation: 'PhysJS.Saha.saha_eq. The thermal factor is be-12. The electron weight 2 is not in this statement.',
});

/** BE-169 Richardson–Dushman current. The reflection coefficient is 1. @public */
export const be169Edge: BridgeEdge = withBoundAliases({
  id: 'be-169',
  beId: 169,
  kind: 'law',
  label: 'J h³ exp(φ/(k_B T)) = 4 π m e k_B² T²',
  sources: [richardsmassQ, richardswarmthQ, richardsphiQ],
  aliases: { richardsmass: ['m_kg'], richardswarmth: ['T_K'], richardsphi: ['phi_J'] },
  target: richardsjQ,
  confidence: 'established',
  domain: domain('T > 0', (i) => finite(i.richardswarmth) && i.richardswarmth > 0),
  evaluate: (i) =>
    evaluateRichardsonDushman({ m_kg: i.richardsmass, T_K: i.richardswarmth, phi_J: i.richardsphi }).J_A_per_m2,
  symbolic: prod(
    ratio(prod(csym('4pi'), qsym(richardsmassQ), csym('e'), pow(csym('k_B'), lit(2))), pow(csym('h'), lit(3))),
    pow(qsym(richardswarmthQ), lit(2)),
    expOf(minus(lit(0), ratio(qsym(richardsphiQ), prod(csym('k_B'), qsym(richardswarmthQ))))),
  ),
  citation:
    'PhysJS.RichardsonDushman.richardson_eq. e is the elementary charge. The Boltzmann tail replaces Fermi–Dirac. The prefactor is a hypothesis. Reflection coefficient 1.',
});

/** BE-170 Onsager reciprocity at zero magnetic field. Not Onsager–Casimir. @public */
export const be170Edge: BridgeEdge = withBoundAliases({
  id: 'be-170',
  beId: 170,
  kind: 'law',
  label: 'L12 = L21 at B = 0',
  sources: [onsagerl12Q, onsagerb0Q],
  aliases: { onsagerl12: ['L12'], onsagerb0: ['onsager_B_T'] },
  target: onsagerl21Q,
  confidence: 'established',
  domain: domain('B = 0', (i) => finite(i.onsagerb0) && i.onsagerb0 === 0 && finite(i.onsagerl12)),
  evaluate: (i) => evaluateOnsagerReciprocity({ L12: i.onsagerl12, B_T: i.onsagerb0 }).L21,
  symbolic: qsym(onsagerl12Q),
  citation:
    'PhysJS.OnsagerReciprocity.onsager_eq. Mixed partials of the dissipation potential. thermoelectric_instance applies KelvinRelation.peltier_eq, be-73, and does not re-prove Π = S T. L12(B) = L21(−B) is not this row.',
});

/** BE-147 through BE-170, in id order. @public */
export const THERMAL_R9_EDGES: readonly BridgeEdge[] = [
  be147Edge,
  be148Edge,
  be149Edge,
  be150Edge,
  be151Edge,
  be152Edge,
  be153Edge,
  be154Edge,
  be155Edge,
  be156Edge,
  be157Edge,
  be158Edge,
  be159Edge,
  be160Edge,
  be161Edge,
  be162Edge,
  be163Edge,
  be164Edge,
  be165Edge,
  be166Edge,
  be167Edge,
  be168Edge,
  be169Edge,
  be170Edge,
];
