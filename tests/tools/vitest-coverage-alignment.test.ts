/**
 * The coverage provider must share vitest's major version (found 2026-09-25 while fixing the
 * persona pass).
 *
 * Dependabot #167 (2026-09-14) raised `@vitest/coverage-v8` to 5.0.0, whose peer dependency is
 * `vitest@5.0.0`, while vitest stayed on 4.1.11. Every coverage run then died with
 * "AssertionError: coverageFilesDirectory is required" and reported 0% on every file, so
 * `bun run test:probe-coverage` and `test:coverage` gated nothing. At the time no CI job ran a
 * coverage command, so nothing turned red; the CI test job now runs the suite with `--coverage`
 * (`.github/workflows/ci.yml`), and this test fails whenever the two majors differ again.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const major = (spec: string) => Number(spec.replace(/^[^\d]*/, '').split('.')[0]);
const installed = (name: string) =>
  JSON.parse(readFileSync(resolve(root, 'node_modules', name, 'package.json'), 'utf-8')).version as string;

describe('vitest and its coverage provider', () => {
  it('declare the same major version', () => {
    expect(major(pkg.devDependencies['@vitest/coverage-v8'])).toBe(major(pkg.devDependencies.vitest));
  });

  it('are installed at the same major version', () => {
    expect(major(installed('@vitest/coverage-v8'))).toBe(major(installed('vitest')));
  });
});
