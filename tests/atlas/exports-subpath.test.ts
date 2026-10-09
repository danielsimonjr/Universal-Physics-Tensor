/**
 * Pins the `./atlas` package subpath export. `scripts/package-smoke.mjs`
 * derives its required-file list from `package.json` `exports`, so this test
 * is what keeps the declared target paths honest against the build output.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  exports: Record<string, Record<string, string>>;
  scripts: Record<string, string>;
};

describe('package.json exports["./atlas"]', () => {
  it('exists and declares the same three keys as ./probe', () => {
    const atlas = pkg.exports['./atlas'];
    expect(atlas).toBeDefined();
    expect(Object.keys(atlas).sort()).toEqual(Object.keys(pkg.exports['./probe']).sort());
    expect(Object.keys(atlas).sort()).toEqual(['default', 'import', 'types']);
  });

  it('points every key under dist/atlas/', () => {
    const atlas = pkg.exports['./atlas'];
    expect(atlas.types).toBe('./dist/atlas/index.d.ts');
    expect(atlas.import).toBe('./dist/atlas/index.js');
    expect(atlas.default).toBe('./dist/atlas/index.js');
    for (const target of Object.values(atlas)) {
      expect(target.startsWith('./dist/atlas/')).toBe(true);
    }
  });
});

describe('package.json atlas scripts', () => {
  it('declares test:atlas and atlas:json', () => {
    expect(pkg.scripts['test:atlas']).toBe('vitest run tests/atlas');
    expect(pkg.scripts['atlas:json']).toBe('npm run build && node scripts/emit-atlas-json.mjs');
  });
});
