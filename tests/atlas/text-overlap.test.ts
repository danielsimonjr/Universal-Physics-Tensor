/**
 * `atlas/text-overlap`: the text predictor's word tokens, Jaccard score and rank order, read by
 * link prediction. Link prediction's tests reach them only through the leave-one-out score; this
 * file tests them directly against hand-computed cases, including the tie order.
 */
import { describe, expect, it } from 'vitest';
import { jaccard, rankBy, tokens } from '../../src/atlas/text-overlap.js';

const set = (...xs: string[]): Set<string> => new Set(xs);

describe('tokens', () => {
  it('lower-cases, splits on every non-letter non-digit run, and keeps a set', () => {
    expect(tokens('Hello, World! hello  42-x')).toEqual(set('hello', 'world', '42', 'x'));
    expect(tokens('k_B·T/e')).toEqual(set('k', 'b', 't', 'e'));
  });

  it('keeps non-ASCII letters inside a word (Unicode letter class, not [a-z])', () => {
    expect(tokens("Schrödinger's café, Γ-point")).toEqual(set('schrödinger', 's', 'café', 'γ', 'point'));
  });

  it('an empty or all-punctuation text has no tokens', () => {
    expect(tokens('').size).toBe(0);
    expect(tokens(' -- , ').size).toBe(0);
  });
});

describe('jaccard', () => {
  it('is |a ∩ b| / |a ∪ b|: {a,b,c} and {b,c,d} share 2 of 4', () => {
    expect(jaccard(set('a', 'b', 'c'), set('b', 'c', 'd'))).toBe(0.5);
    expect(jaccard(set('a'), set('a', 'b', 'c'))).toBe(1 / 3);
    expect(jaccard(set('x', 'y'), set('x', 'y'))).toBe(1);
    expect(jaccard(set('x'), set('y'))).toBe(0);
  });

  it('is symmetric, and 0 when either or both sets are empty', () => {
    expect(jaccard(set('a', 'b', 'c', 'd'), set('d', 'e'))).toBe(jaccard(set('d', 'e'), set('a', 'b', 'c', 'd')));
    expect(jaccard(set('d', 'e'), set('a', 'b', 'c', 'd'))).toBe(1 / 5);
    expect(jaccard(set(), set())).toBe(0);
    expect(jaccard(set('a'), set())).toBe(0);
  });

  it('control: it is not the Dice coefficient 2|a ∩ b|/(|a| + |b|), which gives 2/3 on the first case', () => {
    const a = set('a', 'b', 'c');
    const b = set('b', 'c', 'd');
    expect(jaccard(a, b)).not.toBe((2 * 2) / (a.size + b.size));
  });
});

describe('rankBy', () => {
  const scores: Record<string, readonly number[]> = {
    a: [1, 0],
    b: [1, 2],
    B: [1, 2],
    c: [0, 5],
    Z: [1, 0],
  };
  const score = (id: string): readonly number[] => scores[id]!;

  it('orders by descending score list, lexicographically (the first entry decides before the second)', () => {
    expect(rankBy(['c', 'a', 'b'], score)).toEqual(['b', 'a', 'c']);
  });

  it('breaks a tie by ascending codepoint id: B before b, Z before a (not locale order)', () => {
    expect(rankBy(['b', 'a', 'B', 'Z', 'c'], score)).toEqual(['B', 'b', 'Z', 'a', 'c']);
    // Control: a locale order would put the lower-case letter first in both pairs.
    expect(['b', 'B'].sort((x, y) => x.localeCompare(y, 'en'))).toEqual(['b', 'B']);
  });

  it('is independent of input order and does not mutate its input', () => {
    const want = ['B', 'b', 'Z', 'a', 'c'];
    const perms = [
      ['a', 'b', 'B', 'c', 'Z'],
      ['Z', 'c', 'B', 'b', 'a'],
      ['c', 'Z', 'a', 'B', 'b'],
    ];
    for (const p of perms) {
      const before = [...p];
      expect(rankBy(p, score)).toEqual(want);
      expect(p).toEqual(before);
    }
  });
});
