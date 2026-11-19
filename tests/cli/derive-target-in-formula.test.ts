/**
 * The target is not an input of its own formula (issue #686).
 * Exercised in-process against the built `dist/`; run `bun run build` first.
 */
import '../helpers/dist.js';
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

describe('derive: the target cannot appear in its own formula', () => {
  it('unique branch: names the target, not an undeclared symbol', async () => {
    const r = await run(['derive', 'V:voltage', 'R:resistance', 'I:current', '--formula', 'V/(R*I)']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/'V' is the target and cannot appear in its own formula/);
    expect(r.err).not.toMatch(/undeclared symbol/);
    expect(r.out).toBe('');
  });

  it('not-unique branch: same message', async () => {
    const r = await run(['derive', 'V:voltage', 'R:resistance', 'I:current', 't:time', '--formula', 'V*t/(R*I*t)']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/'V' is the target and cannot appear in its own formula/);
    expect(r.out).toBe('');
  });

  it('hyphenated target: the hyphenated name is one symbol', async () => {
    const r = await run(['derive', 'half-life:time', 'k:frequency', '--formula', 'half-life*k']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/'half-life' is the target and cannot appear in its own formula/);
  });

  it('a formula that spells a hyphenated target is the target, not a subtraction', async () => {
    const r = await run(['derive', 'x-y:length', 'z:length', '--formula', 'x-y']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/'x-y' is the target and cannot appear in its own formula/);
  });

  it('--json mode: the same message', async () => {
    const r = await run(['derive', 'V:voltage', 'R:resistance', 'I:current', '--formula', 'V/(R*I)', '--json']);
    expect(r.code).toBe(2);
    expect(r.err + r.out).toMatch(/'V' is the target and cannot appear in its own formula/);
  });

  it('control: a formula without the target still runs', async () => {
    const r = await run(['derive', 'V:voltage', 'R:resistance', 'I:current', '--formula', 'R*I']);
    expect(r.code).toBe(0);
  });

  it('control: an undeclared symbol keeps its own message', async () => {
    const r = await run(['derive', 'x:length', 'y:length', '--formula', 'y*zqx']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/undeclared symbol 'zqx'/);
  });

  it('control: a target name that is a substring of a variable is not the target', async () => {
    const r = await run(['derive', 'R:resistance', 'RR:resistance', '--formula', 'RR']);
    expect(r.code).toBe(0);
  });
});
