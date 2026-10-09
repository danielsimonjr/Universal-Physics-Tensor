/**
 * The catalog census, for tests that pin a count.
 *
 * A count that moves when a bridge is ingested is not typed into a test. The test derives the
 * live value the way it always did and compares it to the field of this census, which
 * `scripts/catalog-census.ts` derives from the registries and commits to
 * `tests/fixtures/catalog-census.json`. A catalog change then edits that one reviewed file, and
 * a stale census fails `tests/tools/catalog-census.test.ts` and the `docs-fresh` job.
 *
 * @module tests/helpers/census
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogCensus } from '../../scripts/catalog-census.js';

const file = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/catalog-census.json');

/** The committed census. */
export const CENSUS: CatalogCensus = JSON.parse(readFileSync(file, 'utf8')) as CatalogCensus;
