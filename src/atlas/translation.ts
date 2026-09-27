/**
 * A bridge's declared translation of its bound's quantity into ANOTHER
 * observable (CLI audit §14 item 8).
 *
 * A bound is stated in one norm. A user asking for a tolerance in a different
 * observable is asking a different question, and the answer is only as good
 * as the map between the two. So the map is a record of its own: declared per
 * bridge, with its derivation, its premises, what it does NOT cover, and its
 * own witnesses. Its evidence is derived from those witnesses and is never the
 * bound's: a translation that rests on a numerically-supported check does not
 * inherit a proof the bound's transformation may carry, and it carries no
 * `formalRef`.
 *
 * Both maps take the bound's own quantity as an argument, so the same
 * translation serves the point value (`deltaAt`) and the domain supremum
 * (`delta`). That is sound only when the translated error is monotone
 * non-decreasing in the bound's quantity, which `derivation` must state.
 *
 * @module atlas/translation
 * @internal
 */

import type { Witness } from './types.js';
import type { NumericWitnessSpec } from './witness-numeric.js';

/** @internal */
export interface ObservableTranslation {
  /** The `AtlasBridge.id` whose bound is translated. */
  readonly bridgeId: string;
  /** `'phase'` — the name a `--tolerance=<observable>:EPS` request uses. */
  readonly observable: string;
  /** Unit of the translated error and of a tolerance on it. */
  readonly unit: string;
  /** Must equal the bridge's `bound.norm`: the quantity the maps consume. */
  readonly fromNorm: string;
  /** What the observable is, precisely enough to measure it. */
  readonly definition: string;
  /** How the maps follow from the bound's quantity, and why the supremum may be passed. */
  readonly derivation: string;
  /** Conditions the derivation assumes and nothing here checks. */
  readonly premises: readonly string[];
  /** Point parameters the maps need beyond the bound's own (`'T0'`). */
  readonly parameters: readonly string[];
  /** The unit an observation time is read in. */
  readonly timeUnit: string;
  /** The accumulated error in `observable` at time `t`, given the bound's value. */
  readonly errorAt: (boundValue: number, t: number, params: Readonly<Record<string, number>>) => number;
  /** The time at which the accumulated error reaches `tolerance`; `Infinity` if it never does. */
  readonly horizonFor: (boundValue: number, tolerance: number, params: Readonly<Record<string, number>>) => number;
  /** Which side of the horizon is adequate, stated. */
  readonly boundary: string;
  /** Observables this translation is NOT a bound on. */
  readonly notCovered: readonly string[];
  readonly witnesses: readonly Witness[];
  /** The executable form of each numeric witness, run on request. */
  readonly checks: readonly NumericWitnessSpec[];
}
