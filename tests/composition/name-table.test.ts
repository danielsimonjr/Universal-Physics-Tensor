/**
 * Resolution uses one optimal-string-alignment distance. `lenght` → `length`
 * is one adjacent transposition. Plain Levenshtein counts that pair as two
 * edits, the same as a real two-letter miss, so the old resolver dropped it.
 * `erasure-energy` and `landauer-erasure-energy` are one quantity.
 */
import { describe, expect, it } from 'vitest';
import { nearQuantityNames, shareSynonyms } from '../../src/composition/aliases.js';
import { resolveToCatalogName } from '../../src/composition/user-equation.js';

describe('optimal string alignment resolves a one-edit transposition', () => {
  it('resolves lenght to length and leaves a two-edit typo unresolved', () => {
    expect(nearQuantityNames('lenght', ['height', 'length'])).toEqual(['length']);
    expect(nearQuantityNames('lxxgth', ['height', 'length'])).toEqual([]);
  });
});

describe('Landauer spellings are one quantity', () => {
  it('copies a value from either spelling onto the other', () => {
    const names = new Set(['erasure-energy', 'landauer-erasure-energy']);
    expect(shareSynonyms({ 'erasure-energy': 2.9e-21 }, names)).toEqual({
      'erasure-energy': 2.9e-21,
      'landauer-erasure-energy': 2.9e-21,
    });
    expect(shareSynonyms({ 'landauer-erasure-energy': 2.9e-21 }, names)).toEqual({
      'erasure-energy': 2.9e-21,
      'landauer-erasure-energy': 2.9e-21,
    });
  });

  it('resolves either spelling to the one the catalog actually has', () => {
    expect(resolveToCatalogName('erasure-energy', new Set(['landauer-erasure-energy']))).toBe(
      'landauer-erasure-energy',
    );
    expect(resolveToCatalogName('landauer-erasure-energy', new Set(['erasure-energy']))).toBe(
      'erasure-energy',
    );
    expect(
      resolveToCatalogName('erasure-energy', new Set(['erasure-energy', 'landauer-erasure-energy'])),
    ).toBe('erasure-energy');
  });
});
