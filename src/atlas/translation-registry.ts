/**
 * Every declared observable translation (`./translation.ts`), and every
 * bridge's declaration that it carries an observable. A bridge absent here
 * has none, and a tolerance in another observable is not judged for it or
 * through it.
 *
 * @module atlas/translation-registry
 * @internal
 */

import { SPRING_LC_PHASE_CARRIAGE } from './oscillators/phase-carriage.js';
import { PENDULUM_PHASE_TRANSLATION } from './oscillators/phase-translation.js';
import { PENDULUM_POSITION_TRANSLATION } from './oscillators/position-translation.js';
import type { ObservableCarriage, ObservableTranslation, TranslationCheck } from './translation.js';
import { runDominanceWitness } from './witness-dominance.js';
import { runNumericWitness } from './witness-numeric.js';
import type { WitnessRunResult } from './witness-result.js';

/** @internal */
export const OBSERVABLE_TRANSLATIONS: readonly ObservableTranslation[] = [PENDULUM_PHASE_TRANSLATION, PENDULUM_POSITION_TRANSLATION];

/** @internal */
export const OBSERVABLE_CARRIAGES: readonly ObservableCarriage[] = [SPRING_LC_PHASE_CARRIAGE];

/** The translations declared for one bridge, in registry order. @internal */
export function translationsOf(bridgeId: string): readonly ObservableTranslation[] {
  return OBSERVABLE_TRANSLATIONS.filter((t) => t.bridgeId === bridgeId);
}

/** The bridge's declaration that it carries `observable`, if it makes one. @internal */
export function carriageOf(bridgeId: string, observable: string): ObservableCarriage | undefined {
  return OBSERVABLE_CARRIAGES.find((c) => c.bridgeId === bridgeId && c.observable === observable);
}

/** Run a translation or carriage check of either shape. @internal */
export function runTranslationCheck(check: TranslationCheck): WitnessRunResult {
  return 'kind' in check ? runDominanceWitness(check) : runNumericWitness(check);
}
