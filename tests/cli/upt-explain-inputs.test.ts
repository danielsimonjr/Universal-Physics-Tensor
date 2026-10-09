/**
 * CLI input-validation guard for `upt explain` (Round-2 audit, HIGH).
 *
 * `parseKnown` used to silently drop/coerce malformed `name=value` inputs:
 *   - a bare name alongside any `k=v` was dropped (values-mode wins);
 *   - `mass=abc` (NaN) was demoted to a bare name, losing the intent;
 *   - `mass=` coerced to 0; `mass=1e500` flowed in as Infinity.
 * All four silently produced wrong physics. The CLI now rejects malformed
 * inputs with exit code 2 instead of guessing.
 *
 * @module tests/cli/upt-explain-inputs
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

describe('upt explain — input validation (Round-2 HIGH)', () => {
  // A bad value is exit 1 on every command (9.0.0 audit K10); mixing modes stays usage (2).
  it('rejects a non-numeric value (mass=abc)', () => {
    const { status } = run(['explain', 'hawking-temperature', 'mass=abc']);
    expect(status).toBe(1);
  });

  it('rejects an empty value (mass=)', () => {
    const { status } = run(['explain', 'hawking-temperature', 'mass=']);
    expect(status).toBe(1);
  });

  it('rejects a non-finite value (mass=1e500 → Infinity)', () => {
    const { status } = run(['explain', 'hawking-temperature', 'mass=1e500']);
    expect(status).toBe(1);
  });

  it('rejects mixing a bare name with a valued input (silent drop)', () => {
    const { status } = run(['explain', 'hawking-temperature', 'mass=1.989e30', 'charge']);
    expect(status).toBe(2);
  });

  it('accepts a well-formed valued input', () => {
    const { status } = run(['explain', 'hawking-temperature', 'mass=1.989e30']);
    expect(status).toBe(0);
  });

  it('accepts a bare-names-only query', () => {
    const { status } = run(['explain', 'hawking-temperature', 'mass']);
    expect(status).toBe(0);
  });
});
