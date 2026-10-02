/**
 * Step 8 of the bridge-discovery pipeline: a total order on chain
 * candidates. The fixture's edge ids are chosen so a length-then-lex
 * sort, and a sort with any two adjacent classes swapped, both miss
 * the required class order.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  orderChainCandidates,
  type ChainCandidate,
  type ChainCandidateKind,
} from '../../src/composition/chain-candidate.js';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = resolve(root, 'src/composition/chain-candidate.ts');

const REQUIRED: readonly ChainCandidateKind[] = [
  'confirmation',
  'restatement',
  'unique-monomial',
  'unfixed-shape',
];

/** Longest and lex-last first, so class is the only key that yields REQUIRED. */
const confirmation: ChainCandidate = {
  kind: 'confirmation',
  edgeIds: ['z', 'z', 'z'],
  catalogId: 12,
  id: 'ignored-confirmation',
};
const restatement: ChainCandidate = {
  kind: 'restatement',
  edgeIds: ['z', 'z'],
  canonicalId: 'CE-landauer',
  restatesBridge: '16',
};
const uniqueMonomial: ChainCandidate = {
  kind: 'unique-monomial',
  edgeIds: ['z'],
  theorem: 'PhysJS.Dimensional.monomial_form',
};
const unfixedShape: ChainCandidate = {
  kind: 'unfixed-shape',
  edgeIds: ['a'],
  theorem: 'PhysJS.Dimensional.ratio_shape',
};

const FOUR: readonly ChainCandidate[] = [
  unfixedShape,
  uniqueMonomial,
  restatement,
  confirmation,
];

function compareEdgeIds(left: readonly string[], right: readonly string[]): number {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  for (let i = 0; i < left.length; i++) {
    const a = left[i] as string;
    const b = right[i] as string;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}

function kindsWithClassSwap(
  candidates: readonly ChainCandidate[],
  swap: readonly [ChainCandidateKind, ChainCandidateKind],
): ChainCandidateKind[] {
  const order = [...REQUIRED];
  const i = order.indexOf(swap[0]);
  const j = order.indexOf(swap[1]);
  const tmp = order[i] as ChainCandidateKind;
  order[i] = order[j] as ChainCandidateKind;
  order[j] = tmp;
  return [...candidates]
    .sort((a, b) => {
      const byClass = order.indexOf(a.kind) - order.indexOf(b.kind);
      if (byClass !== 0) return byClass < 0 ? -1 : 1;
      return compareEdgeIds(a.edgeIds, b.edgeIds);
    })
    .map((c) => c.kind);
}

describe('orderChainCandidates', () => {
  it('sorts one candidate of each class as confirmation, restatement, unique monomial, unfixed shape', () => {
    const ordered = orderChainCandidates(FOUR);
    expect(ordered.map((c) => c.kind)).toEqual([...REQUIRED]);
    expect(ordered[0]).toBe(confirmation);
    expect(ordered[1]).toBe(restatement);
    expect(ordered[2]).toBe(uniqueMonomial);
    expect(ordered[3]).toBe(unfixedShape);
  });

  it('control: swapping two adjacent classes fails this fixture', () => {
    const adjacent: readonly (readonly [ChainCandidateKind, ChainCandidateKind])[] = [
      ['confirmation', 'restatement'],
      ['restatement', 'unique-monomial'],
      ['unique-monomial', 'unfixed-shape'],
    ];
    for (const pair of adjacent) {
      expect(kindsWithClassSwap(FOUR, pair)).not.toEqual([...REQUIRED]);
    }
  });

  it('control: length then edge-id order is not the class order on this fixture', () => {
    const byLength = [...FOUR]
      .sort((a, b) => compareEdgeIds(a.edgeIds, b.edgeIds))
      .map((c) => c.kind);
    expect(byLength).toEqual([
      'unfixed-shape',
      'unique-monomial',
      'restatement',
      'confirmation',
    ]);
    expect(byLength).not.toEqual([...REQUIRED]);
  });

  it('puts a shorter chain before a longer one inside one class', () => {
    const longer: ChainCandidate = {
      kind: 'confirmation',
      edgeIds: ['a', 'b'],
      catalogId: 1,
    };
    const shorter: ChainCandidate = {
      kind: 'confirmation',
      edgeIds: ['z'],
      catalogId: 99,
    };
    const ordered = orderChainCandidates([longer, shorter]);
    expect(ordered.map((c) => c.edgeIds)).toEqual([['z'], ['a', 'b']]);
    expect(ordered[0]).toBe(shorter);
    expect(ordered[1]).toBe(longer);
  });

  it('compares equal-length edge ids from the left', () => {
    const az: ChainCandidate = {
      kind: 'restatement',
      edgeIds: ['a', 'z'],
      canonicalId: 'CE-a',
      restatesBridge: '1',
    };
    const ba: ChainCandidate = {
      kind: 'restatement',
      edgeIds: ['b', 'a'],
      canonicalId: 'CE-b',
      restatesBridge: '2',
    };
    expect(orderChainCandidates([ba, az]).map((c) => c.edgeIds)).toEqual([
      ['a', 'z'],
      ['b', 'a'],
    ]);
  });

  it('lets length beat lexicographic order, so b precedes a,a', () => {
    const single: ChainCandidate = { kind: 'unique-monomial', edgeIds: ['b'] };
    const pair: ChainCandidate = { kind: 'unique-monomial', edgeIds: ['a', 'a'] };
    expect(orderChainCandidates([pair, single]).map((c) => c.edgeIds)).toEqual([
      ['b'],
      ['a', 'a'],
    ]);
  });

  it('keeps input order when class and edge ids agree, and does not mutate the input', () => {
    const first: ChainCandidate = {
      kind: 'unfixed-shape',
      edgeIds: ['e'],
      theorem: 'PhysJS.Dimensional.product_shape',
      id: 'chain-e',
    };
    const second: ChainCandidate = {
      kind: 'unfixed-shape',
      edgeIds: ['e'],
      theorem: 'PhysJS.Dimensional.ratio_power_invariant',
      id: 'chain-e-other',
    };
    const input = [second, first];
    const before = [...input];
    const ordered = orderChainCandidates(input);
    expect(input).toEqual(before);
    expect(ordered).not.toBe(input);
    expect(ordered[0]).toBe(second);
    expect(ordered[1]).toBe(first);
    expect(ordered.every((c) => !Object.hasOwn(c, 'evidence'))).toBe(true);
    expect(ordered.every((c) => !Object.hasOwn(c, 'score'))).toBe(true);
  });

  it('imports nothing and does not name a ranker or a numeric field', () => {
    const source = readFileSync(sourcePath, 'utf8');
    expect(scanFileImports(source)).toEqual([]);
    for (const word of [
      'rankDiscoveries',
      'bridgePriority',
      'link-prediction',
      'embedder',
      'probe',
      'score',
      'deriveEvidence',
      'evidence',
    ]) {
      expect(source.includes(word), word).toBe(false);
    }
  });
});
