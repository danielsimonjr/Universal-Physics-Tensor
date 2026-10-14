/**
 * The Lean proofs live in this repository (11.0.0). Every theorem a catalog or
 * atlas record names is declared in the file the vendored map gives for it, in
 * this tree's `lean/`, and the aggregator `lean.lean` imports every file there,
 * so the CI `lake build` and axiom audit cover each one. `lean/` is not in the
 * npm package.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { declaredTheorems } from '../../scripts/vendor-physjs.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const theoremFiles = (JSON.parse(readFileSync(resolve(root, 'formal/physjs/theorem-files.json'), 'utf-8')) as { files: Record<string, string> }).files;

describe('lean/ holds every theorem a record names', () => {
  it('maps at least one theorem (the scan is not vacuous)', () => {
    expect(Object.keys(theoremFiles).length).toBeGreaterThan(100);
  });

  it('each named theorem is declared in its file under lean/', () => {
    const missing: string[] = [];
    const cache = new Map<string, readonly string[]>();
    for (const [theorem, file] of Object.entries(theoremFiles)) {
      const path = resolve(root, file);
      if (!existsSync(path)) {
        missing.push(`${theorem}: ${file} does not exist`);
        continue;
      }
      let declared = cache.get(file);
      if (declared === undefined) {
        declared = declaredTheorems(readFileSync(path, 'utf-8'));
        cache.set(file, declared);
      }
      if (!declared.includes(theorem)) missing.push(`${theorem}: not declared in ${file}`);
    }
    expect(missing).toEqual([]);
  });

  it('lean.lean reaches every file in lean/, directly or through an import, so CI builds and audits each', () => {
    const importsOf = (path: string): string[] =>
      readFileSync(path, 'utf-8')
        .split(/\r?\n/)
        .map((line) => /^import lean\.(\w+)\s*$/.exec(line)?.[1])
        .filter((name): name is string => name !== undefined);
    const files = readdirSync(resolve(root, 'lean'))
      .filter((name) => name.endsWith('.lean'))
      .map((name) => name.slice(0, -'.lean'.length));
    const reached = new Set<string>();
    const queue = importsOf(resolve(root, 'lean.lean'));
    while (queue.length > 0) {
      const name = queue.pop()!;
      if (reached.has(name)) continue;
      reached.add(name);
      expect(files, `lean.${name} is imported but lean/${name}.lean does not exist`).toContain(name);
      queue.push(...importsOf(resolve(root, 'lean', `${name}.lean`)));
    }
    expect(files.filter((name) => !reached.has(name))).toEqual([]);
  });

  it('lean/ is not shipped in the npm package', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')) as { files: string[] };
    expect(pkg.files.some((entry) => entry === 'lean' || entry.startsWith('lean/') || entry.startsWith('lean.'))).toBe(false);
  });
});