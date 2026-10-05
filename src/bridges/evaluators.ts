/**
 * Bridge-evaluator registry — the single dispatch surface for `upt evaluate`.
 *
 * The closed-form + Schwarzschild-spacetime bridges (BE-51/52/55…102) carry plain-JS
 * evaluators but were, until now, unreachable from the CLI (`upt eval` is
 * user-formula-only; `upt explain <be-NN>` even redirected to a capability that did
 * not exist). This registry maps each bridge id to its evaluator, its input keys,
 * and a typed `run`, so `upt evaluate be-63 mu_e=2` returns M_Ch ≈ 1.44 M_⊙.
 *
 * @module bridges/evaluators
 */
import { evaluateLandauerEnergy } from './equations/be-16-landauer.js';
import { evaluateHawkingTemperature } from './equations/be-42-hawking-temperature.js';
import { evaluateGravitationalLensing } from './gravitational-lensing.js';
import { evaluatePerihelionPrecession } from './perihelion-precession.js';
import { evaluateQuantumHall } from './be55-quantum-hall.js';
import { evaluateCasimir } from './be56-casimir.js';
import { evaluateUnruh } from './be57-unruh.js';
import { evaluateJohnsonNyquist } from './be58-johnson-nyquist.js';
import { evaluateACJosephson } from './be59-ac-josephson.js';
import { evaluateFractionalQH } from './be60-fractional-qh.js';
import { evaluateWiedemannFranz } from './be61-wiedemann-franz.js';
import { evaluateBCSGap } from './be62-bcs-gap.js';
import { evaluateChandrasekharMass } from './be63-chandrasekhar-mass.js';
import { evaluateEddingtonLuminosity } from './be64-eddington-luminosity.js';
import { evaluateJeansMass } from './be65-jeans-mass.js';
import { evaluateRadiationPressure } from './be66-radiation-pressure.js';
import { evaluateAlfvenSpeed } from './be67-alfven-speed.js';
import { evaluateTolmanEhrenfest } from './be68-tolman-ehrenfest.js';
import { evaluateFastMagnetosonic } from './be69-fast-magnetosonic.js';
import { evaluateEinsteinRelation } from './be70-einstein-relation.js';
import { evaluateClapeyron } from './be71-clapeyron.js';
import { evaluateGravitationalRedshift } from './be72-gravitational-redshift.js';
import { evaluateKelvinPeltier } from './be73-kelvin-peltier.js';
import { evaluateMagneticPressure } from './be74-magnetic-pressure.js';
import { evaluateLondonPenetration } from './be75-london-penetration.js';
import { evaluatePlasmaBeta } from './be76-plasma-beta.js';
import { evaluateHagenPoiseuille } from './be77-hagen-poiseuille.js';
import { evaluateEulerBuckling } from './be78-euler-buckling.js';
import { evaluatePullIn } from './be79-pull-in.js';
import { evaluateMottGurney } from './be80-mott-gurney.js';
import { evaluateChildLangmuir } from './be81-child-langmuir.js';
import { evaluateShockleyDiode } from './be82-shockley-diode.js';
import { evaluateThomsonCoefficient } from './be83-thomson.js';
import { evaluateFourPointSheet } from './be84-four-point.js';
import { evaluateShotNoise } from './be85-shot-noise.js';
import { evaluateReynoldsAnalogy } from './be86-reynolds-analogy.js';
import { evaluateCapacitorNoise } from './be87-capacitor-noise.js';
import { evaluateFermiSea } from './be88-fermi-sea.js';
import { evaluateDebyeCutoff } from './be89-debye-cutoff.js';
import { evaluateDebyeHeat } from './be90-debye-heat.js';
import { evaluateEinsteinSolid } from './be91-einstein-solid.js';
import { evaluateSommerfeldHeat } from './be92-sommerfeld-heat.js';
import { evaluateCurieWeiss } from './be93-curie-weiss.js';
import { evaluatePauliParamagnetism } from './be94-pauli-paramagnetism.js';
import { evaluateGinzburgLandau } from './be95-ginzburg-landau.js';
import { evaluateUpperCritical } from './be96-upper-critical.js';
import { evaluateAmbegaokarBaratoff } from './be97-ambegaokar-baratoff.js';
import { evaluateBcsJump } from './be98-bcs-jump.js';
import { evaluateMassAction } from './be99-mass-action.js';
import { evaluateLyddaneSachsTeller } from './be100-lyddane-sachs-teller.js';
import { evaluateBktJump } from './be101-bkt-jump.js';
import { evaluateLandauerConductance } from './be102-landauer-conductance.js';
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
} from './plasma-space.js';
import { bridgeRegistry, registerBridge } from './registry.js';

/**
 * What a length input measures. Two lengths of one dimension are not
 * interchangeable: a radius is half a diameter, and a separation is neither.
 * @public
 */
export type GeometryRole = 'radius' | 'diameter' | 'separation' | 'impact-parameter' | 'semi-major-axis';

/**
 * Another way to give an input: `value × toKey` is the input's value, in the
 * same unit. Declared only where the conversion is exact geometry.
 * @public
 */
export interface ParameterAlternate {
  readonly key: string;
  readonly meaning: string;
  readonly toKey: number;
}

/**
 * One input of an evaluator, declared: what it is, the unit the evaluator
 * takes it in, and what it means. `unit` is a unit expression (`'m'`,
 * `'kg/m^3'`, `'yr'`, `''` for dimensionless); its dimension is derived from
 * it, never stated beside it.
 * @public
 */
export interface EvaluatorParameter {
  readonly key: string;
  readonly quantity: string;
  readonly symbol: string;
  readonly unit: string;
  readonly meaning: string;
  readonly geometry?: GeometryRole;
  /** A temperature input is a point on the absolute scale, never a difference. */
  readonly temperature?: 'absolute';
  readonly alternates?: readonly ParameterAlternate[];
  /** May be left out; the evaluator then says what it did without it. Applied cases only. */
  readonly optional?: true;
}

/** A callable bridge evaluator with its input contract. @public */
export interface EvaluatorSpec {
  readonly bridgeId: number;
  readonly name: string;
  /** Required numeric input keys (all must be supplied). */
  readonly inputKeys: readonly string[];
  /** One declaration per input key, in the same order. */
  readonly parameters: readonly EvaluatorParameter[];
  /** Evaluate with a validated input record; returns the evaluator's result object. */
  run(inputs: Readonly<Record<string, number>>): unknown;
}

/** @internal */
function spec(
  bridgeId: number,
  name: string,
  parameters: readonly EvaluatorParameter[],
  run: (i: Record<string, number>) => unknown,
): EvaluatorSpec {
  return { bridgeId, name, inputKeys: parameters.map((p) => p.key), parameters, run };
}

/** @internal */
const P = (
  key: string,
  quantity: string,
  symbol: string,
  unit: string,
  meaning: string,
  extra: Pick<EvaluatorParameter, 'geometry' | 'temperature' | 'alternates'> = {},
): EvaluatorParameter => ({ key, quantity, symbol, unit, meaning, ...extra });

const temperature = (key: string, quantity: string, symbol: string, meaning: string): EvaluatorParameter =>
  P(key, quantity, symbol, 'K', meaning, { temperature: 'absolute' });

/** Bridge id → evaluator. Registered, then snapshotted. */
const EVALUATOR_SPECS: readonly EvaluatorSpec[] = [
    spec(16, 'Landauer energy', [temperature('temperature_K', 'temperature', 'T', 'thermodynamic temperature, ≥ 0')], (i) => ({
      value: evaluateLandauerEnergy({ temperature_K: i.temperature_K }),
    })),
    spec(42, 'Hawking temperature', [P('M_kg', 'mass', 'M', 'kg', 'black-hole mass, > 0')], (i) => ({
      value: evaluateHawkingTemperature({ M_kg: i.M_kg }),
    })),
    spec(
      51,
      'Gravitational lensing (Eddington)',
      [
        P('M_kg', 'lensing mass', 'M', 'kg', 'mass of the deflecting body'),
        P('b_m', 'impact parameter', 'b', 'm', "closest-approach distance of the ray from the lens's centre, > 0", {
          geometry: 'impact-parameter',
        }),
      ],
      (i) => evaluateGravitationalLensing({ M_kg: i.M_kg, b_m: i.b_m }),
    ),
    spec(
      52,
      'Perihelion precession (Einstein)',
      [
        P('M_kg', 'central mass', 'M', 'kg', 'mass of the central body'),
        P('a_m', 'semi-major axis', 'a', 'm', "half the orbit's major axis, > 0", {
          geometry: 'semi-major-axis',
          alternates: [{ key: 'major_axis_m', meaning: 'the full major axis 2a (perihelion + aphelion distance)', toKey: 0.5 }],
        }),
        P('e', 'eccentricity', 'e', '', 'orbital eccentricity, 0 ≤ e < 1'),
        P('T_yr', 'orbital period', 'T', 'yr', 'in Julian years (365.25 d); used only for the per-century conversion'),
      ],
      (i) => evaluatePerihelionPrecession({ M_kg: i.M_kg, a_m: i.a_m, e: i.e, T_yr: i.T_yr }),
    ),
    spec(55, 'Integer quantum Hall / TKNN', [P('C', 'TKNN (Chern) number', 'C', '', 'the integer Hall plateau index')], (i) =>
      evaluateQuantumHall({ C: i.C }),
    ),
    spec(
      56,
      'Casimir effect',
      [P('d_m', 'plate separation', 'd', 'm', 'the gap between the facing plate surfaces, > 0', { geometry: 'separation' })],
      (i) => evaluateCasimir({ d_m: i.d_m }),
    ),
    spec(57, 'Unruh effect', [P('a_m_s2', 'proper acceleration', 'a', 'm/s^2', 'the proper acceleration, ≥ 0')], (i) =>
      evaluateUnruh({ a_m_s2: i.a_m_s2 }),
    ),
    spec(
      58,
      'Johnson-Nyquist noise',
      [
        temperature('T_K', 'temperature', 'T', 'absolute temperature of the resistor, ≥ 0 K'),
        P('R_ohm', 'resistance', 'R', 'ohm', 'the resistance, ≥ 0'),
      ],
      (i) => evaluateJohnsonNyquist({ T_K: i.T_K, R_ohm: i.R_ohm }),
    ),
    spec(59, 'AC Josephson', [P('V_volts', 'bias voltage', 'V', 'V', 'DC bias voltage across the junction')], (i) =>
      evaluateACJosephson({ V_volts: i.V_volts }),
    ),
    spec(60, 'Fractional quantum Hall', [P('nu', 'filling fraction', 'ν', '', 'ν = p/q, e.g. 1/3 as 0.3333')], (i) =>
      evaluateFractionalQH({ nu: i.nu }),
    ),
    spec(
      61,
      'Wiedemann-Franz',
      [
        P('sigma_S_per_m', 'electrical conductivity', 'σ', 'S/m', 'the electrical conductivity'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature of the metal'),
      ],
      (i) => evaluateWiedemannFranz({ sigma_S_per_m: i.sigma_S_per_m, T_K: i.T_K }),
    ),
    spec(62, 'BCS gap ratio', [temperature('T_c_K', 'critical temperature', 'T_c', 'the superconducting transition temperature')], (i) =>
      evaluateBCSGap({ T_c_K: i.T_c_K }),
    ),
    spec(
      63,
      'Chandrasekhar mass',
      [P('mu_e', 'mean molecular weight per electron', 'μ_e', '', '2 for a carbon/oxygen white dwarf')],
      (i) => evaluateChandrasekharMass({ mu_e: i.mu_e }),
    ),
    spec(64, 'Eddington luminosity', [P('M_kg', 'accretor mass', 'M', 'kg', 'mass of the accreting or radiating body')], (i) =>
      evaluateEddingtonLuminosity({ M_kg: i.M_kg }),
    ),
    spec(
      65,
      'Jeans mass',
      [
        temperature('T_K', 'cloud temperature', 'T', 'absolute temperature of the cloud'),
        P('rho_kg_per_m3', 'mass density', 'ρ', 'kg/m^3', 'mass density of the cloud'),
        P('mu', 'mean molecular weight', 'μ', '', '≈ 2.3 for molecular H₂/He clouds'),
      ],
      (i) => evaluateJeansMass({ T_K: i.T_K, rho_kg_per_m3: i.rho_kg_per_m3, mu: i.mu }),
    ),
    spec(
      66,
      'Radiation pressure',
      [
        P('I_W_per_m2', 'intensity', 'I', 'W/m^2', 'time-averaged Poynting-flux magnitude, ≥ 0'),
        P('R', 'reflectance', 'R', '', 'intensity reflectance on [0, 1]; transmission is 0'),
        P('theta_rad', 'incidence angle', 'θ', '', 'angle from the outward normal, radians'),
      ],
      (i) => evaluateRadiationPressure({ I_W_per_m2: i.I_W_per_m2, R: i.R, theta_rad: i.theta_rad }),
    ),
    spec(
      67,
      'Alfvén speed',
      [
        P('B_T', 'magnetic flux density', 'B', 'T', 'background field, ≥ 0'),
        P('rho_kg_per_m3', 'total mass density', 'ρ', 'kg/m^3', 'total mass density, not a number density'),
      ],
      (i) => evaluateAlfvenSpeed({ B_T: i.B_T, rho_kg_per_m3: i.rho_kg_per_m3 }),
    ),
    spec(
      68,
      'Tolman–Ehrenfest',
      [
        temperature('T_K', 'proper temperature', 'T', 'proper temperature, > 0 K'),
        P('g_00', 'metric component', 'g_00', '', 'static g_00, must be negative'),
      ],
      (i) => evaluateTolmanEhrenfest({ T_K: i.T_K, g_00: i.g_00 }),
    ),
    spec(
      69,
      'Fast magnetosonic speed',
      [
        P('cs_m_per_s', 'sound speed', 'c_s', 'm/s', 'sound speed, ≥ 0; zero recovers the Alfvén number of this polarization'),
        P('B_T', 'magnetic flux density', 'B', 'T', 'background field; the formula uses B²'),
        P('rho_kg_per_m3', 'total mass density', 'ρ', 'kg/m^3', 'total mass density, > 0'),
      ],
      (i) => evaluateFastMagnetosonic({ cs_m_per_s: i.cs_m_per_s, B_T: i.B_T, rho_kg_per_m3: i.rho_kg_per_m3 }),
    ),
    spec(
      70,
      'Einstein relation',
      [
        P('mu_m2_per_Vs', 'electrical mobility', 'μ', 'm^2/(V·s)', 'drift speed per electric field'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature, nonzero'),
        P('q_C', 'carrier charge', 'q', 'C', 'carrier charge, nonzero, same sign as μ'),
      ],
      (i) => evaluateEinsteinRelation({ mu_m2_per_Vs: i.mu_m2_per_Vs, T_K: i.T_K, q_C: i.q_C }),
    ),
    spec(
      71,
      'Clapeyron slope',
      [
        P('L_J_per_kg', 'specific latent heat', 'L', 'J/kg', 'L = T (s2 − s1)'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature on the coexistence curve, nonzero'),
        P('delta_v_m3_per_kg', 'specific-volume change', 'Δv', 'm^3/kg', 'v2 − v1, nonzero'),
      ],
      (i) => evaluateClapeyron({ L_J_per_kg: i.L_J_per_kg, T_K: i.T_K, delta_v_m3_per_kg: i.delta_v_m3_per_kg }),
    ),
    spec(
      72,
      'Gravitational redshift',
      [
        P('g1', 'metric component at observer 1', 'g1', '', 'static g_00, must be negative'),
        P('g2', 'metric component at observer 2', 'g2', '', 'static g_00, must be negative'),
      ],
      (i) => evaluateGravitationalRedshift({ g1: i.g1, g2: i.g2 }),
    ),
    spec(
      73,
      'Kelvin–Peltier',
      [
        P('S_V_per_K', 'Seebeck coefficient', 'S', 'V/K', 'open-circuit Seebeck coefficient'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature, nonzero'),
      ],
      (i) => evaluateKelvinPeltier({ S_V_per_K: i.S_V_per_K, T_K: i.T_K }),
    ),
    spec(
      74,
      'Magnetic pressure',
      [P('B_T', 'magnetic flux density', 'B', 'T', 'the formula uses B²; the factor 2 is not from units')],
      (i) => evaluateMagneticPressure({ B_T: i.B_T }),
    ),
    spec(
      75,
      'London penetration depth',
      [
        P('m_kg', 'carrier mass', 'm', 'kg', 'carrier mass'),
        P('n_per_m3', 'carrier density', 'n', 'm^-3', 'number density; e is the elementary charge'),
      ],
      (i) => evaluateLondonPenetration({ m_kg: i.m_kg, n_per_m3: i.n_per_m3 }),
    ),
    spec(
      76,
      'Plasma beta',
      [
        P('n_per_m3', 'number density', 'n', 'm^-3', 'ideal-gas number density'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature'),
        P('p_B_Pa', 'magnetic pressure', 'p_B', 'Pa', 'B²/(2 μ0), not B²/μ0; nonzero'),
      ],
      (i) => evaluatePlasmaBeta({ n_per_m3: i.n_per_m3, T_K: i.T_K, p_B_Pa: i.p_B_Pa }),
    ),
    spec(
      77,
      'Hagen–Poiseuille',
      [
        P('R_m', 'pipe radius', 'R', 'm', 'circular-pipe radius, > 0', { geometry: 'radius' }),
        P('deltaP_Pa', 'pressure drop', 'ΔP', 'Pa', 'axial pressure drop'),
        P('mu_Pa_s', 'dynamic viscosity', 'μ', 'Pa*s', 'Newtonian viscosity, nonzero'),
        P('L_m', 'pipe length', 'L', 'm', 'pipe length, nonzero'),
      ],
      (i) => evaluateHagenPoiseuille({ R_m: i.R_m, deltaP_Pa: i.deltaP_Pa, mu_Pa_s: i.mu_Pa_s, L_m: i.L_m }),
    ),
    spec(
      78,
      'Euler buckling',
      [
        P('E_Pa', "Young's modulus", 'E', 'Pa', 'modulus, > 0'),
        P('I_m4', 'second moment of area', 'I', 'm^4', 'metres to the fourth, > 0'),
        P('L_m', 'column length', 'L', 'm', 'length between pinned ends, > 0'),
      ],
      (i) => evaluateEulerBuckling({ E_Pa: i.E_Pa, I_m4: i.I_m4, L_m: i.L_m }),
    ),
    spec(
      79,
      'Pull-in voltage',
      [
        P('k_N_per_m', 'spring stiffness', 'k', 'N/m', 'linear spring, > 0'),
        P('g0_m', 'rest gap', 'g0', 'm', 'rest gap, > 0; the fold is 2 g0/3'),
        P('A_m2', 'plate area', 'A', 'm^2', 'parallel-plate area in m², > 0'),
      ],
      (i) => evaluatePullIn({ k_N_per_m: i.k_N_per_m, g0_m: i.g0_m, A_m2: i.A_m2 }),
    ),
    spec(
      80,
      'Mott–Gurney',
      [
        P('eps', 'permittivity', 'ε', 'F/m', 'solid permittivity in F/m, > 0'),
        P('mu_m2_per_Vs', 'drift mobility', 'μ', 'm^2/(V·s)', 'drift mobility, > 0'),
        P('V_volts', 'voltage', 'V', 'V', 'the formula uses V²'),
        P('d_m', 'thickness', 'd', 'm', 'film thickness, > 0', { geometry: 'separation' }),
      ],
      (i) => evaluateMottGurney({ eps: i.eps, mu_m2_per_Vs: i.mu_m2_per_Vs, V_volts: i.V_volts, d_m: i.d_m }),
    ),
    spec(
      81,
      'Child–Langmuir',
      [
        P('m_kg', 'particle mass', 'm', 'kg', 'particle mass, > 0'),
        P('V_volts', 'anode voltage', 'V', 'V', 'anode voltage, > 0; e is the elementary charge'),
        P('d_m', 'gap', 'd', 'm', 'gap, > 0; Poisson is not claimed at x = 0', { geometry: 'separation' }),
      ],
      (i) => evaluateChildLangmuir({ m_kg: i.m_kg, V_volts: i.V_volts, d_m: i.d_m }),
    ),
    spec(
      82,
      'Shockley diode',
      [
        P('I_s_A', 'saturation current', 'I_s', 'A', 'saturation current in amperes'),
        P('V_volts', 'bias', 'V', 'V', 'bias voltage; ideality is 1'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature, nonzero'),
      ],
      (i) => evaluateShockleyDiode({ I_s_A: i.I_s_A, V_volts: i.V_volts, T_K: i.T_K }),
    ),
    spec(
      83,
      'Thomson coefficient',
      [
        temperature('T_K', 'temperature', 'T', 'absolute temperature'),
        P('dS_dT_V_per_K2', 'Seebeck slope', 'dS/dT', 'V/K^2', 'volts per kelvin squared; not a sampled difference'),
      ],
      (i) => evaluateThomsonCoefficient({ T_K: i.T_K, dS_dT_V_per_K2: i.dS_dT_V_per_K2 }),
    ),
    spec(
      84,
      'Four-point sheet',
      [
        P('V_volts', 'inner-pair voltage', 'V', 'V', 'voltage on the inner pair'),
        P('I_A', 'probe current', 'I', 'A', 'current in amperes, nonzero'),
      ],
      (i) => evaluateFourPointSheet({ V_volts: i.V_volts, I_A: i.I_A }),
    ),
    spec(
      85,
      'Shot noise',
      [P('I_A', 'current', 'I', 'A', 'current in the Poisson mean, amperes; one-sided 2 e I')],
      (i) => evaluateShotNoise({ I_A: i.I_A }),
    ),
    spec(
      86,
      'Reynolds analogy',
      [P('C_f', 'skin friction', 'C_f', '', 'already normalized by ρ U²/2; Pr = 1 and matched slopes are hypotheses')],
      (i) => evaluateReynoldsAnalogy({ C_f: i.C_f }),
    ),
    spec(
      87,
      'Capacitor noise',
      [
        temperature('T_K', 'temperature', 'T', 'absolute temperature'),
        P('C_F', 'capacitance', 'C', 'F', 'capacitance, > 0; one quadratic term'),
      ],
      (i) => evaluateCapacitorNoise({ T_K: i.T_K, C_F: i.C_F }),
    ),
    spec(
      88,
      'Fermi wavevector',
      [
        P('n_per_m3', 'electron density', 'n', 'm^-3', 'two-spin number density'),
        P('m_kg', 'effective mass', 'm*', 'kg', 'isotropic band mass'),
      ],
      (i) => evaluateFermiSea({ n_per_m3: i.n_per_m3, m_kg: i.m_kg }),
    ),
    spec(
      89,
      'Debye cutoff',
      [
        P('v_m_per_s', 'sound speed', 'v_s', 'm/s', 'common acoustic speed'),
        P('n_per_m3', 'atom density', 'n', 'm^-3', 'three branches fill 3n states'),
      ],
      (i) => evaluateDebyeCutoff({ v_m_per_s: i.v_m_per_s, n_per_m3: i.n_per_m3 }),
    ),
    spec(
      90,
      'Debye heat',
      [
        P('N', 'atom count', 'N', '', 'number of atoms'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature'),
        temperature('thetaD_K', 'Debye temperature', 'θ_D', 'Debye temperature; π⁴/15 is assumed'),
      ],
      (i) => evaluateDebyeHeat({ N: i.N, T_K: i.T_K, thetaD_K: i.thetaD_K }),
    ),
    spec(
      91,
      'Einstein solid',
      [
        P('N', 'atom count', 'N', '', 'number of atoms; three oscillators each'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature'),
        temperature('thetaE_K', 'Einstein temperature', 'θ_E', 'Einstein temperature'),
      ],
      (i) => evaluateEinsteinSolid({ N: i.N, T_K: i.T_K, thetaE_K: i.thetaE_K }),
    ),
    spec(
      92,
      'Sommerfeld heat',
      [
        P('n_per_m3', 'electron density', 'n', 'm^-3', '√E density of states'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature'),
        P('E_F_J', 'Fermi energy', 'E_F', 'J', 'Fermi energy; the correction δU is a hypothesis'),
      ],
      (i) => evaluateSommerfeldHeat({ n_per_m3: i.n_per_m3, T_K: i.T_K, E_F_J: i.E_F_J }),
    ),
    spec(
      93,
      'Curie–Weiss',
      [
        P('n_per_m3', 'moment density', 'n', 'm^-3', 'moment density'),
        P('g', 'Landé factor', 'g', '', 'Landé g-factor'),
        P('spin', 'spin', 'S', '', 'spin in S(S+1)/3'),
        P('muB_J_per_T', 'Bohr magneton', 'μ_B', 'J/T', 'supplied; not derived'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature'),
        temperature('theta_K', 'Weiss temperature', 'θ', 'mean-field shift; zero is the Curie law'),
      ],
      (i) =>
        evaluateCurieWeiss({
          n_per_m3: i.n_per_m3,
          g: i.g,
          spin: i.spin,
          muB_J_per_T: i.muB_J_per_T,
          T_K: i.T_K,
          theta_K: i.theta_K,
        }),
    ),
    spec(
      94,
      'Pauli paramagnetism',
      [
        P('n_per_m3', 'electron density', 'n', 'm^-3', '√E density'),
        P('E_F_J', 'Fermi energy', 'E_F', 'J', 'Fermi energy'),
        P('muB_J_per_T', 'Bohr magneton', 'μ_B', 'J/T', 'supplied; not Landau diamagnetism'),
      ],
      (i) =>
        evaluatePauliParamagnetism({ n_per_m3: i.n_per_m3, E_F_J: i.E_F_J, muB_J_per_T: i.muB_J_per_T }),
    ),
    spec(
      95,
      'GL trial wall',
      [P('kappa', 'GL parameter', 'κ', '', 'trial wall, not every minimizer')],
      (i) => evaluateGinzburgLandau({ kappa: i.kappa }),
    ),
    spec(
      96,
      'Upper critical field',
      [P('xi_m', 'coherence length', 'ξ', 'm', 'charge 2e; the Landau level is a hypothesis')],
      (i) => evaluateUpperCritical({ xi_m: i.xi_m }),
    ),
    spec(
      97,
      'Ambegaokar–Baratoff',
      [P('Delta_J', 'gap', 'Δ', 'J', 'T = 0 and identical gaps')],
      (i) => evaluateAmbegaokarBaratoff({ Delta_J: i.Delta_J }),
    ),
    spec(
      98,
      'BCS heat jump',
      [P('zeta', 'quartic coefficient', 'ζ', '', 'GL quartic coefficient, not a series')],
      (i) => evaluateBcsJump({ zeta: i.zeta }),
    ),
    spec(
      99,
      'Mass action',
      [
        P('N_c_per_m3', 'conduction density of states', 'N_c', 'm^-3', 'Boltzmann tail'),
        P('N_v_per_m3', 'valence density of states', 'N_v', 'm^-3', 'Boltzmann tail'),
        P('E_g_J', 'gap', 'E_g', 'J', 'E_c − E_v'),
        temperature('T_K', 'temperature', 'T', 'absolute temperature'),
      ],
      (i) =>
        evaluateMassAction({
          N_c_per_m3: i.N_c_per_m3,
          N_v_per_m3: i.N_v_per_m3,
          E_g_J: i.E_g_J,
          T_K: i.T_K,
        }),
    ),
    spec(
      100,
      'Lyddane–Sachs–Teller',
      [
        P('eps_static', 'static dielectric constant', 'ε(0)', '', 'undamped'),
        P('eps_inf', 'high-frequency dielectric constant', 'ε(∞)', '', 'nonzero'),
      ],
      (i) => evaluateLyddaneSachsTeller({ eps_static: i.eps_static, eps_inf: i.eps_inf }),
    ),
    spec(
      101,
      'BKT unbinding',
      [P('J_J', 'vortex stiffness', 'J', 'J', 'energy-entropy argument, not the RG flow')],
      (i) => evaluateBktJump({ J_J: i.J_J }),
    ),
    spec(
      102,
      'Landauer conductance',
      [P('sum_Tn', 'transmission sum', 'Σ T_n', '', 'two spins; not the Hall conductance')],
      (i) => evaluateLandauerConductance({ sum_Tn: i.sum_Tn }),
    ),
    spec(103, 'Bohm sheath (cold)', [temperature('T_e_K', 'electron temperature', 'T_e', 'cold-ion threshold uses T_e'), P('m_i_kg', 'ion mass', 'm_i', 'kg', 'ion mass')], (i) =>
      evaluateBohmSheath({ T_e_K: i.T_e_K, m_i_kg: i.m_i_kg }),
    ),
    spec(104, 'Ion acoustic dispersion', [P('k_per_m', 'wavenumber', 'k', 'm^-1', 'k ≠ 0'), P('c_s_m_per_s', 'sound speed', 'c_s', 'm/s', 'c_s² = k_B T_e / m_i'), P('lambda_De_m', 'Debye length', 'λ_De', 'm', 'one-species electron Debye length')], (i) =>
      evaluateIonAcoustic({ k_per_m: i.k_per_m, c_s_m_s: i.c_s_m_per_s, lambda_De_m: i.lambda_De_m }),
    ),
    spec(105, 'Upper hybrid', [P('n_per_m3', 'density', 'n', 'm^-3', 'electron density'), P('B_T', 'magnetic field', 'B', 'T', 'field along z'), P('m_kg', 'mass', 'm', 'kg', 'electron mass')], (i) =>
      evaluateUpperHybrid({ n_per_m3: i.n_per_m3, B_T: i.B_T, m_kg: i.m_kg }),
    ),
    spec(106, 'Cold-plasma R cutoff', [P('omega_c_rad_s', 'cyclotron frequency', 'ω_c', 'rad/s', 'ω_c ≥ 0; the Stix index is a hypothesis'), P('omega_p_rad_s', 'plasma frequency', 'ω_p', 'rad/s', 'plasma frequency')], (i) =>
      evaluateColdPlasmaCutoff({ omega_c_rad_s: i.omega_c_rad_s, omega_p_rad_s: i.omega_p_rad_s }),
    ),
    spec(107, 'Lower hybrid', [P('omega_pi_rad_s', 'ion plasma frequency', 'ω_pi', 'rad/s', 'ion plasma frequency'), P('omega_ci_rad_s', 'ion cyclotron frequency', 'ω_ci', 'rad/s', 'ion cyclotron frequency'), P('omega_ce_rad_s', 'electron cyclotron frequency', 'ω_ce', 'rad/s', 'electron cyclotron frequency')], (i) =>
      evaluateLowerHybrid({ omega_pi_rad_s: i.omega_pi_rad_s, omega_ci_rad_s: i.omega_ci_rad_s, omega_ce_rad_s: i.omega_ce_rad_s }),
    ),
    spec(108, 'Oblique magnetosonic', [P('c_s_m_per_s', 'sound speed', 'c_s', 'm/s', 'sound speed'), P('v_A_m_per_s', 'Alfvén speed', 'v_A', 'm/s', 'Alfvén speed'), P('theta_rad', 'propagation angle', 'θ', '', 'angle from the field, radians')], (i) =>
      evaluateObliqueMagnetosonic({ c_s_m_s: i.c_s_m_per_s, v_A_m_s: i.v_A_m_per_s, theta_rad: i.theta_rad }),
    ),
    spec(109, 'Bennett pinch (equal temperature)', [P('N_per_m', 'line density', 'N', 'm^-1', 'N_e = N_i = N'), temperature('T_K', 'temperature', 'T', 'T_e = T_i = T')], (i) =>
      evaluateBennettPinch({ N_per_m: i.N_per_m, T_K: i.T_K }),
    ),
    spec(110, 'Loss cone', [P('B0_T', 'throat field', 'B0', 'T', 'field at the throat'), P('Bm_T', 'mirror field', 'Bm', 'T', 'field at the mirror')], (i) =>
      evaluateLossCone({ B0_T: i.B0_T, Bm_T: i.Bm_T }),
    ),
    spec(111, 'Grad-B drift', [P('m_kg', 'mass', 'm', 'kg', 'particle mass'), P('v_perp_m_per_s', 'perpendicular speed', 'v_⊥', 'm/s', 'speed perpendicular to B'), P('gradB_T_per_m', 'field gradient', '|∇B|', 'T/m', 'magnitude of the gradient'), P('q_C', 'charge', 'q', 'C', 'signed charge'), P('B_T', 'magnetic field', 'B', 'T', 'field strength, ≠ 0')], (i) =>
      evaluateGradBDrift({ m_kg: i.m_kg, v_perp_m_s: i.v_perp_m_per_s, gradB_T_per_m: i.gradB_T_per_m, q_C: i.q_C, B_T: i.B_T }),
    ),
    spec(112, 'E×B drift', [P('E_x_V_per_m', 'electric field x', 'E_x', 'V/m', 'electric field along x'), P('E_y_V_per_m', 'electric field y', 'E_y', 'V/m', 'electric field along y'), P('B_T', 'magnetic field', 'B', 'T', 'field along z, ≠ 0')], (i) =>
      evaluateExBDrift({ E_x_V_per_m: i.E_x_V_per_m, E_y_V_per_m: i.E_y_V_per_m, B_T: i.B_T }),
    ),
    spec(113, 'Landau damping', [P('omega_rad_s', 'wave frequency', 'ω', 'rad/s', 'real frequency; the residue formula is a hypothesis'), P('k_per_m', 'wavenumber', 'k', 'm^-1', 'wavenumber'), P('v_t_m_per_s', 'thermal speed', 'v_t', 'm/s', 'thermal speed in the Maxwellian')], (i) =>
      evaluateLandauDamping({ omega_rad_s: i.omega_rad_s, k_per_m: i.k_per_m, v_t_m_s: i.v_t_m_per_s }),
    ),
    spec(114, 'Debye sphere', [P('n_per_m3', 'density', 'n', 'm^-3', 'number density'), P('lambda_D_m', 'Debye length', 'λ_D', 'm', 'one-species Debye length, an input')], (i) =>
      evaluateDebyeSphere({ n_per_m3: i.n_per_m3, lambda_D_m: i.lambda_D_m }),
    ),
    spec(115, 'Two-species Debye length', [P('lambda_1_m', 'first Debye length', 'λ_1', 'm', 'species 1'), P('lambda_2_m', 'second Debye length', 'λ_2', 'm', 'species 2')], (i) =>
      evaluateMultiDebye({ lambda_1_m: i.lambda_1_m, lambda_2_m: i.lambda_2_m }),
    ),
    spec(116, 'Lorentz resistivity (kinetic)', [P('Z', 'ion charge state', 'Z', '', 'ion charge state'), P('ln_Lambda', 'Coulomb logarithm', 'ln Λ', '', 'Coulomb logarithm, a hypothesis inside the transport cross section'), temperature('T_K', 'temperature', 'T', 'temperature in the thermal speed'), P('m_kg', 'mass', 'm', 'kg', 'mass in ν(v_T); the electron mass in the Lorentz collision')], (i) =>
      evaluateLorentzResistivity({ Z: i.Z, ln_Lambda: i.ln_Lambda, T_K: i.T_K, m_kg: i.m_kg }),
    ),
    spec(117, 'Resistive slab', [P('sigma_S_per_m', 'conductivity', 'σ', 'S/m', 'conductivity'), P('L_m', 'slab width', 'L', 'm', 'slab width')], (i) =>
      evaluateResistiveSlab({ sigma_S_per_m: i.sigma_S_per_m, L_m: i.L_m }),
    ),
    spec(118, 'Parker critical radius', [P('c_s_m_per_s', 'sound speed', 'c_s', 'm/s', 'isothermal sound speed'), P('M_kg', 'stellar mass', 'M', 'kg', 'central mass')], (i) =>
      evaluateParkerCritical({ c_s_m_s: i.c_s_m_per_s, M_kg: i.M_kg }),
    ),
    spec(119, 'Parker spiral', [P('Omega_rad_s', 'rotation rate', 'Ω', 'rad/s', 'stellar rotation'), P('r_m', 'radius', 'r', 'm', 'heliocentric radius'), P('theta_rad', 'colatitude', 'θ', '', 'colatitude, radians'), P('v_r_m_per_s', 'radial speed', 'v_r', 'm/s', 'radial wind speed, ≠ 0')], (i) =>
      evaluateParkerSpiral({ Omega_rad_s: i.Omega_rad_s, r_m: i.r_m, theta_rad: i.theta_rad, v_r_m_s: i.v_r_m_per_s }),
    ),
    spec(120, 'Chapman–Ferraro standoff', [P('B_E_T', 'surface field', 'B_E', 'T', 'equatorial surface field'), P('rho_kg_per_m3', 'mass density', 'ρ', 'kg/m^3', 'wind mass density'), P('v_m_per_s', 'wind speed', 'v', 'm/s', 'wind speed')], (i) =>
      evaluateChapmanFerraro({ B_E_T: i.B_E_T, rho_kg_per_m3: i.rho_kg_per_m3, v_m_s: i.v_m_per_s }),
    ),
    spec(121, 'Lawson breakeven', [temperature('T_K', 'temperature', 'T', 'ion temperature'), P('sigma_v_m3_per_s', 'reactivity', '⟨σv⟩', 'm^3/s', 'Maxwellian average, not computed here'), P('E_J', 'fusion energy', 'E', 'J', 'energy released per reaction')], (i) =>
      evaluateLawsonBreakeven({ T_K: i.T_K, sigma_v_m3_s: i.sigma_v_m3_per_s, E_J: i.E_J }),
    ),
    spec(122, 'Floating potential', [P('m_e_kg', 'electron mass', 'm_e', 'kg', 'electron mass'), P('m_i_kg', 'ion mass', 'm_i', 'kg', 'ion mass')], (i) =>
      evaluateLangmuirProbe({ m_e_kg: i.m_e_kg, m_i_kg: i.m_i_kg }),
    ),
    spec(123, 'Cross-field diffusion ratio', [P('alpha', 'Hall parameter', 'α', '', 'α = μ B')], (i) =>
      evaluateCrossFieldDiffusion({ alpha: i.alpha }),
    ),
    spec(124, 'Firehose margin', [P('beta_parallel', 'parallel beta', 'β_∥', '', 'β = 2 μ0 p / B²'), P('beta_perp', 'perpendicular beta', 'β_⊥', '', 'the be-76 definition')], (i) =>
      evaluateFirehose({ beta_parallel: i.beta_parallel, beta_perp: i.beta_perp }),
    ),
    spec(125, 'Mirror margin', [P('beta_perp', 'perpendicular beta', 'β_⊥', '', 'β = 2 μ0 p / B²; the kinetic integral is a hypothesis'), temperature('T_perp_K', 'perpendicular temperature', 'T_⊥', 'perpendicular temperature'), temperature('T_parallel_K', 'parallel temperature', 'T_∥', 'parallel temperature')], (i) =>
      evaluateMirrorInstability({ beta_perp: i.beta_perp, T_perp_K: i.T_perp_K, T_parallel_K: i.T_parallel_K }),
    ),
];

for (const evaluator of EVALUATOR_SPECS) registerBridge({ evaluator });

/** Bridge id → evaluator. The projection of `registerBridge`. @internal */
export const BRIDGE_EVALUATORS: ReadonlyMap<number, EvaluatorSpec> =
  bridgeRegistry.evaluators() as ReadonlyMap<number, EvaluatorSpec>;

/**
 * What to say when an id is not in {@link BRIDGE_EVALUATORS}.
 * @internal
 */
export function missingEvaluatorMessage(bridgeId: number): string {
  return `evaluateBridge: be-${bridgeId} has no evaluator (only closed-form + spacetime bridges do — see \`upt evaluate\` with no args)`;
}

/**
 * Evaluate a bridge by id with a numeric input record. Throws on an unknown id
 * or a missing required input (the evaluator itself validates ranges).
 *
 * @internal
 */
export function evaluateBridge(
  bridgeId: number,
  inputs: Readonly<Record<string, number>>,
): unknown {
  const s = BRIDGE_EVALUATORS.get(bridgeId);
  if (!s) {
    throw new Error(missingEvaluatorMessage(bridgeId));
  }
  const missing = s.inputKeys.filter((k) => !(k in inputs) || !Number.isFinite(inputs[k]));
  if (missing.length) {
    throw new Error(
      `evaluateBridge: be-${bridgeId} (${s.name}) needs {${s.inputKeys.join(', ')}}; missing/non-finite: ${missing.join(', ')}`,
    );
  }
  return s.run(inputs);
}
