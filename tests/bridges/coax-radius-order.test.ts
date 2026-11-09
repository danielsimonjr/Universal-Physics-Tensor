/**
 * Issue 553: `be-132` is the capacitance per length of a coaxial line.
 * The formula is C' = 2 π ε / ln(b/a), with a the inner radius and b the
 * outer radius. If b < a, the logarithm is negative, and C' is negative.
 * The parameters a and b then give no coaxial line. The domain therefore
 * refuses `be-132` like any other domain violation. The control is the check
 * in the issue: b/a = e gives C' = 2 π ε.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

async function cli(args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    out: (s?: string) => out.push(s ?? ''),
    err: (s?: string) => err.push(s ?? ''),
    write: (s: string) => out.push(s),
  });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

describe('be-132 requires the outer radius above the inner radius (issue 553)', () => {
  it('CONTROL: b/a = e gives 2 π ε', async () => {
    const r = await cli(['evaluate', 'be-132', 'eps_F_per_m=1e-9', 'a_m=1e-3', `b_m=${1e-3 * Math.E}`, '--json']);
    expect(r.code).toBe(0);
    const value = (JSON.parse(r.out) as { result: { output: { value: number } } }).result.output.value;
    expect(value).toBeCloseTo(2 * Math.PI * 1e-9, 20);
  });

  it('a = 5 mm, b = 1 mm is refused and names b_m > a_m', async () => {
    const r = await cli(['evaluate', 'be-132', 'eps_F_per_m=8.854e-12', 'a_m=5mm', 'b_m=1mm']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/outside the validity domain/);
    expect(r.err).toMatch(/b_m > a_m/);
  });

  it('a = b is still refused', async () => {
    const r = await cli(['evaluate', 'be-132', 'eps_F_per_m=8.854e-12', 'a_m=1mm', 'b_m=1mm']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/outside the validity domain/);
  });
});
