/**
 * The codepoint order `a < b ? -1 : a > b ? 1 : 0` has one owner,
 * `compareCodepoint` in `src/core/compare.ts`. The frozen criterion-2 study
 * file `src/atlas/benchmark/baselines.ts` keeps its own spelling (its blob is
 * part of the frozen study). Any other spelling under `src/` is a second owner.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '../..');
const EXEMPT = new Set(['src/core/compare.ts', 'src/atlas/benchmark/baselines.ts']);
/** `x < y ? -1 : x > y ? 1 : 0`, with any operands. */
const TERNARY = /<[^?;\n]*\?\s*-1\s*:[^?;\n]*>[^?;\n]*\?\s*1\s*:\s*0/;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith('.ts')) out.push(path);
  }
}

function hits(): string[] {
  const files: string[] = [];
  walk(join(root, 'src'), files);
  const out: string[] = [];
  for (const file of files) {
    const rel = relative(root, file).replaceAll('\\', '/');
    if (EXEMPT.has(rel)) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (TERNARY.test(line)) out.push(`${rel}:${i + 1}`);
    });
  }
  return out;
}

describe('compareCodepoint is the one codepoint comparator', () => {
  it('CONTROL: the scan matches the spelling it forbids, and the owner itself', () => {
    expect(TERNARY.test('return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;')).toBe(true);
    expect(TERNARY.test('return a < b ? -1 : a > b ? 1 : 0;')).toBe(true);
    expect(TERNARY.test(readFileSync(join(root, 'src/core/compare.ts'), 'utf8'))).toBe(true);
    expect(TERNARY.test('a.localeCompare(b)')).toBe(false);
  });

  it('no file under src/ other than the owner and the frozen baselines spells it', () => {
    expect(hits()).toEqual([]);
  });
});
