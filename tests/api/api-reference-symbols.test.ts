/**
 * `docs/architecture/API.md` is hand-written. Every symbol it presents as importable from the
 * package root (an `import { … } from 'universal-physics-tensor'` fence, or a row of its
 * symbol tables) must be a runtime export of `dist/index.js` or a type export named in
 * `dist/index.d.ts`. Found by Tom's second-round sweep: the reference still documented
 * `evaluateGravitationalLensing`, `evaluatePerihelionPrecession` and their four types,
 * removed in 6.0.0.
 *
 * @module tests/api/api-reference-symbols
 */
import '../helpers/dist.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as root from '../../dist/index.js';

const ROOT = join(import.meta.dirname, '../..');
const doc = readFileSync(join(ROOT, 'docs/architecture/API.md'), 'utf8');
const dts = readFileSync(join(ROOT, 'dist/index.d.ts'), 'utf8');

/** Type names `dist/index.d.ts` exports: `export type { A, B }` clauses and `export type X`/`export interface X`. */
function typeExports(): Set<string> {
  const names = new Set<string>();
  for (const m of dts.matchAll(/export type \{([^}]*)\}/g)) {
    for (const part of m[1]!.split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }
  for (const m of dts.matchAll(/export (?:type|interface|declare type) (\w+)/g)) names.add(m[1]!);
  // `export { fn, type A, type B } from '…'`: the inline `type` members.
  for (const m of dts.matchAll(/export \{([^}]*)\}/g)) {
    for (const t of m[1]!.matchAll(/\btype (\w+)/g)) names.add(t[1]!);
  }
  return names;
}

function importedNames(): { name: string; line: number }[] {
  const out: { name: string; line: number }[] = [];
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'universal-physics-tensor'/g;
  for (const m of doc.matchAll(re)) {
    const line = doc.slice(0, m.index).split('\n').length;
    for (const part of m[1]!.split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim();
      if (name) out.push({ name, line });
    }
  }
  return out;
}

function tableRows(): { name: string; line: number }[] {
  const out: { name: string; line: number }[] = [];
  doc.split('\n').forEach((text, i) => {
    const m = /^\| `([A-Za-z_][\w]*)` \| `[\w/-]+` \|/.exec(text);
    if (m) out.push({ name: m[1]!, line: i + 1 });
  });
  return out;
}

describe('docs/architecture/API.md names only symbols the package root exports', () => {
  const types = typeExports();
  const exists = (name: string): boolean => name in root || types.has(name);

  it('control: the extractor sees the import fences and the symbol tables', () => {
    expect(importedNames().length).toBeGreaterThan(20);
    expect(tableRows().length).toBeGreaterThan(20);
    expect(exists('BRIDGE_EQUATIONS')).toBe(true);
    expect(exists('Dimension')).toBe(true);
    expect(exists('GeodesicIntegratorInputs')).toBe(true);
    expect(exists('noSuchSymbolXyz')).toBe(false);
  });

  it('every imported name in a code fence is a root export', () => {
    const missing = importedNames().filter((x) => !exists(x.name)).map((x) => `${x.name} (line ${x.line})`);
    expect(missing).toEqual([]);
  });

  it('every row of the symbol tables is a root export', () => {
    const missing = tableRows().filter((x) => !exists(x.name)).map((x) => `${x.name} (line ${x.line})`);
    expect(missing).toEqual([]);
  });
});
