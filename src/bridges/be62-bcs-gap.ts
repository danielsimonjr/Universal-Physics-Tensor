/**
 * BE-62 — BCS gap ratio: 2Δ(0)/(k_B T_c) = 2π/e^γ ≈ 3.528 (weak-coupling BCS),
 * i.e. Δ(0) = 1.764 k_B T_c.
 *
 * The universal weak-coupling relation between the T=0 superconducting gap and
 * the critical temperature — a parameter-free prediction of BCS theory.
 *
 * HONEST CONFRONTATION CAVEAT (Adam/Eve vet 2026-07-05, Eve YELLOW): 3.528 is the
 * WEAK-COUPLING limit. Real conventional superconductors range from a little below
 * 3.5 (Al) to ~5 (strong-coupling Pb) — the ratio is a consistency check across a
 * material class, not a tight test. The statistics axis tag was STRIPPED: the
 * broken-symmetry state is a BOSONIC Cooper condensate whose gap is the FERMIONIC
 * quasiparticle excitation energy — genuinely ambiguous (Adam fermionic, Eve
 * ambiguous), so no tag per the attribute-audit discipline.
 *
 * @module bridges/be62-bcs-gap
 */
import { K_B_SI } from '../core/constants.js';

/** Euler-Mascheroni constant γ. */
const EULER_GAMMA = 0.5772156649015329;
/** Weak-coupling BCS gap ratio 2Δ(0)/(k_B T_c) = 2π/e^γ ≈ 3.528. @public */
export const BCS_GAP_RATIO = (2 * Math.PI) / Math.exp(EULER_GAMMA);

/** @internal */
export interface BCSGapInputs {
  /** Superconducting critical temperature T_c (K). */
  readonly T_c_K: number;
}
/** @internal */
export interface BCSGapResult {
  readonly T_c_K: number;
  /** T=0 gap Δ(0) = (BCS_GAP_RATIO/2)·k_B·T_c (joules). */
  readonly gap_0_J: number;
  /** The universal weak-coupling ratio 2Δ(0)/(k_B T_c) ≈ 3.528. */
  readonly ratio_2gap_over_kTc: number;
}

/**
 * Evaluate the weak-coupling BCS gap Δ(0) for a critical temperature.
 *
 * @internal
 */
export function evaluateBCSGap({ T_c_K }: BCSGapInputs): BCSGapResult {
  if (!Number.isFinite(T_c_K) || T_c_K < 0) {
    throw new Error('evaluateBCSGap: T_c_K must be finite and non-negative');
  }
  return {
    T_c_K,
    gap_0_J: (BCS_GAP_RATIO / 2) * K_B_SI * T_c_K,
    ratio_2gap_over_kTc: BCS_GAP_RATIO,
  };
}
