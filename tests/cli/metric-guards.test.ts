import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function cli(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

describe('upt metric: r = 0 is a point, not "not supplied" (issue 478)', () => {
  it('refuses r=0 with the horizon message on schwarzschild and kerr', async () => {
    // A point the metric refuses is a bad value: exit 1 (9.0.0 audit K8).
    const s = await cli(['metric', 'schwarzschild', 'M=1Msun', 'r=0', 'theta=pi/2']);
    expect(s.code).toBe(1);
    expect(s.text).toMatch(/r must be outside the horizon/);
    const k = await cli(['metric', 'kerr', 'M=1Msun', 'a=1000', 'r=0', 'theta=1.2']);
    expect(k.code).toBe(1);
    expect(k.text).toMatch(/r must be positive|outside/);
  });
  it('an omitted r still takes the 10 r_s default (control)', async () => {
    const s = await cli(['metric', 'schwarzschild', 'M=1Msun', 'theta=pi/2']);
    expect(s.code).toBe(0);
    expect(s.text).toMatch(/29541\.2/);
    const k = await cli(['metric', 'kerr', 'M=1Msun', 'a=1000', 'theta=1.2']);
    expect(k.code).toBe(0);
  });
});

describe('upt metric: a non-positive mass is refused without --geodesic (issue 478)', () => {
  it.each([
    ['schwarzschild', 'M=-1Msun', 'r=1e8', 'theta=pi/2'],
    ['kerr', 'M=-1Msun', 'a=1000', 'r=1e8', 'theta=1.2'],
    ['schwarzschild', 'M=0', 'r=1e8', 'theta=pi/2'],
  ])('%s %s', async (...args) => {
    const r = await cli(['metric', ...args]);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/positive mass/);
  });
  it('keeps the geodesic refusal at exit 1 (control)', async () => {
    const r = await cli(['metric', 'kerr', 'M=-1Msun', 'a=1000', 'r=1e8', 'theta=pi/2', '--geodesic']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/positive mass/);
  });
});

describe('upt metric: the polar angle is on the open interval (0, pi) (issue 478)', () => {
  it.each(['pi', '0', '3.5', '-0.1'])('theta=%s is refused', async (theta) => {
    const r = await cli(['metric', 'schwarzschild', 'M=1Msun', 'r=1e8', `theta=${theta}`]);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/θ|theta/);
    expect(r.text).not.toMatch(/8\.89/);
  });
  it('the same on kerr', async () => {
    const r = await cli(['metric', 'kerr', 'M=1Msun', 'a=1000', 'r=1e8', 'theta=pi']);
    expect(r.code).toBe(1);
  });
  it('an interior angle still works (control)', async () => {
    const r = await cli(['metric', 'schwarzschild', 'M=1Msun', 'r=1e8', 'theta=1.2']);
    expect(r.code).toBe(0);
  });
});
