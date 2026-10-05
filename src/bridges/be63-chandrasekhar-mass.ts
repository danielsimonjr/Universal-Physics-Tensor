/**
 * BE-63 — Chandrasekhar mass: the maximum mass of a white dwarf supported by
 * electron degeneracy pressure,
 *   M_Ch = (ω₃⁰·√(3π)/2)·(ℏc/G)^{3/2}·(μ_e·m_u)⁻²  ≈ 1.44 M_⊙ (μ_e = 2).
 *
 * Bridges QUANTUM degeneracy pressure to a GRAVITATIONAL stellar-structure limit —
 * Chandrasekhar 1931 (Nobel 1983). ω₃⁰ ≈ 2.018 is the Lane-Emden n=3 surface
 * constant; μ_e is the mean molecular weight per electron (2 for C/O white dwarfs).
 *
 * HONEST CONFRONTATION CAVEAT (Adam/Eve vet 2026-07-05, both YELLOW): the ~1.4 M_⊙
 * limit matches the observed white-dwarf maximum (~1.35 M_⊙), but it is an
 * UPPER-BOUND consistency test, not a precision one — super-Chandrasekhar Type Ia
 * SNe (SN 2006gz/2007if/2009dc) imply progenitor masses up to 2.4–2.8 M_⊙ via
 * rotation/magnetic support.
 *
 * @module bridges/be63-chandrasekhar-mass
 */
import { HBAR_SI, C_SI, G_SI, M_SUN_SI, M_U_SI } from '../core/constants.js';
/** Lane-Emden n=3 surface constant ω₃⁰ = −ξ²θ'(ξ)|_surface. @public */
export const LANE_EMDEN_OMEGA3 = 2.01824;

/** @internal */
export interface ChandrasekharInputs {
  /** Mean molecular weight per electron μ_e (2 for carbon/oxygen white dwarfs). */
  readonly mu_e: number;
}
/** @internal */
export interface ChandrasekharResult {
  readonly mu_e: number;
  /** Chandrasekhar mass (kg). */
  readonly M_Ch_kg: number;
  /** Chandrasekhar mass in solar masses. */
  readonly M_Ch_solar: number;
}

/**
 * Evaluate the Chandrasekhar mass for a mean molecular weight per electron.
 *
 * @internal
 */
export function evaluateChandrasekharMass({ mu_e }: ChandrasekharInputs): ChandrasekharResult {
  if (!Number.isFinite(mu_e) || mu_e <= 0) {
    throw new Error('evaluateChandrasekharMass: mu_e must be a positive mean molecular weight');
  }
  const prefactor = (LANE_EMDEN_OMEGA3 * Math.sqrt(3 * Math.PI)) / 2;
  const M_Ch_kg = prefactor * Math.pow((HBAR_SI * C_SI) / G_SI, 1.5) * Math.pow(mu_e * M_U_SI, -2);
  return { mu_e, M_Ch_kg, M_Ch_solar: M_Ch_kg / M_SUN_SI };
}
