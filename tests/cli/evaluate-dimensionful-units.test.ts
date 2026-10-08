/**
 * A dimensionful evaluator input is labeled with its unit, and a value in
 * that unit converts. An empty unit string is dimensionless, so `m^4`,
 * `cm^2`, `F/m`, and an ampere prefix were rejected as `[1]`.
 * Issue #417.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { E_SI, EPS0_SI, K_B_SI } from '../../src/core/constants.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

function labeled(text: string, key: string): string {
  const line = text.split('\n').find((row) => row.includes(`${key} [`));
  if (line === undefined) throw new Error(`no label for ${key} in:\n${text}`);
  return line;
}

function output(text: string, key: string): number {
  // The result line is `<output name> [unit] = N`; the output name is the evaluator's target, not `value`.
  const match = new RegExp(key === 'value' ? '\\] = ([^\\n]+)' : `${key} = ([^\\n]+)`).exec(text);
  if (match === null) throw new Error(`no ${key} in:\n${text}`);
  return Number(match[1]);
}

describe('dimensionful bridge inputs keep their units', () => {
  it('labels the area moment, area, permittivity, and currents, and converts prefixes and powers', async () => {
    const column = await run(['evaluate', 'be-78', 'E_Pa=2e11', 'I_m4=1e-8', 'L_m=2']);
    expect(column.code, column.text).toBe(0);
    expect(labeled(column.text, 'I_m4')).toContain('[m^4]');
    expect(labeled(column.text, 'I_m4')).not.toContain('[dimensionless]');
    expect(column.text).toMatch(/\] = 4934\.802200544679/);

    const withPower = await run(['evaluate', 'be-78', 'E_Pa=2e11', 'I_m4=1e-8m^4', 'L_m=2']);
    expect(withPower.code, withPower.text).toBe(0);
    expect(withPower.text).toMatch(/\] = 4934\.802200544679/);
    expect(withPower.text).toMatch(/converted: 1e-8m\^4 → 1e-8 m\^4/);

    const area = await run(['evaluate', 'be-79', 'k_N_per_m=1', 'g0_m=1e-6', 'A_m2=1cm^2']);
    const areaBare = await run(['evaluate', 'be-79', 'k_N_per_m=1', 'g0_m=1e-6', 'A_m2=1e-4']);
    expect(area.code, area.text).toBe(0);
    expect(labeled(area.text, 'A_m2')).toContain('[m^2]');
    expect(output(area.text, 'value')).toBe(output(areaBare.text, 'value'));

    const film = await run([
      'evaluate',
      'be-80',
      `eps=${EPS0_SI}F/m`,
      'mu_m2_per_Vs=1e-4',
      'V_volts=1',
      'd_m=1e-6',
    ]);
    const filmBare = await run([
      'evaluate',
      'be-80',
      `eps=${EPS0_SI}`,
      'mu_m2_per_Vs=1e-4',
      'V_volts=1',
      'd_m=1e-6',
    ]);
    expect(film.code, film.text).toBe(0);
    expect(labeled(film.text, 'eps')).toContain('[F/m]');
    expect(output(film.text, 'value')).toBe(output(filmBare.text, 'value'));

    const diode = await run(['evaluate', 'be-82', 'I_s_A=1pA', 'V_volts=0.7', 'T_K=300']);
    const diodeBare = await run(['evaluate', 'be-82', 'I_s_A=1e-12', 'V_volts=0.7', 'T_K=300']);
    expect(diode.code, diode.text).toBe(0);
    expect(labeled(diode.text, 'I_s_A')).toContain('[A]');
    expect(output(diode.text, 'value')).toBe(output(diodeBare.text, 'value'));
    expect(output(diode.text, 'value')).toBeCloseTo(1e-12 * (Math.exp((E_SI * 0.7) / (K_B_SI * 300)) - 1), 8);
    expect(output(diode.text, 'value')).toBeCloseTo(0.5747545691036854, 8);

    const sheet = await run(['evaluate', 'be-84', 'V_volts=1', 'I_A=1mA']);
    const sheetBare = await run(['evaluate', 'be-84', 'V_volts=1', 'I_A=0.001']);
    expect(sheet.code, sheet.text).toBe(0);
    expect(labeled(sheet.text, 'I_A')).toContain('[A]');
    expect(output(sheet.text, 'value')).toBe(output(sheetBare.text, 'value'));

    const shot = await run(['evaluate', 'be-85', 'I_A=1uA']);
    const shotBare = await run(['evaluate', 'be-85', 'I_A=1e-6']);
    expect(shot.code, shot.text).toBe(0);
    expect(labeled(shot.text, 'I_A')).toContain('[A]');
    expect(output(shot.text, 'value')).toBe(output(shotBare.text, 'value'));
    expect(output(shot.text, 'value')).toBe(2 * E_SI * 1e-6);
  });

  it('still rejects a unit of the wrong dimension', async () => {
    const metres = await run(['evaluate', 'be-85', 'I_A=1m']);
    expect(metres.code, metres.text).toBe(1);
    expect(metres.text).toMatch(/\[length\].*\[I\]|is \[length\]/);
  });
});
