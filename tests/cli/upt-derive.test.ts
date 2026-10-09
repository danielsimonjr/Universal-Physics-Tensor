/** Regression: `upt derive --formula` crashed with `ReferenceError: api is not
 *  defined` (bin/upt.mjs:363 used api.format; the import is destructured
 *  `format`). Pins the documented cli/README.md worked example. */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');

function run(args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [cli, ...args], { stdio: 'pipe', encoding: 'utf8' });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return { status: err.status ?? 1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

describe('upt derive --formula (regression: api.format ReferenceError)', () => {
  it('runs the README worked example without crashing', () => {
    const r = run(['derive', 'period:time', 'length:length', 'gravity:acceleration',
      '--formula', '2*pi*sqrt(length/gravity)']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('formula dimension:');
    expect(r.stdout).toContain('recovered prefactor');
  });

  it('still reports a dimensional mismatch formula without crashing, and exits 3 (a failed check)', () => {
    const r = run(['derive', 'period:time', 'mass:mass', '--formula', 'mass']);
    expect(r.status).toBe(3);
    expect(r.stdout).toContain('⚠ homogeneous but ≠ target');
  });
});
