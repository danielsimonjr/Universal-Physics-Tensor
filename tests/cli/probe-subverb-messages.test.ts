/**
 * `upt probe` names what it was given: a token that is not a subverb is reported as that token,
 * not as a missing subverb, and an invalid JSON file of `design` is named in the message.
 *
 * Found by the 2026-10-15 survey: `upt probe search` printed "needs a subverb", and `design`
 * mapped a JSON parse error without a file context, so the message named no file.
 */
import '../helpers/dist.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { tempDir } from '../helpers/tmp.js';

async function run(args: string[]): Promise<{ code: number; stderr: string }> {
  const err: string[] = [];
  const sink = () => {};
  const code = await runCli(args, { out: sink, err: (s?: string) => err.push((s ?? '') + '\n'), write: sink });
  return { code, stderr: err.join('') };
}

describe('upt probe subverbs', () => {
  it('an unknown subverb is named as unknown (exit 2)', async () => {
    const r = await run(['probe', 'search']);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("upt probe: 'search' is not a subverb (");
    expect(r.stderr).not.toContain('needs a subverb');
  });
  it('CONTROL: no subverb at all is still a missing one', async () => {
    const r = await run(['probe']);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('upt probe needs a subverb (');
  });
});

describe('upt probe design names the file an invalid JSON message is about', () => {
  it.each(['h1', 'h2', 'bounds'])('--%s', async (which) => {
    const dir = tempDir('upt-probe-design-json-');
    const good = join(dir, 'good.json');
    writeFileSync(good, JSON.stringify({ kind: 'symbol', name: 'x', dim: {} }));
    const bounds = join(dir, 'bounds.json');
    writeFileSync(bounds, JSON.stringify({ variables: { x: { min: 0, max: 1 } } }));
    const bad = join(dir, `${which}-bad.json`);
    writeFileSync(bad, '{ not json');
    const files = { h1: good, h2: good, bounds };
    files[which as keyof typeof files] = bad;
    const r = await run(['probe', 'design', `--h1=${files.h1}`, `--h2=${files.h2}`, `--bounds=${files.bounds}`]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain(`upt probe: invalid JSON in ${bad}:`);
    // The reader's SyntaxError already starts with the path; the message names it once.
    expect(r.stderr).not.toContain(`${bad}: ${bad}`);
  });
});
