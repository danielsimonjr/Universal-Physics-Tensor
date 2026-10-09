/**
 * Atlas Phase 5, S5.3 — the deterministic baselines, recall@k, and the
 * out-of-process response parser. Synthetic in-memory records only.
 */

import { describe, expect, it } from 'vitest';
import {
  rankBySymbolOverlap,
  rankByStructure,
  rankByTextOverlap,
  recallAtK,
} from '../../src/atlas/benchmark/baselines.js';
import type { CorpusRecord } from '../../src/atlas/benchmark/baselines.js';
import { parseBackendResponse } from '../../src/atlas/benchmark/backend-shapes.js';
import type { BenchmarkBackendRequest } from '../../src/atlas/benchmark/backend-shapes.js';
import { dim, sym } from '../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';

const L = dim(1);
const T = dim(0, 0, 1);
const div = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [a, b] });

const CORPUS: CorpusRecord[] = [
  { id: 'r-speed', text: 'speed is distance over time', expr: div(sym('x', L), sym('t', T)) },
  { id: 'r-freq', text: 'frequency is one over the period', expr: div(sym('1', dim()), sym('P', T)) },
  { id: 'r-empty', text: 'unrelated heat capacity statement' },
];

describe('rankByTextOverlap', () => {
  it('puts the record sharing the most words first', () => {
    expect(rankByTextOverlap({ text: 'distance over time gives speed' }, CORPUS)[0]).toBe('r-speed');
  });

  it('breaks ties by id, never by input order', () => {
    const a = rankByTextOverlap({ text: 'nothing matches' }, CORPUS);
    const b = rankByTextOverlap({ text: 'nothing matches' }, [...CORPUS].reverse());
    expect(a).toEqual(b);
    expect(a).toEqual(['r-empty', 'r-freq', 'r-speed']);
  });
});

describe('rankBySymbolOverlap vs rankByStructure — renamed variables', () => {
  const renamed = { text: 'q', expr: div(sym('y', L), sym('s', T)) };

  it('symbol matching MISSES a renamed claim (no shared names)', () => {
    const r = rankBySymbolOverlap(renamed, CORPUS);
    expect(r[0]).not.toBe('r-speed');
  });

  it('typed structural search FINDS it (dimension-renamed normal form)', () => {
    expect(rankByStructure(renamed, CORPUS)[0]).toBe('r-speed');
  });
});

describe('recallAtK', () => {
  const truth = new Map([
    ['q1', ['a']],
    ['q2', ['b']],
  ]);

  it('counts a hit when a correct reference is inside the top k', () => {
    const rankings = new Map([
      ['q1', ['a', 'x']],
      ['q2', ['x', 'y', 'b']],
    ]);
    expect(recallAtK(rankings, truth, 2)).toBe(0.5);
    expect(recallAtK(rankings, truth, 3)).toBe(1);
  });

  it('a query with NO ranking is a miss in the denominator, not a dropped query', () => {
    expect(recallAtK(new Map([['q1', ['a']]]), truth, 10)).toBe(0.5);
  });

  it('an answer key with no correct reference is an error, not a silent zero', () => {
    expect(() => recallAtK(new Map(), new Map([['q', []]]))).toThrow(/no correct reference/);
  });

  it('an empty truth set yields NaN, not a flattering number', () => {
    expect(Number.isNaN(recallAtK(new Map(), new Map()))).toBe(true);
  });
});

describe('parseBackendResponse — a malformed answer is an ERROR, never a default', () => {
  const classify: BenchmarkBackendRequest = {
    itemId: 'i1',
    task: 'classify',
    premises: ['p'],
    conclusion: 'c',
    claimedRelation: 'derivation',
    budgetMs: 1000,
  };
  const retrieve: BenchmarkBackendRequest = { ...classify, task: 'retrieve', corpusIds: ['a', 'b'] };

  it('accepts a well-formed classify and retrieve response', () => {
    expect(parseBackendResponse(classify, { itemId: 'i1', outcome: 'reject' })).toEqual({ itemId: 'i1', outcome: 'reject' });
    expect(parseBackendResponse(retrieve, { itemId: 'i1', ranking: ['b', 'a'] })).toEqual({ itemId: 'i1', ranking: ['b', 'a'] });
  });

  it('returns only the validated fields: an extra field on the reply is not carried through', () => {
    expect(parseBackendResponse(classify, { itemId: 'i1', outcome: 'reject', note: 'kept?' })).toEqual({ itemId: 'i1', outcome: 'reject' });
    expect(parseBackendResponse(retrieve, { itemId: 'i1', ranking: ['b'], outcomeHint: 1 })).toEqual({ itemId: 'i1', ranking: ['b'] });
  });

  it('rejects a missing outcome rather than reading it as abstain', () => {
    expect(parseBackendResponse(classify, { itemId: 'i1' })).toHaveProperty('error');
  });

  it('rejects a wrong item id, an id outside the corpus, and a repeated id', () => {
    expect(parseBackendResponse(classify, { itemId: 'other', outcome: 'accept' })).toHaveProperty('error');
    expect(parseBackendResponse(retrieve, { itemId: 'i1', ranking: ['z'] })).toHaveProperty('error');
    expect(parseBackendResponse(retrieve, { itemId: 'i1', ranking: ['a', 'a'] })).toHaveProperty('error');
  });
});
