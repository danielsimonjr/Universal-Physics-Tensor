/**
 * The Schwarzschild radius, once.
 *
 * `r_s = 2GM/c²` was written at five sites (the covariant eikonal, the
 * Painlevé–Gullstrand metric, the flat Christoffel closure and the metric
 * library twice), each with its own constants. One function holds the
 * formula; the constants default to the SI values and a caller that works
 * in other units passes its own.
 *
 * @module numerical/schwarzschild
 */

import { C_SI, G_SI } from '../core/constants.js';

/** `r_s = 2GM/c²` for a mass `M` (kg), with `G` and `c` in SI unless a caller passes its own. @internal */
export function schwarzschildRadius(M: number, G: number = G_SI, c: number = C_SI): number {
  return (2 * G * M) / (c * c);
}
