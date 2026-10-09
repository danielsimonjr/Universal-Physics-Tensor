/**
 * CLI hardening for `upt probe` — flag validation, worker guard, file errors.
 *
 * @module tests/cli/upt-probe-hardening
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { tempDir } from '../helpers/tmp.js';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');
const pendulum = resolve(here, '../fixtures/discovery/pendulum-scaling/public/problem.json');

function run(args: string[]): { status: number; stderr: string } {
  try {
    execFileSync('node', [cli, ...args], { stdio: 'pipe', encoding: 'utf8' });
    return { status: 0, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stderr?: Buffer | string };
    return {
      status: err.status ?? 1,
      stderr: String(err.stderr ?? ''),
    };
  }
}

describe('upt probe — flag validation', () => {
  it('rejects non-finite --holdout-tol', () => {
    const { status, stderr } = run([
      'probe',
      'run',
      `--problem=${pendulum}`,
      '--holdout-tol=abc',
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain('--holdout-tol');
  });

  it('rejects Node flag injection via --worker', () => {
    const { status, stderr } = run([
      'probe',
      'run',
      `--problem=${pendulum}`,
      '--worker=--import=./evil.mjs',
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain('--worker');
  });

  it('rejects non-script --worker extension', () => {
    const { status, stderr } = run([
      'probe',
      'run',
      `--problem=${pendulum}`,
      '--worker=/etc/passwd',
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain('--worker');
  });
});

describe('upt probe — file errors', () => {
  it('maps missing --problem file to exit 1 without stack trace', () => {
    const { status, stderr } = run(['probe', 'run', '--problem=/no/such/problem.json']);
    expect(status).toBe(1);
    expect(stderr).toContain('file not found');
    expect(stderr).not.toContain('at loadSearchProblemFromJson');
  });

  it('maps invalid problem JSON to exit 1', () => {
    const dir = tempDir('upt-probe-');
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, '{ not json');
    const { status, stderr } = run(['probe', 'run', `--problem=${bad}`]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/invalid JSON|JSON/);
  });

  it('rejects malformed expr JSON in design --h1', () => {
    const dir = tempDir('upt-probe-design-');
    const h1 = join(dir, 'h1.json');
    writeFileSync(h1, JSON.stringify({ kind: 'symbol' }));
    const h2 = join(dir, 'h2.json');
    writeFileSync(h2, JSON.stringify({ kind: 'symbol', name: 'x', dim: {} }));
    const bounds = join(dir, 'bounds.json');
    writeFileSync(bounds, JSON.stringify({ variables: { x: { min: 0, max: 1 } } }));
    const { status, stderr } = run([
      'probe',
      'design',
      `--h1=${h1}`,
      `--h2=${h2}`,
      `--bounds=${bounds}`,
    ]);
    expect(status).toBe(1);
    expect(stderr).toContain('symbol node missing name');
  });

  it('rejects design bounds missing variables', () => {
    const dir = tempDir('upt-probe-bounds-');
    const h1 = join(dir, 'h1.json');
    writeFileSync(h1, JSON.stringify({ kind: 'symbol', name: 'x', dim: {} }));
    const h2 = join(dir, 'h2.json');
    writeFileSync(h2, JSON.stringify({ kind: 'symbol', name: 'x', dim: {} }));
    const bounds = join(dir, 'bounds.json');
    writeFileSync(bounds, JSON.stringify({ sigma: 1 }));
    const { status, stderr } = run([
      'probe',
      'design',
      `--h1=${h1}`,
      `--h2=${h2}`,
      `--bounds=${bounds}`,
    ]);
    expect(status).toBe(1);
    expect(stderr).toContain('missing variables');
  });
});
