/**
 * The layer-order gate has to be able to fail. Each control names the edge,
 * the row, or the cycle that makes it fail. A checker that always returned
 * ok would fail these tests.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  allowlistAbsentOnBase,
  canonicalizeCycle,
  cyclesOf,
  gate,
  isUpward,
  judge,
  resolveSpecifier,
  scanFileImports,
  tierOf,
  type Allowlist,
  type Found,
} from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const extra = 'src/core/tensor.ts -> src/atlas/types.ts';
const row = 'src/core/labeled-tensor.ts -> src/numerical/tensor-engine.ts';
const cycle = [
  'src/dimensional/curvature.ts',
  'src/numerical/index.ts',
  'src/numerical/lowering.ts',
];

function found(partial: Partial<Found>): Found {
  return { edges: partial.edges ?? [], cycles: partial.cycles ?? [], unknown: partial.unknown ?? [] };
}

function allow(partial: Partial<Allowlist>): Allowlist {
  return { edges: partial.edges ?? [], cycles: partial.cycles ?? [] };
}

describe('layer-order scanner', () => {
  it('ignores an import written inside a comment or a string', () => {
    const source = `
      // import './atlas/types.js'
      /* export { x } from './hidden.js' */
      const s = "import('../atlas/types.js')";
      const t = 'from "./also-hidden.js"';
    `;
    expect(scanFileImports(source)).toEqual([]);
  });

  it('captures import type, export from, dynamic import, and an import type query', () => {
    const source = `
      import type { A } from './a.js';
      export { sym } from './b.js';
      export type { T } from './e.js';
      import './side.js';
      const p = import('./c.js');
      const q = await import(
        './f.js'
      );
      type R = import('./d.js').Regime;
    `;
    expect(scanFileImports(source).sort()).toEqual([
      './a.js',
      './b.js',
      './c.js',
      './d.js',
      './e.js',
      './f.js',
      './side.js',
    ]);
  });

  it('resolves a .js specifier to the TypeScript file and skips packages and declaration files', () => {
    expect(resolveSpecifier('src/dimensional/curvature.ts', '../numerical/index.js', root)).toBe(
      'src/numerical/index.ts',
    );
    expect(resolveSpecifier('src/cli/commands/path.ts', '../../cli-api.js', root)).toBe('src/cli-api.ts');
    expect(resolveSpecifier('src/dimensional/curvature.ts', '@danielsimonjr/mathts-tensor', root)).toBeNull();

    const dir = mkdtempSync(join(tmpdir(), 'layer-order-'));
    try {
      const src = join(dir, 'src', 'core');
      mkdirSync(src, { recursive: true });
      writeFileSync(join(src, 'a.ts'), 'export {};\n');
      writeFileSync(join(src, 'only.d.ts'), 'export {};\n');
      expect(resolveSpecifier('src/core/a.ts', './only.js', dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    expect(() => resolveSpecifier('src/dimensional/curvature.ts', './missing-module.js', root)).toThrow(
      /unresolved import: src\/dimensional\/curvature.ts -> \.\/missing-module\.js/,
    );
  });
});

describe('layer-order tiers', () => {
  it('ranks the picture, including the relations tier and the barrel', () => {
    expect(tierOf('src/core/tensor.ts')).toBe(0);
    expect(tierOf('src/dimensional/curvature.ts')).toBe(1);
    expect(tierOf('src/numerical/index.ts')).toBe(1);
    expect(tierOf('src/relations/regime.ts')).toBe(2);
    expect(tierOf('src/canonical/linkage.ts')).toBe(3);
    expect(tierOf('src/bridges/index.ts')).toBe(3);
    expect(tierOf('src/cases/x.ts')).toBe(3);
    expect(tierOf('src/diff/x.ts')).toBe(3);
    expect(tierOf('src/composition/probe/x.ts')).toBe(4);
    expect(tierOf('src/atlas/types.ts')).toBe(5);
    expect(tierOf('src/cli/commands/map.ts')).toBe(6);
    expect(tierOf('src/cli-api.ts')).toBe(6);
    expect(tierOf('src/index.ts')).toBe('barrel');
    expect(tierOf('src/mystery/x.ts')).toBe('unknown');
  });

  it('treats peers, downward imports, and the barrel as legal', () => {
    expect(isUpward('src/bridges/index.ts', 'src/composition/catalog-graph.ts')).toBe(true);
    expect(isUpward('src/dimensional/curvature.ts', 'src/numerical/index.ts')).toBe(false);
    expect(isUpward('src/composition/compose.ts', 'src/bridges/index.ts')).toBe(false);
    expect(isUpward('src/cli-api.ts', 'src/atlas/types.ts')).toBe(false);
    expect(isUpward('src/cli-api.ts', 'src/index.ts')).toBe(false);
    expect(isUpward('src/index.ts', 'src/atlas/public.ts')).toBe(false);
  });
});

describe('layer-order cycles', () => {
  it('reports one directed cycle, rotated so the lex-smallest node is first', () => {
    expect(
      cyclesOf([
        ['src/numerical/index.ts', 'src/dimensional/curvature.ts'],
        ['src/dimensional/curvature.ts', 'src/numerical/index.ts'],
      ]),
    ).toEqual([['src/dimensional/curvature.ts', 'src/numerical/index.ts']]);
    expect(canonicalizeCycle(['src/numerical/lowering.ts', 'src/dimensional/curvature.ts', 'src/numerical/index.ts'])).toEqual([
      'src/dimensional/curvature.ts',
      'src/numerical/index.ts',
      'src/numerical/lowering.ts',
    ]);
  });
});

describe('layer-order judge', () => {
  it('fails on an extra upward edge and names it', () => {
    const result = judge(found({ edges: [extra] }), allow({}), null);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(`upward edge not allowlisted: ${extra}`);
  });

  it('fails on a stale allowlist row and names it', () => {
    const result = judge(found({}), allow({ edges: [row] }), null);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(`allowlist edge is not in the tree: ${row}`);
  });

  it('fails when the allowlist grows past the base and names the row', () => {
    const result = judge(found({ edges: [row] }), allow({ edges: [row] }), allow({}));
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(`allowlist grew past the base: ${row}`);
  });

  it('fails on an extra cycle and names it', () => {
    const result = judge(found({ cycles: [cycle] }), allow({}), null);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'cycle not allowlisted: src/dimensional/curvature.ts -> src/numerical/index.ts -> src/numerical/lowering.ts -> src/dimensional/curvature.ts',
    );
  });

  it('fails on a stale allowlist cycle', () => {
    const result = judge(found({}), allow({ cycles: [cycle] }), null);
    expect(result.errors).toContain(
      'allowlist cycle is not in the tree: src/dimensional/curvature.ts -> src/numerical/index.ts -> src/numerical/lowering.ts -> src/dimensional/curvature.ts',
    );
  });

  it('passes when the allowlist matches the tree and is a subset of a larger base', () => {
    const result = judge(
      found({ edges: [row], cycles: [cycle] }),
      allow({ edges: [row], cycles: [cycle] }),
      allow({ edges: [row, extra], cycles: [cycle, ['src/a.ts', 'src/b.ts']] }),
    );
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('passes the starting set against itself when there is no base allowlist yet', () => {
    const result = judge(found({ edges: [row], cycles: [cycle] }), allow({ edges: [row], cycles: [cycle] }), null);
    expect(result.ok).toBe(true);
  });

  it('fails on an unknown directory', () => {
    const result = judge(found({ unknown: ['src/mystery/x.ts'] }), allow({}), null);
    expect(result.errors).toContain('unknown tier: src/mystery/x.ts');
  });

  it('treats a missing allowlist path on origin/master as absent, and any other git error as present', () => {
    expect(
      allowlistAbsentOnBase("fatal: path 'tools/layer-order/allowlist.json' does not exist in 'origin/master'\n"),
    ).toBe(true);
    expect(
      allowlistAbsentOnBase(
        "fatal: path 'tools/layer-order/allowlist.json' exists on disk, but not in 'origin/master'\n",
      ),
    ).toBe(true);
    expect(allowlistAbsentOnBase('fatal: bad object origin/master')).toBe(false);
  });
});

/**
 * The live gate reads `origin/master`. The `test` and `quality` jobs fetch it.
 * `long-tests` runs the same suite when `src/numerical/` changes, and a
 * depth-1 checkout of the pull-request branch does not have that ref.
 */
export function longTestsFetchesMasterBeforeSuite(yml: string): boolean {
  const marker = '\n  long-tests:';
  const start = yml.indexOf(marker);
  if (start < 0) return false;
  const rest = yml.slice(start + marker.length);
  const next = rest.search(/\n  [a-z0-9-]+:/);
  const job = next < 0 ? rest : rest.slice(0, next);
  const fetchAt = job.indexOf('git fetch origin master --depth=1');
  const testAt = job.indexOf('bun run test');
  return fetchAt >= 0 && testAt > fetchAt;
}

describe('layer-order live tree', () => {
  it('matches the committed allowlist', () => {
    const result = gate(root);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('long-tests fetches origin/master before the suite', () => {
    const yml = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
    expect(longTestsFetchesMasterBeforeSuite(yml)).toBe(true);
  });

  it('POSITIVE CONTROL: a suite step with no fetch is not enough', () => {
    const yml = [
      'jobs:',
      '  long-tests:',
      '    steps:',
      '      - run: bun run test',
      '  other:',
      '    steps:',
      '      - run: git fetch origin master --depth=1',
      '',
    ].join('\n');
    expect(longTestsFetchesMasterBeforeSuite(yml)).toBe(false);
  });
});
