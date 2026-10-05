/**
 * BE-61 — Wiedemann-Franz law: κ/(σT) = L₀ = (π²/3)(k_B/e)², the Sommerfeld
 * Lorenz number, ≈ 2.44×10⁻⁸ W·Ω·K⁻².
 *
 * In a degenerate electron gas the same carriers near the Fermi surface carry
 * both charge and heat, so the ratio of thermal to electrical conductivity is a
 * universal constant times T — a signature of Fermi-liquid transport.
 *
 * HONEST CONFRONTATION CAVEAT (Adam/Eve vet 2026-07-05, Eve YELLOW): L₀ is the
 * DEGENERATE / elastic-scattering limit. Real metals deviate — Cu at 0 °C is
 * ~2.23×10⁻⁸ (~9% low), and inelastic (small-angle) scattering suppresses L at
 * intermediate T; pure metals at low T (e.g. Ag) recover L₀. The confrontation is
 * a degenerate-limit consistency check, not a tight test. The statistics axis tag
 * was STRIPPED (contested: a transport ratio whose fermionic origin Eve did not
 * endorse as a clean tag).
 *
 * @module bridges/be61-wiedemann-franz
 */
import { K_B_SI, E_SI } from '../core/constants.js';

/** Sommerfeld Lorenz number L₀ = (π²/3)(k_B/e)² (W·Ω·K⁻²). @public */
export const LORENZ_NUMBER_SI = (Math.PI ** 2 / 3) * (K_B_SI / E_SI) ** 2;

/** @internal */
export interface WiedemannFranzInputs {
  /** Electrical conductivity σ (S/m). */
  readonly sigma_S_per_m: number;
  /** Temperature T (K). */
  readonly T_K: number;
}
/** @internal */
export interface WiedemannFranzResult {
  readonly sigma_S_per_m: number;
  readonly T_K: number;
  /** Thermal conductivity κ = L₀·σ·T (W/(m·K)). */
  readonly kappa_W_per_mK: number;
  /** The Lorenz number L₀ (W·Ω·K⁻²). */
  readonly L0_W_ohm_per_K2: number;
}

/**
 * Evaluate the Wiedemann-Franz thermal conductivity κ = L₀·σ·T.
 *
 * @internal
 */
export function evaluateWiedemannFranz({
  sigma_S_per_m,
  T_K,
}: WiedemannFranzInputs): WiedemannFranzResult {
  if (!Number.isFinite(sigma_S_per_m) || sigma_S_per_m < 0) {
    throw new Error('evaluateWiedemannFranz: sigma_S_per_m must be finite and non-negative');
  }
  if (!Number.isFinite(T_K) || T_K < 0) {
    throw new Error('evaluateWiedemannFranz: T_K must be finite and non-negative');
  }
  return {
    sigma_S_per_m,
    T_K,
    kappa_W_per_mK: LORENZ_NUMBER_SI * sigma_S_per_m * T_K,
    L0_W_ohm_per_K2: LORENZ_NUMBER_SI,
  };
}
