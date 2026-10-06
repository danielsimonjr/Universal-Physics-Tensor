/**
 * Conflicting spellings of one quantity do not print a number.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

function capture() {
  const lines: string[] = [];
  return {
    lines,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => lines.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

describe('conflicting synonym bindings', () => {
  it('refuses k_B beside boltzmann-constant', async () => {
    const cap = capture();
    const code = await runCli(['eval', 'k_B*T', 'T=300', 'k_B=1', 'boltzmann-constant=2'], cap.io);
    const text = cap.lines.join('');
    expect(code).toBe(1);
    expect(text).toMatch(/disagree/);
    expect(text).not.toMatch(/Recovered value/);
    expect(text).not.toMatch(/^300$/m);
  });

  it('accepts one Boltzmann scale under both spellings', async () => {
    const cap = capture();
    const code = await runCli(['eval', 'k_B*T', 'T=300', 'k_B=2', 'boltzmann-constant=2'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).toMatch(/600/);
  });

  it('refuses specific-heat beside specific-heat-capacity', async () => {
    const cap = capture();
    const code = await runCli(
      [
        'explain',
        'thermal-diffusivity',
        'thermal-conductivity=401',
        'density=8960',
        'specific-heat-capacity=385',
        'specific-heat=1000',
        '--source=canonical',
      ],
      cap.io,
    );
    const text = cap.lines.join('');
    expect(code).toBe(1);
    expect(text).toMatch(/specific-heat/);
    expect(text).toMatch(/disagree/);
    expect(text).not.toMatch(/Recovered value/);
  });
});
