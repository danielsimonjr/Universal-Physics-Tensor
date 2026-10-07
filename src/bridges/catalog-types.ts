/**
 * Catalog record shapes. The file `data/bridge-catalog.json` is the source.
 * A bridge number is the `id` field. It is not a code identifier.
 *
 * @module bridges/catalog-types
 */

import type { Dimension } from '../dimensional/types.js';
import type { Conventions, Counterexample, Regime, RelationContract } from '../relations/types.js';
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
 * One catalog row. `derivedFrom` and `basis` are optional until a nested
 * derivation is pinned. `basis: false` is not a state this record carries.
 */
export interface CatalogEntry extends BridgeEquationEntry {
  readonly type: CatalogFiling;
  readonly derivedFrom?: readonly string[];
  readonly basis?: true;
  readonly formalKey?: string;
  readonly assumptions?: readonly string[];
  readonly scopeLimits?: readonly string[];
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
  readonly relation?: RelationContract;
  readonly regime?: Regime;
  readonly conventions?: Conventions;
  readonly counterexamples?: readonly Counterexample[];
  readonly reference?: CatalogReference;
  /** A named evaluation notice. The text lives with the notice, not with an id switch. */
  readonly notice?: string;
  /** A generic numerical method this record calls. Never a bridge number. */
  readonly method?: string;
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
  readonly optional?: true;
}

/**
 * A second number the same record returns beside its `value`. The expression
 * reads evaluator parameter keys, the constants, and `value`.
 */
export interface CatalogEvaluatorOutput {
  /** The result key, with its unit as a suffix (`E_F_J`). */
  readonly name: string;
  readonly unit: string;
  readonly meaning: string;
  readonly expression: string;
  /** Optional parameter keys this output needs. It is left out when one is not given. */
  readonly requires?: readonly string[];
}

/** The input contract of one catalog evaluator. */
export interface CatalogEvaluator {
  readonly catalogId: number;
  readonly name: string;
  readonly parameters: readonly CatalogEvaluatorParameter[];
  readonly outputs?: readonly CatalogEvaluatorOutput[];
}

/** One committed data confrontation of a catalog record. */
export interface CatalogConfrontation {
  readonly catalogId: number;
  readonly title: string;
  readonly kind: 'value' | 'upper-bound' | 'consistency' | 'table';
  readonly rigor: 'stringent' | 'moderate' | 'loose';
  readonly outcome: Record<string, unknown>;
  /** Inputs of the prediction, in catalog quantity names, when elasticity is defined. */
  readonly prediction?: { readonly inputs: Readonly<Record<string, number>> };
}

/** The on-disk catalog: schema 3, entries, relations, evaluators, and confrontations. */
export interface CatalogFile {
  readonly schemaVersion: 3;
  readonly packageVersion: string;
  readonly entries: readonly CatalogEntry[];
  readonly relations: readonly CatalogRelation[];
  readonly evaluators: readonly CatalogEvaluator[];
  readonly confrontations: readonly CatalogConfrontation[];
  readonly adjudications: readonly { readonly id: string; readonly verdict: string }[];
  readonly spine: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

/** Lifecycle status of a catalog row. */
export type { BridgeEquationStatus };
