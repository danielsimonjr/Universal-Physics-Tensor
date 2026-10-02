/**
 * `upt retrieve <claim>` — optional embedding proposals, atlas acceptance.
 *
 * The default does not call out of process. `--embed` asks a local Ollama
 * model. The embedding order is a proposal. `rankByStructure` is what is
 * accepted. If Ollama cannot be used, the atlas search is still the answer
 * and the output names the reason. That is exit 0.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { UsageError } from '../errors.js';
import { emitJson } from '../output.js';
import {
  canonicalRetrievalCorpus,
  ollamaEmbedder,
  retrieveHybrid,
} from '../../atlas/benchmark/hybrid-retrieval.js';

const FLAGS: FlagSpec[] = [
  JSON_FLAG,
  {
    name: '--embed',
    valueStyle: 'none',
    description: 'Ask a local Ollama model for an order. Acceptance stays the atlas search. A failure of Ollama still prints that search and exits 0.',
  },
  {
    name: '--ollama-url',
    valueStyle: 'attached',
    description: 'Ollama base URL. Used only with --embed.',
    defaultValue: 'http://127.0.0.1:11434',
  },
];

const HELP = `upt retrieve <claim> [--embed] [--ollama-url=URL]
        Propose canonical relations for a claim. The default is the atlas
        search (rankByStructure) and does not call out of process. The output
        says so. --embed asks a local Ollama model, qwen3-embedding:4b, for
        an order. That order is a proposal, not evidence. Acceptance stays
        the atlas search, and cosine similarity does not enter its score.
        If Ollama cannot be used, the same atlas search is printed and the
        reason is named: the process is not there, the model is not there,
        the reply is not a vector or its length is not the length stored in
        the frozen file, or the call does not finish. A fallback exits 0.
        --ollama-url is used only with --embed (default http://127.0.0.1:11434).
        A claim is text. It has no expression, so the structural score is
        zero and the atlas order is by id. The command does not invent one.
        e.g.  upt retrieve period of a pendulum
              upt retrieve period of a pendulum --embed`;

const EPISTEMICS =
  'An embedding order is a proposal, not evidence. Acceptance is rankByStructure. Cosine similarity does not enter that score.';

async function run(ctx: CommandCtx): Promise<number> {
  const { args, out } = ctx;
  const claim = args.positionals.join(' ').trim();
  if (claim.length === 0) {
    throw new UsageError('upt retrieve: give a claim, e.g. `upt retrieve period of a pendulum`');
  }
  const embed = args.flags.has('embed');
  const corpus = canonicalRetrievalCorpus();
  const result = await retrieveHybrid({
    query: { text: claim },
    corpus,
    embeddings: embed,
    embedder: embed
      ? ollamaEmbedder({ baseUrl: args.flags.get('ollama-url')?.[0] ?? 'http://127.0.0.1:11434' })
      : undefined,
  });
  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'retrieve',
        epistemics: EPISTEMICS,
        options: { embed, ollamaUrl: embed ? (args.flags.get('ollama-url')?.[0] ?? 'http://127.0.0.1:11434') : null },
        result,
      },
      ctx.write,
    );
    return 0;
  }
  out(`upt retrieve — ${result.embeddings === 'used' ? 'embedding proposal and atlas search' : 'atlas search'}`);
  out(result.note);
  if (result.proposals !== null) {
    out('  proposed (cosine, not accepted):');
    for (const id of result.proposals) out(`    ${id}`);
  }
  out('  accepted (atlas search):');
  for (const id of result.accepted) out(`    ${id}`);
  return 0;
}

export const command: Command = {
  name: 'retrieve',
  aliases: [],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Search the atlas for a claim. --embed asks a local Ollama model and does not accept that order.',
  example: 'upt retrieve period of a pendulum',
  group: 'data',
  run,
};
registerCommand(command);
