/**
 * A quoted phrase is several words, and a hyphen is a word break.
 * `upt search "radiation pressure"` used to exit 1. `upt search magnetic-field`
 * used to exit 1 while `upt explain` accepts that name.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('') + c.err.join('');

describe('upt search word breaks', () => {
  it('treats a quoted phrase as the same words as two arguments', async () => {
    const quoted = capture();
    const split = capture();
    expect(await runCli(['search', 'radiation pressure'], quoted.io)).toBe(0);
    expect(await runCli(['search', 'radiation', 'pressure'], split.io)).toBe(0);
    expect(text(quoted)).toMatch(/be-64/);
    expect(text(split)).toMatch(/be-64/);
  });

  it('treats a hyphen as a word break in a quantity name', async () => {
    const cap = capture();
    expect(await runCli(['search', 'magnetic-field'], cap.io)).toBe(0);
    expect(text(cap)).toMatch(/magnetic-field/);
  });

  it('still finds be-16 when the id contains a hyphen', async () => {
    const cap = capture();
    expect(await runCli(['search', 'be-16'], cap.io)).toBe(0);
    expect(text(cap)).toMatch(/be-16/);
  });
});
