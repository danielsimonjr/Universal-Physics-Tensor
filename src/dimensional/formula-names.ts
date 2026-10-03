/**
 * Names a formula may use that are not leaves of {@link CONSTANTS}.
 *
 * Spreading these into `CONSTANTS` would bake them into the canonical graph
 * (`CANONICAL_CONSTANTS` spreads that table). They are an overlay for
 * dimensional assignment and for `upt eval` only.
 *
 * @module dimensional/formula-names
 */

import type { Dimension } from './types.js';
import { CHARGE, DIMENSIONLESS, LENGTH, MASS } from './types.js';
import { C_SI, E_SI, FARADAY_SI, M_E_SI, M_PROTON_SI, N_A_SI } from '../core/constants.js';

const PERMITTIVITY: Dimension = { L: -3, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 };
/** μ₀ = 1/(ε₀ c²), [M L T⁻² I⁻²]. */
const PERMEABILITY: Dimension = { L: 1, M: 1, T: -2, I: -2, Theta: 0, N: 0, J: 0 };
/** N_A — [N⁻¹]. */
const PER_AMOUNT: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: -1, J: 0 };
/** Faraday constant — charge per amount, [T I N⁻¹]. */
const FARADAY: Dimension = { L: 0, M: 0, T: 1, I: 1, Theta: 0, N: -1, J: 0 };

/** Vacuum permittivity, the same CODATA value `CONSTANTS.epsilon_0` holds. */
export const EPS0_SI = 8.8541878128e-12;
/** Vacuum permeability from ε₀ and the exact c. */
export const MU0_SI = 1 / (EPS0_SI * C_SI * C_SI);

/** One formula-only name. @internal */
export interface FormulaName {
  readonly name: string;
  readonly dim: Dimension;
  readonly value: number;
}

/**
 * Overlay names. `eps0` is rewritten to the constant `epsilon_0` before parse,
 * so it is not listed here. `curvature_k` and `scale_factor` are the Friedmann
 * curvature extension (the frozen `CE-friedmann` entry is the flat term).
 * @internal
 */
export const FORMULA_NAMED: readonly FormulaName[] = [
  { name: 'm_e', dim: MASS, value: M_E_SI },
  { name: 'electron_mass', dim: MASS, value: M_E_SI },
  { name: 'e_charge', dim: CHARGE, value: E_SI },
  { name: 'mu_0', dim: PERMEABILITY, value: MU0_SI },
  { name: 'm_p', dim: MASS, value: M_PROTON_SI },
  { name: 'm_proton', dim: MASS, value: M_PROTON_SI },
  { name: 'N_A', dim: PER_AMOUNT, value: N_A_SI },
  { name: 'F', dim: FARADAY, value: FARADAY_SI },
  { name: 'curvature_k', dim: DIMENSIONLESS, value: 0 },
  { name: 'scale_factor', dim: LENGTH, value: 1 },
];

/** Name → dimension for the formula overlay. Does not override a catalog entry. @internal */
export function formulaNameDimensions(): ReadonlyMap<string, Dimension> {
  return new Map(FORMULA_NAMED.map((n) => [n.name, n.dim]));
}
