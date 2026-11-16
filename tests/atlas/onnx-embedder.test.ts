/**
 * The in-process ONNX embedder. Every test injects a fake library, so no model loads
 * and no file downloads. The live test runs only when `UPT_ONNX_LIVE_CACHE` names a
 * cache that holds the default model.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EmbeddingUnavailable, queryInput } from '../../src/atlas/benchmark/hybrid-retrieval.js';
import {
  ONNX_BATCH_SIZE,
  ONNX_CACHE_ENV,
  ONNX_DEFAULT_DTYPE,
  ONNX_DTYPES,
  ONNX_EMBEDDING_MODEL,
  ONNX_LOAD_TIMEOUT_MS,
  ONNX_PER_TEXT_TIMEOUT_MS,
  ONNX_VECTOR_DIMS,
  fetchOnnxModel,
  onnxEmbedder,
  type TransformersLibrary,
} from '../../src/atlas/benchmark/onnx-embedder.js';

interface Call {
  readonly task: string;
  readonly model: string;
  readonly options: Record<string, unknown>;
}

interface Fake {
  readonly lib: TransformersLibrary;
  readonly loads: Call[];
  readonly batches: string[][];
  readonly embedOptions: Record<string, unknown>[];
}

/** A fake transformers.js. `row(text)` gives the vector of each text. */
function fake(opts: {
  readonly row?: (text: string) => unknown;
  readonly paddingSide?: string;
  readonly loadError?: Error;
  readonly loadNever?: boolean;
  readonly embedNever?: boolean;
  readonly rows?: (texts: readonly string[]) => unknown[];
} = {}): Fake {
  const loads: Call[] = [];
  const batches: string[][] = [];
  const embedOptions: Record<string, unknown>[] = [];
  const row = opts.row ?? ((text: string) => Array.from({ length: ONNX_VECTOR_DIMS }, (_, i) => (text.length + i) / 1e4));
  const lib: TransformersLibrary = {
    env: {},
    ModelRegistry: registry({ cached: [], missing: [] }).reg,
    pipeline: async (task, model, options) => {
      loads.push({ task, model, options: { ...options } });
      if (opts.loadNever === true) return new Promise(() => {});
      if (opts.loadError !== undefined) throw opts.loadError;
      const extractor = async (texts: string[], embed: Record<string, unknown>) => {
        batches.push([...texts]);
        embedOptions.push({ ...embed });
        if (opts.embedNever === true) return new Promise<never>(() => {});
        const out = opts.rows !== undefined ? opts.rows(texts) : texts.map(row);
        return { tolist: () => out };
      };
      return Object.assign(extractor, { tokenizer: { padding_side: opts.paddingSide ?? 'left' } });
    },
  };
  return { lib, loads, batches, embedOptions };
}

const savedEnv = process.env[ONNX_CACHE_ENV];
afterEach(() => {
  if (savedEnv === undefined) delete process.env[ONNX_CACHE_ENV];
  else process.env[ONNX_CACHE_ENV] = savedEnv;
});

describe('onnx embedder defaults', () => {
  it('names one model, fp16 by default, and 1024-wide vectors', () => {
    expect(ONNX_EMBEDDING_MODEL).toBe('onnx-community/Qwen3-Embedding-0.6B-ONNX');
    expect(ONNX_DEFAULT_DTYPE).toBe('fp16');
    expect(ONNX_DTYPES).toEqual(['q8', 'fp16', 'fp32']);
    expect(ONNX_VECTOR_DIMS).toBe(1024);
  });

  it('the load and per-text allowances are above the measured spike costs', () => {
    // The spike measured an fp16 cold load of 5.35 s and a per-text p95 of 962 ms.
    expect(ONNX_LOAD_TIMEOUT_MS).toBeGreaterThanOrEqual(5350);
    expect(ONNX_PER_TEXT_TIMEOUT_MS).toBeGreaterThanOrEqual(962);
  });
});

describe('onnx embedder with a fake library', () => {
  it('loads the feature-extraction pipeline from the local cache only, with the dtype', async () => {
    const f = fake();
    const embed = onnxEmbedder({ loadLibrary: async () => f.lib });
    await embed(['a']);
    expect(f.loads).toEqual([
      { task: 'feature-extraction', model: ONNX_EMBEDDING_MODEL, options: { dtype: 'fp16', local_files_only: true } },
    ]);
    expect(f.embedOptions).toEqual([{ pooling: 'last_token', normalize: true }]);
  });

  it('passes another model id and dtype through', async () => {
    const f = fake();
    await onnxEmbedder({ loadLibrary: async () => f.lib, modelId: 'org/other', dtype: 'q8' })(['a']);
    expect(f.loads[0]).toMatchObject({ model: 'org/other', options: { dtype: 'q8', local_files_only: true } });
  });

  it('does not load the library or the model before the first call', async () => {
    let imported = 0;
    const f = fake();
    const embed = onnxEmbedder({ loadLibrary: async () => (imported++, f.lib) });
    expect(imported).toBe(0);
    await embed(['a']);
    await embed(['b']);
    expect(imported).toBe(1);
    expect(f.loads).toHaveLength(1);
  });

  it('sets the cache directory from the option, else from the environment variable', async () => {
    const a = fake();
    await onnxEmbedder({ loadLibrary: async () => a.lib, cacheDir: '/x/cache' })(['a']);
    expect(a.lib.env.cacheDir).toBe('/x/cache');

    process.env[ONNX_CACHE_ENV] = '/env/cache';
    const b = fake();
    await onnxEmbedder({ loadLibrary: async () => b.lib })(['a']);
    expect(b.lib.env.cacheDir).toBe('/env/cache');

    delete process.env[ONNX_CACHE_ENV];
    const c = fake();
    await onnxEmbedder({ loadLibrary: async () => c.lib })(['a']);
    expect(c.lib.env.cacheDir).toBeUndefined();
  });

  it('embeds in batches of ONNX_BATCH_SIZE and keeps the input order', async () => {
    const f = fake({ row: (t) => Array.from({ length: ONNX_VECTOR_DIMS }, () => Number(t)) });
    const texts = Array.from({ length: 2 * ONNX_BATCH_SIZE + 3 }, (_, i) => String(i));
    const vectors = await onnxEmbedder({ loadLibrary: async () => f.lib })(texts);
    expect(f.batches.map((b) => b.length)).toEqual([ONNX_BATCH_SIZE, ONNX_BATCH_SIZE, 3]);
    expect(vectors.map((v) => v[0])).toEqual(texts.map(Number));
  });

  it('embeds the query form unchanged: the embedder adds no prefix', async () => {
    const f = fake();
    await onnxEmbedder({ loadLibrary: async () => f.lib })([queryInput('a claim'), 'doc']);
    expect(f.batches[0]).toEqual([queryInput('a claim'), 'doc']);
  });

  it('a library that does not import is library-not-installed', async () => {
    const embed = onnxEmbedder({
      loadLibrary: async () => {
        throw Object.assign(new Error("Cannot find package '@huggingface/transformers'"), { code: 'ERR_MODULE_NOT_FOUND' });
      },
    });
    await expect(embed(['a'])).rejects.toMatchObject({ reason: 'library-not-installed' });
    await expect(embed(['a'])).rejects.toBeInstanceOf(EmbeddingUnavailable);
  });

  it('a cache miss is model-not-cached', async () => {
    for (const message of [
      'Could not locate file: "https://huggingface.co/x/resolve/main/onnx/model_fp16.onnx".',
      '`local_files_only=true` or `env.allowRemoteModels=false` and file was not found locally',
      "ENOENT: no such file or directory, open 'C:\\nope\\config.json'",
    ]) {
      const f = fake({ loadError: new Error(message) });
      await expect(onnxEmbedder({ loadLibrary: async () => f.lib })(['a'])).rejects.toMatchObject({ reason: 'model-not-cached' });
    }
  });

  it('any other load failure is session-failed', async () => {
    const f = fake({ loadError: new Error('onnxruntime: protobuf parsing failed') });
    await expect(onnxEmbedder({ loadLibrary: async () => f.lib })(['a'])).rejects.toMatchObject({ reason: 'session-failed' });
  });

  it('a tokenizer that pads on the right is session-failed: last-token pooling needs left padding', async () => {
    const f = fake({ paddingSide: 'right' });
    await expect(onnxEmbedder({ loadLibrary: async () => f.lib })(['a'])).rejects.toMatchObject({ reason: 'session-failed' });
  });

  it('a failed load is tried again on the next call', async () => {
    let n = 0;
    const good = fake();
    const embed = onnxEmbedder({
      loadLibrary: async () => {
        n++;
        if (n === 1) throw Object.assign(new Error('missing'), { code: 'ERR_MODULE_NOT_FOUND' });
        return good.lib;
      },
    });
    await expect(embed(['a'])).rejects.toMatchObject({ reason: 'library-not-installed' });
    await expect(embed(['a'])).resolves.toHaveLength(1);
  });

  it('the default model must give 1024-wide rows', async () => {
    const f = fake({ row: () => [1, 2, 3] });
    await expect(onnxEmbedder({ loadLibrary: async () => f.lib })(['a'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });
  });

  it('another model must give one width for every row', async () => {
    const same = fake({ row: () => [1, 2, 3] });
    await expect(onnxEmbedder({ loadLibrary: async () => same.lib, modelId: 'org/other' })(['a', 'b'])).resolves.toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ]);
    const mixed = fake({ row: (t) => (t === 'a' ? [1, 2, 3] : [1, 2]) });
    await expect(onnxEmbedder({ loadLibrary: async () => mixed.lib, modelId: 'org/other' })(['a', 'b'])).rejects.toMatchObject({
      reason: 'reply-not-a-vector',
    });
  });

  it('a non-finite value, a non-number or a wrong row count is reply-not-a-vector', async () => {
    const width = (x: unknown) => Array.from({ length: ONNX_VECTOR_DIMS }, (_, i) => (i === 0 ? x : 0));
    for (const bad of [NaN, Infinity, 'x', null]) {
      const f = fake({ row: () => width(bad) });
      await expect(onnxEmbedder({ loadLibrary: async () => f.lib })(['a'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });
    }
    const short = fake({ rows: (texts) => texts.slice(1).map(() => width(0)) });
    await expect(onnxEmbedder({ loadLibrary: async () => short.lib })(['a', 'b'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });
  });

  it('a load that does not finish inside its allowance is call-did-not-finish', async () => {
    const f = fake({ loadNever: true });
    const embed = onnxEmbedder({ loadLibrary: async () => f.lib, loadTimeoutMs: 10 });
    await expect(embed(['a'])).rejects.toMatchObject({ reason: 'call-did-not-finish' });
  });

  it('an embedding that does not finish inside the per-text allowance is call-did-not-finish', async () => {
    const f = fake({ embedNever: true });
    const embed = onnxEmbedder({ loadLibrary: async () => f.lib, perTextTimeoutMs: 5 });
    await expect(embed(['a', 'b'])).rejects.toMatchObject({ reason: 'call-did-not-finish' });
  });
});

describe('fetchOnnxModel', () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('loads with downloads allowed and reports the hash of each model file of the dtype', async () => {
    dir = mkdtempSync(join(tmpdir(), 'upt-onnx-fetch-'));
    const onnx = join(dir, ...ONNX_EMBEDDING_MODEL.split('/'), 'onnx');
    mkdirSync(onnx, { recursive: true });
    writeFileSync(join(onnx, 'model_fp16.onnx'), 'graph');
    writeFileSync(join(onnx, 'model_fp16.onnx_data'), 'weights');
    writeFileSync(join(onnx, 'model_quantized.onnx'), 'other dtype');
    const f = fake();
    const report = await fetchOnnxModel({ loadLibrary: async () => f.lib, cacheDir: dir });
    expect(f.loads).toEqual([{ task: 'feature-extraction', model: ONNX_EMBEDDING_MODEL, options: { dtype: 'fp16' } }]);
    expect(f.lib.env.cacheDir).toBe(dir);
    const sha = (s: string) => createHash('sha256').update(s).digest('hex');
    expect(report).toEqual({
      modelId: ONNX_EMBEDDING_MODEL,
      dtype: 'fp16',
      cacheDir: dir,
      files: [
        { path: join(onnx, 'model_fp16.onnx'), bytes: 5, sha256: sha('graph') },
        { path: join(onnx, 'model_fp16.onnx_data'), bytes: 7, sha256: sha('weights') },
      ],
    });
  });

  it('names the q8 and fp32 model files by their stems', async () => {
    dir = mkdtempSync(join(tmpdir(), 'upt-onnx-fetch-'));
    const onnx = join(dir, ...ONNX_EMBEDDING_MODEL.split('/'), 'onnx');
    mkdirSync(onnx, { recursive: true });
    writeFileSync(join(onnx, 'model.onnx'), 'a');
    writeFileSync(join(onnx, 'model_quantized.onnx'), 'b');
    writeFileSync(join(onnx, 'model_fp16.onnx'), 'c');
    const q8 = await fetchOnnxModel({ loadLibrary: async () => fake().lib, cacheDir: dir, dtype: 'q8' });
    expect(q8.files.map((x) => x.path)).toEqual([join(onnx, 'model_quantized.onnx')]);
    const fp32 = await fetchOnnxModel({ loadLibrary: async () => fake().lib, cacheDir: dir, dtype: 'fp32' });
    expect(fp32.files.map((x) => x.path)).toEqual([join(onnx, 'model.onnx')]);
  });

  it('a library that does not import is library-not-installed', async () => {
    await expect(
      fetchOnnxModel({
        loadLibrary: async () => {
          throw new Error('missing');
        },
      }),
    ).rejects.toMatchObject({ reason: 'library-not-installed' });
  });

  it('a cache with no model file of the dtype is model-not-cached, not a crash', async () => {
    dir = mkdtempSync(join(tmpdir(), 'upt-onnx-fetch-'));
    await expect(fetchOnnxModel({ loadLibrary: async () => fake().lib, cacheDir: dir })).rejects.toMatchObject({ reason: 'model-not-cached' });
    const onnx = join(dir, ...ONNX_EMBEDDING_MODEL.split('/'), 'onnx');
    mkdirSync(onnx, { recursive: true });
    writeFileSync(join(onnx, 'model_quantized.onnx'), 'q8 only');
    await expect(fetchOnnxModel({ loadLibrary: async () => fake().lib, cacheDir: dir })).rejects.toMatchObject({ reason: 'model-not-cached' });
  });

  it('a load that fails after the download is session-failed', async () => {
    const f = fake({ loadError: new Error('network down') });
    await expect(fetchOnnxModel({ loadLibrary: async () => f.lib, cacheDir: '/x' })).rejects.toMatchObject({ reason: 'session-failed' });
  });
});

/** A fake model registry. `cached` lists the files the cache holds; `meta` answers each probe. */
function registry(opts: {
  readonly cached: readonly string[];
  readonly missing: readonly string[];
  readonly meta?: (file: string) => Promise<{ exists: boolean }>;
  readonly listError?: Error;
}) {
  const probes: string[] = [];
  const listCalls: { task: string; model: string; options: Record<string, unknown> }[] = [];
  const metaCalls: { model: string; file: string; options: unknown }[] = [];
  const reg = {
    is_pipeline_cached_files: async (task: string, model: string, options: Record<string, unknown>) => {
      listCalls.push({ task, model, options: { ...options } });
      if (opts.listError !== undefined) throw opts.listError;
      return {
      allCached: opts.missing.length === 0,
      files: [
        ...opts.cached.map((file) => ({ file, cached: true })),
        ...opts.missing.map((file) => ({ file, cached: false })),
      ],
      };
    },
    get_file_metadata: async (model: string, file: string, options?: Record<string, unknown>) => {
      metaCalls.push({ model, file, options });
      probes.push(file);
      return opts.meta !== undefined ? opts.meta(file) : { exists: true };
    },
  };
  return { reg, probes, listCalls, metaCalls };
}

/** A pipeline that leaves a rejected download unawaited, as transformers.js 4.3.2 getSession does. */
function orphaningPipeline(loads: string[]): TransformersLibrary['pipeline'] {
  return async (_task, model) => {
    loads.push(model);
    const core = Promise.reject(new TypeError('fetch failed'));
    await new Promise((resolve) => setTimeout(resolve, 5));
    void core;
    throw new TypeError('fetch failed');
  };
}

describe('fetchOnnxModel with an unreachable host', () => {
  const JSON_FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json'];
  const ONNX_FILES = ['onnx/model_fp16.onnx', 'onnx/model_fp16.onnx_data'];

  it('JSON cached, ONNX absent, host down: model-not-cached, and the library never loads', async () => {
    const loads: string[] = [];
    const { reg, probes } = registry({
      cached: JSON_FILES,
      missing: ONNX_FILES,
      meta: async () => {
        throw new TypeError('fetch failed');
      },
    });
    const lib = { env: {}, pipeline: orphaningPipeline(loads), ModelRegistry: reg } as TransformersLibrary;
    await expect(fetchOnnxModel({ loadLibrary: async () => lib, cacheDir: '/x' })).rejects.toMatchObject({
      reason: 'model-not-cached',
    });
    expect(loads).toEqual([]);
    expect(probes[0]).toBe('onnx/model_fp16.onnx');
  });

  it('a missing file the host does not have is model-not-cached, and the library never loads', async () => {
    const loads: string[] = [];
    const { reg } = registry({
      cached: JSON_FILES,
      missing: ONNX_FILES,
      meta: async (file) => ({ exists: file !== 'onnx/model_fp16.onnx_data' }),
    });
    const lib = { env: {}, pipeline: orphaningPipeline(loads), ModelRegistry: reg } as TransformersLibrary;
    await expect(fetchOnnxModel({ loadLibrary: async () => lib, cacheDir: '/x' })).rejects.toMatchObject({
      reason: 'model-not-cached',
    });
    expect(loads).toEqual([]);
  });

  it('every file cached: no probe, and the library loads', async () => {
    const f = fake({ loadError: new Error('stop after the load') });
    const { reg, probes } = registry({ cached: [...JSON_FILES, ...ONNX_FILES], missing: [] });
    const lib = { ...f.lib, ModelRegistry: reg } as TransformersLibrary;
    await expect(fetchOnnxModel({ loadLibrary: async () => lib, cacheDir: '/x' })).rejects.toMatchObject({
      reason: 'session-failed',
    });
    expect(probes).toEqual([]);
    expect(f.loads).toHaveLength(1);
  });

  it('the list call carries the dtype and the model of the load, and each probe names the model', async () => {
    for (const dtype of ['q8', 'fp32'] as const) {
      const f = fake({ loadError: new Error('stop after the load') });
      const { reg, listCalls, metaCalls } = registry({ cached: JSON_FILES, missing: ['onnx/x.onnx'] });
      const lib = { ...f.lib, ModelRegistry: reg } as TransformersLibrary;
      await fetchOnnxModel({ loadLibrary: async () => lib, cacheDir: '/x', dtype, modelId: 'org/other' }).catch(() => undefined);
      expect(listCalls).toEqual([{ task: 'feature-extraction', model: 'org/other', options: { dtype } }]);
      expect(metaCalls.map((c) => [c.model, c.file])).toEqual([['org/other', 'onnx/x.onnx']]);
      expect(f.loads[0]?.options).toEqual({ dtype });
    }
  });

  it('a list call that rejects is session-failed with the cause, and the library never loads', async () => {
    const loads: string[] = [];
    const { reg } = registry({ cached: [], missing: [], listError: new TypeError('fetch failed') });
    const lib = { env: {}, pipeline: orphaningPipeline(loads), ModelRegistry: reg } as TransformersLibrary;
    await expect(fetchOnnxModel({ loadLibrary: async () => lib, cacheDir: '/x' })).rejects.toMatchObject({
      reason: 'session-failed',
      message: expect.stringContaining('fetch failed'),
    });
    expect(loads).toEqual([]);
  });

  it('a library with no ModelRegistry is refused as session-failed, and never loads', async () => {
    const f = fake();
    const { ModelRegistry: _omit, ...rest } = f.lib;
    await expect(fetchOnnxModel({ loadLibrary: async () => rest as TransformersLibrary, cacheDir: '/x' })).rejects.toMatchObject({
      reason: 'session-failed',
      message: expect.stringContaining('ModelRegistry'),
    });
    expect(f.loads).toEqual([]);
  });

  it('missing files the host has: each is probed, then the library loads', async () => {
    const f = fake({ loadError: new Error('stop after the load') });
    const { reg, probes } = registry({ cached: JSON_FILES, missing: ONNX_FILES });
    const lib = { ...f.lib, ModelRegistry: reg } as TransformersLibrary;
    await expect(fetchOnnxModel({ loadLibrary: async () => lib, cacheDir: '/x' })).rejects.toMatchObject({
      reason: 'session-failed',
    });
    expect(probes).toEqual(ONNX_FILES);
    expect(f.loads).toHaveLength(1);
  });
});

// The optional peer is not installed in every checkout, so this block runs only where it is.
const PEER_INSTALLED = existsSync(join(process.cwd(), 'node_modules', '@huggingface', 'transformers', 'package.json'));
describe.skipIf(!PEER_INSTALLED)('fetchOnnxModel, real transformers.js, host down', () => {
  it('JSON files cached, ONNX files absent: model-not-cached, with the host refusing connections', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-onnx-real-'));
    const model = join(dir, ...ONNX_EMBEDDING_MODEL.split('/'));
    mkdirSync(model, { recursive: true });
    writeFileSync(join(model, 'config.json'), JSON.stringify({ model_type: 'qwen3', architectures: ['Qwen3Model'] }));
    writeFileSync(join(model, 'tokenizer.json'), '{}');
    writeFileSync(join(model, 'tokenizer_config.json'), '{}');
    const peer = '@huggingface/transformers';
    const lib = (await import(peer)) as unknown as TransformersLibrary & { env: { remoteHost?: string } };
    const savedHost = lib.env.remoteHost;
    lib.env.remoteHost = 'http://127.0.0.1:9/';
    try {
      await expect(fetchOnnxModel({ loadLibrary: async () => lib, cacheDir: dir })).rejects.toMatchObject({ reason: 'model-not-cached' });
    } finally {
      if (savedHost !== undefined) lib.env.remoteHost = savedHost;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

const LIVE = process.env['UPT_ONNX_LIVE_CACHE'];
describe.skipIf(LIVE === undefined)('onnx embedder, live model (UPT_ONNX_LIVE_CACHE)', () => {
  it('embeds with the default model and dtype, one text alone equal to the same text in a batch', async () => {
    const embed = onnxEmbedder({ cacheDir: LIVE! });
    const [alone] = await embed(['Energy is conserved.']);
    const batch = await embed(['The force on a body equals its mass times its acceleration.', 'Energy is conserved.']);
    expect(alone).toHaveLength(ONNX_VECTOR_DIMS);
    let dot = 0;
    for (let i = 0; i < ONNX_VECTOR_DIMS; i++) dot += alone![i]! * batch[1]![i]!;
    expect(dot).toBeGreaterThan(0.9999);
  }, 300_000);
});

describe('onnxEmbedder: review findings (cache check, kept load, deadline, error mapping)', () => {
  it('with checkCache, a cache without the model files is model-not-cached and the pipeline is never called', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'upt-onnx-check-'));
    try {
      const f = fake();
      const embed = onnxEmbedder({ loadLibrary: async () => f.lib, cacheDir: empty, checkCache: true });
      await expect(embed(['a'])).rejects.toMatchObject({ reason: 'model-not-cached' });
      expect(f.loads).toHaveLength(0);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('control: with checkCache and every required file present, the pipeline loads', async () => {
    const full = mkdtempSync(join(tmpdir(), 'upt-onnx-check-'));
    try {
      const dir = join(full, ...ONNX_EMBEDDING_MODEL.split('/'));
      mkdirSync(join(dir, 'onnx'), { recursive: true });
      for (const name of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_fp16.onnx']) writeFileSync(join(dir, name), 'x');
      const f = fake();
      const embed = onnxEmbedder({ loadLibrary: async () => f.lib, cacheDir: full, checkCache: true });
      await expect(embed(['a'])).resolves.toHaveLength(1);
      expect(f.loads).toHaveLength(1);
    } finally {
      rmSync(full, { recursive: true, force: true });
    }
  });

  it('a load that timed out is kept: a second call starts no second load', async () => {
    const f = fake({ loadNever: true });
    const embed = onnxEmbedder({ loadLibrary: async () => f.lib, loadTimeoutMs: 10 });
    await expect(embed(['a'])).rejects.toMatchObject({ reason: 'call-did-not-finish' });
    await expect(embed(['a'])).rejects.toMatchObject({ reason: 'call-did-not-finish' });
    expect(f.loads).toHaveLength(1);
  });

  it('a timed-out embedding stops at its next batch', async () => {
    const batches: number[] = [];
    const extractor = Object.assign(
      async (texts: string[]) => {
        batches.push(texts.length);
        await new Promise((r) => setTimeout(r, 40));
        return { tolist: () => texts.map(() => Array.from({ length: ONNX_VECTOR_DIMS }, () => 0.1)) };
      },
      { tokenizer: { padding_side: 'left' } },
    );
    const lib: TransformersLibrary = { env: {}, pipeline: async () => extractor };
    const texts = Array.from({ length: 3 * ONNX_BATCH_SIZE }, (_, i) => `t${i}`);
    const embed = onnxEmbedder({ loadLibrary: async () => lib, perTextTimeoutMs: 1 });
    await expect(embed(texts)).rejects.toMatchObject({ reason: 'call-did-not-finish' });
    await new Promise((r) => setTimeout(r, 150));
    expect(batches).toHaveLength(1);
  });

  it('an import error with a code other than a missing module is session-failed', async () => {
    const embed = onnxEmbedder({ loadLibrary: async () => { throw Object.assign(new Error('dlopen'), { code: 'ERR_DLOPEN_FAILED' }); } });
    await expect(embed(['a'])).rejects.toMatchObject({ reason: 'session-failed' });
    const missing = onnxEmbedder({ loadLibrary: async () => { throw Object.assign(new Error('no'), { code: 'ERR_MODULE_NOT_FOUND' }); } });
    await expect(missing(['a'])).rejects.toMatchObject({ reason: 'library-not-installed' });
  });

  it('the configuration error that names local_files_only is session-failed, not a cache miss', async () => {
    const f = fake({ loadError: new Error('Invalid configuration detected: (`local_files_only=true`) conflicts') });
    await expect(onnxEmbedder({ loadLibrary: async () => f.lib })(['a'])).rejects.toMatchObject({ reason: 'session-failed' });
    const g = fake({ loadError: new Error('`local_files_only=true` or `env.allowRemoteModels=false` and file was not found locally at "x"') });
    await expect(onnxEmbedder({ loadLibrary: async () => g.lib })(['a'])).rejects.toMatchObject({ reason: 'model-not-cached' });
  });
});
