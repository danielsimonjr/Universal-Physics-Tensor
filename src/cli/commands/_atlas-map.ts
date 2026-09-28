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
 * ## Evidence, and the witness results it is derived from
 *
 * Which witnesses pass is decided by runs the view may or may not observe.
 * Every tag `deriveEvidence` emits is monotone in the passing set except
 * `proposed`, which is antitone, so deriving under the witnesses KNOWN to pass
 * and under those plus every witness with NO observed result brackets every
 * possible result: a tag in both is derived whatever the unobserved results
 * are, a tag in neither cannot be, and a tag in exactly one is undecided here.
 * An undecided bridge is counted apart from one that does not match.
 *
 * With no results source every witness is unobserved. `--stored` observes the
 * committed artifact (`data/atlas/witness-results.json`); `--run` observes the
 * in-process registered witnesses, run by this invocation. Only a `'checked'`
 * row is a pass. A `'refuted'` or `'unresolved'` row is observed and not
 * passing, and the two are counted apart; a witness with no row stays
 * unobserved, whatever its name.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CommandCtx } from '../command.js';
import { CliError } from '../errors.js';
import type { AppliedTransport, AtlasBridge, AtlasModel } from '../../cli-api.js';
import type { EvidenceTag, RelationType } from '../../atlas/types.js';
import { showInequality } from './regime.js';
import {
  claimReport,
  explainsRefusal,
  missingForComposite,
  routeClaim,
  selectRoute,
  transportReport,
  type TransportReport,
} from './_atlas-route.js';

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
  /** Derived whatever the unobserved witness results are. */
  derived: EvidenceTag[];
  /** Derived under some unobserved witness results and not others. */
  undecided: EvidenceTag[];
  formalRef: { system: string; fidelity: string } | null;
  witnesses: number;
  /** Present only when the view reads a witness-results source. */
  results?: WitnessOutcomes;
}

// ── witness results ────────────────────────────────────────────────────────

export type ResultsMode = 'stored' | 'run';

export interface WitnessResultRow {
  recordId: string;
  witnessId: string;
  status: 'checked' | 'refuted' | 'unresolved';
  reason?: string;
}

export interface StoredProvenance {
  path: string;
  schemaVersion: string;
  /** What the artifact itself records about when it was produced. */
  carries: string;
  /** The last commit touching the file, read from git; null when git cannot say. */
  lastCommit: { hash: string; date: string } | null;
  /** Whether the working-tree file differs from that commit; null when git cannot say. */
  modifiedSinceCommit: boolean | null;
}

export interface WitnessResults {
  mode: ResultsMode;
  /** stored: the artifact and what is known of when it was made. run: what ran. */
  provenance: StoredProvenance | { ran: string; registered: number };
  rows: readonly WitnessResultRow[];
}

/** One bridge's witnesses, split by what the results source observed of each. */
export interface WitnessOutcomes {
  source: ResultsMode;
  checked: string[];
  refuted: string[];
  unresolved: { id: string; reason: string | null }[];
  /** No row in the source: a name, not a result. */
  notObserved: string[];
}

export const STORED_RESULTS_PATH = 'data/atlas/witness-results.json';
const ARTIFACT_CARRIES = 'the artifact records no commit or date of its own';

/** The repository root, when this module runs from a checkout (src/ or dist/). */
function repoRoot(): string {
  return fileURLToPath(new URL('../../../', import.meta.url));
}

/** The absolute path `--stored` reads, which an experiment record hashes as an input. */
export function storedResultsFile(): string {
  return join(repoRoot(), STORED_RESULTS_PATH);
}

function git(args: string[], cwd: string): string | null {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

/**
 * The committed witness-results artifact. It is a repository file, not shipped
 * in the package, so its absence is refused rather than read as "no results":
 * an empty source would render every tag exactly as the default view does,
 * under a label claiming it had been observed.
 */
export function loadStoredResults(command = 'upt map'): WitnessResults {
  const root = repoRoot();
  const file = storedResultsFile();
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new CliError(
      `${command}: --stored reads ${STORED_RESULTS_PATH}, a repository artifact not shipped in the package, and it is not ` +
        'present here; --run executes the in-process registered witnesses instead',
    );
  }
  const artifact = JSON.parse(raw) as { schemaVersion?: string; results?: WitnessResultRow[] };
  if (artifact.schemaVersion !== '0' || !Array.isArray(artifact.results)) {
    throw new CliError(`${command}: ${STORED_RESULTS_PATH} has schemaVersion '${String(artifact.schemaVersion)}'; this command reads '0'`);
  }
  const log = git(['log', '-1', '--format=%H %cI', '--', STORED_RESULTS_PATH], root);
  const [hash, date] = log === null || log === '' ? [] : log.split(' ');
  const lastCommit = hash !== undefined && date !== undefined ? { hash, date } : null;
  const status = lastCommit === null ? null : git(['status', '--porcelain', '--', STORED_RESULTS_PATH], root);
  return {
    mode: 'stored',
    provenance: {
      path: STORED_RESULTS_PATH,
      schemaVersion: artifact.schemaVersion,
      carries: ARTIFACT_CARRIES,
      lastCommit,
      modifiedSinceCommit: status === null ? null : status !== '',
    },
    rows: artifact.results.map((r) => ({
      recordId: r.recordId,
      witnessId: r.witnessId,
      status: r.status,
      ...(r.reason === undefined ? {} : { reason: r.reason }),
    })),
  };
}

/**
 * Run the in-process registered witnesses of `bridgeIds`, now, and those of
 * the norm transports the bridges declare (registered under the transport id).
 */
export async function runResults(api: Api, bridgeIds: ReadonlySet<string>): Promise<WitnessResults> {
  const transportIds = api.ATLAS_FAMILIES.flatMap((f) => f.bridges)
    .filter((b) => bridgeIds.has(b.id))
    .flatMap((b) => (b.normTransports ?? []).map((nt) => nt.id));
  const ids = new Set([...bridgeIds, ...transportIds]);
  const registered = api.WITNESS_REGISTRY.filter((e) => ids.has(e.recordId));
  const artifact = await api.runWitnessRegistry(registered);
  return {
    mode: 'run',
    provenance: { ran: 'runWitnessRegistry, in-process, by this invocation', registered: registered.length },
    rows: artifact.results.map((r) => ({
      recordId: r.recordId,
      witnessId: r.witnessId,
      status: r.status,
      ...(r.reason === undefined ? {} : { reason: r.reason }),
    })),
  };
}

function outcomes(b: AtlasBridge, results: WitnessResults): WitnessOutcomes {
  const rows = results.rows.filter((r) => r.recordId === b.id);
  const o: WitnessOutcomes = { source: results.mode, checked: [], refuted: [], unresolved: [], notObserved: [] };
  for (const w of b.witnesses) {
    const row = rows.find((r) => r.witnessId === w.id);
    if (row === undefined) o.notObserved.push(w.id);
    else if (row.status === 'checked') o.checked.push(w.id);
    else if (row.status === 'refuted') o.refuted.push(w.id);
    else o.unresolved.push({ id: w.id, reason: row.reason ?? null });
  }
  return o;
}

export interface ResultsTally {
  mode: ResultsMode;
  provenance: WitnessResults['provenance'];
  /** Witnesses of the bridges this view shows, by what the source observed. */
  witnesses: { checked: number; refuted: number; unresolved: number; notObserved: number };
}

function tally(results: WitnessResults | null, bridges: readonly BridgeView[]): ResultsTally | undefined {
  if (results === null) return undefined;
  const seen = new Map(bridges.map((b) => [b.id, b.evidence.results!] as const));
  const sum = (f: (o: WitnessOutcomes) => number) => [...seen.values()].reduce((n, o) => n + f(o), 0);
  return {
    mode: results.mode,
    provenance: results.provenance,
    witnesses: {
      checked: sum((o) => o.checked.length),
      refuted: sum((o) => o.refuted.length),
      unresolved: sum((o) => o.unresolved.length),
      notObserved: sum((o) => o.notObserved.length),
    },
  };
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

function evidenceView(api: Api, b: AtlasBridge, results: WitnessResults | null): EvidenceView {
  const o = results === null ? null : outcomes(b, results);
  const passing = o === null ? api.NO_PASSING_WITNESSES : new Set(o.checked);
  const open = o === null ? b.witnesses.map((w) => w.id) : o.notObserved;
  const low = api.deriveEvidence(b, passing);
  const high = api.deriveEvidence(b, new Set([...passing, ...open]));
  const tags = [...new Set([...low, ...high])].sort();
  return {
    derived: tags.filter((t) => low.has(t) && high.has(t)),
    undecided: tags.filter((t) => low.has(t) !== high.has(t)),
    formalRef: b.formalRef === undefined ? null : { system: b.formalRef.system, fidelity: b.formalRef.fidelity },
    witnesses: b.witnesses.length,
    ...(o === null ? {} : { results: o }),
  };
}

function bridgeView(
  api: Api,
  b: AtlasBridge,
  family: string,
  models: Map<string, AtlasModel>,
  results: WitnessResults | null = null,
): BridgeView {
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
    evidence: evidenceView(api, b, results),
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
    claim: ReturnType<typeof claimReport> | null;
    missing: string[];
    /** The declared norm transports that carried the bound across exact steps, with their witness results. */
    transports: (TransportReport & { result: TransportResult })[];
    /** The composite claim's evidence (ADR §4); null when the route makes no composite claim. */
    evidence: CompositeEvidenceView | null;
  };
  equationLinks: ReturnType<typeof linkSummary>;
  witnessResults?: ResultsTally;
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

function checkEndpoints(models: Map<string, AtlasModel>, from: string, to: string): void {
  for (const id of [from, to]) {
    if (!models.has(id)) {
      throw new CliError(`upt map: '${id}' is not a model of any atlas family (run \`upt map --family=NAME\` to list one family's models)`);
    }
  }
}

/** The models a route visits, in route order: an exact equivalence may be walked conclusion → premise. */
function routeModelIds(from: string, bridges: readonly AtlasBridge[]): string[] {
  const ids = [from];
  for (const b of bridges) {
    const at = ids[ids.length - 1]!;
    ids.push(b.conclusion === at && b.relation === 'exact-equivalence' ? b.premises[0]! : b.conclusion);
  }
  return ids;
}

/** What a results source observed of a transport's witness; 'no result' when it has no row or there is no source. */
export type TransportResult = 'checked' | 'refuted' | 'unresolved' | 'no result';

export interface CompositeEvidenceView {
  /** Derived whatever the unobserved results are: never stronger than the weakest part. */
  derived: EvidenceTag[];
  undecided: EvidenceTag[];
  rule: string;
}

const COMPOSITE_RULE =
  'derived from the parts (every step and every transport applied): a positive tag survives only if every part ' +
  "carries it, contradicted if any part does; a transport contributes its basis when its witness checks, else 'proposed' " +
  '(docs/planning/ADR-transported-norm-composition.md §4)';

function transportResult(nt: { id: string; witness: { id: string } }, results: WitnessResults | null): TransportResult {
  const row = results?.rows.find((r) => r.recordId === nt.id && r.witnessId === nt.witness.id);
  return row === undefined ? 'no result' : row.status;
}

/** The composite evidence of a bound route, bracketed over the unobserved witness results like one bridge's. */
function compositeEvidence(
  api: Api,
  bridges: readonly AtlasBridge[],
  transports: readonly AppliedTransport[],
  results: WitnessResults | null,
): CompositeEvidenceView {
  const lows: ReadonlySet<EvidenceTag>[] = [];
  const highs: ReadonlySet<EvidenceTag>[] = [];
  for (const b of bridges) {
    const o = results === null ? null : outcomes(b, results);
    const passing = o === null ? api.NO_PASSING_WITNESSES : new Set(o.checked);
    const open = o === null ? b.witnesses.map((w) => w.id) : o.notObserved;
    lows.push(api.deriveEvidence(b, passing));
    highs.push(api.deriveEvidence(b, new Set([...passing, ...open])));
  }
  for (const { transport } of transports) {
    const r = transportResult(transport, results);
    lows.push(new Set<EvidenceTag>([r === 'checked' ? transport.basis : 'proposed']));
    highs.push(new Set<EvidenceTag>([r === 'checked' || r === 'no result' ? transport.basis : 'proposed']));
  }
  const low = api.deriveCompositeEvidence(lows);
  const high = api.deriveCompositeEvidence(highs);
  const tags = [...new Set([...low, ...high])].sort();
  return {
    derived: tags.filter((t) => low.has(t) && high.has(t)),
    undecided: tags.filter((t) => low.has(t) !== high.has(t)),
    rule: COMPOSITE_RULE,
  };
}

/** The composition table folded along a non-empty route, and what the route supports. */
function composeSteps(api: Api, bridges: readonly AtlasBridge[], results: WitnessResults | null): RouteView['composition'] {
  const running: RouteView['composition']['running'] = [];
  let breaksAt: number | null = null;
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
  const claim = routeClaim(api, bridges);
  const missing = explainsRefusal(claim) ? missingForComposite(api, bridges) : [];
  const applied = claim.kind === 'bound' ? (claim.transports ?? []) : [];
  const transports = applied.map((a) => ({ ...transportReport(a), result: transportResult(a.transport, results) }));
  const evidence = claim.kind === 'bound' ? compositeEvidence(api, bridges, applied, results) : null;
  return { running, breaksAt, claim: claimReport(claim), missing, transports, evidence };
}

export function buildRouteView(api: Api, from: string, to: string, results: WitnessResults | null = null): RouteView {
  const models = allModels(api);
  checkEndpoints(models, from, to);
  const { bridges } = selectRoute(api, from, to, 'map');
  const t = totals(api);
  const steps = bridges === null ? null : bridges.map((b) => bridgeView(api, b, familyOfBridge(api, b.id), models, results));
  const routeModels = bridges === null ? [from, to] : routeModelIds(from, bridges);
  const mv = routeModels.map((id) => modelView(api, models.get(id)!));
  const { running, breaksAt, claim, missing, transports, evidence } =
    bridges === null || bridges.length === 0
      ? { running: [], breaksAt: null, claim: null, missing: [], transports: [], evidence: null }
      : composeSteps(api, bridges, results);
  const witnessResults = tally(results, steps ?? []);

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
    composition: { running, breaksAt, claim, missing, transports, evidence },
    equationLinks: linkSummary(mv),
    ...(witnessResults === undefined ? {} : { witnessResults }),
    epistemics: EPISTEMICS,
  };
}

// ── all routes ─────────────────────────────────────────────────────────────

export const DEFAULT_MAX_ROUTES = 20;
export const MAX_ROUTES_CEILING = 1000;

export interface RoutesView {
  view: 'routes';
  from: string;
  to: string;
  source: string;
  routes: {
    /** Bridge ids, in route order. */
    bridges: string[];
    /** Model ids, in route order. */
    models: string[];
    composition: RouteView['composition'];
    /** True for the route `upt path` (and `map --route` without --all-routes) reports. */
    reported: boolean;
  }[];
  /** Each bridge used by a shown route, once, in atlas order. */
  bridges: BridgeView[];
  models: ModelView[];
  count: {
    shown: number;
    limit: number;
    /** True: the search ran out of routes, so `shown` is every simple route. */
    exhausted: boolean;
    /** When not exhausted: every route of at most this many bridges is among those found. */
    completeThrough: number | null;
    /** When not exhausted: the route limit, or the search's work budget. */
    stoppedBy: 'limit' | 'budget' | null;
  };
  claims: { bound: number; noClaim: Record<string, number> };
  denominator: { bridges: { shown: number; of: number }; models: { shown: number; of: number } };
  selection: string;
  equationLinks: ReturnType<typeof linkSummary>;
  witnessResults?: ResultsTally;
  epistemics: string;
}

const ROUTES_SELECTION =
  'every simple route (no model visited twice), ordered by bridge count and then atlas order; the same traversal as ' +
  '`upt path`: an exact equivalence both ways, every other relation forward only, multi-premise bridges not followed';

export function buildRoutesView(
  api: Api,
  from: string,
  to: string,
  limit: number,
  results: WitnessResults | null = null,
): RoutesView {
  const models = allModels(api);
  checkEndpoints(models, from, to);
  const found = api.enumerateAtlasRoutes(from, to, limit);
  const reported = selectRoute(api, from, to, 'map').bridges;
  const reportedKey = reported === null ? null : reported.map((b) => b.id).join(' ');
  const routes = found.routes
    .filter((r) => r.length > 0)
    .map((r) => ({
      bridges: r.map((b) => b.id),
      models: routeModelIds(from, r),
      composition: composeSteps(api, r, results),
      reported: r.map((b) => b.id).join(' ') === reportedKey,
    }));
  const used = new Set(routes.flatMap((r) => r.bridges));
  const bridges = api.ATLAS_FAMILIES.flatMap((f) =>
    f.bridges.filter((b) => used.has(b.id)).map((b) => bridgeView(api, b, f.family, models, results)),
  );
  const visited = new Set(routes.flatMap((r) => r.models));
  const mv = [...models.values()].filter((m) => visited.has(m.id) || (routes.length === 0 && (m.id === from || m.id === to))).map((m) => modelView(api, m));
  const noClaim: Record<string, number> = {};
  for (const r of routes) {
    const c = r.composition.claim!;
    if (c.kind === 'no-claim') noClaim[c.reason] = (noClaim[c.reason] ?? 0) + 1;
  }
  const t = totals(api);
  const witnessResults = tally(results, bridges);
  return {
    view: 'routes',
    from,
    to,
    source: ATLAS_SOURCE,
    routes,
    bridges,
    models: mv,
    count: {
      shown: routes.length,
      limit,
      exhausted: found.exhausted,
      completeThrough: found.completeThrough,
      stoppedBy: found.stoppedBy,
    },
    claims: { bound: routes.filter((r) => r.composition.claim!.kind === 'bound').length, noClaim },
    denominator: { bridges: { shown: bridges.length, of: t.bridges }, models: { shown: mv.length, of: t.models } },
    selection: ROUTES_SELECTION,
    equationLinks: linkSummary(mv),
    ...(witnessResults === undefined ? {} : { witnessResults }),
    epistemics: EPISTEMICS,
  };
}

// ── observable ─────────────────────────────────────────────────────────────

export interface ObservableView {
  view: 'observable';
  observable: string;
  source: string;
  match: string;
  /** Bridges recording the observable as preserved, or declaring a translation of their bound into it. */
  bridges: (BridgeView & { preservesMatched: string[]; translationsMatched: string[] })[];
  /** Bridges recording the observable as NOT preserved; a bridge may appear here and above. */
  notPreserved: { id: string; family: string; relation: RelationType; matched: string[] }[];
  models: ModelView[];
  denominator: {
    bridges: { preserves: number; translates: number; doesNotPreserve: number; recordsNothing: number; of: number };
    models: { shown: number; of: number };
  };
  filter: AtlasFilterStats | null;
  equationLinks: ReturnType<typeof linkSummary>;
  witnessResults?: ResultsTally;
  epistemics: string;
}

const OBSERVABLE_MATCH =
  "a case-insensitive whole-word text match against each bridge's recorded `preserves` and `doesNotPreserve` strings " +
  'and the observable names of its declared bound translations; nothing is inferred from dimensions, quantities or ' +
  'the transformation, and a bridge that records nothing about the observable is counted apart from one that records ' +
  'it as not preserved';

function wordMatcher(term: string): (text: string) => boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu');
  return (text) => re.test(text);
}

export function buildObservableView(
  api: Api,
  observable: string,
  filter: AtlasFilter,
  results: WitnessResults | null = null,
): ObservableView {
  const term = observable.trim();
  if (term.length < 2) throw new CliError(`upt map: --observable='${observable}' must name an observable (two characters or more)`);
  const hit = wordMatcher(term);
  const models = allModels(api);
  const rows = api.ATLAS_FAMILIES.flatMap((f) => f.bridges.map((b) => ({ family: f.family, b })));
  const matched = rows.map(({ family, b }) => ({
    family,
    b,
    preserves: b.preserves.filter(hit),
    translations: api.translationsOf(b.id).map((x) => x.observable).filter(hit),
    doesNot: b.doesNotPreserve.filter(hit),
  }));
  const candidates = matched
    .filter((m) => m.preserves.length > 0 || m.translations.length > 0)
    .map((m) => ({ ...bridgeView(api, m.b, m.family, models, results), preservesMatched: m.preserves, translationsMatched: m.translations }));
  const filtering = filter.relation !== undefined || filter.evidence !== undefined;
  const verdicts = candidates.map((b) => (filtering ? judge(b, filter) : 'kept'));
  const kept = candidates.filter((_, i) => verdicts[i] === 'kept');
  const n = (v: string) => verdicts.filter((x) => x === v).length;
  const onKept = new Set(kept.flatMap((b) => [...b.premises.map((p) => p.id), b.conclusion.id]));
  const mv = [...models.values()].filter((m) => onKept.has(m.id)).map((m) => modelView(api, m));
  const t = totals(api);
  const witnessResults = tally(results, kept);
  return {
    view: 'observable',
    observable: term,
    source: ATLAS_SOURCE,
    match: OBSERVABLE_MATCH,
    bridges: kept,
    notPreserved: matched
      .filter((m) => m.doesNot.length > 0)
      .map((m) => ({ id: m.b.id, family: m.family, relation: m.b.relation, matched: m.doesNot })),
    models: mv,
    denominator: {
      bridges: {
        preserves: matched.filter((m) => m.preserves.length > 0).length,
        translates: matched.filter((m) => m.translations.length > 0).length,
        doesNotPreserve: matched.filter((m) => m.doesNot.length > 0).length,
        recordsNothing: matched.filter((m) => m.preserves.length + m.translations.length + m.doesNot.length === 0).length,
        of: t.bridges,
      },
      models: { shown: mv.length, of: t.models },
    },
    filter: filtering
      ? {
          ...filter,
          total: candidates.length,
          kept: kept.length,
          droppedNotMatching: n('not-matching'),
          droppedUndecided: n('undecided'),
          ...(results === null ? {} : { results: results.mode }),
        }
      : null,
    equationLinks: linkSummary(mv),
    ...(witnessResults === undefined ? {} : { witnessResults }),
    epistemics: EPISTEMICS,
  };
}

// ── atlas-wide evidence ────────────────────────────────────────────────────

export interface AtlasEvidenceView {
  view: 'atlas-evidence';
  source: string;
  denominator: { families: number; bridges: number; witnesses: number };
  bridges: { id: string; family: string; relation: RelationType; evidence: EvidenceView }[];
  /**
   * Per tag, over every atlas bridge: how many derive it whatever the unobserved
   * witness results are, and, apart, how many it is undecided on. Every tag is
   * listed, zero included; a bridge carries several tags, so no column sums to
   * the bridge count.
   */
  byTag: { tag: EvidenceTag; derived: number; undecided: number }[];
  /** Declared norm transports, whose witnesses are registered under the transport id. */
  normTransports: { id: string; bridge: string; witness: string; status: TransportResult }[];
  witnessResults?: ResultsTally;
  epistemics: string;
}

/** Every bridge of every family, with its derived evidence: the atlas-wide view of `upt atlas --evidence`. */
export function buildAtlasEvidenceView(api: Api, results: WitnessResults | null = null): AtlasEvidenceView {
  const models = allModels(api);
  const views = api.ATLAS_FAMILIES.flatMap((f) => f.bridges.map((b) => bridgeView(api, b, f.family, models, results)));
  const derived = api.summarizeEvidence(views.map((v) => new Set(v.evidence.derived)));
  const undecided = api.summarizeEvidence(views.map((v) => new Set(v.evidence.undecided)));
  const witnessResults = tally(results, views);
  return {
    view: 'atlas-evidence',
    source: ATLAS_SOURCE,
    denominator: {
      families: api.ATLAS_FAMILIES.length,
      bridges: views.length,
      witnesses: views.reduce((n, v) => n + v.evidence.witnesses, 0),
    },
    bridges: views.map((v) => ({ id: v.id, family: v.family, relation: v.relation, evidence: v.evidence })),
    byTag: api.ALL_EVIDENCE_TAGS.map((tag) => ({ tag, derived: derived.byTag[tag], undecided: undecided.byTag[tag] })),
    normTransports: api.ATLAS_FAMILIES.flatMap((f) => f.bridges).flatMap((b) =>
      (b.normTransports ?? []).map((nt) => ({ id: nt.id, bridge: b.id, witness: nt.witness.id, status: transportResult(nt, results) })),
    ),
    ...(witnessResults === undefined ? {} : { witnessResults }),
    epistemics:
      'evidence is derived from each record and the witness results the view observes, never read from a stored tag; ' +
      'a tag is undecided when unobserved witness results could give it or withhold it. Only a checked witness is a pass.',
  };
}

export function atlasEvidenceText(v: AtlasEvidenceView): string[] {
  const d = v.denominator;
  const out = [`\nAtlas evidence — ${d.bridges} bridges across ${d.families} families, ${d.witnesses} recorded witnesses  [source: ${v.source}]`];
  const r = resultsLine(v.witnessResults);
  out.push(`  ${r ?? 'witness results: none observed (every witness is a name, not a result); --stored reads the committed artifact, --run runs them now'}`);
  out.push(`  by tag (bridges; a bridge carries several tags, so the counts do not sum to ${d.bridges}):`);
  for (const t of v.byTag) out.push(`    ${t.tag.padEnd(22)} derived ${String(t.derived).padStart(2)} · undecided ${String(t.undecided).padStart(2)}`);
  for (const family of [...new Set(v.bridges.map((b) => b.family))]) {
    const bs = v.bridges.filter((b) => b.family === family);
    out.push(`  ${family} (${bs.length} bridge${bs.length === 1 ? '' : 's'}):`);
    for (const b of bs) {
      out.push(`    ${b.id} — ${b.relation}`);
      out.push(`      ${evidenceLine(b.evidence, b.id)}`);
      if (b.evidence.results !== undefined) out.push(`      ${outcomeLine(b.evidence.results)}`);
    }
  }
  out.push(`  norm transports (${v.normTransports.length}):`);
  if (v.normTransports.length === 0) out.push('    none declared');
  for (const nt of v.normTransports) out.push(`    ${nt.id} on ${nt.bridge}: witness ${nt.witness} — ${nt.status}`);
  out.push('  Refuted and unresolved are counted apart; neither is a pass. `upt atlas <bridge-id>` shows one bridge by claim.');
  return out;
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
  /** Bridges whose match depends on witness results the view does not observe. */
  droppedUndecided: number;
  /** The witness-results source, when the view reads one. */
  results?: ResultsMode;
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
  witnessResults?: ResultsTally;
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
    `${s.droppedUndecided} dropped (undecided: ${UNOBSERVED[s.results ?? 'none']})`
  );
}

const UNOBSERVED: Record<ResultsMode | 'none', string> = {
  none: 'depends on witness results this command does not observe',
  stored: `depends on witnesses with no result in ${STORED_RESULTS_PATH}`,
  run: 'depends on witnesses not registered to run in-process',
};

/** Every bridge a view draws on, for running their witnesses before the view is built with the results. */
export function bridgeIdsOf(v: AtlasView): Set<string> {
  if (v.view === 'route') return new Set((v.steps ?? []).map((b) => b.id));
  return new Set(v.bridges.map((b) => b.id));
}

export function buildFamilyView(api: Api, name: string, filter: AtlasFilter, results: WitnessResults | null = null): FamilyView {
  const fam = api.ATLAS_FAMILIES.find((f) => f.family === name);
  if (fam === undefined) {
    throw new CliError(
      `upt map: unknown --family='${name}' (expected: ${api.ATLAS_FAMILIES.map((f) => f.family).join(' | ')})`,
    );
  }
  const models = allModels(api);
  const own = new Set(fam.models.map((m) => m.id));
  const filed = fam.bridges.map((b) => ({ ...bridgeView(api, b, fam.family, models, results), role: 'filed' as const }));
  const touching = api.ATLAS_FAMILIES.filter((f) => f !== fam).flatMap((f) =>
    f.bridges
      .filter((b) => [...b.premises, b.conclusion].some((id) => own.has(id)))
      .map((b) => ({ ...bridgeView(api, b, f.family, models, results), role: 'touching' as const })),
  );
  const all = [...filed, ...touching];
  const filtering = filter.relation !== undefined || filter.evidence !== undefined;
  const verdicts = all.map((b) => (filtering ? judge(b, filter) : 'kept'));
  const kept = all.filter((_, i) => verdicts[i] === 'kept');
  const n = (v: string) => verdicts.filter((x) => x === v).length;
  const mv = fam.models.map((m) => modelView(api, m));
  const t = totals(api);
  const witnessResults = tally(results, kept);
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
          ...(results === null ? {} : { results: results.mode }),
        }
      : null,
    equationLinks: linkSummary(mv),
    ...(witnessResults === undefined ? {} : { witnessResults }),
    epistemics: EPISTEMICS,
  };
}

// ── text ───────────────────────────────────────────────────────────────────

const MODE_LABEL: Record<ResultsMode, string> = { stored: 'stored', run: 'run now' };
const NO_RESULT: Record<ResultsMode, string> = {
  stored: 'with no stored result',
  run: 'not run: no in-process runner is registered for them',
};

function evidenceLine(e: EvidenceView, id: string): string {
  const derived = e.derived.length === 0 ? 'none' : e.derived.join(', ');
  const formal =
    e.formalRef === null ? '' : ` [formalRef ${e.formalRef.system}, fidelity ${e.formalRef.fidelity}; covers its statement only]`;
  const r = e.results;
  if (r === undefined) {
    const undecided =
      e.undecided.length === 0
        ? ''
        : `; undecided without witness results: ${e.undecided.join(', ')} (${e.witnesses} witness(es); \`upt atlas ${id} --run\`)`;
    return `evidence (derived): ${derived}${formal}${undecided}`;
  }
  const undecided =
    e.undecided.length === 0
      ? ''
      : `; undecided: ${e.undecided.join(', ')} (${r.notObserved.length} witness(es) ${NO_RESULT[r.source]})`;
  return `evidence (derived, witness results ${MODE_LABEL[r.source]}): ${derived}${formal}${undecided}`;
}

function outcomeLine(r: WitnessOutcomes): string {
  const ids = (xs: readonly string[]) => (xs.length === 0 ? 'none' : xs.join(', '));
  const unresolved = r.unresolved.length === 0 ? 'none' : r.unresolved.map((u) => `${u.id} (${u.reason ?? 'no reason recorded'})`).join(', ');
  return (
    `witnesses (${MODE_LABEL[r.source]}): checked ${ids(r.checked)} · refuted ${ids(r.refuted)} · ` +
    `unresolved ${unresolved} · no result ${ids(r.notObserved)}`
  );
}

export function resultsLine(t: ResultsTally | undefined): string | null {
  if (t === undefined) return null;
  const w = t.witnesses;
  const counts =
    `over the bridges shown: ${w.checked} checked · ${w.refuted} refuted · ${w.unresolved} unresolved · ` +
    `${w.notObserved} with no result (not a pass)`;
  if ('ran' in t.provenance) {
    return `witness results: run now — ${t.provenance.ran} (${t.provenance.registered} registered witness(es) ran); ${counts}`;
  }
  const p = t.provenance;
  const when =
    p.lastCommit === null
      ? 'no commit of it found (git unavailable, or the file is not committed)'
      : `last commit touching it ${p.lastCommit.hash.slice(0, 12)} (${p.lastCommit.date})` +
        (p.modifiedSinceCommit === true ? ', and the working-tree file is MODIFIED since' : '');
  return `witness results: stored — ${p.path} (schemaVersion ${p.schemaVersion}; ${p.carries}; ${when}); ${counts}`;
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
    ...(b.evidence.results === undefined ? [] : [`${indent}${outcomeLine(b.evidence.results)}`]),
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

function compositionLines(c: RouteView['composition'], relations: readonly RelationType[], indent: string): string[] {
  const out = c.running.map((r, i) => {
    const state =
      r.relation === null
        ? 'not composed (an earlier step already yields no composite claim)'
        : r.relation === 'no-composite-claim'
          ? `NO COMPOSITE CLAIM — ${relations[i - 1]!} then ${relations[i]!} has no table cell`
          : r.relation;
    return `${indent}after step ${i + 1} (${r.after}): ${state}`;
  });
  const claim = c.claim!;
  if (claim.kind === 'bound') {
    out.push(`${indent}route claim: ${claim.relation}, K = ${claim.bound.K} · delta = ${claim.bound.delta} (${claim.norm ?? 'no norm stated'})`);
    for (const nt of c.transports) {
      out.push(
        `${indent}  across '${nt.bridgeId}' by its declared transport '${nt.id}' (${nt.fromModel} → ${nt.toModel}, ` +
          `K = ${nt.K}, time map uniform): witness ${nt.witness.id} ${nt.result === 'no result' ? 'has no result here (not a pass)' : nt.result}`,
      );
    }
    if (c.evidence !== null) {
      const d = c.evidence.derived.length === 0 ? 'none' : c.evidence.derived.join(', ');
      const u = c.evidence.undecided.length === 0 ? '' : `; undecided: ${c.evidence.undecided.join(', ')}`;
      out.push(`${indent}composite evidence (derived): ${d}${u} — never stronger than the weakest part`);
    }
  } else {
    out.push(`${indent}route claim: no composite claim — reason '${claim.reason}': ${claim.detail}`);
    if (c.missing.length > 0) {
      out.push(`${indent}to compose, this route would need:`);
      for (const m of c.missing) out.push(`${indent}  - ${m}`);
    }
  }
  return out;
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
  const results = resultsLine(v.witnessResults);
  if (results !== null) out.push(`  ${results}`);
  out.push('');
  v.steps.forEach((b, i) => {
    const [head, ...rest] = bridgeLines(b, '      ');
    out.push(`  step ${i + 1}  ${head}`, ...rest);
  });
  out.push('');
  out.push('  composition (the composition table, folded along the route):');
  out.push(...compositionLines(v.composition, v.steps.map((b) => b.relation), '    '));
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
  const results = resultsLine(v.witnessResults);
  if (results !== null) out.push(`  ${results}`);
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

export function routesText(v: RoutesView): string[] {
  const out = [`\nAll routes — ${v.from} → ${v.to}  [source: ${v.source}]`];
  const c = v.count;
  if (v.from === v.to) {
    out.push('  the endpoints are the same model: the route is empty and composes nothing.');
    return out;
  }
  const scope = c.exhausted
    ? `${c.shown} simple route(s): the search ran out of routes, so these are all of them`
    : (c.stoppedBy === 'limit'
        ? `the first ${c.shown} simple routes: the search stopped at the limit of ${c.limit} (--max-routes), so MORE exist; `
        : `${c.shown} simple route(s) found before the search exhausted its work budget; whether more exist is UNKNOWN; `) +
      `every route of at most ${c.completeThrough} bridge(s) is among these, and longer ones may be missing`;
  out.push(`  ${scope} — ${v.selection}`);
  out.push(
    `  shown: ${v.denominator.bridges.shown} of ${v.denominator.bridges.of} atlas bridges, ` +
      `${v.denominator.models.shown} of ${v.denominator.models.of} models, over the routes shown`,
  );
  if (c.shown === 0) {
    out.push('  no chain of bridges connects these models (only an exact equivalence is followed in both directions).');
    return out;
  }
  const reasons = Object.entries(v.claims.noClaim).map(([r, n]) => `${n} '${r}'`);
  out.push(
    `  route claims: ${v.claims.bound} carry a bound; ${c.shown - v.claims.bound} carry no composite claim` +
      (reasons.length === 0 ? '' : ` (${reasons.join(', ')})`),
  );
  const results = resultsLine(v.witnessResults);
  if (results !== null) out.push(`  ${results}`);
  const byId = new Map(v.bridges.map((b) => [b.id, b] as const));
  v.routes.forEach((r, i) => {
    out.push('');
    const hops = r.bridges.map((id, k) => ` --[${byId.get(id)!.relation}: ${id}]--> ${r.models[k + 1]}`).join('');
    out.push(`  route ${i + 1} (${r.bridges.length} bridge(s))${r.reported ? ' — the route `upt path` reports' : ''}:`);
    out.push(`    ${r.models[0]}${hops}`);
    out.push(...compositionLines(r.composition, r.bridges.map((id) => byId.get(id)!.relation), '    '));
  });
  out.push('');
  out.push(`  bridges on these routes (${v.bridges.length}), each once:`);
  for (const b of v.bridges) {
    const [head, ...rest] = bridgeLines(b, '      ');
    out.push(`    ${head}`, ...rest);
  }
  out.push('');
  out.push('  models on these routes, with the equations each records:');
  for (const m of v.models) {
    const [head, ...rest] = modelLines(m, '      ');
    out.push(`    ${head}`, ...rest);
  }
  out.push(`  ${linkLine(v.equationLinks)}`);
  out.push(`\n  (${v.epistemics})`);
  return out;
}

export function observableText(v: ObservableView): string[] {
  const d = v.denominator.bridges;
  const out = [`\nObservable map — '${v.observable}'  [source: ${v.source}]`];
  out.push(
    `  of ${d.of} atlas bridges: ${d.preserves} record it as preserved, ${d.translates} declare a bound translation into it, ` +
      `${d.doesNotPreserve} record it as NOT preserved, ${d.recordsNothing} record nothing about it (an absent record, not a finding)`,
  );
  out.push(`  match: ${v.match}`);
  const legend = formatAtlasFilterLegend(v.filter);
  if (legend !== null) out.push(`  ${legend}`);
  const results = resultsLine(v.witnessResults);
  if (results !== null) out.push(`  ${results}`);
  out.push('');
  out.push(`  bridges that preserve or translate it (${v.bridges.length}):`);
  if (v.bridges.length === 0) out.push('    none');
  for (const b of v.bridges) {
    const [head, ...rest] = bridgeLines(b, '      ');
    out.push(`    ${head}`, ...rest);
    if (b.preservesMatched.length > 0) out.push(`      preserves (recorded): ${b.preservesMatched.join('; ')}`);
    if (b.translationsMatched.length > 0) out.push(`      bound translation declared into: ${b.translationsMatched.join(', ')}`);
  }
  out.push('');
  out.push(`  bridges that record it as NOT preserved (${v.notPreserved.length}):`);
  if (v.notPreserved.length === 0) out.push('    none');
  for (const b of v.notPreserved) out.push(`    ${b.id} (${b.relation}) [${b.family}]: does not preserve ${b.matched.join('; ')}`);
  out.push('');
  out.push(`  models these bridges connect (${v.denominator.models.shown} of ${v.denominator.models.of}):`);
  for (const m of v.models) {
    const [head, ...rest] = modelLines(m, '      ');
    out.push(`    ${head}`, ...rest);
  }
  out.push(`  ${linkLine(v.equationLinks)}`);
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

export type AtlasView = RouteView | RoutesView | FamilyView | ObservableView;

/** The one-line denominator every diagram carries in its title. */
export function viewLegend(v: AtlasView): string {
  const tail = v.witnessResults === undefined ? '' : `; witness results: ${MODE_LABEL[v.witnessResults.mode]}`;
  if (v.view === 'route') {
    const d = v.denominator;
    return (
      `route ${v.from} → ${v.to}: ${d.bridges.shown} of ${d.bridges.of} atlas bridges, ${d.models.shown} of ${d.models.of} models ` +
      `[source: ${v.source}; equation links: ${LINK_SOURCE}${tail}]`
    );
  }
  if (v.view === 'routes') {
    const d = v.denominator;
    const c = v.count;
    const scope = c.exhausted ? `all ${c.shown} simple routes` : `the first ${c.shown} simple routes (search stopped by its ${c.stoppedBy}; more may exist)`;
    return (
      `routes ${v.from} → ${v.to}: ${scope}, over ${d.bridges.shown} of ${d.bridges.of} atlas bridges and ${d.models.shown} of ` +
      `${d.models.of} models [source: ${v.source}; equation links: ${LINK_SOURCE}${tail}]`
    );
  }
  if (v.view === 'observable') {
    const d = v.denominator.bridges;
    const f = formatAtlasFilterLegend(v.filter);
    return (
      `observable '${v.observable}': ${v.bridges.length} bridge(s) shown; of ${d.of} atlas bridges ${d.preserves} record it preserved, ` +
      `${d.translates} translate into it, ${d.doesNotPreserve} record it NOT preserved, ${d.recordsNothing} record nothing ` +
      `[source: ${v.source}, recorded preserves/doesNotPreserve text and bound translations; equation links: ${LINK_SOURCE}${tail}]` +
      (f === null ? '' : ` — ${f}`)
    );
  }
  const d = v.denominator;
  const f = formatAtlasFilterLegend(v.filter);
  return (
    `family ${v.family}: ${d.models.shown} of ${d.models.of} atlas models, ${d.bridgesFiled.shown} filed + ` +
    `${d.bridgesTouching.shown} touching of ${d.bridgesFiled.of} atlas bridges [source: ${v.source}; equation links: ${LINK_SOURCE}${tail}]` +
    (f === null ? '' : ` — ${f}`)
  );
}

function diagramOf(v: AtlasView): Diagram {
  if (v.view === 'route') {
    const steps = v.steps ?? [];
    const br = v.composition.breaksAt;
    return { title: viewLegend(v), models: v.models, bridges: steps, breaks: new Set(br === null ? [] : [steps[br]!.id]) };
  }
  // A route-specific break is not a property of a bridge shared by several routes, so none is drawn.
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

export function toMermaid(v: AtlasView): string {
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

export function toDot(v: AtlasView): string {
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
