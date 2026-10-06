/**
 * Confrontations projected from the catalog. The outcome is the recorded
 * comparison. Residual arithmetic stays in `observations/types.ts`.
 *
 * @module bridges/confrontations
 */

import type { ConfrontationOutcome, ObservationKind } from './observations/types.js';
import { catalogConfrontations } from './catalog-load.js';

/** One registered confrontation. @public */
export interface ConfrontationEntry {
  readonly bridgeId: number;
  readonly title: string;
  readonly kind: ObservationKind;
  run(): ConfrontationOutcome;
}

/** Rigor of a confrontation. @public */
export type RigorTier = 'stringent' | 'moderate' | 'loose';

const ROWS = catalogConfrontations();

/** Author-recorded rigor, projected from the catalog. @public */
export const CONFRONTATION_RIGOR: ReadonlyMap<number, RigorTier> = new Map(
  ROWS.map((row) => [row.catalogId, row.rigor]),
);

/** The rigor tier of a confronted catalog id (`loose` when none is recorded). @public */
export function confrontationRigor(bridgeId: number): RigorTier {
  return CONFRONTATION_RIGOR.get(bridgeId) ?? 'loose';
}

/** Count of confrontations by rigor tier. @public */
export function rigorDistribution(): Record<RigorTier, number> {
  const counts: Record<RigorTier, number> = { stringent: 0, moderate: 0, loose: 0 };
  for (const tier of CONFRONTATION_RIGOR.values()) counts[tier] += 1;
  return counts;
}

/** Catalog id → confrontation. @public */
export const CONFRONTATIONS: ReadonlyMap<number, ConfrontationEntry> = new Map(
  ROWS.map((row) => [
    row.catalogId,
    {
      bridgeId: row.catalogId,
      title: row.title,
      kind: row.kind,
      run: () => row.outcome as unknown as ConfrontationOutcome,
    },
  ]),
);

/** Every confrontation, in catalog order. @public */
export function listConfrontations(): ConfrontationEntry[] {
  return [...CONFRONTATIONS.values()];
}

/** Run one confrontation, or `undefined` when the id has none. @public */
export function runConfrontation(bridgeId: number): ConfrontationOutcome | undefined {
  return CONFRONTATIONS.get(bridgeId)?.run();
}
