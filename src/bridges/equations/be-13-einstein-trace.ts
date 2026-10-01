/**
 * Bridge Equation 13 — Einstein trace reduction.
 *
 *   R = 4Λ - (8π G / c⁴) T
 *
 * The scalar trace of the full tensor Einstein equation
 *   R_μν - (1/2) R g_μν + Λ g_μν = (8π G / c⁴) T_μν
 * obtained by contracting with g^μν. In d=4: g^μν g_μν = 4, so
 * g^μν R_μν = R, g^μν · (1/2) R g_μν = 2R, g^μν · Λ g_μν = 4Λ,
 * and g^μν T_μν = T (the trace of stress-energy). Algebraically:
 *   R - 2R + 4Λ = (8πG/c⁴) T
 *   -R + 4Λ = (8πG/c⁴) T
 *   R = 4Λ - (8πG/c⁴) T
 *
 * The Jacobson thermodynamic interpretation (Einstein equations as a
 * macroscopic equation of state, derived from δQ = T dS on local
 * Rindler horizons) is preserved as the bridge framing; the trace
 * is the scalar AST-encodable form.
 *
 * Reference: Jacobson 1995 *Phys. Rev. Lett.* 75:1260
 * (arXiv:gr-qc/9504004; canonical thermodynamic-derivation framing);
 * Einstein 1915 *Sitzungsber. Preuss. Akad. Wiss. Berlin* 778
 * (canonical Einstein field equations); MTW *Gravitation* §17.4
 * (trace of Einstein equations).
 *
 * Status: speculative.
 *
 * Honest-claude scope notes:
 *   - The trace equation R = 4Λ - (8πG/c⁴)T is canonical GR (textbook
 *     content, Carroll *Spacetime and Geometry* §4.7). The bridge
 *     framing — Jacobson thermodynamic origin as a UPT
 *     information-physics bridge — is the speculative element.
 *   - Vacuum (T=0, Λ=0): R=0. Pure cosmological constant (T=0):
 *     R = 4Λ. Matter-dominated FRW with T = ρc² (matter trace):
 *     R = 4Λ - (8πG/c⁴)·ρc² = 4Λ - 8πGρ/c² (textbook).
 *   - Dim: [R] = [L⁻²] (Ricci scalar); [Λ] = [L⁻²]; [T] = energy
 *     density = [M L⁻¹ T⁻²]; [8πG/c⁴] = [L³M⁻¹T⁻²]/[L⁴T⁻⁴] =
 *     [L⁻¹M⁻¹T²]; [(8πG/c⁴)·T] = [L⁻¹M⁻¹T²]·[ML⁻¹T⁻²] = [L⁻²] ✓.
 *
 * v0.7 BE-X re-encoding (per docs/architecture/archive/v0.7-be-x-reencoding-design-note.md
 * §"BE-13 — TensorTraceNode for the Einstein trace"):
 *
 *   The `T_trace` stub in `BE13_EINSTEIN_TRACE_RHS` is now supplemented by
 *   `BE13_T_TRACE_NODE` — a structural `TensorTraceNode` that makes explicit
 *   that `T = g^μν T_μν` is a metric contraction of the stress-energy tensor,
 *   not an opaque dimensioned scalar. Both the stub form (backward-compatible,
 *   embeddable in `ExprNode` ASTs) and the structural form (richer type
 *   information, validates via `validateTensorTrace`) are exported.
 *
 *   `BE13_EINSTEIN_TRACE_RHS` is unchanged (backward compatibility). The
 *   structural form is exposed via the separate `BE13_T_TRACE_NODE` export.
 *   See the "BE-13 structural TensorTraceNode" section below.
 *
 * @see docs/specification/Part-I.md ("Bridge Equation 13: Einstein trace reduction")
 * @see src/bridges/index.ts BRIDGE_EQUATIONS.find(e => e.id === 13)
 * @module bridges/equations/be-13-einstein-trace
 */

import type { ExprNode, DimensionValidationReport } from '../../dimensional/validator.js';
import {
  Dimension,
  DIMENSIONLESS,
} from '../../dimensional/types.js';
import { c as DIM_c, G as DIM_G } from '../../dimensional/constants.js';
import { PhysicalConstants } from '../../core/types.js';
import type { TensorTraceNode } from '../../dimensional/tensor-trace.js';
import type { StressEnergyTensorNode } from '../../dimensional/stress-energy-validators.js';
import { sym, validateFiniteInputs, validateBEDimensions } from './_be-helpers.js';

/** [L⁻²] — Ricci scalar dimension. Hand-built literal (rather than
 * `power(LENGTH, -2)`) because `power()` produces `-0` on unaffected
 * bases, which compares unequal under deep-strict equality even though
 * dimensionally identical. Same pattern as BE-23's RESISTIVITY and
 * BE-31's INV_LENGTH_2.
 */
export const RICCI_SCALAR_DIM: Dimension = {
  L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0,
};

/** [M L⁻¹ T⁻²] — energy density (stress-energy trace dimension). */
const ENERGY_DENSITY_DIM: Dimension = {
  L: -1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0,
};

/**
 * RHS of the trace of Einstein equations:
 *   R = 4Λ - (8πG / c⁴) T
 *
 * Encoded as `4·Λ + (-1)·(8π·G·T/c⁴)`. The unary minus is captured by
 * a dimensionless `-1` symbol stub (same pattern as BE-39).
 */
export const BE13_EINSTEIN_TRACE_RHS: ExprNode = {
  kind: 'op', op: '+',
  args: [
    {
      // 4 · Λ
      kind: 'op', op: '*',
      args: [
        sym('4', DIMENSIONLESS),
        sym('Lambda', RICCI_SCALAR_DIM),
      ],
    },
    {
      // -1 · (8π · G · T / c⁴)
      kind: 'op', op: '*',
      args: [
        sym('-1', DIMENSIONLESS),
        {
          kind: 'op', op: '/',
          args: [
            {
              kind: 'op', op: '*',
              args: [
                sym('8pi', DIMENSIONLESS),
                sym('G', DIM_G),
                sym('T_trace', ENERGY_DENSITY_DIM),
              ],
            },
            {
              kind: 'op', op: '^',
              args: [sym('c', DIM_c), sym('4', DIMENSIONLESS)],
            },
          ],
        },
      ],
    },
  ],
};

/** LHS: Ricci scalar R has dimension [L⁻²]. */
/** @internal */
export const BE13_EINSTEIN_TRACE_LHS: ExprNode = sym('R_ricci', RICCI_SCALAR_DIM);

// --- BE-13 structural TensorTraceNode (v0.7 BE-X re-encoding) ---

/**
 * The stress-energy tensor T_μν used in the BE-13 trace.
 *
 * Rank-2 lower-lower, symmetric, component dim [M L⁻¹ T⁻²] (energy density).
 * This is the `T_μν` input to the `BE13_T_TRACE_NODE` contraction.
 *
 * @public
 */
export const BE13_STRESS_ENERGY_NODE: StressEnergyTensorNode = {
  kind: 'stress-energy',
  symbol: 'T',
  indices: [
    { label: 'mu', variance: 'lower' },
    { label: 'nu', variance: 'lower' },
  ],
  symmetry: 'symmetric',
  componentDim: ENERGY_DENSITY_DIM,
};

/**
 * Structural `TensorTraceNode` for `T = g^μν T_μν` — the stress-energy trace
 * appearing in BE-13's scalar relation `R = 4Λ - (8πG/c⁴) T`.
 *
 * This structural form replaces the stub `sym('T_trace', ENERGY_DENSITY_DIM)` in
 * `BE13_EINSTEIN_TRACE_RHS` by making explicit that `T` arises from contracting
 * the stress-energy tensor with the inverse metric. Validate via
 * `validateTensorTrace(BE13_T_TRACE_NODE)` from
 * `src/dimensional/tensor-trace.ts`.
 *
 * Note: `TensorTraceNode` is not yet part of the `ExprNode` union, so this
 * node cannot be embedded directly in the scalar `ExprNode` AST of
 * `BE13_EINSTEIN_TRACE_RHS`. `BE13_EINSTEIN_TRACE_RHS` is kept unchanged
 * for backward compatibility; this export provides structural content for
 * consumers that want to inspect the trace operation explicitly.
 *
 * @public
 */
export const BE13_T_TRACE_NODE: TensorTraceNode = {
  kind: 'tensor-trace',
  tensor: BE13_STRESS_ENERGY_NODE,
  metric: {
    kind: 'metric-tensor',
    name: 'g_inv',
    indices: [
      { label: 'mu', variance: 'upper' },
      { label: 'nu', variance: 'upper' },
    ],
    signature: '+,-,-,-',
    dim: DIMENSIONLESS,
  },
};

// --- Numerical evaluator ---

/**
 * @internal — typed-arg shape for the file-local `evaluateEinsteinTrace` function; not in the v0.7 public surface. See `docs/architecture/archive/v0.7-be-module-exports-audit.md` §4.
 */
interface EinsteinTraceInputs {
  /** Cosmological constant Λ (m⁻²). Must be finite. */
  Lambda_per_m2: number;
  /**
   * Trace of stress-energy tensor T = g^μν T_μν (energy density,
   * J/m³ = kg/(m·s²)). For matter dominance T ≈ ρ c² (positive). For
   * vacuum T = 0. Must be finite.
   */
  T_trace_J_per_m3: number;
}

/**
 * Evaluate the trace of Einstein equations
 *
 *   R = 4Λ - (8π G / c⁴) T
 *
 * @returns Ricci scalar R in m⁻².
 */
export function evaluateEinsteinTrace(input: EinsteinTraceInputs): number {
  validateFiniteInputs(
    input,
    [
      { name: 'Lambda_per_m2' },
      { name: 'T_trace_J_per_m3' },
    ],
    'evaluateEinsteinTrace',
  );
  const { Lambda_per_m2, T_trace_J_per_m3 } = input;
  const { c, G } = PhysicalConstants;
  const c4 = c * c * c * c;
  return 4 * Lambda_per_m2 - (8 * Math.PI * G * T_trace_J_per_m3) / c4;
}

// --- Self-validation ---

/**
 * Run the AST through the dimensional analyzer; both sides should be
 * [L⁻²] (Ricci scalar).
 */
/** @internal */
export function validateBE13Dimensions(): DimensionValidationReport {
  return validateBEDimensions(BE13_EINSTEIN_TRACE_LHS, BE13_EINSTEIN_TRACE_RHS, 'BE13');
}
