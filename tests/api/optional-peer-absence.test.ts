/**
 * `@viz-js/viz` stays an optional peer and must not be reached from the
 * public barrel. The MathTS packages are required dependencies, so the
 * barrel does reach them.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

function optionalPeers(): string[] {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  };
  return Object.entries(pkg.peerDependenciesMeta ?? {})
    .filter(([, meta]) => meta.optional === true)
    .map(([name]) => name);
}

function resolveLocal(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = join(dirname(fromFile), spec);
  for (const candidate of [base, join(base, 'index.js')]) {
    if (existsSync(candidate) && candidate.endsWith('.js')) return candidate;
  }
  return null;
}

function reachableFrom(entry: string): { files: Set<string>; externals: Map<string, string[]> } {
  const files = new Set<string>();
  const externals = new Map<string, string[]>();
  const queue = [resolve(entry)];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (files.has(file) || !existsSync(file)) continue;
    files.add(file);

    const src = readFileSync(file, 'utf8');
    const staticSpecs = [
      ...src.matchAll(
        /(?:^|[\s;}])(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]/g,
      ),
    ].map((m) => m[1]!);
    const dynamicSpecs = [...src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);

    for (const spec of [...staticSpecs, ...dynamicSpecs]) {
      const local = resolveLocal(file, spec);
      if (local !== null) queue.push(local);
    }
    for (const spec of staticSpecs) {
      if (resolveLocal(file, spec) === null && !spec.startsWith('node:')) {
        externals.set(file, [...(externals.get(file) ?? []), spec]);
      }
    }
  }
  return { files, externals };
}

describe('the public barrel reaches MathTS and not the optional viz peer', () => {
  const entry = resolve('dist/index.js');

  it('dist/index.js exists — the build ran', () => {
    expect(existsSync(entry)).toBe(true);
  });

  it('the only optional peer is @viz-js/viz', () => {
    expect(optionalPeers()).toEqual(['@viz-js/viz']);
  });

  it('the barrel statically imports a MathTS package and not @viz-js/viz', () => {
    const { files, externals } = reachableFrom(entry);
    expect(files.size).toBeGreaterThan(10);
    const specs = [...externals.values()].flat();
    expect(specs.some((s) => s.startsWith('@danielsimonjr/mathts-'))).toBe(true);
    expect(specs.some((s) => s === '@viz-js/viz' || s.startsWith('@viz-js/viz/'))).toBe(false);
  });
});
