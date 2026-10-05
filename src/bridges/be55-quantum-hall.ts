/**
 * Bridge Equation 55 — Integer Quantum Hall effect / TKNN (topology ↔ transport).
 *
 * The Hall conductance of a 2D electron gas in a strong magnetic field is
 * quantized in integer multiples of e²/h:
 *
 *     σ_xy = C · e²/h,
 *
 * where C is an integer — the TKNN invariant (Thouless-Kohmoto-Nightingale-den
 * Nijs, 1982), a topological (Chern) number of the filled Landau/Bloch bands.
 * Equivalently the Hall RESISTANCE is quantized, R_H = R_K / C, with the von
 * Klitzing constant R_K = h/e² (≈ 25 812.807 Ω). The quantization is
 * material-INDEPENDENT — a topological invariant, not a material property — which
 * is the empirically striking content (confirmed to ~1×10⁻¹⁰ across graphene vs
 * GaAs/AlGaAs; see `be55-quantum-hall-confrontation.ts`).
 *
 * This bridge populates the rank-6 tensor's **Topology** axis: a topological
 * invariant (Chern number) fixes an electrical-transport observable. Discovered
 * by von Klitzing 1980 (Nobel 1985); topological interpretation TKNN 1982.
 *
 * Closed-form evaluator (BE-51/52 pattern; no AST round-trip). Dimensional
 * signature: σ_xy is an electrical conductance [I² T³ M⁻¹ L⁻²].
 *
 * @module bridges/be55-quantum-hall
 */
import { H_SI, E_SI } from '../core/constants.js';

/** The von Klitzing constant R_K = h/e² (Ω). Post-2019 SI: exact. @public */
export const VON_KLITZING_SI = H_SI / (E_SI * E_SI);

/** Inputs for the quantized Hall conductance/resistance. @internal */
export interface QuantumHallInputs {
  /** The integer TKNN/Chern number C (Hall plateau index / filling factor). */
  readonly C: number;
}

/** Result of evaluating the integer quantum Hall relation. @internal */
export interface QuantumHallResult {
  readonly C: number;
  /** Hall conductance σ_xy = C·e²/h (siemens, S). */
  readonly sigma_xy_S: number;
  /** Hall resistance R_H = R_K/C = h/(C·e²) (ohm, Ω). */
  readonly R_H_ohm: number;
  /** The von Klitzing constant R_K = h/e² (ohm, Ω). */
  readonly R_K_ohm: number;
}

/**
 * Evaluate the integer quantum Hall relation for plateau index (Chern number) C.
 *
 * @internal
 */
export function evaluateQuantumHall({ C }: QuantumHallInputs): QuantumHallResult {
  if (!Number.isInteger(C) || C === 0) {
    throw new Error(
      'evaluateQuantumHall: C must be a nonzero integer (TKNN/Chern number)',
    );
  }
  const R_K_ohm = VON_KLITZING_SI;
  return {
    C,
    sigma_xy_S: (C * E_SI * E_SI) / H_SI,
    R_H_ohm: R_K_ohm / C,
    R_K_ohm,
  };
}
