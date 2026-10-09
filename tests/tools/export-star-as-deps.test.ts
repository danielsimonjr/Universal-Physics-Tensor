/**
 * `docs:deps` records `export * as <name> from` as an internal dependency.
 *
 * A module reached only that way is not unused. Removing the line makes it
 * unused. `src/atlas/public.ts` is that module in this repository: `src/index.ts`
 * reaches it with `export * as atlas`. Reverting the generator's match puts
 * `public.ts` back on the unused-file list and fails the fixture below.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../helpers/tmp.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const generator = join(repoRoot, 'tools/create-dependency-graph/create-dependency-graph.ts');

function unusedFiles(root: string): string[] {
  const report = readFileSync(join(root, 'docs/architecture/unused-analysis.md'), 'utf8');
  const section = report.split('## Potentially Unused Files')[1]?.split('## Potentially Unused Exports')[0] ?? '';
  return [...section.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]!);
}

/** A tracked fixture tree. The generator reads the git index, not the disk. */
function fixture(indexSource: string): string {
  const root = tempDir('upt-export-star-as-');
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));
  writeFileSync(join(root, 'src/index.ts'), indexSource);
  writeFileSync(join(root, 'src/only-via-star-as.ts'), 'export const MARKER = 1;\n');
  writeFileSync(join(root, 'src/unused-leaf.ts'), 'export const UNUSED = 1;\n');
  execFileSync('git', ['init', '-b', 'fixture'], { cwd: root });
  execFileSync('git', ['add', 'package.json', 'src/index.ts', 'src/only-via-star-as.ts', 'src/unused-leaf.ts'], { cwd: root });
  return root;
}

function generate(root: string): void {
  execFileSync('bun', [generator, `--root=${root}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

describe('docs:deps follows export * as', () => {
  it('does not report a module imported only by export * as, and does report it when that line is removed', () => {
    const withStar = fixture("export * as only from './only-via-star-as.js';\n");
    generate(withStar);
    const reached = unusedFiles(withStar);
    expect(reached).not.toContain('src/only-via-star-as.ts');
    expect(reached).toContain('src/unused-leaf.ts');

    writeFileSync(join(withStar, 'src/index.ts'), 'export const KEPT = 1;\n');
    execFileSync('git', ['add', 'src/index.ts'], { cwd: withStar });
    generate(withStar);
    const dropped = unusedFiles(withStar);
    expect(dropped).toContain('src/only-via-star-as.ts');
    expect(dropped).toContain('src/unused-leaf.ts');
  });

  it('drops src/atlas/public.ts from the committed unused-file list for that reason', () => {
    const report = readFileSync(join(repoRoot, 'docs/architecture/unused-analysis.md'), 'utf8');
    const section = report.split('## Potentially Unused Files')[1]?.split('## Potentially Unused Exports')[0] ?? '';
    expect(section).not.toContain('src/atlas/public.ts');
  });
});
