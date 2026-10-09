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
import { commandHelp, JSON_FLAG, sourceFlag } from '../flag-help.js';
import { resolveGraph, coreAnchor, coreLine, groundTruthAnchor, groundTruthLine, type AnchorScope } from '../graphs.js';
import { emitJson } from '../output.js';
import { publishedUrl } from '../published-url.js';
import { UsageError, CliError, EXIT_CHECK_FAILED } from '../errors.js';
import { classifyDetermination, type Determination } from '../determination.js';
import { parseDiscoveryOpts } from './_discovery-opts.js';
import * as atlasMap from './_atlas-map.js';
import type {
  BridgeEdge,
  CanonicalComparison,
  EquationAnalysis,
  EvidenceTag,
  RelationType,
  VizJunction,
  VizModel,
} from '../../cli-api.js';
import { canonicalCheckFailed, conventionLines } from '../conventions.js';
import type { UnitMode } from '../../cli-api.js';
import { withCatalogEvidence } from '../map-evidence.js';
import { DISCOVER_MAX_ORDERS_DEFAULT } from '../library-defaults.js';

/** `--around` reaches this many shared-quantity hops when `--depth` is not given, and at most this many when it is. */
const DEFAULT_DEPTH = 1;
const MAX_DEPTH = 10;

const FLAGS: FlagSpec[] = [
  sourceFlag('both', 'Which graph to draw: catalog, canonical, or both. This command defaults to both.'),
  { name: '--format', valueStyle: 'attached', description: 'Output form: text, mermaid, dot, or svg. svg needs the optional @viz-js/viz peer.', defaultValue: 'text' },
  { name: '--out', valueStyle: 'attached', description: 'Write the report to PATH instead of stdout.' },
  { name: '--max-orders', valueStyle: 'attached', description: 'Magnitude-clash threshold for the --proposed overlay.', defaultValue: DISCOVER_MAX_ORDERS_DEFAULT },
  { name: '--anchor', valueStyle: 'attached', repeatable: true, description: 'Override a numeric anchor as k=v for the --proposed overlay.', defaultValue: 'mass=M_sun' },
  { name: '--proposed', valueStyle: 'none', description: 'Overlay unadjudicated identity-consequence relations.' },
  { name: '--relation', valueStyle: 'attached', description: 'Keep atlas edges whose recorded relation is TYPE.' },
  { name: '--evidence', valueStyle: 'attached', description: 'Keep atlas edges whose derived evidence set contains TAG.' },
  { name: '--around', valueStyle: 'either', description: 'Keep edges within --depth shared-quantity hops of QUANTITY.' },
  { name: '--depth', valueStyle: 'attached', description: 'Hop count for --around.', defaultValue: String(DEFAULT_DEPTH) },
  { name: '--route', valueStyle: 'either', description: 'Map the atlas route FROM,TO instead of the equation graph.' },
  { name: '--all-routes', valueStyle: 'none', description: 'With --route, list every simple route, shortest first.' },
  { name: '--max-routes', valueStyle: 'attached', description: `Cap on --all-routes. The maximum accepted is ${atlasMap.MAX_ROUTES_CEILING}.`, defaultValue: String(atlasMap.DEFAULT_MAX_ROUTES) },
  { name: '--family', valueStyle: 'either', description: 'Map one atlas family by name.' },
  { name: '--observable', valueStyle: 'either', description: 'Map bridges whose recorded text names this observable.' },
  { name: '--stored', valueStyle: 'none', description: `Derive evidence from ${publishedUrl('data/atlas/witness-results.json')}. That file is not in the published package; the command then names --run.` },
  { name: '--run', valueStyle: 'none', description: 'Run the shown bridges\' in-process witnesses now. Exit 3 if one is refuted.' },
  // optionalValue: a bare trailing --equation stores '' so the empty-check in
  // run() owns the diagnostic (old-CLI fidelity: bin/upt.mjs did `a[i+1] ?? ''`
  // and let mapCmd emit `upt: --equation requires "TARGET = EXPR"`, exit 2).
  { name: '--equation', valueStyle: 'either', optionalValue: true, description: 'Inject TARGET = EXPR as a user node and report where it lands.' },
  { name: '--equation-only', valueStyle: 'none', description: 'Print only the equation verdict. Errors when --equation is missing.' },
  { name: '--verbose', valueStyle: 'none', description: 'With --equation, also print the linkage map.' },
  { name: '--bind-short', valueStyle: 'none', description: 'Bind a one-letter catalog name in --equation. Without it, those names are reported and not bound.' },
  { name: '--natural', valueStyle: 'none', description: 'Set ħ = c = 1 when a dimension difference is a power of those constants.' },
  { name: '--geometrized', valueStyle: 'none', description: 'With the natural-unit rules, also set G = 1.' },
  JSON_FLAG,
];

const HELP = `upt map [--source=catalog|canonical|both] [--format=text|mermaid|dot|svg]
        [--proposed [--anchor=k=v,...] [--max-orders=N]] [--out=PATH]
        [--equation "TARGET = EXPR" [--equation-only] [--verbose] [--bind-short]
        [--natural] [--geometrized]] [--around=QUANTITY [--depth=N]]
        [--relation=TYPE] [--evidence=TAG] [--route=FROM,TO [--all-routes
        [--max-routes=N]]] [--family=NAME] [--observable=NAME] [--stored | --run]
        Map how the equations LINK: connected components (clusters) of the
        graph by shared quantities, the anchored core, the link hubs, and
        the isolated tail.
        --source defaults to 'both' (catalog + canonical) — a pure
        connectivity question gets the honest, all-known-physics answer by
        default; --source=catalog shows the bridge-catalog view alone.
        --out=PATH writes whatever form was asked for (text, --json or a
        visual format) to PATH instead of stdout; an empty PATH exits 1.
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
        (planck_length / planck-length). Unknown names get a "did you mean?",
        and a registered constant of the inferred dimension (sigma → sigma_sb).
        A catalog target whose dimension depends on an unresolved name exits 3
        and does not quote that placeholder, unless a canonical comparison agreed.
        A one-letter catalog name (a, r, …) is reported and not bound; --bind-short
        binds it. The alias T → temperature still binds.
        An all-constant right-hand side (the Planck length) is compared at the
        SI constant values when its target is a catalog quantity.
        With --equation, the default is the verdict only. --verbose prints the
        linkage map after it. --equation-only is the same verdict and errors
        when --equation is missing (with --json: no "linkage" field).
        A bare e in the formula is the elementary charge. E is energy.
        Euler's number is exp(x), for example exp(1). The name euler is refused.
        --natural sets ħ = c = 1 for a dimension difference that is a power of
        those constants; --geometrized also allows powers of G. The SI default
        still refuses rest_energy = mass.
        --relation=TYPE keeps only edges whose recorded Atlas relation is that
        type; --evidence=TAG keeps only edges whose evidence set, DERIVED from
        the catalog row at read time, contains that tag.
        ⚠ Filtering changes what a missing overlay means: unfiltered, an edge
        with no overlay is KEPT; filtered, it is DROPPED, because nothing shows
        it satisfies the filter. Those drops are counted and printed separately
        from the edges that simply did not match — an unaudited graph must not
        render as a complete answer.
        --around=QUANTITY [--depth=N] keeps only the edges within N
        shared-quantity hops of QUANTITY (default ${DEFAULT_DEPTH}: the edges that use it),
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
        claim, and counts the claims; --max-routes=N (default ${atlasMap.DEFAULT_MAX_ROUTES}, at most
        ${atlasMap.MAX_ROUTES_CEILING}) bounds the list, and a list cut short says so and says up to
        which bridge count it is complete.
        --observable=NAME maps the bridges whose RECORDED preserves text, or
        declared bound translation, names that observable (a whole-word text
        match, nothing inferred), lists apart those recording it as NOT
        preserved, and counts the bridges that record nothing about it;
        --relation/--evidence filter it as they filter a family.
        --stored derives evidence from the committed witness results
        (${publishedUrl('data/atlas/witness-results.json')}; not in the published package),
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
  'formally-proved-property',
  'formally-proved-cross-check',
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
  const opts = parseDiscoveryOpts(api, flags);
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
  graph: readonly BridgeEdge[],
  options?: { readonly bindShortNames?: boolean; readonly units?: Exclude<UnitMode, 'si'> },
): Promise<{ user: EquationAnalysis; comparisons: CanonicalComparison[] }> {
  const catalogDims = new Map<string, import('../../dimensional/types.js').Dimension>();
  for (const e of graph) {
    for (const q of [...e.sources, e.target]) catalogDims.set(q.name, q.dim);
  }
  const user = await api.analyzeUserEquation(equation, catalogDims, options);
  // Dimensions cannot see a prefactor: compare with the canonical equation the
  // user's one restates, when the registry holds one (persona finding L2).
  const comparisons = user.parseError
    ? []
    : await api.compareUserEquation(equation, catalogDims, {
        bindShortNames: options?.bindShortNames,
        ...(options?.units === undefined ? {} : { constantOverrides: api.naturalConstantOverrides(options.units) }),
      });
  return { user, comparisons };
}

function unresolvedNames(user: EquationAnalysis): string[] {
  const placeholderNames = [
    ...(user.placeholders ?? []),
    ...(user.shortBindings ?? []).filter((b) => b.bound === false).map((b) => b.name),
  ];
  return [...new Set([...(user.hints ?? []).map((h) => h.name), ...placeholderNames])];
}

/** The exit `upt derive` uses for the same question. */
function equationDetermination(
  user: EquationAnalysis,
  comparisons: readonly CanonicalComparison[],
): Determination {
  const unresolved = unresolvedNames(user);
  const asked = user.targetDimension != null;
  return classifyDetermination({
    asked,
    agrees: comparisons.some((c) => c.kind === 'agrees'),
    checkFailed:
      (user.consistent === false && unresolved.length === 0) || canonicalCheckFailed(comparisons),
    notUnique: false,
    unresolved,
  });
}

function tainted(user: EquationAnalysis): boolean {
  return unresolvedNames(user).length > 0;
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
  const unresolved = unresolvedNames(user);
  const verdict = equationDetermination(user, comparisons);
  if (user.consistent === true) {
    out(`  ✓ dimensionally consistent: ${api.format(user.rhsDimension!)}`);
  } else if (verdict.report === 'not-established') {
    const names = unresolved.map((n) => `'${n}'`).join(', ');
    out(
      `  · NOT ESTABLISHED: ${names} ${unresolved.length > 1 ? 'have' : 'has'} no catalog dimension, ` +
        'so the right-hand side dimension was not established and is not reported.',
    );
  } else if (verdict.report === 'established' && unresolved.length > 0) {
    // A canonical agreement ran. The placeholder dimension is not that result.
  } else if (user.consistent === false) {
    out(
      `  ⚠ dimensional MISMATCH: RHS is ${api.format(user.rhsDimension!)} but the target is ${api.format(
        user.targetDimension!
      )}`
    );
  } else if (user.rhsDimension && (user.placeholders ?? []).length > 0) {
    const names = user.placeholders.map((n) => `'${n}'`).join(', ');
    out(
      `  · UNKNOWN: ${names} ${user.placeholders.length === 1 ? 'was' : 'were'} taken as dimensionless. ` +
        'That is not the dimension of the formula, and the target is not a bound catalog name, so nothing was checked',
    );
  } else if (user.rhsDimension) {
    out(`  · RHS dimension: ${api.format(user.rhsDimension)} (target not in the catalog, so no comparison)`);
  }
  for (const line of api.describeKnownRelation(comparisons, user.junction.target, [...user.junction.sources])) {
    out(`  ${line}`);
  }
  for (const line of conventionLines(comparisons.map((c) => c.id))) out(`  ${line}`);
  if (user.naturalNote) out(`  ${user.naturalNote}`);
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
    // Persona finding L5: `sigma` for the Stefan–Boltzmann constant `sigma_sb`.
    if ((h.constants ?? []).length > 0) {
      const list = h.constants!.join(', ');
      out(
        `    '${h.name}' has the inferred dimension of the registered constant${h.constants!.length > 1 ? 's' : ''} ${list}; ` +
          'write that name to use its SI value',
      );
    }
  }
  // Persona finding W6: a one-letter name binds to whatever the catalog calls that letter.
  for (const b of user.shortBindings ?? []) {
    const users = model.junctions
      .filter((j) => j.id !== 'user-equation' && (j.target === b.quantity || j.sources.includes(b.quantity)))
      .map((j) => j.id)
      .sort();
    const shown = users.slice(0, 3).join(', ') + (users.length > 3 ? `, +${users.length - 3} more` : '');
    const used = users.length > 0 ? ` (used by ${shown})` : '';
    if (b.bound === false) {
      out(
        `  · '${b.name}' matches the catalog quantity ${b.quantity} ${api.format(b.dim)}${used}, a one-letter name, and is not bound. ` +
          'Pass --bind-short to bind it, or write the full name you meant',
      );
    } else {
      out(
        `  · '${b.name}' is bound to the catalog quantity ${b.quantity} ${api.format(b.dim)}, a one-letter name` +
          `${used}; if you meant another quantity, write its full name`,
      );
    }
  }
}

/** Flags that shape the equation graph, and so mean nothing on an atlas view. */
const GRAPH_ONLY_FLAGS = ['source', 'around', 'depth', 'equation', 'equation-only', 'proposed', 'max-orders', 'anchor'] as const;

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

/**
 * `--out=PATH` holds for every output form. A visual form writes its diagram
 * source (handled by the branch that renders it); the text report and the
 * `--json` envelope are captured here and written whole, so stdout stays
 * empty and the file holds exactly what stdout would have carried. An empty
 * PATH exits 1 in every form.
 */
async function run(ctx: CommandCtx): Promise<number> {
  const path = lastValue(ctx.args.flags, 'out');
  const fmt = lastValue(ctx.args.flags, 'format') ?? 'text';
  if (path === undefined || fmt !== 'text') return runReport(ctx);
  if (!path) throw new CliError('upt: --out= requires a non-empty PATH');
  let captured = '';
  const code = await runReport({
    ...ctx,
    out: (line?: string) => {
      captured += (line ?? '') + '\n';
    },
    write: (s: string) => {
      captured += s;
    },
  });
  try {
    writeFileSync(path, captured);
  } catch (e) {
    throw new CliError((e as Error).message);
  }
  ctx.err(`upt: wrote ${ctx.args.flags.has('json') ? 'json' : 'text'} to ${path}`);
  return code;
}

async function runReport(ctx: CommandCtx): Promise<number> {
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
  const sourceFlags = args.flags.has('source') ? args.flags : new Map(args.flags).set('source', ['both']);
  const { graph: wholeGraph, label, source } = resolveGraph(api, sourceFlags);

  const around = lastValue(args.flags, 'around');
  const depthRaw = lastValue(args.flags, 'depth');
  if (depthRaw !== undefined && around === undefined) throw new CliError('upt map: --depth needs --around');
  let focus: { around: string; depth: number; kept: number; of: number } | null = null;
  let fullGraph = wholeGraph;
  if (around !== undefined) {
    const depth = depthRaw === undefined ? DEFAULT_DEPTH : Number(depthRaw);
    if (!Number.isInteger(depth) || depth < 1 || depth > MAX_DEPTH) throw new CliError(`upt map: --depth=${depthRaw} must be an integer from 1 to ${MAX_DEPTH}`);
    const known = new Set(wholeGraph.flatMap((e) => [...e.sources.map((q) => q.name), e.target.name]));
    const name = api.resolveQuantityName(around, known);
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
  // The two overlay filters. Parsed BEFORE anything else is computed so a bad
  // value costs nothing and always exits 1.
  const relation = parseFilter(lastValue(args.flags, 'relation'), RELATION_TYPES, '--relation');
  const evidence = parseFilter(lastValue(args.flags, 'evidence'), EVIDENCE_TAGS, '--evidence');
  const filterOpts = withCatalogEvidence({
    ...(relation !== undefined ? { relation } : {}),
    ...(evidence !== undefined ? { evidence } : {}),
  });
  // The TEXT and JSON paths filter the edge list here, because `linkageMap`
  // consumes edges. The VISUAL path hands `buildVizModel` the FULL graph with
  // the same options, so the model also judges the --proposed / --equation
  // overlay junctions, which are not edges and which `filterEdges` cannot see.
  // One predicate, two callers: they cannot disagree about what a filter
  // selects, only about how much they were asked to count.
  const { kept: graph, stats: edgeStats } = api.filterEdges(fullGraph, filterOpts);
  // Audit I3: what "anchored" means here, and the discovery ground truth when --proposed ran the funnel.
  const anchor: AnchorScope = {
    core: coreAnchor(graph),
    ...(args.flags.has('proposed') ? { groundTruth: groundTruthAnchor(api, parseDiscoveryOpts(api, args.flags)) } : {}),
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
  // Persona finding L7: the verdict alone, without the linkage map after it.
  const equationOnly = args.flags.has('equation-only');
  if (equationOnly && equation == null) throw new UsageError('upt map: --equation-only needs --equation "TARGET = EXPR"');
  if (equationOnly && fmt !== 'text') {
    throw new UsageError(`upt map: --equation-only prints the verdict as text or --json; it does not apply to --format=${fmt}`);
  }
  if (equation != null) {
    if (!equation.trim()) {
      throw new UsageError('upt: --equation requires "TARGET = EXPR"');
    }
    try {
      const units: Exclude<UnitMode, 'si'> | undefined = args.flags.has('geometrized')
        ? 'geometrized'
        : args.flags.has('natural')
          ? 'natural'
          : undefined;
      if (args.flags.has('geometrized') && args.flags.has('natural')) {
        throw new UsageError('upt map: pick one unit mode: --natural (ħ = c = 1) or --geometrized (ħ = c = G = 1)');
      }
      ({ user, comparisons } = await analyzeEquation(api, equation, graph, {
        bindShortNames: args.flags.has('bind-short'),
        ...(units === undefined ? {} : { units }),
      })); // throws UserEquationError on malformed structure
    } catch (e) {
      throw new UsageError('upt: ' + (e && (e as Error).message ? (e as Error).message : String(e)));
    }
    if (user.parseError) {
      throw new UsageError('upt: ' + user.parseError); // dimensionally malformed RHS
    }
  }

  // The same classification `upt derive` uses. A canonical agreement stays 0.
  // A catalog target that was not established exits 3. An unbound target stays 0.
  const exitCode = user === null ? 0 : equationDetermination(user, comparisons).exit;

  // Ranked from the UNFILTERED graph: the proposal set is a property of the
  // whole catalog, and the model then judges each overlay junction under the
  // same filter as every other junction. Computed once for every output form.
  const proposed: VizJunction[] | null = args.flags.has('proposed') ? proposedJunctions(api, wholeGraph, args.flags) : null;
  const overlay = (extra: VizJunction[]): VizJunction[] => [...(proposed ?? []), ...extra];

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
        consistent: tainted(user) ? null : user.consistent,
        rhsDimension: tainted(user) ? null : user.rhsDimension,
        targetDimension: user.targetDimension,
        hints: user.hints,
        shortBindings: user.shortBindings,
        ...(user.placeholders.length === 0 ? {} : { placeholders: user.placeholders }),
        canonicalComparisons: comparisons,
        catalogEdges: api.matchingCatalogEdges(user.junction.target, [...user.junction.sources]),
      };
    }
    emitJson(
      {
        command: 'map',
        source,
        anchor,
        result: {
          ...(equation != null && (equationOnly || !args.flags.has('verbose')) ? {} : { linkage }),
          ...(proposed === null ? {} : { proposed: proposed.map((p) => ({ id: p.id, target: p.target, sources: p.sources })) }),
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
    if (focusLine !== null) err(`upt: ${focusLine}`);
    if (model.filterLegend !== null) err(`upt: ${model.filterLegend}`);
    if (user) printEquationReport(api, model, user, err, comparisons);
    return exitCode;
  }
  if (fmt !== 'text') {
    throw new CliError(`upt: unknown --format='${fmt}' (expected: text | mermaid | dot | svg)`);
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
    if (equationOnly || !args.flags.has('verbose')) return exitCode;
  }

  const m = api.linkageMap(graph);
  const mix = (s: Readonly<Record<string, number>>) =>
    Object.entries(s)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');
  out(`\nLinkage map — how the equations connect via shared quantities  [source: ${label}]`);
  out(`(${m.componentCount} components over ${graph.length} edges; ${m.compositions} compose into chains)`);
  out(`  ${coreLine(anchor.core!)}`);
  if (anchor.groundTruth) out(`  proposals: ${groundTruthLine(anchor.groundTruth)}`);
  if (proposed !== null) {
    // The overlay the visual forms draw, listed here: an unadjudicated identity consequence is a
    // proposal, never a catalog edge. Each names its target and the quantities it would relate.
    out(`  proposed relations (${proposed.length}, unadjudicated identity consequences; not catalog edges):`);
    for (const p of proposed) out(`     ${p.id}: ${p.target} ← {${p.sources.join(', ')}}`);
    if (proposed.length === 0) out('     (none at this anchor and --max-orders)');
  }
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
  out(`     ${m.isolated.length === 0 ? 'none' : m.isolated.join(', ')}`);
  out('\n  (a structural map — shared-quantity connectivity, NOT a credibility signal)');
  return exitCode;
}

export const command: Command = {
  name: 'map',
  aliases: ['linkage'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Show how equations link, or where your own equation lands on that graph.',
  example: 'upt map --equation "period = 2*pi*sqrt(length/gravity)"',
  group: 'explore',
  run,
};

registerCommand(command);
