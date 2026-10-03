/**
 * An energy on a temperature binding is `k_B T`, not a kelvin count of the
 * joule magnitude. `upt eval "k_B*T/e" T=22eV` used to exit 0 and print
 * `22 * k_B`. A length on the same name is not a temperature and exits 1.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';

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
const text = (c: ReturnType<typeof capture>) => c.lines.join('');
const errText = (c: ReturnType<typeof capture>) => c.err.join('');

describe('upt eval temperature bindings', () => {
  it('reads T=22eV as the temperature whose kT is 22 eV', async () => {
    const cap = capture();
    expect(await runCli(['eval', 'k_B*T/e', 'T=22eV'], cap.io)).toBe(0);
    const volts = Number(text(cap).trim());
    expect(volts / 22).toBeCloseTo(1, 8);
    expect(errText(cap)).toMatch(/k_B T/);
  });

  it('k_B*T at T=22eV is 22 eV in joules', async () => {
    const cap = capture();
    expect(await runCli(['eval', 'k_B*T', 'T=22eV'], cap.io)).toBe(0);
    const joules = Number(text(cap).trim());
    expect(joules / (22 * E_SI)).toBeCloseTo(1, 8);
  });

  it('keeps T=300K and T=25degC as absolute temperatures', async () => {
    const kelvin = capture();
    expect(await runCli(['eval', 'k_B*T/e', 'T=300K'], kelvin.io)).toBe(0);
    expect(Number(text(kelvin).trim()) / ((K_B_SI * 300) / E_SI)).toBeCloseTo(1, 8);
    const celsius = capture();
    expect(await runCli(['eval', 'k_B*T/e', 'T=25degC'], celsius.io)).toBe(0);
    expect(Number(text(celsius).trim()) / ((K_B_SI * 298.15) / E_SI)).toBeCloseTo(1, 8);
  });

  it('a bare T=300 is already kelvin', async () => {
    const cap = capture();
    expect(await runCli(['eval', 'k_B*T/e', 'T=300'], cap.io)).toBe(0);
    expect(Number(text(cap).trim()) / ((K_B_SI * 300) / E_SI)).toBeCloseTo(1, 8);
  });

  it('uses an explicit k_B so k_B*T/e stays 22 V', async () => {
    const cap = capture();
    expect(await runCli(['eval', 'k_B*T/e', 'k_B=2', 'T=22eV'], cap.io)).toBe(0);
    expect(Number(text(cap).trim()) / 22).toBeCloseTo(1, 8);
  });

  it('rejects a length bound to T and does not print a voltage', async () => {
    const cap = capture();
    expect(await runCli(['eval', 'k_B*T/e', 'T=1m'], cap.io)).toBe(1);
    expect(errText(cap)).toMatch(/temperature/);
    expect(text(cap).trim()).toBe('');
  });
});
