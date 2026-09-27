/**
 * `upt map --route=FROM,TO` and `upt map --family=NAME` — focused maps of the
 * ATLAS (models and the bridges between them), as opposed to the rest of `map`,
 * which draws the equation graph by shared quantities. The two graphs are
 * different facts: a shared quantity is connectivity, a bridge is a recorded
 * transformation between models, and neither is drawn as the other.
 *
 * Every view states its denominator (how many of the atlas's models and
 * bridges it shows) and its source.
 *
 * ## The join to the equation graph
 *
 * A model is joined to a canonical equation ONLY through the model's own
 * `canonicalRefs` field. Nothing is inferred from a shared dimension, a shared
 * quantity or a similar name, and a model with no recorded reference is shown
 * as having none recorded — an absent link, not a finding that none exists.
 *
 * ## Evidence without witness results
 *
 * Which witnesses pass is decided by repository test runs this command does not
 * observe. Every tag `deriveEvidence` emits is monotone in the passing set
 * except `proposed`, which is antitone, so deriving under NO passing witness
 * and under ALL of a bridge's witnesses passing brackets every possible result:
 * a tag in both is derived whatever the results are, a tag in neither cannot
 * be, and a tag in exactly one is undecided here. An undecided bridge is
 * counted apart from one that does not match.
 */
import type { CommandCtx } from '../command.js';
import { CliError } from '../errors.js';
import type { AtlasBridge, AtlasModel } from '../../cli-api.js';
import type { EvidenceTag, RelationType } from '../../atlas/types.js';
import { showInequality } from './regime.js';
import { missingForComposite, routeClaim, selectRoute, type RouteClaim } from './_atlas-route.js';

type Api = CommandCtx['api'];

export const ATLAS_SOURCE = 'atlas (ATLAS_FAMILIES, src/atlas/families.ts)';
export const LINK_SOURCE = 'AtlasModel.canonicalRefs';
const NO_LINK =
  'no canonical equation recorded in its canonicalRefs (an absent link, not a finding that none exists; ' +
  'nothing is inferred from shared quantities or names)';
const EPISTEMICS =
  'bridges are recorded transformations between models; the equation links are only those a model records. ' +
  'A route existing is not a warrant: the composed claim is.';

export interface EquationLink {
  id: string;
  name: string | null;
  formula: string | null;
  /** The canonical equation's edge in the equation graph, or null when the graph has none by that id. */
  graphEdge: { sources: string[]; target: string } | null;
}

export interface ModelView {
  id: string;
  family: string;
  dynamics: string;
  equationLinks: EquationLink[];
}

export interface EvidenceView {
  /** Derived whatever the witness results are. */
  derived: EvidenceTag[];
  /** Derived under some witness results and not others. */
  undecided: EvidenceTag[];
  formalRef: { system: string; fidelity: string } | null;
  witnesses: number;
}

export interface BridgeView {
  id: string;
  family: string;
  relation: RelationType;
  premises: { id: string; family: string }[];
  conclusion: { id: string; family: string };
  transformation: string;
  assumptions: string[];
  regime: { inequalities: string[]; vacuous: boolean };
  bound: { K: number; delta: number; norm: string; horizon: string } | null;
  evidence: EvidenceView;
}

function allModels(api: Api): Map<string, AtlasModel> {
  return new Map(api.ATLAS_FAMILIES.flatMap((f) => f.models.map((m) => [m.id, m] as const)));
}

function totals(api: Api): { families: number; models: number; bridges: number } {
  return {
    families: api.ATLAS_FAMILIES.length,
    models: api.ATLAS_FAMILIES.reduce((n, f) => n + f.models.length, 0),
    bridges: api.ATLAS_FAMILIES.reduce((n, f) => n + f.bridges.length, 0),
  };
}

function modelView(api: Api, m: AtlasModel): ModelView {
  return {
    id: m.id,
    family: m.family,
    dynamics: m.dynamics,
    equationLinks: m.canonicalRefs.map((ref) => {
      const eq = api.CANONICAL_EQUATIONS.find((e) => e.id === ref);
      const edge = api.CANONICAL_GRAPH.find((e) => e.id === ref);
      return {
        id: ref,
        name: eq?.name ?? null,
        formula: eq?.formula_latex ?? null,
        graphEdge: edge === undefined ? null : { sources: edge.sources.map((q) => q.name), target: edge.target.name },
      };
    }),
  };
}

function evidenceView(api: Api, b: AtlasBridge): EvidenceView {
  const none = api.deriveEvidence(b, api.NO_PASSING_WITNESSES);
  const all = api.deriveEvidence(b, new Set(b.witnesses.map((w) => w.id)));
  const tags = [...new Set([...none, ...all])].sort();
  return {
    derived: tags.filter((t) => none.has(t) && all.has(t)),
    undecided: tags.filter((t) => none.has(t) !== all.has(t)),
    formalRef: b.formalRef === undefined ? null : { system: b.formalRef.system, fidelity: b.formalRef.fidelity },
    witnesses: b.witnesses.length,
  };
}

function bridgeView(api: Api, b: AtlasBridge, family: string, models: Map<string, AtlasModel>): BridgeView {
  const at = (id: string) => ({ id, family: models.get(id)?.family ?? 'UNKNOWN' });
  return {
    id: b.id,
    family,
    relation: b.relation,
    premises: b.premises.map(at),
    conclusion: at(b.conclusion),
    transformation: b.transformation,
    assumptions: [...b.sideConditions],
    regime: { inequalities: b.regime.inequalities.map(showInequality), vacuous: b.regime.inequalities.length === 0 },
    bound:
      b.bound === undefined
        ? null
        : { K: b.bound.K, delta: b.bound.delta, norm: b.bound.norm, horizon: b.bound.horizon },
    evidence: evidenceView(api, b),
  };
}

function familyOfBridge(api: Api, id: string): string {
  return api.ATLAS_FAMILIES.find((f) => f.bridges.some((b) => b.id === id))?.family ?? 'UNKNOWN';
}

function linkSummary(models: readonly ModelView[]): { source: string; withLink: number; withoutLink: number; of: number } {
  const withLink = models.filter((m) => m.equationLinks.length > 0).length;
  return { source: LINK_SOURCE, withLink, withoutLink: models.length - withLink, of: models.length };
}

// ── route ──────────────────────────────────────────────────────────────────

export interface RouteView {
  view: 'route';
  from: string;
  to: string;
  source: string;
  /** null: no chain of bridges connects the endpoints. */
  steps: BridgeView[] | null;
  models: ModelView[];
  denominator: { bridges: { shown: number; of: number }; models: { shown: number; of: number } };
  selection: string;
  composition: {
    /** The running composite after each step; null once a step has composed to no claim. */
    running: { after: string; relation: RelationType | 'no-composite-claim' | null }[];
    /** Index into `steps` of the step whose composition the table declines, or null. */
    breaksAt: number | null;
    claim: RouteClaim | null;
    missing: string[];
  };
  equationLinks: ReturnType<typeof linkSummary>;
  epistemics: string;
}

const SELECTION =
  'the shortest route by bridge count (the one `upt path` reports); other routes between the endpoints, if any, are not shown';

export function parseRoute(raw: string): [string, string] {
  const parts = raw.split(',').map((s) => s.trim());
  if (parts.length !== 2 || parts.some((p) => p === '')) {
    throw new CliError(`upt map: --route='${raw}' must be FROM,TO (two model ids), e.g. --route=model-pendulum,model-lc`);
  }
  return parts as [string, string];
}

export function buildRouteView(api: Api, from: string, to: string): RouteView {
  const models = allModels(api);
  for (const id of [from, to]) {
    if (!models.has(id)) {
      throw new CliError(`upt map: '${id}' is not a model of any atlas family (run \`upt map --family=NAME\` to list one family's models)`);
    }
  }
  const { bridges } = selectRoute(api, from, to, 'map');
  const t = totals(api);
  const steps = bridges === null ? null : bridges.map((b) => bridgeView(api, b, familyOfBridge(api, b.id), models));
  const routeModels =
    bridges === null
      ? [from, to]
      : bridges.length === 0
        ? [from]
        : [bridges[0]!.premises[0]!, ...bridges.map((b) => b.conclusion)];
  const mv = routeModels.map((id) => modelView(api, models.get(id)!));

  const running: RouteView['composition']['running'] = [];
  let breaksAt: number | null = null;
  if (bridges !== null && bridges.length > 0) {
    let rel: RelationType | 'no-composite-claim' | null = bridges[0]!.relation;
    running.push({ after: bridges[0]!.id, relation: rel });
    for (let i = 1; i < bridges.length; i++) {
      if (rel === null || rel === 'no-composite-claim') rel = null;
      else {
        rel = api.composeRelation(rel, bridges[i]!.relation);
        if (rel === 'no-composite-claim') breaksAt = i;
      }
      running.push({ after: bridges[i]!.id, relation: rel });
    }
  }
  const claim = bridges === null || bridges.length === 0 ? null : routeClaim(api, bridges);
  const missing =
    claim !== null && claim.kind === 'no-claim' && claim.reason === 'no-composite-claim' ? missingForComposite(api, bridges!) : [];

  return {
    view: 'route',
    from,
    to,
    source: ATLAS_SOURCE,
    steps,
    models: mv,
    denominator: {
      bridges: { shown: steps?.length ?? 0, of: t.bridges },
      models: { shown: mv.length, of: t.models },
    },
    selection: SELECTION,
    composition: { running, breaksAt, claim, missing },
    equationLinks: linkSummary(mv),
    epistemics: EPISTEMICS,
  };
}

// ── family ─────────────────────────────────────────────────────────────────

export interface AtlasFilter {
  relation?: RelationType;
  evidence?: EvidenceTag;
}

export interface AtlasFilterStats {
  relation?: RelationType;
  evidence?: EvidenceTag;
  total: number;
  kept: number;
  droppedNotMatching: number;
  /** Bridges whose match depends on witness results this command does not observe. */
  droppedUndecided: number;
}

export interface FamilyView {
  view: 'family';
  family: string;
  source: string;
  models: ModelView[];
  /** Bridges filed under the family, then bridges filed elsewhere that touch one of its models. */
  bridges: (BridgeView & { role: 'filed' | 'touching' })[];
  rejections: { id: string; claimed: RelationType; premises: string[]; conclusion: string; reason: string }[];
  denominator: {
    models: { shown: number; of: number };
    bridgesFiled: { shown: number; of: number };
    bridgesTouching: { shown: number; of: number };
    rejections: number;
  };
  filter: AtlasFilterStats | null;
  equationLinks: ReturnType<typeof linkSummary>;
  epistemics: string;
}

function judge(b: BridgeView, f: AtlasFilter): 'kept' | 'not-matching' | 'undecided' {
  if (f.relation !== undefined && b.relation !== f.relation) return 'not-matching';
  if (f.evidence === undefined || b.evidence.derived.includes(f.evidence)) return 'kept';
  return b.evidence.undecided.includes(f.evidence) ? 'undecided' : 'not-matching';
}

export function formatAtlasFilterLegend(s: AtlasFilterStats | null): string | null {
  if (s === null) return null;
  const terms = [
    ...(s.relation !== undefined ? [`relation=${s.relation}`] : []),
    ...(s.evidence !== undefined ? [`evidence=${s.evidence}`] : []),
  ];
  return (
    `filter: ${terms.join(' ')} — ${s.kept} of ${s.total} bridges kept; ` +
    `${s.droppedNotMatching} dropped (did not match); ` +
    `${s.droppedUndecided} dropped (undecided: depends on witness results this command does not observe)`
  );
}

export function buildFamilyView(api: Api, name: string, filter: AtlasFilter): FamilyView {
  const fam = api.ATLAS_FAMILIES.find((f) => f.family === name);
  if (fam === undefined) {
    throw new CliError(
      `upt map: unknown --family='${name}' (expected: ${api.ATLAS_FAMILIES.map((f) => f.family).join(' | ')})`,
    );
  }
  const models = allModels(api);
  const own = new Set(fam.models.map((m) => m.id));
  const filed = fam.bridges.map((b) => ({ ...bridgeView(api, b, fam.family, models), role: 'filed' as const }));
  const touching = api.ATLAS_FAMILIES.filter((f) => f !== fam).flatMap((f) =>
    f.bridges
      .filter((b) => [...b.premises, b.conclusion].some((id) => own.has(id)))
      .map((b) => ({ ...bridgeView(api, b, f.family, models), role: 'touching' as const })),
  );
  const all = [...filed, ...touching];
  const filtering = filter.relation !== undefined || filter.evidence !== undefined;
  const verdicts = all.map((b) => (filtering ? judge(b, filter) : 'kept'));
  const kept = all.filter((_, i) => verdicts[i] === 'kept');
  const n = (v: string) => verdicts.filter((x) => x === v).length;
  const mv = fam.models.map((m) => modelView(api, m));
  const t = totals(api);
  return {
    view: 'family',
    family: fam.family,
    source: ATLAS_SOURCE,
    models: mv,
    bridges: kept,
    rejections: fam.rejections.map((r) => ({
      id: r.id,
      claimed: r.claimed,
      premises: [...r.premises],
      conclusion: r.conclusion,
      reason: r.reason,
    })),
    denominator: {
      models: { shown: mv.length, of: t.models },
      bridgesFiled: { shown: kept.filter((b) => b.role === 'filed').length, of: t.bridges },
      bridgesTouching: { shown: kept.filter((b) => b.role === 'touching').length, of: t.bridges },
      rejections: fam.rejections.length,
    },
    filter: filtering
      ? {
          ...filter,
          total: all.length,
          kept: kept.length,
          droppedNotMatching: n('not-matching'),
          droppedUndecided: n('undecided'),
        }
      : null,
    equationLinks: linkSummary(mv),
    epistemics: EPISTEMICS,
  };
}

// ── text ───────────────────────────────────────────────────────────────────

function evidenceLine(e: EvidenceView, id: string): string {
  const derived = e.derived.length === 0 ? 'none' : e.derived.join(', ');
  const undecided =
    e.undecided.length === 0
      ? ''
      : `; undecided without witness results: ${e.undecided.join(', ')} (${e.witnesses} witness(es); \`upt atlas ${id} --run\`)`;
  const formal =
    e.formalRef === null ? '' : ` [formalRef ${e.formalRef.system}, fidelity ${e.formalRef.fidelity}; covers its statement only]`;
  return `evidence (derived): ${derived}${formal}${undecided}`;
}

function bridgeLines(b: BridgeView, indent: string): string[] {
  const at = (m: { id: string; family: string }, home: string) => (m.family === home ? m.id : `${m.id} (${m.family})`);
  const lines = [
    `${b.premises.map((p) => at(p, b.family)).join(' + ')} --[${b.relation}]--> ${at(b.conclusion, b.family)}  (${b.id}) [${b.family}]`,
    `${indent}transformation: ${b.transformation}`,
    `${indent}assumptions: ${b.assumptions.length === 0 ? 'none stated' : b.assumptions.join('; ')}`,
    `${indent}regime: ${b.regime.vacuous ? 'VACUOUS — states no inequality' : b.regime.inequalities.join('; ')}`,
    `${indent}bound: ${b.bound === null ? 'none stated' : `K = ${b.bound.K} · delta = ${b.bound.delta} (${b.bound.norm}); horizon ${b.bound.horizon}`}`,
    `${indent}${evidenceLine(b.evidence, b.id)}`,
  ];
  return lines;
}

function modelLines(m: ModelView, indent: string): string[] {
  const lines = [`${m.id} [${m.family}]: ${m.dynamics}`];
  if (m.equationLinks.length === 0) lines.push(`${indent}equations: ${NO_LINK}`);
  for (const l of m.equationLinks) {
    const eq = l.name === null ? `${l.id} (NOT in the canonical registry)` : `${l.id} — ${l.name}: ${l.formula}`;
    const edge =
      l.graphEdge === null ? 'no edge by this id in the equation graph' : `graph edge {${l.graphEdge.sources.join(', ')}} → ${l.graphEdge.target}`;
    lines.push(`${indent}equation: ${eq}; ${edge}`);
  }
  return lines;
}

function linkLine(s: ReturnType<typeof linkSummary>): string {
  return `equation links (source: ${s.source}): ${s.withLink} of ${s.of} models record one; ${s.withoutLink} record none`;
}

export function routeText(v: RouteView): string[] {
  const out = [`\nRoute map — ${v.from} → ${v.to}  [source: ${v.source}]`];
  if (v.steps === null) {
    out.push(
      `  shown: 0 of ${v.denominator.bridges.of} atlas bridges — no chain of bridges connects these models ` +
        '(only an exact equivalence is followed in both directions); there is nothing to compose.',
    );
    out.push('  endpoints:');
    for (const m of v.models) out.push(...modelLines(m, '      ').map((l, i) => (i === 0 ? `    ${l}` : l)));
    out.push(`  ${linkLine(v.equationLinks)}`);
    return out;
  }
  if (v.steps.length === 0) {
    out.push('  the endpoints are the same model: the route is empty and composes nothing.');
    return out;
  }
  out.push(
    `  shown: ${v.denominator.bridges.shown} of ${v.denominator.bridges.of} atlas bridges, ` +
      `${v.denominator.models.shown} of ${v.denominator.models.of} models — ${v.selection}`,
  );
  out.push('');
  v.steps.forEach((b, i) => {
    const [head, ...rest] = bridgeLines(b, '      ');
    out.push(`  step ${i + 1}  ${head}`, ...rest);
  });
  out.push('');
  out.push('  composition (the composition table, folded along the route):');
  v.composition.running.forEach((r, i) => {
    const state =
      r.relation === null
        ? 'not composed (an earlier step already yields no composite claim)'
        : r.relation === 'no-composite-claim'
          ? `NO COMPOSITE CLAIM — ${v.steps![i - 1]!.relation} then ${v.steps![i]!.relation} has no table cell`
          : r.relation;
    out.push(`    after step ${i + 1} (${r.after}): ${state}`);
  });
  const c = v.composition.claim!;
  if (c.kind === 'bound') {
    out.push(`    route claim: ${c.relation}, K = ${c.bound.K} · delta = ${c.bound.delta} (${c.norm ?? 'no norm stated'})`);
  } else {
    out.push(`    route claim: no composite claim — reason '${c.reason}': ${c.detail}`);
    if (v.composition.missing.length > 0) {
      out.push('    to compose, this route would need:');
      for (const m of v.composition.missing) out.push(`      - ${m}`);
    }
  }
  out.push('');
  out.push('  models on the route, with the equations each records:');
  for (const m of v.models) {
    const [head, ...rest] = modelLines(m, '      ');
    out.push(`    ${head}`, ...rest);
  }
  out.push(`  ${linkLine(v.equationLinks)}`);
  out.push(`\n  (${v.epistemics})`);
  return out;
}

export function familyText(v: FamilyView): string[] {
  const d = v.denominator;
  const out = [`\nFamily map — ${v.family}  [source: ${v.source}]`];
  out.push(
    `  shown: ${d.models.shown} of ${d.models.of} atlas models; ${d.bridgesFiled.shown} bridge(s) filed under ${v.family} ` +
      `and ${d.bridgesTouching.shown} filed elsewhere that touch its models, of ${d.bridgesFiled.of} atlas bridges; ` +
      `${d.rejections} rejection(s)`,
  );
  const legend = formatAtlasFilterLegend(v.filter);
  if (legend !== null) out.push(`  ${legend}`);
  out.push('');
  out.push('  models, with the equations each records:');
  for (const m of v.models) {
    const [head, ...rest] = modelLines(m, '      ');
    out.push(`    ${head}`, ...rest);
  }
  out.push(`  ${linkLine(v.equationLinks)}`);
  for (const role of ['filed', 'touching'] as const) {
    const bs = v.bridges.filter((b) => b.role === role);
    out.push('');
    out.push(role === 'filed' ? `  bridges filed under ${v.family} (${bs.length}):` : `  bridges filed in other families that touch ${v.family} models (${bs.length}):`);
    if (bs.length === 0) out.push('    none');
    for (const b of bs) {
      const [head, ...rest] = bridgeLines(b, '      ');
      out.push(`    ${head}`, ...rest);
    }
  }
  out.push('');
  out.push(`  rejections (${v.rejections.length}) — claimed bridges the atlas refutes:`);
  if (v.rejections.length === 0) out.push('    none recorded');
  for (const r of v.rejections) out.push(`    ${r.premises.join(' + ')} -x[${r.claimed}]-> ${r.conclusion}  (${r.id}): ${r.reason}`);
  out.push(`\n  (${v.epistemics})`);
  return out;
}

// ── diagrams ───────────────────────────────────────────────────────────────

const mm = (s: string): string =>
  s.replace(/\r\n|\r|\n/g, ' ').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dq = (s: string): string => s.replace(/\r\n|\r|\n/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

interface Diagram {
  title: string;
  models: ModelView[];
  bridges: BridgeView[];
  /** Bridge ids drawn as the step where composition yields no composite claim. */
  breaks: Set<string>;
}

/** The one-line denominator every diagram carries in its title. */
export function viewLegend(v: RouteView | FamilyView): string {
  if (v.view === 'route') {
    const d = v.denominator;
    return (
      `route ${v.from} → ${v.to}: ${d.bridges.shown} of ${d.bridges.of} atlas bridges, ${d.models.shown} of ${d.models.of} models ` +
      `[source: ${v.source}; equation links: ${LINK_SOURCE}]`
    );
  }
  const d = v.denominator;
  const f = formatAtlasFilterLegend(v.filter);
  return (
    `family ${v.family}: ${d.models.shown} of ${d.models.of} atlas models, ${d.bridgesFiled.shown} filed + ` +
    `${d.bridgesTouching.shown} touching of ${d.bridgesFiled.of} atlas bridges [source: ${v.source}; equation links: ${LINK_SOURCE}]` +
    (f === null ? '' : ` — ${f}`)
  );
}

function diagramOf(v: RouteView | FamilyView): Diagram {
  if (v.view === 'route') {
    const steps = v.steps ?? [];
    const br = v.composition.breaksAt;
    return { title: viewLegend(v), models: v.models, bridges: steps, breaks: new Set(br === null ? [] : [steps[br]!.id]) };
  }
  return { title: viewLegend(v), models: v.models, bridges: v.bridges, breaks: new Set() };
}

function idMaker(): (prefix: string, key: string) => string {
  const seen = new Map<string, string>();
  const used = new Set<string>();
  return (prefix, key) => {
    const k = `${prefix}:${key}`;
    const hit = seen.get(k);
    if (hit !== undefined) return hit;
    const base = `${prefix}_${key.replace(/[^A-Za-z0-9]/g, '_')}`;
    let id = base;
    for (let n = 1; used.has(id); n++) id = `${base}_${n}`;
    used.add(id);
    seen.set(k, id);
    return id;
  };
}

/** Models not in the view but named by a drawn bridge (a touching bridge's far end). */
function endpointsOutside(d: Diagram): string[] {
  const inView = new Set(d.models.map((m) => m.id));
  return [...new Set(d.bridges.flatMap((b) => [...b.premises.map((p) => p.id), b.conclusion.id]))].filter((id) => !inView.has(id));
}

function edgeLabel(b: BridgeView, breaks: boolean): string {
  return `${b.relation} (${b.id})${breaks ? ' — no composite claim from here' : ''}`;
}

export function toMermaid(v: RouteView | FamilyView): string {
  const d = diagramOf(v);
  const id = idMaker();
  const out = ['flowchart LR', `%% ${d.title}`, `  legend["${mm(d.title)}"]:::legend`];
  for (const m of d.models) out.push(`  ${id('m', m.id)}["${mm(`${m.id}: ${m.dynamics}`)}"]:::model`);
  for (const m of endpointsOutside(d)) out.push(`  ${id('m', m)}["${mm(m)}"]:::outside`);
  // linkStyle addresses links by definition order, so the bridge links are
  // emitted before any canonicalRef link.
  const breakIdx: number[] = [];
  let link = 0;
  for (const b of d.bridges) {
    const arrow = b.relation === 'exact-equivalence' ? '<-->' : '-->';
    for (const p of b.premises) {
      if (d.breaks.has(b.id)) breakIdx.push(link);
      link++;
      out.push(`  ${id('m', p.id)} ${arrow}|"${mm(edgeLabel(b, d.breaks.has(b.id)))}"| ${id('m', b.conclusion.id)}`);
    }
  }
  for (const m of d.models) {
    for (const l of m.equationLinks) {
      out.push(`  ${id('c', l.id)}(["${mm(l.name === null ? l.id : `${l.id}: ${l.formula}`)}"]):::equation`);
      out.push(`  ${id('m', m.id)} -.->|"canonicalRef"| ${id('c', l.id)}`);
    }
  }
  for (const i of breakIdx) out.push(`  linkStyle ${i} stroke:#c0392b,stroke-width:2px`);
  out.push('  classDef model fill:#cfe3f7,stroke:#3a6ea5');
  out.push('  classDef outside fill:#ffffff,stroke:#999999,stroke-dasharray:4 3');
  out.push('  classDef equation fill:#f3f0e7,stroke:#8d7b4f,stroke-dasharray:4 3');
  out.push('  classDef legend fill:#ffffff,stroke:#333333');
  return out.join('\n') + '\n';
}

export function toDot(v: RouteView | FamilyView): string {
  const d = diagramOf(v);
  const id = idMaker();
  const out = [
    'digraph AtlasMap {',
    `  label="${dq(d.title)}";`,
    '  rankdir=LR;',
    '  node [fontname="Helvetica"];',
  ];
  for (const m of d.models) out.push(`  ${id('m', m.id)} [shape=box,label="${dq(`${m.id}: ${m.dynamics}`)}"];`);
  for (const m of endpointsOutside(d)) out.push(`  ${id('m', m)} [shape=box,style=dashed,label="${dq(m)}"];`);
  for (const b of d.bridges) {
    const brk = d.breaks.has(b.id);
    const attrs = [
      `label="${dq(edgeLabel(b, brk))}"`,
      ...(b.relation === 'exact-equivalence' ? ['dir=both'] : []),
      ...(brk ? ['color="#c0392b"', 'penwidth=2'] : []),
    ];
    for (const p of b.premises) out.push(`  ${id('m', p.id)} -> ${id('m', b.conclusion.id)} [${attrs.join(',')}];`);
  }
  for (const m of d.models) {
    for (const l of m.equationLinks) {
      out.push(`  ${id('c', l.id)} [shape=ellipse,style=dashed,label="${dq(l.name === null ? l.id : `${l.id}: ${l.formula}`)}"];`);
      out.push(`  ${id('m', m.id)} -> ${id('c', l.id)} [style=dashed,label="canonicalRef"];`);
    }
  }
  out.push('}');
  return out.join('\n') + '\n';
}
