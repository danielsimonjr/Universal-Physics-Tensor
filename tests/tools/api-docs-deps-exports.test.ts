/**
 * `docs/architecture/API.md` restates the `bun run docs:deps` `src/`-only
 * `totalExports` in prose. `repo-tools check` does not read that sentence, so
 * the figure can drift from `docs/architecture/dependency-graph.json` while CI
 * stays green (S4's two `@internal` exports: 2868 → 2870). This test is that
 * defect's detector.
 *
 * The CONTROL mutates the prose digit and re-parses it. A control that only
 * compared two copies of the JSON field would still pass if the matcher never
 * looked at API.md.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

interface DepsStatistics {
  totalExports: number;
}

function readApiMd(): string {
  return readFileSync(resolve(root, 'docs/architecture/API.md'), 'utf8');
}

function graphTotalExports(): number {
  const graph = JSON.parse(
    readFileSync(resolve(root, 'docs/architecture/dependency-graph.json'), 'utf8'),
  ) as { statistics: DepsStatistics };
  expect(
    graph.statistics?.totalExports,
    'docs/architecture/dependency-graph.json has statistics.totalExports',
  ).toEqual(expect.any(Number));
  return graph.statistics.totalExports;
}

/** The digit the docs:deps sentence in API.md cites. */
function citedDocsDepsTotalExports(text: string): number {
  const line = text.split(/\r?\n/).find(
    (l) => l.includes('`bun run docs:deps`') && /`totalExports` \d+/.test(l),
  );
  expect(line, 'API.md has a bun run docs:deps sentence citing `totalExports` N').toBeDefined();
  const m = line!.match(/`totalExports` (\d+)/);
  expect(m, 'that sentence cites a `totalExports` digit').not.toBeNull();
  return Number(m![1]);
}

describe('API.md docs:deps totalExports matches dependency-graph.json', () => {
  const apiMd = readApiMd();
  const fromJson = graphTotalExports();

  it('the prose citation equals statistics.totalExports', () => {
    expect(fromJson).toBeGreaterThan(0);
    expect(citedDocsDepsTotalExports(apiMd)).toBe(fromJson);
  });

  it('CONTROL: a wrong digit in the docs:deps sentence fails the pin', () => {
    const mutated = apiMd.replace(
      /(`bun run docs:deps`[^\n]*?`totalExports` )(\d+)/,
      (_, prefix: string) => `${prefix}0`,
    );
    expect(mutated, 'the matcher must have found a docs:deps totalExports digit to replace').not.toBe(apiMd);
    expect(citedDocsDepsTotalExports(mutated)).not.toBe(fromJson);
  });
});
