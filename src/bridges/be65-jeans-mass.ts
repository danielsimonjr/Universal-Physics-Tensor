/**
 * BE-65 — Jeans mass: the critical mass above which a self-gravitating gas cloud
 * collapses against thermal pressure,
 *   M_J = (5 k_B T / (G μ m_u))^{3/2} · (3 / (4π ρ))^{1/2}.
 *
 * Bridges THERMAL pressure to GRAVITATIONAL collapse — the fragmentation scale of
 * molecular clouds and the seed of star formation. Jeans 1902.
 *
 * HONEST CONFRONTATION CAVEAT (Adam/Eve vet 2026-07-05, GREEN/YELLOW): the Jeans
 * mass is an ORDER-OF-MAGNITUDE collapse criterion — the numerical prefactor (the
 * "5") is convention-dependent, and the observational confrontation (molecular-
 * cloud fragmentation) is necessarily order-of-magnitude, not a precision test.
 *
 * @module bridges/be65-jeans-mass
 */
import { K_B_SI, G_SI } from '../core/constants.js';

/** Unified atomic mass unit, kg. */
const M_U_SI = 1.66053906660e-27;

/** @internal */
export interface JeansInputs {
  /** Cloud temperature T (K). */
  readonly T_K: number;
  /** Mass density ρ (kg/m³). */
  readonly rho_kg_per_m3: number;
  /** Mean molecular weight μ (≈ 2.3 for molecular H₂/He clouds). */
  readonly mu: number;
}
/** @internal */
export interface JeansResult {
  readonly T_K: number;
  readonly rho_kg_per_m3: number;
  readonly mu: number;
  /** Jeans mass (kg). */
  readonly M_J_kg: number;
}

/**
 * Evaluate the Jeans mass for a cloud's temperature, density, and composition.
 *
 * @internal
 */
export function evaluateJeansMass({ T_K, rho_kg_per_m3, mu }: JeansInputs): JeansResult {
  if (!Number.isFinite(T_K) || T_K <= 0) {
    throw new Error('evaluateJeansMass: T_K must be positive');
  }
  if (!Number.isFinite(rho_kg_per_m3) || rho_kg_per_m3 <= 0) {
    throw new Error('evaluateJeansMass: rho_kg_per_m3 must be positive');
  }
  if (!Number.isFinite(mu) || mu <= 0) {
    throw new Error('evaluateJeansMass: mu must be a positive mean molecular weight');
  }
  const thermalTerm = Math.pow((5 * K_B_SI * T_K) / (G_SI * mu * M_U_SI), 1.5);
  const densityTerm = Math.pow(3 / (4 * Math.PI * rho_kg_per_m3), 0.5);
  return { T_K, rho_kg_per_m3, mu, M_J_kg: thermalTerm * densityTerm };
}
