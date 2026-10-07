/**
 * Bridge-analysis — structural triage signals over the composition graph.
 *
 * INTERNAL (deliberately NOT on the public surface — not re-exported from
 * src/index.ts). A meta/analysis layer, like the catalog adjudicator, that
 * combines the dimensional engine with the graph to PRIORITIZE which
 * speculative bridges are closest to being DECIDABLE against established
 * physics — most anchored to the established core and most checkable.
 *
 * ⚠ This is a TRIAGE ranking (review/confrontation priority), NOT a
 * credibility ranking. The dimensional signals are orthogonal to whether a
 * bridge is true (see docs/research/Bridge-Equation-Dimensional-Audit.md:
 * the established Mercury perihelion is "unclosable"; the highly-speculative
 * Hawking-via-r_s derives cleanly). Do not prune, rank, or score the
 * catalog's credibility with this.
 *
 * Three engine signals + one catalog signal:
 *   - grounding   — does the equation re-derive as a recognized monomial
 *                   with a CLEAN dimensionless constant (ln2, 1/4π, √2π)?
 *   - complexity  — free dimensionless parameters (lower = more tractable).
 *   - anchoring   — graph distance to the established-confidence core.
 *   - status / data-confrontation — joined from the catalog (NOT engine).
 *
 * @module composition/bridge-analysis
 */

import { ALPHA } from '../core/constants.js';
import { constantRecord } from '../dimensional/symbolic-constants.js';
import { buckinghamPi, dimensionallyDetermines } from '../dimensional/buckingham.js';
import type { Dimension } from '../dimensional/types.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import { equals, format } from '../dimensional/algebra.js';
import type { BridgeEdge } from './edge.js';
import { formulaShape } from './formula-shape.js';
import { BRIDGE_EQUATIONS } from '../bridges/index.js';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';
import { enumerateCompositions } from './enumerate.js';
import { DATA_CONFRONTED_IDS } from '../bridges/confrontation-coverage.js';

/** A fundamental constant the derivation search may add (with SI value). */
interface NamedConstant {
  readonly name: string;
  readonly dim: Dimension;
  readonly si: number;
}

/** ℏ, c, G, k_B, e — the constants the audit/triage may invoke, from the registry. */
const FUNDAMENTAL_CONSTANTS: readonly NamedConstant[] = ['ℏ', 'c', 'G', 'k_B', 'e'].map((name) => {
  const record = constantRecord(name)!;
  return { name, dim: record.dim, si: record.value };
});

function subsetsBySize<T>(arr: readonly T[]): T[][] {
  let out: T[][] = [[]];
  for (const x of arr) {
    const n = out.length;
    for (let i = 0; i < n; i++) out.push([...out[i], x]);
  }
  return out.sort((a, b) => a.length - b.length);
}

/**
 * All 2⁵ = 32 size-ordered subsets of `FUNDAMENTAL_CONSTANTS`, computed once.
 * `dimensionalFreedom` and `attemptDerivation` iterate these on every bridge,
 * and the set is invariant — consumers only read each subset (spread into a
 * `gov` list), never mutate it.
 */
const FUNDAMENTAL_CONSTANT_SUBSETS: readonly NamedConstant[][] =
  subsetsBySize(FUNDAMENTAL_CONSTANTS);

/**
 * Get `m[k]`, inserting `make()` first when absent — replaces the
 * `if (!m.has(k)) m.set(k, …); m.get(k)!` two-step (and its `!` assertion) with
 * one call that returns a non-null value.
 */
function mapGetOrInsert<K, V>(m: Map<K, V>, k: K, make: () => V): V {
  let v = m.get(k);
  if (v === undefined) {
    v = make();
    m.set(k, v);
  }
  return v;
}

type DV = { name: string; dim: Dimension };
const asVars = (e: BridgeEdge): { target: DV; sources: DV[] } => {
  const factors = e.formulaFactors ?? {};
  return {
    target: { name: e.target.name, dim: e.target.dim },
    // A dimensionless count is not a Buckingham governor. Folding it in
    // makes the monomial non-unique and the audit leaves DERIVED.
    sources: e.sources
      .filter((s) => factors[s.name] === undefined)
      .map((s) => ({ name: s.name, dim: s.dim })),
  };
};

const rankOf = (vars: DV[]): number => (vars.length ? buckinghamPi(vars).rank : 0);
const inSpan = (t: DV, gov: DV[]): boolean =>
  gov.length === 0 ? buckinghamPi([t]).rank === 0 : rankOf([t, ...gov]) === rankOf(gov);

/**
 * Free dimensionless parameters: minimal constant subset that puts the
 * target in span, then the leftover π-group count − 1. 0 = a single
 * dimensionless statement (monomial or decoy); k = monomial × F(k ratios).
 */
export function dimensionalFreedom(e: BridgeEdge): number {
  const { target, sources } = asVars(e);
  for (const S of FUNDAMENTAL_CONSTANT_SUBSETS) {
    const gov = [...sources, ...S];
    if (inSpan(target, gov)) return buckinghamPi([target, ...gov]).piGroupCount - 1;
  }
  return Infinity;
}

/** Deterministic, domain-valid input sets with per-source variation. */
function makeInputs(e: BridgeEdge): Array<Record<string, number>> {
  if (e.sources.length === 0) return [{}];
  const sets: Array<Record<string, number>> = [];
  for (let j = 0; j < 3; j++) {
    const inp: Record<string, number> = {};
    e.sources.forEach((s, i) => {
      inp[s.name] = Math.pow(1.6 + i, 1 + 0.27 * j);
    });
    try {
      if (e.domain.predicate(inp) && Number.isFinite(e.evaluate(inp))) sets.push(inp);
    } catch {
      /* skip */
    }
  }
  return sets;
}

/** Recognizable dimensionless prefactors (small rationals, 1/nπ, √, π). */
const CLEAN_PREFACTORS: readonly number[] = [
  1, 2, 3, 4, 0.5, 0.25, Math.log(2),
  1 / (2 * Math.PI), 1 / (4 * Math.PI), 1 / (8 * Math.PI),
  Math.sqrt(2 * Math.PI), Math.sqrt(Math.PI),
  Math.PI, 2 * Math.PI, 4 * Math.PI, 6 * Math.PI, 1 / (6 * Math.PI),
];
const isCleanPrefactor = (p: number): boolean =>
  CLEAN_PREFACTORS.some((c) => Math.abs(Math.abs(p) - c) < 1e-3 * c);

/**
 * CODATA fine-structure constant, from the owner. `μ0 = 2 α h / (e² c)`
 * rewrites a vacuum factor as a number times a monomial in `{ℏ, c, e}`.
 */

/**
 * True when a derived prefactor on `{ℏ, c, e}` times `α` is a recognized
 * constant. That factor is `μ0` rewritten through `α`. It is not an empirical
 * scale. The printed prefactor is not itself the recognized constant, so
 * `cleanPrefactor` stays false.
 * @internal
 */
export function vacuumConstantThroughAlpha(
  subset: readonly string[] | undefined,
  prefactor: number | undefined,
): boolean {
  if (subset === undefined || prefactor === undefined || !Number.isFinite(prefactor)) return false;
  if (subset.length !== 3 || !subset.includes('ℏ') || !subset.includes('c') || !subset.includes('e')) return false;
  return isCleanPrefactor(Math.abs(prefactor) * ALPHA);
}

/**
 * A canonical closure more than ten times away from 1 is not a recovered
 * prefactor. Stefan–Boltzmann (≈0.1645) and Wien (≈1.265) stay inside that
 * window and keep the empirical/tuned mark. A G-closure of an atomic law
 * (10^21–10^25) and the ℏ, c, e stand-in for the field energy density
 * (≈10.9) do not. After the sourced ½ is applied, the same stand-in sits
 * near 5.45, inside the window, and times α is 1/(8π). That is μ0 rewritten
 * through α. A larger subset that still contains {ℏ, c, e} is the same
 * rewrite, so it is still not derived. A catalog id is not a canonical id,
 * so be-74 stays where the catalog audit put it.
 * A recognized constant (2π, ln 2, 4π, 1/(6π), …) stays even when it sits
 * outside the window. `ALPHA` is the fine-structure constant declared above.
 */
function recoveredCanonicalPrefactor(
  id: string,
  prefactor: number,
  subset: readonly string[],
): boolean {
  if (!id.startsWith('CE-') || isCleanPrefactor(prefactor)) return true;
  if (
    subset.includes('ℏ') &&
    subset.includes('c') &&
    subset.includes('e') &&
    isCleanPrefactor(Math.abs(prefactor) * ALPHA)
  ) {
    return false;
  }
  const mag = Math.abs(prefactor);
  if (!(mag > 0) || !Number.isFinite(mag)) return false;
  return Math.abs(Math.log10(mag)) <= 1;
}

/**
 * The outcome of trying to derive a bridge dimensionally + verify it.
 * `not-a-monomial` means the encoded formula adds dimensionful terms, so a
 * monomial reconstruction does not apply. It is not a failed reconstruction.
 */
type DerivationStatus =
  | 'derived'
  | 'decoy'
  | 'open'
  | 'no-samples'
  | 'not-a-monomial'
  | 'coefficient-unset';
interface DerivationResult {
  readonly status: DerivationStatus;
  readonly subset?: readonly string[];
  readonly monomial?: Readonly<Record<string, number>>;
  readonly prefactor?: number;
  /** True when derived AND the prefactor is a recognizable constant. */
  readonly cleanPrefactor?: boolean;
}

/**
 * Attempt to derive a bridge: the first constant-subset that dimensionally
 * closes the target AND reproduces the evaluator up to a constant ratio.
 */
export function attemptDerivation(e: BridgeEdge): DerivationResult {
  // A sum of dimensionful terms is not a proportionality. The constant search
  // below would report a decoy, or a derived constant, for a monomial the
  // formula is not. Proof status is separate and is not read here.
  if (e.symbolic !== undefined && formulaShape(e.symbolic) === 'dimensional-sum') {
    return { status: 'not-a-monomial' };
  }
  // A missing coefficient is not the constant 1. The evaluator returns
  // no number, so a ratio against that number is not a recovered prefactor.
  if (e.coefficientUnset === true) return { status: 'coefficient-unset' };
  const { target, sources } = asVars(e);
  const inputs = makeInputs(e);
  const need = e.sources.length === 0 ? 1 : 2;
  let anyClosure = false;
  for (const S of FUNDAMENTAL_CONSTANT_SUBSETS) {
    const r = dimensionallyDetermines(target, [...sources, ...S]);
    if (!r.determined) continue;
    anyClosure = true;
    if (inputs.length < need) continue;
    const ratios = inputs.map((i) => {
      let cand = 1;
      const factors = e.formulaFactors ?? {};
      for (const s of e.sources) {
        if (factors[s.name] !== undefined) continue;
        cand *= Math.pow(i[s.name], r.monomial![s.name] ?? 0);
      }
      for (const k of S) cand *= Math.pow(k.si, r.monomial![k.name] ?? 0);
      for (const [name, exp] of Object.entries(factors)) cand *= Math.pow(i[name]!, exp);
      return e.evaluate(i) / cand;
    });
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const cv =
      Math.sqrt(ratios.reduce((a, b) => a + (b - mean) ** 2, 0) / ratios.length) /
      Math.abs(mean);
    if (cv < 1e-9 && recoveredCanonicalPrefactor(e.id, mean, S.map((x) => x.name))) {
      return {
        status: 'derived',
        subset: S.map((x) => x.name),
        monomial: r.monomial,
        prefactor: mean,
        cleanPrefactor: isCleanPrefactor(mean),
      };
    }
  }
  if (inputs.length < need) return { status: 'no-samples' };
  return { status: anyClosure ? 'decoy' : 'open' };
}

/**
 * Graph distance from a bridge's quantities to the established-confidence
 * core (BFS over quantity co-occurrence). 0 = shares a quantity with an
 * established edge; Infinity = structurally isolated from it.
 */
export function anchoringDistance(
  edges: readonly BridgeEdge[],
  e: BridgeEdge,
): number {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    mapGetOrInsert(adj, a, () => new Set<string>()).add(b);
  };
  const core = new Set<string>();
  for (const edge of edges) {
    const q = [...edge.sources.map((s) => s.name), edge.target.name];
    for (const a of q) for (const b of q) if (a !== b) link(a, b);
    if (edge.confidence === 'established') for (const n of q) core.add(n);
  }
  const distOf = new Map<string, number>();
  const queue = [...core];
  for (const c of core) distOf.set(c, 0);
  while (queue.length) {
    const x = queue.shift()!;
    for (const y of adj.get(x) ?? []) {
      if (!distOf.has(y)) {
        distOf.set(y, distOf.get(x)! + 1);
        queue.push(y);
      }
    }
  }
  const qs = [...e.sources.map((s) => s.name), e.target.name];
  return Math.min(...qs.map((n) => (distOf.has(n) ? distOf.get(n)! : Infinity)));
}

/** How grounded the equation is, as a structural signal. */
type Grounding = 'grounded' | 'empirical' | 'decoy' | 'open';
/** Review-priority tier (1 = highest structural decidability). */
type Tier = 1 | 2 | 3;

/** One bridge's triage profile. */
interface BridgePriorityEntry {
  readonly id: string;
  readonly beId: number | null;
  readonly status: string;
  /** `grounded` (recognized monomial+clean constant) → `open` (multi-param). */
  readonly grounding: Grounding;
  /** Free dimensionless parameters (lower = more tractable). */
  readonly complexity: number;
  /** Graph distance to the established core (Infinity = isolated). */
  readonly anchoring: number;
  /** A committed data confrontation exists (catalog signal, NOT engine). */
  readonly hasDataConfrontation: boolean;
  readonly tier: Tier;
}

function grounding(e: BridgeEdge): Grounding {
  const d = attemptDerivation(e);
  if (d.status === 'derived') return d.cleanPrefactor ? 'grounded' : 'empirical';
  if (d.status === 'decoy') return 'decoy';
  // A dimensional sum has no recognized monomial. It is not a decoy.
  return 'open';
}

const GROUND_RANK: Record<Grounding, number> = {
  grounded: 0,
  empirical: 1,
  decoy: 2,
  open: 3,
};

/**
 * Triage the non-established bridges by structural decidability against the
 * established core. Returns profiles sorted best-first (Tier, then anchoring,
 * grounding, complexity). NOT a credibility ranking — see module docstring.
 */
export function bridgePriority(
  edges: readonly BridgeEdge[],
): BridgePriorityEntry[] {
  const statusOf = new Map<number, string>(
    BRIDGE_EQUATIONS.map((b) => [b.id, b.status]),
  );
  const entries: BridgePriorityEntry[] = [];
  for (const e of edges) {
    if (e.confidence === 'established') continue; // already in the core
    const g = grounding(e);
    const complexity = dimensionalFreedom(e);
    const anchoring = anchoringDistance(edges, e);
    const anchored = Number.isFinite(anchoring);
    const tier: Tier =
      anchored && (g === 'grounded' || complexity <= 1)
        ? 1
        : anchored || g === 'grounded'
          ? 2
          : 3;
    entries.push({
      id: e.id,
      beId: e.beId,
      status: e.beId == null ? 'law' : (statusOf.get(e.beId) ?? 'unknown'),
      grounding: g,
      complexity,
      anchoring,
      hasDataConfrontation: e.beId != null && DATA_CONFRONTED_IDS.has(e.beId),
      tier,
    });
  }
  entries.sort(
    (a, b) =>
      a.tier - b.tier ||
      a.anchoring - b.anchoring ||
      GROUND_RANK[a.grounding] - GROUND_RANK[b.grounding] ||
      a.complexity - b.complexity ||
      a.id.localeCompare(b.id),
  );
  return entries;
}

// ---------------------------------------------------------------------------
// Catalog linkage map — how the equations connect via shared quantities.
// ---------------------------------------------------------------------------

/**
 * Quantity-name canonicalizer honoring `QUANTITY_IDENTIFICATIONS`: maps each
 * name to its identified representative (e.g. hawking-temperature →
 * temperature). The shared linkage substrate for `linkageMap` /
 * `proposeLinkCandidates`. NOTE: `anchoringDistance` deliberately does NOT
 * use this — it links on raw names (its distance-0/∞ contract is pinned).
 */
function quantityCanonicalizer(): (n: string) => string {
  const alias = new Map<string, string>(
    QUANTITY_IDENTIFICATIONS.map((id) => [id.from, id.to]),
  );
  return (n: string): string => alias.get(n) ?? n;
}

/** An edge's distinct (canonical) quantity names — sources ∪ target. */
function quantitiesOf(e: BridgeEdge, canon: (n: string) => string): string[] {
  return [...new Set([...e.sources.map((s) => canon(s.name)), canon(e.target.name)])];
}

/** One connected cluster of equations linked by shared quantities. */
interface LinkageCluster {
  /** Edge ids in this cluster. */
  readonly edges: readonly string[];
  readonly size: number;
  /** Contains an established-confidence edge (anchored to known physics). */
  readonly anchored: boolean;
  /** Catalog-status histogram across the cluster's edges. */
  readonly statusMix: Readonly<Record<string, number>>;
  /** Quantities that appear in ≥2 of the cluster's edges (the link hubs). */
  readonly hubs: readonly string[];
}

/** The catalog's linkage structure. */
interface LinkageMap {
  /** Clusters, largest first. */
  readonly clusters: readonly LinkageCluster[];
  readonly componentCount: number;
  /** Single-edge cluster ids (structurally isolated). */
  readonly isolated: readonly string[];
  /** Number of valid pairwise compositions over the edge set (directed links). */
  readonly compositions: number;
}

/** The cluster structure WITHOUT the composition count — the cheap core every
 *  linkage consumer except `upt map`'s headline needs. */
type ClusterMap = Omit<LinkageMap, 'compositions'>;

/**
 * The cluster structure of the catalog graph: connected components whose nodes
 * are edges and whose links are shared quantities (honoring
 * `QUANTITY_IDENTIFICATIONS`). Reveals a dominant anchored core hubbed on a few
 * quantities, plus thematic clusters and a long isolated tail. A descriptive
 * structural map, NOT a credibility signal (see bridgePriority's caveat).
 *
 * This is the cheap core: it does NOT run the O(E²) pairwise-composition count.
 * The candidate/connector proposers (which never read `.compositions`) call
 * this directly; `linkageMap` adds the count for `upt map`'s headline.
 */
function clusterMap(edges: readonly BridgeEdge[]): ClusterMap {
  const statusOf = new Map<number, string>(
    BRIDGE_EQUATIONS.map((b) => [b.id, b.status]),
  );
  const canon = quantityCanonicalizer();

  // Union-find over edges sharing a (canonical) quantity.
  const parent = edges.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number): void => { parent[find(a)] = find(b); };
  const qToEdges = new Map<string, number[]>();
  edges.forEach((e, i) => {
    for (const q of quantitiesOf(e, canon)) {
      mapGetOrInsert(qToEdges, q, () => []).push(i);
    }
  });
  for (const idxs of qToEdges.values()) {
    for (let k = 1; k < idxs.length; k++) union(idxs[0], idxs[k]);
  }

  const groups = new Map<number, number[]>();
  edges.forEach((_, i) => {
    mapGetOrInsert(groups, find(i), () => []).push(i);
  });

  const clusters: LinkageCluster[] = [...groups.values()].map((idxs) => {
    const es = idxs.map((i) => edges[i]);
    const statusMix: Record<string, number> = {};
    const qcount: Record<string, number> = {};
    for (const e of es) {
      const s = e.beId == null ? 'law' : (statusOf.get(e.beId) ?? 'unknown');
      statusMix[s] = (statusMix[s] ?? 0) + 1;
      for (const q of quantitiesOf(e, canon)) qcount[q] = (qcount[q] ?? 0) + 1;
    }
    return {
      edges: es.map((e) => e.id),
      size: es.length,
      anchored: es.some((e) => e.confidence === 'established'),
      statusMix,
      hubs: Object.entries(qcount).filter(([, c]) => c >= 2).map(([q]) => q).sort(),
    };
  });
  clusters.sort((a, b) => b.size - a.size || a.edges[0].localeCompare(b.edges[0]));

  return {
    clusters,
    componentCount: clusters.length,
    isolated: clusters.filter((c) => c.size === 1).flatMap((c) => c.edges).sort(),
  };
}

/**
 * The full linkage map: the {@link clusterMap} structure plus the (O(E²))
 * pairwise-composition count. Only `upt map`'s headline needs the count, so
 * everything else calls `clusterMap` directly. Internal — not on the public
 * surface (mirrors the rest of bridge-analysis).
 */
export function linkageMap(edges: readonly BridgeEdge[]): LinkageMap {
  return {
    ...clusterMap(edges),
    compositions: enumerateCompositions(edges).all.length,
  };
}

// ---------------------------------------------------------------------------
// Link-candidate proposals — cross-cluster same-dimension quantity pairs.
// ---------------------------------------------------------------------------

/**
 * A candidate identification surfaced by the linkage map: two quantities in
 * DIFFERENT clusters with the SAME (non-dimensionless) dimension — a
 * potential "missing link" of the kind the Hawking-temperature ≡
 * temperature identification was.
 */
export interface LinkCandidate {
  /** Quantity in cluster A. */
  readonly a: string;
  /** Quantity in cluster B (a ≠ b; different clusters). */
  readonly b: string;
  /** Shared SI dimension (formatted). */
  readonly dim: string;
  /** One side is in the anchored (known-physics) cluster. */
  readonly touchesCore: boolean;
  /** The names share a word token (same physical KIND, e.g. both `*-mass`). */
  readonly sameKind: boolean;
  /** The shared token, when `sameKind`. */
  readonly sharedToken: string | null;
}

function sharedNameToken(a: string, b: string): string | null {
  const tb = new Set(b.split('-'));
  for (const t of a.split('-')) if (tb.has(t)) return t;
  return null;
}

/**
 * Propose candidate cross-cluster identifications from the linkage map:
 * every pair of quantities in different clusters that share a
 * non-dimensionless dimension. ⚠ This is a coincidence-heavy REVIEW SURFACE
 * (same dimension is a weak signal — see the dimensional audit's decoy
 * finding), NOT a list of discovered bridges. Ranked: core-touching first,
 * then same-kind. The output's only path is human adjudication
 * (Part-VI §XXVII-B).
 *
 * Internal — not on the public surface.
 */
export function proposeLinkCandidates(edges: readonly BridgeEdge[]): LinkCandidate[] {
  const m = clusterMap(edges); // clusters only — skips the O(E²) composition count
  const canon = quantityCanonicalizer();
  const edgeCluster = new Map<string, number>();
  m.clusters.forEach((c, ci) => c.edges.forEach((id) => edgeCluster.set(id, ci)));

  const qCluster = new Map<string, number>();
  const qDim = new Map<string, Dimension>();
  const qAnchored = new Map<string, boolean>();
  for (const e of edges) {
    const ci = edgeCluster.get(e.id)!;
    const anchored = m.clusters[ci].anchored;
    for (const s of [...e.sources, e.target]) {
      const n = canon(s.name);
      qCluster.set(n, ci);
      qDim.set(n, s.dim);
      if (anchored) qAnchored.set(n, true);
    }
  }

  const names = [...qDim.keys()];
  const out: LinkCandidate[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i];
      const b = names[j];
      if (qCluster.get(a) === qCluster.get(b)) continue; // already linked
      const da = qDim.get(a)!;
      if (equals(da, DIMENSIONLESS)) continue; // dimensionless = too generic
      if (!equals(da, qDim.get(b)!)) continue;
      const token = sharedNameToken(a, b);
      out.push({
        a,
        b,
        dim: format(da),
        touchesCore: !!(qAnchored.get(a) || qAnchored.get(b)),
        sameKind: token !== null,
        sharedToken: token,
      });
    }
  }
  out.sort(
    (x, y) =>
      Number(y.touchesCore) - Number(x.touchesCore) ||
      Number(y.sameKind) - Number(x.sameKind) ||
      x.a.localeCompare(y.a) ||
      x.b.localeCompare(y.b),
  );
  return out;
}

// ---------------------------------------------------------------------------
// Orphan connectors — candidate identifications that pull an ISOLATED bridge
// into the anchored core.
// ---------------------------------------------------------------------------

/**
 * A candidate identification with ONE endpoint on an isolated (single-edge)
 * bridge and the OTHER on an anchored-cluster bridge — accepting it would
 * connect orphaned physics to the established core.
 */
interface OrphanConnector {
  /** The isolated bridge's edge id (the orphan). */
  readonly orphanEdge: string;
  /** The orphan-side quantity. */
  readonly orphanQuantity: string;
  /** The core-side quantity it shares a dimension with. */
  readonly coreQuantity: string;
  /** An anchored-cluster edge touching `coreQuantity`. */
  readonly coreEdge: string;
  /** Shared SI dimension (formatted). */
  readonly dim: string;
  /** The two names share a word token. A token is not a verdict. */
  readonly sameKind: boolean;
  /** The shared token, when `sameKind`. */
  readonly sharedToken: string | null;
}

/** Orphan-connector report. */
interface OrphanConnectorReport {
  /** Connectors, same-kind first then by orphan id. */
  readonly connectors: readonly OrphanConnector[];
  /** Of those, how many share a name token. A token is not a verdict. */
  readonly sameKindCount: number;
  /** Isolated bridges with ≥1 same-kind connector to the core, sorted. */
  readonly connectedOrphans: readonly string[];
  /** Isolated bridges with NO connector at all (truly unconnected), sorted. */
  readonly unconnectedOrphans: readonly string[];
}

/**
 * Of the catalog's isolated bridges, which could connect to the anchored core
 * via a same-dimension quantity identification? This intersects
 * `proposeLinkCandidates` with the linkage map's isolated/anchored partition:
 * a connector is a cross-cluster candidate whose one side sits on an isolated
 * bridge and whose other side touches an anchored cluster. The same-kind
 * subset (shared name token) is the least-implausible set worth a physicist's
 * review — the structural frontier of the catalog (the 20 orphaned bridges).
 *
 * ⚠ Same dimension is a WEAK prior (the dimensional audit's decoy finding):
 * most connectors are coincidences (a Förster radius is not a Schwarzschild
 * radius). A REVIEW SURFACE only — Part-VI §XXVII-B. Internal.
 */
export function proposeOrphanConnectors(
  edges: readonly BridgeEdge[],
): OrphanConnectorReport {
  const m = clusterMap(edges); // clusters/isolated only — skips the composition count
  const isolated = new Set(m.isolated);
  const edgeAnchored = new Map<string, boolean>();
  m.clusters.forEach((c) => c.edges.forEach((id) => edgeAnchored.set(id, c.anchored)));

  // quantity (raw name) → the edges touching it. Isolated bridges carry no
  // registered identifications, so raw names suffice for the orphan side.
  const qToEdges = new Map<string, string[]>();
  for (const e of edges) {
    for (const q of [...e.sources, e.target]) {
      mapGetOrInsert(qToEdges, q.name, () => []).push(e.id);
    }
  }
  const orphanEdgeOf = (q: string): string | undefined =>
    (qToEdges.get(q) ?? []).find((id) => isolated.has(id));
  const anchoredEdgeOf = (q: string): string | undefined =>
    (qToEdges.get(q) ?? []).find((id) => edgeAnchored.get(id) === true);

  const connectors: OrphanConnector[] = [];
  for (const c of proposeLinkCandidates(edges)) {
    const aOrphan = orphanEdgeOf(c.a);
    const bOrphan = orphanEdgeOf(c.b);
    const aAnchored = anchoredEdgeOf(c.a);
    const bAnchored = anchoredEdgeOf(c.b);
    let conn: OrphanConnector | null = null;
    if (aOrphan && bAnchored) {
      conn = { orphanEdge: aOrphan, orphanQuantity: c.a, coreQuantity: c.b, coreEdge: bAnchored, dim: c.dim, sameKind: c.sameKind, sharedToken: c.sharedToken };
    } else if (bOrphan && aAnchored) {
      conn = { orphanEdge: bOrphan, orphanQuantity: c.b, coreQuantity: c.a, coreEdge: aAnchored, dim: c.dim, sameKind: c.sameKind, sharedToken: c.sharedToken };
    }
    if (conn) connectors.push(conn);
  }
  connectors.sort(
    (x, y) =>
      Number(y.sameKind) - Number(x.sameKind) ||
      x.orphanEdge.localeCompare(y.orphanEdge) ||
      x.orphanQuantity.localeCompare(y.orphanQuantity) ||
      x.coreQuantity.localeCompare(y.coreQuantity),
  );

  const connectedSameKind = new Set(
    connectors.filter((c) => c.sameKind).map((c) => c.orphanEdge),
  );
  const anyConnector = new Set(connectors.map((c) => c.orphanEdge));
  return {
    connectors,
    sameKindCount: connectors.filter((c) => c.sameKind).length,
    connectedOrphans: [...connectedSameKind].sort(),
    unconnectedOrphans: m.isolated.filter((id) => !anyConnector.has(id)).sort(),
  };
}
