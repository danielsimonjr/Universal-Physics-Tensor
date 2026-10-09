/**
 * Tier 11 hybrid retrieval. The stub and the frozen vectors never start Ollama.
 * A closed port is the only socket, and it is expected to refuse.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dim, sym } from '../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { rankByStructure, type CorpusRecord, type RetrievalQuery } from '../../src/atlas/benchmark/baselines.js';
import {
  ATLAS_ONLY_NOTE,
  EMBEDDING_INSTRUCTION,
  EmbeddingUnavailable,
  FROZEN_VECTOR_DIMS,
  FROZEN_VECTOR_SHA256,
  cosine,
  decodeFloat32,
  ollamaEmbedder,
  queryInput,
  rankByCosine,
  retrieveHybrid,
  stubEmbedder,
  stubVector,
} from '../../src/atlas/benchmark/hybrid-retrieval.js';
import { queryInput as registeredQueryInput } from '../../tools/criterion3-study/embedding.js';

const L = dim(1);
const T = dim(0, 0, 1);
const div = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [a, b] });
const speed = div(sym('x', L), sym('t', T));
const other = div(sym('m', dim(0, 1)), sym('v', L));

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const FROZEN = join(root, 'docs/research/criterion3/embeddings/qwen3-embedding-4b.json');

describe('stub embedder', () => {
  it('is a pure function of the text, and the vectors are these', async () => {
    expect(stubVector('claim')).toEqual([518, 1571]);
    expect(stubVector('near')).toEqual([422, 1059]);
    expect(stubVector('zz')).toEqual([244, 366]);
    expect(stubVector('claim')).toEqual(stubVector('claim'));
    const [claim, near, zz] = await stubEmbedder(['claim', 'near', 'zz']);
    expect(claim).toEqual([518, 1571]);
    expect(near).toEqual([422, 1059]);
    expect(zz).toEqual([244, 366]);
  });

  it('ranks by cosine, best first, and breaks a tie by record id', () => {
    const query = stubVector('zz');
    const records = [
      { id: 'b-id', vector: stubVector('zz') },
      { id: 'a-id', vector: stubVector('zz') },
      { id: 'other', vector: stubVector('claim') },
    ];
    expect(cosine(query, records[0]!.vector)).toBe(1);
    expect(cosine(query, records[1]!.vector)).toBe(1);
    expect(cosine(query, records[2]!.vector)).toBeLessThan(1);
    expect(rankByCosine(query, records)).toEqual(['a-id', 'b-id', 'other']);
    expect(rankByCosine(query, [...records].reverse())).toEqual(['a-id', 'b-id', 'other']);
  });

  it('uses the registered query form and leaves a corpus record unprefixed', () => {
    expect(EMBEDDING_INSTRUCTION).toBe(
      'Given a physics claim, retrieve the established physical relation that the claim restates or misuses',
    );
    expect(queryInput('a claim')).toBe(registeredQueryInput('a claim'));
    expect(queryInput('a claim')).toBe(`Instruct: ${EMBEDDING_INSTRUCTION}\nQuery: a claim`);
  });
});

describe('hybrid acceptance', () => {
  const query: RetrievalQuery = { text: 'claim', expr: speed };
  const corpus: CorpusRecord[] = [
    { id: 'near', text: 'claim', expr: other },
    { id: 'far', text: 'zz', expr: speed },
  ];

  it('keeps a structural miss a miss when cosine ranked it first', async () => {
    const seen: string[][] = [];
    const result = await retrieveHybrid({
      query,
      corpus,
      embeddings: true,
      embedder: async (texts) => {
        seen.push([...texts]);
        return stubEmbedder(texts);
      },
    });
    expect(seen).toEqual([[queryInput('claim'), 'claim', 'zz']]);
    expect(result.embeddings).toBe('used');
    expect(result.proposals).toEqual(['near', 'far']);
    expect(result.accepted).toEqual(['far', 'near']);
    expect(result.accepted).toEqual(rankByStructure(query, corpus));
    expect(result.fallback).toBeNull();
    expect(result.note).toMatch(/not evidence/);
    expect(result.note).toMatch(/Cosine similarity does not enter/);
  });

  it('does not call an embedder when embeddings were not requested', async () => {
    let called = false;
    const result = await retrieveHybrid({
      query,
      corpus,
      embedder: async () => {
        called = true;
        return [];
      },
    });
    expect(called).toBe(false);
    expect(result.embeddings).toBe('not-requested');
    expect(result.proposals).toBeNull();
    expect(result.accepted).toEqual(rankByStructure(query, corpus));
    expect(result.note).toBe(ATLAS_ONLY_NOTE);
  });
});

describe('frozen vectors', () => {
  it('ranks the registered file and fails when the hash is not the registered hash', () => {
    const bytes = readFileSync(FROZEN);
    const hash = createHash('sha256').update(bytes).digest('hex');
    expect(hash).toBe(FROZEN_VECTOR_SHA256);
    expect(FROZEN_VECTOR_SHA256).toBe('8fd79d2c6aaaf95c67f9a29ceb5fe4b88b42970c8e514d98c72c00a2c519cbdc');
    const file = JSON.parse(bytes.toString('utf8')) as {
      dims: number;
      corpus: Record<string, string>;
      queries: Record<string, string>;
    };
    expect(file.dims).toBe(FROZEN_VECTOR_DIMS);
    expect(FROZEN_VECTOR_DIMS).toBe(2560);
    const queryId = Object.keys(file.queries).sort()[0]!;
    const q = decodeFloat32(file.queries[queryId]!);
    expect(q.length).toBe(2560);
    const records = Object.keys(file.corpus)
      .sort()
      .map((id) => ({ id, vector: decodeFloat32(file.corpus[id]!) }));
    const ranked = rankByCosine(q, records);
    const again = rankByCosine(q, [...records].reverse());
    expect(again).toEqual(ranked);
    expect(new Set(ranked).size).toBe(records.length);
    const score = (id: string) => cosine(q, records.find((r) => r.id === id)!.vector);
    for (let i = 1; i < ranked.length; i++) {
      const prev = score(ranked[i - 1]!);
      const cur = score(ranked[i]!);
      expect(prev > cur || (prev === cur && ranked[i - 1]! < ranked[i]!)).toBe(true);
    }
  });
});

describe('Ollama fallback', () => {
  const query: RetrievalQuery = { text: 'claim', expr: speed };
  const corpus: CorpusRecord[] = [
    { id: 'far', text: 'zz', expr: speed },
    { id: 'near', text: 'claim', expr: other },
  ];

  it('a closed port falls back to the atlas ranking and names the process', async () => {
    // The refusal is injected, not dialled: a real connect to 127.0.0.1:1 is refused on a host
    // that answers, but a sandbox that DROPS the packet reaches the 1000 ms timeout instead and
    // reports `call-did-not-finish`, a different reason for a different fact.
    const refused = async (): Promise<Response> => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    };
    const embedder = ollamaEmbedder({
      baseUrl: 'http://127.0.0.1:1',
      timeoutMs: 1000,
      fetchImpl: refused,
    });
    const result = await retrieveHybrid({ query, corpus, embeddings: true, embedder });
    expect(result.embeddings).toBe('fallback');
    expect(result.fallback).toBe('process-not-there');
    expect(result.note).toMatch(/the process is not there/);
    expect(result.proposals).toBeNull();
    expect(result.accepted).toEqual(rankByStructure(query, corpus));
  });

  it('names the model, a bad reply, and a call that does not finish', async () => {
    const model = ollamaEmbedder({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: async () => new Response(JSON.stringify({ error: 'model not found' }), { status: 404 }),
    });
    await expect(model(['claim'])).rejects.toMatchObject({ reason: 'model-not-there' });

    // A non-404 error status from a server that IS there is neither an absent
    // model nor a malformed vector: it is the server refusing the call.
    const serverError = ollamaEmbedder({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: async () => new Response('internal error', { status: 500 }),
    });
    await expect(serverError(['claim'])).rejects.toMatchObject({ reason: 'server-error' });
    await expect(serverError(['claim'])).rejects.toThrow(/status 500/);

    const bad = ollamaEmbedder({
      baseUrl: 'http://127.0.0.1:9',
      expectedDims: 2560,
      fetchImpl: async () => new Response(JSON.stringify({ embeddings: [[1, 2, 3]] }), { status: 200 }),
    });
    await expect(bad(['claim'])).rejects.toBeInstanceOf(EmbeddingUnavailable);
    await expect(bad(['claim'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });

    const hung = ollamaEmbedder({
      baseUrl: 'http://127.0.0.1:9',
      timeoutMs: 20,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason ?? new Error('aborted'));
          });
        }),
    });
    await expect(hung(['claim'])).rejects.toMatchObject({ reason: 'call-did-not-finish' });
  });
});
