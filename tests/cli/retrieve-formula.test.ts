/**
 * `upt retrieve --formula=TEXT --dim=name:dimension` gives the atlas search an
 * expression whose free symbols carry the caller's dimensions.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { captureMerged, text } from '../helpers/cli.js';
import { runCli } from '../../dist/cli/main.js';

async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const c = captureMerged();
  const code = await runCli(argv, c.io);
  return { code, out: text(c), err: '' };
}

function accepted(out: string): string[] {
  return (JSON.parse(out) as { result: { accepted: string[] } }).result.accepted;
}

describe('upt retrieve --formula', () => {
  it('C1: mass-energy with declared dimensions finds CE-mass-energy', async () => {
    const r = await run(['retrieve', 'rest', 'energy', '--formula=E - m*c^2', '--dim=E:energy', '--dim=m:mass', '--dim=c:c', '--json']);
    expect(r.code).toBe(0);
    // CE-kinetic-energy shares the key (a known collision), so the order of the two is not asserted.
    expect(accepted(r.out).slice(0, 2)).toContain('CE-mass-energy');
  });

  it('C2: Newton second law ranks CE-newton-second-law first', async () => {
    const r = await run(['retrieve', 'force', '--formula=F - m*a', '--dim=F:force', '--dim=m:mass', '--dim=a:acceleration', '--json']);
    expect(r.code).toBe(0);
    expect(accepted(r.out)[0]).toBe('CE-newton-second-law');
  });

  it('C3: an undeclared symbol is a usage error that names it and the fix', async () => {
    const r = await run(['retrieve', '--formula=E - zqx*c^2', '--dim=E:energy', '--dim=c:c']);
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/zqx/);
    expect(r.out).toMatch(/--dim=name:dimension/);
  });

  it('C4: --formula with --expr, --dim alone and a bad dimension are usage errors', async () => {
    const both = await run(['retrieve', '--formula=E - m', '--expr=data/examples/retrieve-mass-energy.json']);
    expect(both.code).toBe(2);
    expect(both.out).toMatch(/--formula.*--expr|--expr.*--formula/);
    const alone = await run(['retrieve', 'x', '--dim=m:mass']);
    expect(alone.code).toBe(2);
    expect(alone.out).toMatch(/--dim needs --formula/);
    const bad = await run(['retrieve', '--formula=m - a', '--dim=m:zqxdim', '--dim=a:mass']);
    expect(bad.code).toBe(2);
    expect(bad.out).toMatch(/zqxdim/);
  });

  it('C5: a symbol declared twice with two dimensions is refused, not resolved by order', async () => {
    const r = await run(['retrieve', 'x', '--formula=m - m', '--dim=m:mass', '--dim=m:length']);
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/'m' is declared twice/);
    const same = await run(['retrieve', 'x', '--formula=E - m*c^2', '--dim=E:energy', '--dim=m:mass', '--dim=m:mass', '--dim=c:c', '--json']);
    expect(same.code).toBe(0);
  });

  it('C6: an empty --formula is a usage error that says so', async () => {
    const r = await run(['retrieve', 'x', '--formula=', '--dim=m:mass']);
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/--formula is empty/);
    expect(r.out).not.toMatch(/NaN/);
  });
});
