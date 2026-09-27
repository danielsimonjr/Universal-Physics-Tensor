/**
 * `upt confront` — run the catalog's committed real-data confrontations and
 * report predicted-vs-observed with the epistemics that confrontation ≠
 * confirmation. Not graph-parameterized (no --source).
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { CliError } from '../errors.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [
  { name: '--bridge', valueStyle: 'attached' },
  { name: '--sensitivity', valueStyle: 'none' },
  { name: '--rigor', valueStyle: 'attached' },
  { name: '--frontier', valueStyle: 'none' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt confront [--bridge=be-XX] [--rigor=stringent|moderate|loose] [--frontier] [--sensitivity] [--json]
        Run the catalog's committed real-data confrontations (predicted vs
        observed), each tagged with its RIGOR tier. --bridge runs one;
        --rigor=<tier> shows only that tier (the precision core, or the loose
        tail that needs better data); --frontier ranks the σ-tests by margin to
        this tool's 1σ acceptance threshold (a software criterion, not a
        scientific exclusion level; the smallest margin is the most at-risk
        under new data);
        --sensitivity adds an input-elasticity ranking (value-kind only).`;

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

function parseBridgeId(raw: string): number {
  // Accept "be-37", "BE-37", or "37".
  const m = /^(?:be-?)?(\d+)$/i.exec(raw.trim());
  if (!m) throw new CliError(`upt confront: invalid --bridge='${raw}' (expected be-XX)`);
  return Number(m[1]);
}

const SENSITIVITY_NOTE = 'strongest dependence, not uncertainty budget';

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const bridgeFlag = args.flags.get('bridge');
  const wantJson = args.flags.has('json');
  const wantSensitivity = args.flags.has('sensitivity');
  const wantFrontier = args.flags.has('frontier');
  const rigorFlag = args.flags.get('rigor');
  const rigorTier = rigorFlag && rigorFlag.length ? rigorFlag[rigorFlag.length - 1] : undefined;
  if (rigorTier !== undefined && !RIGOR_TIERS.has(rigorTier)) {
    throw new CliError(`upt confront: invalid --rigor='${rigorTier}' (expected stringent|moderate|loose)`);
  }

  let entries =
    bridgeFlag && bridgeFlag.length
      ? (() => {
          const id = parseBridgeId(bridgeFlag[bridgeFlag.length - 1]);
          const one = api.listConfrontations().find((e) => e.bridgeId === id);
          if (!one) throw new CliError(`upt confront: no confrontation registered for be-${id}`);
          return [one];
        })()
      : api.listConfrontations();

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
    }));
    const epistemics = wantSensitivity ? EPISTEMICS + SENSITIVITY_EPISTEMICS : EPISTEMICS;
    emitJson(
      { command: 'confront', epistemics, rigorDistribution: api.rigorDistribution(), result: jsonResults },
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
      case 'consistency':
        out(
          `    predicted ${outcome.predicted} approaches ${outcome.approaches} ${outcome.units} · gap ${(outcome.fractionalGap * 100).toFixed(1)}%`
        );
        if (wantSensitivity) out(`    sensitivity: n/a for ${outcome.kind}-kind`);
        break;
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
    out(`    source: ${outcome.provenance.citation}`);
  }
  return 0;
}

export const command: Command = { name: 'confront', aliases: [], flags: FLAGS, help: HELP, run };
registerCommand(command);
