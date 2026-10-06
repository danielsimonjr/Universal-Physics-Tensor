/**
 * A composition-table refusal is a pipeline result. A dimension mismatch
 * is not that result.
 *
 * The parent pipeline dropped `UndefinedCompositionError` before any
 * result was built, on the same `continue` as a dimension mismatch.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runChainPipeline, type ChainCompositionRefusal } from '../../src/atlas/chain-pipeline.js';
import { bridgeSeedKeys } from '../../src/atlas/physjs-ref.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { composeEdges } from '../../src/composition/compose.js';
import { CompositionDimensionError } from '../../src/composition/edge.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS, LENGTH, MASS } from '../../src/dimensional/types.js';
import type { Dimension } from '../../src/dimensional/types.js';
import type { RelationContract } from '../../src/relations/types.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

function quantity(name: string, dim: Dimension): Quantity {
  return { name, symbol: name, dim, attributes: {} };
}

function edge(
  id: string,
  source: string,
  sourceDim: Dimension,
  target: string,
  targetDim: Dimension,
  relation: RelationContract | undefined,
  symbolic = sym(source, sourceDim),
): BridgeEdge {
  return {
    id,
    beId: null,
    kind: 'bridge',
    label: id,
    sources: [quantity(source, sourceDim)],
    target: quantity(target, targetDim),
    confidence: 'established',
    domain: { description: 'any', predicate: () => true },
    citation: 'fixture',
    evaluate: (inputs) => inputs[source] ?? 0,
    symbolic,
    ...(relation === undefined ? {} : { relation }),
  };
}

const derivation: RelationContract = { type: 'derivation', transformation: 'fixture' };
const analogy: RelationContract = { type: 'structural-analogy', transformation: 'fixture' };

const rhs12 = BRIDGE_RHS_BY_ID.get(12);
if (rhs12 === undefined) throw new Error('catalog 12 has no right-hand side');

describe('a composition refusal is a pipeline result', () => {
  it('a silent cell is the table error, and not a dimension failure', () => {
    expect(bridgeSeedKeys()).toEqual(expect.arrayContaining(['be-21', 'be-27']));
    const first = edge('be-21', 'x', DIMENSIONLESS, 'mid', DIMENSIONLESS, analogy);
    const second = edge('be-27', 'mid', DIMENSIONLESS, 'out', DIMENSIONLESS, derivation);
    const results = runChainPipeline([first, second]);
    const row: ChainCompositionRefusal | undefined = results.find(
      (item): item is ChainCompositionRefusal => item.kind === 'rejected: composition table',
    );
    expect(row).toMatchObject({
      kind: 'rejected: composition table',
      edgeIds: ['be-21', 'be-27'],
    });
    if (row === undefined) return;
    expect(row.message).toContain('composition table');
    expect(row.message).toContain('structural-analogy');
    expect(row.message).not.toMatch(/dimension/);
  });

  it('derivation then derivation that meets on a quantity still composes', () => {
    expect(bridgeSeedKeys()).toEqual(expect.arrayContaining(['be-55', 'be-12']));
    const first = edge('be-55', 'particle-mass', MASS, 'mass', MASS, derivation, sym('mass', MASS));
    const second = edge('be-12', 'mass', MASS, 'wavelength', LENGTH, derivation, rhs12);
    const results = runChainPipeline([first, second]);
    expect(results).toContainEqual({
      kind: 'confirmation',
      catalogId: 12,
      edgeIds: ['be-55', 'be-12'],
    });
    expect(results.some((item) => item.kind === 'rejected: composition table')).toBe(false);
  });

  it('a pair whose dimensions disagree is the dimension failure', () => {
    expect(bridgeSeedKeys()).toEqual(expect.arrayContaining(['be-37', 'be-59']));
    const first = edge('be-37', 'u', LENGTH, 'pipe', LENGTH, derivation);
    const second = edge('be-59', 'pipe', MASS, 'v', MASS, derivation);
    expect(() => composeEdges(first, second)).toThrow(CompositionDimensionError);
    const results = runChainPipeline([first, second]);
    expect(results.some((item) => item.kind === 'rejected: composition table')).toBe(false);
    expect(results.some((item) => item.edgeIds[0] === 'be-37' && item.edgeIds[1] === 'be-59')).toBe(
      false,
    );
  });

  it('composeMorphisms has no caller under src', () => {
    const callers = walk(resolve(root, 'src'))
      .filter((file) => !file.endsWith('src/relations/category.ts'))
      .filter((file) => readFileSync(file, 'utf8').includes('composeMorphisms('));
    expect(callers).toEqual([]);
  });
});
