/**
 * Issue 556: `require('universal-physics-tensor/package.json')` must resolve.
 *
 * Node resolves a package's own name from inside the package (self-reference),
 * through the same `exports` map a consumer sees. The control proves that
 * self-reference works in this tree, so a refusal of `./package.json` is the
 * exports map and not the resolver.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  name: string;
  version: string;
};

describe('package.json is an exported subpath (issue 556)', () => {
  it('CONTROL: self-reference resolves an exported subpath', () => {
    expect(require.resolve(`${pkg.name}/probe`)).toMatch(/dist[\\/]composition[\\/]probe[\\/]index\.js$/);
  });

  it('CONTROL: self-reference refuses a subpath that is not exported', () => {
    expect(() => require.resolve(`${pkg.name}/tsconfig.json`)).toThrow(/ERR_PACKAGE_PATH_NOT_EXPORTED|not defined by "exports"/);
  });

  it('require of the package.json subpath reads this version', () => {
    const read = require(`${pkg.name}/package.json`) as { version: string };
    expect(read.version).toBe(pkg.version);
  });
});
