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
  '@danielsimonjr/mathts-autograd': '^0.6.0',
  '@danielsimonjr/mathts-core': '^0.28.0',
  '@danielsimonjr/mathts-expression': '^0.14.0',
  '@danielsimonjr/mathts-functions': '^0.86.0',
  '@danielsimonjr/mathts-matrix': '^0.11.0',
  '@danielsimonjr/mathts-tensor': '^0.5.0',
};

/** The lowest Node version an `engines.node` range such as `>=22.12` admits, as `[major, minor]`. */
function floorOf(range: string): [number, number] {
  const m = /^>=\s*(\d+)(?:\.(\d+))?/.exec(range);
  if (!m) throw new Error(`not a >= range: ${range}`);
  return [Number(m[1]), Number(m[2] ?? 0)];
}

describe('engines.node is at least every MathTS dependency\'s floor', () => {
  // A library whose floor is below a dependency's installs on a Node the dependency refuses.
  it.each(Object.keys(MATHTS))('%s', (name) => {
    const dep = JSON.parse(readFileSync(resolve(root, 'node_modules', name, 'package.json'), 'utf-8')) as {
      engines?: { node?: string };
    };
    const theirs = dep.engines?.node;
    expect(theirs, `${name} declares engines.node`).toBeDefined();
    const [tm, tn] = floorOf(theirs!);
    const [om, on] = floorOf(pkg.engines.node);
    expect(om > tm || (om === tm && on >= tn), `UPT ${pkg.engines.node} is below ${name} ${theirs}`).toBe(true);
  });

  it('control: the range reader orders minors numerically', () => {
    expect(floorOf('>=22.12')).toEqual([22, 12]);
    expect(floorOf('>=18.0.0')).toEqual([18, 0]);
    expect(() => floorOf('^22')).toThrow();
  });
});

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
