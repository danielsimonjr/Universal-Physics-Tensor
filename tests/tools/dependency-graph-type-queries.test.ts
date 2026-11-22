/**
 * `docs:deps` records a TS type query — `import('…').TypeName` — as a
 * type-only edge, not a runtime side-effect load.
 *
 * A type query loads nothing at runtime: it is erased at emit. The generator's
 * dynamic-import scan used to record it as a bare `import()` side-effect edge,
 * which both added a bogus runtime edge in `dependency-graph.json` and credited
 * testers through the side-effect closure (e.g. `src/dimensional/types.ts`
 * gained testers from `src/cli/commands/map.ts`'s
 * `import('../../dimensional/types.js').Dimension`, and
 * `validator.ts` from `src/composition/user-equation.ts`'s
 * `import('../dimensional/validator.js').ExprNode`).
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../helpers/tmp.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const generator = join(repoRoot, 'tools/create-dependency-graph/create-dependency-graph.ts');

/** A tracked fixture tree. The generator reads the git index, not the disk. */
function fixture(indexSource: string, extraFiles: Record<string, string> = {}): string {
  const root = tempDir('upt-depgraph-type-query-');
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', version: '0.0.0' }));
  writeFileSync(join(root, 'src/index.ts'), indexSource);
  writeFileSync(join(root, 'src/dep.ts'), 'export type Dep = number;\n');
  writeFileSync(join(root, 'src/runtime-dep.ts'), 'export const RUNTIME = 1;\n');
  for (const [rel, body] of Object.entries(extraFiles)) {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  execFileSync('git', ['init', '-b', 'fixture'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  return root;
}

function generate(root: string): void {
  execFileSync('bun', [generator, `--root=${root}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

interface Edge {
  file: string;
  imports: string[];
  typeOnly?: boolean;
  sideEffect?: boolean;
}

function moduleEdges(root: string, from: string): Edge[] {
  const graph = JSON.parse(readFileSync(join(root, 'docs/architecture/dependency-graph.json'), 'utf8')) as {
    modules: Record<string, Record<string, { internalDependencies: Edge[] }>>;
  };
  const group = Object.values(graph.modules).find((m) => m[`src/${from}.ts`] !== undefined);
  expect(group, `src/${from}.ts is in the graph`).toBeDefined();
  return group![`src/${from}.ts`]!.internalDependencies;
}

function edges(root: string, from: string): Edge[] {
  return moduleEdges(root, from).filter((d) => d.file === './dep.js' || d.file === './runtime-dep.js');
}

/**
 * The S3-shipped classifier: any `.Member` after `import()` is type-only,
 * including a runtime `.then(`. TypeScript 7 ships no compiler API
 * (`MEMORY.md`), so the generator must scan source text; this regex is the
 * defect, kept here so the CONTROL still fails on it after the generator is
 * fixed.
 */
function shippedMemberSuffixIsTypeQuery(source: string): boolean {
  const dynamicImportRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)\s*(?:\.\s*([\w$]+))?/g;
  const match = dynamicImportRegex.exec(source);
  return match !== null && match[2] !== undefined;
}

describe('docs:deps records TS type queries as type-only', () => {
  it('a type query edge carries typeOnly and no runtime sideEffect edge is added', () => {
    const root = fixture(
      [
        "export type Alias = import('./dep.js').Dep;",
        'export const value = 1;',
        '',
      ].join('\n'),
    );
    generate(root);
    const depEdges = edges(root, 'index');
    expect(depEdges.length, JSON.stringify(depEdges)).toBe(1);
    expect(depEdges[0]!.typeOnly).toBe(true);
  });

  it('CONTROL: a real dynamic import is still a runtime side-effect edge (no typeOnly)', () => {
    const root = fixture(
      [
        "export type Alias = import('./dep.js').Dep;",
        "async function load(): Promise<number> { return (await import('./runtime-dep.js')).RUNTIME; }",
        'export const value = load;',
        '',
      ].join('\n'),
    );
    generate(root);
    const runtimeEdges = edges(root, 'index').filter((d) => d.file === './runtime-dep.js');
    expect(runtimeEdges.length, JSON.stringify(runtimeEdges)).toBe(1);
    expect(runtimeEdges[0]!.typeOnly).toBeUndefined();
  });

  it('CONTROL: the shipped member-suffix regex classifies .then( as a type query', () => {
    const src = "commandsPromise ??= import('./commands/index.js').then(() => undefined);";
    expect(shippedMemberSuffixIsTypeQuery(src), 'the buggy regex must still fire on .then(').toBe(true);
    expect(
      shippedMemberSuffixIsTypeQuery("export type Alias = import('./dep.js').Dep;"),
      'the buggy regex also fires on a real type query',
    ).toBe(true);
  });

  it('CONTROL: import().then() is a runtime side-effect edge, not typeOnly', () => {
    const src = "export const commandsPromise = import('./commands/index.js').then(() => undefined);\n";
    expect(shippedMemberSuffixIsTypeQuery(src), 'this CONTROL is the shape the shipped regex gets wrong').toBe(true);
    const root = fixture(src, { 'src/commands/index.ts': 'export const CMD = 1;\n' });
    generate(root);
    const commandEdges = moduleEdges(root, 'index').filter((d) => d.file === './commands/index.js');
    expect(commandEdges.length, JSON.stringify(commandEdges)).toBe(1);
    expect(commandEdges[0]!.typeOnly, JSON.stringify(commandEdges[0])).toBeUndefined();
    expect(commandEdges[0]!.sideEffect, JSON.stringify(commandEdges[0])).toBe(true);
  });

  it('a type-annotation import().Member is typeOnly', () => {
    const root = fixture('let expr: import(\'./dep.js\').Dep | null = null;\nexport const value = 1;\n');
    generate(root);
    const depEdges = edges(root, 'index').filter((d) => d.file === './dep.js');
    expect(depEdges.length, JSON.stringify(depEdges)).toBe(1);
    expect(depEdges[0]!.typeOnly).toBe(true);
    expect(depEdges[0]!.sideEffect).toBeUndefined();
  });
});
