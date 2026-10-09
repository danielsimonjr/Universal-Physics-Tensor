/**
 * Bridge catalog projection. The rows are loaded from
 * `data/bridge-catalog.json`. This module does not declare an equation.
 *
 * @module bridges
 */

import type { BridgeEquationEntry } from './types.js';
import { catalogEntries } from './catalog-load.js';

export type {
  BridgeEquationEntry,
  BridgeEquationStatus,
  BridgeIssueFixable,
  BridgeIssueSeverity,
  KnownIssue,
} from './types.js';

/**
 * Derived constants of the catalog's closed forms, re-exported for callers
 * who want the number by name. A catalog expression reads `m_p` and
 * `sigma_T` through the constant registry (`dimensional/constant-rows.ts`),
 * which carries `M_PROTON_SI`, `THOMSON_CROSS_SECTION_SI` and
 * `LANE_EMDEN_OMEGA3`; the von Klitzing, Josephson, Lorenz and BCS-gap
 * values are not read by any expression and are the catalog's documented
 * reference numbers.
 */
export {
  BCS_GAP_RATIO,
  JOSEPHSON_CONSTANT_SI,
  LANE_EMDEN_OMEGA3,
  LORENZ_NUMBER_SI,
  M_PROTON_SI,
  THOMSON_CROSS_SECTION_SI,
  VON_KLITZING_SI,
} from '../core/constants.js';
/** Thrown when two carrier roles have opposite signs. */
export { CarrierSignError } from './carrier-sign.js';
/** Thrown when a caller input names a registered constant. */
export { ConstantInputError } from './evaluation-errors.js';

/** Catalog rows in id order. @public */
export const BRIDGE_EQUATIONS: readonly BridgeEquationEntry[] = catalogEntries();
