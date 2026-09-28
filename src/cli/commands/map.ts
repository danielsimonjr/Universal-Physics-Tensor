/**
 * `upt map` — how the equations LINK: the text linkage map, the visual
 * (mermaid/dot/svg) physics map, and the `--equation` user-junction
 * injection. Transposed verbatim from bin/upt.mjs's `proposedJunctions()`/
 * `analyzeEquation()`/`printEquationReport()`/`mapCmd()` (lines 387-545),
 * plus `--json` and the `--json`/`--format` conflict guard.
 *
 * `parseEquationFlag` is REPLACED by the `either`-style `--equation` FlagSpec
 * (`args.ts` already extracts `--equation=...` or `--equation "..."` into
 * `flags.get('equation')`). `parseDiscoveryOpts` moved to `_discovery-opts.ts`
 * — the old CLI's `proposedJunctions` fed `map`'s raw args through it
 * (bin/upt.mjs line 392), so `--proposed` shares `discover`'s
 * `--max-orders`/`--anchor` validation here too.
 */
import { writeFileSync } from 'node:fs';
import type { FlagSpec, ParsedArgs } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { resolveGraph, coreAnchor, coreLine, groundTruthAnchor, groundTruthLine, type AnchorScope } from '../graphs.js';
import { emitJson } from '../output.js';
import { UsageError, CliError, EXIT_CHECK_FAILED } from '../errors.js';
import { parseDiscoveryOpts } from './_discovery-opts.js';
import * as atlasMap from './_atlas-map.js';
import type { BridgeEdge } from '../../composition/edge.js';
import type { VizJunction, VizModel } from '../../composition/graph-viz.js';
import type { EvidenceTag, RelationType } from '../../atlas/types.js';
import type { SourceName } from '../graphs.js';
import type { EquationAnalysis } from '../../composition/user-equation.js';
import type { CanonicalComparison } from '../../composition/canonical-compare.js';

const FLAGS: FlagSpec[] = [
  { name: '--source', valueStyle: 'attached' },
  { name: '--format', valueStyle: 'attached' },
  { name: '--out', valueStyle: 'attached' },
  { name: '--max-orders', valueStyle: 'attached' },
  { name: '--anchor', valueStyle: 'attached', repeatable: true },
  { name: '--proposed', valueStyle: 'none' },
  { name: '--relation', valueStyle: 'attached' },
  { name: '--evidence', valueStyle: 'attached' },
  { name: '--around', valueStyle: 'either' },
  { name: '--depth', valueStyle: 'attached' },
  { name: '--route', valueStyle: 'either' },
  { name: '--all-routes', valueStyle: 'none' },
  { name: '--max-routes', valueStyle: 'attached' },
  { name: '--family', valueStyle: 'either' },
  { name: '--observable', valueStyle: 'either' },
  { name: '--stored', valueStyle: 'none' },
  { name: '--run', valueStyle: 'none' },
  // optionalValue: a bare trailing --equation stores '' so the empty-check in
  // run() owns the diagnostic (old-CLI fidelity: bin/upt.mjs did `a[i+1] ?? ''`
  // and let mapCmd emit `upt: --equation requires "TARGET = EXPR"`, exit 2).
  { name: '--equation', valueStyle: 'either', optionalValue: true },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt map [--source=catalog|canonical|both|poster] [--format=text|mermaid|dot|svg]
        [--proposed [--anchor=k=v,...] [--max-orders=N]] [--out=PATH]
        [--equation "TARGET = EXPR"] [--around=QUANTITY [--depth=N]]
        [--relation=TYPE] [--evidence=TAG] [--route=FROM,TO [--all-routes
        [--max-routes=N]]] [--family=NAME] [--observable=NAME] [--stored | --run]
        Map how the equations LINK: connected components (clusters) of the
        graph by shared quantities, the anchored core, the link hubs, and
        the isolated tail.
        --source defaults to 'both' (catalog + canonical) — a pure
        connectivity question gets the honest, all-known-physics answer by
        default; --source=catalog shows the bridge-catalog view alone.
        --source=poster draws the ATLAS PHASE 3 POSTER INDEX instead of the
        bridge graph: nodes are STATEMENTS (including the hidden supporting
        nodes — action principle, Noether, the full Maxwell system, the
        Lorentz group, the central limit theorem) and boxes are DERIVATIONS
        (premises in, conclusion out). Associations are drawn DASHED because
        they assert no relation at all. It also reports any premise naming a
        statement the registry does not define, and says so out loud when the
        index is not registered in this build rather than printing an empty
        map as an answer.
        --format=mermaid|dot|svg emits the VISUAL map (quantities = nodes,
        equations = junctions colored by status, one subgraph per component).
        text (default) is the unchanged linkage printout. svg renders the dot
        layout via the optional @viz-js/viz peer (npm i @viz-js/viz; or pipe
        dot through "dot -Tsvg"). --proposed overlays the unadjudicated
        identity-consequence relations (gray dashed); --anchor and --max-orders
        tune the discovery funnel that derives them, as in \`upt discover\`.
        --out writes to a file (default stdout).
        --equation "TARGET = EXPR" injects YOUR OWN equation as a violet 'user'
        node, dimensionally checks it, compares with the canonical registry, and
        reports nearest equations by shared-quantity overlap (not a full edge
        dump). Multi-word names may use underscores or catalog hyphens
        (planck_length / planck-length). Unknown names get a "did you mean?".
        --relation=TYPE keeps only edges whose recorded Atlas relation is that
        type; --evidence=TAG keeps only edges whose evidence set, DERIVED from
        the catalog row at read time, contains that tag.
        ⚠ Filtering changes what a missing overlay means: unfiltered, an edge
        with no overlay is KEPT; filtered, it is DROPPED, because nothing shows
        it satisfies the filter. Those drops are counted and printed separately
        from the edges that simply did not match — an unaudited graph must not
        render as a complete answer.
        --around=QUANTITY [--depth=N] keeps only the edges within N
        shared-quantity hops of QUANTITY (default 1: the edges that use it),
        in every output form, and prints how many of the source's edges it
        kept: the others are omitted from the view, not absent from the graph.
        --route=FROM,TO and --family=NAME map the ATLAS instead: models and
        the recorded bridges between them, not shared quantities. --route
        shows the route \`upt path\` reports, each bridge's relation,
        assumptions, regime, bound and derived evidence, the composition
        step by step (and where the table yields no composite claim), and
        the equations each model records. --family shows one family's
        models, its bridges, the bridges from other families that touch it,
        and its rejections; --relation/--evidence filter its bridges, and a
        bridge whose tag depends on witness results is counted as undecided,
        not as a mismatch. A model's equations are only those its
        canonicalRefs record; nothing is inferred from shared quantities.
        --route=FROM,TO --all-routes lists every simple route (no model
        visited twice), shortest first, each with its composition and route
        claim, and counts the claims; --max-routes=N (default 20, at most
        1000) bounds the list, and a list cut short says so and says up to
        which bridge count it is complete.
        --observable=NAME maps the bridges whose RECORDED preserves text, or
        declared bound translation, names that observable (a whole-word text
        match, nothing inferred), lists apart those recording it as NOT
        preserved, and counts the bridges that record nothing about it;
        --relation/--evidence filter it as they filter a family.
        --stored derives evidence from the committed witness results
        (data/atlas/witness-results.json; a repository file, not shipped),
        labelled with the last commit that touched it; --run runs the shown
        bridges' in-process registered witnesses now (exit 3 if any is
        refuted). Either resolves a tag once its witnesses have results; a
        witness with no result leaves it undecided, and checked, refuted and
        unresolved are counted apart.
        Every atlas view states how many of the atlas's models and bridges it
        shows, in text, --json and --format=mermaid|dot|svg.
        e.g.  upt map --relation=derivation --source=both
              upt map --around=temperature --depth=2 --source=catalog
              upt map --route=model-pendulum,model-lc
              upt map --route=model-string,model-dalembert --all-routes --stored
              upt map --family=oscillators --evidence=formally-proved
              upt map --observable=frequency --run`;

/**
 * The edges within `depth` shared-quantity hops of `quantity`: hop 1 is every
 * edge that has it as a source or target, and each further hop adds the edges
 * sharing a quantity with one already kept.
 * @internal
 */
export function neighbourhood(graph: readonly BridgeEdge[], quantity: string, depth: number): BridgeEdge[] {
  const names = (e: BridgeEdge): string[] => [...e.sources.map((q) => q.name), e.target.name];
  const reached = new Set([quantity]);
  const kept = new Set<BridgeEdge>();
  for (let hop = 0; hop < depth; hop++) {
    const frontier = graph.filter((e) => !kept.has(e) && names(e).some((n) => reached.has(n)));
    if (frontier.length === 0) break;
    for (const e of frontier) {
      kept.add(e);
      for (const n of names(e)) reached.add(n);
    }
  }
  return graph.filter((e) => kept.has(e));
}

const RELATION_TYPES: readonly RelationType[] = [
  'derivation',
  'exact-equivalence',
  'restriction',
  'approximation',
  'coarse-graining',
  'analytic-continuation',
  'structural-analogy',
  'deformation-quantization',
];

const EVIDENCE_TAGS: readonly EvidenceTag[] = [
  'proposed',
  'reviewed',
  'dimension-checked',
  'convention-checked',
  'symbolically-checked',
  'numerically-supported',
  'formally-proved',
  'empirically-supported',
  'contradicted',
  'unresolved',
];

/** Last value of an `attached` flag, or undefined when the flag is absent. */
function lastValue(flags: ParsedArgs['flags'], name: string): string | undefined {
  const v = flags.get(name);
  return v && v.length > 0 ? v[v.length - 1] : undefined;
}

/** Validate one filter value against its vocabulary. A bad value is a CliError
 *  (exit 1); an unknown FLAG is the parser's UsageError (exit 2). */
function parseFilter<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  flag: string,
): T | undefined {
  if (raw === undefined) return undefined;
  if (!allowed.includes(raw as T)) {
    throw new CliError(`upt: unknown ${flag}='${raw}' (expected: ${allowed.join(' | ')})`);
  }
  return raw as T;
}

// Convert the derived identity-consequence proposals into viz junctions
// (gray-dashed, status 'proposed'). The library never imports proposed-bridges;
// the CLI does the conversion, keeping the epistemic firewall intact.
function proposedJunctions(
  api: CommandCtx['api'],
  graph: readonly BridgeEdge[],
  flags: ParsedArgs['flags']
): VizJunction[] {
  const opts = parseDiscoveryOpts(flags);
  const ranked = api.rankDiscoveries(graph, opts);
  return api.deriveProposedBridges(ranked).map((p) => ({
    id: p.id,
    label: p.id,
    status: 'proposed' as const,
    sources: (p.governing || []).map((g) => g.name),
    target: p.target.name,
  }));
}

// Build the catalog quantity name→dimension map for the chosen graph, then run
// the (testable) library analysis: parse + dimensional validation + "did you
// mean?" hints. The library owns the physics (constants' dimensions, inference);
// the CLI only formats.
async function analyzeEquation(
  api: CommandCtx['api'],
  equation: string,
  graph: readonly BridgeEdge[]
): Promise<{ user: EquationAnalysis; comparisons: CanonicalComparison[] }> {
  const catalogDims = new Map<string, import('../../dimensional/types.js').Dimension>();
  for (const e of graph) {
    for (const q of [...e.sources, e.target]) catalogDims.set(q.name, q.dim);
  }
  const user = await api.analyzeUserEquation(equation, catalogDims);
  // Dimensions cannot see a prefactor: compare with the canonical equation the
  // user's one restates, when the registry holds one (persona finding L2).
  const comparisons = user.parseError ? [] : await api.compareUserEquation(equation, catalogDims);
  return { user, comparisons };
}

// Print the dimensional verdict, where the equation landed, and any hints.
// `out` is ctx.out (text mode → stdout) or ctx.err (visual → stderr).
function printEquationReport(
  api: CommandCtx['api'],
  model: VizModel,
  user: EquationAnalysis,
  out: (line?: string) => void,
  comparisons: readonly CanonicalComparison[] = [],
): void {
  out('');
  if (user.consistent === true) {
    out(`  ✓ dimensionally consistent: ${api.format(user.rhsDimension!)}`);
  } else if (user.consistent === false && (user.hints ?? []).length > 0) {
    // An unknown name is checked as a dimensionless placeholder, so this mismatch is not a real
    // check and does not fail the command (exit 0). Say so on the line itself (persona finding N3).
    const names = user.hints!.map((h) => `'${h.name}'`).join(', ');
    out(
      `  · UNKNOWN: RHS is ${api.format(user.rhsDimension!)} but the target is ${api.format(user.targetDimension!)}; ` +
        `the mismatch involves the unresolved placeholder${user.hints!.length > 1 ? 's' : ''} ${names} ` +
        `(taken as dimensionless), so it is not a failed check`,
    );
  } else if (user.consistent === false) {
    out(
      `  ⚠ dimensional MISMATCH: RHS is ${api.format(user.rhsDimension!)} but the target is ${api.format(
        user.targetDimension!
      )}`
    );
  } else if (user.rhsDimension) {
    out(`  · RHS dimension: ${api.format(user.rhsDimension)} (target not in the catalog, so no comparison)`);
  }
  for (const line of api.describeComparisons(comparisons)) out(`  ${line}`);
  const L = api.equationLanding(model, 'user-equation');
  if (L.isolated) {
    out('  ⚠ your equation is ISOLATED — it shares no quantity with this graph.');
  } else {
    out(
      `  ● your equation joins ${L.anchored ? 'the ANCHORED cluster' : 'a cluster'} of ${L.clusterSize} via {${L.sharedQuantities.join(', ')}}`
    );
    // W3/I3: do not dump ~100 edge ids — that made shared length/temperature look
    // like a physics claim. Summarise nearest equations by shared-quantity overlap.
    for (const line of api.formatConnectedSummary(model, L)) out(line);
  }
  for (const h of user.hints ?? []) {
    if (!h.suggestions.length) {
      out(`  ⚠ '${h.name}' did not match a catalog quantity (run \`upt canonical\` for the vocabulary).`);
    } else if (h.byDimension) {
      out(`  ⚠ '${h.name}' is unknown — by its inferred dimension, did you mean: ${h.suggestions.join(', ')}?`);
    } else {
      out(`  ⚠ '${h.name}' did not match a catalog quantity — did you mean: ${h.suggestions.join(', ')}?`);
    }
  }
}

/** Flags that shape the equation graph, and so mean nothing on an atlas view. */
const GRAPH_ONLY_FLAGS = ['source', 'around', 'depth', 'equation', 'proposed', 'max-orders', 'anchor'] as const;

/** Flags that only an atlas view reads. */
const ATLAS_ONLY_FLAGS = ['all-routes', 'max-routes', 'stored', 'run'] as const;

async function runAtlasView(
  ctx: CommandCtx,
  route: string | undefined,
  family: string | undefined,
  observable: string | undefined,
): Promise<number> {
  const { args, api, err, write } = ctx;
  const chosen = [route !== undefined, family !== undefined, observable !== undefined].filter(Boolean).length;
  if (chosen > 1) throw new CliError('upt map: pick one atlas view: --route, --family or --observable');
  const view = route !== undefined ? '--route' : family !== undefined ? '--family' : '--observable';
  const stray = GRAPH_ONLY_FLAGS.filter((f) => args.flags.has(f));
  if (stray.length > 0) {
    throw new CliError(
      `upt map: ${view} maps the atlas, not the equation graph; ${stray.map((f) => `--${f}`).join(', ')} do${stray.length === 1 ? 'es' : ''} not apply`,
    );
  }
  const relation = parseFilter(lastValue(args.flags, 'relation'), RELATION_TYPES, '--relation');
  const evidence = parseFilter(lastValue(args.flags, 'evidence'), EVIDENCE_TAGS, '--evidence');
  if (route !== undefined && (relation !== undefined || evidence !== undefined)) {
    throw new CliError('upt map: a route is composed whole, so --relation/--evidence do not filter it; filter a family view instead (--family=NAME)');
  }
  const allRoutes = args.flags.has('all-routes');
  if (allRoutes && route === undefined) throw new CliError('upt map: --all-routes needs --route=FROM,TO');
  const maxRaw = lastValue(args.flags, 'max-routes');
  if (maxRaw !== undefined && !allRoutes) throw new CliError('upt map: --max-routes needs --all-routes');
  const maxRoutes = maxRaw === undefined ? atlasMap.DEFAULT_MAX_ROUTES : Number(maxRaw);
  if (!Number.isInteger(maxRoutes) || maxRoutes < 1 || maxRoutes > atlasMap.MAX_ROUTES_CEILING) {
    throw new CliError(`upt map: --max-routes=${maxRaw} must be an integer from 1 to ${atlasMap.MAX_ROUTES_CEILING}`);
  }
  if (args.flags.has('stored') && args.flags.has('run')) {
    throw new CliError('upt map: pick one witness-results source: --stored (the committed artifact) or --run (run now)');
  }
  const fmt = lastValue(args.flags, 'format') ?? 'text';
  const isJson = args.flags.has('json');
  if (isJson && fmt !== 'text') throw new UsageError('upt: pick one output form: --json or --format');
  if (!['text', 'mermaid', 'dot', 'svg'].includes(fmt)) {
    throw new CliError(`upt: unknown --format='${fmt}' (expected: text | mermaid | dot | svg)`);
  }

  const filter = {
    ...(relation !== undefined ? { relation } : {}),
    ...(evidence !== undefined ? { evidence } : {}),
  };
  const endpoints = route === undefined ? null : atlasMap.parseRoute(route);
  const build = (results: atlasMap.WitnessResults | null): atlasMap.AtlasView =>
    endpoints !== null
      ? allRoutes
        ? atlasMap.buildRoutesView(api, ...endpoints, maxRoutes, results)
        : atlasMap.buildRouteView(api, ...endpoints, results)
      : family !== undefined
        ? atlasMap.buildFamilyView(api, family, filter, results)
        : atlasMap.buildObservableView(api, observable!, filter, results);
  let results: atlasMap.WitnessResults | null = null;
  if (args.flags.has('stored')) results = atlasMap.loadStoredResults();
  else if (args.flags.has('run')) {
    // Unfiltered first: a filter's verdict depends on the results, so every candidate bridge is run.
    const candidates =
      endpoints === null
        ? atlasMap.bridgeIdsOf(family !== undefined ? atlasMap.buildFamilyView(api, family, {}) : atlasMap.buildObservableView(api, observable!, {}))
        : atlasMap.bridgeIdsOf(build(null));
    results = await atlasMap.runResults(api, candidates);
  }
  const v = build(results);
  const exitCode = results?.mode === 'run' && results.rows.some((r) => r.status === 'refuted') ? EXIT_CHECK_FAILED : 0;

  if (isJson) {
    emitJson({ command: 'map', source: 'atlas', result: v }, write);
    return exitCode;
  }
  if (fmt === 'text') {
    const lines =
      v.view === 'route'
        ? atlasMap.routeText(v)
        : v.view === 'routes'
          ? atlasMap.routesText(v)
          : v.view === 'family'
            ? atlasMap.familyText(v)
            : atlasMap.observableText(v);
    for (const line of lines) ctx.out(line);
    return exitCode;
  }
  let src: string;
  if (fmt === 'svg') {
    try {
      src = await api.renderDotToSvg(atlasMap.toDot(v));
    } catch (e) {
      throw new CliError(e && (e as Error).message ? (e as Error).message : String(e));
    }
  } else {
    src = fmt === 'mermaid' ? atlasMap.toMermaid(v) : atlasMap.toDot(v);
  }
  const path = lastValue(args.flags, 'out');
  if (path !== undefined) {
    if (!path) throw new CliError('upt: --out= requires a non-empty PATH');
    try {
      writeFileSync(path, src);
    } catch (e) {
      throw new CliError((e as Error).message);
    }
    err(`upt: wrote ${fmt} to ${path}`);
  } else {
    write(src);
  }
  err(`upt: ${atlasMap.viewLegend(v)}`);
  return exitCode;
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out, err, write } = ctx;
  const route = lastValue(args.flags, 'route');
  const family = lastValue(args.flags, 'family');
  const observable = lastValue(args.flags, 'observable');
  if (route !== undefined || family !== undefined || observable !== undefined) return runAtlasView(ctx, route, family, observable);
  const atlasOnly = ATLAS_ONLY_FLAGS.filter((f) => args.flags.has(f));
  if (atlasOnly.length > 0) {
    throw new CliError(
      `upt map: ${atlasOnly.map((f) => `--${f}`).join(', ')} appl${atlasOnly.length === 1 ? 'ies' : 'y'} to an atlas view ` +
        '(--route, --family or --observable), not to the equation graph',
    );
  }
  // map asks a pure connectivity question, so it defaults to --source=both
  // (catalog + canonical) rather than graphs.ts's catalog fallback used by
  // the other --source commands (e.g. discover, which keeps catalog).
  //
  // `--source=poster` is a MAP-ONLY source and is resolved HERE, not in
  // `resolveGraph`. That helper is shared by `discover`, `candidates` and the
  // rest, and the poster index is not a `BridgeEdge` graph they could analyse;
  // teaching it a value only one command can use would hand every other command
  // a source that silently means nothing.
  const posterMode = lastValue(args.flags, 'source') === 'poster';
  const sourceFlags = args.flags.has('source') ? args.flags : new Map(args.flags).set('source', ['both']);
  const resolved: { graph: BridgeEdge[]; label: string; source: SourceName | 'poster' } = posterMode
    ? { graph: [], label: 'poster (Atlas Phase 3 index)', source: 'poster' }
    : resolveGraph(api, sourceFlags);
  const { graph: wholeGraph, label, source } = resolved;

  const around = lastValue(args.flags, 'around');
  const depthRaw = lastValue(args.flags, 'depth');
  if (depthRaw !== undefined && around === undefined) throw new CliError('upt map: --depth needs --around');
  let focus: { around: string; depth: number; kept: number; of: number } | null = null;
  let fullGraph = wholeGraph;
  if (around !== undefined) {
    if (posterMode) throw new CliError('upt map: --around focuses a quantity graph; the poster index has statements, not quantities');
    const depth = depthRaw === undefined ? 1 : Number(depthRaw);
    if (!Number.isInteger(depth) || depth < 1 || depth > 10) throw new CliError(`upt map: --depth=${depthRaw} must be an integer from 1 to 10`);
    const known = new Set(wholeGraph.flatMap((e) => [...e.sources.map((q) => q.name), e.target.name]));
    const name = api.resolveToCatalogName(around, known);
    if (name === null) {
      const near = api.suggestQuantities(around, known);
      throw new CliError(
        `upt map: '${around}' is not a quantity of the ${label} graph` + (near.length > 0 ? `; did you mean: ${near.join(', ')}?` : ''),
      );
    }
    fullGraph = neighbourhood(wholeGraph, name, depth);
    focus = { around: name, depth, kept: fullGraph.length, of: wholeGraph.length };
  }
  const focusLine =
    focus === null
      ? null
      : `focused: ${focus.kept} of ${focus.of} edges within ${focus.depth} hop(s) of '${focus.around}' [${label}]; ` +
        'the rest are omitted from this view, not absent from the graph';
  // The poster's own report line: what it contributed, or why it contributed
  // nothing (design note §6). Computed once; printed by every output form.
  const posterValidation = posterMode ? api.validatePoster(api.POSTER_GRAPH) : null;
  const posterNote = posterMode
    ? api.describePosterSource(api.POSTER_GRAPH, posterValidation!)
    : null;

  // The two overlay filters. Parsed BEFORE anything else is computed so a bad
  // value costs nothing and always exits 1.
  const relation = parseFilter(lastValue(args.flags, 'relation'), RELATION_TYPES, '--relation');
  const evidence = parseFilter(lastValue(args.flags, 'evidence'), EVIDENCE_TAGS, '--evidence');
  const filterOpts = {
    ...(relation !== undefined ? { relation } : {}),
    ...(evidence !== undefined ? { evidence } : {}),
  };
  // The TEXT and JSON paths filter the edge list here, because `linkageMap`
  // consumes edges. The VISUAL path hands `buildVizModel` the FULL graph with
  // the same options, so the model also judges the --proposed / --equation
  // overlay junctions, which are not edges and which `filterEdges` cannot see.
  // One predicate, two callers: they cannot disagree about what a filter
  // selects, only about how much they were asked to count.
  const { kept: graph, stats: edgeStats } = api.filterEdges(fullGraph, filterOpts);
  // Audit I3: what "anchored" means here, and the discovery ground truth when --proposed ran the funnel.
  const anchor: AnchorScope | null = posterMode
    ? null
    : {
        core: coreAnchor(graph),
        ...(args.flags.has('proposed') ? { groundTruth: groundTruthAnchor(api, parseDiscoveryOpts(args.flags)) } : {}),
      };
  const edgeLegend = api.formatFilterLegend(edgeStats);

  const fmtValues = args.flags.get('format');
  const fmt = fmtValues && fmtValues.length > 0 ? fmtValues[fmtValues.length - 1] : 'text';
  const isJson = args.flags.has('json');

  if (isJson && fmt !== 'text') {
    throw new UsageError('upt: pick one output form: --json or --format');
  }

  // --equation injects a user-supplied "TARGET = EXPR" as a 'user' junction.
  let user: EquationAnalysis | null = null;
  let comparisons: CanonicalComparison[] = [];
  const equationValues = args.flags.get('equation');
  const equation = equationValues && equationValues.length > 0 ? equationValues[equationValues.length - 1] : null;
  if (equation != null) {
    if (!equation.trim()) {
      throw new UsageError('upt: --equation requires "TARGET = EXPR"');
    }
    try {
      ({ user, comparisons } = await analyzeEquation(api, equation, graph)); // throws UserEquationError on malformed structure
    } catch (e) {
      throw new UsageError('upt: ' + (e && (e as Error).message ? (e as Error).message : String(e)));
    }
    if (user.parseError) {
      throw new UsageError('upt: ' + user.parseError); // dimensionally malformed RHS
    }
  }

  // A user equation whose dimension mismatches, or that differs from its
  // canonical equation, is a failed check: exit 3 (persona finding F2). A
  // mismatch counts only when every name resolved: an unknown name is checked
  // as a dimensionless placeholder, so its "mismatch" is not a real check.
  const exitCode =
    user !== null &&
    ((user.consistent === false && (user.hints ?? []).length === 0) ||
      comparisons.some((c) => c.kind === 'factor' || c.kind === 'form'))
      ? EXIT_CHECK_FAILED
      : 0;

  const overlay = (extra: VizJunction[]): VizJunction[] => [
    // Ranked from the UNFILTERED graph: the proposal set is a property of the
    // whole catalog, and the model then judges each overlay junction under the
    // same filter as every other junction.
    ...(args.flags.has('proposed') ? proposedJunctions(api, wholeGraph, args.flags) : []),
    // The poster enters as an overlay for exactly the reason the design note
    // gives: an overlay is FILTERED, clustered and legended like every other
    // junction, so a poster source cannot quietly bypass --relation/--evidence.
    ...(posterMode ? api.posterJunctions(api.POSTER_GRAPH) : []),
    ...extra,
  ];

  if (isJson) {
    const linkage = api.linkageMap(graph);
    let landing: ReturnType<typeof api.equationLanding> | undefined;
    let userEquation: Record<string, unknown> | undefined;
    if (user) {
      const model = api.buildVizModel(fullGraph, {
        title: `UPT physics map — ${label}`,
        extraJunctions: overlay([user.junction]),
        ...filterOpts,
      });
      landing = api.equationLanding(model, 'user-equation');
      userEquation = {
        equation: user.junction.label,
        consistent: user.consistent,
        rhsDimension: user.rhsDimension,
        targetDimension: user.targetDimension,
        hints: user.hints,
        canonicalComparisons: comparisons,
      };
    }
    emitJson(
      {
        command: 'map',
        source,
        ...(anchor !== null ? { anchor } : {}),
        result: {
          linkage,
          ...(posterMode ? { poster: { note: posterNote, ...posterValidation! } } : {}),
          ...(edgeLegend !== null ? { filter: edgeStats } : {}),
          ...(focus !== null ? { focus } : {}),
          ...(user ? { landing, userEquation } : {}),
        },
      },
      write
    );
    return exitCode;
  }

  if (fmt === 'mermaid' || fmt === 'dot' || fmt === 'svg') {
    const extraJunctions = overlay(user ? [user.junction] : []);
    const model = api.buildVizModel(fullGraph, {
      title: `UPT physics map — ${label}`,
      extraJunctions,
      ...filterOpts,
    });
    // svg is the dot layout rendered by the optional @viz-js/viz peer.
    let src: string;
    if (fmt === 'svg') {
      try {
        src = await api.renderDotToSvg(model.toDot());
      } catch (e) {
        throw new CliError(e && (e as Error).message ? (e as Error).message : String(e));
      }
    } else {
      src = fmt === 'mermaid' ? model.toMermaid() : model.toDot();
    }
    const outValues = args.flags.get('out');
    if (outValues && outValues.length > 0) {
      const path = outValues[outValues.length - 1];
      if (!path) {
        throw new CliError('upt: --out= requires a non-empty PATH');
      }
      try {
        writeFileSync(path, src);
      } catch (e) {
        throw new CliError((e as Error).message);
      }
      err(`upt: wrote ${fmt} (${model.junctions.length} junctions, ${model.clusters.length} clusters) to ${path}`);
    } else {
      write(src);
    }
    // Legend and landing report go to stderr so stdout/--out stays pure diagram
    // source. The diagram itself also carries the legend (see `buildVizModel`).
    if (posterNote !== null) err(`upt: ${posterNote}`);
    if (focusLine !== null) err(`upt: ${focusLine}`);
    if (model.filterLegend !== null) err(`upt: ${model.filterLegend}`);
    if (user) printEquationReport(api, model, user, err, comparisons);
    return exitCode;
  }
  if (fmt !== 'text') {
    throw new CliError(`upt: unknown --format='${fmt}' (expected: text | mermaid | dot | svg)`);
  }

  if (posterMode) {
    const model = api.buildVizModel(fullGraph, {
      title: `UPT physics map — ${label}`,
      extraJunctions: overlay(user ? [user.junction] : []),
      ...filterOpts,
    });
    out(`
Poster index — statements and the derivations between them  [source: ${label}]`);
    out(`  ${posterNote}`);
    out(
      `  (${model.junctions.length} junctions over ${model.clusters.length} clusters; ` +
        `${api.POSTER_GRAPH.derivations.length} derivations, ` +
        `${api.POSTER_GRAPH.associations.length} associations)`,
    );
    if (model.filterLegend !== null) out(`  ${model.filterLegend}`);
    for (const d of posterValidation!.dangling) {
      out(`  ⚠ '${d.derivation}' names '${d.missing}' as a ${d.role}, and nothing defines it.`);
    }
    if (user) {
      out(`
Your equation:  ${user.junction.label}`);
      printEquationReport(api, model, user, out, comparisons);
    }
    return exitCode;
  }

  // --equation: the verdict on the user's equation is the answer asked for, so it
  // comes BEFORE the linkage map, not after ~45 lines of it (persona finding N4).
  if (user) {
    const model = api.buildVizModel(fullGraph, {
      title: `UPT physics map — ${label}`,
      extraJunctions: overlay([user.junction]),
      ...filterOpts,
    });
    out(`\nYour equation:  ${user.junction.label}`);
    printEquationReport(api, model, user, out, comparisons);
  }

  const m = api.linkageMap(graph);
  const mix = (s: Readonly<Record<string, number>>) =>
    Object.entries(s)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');
  out(`\nLinkage map — how the equations connect via shared quantities  [source: ${label}]`);
  out(`(${m.componentCount} components over ${graph.length} edges; ${m.compositions} compose into chains)`);
  out(`  ${coreLine(anchor!.core!)}`);
  if (anchor!.groundTruth) out(`  proposals: ${groundTruthLine(anchor!.groundTruth)}`);
  out('');
  if (focusLine !== null) out(`  ${focusLine}`);
  if (edgeLegend !== null) out(`  ${edgeLegend}`);
  for (const c of m.clusters.filter((x) => x.size > 1)) {
    out(`  ● cluster of ${c.size}${c.anchored ? '  [ANCHORED to known physics]' : ''}`);
    out(`     edges:  ${c.edges.join(', ')}`);
    out(`     status: ${mix(c.statusMix)}`);
    out(`     link hubs: ${c.hubs.join(', ')}\n`);
  }
  out(`  ○ isolated (${m.isolated.length}) — share no quantity with any other edge:`);
  out(`     ${m.isolated.join(', ')}`);
  out('\n  (a structural map — shared-quantity connectivity, NOT a credibility signal)');
  return exitCode;
}

export const command: Command = {
  name: 'map',
  aliases: ['linkage'],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
