/**
 * `upt coverage` — audit the catalog's empirical grounding. Transposed
 * verbatim from bin/upt.mjs's `coverageCmd()` (lines 716-731), plus `--json`.
 * No `--source`: it audits the bridge catalog specifically.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [JSON_FLAG];

const HELP = `upt coverage
        Audit the catalog's empirical grounding — which bridges are
        data-confronted vs graph-computable vs encoded-only vs thin — to
        target the physicist review. Fabricates nothing.`;

const EPISTEMICS = '(reads the catalog/graph/confrontation modules; fabricates nothing)';

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const r = api.auditCoverage();

  if (args.flags.has('json')) {
    emitJson({ command: 'coverage', epistemics: EPISTEMICS, result: r }, ctx.write);
    return 0;
  }

  out("\nEmpirical-spine coverage — where the catalog's grounding is thin");
  out(EPISTEMICS + '\n');
  out(`  ${r.total} bridges by grounding tier:`);
  out(`    data-confronted  : ${r.byTier['data-confronted']}  (real-data confrontation)`);
  out(`    graph-computable : ${r.byTier['graph-computable']}  (graph edge + dimensional signature)`);
  out(`    encoded-only     : ${r.byTier['encoded-only']}  (dimensional signature, no graph edge)`);
  out(`    thin             : ${r.byTier['thin']}  (no dimensional signature)`);
  out(
    `\n  gaps:  ${r.withoutDataConfrontation} without a data confrontation · ` +
      `${r.withoutCitation} without any citation`
  );
  if (r.thinBridges.length) {
    out(`  thinnest (no dimensional signature): BE-${r.thinBridges.join(', BE-')}`);
  }
  out('\n  (a targeting tool for the CONTRIBUTING.md physicist review, not a quality score.)');
  return 0;
}

export const command: Command = {
  name: 'coverage',
  aliases: ['grounding'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Count catalog bridges by empirical grounding tier.',
  example: 'upt coverage',
  group: 'data',
  run,
};

registerCommand(command);
