/**
 * `upt frontier` prints the two lists. The empty-list control lives on the
 * formatter; this file checks the command's text and JSON stay apart.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

describe('upt frontier', () => {
  it('prints both headings and does not merge the lists into one score', async () => {
    const cap = capture();
    const code = await runCli(['frontier'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/Null results \(\d+\)/);
    expect(text).toMatch(/Frontier \(\d+\)/);
    expect(text).toContain('be-28');
    expect(text).not.toMatch(/^\s*be-11\s/m);
    expect(text).not.toMatch(/^\s*be-44\s/m);
  });

  it('JSON carries two arrays', async () => {
    const cap = capture();
    const code = await runCli(['frontier', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    expect(Array.isArray(parsed.result)).toBe(false);
    expect(Array.isArray(parsed.result.nullResults)).toBe(true);
    expect(Array.isArray(parsed.result.frontier)).toBe(true);
    expect(parsed.result).not.toHaveProperty('score');
    const be28 = parsed.result.nullResults.find((row: { id: string }) => row.id === 'be-28');
    expect(be28.source).toBe('membership-rejection');
    expect(parsed.result.nullResults.some((row: { id: string }) => row.id === 'be-11')).toBe(false);
    expect(parsed.result.nullResults.some((row: { id: string }) => row.id === 'be-44')).toBe(false);
    const absent = parsed.result.frontier.find(
      (row: { observation: string }) => row.observation === 'observation absent',
    );
    expect(absent).toBeDefined();
    expect(JSON.stringify(absent)).not.toMatch(/residual/i);
  });
});
