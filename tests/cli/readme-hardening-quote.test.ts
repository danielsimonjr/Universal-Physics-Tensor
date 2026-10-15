/**
 * The diagnostics `cli/README.md` §Hardening quotes are the ones the CLI prints.
 *
 * Found by the 2026-10-15 survey: the README quoted `upt: unknown flag '--sourc' for
 * 'discover' (see upt help discover)` while the parser prints it without the `upt: ` prefix.
 * Each quoted message is read from the README and compared with the command's own stderr, so
 * the two cannot drift apart again. The parser's flag refusals now carry the `upt <command>: `
 * prefix every other refusal has (`upt discover: unknown flag '--sourc' ...`), and the README
 * quotes that.
 */
import '../helpers/dist.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

const README = readFileSync(join(import.meta.dirname, '../../cli/README.md'), 'utf8');
const hardening = README.split('## Hardening')[1]?.split('\n## ')[0] ?? '';

async function stderrOf(args: string[]): Promise<{ code: number; stderr: string }> {
  const err: string[] = [];
  const sink = () => {};
  const code = await runCli(args, { out: sink, err: (s?: string) => err.push((s ?? '') + '\n'), write: sink });
  return { code, stderr: err.join('') };
}

/** The §Hardening bullets, each with its wrapped lines joined. */
const bullets = hardening.split(/\n- \*\*/).map((b) => b.replace(/\n\s+/g, ' '));

/** The first backticked message after `marker` in the bullet that contains it. */
function quoted(marker: string): string {
  const bullet = bullets.find((b) => b.includes(marker));
  expect(bullet, marker).toBeDefined();
  const after = bullet!.slice(bullet!.indexOf(marker));
  const m = /\(`([^`]+)`\)/.exec(after);
  expect(m, `a backticked message after '${marker}'`).not.toBeNull();
  return m![1]!;
}

describe('cli/README.md §Hardening quotes what the CLI prints', () => {
  it('control: the section and its three bullets are found', () => {
    expect(hardening).toContain('Unknown flags are rejected');
    expect(hardening).toContain('Stray positional arguments are rejected');
    expect(hardening).toContain('Numeric flags are read by one strict grammar');
  });
  it('the unknown-flag diagnostic', async () => {
    const r = await stderrOf(['discover', '--sourc=canonical']);
    expect(r.code).toBe(2);
    expect(r.stderr).toBe(`${quoted('naming the bad flag and the command')}\n`);
  });
  it('the stray-positional diagnostic', async () => {
    const r = await stderrOf(['audit', 'junk']);
    expect(r.code).toBe(2);
    const bullet = bullets.find((b) => b.includes('Stray positional'))!;
    const m = /command: `([^`]+)`/.exec(bullet);
    expect(m).not.toBeNull();
    expect(r.stderr).toBe(`${m![1]}\n`);
  });
  it('the numeric-flag diagnostic', async () => {
    const r = await stderrOf(['map', '--route=model-pendulum,model-lc', '--all-routes', '--max-routes=0x10']);
    expect(r.code).toBe(2);
    expect(r.stderr).toBe(`${quoted('naming the flag and the token')}\n`);
  });
});
