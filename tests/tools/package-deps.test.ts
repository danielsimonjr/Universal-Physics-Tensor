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
  '@danielsimonjr/mathts-autograd': '^0.4.3',
  '@danielsimonjr/mathts-core': '^0.24.4',
  '@danielsimonjr/mathts-expression': '^0.12.4',
  '@danielsimonjr/mathts-functions': '^0.77.2',
  '@danielsimonjr/mathts-matrix': '^0.9.3',
  '@danielsimonjr/mathts-tensor': '^0.3.3',
};

describe('package.json dependency blocks', () => {
  it('requires the published MathTS packages and has no optionalDependencies', () => {
    expect(pkg.optionalDependencies ?? {}).toEqual({});
    expect(pkg.dependencies).toEqual(MATHTS);
  });

  it('does not list the MathTS packages that src/ never imports', () => {
    for (const name of ['wasm', 'parallel', 'workerpool']) {
      expect(pkg.dependencies[`@danielsimonjr/mathts-${name}`], name).toBeUndefined();
    }
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
