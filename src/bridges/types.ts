/**
 * Catalog entry types. The rows themselves live in `data/bridge-catalog.json`.
 *
 * @module bridges/types
 */

import type { Conventions, Counterexample, Regime, RelationContract } from '../relations/types.js';

/** Lifecycle status of a bridge equation in the catalog. @public */
export type BridgeEquationStatus =
  | 'established'
  | 'speculative'
  | 'highly-speculative'
  | 'invalid';

/** How badly a catalogued defect undermines a bridge equation. @public */
export type BridgeIssueSeverity =
  | 'self-refuting'
  | 'dimensional'
  | 'index-structure'
  | 'sign'
  | 'undefined-quantity'
  | 'phenomenological-ansatz'
  | 'other';

/** Whether a catalogued defect can be repaired, and at what cost. @public */
export type BridgeIssueFixable =
  | 'spec-edit'
  | 'reformulation'
  | 'unfixable-must-mark-invalid'
  | 'unknown';

/** One recorded defect. @public */
export interface KnownIssue {
  severity: BridgeIssueSeverity;
  /** The defect, in the catalog's words. */
  description: string;
  fixable: BridgeIssueFixable;
}

/**
 * One bridge equation as the catalog records it.
 * @public
 */
export interface BridgeEquationEntry {
  /** Stable catalog id. A field, never a code identifier. */
  id: number;
  name: string;
  category: string;
  category_name: string;
  bridges: [string, string];
  status: BridgeEquationStatus;
  context: string;
  formula_latex: string | null;
  source_part: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  source_section: string;
  known_issues: KnownIssue[];
  references: string[];
  dependencies: number[];
  dimensional_signature: string | null;
  notes: string;
  relation?: RelationContract;
  regime?: Regime;
  conventions?: Conventions;
  counterexamples?: readonly Counterexample[];
}
