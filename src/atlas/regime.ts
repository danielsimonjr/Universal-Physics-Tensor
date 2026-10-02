/**
 * Regime admission, and the re-export of the vocabulary half.
 *
 * `deriveRegimeGroups`, `regimeHolds`, and the regime algebra live in
 * `src/relations/regime.ts`. `admitApproximation` stays here because it is
 * generic over `AtlasBridge`.
 *
 * @module atlas/regime
 */

export {
  collidingRegimeGroups,
  deriveRegimeGroups,
  intersectRegimes,
  regimeOverlap,
  uncoveredRegions,
} from '../relations/regime.js';
export type { RegimeBearing, RegimeOverlap, RegionSample } from '../relations/regime.js';

import { regimeHolds as regimeHoldsValue } from '../relations/regime.js';
import type { AtlasBridge } from './types.js';
import { MissingDeltaAtError, MissingHorizonError } from './types.js';

/** Whether a regime's inequalities were satisfied, violated, or could not be checked. @public */
export type RegimeCheck = import('../relations/regime.js').RegimeCheck;

/** Check a regime at supplied group values. A missing coordinate is unknown, not a pass. @public */
export const regimeHolds = regimeHoldsValue;

/**
 * Admit a bridge, refusing an approximation whose horizon is missing.
 *
 * The gate is at ADMISSION, matching the existing throw in `makeApproximation`,
 * and for the same reason: a validator that runs "later" can be skipped, and an
 * unhorizoned bound that reached the atlas would be a bound claiming to hold
 * everywhere. The move-the-gate-to-use argument of design note §2 applies to
 * `uniformity` — a field whose absence is a legitimate NOT-YET-ANALYSED state
 * — and NOT to `horizon`, which `ApproximationBound` already mandates.
 *
 * Any relation may carry a `bound`; every bound present is checked, so a
 * `coarse-graining` cannot smuggle in an unhorizoned one.
 *
 * @returns the bridge, unchanged, so this can wrap a record at its definition.
 * The same argument applies to `deltaAt`, the machine form of `delta`, and is
 * why it is checked here beside the horizon. `delta` alone is a single number
 * for a whole domain: an implementer whose bound depends on a parameter can
 * only freeze it at one point, and a frozen point reads exactly like a
 * supremum. Requiring the machine form makes the dependence SAYABLE, so the
 * scalar can be held to its stated meaning. It is required only of an
 * `approximation`, matching `bound` itself; a `coarse-graining` may still
 * carry a constant bound with no `deltaAt`.
 *
 * @throws MissingHorizonError if an `approximation` has no bound, or if a
 *   present bound has an empty `horizon` or no `horizonHolds`.
 * @throws MissingDeltaAtError if an `approximation` bound has no `deltaAt`.
 * @internal
 */
export function admitApproximation<T extends AtlasBridge>(bridge: T): T {
  const { bound } = bridge;
  if (bound === undefined) {
    if (bridge.relation === 'approximation') {
      throw new MissingHorizonError(
        `${bridge.id}: an approximation requires a bound carrying a horizon`,
      );
    }
    return bridge;
  }
  if (bound.horizon.trim() === '') {
    throw new MissingHorizonError(
      `${bridge.id}: an approximation bound requires a non-empty prose horizon`,
    );
  }
  if (typeof bound.horizonHolds !== 'function') {
    throw new MissingHorizonError(
      `${bridge.id}: an approximation bound requires a machine horizonHolds beside its prose horizon`,
    );
  }
  if (bridge.relation === 'approximation' && typeof bound.deltaAt !== 'function') {
    throw new MissingDeltaAtError(
      `${bridge.id}: an approximation bound requires a machine deltaAt beside its scalar delta, ` +
        'which must be the supremum over the whole declared domain',
    );
  }
  return bridge;
}
