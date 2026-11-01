/**
 * Part B step B8: `src/cases/` holds only the catalog, methods, and shared helpers.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, 'src/cases');
const ALLOWED = new Set([
  'index.ts',
  'types.ts',
  'catalog.ts',
  'catalog-checks.ts',
  'engine.ts',
  'methods.ts',
  'quadrature.ts',
]);

describe('src/cases directory', () => {
  it('lists only the catalog, methods, and shared modules (no per-case files)', () => {
    const names = readdirSync(dir).filter((n) => n.endsWith('.ts')).sort();
    expect(names).toEqual([...ALLOWED].sort());
  });
});
