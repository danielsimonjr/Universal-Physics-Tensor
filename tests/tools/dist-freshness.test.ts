/**
 * Every test that reads the build guards on the build being fresh, in one way.
 *
 * Before `tests/helpers/dist.ts`: `upt-map-format.test.ts` had `describe.skipIf(!existsSync(dist))`
 * and passed as "skipped" without a build; `public-surface.test.ts` warned and returned; the other
 * sixty-eight files failed on an absent build and PASSED on a stale one. This file pins that
 * (1) the staleness rule itself is right, and (2) every file that imports `dist/` or spawns
 * `bin/upt.mjs` imports the helper before anything else, and (3) no file keeps a private skip.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { distStaleness } from '../helpers/dist.js';

const tests = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

// A quoted path into dist/ (an import, a dynamic import, a `new URL(...)`), or the CLI shim.
const READS_BUILD = /'[^']*\bdist\/[^']*\.(?:js|d\.ts)'|bin\/upt\.mjs/;

/** The helper import a file at `file` must carry, as its first import statement. */
function expectedImport(file: string): string {
  const rel = relative(dirname(file), join(tests, 'helpers/dist.js')).replace(/\\/g, '/');
  return `import '${rel.startsWith('.') ? rel : `./${rel}`}';`;
}

describe('the staleness rule', () => {
  it('an absent build is a reason, a stale build is a reason with the lag, a fresh build is none', () => {
    expect(distStaleness(null, 10)).toMatch(/not built/);
    expect(distStaleness(1000, 2500)).toMatch(/older than src\/ by 1\.5 s/);
    expect(distStaleness(2500, 1000)).toBeNull();
    expect(distStaleness(2500, 2500)).toBeNull();
    expect(distStaleness(2500, null)).toBeNull();
  });
});

describe('every test that reads the build imports tests/helpers/dist.js first', () => {
  const readers = walk(tests).filter((f) => READS_BUILD.test(readFileSync(f, 'utf8')) && !f.endsWith('dist-freshness.test.ts'));

  it('finds the readers (the scan is not empty)', () => {
    expect(readers.length).toBeGreaterThan(50);
  });

  it('each reader has the helper as its first import', () => {
    const missing: string[] = [];
    for (const file of readers) {
      const firstImport = readFileSync(file, 'utf8')
        .split('\n')
        .find((l) => /^import\b/.test(l));
      if (firstImport !== expectedImport(file)) missing.push(`${relative(tests, file)}: ${firstImport ?? '(no import)'}`);
    }
    expect(missing).toEqual([]);
  });

  it('no reader keeps a private skip or warn-and-return on a missing dist', () => {
    const skips = readers
      .filter((f) => /existsSync\([^)]*dist|dist\/index\.d\.ts not found|skipIf\(!existsSync/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(tests, f));
    expect(skips).toEqual([]);
  });
});
