/**
 * Bridge-evaluator registry — the single dispatch surface for `upt evaluate`.
 *
 * The closed-form + Schwarzschild-spacetime bridges (BE-51/52/55…76) carry plain-JS
 * evaluators but were, until now, unreachable from the CLI (`upt eval` is
 * user-formula-only; `upt explain <be-NN>` even redirected to a capability that did
 * not exist). This registry maps each bridge id to its evaluator, its input keys,
 * and a typed `run`, so `upt evaluate be-63 mu_e=2` returns M_Ch ≈ 1.44 M_⊙.
 *
 * @module bridges/evaluators
 */
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

/** Bridge id → evaluator. @public */
export const BRIDGE_EVALUATORS: ReadonlyMap<number, EvaluatorSpec> = new Map(
  [
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
        P('q_C', 'carrier charge', 'q', 'C', 'carrier charge, nonzero'),
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
  ].map((s) => [s.bridgeId, s]),
);

/**
 * What to say when an id is not in {@link BRIDGE_EVALUATORS}.
 * be-42 is the Hawking temperature and be-16 is the Landauer energy.
 * `upt evaluate` does not run either. The named `BridgeEquations` function
 * and the named `upt explain` command do.
 * @internal
 */
export function missingEvaluatorMessage(bridgeId: number): string {
  if (bridgeId === 42) {
    return (
      'evaluateBridge: be-42 has no id-keyed evaluator. ' +
      'Hawking temperature is BridgeEquations.hawkingTemperature({ M_kg }). ' +
      'From the CLI: upt explain hawking-temperature mass=1.989e30'
    );
  }
  if (bridgeId === 16) {
    return (
      'evaluateBridge: be-16 has no id-keyed evaluator. ' +
      'Landauer energy is BridgeEquations.landauerEnergy({ temperature_K }). ' +
      'From the CLI: upt explain landauer-erasure-energy temperature=300'
    );
  }
  return `evaluateBridge: be-${bridgeId} has no evaluator (only closed-form + spacetime bridges do — see \`upt evaluate\` with no args)`;
}

/**
 * Evaluate a bridge by id with a numeric input record. Throws on an unknown id
 * or a missing required input (the evaluator itself validates ranges).
 *
 * @public
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
