/**
 * `upt retrieve <claim>` — optional embedding proposals, atlas acceptance.
 *
 * The default does not call out of process. `--embed` embeds the claim and every
 * corpus record. The default backend is ONNX, which runs in process through the
 * optional `@huggingface/transformers` library. `--embed-backend=ollama` asks a
 * local Ollama server instead. `--fetch-model` downloads the ONNX model. The
 * embedding order is a proposal. `rankByStructure` is what is accepted. If the
 * embedder cannot be used, the atlas search is still the answer and the output
 * names the reason. That is exit 0.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { CliError, UsageError } from '../errors.js';
import { emitJson } from '../output.js';

/** Where `--embed` looks for Ollama when `--ollama-url` is not given. */
const OLLAMA_DEFAULT_URL = 'http://127.0.0.1:11434';

/**
 * The Ollama model `--embed` asks for with `--embed-backend=ollama` when
 * `--embed-model` is not given. It is the same model as the ONNX default; a test binds the two.
 */
const OLLAMA_DEFAULT_MODEL = 'qwen3-embedding:0.6b';

/**
 * The Hugging Face model `--embed` asks for when `--embed-model` is not given.
 * It is the embedder's own default; a test binds the two.
 */
const ONNX_DEFAULT_MODEL = 'onnx-community/Qwen3-Embedding-0.6B-ONNX';

/** The weight precisions the ONNX backend accepts. The default is fp16. */
const ONNX_DTYPES = ['q8', 'fp16', 'fp32'] as const;
type EmbedDtype = (typeof ONNX_DTYPES)[number];
const ONNX_DEFAULT_DTYPE: EmbedDtype = 'fp16';

/** The backends `--embed-backend` accepts. */
const BACKENDS: readonly string[] = ['onnx', 'ollama'];

function isDtype(value: string): value is EmbedDtype {
  return (ONNX_DTYPES as readonly string[]).includes(value);
}

const FLAGS: FlagSpec[] = [
  JSON_FLAG,
  {
    name: '--embed',
    valueStyle: 'none',
    description:
      'Embed the claim and every corpus record with the chosen backend. Acceptance stays the atlas search. A failure of the embedder still prints that search and exits 0.',
  },
  {
    name: '--embed-backend',
    valueStyle: 'attached',
    description: 'Embedding backend: onnx (in process) or ollama (a local server). Used only with --embed.',
    defaultValue: 'onnx',
  },
  {
    name: '--embed-dtype',
    valueStyle: 'attached',
    description: 'ONNX weight precision: q8, fp16 or fp32. Used only with the onnx backend or --fetch-model.',
    defaultValue: ONNX_DEFAULT_DTYPE,
  },
  {
    name: '--embed-model',
    valueStyle: 'attached',
    description:
      'Embedding model. For the onnx backend, a Hugging Face model id. For the ollama backend, an Ollama tag. Used with --embed or --fetch-model.',
    defaultValue: ONNX_DEFAULT_MODEL,
  },
  {
    name: '--ollama-url',
    valueStyle: 'attached',
    description: 'Ollama base URL. Used only with --embed and the ollama backend. Naming it selects the ollama backend when --embed-backend is not given.',
    defaultValue: OLLAMA_DEFAULT_URL,
  },
  {
    name: '--fetch-model',
    valueStyle: 'none',
    description: 'Download the ONNX model to the local cache and print each ONNX weight file with its size and SHA-256. The claim is not needed. With --json, print the same report as JSON.',
  },
];

const HELP = `upt retrieve <claim> [--embed] [--embed-backend=onnx|ollama] [--embed-dtype=q8|fp16|fp32]
        [--embed-model=NAME] [--ollama-url=URL]
        upt retrieve --fetch-model [--embed-dtype=q8|fp16|fp32] [--embed-model=NAME]
        Propose canonical relations for a claim. The default is the atlas
        search (typed structural ranking) and does not call out of process. The output
        says so. --embed asks an embedding model for an order. The order is a
        proposal, not evidence. Acceptance stays the atlas search, and cosine
        similarity does not enter its score.
        Backends: onnx (the default) runs the model in process through the optional
        @huggingface/transformers library, at the precision of --embed-dtype
        (default fp16). A q8 vector changes with the batch that holds the text, so a
        q8 order depends on the corpus size. One --embed embeds the query plus every corpus record in
        process, which takes about a minute of CPU with fp16. ollama asks a local
        Ollama server for ${OLLAMA_DEFAULT_MODEL} (--ollama-url, default ${OLLAMA_DEFAULT_URL}).
        If the embedder cannot be used, the same atlas search is printed and the
        reason is named: the embedding library is not installed,
        the model is not in the local cache (the download is not allowed or failed),
        the ONNX session did not load, the process is not there, the model is not there, the server
        answered an error status, the reply is not a vector or its length is not
        the length expected for the model, or the call does not finish. A fallback
        exits 0.
        --fetch-model downloads the ONNX model to the cache and prints each ONNX
        weight file with its size and SHA-256 (as JSON with --json).
        A missing library exits 1 and prints the install hint.
        --embed-model is used with --embed or --fetch-model. A claim is text. It has
        no expression, so the atlas search accepts nothing: it ranks by structure,
        and a text claim has none to rank. The command does not invent one. --embed
        still proposes an order.
        e.g.  upt retrieve period of a pendulum
              upt retrieve period of a pendulum --embed
              upt retrieve --fetch-model`;

const EPISTEMICS =
  'An embedding order is a proposal, not evidence. Acceptance is the atlas search. Cosine similarity does not enter that score.';

/** Downloads the ONNX model and prints its files. A missing library is exit 1 with the install hint. */
async function fetchModel(
  ctx: CommandCtx,
  modelId: string,
  dtype: EmbedDtype,
): Promise<number> {
  const { out, api } = ctx;
  try {
    const report = await api.fetchOnnxModel({ modelId, dtype });
    if (ctx.args.flags.has('json')) {
      emitJson({ command: 'retrieve', options: { fetchModel: true }, result: report }, ctx.write);
      return 0;
    }
    out(`upt retrieve --fetch-model: ${report.modelId}`);
    out(`  dtype ${report.dtype}`);
    out(`  cache dir ${report.cacheDir}`);
    for (const file of report.files) out(`  ${file.path}  ${file.bytes} bytes  sha256 ${file.sha256}`);
    return 0;
  } catch (error) {
    if (error instanceof api.EmbeddingUnavailable) {
      const hint = error.reason === 'library-not-installed' ? '. hint: npm i @huggingface/transformers' : '';
      throw new CliError(`upt retrieve --fetch-model: ${error.message}${hint}`);
    }
    throw error;
  }
}

async function run(ctx: CommandCtx): Promise<number> {
  const { args, out, api } = ctx;
  const backendFlag = args.flags.get('embed-backend')?.[0];
  if (backendFlag !== undefined && !BACKENDS.includes(backendFlag)) {
    throw new UsageError(`upt retrieve: --embed-backend must be onnx or ollama, got '${backendFlag}'`);
  }
  const dtypeFlag = args.flags.get('embed-dtype')?.[0];
  if (dtypeFlag !== undefined && !isDtype(dtypeFlag)) {
    throw new UsageError(`upt retrieve: --embed-dtype must be q8, fp16 or fp32, got '${dtypeFlag}'`);
  }
  const dtype: EmbedDtype = dtypeFlag !== undefined && isDtype(dtypeFlag) ? dtypeFlag : ONNX_DEFAULT_DTYPE;
  // Naming --ollama-url with no backend selects the ollama backend. Otherwise the backend is onnx.
  const ollamaUrlFlag = args.flags.get('ollama-url')?.[0];
  const backend = backendFlag ?? (ollamaUrlFlag !== undefined ? 'ollama' : 'onnx');
  const ollamaUrl = ollamaUrlFlag ?? OLLAMA_DEFAULT_URL;
  const modelFlag = args.flags.get('embed-model')?.[0]?.trim();
  if (modelFlag !== undefined && modelFlag.length === 0) {
    throw new UsageError('upt retrieve: --embed-model needs a model name, e.g. `--embed-model=qwen3-embedding:0.6b`');
  }
  if (args.flags.has('fetch-model')) {
    return fetchModel(ctx, modelFlag ?? ONNX_DEFAULT_MODEL, dtype);
  }
  const claim = args.positionals.join(' ').trim();
  if (claim.length === 0) {
    throw new UsageError('upt retrieve: give a claim, e.g. `upt retrieve period of a pendulum`');
  }
  const embed = args.flags.has('embed');
  const embedModel = modelFlag ?? (backend === 'ollama' ? OLLAMA_DEFAULT_MODEL : ONNX_DEFAULT_MODEL);
  const embedder = !embed
    ? undefined
    : backend === 'ollama'
      ? api.ollamaEmbedder({ baseUrl: ollamaUrl, model: embedModel })
      : api.onnxEmbedder({ modelId: embedModel, dtype });
  const corpus = api.canonicalRetrievalCorpus();
  const result = await api.retrieveHybrid({
    query: { text: claim },
    corpus,
    embeddings: embed,
    embedder,
  });
  if (args.flags.has('json')) {
    emitJson(
      {
        command: 'retrieve',
        epistemics: EPISTEMICS,
        options: {
          embed,
          backend: embed ? backend : null,
          ollamaUrl: embed && backend === 'ollama' ? ollamaUrl : null,
          embedModel: embed ? embedModel : null,
          embedDtype: embed && backend === 'onnx' ? dtype : null,
        },
        result,
      },
      ctx.write,
    );
    return 0;
  }
  out(`upt retrieve — ${result.embeddings === 'used' ? 'embedding proposal and atlas search' : 'atlas search'}`);
  out(result.note);
  if (result.fallback !== null) {
    out(
      backend === 'ollama'
        ? `  fallback reason: ${result.fallback} (Ollama at ${ollamaUrl}), model ${embedModel}`
        : `  fallback reason: ${result.fallback} (onnx), model ${embedModel}, dtype ${dtype}`,
    );
  }
  if (result.proposals !== null) {
    out('  proposed (cosine, not accepted):');
    for (const id of result.proposals) out(`    ${id}`);
  }
  out('  accepted (atlas search):');
  if (result.accepted.length === 0) out('    none — the claim has no expression to rank by structure');
  for (const id of result.accepted) out(`    ${id}`);
  return 0;
}

export const command: Command = {
  name: 'retrieve',
  aliases: [],
  positionals: { max: Infinity },
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary:
    'Search the atlas for a claim. --embed asks an embedding model (ONNX in process, or Ollama) and does not accept that order. --fetch-model downloads the ONNX model.',
  example: 'upt retrieve period of a pendulum',
  group: 'data',
  run,
};
registerCommand(command);
