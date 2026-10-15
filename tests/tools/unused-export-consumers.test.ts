/**
 * `docs:deps` reports an export as unused only when nothing consumes it. Three consumers it
 * missed on 2026-10-15, each planted in a fixture tree below:
 *
 * - a namespace import (`import * as ns`) whose members are read as `ns.member`: the alias was
 *   recorded as a symbol name, so fourteen `_atlas-map.ts` exports `map.ts` reads that way were
 *   reported unused;
 * - `scripts/` as a consumer root (`scripts/cli-reference.ts` imports `flagHeading`);
 * - the numeric exports under the roots `src/cli/record-tables.ts` fingerprints through a
 *   dynamic import (`MODULE_EXPORT_ROOTS`), on which `--record` depends.
 *
 * In every case the sibling export that nothing reads is still reported, which proves the scan
 * ran on that file; and removing the fingerprint declaration brings the numeric export back.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../helpers/tmp.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const generator = join(repoRoot, 'tools/create-dependency-graph/create-dependency-graph.ts');

function unusedExports(root: string): string[] {
  const report = readFileSync(join(root, 'docs/architecture/unused-analysis.md'), 'utf8');
  const section = report.split('## Potentially Unused Exports')[1] ?? '';
  return [...section.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]!);
}

/** A tracked fixture tree. The generator reads the git index, not the disk. */
function fixture(withFingerprintRoots: boolean): string {
  const root = tempDir('upt-unused-consumers-');
  for (const dir of ['src/cases', 'src/cli', 'scripts']) mkdirSync(join(root, dir), { recursive: true });
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'fixture', version: '0.0.0' }),
    'src/index.ts': [
      "import * as ns from './ns.js';",
      "import { run } from './cases/thing.js';",
      'export const total = ns.used + run();',
      'export type Alias = ns.UsedType;',
      '',
    ].join('\n'),
    'src/ns.ts': [
      'export const used = 1;',
      'export const unusedViaNs = 2;',
      'export type UsedType = number;',
      '',
    ].join('\n'),
    'src/script-only.ts': 'export const fromScript = 1;\nexport const deadToo = 2;\n',
    'scripts/tool.ts': "import { fromScript } from '../src/script-only.js';\nconsole.log(fromScript);\n",
    'src/cases/thing.ts': [
      'export function run(): number { return 1; }',
      'export const LIMIT = 0.5;',
      'export const SCALED = 365.25 * 86400;',
      "export const LABEL = 'x';",
      'export function deadFn(): void {}',
      '',
    ].join('\n'),
    'src/cli/record-tables.ts': withFingerprintRoots
      ? "const MODULE_EXPORT_ROOTS = ['cases'];\nexport const roots = MODULE_EXPORT_ROOTS;\n"
      : 'export const roots: string[] = [];\n',
  };
  for (const [rel, text] of Object.entries(files)) writeFileSync(join(root, rel), text);
  execFileSync('git', ['init', '-b', 'fixture'], { cwd: root });
  execFileSync('git', ['add', ...Object.keys(files)], { cwd: root });
  return root;
}

function generate(root: string): void {
  execFileSync('bun', [generator, `--root=${root}`], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

describe('docs:deps counts every consumer of an export', () => {
  it('a namespace member, a scripts/ import and a fingerprinted numeric constant are used; their dead siblings are reported', () => {
    const root = fixture(true);
    generate(root);
    const unused = unusedExports(root);
    // Read through `ns.member` (a value and a type), by scripts/tool.ts, and fingerprinted numbers.
    for (const used of ['used', 'UsedType', 'fromScript', 'LIMIT', 'SCALED']) expect(unused, used).not.toContain(used);
    // The siblings nothing reads: the scan ran on each file.
    for (const dead of ['unusedViaNs', 'deadToo', 'LABEL', 'deadFn']) expect(unused, dead).toContain(dead);
  });

  it('POSITIVE CONTROL: without the fingerprint declaration the numeric constants are reported', () => {
    const root = fixture(false);
    generate(root);
    const unused = unusedExports(root);
    expect(unused).toContain('LIMIT');
    expect(unused).toContain('SCALED');
    expect(unused).toContain('LABEL');
  });
});
