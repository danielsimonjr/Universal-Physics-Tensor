/**
 * `upt predict` — project the catalog onto the (scale × force) regime plane
 * and rank empty regime cells as undiscovered-connection hypotheses.
 * Transposed verbatim from bin/upt.mjs's `predictCmd()` (lines 567-589),
 * plus `--source` (module-level `GRAPH` in the old CLI was always the
 * catalog graph) and `--json`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { resolveGraph } from '../graphs.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [
  { name: '--source', valueStyle: 'attached' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt predict [--source=catalog|canonical|both]
        Project the catalog onto the (scale × force) regime plane and rank
        the EMPTY regime cells as undiscovered-connection hypotheses
        (triadic closure). Makes the namesake tensor operational. Review
        surface, not discovered bridges.
        --source picks the graph (default catalog).`;

const EPISTEMICS =
  '⚠ STRUCTURAL hypotheses for physicist review, NOT discovered bridges. "Two regimes\n' +
  '  share bridge-neighbours but are not directly linked" (triadic closure) is a weak prior.';

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const { graph, source } = resolveGraph(api, args.flags);
  const r = api.predictMissingBridges(graph);

  if (args.flags.has('json')) {
    emitJson({ command: 'predict', source, epistemics: EPISTEMICS, result: r }, ctx.write);
    return 0;
  }

  const short = (k: string) => k.replace(/scale=/g, '').replace(/force=/g, '').replace('|', '/');
  out('\nBridge prediction — empty (scale×force) regime cells as undiscovered-link HYPOTHESES');
  out('⚠ STRUCTURAL hypotheses for physicist review, NOT discovered bridges. "Two regimes');
  out('  share bridge-neighbours but are not directly linked" (triadic closure) is a weak prior.\n');
  out(
    `  projected ${r.placedEdges}/${r.totalEdges} edges onto ${r.occupiedRegimes.length} regimes; ` +
      `${r.linkedPairCount} regime-pairs already bridged.\n`
  );
  if (!r.predictions.length) {
    out('  no empty regime-pair has a shared-neighbour basis — nothing to predict.');
  } else {
    out('  predicted missing bridges (by shared-neighbour count):');
    for (const p of r.predictions) {
      out(
        `    ${(short(p.regimeA) + ' ⟷ ' + short(p.regimeB)).padEnd(46)} ` +
          `score ${p.sharedNeighbors}  via {${p.via.map(short).join(', ')}}`
      );
    }
  }
  if (r.unexploredRegimes.length) {
    out(`\n  unexplored regimes adjacent to known ones (the tensor's empty neighbourhoods):`);
    out(`    ${r.unexploredRegimes.map(short).join(', ')}`);
  }
  out('\n  (regime coords come from quantity attributes; only regime-tagged edges are placed.)');
  return 0;
}

export const command: Command = {
  name: 'predict',
  aliases: ['predictions'],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
