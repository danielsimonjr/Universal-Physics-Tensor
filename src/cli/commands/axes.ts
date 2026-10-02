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

const FLAGS: FlagSpec[] = [JSON_FLAG];

const HELP = `upt axes
        Axis-discrimination audit — which tensor classification axes actually
        GATE the discovery funnel. Each axis measures FIRES (candidate clashes)
        vs ABSTAINS over the funnel; an axis gates only when it fires. Reproduces
        the rank-7 measurement (topology/statistics/symmetry classify but don't gate).`;

const EPISTEMICS =
  '(rank grows on measured evidence: an axis gates only when it fires — docs/research/rank7-axis-measurement.md)';

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
  }
  const gated = report.filter((r) => r.gated).map((r) => r.axis);
  out(
    `\n  ${gated.length} of ${report.length} axes gate (${gated.join(', ')}); ` +
      'the rest classify but do not gate (their physics is closed-form-isolated or already-connected).',
  );
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
