/**
 * Morphisms delegate composition to `composeRelation`. The comparison is
 * the check: a wrapper that returns a relation on a silent cell disagrees
 * with `composeRelation`. The silent-cell count stays pinned in
 * `tests/atlas/composition-table.test.ts`. This file does not restate it.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  COMPOSITION_TABLE,
  composeRelation,
  type CompositionResult,
} from '../../src/relations/composition-table.js';
import type { RelationType } from '../../src/relations/types.js';
import {
  composeMorphisms,
  type CategoryMorphism,
  type CategoryObject,
} from '../../src/relations/category.js';
import * as category from '../../src/relations/category.js';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RELATION_TYPES = Object.keys(COMPOSITION_TABLE) as RelationType[];

function morphism(relation: RelationType, source: string, target: string): CategoryMorphism {
  return { source, target, relation };
}

function sameAsComposeRelation(
  compose: (first: RelationType, second: RelationType) => CompositionResult,
): string[] {
  const mismatches: string[] = [];
  for (const first of RELATION_TYPES) {
    for (const second of RELATION_TYPES) {
      const got = compose(first, second);
      const expected = composeRelation(first, second);
      if (got !== expected) mismatches.push(`${first} ∘ ${second}: ${got} vs ${expected}`);
    }
  }
  return mismatches;
}

function viaMorphisms(first: RelationType, second: RelationType): CompositionResult {
  return composeMorphisms(morphism(first, 'a', 'b'), morphism(second, 'b', 'c'));
}

/** One line: a relation where the table is silent. */
function relationOnSilentCell(first: RelationType, second: RelationType): CompositionResult {
  const result = composeRelation(first, second);
  return result === 'no-composite-claim' ? 'derivation' : result;
}

function toRepo(abs: string): string {
  return relative(root, abs).split(sep).join('/');
}

function relationsDimensionalImports(): string[] {
  const dir = join(root, 'src/relations');
  const hits: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isFile() || !name.endsWith('.ts') || name.endsWith('.d.ts')) continue;
    const source = readFileSync(path, 'utf8');
    if (scanFileImports(source).some((spec) => spec.split('/').includes('dimensional'))) {
      hits.push(toRepo(path));
    }
  }
  return hits.sort();
}

describe('composeMorphisms', () => {
  it('an object is an id together with a regime', () => {
    const regime = { family: 'oscillators', inequalities: [], groupDefinitions: {} };
    const object: CategoryObject = { id: 'model-a', regime };
    expect(object).toEqual({ id: 'model-a', regime });
  });

  it('agrees with composeRelation on every pair, including no-composite-claim', () => {
    expect(RELATION_TYPES.length).toBeGreaterThan(0);
    expect(sameAsComposeRelation(viaMorphisms)).toEqual([]);
  });

  it('a non-adjacent pair is no-composite-claim even when the cell is derivation', () => {
    expect(composeRelation('derivation', 'derivation')).toBe('derivation');
    expect(
      composeMorphisms(morphism('derivation', 'left', 'mid'), morphism('derivation', 'other', 'right')),
    ).toBe('no-composite-claim');
    expect(
      composeMorphisms(morphism('derivation', 'left', 'Mid'), morphism('derivation', 'mid', 'right')),
    ).toBe('no-composite-claim');
  });

  it('control: a one-line wrapper that returns a relation on a silent cell fails', () => {
    const mismatches = sameAsComposeRelation(relationOnSilentCell);
    expect(mismatches).not.toEqual([]);
    expect(mismatches.some((line) => line.includes('no-composite-claim'))).toBe(true);
  });
});

describe('category module', () => {
  const source = readFileSync(join(root, 'src/relations/category.ts'), 'utf8');

  it('imports types and the composition table only, and does not copy the table', () => {
    expect(scanFileImports(source).sort()).toEqual(['./composition-table.js', './types.js']);
    expect(source.includes('COMPOSITION_TABLE')).toBe(false);
  });

  it('exports composeMorphisms and no identity morphism or 2-cell', () => {
    expect(Object.keys(category).sort()).toEqual(['composeMorphisms']);
    expect(source).not.toMatch(/export\s+(?:function|const|class|interface|type)\s+\w*(?:[Ii]dentity|[Tt]woCell|2Cell)\w*/);
  });

  it('relations imports dimensional only from the files that already did', () => {
    expect(relationsDimensionalImports()).toEqual([
      'src/relations/regime.ts',
      'src/relations/types.ts',
    ]);
  });
});
