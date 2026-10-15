/**
 * The four-class order of a chain candidate has one owner: `chainClassIndex`
 * in `chain-candidate.ts`. `chain-result.ts` once carried its own copy of the
 * same switch; two copies of one order can drift apart.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { chainClassIndex, orderChainCandidates } from '../../src/composition/chain-candidate.js';
import type { ChainCandidateKind } from '../../src/composition/chain-candidate.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('chainClassIndex', () => {
  it('is the order confirmation < restatement < unique-monomial < unfixed-shape', () => {
    const kinds: ChainCandidateKind[] = ['confirmation', 'restatement', 'unique-monomial', 'unfixed-shape'];
    expect(kinds.map(chainClassIndex)).toEqual([0, 1, 2, 3]);
  });

  it('is what orderChainCandidates sorts by', () => {
    const ordered = orderChainCandidates([
      { kind: 'unfixed-shape', edgeIds: ['a'] },
      { kind: 'confirmation', edgeIds: ['b'] },
      { kind: 'unique-monomial', edgeIds: ['c'] },
      { kind: 'restatement', edgeIds: ['d'] },
    ]);
    expect(ordered.map((c) => chainClassIndex(c.kind))).toEqual([0, 1, 2, 3]);
  });

  it('chain-result.ts has no copy of its own', () => {
    const source = readFileSync(resolve(root, 'src/composition/chain-result.ts'), 'utf8');
    expect(source).not.toMatch(/function classIndex\(/);
    expect(source).toMatch(/chainClassIndex/);
  });
});
