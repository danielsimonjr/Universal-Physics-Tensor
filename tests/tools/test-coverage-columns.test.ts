/**
 * `docs:deps`'s TEST_COVERAGE.md reports two coverages, not one.
 *
 * A test that imports a barrel was credited for every module behind it, and the one headline
 * ("349 of 360 covered") counted that credit as coverage. The report now states, per source
 * file, which tests import it DIRECTLY and which reach it only through a barrel re-export or a
 * bare side-effect import (TRACED), and the summary carries both counts. The fixture below has
 * exactly that shape: a test imports the barrel, the barrel re-exports a leaf, and a second leaf
 * is imported by nothing. Reverting the generator collapses the two columns and fails here.
 *
 * It also pins that the "no test imports this file" list names no directory that does not
 * exist: the old text suggested `tests/unit/<module>/<file>.test.ts`, and there is no
 * `tests/unit/`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const generator = join(repoRoot, 'tools/create-dependency-graph/create-dependency-graph.ts');
const made: string[] = [];
afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

/** A tracked fixture tree: one barrel, one leaf behind it, one leaf nobody imports, one test. */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'upt-test-coverage-columns-'));
  made.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'tests'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));
  writeFileSync(join(root, 'src/index.ts'), "export { LEAF } from './leaf.js';\n");
  writeFileSync(join(root, 'src/leaf.ts'), 'export const LEAF = 1;\n');
  writeFileSync(join(root, 'src/orphan.ts'), 'export const ORPHAN = 1;\n');
  writeFileSync(join(root, 'tests/barrel.test.ts'), "import { LEAF } from '../src/index.js';\nexport const T = LEAF;\n");
  execFileSync('git', ['init', '-b', 'fixture'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  return root;
}

function generate(root: string): string {
  execFileSync('bun', [generator, `--root=${root}`, '--include-tests'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return readFileSync(join(root, 'docs/architecture/TEST_COVERAGE.md'), 'utf8');
}

function row(report: string, file: string): string {
  const line = report.split('\n').find((l) => l.startsWith(`| \`${file}\` |`));
  expect(line, `a row for ${file}`).toBeDefined();
  return line!;
}

describe('TEST_COVERAGE.md reports direct and traced coverage separately', () => {
  const report = generate(fixture());

  it('the summary carries both counts, and the direct count is the smaller', () => {
    expect(report).toMatch(/\| Source files imported directly by a test \| 1 \|/);
    expect(report).toMatch(/\| Source files reached directly or through a barrel or side-effect import \| 2 \|/);
    expect(report).toMatch(/\| Source files no test reaches either way \| 1 \|/);
  });

  it('the barrel is direct, the leaf behind it is traced only, and the orphan is in neither column', () => {
    const barrel = row(report, 'src/index.ts');
    expect(barrel).toMatch(/\| `barrel\.test\.ts` \| — \|/);
    const leaf = row(report, 'src/leaf.ts');
    expect(leaf).toMatch(/\| — \| `barrel\.test\.ts` \|/);
    expect(report).toMatch(/^- `src\/orphan\.ts`$/m);
  });

  it('names no tests/unit/ directory', () => {
    expect(report).not.toMatch(/tests\/unit\//);
    expect(report).not.toMatch(/Expected test/);
  });
});

/** A source file that reaches a leaf only through `await import('./leaf.js')`. */
function dynamicImportFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'upt-test-coverage-dynamic-'));
  made.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'tests'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));
  writeFileSync(
    join(root, 'src/main.ts'),
    "export async function go(): Promise<unknown> {\n  return await import('./leaf.js');\n}\n",
  );
  writeFileSync(join(root, 'src/leaf.ts'), 'export const LEAF = 1;\n');
  writeFileSync(join(root, 'src/orphan.ts'), 'export const ORPHAN = 1;\n');
  writeFileSync(join(root, 'tests/go.test.ts'), "import { go } from '../src/main.js';\nexport const T = go;\n");
  execFileSync('git', ['init', '-b', 'fixture'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  return root;
}

describe('TEST_COVERAGE.md follows a source file dynamic import as a side-effect edge', () => {
  const report = generate(dynamicImportFixture());

  it('the dynamically imported leaf is traced, not uncovered', () => {
    const main = row(report, 'src/main.ts');
    expect(main).toMatch(/\| `go\.test\.ts` \| — \|/);
    const leaf = row(report, 'src/leaf.ts');
    expect(leaf).toMatch(/\| — \| `go\.test\.ts` \|/);
    expect(report).toMatch(/^- `src\/orphan\.ts`$/m);
    expect(report).not.toMatch(/^- `src\/leaf\.ts`$/m);
  });
});

describe('the committed TEST_COVERAGE.md is the two-column form', () => {
  const committed = readFileSync(join(repoRoot, 'docs/architecture/TEST_COVERAGE.md'), 'utf8');
  const coverageJson = JSON.parse(
    readFileSync(join(repoRoot, 'docs/architecture/test-coverage.json'), 'utf8'),
  ) as { coverageMap: Record<string, string[]> };

  it('has both summary rows and no tests/unit/ suggestion', () => {
    expect(committed).toMatch(/\| Source files imported directly by a test \| \d+ \|/);
    expect(committed).toMatch(/\| Source files reached directly or through a barrel or side-effect import \| \d+ \|/);
    expect(committed).not.toMatch(/tests\/unit\//);
  });

  it('a direct count never exceeds the traced count', () => {
    const direct = Number(/\| Source files imported directly by a test \| (\d+) \|/.exec(committed)?.[1]);
    const traced = Number(/\| Source files reached directly or through a barrel or side-effect import \| (\d+) \|/.exec(committed)?.[1]);
    expect(direct).toBeLessThanOrEqual(traced);
    expect(direct).toBeGreaterThan(0);
  });

  it('traced edges stay at or above the master count, and explain.ts is credited to the CLI suite', () => {
    const tracedEdges = Object.values(coverageJson.coverageMap).reduce((n, testers) => n + testers.length, 0);
    expect(tracedEdges).toBeGreaterThanOrEqual(11856);
    const explain = coverageJson.coverageMap['src/cli/commands/explain.ts'];
    expect(explain).toBeDefined();
    expect(explain.length).toBeGreaterThan(100);
  });
});
