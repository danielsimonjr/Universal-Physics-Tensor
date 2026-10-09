/**
 * Phase-D novel-candidate enumeration (v0.10.0 T3 — Part-IX §6's
 * "novel candidate generated for physicist review").
 *
 * Enumerates every ordered pair of edges that `composeEdges` accepts
 * (junction by name or registered identification; exact dimension
 * functor; the same checks as hand-written compositions) and
 * partitions the results into REGISTERED (the pre-registered CT-*
 * compositions, by composed id) and NOVEL (everything else — the
 * candidates a physicist should look at).
 *
 * The enumerator PROPOSES; it never promotes. Per the Part-VI §XXVII-B
 * protocol, a novel candidate's only output path is human review —
 * `docs/research/v0.11.0-novel-candidates.md` is the current review
 * surface (v0.10.0 report superseded).
 *
 * @module composition/enumerate
 */

import type { ExprNode } from '../dimensional/validator.js';
import type { BridgeEdge } from './edge.js';
import { CompositionAliasError, UndefinedCompositionError } from './edge.js';
import { composeEdges } from './compose.js';
import type { ComposeOptions } from './compose.js';
import { composeSymbolic } from './compose-symbolic.js';

/** One successful pairwise composition found by the enumerator. @public */
export interface CompositionCandidate {
  readonly first: BridgeEdge;
  readonly second: BridgeEdge;
  /** The composed edge (carries demoted confidence, piped domain). */
  readonly edge: BridgeEdge;
  /** True when the composed id is NOT in the registered set. */
  readonly novel: boolean;
}

/**
 * A pair that is junction- and dimension-compatible but whose composed
 * sources would collide on a quantity name without a recorded
 * disposition (v0.11 Option D) — the enumerator surfaces these for
 * human judgment instead of silently aliasing them.
 *
 * @public
 */
export interface DispositionRequired {
  readonly first: BridgeEdge;
  readonly second: BridgeEdge;
  readonly composedId: string;
  readonly message: string;
}

/**
 * A pair `composeSymbolic` accepts. The expression is the substituted
 * scalar formula. A pair that only `composeEdges` accepts is not one of
 * these. Inlined on {@link EnumerationReport} so the package barrel gains
 * no name.
 */
interface SymbolicProofTarget {
  readonly first: BridgeEdge;
  readonly second: BridgeEdge;
  readonly expr: ExprNode;
}

/**
 * A pair `composeEdges` accepts and `composeSymbolic` refuses. Unclassified:
 * the gap note owns the reading. Not a proof target.
 */
interface NotSubstitutablePair {
  readonly first: BridgeEdge;
  readonly second: BridgeEdge;
}

/**
 * A pair both of whose edges carry a relation, refused by the composition table.
 *
 * This is {@link UndefinedCompositionError} only. A dimension or junction
 * failure is not one of these, and neither is {@link CompositionAliasError}.
 *
 * @internal
 */
export interface RelationTableRefusal {
  readonly first: BridgeEdge;
  readonly second: BridgeEdge;
  /** `${first.id}>>${second.id}`. */
  readonly composedId: string;
  readonly message: string;
}

/**
 * The report {@link enumerateCompositions} returns, plus the table refusals
 * that report does not carry.
 *
 * @internal
 */
export interface EnumerationWithRefusals {
  readonly report: EnumerationReport;
  readonly relationRefusals: readonly RelationTableRefusal[];
}

/** Enumeration report. @public */
export interface EnumerationReport {
  readonly all: ReadonlyArray<CompositionCandidate>;
  readonly registered: ReadonlyArray<CompositionCandidate>;
  readonly novel: ReadonlyArray<CompositionCandidate>;
  /** v0.11: name-colliding pairs awaiting an AliasDisposition. */
  readonly requiresDisposition: ReadonlyArray<DispositionRequired>;
  /**
   * Pairs `composeSymbolic` accepts, when a seed set was supplied.
   * Empty on the default call.
   */
  readonly proofTargets: ReadonlyArray<{
    readonly first: BridgeEdge;
    readonly second: BridgeEdge;
    readonly expr: ExprNode;
  }>;
  /**
   * Pairs only `composeEdges` accepts, when a seed set was supplied.
   * Empty on the default call. Unclassified.
   */
  readonly notSubstitutable: ReadonlyArray<{
    readonly first: BridgeEdge;
    readonly second: BridgeEdge;
  }>;
}

/**
 * The pre-registered composed ids (the CT-* set at v0.10.0). CT-1b's
 * 3-edge chain appears pairwise as its two links.
 *
 * @public
 */
export const REGISTERED_COMPOSITION_IDS: ReadonlySet<string> = new Set([
  'be-42>>be-16', // CT-1
  'law-schwarzschild-radius>>be-42-via-rs', // CT-1b link 1
  'be-42-via-rs>>be-16', // CT-1b link 2
  'be-12>>be-11-zurek', // CT-3
]);

/** Options of {@link enumerateCompositions}: the compose options plus the registered and seed id sets. @public */
export type EnumerationOptions = ComposeOptions & {
  readonly registeredIds?: ReadonlySet<string>;
  /** When set, only these edge ids are walked, and symbolic pairs are split. */
  readonly seedIds?: ReadonlySet<string>;
};

/**
 * Enumerate all valid ordered pairwise compositions over `edges`.
 *
 * A table refusal is not in this report. {@link enumerateCompositionsWithRefusals}
 * returns the same report plus that list.
 *
 * @public
 */
export function enumerateCompositions(
  edges: ReadonlyArray<BridgeEdge>,
  opts: EnumerationOptions = {},
): EnumerationReport {
  return enumerateCompositionsWithRefusals(edges, opts).report;
}

/**
 * The pairs {@link enumerateCompositions} returns, plus each
 * {@link UndefinedCompositionError} on its own list.
 *
 * `report.proofTargets` is that function's list. A refused pair is not
 * moved onto it. A dimension or junction failure stays a silent non-pair:
 * absent from `relationRefusals` and from `report`.
 *
 * @internal
 */
export function enumerateCompositionsWithRefusals(
  edges: ReadonlyArray<BridgeEdge>,
  opts: EnumerationOptions = {},
): EnumerationWithRefusals {
  const registeredIds = opts.registeredIds ?? REGISTERED_COMPOSITION_IDS;
  const all: CompositionCandidate[] = [];
  const requiresDisposition: DispositionRequired[] = [];
  const relationRefusals: RelationTableRefusal[] = [];
  const proofTargets: SymbolicProofTarget[] = [];
  const notSubstitutable: NotSubstitutablePair[] = [];
  const seeded = opts.seedIds !== undefined;
  const inSeed = (edge: BridgeEdge): boolean =>
    opts.seedIds === undefined || opts.seedIds.has(edge.id);

  for (const first of edges) {
    if (!inSeed(first)) continue;
    for (const second of edges) {
      if (first === second) continue;
      if (!inSeed(second)) continue;
      let edge: BridgeEdge;
      try {
        edge = composeEdges(first, second, opts);
      } catch (err) {
        if (err instanceof CompositionAliasError) {
          // Junction + dimensions passed; only the name collision
          // blocks it — a human disposition unlocks this pair.
          requiresDisposition.push({
            first,
            second,
            composedId: `${first.id}>>${second.id}`,
            message: err.message,
          });
        } else if (err instanceof UndefinedCompositionError) {
          relationRefusals.push({
            first,
            second,
            composedId: `${first.id}>>${second.id}`,
            message: err.message,
          });
        }
        // A dimension or junction failure stays a silent non-pair.
        continue;
      }
      all.push({
        first,
        second,
        edge,
        novel: !registeredIds.has(edge.id),
      });
      if (!seeded) continue;
      try {
        proofTargets.push({
          first,
          second,
          expr: composeSymbolic(first, second, opts).expr,
        });
      } catch {
        notSubstitutable.push({ first, second });
      }
    }
  }

  return {
    report: {
      all,
      registered: all.filter((c) => !c.novel),
      novel: all.filter((c) => c.novel),
      requiresDisposition,
      proofTargets,
      notSubstitutable,
    },
    relationRefusals,
  };
}
