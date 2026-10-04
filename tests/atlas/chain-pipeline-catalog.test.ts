/**
 * `runChainPipeline(CATALOG_GRAPH)` on the catalog graph.
 *
 * The list is whatever the pipeline returns. A change in that list fails
 * this file. The catalog array is compared to itself before and after the
 * call: the pipeline does not write it.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { enumerateCompositions } from '../../src/composition/enumerate.js';
import {
  categoryCompositionForChain,
  runChainPipeline,
  type ChainStubRecord,
} from '../../src/atlas/chain-pipeline.js';
import { bridgeSeedKeys } from '../../src/atlas/physjs-ref.js';

const SNAPSHOT: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL('./chain-pipeline-catalog.golden.json', import.meta.url)), 'utf8'),
);

describe('runChainPipeline(CATALOG_GRAPH)', () => {
  const before = BRIDGE_EQUATIONS.map((row) => row.id);
  const result = runChainPipeline(CATALOG_GRAPH);

  it('leaves the catalog array unchanged', () => {
    expect(BRIDGE_EQUATIONS.map((row) => row.id)).toEqual(before);
    expect(BRIDGE_EQUATIONS).toHaveLength(66);
  });

  it('matches the recorded confirmations, restatements, and stubs', () => {
    expect(result).toEqual(SNAPSHOT);
    const confirmations = result.filter((row) => row.kind === 'confirmation');
    const restatements = result.filter((row) => row.kind === 'restatement');
    const stubs = result.filter((row): row is ChainStubRecord => row.kind === 'stub');
    expect(confirmations).toEqual([]);
    expect(restatements).toEqual([]);
    expect(stubs.map((row) => row.id)).toEqual(['chain-be-74-be-76']);
    expect(stubs[0]?.text).toContain('-- not a formalRef');
    expect(stubs[0]?.text).toContain('leanProof": "absent"');
    const rejected = result.filter((row) => row.kind === 'rejected: regime mismatch');
    expect(rejected.map((row) => row.edgeIds)).toEqual([
      ['be-63', 'be-12'],
      ['be-63', 'be-37'],
    ]);
  });

  it('still proposes the rejected pairs as proof targets', () => {
    const seeded = enumerateCompositions(CATALOG_GRAPH, { seedIds: new Set(bridgeSeedKeys()) });
    const pairs = seeded.proofTargets.map((target) => [target.first.id, target.second.id]);
    expect(pairs).toEqual(
      expect.arrayContaining([
        ['be-63', 'be-12'],
        ['be-63', 'be-37'],
      ]),
    );
  });

  it('records an unset category claim and one provisional stub', () => {
    const seeded = enumerateCompositions(CATALOG_GRAPH, { seedIds: new Set(bridgeSeedKeys()) });
    for (const target of seeded.proofTargets) {
      expect(categoryCompositionForChain(target.first, target.second)).toBeUndefined();
    }
    const stubs = result.filter((row): row is ChainStubRecord => row.kind === 'stub');
    expect(stubs.map((row) => row.edgeIds)).toEqual([['be-74', 'be-76']]);
  });
});
