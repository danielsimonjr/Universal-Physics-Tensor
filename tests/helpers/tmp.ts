/**
 * Temporary directories that are removed when the test file ends.
 *
 * Thirteen test files once called `mkdtempSync` and never `rmSync`, leaving a directory per run
 * under the OS temp dir. `tempDir` records each directory it makes and the `afterAll` registered
 * here (at import, so it belongs to the importing file's root suite) removes them all.
 *
 * @module tests/helpers/tmp
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

const made: string[] = [];

/** A fresh directory under the OS temp dir whose name starts with `prefix`; removed after the file. */
export function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});
