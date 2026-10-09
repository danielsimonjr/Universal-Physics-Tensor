/**
 * Diffusion-family assembly (Atlas Phase 4, S4.4).
 *
 * Assembly only: this module defines no physics and no numbers of its own.
 *
 * @module atlas/diffusion
 */

import type { AtlasFamily } from '../family.js';
import { DIFFUSION_BRIDGES } from './bridges.js';
import { DIFFUSION_CLOSURE_BRIDGES } from './bridges-closure.js';
import { DIFFUSION_FAMILY_NAME, DIFFUSION_MODELS } from './models.js';

/**
 * The diffusion family: eight models and eight bridges (three from S4.4, five
 * from the Sprint 4 closure), no rejections.
 *
 * @internal
 */
export const DIFFUSION_FAMILY: AtlasFamily = {
  family: DIFFUSION_FAMILY_NAME,
  models: DIFFUSION_MODELS,
  bridges: [...DIFFUSION_BRIDGES, ...DIFFUSION_CLOSURE_BRIDGES],
  rejections: [],
};
