import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function cli(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

const H = '6.62607015e-34';
const recovered = (text: string): string | undefined => /Recovered value: ([0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?)/.exec(text)?.[1];

describe('nu, photon-frequency, h, and planck-constant are one quantity each (issue 473)', () => {
  it('nu is the baseline: Planck–Einstein recovers h nu', async () => {
    const r = await cli(['explain', 'photon-energy', `planck-constant=${H}`, 'nu=5e14', '--source=canonical']);
    expect(r.code).toBe(0);
    expect(recovered(r.text)).toBe('3.313035075e-19');
  });
  it.each([
    [`planck-constant=${H}`, 'photon-frequency=5e14'],
    [`h=${H}`, 'nu=5e14'],
    [`h=${H}`, 'photon-frequency=5e14'],
  ])('%s %s recovers the same value', async (a, b) => {
    const r = await cli(['explain', 'photon-energy', a, b, '--source=canonical']);
    expect(r.code).toBe(0);
    expect(recovered(r.text)).toBe('3.313035075e-19');
    expect(r.text).not.toMatch(/Knowing one of \{nu\}/);
  });
  it('the photoelectric entry still reads photon-frequency', async () => {
    const r = await cli([
      'explain', 'photoelectron-max-energy', `planck-constant=${H}`, 'photon-frequency=1.5e15', 'work-function=6.89e-19',
      '--source=canonical',
    ]);
    expect(r.code).toBe(0);
    expect(recovered(r.text)).toBeDefined();
  });
  it('two numbers under the two spellings are an error, not a pick (control)', async () => {
    const r = await cli(['explain', 'photon-energy', `h=${H}`, 'nu=5e14', 'photon-frequency=6e14', '--source=canonical']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/are one quantity and disagree/);
  });
  it('a plain wave frequency is a different quantity and is not read as a photon frequency (control)', async () => {
    const r = await cli(['explain', 'photon-energy', `planck-constant=${H}`, 'frequency=5e14', '--source=canonical']);
    expect(recovered(r.text)).toBeUndefined();
  });
});
