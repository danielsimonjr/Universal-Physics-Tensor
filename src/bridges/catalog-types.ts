/**
 * Catalog record shapes. The file `data/bridge-catalog.json` is the source.
 * A bridge number is the `id` field. It is not a code identifier.
 *
 * @module bridges/catalog-types
 */

import type { Dimension } from '../dimensional/types.js';
import type { ConfrontationOutcome } from './observations/types.js';
import type {
  BridgeEquationEntry,
  BridgeEquationStatus,
} from './types.js';

/**
 * Filing label. `cross-domain` means the equation links quantities or
 * constants from two distinct fields. `standard` means it stays inside one.
 * Absence is not a state this record carries.
 */
export type CatalogFiling = 'standard' | 'cross-domain';

/**
 * One catalog row. The row owns the relation contract, the regime, the
 * conventions and the counterexamples; its relations carry no copy.
 */
export interface CatalogEntry extends BridgeEquationEntry {
  readonly type: CatalogFiling;
  /** The PhysJS manifest key. The reference and its kind are that entry's. */
  readonly formalKey?: string;
  readonly dimension?: Dimension;
  /** The confrontation is a caller-supplied table, not a stored outcome. */
  readonly callerTable?: true;
  /** A named statement this row's expression supports. */
  readonly statement?: string;
  /**
   * Scalar expression for a row that has no relation. The structural
   * registry parses it. It is not a graph edge and it is not evaluated.
   */
  readonly scalarExpression?: string;
}

/** Inputs and the number the engine returns at those inputs. */
export interface CatalogReference {
  readonly inputs: Readonly<Record<string, number>>;
  readonly value: number;
}

/** One closed form. Several relations may share one catalog id. */
export interface CatalogRelation {
  readonly id: string;
  readonly catalogId: number | null;
  readonly kind: 'bridge' | 'law';
  readonly label: string;
  readonly expression: string;
  readonly target: string;
  readonly sources: readonly string[];
  readonly aliases: Readonly<Record<string, readonly string[]>>;
  readonly holds: string;
  readonly domain: string;
  readonly confidence: 'established' | 'speculative' | 'highly-speculative';
  readonly citation: string;
  readonly coefficientUnset?: boolean;
  readonly formulaFactors?: Readonly<Record<string, number>>;
  readonly reference?: CatalogReference;
  /** A caveat the record states beside its value. The text is the record's; nothing switches on it. */
  readonly notice?: { readonly text: string };
}

/** One named input of a catalog evaluator. */
export interface CatalogEvaluatorParameter {
  readonly key: string;
  readonly quantity: string;
  readonly symbol: string;
  readonly unit: string;
  readonly meaning: string;
  readonly geometry?: 'radius' | 'diameter' | 'separation' | 'impact-parameter' | 'semi-major-axis';
  readonly temperature?: 'absolute';
  /**
   * The sign this input must have. `positive` is `> 0`, `nonnegative` is `>= 0`,
   * and `any` states that the quantity is signed and overrides the temperature
   * rule. An absolute temperature is `nonnegative` when no sign is stated.
   */
  readonly sign?: 'positive' | 'nonnegative' | 'any';
  /** An angular frequency in rad/s. A cycle unit (Hz, rpm) given to it is multiplied by 2π. */
  readonly angular?: true;
  readonly alternates?: readonly { readonly key: string; readonly meaning: string; readonly toKey: number }[];
}

/**
 * A second number the same record returns beside its `value`. The expression
 * reads evaluator parameter keys, the constants, and `value`. It is computed
 * when every parameter key it reads was given; a parameter only an output
 * reads is optional.
 *
 * @public
 */
export interface CatalogEvaluatorOutput {
  /** The result key, with its unit as a suffix (`E_F_J`). */
  readonly name: string;
  readonly unit: string;
  readonly meaning: string;
  readonly expression: string;
}

/** The input contract of one catalog evaluator. */
export interface CatalogEvaluator {
  readonly catalogId: number;
  readonly name: string;
  readonly parameters: readonly CatalogEvaluatorParameter[];
  readonly outputs?: readonly CatalogEvaluatorOutput[];
}

/**
 * The prediction point of a value-kind confrontation, in the evaluator's input
 * spellings. The evaluator at these inputs returns the outcome's `predicted`:
 * its value, or the extra output `output` names.
 */
export interface CatalogPrediction {
  readonly inputs: Readonly<Record<string, number>>;
  readonly output?: string;
}

/** One committed data confrontation of a catalog record, its outcome narrowed on `kind` when the catalog loads. */
export interface CatalogConfrontation {
  readonly catalogId: number;
  readonly title: string;
  readonly kind: 'value' | 'upper-bound' | 'consistency' | 'table';
  readonly rigor: 'stringent' | 'moderate' | 'loose';
  readonly outcome: ConfrontationOutcome;
  readonly prediction?: CatalogPrediction;
}

/** A confrontation as the file stores it: the outcome is checked arm by arm when the catalog loads. */
export type CatalogConfrontationRecord = Omit<CatalogConfrontation, 'outcome'> & {
  readonly outcome: Readonly<Record<string, unknown>>;
};

/** One row of the negative catalog: adjudicated not-a-bridge under the membership criterion. */
export interface CatalogRejection {
  readonly catalogId: number;
  readonly name: string;
  /** Why the endpoints do NOT differ in regime attributes. */
  readonly reason: string;
  readonly citation: string;
}

/**
 * A relation as the file stores it. `confidence` is stored only on a relation
 * that has no catalog row; a relation with a row takes its row's `status`
 * when the catalog loads, so the two cannot drift.
 */
export type CatalogRelationRecord = Omit<CatalogRelation, 'confidence'> & {
  readonly confidence?: CatalogRelation['confidence'];
};

/** The loaded catalog: schema 3, entries, relations, evaluators, confrontations, the two ledgers and the spine. */
export interface CatalogFile {
  readonly schemaVersion: 3;
  readonly packageVersion: string;
  readonly entries: readonly CatalogEntry[];
  readonly relations: readonly CatalogRelation[];
  readonly evaluators: readonly CatalogEvaluator[];
  readonly confrontations: readonly CatalogConfrontation[];
  /** The adjudication ledger: recorded verdicts on identification hypotheses. `composition/adjudication.ts` projects it. */
  readonly adjudications: readonly CatalogAdjudication[];
  /** The negative catalog. `bridges/rejected.ts` projects it. */
  readonly rejections: readonly CatalogRejection[];
  readonly spine: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

/** The catalog as `data/bridge-catalog.json` stores it, before the loader derives the per-relation fields and narrows each outcome. */
export type CatalogFileRecord = Omit<CatalogFile, 'relations' | 'confrontations'> & {
  readonly relations: readonly CatalogRelationRecord[];
  readonly confrontations: readonly CatalogConfrontationRecord[];
};

/**
 * A recorded human verdict on an identification hypothesis `a ≟ b`.
 * - `genuine`  — real physics AND a new link (nothing recorded qualifies yet).
 * - `entailed` — real physics already carried by the L-layer; not a new link.
 * - `decoy`    — dimensional coincidence / no mechanism, including trivial and definitional identifications.
 * - `deferred` — reviewed and consciously parked (not the same as absent, which means never reviewed).
 */
export type AdjudicationVerdict = 'genuine' | 'decoy' | 'entailed' | 'deferred';

/** One record of the adjudication ledger in `data/bridge-catalog.json`. */
export interface CatalogAdjudication {
  /** `candidateId(a, b)` of the identification: the two slugs in sorted order, joined by `~`. */
  readonly id: string;
  readonly verdict: AdjudicationVerdict;
  /** Why, condensed from the adjudication document; never machine-generated. */
  readonly grounds: string;
  /** Repo-relative path of the adjudication document. */
  readonly source: string;
  /** ISO date the verdict was recorded. */
  readonly date: string;
}

/** Lifecycle status of a catalog row. */
export type { BridgeEquationStatus };
