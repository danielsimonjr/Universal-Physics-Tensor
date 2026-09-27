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
 * A translation is either the error itself (`'exact'`) or an upper bound on
 * it (`'upper-bound'`). Past the horizon of an exact translation the error
 * exceeds the tolerance; past the horizon of an upper bound only the BOUND
 * does, and the error may still be within it — a caller must not report the
 * second as inadequate.
 *
 * A translation composes across a following bridge only through an
 * `ObservableCarriage` that bridge declares for the same observable. The
 * composition table is not consulted and not widened: a carriage is a claim
 * about one observable, not about the bound's norm.
 *
 * @module atlas/translation
 * @internal
 */

import type { Witness } from './types.js';
import type { DominanceWitnessSpec } from './witness-dominance.js';
import type { NumericWitnessSpec } from './witness-numeric.js';

/** An executable witness of either shape. @internal */
export type TranslationCheck = NumericWitnessSpec | DominanceWitnessSpec;

/** A witness run at the caller's point, with the control that shows it can fail there. @internal */
export interface PointCheck {
  /** What is checked at this point, in words, including the resolutions. */
  readonly claim: string;
  readonly check: TranslationCheck;
  /** The same measurement against a plausible wrong map. */
  readonly control: TranslationCheck;
  /** The wrong map the control uses. */
  readonly controlClaim: string;
}

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
  /** Whether `errorAt` is the error itself or an upper bound on it. */
  readonly errorKind: 'exact' | 'upper-bound';
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
  /**
   * The time at which the accumulated error reaches `tolerance`; `Infinity` if
   * it never does; `NaN` if undefined, including when `floor` already exceeds
   * the tolerance.
   */
  readonly horizonFor: (boundValue: number, tolerance: number, params: Readonly<Record<string, number>>) => number;
  /** The part of `errorAt` present at every t (its value at t = 0); absent when it is 0. */
  readonly floor?: (boundValue: number) => number;
  /** Which side of the horizon is adequate, stated. */
  readonly boundary: string;
  /** Observables this translation is NOT a bound on. */
  readonly notCovered: readonly string[];
  readonly witnesses: readonly Witness[];
  /** The executable form of each numeric witness, run on request. */
  readonly checks: readonly TranslationCheck[];
  /** The witness at the caller's point, bounded in cost, or why it cannot be run there. */
  readonly pointCheck: (boundValue: number) => PointCheck | { readonly unavailable: string };
}

/**
 * A bridge's declaration that its map carries an observable unchanged, so a
 * translation into that observable on an earlier step holds for the path
 * through it. Declared per bridge, with its own derivation and witnesses; a
 * bridge without one does not carry the observable, whatever its relation.
 *
 * @internal
 */
export interface ObservableCarriage {
  /** The bridge that carries. */
  readonly bridgeId: string;
  /** The observable carried: a translation's `observable`. */
  readonly observable: string;
  /** How the observable on the premise maps to the conclusion's. */
  readonly map: string;
  /** Why the map leaves the observable's error unchanged. */
  readonly derivation: string;
  /** Conditions the carriage assumes and nothing here checks. */
  readonly premises: readonly string[];
  /** How the observation time on the premise maps to the conclusion's clock. */
  readonly timeMap: string;
  readonly witnesses: readonly Witness[];
  readonly checks: readonly TranslationCheck[];
}
