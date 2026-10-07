/**
 * SI dimensional signatures of fundamental physical constants, projected
 * from the constant registry (`symbolic-constants.ts`), which derives each
 * dimension from the constant's SI unit. Values live in `core/constants.ts`.
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

/** Newton's gravitational constant G — [L^3 M^-1 T^-2]. */
export const G: Dimension = of('G');

/** Boltzmann constant k_B — energy / temperature [M L^2 T^-2 Θ^-1]. */
export const k_B: Dimension = of('k_B');

/** Elementary charge e — [T I] (coulombs). */
export const e: Dimension = of('e');

/** Planck length ℓ_P — [L]. */
export const l_P: Dimension = LENGTH;
