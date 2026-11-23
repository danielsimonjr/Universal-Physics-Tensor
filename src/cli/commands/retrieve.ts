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
import { statSync } from 'node:fs';
import type { ExprNode } from '../../dimensional/ast-types.js';
import type { Dimension } from '../../dimensional/types.js';
import { isAbsolute, relative, resolve } from 'node:path';
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { CliError, UsageError } from '../errors.js';
import { emitJson } from '../output.js';
import { mapFileError } from '../file-errors.js';
import { repoRoot } from '../stored-results.js';

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

/**
 * The environment variable that names the ONNX vector cache directory. It is the
 * embedder's own name; a test binds the two.
 */
const VECTOR_CACHE_ENV = 'UPT_VECTOR_CACHE';

/** How many accepted ids the text output prints. `--json` keeps the full ranked list. */
const TEXT_ACCEPTED_LIMIT = 10;

/** An `--expr` value that starts with this prefix names a file relative to the package root. */
const PACKAGE_PREFIX = 'package:';

/** The expression file the help example reads. It ships in `data/`. */
const EXAMPLE_EXPR = `${PACKAGE_PREFIX}data/examples/retrieve-mass-energy.json`;

/** The backends `--embed-backend` accepts. */
const BACKENDS: readonly string[] = ['onnx', 'ollama'];

function isDtype(value: string): value is EmbedDtype {
  return (ONNX_DTYPES as readonly string[]).includes(value);
}

const FLAGS: FlagSpec[] = [
  JSON_FLAG,
  {
    name: '--expr',
    valueStyle: 'attached',
    description:
      `An ExprNode JSON file (the format of \`upt probe\`). A value that starts with ${PACKAGE_PREFIX} names a file relative to the package root. The atlas search ranks the corpus by its structure. A text claim has no expression, so without this flag nothing is accepted.`,
  },
  {
    name: '--formula',
    valueStyle: 'either',
    description:
      'A formula text, for example "E - m*c^2". The atlas search ranks the corpus by its structure. Every symbol needs a --dim. It is used instead of --expr.',
  },
  {
    name: '--dim',
    valueStyle: 'attached',
    repeatable: true,
    description:
      'name:dimension of one --formula symbol, for example --dim=m:mass. A registered constant is declared as itself, for example --dim=c:c. Needs --formula.',
  },
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
  {
    name: '--no-vector-cache',
    valueStyle: 'none',
    description: 'Do not read or write the ONNX vector cache. Every batch is embedded again. Used only with --embed and the onnx backend.',
  },
];

const HELP = `upt retrieve <claim> [--expr=FILE | --formula=TEXT --dim=name:dimension ...] [--embed] [--embed-backend=onnx|ollama] [--embed-dtype=q8|fp16|fp32]
        [--embed-model=NAME] [--ollama-url=URL] [--no-vector-cache]
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
        process, in batches of 8, which takes about a minute of CPU with fp16.
        The onnx backend stores the vectors of each batch in a vector cache
        (${VECTOR_CACHE_ENV}, else .upt-vectors in the model cache). A batch whose
        ordered texts, model, dtype and model file are unchanged is read from the
        cache, so a repeat run returns the stored vectors and is not a new
        measurement. An inserted or removed record changes its batch and every
        later batch. A changed record changes only its batch. --no-vector-cache embeds every batch again. The ollama
        backend is not cached. ollama asks a local
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
        no expression, so without --expr the atlas search accepts nothing: it ranks
        by structure, and a text claim has none to rank. The command does not invent
        one. --embed still proposes an order.
        --expr=FILE gives the search an expression: an ExprNode JSON file, the format
        of \`upt probe\`, with a dimension on each symbol. The search ranks every
        corpus record by structure. The text output prints the first ${TEXT_ACCEPTED_LIMIT}; --json
        keeps the full list. The claim words may be empty when --expr is given.
        --formula=TEXT gives the search an expression from text. Each symbol takes the
        dimension of its --dim=name:dimension. A registered constant (c, G, F, h) is
        declared too, as itself (--dim=c:c) or as another dimension (--dim=F:force). A
        name with no --dim is refused. --formula and --expr are exclusive.
        A FILE that starts with ${PACKAGE_PREFIX} is relative to the package root, so the
        example works from any directory.
        e.g.  upt retrieve rest energy --expr=${EXAMPLE_EXPR}
              upt retrieve rest energy --formula="E - m*c^2" --dim=E:energy --dim=m:mass --dim=c:c
              upt retrieve period of a pendulum
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

/**
 * Refuses a vector cache location that exists and is not a directory. The embedder
 * refuses the location too, but the search would print the refusal as a fallback. A wrong setting is exit 1.
 */
function refuseFileAsCacheDir(): void {
  const dir = process.env[VECTOR_CACHE_ENV];
  if (dir === undefined || dir.length === 0) return;
  let isDirectory = true;
  try {
    isDirectory = statSync(dir).isDirectory();
  } catch {
    return; // A missing directory is created on the first write.
  }
  if (!isDirectory) {
    throw new CliError(`upt retrieve: ${VECTOR_CACHE_ENV} names a file, not a directory: ${dir}. hint: unset it or pass --no-vector-cache`);
  }
}

/**
 * Resolves a `package:` value to a file inside the package root. The prefix names a file the
 * package ships, so a value that resolves to the root itself, above it, or on another drive is
 * refused as a usage error: a path outside the package belongs in the plain FILE form.
 */
function packageFile(value: string): string {
  const root = repoRoot();
  const path = resolve(root, value.slice(PACKAGE_PREFIX.length));
  const inside = relative(root, path);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    throw new UsageError(`upt retrieve: --expr=${value} does not name a file inside the package root`);
  }
  return path;
}

/**
 * Reads the `--expr` file. A value that starts with `package:` is relative to the package root.
 * A file that cannot be read or is not an ExprNode is exit 1 and names the file.
 */
function loadExpr(api: CommandCtx['api'], value: string): ReturnType<CommandCtx['api']['parseExprJson']> {
  const path = value.startsWith(PACKAGE_PREFIX) ? packageFile(value) : value;
  try {
    return api.parseExprJson(path);
  } catch (e) {
    mapFileError(api, e, 'retrieve', path, 'an expression file');
  }
}

/** The tree of a `--formula` text, each symbol bound to its `--dim`. A refusal is a usage error. */
function parseFormulaQuery(api: CommandCtx['api'], formula: string, dimFlags: readonly string[]): ExprNode {
  try {
    if (formula.trim().length === 0) throw new Error('--formula is empty: give a formula text, e.g. --formula="E - m*c^2"');
    const declared = new Map<string, Dimension>();
    for (const spec of dimFlags) {
      const colon = spec.indexOf(':');
      if (colon < 1) throw new Error(`--dim=${spec} must be name:dimension (e.g. --dim=m:mass)`);
      const name = spec.slice(0, colon);
      const dim = api.parseDimensionSpec(spec.slice(colon + 1));
      const prior = declared.get(name);
      if (prior !== undefined && JSON.stringify(prior) !== JSON.stringify(dim)) {
        throw new Error(`'${name}' is declared twice with two dimensions: give one --dim=${name}:dimension`);
      }
      declared.set(name, dim);
    }
    return api.parseDeclaredExpression(formula, declared);
  } catch (e) {
    throw new UsageError(`upt retrieve: ${(e as Error).message} (declare each symbol with --dim=name:dimension)`);
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
  const exprPath = args.flags.get('expr')?.[0];
  if (claim.length === 0 && exprPath === undefined && !args.flags.has('formula')) {
    throw new UsageError('upt retrieve: give a claim, --expr=FILE or --formula=TEXT, e.g. `upt retrieve period of a pendulum`');
  }
  const formula = args.flags.get('formula')?.[0];
  const dimFlags = args.flags.get('dim') ?? [];
  if (formula !== undefined && exprPath !== undefined) {
    throw new UsageError('upt retrieve: --formula and --expr are two expression sources; give one');
  }
  if (formula === undefined && dimFlags.length > 0) {
    throw new UsageError('upt retrieve: --dim needs --formula, e.g. `--formula="E - m*c^2" --dim=E:energy --dim=m:mass --dim=c:c`');
  }
  const expr =
    formula !== undefined ? parseFormulaQuery(api, formula, dimFlags) : exprPath === undefined ? undefined : loadExpr(api, exprPath);
  const embed = args.flags.has('embed');
  const embedModel = modelFlag ?? (backend === 'ollama' ? OLLAMA_DEFAULT_MODEL : ONNX_DEFAULT_MODEL);
  const vectorCache = embed && backend === 'onnx' && !args.flags.has('no-vector-cache');
  if (vectorCache) refuseFileAsCacheDir();
  // One note per run: a full or read-only cache fails every batch the same way.
  let writeNoted = false;
  const embedder = !embed
    ? undefined
    : backend === 'ollama'
      ? api.ollamaEmbedder({ baseUrl: ollamaUrl, model: embedModel })
      : api.onnxEmbedder({
          modelId: embedModel,
          dtype,
          vectorCache,
          onCacheEvent: (event) => {
            if (event.kind !== 'write-failed' || writeNoted) return;
            writeNoted = true;
            ctx.err(`upt retrieve: vector cache not written: ${event.detail ?? 'unknown reason'}`);
          },
        });
  const corpus = api.canonicalRetrievalCorpus();
  const result = await api.retrieveHybrid({
    query: expr === undefined ? { text: claim } : { text: claim, expr },
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
  if (result.accepted.length === 0) {
    out('  accepted (atlas search):');
    out('    none — the claim has no expression to rank by structure');
  } else {
    const shown = Math.min(TEXT_ACCEPTED_LIMIT, result.accepted.length);
    out(`  ranked by structure (atlas search), top ${shown} of ${result.accepted.length}:`);
    for (const id of result.accepted.slice(0, TEXT_ACCEPTED_LIMIT)) out(`    ${id}`);
    if (result.accepted.length > TEXT_ACCEPTED_LIMIT) out(`    --json lists all ${result.accepted.length}`);
  }
  return 0;
}

export const command: Command = {
  name: 'retrieve',
  aliases: [],
  positionals: { max: Infinity },
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary:
    'Search the atlas for a claim. --expr=FILE or --formula=TEXT with --dim ranks the corpus by an expression. --embed asks an embedding model (ONNX in process, or Ollama) and does not accept that order. --fetch-model downloads the ONNX model.',
  example: `upt retrieve rest energy --expr=${EXAMPLE_EXPR}`,
  group: 'data',
  run,
};
registerCommand(command);
