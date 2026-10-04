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
];
