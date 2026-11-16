/**
 * The in-process ONNX embedder. It runs the default Qwen3 embedding model
 * through the `@huggingface/transformers` library. The library is an optional
 * peer dependency. This module loads it by dynamic import only when a caller
 * asks for an embedding, so the package works without it.
 *
 * Every failure is an `EmbeddingUnavailable` with a named reason. The atlas
 * search still answers when an embedding fails.
 *
 * @module atlas/benchmark/onnx-embedder
 * @internal
 */

import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compareCodepoint } from '../../core/compare.js';
import { EmbeddingUnavailable, type Embedder } from './hybrid-retrieval.js';

/** The Hugging Face model id of the default embedding model. @internal */
export const ONNX_EMBEDDING_MODEL = 'onnx-community/Qwen3-Embedding-0.6B-ONNX';

/** The weight precisions the model ships. @internal */
export const ONNX_DTYPES = ['q8', 'fp16', 'fp32'] as const;

/** One of `ONNX_DTYPES`. @internal */
export type OnnxDtype = (typeof ONNX_DTYPES)[number];

/** The precision used when the caller does not name one. @internal */
export const ONNX_DEFAULT_DTYPE: OnnxDtype = 'fp16';

/** The width of each vector of the default model. @internal */
export const ONNX_VECTOR_DIMS = 1024;

/** The number of texts sent to the model in one call. @internal */
export const ONNX_BATCH_SIZE = 8;

/** The environment variable that names the model cache directory. @internal */
export const ONNX_CACHE_ENV = 'UPT_MODEL_CACHE';

/**
 * How long a model load may run before it counts as not finishing. The
 * measured fp16 cold load on the EVO-X2 is 5.35 s. The allowance is about 5 times that.
 * @internal
 */
export const ONNX_LOAD_TIMEOUT_MS = 30_000;

/**
 * How long one text may take before the call counts as not finishing. The
 * measured fp16 per-text p95 is 962 ms at batch 1 and 847 ms at batch 8 on the
 * EVO-X2. The allowance is about 2 times that.
 * @internal
 */
export const ONNX_PER_TEXT_TIMEOUT_MS = 2_000;

/** The part of the `@huggingface/transformers` module that this file uses. @internal */
export interface TransformersLibrary {
  readonly env: { cacheDir?: string };
  pipeline(task: string, model: string, options: Record<string, unknown>): Promise<unknown>;
  /**
   * The library's model registry. It names the cached files and asks the host
   * about a file that is not cached. The fetch needs it. A library without it is
   * refused, because the fetch cannot check the files before the load.
   */
  readonly ModelRegistry?: {
    is_pipeline_cached_files(
      task: string,
      model: string,
      options: Record<string, unknown>,
    ): Promise<{ readonly files: readonly { readonly file: string; readonly cached: boolean }[] }>;
    get_file_metadata(model: string, file: string, options?: Record<string, unknown>): Promise<{ readonly exists: boolean }>;
  };
}

/** A loaded feature-extraction pipeline. Its tokenizer pads on the left. */
type Extractor = ((texts: string[], opts: Record<string, unknown>) => Promise<{ tolist(): unknown }>) & {
  readonly tokenizer?: { readonly padding_side?: string };
};

/** The module specifier. It is a variable so the compiler does not resolve the optional peer. */
const SPECIFIER = '@huggingface/transformers';

/**
 * The messages of a load that found no model file in the cache. The library
 * says "was not found locally" for a miss with `local_files_only`. Its other
 * message that names `local_files_only` is a configuration error, not a miss.
 */
const CACHE_MISS = /Could not locate file|was not found locally|ENOENT/;

/** The file stem of each dtype, as the model repository names it. */
const STEM: Readonly<Record<OnnxDtype, string>> = {
  q8: 'model_quantized',
  fp16: 'model_fp16',
  fp32: 'model',
};

/** Options of the ONNX embedder and of the model fetch. Every field is optional. @internal */
export interface OnnxEmbedderOptions {
  /** The Hugging Face model id. Defaults to `ONNX_EMBEDDING_MODEL`. */
  readonly modelId?: string;
  /** The weight precision. Defaults to `ONNX_DEFAULT_DTYPE`. */
  readonly dtype?: OnnxDtype;
  /** The cache directory. Defaults to the `UPT_MODEL_CACHE` variable, then to the library setting. */
  readonly cacheDir?: string;
  /** The vector length to require for every row of a reply. */
  readonly expectedDims?: number;
  /** The time allowed for a model load. Defaults to `ONNX_LOAD_TIMEOUT_MS`. */
  readonly loadTimeoutMs?: number;
  /** The time allowed for each text. Defaults to `ONNX_PER_TEXT_TIMEOUT_MS`. */
  readonly perTextTimeoutMs?: number;
  /**
   * Check the cache files before the load. The default is on for the real library and off
   * for an injected one.
   */
  readonly checkCache?: boolean;
  /** Loads the library. Defaults to a dynamic import of the optional peer. */
  readonly loadLibrary?: () => Promise<TransformersLibrary>;
}

/** One model file, with its size and hash. @internal */
export interface OnnxModelFile {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

/** The result of `fetchOnnxModel`: what was used and what is on disk. @internal */
export interface OnnxModelReport {
  readonly modelId: string;
  readonly dtype: OnnxDtype;
  readonly cacheDir: string;
  readonly files: readonly OnnxModelFile[];
}

/** The default loader: a dynamic import of the optional peer. @internal */
async function defaultLoadLibrary(): Promise<TransformersLibrary> {
  return (await import(SPECIFIER)) as unknown as TransformersLibrary;
}

/** The error codes of an import that found no module. */
const MODULE_NOT_FOUND = new Set(['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND']);

/**
 * Loads the library. A missing module is `library-not-installed`. An installed
 * library that fails for another reason (for example a native binding that
 * does not load) has a different error code and is `session-failed`.
 */
async function loadLibraryOrRefuse(loadLibrary: () => Promise<TransformersLibrary>): Promise<TransformersLibrary> {
  try {
    return await loadLibrary();
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (typeof code === 'string' && !MODULE_NOT_FOUND.has(code)) {
      throw new EmbeddingUnavailable('session-failed', messageOf(error));
    }
    throw new EmbeddingUnavailable('library-not-installed');
  }
}

/** The files of the model that a cache must hold before the library may load it. */
function requiredCacheFiles(modelId: string, dtype: OnnxDtype): readonly string[] {
  return ['config.json', 'tokenizer.json', 'tokenizer_config.json', `onnx/${STEM[dtype]}.onnx`].map((name) =>
    join(...modelId.split('/'), ...name.split('/')),
  );
}

/** The cache directory the caller named, the environment variable, or none. Read at call time. */
function resolveCacheDir(option: string | undefined): string | undefined {
  if (option !== undefined) return option;
  const fromEnv = process.env[ONNX_CACHE_ENV];
  return fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : undefined;
}

/** The message of a thrown value, for matching. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Rejects with `call-did-not-finish` when the work takes longer than `ms`. The timer is cleared at once. */
async function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new EmbeddingUnavailable('call-did-not-finish')), ms);
  });
  try {
    return await Promise.race([work, limit]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Embeds every text in batches. It checks each row: the row count, the finite
 * numbers, and one width for every row.
 */
async function embedAll(
  extract: Extractor,
  texts: readonly string[],
  modelId: string,
  expectedDims: number | undefined,
  cancelled: () => boolean,
): Promise<number[][]> {
  const vectors: number[][] = [];
  let width: number | undefined = expectedDims ?? (modelId === ONNX_EMBEDDING_MODEL ? ONNX_VECTOR_DIMS : undefined);
  for (let start = 0; start < texts.length; start += ONNX_BATCH_SIZE) {
    // A call that timed out is over. Do not start the next batch for it.
    if (cancelled()) throw new EmbeddingUnavailable('call-did-not-finish');
    const batch = texts.slice(start, start + ONNX_BATCH_SIZE);
    const reply = await extract(batch, { pooling: 'last_token', normalize: true });
    let rows: unknown;
    try {
      rows = reply.tolist();
    } catch {
      throw new EmbeddingUnavailable('reply-not-a-vector');
    }
    if (!Array.isArray(rows) || rows.length !== batch.length) throw new EmbeddingUnavailable('reply-not-a-vector');
    for (const row of rows as unknown[]) {
      if (!Array.isArray(row)) throw new EmbeddingUnavailable('reply-not-a-vector');
      width ??= row.length;
      if (width < 1 || row.length !== width || row.some((x) => typeof x !== 'number' || !Number.isFinite(x))) {
        throw new EmbeddingUnavailable('reply-not-a-vector');
      }
      vectors.push(row as number[]);
    }
  }
  return vectors;
}

/**
 * An in-process ONNX embedder. The model loads on the first call and stays
 * loaded. A failed load is not kept, so the next call tries again. The
 * embedder adds no prefix: the caller passes the query form it wants.
 * @internal
 */
export function onnxEmbedder(options: OnnxEmbedderOptions = {}): Embedder {
  const modelId = options.modelId ?? ONNX_EMBEDDING_MODEL;
  const dtype = options.dtype ?? ONNX_DEFAULT_DTYPE;
  const loadMs = options.loadTimeoutMs ?? ONNX_LOAD_TIMEOUT_MS;
  const perTextMs = options.perTextTimeoutMs ?? ONNX_PER_TEXT_TIMEOUT_MS;
  const loadLibrary = options.loadLibrary ?? defaultLoadLibrary;

  const loadExtractor = async (): Promise<Extractor> => {
    const lib = await loadLibraryOrRefuse(loadLibrary);
    const cacheDir = resolveCacheDir(options.cacheDir);
    if (cacheDir !== undefined) lib.env.cacheDir = cacheDir;
    // `env.cacheDir` is global to the process, and the library reads it for its tokenizer
    // lookup even when a call names `cache_dir`. So one process serves one cache directory.
    // The real library has two defects on a cache miss. One of its own file reads has no
    // handler, so that read rejects with nothing to catch it and Node ends the process.
    // It also asks the network for `tokenizer_config.json` and `config.json`, although the
    // call says `local_files_only`. Look for the files first. An injected library is not checked
    // unless `checkCache` is set.
    const root = cacheDir ?? lib.env.cacheDir;
    if ((options.checkCache ?? options.loadLibrary === undefined) && root !== undefined) {
      const missing = requiredCacheFiles(modelId, dtype).find((file) => !existsSync(join(root, file)));
      if (missing !== undefined) throw new EmbeddingUnavailable('model-not-cached', `no ${missing} in ${root}`);
    }
    let extractor: Extractor;
    try {
      extractor = (await lib.pipeline('feature-extraction', modelId, { dtype, local_files_only: true })) as Extractor;
    } catch (error) {
      throw new EmbeddingUnavailable(CACHE_MISS.test(messageOf(error)) ? 'model-not-cached' : 'session-failed');
    }
    // Last-token pooling reads the final position, so the padding must be on the left.
    if (extractor.tokenizer?.padding_side !== 'left') throw new EmbeddingUnavailable('session-failed');
    return extractor;
  };

  // The load itself is kept until it settles. A call that times out stops waiting,
  // and the next call waits for the same load. A failed load is not kept.
  let loading: Promise<Extractor> | undefined;
  const getExtractor = (): Promise<Extractor> => {
    loading ??= loadExtractor().catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
    return within(loading, loadMs);
  };

  return async (texts) => {
    if (texts.length === 0) return [];
    const extract = await getExtractor();
    let timedOut = false;
    try {
      return await within(
        embedAll(extract, texts, modelId, options.expectedDims, () => timedOut),
        texts.length * perTextMs,
      );
    } catch (error) {
      timedOut = true;
      if (error instanceof EmbeddingUnavailable) throw error;
      throw new EmbeddingUnavailable('session-failed', messageOf(error));
    }
  };
}

/** The SHA-256 and the byte size of one file, read in chunks. */
async function hashFile(path: string): Promise<{ bytes: number; sha256: string }> {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
    bytes += (chunk as Buffer).length;
  }
  return { bytes, sha256: hash.digest('hex') };
}

/**
 * Probes each model file that the cache lacks, in order, before the load. It
 * stops at the first file the host cannot give. The calls carry the options of the
 * load (`dtype` only), so the registry reads the same cache directory as the load:
 * `env.cacheDir`.
 */
async function probeMissingModelFiles(
  registry: NonNullable<TransformersLibrary['ModelRegistry']>,
  modelId: string,
  dtype: OnnxDtype,
): Promise<void> {
  const options: Record<string, unknown> = { dtype };
  const status = await registry
    .is_pipeline_cached_files('feature-extraction', modelId, options)
    .catch((error: unknown) => {
      throw new EmbeddingUnavailable('session-failed', messageOf(error));
    });
  for (const { file, cached } of status.files) {
    if (cached) continue;
    const metadata = await registry.get_file_metadata(modelId, file).catch((error: unknown) => {
      throw new EmbeddingUnavailable('model-not-cached', `cannot download ${file}: ${messageOf(error)}`);
    });
    if (!metadata.exists) throw new EmbeddingUnavailable('model-not-cached', `the host has no ${file}`);
  }
}

/**
 * Loads the model with downloads allowed, then reports each model file of the
 * dtype with its size and SHA-256. Any load failure is `session-failed`, and a
 * missing library is `library-not-installed`.
 *
 * The fetch probes each missing file first. A missing file the host cannot give
 * is `model-not-cached`, and the library does not load. A network failure that
 * starts after these probes can still be unhandled inside transformers.js 4.3.2
 * `getSession`.
 * @internal
 */
export async function fetchOnnxModel(options: OnnxEmbedderOptions = {}): Promise<OnnxModelReport> {
  const modelId = options.modelId ?? ONNX_EMBEDDING_MODEL;
  const dtype = options.dtype ?? ONNX_DEFAULT_DTYPE;
  const lib = await loadLibraryOrRefuse(options.loadLibrary ?? defaultLoadLibrary);
  const requested = resolveCacheDir(options.cacheDir);
  if (requested !== undefined) lib.env.cacheDir = requested;
  if (lib.ModelRegistry === undefined) {
    throw new EmbeddingUnavailable('session-failed', 'the library has no ModelRegistry: install @huggingface/transformers 4.3.2 or later');
  }
  await probeMissingModelFiles(lib.ModelRegistry, modelId, dtype);
  try {
    await lib.pipeline('feature-extraction', modelId, { dtype });
  } catch (error) {
    throw new EmbeddingUnavailable('session-failed', messageOf(error));
  }
  const cacheDir = requested ?? lib.env.cacheDir;
  if (cacheDir === undefined) {
    throw new EmbeddingUnavailable('model-not-cached', `no cache directory: set cacheDir or ${ONNX_CACHE_ENV}`);
  }
  const onnxDir = join(cacheDir, ...modelId.split('/'), 'onnx');
  const stem = STEM[dtype];
  let listed: string[];
  try {
    listed = readdirSync(onnxDir);
  } catch {
    throw new EmbeddingUnavailable('model-not-cached', `no directory ${onnxDir}`);
  }
  const names = listed
    .filter((name) => name === `${stem}.onnx` || name.startsWith(`${stem}.onnx_data`))
    .sort(compareCodepoint);
  if (names.length === 0) throw new EmbeddingUnavailable('model-not-cached', `no ${stem}.onnx in ${onnxDir}`);
  const files: OnnxModelFile[] = [];
  for (const name of names) {
    const path = join(onnxDir, name);
    files.push({ path, ...(await hashFile(path)) });
  }
  return { modelId, dtype, cacheDir, files };
}
