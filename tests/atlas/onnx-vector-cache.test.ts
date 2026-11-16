/**
 * The per-batch vector cache of the ONNX embedder. A fake library stands in for
 * transformers.js. Its vectors depend on every text of the batch, so a cache that
 * changes the batch composition returns wrong vectors and a test sees it.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ONNX_BATCH_SIZE,
  ONNX_EMBEDDING_MODEL,
  VECTOR_CACHE_ENV,
  VECTOR_CACHE_SUBDIR,
  onnxEmbedder,
  type OnnxEmbedderOptions,
  type TransformersLibrary,
} from '../../src/atlas/benchmark/onnx-embedder.js';

const WIDTH = 4;

/** A fake library. Each vector folds in its own text and every text of its batch. */
function batchMateLibrary(version = '4.3.2') {
  const counts = { loads: 0, batches: 0 };
  const lib: TransformersLibrary = {
    env: { version } as TransformersLibrary['env'],
    pipeline: async () => {
      counts.loads += 1;
      const extractor = async (texts: string[]) => {
        counts.batches += 1;
        const mates = texts.join('|');
        const rows = texts.map((t) => {
          let h = 0;
          for (const ch of `${t}#${mates}`) h = (h * 31 + ch.charCodeAt(0)) % 1_000_003;
          return [h / 1_000_003, 0.1, -0, t.length / 7];
        });
        return { tolist: () => rows };
      };
      return Object.assign(extractor, { tokenizer: { padding_side: 'left' } });
    },
  };
  return { lib, counts };
}

const corpus = (n: number, tag = 'c') => Array.from({ length: n }, (_, i) => `${tag}${i} text of record ${i}`);

let root: string;
let saved: string | undefined;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'upt-vcache-'));
  // The model file the key stamps. Its size and time are part of the key.
  const onnx = join(root, ...ONNX_EMBEDDING_MODEL.split('/'), 'onnx');
  mkdirSync(onnx, { recursive: true });
  writeFileSync(join(onnx, 'model_fp16.onnx'), 'graph');
  saved = process.env[VECTOR_CACHE_ENV];
  delete process.env[VECTOR_CACHE_ENV];
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  if (saved === undefined) delete process.env[VECTOR_CACHE_ENV];
  else process.env[VECTOR_CACHE_ENV] = saved;
});

function embedder(lib: TransformersLibrary, extra: Partial<OnnxEmbedderOptions> = {}) {
  return onnxEmbedder({ loadLibrary: async () => lib, cacheDir: root, expectedDims: WIDTH, vectorCache: true, ...extra });
}

const cacheDir = () => join(root, VECTOR_CACHE_SUBDIR);
const vecFiles = () => (existsSync(cacheDir()) ? readdirSync(cacheDir()).filter((f) => f.endsWith('.vec')) : []);

describe('onnx vector cache', () => {
  it('names its constants', () => {
    expect(VECTOR_CACHE_ENV).toBe('UPT_VECTOR_CACHE');
    expect(VECTOR_CACHE_SUBDIR).toBe('.upt-vectors');
  });

  it('is off by default at library level: no file is written', async () => {
    const { lib } = batchMateLibrary();
    await onnxEmbedder({ loadLibrary: async () => lib, cacheDir: root, expectedDims: WIDTH })(['q', ...corpus(20)]);
    expect(existsSync(cacheDir())).toBe(false);
  });

  it('a second identical call does not load the model and returns the same vectors', async () => {
    const inputs = ['query', ...corpus(20)];
    const first = batchMateLibrary();
    const a = await embedder(first.lib)(inputs);
    expect(vecFiles()).toHaveLength(Math.ceil(inputs.length / ONNX_BATCH_SIZE));
    const second = batchMateLibrary();
    const events: string[] = [];
    const b = await embedder(second.lib, { onCacheEvent: (e) => events.push(e.kind) })(inputs);
    expect(second.counts.loads).toBe(0);
    expect(b).toEqual(a);
    expect(events.every((k) => k === 'hit')).toBe(true);
  });

  it('a shifted corpus gives the vectors of a fresh run, not of the stored batches', async () => {
    await embedder(batchMateLibrary().lib)(['query', ...corpus(20)]);
    const shifted = ['query', 'inserted record', ...corpus(20)];
    const cached = await embedder(batchMateLibrary().lib)(shifted);
    const fresh = await onnxEmbedder({ loadLibrary: async () => batchMateLibrary().lib, cacheDir: root, expectedDims: WIDTH })(shifted);
    expect(cached).toEqual(fresh);
  });

  it('a new query embeds only the first batch', async () => {
    await embedder(batchMateLibrary().lib)(['query one', ...corpus(20)]);
    const next = batchMateLibrary();
    const inputs = ['query two', ...corpus(20)];
    const out = await embedder(next.lib)(inputs);
    expect(next.counts.batches).toBe(1);
    const fresh = await onnxEmbedder({ loadLibrary: async () => batchMateLibrary().lib, cacheDir: root, expectedDims: WIDTH })(inputs);
    expect(out).toEqual(fresh);
  });

  it('another dtype, library version or model file is a miss', async () => {
    const inputs = ['query', ...corpus(10)];
    await embedder(batchMateLibrary().lib)(inputs);
    const otherDtype = batchMateLibrary();
    await embedder(otherDtype.lib, { dtype: 'q8' })(inputs);
    expect(otherDtype.counts.loads).toBe(1);
    const version = batchMateLibrary('4.3.3');
    await embedder(version.lib)(inputs);
    expect(version.counts.loads).toBe(1);
    writeFileSync(join(root, ...ONNX_EMBEDDING_MODEL.split('/'), 'onnx', 'model_fp16.onnx'), 'a replaced graph');
    // The same version as the last write, so only the model file differs.
    const replaced = batchMateLibrary('4.3.3');
    await embedder(replaced.lib)(inputs);
    expect(replaced.counts.loads).toBe(1);
  });

  it('a truncated or foreign file is re-embedded and repaired, not thrown', async () => {
    const inputs = ['query', ...corpus(3)];
    const a = await embedder(batchMateLibrary().lib)(inputs);
    const [file] = vecFiles();
    const path = join(cacheDir(), file!);
    writeFileSync(path, readFileSync(path).subarray(0, 20));
    const again = batchMateLibrary();
    expect(await embedder(again.lib)(inputs)).toEqual(a);
    expect(again.counts.loads).toBe(1);
    writeFileSync(path, Buffer.concat([readFileSync(path), Buffer.alloc(8)]));
    const longer = batchMateLibrary();
    expect(await embedder(longer.lib)(inputs)).toEqual(a);
    expect(longer.counts.loads).toBe(1);
    writeFileSync(path, Buffer.from('not a vector file at all'));
    expect(await embedder(batchMateLibrary().lib)(inputs)).toEqual(a);
    const healed = batchMateLibrary();
    await embedder(healed.lib)(inputs);
    expect(healed.counts.loads).toBe(0);
  });

  it('stores numbers exactly, including -0 and values that are not float32', async () => {
    const inputs = ['q'];
    const a = await embedder(batchMateLibrary().lib)(inputs);
    const b = await embedder(batchMateLibrary().lib)(inputs);
    expect(Object.is(b[0]![2], -0)).toBe(true);
    expect(b[0]![1]).toBe(0.1);
    expect(b).toEqual(a);
  });

  it('reads the location from UPT_VECTOR_CACHE, and an all-hit run needs no library', async () => {
    const dir = join(root, 'elsewhere');
    process.env[VECTOR_CACHE_ENV] = dir;
    const inputs = ['query', ...corpus(9)];
    const a = await embedder(batchMateLibrary().lib)(inputs);
    expect(readdirSync(dir).filter((f) => f.endsWith('.vec')).length).toBeGreaterThan(0);
    let imported = 0;
    const b = await onnxEmbedder({
      loadLibrary: async () => {
        imported += 1;
        throw new Error('no library');
      },
      cacheDir: root,
      expectedDims: WIDTH,
      vectorCache: true,
    })(inputs);
    expect(imported).toBe(0);
    expect(b).toEqual(a);
  });

  it('a location that is a file is a loud error', async () => {
    const file = join(root, 'a-file');
    writeFileSync(file, 'x');
    await expect(embedder(batchMateLibrary().lib, { vectorCacheDir: file })(['q'])).rejects.toMatchObject({ reason: 'session-failed' });
  });

  it('a file with a wrong row count, a non-finite value or a wrong width is a miss', async () => {
    const inputs = ['query', ...corpus(3)];
    const a = await embedder(batchMateLibrary().lib)(inputs);
    const [file] = vecFiles();
    const path = join(cacheDir(), file!);
    const good = readFileSync(path);
    const rows = good.readUInt32LE(4);
    const dataAt = good.length - rows * WIDTH * 8;
    const damage: ((b: Buffer) => void)[] = [
      (b) => b.writeUInt32LE(rows + 1, 4),
      (b) => b.writeDoubleLE(Number.NaN, dataAt),
      (b) => b.writeDoubleLE(Number.POSITIVE_INFINITY, dataAt + 8),
    ];
    for (const hurt of damage) {
      const bad = Buffer.from(good);
      hurt(bad);
      writeFileSync(path, bad);
      const again = batchMateLibrary();
      expect(await embedder(again.lib)(inputs)).toEqual(a);
      expect(again.counts.loads).toBe(1);
    }
    const wider = batchMateLibrary();
    await embedder(wider.lib, { expectedDims: WIDTH + 1 })(inputs).catch(() => undefined);
    expect(wider.counts.loads).toBe(1);
  });

  it('a short last batch and a query-only input hit on the second run', async () => {
    for (const inputs of [['query', ...corpus(10)], ['only a query']]) {
      const a = await embedder(batchMateLibrary().lib)(inputs);
      const again = batchMateLibrary();
      expect(await embedder(again.lib)(inputs)).toEqual(a);
      expect(again.counts.loads).toBe(0);
    }
  });

  it('a first run with no library still refuses as library-not-installed', async () => {
    process.env[VECTOR_CACHE_ENV] = join(root, 'elsewhere');
    const run = onnxEmbedder({
      loadLibrary: async () => {
        throw Object.assign(new Error("Cannot find package '@huggingface/transformers'"), { code: 'ERR_MODULE_NOT_FOUND' });
      },
      cacheDir: root,
      expectedDims: WIDTH,
      vectorCache: true,
    });
    await expect(run(['q'])).rejects.toMatchObject({ reason: 'library-not-installed' });
  });

  it('a write that fails is an event per batch, and the vectors still return', async () => {
    const dir = join(root, 'ro');
    const inputs = ['query', ...corpus(9)];
    const events: { kind: string; batch: number }[] = [];
    const out = await embedder(batchMateLibrary().lib, { vectorCacheDir: dir })(inputs);
    expect(out).toHaveLength(inputs.length);
    // A directory at each .vec name makes the read a miss and the rename fail, on every platform.
    for (const f of readdirSync(dir)) {
      rmSync(join(dir, f));
      mkdirSync(join(dir, f));
    }
    events.length = 0;
    const second = batchMateLibrary();
    const out2 = await embedder(second.lib, { vectorCacheDir: dir, onCacheEvent: (e) => events.push(e) })(inputs);
    expect(out2).toEqual(out);
    const failed = events.filter((e) => e.kind === 'write-failed').map((e) => e.batch);
    expect(failed).toEqual([0, 1]);
  });

  it('two calls at once leave only whole files', async () => {
    const inputs = ['query', ...corpus(20)];
    const [a, b] = await Promise.all([embedder(batchMateLibrary().lib)(inputs), embedder(batchMateLibrary().lib)(inputs)]);
    expect(b).toEqual(a);
    expect(readdirSync(cacheDir()).every((f) => f.endsWith('.vec'))).toBe(true);
  });
});
