/**
 * BE-103 through BE-125 — plasma and space evaluators.
 *
 * Each function is the single numeric body for that catalog id. No AST is
 * added: the installed MathTS packages do not export a scalar builder.
 * `e` is the elementary charge. Euler's number appears only as `exp`.
 *
 * The PhysJS covers name the hypotheses. BE-106's Stix index, BE-113's
 * residue, BE-116's transport integrals, and BE-125's mirror threshold
 * are hypotheses of those proofs, not derived steps.
 *
 * @module bridges/plasma-space
 */
import { E_SI, G_SI, K_B_SI } from '../core/constants.js';
import { EPS0_SI, MU0_SI } from '../dimensional/formula-names.js';

function finite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

/** Cold Bohm threshold `u0 = sqrt(k_B T_e / m_i)`. @public */
export interface BohmSheathInputs {
  readonly T_e_K: number;
  readonly m_i_kg: number;
}
/** Bohm Sheath Result. @public */
export interface BohmSheathResult {
  readonly u0_m_s: number;
}
/** evaluate Bohm Sheath. @public */
export function evaluateBohmSheath({ T_e_K, m_i_kg }: BohmSheathInputs): BohmSheathResult {
  finite('T_e_K', T_e_K);
  finite('m_i_kg', m_i_kg);
  if (m_i_kg <= 0) throw new Error('evaluateBohmSheath: m_i_kg must be positive');
  return { u0_m_s: Math.sqrt((K_B_SI * T_e_K) / m_i_kg) };
}

/**
 * Warm sound `c_s² = (k_B T_e + 3 k_B T_i) / m_i`. γ_i = 3 from p ∝ n³.
 * Nested on be-103. Not the catalog value.
 * @internal
 */
export function evaluateBohmWarmSound(T_e_K: number, T_i_K: number, m_i_kg: number): number {
  finite('T_e_K', T_e_K);
  finite('T_i_K', T_i_K);
  finite('m_i_kg', m_i_kg);
  return Math.sqrt((K_B_SI * T_e_K + 3 * K_B_SI * T_i_K) / m_i_kg);
}

/** Ion acoustic `ω² = k² c_s² / (1 + k² λ_De²)`. @public */
export interface IonAcousticInputs {
  readonly k_per_m: number;
  readonly c_s_m_s: number;
  readonly lambda_De_m: number;
}
/** Ion Acoustic Result. @public */
export interface IonAcousticResult {
  readonly omega_rad_s: number;
}
/** evaluate Ion Acoustic. @public */
export function evaluateIonAcoustic({ k_per_m, c_s_m_s, lambda_De_m }: IonAcousticInputs): IonAcousticResult {
  finite('k_per_m', k_per_m);
  finite('c_s_m_s', c_s_m_s);
  finite('lambda_De_m', lambda_De_m);
  if (k_per_m === 0) throw new Error('evaluateIonAcoustic: k_per_m must be nonzero');
  const k2 = k_per_m * k_per_m;
  const omega2 = (k2 * c_s_m_s * c_s_m_s) / (1 + k2 * lambda_De_m * lambda_De_m);
  return { omega_rad_s: Math.sqrt(omega2) };
}

/** Upper hybrid `ω² = n e²/(ε0 m) + (e B/m)²`. @public */
export interface UpperHybridInputs {
  readonly n_per_m3: number;
  readonly B_T: number;
  readonly m_kg: number;
}
/** Upper Hybrid Result. @public */
export interface UpperHybridResult {
  readonly omega_rad_s: number;
}
/** evaluate Upper Hybrid. @public */
export function evaluateUpperHybrid({ n_per_m3, B_T, m_kg }: UpperHybridInputs): UpperHybridResult {
  finite('n_per_m3', n_per_m3);
  finite('B_T', B_T);
  finite('m_kg', m_kg);
  if (m_kg <= 0) throw new Error('evaluateUpperHybrid: m_kg must be positive');
  const plasma = (n_per_m3 * E_SI * E_SI) / (EPS0_SI * m_kg);
  const cyclotron = (E_SI * B_T) / m_kg;
  return { omega_rad_s: Math.sqrt(plasma + cyclotron * cyclotron) };
}

/**
 * Nonnegative R cutoff. The Stix index `n_R² = 1 − ω_p²/(ω(ω − ω_c))` is a
 * hypothesis, not re-derived.
 * @public
 */
export interface ColdPlasmaCutoffInputs {
  readonly omega_c_rad_s: number;
  readonly omega_p_rad_s: number;
}
/** Cold Plasma Cutoff Result. @public */
export interface ColdPlasmaCutoffResult {
  readonly omega_R_rad_s: number;
}
/** evaluate Cold Plasma Cutoff. @public */
export function evaluateColdPlasmaCutoff({
  omega_c_rad_s,
  omega_p_rad_s,
}: ColdPlasmaCutoffInputs): ColdPlasmaCutoffResult {
  finite('omega_c_rad_s', omega_c_rad_s);
  finite('omega_p_rad_s', omega_p_rad_s);
  if (omega_c_rad_s < 0) throw new Error('evaluateColdPlasmaCutoff: omega_c_rad_s must be ≥ 0');
  const disc = omega_c_rad_s * omega_c_rad_s + 4 * omega_p_rad_s * omega_p_rad_s;
  return { omega_R_rad_s: (omega_c_rad_s + Math.sqrt(disc)) / 2 };
}

/** Lower hybrid `ω² = 1/(1/ω_pi² + 1/(ω_ci ω_ce))`. @public */
export interface LowerHybridInputs {
  readonly omega_pi_rad_s: number;
  readonly omega_ci_rad_s: number;
  readonly omega_ce_rad_s: number;
}
/** Lower Hybrid Result. @public */
export interface LowerHybridResult {
  readonly omega_rad_s: number;
}
/** evaluate Lower Hybrid. @public */
export function evaluateLowerHybrid({
  omega_pi_rad_s,
  omega_ci_rad_s,
  omega_ce_rad_s,
}: LowerHybridInputs): LowerHybridResult {
  finite('omega_pi_rad_s', omega_pi_rad_s);
  finite('omega_ci_rad_s', omega_ci_rad_s);
  finite('omega_ce_rad_s', omega_ce_rad_s);
  const denom = 1 / (omega_pi_rad_s * omega_pi_rad_s) + 1 / (omega_ci_rad_s * omega_ce_rad_s);
  return { omega_rad_s: Math.sqrt(1 / denom) };
}

/** Fast oblique magnetosonic phase speed. The be-69 quartic is a hypothesis. @public */
export interface ObliqueMagnetosonicInputs {
  readonly c_s_m_s: number;
  readonly v_A_m_s: number;
  readonly theta_rad: number;
}
/** Oblique Magnetosonic Result. @public */
export interface ObliqueMagnetosonicResult {
  readonly v_fast_m_s: number;
}
/** evaluate Oblique Magnetosonic. @public */
export function evaluateObliqueMagnetosonic({
  c_s_m_s,
  v_A_m_s,
  theta_rad,
}: ObliqueMagnetosonicInputs): ObliqueMagnetosonicResult {
  finite('c_s_m_s', c_s_m_s);
  finite('v_A_m_s', v_A_m_s);
  finite('theta_rad', theta_rad);
  const cs2 = c_s_m_s * c_s_m_s;
  const va2 = v_A_m_s * v_A_m_s;
  const cos = Math.cos(theta_rad);
  const disc = (cs2 + va2) * (cs2 + va2) - 4 * cs2 * va2 * cos * cos;
  const fast2 = 0.5 * (cs2 + va2 + Math.sqrt(disc));
  return { v_fast_m_s: Math.sqrt(fast2) };
}

/**
 * Equal-temperature Bennett current `I = sqrt(16 π N k_B T / μ0)`.
 * The factor 8 is the single-population current and is not this value.
 * @public
 */
export interface BennettPinchInputs {
  readonly N_per_m: number;
  readonly T_K: number;
}
/** Bennett Pinch Result. @public */
export interface BennettPinchResult {
  readonly I_A: number;
}
/** evaluate Bennett Pinch. @public */
export function evaluateBennettPinch({ N_per_m, T_K }: BennettPinchInputs): BennettPinchResult {
  finite('N_per_m', N_per_m);
  finite('T_K', T_K);
  if (N_per_m < 0 || T_K < 0) throw new Error('evaluateBennettPinch: N_per_m and T_K must be ≥ 0');
  return { I_A: Math.sqrt((16 * Math.PI * N_per_m * K_B_SI * T_K) / MU0_SI) };
}

/** Single-population current `sqrt(8 π N k_B T / μ0)`. Not the equal-temperature current. @internal */
export function bennettSinglePopulationCurrent(N_per_m: number, T_K: number): number {
  return Math.sqrt((8 * Math.PI * N_per_m * K_B_SI * T_K) / MU0_SI);
}

/** `sin² θ_lc = B0/Bm`. @public */
export interface LossConeInputs {
  readonly B0_T: number;
  readonly Bm_T: number;
}
/** Loss Cone Result. @public */
export interface LossConeResult {
  readonly sin2_theta: number;
}
/** evaluate Loss Cone. @public */
export function evaluateLossCone({ B0_T, Bm_T }: LossConeInputs): LossConeResult {
  finite('B0_T', B0_T);
  finite('Bm_T', Bm_T);
  if (Bm_T === 0) throw new Error('evaluateLossCone: Bm_T must be nonzero');
  return { sin2_theta: B0_T / Bm_T };
}

/** Grad-B drift `m v_⊥² |∇B| / (2 q B²)`. `q` stays signed. @public */
export interface GradBDriftInputs {
  readonly m_kg: number;
  readonly v_perp_m_s: number;
  readonly gradB_T_per_m: number;
  readonly q_C: number;
  readonly B_T: number;
}
/** Grad BDrift Result. @public */
export interface GradBDriftResult {
  readonly v_m_s: number;
}
/** evaluate Grad BDrift. @public */
export function evaluateGradBDrift({
  m_kg,
  v_perp_m_s,
  gradB_T_per_m,
  q_C,
  B_T,
}: GradBDriftInputs): GradBDriftResult {
  finite('m_kg', m_kg);
  finite('v_perp_m_s', v_perp_m_s);
  finite('gradB_T_per_m', gradB_T_per_m);
  finite('q_C', q_C);
  finite('B_T', B_T);
  if (q_C === 0 || B_T === 0) throw new Error('evaluateGradBDrift: q_C and B_T must be nonzero');
  const v =
    (m_kg * v_perp_m_s * v_perp_m_s * Math.abs(gradB_T_per_m)) / (2 * q_C * B_T * B_T);
  return { v_m_s: v };
}

/** `v_x = E_y/B`, `v_y = −E_x/B`. Charge cancels. @public */
export interface ExBDriftInputs {
  readonly E_x_V_per_m: number;
  readonly E_y_V_per_m: number;
  readonly B_T: number;
}
/** Ex BDrift Result. @public */
export interface ExBDriftResult {
  readonly v_x_m_s: number;
  readonly v_y_m_s: number;
  readonly speed_m_s: number;
}
/** evaluate Ex BDrift. @public */
export function evaluateExBDrift({ E_x_V_per_m, E_y_V_per_m, B_T }: ExBDriftInputs): ExBDriftResult {
  finite('E_x_V_per_m', E_x_V_per_m);
  finite('E_y_V_per_m', E_y_V_per_m);
  finite('B_T', B_T);
  if (B_T === 0) throw new Error('evaluateExBDrift: B_T must be nonzero');
  const v_x_m_s = E_y_V_per_m / B_T;
  const v_y_m_s = -E_x_V_per_m / B_T;
  return { v_x_m_s, v_y_m_s, speed_m_s: Math.hypot(v_x_m_s, v_y_m_s) };
}

/**
 * Landau damping rate. The residue formula is a hypothesis, not a contour
 * integral. Bohm–Gross does not replace ω by ω_p in this prefactor.
 * @public
 */
export interface LandauDampingInputs {
  readonly omega_rad_s: number;
  readonly k_per_m: number;
  readonly v_t_m_s: number;
}
/** Landau Damping Result. @public */
export interface LandauDampingResult {
  readonly gamma_rad_s: number;
}
/** evaluate Landau Damping. @public */
export function evaluateLandauDamping({
  omega_rad_s,
  k_per_m,
  v_t_m_s,
}: LandauDampingInputs): LandauDampingResult {
  finite('omega_rad_s', omega_rad_s);
  finite('k_per_m', k_per_m);
  finite('v_t_m_s', v_t_m_s);
  if (k_per_m === 0 || v_t_m_s === 0) throw new Error('evaluateLandauDamping: k and v_t must be nonzero');
  const x = omega_rad_s / (k_per_m * v_t_m_s);
  const gamma =
    -Math.sqrt(Math.PI / 8) *
    omega_rad_s *
    x * x * x *
    Math.exp((-omega_rad_s * omega_rad_s) / (2 * k_per_m * k_per_m * v_t_m_s * v_t_m_s));
  return { gamma_rad_s: gamma };
}

/** `N_D = (4π/3) n λ_D³` and `Λ = 9 N_D`. @public */
export interface DebyeSphereInputs {
  readonly n_per_m3: number;
  readonly lambda_D_m: number;
}
/** Debye Sphere Result. @public */
export interface DebyeSphereResult {
  readonly N_D: number;
  readonly Lambda: number;
}
/** evaluate Debye Sphere. @public */
export function evaluateDebyeSphere({ n_per_m3, lambda_D_m }: DebyeSphereInputs): DebyeSphereResult {
  finite('n_per_m3', n_per_m3);
  finite('lambda_D_m', lambda_D_m);
  const N_D = ((4 * Math.PI) / 3) * n_per_m3 * lambda_D_m ** 3;
  return { N_D, Lambda: 9 * N_D };
}

/** `1/λ_D² = 1/λ₁² + 1/λ₂²`. @public */
export interface MultiDebyeInputs {
  readonly lambda_1_m: number;
  readonly lambda_2_m: number;
}
/** Multi Debye Result. @public */
export interface MultiDebyeResult {
  readonly lambda_D_m: number;
}
/** evaluate Multi Debye. @public */
export function evaluateMultiDebye({ lambda_1_m, lambda_2_m }: MultiDebyeInputs): MultiDebyeResult {
  finite('lambda_1_m', lambda_1_m);
  finite('lambda_2_m', lambda_2_m);
  if (lambda_1_m === 0 || lambda_2_m === 0) throw new Error('evaluateMultiDebye: lengths must be nonzero');
  const inv = 1 / (lambda_1_m * lambda_1_m) + 1 / (lambda_2_m * lambda_2_m);
  return { lambda_D_m: 1 / Math.sqrt(inv) };
}

/**
 * Kinetic Lorentz resistivity. `σ_tr = 4π b0² ln Λ` and the conductivity
 * moment are hypotheses. The nested reference closure is not this value.
 * @public
 */
export interface LorentzResistivityInputs {
  readonly Z: number;
  readonly ln_Lambda: number;
  readonly T_K: number;
  readonly m_kg: number;
}
/** Lorentz Resistivity Result. @public */
export interface LorentzResistivityResult {
  readonly eta_ohm_m: number;
}
/** evaluate Lorentz Resistivity. @public */
export function evaluateLorentzResistivity({
  Z,
  ln_Lambda,
  T_K,
  m_kg,
}: LorentzResistivityInputs): LorentzResistivityResult {
  finite('Z', Z);
  finite('ln_Lambda', ln_Lambda);
  finite('T_K', T_K);
  finite('m_kg', m_kg);
  if (T_K <= 0 || m_kg <= 0) throw new Error('evaluateLorentzResistivity: T_K and m_kg must be positive');
  const pref = (Math.PI * Math.sqrt(2 * Math.PI)) / 8;
  const kt = K_B_SI * T_K;
  const denom = (4 * Math.PI * EPS0_SI) ** 2 * kt ** 1.5;
  const eta = (pref * Z * E_SI * E_SI * Math.sqrt(m_kg) * ln_Lambda) / denom;
  return { eta_ohm_m: eta };
}

/** `η_ref / η_kin = 32/(3π)` on one collision frequency. Not the evaluator. @internal */
export function lorentzReferenceOverKinetic(): number {
  return 32 / (3 * Math.PI);
}

/** Slab decay `τ = μ0 σ L² / π²`. A denominator 4π is not π². @public */
export interface ResistiveSlabInputs {
  readonly sigma_S_per_m: number;
  readonly L_m: number;
}
/** Resistive Slab Result. @public */
export interface ResistiveSlabResult {
  readonly tau_s: number;
}
/** evaluate Resistive Slab. @public */
export function evaluateResistiveSlab({ sigma_S_per_m, L_m }: ResistiveSlabInputs): ResistiveSlabResult {
  finite('sigma_S_per_m', sigma_S_per_m);
  finite('L_m', L_m);
  return { tau_s: (MU0_SI * sigma_S_per_m * L_m * L_m) / (Math.PI * Math.PI) };
}

/** Parker critical radius `r_c = G M / (2 c_s²)`. @public */
export interface ParkerCriticalInputs {
  readonly c_s_m_s: number;
  readonly M_kg: number;
}
/** Parker Critical Result. @public */
export interface ParkerCriticalResult {
  readonly r_c_m: number;
}
/** evaluate Parker Critical. @public */
export function evaluateParkerCritical({ c_s_m_s, M_kg }: ParkerCriticalInputs): ParkerCriticalResult {
  finite('c_s_m_s', c_s_m_s);
  finite('M_kg', M_kg);
  if (c_s_m_s === 0) throw new Error('evaluateParkerCritical: c_s_m_s must be nonzero');
  return { r_c_m: (G_SI * M_kg) / (2 * c_s_m_s * c_s_m_s) };
}

/** `B_φ/B_r = −Ω r sinθ / v_r`. @public */
export interface ParkerSpiralInputs {
  readonly Omega_rad_s: number;
  readonly r_m: number;
  readonly theta_rad: number;
  readonly v_r_m_s: number;
}
/** Parker Spiral Result. @public */
export interface ParkerSpiralResult {
  readonly ratio: number;
}
/** evaluate Parker Spiral. @public */
export function evaluateParkerSpiral({
  Omega_rad_s,
  r_m,
  theta_rad,
  v_r_m_s,
}: ParkerSpiralInputs): ParkerSpiralResult {
  finite('Omega_rad_s', Omega_rad_s);
  finite('r_m', r_m);
  finite('theta_rad', theta_rad);
  finite('v_r_m_s', v_r_m_s);
  if (v_r_m_s === 0) throw new Error('evaluateParkerSpiral: v_r_m_s must be nonzero');
  return { ratio: (-Omega_rad_s * r_m * Math.sin(theta_rad)) / v_r_m_s };
}

/** `(R/R_E)⁶ = 2 B_E² / (μ0 ρ v²)`. The doubled dipole is a hypothesis. @public */
export interface ChapmanFerraroInputs {
  readonly B_E_T: number;
  readonly rho_kg_per_m3: number;
  readonly v_m_s: number;
}
/** Chapman Ferraro Result. @public */
export interface ChapmanFerraroResult {
  readonly standoff_sixth: number;
}
/** evaluate Chapman Ferraro. @public */
export function evaluateChapmanFerraro({
  B_E_T,
  rho_kg_per_m3,
  v_m_s,
}: ChapmanFerraroInputs): ChapmanFerraroResult {
  finite('B_E_T', B_E_T);
  finite('rho_kg_per_m3', rho_kg_per_m3);
  finite('v_m_s', v_m_s);
  if (rho_kg_per_m3 === 0 || v_m_s === 0) throw new Error('evaluateChapmanFerraro: ρ and v must be nonzero');
  return { standoff_sixth: (2 * B_E_T * B_E_T) / (MU0_SI * rho_kg_per_m3 * v_m_s * v_m_s) };
}

/** `n τ = 12 k_B T / (⟨σv⟩ E)`. The 12 is 4 × 3. @public */
export interface LawsonBreakevenInputs {
  readonly T_K: number;
  readonly sigma_v_m3_s: number;
  readonly E_J: number;
}
/** Lawson Breakeven Result. @public */
export interface LawsonBreakevenResult {
  readonly n_tau_s_per_m3: number;
}
/** evaluate Lawson Breakeven. @public */
export function evaluateLawsonBreakeven({
  T_K,
  sigma_v_m3_s,
  E_J,
}: LawsonBreakevenInputs): LawsonBreakevenResult {
  finite('T_K', T_K);
  finite('sigma_v_m3_s', sigma_v_m3_s);
  finite('E_J', E_J);
  if (sigma_v_m3_s === 0 || E_J === 0) throw new Error('evaluateLawsonBreakeven: ⟨σv⟩ and E must be nonzero');
  return { n_tau_s_per_m3: (12 * K_B_SI * T_K) / (sigma_v_m3_s * E_J) };
}

/** `e Φ/(k_B T) = (1/2) ln(2 π m_e/m_i) − 1/2`. @public */
export interface LangmuirProbeInputs {
  readonly m_e_kg: number;
  readonly m_i_kg: number;
}
/** Langmuir Probe Result. @public */
export interface LangmuirProbeResult {
  readonly ePhi_over_kT: number;
}
/** evaluate Langmuir Probe. @public */
export function evaluateLangmuirProbe({ m_e_kg, m_i_kg }: LangmuirProbeInputs): LangmuirProbeResult {
  finite('m_e_kg', m_e_kg);
  finite('m_i_kg', m_i_kg);
  if (m_e_kg <= 0 || m_i_kg <= 0) throw new Error('evaluateLangmuirProbe: masses must be positive');
  return { ePhi_over_kT: 0.5 * Math.log((2 * Math.PI * m_e_kg) / m_i_kg) - 0.5 };
}

/** `D_⊥/D_∥ = 1/(1+α²)`. Einstein's relation is be-70 and is not re-proved. @public */
export interface CrossFieldDiffusionInputs {
  readonly alpha: number;
}
/** Cross Field Diffusion Result. @public */
export interface CrossFieldDiffusionResult {
  readonly ratio: number;
}
/** evaluate Cross Field Diffusion. @public */
export function evaluateCrossFieldDiffusion({ alpha }: CrossFieldDiffusionInputs): CrossFieldDiffusionResult {
  finite('alpha', alpha);
  return { ratio: 1 / (1 + alpha * alpha) };
}

/**
 * Drift from `q E + q v × B − m v/τ = 0`. `α = μ B`.
 * @internal
 */
export function evaluateCrossFieldVelocity(
  mu: number,
  alpha: number,
  E_x: number,
  E_y: number,
): { readonly v_x: number; readonly v_y: number } {
  const denom = 1 + alpha * alpha;
  return {
    v_x: (mu * (E_x + alpha * E_y)) / denom,
    v_y: (mu * (E_y - alpha * E_x)) / denom,
  };
}

/** Firehose margin `β_∥ − β_⊥`. Unstable when the margin exceeds 2. The CGL root is a hypothesis. @public */
export interface FirehoseInputs {
  readonly beta_parallel: number;
  readonly beta_perp: number;
}
/** Firehose Result. @public */
export interface FirehoseResult {
  readonly margin: number;
}
/** evaluate Firehose. @public */
export function evaluateFirehose({ beta_parallel, beta_perp }: FirehoseInputs): FirehoseResult {
  finite('beta_parallel', beta_parallel);
  finite('beta_perp', beta_perp);
  return { margin: beta_parallel - beta_perp };
}

/**
 * Mirror margin `β_⊥ (T_⊥/T_∥ − 1)`. The threshold inequality is a hypothesis.
 * The kinetic integral is not evaluated.
 * @public
 */
export interface MirrorInstabilityInputs {
  readonly beta_perp: number;
  readonly T_perp_K: number;
  readonly T_parallel_K: number;
}
/** Mirror Instability Result. @public */
export interface MirrorInstabilityResult {
  readonly margin: number;
}
/** evaluate Mirror Instability. @public */
export function evaluateMirrorInstability({
  beta_perp,
  T_perp_K,
  T_parallel_K,
}: MirrorInstabilityInputs): MirrorInstabilityResult {
  finite('beta_perp', beta_perp);
  finite('T_perp_K', T_perp_K);
  finite('T_parallel_K', T_parallel_K);
  if (T_parallel_K === 0) throw new Error('evaluateMirrorInstability: T_parallel_K must be nonzero');
  return { margin: beta_perp * (T_perp_K / T_parallel_K - 1) };
}
