/**
 * One exit-code rule (cli/README.md §Hardening): a malformed token, an extra token and a
 * mistyped flag are usage errors, exit 2; a well-formed value the command refuses is exit 1.
 *
 * Found by the 2026-10-15 survey: an extra argument exited 1 on `atlas` and 2 on `confront`; a
 * malformed id exited 2 on `upt evaluate be-abc` and 1 on `upt confront --bridge=be-xyz`; the two
 * Kerr geodesic refusals in `metric.ts` lacked the `upt metric:` prefix every other refusal has,
 * and the first looked unreachable because `curvatureReport` refuses a non-positive M first.
 * It is reachable through `G=0` (M_geom = G M / c² = 0 while M > 0), proved below.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function run(args: string[]): Promise<{ code: number; stderr: string }> {
  const err: string[] = [];
  const sink = () => {};
  const code = await runCli(args, { out: sink, err: (s?: string) => err.push((s ?? '') + '\n'), write: sink });
  return { code, stderr: err.join('') };
}

describe('a malformed id is a usage error on every command', () => {
  it('confront --bridge=be-xyz and confront be-xyz exit 2, as evaluate be-abc does', async () => {
    const flag = await run(['confront', '--bridge=be-xyz']);
    expect(flag.code).toBe(2);
    expect(flag.stderr).toMatch(/upt confront: .*be-xyz/);
    const positional = await run(['confront', 'be-xyz']);
    expect(positional.code).toBe(2);
    expect(positional.stderr).toMatch(/upt confront: .*be-xyz/);
    expect((await run(['evaluate', 'be-abc'])).code).toBe(2);
  });
  it('CONTROL: a well-formed id with no record is a value refusal, exit 1', async () => {
    const r = await run(['confront', '--bridge=be-999']);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/upt confront: /);
  });
});

describe('upt metric: every refusal carries the command prefix', () => {
  it('|a| above GM/c² is refused with the prefix (exit 1)', async () => {
    const r = await run(['metric', 'kerr', 'M=1.989e30', 'a=2000', 'r=1e5', '--geodesic']);
    expect(r.code).toBe(1);
    expect(r.stderr).toBe('upt metric: Kerr geodesic wants |a| ≤ GM/c²\n');
  });
  it('the positive-mass branch is reachable: G=0 makes M_geom 0 while M > 0 passes curvatureReport', async () => {
    const r = await run(['metric', 'kerr', 'G=0', 'r=1e8', '--geodesic']);
    expect(r.code).toBe(1);
    expect(r.stderr).toBe('upt metric: Kerr geodesic needs a positive mass\n');
  });
  it('CONTROL: without r the same G=0 is refused earlier, by the library, on the default r = 10 M_geom = 0', async () => {
    const r = await run(['metric', 'kerr', 'G=0', '--geodesic']);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/^upt metric: r must be positive/);
  });
});
