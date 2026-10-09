/**
 * Wave-family assembly (Atlas Phase 4, S4.5).
 *
 * Assembly only: this module defines no physics and no numbers of its own.
 *
 * @module atlas/waves
 */

import type { AtlasFamily } from '../family.js';
import { WAVE_BRIDGES } from './bridges.js';
import { WAVE_CLOSURE_BRIDGES } from './bridges-closure.js';
import { WAVE_MODELS, WAVES_FAMILY_NAME } from './models.js';

/**
 * The wave family: seven models and seven bridges (four from S4.5, three from
 * the Sprint 4 closure), no rejections. Several bridges end in other families.
 *
 * @internal
 */
export const WAVES_FAMILY: AtlasFamily = {
  family: WAVES_FAMILY_NAME,
  models: WAVE_MODELS,
  bridges: [...WAVE_BRIDGES, ...WAVE_CLOSURE_BRIDGES],
  rejections: [],
};
