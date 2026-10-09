/**
 * The 9.0.0 audit, §6 CLI (docs/audit/2026-10-09-codebase-audit-9.0.0.md).
 *
 * Each block is one audit item. Every test here was run RED on the tree the
 * audit measured before its fix landed; the commit messages quote the red
 * lines. The CLI is exercised in-process against the built `dist/`, so a src
 * change needs `bun run build` before this file reports on it.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await runCli(args, {
    out: (line?: string) => {
      out += (line ?? '') + '\n';
    },
    err: (line?: string) => {
      err += (line ?? '') + '\n';
    },
    write: (s: string) => {
      out += s;
    },
  });
  return { code, out, err };
}

const DERIVE = ['derive', 'period:time', 'length:length', 'gravity:acceleration'];

describe('K2: derive --json carries no prefactor for a formula the text says does not match', () => {
  it('a non-matching formula: exit 3, prefactor null, matchesMonomial false', async () => {
    const r = await run([...DERIVE, '--formula', 'length*gravity', '--json']);
    expect(r.code).toBe(3);
    const env = JSON.parse(r.out);
    expect(env.result.matchesMonomial).toBe(false);
    expect(env.result.prefactor).toBeNull();
  });
  it('a matching formula: prefactor is the number the text prints, matchesMonomial true', async () => {
    const r = await run([...DERIVE, '--formula', '2*pi*sqrt(length/gravity)', '--json']);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.out);
    expect(env.result.matchesMonomial).toBe(true);
    expect(env.result.prefactor).toBeCloseTo(2 * Math.PI, 9);
  });
});

describe('derive and eval classify a formula failure by its kind, not by one catch-all label', () => {
  it('a formula that is singular at generic inputs is reported as that, not as an undeclared variable', async () => {
    const r = await run(['derive', 'x:length', 'y:length', '--formula', 'y/0']);
    expect(r.code).toBe(2);
    expect(r.err).not.toMatch(/undeclared variable/);
    expect(r.err).toMatch(/could not be evaluated at generic inputs/);
  });
  it('an undeclared symbol exits 2 on both branches and says how to declare it', async () => {
    const unique = await run(['derive', 'x:length', 'y:length', '--formula', 'y*c']);
    const notUnique = await run(['derive', 'x:length', 'y:length', 'z:time', '--formula', 'y*c']);
    for (const r of [unique, notUnique]) {
      expect(r.code).toBe(2);
      expect(r.err).toMatch(/undeclared symbol 'c'/);
      expect(r.err).toMatch(/c:c/);
      expect(r.err).not.toMatch(/Undefined symbol/);
    }
  });
  it('a parse error is labelled once', async () => {
    const e = await run(['eval', '2*(']);
    expect(e.code).toBe(2);
    expect(e.err.match(/parse error:/g)?.length).toBe(1);
    const d = await run(['derive', 'x:length', 'y:length', '--formula', '2*(']);
    expect(d.code).toBe(2);
    expect(d.err.match(/parse error:/g)?.length).toBe(1);
  });
});
