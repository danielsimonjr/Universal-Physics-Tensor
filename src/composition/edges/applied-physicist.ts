/**
 * Composition edges for BE-66 through BE-76.
 *
 * Each edge's endpoints state the same scale and force, so `kind` is
 * `law`. The overlay `formalRef` is kind `bridge`, so each id is a
 * seed. Confidence stays `established`: that grade is the catalog
 * status, and a proof does not promote it. `μ0` is `1/(ε0 c²)`, the
 * same product the Alfvén evaluator uses, so the leaf is `epsilon_0`
 * and `c` rather than a new canonical constant.
 *
 * @module composition/edges/applied-physicist
 */

import { evaluateRadiationPressure } from '../../bridges/be66-radiation-pressure.js';
import { evaluateAlfvenSpeed } from '../../bridges/be67-alfven-speed.js';
import { evaluateTolmanEhrenfest } from '../../bridges/be68-tolman-ehrenfest.js';
import { evaluateFastMagnetosonic } from '../../bridges/be69-fast-magnetosonic.js';
import { evaluateEinsteinRelation } from '../../bridges/be70-einstein-relation.js';
import { evaluateClapeyron } from '../../bridges/be71-clapeyron.js';
import { evaluateGravitationalRedshift } from '../../bridges/be72-gravitational-redshift.js';
import { evaluateKelvinPeltier } from '../../bridges/be73-kelvin-peltier.js';
import { evaluateMagneticPressure } from '../../bridges/be74-magnetic-pressure.js';
import { evaluateLondonPenetration } from '../../bridges/be75-london-penetration.js';
import { evaluatePlasmaBeta } from '../../bridges/be76-plasma-beta.js';
import { evaluateHagenPoiseuille } from '../../bridges/be77-hagen-poiseuille.js';
import { evaluateEulerBuckling } from '../../bridges/be78-euler-buckling.js';
import { evaluatePullIn } from '../../bridges/be79-pull-in.js';
import { evaluateMottGurney } from '../../bridges/be80-mott-gurney.js';
import { evaluateChildLangmuir } from '../../bridges/be81-child-langmuir.js';
import { evaluateShockleyDiode } from '../../bridges/be82-shockley-diode.js';
import { evaluateThomsonCoefficient } from '../../bridges/be83-thomson.js';
import { evaluateFourPointSheet } from '../../bridges/be84-four-point.js';
import { evaluateShotNoise } from '../../bridges/be85-shot-noise.js';
import { evaluateReynoldsAnalogy } from '../../bridges/be86-reynolds-analogy.js';
import { evaluateCapacitorNoise } from '../../bridges/be87-capacitor-noise.js';
import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { CONSTANTS } from '../../dimensional/symbolic-constants.js';
import { withBoundAliases, type BridgeEdge } from '../edge.js';
import type { Quantity } from '../quantity.js';
import {
  alfvenSpeedQ,
  incidenceAngleQ,
  magneticFluxDensityQ,
  metricG00Q,
  plasmaMassDensityQ,
  poyntingFluxQ,
  properTemperatureQ,
  radiationPressureQ,
  reflectanceQ,
  tolmanInvariantQ,
  soundSpeedQ,
  fastMagnetosonicSpeedQ,
  electricalMobilityQ,
  einsteinTemperatureQ,
  carrierChargeQ,
  diffusivityQ,
  latentHeatQ,
  clapeyronTemperatureQ,
  specificVolumeChangeQ,
  clapeyronSlopeQ,
  redshiftMetricG00OneQ,
  redshiftMetricG00TwoQ,
  gravitationalFrequencyRatioQ,
  seebeckCoefficientQ,
  peltierTemperatureQ,
  peltierCoefficientQ,
  magneticPressureQ,
  londonPenetrationDepthQ,
  plasmaBetaQ,
  carrierDensityQ,
  effectiveMassQ,
  temperatureQ,
  pipeRadiusQ,
  pipePressureDropQ,
  dynamicViscosityQ,
  pipeLengthQ,
  poiseuilleFlowQ,
  youngsModulusQ,
  areaMomentQ,
  columnLengthQ,
  bucklingLoadQ,
  pullInStiffnessQ,
  pullInGapQ,
  pullInAreaQ,
  pullInVoltageQ,
  mottPermittivityQ,
  mottMobilityQ,
  mottVoltageQ,
  mottThicknessQ,
  mottGurneyCurrentQ,
  childCarrierMassQ,
  childVoltageQ,
  childGapQ,
  childLangmuirCurrentQ,
  shockleySaturationQ,
  shockleyVoltageQ,
  shockleyTemperatureQ,
  shockleyCurrentQ,
  thomsonTemperatureQ,
  seebeckSlopeQ,
  thomsonCoefficientQ,
  fourPointVoltageQ,
  fourPointCurrentQ,
  sheetResistanceQ,
  shotCurrentQ,
  shotNoiseQ,
  skinFrictionQ,
  stantonNumberQ,
  capacitorTemperatureQ,
  capacitanceQ,
  capacitorVoltageVarianceQ,
} from '../quantities.js';

const finite = Number.isFinite;
const qsym = (q: Quantity): ExprNode => ({ kind: 'symbol', name: q.name, dim: q.dim });
const csym = (name: keyof typeof CONSTANTS): ExprNode => ({ kind: 'symbol', name, dim: CONSTANTS[name].dim });
const lit = (n: number): ExprNode => ({ kind: 'symbol', name: String(n), dim: DIMENSIONLESS });
const prod = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });
const plus = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '+', args: [a, b] });
const ratio = (num: ExprNode, den: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [num, den] });
const pow = (base: ExprNode, exp: ExprNode): ExprNode => ({ kind: 'op', op: '^', args: [base, exp] });
/** μ0 = 1/(ε0 c²). The same product the Alfvén and magnetosonic formulas use. */
const mu0: ExprNode = ratio(lit(1), prod(csym('epsilon_0'), pow(csym('c'), lit(2))));
/** π as a dimensionless leaf. `piMultipleValue` resolves the name. */
const pi: ExprNode = { kind: 'symbol', name: 'pi', dim: DIMENSIONLESS };
const expOf = (arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn: 'exp', arg });

/** P_n = (I/c) (1+R) cos²θ. */
const BE66_SYMBOLIC: ExprNode = prod(
  ratio(qsym(poyntingFluxQ), csym('c')),
  plus(lit(1), qsym(reflectanceQ)),
  pow({ kind: 'transcendental', fn: 'cos', arg: qsym(incidenceAngleQ) }, lit(2)),
);

/** μ0 = 1/(ε0 c²). v_A = B / √(μ0 ρ). */
const BE67_SYMBOLIC: ExprNode = ratio(
  qsym(magneticFluxDensityQ),
  pow(prod(ratio(lit(1), prod(csym('epsilon_0'), pow(csym('c'), lit(2)))), qsym(plasmaMassDensityQ)), lit(0.5)),
);

/** T √(−g_00), written (−1)·g_00 because unary minus is not an operator. */
const BE68_SYMBOLIC: ExprNode = prod(
  qsym(properTemperatureQ),
  pow(prod(lit(-1), qsym(metricG00Q)), lit(0.5)),
);

/**
 * BE-66 radiation pressure:
 * (poynting-flux, reflectance, incidence-angle) → radiation-pressure,
 * `P_n = (I/c) (1+R) cos²θ`. `c` is a constant. Endpoints share the
 * classical electromagnetic attributes: a law.
 *
 * @public
 */
export const be66Edge: BridgeEdge = withBoundAliases({
  id: 'be-66',
  beId: 66,
  kind: 'law',
  label: 'Radiation pressure P_n = (I/c) (1+R) cos²θ',
  sources: [poyntingFluxQ, reflectanceQ, incidenceAngleQ],
  aliases: {
    'poynting-flux': ['I_W_per_m2', 'I'],
    reflectance: ['R'],
    'incidence-angle': ['theta_rad', 'theta'],
  },
  target: radiationPressureQ,
  confidence: 'established',
  domain: {
    description: 'I ≥ 0, R on [0, 1], θ finite; transmission 0',
    predicate: (i) =>
      finite(i['poynting-flux']) &&
      i['poynting-flux'] >= 0 &&
      finite(i['reflectance']) &&
      i['reflectance'] >= 0 &&
      i['reflectance'] <= 1 &&
      finite(i['incidence-angle']),
  },
  evaluate: (i) =>
    evaluateRadiationPressure({
      I_W_per_m2: i['poynting-flux'],
      R: i['reflectance'],
      theta_rad: i['incidence-angle'],
    }).P_Pa,
  symbolic: BE66_SYMBOLIC,
  citation:
    'OpenStax University Physics Volume 2, https://openstax.org/books/university-physics-volume-2/pages/16-4-momentum-and-radiation-pressure (absorber I/c, reflector 2I/c). The (1+R) cos²θ factor is this catalog\'s assembly.',
});

/**
 * BE-67 Alfvén speed: (magnetic-flux-density, plasma-mass-density) →
 * alfven-speed, `v_A = B / √(μ0 ρ)`. `ρ` is the total mass density.
 * `μ0` is a constant. Endpoints share the classical electromagnetic
 * attributes: a law.
 *
 * @public
 */
export const be67Edge: BridgeEdge = withBoundAliases({
  id: 'be-67',
  beId: 67,
  kind: 'law',
  label: 'Alfvén speed v_A = B / √(μ0 ρ)',
  sources: [magneticFluxDensityQ, plasmaMassDensityQ],
  aliases: {
    'magnetic-flux-density': ['B_T'],
    'plasma-mass-density': ['rho_kg_per_m3'],
  },
  target: alfvenSpeedQ,
  confidence: 'established',
  domain: {
    description: 'B ≥ 0 and ρ > 0, both finite; ρ is a mass density',
    predicate: (i) =>
      finite(i['magnetic-flux-density']) &&
      i['magnetic-flux-density'] >= 0 &&
      finite(i['plasma-mass-density']) &&
      i['plasma-mass-density'] > 0,
  },
  evaluate: (i) =>
    evaluateAlfvenSpeed({
      B_T: i['magnetic-flux-density'],
      rho_kg_per_m3: i['plasma-mass-density'],
    }).v_m_per_s,
  symbolic: BE67_SYMBOLIC,
  citation: 'Alfvén 1942 Nature 150:405. SI form B/√(μ0 ρ); ρ is the total mass density.',
});

/**
 * BE-68 Tolman–Ehrenfest: (proper-temperature, metric-g00) →
 * tolman-invariant, `T √(−g_00)`. Endpoints share the classical
 * gravitational attributes: a law. Not an identification with
 * `temperature` or `hawking-temperature`.
 *
 * @public
 */
export const be68Edge: BridgeEdge = withBoundAliases({
  id: 'be-68',
  beId: 68,
  kind: 'law',
  label: 'Tolman–Ehrenfest invariant T √(−g_00)',
  sources: [properTemperatureQ, metricG00Q],
  aliases: {
    'proper-temperature': ['T_K'],
    'metric-g00': ['g_00'],
  },
  target: tolmanInvariantQ,
  confidence: 'established',
  domain: {
    description: 'T > 0 and g_00 < 0, both finite',
    predicate: (i) =>
      finite(i['proper-temperature']) &&
      i['proper-temperature'] > 0 &&
      finite(i['metric-g00']) &&
      i['metric-g00'] < 0,
  },
  evaluate: (i) =>
    evaluateTolmanEhrenfest({
      T_K: i['proper-temperature'],
      g_00: i['metric-g00'],
    }).invariant_K,
  symbolic: BE68_SYMBOLIC,
  citation:
    'Tolman & Ehrenfest 1930 Phys. Rev. 36:1791 (T0 √g_44). Catalog form T √(−g_00).',
});

/** |ω/k| = √(c_s² + B²/(μ0 ρ)), with μ0 = 1/(ε0 c²). */
const BE69_SYMBOLIC: ExprNode = pow(
  plus(
    pow(qsym(soundSpeedQ), lit(2)),
    ratio(
      pow(qsym(magneticFluxDensityQ), lit(2)),
      prod(ratio(lit(1), prod(csym('epsilon_0'), pow(csym('c'), lit(2)))), qsym(plasmaMassDensityQ)),
    ),
  ),
  lit(0.5),
);

/** D = μ k_B T / q. */
const BE70_SYMBOLIC: ExprNode = ratio(
  prod(qsym(electricalMobilityQ), csym('k_B'), qsym(einsteinTemperatureQ)),
  qsym(carrierChargeQ),
);

/** dP/dT = L / (T Δv). */
const BE71_SYMBOLIC: ExprNode = ratio(
  qsym(latentHeatQ),
  prod(qsym(clapeyronTemperatureQ), qsym(specificVolumeChangeQ)),
);

/** ν1/ν2 = √(g2/g1). Both components are negative, so the ratio is positive. */
const BE72_SYMBOLIC: ExprNode = pow(ratio(qsym(redshiftMetricG00TwoQ), qsym(redshiftMetricG00OneQ)), lit(0.5));

/** Π = S T. Onsager reciprocity is not a leaf. */
const BE73_SYMBOLIC: ExprNode = prod(qsym(seebeckCoefficientQ), qsym(peltierTemperatureQ));

/**
 * BE-69 fast magnetosonic speed:
 * (sound-speed, magnetic-flux-density, plasma-mass-density) →
 * fast-magnetosonic-speed. `c_s = 0` recovers the Alfvén number and
 * does not identify this target with `alfven-speed`.
 *
 * @public
 */
export const be69Edge: BridgeEdge = withBoundAliases({
  id: 'be-69',
  beId: 69,
  kind: 'law',
  label: 'Fast magnetosonic speed |ω/k| = √(c_s² + B²/(μ0 ρ))',
  sources: [soundSpeedQ, magneticFluxDensityQ, plasmaMassDensityQ],
  aliases: {
    'sound-speed': ['cs_m_per_s', 'c_s'],
    'magnetic-flux-density': ['B_T'],
    'plasma-mass-density': ['rho_kg_per_m3'],
  },
  target: fastMagnetosonicSpeedQ,
  confidence: 'established',
  domain: {
    description: 'c_s ≥ 0, B finite, ρ > 0',
    predicate: (i) =>
      finite(i['sound-speed']) &&
      i['sound-speed'] >= 0 &&
      finite(i['magnetic-flux-density']) &&
      finite(i['plasma-mass-density']) &&
      i['plasma-mass-density'] > 0,
  },
  evaluate: (i) =>
    evaluateFastMagnetosonic({
      cs_m_per_s: i['sound-speed'],
      B_T: i['magnetic-flux-density'],
      rho_kg_per_m3: i['plasma-mass-density'],
    }).v_m_per_s,
  symbolic: BE69_SYMBOLIC,
  citation:
    'PhysJS.FastMagnetosonic.speed_eq. Perpendicular compressional phase speed. c_s = 0 is the Alfvén number of a different polarization.',
});

/**
 * BE-70 Einstein relation: (electrical-mobility, einstein-temperature,
 * carrier-charge) → diffusivity, `D = μ k_B T / q`.
 *
 * @public
 */
export const be70Edge: BridgeEdge = withBoundAliases({
  id: 'be-70',
  beId: 70,
  kind: 'law',
  label: 'Einstein relation D = μ k_B T / q',
  sources: [electricalMobilityQ, einsteinTemperatureQ, carrierChargeQ],
  aliases: {
    'electrical-mobility': ['mu_m2_per_Vs'],
    'einstein-temperature': ['T_K'],
    'carrier-charge': ['q_C'],
  },
  target: diffusivityQ,
  confidence: 'established',
  domain: {
    description: 'μ finite, T ≠ 0, q ≠ 0',
    predicate: (i) =>
      finite(i['electrical-mobility']) &&
      finite(i['einstein-temperature']) &&
      i['einstein-temperature'] !== 0 &&
      finite(i['carrier-charge']) &&
      i['carrier-charge'] !== 0,
  },
  evaluate: (i) =>
    evaluateEinsteinRelation({
      mu_m2_per_Vs: i['electrical-mobility'],
      T_K: i['einstein-temperature'],
      q_C: i['carrier-charge'],
    }).D_m2_per_s,
  symbolic: BE70_SYMBOLIC,
  citation: 'PhysJS.EinsteinRelation.diffusion_eq. Drift cancels diffusion on a Boltzmann profile.',
});

/**
 * BE-71 Clapeyron slope: (specific-latent-heat, clapeyron-temperature,
 * specific-volume-change) → clapeyron-slope, `dP/dT = L/(T Δv)`.
 *
 * @public
 */
export const be71Edge: BridgeEdge = withBoundAliases({
  id: 'be-71',
  beId: 71,
  kind: 'law',
  label: 'Clapeyron slope dP/dT = L/(T Δv)',
  sources: [latentHeatQ, clapeyronTemperatureQ, specificVolumeChangeQ],
  aliases: {
    'specific-latent-heat': ['L_J_per_kg'],
    'clapeyron-temperature': ['T_K'],
    'specific-volume-change': ['delta_v_m3_per_kg'],
  },
  target: clapeyronSlopeQ,
  confidence: 'established',
  domain: {
    description: 'L finite, T ≠ 0, Δv ≠ 0',
    predicate: (i) =>
      finite(i['specific-latent-heat']) &&
      finite(i['clapeyron-temperature']) &&
      i['clapeyron-temperature'] !== 0 &&
      finite(i['specific-volume-change']) &&
      i['specific-volume-change'] !== 0,
  },
  evaluate: (i) =>
    evaluateClapeyron({
      L_J_per_kg: i['specific-latent-heat'],
      T_K: i['clapeyron-temperature'],
      delta_v_m3_per_kg: i['specific-volume-change'],
    }).slope_Pa_per_K,
  symbolic: BE71_SYMBOLIC,
  citation: 'PhysJS.Clapeyron.slope_eq. L = T (s2−s1) is already substituted. The entropy slope is not a second edge.',
});

/**
 * BE-72 gravitational redshift: (redshift-metric-g00-1,
 * redshift-metric-g00-2) → gravitational-frequency-ratio,
 * `ν1/ν2 = √(g2/g1)`. The quantities are not BE-68's, so this edge
 * does not compose into the Tolman invariant.
 *
 * @public
 */
export const be72Edge: BridgeEdge = withBoundAliases({
  id: 'be-72',
  beId: 72,
  kind: 'law',
  label: 'Gravitational redshift ν1/ν2 = √(g2/g1)',
  sources: [redshiftMetricG00OneQ, redshiftMetricG00TwoQ],
  aliases: {
    'redshift-metric-g00-1': ['g1'],
    'redshift-metric-g00-2': ['g2'],
  },
  target: gravitationalFrequencyRatioQ,
  confidence: 'established',
  domain: {
    description: 'both static g_00 components are finite and negative',
    predicate: (i) =>
      finite(i['redshift-metric-g00-1']) &&
      i['redshift-metric-g00-1'] < 0 &&
      finite(i['redshift-metric-g00-2']) &&
      i['redshift-metric-g00-2'] < 0,
  },
  evaluate: (i) =>
    evaluateGravitationalRedshift({
      g1: i['redshift-metric-g00-1'],
      g2: i['redshift-metric-g00-2'],
    }).frequency_ratio,
  symbolic: BE72_SYMBOLIC,
  citation:
    'PhysJS.GravitationalRedshift.frequency_ratio. Not PhysJS.TolmanEhrenfest.hydrostatic_constant. tolman_same_ratio is nested and is not this edge.',
});

/**
 * BE-73 Kelvin relation: (seebeck-coefficient, peltier-temperature) →
 * peltier-coefficient, `Π = S T`. Onsager reciprocity is the structure
 * field in the theorem, not a source.
 *
 * @public
 */
export const be73Edge: BridgeEdge = withBoundAliases({
  id: 'be-73',
  beId: 73,
  kind: 'law',
  label: 'Kelvin relation Π = S T',
  sources: [seebeckCoefficientQ, peltierTemperatureQ],
  aliases: {
    'seebeck-coefficient': ['S_V_per_K'],
    'peltier-temperature': ['T_K'],
  },
  target: peltierCoefficientQ,
  confidence: 'established',
  domain: {
    description: 'S finite and T ≠ 0',
    predicate: (i) => finite(i['seebeck-coefficient']) && finite(i['peltier-temperature']) && i['peltier-temperature'] !== 0,
  },
  evaluate: (i) =>
    evaluateKelvinPeltier({
      S_V_per_K: i['seebeck-coefficient'],
      T_K: i['peltier-temperature'],
    }).Pi_V,
  symbolic: BE73_SYMBOLIC,
  citation:
    'PhysJS.KelvinRelation.peltier_eq. L12 = L21 is ThermoelectricOnsager.onsager, a structure field, not an axiom and not an input.',
});

/** p_B = B² / (2 μ0). The 2 is the inductor integral, not a Buckingham constant. */
const BE74_SYMBOLIC: ExprNode = ratio(pow(qsym(magneticFluxDensityQ), lit(2)), prod(lit(2), mu0));

/** λ_L = √(m / (μ0 n e²)). `e` is the elementary charge. */
const BE75_SYMBOLIC: ExprNode = pow(
  ratio(qsym(effectiveMassQ), prod(mu0, qsym(carrierDensityQ), pow(csym('e'), lit(2)))),
  lit(0.5),
);

/** β = n k_B T / p_B. Substituting BE-74 yields 2 μ0 n k_B T / B². */
const BE76_SYMBOLIC: ExprNode = ratio(
  prod(qsym(carrierDensityQ), csym('k_B'), qsym(temperatureQ)),
  qsym(magneticPressureQ),
);

/**
 * BE-74 magnetic pressure: magnetic-flux-density → magnetic-pressure,
 * `p_B = B²/(2 μ0)`. `μ0` is a constant. The endpoints share the
 * classical electromagnetic attributes: a law.
 *
 * @public
 */
export const be74Edge: BridgeEdge = withBoundAliases({
  id: 'be-74',
  beId: 74,
  kind: 'law',
  label: 'Magnetic pressure p_B = B²/(2 μ0)',
  sources: [magneticFluxDensityQ],
  aliases: {
    'magnetic-flux-density': ['B_T', 'B'],
  },
  target: magneticPressureQ,
  confidence: 'established',
  domain: {
    description: 'B finite; the factor 2 is the stored-energy half, not C = 1',
    predicate: (i) => finite(i['magnetic-flux-density']),
  },
  evaluate: (i) => evaluateMagneticPressure({ B_T: i['magnetic-flux-density'] }).p_Pa,
  symbolic: BE74_SYMBOLIC,
  citation:
    'PhysJS.MagneticPressure.pressure_eq. U = (L/2) I². C = 1 is the battery work per volume, not this pressure.',
});

/**
 * BE-75 London penetration depth: (effective-mass, carrier-density) →
 * london-penetration-depth, `λ_L = √(m/(μ0 n e²))`. `e` and `μ0` are
 * constants. The endpoints share the carrier attributes: a law.
 *
 * @public
 */
export const be75Edge: BridgeEdge = withBoundAliases({
  id: 'be-75',
  beId: 75,
  kind: 'law',
  label: 'London penetration depth λ_L = √(m/(μ0 n e²))',
  sources: [effectiveMassQ, carrierDensityQ],
  aliases: {
    'effective-mass': ['m_kg', 'm'],
    'carrier-density': ['n_per_m3', 'n'],
  },
  target: londonPenetrationDepthQ,
  confidence: 'established',
  domain: {
    description: 'm > 0 and n > 0; e is the elementary charge',
    predicate: (i) => finite(i['effective-mass']) && i['effective-mass'] > 0 && finite(i['carrier-density']) && i['carrier-density'] > 0,
  },
  evaluate: (i) =>
    evaluateLondonPenetration({
      m_kg: i['effective-mass'],
      n_per_m3: i['carrier-density'],
    }).lambda_m,
  symbolic: BE75_SYMBOLIC,
  citation:
    'PhysJS.LondonPenetration.depth_eq. Units also admit μ0 e²/m. Not the classical skin depth.',
});

/**
 * BE-76 plasma beta: (carrier-density, temperature, magnetic-pressure) →
 * plasma-beta, `β = n k_B T / p_B`. The magnetic-pressure source is
 * BE-74, so the edges compose. `carrier-density` is quantum and
 * `magnetic-pressure` is classical, so the endpoints differ: a bridge.
 * Not a plasma-β inequality.
 *
 * @public
 */
export const be76Edge: BridgeEdge = withBoundAliases({
  id: 'be-76',
  beId: 76,
  kind: 'bridge',
  label: 'Plasma beta β = n k_B T / p_B',
  sources: [carrierDensityQ, temperatureQ, magneticPressureQ],
  aliases: {
    'carrier-density': ['n_per_m3', 'n'],
    temperature: ['T_K', 'T'],
    'magnetic-pressure': ['p_B_Pa', 'p_B'],
  },
  target: plasmaBetaQ,
  confidence: 'established',
  domain: {
    description: 'n and T finite, p_B ≠ 0; p_B is B²/(2 μ0)',
    predicate: (i) =>
      finite(i['carrier-density']) &&
      finite(i['temperature']) &&
      finite(i['magnetic-pressure']) &&
      i['magnetic-pressure'] !== 0,
  },
  evaluate: (i) =>
    evaluatePlasmaBeta({
      n_per_m3: i['carrier-density'],
      T_K: i['temperature'],
      p_B_Pa: i['magnetic-pressure'],
    }).beta,
  symbolic: BE76_SYMBOLIC,
  citation:
    'PhysJS.PlasmaBeta.beta_eq. p_B is PhysJS.MagneticPressure.pressure_eq. Using B²/μ0 is half of this beta. Not a plasma-β inequality.',
});

/** Q = π R⁴ ΔP / (8 μ L). The 8 is the no-slip integral. */
const BE77_SYMBOLIC: ExprNode = ratio(
  prod(pi, pow(qsym(pipeRadiusQ), lit(4)), qsym(pipePressureDropQ)),
  prod(lit(8), qsym(dynamicViscosityQ), qsym(pipeLengthQ)),
);

/** P_cr = π² E I / L². Pinned ends. Not the cantilever load. */
const BE78_SYMBOLIC: ExprNode = ratio(
  prod(pow(pi, lit(2)), qsym(youngsModulusQ), qsym(areaMomentQ)),
  pow(qsym(columnLengthQ), lit(2)),
);

/** V_pi = √(8 k g0³ / (27 ε0 A)). The fold is g = 2 g0/3. */
const BE79_SYMBOLIC: ExprNode = pow(
  ratio(
    prod(lit(8), qsym(pullInStiffnessQ), pow(qsym(pullInGapQ), lit(3))),
    prod(lit(27), csym('epsilon_0'), qsym(pullInAreaQ)),
  ),
  lit(0.5),
);

/** J = (9/8) ε μ V² / d³. Not Child–Langmuir. */
const BE80_SYMBOLIC: ExprNode = ratio(
  prod(lit(9), qsym(mottPermittivityQ), qsym(mottMobilityQ), pow(qsym(mottVoltageQ), lit(2))),
  prod(lit(8), pow(qsym(mottThicknessQ), lit(3))),
);

/** J = (4 ε0 / 9) √(2 e / m) V^{3/2} / d². `e` is the elementary charge. */
const BE81_SYMBOLIC: ExprNode = ratio(
  prod(
    lit(4),
    csym('epsilon_0'),
    pow(ratio(prod(lit(2), csym('e')), qsym(childCarrierMassQ)), lit(0.5)),
    pow(qsym(childVoltageQ), lit(1.5)),
  ),
  prod(lit(9), pow(qsym(childGapQ), lit(2))),
);

/** I = I_s (exp(e V / (k_B T)) − 1). Ideality is 1. The minus is the literal −1. */
const BE82_SYMBOLIC: ExprNode = prod(
  qsym(shockleySaturationQ),
  plus(
    expOf(ratio(prod(csym('e'), qsym(shockleyVoltageQ)), prod(csym('k_B'), qsym(shockleyTemperatureQ)))),
    lit(-1),
  ),
);

/** μ_T = T dS/dT. Not Π = S T. */
const BE83_SYMBOLIC: ExprNode = prod(qsym(thomsonTemperatureQ), qsym(seebeckSlopeQ));

/** R_s = (π / ln 2) (V / I). The radial 1/r field is a hypothesis. */
const BE84_SYMBOLIC: ExprNode = prod(
  ratio(pi, csym('ln2')),
  ratio(qsym(fourPointVoltageQ), qsym(fourPointCurrentQ)),
);

/** S_I = 2 e I. One-sided. `e` is the elementary charge. */
const BE85_SYMBOLIC: ExprNode = prod(lit(2), csym('e'), qsym(shotCurrentQ));

/** St = C_f / 2 at Pr = 1 with matched wall slopes. */
const BE86_SYMBOLIC: ExprNode = ratio(qsym(skinFrictionQ), lit(2));

/** ⟨v²⟩ = k_B T / C. One quadratic term. */
const BE87_SYMBOLIC: ExprNode = ratio(prod(csym('k_B'), qsym(capacitorTemperatureQ)), qsym(capacitanceQ));

/**
 * BE-77 Hagen–Poiseuille: (radius, pressure drop, viscosity, length) →
 * flux. The axial balance, centerline slope 0, and no-slip are hypotheses.
 *
 * @public
 */
export const be77Edge: BridgeEdge = withBoundAliases({
  id: 'be-77',
  beId: 77,
  kind: 'law',
  label: 'Hagen–Poiseuille flux Q = π R⁴ ΔP / (8 μ L)',
  sources: [pipeRadiusQ, pipePressureDropQ, dynamicViscosityQ, pipeLengthQ],
  aliases: {
    'pipe-radius': ['R_m', 'R'],
    'pipe-pressure-drop': ['deltaP_Pa', 'deltaP'],
    'dynamic-viscosity': ['mu_Pa_s'],
    'pipe-length': ['L_m', 'L'],
  },
  target: poiseuilleFlowQ,
  confidence: 'established',
  domain: {
    description: 'R > 0, ΔP finite, μ ≠ 0, L ≠ 0; circular pipe, not a square duct',
    predicate: (i) =>
      finite(i['pipe-radius']) &&
      i['pipe-radius'] > 0 &&
      finite(i['pipe-pressure-drop']) &&
      finite(i['dynamic-viscosity']) &&
      i['dynamic-viscosity'] !== 0 &&
      finite(i['pipe-length']) &&
      i['pipe-length'] !== 0,
  },
  evaluate: (i) =>
    evaluateHagenPoiseuille({
      R_m: i['pipe-radius'],
      deltaP_Pa: i['pipe-pressure-drop'],
      mu_Pa_s: i['dynamic-viscosity'],
      L_m: i['pipe-length'],
    }).Q_m3_per_s,
  symbolic: BE77_SYMBOLIC,
  citation:
    'PhysJS.HagenPoiseuille.flow_eq. f_D Re = 64 follows from Darcy definitions. The Fanning factor is 16. Not a square duct.',
});

/**
 * BE-78 Euler buckling: (modulus, area moment, length) → pinned load.
 * The cantilever load is a different factor.
 *
 * @public
 */
export const be78Edge: BridgeEdge = withBoundAliases({
  id: 'be-78',
  beId: 78,
  kind: 'law',
  label: 'Euler pinned load P_cr = π² E I / L²',
  sources: [youngsModulusQ, areaMomentQ, columnLengthQ],
  aliases: {
    'youngs-modulus': ['E_Pa', 'E'],
    'area-moment': ['I_m4'],
    'column-length': ['L_m', 'L'],
  },
  target: bucklingLoadQ,
  confidence: 'established',
  domain: {
    description: 'E > 0, I > 0, L > 0; pinned ends y(0) = y(L) = 0',
    predicate: (i) =>
      finite(i['youngs-modulus']) &&
      i['youngs-modulus'] > 0 &&
      finite(i['area-moment']) &&
      i['area-moment'] > 0 &&
      finite(i['column-length']) &&
      i['column-length'] > 0,
  },
  evaluate: (i) =>
    evaluateEulerBuckling({
      E_Pa: i['youngs-modulus'],
      I_m4: i['area-moment'],
      L_m: i['column-length'],
    }).P_N,
  symbolic: BE78_SYMBOLIC,
  citation:
    'PhysJS.EulerBuckling.critical_load. The beam equation is a hypothesis. The clamped-free load is π² E I / (4 L²), not this load.',
});

/**
 * BE-79 pull-in: (stiffness, rest gap, area) → voltage. Parallel-plate
 * and quasi-static balance are hypotheses. Not a fringing field.
 *
 * @public
 */
export const be79Edge: BridgeEdge = withBoundAliases({
  id: 'be-79',
  beId: 79,
  kind: 'law',
  label: 'Pull-in voltage V_pi = √(8 k g0³ / (27 ε0 A))',
  sources: [pullInStiffnessQ, pullInGapQ, pullInAreaQ],
  aliases: {
    'pull-in-stiffness': ['k_N_per_m', 'k'],
    'pull-in-gap': ['g0_m', 'g0'],
    'pull-in-area': ['A_m2', 'A'],
  },
  target: pullInVoltageQ,
  confidence: 'established',
  domain: {
    description: 'k > 0, g0 > 0, A > 0; the fold is g = 2 g0/3, not g0/2',
    predicate: (i) =>
      finite(i['pull-in-stiffness']) &&
      i['pull-in-stiffness'] > 0 &&
      finite(i['pull-in-gap']) &&
      i['pull-in-gap'] > 0 &&
      finite(i['pull-in-area']) &&
      i['pull-in-area'] > 0,
  },
  evaluate: (i) =>
    evaluatePullIn({
      k_N_per_m: i['pull-in-stiffness'],
      g0_m: i['pull-in-gap'],
      A_m2: i['pull-in-area'],
    }).V_pi_V,
  symbolic: BE79_SYMBOLIC,
  citation:
    'PhysJS.PullIn.pull_in_eq. C = ε0 A/g and the linear spring are hypotheses. g = g0/2 is not the fold.',
});

/**
 * BE-80 Mott–Gurney: drift, Poisson, and an injecting contact. Not
 * Child–Langmuir.
 *
 * @public
 */
export const be80Edge: BridgeEdge = withBoundAliases({
  id: 'be-80',
  beId: 80,
  kind: 'law',
  label: 'Mott–Gurney current J = (9/8) ε μ V² / d³',
  sources: [mottPermittivityQ, mottMobilityQ, mottVoltageQ, mottThicknessQ],
  aliases: {
    'mott-permittivity': ['eps'],
    'mott-mobility': ['mu_m2_per_Vs', 'mu'],
    'mott-voltage': ['V_volts', 'V'],
    'mott-thickness': ['d_m', 'd'],
  },
  target: mottGurneyCurrentQ,
  confidence: 'established',
  domain: {
    description: 'ε > 0, μ > 0, V finite, d > 0; E(0) = 0',
    predicate: (i) =>
      finite(i['mott-permittivity']) &&
      i['mott-permittivity'] > 0 &&
      finite(i['mott-mobility']) &&
      i['mott-mobility'] > 0 &&
      finite(i['mott-voltage']) &&
      finite(i['mott-thickness']) &&
      i['mott-thickness'] > 0,
  },
  evaluate: (i) =>
    evaluateMottGurney({
      eps: i['mott-permittivity'],
      mu_m2_per_Vs: i['mott-mobility'],
      V_volts: i['mott-voltage'],
      d_m: i['mott-thickness'],
    }).J_A_per_m2,
  symbolic: BE80_SYMBOLIC,
  citation:
    'PhysJS.MottGurney.current_eq. Drift, Poisson, and the injecting contact are hypotheses. Not Child–Langmuir.',
});

/**
 * BE-81 Child–Langmuir. Collisionless energy, Poisson, and the 4/3
 * profile. Poisson is not claimed at the cathode. `e` is elementary.
 *
 * @public
 */
export const be81Edge: BridgeEdge = withBoundAliases({
  id: 'be-81',
  beId: 81,
  kind: 'law',
  label: 'Child–Langmuir current J = (4 ε0/9) √(2 e/m) V^{3/2}/d²',
  sources: [childCarrierMassQ, childVoltageQ, childGapQ],
  aliases: {
    'child-carrier-mass': ['m_kg', 'm'],
    'child-voltage': ['V_volts', 'V'],
    'child-gap': ['d_m', 'd'],
  },
  target: childLangmuirCurrentQ,
  confidence: 'established',
  domain: {
    description: 'm > 0, V > 0, d > 0; cathode field 0; Poisson not at x = 0',
    predicate: (i) =>
      finite(i['child-carrier-mass']) &&
      i['child-carrier-mass'] > 0 &&
      finite(i['child-voltage']) &&
      i['child-voltage'] > 0 &&
      finite(i['child-gap']) &&
      i['child-gap'] > 0,
  },
  evaluate: (i) =>
    evaluateChildLangmuir({
      m_kg: i['child-carrier-mass'],
      V_volts: i['child-voltage'],
      d_m: i['child-gap'],
    }).J_A_per_m2,
  symbolic: BE81_SYMBOLIC,
  citation:
    'PhysJS.ChildLangmuir.current_eq. e is the elementary charge. Not a drift-only solid.',
});

/**
 * BE-82 Shockley diode at ideality 1. Not a diffusion-length ODE.
 *
 * @public
 */
export const be82Edge: BridgeEdge = withBoundAliases({
  id: 'be-82',
  beId: 82,
  kind: 'law',
  label: 'Shockley diode I = I_s (exp(e V/(k_B T)) − 1)',
  sources: [shockleySaturationQ, shockleyVoltageQ, shockleyTemperatureQ],
  aliases: {
    'shockley-saturation': ['I_s_A', 'I_s'],
    'shockley-voltage': ['V_volts', 'V'],
    'shockley-temperature': ['T_K', 'T'],
  },
  target: shockleyCurrentQ,
  confidence: 'established',
  domain: {
    description: 'I_s and V finite, T ≠ 0; ideality 1',
    predicate: (i) =>
      finite(i['shockley-saturation']) &&
      finite(i['shockley-voltage']) &&
      finite(i['shockley-temperature']) &&
      i['shockley-temperature'] !== 0,
  },
  evaluate: (i) =>
    evaluateShockleyDiode({
      I_s_A: i['shockley-saturation'],
      V_volts: i['shockley-voltage'],
      T_K: i['shockley-temperature'],
    }).I_A,
  symbolic: BE82_SYMBOLIC,
  citation:
    'PhysJS.ShockleyDiode.shockley_eq. Quasi-equilibrium, detailed balance at V = 0, and low injection are hypotheses. Ideality 2 is not this current.',
});

/**
 * BE-83 Thomson coefficient. Builds on the Kelvin relation read along
 * temperature. The quantities do not meet be-73, so the edges do not compose.
 *
 * @public
 */
export const be83Edge: BridgeEdge = withBoundAliases({
  id: 'be-83',
  beId: 83,
  kind: 'law',
  label: 'Thomson coefficient μ_T = T dS/dT',
  sources: [thomsonTemperatureQ, seebeckSlopeQ],
  aliases: {
    'thomson-temperature': ['T_K', 'T'],
    'seebeck-slope': ['dS_dT_V_per_K2', 'dS_dT'],
  },
  target: thomsonCoefficientQ,
  confidence: 'established',
  domain: {
    description: 'T and dS/dT finite; Kelvin along temperature and the Thomson split are hypotheses',
    predicate: (i) => finite(i['thomson-temperature']) && finite(i['seebeck-slope']),
  },
  evaluate: (i) =>
    evaluateThomsonCoefficient({
      T_K: i['thomson-temperature'],
      dS_dT_V_per_K2: i['seebeck-slope'],
    }).mu_V_per_K,
  symbolic: BE83_SYMBOLIC,
  citation:
    'PhysJS.Thomson.thomson_eq. Π(t) = S(t) t is PhysJS.KelvinRelation.peltier_eq read along temperature. Not a second copy of Π = S T.',
});

/**
 * BE-84 four-point sheet resistance. The radial 1/r potential is a premise.
 *
 * @public
 */
export const be84Edge: BridgeEdge = withBoundAliases({
  id: 'be-84',
  beId: 84,
  kind: 'law',
  label: 'Four-point sheet resistance R_s = (π / ln 2) (V/I)',
  sources: [fourPointVoltageQ, fourPointCurrentQ],
  aliases: {
    'four-point-voltage': ['V_volts', 'V'],
    'four-point-current': ['I_A', 'I'],
  },
  target: sheetResistanceQ,
  confidence: 'established',
  domain: {
    description: 'V finite, I ≠ 0; probes at 0, s, 2s, 3s; radial field (I R_s)/(2 π r)',
    predicate: (i) => finite(i['four-point-voltage']) && finite(i['four-point-current']) && i['four-point-current'] !== 0,
  },
  evaluate: (i) =>
    evaluateFourPointSheet({
      V_volts: i['four-point-voltage'],
      I_A: i['four-point-current'],
    }).R_s_ohm,
  symbolic: BE84_SYMBOLIC,
  citation:
    'PhysJS.FourPoint.sheet_eq. The Laplace field and linear superposition are hypotheses. A sink at 4s is 2π/ln 3. Not PhysJS.Crossing.antisymmetry.',
});

/**
 * BE-85 one-sided shot noise. Not Johnson–Nyquist and not the two-sided e I.
 *
 * @public
 */
export const be85Edge: BridgeEdge = withBoundAliases({
  id: 'be-85',
  beId: 85,
  kind: 'law',
  label: 'Shot noise S_I = 2 e I',
  sources: [shotCurrentQ],
  aliases: {
    'shot-current': ['I_A', 'I'],
  },
  target: shotNoiseQ,
  confidence: 'established',
  domain: {
    description: 'I finite; Poisson Var(N) = mean(N); one-sided Δf = 1/(2 T)',
    predicate: (i) => finite(i['shot-current']),
  },
  evaluate: (i) => evaluateShotNoise({ I_A: i['shot-current'] }).S_I_A2_per_Hz,
  symbolic: BE85_SYMBOLIC,
  citation:
    'PhysJS.ShotNoise.shot_eq. e is the elementary charge. The two-sided bandwidth gives e I. Not Johnson–Nyquist.',
});

/**
 * BE-86 Reynolds analogy. Matched wall slopes and Pr = 1 are hypotheses.
 *
 * @public
 */
export const be86Edge: BridgeEdge = withBoundAliases({
  id: 'be-86',
  beId: 86,
  kind: 'law',
  label: 'Reynolds analogy St = C_f / 2',
  sources: [skinFrictionQ],
  aliases: {
    'skin-friction': ['C_f'],
  },
  target: stantonNumberQ,
  confidence: 'established',
  domain: {
    description: 'C_f finite; normalized wall gradients agree and Pr = 1',
    predicate: (i) => finite(i['skin-friction']),
  },
  evaluate: (i) => evaluateReynoldsAnalogy({ C_f: i['skin-friction'] }).St,
  symbolic: BE86_SYMBOLIC,
  citation:
    'PhysJS.ReynoldsAnalogy.reynolds_eq. St Pr = C_f/2 when the slopes match. Pr = 1 is the hypothesis that drops Pr. Not a Nusselt correlation.',
});

/**
 * BE-87 capacitor voltage variance. One quadratic term, not (3/2) k_B T/C.
 *
 * @public
 */
export const be87Edge: BridgeEdge = withBoundAliases({
  id: 'be-87',
  beId: 87,
  kind: 'law',
  label: 'Capacitor noise ⟨v²⟩ = k_B T / C',
  sources: [capacitorTemperatureQ, capacitanceQ],
  aliases: {
    'capacitor-temperature': ['T_K', 'T'],
    capacitance: ['C_F', 'C'],
  },
  target: capacitorVoltageVarianceQ,
  confidence: 'established',
  domain: {
    description: 'T finite, C > 0; U = (C/2) V²',
    predicate: (i) => finite(i['capacitor-temperature']) && finite(i['capacitance']) && i['capacitance'] > 0,
  },
  evaluate: (i) =>
    evaluateCapacitorNoise({
      T_K: i['capacitor-temperature'],
      C_F: i['capacitance'],
    }).v2_V2,
  symbolic: BE87_SYMBOLIC,
  citation:
    'PhysJS.CapacitorNoise.noise_eq. (3/2) k_B T/C is not this variance. Dropping the energy half gives k_B T/(2 C).',
});

/** The applied-physicist edges, in catalog-id order. @public */
export const APPLIED_PHYSICIST_EDGES: readonly BridgeEdge[] = [
  be66Edge,
  be67Edge,
  be68Edge,
  be69Edge,
  be70Edge,
  be71Edge,
  be72Edge,
  be73Edge,
  be74Edge,
  be75Edge,
  be76Edge,
  be77Edge,
  be78Edge,
  be79Edge,
  be80Edge,
  be81Edge,
  be82Edge,
  be83Edge,
  be84Edge,
  be85Edge,
  be86Edge,
  be87Edge,
];
