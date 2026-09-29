/**
 * A tagged quantity is read in its own unit. `1GeV` is one GeV, not the
 * joule equivalent, because the dark-mass evaluator speaks GeV. `1bit` is
 * ln 2 nats, because the entanglement evaluator speaks nats.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push(s ?? '');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('\n');

describe('quantity unit conventions', () => {
  it('reads 1GeV as one GeV for the dark-fermion mass', async () => {
    const c = capture();
    expect(await runCli(['explain', 'dark-fermion-mass', 'yukawa-coupling=1', 'vacuum-expectation-value=1GeV'], c.io)).toBe(0);
    expect(text(c)).toMatch(/Recovered value: 1\.0000e\+0/);
  });

  it('converts 1J into GeV for that same mass', async () => {
    const c = capture();
    expect(await runCli(['explain', 'dark-fermion-mass', 'yukawa-coupling=1', 'vacuum-expectation-value=1J'], c.io)).toBe(0);
    expect(text(c)).toMatch(/Recovered value: 6\.2415e\+9/);
  });

  it('keeps a bare 246 in GeV, and a solar mass in kilograms', async () => {
    const gev = capture();
    expect(await runCli(['explain', 'dark-fermion-mass', 'yukawa-coupling=1', 'vacuum-expectation-value=246'], gev.io)).toBe(0);
    expect(text(gev)).toMatch(/Recovered value: 2\.4600e\+2/);
    const sun = capture();
    expect(await runCli(['explain', 'hawking-temperature', 'mass=1Msun'], sun.io)).toBe(0);
    expect(text(sun)).toMatch(/Recovered value: 6\.1684e-8/);
  });

  it('reads 1bit as ln 2 nats on the entanglement first law', async () => {
    const c = capture();
    expect(
      await runCli(['explain', 'entanglement-entropy-variation', 'modular-hamiltonian-variation=1bit'], c.io),
    ).toBe(0);
    expect(text(c)).toContain(Math.LN2.toExponential(4));
  });
});
