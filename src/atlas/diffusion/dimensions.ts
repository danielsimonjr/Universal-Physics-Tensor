/**
 * Dimension constants the diffusion family needs: the named shapes of
 * `src/dimensional/types.ts`, under the names this family's modules use.
 * `tests/atlas/models.test.ts` asserts they are those objects, not copies.
 *
 * @module atlas/diffusion/dimensions
 */

import type { Dimension } from '../../dimensional/types.js';
import { MASS_DENSITY } from '../../dimensional/types.js';

/** m²/s, thermal conductivity W·m⁻¹·K⁻¹, and specific heat J·kg⁻¹·K⁻¹: the named shapes of `dimensional/types.ts`. @internal */
export { DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY } from '../../dimensional/types.js';

/** kg/m³, `L^-3 M`: `MASS_DENSITY`. @internal */
export const DENSITY: Dimension = MASS_DENSITY;
