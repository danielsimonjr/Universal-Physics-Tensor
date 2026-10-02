/**
 * `upt chain` names the chain orchestrator and does not run it.
 *
 * `docs/planning/Bridge-Discovery-Pipeline-Design.md` leaves the orchestrator
 * internal and adds no command that writes a chain. A chain stays provisional.
 * This command is the answer to the name: it does not call `runChainPipeline`,
 * it does not import that module, and it does not write the catalog.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command } from '../command.js';
import { commandHelp } from '../flag-help.js';

const FLAGS: FlagSpec[] = [];

const HELP = `upt chain
        Not a catalog command. The chain orchestrator stays internal.
        A chain is provisional: it is not written to the catalog, and it
        does not derive formally-proved. This command does not run the
        orchestrator. The design is
        docs/planning/Bridge-Discovery-Pipeline-Design.md.
        Exit 2.`;

const MESSAGE =
  'upt chain does not run the chain orchestrator. That function stays internal: ' +
  'a chain is provisional, it is not written to the catalog, and it does not ' +
  'derive formally-proved. The design is docs/planning/Bridge-Discovery-Pipeline-Design.md. ' +
  'A command that runs the pipeline is not part of this release.';

async function run(ctx: { err: (line?: string) => void }): Promise<number> {
  ctx.err(MESSAGE);
  return 2;
}

/** The `upt chain` command. It names the internal orchestrator, writes nothing, and exits 2. */
export const command: Command = {
  name: 'chain',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Name the internal chain orchestrator and exit 2. It does not run it.',
  example: 'upt chain',
  group: 'utilities',
  run,
};
registerCommand(command);
