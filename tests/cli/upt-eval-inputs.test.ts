/**
 * CLI input-validation guard for `upt eval` (parity with `upt explain`).
 *
 * `evalCmd` used to silently drop/coerce malformed `name=value` inputs:
 *   - positional without `=` was ignored;
 *   - `mass=abc` (NaN) was stored as NaN;
 *   - `mass=` coerced to 0; `mass=1e500` flowed in as Infinity.
 * A binding with no `=` is a usage error (exit 2). A value that is not a
 * finite number or a known unit is a bad value (exit 1), the same code
 * `upt evaluate` uses for `mu_e=nope`.
 *
 * @module tests/cli/upt-eval-inputs
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');

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

describe('upt eval — input validation', () => {
  it('rejects a non-numeric value (b=abc) as a bad value', () => {
    const { status } = run(['eval', 'a*b', 'a=2', 'b=abc']);
    expect(status).toBe(1);
  });

  it('rejects x=nope as a bad value', () => {
    const { status, stderr } = run(['eval', 'x', 'x=nope']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/x=nope/);
  });

  it('rejects an empty value (b=) as a bad value', () => {
    const { status } = run(['eval', 'a*b', 'a=2', 'b=']);
    expect(status).toBe(1);
  });

  it('rejects a non-finite value (b=1e500 → Infinity) as a bad value', () => {
    const { status } = run(['eval', 'a*b', 'a=2', 'b=1e500']);
    expect(status).toBe(1);
  });

  it('rejects a positional without = (bare name) as usage', () => {
    const { status } = run(['eval', 'a*b', 'a=2', 'b']);
    expect(status).toBe(2);
  });

  it('accepts well-formed bindings', () => {
    const { status } = run(['eval', 'a*b', 'a=2', 'b=3']);
    expect(status).toBe(0);
  });
});
