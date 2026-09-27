/**
 * Every declared observable translation (`./translation.ts`). A bridge absent
 * here has none, and a tolerance in another observable is not judged for it.
 *
 * @module atlas/translation-registry
 * @internal
 */

import { PENDULUM_PHASE_TRANSLATION } from './oscillators/phase-translation.js';
import type { ObservableTranslation } from './translation.js';

/** @internal */
export const OBSERVABLE_TRANSLATIONS: readonly ObservableTranslation[] = [PENDULUM_PHASE_TRANSLATION];

/** The translations declared for one bridge, in registry order. @internal */
export function translationsOf(bridgeId: string): readonly ObservableTranslation[] {
  return OBSERVABLE_TRANSLATIONS.filter((t) => t.bridgeId === bridgeId);
}
