/**
 * Part B steps B8/B12: `src/cases/` holds only the catalog, methods, and shared
 * helpers. The loader's `isForbiddenCaseModule` is the record of deleted
 * per-case files; this test applies it to the live directory.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORBIDDEN_PER_CASE_MODULES, isForbiddenCaseModule } from '../../src/cases/catalog.js';

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

  it('the loader refuses a per-case file coming back (B12)', () => {
    expect(isForbiddenCaseModule('skin-depth.ts')).toBe(true);
    expect(isForbiddenCaseModule('kepler-rv.ts')).toBe(true);
    expect(isForbiddenCaseModule('damped-resonator.ts')).toBe(true);
    expect(isForbiddenCaseModule('resistor-noise.ts')).toBe(true);
    expect(isForbiddenCaseModule('lumped-cooling.ts')).toBe(true);
    expect(isForbiddenCaseModule('brownian-sphere.ts')).toBe(true);
    expect(isForbiddenCaseModule('case-new-demo.ts')).toBe(true);
    expect(isForbiddenCaseModule('catalog.ts')).toBe(false);
    expect(isForbiddenCaseModule('methods.ts')).toBe(false);
    const names = readdirSync(dir).filter((n) => n.endsWith('.ts'));
    expect(names.filter(isForbiddenCaseModule)).toEqual([]);
    expect([...ALLOWED].some(isForbiddenCaseModule)).toBe(false);
    expect(FORBIDDEN_PER_CASE_MODULES).toHaveLength(6);
  });
});
