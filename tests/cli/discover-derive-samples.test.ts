/**
 * `upt discover --derive` evaluates each proposal only at SOURCED sample values (persona finding D5,
 * 2026-09-25).
 *
 * It evaluated every proposal with 300 for every free input, whatever its dimension: a Hubble rate
 * of 300 s⁻¹ (the real H₀ is about 2.2e-18 s⁻¹) and a frequency of 300 Hz. Each sample is now a sourced
 * representative value, or the documented room temperature; an input with neither is not evaluated,
 * and the line says so.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function derive(): Promise<string> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  await runCli(['discover', '--source=canonical', '--derive'], { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return lines.join('');
}

describe('discover --derive sample values', () => {
  it('never uses 300 for an input that is not a temperature', async () => {
    const t = await derive();
    expect(t).not.toMatch(/hubble-rate=300\b/);
    expect(t).not.toMatch(/\bnu=300\b/);
  });

  it('the Hubble proposal is evaluated at H0 = 2.2e-18 s⁻¹, citing its source', async () => {
    const t = await derive();
    // T = b·H/c with Wien's b = 2.897771955e-3 m·K: 2.2e-18 · b / c = 2.13e-29 K.
    const expected = (2.897771955e-3 * 2.2e-18) / 299792458;
    expect(expected).toBeCloseTo(2.1265e-29, 32);
    expect(t).toMatch(/≈ 2\.12650389657234e-29 \(hubble-rate=2\.2e-18 \[H0 ≈ 67 km\/s\/Mpc \(Planck 2018\)\]\)/);
  });

  it('the Landauer–photon proposal is evaluated at room temperature: ν = k_B ln2 · 300 K / h = 4.33e12 Hz', async () => {
    const t = await derive();
    const expected = (1.380649e-23 * Math.LN2 * 300) / 6.62607015e-34;
    expect(expected).toBeCloseTo(4.333e12, -9);
    expect(t).toMatch(/≈ 4332853139320\.78 \(temperature=300 \[room temperature, 300 K\]\)/);
  });

  it('an input with no sourced sample is not evaluated, and the line says so', async () => {
    const t = await derive();
    expect(t).toMatch(/no sourced sample value for nu; not evaluated/);
  });
});
