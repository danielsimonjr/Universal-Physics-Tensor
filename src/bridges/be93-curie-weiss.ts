/**
 * BE-93 — Curie–Weiss susceptibility,
 *   C = μ₀ n g² μ_B² S(S+1) / (3 k_B),
 *   χ = C / (T − θ).
 *
 * Linear response χ k_B T = μ₀ n (g μ_B)² ⟨S_z²⟩ with the
 * high-temperature moment ⟨S_z²⟩ = S(S+1)/3 gives C. Equal weights
 * on m = ±1/2 give 1/4 = S(S+1)/3 at S = 1/2. Mean field
 * B_eff = B + λ M with θ = C λ/μ₀ gives χ = C/(T−θ). θ = 0 is C/T.
 * A classical moment uses μ²/3. The second moment and the mean-field
 * shift are hypotheses. Not an su(2) derivation. μ_B is an input.
 *
 * The overlay formalRef is `PhysJS.CurieWeiss.curie_weiss`.
 *
 * @module bridges/be93-curie-weiss
 */
import { K_B_SI } from '../core/constants.js';
import { MU0_SI } from '../dimensional/formula-names.js';

/**
 * Inputs for {@link evaluateCurieWeiss}.
 * @internal
 */
export interface CurieWeissInputs {
  /** Moment density, per cubic metre. */
  readonly n_per_m3: number;
  /** Landé g-factor. */
  readonly g: number;
  /** Spin. S = 1/2 is the equal-weight check, not a restriction. */
  readonly spin: number;
  /** Bohr magneton, joules per tesla. */
  readonly muB_J_per_T: number;
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
  /** Weiss temperature, kelvin. Zero is the Curie law. */
  readonly theta_K: number;
}

/**
 * Result of {@link evaluateCurieWeiss}.
 * @internal
 */
export interface CurieWeissResult {
  readonly n_per_m3: number;
  readonly g: number;
  readonly spin: number;
  readonly muB_J_per_T: number;
  readonly T_K: number;
  readonly theta_K: number;
  /** Curie constant, kelvin. */
  readonly C_K: number;
  /** Dimensionless susceptibility χ = C/(T−θ). */
  readonly chi: number;
}

/**
 * Evaluate the Curie–Weiss susceptibility. θ is the mean-field hypothesis.
 *
 * @internal
 */
export function evaluateCurieWeiss(inputs: CurieWeissInputs): CurieWeissResult {
  const { n_per_m3, g, spin, muB_J_per_T, T_K, theta_K } = inputs;
  if (!Number.isFinite(n_per_m3) || n_per_m3 <= 0) {
    throw new Error('evaluateCurieWeiss: n_per_m3 must be finite and > 0');
  }
  if (!Number.isFinite(g)) {
    throw new Error('evaluateCurieWeiss: g must be finite');
  }
  if (!Number.isFinite(spin) || spin < 0) {
    throw new Error('evaluateCurieWeiss: spin must be finite and ≥ 0');
  }
  if (!Number.isFinite(muB_J_per_T) || muB_J_per_T <= 0) {
    throw new Error('evaluateCurieWeiss: muB_J_per_T must be finite and > 0');
  }
  if (!Number.isFinite(T_K) || !Number.isFinite(theta_K) || T_K === theta_K) {
    throw new Error('evaluateCurieWeiss: T_K and theta_K must be finite and distinct');
  }
  const C_K = (MU0_SI * n_per_m3 * g * g * muB_J_per_T ** 2 * spin * (spin + 1)) / (3 * K_B_SI);
  const chi = C_K / (T_K - theta_K);
  return { ...inputs, C_K, chi };
}
