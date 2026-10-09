/**
 * `upt confront` — run the catalog's committed real-data confrontations and
 * report predicted-vs-observed with the epistemics that confrontation ≠
 * confirmation. Not graph-parameterized (no --source).
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { CliError, UsageError } from '../errors.js';
import { emitJson } from '../output.js';
import { publishedUrl } from '../published-url.js';

const FLAGS: FlagSpec[] = [
  { name: '--bridge', valueStyle: 'attached', description: 'Select one bridge id, the same selection as a positional be-XX.' },
  { name: '--sensitivity', valueStyle: 'none', description: 'Rank the prediction\'s input elasticities. Value-kind records only.' },
  { name: '--rigor', valueStyle: 'attached', description: 'Show one rigor tier: stringent, moderate, or loose.' },
  {
    name: '--frontier',
    valueStyle: 'none',
    description: 'Rank the σ-tests by margin to this tool\'s 1σ acceptance line. That line is a software criterion.',
  },
  JSON_FLAG,
];

const HELP = `upt confront [be-XX] [--bridge=be-XX] [--rigor=stringent|moderate|loose] [--frontier] [--sensitivity] [--json]
        Run the catalog's committed real-data confrontations (predicted vs
        observed), each tagged with its RIGOR tier. A positional be-XX is the
        same selection as --bridge (the form \`upt explain be-XX\` prints);
        the two must name the same bridge when both are given. A positional
        that is not a bridge id is an error. It is not ignored.
        --rigor=<tier> shows only that tier (the precision core, or the loose
        tail that needs better data); --frontier ranks the σ-tests by margin to
        this tool's 1σ acceptance threshold (a software criterion, not a
        scientific exclusion level; the smallest margin is the most at-risk
        under new data);
        --sensitivity adds an input-elasticity ranking (value-kind only).
        Each record states its statistical object (point estimate ± 1σ,
        one-sided limit, or a consistency ratio with no σ), the criterion
        applied, whether the observed number is derived, its preprocessing,
        its independence from the prediction (no fitted parameter, a shared
        input, or not recorded — never implied), and the record's notes.
        Each statement cites the GitHub URL of the file it quotes, with a
        verbatim quote or a declared symbol; that the cited text exists
        does not make the statement true.
        Consistency ratios are counted apart and never as precision tests;
        each prints its actual difference (observed − predicted)/predicted
        separately from its stated agreement bound.
        be-53 is not in that registry. \`upt confront be-53\` refuses: a
        confrontation needs a caller-supplied measured-coupling table and a
        running procedure (requestYangMillsConfrontation). The refusal names
        each missing input, prints no residual, and does not change the
        catalog status. It is not a pass and not a fail. The one-loop
        coefficient's sign is oneLoopCoefficientStatement, not this command.`;

const RIGOR_TIERS = new Set(['stringent', 'moderate', 'loose']);

/** σ-headroom to the 1σ acceptance threshold for a value outcome; null for others. */
function frontierMarginSigma(
  outcome: { kind: string; residualInSigma?: number } | undefined,
): number | null {
  return outcome && outcome.kind === 'value' && typeof outcome.residualInSigma === 'number'
    ? 1 - outcome.residualInSigma
    : null;
}

const EPISTEMICS =
  'confrontation is consistency, not confirmation; a passing confrontation does not prove the bridge.';
const SENSITIVITY_EPISTEMICS =
  ' sensitivity (elasticity) ranks which input the prediction depends on most STRONGLY; ' +
  'it is NOT which input dominates the uncertainty budget (that needs input sigma).';

function parseSelection(api: CommandCtx['api'], raw: string, via: 'flag' | 'positional'): number {
  try {
    return api.parseBridgeId(raw);
  } catch {
    throw new CliError(
      via === 'flag'
        ? `upt confront: invalid --bridge='${raw}' (expected be-<id>)`
        : `upt confront: '${raw}' is not a bridge id (expected be-<id>). A positional is not ignored.`,
    );
  }
}

/** The bridge a positional id and/or `--bridge` select, or undefined for the full list. */
function selectedBridgeId(api: CommandCtx['api'], args: CommandCtx['args']): number | undefined {
  if (args.positionals.length > 1) {
    throw new UsageError(
      `upt confront: unexpected extra arguments (${args.positionals.slice(1).join(', ')}). ` +
        'Give one bridge id, e.g. `upt confront be-58`, or `--bridge=be-58`.',
    );
  }
  const flag = args.flags.get('bridge');
  const fromFlag = flag && flag.length > 0 ? parseSelection(api, flag[flag.length - 1]!, 'flag') : undefined;
  const fromPositional = args.positionals.length === 1 ? parseSelection(api, args.positionals[0]!, 'positional') : undefined;
  if (fromFlag !== undefined && fromPositional !== undefined && fromFlag !== fromPositional) {
    throw new UsageError(
      `upt confront: positional be-${fromPositional} and --bridge=be-${fromFlag} name different bridges`,
    );
  }
  return fromFlag ?? fromPositional;
}

const SENSITIVITY_NOTE = 'strongest dependence, not uncertainty budget';

type Outcome = ReturnType<CommandCtx['api']['listConfrontations']>[number]['run'] extends () => infer O ? O : never;

/**
 * The statistical object a confrontation compares, the criterion it applies,
 * and where its observed number comes from — read from the outcome's kind and
 * fields only.
 */
function statisticOf(o: Outcome): { object: string; criterion: string; observed: string } {
  const reported = 'as reported by the source (no derivation recorded)';
  switch (o.kind) {
    case 'value':
      return {
        object: 'point estimate ± 1σ',
        criterion: 'residual ≤ 1σ',
        observed: o.measured ? `derived from ${o.measured.quantity} by ${o.measured.derivation}` : reported,
      };
    case 'upper-bound':
      return o.predictedIs === 'encoded-bound'
        ? { object: 'one-sided upper limit against an encoded range', criterion: 'observed limit ≤ encoded bound', observed: reported }
        : { object: 'one-sided upper limit', criterion: 'predicted ≤ limit', observed: reported };
    case 'consistency':
      if (o.predictedIs === 'lower-limit') {
        return {
          object: 'lower limit claimed by the bridge, against a reference value with no σ',
          criterion: 'observed ≥ predicted lower limit — one-sided, not a σ-residual; not a precision test',
          observed: reported,
        };
      }
      return {
        object: 'reference value with no σ',
        criterion:
          o.fractionalGapIs === 'agreement-bound'
            ? "|actual difference| ≤ the record's stated agreement bound — a tolerance, not a σ-residual; not a precision test"
            : 'none — the outcome carries no agreement bound; the difference is reported, not thresholded; not a precision test',
        observed: reported,
      };
    case 'table':
      return { object: 'per-row point estimate ± 1σ', criterion: 'residual per row, reported not thresholded', observed: reported };
  }
}

function statisticDistribution(outcomes: readonly Outcome[]) {
  const n = (k: Outcome['kind']) => outcomes.filter((o) => o.kind === k).length;
  return { sigmaTests: n('value'), limits: n('upper-bound'), consistencyRatios: n('consistency'), tables: n('table') };
}

/** A fraction as a percentage; exponent form below 0.05% so a tiny nonzero value never prints as 0.0%. */
function percent(x: number): string {
  const p = x * 100;
  return `${p !== 0 && Math.abs(p) < 0.05 ? p.toExponential(1) : p.toFixed(1)}%`;
}

function signedPercent(x: number): string {
  return `${x > 0 ? '+' : ''}${percent(x)}`;
}

const NOT_RECORDED = 'not recorded — the record states nothing on this; that is not "none"';

type SourceRefs = Extract<Outcome['preprocessing'], { state: 'recorded' }>['source'];

function sourceLine(refs: SourceRefs): string {
  return `[source: ${refs.map((r) => ('quote' in r ? `${publishedUrl(r.file)} "${r.quote}"` : `${publishedUrl(r.file)} #${r.symbol}`)).join('; ')}]`;
}

function preprocessingLine(o: Outcome): string {
  const p = o.preprocessing;
  return p.state === 'recorded' ? `${p.statement} ${sourceLine(p.source)}` : NOT_RECORDED;
}

function independenceLine(o: Outcome): string {
  const i = o.independence;
  switch (i.state) {
    case 'no-fitted-parameter':
      return `no parameter fitted to this measurement — ${i.statement} ${sourceLine(i.source)}`;
    case 'shares-input':
      return `shares ${i.shared} — ${i.statement} ${sourceLine(i.source)}`;
    case 'not-recorded':
      return NOT_RECORDED;
  }
}

function dataHandlingDistribution(outcomes: readonly Outcome[]) {
  const pre = (s: Outcome['preprocessing']['state']) => outcomes.filter((o) => o.preprocessing.state === s).length;
  const ind = (s: Outcome['independence']['state']) => outcomes.filter((o) => o.independence.state === s).length;
  return {
    preprocessing: { recorded: pre('recorded'), notRecorded: pre('not-recorded') },
    independence: {
      noFittedParameter: ind('no-fitted-parameter'),
      sharesInput: ind('shares-input'),
      notRecorded: ind('not-recorded'),
    },
  };
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const bridgeId = selectedBridgeId(api, args);
  const wantJson = args.flags.has('json');
  const wantSensitivity = args.flags.has('sensitivity');
  const wantFrontier = args.flags.has('frontier');
  const rigorFlag = args.flags.get('rigor');
  const rigorTier = rigorFlag && rigorFlag.length ? rigorFlag[rigorFlag.length - 1] : undefined;
  if (rigorTier !== undefined && !RIGOR_TIERS.has(rigorTier)) {
    throw new CliError(`upt confront: invalid --rigor='${rigorTier}' (expected stringent|moderate|loose)`);
  }

  if (bridgeId !== undefined && api.catalogEntry(bridgeId)?.callerTable === true) {
    const refusal = api.requestCallerTableConfrontation({});
    if (refusal.status !== 'refused') {
      throw new CliError(`upt confront: catalog id ${bridgeId} without a table and a running procedure did not refuse`);
    }
    const missing = refusal.missing.join('; ');
    if (wantJson) {
      emitJson(
        {
          command: 'confront',
          result: {
            bridgeId,
            status: 'refused',
            missing: refusal.missing,
            pass: false,
            fail: false,
            catalogStatus: 'unchanged',
          },
        },
        ctx.write,
      );
    } else {
      out(`catalog id ${bridgeId} refused. Missing: ${missing}.`);
      out(`This is not a pass and not a fail. The catalog status of catalog id ${bridgeId} is unchanged.`);
    }
    // The refusal is the result the command computed: exit 0, as a path with no composite claim.
    return 0;
  }

  let entries =
    bridgeId === undefined
      ? api.listConfrontations()
      : (() => {
          const one = api.listConfrontations().find((e) => e.bridgeId === bridgeId);
          if (!one) throw new CliError(`upt confront: no confrontation registered for be-${bridgeId}`);
          return [one];
        })();

  if (rigorTier !== undefined) {
    entries = entries.filter((e) => api.confrontationRigor(e.bridgeId) === rigorTier);
  }

  const results = entries.map((e) => ({
    bridgeId: e.bridgeId,
    title: e.title,
    outcome: e.run(),
    rigor: api.confrontationRigor(e.bridgeId),
  }));

  if (wantFrontier) {
    // Frontier = closest to the threshold: value-kind by σ-headroom ASCENDING (smallest
    // margin = most at-risk under new data); non-σ outcomes (bounds/consistency) after.
    results.sort((a, b) => {
      const ma = frontierMarginSigma(a.outcome);
      const mb = frontierMarginSigma(b.outcome);
      if (ma === null && mb === null) return 0;
      if (ma === null) return 1;
      if (mb === null) return -1;
      return ma - mb;
    });
  }

  if (wantJson) {
    const jsonResults = results.map((r) => ({
      bridgeId: r.bridgeId,
      rigor: r.rigor,
      ...(wantSensitivity && r.outcome.kind === 'value'
        ? { ...r.outcome, sensitivity: api.decidingMeasurement(r.bridgeId) }
        : r.outcome),
      ...(r.outcome.kind === 'consistency' ? { comparison: api.consistencyComparison(r.outcome) } : {}),
      statistic: statisticOf(r.outcome),
    }));
    const epistemics = wantSensitivity ? EPISTEMICS + SENSITIVITY_EPISTEMICS : EPISTEMICS;
    emitJson(
      {
        command: 'confront',
        epistemics,
        rigorDistribution: api.rigorDistribution(),
        statisticDistribution: statisticDistribution(results.map((r) => r.outcome)),
        dataHandlingDistribution: dataHandlingDistribution(results.map((r) => r.outcome)),
        result: jsonResults,
      },
      ctx.write,
    );
    return 0;
  }

  out('\nReal-data confrontations — predicted vs observed');
  out('(' + EPISTEMICS + (wantSensitivity ? SENSITIVITY_EPISTEMICS : '') + ')');
  // The spine is a RIGOR HIERARCHY, not N equal confirmations (docs/research/pi-instrument-results.md).
  if (results.length > 1) {
    const d = { stringent: 0, moderate: 0, loose: 0 };
    for (const r of results) d[r.rigor]++;
    out(
      `rigor: ${d.stringent} stringent · ${d.moderate} moderate · ${d.loose} loose — NOT ${results.length} equal confirmations`,
    );
    const s = statisticDistribution(results.map((r) => r.outcome));
    out(
      `by statistic: ${s.sigmaTests} σ-residual tests · ${s.limits} limits · ${s.consistencyRatios} consistency ratios ` +
        `(no σ; never counted as precision tests)${s.tables ? ` · ${s.tables} tables` : ''}`,
    );
    const h = dataHandlingDistribution(results.map((r) => r.outcome));
    out(
      `preprocessing: recorded for ${h.preprocessing.recorded} · not recorded for ${h.preprocessing.notRecorded}; ` +
        `independence: ${h.independence.noFittedParameter} no fitted parameter · ${h.independence.sharesInput} share an input ` +
        `· ${h.independence.notRecorded} not recorded (independence is not goodness of fit)`,
    );
    if (wantFrontier) {
      out(
        'frontier: σ-tests ordered by margin to the 1σ acceptance threshold (residual ≤ 1σ passes; a software ' +
          'criterion, not a scientific exclusion level; smallest = most at-risk under new data)',
      );
    }
    out('');
  } else {
    out('');
  }
  for (const { bridgeId, title, rigor, outcome } of results) {
    out(`  be-${bridgeId} [${rigor}]: ${title}`);
    switch (outcome.kind) {
      case 'value': {
        const margin = wantFrontier ? ` · margin ${(1 - outcome.residualInSigma).toFixed(2)}σ to the 1σ acceptance threshold` : '';
        // A derived "observed" value is labelled derived, and the quantity that
        // was actually measured is shown beside it (persona finding L6).
        const m = outcome.measured;
        const observedLabel = m ? `derived ${m.derivation} =` : 'observed';
        out(
          `    predicted ${outcome.predicted} · ${observedLabel} ${outcome.observed} ± ${outcome.sigma} ${outcome.units} · residual ${outcome.residualInSigma.toFixed(2)}σ · ${outcome.withinObserved ? 'within 1σ ✓' : 'outside 1σ'}${margin}`
        );
        if (m) {
          out(`    measured: ${m.quantity} = ${m.value} ± ${m.sigma} (${m.source}); the value above is derived from it, not observed`);
        }
        if (wantSensitivity) {
          const ranked = api.decidingMeasurement(bridgeId);
          if (ranked.length) {
            out(`    sensitivity (elasticity, ${SENSITIVITY_NOTE}):`);
            for (const { input, elasticity } of ranked) {
              out(`      ${input}: ${elasticity}`);
            }
          } else {
            out(`    sensitivity: no ranked-input model for be-${bridgeId}`);
          }
        }
        break;
      }
      case 'upper-bound': {
        const caveat = outcome.caveat ? ` · ${outcome.caveat}` : '';
        out(
          outcome.predictedIs === 'encoded-bound'
            ? `    encoded bound |x| ≤ ${outcome.predicted}, x = ${outcome.units} (a range, not a point prediction) · ` +
                `observed upper limit ${outcome.bound} · rule: observed limit ≤ encoded bound · ` +
                `${outcome.satisfied ? 'compatible ✓' : 'INCOMPATIBLE'}${caveat}`
            : `    predicted ${outcome.predicted} ${outcome.units} · observed upper limit ${outcome.bound} · ` +
                `rule: predicted ≤ limit · ${outcome.satisfied ? 'not excluded ✓' : 'EXCLUDED'}${caveat}`,
        );
        if (wantSensitivity) out(`    sensitivity: n/a for ${outcome.kind}-kind`);
        break;
      }
      case 'consistency': {
        const c = api.consistencyComparison(outcome);
        const verdict =
          c.rule === 'observed ≥ predicted lower limit'
            ? `rule: ${c.rule} · ${c.withinBound ? 'compatible ✓' : 'BELOW THE LIMIT'}`
            : c.agreementBound === null
              ? 'no agreement bound in this outcome, so no compatibility decision'
              : `agreement bound ±${percent(c.agreementBound)} (the record's stated tolerance, not a measured difference) · ` +
                `|difference| ≤ bound: ${c.withinBound ? 'compatible ✓' : 'OUTSIDE BOUND'}`;
        out(
          `    predicted ${outcome.predicted} approaches ${outcome.approaches} ${outcome.units} · ` +
            `actual difference ${signedPercent(c.relativeDifference)} = ${c.definition} · ${verdict}`,
        );
        if (wantSensitivity) out(`    sensitivity: n/a for ${outcome.kind}-kind`);
        break;
      }
      case 'table':
        out(`    ${outcome.rows.length} rows (${outcome.units}):`);
        for (const row of outcome.rows) {
          out(
            `      ${row.label}: predicted ${row.predicted} · observed ${row.observed} ± ${row.sigma} · ${row.residualInSigma.toFixed(2)}σ`
          );
        }
        if (wantSensitivity) out(`    sensitivity: n/a for ${outcome.kind}-kind`);
        break;
    }
    const st = statisticOf(outcome);
    out(`    statistic: ${st.object} · criterion: ${st.criterion} · observed: ${st.observed}`);
    out(`    preprocessing: ${preprocessingLine(outcome)}`);
    out(`    independence: ${independenceLine(outcome)}`);
    if (outcome.provenance.note) out(`    notes: ${outcome.provenance.note}`);
    out(`    source: ${outcome.provenance.citation}`);
  }
  return 0;
}

export const command: Command = {
  name: 'confront',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Run the committed predicted-versus-observed confrontations.',
  example: 'upt confront be-58',
  group: 'data',
  run,
};
registerCommand(command);
