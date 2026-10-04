/**
 * `G` is the gauss. The spelled name is the same unit. A gigapascal is still
 * the prefix G on the pascal, and a bare `G` in a formula is Newton's constant.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { G_SI } from '../../src/core/constants.js';

function capture() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      out: (s?: string) => stdout.push((s ?? '') + '\n'),
      err: (s?: string) => stderr.push((s ?? '') + '\n'),
      write: (s: string) => stdout.push(s),
    },
  };
}

async function run(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, stdout: cap.stdout.join(''), stderr: cap.stderr.join('') };
}

describe('the spelled gauss', () => {
  it('reads 1gauss and 1 gauss as 10^-4 T, the same value as 1G', async () => {
    const symbol = await run(['eval', 'B', 'B=1G']);
    const spelled = await run(['eval', 'B', 'B=1gauss']);
    const spaced = await run(['eval', 'B', 'B=1 gauss']);
    expect(symbol.code).toBe(0);
    expect(spelled.code).toBe(0);
    expect(spaced.code).toBe(0);
    expect(Number(symbol.stdout)).toBe(1e-4);
    expect(Number(spelled.stdout)).toBe(1e-4);
    expect(Number(spaced.stdout)).toBe(1e-4);
    expect(symbol.stderr).toMatch(/gauss/);
  });

  it('keeps GPa a gigapascal and bare G as Newton', async () => {
    const gpa = await run(['eval', 'p', 'p=1GPa']);
    expect(gpa.code).toBe(0);
    expect(Number(gpa.stdout)).toBe(1e9);
    expect(gpa.stderr).not.toMatch(/gauss/);
    const newton = await run(['eval', 'G']);
    expect(newton.code).toBe(0);
    expect(Number(newton.stdout)).toBeCloseTo(G_SI, 20);
  });
});
