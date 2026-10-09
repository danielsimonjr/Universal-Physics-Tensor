import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function cli(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

const base = ['explain', 'peak-wavelength', 'temperature=5800', '--source=canonical'];

describe('a registered constant is an explain input that must agree (issue 473)', () => {
  it.each(['b=2.897771955e-3', 'b=2.9e-3', 'wien-constant=2.897771955e-3'])('%s is accepted', async (a) => {
    const r = await cli([...base, a]);
    expect(r.code).toBe(0);
    expect(r.text).not.toMatch(/did not resolve/);
  });
  it('a stated value that disagrees with the registry is refused', async () => {
    const r = await cli([...base, 'b=3.5e-3']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/registered constant b/);
  });
  it('an unknown name still fails', async () => {
    const r = await cli([...base, 'not-a-constant=1']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/did not resolve/);
  });
  it('sigma_sb agrees or is refused', async () => {
    const ok = await cli(['explain', 'radiative-flux', 'temperature=300', 'sigma_sb=5.670374419e-8', '--source=canonical']);
    expect(ok.code).toBe(0);
    const bad = await cli(['explain', 'radiative-flux', 'temperature=300', 'sigma_sb=1e-8', '--source=canonical']);
    expect(bad.code).toBe(1);
  });
});
