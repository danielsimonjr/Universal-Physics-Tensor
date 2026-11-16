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

import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compareCodepoint } from '../../core/compare.js';
import { sha256Hex } from '../../core/hash.js';
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

/** The environment variable that names the vector cache directory. @internal */
export const VECTOR_CACHE_ENV = 'UPT_VECTOR_CACHE';

/**
 * The folder under the model cache root that holds the vector cache when the
 * caller names no other location. A leading dot is not a valid Hugging Face
 * organisation name, so the folder cannot collide with a model folder.
 * @internal
 */
export const VECTOR_CACHE_SUBDIR = '.upt-vectors';

/** The format of a vector file and of its key. Changing it makes every stored file a miss. */
const VECTOR_FORMAT = 1;

/** The first four bytes of a vector file. */
const VECTOR_MAGIC = 'UPTV';

/** The fixed part of a vector file: the magic, the row count and the width, as 32-bit integers. */
const VECTOR_HEADER_BYTES = 12;

/** The attempts of an atomic rename. Windows refuses a rename while another process reads the file. */
const RENAME_ATTEMPTS = 5;

/** The wait between two attempts of a rename. */
const RENAME_RETRY_MS = 50;

/** The error codes of a rename that another process may cause and that a later attempt can pass. */
const RETRYABLE_RENAME = new Set(['EPERM', 'EBUSY']);

/** The padding side that last-token pooling needs. The extractor is refused unless it pads on this side. */
const PADDING_SIDE = 'left';

/** The pooling and normalisation of every model call. The cache key reads this same object. */
const EMBED_OPTIONS = { pooling: 'last_token', normalize: true } as const;

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
  /** The library settings. `version` is the library release, when it reports one. */
  readonly env: { cacheDir?: string; version?: string };
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
  /**
   * Store the vectors of each batch in files. A repeat call with the same ordered batch
   * returns the stored vectors and loads no model. The default is off, so a harness or a
   * benchmark embeds every call. The stored vectors are the ones an earlier call returned.
   */
  readonly vectorCache?: boolean;
  /**
   * The vector cache directory. Defaults to the `UPT_VECTOR_CACHE` variable, then to
   * `.upt-vectors` under the model cache root. A named directory that is a file is an error.
   */
  readonly vectorCacheDir?: string;
  /** Receives one event per batch when the vector cache is on: a hit, a miss, or a write that failed. */
  readonly onCacheEvent?: (e: { kind: 'hit' | 'miss' | 'write-failed'; batch: number; detail?: string }) => void;
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

/** The vectors of one batch and their width. */
interface Embedded {
  readonly rows: number[][];
  readonly width: number;
}

/**
 * The one row check. A row is an array of `width` finite numbers. The model
 * reply and a cached row both pass this check.
 */
function isVectorRow(row: unknown, width: number): row is number[] {
  return (
    Array.isArray(row) &&
    width >= 1 &&
    row.length === width &&
    row.every((x) => typeof x === 'number' && Number.isFinite(x))
  );
}

/**
 * Checks the rows of one model reply: the row count, and one width for every
 * row. The width is `width` when the call fixed it, else the width of the first row.
 */
function checkedRows(rows: unknown, count: number, width: number | undefined): Embedded {
  if (!Array.isArray(rows) || rows.length !== count) throw new EmbeddingUnavailable('reply-not-a-vector');
  const fixed = width ?? (Array.isArray(rows[0]) ? rows[0].length : 0);
  for (const row of rows as unknown[]) {
    if (!isVectorRow(row, fixed)) throw new EmbeddingUnavailable('reply-not-a-vector');
  }
  return { rows: rows as number[][], width: fixed };
}

/** Embeds one batch in one model call, and checks the reply. */
async function embedBatch(extract: Extractor, batch: string[], width: number | undefined): Promise<Embedded> {
  const reply = await extract(batch, EMBED_OPTIONS);
  let rows: unknown;
  try {
    rows = reply.tolist();
  } catch {
    throw new EmbeddingUnavailable('reply-not-a-vector');
  }
  return checkedRows(rows, batch.length, width);
}

/**
 * Embeds the batches with the given indices, in order. The first batch fixes the
 * width when no width is known. A call that timed out starts no further batch.
 */
async function embedBatches(
  extract: Extractor,
  batches: readonly (readonly string[])[],
  indices: readonly number[],
  width: number | undefined,
  cancelled: () => boolean,
): Promise<Map<number, Embedded>> {
  const out = new Map<number, Embedded>();
  let fixed = width;
  for (const index of indices) {
    // A call that timed out is over. Do not start the next batch for it.
    if (cancelled()) throw new EmbeddingUnavailable('call-did-not-finish');
    const done = await embedBatch(extract, [...batches[index]!], fixed);
    fixed = done.width;
    out.set(index, done);
  }
  return out;
}

/** Splits the texts into batches of `ONNX_BATCH_SIZE`, in input order. */
function batchesOf(texts: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let start = 0; start < texts.length; start += ONNX_BATCH_SIZE) {
    out.push(texts.slice(start, start + ONNX_BATCH_SIZE));
  }
  return out;
}

/**
 * The SHA-256 key of one batch. It covers the ordered texts, the model, the dtype,
 * the pooling, the padding side and the model file stamp. It does not cover the
 * library version: a file records that version and a read checks it.
 */
function batchKey(modelId: string, dtype: OnnxDtype, stamp: readonly [number, number] | null, batch: readonly string[]): string {
  return sha256Hex(JSON.stringify([VECTOR_FORMAT, modelId, dtype, EMBED_OPTIONS, PADDING_SIDE, stamp, batch]));
}

/**
 * The size and modification time of the model file of the dtype. The stamp
 * changes when the file is replaced. It is null when the file cannot be read.
 */
function modelFileStamp(root: string, modelId: string, dtype: OnnxDtype): readonly [number, number] | null {
  try {
    const file = statSync(join(root, ...modelId.split('/'), 'onnx', `${STEM[dtype]}.onnx`));
    return [file.size, file.mtimeMs];
  } catch {
    return null;
  }
}

/**
 * Reads one stored batch. It returns the rows only when the file is whole and
 * matches: the magic, the row count, the width, the stored library version when
 * the call knows the version, and every value. Any other file is a miss, never an
 * error, so the caller re-embeds the batch and writes the file again.
 */
async function readBatch(
  path: string,
  count: number,
  width: number | undefined,
  version: string | undefined,
): Promise<Embedded | undefined> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    return undefined;
  }
  if (bytes.length < VECTOR_HEADER_BYTES || bytes.toString('latin1', 0, 4) !== VECTOR_MAGIC) return undefined;
  const rowCount = bytes.readUInt32LE(4);
  const cols = bytes.readUInt32LE(8);
  if (rowCount !== count || cols < 1 || (width !== undefined && cols !== width)) return undefined;
  let at = VECTOR_HEADER_BYTES;
  if (bytes.length < at + 4) return undefined;
  const versionLength = bytes.readUInt32LE(at);
  at += 4;
  if (bytes.length < at + versionLength) return undefined;
  const stored = bytes.toString('utf8', at, at + versionLength);
  at += versionLength;
  if (bytes.length !== at + rowCount * cols * 8) return undefined;
  if (version !== undefined && stored !== version) return undefined;
  const rows: number[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(bytes.readDoubleLE(at));
      at += 8;
    }
    if (!isVectorRow(row, cols)) return undefined;
    rows.push(row);
  }
  return { rows, width: cols };
}

/**
 * Renames a file over another one. A Windows rename can fail while a reader
 * holds the file, so a few attempts wait and try again.
 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (typeof code !== 'string' || !RETRYABLE_RENAME.has(code) || attempt >= RENAME_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, RENAME_RETRY_MS));
    }
  }
}

/**
 * Writes one batch with its library version. It writes a temporary file and
 * renames it over the key, so a reader sees a whole file or no file. It returns
 * the reason of a failure. A failure does not throw: the vectors are valid.
 */
async function writeBatch(dir: string, key: string, rows: number[][], width: number, version: string): Promise<string | undefined> {
  const versionBytes = Buffer.from(version, 'utf8');
  const body = Buffer.alloc(VECTOR_HEADER_BYTES + 4 + versionBytes.length + rows.length * width * 8);
  body.write(VECTOR_MAGIC, 0, 'latin1');
  body.writeUInt32LE(rows.length, 4);
  body.writeUInt32LE(width, 8);
  body.writeUInt32LE(versionBytes.length, VECTOR_HEADER_BYTES);
  versionBytes.copy(body, VECTOR_HEADER_BYTES + 4);
  let at = VECTOR_HEADER_BYTES + 4 + versionBytes.length;
  for (const row of rows) {
    for (const x of row) {
      body.writeDoubleLE(x, at);
      at += 8;
    }
  }
  const target = join(dir, `${key}.vec`);
  const temporary = `${target}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(temporary, body);
    await renameWithRetry(temporary, target);
    return undefined;
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    return messageOf(error);
  }
}

/** The directory the caller named, or undefined. The option wins over the variable. */
function resolveVectorDir(option: string | undefined): string | undefined {
  if (option !== undefined) return option;
  const fromEnv = process.env[VECTOR_CACHE_ENV];
  return fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : undefined;
}

/**
 * Makes sure a named cache directory exists. A path that is a file, or that cannot
 * be created, is a configuration error and not a miss.
 */
async function ensureVectorDir(dir: string): Promise<void> {
  const unusable = () => new EmbeddingUnavailable('session-failed', `vector cache directory unusable: ${dir}`);
  const existing = await stat(dir).catch(() => undefined);
  if (existing !== undefined && !existing.isDirectory()) throw unusable();
  await mkdir(dir, { recursive: true }).catch(() => {
    throw unusable();
  });
}

/** The vector cache of one call: its directory, the model file stamp, and the library version when known. */
interface OpenCache {
  readonly dir: string;
  readonly stamp: readonly [number, number] | null;
  readonly version: string | undefined;
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
  const fixedWidth = options.expectedDims ?? (modelId === ONNX_EMBEDDING_MODEL ? ONNX_VECTOR_DIMS : undefined);

  // The library loads once per embedder. A failed load is not kept, so the next call tries again.
  let library: Promise<TransformersLibrary> | undefined;
  const getLibrary = (): Promise<TransformersLibrary> => {
    library ??= loadLibraryOrRefuse(loadLibrary).catch((error: unknown) => {
      library = undefined;
      throw error;
    });
    return library;
  };
  // The vector cache reads the library version when it can. It never decides a miss, so a missing library is not an error here.
  const tryLibrary = async (): Promise<TransformersLibrary | undefined> => {
    try {
      return await getLibrary();
    } catch {
      return undefined;
    }
  };

  /** The cache of this call, or undefined when no location can be found. */
  const openVectorCache = async (): Promise<OpenCache | undefined> => {
    const named = resolveVectorDir(options.vectorCacheDir);
    let root = resolveCacheDir(options.cacheDir);
    let lib: TransformersLibrary | undefined;
    // The library is read when the root or the version is needed. A named location with a named root needs neither.
    if (root === undefined || named === undefined) lib = await tryLibrary();
    root ??= lib?.env.cacheDir;
    if (root === undefined) return undefined;
    if (named !== undefined) await ensureVectorDir(named);
    return {
      dir: named ?? join(root, VECTOR_CACHE_SUBDIR),
      stamp: modelFileStamp(root, modelId, dtype),
      version: lib?.env.version,
    };
  };

  const loadExtractor = async (): Promise<Extractor> => {
    const lib = await getLibrary();
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
    const batches = batchesOf(texts);
    const caching = options.vectorCache === true;
    const cache = caching ? await openVectorCache() : undefined;
    const emit = (kind: 'hit' | 'miss' | 'write-failed', batch: number, detail?: string): void => {
      options.onCacheEvent?.(detail === undefined ? { kind, batch } : { kind, batch, detail });
    };

    // Read every stored batch. Without a fixed width, the first hit sets it, and a hit of another width is a miss.
    const keys = cache === undefined ? [] : batches.map((batch) => batchKey(modelId, dtype, cache.stamp, batch));
    const found: (Embedded | undefined)[] = [];
    for (let i = 0; i < batches.length; i++) {
      const path = cache === undefined ? undefined : join(cache.dir, `${keys[i]!}.vec`);
      found.push(
        path === undefined || cache === undefined
          ? undefined
          : await readBatch(path, batches[i]!.length, fixedWidth, cache.version),
      );
    }
    const width = fixedWidth ?? found.find((f) => f !== undefined)?.width;
    for (let i = 0; i < found.length; i++) {
      if (found[i] !== undefined && found[i]!.width !== width) found[i] = undefined;
    }
    if (caching) {
      batches.forEach((_, i) => {
        if (found[i] !== undefined) emit('hit', i);
        else emit('miss', i, cache === undefined ? 'no cache location' : undefined);
      });
    }

    // Embed only the missed batches. The allowance counts only their texts.
    const missing = batches.flatMap((_, i) => (found[i] === undefined ? [i] : []));
    if (missing.length > 0) {
      const extract = await getExtractor();
      const missedTexts = missing.reduce((n, i) => n + batches[i]!.length, 0);
      let timedOut = false;
      let fresh: Map<number, Embedded> = new Map();
      try {
        fresh = await within(
          embedBatches(extract, batches, missing, width, () => timedOut),
          missedTexts * perTextMs,
        );
      } catch (error) {
        timedOut = true;
        if (error instanceof EmbeddingUnavailable) throw error;
        throw new EmbeddingUnavailable('session-failed', messageOf(error));
      }
      // The writes come after the budget. A failed write is an event, not an error.
      const version = cache === undefined ? '' : ((await getLibrary()).env.version ?? '');
      for (const [i, got] of fresh) {
        found[i] = got;
        if (cache === undefined) continue;
        const detail = await writeBatch(cache.dir, keys[i]!, got.rows, got.width, version);
        if (detail !== undefined) emit('write-failed', i, detail);
      }
    }
    return found.flatMap((f) => f!.rows);
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
 * stops at the first file the host cannot give. The list call carries the `dtype`
 * of the load. The probes carry no options. Both read `env.cacheDir`, as the load does.
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
 * The fetch probes each missing file first. When the JSON files are cached, a
 * missing file the host cannot give is `model-not-cached`, and the library does not
 * load. Without the JSON files, the list call needs the host, and its failure is
 * `session-failed`. A network failure that
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
