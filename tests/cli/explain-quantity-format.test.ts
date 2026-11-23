/**
 * Explain text prints a recovered value through one formatter: 15 significant
 * digits, the precision the input resolver already passes. Four-digit
 * exponential text hid a Tolman correction of order 1e-6. JSON keeps the
 * number `explainQuantity` computed.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { formatQuantity } from '../../src/composition/explain.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push(s ?? '');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

describe('explain text formats a recovered value at 15 significant digits', () => {
  it('keeps the Tolman correction visible, and JSON keeps the unrounded number', async () => {
    const textCap = capture();
    expect(
      await runCli(
        ['explain', 'tolman-invariant', 'proper-temperature=5800', 'metric-g00=-0.9999957549948597'],
        textCap.io,
      ),
    ).toBe(0);
    const text = textCap.lines.join('\n');

    const jsonCap = capture();
    expect(
      await runCli(
        ['explain', 'tolman-invariant', 'proper-temperature=5800', 'metric-g00=-0.9999957549948597', '--json'],
        jsonCap.io,
      ),
    ).toBe(0);
    const envelope = JSON.parse(jsonCap.lines.join('\n')) as {
      result: { recoveredValue: number; derivations: { value: number }[] };
    };
    const raw = envelope.result.recoveredValue;

    const relative = Math.abs(raw - 5800) / 5800;
    expect(relative).toBeGreaterThan(1e-6);
    expect(relative).toBeLessThan(1e-5);
    expect(raw.toExponential(4)).toBe('5.8000e+3');

    const shown = formatQuantity(raw);
    expect(shown).toBe(String(Number(raw.toPrecision(15))));
    expect(shown).not.toBe('5800');
    expect(shown).not.toBe('5.8000e+3');
    expect(String(raw)).not.toBe(shown);

    expect(text).toContain(`Recovered value: ${shown} K [established].`);
    expect(text).not.toContain('Recovered value: 5.8000e+3');
    expect(text).toContain(`= ${shown}`);
    expect(envelope.result.derivations[0]?.value).toBe(raw);
  });

  it('does not print an integer recovered value as a four-digit exponential', () => {
    expect(formatQuantity(1)).toBe('1');
    expect(formatQuantity(5800)).toBe('5800');
    expect(formatQuantity(Math.LN2)).toBe(String(Number(Math.LN2.toPrecision(15))));
    expect(formatQuantity(Math.LN2)).not.toBe(Math.LN2.toExponential(4));
  });
});

describe('explain bounds', () => {
  it.each([
    ['position-momentum-uncertainty-product', [], 'lower'],
    ['orthogonalization-time-lower-bound', ['mean-energy-above-ground=1J'], 'lower'],
    ['bekenstein-entropy-upper-bound', ['system-energy=1J', 'enclosing-radius=1m'], 'upper'],
  ] as const)('reports the direction of the %s bound in text and JSON', async (target, bindings, bound) => {
    const args = ['explain', target, '--source=canonical', ...bindings];
    const text = capture();
    expect(await runCli(args, text.io)).toBe(0);
    expect(text.lines.join('\n')).toContain(`computes the ${bound} bound reported as '${target}'`);
    expect(text.lines.join('\n')).toContain('Bound value:');
    expect(text.lines.join('\n')).toContain(` — ${bound} bound: `);
    const json = capture();
    expect(await runCli([...args, '--json'], json.io)).toBe(0);
    expect(JSON.parse(json.lines.join('\n')).result).toMatchObject({
      bound,
      recoveredValue: expect.any(Number),
      summary: expect.stringContaining(`computes the ${bound} bound`),
    });
  });

  it('renders and enforces the Planck evaluator temperature sign from its input contract', async () => {
    const valid = capture();
    expect(await runCli(['evaluate', 'be-164', 'nu_Hz=1e12Hz', 'T_K=300K'], valid.io)).toBe(0);
    expect(valid.lines.join('\n')).toMatch(/T_K \[K\].*\(> 0;/);
    const invalid = capture();
    expect(await runCli(['evaluate', 'be-164', 'nu_Hz=1e12Hz', 'T_K=0K'], invalid.io)).toBe(1);
    expect(invalid.lines.join('\n')).toContain('T_K = 0 violates T_K > 0');
  });
});
