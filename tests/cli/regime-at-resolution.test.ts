/**
 * `--at` resolves coordinates the way a user writes them (persona finding F1, 2026-09-25).
 *
 * `upt regime diffusion --at tau=1 D=1 q=1` reported the telegraph bridge "unchecked (no value
 * supplied)": only the exact display string "tau · D · q^2=1", with its middle dots, reached the
 * check. And an unknown key such as `Foo=2` was dropped silently. Now: a group value is derived
 * from its parameters when they are all given; `*` is accepted for `·` and spaces are ignored;
 * and any key no record uses is named.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function run(args: string[]): Promise<string> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return lines.join('');
}

describe('upt regime --at resolution', () => {
  it('derives τDq² from tau, D and q: ε = 1 violates the telegraph→Fick regime', async () => {
    const t = await run(['regime', 'diffusion', '--at', 'tau=1', 'D=1', 'q=1']);
    expect(t).toMatch(/\[bridge\] ab-telegraph-diffusion: VIOLATED/);
    expect(t).not.toMatch(/ab-telegraph-diffusion: unknown/);
  });

  it('accepts * for · and ignores spaces in a group name', async () => {
    const t = await run(['regime', 'diffusion', '--at', 'tau*D*q^2=1']);
    expect(t).toMatch(/\[bridge\] ab-telegraph-diffusion: VIOLATED/);
  });

  it('a derived value is exact: ε = 0.02 satisfies ε ≤ 0.05', async () => {
    const t = await run(['regime', 'diffusion', '--at', 'tau=2', 'D=0.01', 'q=1']);
    expect(t).toMatch(/\[bridge\] ab-telegraph-diffusion: valid/);
  });

  it('names a key that no record in the family uses', async () => {
    const t = await run(['regime', 'diffusion', '--at', 'Re=1000', 'Foo=2']);
    expect(t).toMatch(/unknown coordinate\(s\): Foo — no record in family 'diffusion' uses it; ignored/);
    expect(t).not.toMatch(/unknown coordinate\(s\):.*Re/);
  });

  it('--json lists the unknown keys and the derived values', async () => {
    const t = await run(['regime', 'diffusion', '--at', 'tau=1', 'D=1', 'q=1', 'Foo=2', '--json']);
    const env = JSON.parse(t);
    expect(env.result.unknownCoordinates).toEqual(['Foo']);
    expect(env.result.resolvedPoint['tau · D · q^2']).toBe(1);
  });
});

describe('upt path --at uses the same resolution for its regime check', () => {
  it('pendulum: theta0 still resolves, and the regime holds at 0.2', async () => {
    const t = await run(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=10']);
    expect(t).toMatch(/regimes at --at: all hold/);
  });
});
