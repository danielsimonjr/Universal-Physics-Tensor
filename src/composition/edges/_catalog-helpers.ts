/**
 * Shared builders/constants for the domain-split catalog edge files
 * (`catalog-{quantum,gravitation-cosmology,fields,condensed-matter}.ts`).
 * Extracted verbatim from the former `catalog-full.ts` god-file.
 *
 * @module composition/edges/_catalog-helpers
 */

import type { ExprNode } from '../../dimensional/validator.js';
import type { Dimension } from '../../dimensional/types.js';
import { LENGTH, TEMPERATURE, DIMENSIONLESS } from '../../dimensional/types.js';

export const isFin = Number.isFinite;

// --- Symbolic forms (v0.24 — clean-monomial bridges for the identity-consequence
// surfacer). Leaves are source-quantity names + CONSTANTS tokens; dims match the
// Quantity/CONSTANTS dim. Drift-guarded against `evaluate` in
// symbolic-composition.test.ts (SYMBOLIC_EDGES). ---
const symN = (name: string, dim: Dimension): ExprNode => ({ kind: 'symbol', name, dim });

const ENERGY_DIM: Dimension = { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

const VELOCITY_DIM: Dimension = { L: 1, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };

const GRAV_DIM: Dimension = { L: 3, M: -1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

const LAMBDA_CURV_DIM: Dimension = { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

/** m_dark = yukawa-coupling · vacuum-expectation-value (g·v). */
export const BE18_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '*',
  args: [symN('yukawa-coupling', DIMENSIONLESS), symN('vacuum-expectation-value', ENERGY_DIM)],
};

/** ρ_Λ = c²·cosmological-constant-curvature / (8π·G). */
export const BE20_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '/',
  args: [
    {
      kind: 'op',
      op: '*',
      args: [
        { kind: 'op', op: '^', args: [symN('c', VELOCITY_DIM), symN('2', DIMENSIONLESS)] },
        symN('cosmological-constant-curvature', LAMBDA_CURV_DIM),
      ],
    },
    { kind: 'op', op: '*', args: [symN('8pi', DIMENSIONLESS), symN('G', GRAV_DIM)] },
  ],
};

/**
 * BE-33 Hertz-Millis correlation length: (reference-correlation-length,
 * temperature, reference-temperature, static-exponent-nu, dynamic-exponent-z) →
 * ξ(T) = ξ_0 (T/T_0)^(−1/z). Wraps `evaluateHertzMillis` (SI; returns m). The
 * evaluator's `nu` is retained for API stability but does not enter the
 * formula. Reuses the canonical `temperature` node.
 *
 * Root-reachable via the {@link CATALOG_FULL_EDGES} array (one root
 * export for the 26-edge tranche — root-surface budget decision).
 */
/**
 * Faithful Hertz-Millis correlation length ξ_0·(T/T_0)^(−1/z) as a composition
 * `symbolic` form (v0.13 — symbolic exponents). The exponent −1/z is
 * input-dependent on the DIMENSIONLESS base T/T_0, which the literal-exponent
 * grammar could not express (the catalog AST `BE33_HERTZ_MILLIS_RHS` pins z=1
 * with a literal `^(-1)`; it is left UNCHANGED). Leaves are graph-quantity
 * names; drift-guarded against `evaluateHertzMillis`. BE-33 composes with
 * nothing — this is a demonstration of the now-expressible faithful encoding.
 */
/** δS_EE = δ⟨H_R⟩. The evaluator returns its one input. */
export const BE30_SYMBOLIC: ExprNode = symN('modular-hamiltonian-variation', DIMENSIONLESS);

/** (c_GW − c) / c. */
export const BE36_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '/',
  args: [
    {
      kind: 'op',
      op: '-',
      args: [symN('gravitational-wave-speed', VELOCITY_DIM), symN('c', VELOCITY_DIM)],
    },
    symN('c', VELOCITY_DIM),
  ],
};

export const BE33_HERTZ_MILLIS_SYMBOLIC: ExprNode = {
  kind: 'op',
  op: '*',
  args: [
    symN('reference-correlation-length', LENGTH),
    {
      kind: 'op',
      op: '^',
      args: [
        { kind: 'op', op: '/', args: [symN('temperature', TEMPERATURE), symN('reference-temperature', TEMPERATURE)] },
        { kind: 'op', op: '/', args: [symN('-1', DIMENSIONLESS), symN('dynamic-exponent-z', DIMENSIONLESS)] },
      ],
    },
  ],
};
