/**
 * `upt axes` — the axis-discrimination audit. Reproduces from the CLI the
 * measurement behind the rank-7 finding: which tensor classification axes actually
 * GATE the discovery funnel (an axis stays ungated until it MEASURABLY fires on
 * real candidates). Closes the reproducibility gap for
 * docs/research/rank7-axis-measurement.md.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';
import { publishedUrl } from '../published-url.js';

const FLAGS: FlagSpec[] = [JSON_FLAG];

const HELP = `upt axes
        Axis-discrimination audit — which tensor classification axes actually
        GATE the discovery funnel. Each axis measures FIRES (candidate clashes)
        vs ABSTAINS over the funnel; an axis gates only when it fires. Reproduces
        the rank-7 measurement (topology/statistics/symmetry classify but don't gate).
        Beside each axis: Fisher's exact test of its fires against the
        independent magnitude falsifier's clashes (table, odds ratio, p, n),
        and EARNED when p < 0.05 with a positive association. Firing is
        activity, not evidence: a gated axis that is not earned is named.`;

const EPISTEMICS =
  `(rank grows on measured evidence: an axis gates only when it fires — ${publishedUrl('docs/research/rank7-axis-measurement.md')})`;

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const report = api.auditAxisDiscrimination(api.CATALOG_GRAPH);

  if (args.flags.has('json')) {
    emitJson({ command: 'axes', epistemics: EPISTEMICS, result: report }, ctx.write);
    return 0;
  }

  out('\nTensor-axis discrimination audit — which axes gate the discovery funnel');
  out(EPISTEMICS + '\n');
  for (const r of report) {
    out(
      `  ${r.axis.padEnd(12)} ${r.gated ? 'GATED   ' : 'ungated '}` +
        ` checked ${String(r.checked).padStart(3)} · fires ${String(r.fires).padStart(3)} · ` +
        (r.discriminates ? 'discriminates ✓' : 'does not gate'),
    );
    const { table, oddsRatio, pValue, n } = r.evidence;
    const odds = oddsRatio === null ? 'undefined' : api.formatQuantity(oddsRatio, 3);
    out(
      `               vs the magnitude falsifier: [[${table[0][0]}, ${table[0][1]}], [${table[1][0]}, ${table[1][1]}]] · ` +
        `odds ratio ${odds} · p = ${api.formatQuantity(pValue, 3)} · n = ${n} · ${r.earned ? 'EARNED' : 'NOT earned'}`,
    );
  }
  const gated = report.filter((r) => r.gated).map((r) => r.axis);
  out(
    `\n  ${gated.length} of ${report.length} axes gate (${gated.join(', ')}); ` +
      'the rest classify but do not gate (their physics is closed-form-isolated or already-connected).',
  );
  // Firing is activity; agreeing with an independent falsifier more often than chance is evidence.
  out(
    `  Evidence: Fisher's exact test of each axis's fires against the magnitude falsifier's clashes, over the ` +
      `pairs where both ran (table rows fires/silent, columns clash/no clash). EARNED means p < ${api.AUDIT_ALPHA} ` +
      'with a positive association; it changes no gate.',
  );
  const unearned = report.filter((r) => r.gated && !r.earned).map((r) => r.axis);
  const earned = report.filter((r) => r.earned).map((r) => r.axis);
  if (unearned.length > 0) {
    out(
      `  The gated axes ${unearned.join(', ')} are NOT earned: they gate because they fire, and their fires do not ` +
        'coincide with the magnitude falsifier more often than chance.',
    );
  }
  out(`  Earned axes: ${earned.length === 0 ? 'none' : earned.join(', ')}.`);
  return 0;
}

export const command: Command = {
  name: 'axes',
  aliases: ['axis-audit'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Report which tensor classification axes gate the discovery funnel.',
  example: 'upt axes',
  group: 'discovery',
  run,
};

registerCommand(command);
