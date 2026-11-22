/**
 * Gate for the per-zone census in `docs/architecture/FILE_INVENTORY.md`.
 *
 * The `repo-tools check` gate cannot hold the per-zone table (its claims come
 * from `dependency-graph.json`, not `file-inventory.json`'s `byArea` block, as
 * the document itself discloses), so this test holds it: it recounts the same
 * census the document is written from — every git-tracked `.ts`/`.mjs`/`.js`
 * file, area'd by top-level directory — and fails when the doc's table drifts.
 * A zone count in the document that no recount supports (or a new source file
 * the document was not regenerated against) fails here.
 */
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOURCE_LIKE = new Set(['ts', 'mjs', 'js']);
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DOC_PATH = new URL('../../docs/architecture/FILE_INVENTORY.md', import.meta.url);

/** Top-level directory → census area, matching the `repo-tools map` areas. */
const AREA_BY_DIR: Record<string, string> = {
  tests: 'tests',
  src: 'src',
  tools: 'tools',
  scripts: 'tools',
  bench: 'benchmarks',
  docs: 'docs',
  examples: 'examples',
  bin: 'src',
  '': 'config',
};

function recount(cwd = REPO_ROOT): Map<string, number> {
  // Tracked (index) files only. Untracked scratch files are absent because git
  // does not track them — the same census rule FILE_INVENTORY.md states.
  const out = execSync('git ls-files -z --cached', {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    cwd,
  });
  const counts = new Map<string, number>();
  for (const file of out.split('\0')) {
    if (file === '') continue;
    const dot = file.lastIndexOf('.');
    if (dot === -1 || !SOURCE_LIKE.has(file.slice(dot + 1))) continue;
    const dir = file.includes('/') ? file.slice(0, file.indexOf('/')) : '';
    if (dir === '' && file !== 'vitest.config.ts') {
      // `test-example.js` is the smoke entry; the census areas it with `src`.
      if (file !== 'test-example.js') throw new Error(`unclassified root source file: ${file}`);
      counts.set('src', (counts.get('src') ?? 0) + 1);
      continue;
    }
    const area = AREA_BY_DIR[dir];
    if (area === undefined) throw new Error(`unclassified source file area: ${file}`);
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return counts;
}

function parseZoneRows(text: string): Map<string, number> {
  const rows = new Map<string, number>();
  for (const line of text.split('\n')) {
    const zone = line.match(/^\| `([a-z]+)` \| (\d+) \|/);
    if (zone) {
      rows.set(zone[1]!, Number(zone[2]));
      continue;
    }
    const total = line.match(/^\| \*\*Total\*\* \| \*\*(\d+)\*\* \| \s*\|$/);
    if (total) rows.set('total', Number(total[1]));
  }
  return rows;
}

function docZoneRows(): Map<string, number> {
  return parseZoneRows(readFileSync(DOC_PATH, 'utf8'));
}

function gitIn(cwd: string, ...args: string[]): void {
  execFileSync(
    'git',
    [
      '-c',
      'user.email=t@example.invalid',
      '-c',
      'user.name=t',
      '-c',
      'core.autocrlf=false',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    { cwd, encoding: 'utf8' },
  );
}

describe('FILE_INVENTORY per-zone census', () => {
  it('every zone row matches a fresh recount of the git-tracked source files', () => {
    const counted = recount();
    const doc = docZoneRows();
    expect(doc.get('tests'), 'tests zone').toBe(counted.get('tests'));
    expect(doc.get('src'), 'src zone').toBe(counted.get('src'));
    expect(doc.get('tools'), 'tools zone').toBe(counted.get('tools'));
    expect(doc.get('benchmarks'), 'benchmarks zone').toBe(counted.get('benchmarks'));
    expect(doc.get('examples'), 'examples zone').toBe(counted.get('examples'));
    expect(doc.get('docs'), 'docs zone').toBe(counted.get('docs'));
    expect(doc.get('config'), 'config zone').toBe(counted.get('config'));
  });

  it('the total row is the sum of the zone rows', () => {
    const doc = docZoneRows();
    const zones = [...doc.entries()].filter(([zone]) => zone !== 'total');
    expect(zones.length).toBeGreaterThanOrEqual(7);
    const sum = zones.reduce((a, [, n]) => a + n, 0);
    expect(doc.get('total')).toBe(sum);
  });

  it('CONTROL: a malformed Total row is not parsed as the census total', () => {
    const liveTotal = [...recount().values()].reduce((a, n) => a + n, 0);
    const text = readFileSync(DOC_PATH, 'utf8');
    const validRow = text.match(/^\| \*\*Total\*\* \| \*\*(\d+)\*\* \| \s*\|$/m);
    expect(validRow, 'committed Total must be a valid 3-column count').not.toBeNull();
    const fromDoc = Number(validRow![1]);
    // Literals follow the live census so adding a tracked file does not stale
    // a hardcoded 1272. The recount tests fail if the document drifts.
    expect(
      parseZoneRows(`| **Total** | **${liveTotal}** || **${liveTotal - 2}** | |`).has('total'),
      'stray cells must not parse as total',
    ).toBe(false);
    expect(parseZoneRows(`| **Total** | **${liveTotal}** | |`).get('total')).toBe(liveTotal);
    expect(parseZoneRows(validRow![0]).get('total')).toBe(fromDoc);
  });

  it('CONTROL: a stale zone count in the parsed document fails the recount', () => {
    const counted = recount();
    const text = readFileSync(DOC_PATH, 'utf8');
    const staleCount = counted.get('tests')! + 1;
    const mutated = text.replace(/^\| `tests` \| \d+ \|/m, `| \`tests\` | ${staleCount} |`);
    expect(mutated, 'the tests-zone row must occur once to replace').not.toBe(text);
    const staleDoc = parseZoneRows(mutated);
    expect(staleDoc.get('tests')).toBe(staleCount);
    expect(() => expect(staleDoc.get('tests'), 'tests zone').toBe(counted.get('tests'))).toThrow();
  });

  // Isolated throwaway git repo (see tests/tools/untracked-gate-inputs.test.ts).
  // Writing into REPO_ROOT/tests/ races with parallel walks of tests/
  // (no-raw-nul, no-network-in-tests, tmp-dirs-cleaned) and can leave a stray.
  it('CONTROL: an untracked tests/*.ts file is not in the census', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'upt-zone-census-'));
    try {
      gitIn(tmp, 'init', '-q');
      mkdirSync(join(tmp, 'tests'));
      writeFileSync(join(tmp, 'tests', 'a.ts'), 'export {};\n');
      gitIn(tmp, 'add', 'tests/a.ts');
      expect(recount(tmp).get('tests')).toBe(1);
      writeFileSync(join(tmp, 'tests', 'b.ts'), 'export {};\n');
      expect(recount(tmp).get('tests'), 'untracked file must not bump the tests zone').toBe(1);
      gitIn(tmp, 'add', 'tests/b.ts');
      expect(recount(tmp).get('tests'), 'staging the same file must bump the tests zone').toBe(2);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
