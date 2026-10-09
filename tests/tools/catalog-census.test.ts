/**
 * The catalog census is derived, not typed: the committed file equals a fresh derivation, and the
 * comparison that says so fails when a field is edited.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CENSUS_PATH, censusDiff, deriveCensus, serializeCensus } from '../../scripts/catalog-census.js';
import { CENSUS } from '../helpers/census.js';

const committed = readFileSync(CENSUS_PATH, 'utf8');

describe('catalog census', () => {
  it('the committed file equals a fresh derivation from the registries', () => {
    const fresh = deriveCensus();
    expect(censusDiff(committed, serializeCensus(fresh))).toEqual([]);
    expect(CENSUS).toEqual(fresh);
  }, 120_000);

  it('CONTROL: an edited field is reported on its own line, and an unedited file is not', () => {
    const edited = committed.replace(`"entries": ${CENSUS.catalog.entries}`, `"entries": ${CENSUS.catalog.entries + 1}`);
    expect(edited).not.toBe(committed);
    const problems = censusDiff(edited, committed);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`committed "entries": ${CENSUS.catalog.entries + 1}`);
    expect(censusDiff(committed, committed)).toEqual([]);
  });

  it('every field is a finite number or a string: nothing was dropped as undefined or NaN', () => {
    const walk = (node: unknown, path: string): string[] => {
      if (typeof node === 'number') return Number.isFinite(node) ? [] : [path];
      if (typeof node === 'string') return [];
      if (node !== null && typeof node === 'object') {
        return Object.entries(node).flatMap(([k, v]) => walk(v, `${path}.${k}`));
      }
      return [path];
    };
    expect(walk(CENSUS, 'census')).toEqual([]);
  });
});
