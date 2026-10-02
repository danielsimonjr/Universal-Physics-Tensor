/**
 * One internal chain record. The order key and the rendered kind are
 * both functions of that record. Before the record existed, this file
 * failed on import: `chainOrderKey` was not an export.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderChainRecord } from '../../src/atlas/chain-pipeline.js';
import {
  chainOrderKey,
  orderChainRecords,
  type ChainRecord,
} from '../../src/composition/chain-result.js';
import { REGIME_MISMATCH_KIND } from '../../src/composition/chain-regime.js';

const HERE = dirname(fileURLToPath(import.meta.url));

const confirmation: ChainRecord = {
  edgeIds: ['be-a', 'be-b'],
  classification: { kind: 'confirmation', catalogId: 12, edgeIds: ['be-a', 'be-b'] },
  theorem: 'PhysJS.Dimensional.monomial_form',
  mismatch: undefined,
};

const restatement: ChainRecord = {
  edgeIds: ['be-c', 'be-d'],
  classification: {
    kind: 'restatement',
    canonicalId: 'CE-landauer',
    restatesBridge: '16',
    edgeIds: ['be-c', 'be-d'],
  },
  theorem: null,
  mismatch: undefined,
};

const monomial: ChainRecord = {
  edgeIds: ['be-e', 'be-f'],
  classification: { kind: 'provisional', id: 'chain-be-e-be-f', edgeIds: ['be-e', 'be-f'] },
  theorem: 'PhysJS.Dimensional.monomial_form',
  mismatch: undefined,
};

const unfixed: ChainRecord = {
  edgeIds: ['be-g', 'be-h'],
  classification: { kind: 'provisional', id: 'chain-be-g-be-h', edgeIds: ['be-g', 'be-h'] },
  theorem: 'PhysJS.Dimensional.product_shape',
  mismatch: undefined,
};

const rejected: ChainRecord = {
  edgeIds: ['be-63', 'be-12'],
  classification: { kind: 'provisional', id: 'chain-be-63-be-12', edgeIds: ['be-63', 'be-12'] },
  theorem: null,
  mismatch: {
    kind: REGIME_MISMATCH_KIND,
    edgeIds: ['be-63', 'be-12'],
    quantity: 'mass',
    reasons: ['domain: information-geometry ≠ quantum-classical'],
  },
};

const STUB_THEOREMS = ['PhysJS.Fixture.left', 'PhysJS.Fixture.right'] as const;

function renderedAgrees(record: ChainRecord): boolean {
  const rendered = renderChainRecord(record, STUB_THEOREMS).kind;
  const key = chainOrderKey(record);
  if (
    record.mismatch !== undefined &&
    record.classification.kind !== 'confirmation' &&
    record.classification.kind !== 'restatement'
  ) {
    return rendered === REGIME_MISMATCH_KIND;
  }
  if (key === 'confirmation') return rendered === 'confirmation';
  if (key === 'restatement') return rendered === 'restatement';
  return rendered === 'stub';
}

describe('one internal chain record', () => {
  it('a confirmation orders as confirmation and renders as confirmation', () => {
    expect(chainOrderKey(confirmation)).toBe('confirmation');
    expect(renderChainRecord(confirmation)).toEqual({
      kind: 'confirmation',
      catalogId: 12,
      edgeIds: ['be-a', 'be-b'],
    });
    expect(renderedAgrees(confirmation)).toBe(true);
  });

  it('a confirmation still renders as confirmation when a mismatch is attached', () => {
    const skipped: ChainRecord = {
      ...confirmation,
      mismatch: rejected.mismatch,
    };
    expect(chainOrderKey(skipped)).toBe('confirmation');
    expect(renderChainRecord(skipped).kind).toBe('confirmation');
  });

  it('a restatement orders as restatement and renders as restatement', () => {
    expect(chainOrderKey(restatement)).toBe('restatement');
    expect(renderChainRecord(restatement).kind).toBe('restatement');
    expect(renderedAgrees(restatement)).toBe(true);
  });

  it('a monomial provisional orders as a unique monomial and renders as a stub', () => {
    expect(chainOrderKey(monomial)).toBe('unique-monomial');
    const rendered = renderChainRecord(monomial, STUB_THEOREMS);
    expect(rendered.kind).toBe('stub');
    expect(renderedAgrees(monomial)).toBe(true);
    if (rendered.kind === 'stub') {
      expect(rendered.id).toBe('chain-be-e-be-f');
      expect(rendered.text.length).toBeGreaterThan(0);
    }
  });

  it('any other provisional orders as an unfixed shape and renders as a stub', () => {
    expect(chainOrderKey(unfixed)).toBe('unfixed-shape');
    expect(renderChainRecord(unfixed, STUB_THEOREMS).kind).toBe('stub');
    expect(renderedAgrees(unfixed)).toBe(true);
  });

  it('a regime mismatch renders as a rejection and is not a stub', () => {
    expect(renderChainRecord(rejected).kind).toBe(REGIME_MISMATCH_KIND);
    expect(renderedAgrees(rejected)).toBe(true);
    expect(renderChainRecord(rejected)).toEqual(rejected.mismatch);
  });

  it('the order key sorts a confirmation ahead of an unfixed shape', () => {
    const ordered = orderChainRecords([unfixed, confirmation]);
    expect(ordered.map(chainOrderKey)).toEqual(['confirmation', 'unfixed-shape']);
  });

  it('the pipeline no longer has a separate toCandidate and emit', () => {
    const source = readFileSync(resolve(HERE, '../../src/atlas/chain-pipeline.ts'), 'utf8');
    expect(source).not.toContain('function toCandidate');
    expect(source).not.toContain('function emit(');
    const index = readFileSync(resolve(HERE, '../../src/index.ts'), 'utf8');
    expect(index).not.toContain('ChainRecord');
    expect(index).not.toContain('renderChainRecord');
  });
});
