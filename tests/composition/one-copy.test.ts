/**
 * One copy of each record. The adjudication ledger is the catalog file's
 * block; the not-composable seed list is the exemption its docstring says it
 * is; a coverage count is derived, not typed.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADJUDICATIONS, adjudicationFor } from '../../src/composition/adjudication.js';
import { bridgeCatalog } from '../../src/bridges/catalog-load.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { NOT_COMPOSABLE_SEEDS } from '../../src/composition/not-composable-seeds.js';
import { bridgeSeedKeys } from '../../src/atlas/physjs-ref.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';

const ROOT = join(import.meta.dirname, '../..');
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const code = (rel: string): string => strip(readFileSync(join(ROOT, rel), 'utf8'));

describe('the adjudication ledger is the catalog file', () => {
  it('ADJUDICATIONS is the adjudications block, record for record', () => {
    expect(ADJUDICATIONS).toEqual(bridgeCatalog().adjudications);
    expect(ADJUDICATIONS.length).toBeGreaterThan(0);
    for (const row of ADJUDICATIONS) {
      expect(['genuine', 'decoy', 'entailed', 'deferred']).toContain(row.verdict);
      expect(row.grounds.length).toBeGreaterThan(0);
      expect(row.source).toMatch(/^docs\//);
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(adjudicationFor('foerster-radius', 'schwarzschild-radius')?.verdict).toBe('decoy');
  });
  it('the code holds no second copy of a verdict', () => {
    expect(code('src/composition/adjudication.ts')).not.toMatch(/grounds:\s*['"`]/);
  });
  it('the schema requires every field the ledger reads', () => {
    const schema = JSON.parse(readFileSync(join(ROOT, 'data/bridge-catalog.schema.json'), 'utf8'));
    const items = schema.properties.adjudications.items;
    expect([...items.required].sort()).toEqual(['date', 'grounds', 'id', 'source', 'verdict']);
    expect(items.properties.verdict.enum).toEqual(['genuine', 'decoy', 'entailed', 'deferred']);
    expect(items.additionalProperties).toBe(false);
  });
});

describe('the not-composable seed list is the exemption its docstring names', () => {
  const edgeIds = new Set(CATALOG_GRAPH.map((e) => e.id));
  const atlasIds = new Set(ATLAS_FAMILIES.flatMap((f) => f.bridges.map((b) => b.id)));
  it('every bridge-kind atlas seed has a graph edge or a row, and every row is a seed with no edge', () => {
    const seeds = bridgeSeedKeys().filter((key) => atlasIds.has(key));
    expect(seeds.length).toBeGreaterThan(0);
    const exempt = new Set(NOT_COMPOSABLE_SEEDS.map((s) => s.id));
    const unaccounted = seeds.filter((key) => !edgeIds.has(key) && !exempt.has(key));
    expect(unaccounted).toEqual([]);
    const stale = NOT_COMPOSABLE_SEEDS.filter((s) => edgeIds.has(s.id) || !seeds.includes(s.id)).map((s) => s.id);
    expect(stale).toEqual([]);
    for (const s of NOT_COMPOSABLE_SEEDS) expect(s.reason.length, s.id).toBeGreaterThan(20);
  });
});

describe('a coverage count is derived, not typed', () => {
  it('catalog-adapter.ts does not state a bridge count in prose', () => {
    expect(code('src/bridges/catalog-adapter.ts')).not.toMatch(/\d+ of \d+ (covered|bridges)/);
  });
  it('no source comment calls MathTS an optional peer or names a built-in formula parser', () => {
    for (const rel of ['src/composition/user-equation.ts', 'src/cli/commands/eval.ts']) {
      const text = readFileSync(join(ROOT, rel), 'utf8');
      expect(text, rel).not.toMatch(/optional peer|built-in\s+parser|builtin parser/);
    }
  });
  it('NONLINEAR_FRACTION and CONSTANT_AGREEMENT are not exports', () => {
    expect(code('src/numerical/evaluator-uncertainty.ts')).not.toMatch(/export const NONLINEAR_FRACTION/);
    expect(code('src/dimensional/symbolic-constants.ts')).not.toMatch(/export const CONSTANT_AGREEMENT/);
  });
});
