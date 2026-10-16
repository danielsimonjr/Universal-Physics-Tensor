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
import { B_WIEN_SI } from '../../src/core/constants.js';

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

  // The Hubble–Wien proposal (T = b·H/c, evaluated at H0 = 2.2e-18 s⁻¹ from the table and printed as
  // ≈ 2.12650389670823e-29 K with the row's source) was the one live proposal evaluated at a sourced
  // table sample. Once the Hubble distance has a magnitude (option 2 of the owner's decision of
  // 2026-10-16) the gate falsifies its identification and it is not derived, so no live proposal
  // exercises the table-sample path (negative result about this test's reach; NOTES.md).
  it('the Hubble–Wien proposal is no longer derived, so it is not evaluated at all', async () => {
    const t = await derive();
    expect(t).not.toContain('IC-hubble-distance--peak-wavelength--temperature');
    expect(t).not.toMatch(/hubble-rate=/);
    // The value it printed, kept as the record of the formula: 2.2e-18 · b / c.
    expect((B_WIEN_SI * 2.2e-18) / 299792458).toBeCloseTo(2.1265e-29, 32);
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
