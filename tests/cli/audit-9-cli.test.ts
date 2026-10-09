/**
 * The 9.0.0 audit, §6 CLI (docs/audit/2026-10-09-codebase-audit-9.0.0.md).
 *
 * Each block is one audit item. Every test here was run RED on the tree the
 * audit measured before its fix landed; the commit messages quote the red
 * lines. The CLI is exercised in-process against the built `dist/`, so a src
 * change needs `bun run build` before this file reports on it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { listCommandNames } from '../../dist/cli/command.js';

const SRC = join(import.meta.dirname, '../../src');

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

describe('K3: a result carries the envelope and exits 0 or 3; an error (1, 2) writes nothing to stdout', () => {
  it('search with no match is a result: exit 0, the empty match list and the scope searched', async () => {
    const text = await run(['search', 'zzzzqqq']);
    expect(text.code).toBe(0);
    expect(text.out).toMatch(/no entry matches every word of 'zzzzqqq'/);
    expect(text.out).toMatch(/searched \d+ catalog bridges/);
    const json = await run(['search', 'zzzzqqq', '--json']);
    expect(json.code).toBe(0);
    expect(JSON.parse(json.out).result.matches).toEqual([]);
  });
  it('confront be-53 is a refusal the command computed: exit 0, status refused, no residual', async () => {
    const text = await run(['confront', 'be-53']);
    expect(text.code).toBe(0);
    expect(text.out).toMatch(/refused/);
    const json = await run(['confront', 'be-53', '--json']);
    expect(json.code).toBe(0);
    const env = JSON.parse(json.out);
    expect(env.result.status).toBe('refused');
    expect(env.result).not.toHaveProperty('residual');
  });

  // One failing invocation per registered command. A new command must add its row.
  const ERRORS: Record<string, string[]> = {
    atlas: ['atlas', 'ab-no-such-bridge'],
    audit: ['audit', '--source=nope'],
    axes: ['axes', '--bogus'],
    candidates: ['candidates', '--source=nope'],
    canonical: ['canonical', '--bogus'],
    chain: ['chain'],
    confront: ['confront', '--rigor=nope'],
    connectors: ['connectors', '--source=nope'],
    coverage: ['coverage', '--bogus'],
    derive: ['derive', 'x:length', 'y:length', '--formula', 'y*c'],
    discover: ['discover', '--source=nope'],
    eval: ['eval', 'x', 'x=nope'],
    evaluate: ['evaluate', 'be-999'],
    explain: ['explain', 'not-a-quantity-xyz'],
    frontier: ['frontier', '--bogus'],
    ground: ['ground', 'no-such-quantity', 'mass'],
    map: ['map', '--source=nope'],
    metric: ['metric', 'schwarzschild', 'M=0'],
    path: ['path', 'model-no-such', 'model-spring'],
    predict: ['predict', '--bogus'],
    priority: ['priority', '--source=nope'],
    probe: ['probe', 'show', 'fg-no-such-gap'],
    recover: ['recover', '--bogus'],
    regime: ['regime', 'no-such-family'],
    retrieve: ['retrieve'],
    search: ['search'],
    symbolic: ['symbolic', '--bogus'],
    testplan: ['testplan', 'nope'],
  };
  it('the error table names every registered command', () => {
    expect(Object.keys(ERRORS).sort()).toEqual(listCommandNames());
  });
  it.each(Object.entries(ERRORS))('%s: a failing invocation exits 1 or 2 with empty stdout, --json or not', async (_name, argv) => {
    const text = await run(argv);
    expect([1, 2]).toContain(text.code);
    expect(text.out).toBe('');
    if (_name !== 'chain') {
      const json = await run([...argv, '--json']);
      expect([1, 2]).toContain(json.code);
      expect(json.out).toBe('');
    }
  });
  it('no command returns 1 or 2 after writing an envelope (static scan of every emitJson site)', () => {
    const hits: string[] = [];
    const dir = join(SRC, 'cli/commands');
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
      const text = readFileSync(join(dir, name), 'utf8');
      let from = 0;
      for (;;) {
        const i = text.indexOf('emitJson(', from);
        if (i < 0) break;
        const ret = /return\s+([^;]+);/.exec(text.slice(i));
        if (ret !== null && /(^|[^\w.])[12]([^\w.]|$)/.test(ret[1]!)) hits.push(`${name}: return ${ret[1]!.trim()}`);
        from = i + 1;
      }
    }
    expect(hits).toEqual([]);
  });
});
