/**
 * SI dimensional signatures of a few fundamental constants, projected from
 * the constant registry (`symbolic-constants.ts`), which derives each
 * dimension from the constant's SI unit. Values live in `core/constants.ts`.
 * Only the names the tests read are projected; a projection nothing reads is
 * a second copy of a registry row, and `constantRecord(name).dim` is the
 * owner (`G` and `e` were withdrawn for that reason).
 *
 * @module dimensional/constants
 */

import { LENGTH, type Dimension } from './types.js';
import { constantRecord } from './symbolic-constants.js';

const of = (name: string): Dimension => constantRecord(name)!.dim;

/** Reduced Planck constant ℏ — action [M L^2 T^-1]. */
export const hbar: Dimension = of('hbar');

/** Speed of light c — velocity [L T^-1]. */
export const c: Dimension = of('c');

/** Boltzmann constant k_B — energy / temperature [M L^2 T^-2 Θ^-1]. */
export const k_B: Dimension = of('k_B');

/** Planck length ℓ_P — [L]. */
export const l_P: Dimension = LENGTH;
