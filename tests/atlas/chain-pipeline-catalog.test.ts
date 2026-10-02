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
import { runChainPipeline } from '../../src/atlas/chain-pipeline.js';

const SNAPSHOT: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL('./chain-pipeline-catalog.golden.json', import.meta.url)), 'utf8'),
);

describe('runChainPipeline(CATALOG_GRAPH)', () => {
  const before = BRIDGE_EQUATIONS.map((row) => row.id);
  const result = runChainPipeline(CATALOG_GRAPH);

  it('leaves the catalog array unchanged', () => {
    expect(BRIDGE_EQUATIONS.map((row) => row.id)).toEqual(before);
    expect(BRIDGE_EQUATIONS).toHaveLength(55);
  });

  it('matches the recorded confirmations, restatements, and stubs', () => {
    expect(result).toEqual(SNAPSHOT);
    const confirmations = result.filter((row) => row.kind === 'confirmation');
    const restatements = result.filter((row) => row.kind === 'restatement');
    const stubs = result.filter((row) => row.kind === 'stub');
    expect(confirmations).toEqual([]);
    expect(restatements).toEqual([]);
    expect(stubs.map((row) => row.id)).toEqual(['chain-be-63-be-12', 'chain-be-63-be-37']);
  });
});
