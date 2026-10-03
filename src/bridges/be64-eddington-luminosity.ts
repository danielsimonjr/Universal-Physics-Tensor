/**
 * BE-64 — Eddington luminosity: the luminosity at which radiation pressure on
 * ionized hydrogen balances gravity,
 *   L_Edd = 4πGM·m_p·c / σ_T  ≈ 1.26×10³¹ W · (M/M_⊙)  (≈ 3.2×10⁴ L_⊙).
 *
 * Bridges a GRAVITATIONAL mass to a RADIATIVE luminosity scale; σ_T is the
 * Thomson cross-section. Sets the characteristic accretion/luminosity ceiling of
 * stars, X-ray binaries, and AGN. Eddington 1926.
 *
 * HONEST CONFRONTATION CAVEAT (Adam/Eve vet 2026-07-05, Adam RED / Eve GREEN on
 * the "tight" framing): L_Edd is a spherical-symmetry CHARACTERISTIC SCALE, not a
 * hard cap — genuine super-Eddington sources exist (beamed/anisotropic accretion,
 * ULXs). Confronts as a consistency scale that most sources respect, not a
 * precision limit.
 *
 * @module bridges/be64-eddington-luminosity
 */
import { G_SI, C_SI, M_PROTON_SI } from '../core/constants.js';
/** Thomson cross-section σ_T, m². @public */
export const THOMSON_CROSS_SECTION_SI = 6.6524587321e-29;

/** @public */
export interface EddingtonInputs {
  /** Accretor / stellar mass (kg). */
  readonly M_kg: number;
}
/** @public */
export interface EddingtonResult {
  readonly M_kg: number;
  /** Eddington luminosity (W). */
  readonly L_Edd_W: number;
  /** Eddington luminosity in solar luminosities (L_⊙ = 3.828×10²⁶ W). */
  readonly L_Edd_solar: number;
}

/** Solar luminosity, W (IAU nominal). */
const L_SUN_SI = 3.828e26;

/**
 * Evaluate the Eddington luminosity for an accretor mass.
 *
 * @public
 */
export function evaluateEddingtonLuminosity({ M_kg }: EddingtonInputs): EddingtonResult {
  if (!Number.isFinite(M_kg) || M_kg <= 0) {
    throw new Error('evaluateEddingtonLuminosity: M_kg must be positive');
  }
  const L_Edd_W = (4 * Math.PI * G_SI * M_kg * M_PROTON_SI * C_SI) / THOMSON_CROSS_SECTION_SI;
  return { M_kg, L_Edd_W, L_Edd_solar: L_Edd_W / L_SUN_SI };
}
