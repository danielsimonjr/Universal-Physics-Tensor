/**
 * `--sigma` takes the same spellings the inputs take: a declared alternate (`diameter_m` for
 * `a_m`) is resolved through the same contract and its σ is scaled by the alternate's `toKey`
 * factor (0.5 for a diameter), and a synonym spelling resolves to its key.
 *
 * Found by the 2026-10-15 survey: `upt evaluate case-brownian-sphere … diameter_m=2e-6 …
 * --sigma diameter_m=1e-8` failed with "'diameter_m' is not one of the inputs given (… a_m …)"
 * although `diameter_m` was the input the user typed.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

const CASE = [
  'evaluate',
  'case-brownian-sphere',
  'T_K=293.15',
  'eta_Pa_s=1e-3',
  'rho_p_kg_per_m3=2000',
  'rho_f_kg_per_m3=998',
  't_s=1',
  'd=2',
  'h_m=100um',
];

async function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    out: (s?: string) => out.push((s ?? '') + '\n'),
    err: (s?: string) => err.push((s ?? '') + '\n'),
    write: (s: string) => out.push(s),
  });
  return { code, stdout: out.join(''), stderr: err.join('') };
}

describe('upt evaluate --sigma on an alternate spelling', () => {
  it("the survey's command: --sigma diameter_m is a_m's σ, scaled by toKey = 0.5", async () => {
    const r = await run([...CASE, 'diameter_m=2e-6', '--sigma', 'diameter_m=1e-8', '--json']);
    expect(r.code, r.stderr).toBe(0);
    const env = JSON.parse(r.stdout);
    expect(env.result.uncertainty.sigma).toEqual({ a_m: 5e-9 });
  });

  it('CONTROL: the same σ on the key itself gives the same propagated output', async () => {
    const viaAlternate = await run([...CASE, 'diameter_m=2e-6', '--sigma', 'diameter_m=1e-8', '--json']);
    const direct = await run([...CASE, 'a_m=1e-6', '--sigma', 'a_m=5e-9', '--json']);
    expect(direct.code).toBe(0);
    expect(JSON.parse(viaAlternate.stdout).result.uncertainty.outputs).toEqual(JSON.parse(direct.stdout).result.uncertainty.outputs);
  });

  it('the alternate is accepted for σ even when the input was given under the key', async () => {
    const r = await run([...CASE, 'a_m=1e-6', '--sigma', 'diameter_m=1e-8', '--json']);
    expect(r.code, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout).result.uncertainty.sigma).toEqual({ a_m: 5e-9 });
  });

  it('two spellings of one σ are refused as one key given twice', async () => {
    const r = await run([...CASE, 'a_m=1e-6', '--sigma', 'a_m=5e-9', '--sigma', 'diameter_m=1e-8']);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/'a_m' is given twice/);
  });

  it('CONTROL: a name that is neither a key, an alternate nor a synonym is still refused', async () => {
    const r = await run([...CASE, 'a_m=1e-6', '--sigma', 'mass=1']);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/'mass' is not one of the inputs given/);
  });
});
