/**
 * Every probe and benchmark loader reads its JSON through `readJsonFile`
 * (`src/core/data-file.ts`), so a file that is not JSON fails with a
 * `SyntaxError` (the class the bare `JSON.parse` threw, which the probe CLI
 * maps) whose message starts with the file's path, not a bare
 * "Unexpected token" that names no file.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDatasetFromJson, loadSplitDatasetsFromJson } from '../../../src/composition/probe/dataset.js';
import { loadStudyFile, loadStudyFromJson } from '../../../src/composition/probe/study.js';
import { loadSearchProblemFromJson, parseExprJson } from '../../../src/composition/probe/problem.js';
import { loadFrozenItems } from '../../../src/atlas/benchmark/loader.js';

const dir = mkdtempSync(join(tmpdir(), 'upt-json-readers-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const broken = join(dir, 'broken.json');
writeFileSync(broken, '{ "rows": [1, 2,, }');
mkdirSync(join(dir, 'bench', 'public'), { recursive: true });
const brokenItems = join(dir, 'bench', 'public', 'items.json');
writeFileSync(brokenItems, '[ { "id": ');

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
}

const loaders: ReadonlyArray<readonly [string, () => unknown, string]> = [
  ['loadDatasetFromJson', () => loadDatasetFromJson(broken), broken],
  ['loadSplitDatasetsFromJson', () => loadSplitDatasetsFromJson(broken), broken],
  ['loadStudyFromJson', () => loadStudyFromJson(broken), broken],
  ['loadStudyFile', () => loadStudyFile(broken), broken],
  ['loadSearchProblemFromJson', () => loadSearchProblemFromJson(broken), broken],
  ['parseExprJson', () => parseExprJson(broken), broken],
  ['loadFrozenItems', () => loadFrozenItems(join(dir, 'bench')), brokenItems],
];

describe('a JSON file that is not JSON is a SyntaxError that names the file', () => {
  for (const [name, load, path] of loaders) {
    it(`${name}`, () => {
      const error = thrown(load);
      expect(error).toBeInstanceOf(SyntaxError);
      expect((error as Error).message.startsWith(`${path}: `)).toBe(true);
    });
  }
});
