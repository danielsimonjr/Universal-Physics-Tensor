/**
 * `upt frontier` — the two lists from the frontier and null-result design.
 * Neither list is a verdict and neither list changes a score.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { emitJson } from '../output.js';

const FLAGS: FlagSpec[] = [{ name: '--json', valueStyle: 'none' }];

const HELP = `upt frontier [--json]
        Two lists, printed apart. Null results: records already examined
        that did not become an accepted connection, each with the reason
        the program already states. Frontier: connections the catalog does
        not contain, each with a reason the graph already computes and,
        when one is registered, the observation that would test it.
        An empty list is printed as empty. Neither list is a verdict and
        neither list changes a score. A missing observation stays missing.`;

const EPISTEMICS =
  'Two lists, not one score. A null result was examined and rejected. A frontier row is a connection the catalog does not contain. Neither changes a score.';

async function run(ctx: CommandCtx): Promise<number> {
  const account = ctx.api.catalogFrontierAccount();
  if (ctx.args.flags.has('json')) {
    emitJson(
      {
        command: 'frontier',
        epistemics: EPISTEMICS,
        result: { nullResults: account.nullResults, frontier: account.frontier },
      },
      ctx.write,
    );
    return 0;
  }
  ctx.out(ctx.api.formatFrontierAccount(account));
  return 0;
}

export const command: Command = { name: 'frontier', aliases: [], flags: FLAGS, help: HELP, run };
registerCommand(command);
