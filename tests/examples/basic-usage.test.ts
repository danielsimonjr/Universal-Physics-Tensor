/**
 * `examples/basic-usage.ts` imports the package the way a user does.
 *
 * A relative `../src/index.js` import resolves only inside this checkout.
 * The example runs under Node's type stripper against the package exports.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../helpers/tmp.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('examples/basic-usage.ts', () => {
  const source = readFileSync(resolve(root, 'examples/basic-usage.ts'), 'utf8');

  it('imports the package name', () => {
    expect(source).toContain("from 'universal-physics-tensor'");
    expect(source).not.toContain('../src/');
    expect(source).toContain('import type { PhysicalLaw, BridgeEquation }');
  });

  it('runs against the package exports', () => {
    const dir = tempDir('upt-basic-usage-');
    mkdirSync(join(dir, 'node_modules'));
    symlinkSync(root, join(dir, 'node_modules', 'universal-physics-tensor'));
    copyFileSync(resolve(root, 'examples/basic-usage.ts'), join(dir, 'basic-usage.ts'));
    const result = spawnSync(process.execPath, ['--experimental-strip-types', 'basic-usage.ts'], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Schrödinger Equation');
    expect(result.stdout).toContain('Ehrenfest Theorem');
  });
});
