/**
 * Composition graph — edges (bridges and laws) + validity domains
 * (v0.8.0 T1+T2+T3, per docs/planning/v0.8.0-Design.md §3).
 *
 * A `BridgeEdge` is an edge in the composition graph: n-ary source
 * quantities → one target quantity, carrying a closed-form evaluator,
 * a first-class validity domain (G-8), a confidence grade, and a
 * literature citation. `kind: 'law'` marks diagonal-law edges (P-1) —
 * edges whose endpoints share regime attributes, serving as the
 * connective tissue composition chains pass through.
 *
 * @module composition/edge
 */

import type { Quantity } from './quantity.js';
import type { ExprNode } from '../dimensional/validator.js';
import type {
  Conventions,
  Counterexample,
  Regime,
  RelationContract,
} from '../relations/types.js';

/**
 * First-class validity domain (v0.8.0 G-8). The predicate receives the
 * same keyed inputs as `evaluate` and returns whether the edge's
 * formula applies there (e.g. weak-field, positive mass, bound orbit).
 *
 * @public
 */
export interface ValidityDomain {
  /** Human-readable statement, e.g. 'M > 0 and b ≫ r_s (weak field)'. */
  readonly description: string;
  /** Machine-checkable form of the same statement. */
  readonly predicate: (inputs: Record<string, number>) => boolean;
}

/**
 * Confidence grade — mirrors the catalog's status taxonomy. Composition
 * demotes via {@link minConfidence}; it never promotes.
 *
 * @public
 */
export type EdgeConfidence =
  | 'established'
  | 'speculative'
  | 'highly-speculative';

/**
 * An edge in the composition graph.
 *
 * `evaluate` is keyed by source-quantity `name`s. For catalog-backed
 * edges, `beId` cross-references `BRIDGE_EQUATIONS`; diagonal-law
 * edges have `beId: null` (BE-1–10 are not individually catalogued).
 *
 * @public
 */
export interface BridgeEdge {
  /** Graph id, e.g. 'be-42', 'law-schwarzschild-radius'. */
  readonly id: string;
  /** Catalog cross-reference; null for diagonal laws. */
  readonly beId: number | null;
  /** Bridge (endpoints differ in regime) vs law (endpoints share regime). */
  readonly kind: 'bridge' | 'law';
  /** Human-readable label. */
  readonly label: string;
  /** Input quantities (n-ary). */
  readonly sources: readonly Quantity[];
  /** Output quantity. */
  readonly target: Quantity;
  readonly confidence: EdgeConfidence;
  readonly domain: ValidityDomain;
  /** Closed-form evaluator; keys are source-quantity names. */
  readonly evaluate: (inputs: Record<string, number>) => number;
  /**
   * OPTIONAL symbolic form of the target (v0.12 symbolic composition): an
   * `ExprNode` whose leaf symbols are EITHER this edge's source-quantity
   * NAMES (graph vocabulary, e.g. `'mass'`) or registered constant symbols
   * (`hbar`, `c`, `G`, `k_B`, `8pi`, `ln2`, …). When present, `composeSymbolic`
   * can thread it through a junction by AST substitution; a drift-guard test
   * binds it to `evaluate`. Absent on numeric-only edges (the default).
   */
  readonly symbolic?: ExprNode;
  readonly citation: string;
  /**
   * Provenance: the quantity identification the junction used, when a
   * composed edge was formed via `QUANTITY_IDENTIFICATIONS` rather than
   * a name match. Absent on primitive edges and name-matched
   * compositions. (v0.8.0 punch-list: surfaced from the previously
   * unused `findJunction` return.)
   */
  readonly identificationUsed?: {
    readonly from: string;
    readonly to: string;
    readonly rationale: string;
    readonly citation?: string;
  };
  /**
   * Provenance: alias dispositions consumed at composition (v0.11
   * Option D) — which duplicate-name collisions were resolved, and how.
   */
  readonly aliasDispositionsUsed?: ReadonlyArray<{
    readonly name: string;
    readonly treatAs: 'shared' | { readonly renameSecond: string };
    readonly rationale: string;
    readonly citation?: string;
  }>;

  // ── Atlas Phase 1 overlay (all OPTIONAL; an edge without them is unchanged) ──
  /** The typed relation this edge asserts, when one has been recorded. */
  readonly relation?: RelationContract;
  /**
   * Where in π-group space this edge is claimed to apply, when a regime has
   * been recorded (Atlas Phase 2).
   *
   * ADDITIVE, and it does NOT replace `domain`. The two are different claims:
   * `domain.predicate` is an opaque closure over RAW inputs that may encode
   * conditions no π-group captures — positivity, integer-ness, a branch cut —
   * while a `Regime` is declarative inequalities over DIMENSIONLESS groups,
   * traceable back to the dimension matrix. Replacing the predicate with a
   * regime would discard those conditions invisibly, because the result still
   * type-checks and still answers (design note §1).
   *
   * When both are present the validity domain is satisfied IFF
   * `predicate(rawInputs) === true` AND `regimeHolds(piGroups).ok === true`.
   * Logical AND, no precedence: neither side wins, and a `'unknown'` from
   * `regimeHolds` is a failure to confirm validity, never validity.
   *
   * A regime is stated over π-groups, so the CALLER supplies the group values.
   * Nothing in this library infers them from raw inputs — that would be a
   * silent, lossy guess at the mapping. An edge without this field behaves
   * exactly as it did before Phase 2.
   */
  readonly regime?: Regime;
  /** Sign/unit choices the edge depends on. */
  readonly conventions?: Conventions;
  /** Cases the edge does NOT cover, each with its witness. */
  readonly counterexamples?: readonly Counterexample[];
  /**
   * Provenance for a `relation` that `composeEdges` DERIVED from the
   * composition table, rather than one an author recorded: the ids of the two
   * operands, in composition order. Present only on composed edges whose BOTH
   * operands carried a `relation`; absent everywhere else, including on every
   * primitive catalog edge.
   */
  readonly relationDerivedFrom?: readonly [string, string];
}

/** Composition failed: no junction quantity matched. @public */
export class CompositionJunctionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompositionJunctionError';
  }
}

/** Composition failed: junction dimensions are not exactly equal. @public */
export class CompositionDimensionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompositionDimensionError';
  }
}

/**
 * Evaluation refused: inputs fall outside an edge's validity domain.
 *
 * Honest deviation from design D-3's "domain-incompatible at compose
 * time": domain predicates are opaque functions, so incompatibility is
 * detectable only at evaluation — this error is thrown by
 * {@link evaluateEdge} (and by composed edges internally), not by
 * `composeEdges`.
 *
 * @public
 */
export class DomainViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainViolationError';
  }
}

/**
 * Composition refused: the composed sources would contain a duplicate
 * quantity NAME across operands without a recorded disposition (v0.11
 * namespacing gate, Option D — pure name-collision rule per the Adam
 * vet A-1: object identity cannot distinguish wrong-physics aliasing
 * from deliberate sharing).
 *
 * @public
 */
export class CompositionAliasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompositionAliasError';
  }
}

/**
 * Composition refused: BOTH operands carry a `relation`, and the composition
 * table (`src/atlas/composition-table.ts`) returns `'no-composite-claim'` for
 * that ordered pair — this library declines to assert what the chain relates.
 *
 * Silence, not a defect in the operands: the table is a deliberate
 * under-approximation (design note `docs/planning/Atlas-Phase-1-Design.md`
 * §2.2), so a refusal here means the composite type is unrecorded, never that
 * the composite is known to be false. The message names both edge ids AND both
 * relation types, so the refused pair is identifiable without the table.
 *
 * Thrown ONLY when both operands carry a `relation`. An edge with no relation
 * overlay composes exactly as it did before Atlas Phase 1.
 *
 * `@internal`, not `@public`, for the same reason the rest of the Atlas overlay
 * is: nothing atlas-related joins the published surface before ROADMAP Phase 6.
 * It is reachable from the `src/composition/index.ts` barrel, which is what
 * internal consumers and tests use. Promote it in Phase 6 together with the
 * overlay fields, and update `tests/api/public-surface.test.ts`'s snapshot in
 * the same commit — that snapshot caught this addition, which is it working.
 *
 * @internal
 */
export class UndefinedCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UndefinedCompositionError';
  }
}

/**
 * Domain-checked evaluation: throws {@link DomainViolationError} when
 * `inputs` violate `edge.domain`, otherwise returns `edge.evaluate`.
 *
 * @public
 */
export function evaluateEdge(
  edge: BridgeEdge,
  inputs: Record<string, number>,
): number {
  if (!edge.domain.predicate(inputs)) {
    throw new DomainViolationError(
      `${edge.id}: inputs violate validity domain (${edge.domain.description})`,
    );
  }
  return edge.evaluate(inputs);
}
