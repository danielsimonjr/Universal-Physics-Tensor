/**
 * `defaultUnit` was advertised on the quantity registry and stored on no row.
 * Evaluator parameter units live on the catalog record. They do not fill this
 * field: most quantities a relation uses are targets, and a parameter key is
 * reused across quantities, so a unit cannot be copied without inventing one.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allQuantityRecords } from '../../src/dimensional/quantity-registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('quantity registry default unit', () => {
  it('stores no defaultUnit, and the type does not advertise one', () => {
    for (const row of allQuantityRecords()) {
      expect(Object.prototype.hasOwnProperty.call(row, 'defaultUnit')).toBe(false);
    }
    const source = readFileSync(join(root, 'src/dimensional/quantity-registry.ts'), 'utf8');
    expect(source.includes('defaultUnit')).toBe(false);
    const catalogDoc = readFileSync(join(root, 'docs/architecture/bridge-catalog.md'), 'utf8');
    expect(catalogDoc.includes('default unit')).toBe(false);
  });
});
