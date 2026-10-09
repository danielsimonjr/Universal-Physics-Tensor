/**
 * A comment that names a file the tree no longer has is a false claim every
 * reader of that comment loads (9.0.0 audit §2 N19: `src/bridges/equations/`
 * was removed at 8.0.0 and three modules still cited it).
 *
 * @module tests/internal/no-removed-paths
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

/** Paths that were removed from the tree; a mention is a stale claim. */
const REMOVED = ['src/bridges/equations/', 'bridges/equations/', 'be-37-shapiro-delay.ts'];

describe('no module in core, dimensional, numerical or diff names a removed path (N19)', () => {
  it('the paths are removed (the scan looks for what is absent)', () => {
    expect(existsSync(resolve(SRC, 'bridges/equations'))).toBe(false);
  });

  it('no mention remains', () => {
    const hits: string[] = [];
    for (const dir of ['core', 'dimensional', 'numerical', 'diff']) {
      for (const file of walk(resolve(SRC, dir))) {
        const text = readFileSync(file, 'utf-8');
        for (const removed of REMOVED) {
          if (text.includes(removed)) hits.push(`${relative(SRC, file)}: ${removed}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
