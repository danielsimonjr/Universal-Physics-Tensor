/**
 * A caller-supplied seed set restricts symbolic enumeration.
 * `enumerate.ts` does not import `atlas/`.
 *
 * Before the seed check, `outsider` composed with `seed-a` and appeared
 * in the report. The control below fails if that check is deleted.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import {
  enumerateCompositions,
  REGISTERED_COMPOSITION_IDS,
} from '../../src/composition/enumerate.js';
import {
  be11ZurekEdge,
  be12Edge,
  be16Edge,
  be37Edge,
  be42Edge,
  be42ViaRsEdge,
  be51Edge,
  be52Edge,
  lawSchwarzschildRadius,
} from '../../src/composition/index.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';

const q = (name: string): Quantity => ({
  name,
  symbol: name,
  dim: DIMENSIONLESS,
  attributes: {},
});

function scalar(id: string, source: string, target: string, symbolic: boolean): BridgeEdge {
  const form: ExprNode | undefined = symbolic ? sym(source, DIMENSIONLESS) : undefined;
  return {
    id,
    beId: null,
    kind: 'bridge',
    label: id,
    sources: [q(source)],
    target: q(target),
    confidence: 'established',
    domain: { description: 'any', predicate: () => true },
    citation: 'synthetic',
    evaluate: (inputs) => inputs[source]!,
    ...(form !== undefined ? { symbolic: form } : {}),
  };
}

const seedA = scalar('seed-a', 'x', 'mid', true);
const seedB = scalar('seed-b', 'mid', 'out', true);
const seedNumeric = scalar('seed-numeric', 'mid', 'out-numeric', false);
const outsider = scalar('outsider', 'mid', 'out-other', true);

const EDGES = [seedA, seedB, seedNumeric, outsider];
const SEEDS = new Set(['seed-a', 'seed-b', 'seed-numeric']);

function mentioned(report: ReturnType<typeof enumerateCompositions>): string[] {
  return [
    ...report.all.flatMap((candidate) => [candidate.first.id, candidate.second.id, candidate.edge.id]),
    ...report.registered.flatMap((candidate) => [candidate.first.id, candidate.second.id]),
    ...report.novel.flatMap((candidate) => [candidate.first.id, candidate.second.id]),
    ...report.requiresDisposition.flatMap((pending) => [pending.first.id, pending.second.id, pending.composedId]),
    ...report.proofTargets.flatMap((target) => [target.first.id, target.second.id]),
    ...report.notSubstitutable.flatMap((pair) => [pair.first.id, pair.second.id]),
  ];
}

describe('seed-filtered symbolic enumeration', () => {
  it('does not import atlas', () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../src/composition/enumerate.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/from ['"][^'"]*atlas/);
  });

  it('the default call, with no seed set, keeps the registered pairs', () => {
    const report = enumerateCompositions([
      be11ZurekEdge,
      be12Edge,
      be16Edge,
      be37Edge,
      be42Edge,
      be42ViaRsEdge,
      be51Edge,
      be52Edge,
      lawSchwarzschildRadius,
    ]);
    const found = new Set(report.all.map((candidate) => candidate.edge.id));
    for (const id of REGISTERED_COMPOSITION_IDS) {
      expect(found.has(id), id).toBe(true);
    }
    expect(report.registered).toHaveLength(REGISTERED_COMPOSITION_IDS.size);
    expect(report.proofTargets).toEqual([]);
    expect(report.notSubstitutable).toEqual([]);
  });

  it('an edge outside the seed never appears', () => {
    const report = enumerateCompositions(EDGES, { seedIds: SEEDS });
    expect(mentioned(report).some((id) => id.includes('outsider'))).toBe(false);
  });

  it('a seed pair with symbolic forms appears with an expression', () => {
    const report = enumerateCompositions(EDGES, { seedIds: SEEDS });
    const hit = report.proofTargets.find(
      (target) => target.first.id === 'seed-a' && target.second.id === 'seed-b',
    );
    expect(hit).toBeDefined();
    expect(hit!.expr).toMatchObject({ kind: 'symbol', name: 'x' });
  });

  it('a seed pair without symbolic is not substitutable and is not a proof target', () => {
    const report = enumerateCompositions(EDGES, { seedIds: SEEDS });
    expect(
      report.notSubstitutable.some(
        (pair) => pair.first.id === 'seed-a' && pair.second.id === 'seed-numeric',
      ),
    ).toBe(true);
    expect(
      report.proofTargets.some(
        (target) => target.first.id === 'seed-a' && target.second.id === 'seed-numeric',
      ),
    ).toBe(false);
  });

  it('CONTROL: deleting the seed check lets a non-seed edge through', () => {
    const report = enumerateCompositions(EDGES, { seedIds: SEEDS });
    expect(mentioned(report)).not.toContain('outsider');
  });
});
