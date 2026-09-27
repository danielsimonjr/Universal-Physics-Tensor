/**
 * Routes through an atlas family, and the error bound a route carries.
 *
 * Two functions, and the second is the one that can do damage:
 *
 * - {@link findPath} is pure graph search. It answers "is there a chain of
 *   bridges from A to B", and nothing more. A path existing says NOTHING about
 *   whether that path supports a claim.
 * - {@link boundPath} answers "what error bound does this chain carry", and its
 *   default answer is NO BOUND. `docs/planning/Atlas-Phase-2-Design.md` §3:
 *
 *   > A path containing any edge whose relation composes to
 *   > `'no-composite-claim'` has NO bound. It must return an explicit no-claim,
 *   > never a number. A composed number over an undefined composite would be
 *   > the most dangerous output this library could produce: precise-looking and
 *   > unfounded.
 *
 * So {@link boundPath} returns a DISCRIMINATED UNION, not a number. A caller
 * cannot read `.bound` off a no-claim, because a no-claim has no `.bound` — the
 * refusal is enforced by the type rather than by a documented convention.
 *
 * ## Norms — why an exact edge does not compose for free
 *
 * `./error-algebra.ts` states the rule this module obeys, and it is narrower
 * than it first reads:
 *
 * > An exact equivalence contributes `IDENTITY_BOUND` **in the norms these
 * > Phase 0 bridges state** — not in every norm.
 *
 * An `exact-equivalence` bridge carries no `bound`, hence states no `norm`. It
 * therefore contributes `IDENTITY_BOUND` in NO norm, and a path that mixes it
 * with a normed bound cannot claim the composite holds in that norm. That is a
 * `'norm-not-stated'` no-claim. The composed NUMBER would be unchanged —
 * composing with the identity is arithmetically a no-op — which is exactly what
 * makes the error invisible without this gate: the danger is not a wrong
 * magnitude, it is a right magnitude attached to the wrong norm.
 *
 * ⚠ **Correction to the S2.2 brief.** The brief states that no field records a
 * norm and that Phase 2 must add `norm?` to `ApproximationBound`. That is
 * out of date: `ApproximationBound.norm` already exists as a MANDATORY
 * `string` (Phase 0, `./types.ts`). No type change was needed, and this module
 * reads the field that is already there.
 *
 * **Uniformity is gated here, at use.** `ApproximationBound.uniformity` may
 * be `null` (or empty — the same state) so a real bound can be recorded
 * before anyone has analysed what the error is uniform in. Composing such a
 * bound would attach a number to an unanalysed claim, so {@link boundPath}
 * returns `'uniformity-unanalysed'` and does not compute one.
 * `propagateUncertainty` does not read the field and does not fold `delta`
 * into `sigma`: it stays a statistical-sigma function.
 *
 * Pure: no I/O, no registry reads.
 *
 * @module atlas/path-bound
 */

import { composeBoundPath, IDENTITY_BOUND } from './error-algebra.js';
import type { BoundPair } from './error-algebra.js';
import { composeRelation, NO_COMPOSITE_CLAIM } from './composition-table.js';
import type { CompositionResult } from './composition-table.js';
import type { AtlasBridge, RelationType } from './types.js';
import { ATLAS_FAMILIES } from './families.js';
import type { AtlasFamily } from './oscillators/index.js';

/**
 * Families {@link findPath} can search: every registered family. This was the
 * oscillator family alone, which made the diffusion and wave families
 * unsearchable once they existed. A route stays INSIDE one family: a bridge
 * that ends in another family's model is not followed across (stated, not
 * hidden — cross-family routes are {@link findAtlasPath}'s scope).
 *
 * @internal
 */
const FAMILIES: Readonly<Record<string, AtlasFamily>> = Object.fromEntries(
  ATLAS_FAMILIES.map((f) => [f.family, f]),
);

/**
 * One traversable direction of one bridge.
 *
 * An `exact-equivalence` is invertible — `AtlasBridge` requires its `inverse`
 * — so it yields two directed edges. Every other relation yields one:
 * an approximation, a restriction and a coarse-graining all LOSE information,
 * and traversing one backwards would assert a recovery nothing supports.
 */
interface DirectedEdge {
  readonly from: string;
  readonly to: string;
  readonly bridge: AtlasBridge;
}

/** Expand bridges into directed edges. Single-premise chains only. */
function directedEdges(bridges: readonly AtlasBridge[]): readonly DirectedEdge[] {
  const edges: DirectedEdge[] = [];
  for (const bridge of bridges) {
    // Sprint 2 scope: a multi-premise bridge is a JOIN, not a link in a chain,
    // and is skipped rather than silently reduced to its first premise.
    if (bridge.premises.length !== 1) continue;
    const from = bridge.premises[0]!;
    edges.push({ from, to: bridge.conclusion, bridge });
    if (bridge.relation === 'exact-equivalence') {
      edges.push({ from: bridge.conclusion, to: from, bridge });
    }
  }
  return edges;
}

/**
 * Shortest chain of bridges from `from` to `to`, or `null` if none exists.
 *
 * Breadth-first, so the result is a shortest path by edge count. Ties are
 * broken by `family.bridges` order, which is the design note's order and is
 * therefore stable across runs.
 *
 * A returned path is a ROUTE, not a warrant: ask {@link boundPath} what the
 * route supports.
 *
 * @throws RangeError if `family` is not a known family, or an endpoint is not
 *   one of its models. An unknown endpoint returning `null` would be
 *   indistinguishable from a genuinely disconnected pair.
 * @internal
 */
export function findPath(
  family: string,
  from: string,
  to: string,
): readonly AtlasBridge[] | null {
  const fam = FAMILIES[family];
  if (fam === undefined) {
    throw new RangeError(`findPath: unknown family '${family}'`);
  }
  const models = new Set(fam.models.map((m) => m.id));
  for (const endpoint of [from, to]) {
    if (!models.has(endpoint)) {
      throw new RangeError(`findPath: '${endpoint}' is not a model of family '${family}'`);
    }
  }
  return shortestChain(fam.bridges, from, to);
}

/**
 * Shortest chain of bridges from `from` to `to` across EVERY registered
 * family, or `null` if none exists.
 *
 * A family is a filing label, not a physical boundary: `ab-kg-schrodinger` is
 * filed under waves and ends in the diffusion family's free Schrödinger model.
 * The search runs over the union of all families' bridges under the same
 * rules as {@link findPath} — an exact equivalence both ways, every lossy
 * relation forward only — and the route it returns is composed by
 * {@link boundPath} exactly as a single-family route is. Crossing a family
 * adds no composition rule.
 *
 * Ties are broken by {@link ATLAS_FAMILIES} order, then each family's bridge
 * order, so the result is stable across runs.
 *
 * @throws RangeError if an endpoint is not a model of any family.
 * @internal
 */
export function findAtlasPath(from: string, to: string): readonly AtlasBridge[] | null {
  const models = new Set(ATLAS_FAMILIES.flatMap((f) => f.models.map((m) => m.id)));
  for (const endpoint of [from, to]) {
    if (!models.has(endpoint)) {
      throw new RangeError(`findAtlasPath: '${endpoint}' is not a model of any atlas family`);
    }
  }
  return shortestChain(
    ATLAS_FAMILIES.flatMap((f) => f.bridges),
    from,
    to,
  );
}

/** Breadth-first shortest chain over `bridges`; endpoints already validated. */
function shortestChain(
  bridges: readonly AtlasBridge[],
  from: string,
  to: string,
): readonly AtlasBridge[] | null {
  if (from === to) return [];

  const outgoing = new Map<string, DirectedEdge[]>();
  for (const edge of directedEdges(bridges)) {
    const bucket = outgoing.get(edge.from);
    if (bucket === undefined) outgoing.set(edge.from, [edge]);
    else bucket.push(edge);
  }

  const cameBy = new Map<string, DirectedEdge>();
  const seen = new Set<string>([from]);
  const queue: string[] = [from];

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const edge of outgoing.get(node) ?? []) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      cameBy.set(edge.to, edge);
      if (edge.to === to) {
        const path: AtlasBridge[] = [];
        for (let at = to; at !== from; ) {
          const step = cameBy.get(at)!;
          path.unshift(step.bridge);
          at = step.from;
        }
        return path;
      }
      queue.push(edge.to);
    }
  }
  return null;
}

/** Why a path supports no bound. @internal */
export type NoClaimReason =
  /** The relations along the path do not compose to a relation at all. */
  | 'no-composite-claim'
  /** An edge on the path states no norm, so the composite holds in none. */
  | 'norm-not-stated'
  /** Two edges state DIFFERENT norms; composing across norms is unsound. */
  | 'norm-mismatch'
  /**
   * A bound on the path has `uniformity === null` or an empty list: what the
   * error is uniform in has not been analysed, so no number is stated.
   */
  | 'uniformity-unanalysed';

/** A path that DOES carry a bound. @internal */
export interface PathBoundClaim {
  readonly kind: 'bound';
  readonly bound: BoundPair;
  /** True when the path ended on a step with no Lipschitz constant. */
  readonly terminal: boolean;
  /** The relation the chain asserts, from {@link composeRelation}. */
  readonly relation: RelationType;
  /**
   * The single norm every bound on the path states, or `null` when the path
   * carries no bound at all and the claim is the vacuous `terminal` identity
   * over an empty prefix.
   */
  readonly norm: string | null;
}

/** A path that carries NO bound, and the reason. @internal */
export interface PathNoClaim {
  readonly kind: 'no-claim';
  readonly reason: NoClaimReason;
  /** Human-readable specifics: which edge, which norms. */
  readonly detail: string;
}

/** The result of {@link boundPath}: a bound, or an explicit refusal. @internal */
export type PathBoundResult = PathBoundClaim | PathNoClaim;

/**
 * The error bound a chain of bridges carries — or an explicit no-claim.
 *
 * Four gates, in this order. Each one is a reason to refuse, and the FIRST
 * reason found is the one reported; none of them is skippable by a caller.
 *
 * 1. **Relation.** `composeRelation` is folded along the path. The moment the
 *    running composite is `'no-composite-claim'`, the path has no bound. This
 *    is design note §3 constraint 1 and it is checked before any arithmetic,
 *    so no number is ever computed for a path that cannot carry one.
 * 2. **Uniformity.** Any bound whose `uniformity` is `null` or empty is not
 *    yet analysed. The path returns `'uniformity-unanalysed'` and no Lipschitz
 *    arithmetic runs. An edge with no `bound` — an exact equivalence, or an
 *    unbounded coarse-graining — does not fail this gate.
 * 3. **Lipschitz.** `composeBoundPath` folds the per-edge pairs. A `null` — an
 *    edge that is neither bounded nor exact — is tolerated only as the LAST
 *    entry, where it terminates the claim (`terminal: true`); anywhere else it
 *    throws `MissingLipschitzError` rather than inventing a constant.
 * 4. **Norm.** Every stated norm on the path must be the SAME norm, and no
 *    unnormed exact map may carry a normed claim. An `exact-equivalence`
 *    states no norm (it has no `bound`), so a path mixing one with a normed
 *    bound is `'norm-not-stated'` — see the module note.
 *
 * @throws RangeError on an empty path. Returning `IDENTITY_BOUND` for "no
 *   edges" would be a bound asserted about nothing.
 * @throws MissingLipschitzError via {@link composeBoundPath}; see gate 3.
 * @internal
 */
export function boundPath(bridges: readonly AtlasBridge[]): PathBoundResult {
  if (bridges.length === 0) {
    throw new RangeError('boundPath: an empty path composes nothing; there is no bound to state');
  }

  // ── Gate 1: the relation must compose all the way along ───────────────────
  let relation: CompositionResult = bridges[0]!.relation;
  for (let i = 1; i < bridges.length; i++) {
    const next = bridges[i]!;
    // The loop RETURNS on the first silent cell, so `relation` is always a
    // real `RelationType` here — no re-check is needed, and TypeScript proves
    // it (a guard here is flagged as having no overlap).
    relation = composeRelation(relation, next.relation);
    if (relation === NO_COMPOSITE_CLAIM) {
      return {
        kind: 'no-claim',
        reason: NO_COMPOSITE_CLAIM,
        detail:
          `'${bridges[i - 1]!.id}' (${bridges[i - 1]!.relation}) then '${next.id}' ` +
          `(${next.relation}) composes to no relation, so the path carries no bound`,
      };
    }
  }

  // ── Gate 2: an unanalysed uniformity yields no number ─────────────────────
  // Before any Lipschitz arithmetic. `null` and `[]` are the same state: an
  // empty list is a universal over nothing, and counting it as analysed is
  // the convention-checked empty-object defect. An edge with no bound states
  // no error, so it does not fail this gate.
  for (const bridge of bridges) {
    if (bridge.bound === undefined) continue;
    const uniformity = bridge.bound.uniformity;
    if (uniformity === null || uniformity.length === 0) {
      const how = uniformity === null ? 'null' : 'empty';
      return {
        kind: 'no-claim',
        reason: 'uniformity-unanalysed',
        detail:
          `'${bridge.id}' has uniformity ${how} (not yet analysed), so the path carries no numeric bound`,
      };
    }
  }

  // ── Collect the per-edge pairs the remaining gates read ───────────────────
  // What each edge contributes. The split that matters: an `exact-equivalence`
  // with no `bound` is EXACT — it contributes `IDENTITY_BOUND`, not an unknown
  // constant. Any OTHER relation with no bound has an unknown Lipschitz
  // constant, and `null` is what says so. Conflating the two would either
  // invent a constant for a lossy map or throw on an exact one.
  const pairs: (BoundPair | null)[] = [];
  const norms = new Set<string>();
  const unnormedIdentities: string[] = [];
  for (const bridge of bridges) {
    if (bridge.bound !== undefined) {
      pairs.push({ K: bridge.bound.K, delta: bridge.bound.delta });
      norms.add(bridge.bound.norm);
    } else if (bridge.relation === 'exact-equivalence') {
      pairs.push(IDENTITY_BOUND);
      unnormedIdentities.push(bridge.id);
    } else {
      pairs.push(null);
    }
  }

  // ── Gate 3: an unknown Lipschitz constant, anywhere but last, is fatal ────
  // Delegated to `composeBoundPath`, which throws `MissingLipschitzError`
  // rather than inventing a constant. Run BEFORE the norm gate: an unbounded
  // composite is a harder failure than an unstatable norm, and reporting the
  // softer one would mask it.
  const composed = composeBoundPath(pairs);

  // ── Gate 4: one norm, and no unnormed map carrying a normed claim ─────────
  if (norms.size > 1) {
    return {
      kind: 'no-claim',
      reason: 'norm-mismatch',
      detail:
        `the path states ${norms.size} different norms (${[...norms].map((n) => `'${n}'`).join(', ')}); ` +
        'bounds in different norms do not compose',
    };
  }
  if (unnormedIdentities.length > 0 && norms.size > 0) {
    return {
      kind: 'no-claim',
      reason: 'norm-not-stated',
      detail:
        `${unnormedIdentities.map((id) => `'${id}'`).join(', ')} state no norm, so they ` +
        `contribute IDENTITY_BOUND in no norm; the composite cannot be claimed in ` +
        `'${[...norms][0]}'`,
    };
  }
  return {
    kind: 'bound',
    bound: composed.bound,
    terminal: composed.terminal,
    relation,
    norm: [...norms][0] ?? null,
  };
}

/** Re-exported so a caller need not reach into the algebra module. @internal */
export { IDENTITY_BOUND };
