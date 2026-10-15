/**
 * `upt probe design` names the KIND of file it refused. A hypothesis is an expression file and
 * the bounds are a bounds file; only `probe run --problem` reads a problem file. Before this,
 * every refusal of the loaders' own checks said "is not a problem file", the wrong noun for the
 * two files `design` reads (found when its fixtures moved to the strict expression check).
 */
import '../helpers/dist.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { tempDir } from '../helpers/tmp.js';

const DIMENSIONLESS_DIM = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

async function run(args: string[]): Promise<{ code: number; stderr: string }> {
  const err: string[] = [];
  const sink = () => {};
  const code = await runCli(args, { out: sink, err: (s?: string) => err.push((s ?? '') + '\n'), write: sink });
  return { code, stderr: err.join('') };
}

function files(): { dir: string; good: string; bounds: string } {
  const dir = tempDir('upt-probe-noun-');
  const good = join(dir, 'good.json');
  writeFileSync(good, JSON.stringify({ kind: 'symbol', name: 'x', dim: DIMENSIONLESS_DIM }));
  const bounds = join(dir, 'bounds.json');
  writeFileSync(bounds, JSON.stringify({ variables: { x: { min: 0, max: 1 } } }));
  return { dir, good, bounds };
}

describe('upt probe design names the kind of file it refused', () => {
  it('a hypothesis with an incomplete dimension record is "not an expression file"', async () => {
    const { dir, good, bounds } = files();
    const bad = join(dir, 'h2.json');
    writeFileSync(bad, JSON.stringify({ kind: 'symbol', name: 'x', dim: {} }));
    const r = await run(['probe', 'design', `--h1=${good}`, `--h2=${bad}`, `--bounds=${bounds}`]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain(`upt probe: ${bad} is not an expression file:`);
    expect(r.stderr).not.toContain('is not a problem file');
  });

  it('bounds with a non-integer step count are named as design bounds, never as a problem file', async () => {
    // The bounds loader's refusals name themselves ("design bounds at <path>: …"); they never
    // reached the problem-file wording, and `design` passes 'a bounds file' should one ever do.
    const { dir, good } = files();
    const bad = join(dir, 'bounds-bad.json');
    writeFileSync(bad, JSON.stringify({ variables: { x: { min: 0, max: 1, steps: 2.5 } } }));
    const r = await run(['probe', 'design', `--h1=${good}`, `--h2=${good}`, `--bounds=${bad}`]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain(`upt probe: design bounds at ${bad}: variables.x.steps must be a positive integer (found 2.5)`);
    expect(r.stderr).not.toContain('problem file');
  });

  it('CONTROL: probe run on a JSON file that is not a problem still says "not a problem file"', async () => {
    const { dir } = files();
    const bad = join(dir, 'problem.json');
    writeFileSync(bad, JSON.stringify({ target: 5 }));
    const r = await run(['probe', 'run', `--problem=${bad}`]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('is not a problem file');
  });
});
