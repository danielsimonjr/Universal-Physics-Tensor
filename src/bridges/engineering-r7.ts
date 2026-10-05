/**
 * BE-126 through BE-133 — engineering closed forms.
 *
 * Each function is the numeric body for that catalog id. `e` is the
 * elementary charge. Euler's number is not used. A dropped factor is a
 * separate function and is not the catalog value.
 *
 * @module bridges/engineering-r7
 */
import { E_SI, K_B_SI } from '../core/constants.js';

function finite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

/** Comb-drive inputs. Both sidewalls, gap fixed. @public */
export interface CombDriveInputs {
  readonly n: number;
  readonly eps_F_per_m: number;
  readonly h_m: number;
  readonly V_volts: number;
  readonly g_m: number;
}
/** Comb-drive force. @public */
export interface CombDriveResult {
  readonly F_N: number;
}

/**
 * Lateral force `F = n ε h V² / g`. The sidewall 2 and the coenergy 1/2 cancel.
 * @public
 */
export function evaluateCombDrive({ n, eps_F_per_m, h_m, V_volts, g_m }: CombDriveInputs): CombDriveResult {
  finite('n', n);
  finite('eps_F_per_m', eps_F_per_m);
  finite('h_m', h_m);
  finite('V_volts', V_volts);
  finite('g_m', g_m);
  if (g_m === 0) throw new Error('evaluateCombDrive: g_m must be nonzero');
  return { F_N: (n * eps_F_per_m * h_m * V_volts * V_volts) / g_m };
}

/**
 * One sidewall keeps the coenergy 1/2. Not the catalog force.
 * @internal
 */
export function combDriveOneSidewall(input: CombDriveInputs): number {
  return evaluateCombDrive(input).F_N / 2;
}

/** Subthreshold-swing inputs. `e` is not an input. @public */
export interface SubthresholdSwingInputs {
  readonly T_K: number;
  readonly Cd_F: number;
  readonly Cox_F: number;
}
/** Subthreshold swing, volts per decade. @public */
export interface SubthresholdSwingResult {
  readonly S_V_per_decade: number;
}

/**
 * `S = ln(10) (k_B T / e) (1 + C_d / C_ox)`.
 * @public
 */
export function evaluateSubthresholdSwing({
  T_K,
  Cd_F,
  Cox_F,
}: SubthresholdSwingInputs): SubthresholdSwingResult {
  finite('T_K', T_K);
  finite('Cd_F', Cd_F);
  finite('Cox_F', Cox_F);
  if (T_K === 0) throw new Error('evaluateSubthresholdSwing: T_K must be nonzero');
  if (Cox_F === 0) throw new Error('evaluateSubthresholdSwing: Cox_F must be nonzero');
  if (Cox_F + Cd_F === 0) throw new Error('evaluateSubthresholdSwing: Cox_F + Cd_F must be nonzero');
  const ideal = Math.log(10) * ((K_B_SI * T_K) / E_SI);
  return { S_V_per_decade: ideal * (1 + Cd_F / Cox_F) };
}

/**
 * The ideal swing drops `C_d`. Not the catalog swing when `C_d ≠ 0`.
 * @internal
 */
export function subthresholdIdealSwing(T_K: number): number {
  finite('T_K', T_K);
  if (T_K === 0) throw new Error('subthresholdIdealSwing: T_K must be nonzero');
  return Math.log(10) * ((K_B_SI * T_K) / E_SI);
}

/** Boost-converter inputs. @public */
export interface BoostConverterInputs {
  readonly D: number;
}
/** Boost voltage ratio. @public */
export interface BoostConverterResult {
  readonly ratio: number;
}

/**
 * `V_out / V_in = 1 / (1 − D)` for `D ≠ 1`.
 * @public
 */
export function evaluateBoostConverter({ D }: BoostConverterInputs): BoostConverterResult {
  finite('D', D);
  if (D === 1) throw new Error('evaluateBoostConverter: D must not be 1');
  return { ratio: 1 / (1 - D) };
}

/** Fin inputs. Rectangular cross-section, adiabatic tip. @public */
export interface FinEfficiencyInputs {
  readonly h_W_per_m2_K: number;
  readonly k_W_per_m_K: number;
  readonly t_m: number;
  readonly L_fin_m: number;
}
/** Fin parameter and adiabatic-tip efficiency. @public */
export interface FinEfficiencyResult {
  readonly m_per_m: number;
  readonly eta: number;
}

/**
 * `m = √(2 h / (k t))` and `η = tanh(m L) / (m L)`.
 * @public
 */
export function evaluateFinEfficiency({
  h_W_per_m2_K,
  k_W_per_m_K,
  t_m,
  L_fin_m,
}: FinEfficiencyInputs): FinEfficiencyResult {
  finite('h_W_per_m2_K', h_W_per_m2_K);
  finite('k_W_per_m_K', k_W_per_m_K);
  finite('t_m', t_m);
  finite('L_fin_m', L_fin_m);
  if (k_W_per_m_K <= 0) throw new Error('evaluateFinEfficiency: k_W_per_m_K must be positive');
  if (t_m <= 0) throw new Error('evaluateFinEfficiency: t_m must be positive');
  if (h_W_per_m2_K < 0) throw new Error('evaluateFinEfficiency: h_W_per_m2_K must be ≥ 0');
  if (L_fin_m === 0) throw new Error('evaluateFinEfficiency: L_fin_m must be nonzero');
  const m = Math.sqrt((2 * h_W_per_m2_K) / (k_W_per_m_K * t_m));
  if (m === 0) throw new Error('evaluateFinEfficiency: m must be nonzero');
  const mL = m * L_fin_m;
  return { m_per_m: m, eta: Math.tanh(mL) / mL };
}

/** One face, `P/A = 1/t`. Not the catalog `m`. @internal */
export function finOneFaceParameter(h: number, k: number, t: number): number {
  return Math.sqrt(h / (k * t));
}

/** Infinite-fin `1/(m L)`. Not the adiabatic efficiency. @internal */
export function finInfiniteEfficiency(input: FinEfficiencyInputs): number {
  const { m_per_m, eta } = evaluateFinEfficiency(input);
  const mL = m_per_m * input.L_fin_m;
  if (eta === 1 / mL) throw new Error('finInfiniteEfficiency: tanh was 1');
  return 1 / mL;
}

/** Thermoelectric-generator inputs. `Z` is `S²/(R K)`, per kelvin. @public */
export interface ThermoelectricGeneratorInputs {
  readonly Th_K: number;
  readonly Tc_K: number;
  readonly Z_per_K: number;
}
/** Optimum generator efficiency. @public */
export interface ThermoelectricGeneratorResult {
  readonly eta: number;
}

/**
 * `η = (1 − T_c/T_h) (√(1 + Z T_m) − 1) / (√(1 + Z T_m) + T_c/T_h)`,
 * with `T_m = (T_h + T_c) / 2`.
 * @public
 */
export function evaluateThermoelectricGenerator({
  Th_K,
  Tc_K,
  Z_per_K,
}: ThermoelectricGeneratorInputs): ThermoelectricGeneratorResult {
  finite('Th_K', Th_K);
  finite('Tc_K', Tc_K);
  finite('Z_per_K', Z_per_K);
  if (Th_K === 0) throw new Error('evaluateThermoelectricGenerator: Th_K must be nonzero');
  const mean = (Th_K + Tc_K) / 2;
  const inside = 1 + Z_per_K * mean;
  if (inside < 0) throw new Error('evaluateThermoelectricGenerator: 1 + Z T_m must be ≥ 0');
  const m = Math.sqrt(inside);
  const denom = m + Tc_K / Th_K;
  if (denom === 0) throw new Error('evaluateThermoelectricGenerator: m + T_c/T_h must be nonzero');
  return { eta: (1 - Tc_K / Th_K) * (m - 1) / denom };
}

/** Carnot factor alone. Not the generator efficiency. @internal */
export function carnotFactor(Th_K: number, Tc_K: number): number {
  if (Th_K === 0) throw new Error('carnotFactor: Th_K must be nonzero');
  return 1 - Tc_K / Th_K;
}

/** Joukowsky inputs. `e_wall` is the wall thickness. @public */
export interface JoukowskyInputs {
  readonly rho_kg_per_m3: number;
  readonly dv_m_per_s: number;
  readonly K_Pa: number;
  readonly E_Pa: number;
  readonly pipe_D_m: number;
  readonly wall_m: number;
}
/** Joukowsky pressure and the thin-wall speed. @public */
export interface JoukowskyResult {
  readonly c_m_per_s: number;
  readonly delta_p_Pa: number;
}

/**
 * `c = √(K/ρ) / √(1 + (K/E)(D/e_wall))` and `Δp = ρ c Δv`.
 * @public
 */
export function evaluateJoukowsky({
  rho_kg_per_m3,
  dv_m_per_s,
  K_Pa,
  E_Pa,
  pipe_D_m,
  wall_m,
}: JoukowskyInputs): JoukowskyResult {
  finite('rho_kg_per_m3', rho_kg_per_m3);
  finite('dv_m_per_s', dv_m_per_s);
  finite('K_Pa', K_Pa);
  finite('E_Pa', E_Pa);
  finite('pipe_D_m', pipe_D_m);
  finite('wall_m', wall_m);
  if (rho_kg_per_m3 <= 0) throw new Error('evaluateJoukowsky: rho_kg_per_m3 must be positive');
  if (K_Pa <= 0) throw new Error('evaluateJoukowsky: K_Pa must be positive');
  if (E_Pa <= 0) throw new Error('evaluateJoukowsky: E_Pa must be positive');
  if (wall_m <= 0) throw new Error('evaluateJoukowsky: wall_m must be positive');
  const wallTerm = (K_Pa / E_Pa) * (pipe_D_m / wall_m);
  if (!(1 + wallTerm > 0)) throw new Error('evaluateJoukowsky: 1 + (K/E)(D/e_wall) must be positive');
  const c = Math.sqrt(K_Pa / rho_kg_per_m3) / Math.sqrt(1 + wallTerm);
  return { c_m_per_s: c, delta_p_Pa: rho_kg_per_m3 * c * dv_m_per_s };
}

/** `ρ (Δv)²`. Not the Joukowsky pressure when `c ≠ Δv`. @internal */
export function joukowskyDynamicPressure(rho_kg_per_m3: number, dv_m_per_s: number): number {
  return rho_kg_per_m3 * dv_m_per_s * dv_m_per_s;
}

/** Rigid-wall `√(K/ρ)`. Not the thin-wall speed. @internal */
export function joukowskyRigidSpeed(K_Pa: number, rho_kg_per_m3: number): number {
  return Math.sqrt(K_Pa / rho_kg_per_m3);
}

/** Coaxial-capacitance inputs. @public */
export interface CoaxialCapacitanceInputs {
  readonly eps_F_per_m: number;
  readonly a_m: number;
  readonly b_m: number;
}
/** Capacitance per length. @public */
export interface CoaxialCapacitanceResult {
  readonly C_F_per_m: number;
}

/**
 * `C' = 2 π ε / ln(b/a)`.
 * @public
 */
export function evaluateCoaxialCapacitance({
  eps_F_per_m,
  a_m,
  b_m,
}: CoaxialCapacitanceInputs): CoaxialCapacitanceResult {
  finite('eps_F_per_m', eps_F_per_m);
  finite('a_m', a_m);
  finite('b_m', b_m);
  if (a_m <= 0) throw new Error('evaluateCoaxialCapacitance: a_m must be positive');
  if (b_m <= 0) throw new Error('evaluateCoaxialCapacitance: b_m must be positive');
  if (a_m === b_m) throw new Error('evaluateCoaxialCapacitance: a_m and b_m must differ');
  if (eps_F_per_m === 0) throw new Error('evaluateCoaxialCapacitance: eps_F_per_m must be nonzero');
  return { C_F_per_m: (2 * Math.PI * eps_F_per_m) / Math.log(b_m / a_m) };
}

/** `ε / ln(b/a)`. Drops `2 π`. @internal */
export function coaxialWithoutTwoPi(input: CoaxialCapacitanceInputs): number {
  return evaluateCoaxialCapacitance(input).C_F_per_m / (2 * Math.PI);
}

/** Damping-ratio inputs. @public */
export interface DampingRatioInputs {
  readonly c_kg_per_s: number;
  readonly k_N_per_m: number;
  readonly m_kg: number;
}
/** Damping ratio of `m ẍ + c ẋ + k x = 0`. @public */
export interface DampingRatioResult {
  readonly zeta: number;
}

/**
 * `ζ = c / (2 √(k m))`.
 * @public
 */
export function evaluateDampingRatio({ c_kg_per_s, k_N_per_m, m_kg }: DampingRatioInputs): DampingRatioResult {
  finite('c_kg_per_s', c_kg_per_s);
  finite('k_N_per_m', k_N_per_m);
  finite('m_kg', m_kg);
  if (m_kg <= 0) throw new Error('evaluateDampingRatio: m_kg must be positive');
  if (k_N_per_m <= 0) throw new Error('evaluateDampingRatio: k_N_per_m must be positive');
  return { zeta: c_kg_per_s / (2 * Math.sqrt(k_N_per_m * m_kg)) };
}

/** Drops the binomial 2. Not the catalog ratio when `c ≠ 0`. @internal */
export function dampingWithoutTwo(input: DampingRatioInputs): number {
  return evaluateDampingRatio(input).zeta * 2;
}
