/**
 * Atlas record types.
 *
 * The shared vocabulary lives in `src/relations/types.ts` and is re-exported
 * here. A public name is also a local type alias in this file, so the
 * facade scan still sees a declaration, and the alias is the same type.
 *
 * @module atlas/types
 */

import type { FormalRef } from '../relations/types.js';

/** The relation a bridge asserts between its premises and its conclusion. @public */
export type RelationType = import('../relations/types.js').RelationType;
/** What kind of support a record carries. Carried only if its witness passes. @public */
export type EvidenceTag = import('../relations/types.js').EvidenceTag;
/** Whether the limit a bridge takes is regular or singular. @public */
export type LimitCharacter = import('../relations/types.js').LimitCharacter;
/** One inequality on a regime coordinate, a π-group or a dimensionless input. @public */
export type RegimeInequality = import('../relations/types.js').RegimeInequality;
/** Where in parameter space a model or bridge is claimed to apply. @public */
export type Regime = import('../relations/types.js').Regime;
/** A Lipschitz-plus-offset error bound with a mandatory horizon. @public */
export type ApproximationBound = import('../relations/types.js').ApproximationBound;
/** A case a bridge does not cover, and the witness that shows it. @public */
export type Counterexample = import('../relations/types.js').Counterexample;

export type {
  Conventions,
  FormalFidelity,
  FormalRef,
  FormalRefKind,
  RelationContract,
} from '../relations/types.js';
export { ALL_EVIDENCE_TAGS } from '../relations/types.js';

/** A named check that supports a record, and the test file that runs it. @public */
export interface Witness {
  /** `'W7b'`. */
  readonly id: string;
  readonly kind: 'symbolic' | 'numeric' | 'formal';
  /** Test file path. */
  readonly test: string;
  /** As stated in the brief. */
  readonly tolerance?: string;
}

/**
 * `AtlasModel` MOVED to `./model.ts` in Phase 3, where it gained
 * `boundaryData?`, `initialData?` and `symmetryGroup?`. It is NOT re-exported
 * from here: `model.ts` imports `Regime` from this module, so a re-export
 * would close a cycle `bun run docs:deps` reports. Import it from
 * `./model.js`.
 */

/**
 * An exact bridge's declaration of how its map acts on ONE norm, in ONE
 * direction: a bound stated in `from` about `fromModel` becomes a bound in `to`
 * about `toModel`, multiplied by `K`. Design:
 * `docs/planning/ADR-transported-norm-composition.md`.
 *
 * Without a declaration an exact map contributes the identity in no norm, and a
 * route through it after a normed bound carries no bound (`'norm-not-stated'`).
 * A declaration licenses exactly the norm and direction it names; every other
 * norm, and the reverse direction, stay refused.
 *
 * @internal
 */
export interface NormTransport {
  /** `'nt-spring-lc-relative-period'`; also the `recordId` of its registered witness. */
  readonly id: string;
  /** The model the bound is about before the map. */
  readonly fromModel: string;
  /** The model the transported bound is about. */
  readonly toModel: string;
  /** The norm the incoming bound must state, verbatim. */
  readonly from: string;
  /** The norm the transported bound holds in. */
  readonly to: string;
  /** The factor the map multiplies the error by: the supremum of {@link KAt} over {@link domain}. */
  readonly K: number;
  /** The same factor at a point, in closed form. */
  readonly KAt: (params: Readonly<Record<string, number>>) => number;
  /** Where `K` is the supremum. */
  readonly domain: string;
  /** Why the map acts on the norm by `K`. */
  readonly derivation: string;
  readonly timeMap: {
    /** The map from the `fromModel`'s clock to the `toModel`'s. */
    readonly map: string;
    /** A transport whose time map is not uniform is refused by `boundPath`. */
    readonly uniform: boolean;
    /** How a horizon stated before the map reads after it. */
    readonly horizon: string;
    /** The machine form of {@link horizon}. */
    readonly restateHorizon: (
      holds: (t: number, params: Readonly<Record<string, number>>) => boolean,
    ) => (t: number, params: Readonly<Record<string, number>>) => boolean;
  };
  /** What the incoming bound's uniformity becomes; the list is carried unchanged when the map preserves it. */
  readonly uniformity: string;
  /** The check that the map acts on the norm by `K`. */
  readonly witness: Witness;
  /** The evidence tag the witness supports when it checks; never `'formally-proved'`. */
  readonly basis: 'numerically-supported' | 'symbolically-checked';
}

/** Field set = Blueprint v2 §3.1 Bridge record + citations. @internal */
export interface AtlasBridge {
  /** `'ab-spring-lc'`. */
  readonly id: string;
  readonly relation: RelationType;
  /** Model ids (many). */
  readonly premises: readonly string[];
  /** Model id (one). */
  readonly conclusion: string;
  /** `'u = x/x0 (or q/q0), τ = ω0 t'`. */
  readonly transformation: string;
  /** `'x = x0 u, t = τ/ω0'` — required for `exact-equivalence`. */
  readonly inverse?: string;
  readonly preserves: readonly string[];
  readonly doesNotPreserve: readonly string[];
  readonly sideConditions: readonly string[];
  /** Required iff `relation === 'approximation'`. */
  readonly bound?: ApproximationBound;
  readonly regime: Regime;
  readonly counterexamples: readonly Counterexample[];
  /**
   * There is NO `evidence` field. Every evidence tag is derived at read time
   * by `deriveEvidence` from the witnesses, the formal reference and the
   * counterexamples a record carries, against the committed witness results;
   * `toAtlasJson` writes that derivation into the artifact. The sentence
   * that a record stored its own set is the record from before this field
   * was removed.
   */
  readonly witnesses: readonly Witness[];
  readonly citations: readonly string[];
  readonly reviewStatus: 'proposed' | 'reviewed';
  /**
   * A machine-checked counterpart, when one genuinely exists (Phase 4, S4.6).
   * Absent is the honest default: a statement with no checked counterpart gets
   * no reference rather than an `'unreviewed'` placeholder.
   */
  readonly formalRef?: FormalRef;
  /**
   * Only on an `exact-equivalence`: the norms, and directions, the map is
   * declared to transport a bound in. Absent means none.
   */
  readonly normTransports?: readonly NormTransport[];
}

/** A claimed bridge the atlas records as REJECTED, with the reason. @public */
export interface AtlasRejection {
  /** `'ax-cubic-spring-lc'`. */
  readonly id: string;
  readonly claimed: RelationType;
  readonly premises: readonly string[];
  readonly conclusion: string;
  readonly reason: string;
  /** `'beta·x0²·k⁻¹'`. */
  readonly survivingGroup: string;
  readonly witnesses: readonly Witness[];
}

/** Thrown when an `ApproximationBound` is built without its machine horizon. @public */
export class MissingHorizonError extends Error {}

/**
 * Thrown when an `approximation` bound is built without the machine form of
 * its `delta`.
 *
 * A distinct type rather than a reuse of `MissingHorizonError`: the horizon of
 * such a record is present and correct, and reporting a missing horizon for it
 * would send the next reader to the one field that is not the defect.
 *
 * @internal
 */
export class MissingDeltaAtError extends Error {}

/** Thrown when a bound path has no Lipschitz constant anywhere but at its end. @public */
export class MissingLipschitzError extends Error {}

