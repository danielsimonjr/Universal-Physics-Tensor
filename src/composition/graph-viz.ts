/**
 * Physics-map visualization — turn the composition hypergraph into Mermaid and
 * Graphviz-DOT **source text**.
 *
 * The graph is bipartite in the drawing: round nodes are *quantities*
 * (`mass`, `temperature`, …) and box nodes are *equations* — laws, bridges, or
 * proposed relations — each an n-ary junction (its source quantities point in,
 * its target points out). This makes "equations as junctions" literal and draws
 * n-ary edges faithfully (a single Mermaid/DOT edge can only connect two nodes).
 *
 * The model computes its own connected components over the junctions — so a
 * `--proposed` overlay participates in the clustering — and groups each component
 * into its own subgraph so the genuinely disjointed map stays legible. For the
 * pure-`BridgeEdge` case the component count matches the authoritative
 * {@link linkageMap} (pinned by a drift-guard test).
 *
 * Pure string production: no file I/O (the CLI is the only file-touching layer).
 *
 * @module composition/graph-viz
 */

import type { BridgeEdge } from './edge.js';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';
import type { EvidenceTag, RelationType } from '../atlas/types.js';
import {
  catalogEvidenceInput,
  deriveEvidenceForVerdict,
  NO_PASSING_WITNESSES,
} from '../atlas/derive-evidence.js';
import { adjudicateBridgeEntry } from '../bridges/membership.js';
import { BRIDGE_EQUATIONS } from '../bridges/index.js';

/**
 * Epistemic status of a junction — drives node colour/shape. Bridges carry
 * their catalog confidence; `law` is a diagonal/established-physics edge;
 * `proposed` is a machine-derived, unadjudicated relation (rendered quarantined).
 *
 * @public
 */
export type VizStatus =
  | 'law'
  | 'established'
  | 'speculative'
  | 'highly-speculative'
  | 'proposed'
  | 'user'
  | 'poster'
  | 'association';

/**
 * Every `VizStatus`, as VALUES.
 *
 * Exists so the union can be pinned at RUNTIME. `VizStatus` is a type: the
 * public-surface test pins its NAME and nothing pins its MEMBERS, so widening
 * it is invisible to every existing test. This array is what the three places
 * a status must be registered are checked against — `STATUS_STYLE` (a compile
 * error when incomplete), `STATUSES_IN_ORDER` (a plain array that would
 * SILENTLY omit a Mermaid `classDef`), and the published surface.
 *
 * @internal
 */
export const ALL_VIZ_STATUSES: readonly VizStatus[] = [
  'law',
  'established',
  'speculative',
  'highly-speculative',
  'proposed',
  'user',
  'poster',
  'association',
];

/**
 * A normalized equation junction: n source quantities → 1 target. The render
 * model's unit of "equation", decoupled from both `BridgeEdge` and the internal
 * `ProposedBridge` type (the CLI converts each into this shape).
 *
 * @public
 */
export interface VizJunction {
  /** Graph id, e.g. `'be-42'` or `'IC-…'`. */
  readonly id: string;
  /** Short human label. */
  readonly label: string;
  readonly status: VizStatus;
  /** Source quantity names. */
  readonly sources: readonly string[];
  /** Target quantity name. */
  readonly target: string;
  /**
   * The Atlas Phase 1 relation TYPE this junction's edge records, when one was
   * recorded. Absent means "nobody has audited this edge", which is a
   * different statement from "this edge is not an approximation" — the
   * filtering in {@link buildVizModel} keeps the two apart and counts them
   * separately.
   */
  readonly relation?: RelationType;
  /**
   * The catalog id this junction's edge cross-references, when it has one.
   * Carried so evidence can be DERIVED at read time; no evidence tag is ever
   * stored on a junction.
   */
  readonly beId?: number | null;
}

/**
 * Why junctions were left out of a filtered map.
 *
 * The two dropped counts are SEPARATE on purpose. An edge dropped for not
 * matching the filter answered the question; an edge dropped for carrying no
 * overlay never got asked. Folding them together would let an unaudited graph
 * render as a complete answer to a question nobody could put to it.
 *
 * @public
 */
export interface VizFilterStats {
  /** Junctions considered, before filtering. */
  readonly total: number;
  /** Junctions rendered. */
  readonly kept: number;
  /** Dropped because their recorded metadata did not match the filter. */
  readonly droppedNotMatching: number;
  /** Dropped because they carry no metadata the filter could read. */
  readonly droppedMissingMetadata: number;
  /** The `relation` filter in force, if any. */
  readonly relation?: RelationType;
  /** The `evidence` filter in force, if any. */
  readonly evidence?: EvidenceTag;
}

/**
 * One connected component of the bipartite graph.
 *
 * @public
 */
export interface VizCluster {
  /** Junction ids in this component. */
  readonly junctionIds: readonly string[];
  /** Distinct (canonical) quantity names touched by this component. */
  readonly quantities: readonly string[];
  /** Number of junctions (the cluster "size", matching `linkageMap`). */
  readonly size: number;
  /** Contains a `law`/`established` junction (anchored to known physics). */
  readonly anchored: boolean;
}

/**
 * Options for {@link buildVizModel}.
 *
 * @public
 */
export interface VizOptions {
  /** Diagram title (used as the graph label). */
  readonly title?: string;
  /** Already-normalized extra junctions to overlay (e.g. proposed relations). */
  readonly extraJunctions?: readonly VizJunction[];
  /**
   * Keep only junctions whose recorded relation is this type.
   *
   * ⚠ Setting ANY filter changes what a missing overlay MEANS. Unfiltered, an
   * edge with no `relation` is kept — the map is about connectivity and an
   * unaudited edge still connects. Filtered, it is dropped, because it cannot
   * be shown to satisfy the filter. The count of those drops is reported
   * separately in {@link VizFilterStats} and printed in the legend.
   */
  readonly relation?: RelationType;
  /**
   * Keep only junctions whose DERIVED evidence set contains this tag.
   *
   * Evidence is never stored. It is derived from the catalog row named by the
   * junction's `beId`, every time it is asked for; a junction with no numeric
   * `beId` cannot be evaluated and counts as LACKING metadata, not as
   * non-matching.
   */
  readonly evidence?: EvidenceTag;
  /**
   * Override the evidence derivation. Exists so a test can prove the filter
   * selects on DERIVED tags rather than on anything stored; production callers
   * leave it unset and get {@link deriveEdgeEvidence}.
   */
  readonly deriveEvidence?: (beId: number) => ReadonlySet<EvidenceTag>;
}

/**
 * The render model: normalized junctions, their connected components, and the
 * two serializers.
 *
 * @public
 */
export interface VizModel {
  readonly junctions: readonly VizJunction[];
  readonly clusters: readonly VizCluster[];
  /** What filtering did. Present even when no filter was set (all kept). */
  readonly filterStats: VizFilterStats;
  /** One-line legend describing the filter, or `null` when none is in force. */
  readonly filterLegend: string | null;
  toMermaid(): string;
  toDot(): string;
}

/** Fill colour + dashed flag per status. Tweak here to restyle the whole map. */
const STATUS_STYLE: Readonly<
  Record<VizStatus, { readonly fill: string; readonly stroke: string; readonly dashed: boolean }>
> = {
  law: { fill: '#cfe3f7', stroke: '#3a6ea5', dashed: false }, // textbook law — blue
  established: { fill: '#cde7d3', stroke: '#3f8f5b', dashed: false }, // solid bridge — green
  speculative: { fill: '#fdebc8', stroke: '#c9881b', dashed: false }, // amber
  'highly-speculative': { fill: '#f5c6c6', stroke: '#c0392b', dashed: false }, // red
  proposed: { fill: '#e6e6e6', stroke: '#888888', dashed: true }, // unadjudicated — grey dashed
  user: { fill: '#e9d8fd', stroke: '#6b46c1', dashed: false }, // user-supplied — violet
  // Poster index (Atlas Phase 3). A derivation is a SOLID box: it is a stated
  // claim with a recorded relation, not an unadjudicated guess like `proposed`.
  poster: { fill: '#dbe7ff', stroke: '#4c6ef5', dashed: false }, // indigo
  // An association is DASHED because it asserts no relation at all
  // (`atlas/association.ts`): the dash is the only thing in the drawing that
  // says "this line is a resemblance, not a claim". Do not make it solid.
  association: { fill: '#f3f0e7', stroke: '#8d7b4f', dashed: true }, // khaki dashed
};

/** Map a `BridgeEdge` to a `VizJunction` (raw quantity names).
 *
 * The display label is the compact catalog id (`BE-<n>`) when the edge is
 * catalog-backed, else the edge's own label — a *map* reads better with short
 * junction names; the full formula stays in the catalog. */
export function edgeToJunction(edge: BridgeEdge): VizJunction {
  const status: VizStatus = edge.kind === 'law' ? 'law' : edge.confidence;
  return {
    id: edge.id,
    label: edge.beId != null ? `BE-${edge.beId}` : edge.label,
    status,
    sources: edge.sources.map((s) => s.name),
    target: edge.target.name,
    ...(edge.relation ? { relation: edge.relation.type } : {}),
    beId: edge.beId,
  };
}

/**
 * Derive the evidence tags of the catalog row a `beId` names — at READ TIME,
 * from the artifacts that row actually carries.
 *
 * This is the whole contract: there is no evidence FIELD anywhere to read. A
 * stored tag would be an assertion nobody re-checks, which is the failure this
 * project has already removed twice. An unknown `beId` derives the empty set
 * (no row, no artifacts, no claim) rather than a default tag.
 *
 * `NO_PASSING_WITNESSES` is passed deliberately: catalog rows declare no
 * `witnesses` at all, so no witness-backed tag can be earned from them today,
 * and saying so explicitly is required by `deriveEvidence`'s own contract.
 * A catalog `formalRef` is not passed. A proof of one part does not tag the row.
 *
 * @internal — CLI support, reached through `src/cli-api.ts`. Not on the
 * published surface: `tests/api/public-surface.test.ts` pins that surface and
 * a filter helper is not part of the library's v0.4.0 contract.
 */
export function deriveEdgeEvidence(beId: number): ReadonlySet<EvidenceTag> {
  const row = BRIDGE_EQUATIONS.find((e) => e.id === beId);
  if (row === undefined) return new Set<EvidenceTag>();
  return deriveEvidenceForVerdict(
    adjudicateBridgeEntry(row),
    catalogEvidenceInput(row),
    NO_PASSING_WITNESSES,
  );
}

/** How one junction fared against the filters. */
type FilterVerdict = 'keep' | 'not-matching' | 'missing-metadata';

/** The overlay a filter reads off a junction or an edge. */
interface OverlayView {
  readonly relation?: RelationType;
  readonly beId?: number | null;
}

function judge(
  item: OverlayView,
  opts: Pick<VizOptions, 'relation' | 'evidence' | 'deriveEvidence'>,
): FilterVerdict {
  const derive = opts.deriveEvidence ?? deriveEdgeEvidence;
  if (opts.relation !== undefined) {
    if (item.relation === undefined) return 'missing-metadata';
    if (item.relation !== opts.relation) return 'not-matching';
  }
  if (opts.evidence !== undefined) {
    if (item.beId == null) return 'missing-metadata';
    if (!derive(item.beId).has(opts.evidence)) return 'not-matching';
  }
  return 'keep';
}

/**
 * Apply the same filters `buildVizModel` applies, to a raw edge list — so the
 * TEXT map and the visual map can never disagree about what a filter selects.
 *
 * @internal — CLI support, reached through `src/cli-api.ts`.
 */
export function filterEdges(
  edges: readonly BridgeEdge[],
  opts: Pick<VizOptions, 'relation' | 'evidence' | 'deriveEvidence'>,
): { readonly kept: BridgeEdge[]; readonly stats: VizFilterStats } {
  const kept: BridgeEdge[] = [];
  let droppedNotMatching = 0;
  let droppedMissingMetadata = 0;
  for (const e of edges) {
    switch (judge({ relation: e.relation?.type, beId: e.beId }, opts)) {
      case 'keep':
        kept.push(e);
        break;
      case 'not-matching':
        droppedNotMatching += 1;
        break;
      case 'missing-metadata':
        droppedMissingMetadata += 1;
        break;
    }
  }
  return {
    kept,
    stats: {
      total: edges.length,
      kept: kept.length,
      droppedNotMatching,
      droppedMissingMetadata,
      ...(opts.relation !== undefined ? { relation: opts.relation } : {}),
      ...(opts.evidence !== undefined ? { evidence: opts.evidence } : {}),
    },
  };
}

/**
 * The legend line. It always states the lacking-metadata count, including when
 * it is zero: a printed `0` says the graph was checked and nothing was hidden,
 * whereas an omitted line says nothing at all.
 *
 * @internal — CLI support, reached through `src/cli-api.ts`.
 */
export function formatFilterLegend(stats: VizFilterStats): string | null {
  const terms: string[] = [];
  if (stats.relation !== undefined) terms.push(`relation=${stats.relation}`);
  if (stats.evidence !== undefined) terms.push(`evidence=${stats.evidence}`);
  if (terms.length === 0) return null;
  return (
    `filter: ${terms.join(' ')} — ${stats.kept} of ${stats.total} kept; ` +
    `${stats.droppedNotMatching} dropped (did not match); ` +
    `${stats.droppedMissingMetadata} dropped (no overlay metadata)`
  );
}

/** Quantity-name canonicalizer from `QUANTITY_IDENTIFICATIONS` (matches `linkageMap`). */
function makeCanon(): (name: string) => string {
  const alias = new Map(QUANTITY_IDENTIFICATIONS.map((id) => [id.from, id.to]));
  return (n) => alias.get(n) ?? n;
}

/** Distinct canonical quantity names of a junction (sources ∪ target). */
function quantitiesOf(j: VizJunction): string[] {
  return [...new Set([...j.sources, j.target])];
}

/** Union-find component grouping of junctions sharing a (canonical) quantity. */
function componentsOf(junctions: readonly VizJunction[]): VizCluster[] {
  const parent = junctions.map((_, i) => i);
  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };

  const qToJunctions = new Map<string, number[]>();
  junctions.forEach((j, i) => {
    for (const qty of quantitiesOf(j)) {
      const arr = qToJunctions.get(qty) ?? [];
      arr.push(i);
      qToJunctions.set(qty, arr);
    }
  });
  for (const idxs of qToJunctions.values()) {
    for (let k = 1; k < idxs.length; k++) union(idxs[0], idxs[k]);
  }

  const groups = new Map<number, number[]>();
  junctions.forEach((_, i) => {
    const r = find(i);
    const arr = groups.get(r) ?? [];
    arr.push(i);
    groups.set(r, arr);
  });

  const clusters = [...groups.values()].map((idxs): VizCluster => {
    const js = idxs.map((i) => junctions[i]);
    const quantities = [...new Set(js.flatMap(quantitiesOf))].sort();
    return {
      junctionIds: js.map((j) => j.id),
      quantities,
      size: js.length,
      // DELIBERATE: only `law` and `established` anchor. A `poster`,
      // `association`, `proposed` or `user` junction never does — the poster
      // index maps claims and their supports, it does not assert that any of
      // them is textbook physics. Widening this would make an unanchored
      // cluster read as anchored the moment a poster overlay touched it.
      anchored: js.some((j) => j.status === 'law' || j.status === 'established'),
    };
  });
  // Deterministic: largest first, then by first junction id.
  clusters.sort(
    (a, b) => b.size - a.size || a.junctionIds[0].localeCompare(b.junctionIds[0]),
  );
  return clusters;
}

/** A stable, collision-free id factory mapping arbitrary keys to safe ids. */
function idFactory(prefix: string): (key: string) => string {
  const seen = new Map<string, string>();
  const used = new Set<string>();
  return (key) => {
    const cached = seen.get(key);
    if (cached) return cached;
    const base = `${prefix}_${key.replace(/[^A-Za-z0-9]/g, '_')}`;
    let id = base;
    let n = 1;
    while (used.has(id)) id = `${base}_${n++}`;
    used.add(id);
    seen.set(key, id);
    return id;
  };
}

/** Escape a label for Mermaid `["…"]` — XML-entity-encode the characters that
 *  break the quoted form or are read as entities (`&`, `"`, `<`, `>`). */
const mmLabel = (s: string): string =>
  s
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
/** Escape a label for a DOT double-quoted string. */
const dotLabel = (s: string): string =>
  s.replace(/\r\n|\r|\n/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Mermaid `classDef` emission order.
 *
 * ⚠ A plain array, so a status MISSING here does not fail to compile — it
 * silently omits that status's `classDef` and the node renders unstyled. That
 * is why `ALL_VIZ_STATUSES` exists and why a test compares the two sets.
 */
const STATUSES_IN_ORDER: readonly VizStatus[] = [
  'law',
  'established',
  'speculative',
  'highly-speculative',
  'proposed',
  'user',
  'poster',
  'association',
];

/**
 * Drive a format-specific cluster renderer over the standard layout, identical
 * for both emitters: multi-junction components first (each its own subgraph,
 * keyed `0`,`1`,…, labelled `anchored cluster (n)` / `cluster (n)`), then a
 * single `iso` subgraph collecting all singletons. The callback owns all
 * per-format string production; this owns only the traversal and labelling.
 */
function forEachClusterGroup(
  clusters: readonly VizCluster[],
  renderCluster: (label: string, junctionIds: readonly string[], key: string) => void,
): void {
  const multi = clusters.filter((c) => c.size > 1);
  const singletons = clusters.filter((c) => c.size === 1);
  multi.forEach((c, i) =>
    renderCluster(`${c.anchored ? 'anchored ' : ''}cluster (${c.size})`, c.junctionIds, String(i)),
  );
  if (singletons.length) {
    renderCluster(
      `isolated (${singletons.length})`,
      singletons.flatMap((c) => c.junctionIds),
      'iso',
    );
  }
}

function emitMermaid(
  clusters: readonly VizCluster[],
  byId: ReadonlyMap<string, VizJunction>,
  title: string,
  legend: string | null,
): string {
  const qid = idFactory('q');
  const jid = idFactory('j');
  const usedStatuses = new Set<VizStatus>();
  const out: string[] = [`flowchart LR`, `%% ${title}`];
  // The legend is a comment AND a rendered node: a comment alone disappears in
  // every renderer, and a filtered map that does not say it is filtered reads
  // as the whole graph.
  if (legend !== null) out.push(`%% ${legend}`);

  const renderCluster = (label: string, junctionIds: readonly string[], key: string): void => {
    out.push(`  subgraph cl_${key}["${mmLabel(label)}"]`);
    out.push(`    direction LR`);
    const declared = new Set<string>();
    const declareQ = (name: string): string => {
      const id = qid(name);
      if (!declared.has(id)) {
        out.push(`    ${id}(["${mmLabel(name)}"]):::qty`);
        declared.add(id);
      }
      return id;
    };
    for (const id of junctionIds) {
      const j = byId.get(id)!;
      usedStatuses.add(j.status);
      const jId = jid(j.id);
      out.push(`    ${jId}["${mmLabel(j.label)}"]:::${j.status}`);
      for (const s of j.sources) out.push(`    ${declareQ(s)} --> ${jId}`);
      out.push(`    ${jId} --> ${declareQ(j.target)}`);
    }
    out.push(`  end`);
  };

  forEachClusterGroup(clusters, renderCluster);

  if (legend !== null) out.push(`  legend["${mmLabel(legend)}"]:::legend`);

  for (const st of STATUSES_IN_ORDER) {
    if (!usedStatuses.has(st)) continue;
    const { fill, stroke, dashed } = STATUS_STYLE[st];
    out.push(
      `  classDef ${st} fill:${fill},stroke:${stroke}${dashed ? ',stroke-dasharray:4 3' : ''}`,
    );
  }
  out.push(`  classDef qty fill:#ffffff,stroke:#999999`);
  if (legend !== null) out.push(`  classDef legend fill:#ffffff,stroke:#333333`);
  return out.join('\n') + '\n';
}

function emitDot(
  clusters: readonly VizCluster[],
  byId: ReadonlyMap<string, VizJunction>,
  title: string,
  legend: string | null,
): string {
  const qid = idFactory('q');
  const jid = idFactory('j');
  const out: string[] = [
    `digraph PhysicsMap {`,
    // DOT's label is a single quoted string and `dotLabel` collapses newlines,
    // so the legend joins the title on one line rather than being dropped.
    `  label="${dotLabel(legend === null ? title : `${title} — ${legend}`)}";`,
    `  rankdir=LR;`,
    `  node [fontname="Helvetica"];`,
  ];

  const renderCluster = (label: string, junctionIds: readonly string[], key: string): void => {
    out.push(`  subgraph cluster_${key} {`);
    out.push(`    label="${dotLabel(label)}";`);
    const declared = new Set<string>();
    const declareQ = (name: string): string => {
      const id = qid(name);
      if (!declared.has(id)) {
        out.push(`    ${id} [shape=ellipse,label="${dotLabel(name)}"];`);
        declared.add(id);
      }
      return id;
    };
    for (const id of junctionIds) {
      const j = byId.get(id)!;
      const jId = jid(j.id);
      const { fill, stroke, dashed } = STATUS_STYLE[j.status];
      const style = dashed ? 'filled,dashed' : 'filled';
      out.push(
        `    ${jId} [shape=box,style="${style}",fillcolor="${fill}",color="${stroke}",label="${dotLabel(
          j.label,
        )}"];`,
      );
      for (const s of j.sources) out.push(`    ${declareQ(s)} -> ${jId};`);
      out.push(`    ${jId} -> ${declareQ(j.target)};`);
    }
    out.push(`  }`);
  };

  forEachClusterGroup(clusters, renderCluster);
  out.push(`}`);
  return out.join('\n') + '\n';
}

/**
 * Build the bipartite, clustered render model from a graph (+ optional overlay).
 * Quantity names are canonicalized via `QUANTITY_IDENTIFICATIONS` so the
 * clustering matches the authoritative {@link linkageMap}.
 *
 * @public
 */
export function buildVizModel(
  edges: readonly BridgeEdge[],
  opts: VizOptions = {},
): VizModel {
  const canon = makeCanon();
  const normalize = (j: VizJunction): VizJunction => ({
    ...j,
    sources: j.sources.map(canon),
    target: canon(j.target),
  });
  const all: VizJunction[] = [
    ...edges.map((e) => normalize(edgeToJunction(e))),
    ...(opts.extraJunctions ?? []).map(normalize),
  ];
  // Filtering is applied to the OVERLAY junctions too. A proposed or
  // user-supplied junction carries no relation and no beId, so a filtered map
  // drops it as lacking metadata — the same rule as any other edge, and the
  // count says so out loud rather than letting the overlay vanish quietly.
  const junctions: VizJunction[] = [];
  let droppedNotMatching = 0;
  let droppedMissingMetadata = 0;
  for (const j of all) {
    switch (judge(j, opts)) {
      case 'keep':
        junctions.push(j);
        break;
      case 'not-matching':
        droppedNotMatching += 1;
        break;
      case 'missing-metadata':
        droppedMissingMetadata += 1;
        break;
    }
  }
  const filterStats: VizFilterStats = {
    total: all.length,
    kept: junctions.length,
    droppedNotMatching,
    droppedMissingMetadata,
    ...(opts.relation !== undefined ? { relation: opts.relation } : {}),
    ...(opts.evidence !== undefined ? { evidence: opts.evidence } : {}),
  };
  const filterLegend = formatFilterLegend(filterStats);
  // A duplicate junction id (e.g. a proposed overlay colliding with an edge id)
  // would silently drop one from the rendered output — make it a loud error.
  const byId = new Map<string, VizJunction>();
  for (const j of junctions) {
    if (byId.has(j.id)) {
      throw new Error(`buildVizModel: duplicate junction id '${j.id}'`);
    }
    byId.set(j.id, j);
  }
  const clusters = componentsOf(junctions);
  const title = opts.title ?? 'UPT physics map';

  return {
    junctions,
    clusters,
    filterStats,
    filterLegend,
    toMermaid: () => emitMermaid(clusters, byId, title, filterLegend),
    toDot: () => emitDot(clusters, byId, title, filterLegend),
  };
}
