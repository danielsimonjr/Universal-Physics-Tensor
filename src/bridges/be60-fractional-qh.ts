/**
 * BE-60 — Fractional Quantum Hall effect (Laughlin): σ_xy = ν·e²/h at fractional
 * filling ν = p/q (q odd), e.g. the principal Laughlin state ν = 1/3.
 *
 * Unlike the integer QHE (BE-55, a single-particle topological effect), the
 * fractional plateaux are emergent TOPOLOGICAL ORDER of a strongly-correlated
 * electron liquid: the quasiparticle excitations carry FRACTIONAL charge e/3 and
 * obey ANYONIC exchange statistics. Tsui, Störmer & Gossard 1982 (Nobel 1998).
 *
 * The empirical content is the FRACTION (why exactly 1/3?), not R_K = h/e² (which
 * is post-2019-definitional); confronted accordingly. Adam/Eve vet 2026-07-05:
 * GREEN/GREEN (topology chern-fractional, statistics anyonic).
 *
 * @module bridges/be60-fractional-qh
 */
import { H_SI, E_SI } from '../core/constants.js';
import { VON_KLITZING_SI } from './be55-quantum-hall.js';

/** @internal */
export interface FractionalQHInputs {
  /** Filling fraction ν = p/q (e.g. 1/3). */
  readonly nu: number;
}
/** @internal */
export interface FractionalQHResult {
  readonly nu: number;
  /** Fractional Hall conductance σ_xy = ν·e²/h (siemens). */
  readonly sigma_xy_S: number;
  /** Fractional Hall resistance R_xy = R_K/ν = (q/p)·h/e² (ohms). */
  readonly R_xy_ohm: number;
}

/**
 * Evaluate the fractional-QH Hall conductance/resistance at filling ν.
 *
 * @internal
 */
export function evaluateFractionalQH({ nu }: FractionalQHInputs): FractionalQHResult {
  if (!Number.isFinite(nu) || nu <= 0) {
    throw new Error('evaluateFractionalQH: nu must be a positive filling fraction (e.g. 1/3)');
  }
  return {
    nu,
    sigma_xy_S: (nu * E_SI * E_SI) / H_SI,
    R_xy_ohm: VON_KLITZING_SI / nu,
  };
}
