/**
 * Dimension constants the oscillator pilot needs.
 *
 * Capacitance, inductance, resistance and the spring constant are the named
 * shapes of `src/dimensional/types.ts`, re-exported here so the family's
 * modules keep one import site; `tests/atlas/models.test.ts` asserts they are
 * those objects, not copies. `DAMPING` and `CUBIC_STIFFNESS` are this family's
 * own and are defined here.
 *
 * `FREQUENCY`, `MASS`, `LENGTH`, `VELOCITY` and `ACCELERATION` are importable
 * from `src/dimensional/types.ts` and are NOT re-exported here.
 *
 * @module atlas/oscillators/dimensions
 */

import { dim } from '../../dimensional/ast-builders.js';
import type { Dimension } from '../../dimensional/types.js';

/** Farad, henry, ohm and newton per metre: the named shapes of `dimensional/types.ts`. @internal */
export { CAPACITANCE, INDUCTANCE, RESISTANCE, SPRING_CONSTANT } from '../../dimensional/types.js';

/** `M T^-1` — the `b` of `m x'' + b x' + k x = 0`. @internal */
export const DAMPING: Dimension = dim(0, 1, -1);

/** `M L^-2 T^-2` — the `β` of `m x'' + k x + β x³ = 0`. @internal */
export const CUBIC_STIFFNESS: Dimension = dim(-2, 1, -2);
