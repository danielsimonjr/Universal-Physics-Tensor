/**
 * Tier 11 hybrid retrieval. The stub and the frozen vectors never start Ollama.
 * A closed port is the only socket, and it is expected to refuse.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dim, sym, symbolPower } from '../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { rankBySymbolOverlap, rankByStructure, type CorpusRecord, type RetrievalQuery } from '../../src/atlas/benchmark/baselines.js';
import {
  ATLAS_ONLY_NOTE,
  EMBEDDING_INSTRUCTION,
  EmbeddingUnavailable,
  FROZEN_VECTOR_DIMS,
  FROZEN_VECTOR_SHA256,
  OLLAMA_EMBEDDING_MODEL,
  cosine,
  decodeFloat32,
  canonicalRetrievalCorpus,
  ollamaEmbedder,
  queryInput,
  rankByCosine,
  retrieveHybrid,
  stubEmbedder,
  stubVector,
} from '../../src/atlas/benchmark/hybrid-retrieval.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { validate } from '../../src/dimensional/validator.js';
import { parseCatalogExpression } from '../../src/bridges/expr-parse.js';

const COLLISION_GROUP_SIZES_AFTER: number[] = [2, 2, 2, 2]; // before this change: also [2, 2, 2, 2]
import { leakageKey } from '../../src/atlas/benchmark/leakage.js';
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
    // (A `stubVector('claim')` equal to itself stood here; a pure call compared with its own
    // call cannot fail (law 3). The three pinned vectors above are the determinism check.)
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

  it('a model that is not the default is held to one length per reply, not to the frozen length', async () => {
    const reply = (embeddings: unknown) =>
      ollamaEmbedder({
        baseUrl: 'http://127.0.0.1:9',
        model: 'other-embedding',
        fetchImpl: async () => new Response(JSON.stringify({ embeddings }), { status: 200 }),
      });
    const row = Array.from({ length: 1024 }, (_, i) => i / 1024);
    await expect(reply([row, row])(['a', 'b'])).resolves.toHaveLength(2);
    await expect(reply([row, row.slice(1)])(['a', 'b'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });
    await expect(reply([[]])(['a'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });
    await expect(reply(['not a row'])(['a'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });
    await expect(reply([row, 7])(['a', 'b'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });
    await expect(reply([[1, 'x', 3]])(['a'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });
    await expect(reply([[1, null, 3]])(['a'])).rejects.toMatchObject({ reason: 'reply-not-a-vector' });

    const defaultModel = ollamaEmbedder({
      baseUrl: 'http://127.0.0.1:9',
      model: OLLAMA_EMBEDDING_MODEL,
      fetchImpl: async () => new Response(JSON.stringify({ embeddings: [row] }), { status: 200 }),
    });
    // The frozen width applies only where the frozen file is read: the live default
    // model is 1024 wide, and a 1024 row is a vector.
    await expect(defaultModel(['a'])).resolves.toEqual([row]);
  });

  it('the live Ollama default is qwen3-embedding:0.6b, the model of the ONNX default', () => {
    expect(OLLAMA_EMBEDDING_MODEL).toBe('qwen3-embedding:0.6b');
  });

  it('names the in-process reasons', () => {
    expect(new EmbeddingUnavailable('library-not-installed').message).toBe('the embedding library is not installed');
    expect(new EmbeddingUnavailable('model-not-cached').message).toBe(
      'the model is not in the local cache, and the download is not allowed or failed',
    );
    expect(new EmbeddingUnavailable('session-failed').message).toBe('the ONNX session did not load');
  });
});

describe('canonicalRetrievalCorpus: residual form', () => {
  const op = (o: '-' | '*', ...args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args }) as ExprNode;
  const claim = op('-', sym('F', dim(1, 1, -2)), op('*', sym('m', dim(0, 1, 0)), sym('a', dim(1, 0, -2))));
  const wrong = op('-', sym('F', dim(1, 1, -2)), op('*', sym('m', dim(0, 1, 0)), sym('v', dim(1, 0, -1))));
  // Ids of the corpus records whose key equals the key of the query expression.
  const hits = (expr: ExprNode): string[] =>
    canonicalRetrievalCorpus()
      .filter((r) => r.expr && leakageKey(r.expr) === leakageKey(expr))
      .map((r) => r.id);

  it('ranks the matching entry first by structure, with equal keys', () => {
    // The claim names its target F; the registry names it force. The names differ,
    // so only the structural tier ranks the entry first.
    const corpus = canonicalRetrievalCorpus();
    const ranked = rankByStructure({ text: 'F = m a', expr: claim }, corpus);
    expect(ranked[0]).toBe('CE-newton-second-law');
    const record = corpus.find((r) => r.id === 'CE-newton-second-law')!;
    expect(leakageKey(record.expr!)).toBe(leakageKey(claim));
    expect(rankBySymbolOverlap({ text: '', expr: claim }, corpus)[0]).not.toBe('CE-newton-second-law');
  });

  it('control: the claim key-matches its entry and a wrong relation key-matches none (keys are NOT unique corpus-wide: four pairs collide)', () => {
    expect(hits(claim)).toEqual(['CE-newton-second-law']);
    expect(hits(wrong)).toEqual([]);
  });

  it('wiring: retrieveHybrid, the public entry point, accepts the matching entry first', async () => {
    const out = await retrieveHybrid({ query: { text: 'F = m a', expr: claim }, corpus: canonicalRetrievalCorpus() });
    expect(out.accepted[0]).toBe('CE-newton-second-law');
    expect(out.embeddings).toBe('not-requested');
  });

  it('every record is target - scalarAst, or target - monomial when the entry has no scalarAst', () => {
    const corpus = canonicalRetrievalCorpus();
    let withAst = 0;
    for (const entry of CANONICAL_EQUATIONS) {
      if (entry.scalarAst === undefined) continue;
      withAst++;
      const expr = corpus.find((r) => r.id === entry.id)!.expr!;
      expect(expr.kind).toBe('op');
      if (expr.kind !== 'op') continue;
      expect(expr.op).toBe('-');
      const target = entry.dimensional.target;
      expect(expr.args[0]).toEqual({ kind: 'symbol', name: target.name, dim: target.dim });
      expect(expr.args[1]).toBe(entry.scalarAst);
    }
    expect(withAst).toBeGreaterThan(0);
  });

  it('census: an entry has an expr key exactly when it has a scalarAst or a monomial', () => {
    const corpus = canonicalRetrievalCorpus();
    const missing = corpus.filter((r) => r.expr === undefined).map((r) => r.id);
    const neither = CANONICAL_EQUATIONS.filter((e) => e.scalarAst === undefined && e.dimensional.monomial === null).map((e) => e.id);
    expect(missing.sort()).toEqual(neither.sort());
  });

  it('a monomial record is target - product of governing^exponent: same symbols, same exponents, valid dimension', () => {
    const corpus = canonicalRetrievalCorpus();
    const monomialOnly = CANONICAL_EQUATIONS.filter((e) => e.scalarAst === undefined && e.dimensional.monomial !== null);
    expect(monomialOnly.length).toBeGreaterThan(0);
    for (const entry of monomialOnly) {
      const expr = corpus.find((r) => r.id === entry.id)!.expr!;
      if (expr.kind !== 'op' || expr.op !== '-') throw new Error(`${entry.id}: not a residual`);
      expect(expr.args[0]).toEqual({ kind: 'symbol', name: entry.dimensional.target.name, dim: entry.dimensional.target.dim });
      const exponents: Record<string, number> = {};
      const walk = (n: ExprNode): void => {
        if (n.kind === 'symbol') exponents[n.name] = 1;
        else if (n.kind === 'op' && n.op === '*') n.args.forEach(walk);
        else if (n.kind === 'op' && n.op === '^') {
          const [b, x] = n.args;
          if (b!.kind !== 'symbol' || x!.kind !== 'symbol') throw new Error(`${entry.id}: bad power`);
          exponents[b.name] = Number(x.name);
        } else throw new Error(`${entry.id}: unexpected node`);
      };
      walk(expr.args[1]!);
      const expected = Object.fromEntries(Object.entries(entry.dimensional.monomial!).filter(([, v]) => v !== 0));
      expect(exponents, entry.id).toEqual(expected);
      expect(validate(expr).ok, entry.id).toBe(true);
    }
  });

  it('fractional exponents render: fermi energy and velocity validate', () => {
    for (const id of ['CE-fermi-energy', 'CE-fermi-velocity']) {
      const r = canonicalRetrievalCorpus().find((x) => x.id === id)!;
      expect(r.expr, id).toBeDefined();
      expect(validate(r.expr!).ok, id).toBe(true);
    }
  });

  describe('README pendulum query', () => {
    const pendulum = 'CE-pendulum-period';
    const T = sym('T', dim(0, 0, 1));
    const L = sym('L', dim(1));
    const g = sym('g', dim(1, 0, -2));
    const relation = (rhs: ExprNode): ExprNode => ({ kind: 'op', op: '-', args: [T, rhs] }) as ExprNode;
    const times = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '*', args: [a, b] }) as ExprNode;
    // Retype the dimensionless stubs the parser makes, so a parsed claim carries the dimensions of its names.
    const retype = (n: ExprNode): ExprNode => {
      const dims: Record<string, ReturnType<typeof dim>> = { T: dim(0, 0, 1), L: dim(1), g: dim(1, 0, -2) };
      if (n.kind === 'symbol') return n.name in dims ? { ...n, dim: dims[n.name]! } : n;
      if (n.kind === 'op') return { ...n, args: n.args.map(retype) };
      return n;
    };
    const parsed = (rhs: string): ExprNode => relation(retype(parseCatalogExpression(rhs)));
    const record = (): CorpusRecord => canonicalRetrievalCorpus().find((r) => r.id === pendulum)!;

    it('a claim in the record form T = L^0.5 * g^-0.5 ranks CE-pendulum-period first by structure', () => {
      const q = relation(times(symbolPower(L, 0.5), symbolPower(g, -0.5)));
      expect(rankByStructure({ text: '', expr: q }, canonicalRetrievalCorpus())[0]).toBe(pendulum);
    });

    it('control: the inverted relation T = L^-0.5 * g^0.5 does not key-match CE-pendulum-period', () => {
      const q = relation(times(symbolPower(L, -0.5), symbolPower(g, 0.5)));
      expect(leakageKey(record().expr!)).not.toBe(leakageKey(q));
    });

    it('the key drops the constant: 2*pi*sqrt(L/g) and sqrt(L/g) have one key', () => {
      expect(leakageKey(parsed('2*pi*sqrt(L/g)'))).toBe(leakageKey(parsed('sqrt(L/g)')));
    });

    // KNOWN GAP, not fixed here: the key does not rewrite (L/g)^0.5 as L^0.5 * g^-0.5, so the README
    // formula as a user writes it does not key-match, although its relation is the same. The gap is in
    // `normalForm`, not in the corpus. This test records it, and it must change when `normalForm` does.
    it('known gap: the README formula as parsed does not key-match the record', () => {
      expect(leakageKey(parsed('2*pi*sqrt(L/g)'))).not.toBe(leakageKey(record().expr!));
    });
  });

  it('key collisions corpus-wide are recorded (COLLISION_COUNT_AFTER)', () => {
    const byKey = new Map<string, string[]>();
    for (const r of canonicalRetrievalCorpus()) {
      if (r.expr === undefined) continue;
      const k = leakageKey(r.expr);
      byKey.set(k, [...(byKey.get(k) ?? []), r.id]);
    }
    const groups = [...byKey.values()].filter((g) => g.length > 1);
    expect(groups.map((g) => g.length)).toEqual(COLLISION_GROUP_SIZES_AFTER);
  });
});
