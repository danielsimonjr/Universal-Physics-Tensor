/**
 * A tagged quantity is read in its own unit. `1GeV` is one GeV, not the
 * joule equivalent, because the dark-mass evaluator speaks GeV. `1bit` is
 * ln 2 nats, because the entanglement evaluator speaks nats.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { formatQuantity } from '../../src/composition/explain.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push(s ?? '');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('\n');

async function recovered(args: string[]): Promise<{ text: string; value: number }> {
  const shown = capture();
  expect(await runCli(args, shown.io)).toBe(0);
  const json = capture();
  expect(await runCli([...args, '--json'], json.io)).toBe(0);
  const envelope = JSON.parse(json.lines.join('\n')) as { result: { recoveredValue: number } };
  return { text: text(shown), value: envelope.result.recoveredValue };
}

describe('quantity unit conventions', () => {
  it('reads 1GeV as one GeV for the dark-fermion mass', async () => {
    const r = await recovered(['explain', 'dark-fermion-mass', 'yukawa-coupling=1', 'vacuum-expectation-value=1GeV']);
    expect(r.value).toBe(1);
    expect(r.text).toContain(`Recovered value: ${formatQuantity(r.value)}.`);
    expect(r.text).not.toContain('1.0000e+0');
  });

  it('converts 1J into GeV for that same mass', async () => {
    const r = await recovered(['explain', 'dark-fermion-mass', 'yukawa-coupling=1', 'vacuum-expectation-value=1J']);
    expect(r.value).toBeGreaterThan(6.24e9);
    expect(r.value).toBeLessThan(6.25e9);
    expect(r.text).toContain(`Recovered value: ${formatQuantity(r.value)}.`);
    expect(r.text).not.toContain('6.2415e+9');
  });

  it('keeps a bare 246 in GeV, and a solar mass in kilograms', async () => {
    const gev = await recovered(['explain', 'dark-fermion-mass', 'yukawa-coupling=1', 'vacuum-expectation-value=246']);
    expect(gev.value).toBe(246);
    expect(gev.text).toContain(`Recovered value: ${formatQuantity(gev.value)}.`);
    expect(gev.text).not.toContain('2.4600e+2');
    const sun = await recovered(['explain', 'hawking-temperature', 'mass=1Msun']);
    expect(Math.abs(sun.value - 6.1684e-8) / 6.1684e-8).toBeLessThan(1e-4);
    expect(sun.text).toContain(`Recovered value: ${formatQuantity(sun.value)}.`);
    expect(sun.text).not.toContain('6.1684e-8');
  });

  it('reads 1bit as ln 2 nats on the entanglement first law', async () => {
    const r = await recovered(['explain', 'entanglement-entropy-variation', 'modular-hamiltonian-variation=1bit']);
    expect(r.value).toBeCloseTo(Math.LN2);
    expect(r.text).toContain(formatQuantity(r.value));
    expect(r.text).not.toContain(Math.LN2.toExponential(4));
  });
});
