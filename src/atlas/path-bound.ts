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
 * The one way through is a DECLARATION on the exact bridge
 * (`AtlasBridge.normTransports`, `docs/planning/ADR-transported-norm-composition.md`):
 * a norm, a direction, a factor `K` and a time map, each with a witness. A route
 * that crosses the bridge in that direction, carrying a bound in that norm,
 * composes with `(K, 0)`; every other norm and direction is still refused, and
 * the refusal names the declaration that is missing.
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
import type { AtlasBridge, NormTransport, RelationType } from './types.js';
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

/**
 * The simple routes from `from` to `to` across every registered family, as
 * far as a bounded search reaches. Each route is a list of bridges, and no route
 * visits a model twice. Traversal follows the same rules as
 * {@link findAtlasPath}: an exact equivalence both ways, every lossy relation
 * forward only, multi-premise bridges skipped.
 *
 * The search runs by bridge count (every route of k bridges before any of
 * k + 1), with ties in {@link ATLAS_FAMILIES} order and then bridge order. It stops
 * once it has found `limit + 1` routes, or after expanding `budget` partial
 * routes. Stopping early is REPORTED, not hidden: `exhausted` is false,
 * `stoppedBy` says which bound stopped it, and `completeThrough` is the largest
 * bridge count up to which every route has been found. When `exhausted` is
 * true, `routes` holds all of them.
 *
 * @throws RangeError if an endpoint is not a model of any family, or `limit`
 *   is not a positive integer (via {@link enumerateRoutes}).
 * @internal
 */
export function enumerateAtlasRoutes(
  from: string,
  to: string,
  limit: number,
  budget = 100_000,
): RouteEnumeration {
  const models = new Set(ATLAS_FAMILIES.flatMap((f) => f.models.map((m) => m.id)));
  for (const endpoint of [from, to]) {
    if (!models.has(endpoint)) {
      throw new RangeError(`enumerateAtlasRoutes: '${endpoint}' is not a model of any atlas family`);
    }
  }
  return enumerateRoutes(ATLAS_FAMILIES.flatMap((f) => f.bridges), from, to, limit, budget);
}

/** What {@link enumerateAtlasRoutes} found, and whether the search was cut short. @internal */
export interface RouteEnumeration {
  readonly routes: (readonly AtlasBridge[])[];
  readonly exhausted: boolean;
  readonly completeThrough: number | null;
  readonly stoppedBy: 'limit' | 'budget' | null;
}

/**
 * {@link enumerateAtlasRoutes} over an explicit bridge list; endpoints are not
 * validated against any family.
 * @throws RangeError if `limit` is not a positive integer.
 * @internal
 */
export function enumerateRoutes(
  bridges: readonly AtlasBridge[],
  from: string,
  to: string,
  limit: number,
  budget = 100_000,
): RouteEnumeration {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`enumerateRoutes: limit must be a positive integer, got ${limit}`);
  }
  if (from === to) return { routes: [[]], exhausted: true, completeThrough: null, stoppedBy: null };

  const outgoing = new Map<string, DirectedEdge[]>();
  for (const edge of directedEdges(bridges)) {
    const bucket = outgoing.get(edge.from);
    if (bucket === undefined) outgoing.set(edge.from, [edge]);
    else bucket.push(edge);
  }

  interface Partial {
    readonly at: string;
    readonly visited: ReadonlySet<string>;
    readonly bridges: readonly AtlasBridge[];
  }
  const routes: (readonly AtlasBridge[])[] = [];
  let layer: Partial[] = [{ at: from, visited: new Set([from]), bridges: [] }];
  let expanded = 0;
  for (let length = 1; layer.length > 0; length++) {
    const next: Partial[] = [];
    for (const p of layer) {
      if (++expanded > budget) {
        return { routes: routes.slice(0, limit), exhausted: false, completeThrough: length - 1, stoppedBy: 'budget' };
      }
      for (const edge of outgoing.get(p.at) ?? []) {
        if (p.visited.has(edge.to)) continue;
        const route = [...p.bridges, edge.bridge];
        if (edge.to === to) {
          routes.push(route);
          if (routes.length > limit) {
            return { routes: routes.slice(0, limit), exhausted: false, completeThrough: length - 1, stoppedBy: 'limit' };
          }
        } else {
          next.push({ at: edge.to, visited: new Set([...p.visited, edge.to]), bridges: route });
        }
      }
    }
    layer = next;
  }
  return { routes, exhausted: true, completeThrough: null, stoppedBy: null };
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
   * A norm stated in one model family was carried into another with no
   * witnessed transport across that boundary. String equality is not a match
   * there. A one-step route does not reach this gate.
   */
  | 'cross-family-unmapped'
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
   * The norm the composite holds in: the single norm every bound on the path
   * states, or the `to` norm of the last transport applied after them. `null`
   * when the path carries no bound at all and the claim is the vacuous
   * `terminal` identity over an empty prefix.
   */
  readonly norm: string | null;
  /** The declared norm transports that carried the bound across exact maps; absent when none did. */
  readonly transports?: readonly AppliedTransport[];
}

/** A declared norm transport {@link boundPath} applied, and where on the path. @internal */
export interface AppliedTransport {
  /** Index of the exact bridge in the path. */
  readonly index: number;
  readonly bridgeId: string;
  readonly transport: NormTransport;
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

function modelFamilyOf(id: string | null): string | undefined {
  if (id === null) return undefined;
  return ATLAS_FAMILIES.find((f) => f.models.some((m) => m.id === id))?.family;
}

function familiesDiffer(a: string | undefined, b: string | undefined): boolean {
  return a !== undefined && b !== undefined && a !== b;
}

/**
 * A cross-family transport with a witness. An empty witness id or test is not
 * one, and `kind: 'formal'` is not one: `formally-proved` is only a reviewed
 * `formalRef`, which a transport does not carry.
 */
function vocabularyTransport(
  bridge: AtlasBridge,
  norm: string,
  fromModel: string | null,
  toModel: string | null,
): NormTransport | undefined {
  if (fromModel === null || toModel === null) return undefined;
  return (bridge.normTransports ?? []).find(
    (nt) =>
      nt.from === norm &&
      nt.fromModel === fromModel &&
      nt.toModel === toModel &&
      nt.timeMap.uniform &&
      familiesDiffer(modelFamilyOf(nt.fromModel), modelFamilyOf(nt.toModel)) &&
      nt.witness.id !== '' &&
      nt.witness.test !== '' &&
      nt.witness.kind !== 'formal',
  );
}

/**
 * The error bound a chain of bridges carries — or an explicit no-claim.
 *
 * Five gates, in this order. Each one is a reason to refuse, and the FIRST
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
 * 4. **Norm.** Every stated norm on the path must be the SAME norm as the bound
 *    reaching it, and no unnormed exact map may carry a normed claim. An
 *    `exact-equivalence` states no norm (it has no `bound`), so a path mixing
 *    one with a normed bound is `'norm-not-stated'` — see the module note —
 *    UNLESS the exact bridge declares a `NormTransport` from the running norm,
 *    for the direction the route crosses it, with a uniform time map. Then it
 *    contributes `(K, 0)` and the running norm becomes the transport's `to`.
 *    A mismatch is reported before a missing norm.
 * 5. **Vocabulary.** When the models a norm is carried between sit in different
 *    families, string equality is not a match. The carry needs a
 *    `NormTransport` whose `fromModel` / `toModel` are the models the route
 *    crosses, whose `from` is the running norm, whose time map is uniform, and
 *    whose witness is present. Otherwise the refusal is
 *    `'cross-family-unmapped'`. A one-step route has nothing to carry, so this
 *    gate does not fire. A missing Lipschitz constant is reported first.
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
  //
  // An exact edge AFTER a bound contributes `(K, 0)` in its declared transport's
  // `to` norm, but only when it declares a transport from the norm the bound so
  // far is in, for the direction the route crosses it
  // (docs/planning/ADR-transported-norm-composition.md). Without one it stays the
  // identity in no norm, and gate 4 refuses.
  const entries = entryModels(bridges);
  const pairs: (BoundPair | null)[] = [];
  const stated: string[] = [];
  const transports: AppliedTransport[] = [];
  const unnormed: string[] = [];
  let running: string | null = null;
  let mismatch: string | null = null;
  let normFamily: string | undefined;
  let normModel: string | null = null;
  let vocabulary: {
    bridgeId: string;
    fromFamily: string;
    toFamily: string;
    norm: string;
    fromModel: string;
    toModel: string;
  } | null = null;
  for (let index = 0; index < bridges.length; index++) {
    const bridge = bridges[index]!;
    const entry = entries[index] ?? null;
    const exit =
      entry === null ? null : bridge.relation === 'exact-equivalence' ? otherEnd(bridge, entry) : bridge.conclusion;
    const entryFam = modelFamilyOf(entry);
    const exitFam = modelFamilyOf(exit);
    if (
      running !== null &&
      normFamily !== undefined &&
      entryFam !== undefined &&
      normFamily !== entryFam &&
      vocabulary === null
    ) {
      const carried = vocabularyTransport(bridge, running, normModel, entry);
      if (carried === undefined) {
        vocabulary = {
          bridgeId: bridge.id,
          fromFamily: normFamily,
          toFamily: entryFam,
          norm: running,
          fromModel: normModel ?? '?',
          toModel: entry ?? '?',
        };
      } else {
        pairs.push({ K: carried.K, delta: 0 });
        transports.push({ index, bridgeId: bridge.id, transport: carried });
        running = carried.to;
        normFamily = modelFamilyOf(carried.toModel);
        normModel = carried.toModel;
      }
    }
    if (bridge.bound !== undefined) {
      pairs.push({ K: bridge.bound.K, delta: bridge.bound.delta });
      stated.push(bridge.bound.norm);
      const statedFamily = familiesDiffer(entryFam, exitFam) ? entryFam : (exitFam ?? entryFam);
      if (vocabulary === null && running !== null && bridge.bound.norm !== running) {
        if (normFamily !== undefined && statedFamily !== undefined && normFamily !== statedFamily) {
          vocabulary = {
            bridgeId: bridge.id,
            fromFamily: normFamily,
            toFamily: statedFamily,
            norm: running,
            fromModel: normModel ?? '?',
            toModel: exit ?? '?',
          };
        } else if (mismatch === null) {
          mismatch =
            `'${bridge.id}' states '${bridge.bound.norm}', but the bound reaching it is in '${running}'` +
            (transports.length > 0 ? ` after ${transports.map((a) => `'${a.transport.id}'`).join(', ')}` : '');
        }
      }
      running = bridge.bound.norm;
      if (familiesDiffer(entryFam, exitFam)) {
        const into = vocabularyTransport(bridge, running, entry, exit);
        if (into !== undefined) {
          pairs.push({ K: into.K, delta: 0 });
          transports.push({ index, bridgeId: bridge.id, transport: into });
          running = into.to;
          normFamily = exitFam;
          normModel = exit;
        } else {
          normFamily = entryFam;
          normModel = entry;
        }
      } else {
        normFamily = statedFamily;
        normModel = exit ?? entry;
      }
    } else if (bridge.relation === 'exact-equivalence') {
      const declared = bridge.normTransports ?? [];
      const normNow: string | null = running;
      const applies = (nt: NormTransport): boolean =>
        nt.from === normNow && nt.fromModel === entry && nt.toModel === exit;
      const transport: NormTransport | undefined =
        normNow === null ? undefined : declared.find((nt) => applies(nt) && nt.timeMap.uniform);
      if (transport !== undefined) {
        pairs.push({ K: transport.K, delta: 0 });
        transports.push({ index, bridgeId: bridge.id, transport });
        running = transport.to;
        normModel = exit;
        const carriedFamily = modelFamilyOf(exit);
        if (carriedFamily !== undefined) normFamily = carriedFamily;
        continue;
      }
      pairs.push(IDENTITY_BOUND);
      if (running === null) {
        unnormed.push(`'${bridge.id}' comes before any bound, and no transport is defined for an exact map there`);
        continue;
      }
      const nonUniform = declared.find((nt) => applies(nt) && !nt.timeMap.uniform);
      const others = declared.filter((nt) => !applies(nt));
      unnormed.push(
        `'${bridge.id}' declares no norm transport from '${running}' for ${entry ?? '?'} → ${exit ?? '?'}` +
          (nonUniform !== undefined
            ? ` (its transport '${nonUniform.id}' has a non-uniform time map and is not applied)`
            : '') +
          (others.length > 0
            ? `; it declares only ${others.map((nt) => `'${nt.from}' → '${nt.to}' for ${nt.fromModel} → ${nt.toModel}`).join(', ')}`
            : ''),
      );
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

  // ── Gate 5: a family boundary is not string equality ──────────────────────
  // After the Lipschitz gate, so a missing constant is still the harder failure.
  // Before the string mismatch: across families the strings were never the same
  // norm, and a mismatch would claim they were compared.
  if (vocabulary !== null) {
    return {
      kind: 'no-claim',
      reason: 'cross-family-unmapped',
      detail:
        `'${vocabulary.bridgeId}' has no norm transport of '${vocabulary.norm}' from family '${vocabulary.fromFamily}' ` +
        `(${vocabulary.fromModel}) into family '${vocabulary.toFamily}' (${vocabulary.toModel}), so the path carries no bound`,
    };
  }

  // ── Gate 4: one norm, and no unnormed map carrying a normed claim ─────────
  const distinct = [...new Set(stated)];
  if (mismatch !== null) {
    return {
      kind: 'no-claim',
      reason: 'norm-mismatch',
      detail:
        distinct.length > 1
          ? `the path states ${distinct.length} different norms (${distinct.map((n) => `'${n}'`).join(', ')}); ` +
            'bounds in different norms do not compose'
          : `${mismatch}; bounds in different norms do not compose`,
    };
  }
  if (unnormed.length > 0 && stated.length > 0) {
    return {
      kind: 'no-claim',
      reason: 'norm-not-stated',
      detail:
        `${unnormed.join('; ')}. An exact map with no transport for the norm contributes IDENTITY_BOUND in no ` +
        `norm, so the composite cannot be claimed in '${stated[0]}'`,
    };
  }
  return {
    kind: 'bound',
    bound: composed.bound,
    terminal: composed.terminal,
    relation,
    norm: running,
    ...(transports.length > 0 ? { transports } : {}),
  };
}

/**
 * The model each step of a route is entered from, or `null` where the list is
 * not a chain. An exact equivalence may be crossed either way; the first one is
 * read as reversed when the next step leaves from its premise and not from its
 * conclusion. Every other relation is crossed forward.
 *
 * @internal
 */
export function routeEntryModels(bridges: readonly AtlasBridge[]): (string | null)[] {
  if (bridges.length === 0) return [];
  return entryModels(bridges);
}

function entryModels(bridges: readonly AtlasBridge[]): (string | null)[] {
  const first = bridges[0]!;
  let at: string | null = first.premises.length === 1 ? first.premises[0]! : null;
  if (first.relation === 'exact-equivalence' && at !== null && bridges.length > 1) {
    const next = bridges[1]!;
    const ends = [...next.premises, next.conclusion];
    if (!ends.includes(first.conclusion) && ends.includes(at)) at = first.conclusion;
  }
  const entries: (string | null)[] = [];
  for (const b of bridges) {
    entries.push(at);
    at = b.relation === 'exact-equivalence' ? (at === null ? null : otherEnd(b, at)) : b.conclusion;
  }
  return entries;
}

/**
 * True when step `index` sits in a different model family from the previous
 * step and no applied transport restates a clock onto it. The step's own
 * horizon is then unevaluated: a family change does not copy one.
 *
 * @internal
 */
export function familyChangeBlocksHorizon(
  bridges: readonly AtlasBridge[],
  transports: readonly AppliedTransport[],
  index: number,
): boolean {
  if (index <= 0 || index >= bridges.length) return false;
  const entries = entryModels(bridges);
  const exitAt = (i: number): string | null => {
    const entry = entries[i] ?? null;
    const bridge = bridges[i]!;
    if (entry === null) return null;
    return bridge.relation === 'exact-equivalence' ? otherEnd(bridge, entry) : bridge.conclusion;
  };
  const previous = modelFamilyOf(exitAt(index - 1));
  const here = modelFamilyOf(exitAt(index)) ?? modelFamilyOf(entries[index] ?? null);
  if (!familiesDiffer(previous, here)) return false;
  return !transports.some((a) => a.index === index && a.transport.timeMap.uniform);
}

/** The end of an exact bridge a route leaves by, entering at `entry`; `null` when `entry` is neither end. */
function otherEnd(bridge: AtlasBridge, entry: string): string | null {
  if (bridge.premises.length !== 1) return null;
  if (entry === bridge.premises[0]) return bridge.conclusion;
  if (entry === bridge.conclusion) return bridge.premises[0]!;
  return null;
}

/**
 * The horizon of the bound on `bridges[index]` as it reads at the END of the
 * route: restated through every transport applied after it (a
 * {@link PathBoundClaim}'s `transports`; none for a no-claim). `null` when that
 * step carries no bound.
 *
 * @internal
 */
export function horizonOnRoute(
  bridges: readonly AtlasBridge[],
  transports: readonly AppliedTransport[],
  index: number,
): {
  readonly horizon: string;
  readonly restatedBy: readonly AppliedTransport[];
  readonly holds: (t: number, params: Readonly<Record<string, number>>) => boolean;
} | null {
  const bound = bridges[index]?.bound;
  if (bound === undefined) return null;
  const later = transports.filter((a) => a.index > index);
  const holds = later.reduce((h, a) => a.transport.timeMap.restateHorizon(h), bound.horizonHolds);
  return { horizon: bound.horizon, restatedBy: later, holds };
}

/** Re-exported so a caller need not reach into the algebra module. @internal */
export { IDENTITY_BOUND };
