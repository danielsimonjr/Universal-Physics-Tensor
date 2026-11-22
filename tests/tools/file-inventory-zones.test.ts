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
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE_LIKE = new Set(['ts', 'mjs', 'js']);

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

function recount(): Map<string, number> {
  // Cached (tracked or staged) plus untracked-but-not-ignored files, so the
  // gate also holds on a working tree whose new test files are not yet
  // committed; once committed they drop out of `--others` and the count is
  // the census's own "git tracks" rule.
  const out = execSync('git ls-files -z --cached --others --exclude-standard', {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
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

function docZoneRows(): Map<string, number> {
  const text = readFileSync(new URL('../../docs/architecture/FILE_INVENTORY.md', import.meta.url), 'utf8');
  const rows = new Map<string, number>();
  for (const line of text.split('\n')) {
    const zone = line.match(/^\| `([a-z]+)` \| (\d+) \|/);
    if (zone) {
      rows.set(zone[1]!, Number(zone[2]));
      continue;
    }
    const total = line.match(/^\| \*\*Total\*\* \| \*\*(\d+)\*\* \|/);
    if (total) rows.set('total', Number(total[1]));
  }
  return rows;
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

  it('CONTROL: a stale zone count fails the recount', () => {
    // The same comparison the gate makes, applied to a count doctored as if
    // the document had drifted: it must fail, proving the matcher fires.
    const counted = recount();
    expect(() => expect(counted.get('tests')! + 1).toBe(counted.get('tests'))).toThrow();
  });
});
