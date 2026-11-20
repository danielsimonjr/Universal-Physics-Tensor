/**
 * `upt eval` reads its first positional only as a formula. When that whole
 * text is a number with a unit, the binding reader accepts it and the formula
 * reader cannot, so the missing-values error says that units go in bindings (#690).
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function run(args: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runCli(args, {
    out: (s?: string) => stdout.push((s ?? '') + '\n'),
    err: (s?: string) => stderr.push((s ?? '') + '\n'),
    write: (s: string) => stdout.push(s),
  });
  return { code, stdout: stdout.join(''), stderr: stderr.join('') };
}

describe('upt eval: a formula text that is a quantity literal', () => {
  it('2mH says that a unit goes in a binding', async () => {
    const r = await run(['eval', '2mH']);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/missing values for: mH/);
    expect(r.stderr).toContain('upt eval x x=2mH');
  });

  it('quotes the suggested binding when the text has a space', async () => {
    const r = await run(['eval', '9.8 m/s^2']);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('upt eval x "x=9.8 m/s^2"');
  });

  it.each([
    ['m*a', 'a formula of names that spell units'],
    ['2zqx', 'an unknown unit'],
    ['2dB', 'a refused unit'],
    ['2mH*3', 'a literal inside a larger formula'],
  ])('%s (%s) gets no hint', async (text) => {
    const r = await run(['eval', text]);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/missing values for/);
    expect(r.stderr).not.toMatch(/reads as a quantity/);
  });

  it('a binding of the same text still evaluates', async () => {
    const r = await run(['eval', 'x', 'x=2mH']);
    expect(r.code).toBe(0);
    expect(Number(r.stdout.trim())).toBe(0.002);
  });

  it('a bare number still evaluates', async () => {
    const r = await run(['eval', '2']);
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe('2');
  });
});
