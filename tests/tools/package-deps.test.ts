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
  '@danielsimonjr/mathts-autograd': '^0.4.4',
  '@danielsimonjr/mathts-core': '^0.25.3',
  '@danielsimonjr/mathts-expression': '^0.12.5',
  '@danielsimonjr/mathts-functions': '^0.79.0',
  '@danielsimonjr/mathts-matrix': '^0.9.5',
  '@danielsimonjr/mathts-tensor': '^0.3.4',
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

  it('keeps @viz-js/viz (mirrored as a devDependency) and @huggingface/transformers (not installed) as optional peers', () => {
    expect(pkg.peerDependencies).toEqual({ '@huggingface/transformers': '^4.3.2', '@viz-js/viz': '^3.28.0' });
    expect(pkg.peerDependenciesMeta).toEqual({ '@huggingface/transformers': { optional: true }, '@viz-js/viz': { optional: true } });
    expect(pkg.devDependencies['@viz-js/viz']).toBe('^3.28.0');
    // The embedding library is not a devDependency: a CLI test asserts library-not-installed,
    // and CI installs no native onnxruntime addon.
    expect(pkg.devDependencies['@huggingface/transformers']).toBeUndefined();
    for (const name of Object.keys(MATHTS)) {
      expect(pkg.peerDependencies[name], name).toBeUndefined();
      expect(pkg.devDependencies[name], name).toBeUndefined();
    }
  });
});
