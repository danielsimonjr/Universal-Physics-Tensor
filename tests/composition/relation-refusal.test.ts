/**
 * A composition-table refusal is its own list.
 *
 * Before the list existed, `UndefinedCompositionError` and a dimension
 * mismatch both disappeared in the same `continue`. The silent-cell
 * fixture below failed on import: `enumerateCompositionsWithRefusals`
 * was not an export.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS, LENGTH, MASS } from '../../src/dimensional/types.js';
import type { Dimension } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import {
  enumerateCompositions,
  enumerateCompositionsWithRefusals,
} from '../../src/composition/enumerate.js';
import type { BridgeEdge, Quantity } from '../../src/composition/edge.js';
import type { RelationContract } from '../../src/relations/types.js';

const HERE = dirname(fileURLToPath(import.meta.url));

function quantity(name: string, dim: Dimension): Quantity {
  return { name, symbol: name, dim, attributes: {} };
}

function edge(
  id: string,
  source: string,
  sourceDim: Dimension,
  target: string,
  targetDim: Dimension,
  relation?: RelationContract,
): BridgeEdge {
  const form: ExprNode = sym(source, sourceDim);
  return {
    id,
    beId: null,
    kind: 'bridge',
    label: id,
    sources: [quantity(source, sourceDim)],
    target: quantity(target, targetDim),
    confidence: 'established',
    domain: { description: 'any', predicate: () => true },
    citation: 'synthetic',
    evaluate: (inputs) => inputs[source]!,
    symbolic: form,
    ...(relation === undefined ? {} : { relation }),
  };
}

const derivation: RelationContract = { type: 'derivation', transformation: 'fixture' };
const analogy: RelationContract = { type: 'structural-analogy', transformation: 'fixture' };

/** Same pipe. The table cell structural-analogy then derivation is silent. */
const silentFirst = edge('silent-first', 'x', DIMENSIONLESS, 'mid', DIMENSIONLESS, analogy);
const silentSecond = edge('silent-second', 'mid', DIMENSIONLESS, 'out', DIMENSIONLESS, derivation);
/** The same pipe with no relation. It composes and is substitutable. */
const openFirst = edge('open-first', 'x', DIMENSIONLESS, 'mid', DIMENSIONLESS);
const openSecond = edge('open-second', 'mid', DIMENSIONLESS, 'out', DIMENSIONLESS);
/** Same quantity name, dimensions that `equals` rejects. */
const dimFirst = edge('dim-first', 'u', LENGTH, 'pipe', LENGTH);
const dimSecond = edge('dim-second', 'pipe', MASS, 'v', MASS);
/** A defined cell: derivation then derivation. */
const definedFirst = edge('defined-first', 'p', DIMENSIONLESS, 'q', DIMENSIONLESS, derivation);
const definedSecond = edge('defined-second', 'q', DIMENSIONLESS, 'r', DIMENSIONLESS, derivation);

const EDGES = [
  silentFirst,
  silentSecond,
  openFirst,
  openSecond,
  dimFirst,
  dimSecond,
  definedFirst,
  definedSecond,
];
const SEEDS = new Set(EDGES.map((item) => item.id));

function pairKey(first: string, second: string): string {
  return `${first}>>${second}`;
}

function reportIds(report: ReturnType<typeof enumerateCompositions>) {
  return {
    all: report.all.map((candidate) => candidate.edge.id),
    registered: report.registered.map((candidate) => candidate.edge.id),
    novel: report.novel.map((candidate) => candidate.edge.id),
    requiresDisposition: report.requiresDisposition.map((pending) => pending.composedId),
    proofTargets: report.proofTargets.map((target) => pairKey(target.first.id, target.second.id)),
    notSubstitutable: report.notSubstitutable.map((pair) => pairKey(pair.first.id, pair.second.id)),
  };
}

const CATALOG_RELATIONS: Readonly<Record<string, string>> = {
  'be-11-master': 'coarse-graining',
  'be-11-zurek': 'coarse-graining',
  'be-21': 'derivation',
  'be-37': 'derivation',
  'be-48': 'derivation',
  'be-51': 'derivation',
  'be-52': 'derivation',
  'be-55': 'derivation',
  'be-59': 'derivation',
};

describe('composition-table refusals', () => {
  const found = enumerateCompositionsWithRefusals(EDGES, { seedIds: SEEDS });

  it('a silent cell is on the refusal list and is not a proof target', () => {
    const key = pairKey('silent-first', 'silent-second');
    expect(found.relationRefusals.map((row) => row.composedId)).toContain(key);
    expect(found.report.proofTargets.map((target) => pairKey(target.first.id, target.second.id))).not.toContain(key);
    expect(found.report.all.map((candidate) => candidate.edge.id)).not.toContain(key);
    const row = found.relationRefusals.find((item) => item.composedId === key);
    expect(row?.message).toContain('structural-analogy');
    expect(row?.message).toContain('derivation');
  });

  it('a dimension mismatch is on neither list', () => {
    const key = pairKey('dim-first', 'dim-second');
    expect(found.relationRefusals.map((row) => row.composedId)).not.toContain(key);
    expect(found.report.proofTargets.map((target) => pairKey(target.first.id, target.second.id))).not.toContain(key);
    expect(found.report.all.map((candidate) => candidate.edge.id)).not.toContain(key);
    expect(found.report.requiresDisposition.map((pending) => pending.composedId)).not.toContain(key);
  });

  it('derivation then derivation stays a proof target', () => {
    const key = pairKey('defined-first', 'defined-second');
    const hit = found.report.proofTargets.find(
      (target) => target.first.id === 'defined-first' && target.second.id === 'defined-second',
    );
    expect(hit).toBeDefined();
    expect(hit!.expr).toMatchObject({ kind: 'symbol', name: 'p' });
    expect(found.relationRefusals.map((row) => row.composedId)).not.toContain(key);
  });

  it('the same pipe without a relation is still a proof target', () => {
    const hit = found.report.proofTargets.find(
      (target) => target.first.id === 'open-first' && target.second.id === 'open-second',
    );
    expect(hit).toBeDefined();
    expect(hit!.expr).toMatchObject({ kind: 'symbol', name: 'x' });
  });

  it('the public report is unchanged, including on the catalog graph', () => {
    expect(Object.keys(found.report).sort()).toEqual([
      'all',
      'notSubstitutable',
      'novel',
      'proofTargets',
      'registered',
      'requiresDisposition',
    ]);
    expect(reportIds(found.report)).toEqual(reportIds(enumerateCompositions(EDGES, { seedIds: SEEDS })));
    const catalog = enumerateCompositionsWithRefusals(CATALOG_GRAPH);
    expect(reportIds(catalog.report)).toEqual(reportIds(enumerateCompositions(CATALOG_GRAPH)));
    for (const row of catalog.relationRefusals) {
      expect(catalog.report.proofTargets.some((target) => target.first === row.first && target.second === row.second)).toBe(false);
      expect(catalog.report.all.some((candidate) => candidate.edge.id === row.composedId)).toBe(false);
    }
  });

  it('the nine catalog relations stay', () => {
    const recorded = Object.fromEntries(
      CATALOG_GRAPH.filter((item) => item.relation !== undefined).map((item) => [item.id, item.relation!.type]),
    );
    expect(recorded).toEqual(CATALOG_RELATIONS);
  });

  it('the composeEdges comment no longer says the catalog carries no relation', () => {
    const source = readFileSync(resolve(HERE, '../../src/composition/compose.ts'), 'utf8');
    expect(source).not.toContain('Every edge in `CATALOG_GRAPH` carries none');
    expect(source).toContain('be-11-master');
    expect(source).toContain('be-59');
  });

  it('the root barrel does not gain the refusal list', () => {
    const index = readFileSync(resolve(HERE, '../../src/index.ts'), 'utf8');
    const compositionIndex = readFileSync(resolve(HERE, '../../src/composition/index.ts'), 'utf8');
    expect(index).not.toContain('enumerateCompositionsWithRefusals');
    expect(index).not.toContain('RelationTableRefusal');
    expect(compositionIndex).not.toContain('enumerateCompositionsWithRefusals');
  });
});
