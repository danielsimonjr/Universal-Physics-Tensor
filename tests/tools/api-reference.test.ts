/**
 * The generated user API reference: `scripts/api-reference.ts` renders exactly
 * the committed `docs/user/api.md`, and the page is grounded in the real
 * surface.
 *
 * The mutation CONTROL (law 2) changes one TSDoc summary in the source the
 * renderer reads and proves the rendered page changes — that is the exact
 * condition `bun scripts/api-reference.ts --check` exits 1 on, so a summary
 * drift shows up as a failing gate rather than a silently stale page.
 *
 * @module tests/tools/api-reference
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderApiReference } from '../../scripts/api-reference.js';
import { setSourceReaderForTest } from '../../scripts/public-tsdoc-gaps.js';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const SRC = join(REPO, 'src');
const PAGE = join(REPO, 'docs/user/api.md');

function committed(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8');
}

function committedPage(): string {
  return readFileSync(PAGE, 'utf8');
}

/** Remove the JSDoc block immediately above `needle` (the S12 test's pattern). */
function stripJsdocBefore(source: string, needle: string): string {
  const idx = source.indexOf(needle);
  if (idx < 0) throw new Error(`export needle not found: ${needle}`);
  const before = source.slice(0, idx);
  const start = before.lastIndexOf('/**');
  if (start < 0) throw new Error(`no JSDoc immediately before ${needle}`);
  if (!/^\/\*\*[\s\S]*\*\/\s*$/.test(before.slice(start))) {
    throw new Error(`no JSDoc immediately before ${needle}`);
  }
  return before.slice(0, start) + source.slice(idx);
}

describe('api-reference', () => {
  it('the rendered page is byte-identical to the committed docs/user/api.md', () => {
    expect(renderApiReference()).toBe(committedPage());
  });

  it('the page covers the full public surface: 232 runtime rows, 248 type rows, 33 atlas members', () => {
    const page = committedPage();
    // 233 snapshot runtime names minus the `atlas` namespace binding, which is
    // its own section (publicSymbolMeta('atlas') resolves to null by design).
    const runtimeRows = (page.match(/^\| `[A-Za-z_$][\w$]*` \| `[\w/-]+` \|/gm) ?? []).length;
    expect(runtimeRows).toBe(232 + 248 + 33);
    expect(page).toContain('## Root runtime exports (`universal-physics-tensor`)');
    expect(page).toContain('## Root type exports (`universal-physics-tensor`)');
    expect(page).toContain("## The `atlas` namespace (`import { atlas } from 'universal-physics-tensor'`)");
    expect(page).toContain('## Subpath export (`universal-physics-tensor/numerical/mathts-engine`)');
    expect(page).toContain('`MathTSEngine`');
    expect(page).toContain('`matMul(a: EngineTensor, b: EngineTensor): EngineTensor`');
    expect(committedPage()).toContain('The `atlas` namespace binding is its own section below');
  });

  it('the page links the getting-started guide, the catalog guide and the engineering API reference', () => {
    const page = committedPage();
    expect(page).toContain('[the getting-started guide](getting-started.md)');
    expect(page).toContain('[the equation and constant catalog guide](catalog.md)');
    expect(page).toContain('[the engineering API reference](../architecture/API.md)');
    // The only import-shaped strings are real exports (the `Axes` summary
    // quotes its own usage); api-reference-symbols.test.ts checks every fence
    // against dist, this pins what the generator emits.
    const fences = [...page.matchAll(/import\s*\{[^}]*\}\s*from\s*'universal-physics-tensor[^']*'/g)].map((m) => m[0]);
    expect(fences).toEqual([
      "import { Axes } from 'universal-physics-tensor'",
      "import { atlas } from 'universal-physics-tensor'",
    ]);
  });

  it('CONTROL: changing one TSDoc summary changes the rendered page, so --check fails on drift', () => {
    const path = 'numerical/geodesic-integrator.ts';
    const stripped = stripJsdocBefore(committed(path), 'export interface GeodesicIntegratorInputs');
    expect(stripped).not.toBe(committed(path));
    const restore = setSourceReaderForTest((rel) => (rel === path ? stripped : committed(rel)));
    try {
      const drifted = renderApiReference();
      expect(drifted).not.toBe(committedPage());
      const emptyRow = drifted
        .split('\n')
        .find((line) => line.startsWith('| `GeodesicIntegratorInputs` |'));
      expect(emptyRow).toBeDefined();
      expect(emptyRow!).toMatch(/\|  \|$/);
    } finally {
      restore();
    }
    expect(renderApiReference()).toBe(committedPage());
  });
});
