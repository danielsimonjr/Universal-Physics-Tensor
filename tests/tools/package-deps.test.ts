/**
 * MathTS is a required dependency. `@viz-js/viz` stays an optional peer.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));

const MATHTS: Record<string, string> = {
  '@danielsimonjr/mathts-autograd': '^0.3.16',
  '@danielsimonjr/mathts-core': '^0.16.0',
  '@danielsimonjr/mathts-expression': '^0.10.0',
  '@danielsimonjr/mathts-functions': '^0.68.0',
  '@danielsimonjr/mathts-matrix': '^0.7.6',
  '@danielsimonjr/mathts-parallel': '^0.6.8',
  '@danielsimonjr/mathts-tensor': '^0.2.22',
  '@danielsimonjr/mathts-wasm': '^0.3.0',
  '@danielsimonjr/mathts-workerpool': '^0.2.6',
};

describe('package.json dependency blocks', () => {
  it('requires the published MathTS packages and has no optionalDependencies', () => {
    expect(pkg.optionalDependencies ?? {}).toEqual({});
    expect(pkg.dependencies).toEqual(MATHTS);
  });

  it('keeps only @viz-js/viz as an optional peer, mirrored as a devDependency', () => {
    expect(pkg.peerDependencies).toEqual({ '@viz-js/viz': '^3.28.0' });
    expect(pkg.peerDependenciesMeta).toEqual({ '@viz-js/viz': { optional: true } });
    expect(pkg.devDependencies['@viz-js/viz']).toBe('^3.28.0');
    for (const name of Object.keys(MATHTS)) {
      expect(pkg.peerDependencies[name], name).toBeUndefined();
      expect(pkg.devDependencies[name], name).toBeUndefined();
    }
  });
});
