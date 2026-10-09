/**
 * A test that makes a temporary directory removes it.
 *
 * Thirteen files once called `mkdtempSync` and never `rmSync`. The rule: a test file either uses
 * `tempDir` from `tests/helpers/tmp.ts` (which removes what it made after the file) or pairs its
 * own `mkdtempSync` with an `rmSync`. The helper itself is the one file allowed a bare `mkdtempSync`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tests = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('temporary directories are removed', () => {
  it('every test file that calls mkdtempSync also calls rmSync', () => {
    const leaking = walk(tests)
      .filter((f) => !f.endsWith('helpers/tmp.ts') && !f.endsWith('tmp-dirs-cleaned.test.ts'))
      .filter((f) => {
        const text = readFileSync(f, 'utf8');
        return /\bmkdtempSync\(/.test(text) && !/\brmSync\(/.test(text);
      })
      .map((f) => relative(tests, f));
    expect(leaking).toEqual([]);
  });

  it('control: the helper is the one bare mkdtempSync, and it removes what it made', () => {
    const helper = readFileSync(join(tests, 'helpers/tmp.ts'), 'utf8');
    expect(helper).toMatch(/mkdtempSync\(/);
    expect(helper).toMatch(/afterAll\(/);
    expect(helper).toMatch(/rmSync\(dir, \{ recursive: true, force: true \}\)/);
  });
});
