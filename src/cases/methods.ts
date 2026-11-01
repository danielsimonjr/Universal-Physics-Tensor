/**
 * Numeric methods and case runners for applied cases.
 *
 * @module cases/methods
 */
export {
  MAX_DISPLACEMENT_RATIO,
  MAX_MFP_RATIO,
  MAX_OMEGA_TAU,
  MIN_THICKNESS_RATIO,
  maxwellDepthFactor,
  SKIN_DEPTH_CASE,
} from './skin-depth.js';
export {
  JULIAN_YEAR_S,
  MAX_MASS_RATIO,
  MAX_RADIUS_RATIO,
  MAX_WEAK_FIELD,
  MAX_APSIDAL_MISFIT,
  KEPLER_RV_CASE,
} from './kepler-rv.js';
export {
  MIN_Q_LORENTZIAN,
  MAX_RESOLUTION_RATIO,
  MAX_THERMAL_RATIO,
  windowedLinewidthHz,
  DAMPED_RESONATOR_CASE,
} from './damped-resonator.js';
export {
  CLASSICAL_MAX_X,
  FLAT_BAND_MAX_WRC,
  AMPLIFIER_MAX_REL_SIGMA,
  RESISTOR_NOISE_CASE,
} from './resistor-noise.js';
export {
  MAX_BIOT,
  MAX_RADIATION_RATIO,
  lumpedRadiatingTemperature,
  sphereEigenvalues,
  sphereSeries,
  LUMPED_COOLING_CASE,
  type LumpedRadiating,
} from './lumped-cooling.js';
export {
  G_STANDARD,
  MAX_RE,
  MAX_TAU_P_RATIO,
  MAX_MEMORY_CORRECTION,
  MAX_DRIFT_RATIO,
  MAX_WALL_CORRECTION,
  MAX_FAXEN_LAST_TERM,
  MAX_WALL_EXCURSION,
  ballisticDeficit,
  hydrodynamicMsdRatio,
  faxenParallel,
  brennerPerpendicular,
  BROWNIAN_SPHERE_CASE,
} from './brownian-sphere.js';

import { maxwellDepthFactor } from './skin-depth.js';
import { windowedLinewidthHz } from './damped-resonator.js';
import { lumpedRadiatingTemperature, sphereEigenvalues, sphereSeries } from './lumped-cooling.js';
import {
  ballisticDeficit,
  brennerPerpendicular,
  faxenParallel,
  hydrodynamicMsdRatio,
  BROWNIAN_SPHERE_CASE,
} from './brownian-sphere.js';
import { DAMPED_RESONATOR_CASE } from './damped-resonator.js';
import { KEPLER_RV_CASE } from './kepler-rv.js';
import { LUMPED_COOLING_CASE } from './lumped-cooling.js';
import { RESISTOR_NOISE_CASE } from './resistor-noise.js';
import { SKIN_DEPTH_CASE } from './skin-depth.js';
import type { AppliedCase } from './types.js';

/** Case id → case object. @internal */
export const APPLIED_CASE_RUNNERS: ReadonlyMap<string, AppliedCase> = new Map([
  [RESISTOR_NOISE_CASE.id, RESISTOR_NOISE_CASE],
  [BROWNIAN_SPHERE_CASE.id, BROWNIAN_SPHERE_CASE],
  [DAMPED_RESONATOR_CASE.id, DAMPED_RESONATOR_CASE],
  [SKIN_DEPTH_CASE.id, SKIN_DEPTH_CASE],
  [LUMPED_COOLING_CASE.id, LUMPED_COOLING_CASE],
  [KEPLER_RV_CASE.id, KEPLER_RV_CASE],
]);

/** Names exported numeric methods for catalog validation. @internal */
export const CASE_METHOD_NAMES: ReadonlySet<string> = new Set([
  'maxwellDepthFactor',
  'windowedLinewidthHz',
  'lumpedRadiatingTemperature',
  'sphereEigenvalues',
  'sphereSeries',
  'ballisticDeficit',
  'hydrodynamicMsdRatio',
  'faxenParallel',
  'brennerPerpendicular',
  'brownianSphereRegimeAt',
]);

/** Method registry for the catalog engine. @internal */
export const CASE_METHODS: Record<string, (...args: never[]) => unknown> = {
  maxwellDepthFactor,
  windowedLinewidthHz,
  lumpedRadiatingTemperature,
  sphereEigenvalues,
  sphereSeries,
  ballisticDeficit,
  hydrodynamicMsdRatio,
  faxenParallel,
  brennerPerpendicular,
};
