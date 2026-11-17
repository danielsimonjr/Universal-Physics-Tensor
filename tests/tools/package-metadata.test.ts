/**
 * package.json metadata that the registry and GitHub read.
 *
 * - `repository`, `bugs` and `homepage` must name the repository as the remote and every
 *   in-repo citation spell it (`Universal-Physics-Tensor`); the npm NAME stays lower-case.
 * - `directories.doc` named `docs`, which the tarball does not ship (`files` lists it nowhere).
 * - `engines.node` is the floor of the SHIPPED library: 22.12, the floor every
 *   `@danielsimonjr/mathts-*` dependency declares (`tests/tools/package-deps.test.ts` compares
 *   the two). The suite's own floor is `tests/node-floor.test.ts` and CONTRIBUTING.md. The check
 *   here is that `src/` and `bin/` use nothing above the declared floor, so the declared floor
 *   is honest.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  name: string;
  repository: { url: string };
  bugs: { url: string };
  homepage: string;
  directories?: Record<string, string>;
  files: string[];
  engines: { node: string };
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|mjs)$/.test(p) && !/\.d\.ts$/.test(p)) out.push(p);
  }
  return out;
}

describe('package.json URLs', () => {
  it('name the repository the way the remote spells it', () => {
    const remote = 'https://github.com/danielsimonjr/Universal-Physics-Tensor';
    expect(pkg.repository.url).toBe(`git+${remote}.git`);
    expect(pkg.bugs.url).toBe(`${remote}/issues`);
    expect(pkg.homepage).toBe(`${remote}#readme`);
  });

  it('keep the npm name lower-case', () => {
    expect(pkg.name).toBe('universal-physics-tensor');
  });
});

describe('package.json directories', () => {
  it('does not advertise a directory the tarball does not ship', () => {
    for (const dir of Object.values(pkg.directories ?? {})) {
      expect(pkg.files, `directories names ${dir}`).toContain(dir);
    }
  });
});

describe('engines.node is the floor of what ships', () => {
  // Features above Node 22.12. If one of these appears under src/ or bin/, the floor must rise
  // with it.
  const ABOVE_FLOOR: readonly [RegExp, string][] = [
    [/\bError\.isError\b|\bRegExp\.escape\b|\bFloat16Array\b|\bMath\.sumPrecise\b/, 'Node 24'],
    [/\bUint8Array\.fromBase64\b|\.toBase64\(|\bUint8Array\.fromHex\b|\.toHex\(/, 'Node 25'],
  ];

  it('declares >=22.12 and src/ and bin/ use nothing that needs more', () => {
    expect(pkg.engines.node).toBe('>=22.12.0');
    const offenders: string[] = [];
    for (const file of [...walk(resolve(root, 'src')), ...walk(resolve(root, 'bin'))]) {
      const text = readFileSync(file, 'utf8');
      for (const [re, floor] of ABOVE_FLOOR) {
        if (re.test(text)) offenders.push(`${file}: ${re} needs ${floor}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('control: the scan matches a planted use of each newer feature', () => {
    const planted = ['const ok = Error.isError(e);', 'new RegExp(RegExp.escape(s))', 'new Float16Array(4)', 'Math.sumPrecise(xs)', 'Uint8Array.fromBase64(s)', 'bytes.toHex()'];
    for (const line of planted) expect(ABOVE_FLOOR.some(([re]) => re.test(line)), line).toBe(true);
    expect(ABOVE_FLOOR.some(([re]) => re.test('Math.sum(xs); toHexString(); isError(e)'))).toBe(false);
  });
});
