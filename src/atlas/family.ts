/**
 * The shape of one atlas family. A leaf module: every family index, the
 * registry (`families.ts`), the serializer and the exporters import the type
 * from here, so no family's index is the owner of a type the others share.
 * The sentence that `AtlasFamily` was declared in `oscillators/index.ts` and
 * imported from there by the other families is the record from before this
 * module.
 *
 * @module atlas/family
 */

import type { AtlasModel } from './model.js';
import type { AtlasBridge, AtlasRejection } from './types.js';

/**
 * One atlas family: its models, the bridges between them, and the claimed
 * bridges that were refuted. A rejection is evidence, not an omission, so it
 * travels with the family rather than being dropped.
 *
 * @internal
 */
export interface AtlasFamily {
  /** `'oscillators'`. */
  readonly family: string;
  readonly models: readonly AtlasModel[];
  readonly bridges: readonly AtlasBridge[];
  readonly rejections: readonly AtlasRejection[];
}
