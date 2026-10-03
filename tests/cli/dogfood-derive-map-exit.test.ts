/**
 * 2026-10-03 dogfood item 9. A Debye derive printed "NOT a unique monomial" and
 * exited 0. `upt map --equation "pressure = intensity/c"` printed a placeholder
 * dimension `[L^-1 T]` and exited 0. A script could not tell either result from
 * a check that passed.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, text: cap.lines.join('') };
}

describe('dogfood 9: a non-unique monomial and a placeholder dimension do not exit 0', () => {
  it('Debye derive is not a unique monomial and exits 3', async () => {
    const r = await run([
      'derive',
      'length:length',
      'eps0:L^-3.M^-1.T^4.I^2',
      'kT:energy',
      'n:L^-3',
      'e:charge',
      '--formula',
      'sqrt(eps0*kT/(n*e^2))',
    ]);
    expect(r.text).toMatch(/NOT a unique monomial/);
    expect(r.text).toMatch(/formula dimension: \[length\]/);
    expect(r.code).toBe(3);
  });

  it('a unique monomial still exits 0', async () => {
    const r = await run([
      'derive',
      'pressure:pressure',
      'intensity:power/area',
      'c:velocity',
      '--formula',
      'intensity/c',
    ]);
    expect(r.text).toMatch(/dimensionally determined up to a constant/);
    expect(r.code).toBe(0);
  });

  it('pressure = intensity/c does not quote the placeholder dimension and exits 3', async () => {
    const r = await run(['map', '--equation-only', '--equation', 'pressure = intensity/c']);
    expect(r.text).toMatch(/intensity/);
    expect(r.text).toMatch(/was not established/);
    expect(r.text).not.toMatch(/\[L\^-1 T\]/);
    expect(r.text).not.toMatch(/not a failed check/);
    expect(r.code).toBe(3);
    const json = await run(['map', '--equation-only', '--equation', 'pressure = intensity/c', '--json']);
    expect(json.code).toBe(3);
    const envelope = JSON.parse(json.text) as { result: { userEquation: { rhsDimension: unknown } } };
    expect(envelope.result.userEquation.rhsDimension).toBeNull();
  });

  it('an equation the canonical layer agrees with still exits 0', async () => {
    const r = await run(['map', '--equation-only', '--equation', 'pressure = N*k_B*temperature/V']);
    expect(r.text).toMatch(/agrees with CE-ideal-gas/);
    expect(r.text).not.toMatch(/\[L\^-1 M T\^-2\]/);
    expect(r.code).toBe(0);
  });

  it('a resolved mismatch still names both real dimensions and exits 3', async () => {
    const r = await run(['map', '--equation-only', '--equation', 'period = mass']);
    expect(r.text).toMatch(/dimensional MISMATCH: RHS is \[mass\] but the target is \[time\]/);
    expect(r.code).toBe(3);
  });
});
