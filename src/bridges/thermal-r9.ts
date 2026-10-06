/**
 * BE-147 through BE-170 — thermal and chemical closed forms.
 *
 * Each function is the numeric body for that catalog id. `e` is the
 * elementary charge. `E` in a symbol is energy. Euler's number is `exp`
 * only. A dropped factor is a separate function and is not the catalog
 * value. The Wien root is an input in (4, 5): the proof does not evaluate
 * the decimal.
 *
 * @module bridges/thermal-r9
 */
import { C_SI, E_SI, H_SI, HBAR_SI, K_B_SI, N_A_SI } from '../core/constants.js';

const R_SI = N_A_SI * K_B_SI;
const F_SI = N_A_SI * E_SI;

function finite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

/** Arrhenius inputs. R is N_A k_B and is not an input. @public */
export interface ArrheniusInputs {
  readonly A_per_s: number;
  readonly Ea_J_per_mol: number;
  readonly T_K: number;
}
/** Rate constant. The prefactor is temperature-independent. @public */
export interface ArrheniusResult {
  readonly k_per_s: number;
}

/**
 * `k = A exp(−Ea/(R T))` with `R = N_A k_B`.
 * @public
 */
export function evaluateArrhenius({ A_per_s, Ea_J_per_mol, T_K }: ArrheniusInputs): ArrheniusResult {
  finite('A_per_s', A_per_s);
  finite('Ea_J_per_mol', Ea_J_per_mol);
  finite('T_K', T_K);
  if (T_K === 0) throw new Error('evaluateArrhenius: T_K must be nonzero');
  return { k_per_s: A_per_s * Math.exp(-Ea_J_per_mol / (R_SI * T_K)) };
}

/**
 * The prefactor with the exponential omitted. Not the Arrhenius rate.
 * @internal
 */
export function arrheniusWithoutExp(A_per_s: number): number {
  finite('A_per_s', A_per_s);
  return A_per_s;
}

/** Eyring inputs. ΔG‡ is an energy, per molecule. @public */
export interface EyringInputs {
  readonly dG_J: number;
  readonly T_K: number;
}
/** Eyring rate. The transmission coefficient is 1. @public */
export interface EyringResult {
  readonly k_per_s: number;
}

/**
 * `k = (k_B T/h) exp(−ΔG‡/(k_B T))`.
 * @public
 */
export function evaluateEyring({ dG_J, T_K }: EyringInputs): EyringResult {
  finite('dG_J', dG_J);
  finite('T_K', T_K);
  if (T_K === 0) throw new Error('evaluateEyring: T_K must be nonzero');
  return { k_per_s: ((K_B_SI * T_K) / H_SI) * Math.exp(-dG_J / (K_B_SI * T_K)) };
}

/**
 * Arrhenius at `Ea = ΔH‡ + R T` and `A = (k_B T/h) exp(ΔS‡/R)`.
 * That pair differs from {@link evaluateEyring} by `exp(−1)`.
 * @internal
 */
export function eyringArrheniusMismatch(dH_J_per_mol: number, dS_J_per_mol_K: number, T_K: number): number {
  finite('dH_J_per_mol', dH_J_per_mol);
  finite('dS_J_per_mol_K', dS_J_per_mol_K);
  finite('T_K', T_K);
  if (T_K === 0) throw new Error('eyringArrheniusMismatch: T_K must be nonzero');
  const A = ((K_B_SI * T_K) / H_SI) * Math.exp(dS_J_per_mol_K / R_SI);
  const Ea = dH_J_per_mol + R_SI * T_K;
  return evaluateArrhenius({ A_per_s: A, Ea_J_per_mol: Ea, T_K }).k_per_s;
}

/** van 't Hoff inputs. ΔH° is constant. @public */
export interface VanTHoffInputs {
  readonly dH_J_per_mol: number;
  readonly T_K: number;
}
/** Slope of ln K, not a plot. @public */
export interface VanTHoffResult {
  readonly slope_per_K: number;
}

/**
 * `d ln K/dT = ΔH°/(R T²)`.
 * @public
 */
export function evaluateVanTHoff({ dH_J_per_mol, T_K }: VanTHoffInputs): VanTHoffResult {
  finite('dH_J_per_mol', dH_J_per_mol);
  finite('T_K', T_K);
  if (T_K === 0) throw new Error('evaluateVanTHoff: T_K must be nonzero');
  return { slope_per_K: dH_J_per_mol / (R_SI * T_K * T_K) };
}

/**
 * `ΔH/(R T)` drops the second temperature. Not the van 't Hoff slope.
 * @internal
 */
export function vantHoffWithoutT2(dH_J_per_mol: number, T_K: number): number {
  finite('dH_J_per_mol', dH_J_per_mol);
  finite('T_K', T_K);
  if (T_K === 0) throw new Error('vantHoffWithoutT2: T_K must be nonzero');
  return dH_J_per_mol / (R_SI * T_K);
}

/** Gibbs isotherm inputs. @public */
export interface GibbsIsothermInputs {
  readonly K: number;
  readonly T_K: number;
}
/** Standard Gibbs energy per amount. @public */
export interface GibbsIsothermResult {
  readonly dG_J_per_mol: number;
}

/**
 * `ΔG° = −R T ln K` for K > 0 and T ≠ 0.
 * @public
 */
export function evaluateGibbsIsotherm({ K, T_K }: GibbsIsothermInputs): GibbsIsothermResult {
  finite('K', K);
  finite('T_K', T_K);
  if (!(K > 0)) throw new Error('evaluateGibbsIsotherm: K must be positive');
  if (T_K === 0) throw new Error('evaluateGibbsIsotherm: T_K must be nonzero');
  return { dG_J_per_mol: -R_SI * T_K * Math.log(K) };
}

/**
 * `−R T` with the logarithm omitted. Not the Gibbs energy.
 * @internal
 */
export function gibbsWithoutLog(T_K: number): number {
  finite('T_K', T_K);
  return -R_SI * T_K;
}

/** Nernst inputs. `e` is not an input. F is N_A e. @public */
export interface NernstGibbsInputs {
  readonly E0_V: number;
  readonly n: number;
  readonly Q: number;
  readonly T_K: number;
}
/** Cell voltage, and ΔG = −n F E on the same result. @public */
export interface NernstGibbsResult {
  readonly E_V: number;
  readonly dG_J_per_mol: number;
}

/**
 * `E = E° − (R T/(n F)) ln Q`.
 * @public
 */
export function evaluateNernstGibbs({ E0_V, n, Q, T_K }: NernstGibbsInputs): NernstGibbsResult {
  finite('E0_V', E0_V);
  finite('n', n);
  finite('Q', Q);
  finite('T_K', T_K);
  if (n === 0) throw new Error('evaluateNernstGibbs: n must be nonzero');
  if (!(Q > 0)) throw new Error('evaluateNernstGibbs: Q must be positive');
  const E_V = E0_V - ((R_SI * T_K) / (n * F_SI)) * Math.log(Q);
  return { E_V, dG_J_per_mol: -n * F_SI * E_V };
}

/**
 * The same voltage with `k_B T/(n e)` in place of `R T/(n F)`.
 * The two writings are one formula. @internal
 */
export function nernstMolecular(input: NernstGibbsInputs): number {
  finite('n', input.n);
  if (input.n === 0) throw new Error('nernstMolecular: n must be nonzero');
  return input.E0_V - ((K_B_SI * input.T_K) / (input.n * E_SI)) * Math.log(input.Q);
}

/**
 * E° with the logarithm omitted. Not the Nernst voltage.
 * @internal
 */
export function nernstWithoutLog(E0_V: number): number {
  finite('E0_V', E0_V);
  return E0_V;
}

/** Integrated Clausius–Clapeyron inputs. @public */
export interface ClausiusClapeyronInputs {
  readonly dH_J_per_mol: number;
  readonly T1_K: number;
  readonly T2_K: number;
}
/** Logarithm of the pressure ratio. @public */
export interface ClausiusClapeyronResult {
  readonly ln_ratio: number;
}

/**
 * `ln(P2/P1) = −(ΔH/R)(1/T2 − 1/T1)`. Both temperatures are positive.
 * @public
 */
export function evaluateClausiusClapeyron({
  dH_J_per_mol,
  T1_K,
  T2_K,
}: ClausiusClapeyronInputs): ClausiusClapeyronResult {
  finite('dH_J_per_mol', dH_J_per_mol);
  finite('T1_K', T1_K);
  finite('T2_K', T2_K);
  if (!(T1_K > 0) || !(T2_K > 0)) throw new Error('evaluateClausiusClapeyron: both temperatures must be positive');
  return { ln_ratio: -(dH_J_per_mol / R_SI) * (1 / T2_K - 1 / T1_K) };
}

/**
 * The Clapeyron slope `ΔH/(T Δv)` is a pressure derivative. Not this logarithm.
 * @internal
 */
export function clapeyronSlopeNotIntegral(dH_J_per_mol: number, T_K: number, dv_m3_per_mol: number): number {
  finite('dH_J_per_mol', dH_J_per_mol);
  finite('T_K', T_K);
  finite('dv_m3_per_mol', dv_m3_per_mol);
  if (T_K === 0 || dv_m3_per_mol === 0) throw new Error('clapeyronSlopeNotIntegral: T and Δv must be nonzero');
  return dH_J_per_mol / (T_K * dv_m3_per_mol);
}

/** Raoult inputs. @public */
export interface RaoultInputs {
  readonly x: number;
  readonly Psat_Pa: number;
}
/** Partial pressure of an ideal mixture. @public */
export interface RaoultResult {
  readonly P_Pa: number;
}

/**
 * `P = x P*`. The liquid activity is the mole fraction.
 * @public
 */
export function evaluateRaoult({ x, Psat_Pa }: RaoultInputs): RaoultResult {
  finite('x', x);
  finite('Psat_Pa', Psat_Pa);
  if (!(Psat_Pa > 0)) throw new Error('evaluateRaoult: Psat_Pa must be positive');
  return { P_Pa: x * Psat_Pa };
}

/**
 * The pure-liquid pressure. Not the mixture pressure.
 * @internal
 */
export function raoultWithoutMole(Psat_Pa: number): number {
  finite('Psat_Pa', Psat_Pa);
  return Psat_Pa;
}

/** Prandtl inputs. @public */
export interface PrandtlInputs {
  readonly mu_Pa_s: number;
  readonly cp_J_per_kg_K: number;
  readonly k_W_per_m_K: number;
}
/** Prandtl number. Not a correlation. @public */
export interface PrandtlResult {
  readonly Pr: number;
}

/**
 * `Pr k = μ c_p`.
 * @public
 */
export function evaluatePrandtl({ mu_Pa_s, cp_J_per_kg_K, k_W_per_m_K }: PrandtlInputs): PrandtlResult {
  finite('mu_Pa_s', mu_Pa_s);
  finite('cp_J_per_kg_K', cp_J_per_kg_K);
  finite('k_W_per_m_K', k_W_per_m_K);
  if (k_W_per_m_K === 0) throw new Error('evaluatePrandtl: k_W_per_m_K must be nonzero');
  return { Pr: (mu_Pa_s * cp_J_per_kg_K) / k_W_per_m_K };
}

/**
 * `μ/k` drops the specific heat. Not the Prandtl number.
 * @internal
 */
export function prandtlWithoutCp(mu_Pa_s: number, k_W_per_m_K: number): number {
  finite('mu_Pa_s', mu_Pa_s);
  finite('k_W_per_m_K', k_W_per_m_K);
  if (k_W_per_m_K === 0) throw new Error('prandtlWithoutCp: k_W_per_m_K must be nonzero');
  return mu_Pa_s / k_W_per_m_K;
}

/** Reynolds-number inputs. @public */
export interface ReynoldsNumberInputs {
  readonly rho_kg_per_m3: number;
  readonly v_m_per_s: number;
  readonly L_m: number;
  readonly mu_Pa_s: number;
}
/** Reynolds number. Not a friction factor. @public */
export interface ReynoldsNumberResult {
  readonly Re: number;
}

/**
 * `Re μ = ρ v L`.
 * @public
 */
export function evaluateReynoldsNumber({
  rho_kg_per_m3,
  v_m_per_s,
  L_m,
  mu_Pa_s,
}: ReynoldsNumberInputs): ReynoldsNumberResult {
  finite('rho_kg_per_m3', rho_kg_per_m3);
  finite('v_m_per_s', v_m_per_s);
  finite('L_m', L_m);
  finite('mu_Pa_s', mu_Pa_s);
  if (mu_Pa_s === 0) throw new Error('evaluateReynoldsNumber: mu_Pa_s must be nonzero');
  return { Re: (rho_kg_per_m3 * v_m_per_s * L_m) / mu_Pa_s };
}

/**
 * `64/Re` is a laminar pipe factor. Not this Reynolds number.
 * @internal
 */
export function reynoldsPipeFactor(input: ReynoldsNumberInputs): number {
  const Re = evaluateReynoldsNumber(input).Re;
  if (Re === 0) throw new Error('reynoldsPipeFactor: Re must be nonzero');
  return 64 / Re;
}

/** Biot inputs. @public */
export interface BiotInputs {
  readonly h_W_per_m2_K: number;
  readonly Lc_m: number;
  readonly k_W_per_m_K: number;
}
/** Biot number. Not a lumped-capacitance criterion. @public */
export interface BiotResult {
  readonly Bi: number;
}

/**
 * `Bi k = h L_c`.
 * @public
 */
export function evaluateBiot({ h_W_per_m2_K, Lc_m, k_W_per_m_K }: BiotInputs): BiotResult {
  finite('h_W_per_m2_K', h_W_per_m2_K);
  finite('Lc_m', Lc_m);
  finite('k_W_per_m_K', k_W_per_m_K);
  if (k_W_per_m_K === 0) throw new Error('evaluateBiot: k_W_per_m_K must be nonzero');
  return { Bi: (h_W_per_m2_K * Lc_m) / k_W_per_m_K };
}

/**
 * `Bi = h V/(k A)` when `L_c = V/A`. The same number as {@link evaluateBiot}.
 * @internal
 */
export function biotFromVolume(h_W_per_m2_K: number, V_m3: number, k_W_per_m_K: number, A_m2: number): number {
  finite('h_W_per_m2_K', h_W_per_m2_K);
  finite('V_m3', V_m3);
  finite('k_W_per_m_K', k_W_per_m_K);
  finite('A_m2', A_m2);
  if (k_W_per_m_K === 0 || A_m2 === 0) throw new Error('biotFromVolume: k and A must be nonzero');
  return (h_W_per_m2_K * V_m3) / (k_W_per_m_K * A_m2);
}

/**
 * A lumped-capacitance threshold of 0.1. Not the Biot number.
 * @internal
 */
export function biotLumpedThreshold(): number {
  return 0.1;
}

/** Nusselt inputs. @public */
export interface NusseltInputs {
  readonly h_W_per_m2_K: number;
  readonly L_m: number;
  readonly k_W_per_m_K: number;
}
/** Nusselt number. Not a correlation. @public */
export interface NusseltResult {
  readonly Nu: number;
}

/**
 * `Nu k = h L`.
 * @public
 */
export function evaluateNusselt({ h_W_per_m2_K, L_m, k_W_per_m_K }: NusseltInputs): NusseltResult {
  finite('h_W_per_m2_K', h_W_per_m2_K);
  finite('L_m', L_m);
  finite('k_W_per_m_K', k_W_per_m_K);
  if (k_W_per_m_K === 0) throw new Error('evaluateNusselt: k_W_per_m_K must be nonzero');
  return { Nu: (h_W_per_m2_K * L_m) / k_W_per_m_K };
}

/**
 * `h/k` drops the length. Not the Nusselt number.
 * @internal
 */
export function nusseltWithoutLength(h_W_per_m2_K: number, k_W_per_m_K: number): number {
  finite('h_W_per_m2_K', h_W_per_m2_K);
  finite('k_W_per_m_K', k_W_per_m_K);
  if (k_W_per_m_K === 0) throw new Error('nusseltWithoutLength: k_W_per_m_K must be nonzero');
  return h_W_per_m2_K / k_W_per_m_K;
}

/** Schmidt inputs. @public */
export interface SchmidtInputs {
  readonly mu_Pa_s: number;
  readonly rho_kg_per_m3: number;
  readonly D_m2_per_s: number;
}
/** Schmidt number. Lewis number is a separate helper. @public */
export interface SchmidtResult {
  readonly Sc: number;
}

/**
 * `Sc ρ D = μ`.
 * @public
 */
export function evaluateSchmidt({ mu_Pa_s, rho_kg_per_m3, D_m2_per_s }: SchmidtInputs): SchmidtResult {
  finite('mu_Pa_s', mu_Pa_s);
  finite('rho_kg_per_m3', rho_kg_per_m3);
  finite('D_m2_per_s', D_m2_per_s);
  if (rho_kg_per_m3 === 0 || D_m2_per_s === 0) {
    throw new Error('evaluateSchmidt: density and diffusivity must be nonzero');
  }
  return { Sc: mu_Pa_s / (rho_kg_per_m3 * D_m2_per_s) };
}

/**
 * `Le = Sc/Pr` once `Pr = ν/α`. Not a second edge.
 * @internal
 */
export function schmidtLewis(Sc: number, Pr: number): number {
  finite('Sc', Sc);
  finite('Pr', Pr);
  if (Pr === 0) throw new Error('schmidtLewis: Pr must be nonzero');
  return Sc / Pr;
}

/** Sherwood inputs. @public */
export interface SherwoodInputs {
  readonly km_m_per_s: number;
  readonly L_m: number;
  readonly D_m2_per_s: number;
}
/** Sherwood number. Not a correlation. @public */
export interface SherwoodResult {
  readonly Sh: number;
}

/**
 * `Sh D = k_m L`.
 * @public
 */
export function evaluateSherwood({ km_m_per_s, L_m, D_m2_per_s }: SherwoodInputs): SherwoodResult {
  finite('km_m_per_s', km_m_per_s);
  finite('L_m', L_m);
  finite('D_m2_per_s', D_m2_per_s);
  if (D_m2_per_s === 0) throw new Error('evaluateSherwood: D_m2_per_s must be nonzero');
  return { Sh: (km_m_per_s * L_m) / D_m2_per_s };
}

/**
 * `k_m/D` drops the length. Not the Sherwood number.
 * @internal
 */
export function sherwoodWithoutLength(km_m_per_s: number, D_m2_per_s: number): number {
  finite('km_m_per_s', km_m_per_s);
  finite('D_m2_per_s', D_m2_per_s);
  if (D_m2_per_s === 0) throw new Error('sherwoodWithoutLength: D_m2_per_s must be nonzero');
  return km_m_per_s / D_m2_per_s;
}

/** Fourier slab inputs. The endpoints are absolute temperatures. @public */
export interface FourierConductionInputs {
  readonly k_W_per_m_K: number;
  readonly T_L_K: number;
  readonly T_0_K: number;
  readonly L_m: number;
}
/** Integrated heat flux. Conductivity is constant. @public */
export interface FourierConductionResult {
  readonly q_W_per_m2: number;
}

/**
 * `q L = −k (T(L) − T(0))`.
 * @public
 */
export function evaluateFourierConduction({
  k_W_per_m_K,
  T_L_K,
  T_0_K,
  L_m,
}: FourierConductionInputs): FourierConductionResult {
  finite('k_W_per_m_K', k_W_per_m_K);
  finite('T_L_K', T_L_K);
  finite('T_0_K', T_0_K);
  finite('L_m', L_m);
  if (k_W_per_m_K === 0) throw new Error('evaluateFourierConduction: k_W_per_m_K must be nonzero');
  if (L_m === 0) throw new Error('evaluateFourierConduction: L_m must be nonzero');
  return { q_W_per_m2: (-k_W_per_m_K * (T_L_K - T_0_K)) / L_m };
}

/**
 * The same magnitude with the sign dropped. Not the integrated flux.
 * @internal
 */
export function fourierWithoutMinus(input: FourierConductionInputs): number {
  return -evaluateFourierConduction(input).q_W_per_m2;
}

/** Newton cooling inputs. θ(0) is an excess temperature. @public */
export interface NewtonCoolingInputs {
  readonly rho_kg_per_m3: number;
  readonly c_J_per_kg_K: number;
  readonly V_m3: number;
  readonly h_W_per_m2_K: number;
  readonly A_m2: number;
  readonly t_s: number;
  readonly theta_difference_K: number;
}
/** Excess temperature, and the time constant on the same result. @public */
export interface NewtonCoolingResult {
  readonly theta_K: number;
  readonly tau_s: number;
}

/**
 * `θ(t) = θ(0) exp(−t/τ)` with `τ = ρ c V/(h A)`.
 * @public
 */
export function evaluateNewtonCooling({
  rho_kg_per_m3,
  c_J_per_kg_K,
  V_m3,
  h_W_per_m2_K,
  A_m2,
  t_s,
  theta_difference_K,
}: NewtonCoolingInputs): NewtonCoolingResult {
  finite('rho_kg_per_m3', rho_kg_per_m3);
  finite('c_J_per_kg_K', c_J_per_kg_K);
  finite('V_m3', V_m3);
  finite('h_W_per_m2_K', h_W_per_m2_K);
  finite('A_m2', A_m2);
  finite('t_s', t_s);
  finite('theta_difference_K', theta_difference_K);
  const capacity = rho_kg_per_m3 * c_J_per_kg_K * V_m3;
  const loss = h_W_per_m2_K * A_m2;
  if (capacity === 0) throw new Error('evaluateNewtonCooling: ρ c V must be nonzero');
  if (loss === 0) throw new Error('evaluateNewtonCooling: h A must be nonzero');
  const tau_s = capacity / loss;
  return { theta_K: theta_difference_K * Math.exp(-t_s / tau_s), tau_s };
}

/**
 * The flux `h A θ` is a power. Not the excess temperature.
 * @internal
 */
export function newtonFlux(h_W_per_m2_K: number, A_m2: number, theta_difference_K: number): number {
  finite('h_W_per_m2_K', h_W_per_m2_K);
  finite('A_m2', A_m2);
  finite('theta_difference_K', theta_difference_K);
  return h_W_per_m2_K * A_m2 * theta_difference_K;
}

/** Otto-cycle inputs. γ is constant and greater than 1. @public */
export interface OttoInputs {
  readonly r: number;
  readonly gamma: number;
}
/** Cold-air-standard efficiency. @public */
export interface OttoResult {
  readonly eta: number;
}

/**
 * `η = 1 − r^(1−γ)`.
 * @public
 */
export function evaluateOtto({ r, gamma }: OttoInputs): OttoResult {
  finite('r', r);
  finite('gamma', gamma);
  if (!(r > 0)) throw new Error('evaluateOtto: r must be positive');
  if (!(gamma > 1)) throw new Error('evaluateOtto: gamma must be greater than 1');
  return { eta: 1 - r ** (1 - gamma) };
}

/**
 * `1 − r^(γ−1)` uses the other exponent. Not the Otto efficiency.
 * @internal
 */
export function ottoWrongExponent(r: number, gamma: number): number {
  finite('r', r);
  finite('gamma', gamma);
  if (!(r > 0)) throw new Error('ottoWrongExponent: r must be positive');
  return 1 - r ** (gamma - 1);
}

/** Joule–Thomson inputs. The enthalpy differential is a hypothesis. @public */
export interface JouleThomsonInputs {
  readonly T_K: number;
  readonly dv_dT_m3_per_kg_K: number;
  readonly v_m3_per_kg: number;
  readonly cp_J_per_kg_K: number;
}
/** Joule–Thomson coefficient. Not an inversion curve. @public */
export interface JouleThomsonResult {
  readonly mu_K_per_Pa: number;
}

/**
 * `μ_JT c_p = T (∂v/∂T)_p − v`.
 * @public
 */
export function evaluateJouleThomson({
  T_K,
  dv_dT_m3_per_kg_K,
  v_m3_per_kg,
  cp_J_per_kg_K,
}: JouleThomsonInputs): JouleThomsonResult {
  finite('T_K', T_K);
  finite('dv_dT_m3_per_kg_K', dv_dT_m3_per_kg_K);
  finite('v_m3_per_kg', v_m3_per_kg);
  finite('cp_J_per_kg_K', cp_J_per_kg_K);
  if (cp_J_per_kg_K === 0) throw new Error('evaluateJouleThomson: cp_J_per_kg_K must be nonzero');
  return { mu_K_per_Pa: (T_K * dv_dT_m3_per_kg_K - v_m3_per_kg) / cp_J_per_kg_K };
}

/**
 * `T (∂v/∂T)_p − v`. Zero when `v = R T/P` and `(∂v/∂T)_p = R/P`.
 * @internal
 */
export function jouleThomsonBracket(T_K: number, dv_dT_m3_per_kg_K: number, v_m3_per_kg: number): number {
  finite('T_K', T_K);
  finite('dv_dT_m3_per_kg_K', dv_dT_m3_per_kg_K);
  finite('v_m3_per_kg', v_m3_per_kg);
  return T_K * dv_dT_m3_per_kg_K - v_m3_per_kg;
}

/** Planck spectral inputs. The 8π mode density is a hypothesis. @public */
export interface PlanckSpectrumInputs {
  readonly nu_Hz: number;
  readonly T_K: number;
}
/** Spectral energy density per frequency. @public */
export interface PlanckSpectrumResult {
  readonly u_J_s_per_m3: number;
}

/**
 * `u (exp(hν/kT) − 1) c³ = 8 π h ν³`.
 * @public
 */
export function evaluatePlanckSpectrum({ nu_Hz, T_K }: PlanckSpectrumInputs): PlanckSpectrumResult {
  finite('nu_Hz', nu_Hz);
  finite('T_K', T_K);
  if (!(nu_Hz > 0)) throw new Error('evaluatePlanckSpectrum: nu_Hz must be positive');
  if (!(T_K > 0)) throw new Error('evaluatePlanckSpectrum: T_K must be positive');
  const x = (H_SI * nu_Hz) / (K_B_SI * T_K);
  const mode = (8 * Math.PI * H_SI * nu_Hz ** 3) / C_SI ** 3;
  return { u_J_s_per_m3: mode / (Math.exp(x) - 1) };
}

/**
 * One polarization replaces 8π by 4π. Not the catalog density.
 * @internal
 */
export function planckOnePolarization(input: PlanckSpectrumInputs): number {
  return evaluatePlanckSpectrum(input).u_J_s_per_m3 / 2;
}

/** Stefan–Boltzmann result. No variable input. @public */
export interface StefanBoltzmannResult {
  readonly sigma_W_per_m2_K4: number;
}

/**
 * `σ = π² k_B⁴ / (60 ℏ³ c²)`.
 * @public
 */
export function evaluateStefanBoltzmann(): StefanBoltzmannResult {
  const sigma = (Math.PI ** 2 * K_B_SI ** 4) / (60 * HBAR_SI ** 3 * C_SI ** 2);
  return { sigma_W_per_m2_K4: sigma };
}

/**
 * The same quotient written with `h = 2 π ℏ`.
 * @internal
 */
export function stefanFromH(): number {
  return (2 * Math.PI ** 5 * K_B_SI ** 4) / (15 * H_SI ** 3 * C_SI ** 2);
}

/**
 * The quotient with 60 omitted. Not the Stefan–Boltzmann constant.
 * @internal
 */
export function stefanWithout60(): number {
  return evaluateStefanBoltzmann().sigma_W_per_m2_K4 * 60;
}

/** Wien inputs. x is the root and is not computed. @public */
export interface WienDisplacementInputs {
  readonly x: number;
}
/** Displacement constant `b = h c / (k_B x)`. @public */
export interface WienDisplacementResult {
  readonly b_m_K: number;
}

/**
 * `b k_B x = h c` for an x in (4, 5).
 * @public
 */
export function evaluateWienDisplacement({ x }: WienDisplacementInputs): WienDisplacementResult {
  finite('x', x);
  if (!(x > 4) || !(x < 5)) throw new Error('evaluateWienDisplacement: x must lie in (4, 5)');
  return { b_m_K: (H_SI * C_SI) / (K_B_SI * x) };
}

/** Sackur–Tetrode inputs. n_Q is an input. Stirling is a hypothesis. @public */
export interface SackurTetrodeInputs {
  readonly N: number;
  readonly nQ_per_m3: number;
  readonly n_per_m3: number;
}
/** Entropy of the ideal gas. @public */
export interface SackurTetrodeResult {
  readonly S_J_per_K: number;
}

/**
 * `S = N k_B (ln(n_Q/n) + 5/2)`.
 * @public
 */
export function evaluateSackurTetrode({ N, nQ_per_m3, n_per_m3 }: SackurTetrodeInputs): SackurTetrodeResult {
  finite('N', N);
  finite('nQ_per_m3', nQ_per_m3);
  finite('n_per_m3', n_per_m3);
  if (!(nQ_per_m3 > 0)) throw new Error('evaluateSackurTetrode: nQ_per_m3 must be positive');
  if (!(n_per_m3 > 0)) throw new Error('evaluateSackurTetrode: n_per_m3 must be positive');
  return { S_J_per_K: N * K_B_SI * (Math.log(nQ_per_m3 / n_per_m3) + 2.5) };
}

/**
 * The logarithm without the 5/2. Not the Sackur–Tetrode entropy.
 * @internal
 */
export function sackurWithoutFiveHalves(input: SackurTetrodeInputs): number {
  finite('N', input.N);
  return input.N * K_B_SI * Math.log(input.nQ_per_m3 / input.n_per_m3);
}

/** Saha inputs. The spin weight 2 is not included. @public */
export interface SahaInputs {
  readonly m_kg: number;
  readonly T_K: number;
  readonly I_J: number;
}
/** Ionization constant, inverse volume. @public */
export interface SahaResult {
  readonly K_per_m3: number;
}

/**
 * `K = (2 π m k_B T/h²)^{3/2} exp(−I/(k_B T))`.
 * @public
 */
export function evaluateSaha({ m_kg, T_K, I_J }: SahaInputs): SahaResult {
  finite('m_kg', m_kg);
  finite('T_K', T_K);
  finite('I_J', I_J);
  if (!(m_kg > 0)) throw new Error('evaluateSaha: m_kg must be positive');
  if (!(T_K > 0)) throw new Error('evaluateSaha: T_K must be positive');
  const thermal = ((2 * Math.PI * m_kg * K_B_SI * T_K) / H_SI ** 2) ** 1.5;
  return { K_per_m3: thermal * Math.exp(-I_J / (K_B_SI * T_K)) };
}

/**
 * The electron weight 2. Not this ionization constant.
 * @internal
 */
export function sahaTimesTwo(input: SahaInputs): number {
  return evaluateSaha(input).K_per_m3 * 2;
}

/** Richardson–Dushman inputs. The prefactor is a hypothesis. @public */
export interface RichardsonDushmanInputs {
  readonly m_kg: number;
  readonly T_K: number;
  readonly phi_J: number;
}
/** Emission current density. The reflection coefficient is 1. @public */
export interface RichardsonDushmanResult {
  readonly J_A_per_m2: number;
}

/**
 * `J h³ exp(φ/(k_B T)) = 4 π m e k_B² T²`. `e` is the elementary charge.
 * @public
 */
export function evaluateRichardsonDushman({ m_kg, T_K, phi_J }: RichardsonDushmanInputs): RichardsonDushmanResult {
  finite('m_kg', m_kg);
  finite('T_K', T_K);
  finite('phi_J', phi_J);
  if (!(T_K > 0)) throw new Error('evaluateRichardsonDushman: T_K must be positive');
  const pref = (4 * Math.PI * m_kg * E_SI * K_B_SI ** 2) / H_SI ** 3;
  return { J_A_per_m2: pref * T_K ** 2 * Math.exp(-phi_J / (K_B_SI * T_K)) };
}

/**
 * A reflection coefficient other than 1. Not this current density.
 * @internal
 */
export function richardsonReflected(input: RichardsonDushmanInputs, reflection: number): number {
  finite('reflection', reflection);
  return evaluateRichardsonDushman(input).J_A_per_m2 * reflection;
}

/** Onsager inputs. The magnetic case is not this row. @public */
export interface OnsagerReciprocityInputs {
  readonly L12: number;
  readonly B_T: number;
}
/** The cross coefficient at zero magnetic field. @public */
export interface OnsagerReciprocityResult {
  readonly L21: number;
}

/**
 * `L12 = L21` from the mixed partials of the dissipation potential at B = 0.
 * @public
 */
export function evaluateOnsagerReciprocity({ L12, B_T }: OnsagerReciprocityInputs): OnsagerReciprocityResult {
  finite('L12', L12);
  finite('B_T', B_T);
  if (B_T !== 0) throw new Error('evaluateOnsagerReciprocity: B_T must be zero');
  return { L21: L12 };
}

/**
 * `L21 = −L12`. An antisymmetric cross term is not this equality.
 * @internal
 */
export function onsagerAntisymmetric(L12: number): number {
  finite('L12', L12);
  return -L12;
}
