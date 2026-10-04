/**
 * be-83's Seebeck slope is volts per kelvin squared. An empty unit string
 * printed dimensionless, and `V/K2` was an unknown name.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

const text = (c: ReturnType<typeof capture>) => c.lines.join('') + c.err.join('');

describe('be-83 Seebeck slope unit', () => {
  it('labels the slope V/K^2 and multiplies a bare number by T', async () => {
    const cap = capture();
    const code = await runCli(['evaluate', 'be-83', 'T_K=300', 'dS_dT_V_per_K2=1e-6'], cap.io);
    const out = text(cap);
    expect(code, out).toBe(0);
    expect(out).toMatch(/dS_dT_V_per_K2 \[V\/K\^2\]/);
    expect(out).not.toMatch(/dS_dT_V_per_K2 \[dimensionless\]/);
    expect(out).toMatch(/mu_V_per_K = 0\.0003/);
  });

  it('converts a value written V/K2 into that unit', async () => {
    const cap = capture();
    const code = await runCli(['evaluate', 'be-83', 'T_K=300', 'dS_dT_V_per_K2=1e-6V/K2'], cap.io);
    const out = text(cap);
    expect(code, out).toBe(0);
    expect(out).toMatch(/mu_V_per_K = 0\.0003/);
    expect(out).not.toMatch(/unknown name 'K2'/);
  });
});
