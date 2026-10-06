/**
 * BE-134 through BE-146 — condensed-matter closed forms.
 *
 * Each function is the numeric body for that catalog id. `e` is the
 * elementary charge. Euler's number is `exp` only, and these formulas
 * do not use it. A dropped factor is a separate function and is not the
 * catalog value. ζ(3/2) is an input: the proof does not evaluate it.
 *
 * @module bridges/condensed-r8
 */
import { E_SI, H_SI, HBAR_SI, K_B_SI } from '../core/constants.js';
import { EPS0_SI } from '../dimensional/formula-names.js';

function finite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

/** Bloch-law inputs. ζ(3/2) is not computed. @public */
export interface BlochLawInputs {
  readonly muB_J_per_T: number;
  readonly zeta_3_2: number;
  readonly T_K: number;
  readonly D_J_m2: number;
}
/** Magnon magnetization deficit, one Bohr magneton per magnon. @public */
export interface BlochLawResult {
  readonly dM_A_per_m: number;
}

/**
 * `ΔM = μ_B ζ(3/2) (k_B T / (4 π D))^{3/2}`.
 * @public
 */
export function evaluateBlochLaw({ muB_J_per_T, zeta_3_2, T_K, D_J_m2 }: BlochLawInputs): BlochLawResult {
  finite('muB_J_per_T', muB_J_per_T);
  finite('zeta_3_2', zeta_3_2);
  finite('T_K', T_K);
  finite('D_J_m2', D_J_m2);
  if (!(D_J_m2 > 0)) throw new Error('evaluateBlochLaw: D_J_m2 must be positive');
  if (T_K < 0) throw new Error('evaluateBlochLaw: T_K must be ≥ 0');
  const thermal = (K_B_SI * T_K) / (4 * Math.PI * D_J_m2);
  return { dM_A_per_m: muB_J_per_T * zeta_3_2 * thermal ** 1.5 };
}

/**
 * Landé g μ_B at g = 2. Not one Bohr magneton.
 * @internal
 */
export function blochLandeMoment(input: BlochLawInputs): number {
  return evaluateBlochLaw(input).dM_A_per_m * 2;
}

/** Three-dimensional density-of-states inputs. @public */
export interface DensityOfStates3DInputs {
  readonly m_kg: number;
  readonly E_J: number;
}
/** States per volume per energy, both spins. @public */
export interface DensityOfStates3DResult {
  readonly g_per_J_m3: number;
}

/**
 * `g(E) = (1/(2 π²)) (2 m / ℏ²)^{3/2} √E`.
 * @public
 */
export function evaluateDensityOfStates3D({ m_kg, E_J }: DensityOfStates3DInputs): DensityOfStates3DResult {
  finite('m_kg', m_kg);
  finite('E_J', E_J);
  if (!(m_kg > 0)) throw new Error('evaluateDensityOfStates3D: m_kg must be positive');
  if (E_J < 0) throw new Error('evaluateDensityOfStates3D: E_J must be ≥ 0');
  const prefactor = 1 / (2 * Math.PI ** 2);
  const parabola = ((2 * m_kg) / HBAR_SI ** 2) ** 1.5;
  return { g_per_J_m3: prefactor * parabola * Math.sqrt(E_J) };
}

/**
 * One spin replaces `1/(2 π²)` by `1/(4 π²)`. Not the catalog density.
 * @internal
 */
export function dos3dOneSpin(input: DensityOfStates3DInputs): number {
  return evaluateDensityOfStates3D(input).g_per_J_m3 / 2;
}

/** Two-dimensional density-of-states inputs. @public */
export interface DensityOfStates2DInputs {
  readonly m_kg: number;
}
/** States per area per energy, both spins, one valley. @public */
export interface DensityOfStates2DResult {
  readonly g_per_J_m2: number;
}

/**
 * `g = m / (π ℏ²)`, independent of energy.
 * @public
 */
export function evaluateDensityOfStates2D({ m_kg }: DensityOfStates2DInputs): DensityOfStates2DResult {
  finite('m_kg', m_kg);
  if (m_kg === 0) throw new Error('evaluateDensityOfStates2D: m_kg must be nonzero');
  return { g_per_J_m2: m_kg / (Math.PI * HBAR_SI ** 2) };
}

/**
 * A valley factor other than 1. Not this density.
 * @internal
 */
export function dos2dValley(m_kg: number, valley: number): number {
  finite('valley', valley);
  return evaluateDensityOfStates2D({ m_kg }).g_per_J_m2 * valley;
}

/** Thomas–Fermi inputs. `e` and `ε0` are not inputs. @public */
export interface ThomasFermiInputs {
  readonly n_per_m3: number;
  readonly EF_J: number;
}
/** Screening wavevector squared. @public */
export interface ThomasFermiResult {
  readonly k2_per_m2: number;
}

/**
 * `k_TF² = (e² / ε0) (3 n) / (2 E_F)`.
 * @public
 */
export function evaluateThomasFermi({ n_per_m3, EF_J }: ThomasFermiInputs): ThomasFermiResult {
  finite('n_per_m3', n_per_m3);
  finite('EF_J', EF_J);
  if (!(EF_J > 0)) throw new Error('evaluateThomasFermi: EF_J must be positive');
  return { k2_per_m2: ((E_SI * E_SI) / EPS0_SI) * ((3 * n_per_m3) / (2 * EF_J)) };
}

/**
 * A flat density drops the `3/2`. Not the parabolic gas.
 * @internal
 */
export function thomasFermiFlat(n_per_m3: number, EF_J: number): number {
  finite('n_per_m3', n_per_m3);
  finite('EF_J', EF_J);
  if (EF_J === 0) throw new Error('thomasFermiFlat: EF_J must be nonzero');
  return ((E_SI * E_SI) / EPS0_SI) * (n_per_m3 / EF_J);
}

/** Built-in voltage inputs. `e` is not an input. @public */
export interface BuiltinVoltageInputs {
  readonly T_K: number;
  readonly NA_per_m3: number;
  readonly ND_per_m3: number;
  readonly ni_per_m3: number;
}
/** Built-in voltage of a p–n junction. @public */
export interface BuiltinVoltageResult {
  readonly V_bi_V: number;
}

/**
 * `V_bi = (k_B T / e) ln(N_A N_D / n_i²)`.
 * @public
 */
export function evaluateBuiltinVoltage({
  T_K,
  NA_per_m3,
  ND_per_m3,
  ni_per_m3,
}: BuiltinVoltageInputs): BuiltinVoltageResult {
  finite('T_K', T_K);
  finite('NA_per_m3', NA_per_m3);
  finite('ND_per_m3', ND_per_m3);
  finite('ni_per_m3', ni_per_m3);
  if (!(NA_per_m3 > 0)) throw new Error('evaluateBuiltinVoltage: NA_per_m3 must be positive');
  if (!(ND_per_m3 > 0)) throw new Error('evaluateBuiltinVoltage: ND_per_m3 must be positive');
  if (!(ni_per_m3 > 0)) throw new Error('evaluateBuiltinVoltage: ni_per_m3 must be positive');
  const argument = (NA_per_m3 * ND_per_m3) / ni_per_m3 ** 2;
  return { V_bi_V: ((K_B_SI * T_K) / E_SI) * Math.log(argument) };
}

/**
 * `k_B T / e` with the logarithm omitted. Not the built-in voltage.
 * @internal
 */
export function builtinWithoutLog(T_K: number): number {
  finite('T_K', T_K);
  return (K_B_SI * T_K) / E_SI;
}

/** Semiconductor Fermi-level inputs. @public */
export interface SemiconductorFermiInputs {
  readonly T_K: number;
  readonly mh_kg: number;
  readonly me_kg: number;
  readonly Nc_per_m3: number;
  readonly ND_per_m3: number;
}
/** Intrinsic offset from midgap, and the extrinsic gap to the band edge. @public */
export interface SemiconductorFermiResult {
  readonly intrinsic_offset_J: number;
  readonly extrinsic_offset_J: number;
}

/**
 * Intrinsic offset `(3/4) k_B T ln(m_h* / m_e*)` and extrinsic
 * `E_c − E_F = k_B T ln(N_c / N_D)`.
 * @public
 */
export function evaluateSemiconductorFermi({
  T_K,
  mh_kg,
  me_kg,
  Nc_per_m3,
  ND_per_m3,
}: SemiconductorFermiInputs): SemiconductorFermiResult {
  finite('T_K', T_K);
  finite('mh_kg', mh_kg);
  finite('me_kg', me_kg);
  finite('Nc_per_m3', Nc_per_m3);
  finite('ND_per_m3', ND_per_m3);
  if (T_K === 0) throw new Error('evaluateSemiconductorFermi: T_K must be nonzero');
  if (!(mh_kg > 0)) throw new Error('evaluateSemiconductorFermi: mh_kg must be positive');
  if (!(me_kg > 0)) throw new Error('evaluateSemiconductorFermi: me_kg must be positive');
  if (!(Nc_per_m3 > 0)) throw new Error('evaluateSemiconductorFermi: Nc_per_m3 must be positive');
  if (!(ND_per_m3 > 0)) throw new Error('evaluateSemiconductorFermi: ND_per_m3 must be positive');
  const kT = K_B_SI * T_K;
  return {
    intrinsic_offset_J: (3 / 4) * kT * Math.log(mh_kg / me_kg),
    extrinsic_offset_J: kT * Math.log(Nc_per_m3 / ND_per_m3),
  };
}

/**
 * Half of `3/2` left as `1/2`. Not the intrinsic offset.
 * @internal
 */
export function fermiHalfOffset(T_K: number, mh_kg: number, me_kg: number): number {
  finite('T_K', T_K);
  finite('mh_kg', mh_kg);
  finite('me_kg', me_kg);
  if (T_K === 0) throw new Error('fermiHalfOffset: T_K must be nonzero');
  if (!(mh_kg > 0 && me_kg > 0)) throw new Error('fermiHalfOffset: masses must be positive');
  return (1 / 2) * K_B_SI * T_K * Math.log(mh_kg / me_kg);
}

/** Onsager-frequency inputs. `e` is not an input. @public */
export interface OnsagerFrequencyInputs {
  readonly A_per_m2: number;
}
/** The field `F` with `Δ(1/B) = 1/F`. @public */
export interface OnsagerFrequencyResult {
  readonly F_T: number;
}

/**
 * `F = ℏ A / (2 π e)`.
 * @public
 */
export function evaluateOnsagerFrequency({ A_per_m2 }: OnsagerFrequencyInputs): OnsagerFrequencyResult {
  finite('A_per_m2', A_per_m2);
  return { F_T: (HBAR_SI * A_per_m2) / (2 * Math.PI * E_SI) };
}

/**
 * Drops `2 π`. Not the Onsager frequency.
 * @internal
 */
export function onsagerWithoutTwoPi(A_per_m2: number): number {
  finite('A_per_m2', A_per_m2);
  return (HBAR_SI * A_per_m2) / E_SI;
}

/** Josephson-inductance inputs. @public */
export interface JosephsonInductanceInputs {
  readonly Ic_A: number;
}
/** Small-phase Josephson inductance. @public */
export interface JosephsonInductanceResult {
  readonly L_H: number;
}

/**
 * `L_J = ℏ / (2 e I_c)`.
 * @public
 */
export function evaluateJosephsonInductance({ Ic_A }: JosephsonInductanceInputs): JosephsonInductanceResult {
  finite('Ic_A', Ic_A);
  if (Ic_A === 0) throw new Error('evaluateJosephsonInductance: Ic_A must be nonzero');
  return { L_H: HBAR_SI / (2 * E_SI * Ic_A) };
}

/**
 * `ℏ / (e I_c)`. Drops the Cooper-pair 2. Not this inductance.
 * @internal
 */
export function josephsonWithoutTwo(Ic_A: number): number {
  finite('Ic_A', Ic_A);
  if (Ic_A === 0) throw new Error('josephsonWithoutTwo: Ic_A must be nonzero');
  return HBAR_SI / (E_SI * Ic_A);
}

/** Lower-critical-field inputs. `Φ₀ = h / (2 e)` is not an input. @public */
export interface LowerCriticalInputs {
  readonly lambda_m: number;
  readonly xi_m: number;
}
/** Lower critical field of a London vortex. @public */
export interface LowerCriticalResult {
  readonly B_c1_T: number;
}

/**
 * `B_c1 = (Φ₀ / (4 π λ²)) ln(λ/ξ)` with `Φ₀ = h / (2 e)`.
 * @public
 */
export function evaluateLowerCritical({ lambda_m, xi_m }: LowerCriticalInputs): LowerCriticalResult {
  finite('lambda_m', lambda_m);
  finite('xi_m', xi_m);
  if (!(xi_m > 0)) throw new Error('evaluateLowerCritical: xi_m must be positive');
  if (!(lambda_m > xi_m)) throw new Error('evaluateLowerCritical: lambda_m must exceed xi_m');
  const phi0 = H_SI / (2 * E_SI);
  return { B_c1_T: (phi0 / (4 * Math.PI * lambda_m ** 2)) * Math.log(lambda_m / xi_m) };
}

/**
 * Drops `4 π`. Not the lower critical field.
 * @internal
 */
export function lowerCriticalWithoutFourPi(input: LowerCriticalInputs): number {
  return evaluateLowerCritical(input).B_c1_T * (4 * Math.PI);
}

/** AC Drude inputs. `e` is not an input. @public */
export interface AcDrudeInputs {
  readonly n_per_m3: number;
  readonly m_kg: number;
  readonly tau_s: number;
  readonly omega_rad_s: number;
}
/** Real part of the AC Drude conductivity. @public */
export interface AcDrudeResult {
  readonly sigma_S_per_m: number;
}

/**
 * `Re σ = σ₀ / (1 + ω² τ²)` with `σ₀ = n e² τ / m`.
 * @public
 */
export function evaluateAcDrude({ n_per_m3, m_kg, tau_s, omega_rad_s }: AcDrudeInputs): AcDrudeResult {
  finite('n_per_m3', n_per_m3);
  finite('m_kg', m_kg);
  finite('tau_s', tau_s);
  finite('omega_rad_s', omega_rad_s);
  if (!(tau_s > 0)) throw new Error('evaluateAcDrude: tau_s must be positive');
  if (m_kg === 0) throw new Error('evaluateAcDrude: m_kg must be nonzero');
  const sigma0 = (n_per_m3 * E_SI * E_SI * tau_s) / m_kg;
  return { sigma_S_per_m: sigma0 / (1 + omega_rad_s ** 2 * tau_s ** 2) };
}

/**
 * Drops the DC `1` in the denominator. Not this conductivity.
 * @internal
 */
export function acDrudeWithoutDc(input: AcDrudeInputs): number {
  if (input.omega_rad_s === 0) throw new Error('acDrudeWithoutDc: omega_rad_s must be nonzero');
  const real = evaluateAcDrude(input).sigma_S_per_m;
  return real * (1 + input.omega_rad_s ** 2 * input.tau_s ** 2) / (input.omega_rad_s ** 2 * input.tau_s ** 2);
}

/** Matthiessen inputs. `C` converts a rate into a resistivity. @public */
export interface MatthiessenInputs {
  readonly tau1_s: number;
  readonly tau2_s: number;
  readonly C_ohm_m_s: number;
}
/** Parallel lifetime and the resistivity sum. @public */
export interface MatthiessenResult {
  readonly tau_s: number;
  readonly rho_ohm_m: number;
}

/**
 * `1/τ = 1/τ₁ + 1/τ₂` and `ρ = C (1/τ₁ + 1/τ₂)`.
 * @public
 */
export function evaluateMatthiessen({ tau1_s, tau2_s, C_ohm_m_s }: MatthiessenInputs): MatthiessenResult {
  finite('tau1_s', tau1_s);
  finite('tau2_s', tau2_s);
  finite('C_ohm_m_s', C_ohm_m_s);
  if (tau1_s === 0) throw new Error('evaluateMatthiessen: tau1_s must be nonzero');
  if (tau2_s === 0) throw new Error('evaluateMatthiessen: tau2_s must be nonzero');
  const rate = 1 / tau1_s + 1 / tau2_s;
  if (rate === 0) throw new Error('evaluateMatthiessen: 1/τ₁ + 1/τ₂ must be nonzero');
  return { tau_s: 1 / rate, rho_ohm_m: C_ohm_m_s * rate };
}

/**
 * One lifetime. Not the parallel sum when the other lifetime is finite.
 * @internal
 */
export function matthiessenSingle(tau1_s: number): number {
  finite('tau1_s', tau1_s);
  if (tau1_s === 0) throw new Error('matthiessenSingle: tau1_s must be nonzero');
  return tau1_s;
}

/** Stoner inputs. `x = I g(E_F)`. @public */
export interface StonerInputs {
  readonly chi_P: number;
  readonly x: number;
}
/** Enhanced susceptibility. @public */
export interface StonerResult {
  readonly chi: number;
}

/**
 * `χ = χ_P / (1 − I g(E_F))` for `|I g(E_F)| < 1`.
 * @public
 */
export function evaluateStoner({ chi_P, x }: StonerInputs): StonerResult {
  finite('chi_P', chi_P);
  finite('x', x);
  if (!(Math.abs(x) < 1)) throw new Error('evaluateStoner: |x| must be < 1');
  return { chi: chi_P / (1 - x) };
}

/**
 * The first two bubbles, `χ_P (1 + x)`. Not the closed form.
 * @internal
 */
export function stonerTwoBubbles(chi_P: number, x: number): number {
  finite('chi_P', chi_P);
  finite('x', x);
  return chi_P * (1 + x);
}

/** Gorter–Casimir inputs. The exponent 4 is the hypothesis. @public */
export interface GorterCasimirInputs {
  readonly T_K: number;
  readonly Tc_K: number;
  readonly lambda0_m: number;
}
/** Superfluid fraction and the London depth at that fraction. @public */
export interface GorterCasimirResult {
  readonly ns_over_n: number;
  readonly lambda_m: number;
}

/**
 * `n_s/n = 1 − (T/T_c)^4` and `λ(T) = λ(0) / √(1 − (T/T_c)^4)`.
 * @public
 */
export function evaluateGorterCasimir({ T_K, Tc_K, lambda0_m }: GorterCasimirInputs): GorterCasimirResult {
  finite('T_K', T_K);
  finite('Tc_K', Tc_K);
  finite('lambda0_m', lambda0_m);
  if (!(Tc_K > 0)) throw new Error('evaluateGorterCasimir: Tc_K must be positive');
  if (T_K < 0) throw new Error('evaluateGorterCasimir: T_K must be ≥ 0');
  if (!(T_K < Tc_K)) throw new Error('evaluateGorterCasimir: T_K must be below Tc_K');
  if (!(lambda0_m > 0)) throw new Error('evaluateGorterCasimir: lambda0_m must be positive');
  const fraction = 1 - (T_K / Tc_K) ** 4;
  return { ns_over_n: fraction, lambda_m: lambda0_m / Math.sqrt(fraction) };
}

/**
 * Exponent 2. Not 4 when the reduced temperature is neither 0 nor 1.
 * @internal
 */
export function gorterExponentTwo(T_K: number, Tc_K: number): number {
  finite('T_K', T_K);
  finite('Tc_K', Tc_K);
  if (!(Tc_K > 0)) throw new Error('gorterExponentTwo: Tc_K must be positive');
  return 1 - (T_K / Tc_K) ** 2;
}
