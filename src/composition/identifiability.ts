/**
 * Identifiability classifier (Consequence 1 of
 * docs/planning/Bridge-Inference-Epistemics-Note.md, designed in
 * docs/planning/Identifiability-Classifier-Design-Note.md).
 *
 * Answers a STRUCTURAL question over the directed hypergraph of
 * `BridgeEdge`s: given a set of known quantities and a target quantity,
 * how many INDEPENDENT ways can the graph compute the target from the
 * knowns? The count drives the epistemics-note trichotomy:
 *
 *   - under-determined — unreachable; needs more inputs or more physics.
 *   - exactly-determined — one derivation; solvable (up to the
 *     dimensionless constant dimensional analysis cannot supply).
 *   - over-determined — ≥2 derivations; the surplus are FALSIFIABLE
 *     consistency constraints (each predicts the target; they must
 *     agree). The headline regime.
 *   - given — the target is itself a known (degenerate); derivations
 *     become cross-checks on the supplied value.
 *
 * This is STRUCTURAL, not parametric: it does not decide whether the
 * resulting nonlinear system has a unique numeric solution (undecidable
 * in general for closed-form evaluators). "Independent derivation" means
 * a structurally distinct edge, NOT a provably-independent formula — two
 * edges encoding the same relation are counted as two by the forward
 * count (an honest over-count, kept as `surplusConstraints`). The
 * classifier PROPOSES; humans filter (Part-VI §XXVII-B), exactly as
 * `enumerateCompositions` does.
 *
 * TWO INSTRUMENTS, TWO FIELDS. The forward closure fires an edge only when
 * every source is known, so it never reads a law in reverse. The MONOMIAL
 * edges (a `symbolic` product of powers, or a canonical equation with a
 * stated monomial) are also a linear system in log space: `y = C Π xᵢ^aᵢ`
 * is the row `log y − Σ aᵢ log xᵢ = log C`. Stacked with a unit row per
 * known quantity, the exact null space (MathTS `rationalNullspace`) says
 * which quantities are DETERMINED (their column is zero in every basis
 * vector) whichever way the laws are read, and `distinct rows − rank` is
 * the number of independent consistency checks, where a restated monomial
 * is one row, not two. {@link identifiabilityByRank} is that instrument;
 * {@link classifyIdentifiability} reports both, `determinable` being their
 * union, and names every law the rank read in reverse, because a validity
 * domain is stated on the sources and a caller may refuse the inversion.
 *
 * @module composition/identifiability
 */

import { Fraction } from '@danielsimonjr/mathts-core';
import { rationalNullspace } from '@danielsimonjr/mathts-functions';
import type { BridgeEdge } from './edge.js';
import type { QuantityIdentification } from './compose.js';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';
import { monomialExponentsExact } from './formula-shape.js';
import { rationalize } from './rational-exponent.js';
import { canonicalById } from '../canonical/registry.js';

/** The four-way structural-identifiability verdict. @public */
export type IdentifiabilityVerdict =
  | 'given'
  | 'under-determined'
  | 'exactly-determined'
  | 'over-determined';

/** Options for the classifier. @public */
export interface IdentifiabilityOptions {
  /**
   * Quantity identifications honored when expanding determinability
   * (directed name-equivalences: `from` determinable ⟹ `to` determinable).
   * Defaults to the registered {@link QUANTITY_IDENTIFICATIONS}, mirroring
   * how `composeEdges` connects the graph. Pass `[]` for the pure
   * physical-edge graph.
   */
  readonly identifications?: readonly QuantityIdentification[];
}

/**
 * What the log-space rank says about one known set, over the monomial edges
 * of the graph. See the module docs: this is the second instrument beside
 * the forward closure, and its numbers are not the closure's.
 *
 * @public
 */
export interface RankIdentifiability {
  /** Every quantity whose column is zero in every null-space basis vector, sorted. */
  readonly determined: readonly string[];
  /** The quantities the rank determines that the forward closure does not, sorted. */
  readonly determinedByRankOnly: readonly string[];
  /**
   * Independent consistency checks the system carries: distinct rows
   * (a restated monomial is one row) minus the rank. Zero when every row
   * is needed to determine what it determines.
   */
  readonly surplusChecks: number;
  /**
   * Ids of the monomial edges the rank read against their direction: a
   * source of the edge is determined, and not by the forward closure over
   * the monomial edges. A caller whose validity domain is stated on the
   * sources may refuse these.
   */
  readonly usedInReverse: readonly string[];
  /** Ids of the edges that contributed a row (a readable monomial, target not among its sources). */
  readonly monomialEdges: readonly string[];
}

/** The result of classifying one target against one known set. @public */
export interface IdentifiabilityResult {
  /** The target quantity name that was classified. */
  readonly target: string;
  /** The known-quantity names (deduplicated). */
  readonly known: readonly string[];
  readonly verdict: IdentifiabilityVerdict;
  /**
   * Ids of the distinct edges that independently derive the target from
   * the known set — sources determinable WITHOUT using any edge into the
   * target (so circular self-support is excluded). Empty ⟺ no physical
   * derivation (under-determined, or determined only by identity).
   */
  readonly derivations: readonly string[];
  /**
   * Redundant derivations = falsifiable consistency constraints. For a
   * non-given target the first derivation pins the value and the rest are
   * checks (`max(0, |derivations| − 1)`); for a given (measured) target
   * every derivation is a check (`|derivations|`).
   */
  readonly surplusConstraints: number;
  /**
   * For under-determined targets: the upstream quantities that block
   * determinability — on some path toward the target, not determinable
   * from the known set, not themselves known. Knowing a sufficient subset
   * moves the target toward determined. Empty when determinable.
   */
  readonly blockingFrontier: readonly string[];
  /**
   * Every quantity determinable from the known set: the forward closure
   * united with what the log-space rank determines through the monomial
   * edges (`rank.determined`), sorted.
   */
  readonly determinable: readonly string[];
  /** The rank instrument's own report for this known set. */
  readonly rank: RankIdentifiability;
}

/**
 * The monotone forward closure: the least set ⊇ `knownNames` closed under
 * "all of an edge's sources determinable ⟹ its target determinable",
 * with identifications expanding it as directed name-equivalences.
 *
 * A parameter-free edge (empty `sources`) fires unconditionally — its
 * target is in every closure (a constant is always determinable).
 *
 * @public
 */
export function forwardClosure(
  edges: readonly BridgeEdge[],
  knownNames: readonly string[],
  identifications: readonly QuantityIdentification[] = QUANTITY_IDENTIFICATIONS,
): Set<string> {
  const determinable = new Set<string>(knownNames);
  let changed = true;
  while (changed) {
    changed = false;
    for (const ident of identifications) {
      if (determinable.has(ident.from) && !determinable.has(ident.to)) {
        determinable.add(ident.to);
        changed = true;
      }
    }
    for (const e of edges) {
      if (determinable.has(e.target.name)) continue;
      if (e.sources.every((s) => determinable.has(s.name))) {
        determinable.add(e.target.name);
        changed = true;
      }
    }
  }
  return determinable;
}

// ---------------------------------------------------------------------------
// The log-space rank over the monomial edges.
// ---------------------------------------------------------------------------

/**
 * The exact exponents of an edge's monomial over its SOURCE names, or
 * undefined when it is not one. Internal: a `Fraction` is not a root type.
 * @internal
 */
export type EdgeMonomialReader = (edge: BridgeEdge) => ReadonlyMap<string, Fraction> | undefined;

/**
 * The exact exponents of `edge`'s target over its source names, read from
 * its `symbolic` form, or, for a canonical edge with no symbolic form, from
 * the equation's stated monomial and `formulaFactors`. A leaf that is not a
 * source (a constant, a literal, a held stub) is part of the prefactor and
 * contributes no column. Undefined when the form is not a monomial, when an
 * exponent is not a small rational, or when the target is among the sources.
 *
 * @internal
 */
export function edgeMonomial(edge: BridgeEdge): ReadonlyMap<string, Fraction> | undefined {
  const sourceNames = new Set(edge.sources.map((s) => s.name));
  if (sourceNames.has(edge.target.name)) return undefined;
  const out = new Map<string, Fraction>();
  if (edge.symbolic !== undefined) {
    const exact = monomialExponentsExact(edge.symbolic);
    if (exact === undefined) return undefined;
    for (const [name, exp] of exact) if (sourceNames.has(name)) out.set(name, exp);
    return out;
  }
  if (edge.beId !== null) return undefined;
  const equation = canonicalById(edge.id);
  const monomial = equation?.dimensional.monomial;
  if (monomial === undefined || monomial === null) return undefined;
  const stated: Record<string, number> = { ...monomial, ...(edge.formulaFactors ?? {}) };
  for (const [name, exp] of Object.entries(stated)) {
    if (!sourceNames.has(name)) continue;
    const q = rationalize(exp);
    if (q === undefined) return undefined;
    out.set(name, q);
  }
  return out;
}

interface MonomialRow {
  readonly id: string;
  readonly target: string;
  readonly sources: ReadonlyMap<string, Fraction>;
}

/** A row scaled so its first nonzero entry is 1, as a string, so two rows of one relation compare equal. */
function rowKey(row: readonly Fraction[]): string {
  const pivot = row.find((f) => !f.isZero());
  if (pivot === undefined) return '0';
  return row.map((f) => f.divide(pivot).toString()).join(',');
}

const ZERO = new Fraction(0);
const ONE = new Fraction(1);

/** Directed identifications: `from` in the set puts `to` in it. */
function expandByIdentifications(set: Set<string>, identifications: readonly QuantityIdentification[]): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const ident of identifications) {
      if (set.has(ident.from) && !set.has(ident.to)) {
        set.add(ident.to);
        changed = true;
      }
    }
  }
}

/** One connected component of the monomial graph: its rows and its column names. */
interface MonomialComponent {
  readonly index: number;
  readonly rows: readonly MonomialRow[];
  readonly names: readonly string[];
}

/** The solve of one component under one asserted set. */
interface ComponentSolve {
  /** The asserted names inside the component, sorted. */
  readonly inside: readonly string[];
  readonly determined: ReadonlySet<string>;
  /** Distinct rows minus rank, for this component. */
  readonly surplus: number;
}

/** The rows, the components and the memo of component solves, per edge array and reader. */
interface RankIndex {
  readonly rows: readonly MonomialRow[];
  readonly components: readonly MonomialComponent[];
  readonly componentOf: ReadonlyMap<string, number>;
  readonly solves: Map<number, ComponentSolve[]>;
}

const rankIndexCache = new WeakMap<readonly BridgeEdge[], Map<string, RankIndex>>();

/**
 * The monomial rows of `edges` under `reader`, grouped into the connected
 * components of the graph whose vertices are quantity names and whose links
 * are the rows (a row joins its target to each of its sources). The
 * log-space matrix is block-diagonal over these components, so each is
 * solved on its own, once per asserted set, and the answers are exact.
 * Built once per edge array and reader.
 */
function rankIndex(edges: readonly BridgeEdge[], reader: EdgeMonomialReader, readerKey: string): RankIndex {
  let perEdges = rankIndexCache.get(edges);
  if (perEdges === undefined) {
    perEdges = new Map();
    rankIndexCache.set(edges, perEdges);
  }
  const hit = perEdges.get(readerKey);
  if (hit !== undefined) return hit;

  const rows: MonomialRow[] = [];
  for (const edge of edges) {
    const sources = reader(edge);
    if (sources !== undefined) rows.push({ id: edge.id, target: edge.target.name, sources });
  }
  const parent = new Map<string, string>();
  const find = (name: string): string => {
    let root = name;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = name;
    while (cur !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  for (const row of rows) {
    if (!parent.has(row.target)) parent.set(row.target, row.target);
    for (const name of row.sources.keys()) {
      if (!parent.has(name)) parent.set(name, name);
      const a = find(row.target);
      const b = find(name);
      if (a !== b) parent.set(a, b);
    }
  }
  const groups = new Map<string, { rows: MonomialRow[]; names: Set<string> }>();
  for (const row of rows) {
    const root = find(row.target);
    let group = groups.get(root);
    if (group === undefined) {
      group = { rows: [], names: new Set() };
      groups.set(root, group);
    }
    group.rows.push(row);
    group.names.add(row.target);
    for (const name of row.sources.keys()) group.names.add(name);
  }
  const components: MonomialComponent[] = [...groups.values()].map((group, index) => ({
    index,
    rows: group.rows,
    names: [...group.names],
  }));
  const componentOf = new Map<string, number>();
  for (const component of components) for (const name of component.names) componentOf.set(name, component.index);
  const index: RankIndex = { rows, components, componentOf, solves: new Map() };
  perEdges.set(readerKey, index);
  return index;
}

/**
 * Solve one component with the asserted names inside it as unit rows.
 * Memoised per asserted set; a solve whose asserted set extends a cached
 * one by names that solve already determined is that solve with one more
 * dependent row per extra name (an already-determined quantity asserted
 * again is a consistency check, and determines nothing new).
 */
function solveComponent(index: RankIndex, component: MonomialComponent, asserted: ReadonlySet<string>): ComponentSolve {
  const inside = component.names.filter((name) => asserted.has(name)).sort();
  let cached = index.solves.get(component.index);
  if (cached === undefined) {
    cached = [];
    index.solves.set(component.index, cached);
  }
  const insideSet = new Set(inside);
  for (const solve of cached) {
    if (solve.inside.length === inside.length && solve.inside.every((name) => insideSet.has(name))) return solve;
  }
  for (const solve of cached) {
    if (!solve.inside.every((name) => insideSet.has(name))) continue;
    const extra = inside.filter((name) => !solve.inside.includes(name));
    if (extra.every((name) => solve.determined.has(name))) {
      const widened: ComponentSolve = { inside, determined: solve.determined, surplus: solve.surplus + extra.length };
      cached.push(widened);
      return widened;
    }
  }

  const column = new Map(component.names.map((name, i) => [name, i] as const));
  const matrix: Fraction[][] = [];
  const seen = new Set<string>();
  const pushRow = (row: Fraction[]): void => {
    const k = rowKey(row);
    if (k === '0' || seen.has(k)) return;
    seen.add(k);
    matrix.push(row);
  };
  for (const row of component.rows) {
    const vector = component.names.map(() => ZERO);
    vector[column.get(row.target)!] = ONE;
    for (const [name, exp] of row.sources) {
      const i = column.get(name)!;
      vector[i] = vector[i]!.sub(exp);
    }
    pushRow(vector);
  }
  for (const name of inside) {
    const vector = component.names.map(() => ZERO);
    vector[column.get(name)!] = ONE;
    pushRow(vector);
  }
  const solved = rationalNullspace(matrix, { columns: component.names.length });
  const determined = new Set<string>(inside);
  component.names.forEach((name, i) => {
    if (solved.basis.every((vector) => vector[i]!.isZero())) determined.add(name);
  });
  const result: ComponentSolve = { inside, determined, surplus: matrix.length - solved.rank };
  cached.push(result);
  return result;
}

interface RankSolution {
  readonly determined: Set<string>;
  readonly surplus: number;
}

/**
 * The asserted set is the known names plus every name a directed
 * identification reaches from a known or a determined one; only these get a
 * unit row, and a name the rank determines is never fed back in as a row
 * (that would count it as a check). Each pass solves the components the
 * asserted set touches (every component when `every`, so the surplus counts
 * the whole system), lets the identifications assert what the determined
 * names reach, and repeats until nothing new is asserted.
 */
function solveRank(
  index: RankIndex,
  knownNames: readonly string[],
  identifications: readonly QuantityIdentification[],
  every: boolean,
): RankSolution {
  const asserted = new Set<string>(knownNames);
  expandByIdentifications(asserted, identifications);
  const determined = new Set<string>();
  let surplus = 0;
  for (;;) {
    determined.clear();
    for (const name of asserted) determined.add(name);
    surplus = 0;
    for (const component of index.components) {
      if (!every && !component.names.some((name) => asserted.has(name))) continue;
      const solve = solveComponent(index, component, asserted);
      for (const name of solve.determined) determined.add(name);
      surplus += solve.surplus;
    }
    const before = asserted.size;
    const reach = new Set(determined);
    expandByIdentifications(reach, identifications);
    for (const name of reach) if (!determined.has(name)) asserted.add(name);
    if (asserted.size === before) break;
  }
  return { determined, surplus };
}

/** The cache of full rank reports per edge array, keyed by the known set and the identifications. */
const rankCache = new WeakMap<readonly BridgeEdge[], Map<string, RankIdentifiability>>();

function rankCacheKey(known: readonly string[], identifications: readonly QuantityIdentification[], custom: boolean): string {
  return `${[...known].sort().join('\u0001')}|${identifications.map((i) => `${i.from}>${i.to}`).join('\u0001')}|${custom ? 'custom' : 'default'}`;
}

/**
 * {@link identifiabilityByRank} with the monomial reader chosen by the
 * caller (the default is {@link edgeMonomial}). A custom reader's index and
 * results are cached beside the default's, never in its place.
 *
 * @internal
 */
export function identifiabilityByRankWith(
  edges: readonly BridgeEdge[],
  knownNames: readonly string[],
  reader: EdgeMonomialReader,
  opts: IdentifiabilityOptions = {},
): RankIdentifiability {
  return rankWithReader(edges, knownNames, reader, reader !== edgeMonomial, opts);
}

/**
 * The log-space rank: which quantities the monomial edges determine from
 * `knownNames`, whichever direction each law is read, how many independent
 * consistency checks the system carries, and which laws were read in
 * reverse. Identifications stay directed, as in {@link forwardClosure}: a
 * name they reach joins the known rows, and the system is solved again
 * until nothing new is determined. Non-monomial edges contribute nothing
 * here; the forward closure is their instrument.
 *
 * @public
 */
export function identifiabilityByRank(
  edges: readonly BridgeEdge[],
  knownNames: readonly string[],
  opts: IdentifiabilityOptions = {},
): RankIdentifiability {
  return rankWithReader(edges, knownNames, edgeMonomial, false, opts);
}

function rankWithReader(
  edges: readonly BridgeEdge[],
  knownNames: readonly string[],
  reader: EdgeMonomialReader,
  custom: boolean,
  opts: IdentifiabilityOptions,
): RankIdentifiability {
  const identifications = opts.identifications ?? QUANTITY_IDENTIFICATIONS;
  const key = rankCacheKey(knownNames, identifications, custom);
  let perEdges = rankCache.get(edges);
  if (perEdges === undefined) {
    perEdges = new Map();
    rankCache.set(edges, perEdges);
  }
  const hit = perEdges.get(key);
  if (hit !== undefined) return hit;

  const index = rankIndex(edges, reader, custom ? 'custom' : 'default');
  const { determined, surplus } = solveRank(index, knownNames, identifications, true);

  // A law is read in reverse when one of its sources is determined, and not
  // by the forward closure over the monomial edges alone.
  const monomialIds = new Set(index.rows.map((r) => r.id));
  const forward = forwardClosure(
    edges.filter((e) => monomialIds.has(e.id)),
    knownNames,
    identifications,
  );
  const usedInReverse = index.rows
    .filter((row) => [...row.sources.keys()].some((name) => !forward.has(name) && determined.has(name)))
    .map((row) => row.id);

  const result: RankIdentifiability = {
    determined: [...determined].sort(),
    determinedByRankOnly: [...determined].filter((name) => !forward.has(name)).sort(),
    surplusChecks: surplus,
    usedInReverse,
    monomialEdges: index.rows.map((r) => r.id),
  };
  perEdges.set(key, result);
  return result;
}

/**
 * Whether the rank determines `target` from `knownNames`. Only the
 * components the asserted set touches are solved, and each solve is
 * memoised, so the funnel's thousands of calls per anchor cost one solve
 * per touched component, plus one per hypothesis that actually asserts a
 * new name.
 */
function rankDetermines(
  edges: readonly BridgeEdge[],
  knownNames: readonly string[],
  target: string,
  identifications: readonly QuantityIdentification[],
): boolean {
  const index = rankIndex(edges, edgeMonomial, 'default');
  if (!index.componentOf.has(target)) return false;
  return solveRank(index, knownNames, identifications, false).determined.has(target);
}

/** The quantities from which `targetName` is forward-reachable (its
 *  backward cone, target included). */
function backwardCone(
  edges: readonly BridgeEdge[],
  targetName: string,
): Set<string> {
  const cone = new Set<string>([targetName]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edges) {
      if (!cone.has(e.target.name)) continue;
      for (const s of e.sources) {
        if (!cone.has(s.name)) {
          cone.add(s.name);
          changed = true;
        }
      }
    }
  }
  return cone;
}

/**
 * Classify the structural identifiability of `targetName` given
 * `knownNames` over `edges`. See the module docs and
 * docs/planning/Identifiability-Classifier-Design-Note.md.
 *
 * @public
 */
export function classifyIdentifiability(
  edges: readonly BridgeEdge[],
  knownNames: readonly string[],
  targetName: string,
  opts: IdentifiabilityOptions = {},
): IdentifiabilityResult {
  const identifications = opts.identifications ?? QUANTITY_IDENTIFICATIONS;
  const known = [...new Set(knownNames)];

  const closure = forwardClosure(edges, known, identifications);
  // The rank is computed once per result and only when something reads it:
  // the verdict needs it only for a target the closure does not reach, and
  // the funnel classifies thousands of targets whose verdict it does reach.
  let rankMemo: RankIdentifiability | undefined;
  const rankOf = (): RankIdentifiability => {
    rankMemo ??= identifiabilityByRank(edges, known, { identifications });
    return rankMemo;
  };
  // The union: the closure (every edge, forward) and the rank (the monomial
  // edges, either way). `determinedByRankOnly` is reported against the whole
  // closure here, so a name the closure reaches through an opaque edge is
  // not counted as rank-only.
  const determinableOf = (): Set<string> => new Set<string>([...closure, ...rankOf().determined]);
  const rankReport = (): RankIdentifiability => {
    const rank = rankOf();
    return { ...rank, determinedByRankOnly: rank.determined.filter((name) => !closure.has(name)) };
  };

  // Derivations must not depend on the target itself: close over the
  // graph with every edge INTO the target removed (excludes circular
  // self-support — see the design note's worked counterexample).
  const edgesMinusIntoTarget = edges.filter(
    (e) => e.target.name !== targetName,
  );
  const dMinusT = forwardClosure(edgesMinusIntoTarget, known, identifications);

  const derivations = edges
    .filter(
      (e) =>
        e.target.name === targetName &&
        e.sources.every((s) => dMinusT.has(s.name)),
    )
    .map((e) => e.id);

  const isGiven = known.includes(targetName);
  let verdict: IdentifiabilityVerdict;
  if (isGiven) {
    verdict = 'given';
  } else if (!closure.has(targetName) && !rankDetermines(edges, known, targetName, identifications)) {
    verdict = 'under-determined';
  } else if (derivations.length >= 2) {
    verdict = 'over-determined';
  } else {
    // One forward derivation, or determined by identity, or determined by
    // the rank alone (then `derivations` is empty and `rank.usedInReverse`
    // names the laws that were read backwards).
    verdict = 'exactly-determined';
  }

  const surplusConstraints = isGiven
    ? derivations.length
    : Math.max(0, derivations.length - 1);

  let blockingFrontier: string[] = [];
  if (verdict === 'under-determined') {
    const knownSet = new Set(known);
    const determinable = determinableOf();
    blockingFrontier = [...backwardCone(edges, targetName)]
      .filter(
        (q) => q !== targetName && !determinable.has(q) && !knownSet.has(q),
      )
      .sort();
  }

  return {
    target: targetName,
    known,
    verdict,
    derivations,
    surplusConstraints,
    blockingFrontier,
    get determinable(): readonly string[] {
      return [...determinableOf()].sort();
    },
    get rank(): RankIdentifiability {
      return rankReport();
    },
  };
}

/**
 * Classify every quantity that is some edge's target, against one known
 * set. The natural feeder for a retrodiction harness (mask a node, ask
 * whether the graph recovers it). Sorted by target name.
 *
 * @public
 */
export function classifyAll(
  edges: readonly BridgeEdge[],
  knownNames: readonly string[],
  opts: IdentifiabilityOptions = {},
): IdentifiabilityResult[] {
  const targets = [...new Set(edges.map((e) => e.target.name))].sort();
  return targets.map((t) =>
    classifyIdentifiability(edges, knownNames, t, opts),
  );
}
