/**
 * `upt discover` option validation (Round-2 robustness): `--max-orders` and
 * `--anchor` must reject malformed values with exit 2 rather than silently
 * ignoring them (or, for an empty `--max-orders=`, silently coercing to 0).
 */
import '../helpers/dist.js';
import { captureMerged } from '../helpers/cli.js';
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runCli } from '../../dist/cli/main.js';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');

function run(args: string[]): { status: number; stderr: string } {
  try {
    execFileSync('node', [cli, ...args], { stdio: 'pipe', encoding: 'utf8' });
    return { status: 0, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stderr?: Buffer | string };
    return { status: err.status ?? 1, stderr: String(err.stderr ?? '') };
  }
}

// In-process harness (mirrors tests/cli/confront.test.ts's captureMerged()) for
// the consequence-propagation surfacing added in Phase 4 Unit A task 2.

describe('upt discover — option validation', () => {
  it('rejects a non-numeric --max-orders', () => {
    expect(run(['discover', '--max-orders=abc']).status).toBe(2);
  });

  it('rejects an empty --max-orders (would silently coerce to 0)', () => {
    expect(run(['discover', '--max-orders=']).status).toBe(2);
  });

  it('rejects a negative --max-orders', () => {
    expect(run(['discover', '--max-orders=-1']).status).toBe(2);
  });

  it('rejects a malformed --anchor (no value)', () => {
    expect(run(['discover', '--anchor=mass']).status).toBe(2);
  });

  it('rejects a non-numeric --anchor value as a bad value (exit 1)', () => {
    expect(run(['discover', '--anchor=mass=abc']).status).toBe(1);
  });

  it('accepts a well-formed --max-orders and --anchor', () => {
    expect(run(['discover', '--max-orders=4', '--anchor=mass=1.989e30']).status).toBe(0);
  });

  it('accepts discover with no options (default anchor)', () => {
    expect(run(['discover']).status).toBe(0);
  });
});

describe('upt discover — consequence signal surfacing', () => {
  it('discover shows a consequence signal on promising candidates', async () => {
    const cap = captureMerged();
    const code = await runCli(['discover'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).toMatch(/consequence|novel-consequence|entailed/i);
  });

  it('discover --json carries the consequence field additively', async () => {
    const cap = captureMerged();
    const code = await runCli(['discover', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    const promising = parsed.result.filter((r: { verdict: string }) => r.verdict === 'promising');
    expect(promising.length).toBeGreaterThan(0);
    expect(promising.every((r: { consequence?: unknown }) => 'consequence' in r)).toBe(true);
  });
});

// Persona finding L4 (2026-09-25): the AXIS-CLASH header called 70 identifications
// "falsified" while the funnel line on the same screen counted "0 contradictory
// (falsified)". An axis clash compares stated scale/force LABELS; it runs no physical
// test, so it is a prior, not a falsification. The verdict enum is unchanged.
describe('upt discover — axis-clash is labelled a regime-label prior, not a falsification', () => {
  it('the header and the funnel say what each verdict tested', async () => {
    const cap = captureMerged();
    const code = await runCli(['discover'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/AXIS-CLASH \(stated scale\/force labels differ: a regime-label prior, not a physical test\)/);
    expect(text).toMatch(/\d+ contradictory \(numerically falsified\)/);
    expect(text).not.toMatch(/identification falsified/);
  });
});
