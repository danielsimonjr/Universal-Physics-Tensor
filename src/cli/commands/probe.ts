/**
 * `upt probe <subverb>` — experimental Product B expression/residual search.
 *
 * Orthogonal to `upt discover` (Product A quantity identification). Relation-
 * link and regime-transition gaps abstain and tell the user to use discover.
 */
import { readFileSync, statSync } from 'node:fs';
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { resolveGraph } from '../graphs.js';
import { emitJson } from '../output.js';
import { UsageError, CliError } from '../errors.js';

const SUBVERBS = ['scan', 'show', 'run', 'candidates', 'falsify', 'rank', 'design', 'reproduce', 'study'] as const;
type Subverb = (typeof SUBVERBS)[number];

const FLAGS: FlagSpec[] = [
  { name: '--source', valueStyle: 'attached' },
  { name: '--json', valueStyle: 'none' },
  { name: '--problem', valueStyle: 'attached' },
  { name: '--budget-ms', valueStyle: 'attached' },
  { name: '--holdout-tol', valueStyle: 'attached' },
  { name: '--worker', valueStyle: 'attached' },
  { name: '--bounds', valueStyle: 'attached' },
  { name: '--h1', valueStyle: 'attached' },
  { name: '--h2', valueStyle: 'attached' },
  { name: '--searchable-only', valueStyle: 'none' },
  { name: '--all', valueStyle: 'none' },
  { name: '--data', valueStyle: 'attached' },
  { name: '--replication', valueStyle: 'attached' },
  { name: '--alpha', valueStyle: 'attached' },
];

/**
 * The text printed when a scan has gaps and none of them are searchable.
 * The live catalog scan is no longer in that state; this wording stays
 * covered by a direct test.
 * @internal
 */
export function emptySearchableWarning(total: number): readonly string[] {
  return [
    'upt probe scan — typed frontier gaps',
    `⚠ 0 of ${total} gaps are searchable by Product B ` +
      `(all are relation-link / regime-transition).`,
    '  Use `upt discover` for those. Pass --all to list them here.',
    '  To search expressions, write a problem file (`upt help probe`, PROBLEM FILE, has a minimal example) ' +
      'and run `upt probe run --problem=FILE`.',
  ];
}

const HELP = `upt probe <scan|show|run|candidates|falsify|rank|design|reproduce|study>
        Experimental expression/residual search (Product B). Orthogonal to
        \`upt discover\`, which vets quantity identifications a≡b and is frozen.
        Relation-link / regime-transition gaps are not searchable here — use
        \`upt discover\`.
        scan                 typed frontier gaps (default: searchable only)
        show <gap-id>        one gap
        run --problem=FILE   bounded native search (MHC / holdout / budget)
        candidates           same as run; list stored statuses
        falsify              run + print falsification batteries
        rank                 run + Pareto front
        design --h1= --h2= --bounds=   discriminating experiment suggestion
        reproduce --problem=FILE       re-run a problem (same stop contract)
        study --data=FILE    search + fit on exploratory rows only, then χ²-test
                             the candidate and declared baselines on withheld
                             holdout / replication rows; suggest a discriminating
                             measurement (see STUDY FILE below)
        --replication=FILE   study: replication rows from a separate file (JSON
                             or CSV) with its own provenance
        --searchable-only    scan: only Product-B-searchable gaps (default)
        --all                scan: include Product A wrappers (not searchable)
        --budget-ms=N        wall-clock cap (default 5000)
        --holdout-tol=X      relative holdout RMSE cap (default 0.15)
        --worker=PATH        optional NDJSON worker (spawned as node PATH)
        --source=catalog|canonical|both   the graph a subverb reads (default catalog)
        --alpha=X            study: χ² test level (default: the file's, else 0.001)
        --json               machine envelope

        PROBLEM FILE (--problem=FILE, JSON)
        target       {"name", "dim"}: the observable to explain. "dim" is a named
                     dimension (time, length, mass, acceleration, ...) or explicit
                     L^a.M^b.T^c (e.g. "L^3.M^-1.T^-2").
        governing    [{"name", "dim"}, ...]: the candidate inputs.
        exploratory  {"observable", "rows": [{name: value, ...}, ...]}: the fit data.
        holdout      the same shape: the locked data the fit must also pass. A row
                     that also appears in exploratory is refused as a leak.
        gap          optional {"id", "kind", "summary"}. "id" must start with "fg-".
                     "kind" is one of prediction-residual, relation-link,
                     regime-transition, parameter-tension, assumption-conflict,
                     missing-operator, unexplained-observation (default),
                     model-disagreement, causal-mechanism, other.
        role         optional on a dataset: exploratory-fit (default for
                     exploratory), validation-holdout (default for holdout),
                     external-replication, falsification-only.
        observationsPath  optional: a separate JSON file with the datasets.
        A dimensionless governing variable is written with "dim": "dimensionless".
        Minimal example (small-angle pendulum):
        {
          "target": {"name": "period", "dim": "time"},
          "governing": [{"name": "length", "dim": "length"},
                        {"name": "gravity", "dim": "acceleration"}],
          "exploratory": {"observable": "period", "rows": [
            {"length": 1, "gravity": 9.81, "period": 2.006},
            {"length": 2, "gravity": 9.81, "period": 2.837},
            {"length": 0.5, "gravity": 1.62, "period": 3.491}]},
          "holdout": {"observable": "period", "rows": [
            {"length": 1.5, "gravity": 3.71, "period": 3.995}]}
        }

        STUDY FILE (--data=FILE, JSON, or CSV when FILE ends in .csv)
        provenance   {"synthetic": true|false (required, never inferred),
                     "source", "acquisition"?, "calibration"?}
        target       {"name", "unit", "sigma"?}  sigma: default row uncertainty
        governing    [{"name", "unit", "sigma"?}, ...]  "unit": "" when
                     dimensionless; "sigma": default input uncertainty
        observations [{"id"?, "role", "values": {input: value}, "observed",
                     "sigma"?, "inputSigma"?: {input: σ}, "source"?}, ...].
                     A bare number is in the declared unit; "120 cm" is
                     converted; a dimension mismatch, a missing σ or an
                     undeclared key refuses the file.
        input σ      propagated by effective variance: σ_eff² = σ_y² +
                     Σ (∂f/∂x_i · σ_x_i)², with each model's own slopes; the
                     report states which inputs carry σ. First order in σ_x.
        role         exploratory (the only rows searched and fit) | holdout
                     (withheld test, e.g. a change of regime) | replication
                     (independent acquisition, withheld). A withheld row that
                     repeats an exploratory row's inputs, or a replication row
                     sharing an exploratory row's source, refuses the file.
        baselines    optional [{"name", "formula", "fitPrefactor"?}]: competing
                     models over the governing names in SI units, e.g.
                     "2*pi*sqrt(length/gravity)"; must have the target's dimension.
                     fitPrefactor (default false) fits one scale on exploratory rows.
        criterion    optional {"alpha"} (default 0.001)
        design       optional {"variables": {input: {"min", "max", "steps"?}}}
        correction   optional {"input": <dimensionless input u>, "powers": [2, 4]},
                     or a list of them, one per input (at most 6 powers in all):
                     also search m(x)·(1 + c₁u² + c₂u⁴ + …) for each monomial m,
                     fit on exploratory rows only. Terms are admitted in the
                     declared order, family by family, while each passes an
                     extra-sum-of-squares F test at p < α; the first term a
                     family fails ends that family. The families are additive:
                     no cross term (u·v) and no other function is searched.
        CSV          '# key: value' lines above the header declare the study:
                     '# target: <column>', '# target.sigma: 2 ms',
                     '# governing.<input>.sigma: σ', '# provenance.synthetic: true',
                     '# provenance.source: ...', and any other key above as a
                     dotted path; a value is JSON when it parses, else text.
                     Header: name[unit] quantity columns (name[] when
                     dimensionless), and id, role, source, sigma, sigma(<input>),
                     note. An empty cell is absent. Refused for the same
                     reasons as the JSON it compiles to.
        REPLICATION FILE (--replication=FILE): provenance, target, governing
                     and replication rows only. Refused if its source or
                     acquisition is the study's (ignoring case, spacing and
                     punctuation), or if a row repeats a study row's data
                     exactly (the same data renamed).
        closeness    replication rows at a study row's inputs are tested for
                     agreement too good to be true: identity (Σz² on ν = n) and
                     affine (y_rep = a + b·y_study, ν = n − 2), each a lower-tail
                     χ² test at α/2. Either firing makes replication too-close:
                     a copy, or an overstated σ. Rows at other inputs are not
                     tested, so a copy at altered inputs is not caught.
        Verdicts: no-credible-candidate | refuted-on-holdout | survives-holdout |
        untested-on-holdout; replication is reported separately
        (survives-replication | refuted-on-replication | too-close |
        no-replication-data | not-tested). A candidate
        is credible only if it passes on exploratory rows AND a constant model
        is rejected there. A fit is not a mechanism.
        Synthetic controls: tests/fixtures/probe-study/*.synthetic.{json,csv}.
        Every one was designed knowing its generating law, so a recovery shows
        the method recovers that law; none is a blind test of finding an
        unknown one, and UPT ships no blind control.`;

const EPISTEMICS =
  '⚠ experimental Product B. Not a discovery claim. `upt discover` is the identification funnel.';

function isSubverb(s: string | undefined): s is Subverb {
  return SUBVERBS.includes(s as Subverb);
}

function budgetFromFlags(api: CommandCtx['api'], flags: Map<string, string[]>) {
  const raw = flags.get('budget-ms')?.[0];
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new UsageError('upt probe: --budget-ms must be a positive number');
  }
  return { ...api.DEFAULT_SEARCH_BUDGET, maxWallClockMs: n };
}

function holdoutTolFromFlags(flags: Map<string, string[]>): number | undefined {
  const raw = flags.get('holdout-tol')?.[0];
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new UsageError('upt probe: --holdout-tol must be a positive number');
  }
  return n;
}

function problemPath(flags: Map<string, string[]>): string {
  const p = flags.get('problem')?.[0];
  if (!p) throw new UsageError('upt probe: --problem=FILE is required for this subverb');
  return p;
}

/** Map probe file/parse failures to CLI errors (no stack traces). */
function mapProbeError(e: unknown, context?: string): never {
  if (e instanceof UsageError || e instanceof CliError) throw e;
  const err = e as NodeJS.ErrnoException;
  if (err?.code === 'ENOENT') {
    throw new CliError(`upt probe: file not found: ${err.path ?? context ?? 'unknown'}`);
  }
  if (e instanceof SyntaxError) {
    throw new CliError(
      `upt probe: invalid JSON${context ? ` in ${context}` : ''}: ${e.message}`,
    );
  }
  if (e instanceof Error) {
    throw new CliError(`upt probe: ${e.message}`);
  }
  throw e;
}

function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    mapProbeError(e, path);
  }
}

/** Reject Node flag injection via `--worker=--import=…` etc. */
function validateWorkerPath(worker: string): string {
  if (worker.startsWith('-')) {
    throw new UsageError('upt probe: --worker must be a script path, not a Node flag');
  }
  if (!/\.(m?js|cjs)$/i.test(worker)) {
    throw new UsageError('upt probe: --worker must be a .js, .mjs, or .cjs file');
  }
  try {
    if (!statSync(worker).isFile()) {
      throw new UsageError(`upt probe: --worker is not a file: ${worker}`);
    }
  } catch (e) {
    mapProbeError(e, worker);
  }
  return worker;
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const sub = args.positionals[0];
  if (!isSubverb(sub)) {
    throw new UsageError(
      `upt probe needs a subverb (${SUBVERBS.join('|')}). See \`upt help probe\`.`,
    );
  }

  const { graph, source } = resolveGraph(api, args.flags);

  if (sub === 'scan') {
    if (args.flags.has('searchable-only') && args.flags.has('all')) {
      throw new UsageError('upt probe scan: pick one of --searchable-only or --all');
    }
    // Default: searchable only (persona L3/I4). Today that is often empty —
    // say so, and point at `upt discover` / `--all` rather than dumping 200+
    // Product A wrappers as if they were a Product B frontier.
    const showAll = args.flags.has('all');
    const allGaps = api.scanWithExpressionGaps(graph);
    const searchable = allGaps.filter((g) => g.searchability.searchable);
    const gaps = showAll ? allGaps : searchable;
    if (args.flags.has('json')) {
      emitJson(
        {
          command: 'probe',
          source,
          epistemics: EPISTEMICS,
          options: {
            scan: {
              total: allGaps.length,
              searchable: searchable.length,
              showing: showAll ? 'all' : 'searchable-only',
            },
          },
          result: gaps,
        },
        ctx.write,
      );
      return 0;
    }
    if (!showAll && searchable.length === 0 && allGaps.length > 0) {
      for (const line of emptySearchableWarning(allGaps.length)) out(line);
      return 0;
    }
    out(api.formatFrontierScan(gaps));
    if (!showAll && allGaps.length > searchable.length) {
      out(
        `  (${allGaps.length - searchable.length} Product A wrappers hidden; pass --all to list them)`,
      );
    }
    return 0;
  }

  if (sub === 'show') {
    const id = args.positionals[1];
    if (!id) throw new UsageError('upt probe show needs a gap id (fg-*). See `upt help probe`.');
    const gap = api.scanWithExpressionGaps(graph).find((g) => g.id === id);
    if (!gap) throw new CliError(`upt probe show: no gap '${id}' on this graph`);
    if (args.flags.has('json')) {
      emitJson({ command: 'probe', source, epistemics: EPISTEMICS, result: gap }, ctx.write);
      return 0;
    }
    out(api.formatFrontierGap(gap));
    return 0;
  }

  if (sub === 'design') {
    const h1p = args.flags.get('h1')?.[0];
    const h2p = args.flags.get('h2')?.[0];
    const bp = args.flags.get('bounds')?.[0];
    if (!h1p || !h2p || !bp) {
      throw new UsageError('upt probe design needs --h1=FILE --h2=FILE --bounds=FILE');
    }
    let suggestion;
    try {
      suggestion = api.suggestDiscriminatingPoint(
        api.parseExprJson(h1p),
        api.parseExprJson(h2p),
        api.parseDesignBounds(readJsonFile(bp), bp),
      );
    } catch (e) {
      mapProbeError(e);
    }
    if (args.flags.has('json')) {
      emitJson({ command: 'probe', epistemics: EPISTEMICS, result: suggestion }, ctx.write);
      return 0;
    }
    if (suggestion.abstained) {
      out(`upt probe design — abstained: ${suggestion.reason}`);
      return 0;
    }
    out('upt probe design — suggested discriminating point (never in a forbidden region)');
    out(`  discrimination |H1-H2|/σ = ${suggestion.discrimination}`);
    out(`  point ${JSON.stringify(suggestion.point)}`);
    out(`  H1=${suggestion.h1}  H2=${suggestion.h2}`);
    return 0;
  }

  if (sub === 'study') return runStudy(ctx, source);

  const pp = problemPath(args.flags);
  let problem;
  try {
    problem = api.loadSearchProblemFromJson(pp);
  } catch (e) {
    mapProbeError(e, pp);
  }
  const workerRaw = args.flags.get('worker')?.[0];
  const worker = workerRaw ? validateWorkerPath(workerRaw) : undefined;
  const result = await api.runProbeSearch(problem, {
    budget: budgetFromFlags(api, args.flags),
    holdoutTol: holdoutTolFromFlags(args.flags),
    backendArgv: worker ? [process.execPath, worker] : undefined,
  });

  if (sub === 'run' || sub === 'reproduce' || sub === 'rank' || sub === 'candidates' || sub === 'falsify') {
    if (args.flags.has('json')) {
      emitJson(
        {
          command: 'probe',
          source,
          epistemics: EPISTEMICS,
          options: { subverb: sub },
          result: {
            stopReason: result.stopReason,
            runId: result.manifest.runId,
            candidates: result.candidates.map((c) => ({
              id: c.id,
              status: c.status,
              fingerprint: c.fingerprint,
              complexity: c.complexity,
            })),
            ranked: result.ranked.map((r) => ({
              id: r.record.id,
              pareto: r.pareto,
              scores: r.scores,
              status: r.record.status,
            })),
            wording: result.wording,
            ...(sub === 'falsify'
              ? { falsifications: result.falsifications, notFalsified: notFalsified(result) }
              : {}),
          },
        },
        ctx.write,
      );
      return 0;
    }
    out(api.formatProbeReport(result));
    if (sub === 'falsify') {
      for (const [id, fal] of Object.entries(result.falsifications)) {
        out(`\n  falsify ${id} survived=${fal.survived}`);
        for (const rec of fal.records) out(`    ${rec.battery}: ${rec.outcome} — ${rec.detail}`);
      }
      // Every candidate is accounted for (persona finding C5): one without
      // batteries used to be passed over in silence.
      for (const n of notFalsified(result)) {
        out(`\n  falsify ${n.id}: no batteries run — status ${n.status}: ${n.reason}`);
      }
    }
    return 0;
  }

  throw new UsageError(`upt probe: unhandled subverb '${sub}'`);
}

function alphaFromFlags(flags: Map<string, string[]>): number | undefined {
  const raw = flags.get('alpha')?.[0];
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n >= 1) {
    throw new UsageError('upt probe: --alpha must be a number in (0, 1)');
  }
  return n;
}

async function runStudy(ctx: CommandCtx, source: ReturnType<typeof resolveGraph>['source']): Promise<number> {
  const { args, api, out } = ctx;
  const path = args.flags.get('data')?.[0];
  if (!path) throw new UsageError('upt probe study: --data=FILE is required');
  const replication = args.flags.get('replication')?.[0];
  if (replication === '') throw new UsageError('upt probe study: --replication needs a FILE');
  const budget = budgetFromFlags(api, args.flags);
  const alpha = alphaFromFlags(args.flags);
  let study;
  try {
    study = api.loadStudyFile(path, replication);
  } catch (e) {
    mapProbeError(e, e instanceof SyntaxError ? undefined : path);
  }
  let result;
  try {
    result = await api.runProbeStudy(study, { budget, alpha });
  } catch (e) {
    mapProbeError(e, path);
  }
  if (args.flags.has('json')) {
    emitJson(
      { command: 'probe', source, epistemics: EPISTEMICS, options: { subverb: 'study' }, result },
      ctx.write,
    );
    return 0;
  }
  out(api.formatProbeStudy(result));
  return 0;
}

/** Why the falsification batteries did not run for a candidate, by its final status. */
const NOT_FALSIFIED_REASON: Readonly<Record<string, string>> = {
  'equivalent-known':
    'batteries run only for candidates that are not equivalent to a known corpus relation',
  rejected: 'the candidate was rejected before falsification',
  'insufficient-evidence': 'there were no holdout observations to test it on',
  'empirically-fit': 'the candidate did not pass its holdout',
  'structurally-valid': 'the candidate was not fit to data',
  generated: 'the candidate was not validated',
};

/** The candidates the batteries did not run for, with the reason. */
function notFalsified(result: {
  candidates: readonly { id: string; status: string }[];
  falsifications: Readonly<Record<string, unknown>>;
}): { id: string; status: string; reason: string }[] {
  return result.candidates
    .filter((c) => !(c.id in result.falsifications))
    .map((c) => ({
      id: c.id,
      status: c.status,
      reason: NOT_FALSIFIED_REASON[c.status] ?? 'the batteries did not run for this status',
    }));
}

export const command: Command = {
  name: 'probe',
  aliases: [],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
