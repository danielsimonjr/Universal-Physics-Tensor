/**
 * Every registered atlas family, in the order they were built.
 *
 * Gates that must cover the WHOLE atlas (the evidence rule, admission, the
 * JSON artifacts) iterate this list rather than naming one family, so a new
 * family is checked the moment it is registered here. A gate that named
 * `OSCILLATOR_FAMILY` directly would pass forever over a family it never read.
 *
 * Registration IS admission: every bridge of every family passes
 * `admitApproximation` here, at module load, so an approximation without a
 * horizon or a `deltaAt` cannot reach the registry, the JSON export or the
 * CLI. The sentence that the gate ran only inside
 * `tests/atlas/regime-admission.test.ts` is the record from before this
 * call.
 *
 * @module atlas/families
 */

import { DIFFUSION_FAMILY } from './diffusion/index.js';
import { OSCILLATOR_FAMILY } from './oscillators/index.js';
import { WAVES_FAMILY } from './waves/index.js';
import type { AtlasFamily } from './family.js';
import { admitApproximation } from './regime.js';

/**
 * Admit every bridge of every family, in order, and return the same list.
 *
 * @throws MissingHorizonError or MissingDeltaAtError from
 *   {@link admitApproximation} on the first bridge that fails; the family
 *   objects are returned unchanged otherwise, so identity is preserved for
 *   callers that import a family directly.
 * @internal
 */
export function admitFamilies(families: readonly AtlasFamily[]): readonly AtlasFamily[] {
  for (const family of families) for (const bridge of family.bridges) admitApproximation(bridge);
  return families;
}

/** All atlas families, admitted. @internal */
export const ATLAS_FAMILIES: readonly AtlasFamily[] = admitFamilies([
  OSCILLATOR_FAMILY,
  DIFFUSION_FAMILY,
  WAVES_FAMILY,
]);
