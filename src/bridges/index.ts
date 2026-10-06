/**
 * Bridge catalog projection. Rows, regimes, and the spine are loaded from
 * `data/bridge-catalog.json`. This module does not declare an equation.
 *
 * @module bridges
 */

export type {
  BridgeEquationEntry,
  BridgeEquationStatus,
  BridgeIssueFixable,
  BridgeIssueSeverity,
  KnownIssue,
} from './types.js';
export { isActiveStatus } from './types.js';

export {
  BCS_GAP_RATIO,
  JOSEPHSON_CONSTANT_SI,
  LANE_EMDEN_OMEGA3,
  LORENZ_NUMBER_SI,
  M_PROTON_SI,
  THOMSON_CROSS_SECTION_SI,
  VON_KLITZING_SI,
} from '../core/constants.js';
export { CarrierSignError } from './carrier-sign.js';

import type { BridgeEquationEntry } from './types.js';
import type { Regime } from '../relations/types.js';
import { bridgeCatalog, catalogEntries, catalogEntry } from './catalog-load.js';

/** Catalog rows in file order. @public */
export const BRIDGE_EQUATIONS: readonly BridgeEquationEntry[] = catalogEntries();

/** The regime recorded on a catalog row, when the row has one. */
export function catalogRegime(id: number): Regime | undefined {
  return catalogEntry(id)?.regime;
}

/**
 * Dimensionless groups at the points the gravitational confrontations used.
 * Keys are catalog ids. Values are group formula → number.
 */
export const SPINE_CONFRONTATION_POINTS: Readonly<Record<string, Readonly<Record<string, number>>>> =
  bridgeCatalog().spine;
