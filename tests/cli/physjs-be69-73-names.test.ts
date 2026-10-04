/**
 * Search and explain read the edge aliases. A fast-magnetosonic formula
 * whose sources are that edge names be-69 and does not name be-67.
 * A frequency ratio does not name be-68.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

describe('be-69..be-73 names', () => {
  it('search finds the five catalog names', async () => {
    for (const [query, id] of [
      ['fast magnetosonic', 'be-69'],
      ['einstein relation', 'be-70'],
      ['clapeyron', 'be-71'],
      ['gravitational redshift', 'be-72'],
      ['peltier', 'be-73'],
    ] as const) {
      const r = await run(['search', ...query.split(' ')]);
      expect(r.code, query).toBe(0);
      expect(r.text, query).toContain(id);
    }
  });

  it('explain accepts the evaluator keys as aliases of the edge quantities', async () => {
    const named = await run([
      'explain',
      'fast-magnetosonic-speed',
      'sound-speed=1000',
      'magnetic-flux-density=0',
      'plasma-mass-density=1',
    ]);
    const aliased = await run([
      'explain',
      'fast-magnetosonic-speed',
      'cs_m_per_s=1000',
      'B_T=0',
      'rho_kg_per_m3=1',
    ]);
    expect(named.code).toBe(0);
    expect(aliased.code).toBe(0);
    expect(aliased.text).toContain('Recovered value: 1000');
    expect(named.text).toContain('Recovered value: 1000');
    const ratio = await run(['explain', 'gravitational-frequency-ratio', 'g1=-1', 'g2=-4']);
    expect(ratio.code).toBe(0);
    expect(ratio.text).toContain('Recovered value: 2');
    expect(ratio.text).not.toContain('tolman-invariant');
  });

  it('derive names be-69 for that source set and does not name it for the Alfvén set', async () => {
    const fast = await run([
      'derive',
      'fast-magnetosonic-speed:velocity',
      'sound_speed:velocity',
      'magnetic_flux_density:magnetic_field',
      'plasma_mass_density:density',
      '--formula',
      'sound_speed',
    ]);
    expect(fast.code).toBe(0);
    expect(fast.text).toMatch(/be-69 \(Fast magnetosonic/);
    expect(fast.text).not.toMatch(/be-67 \(Alfvén/);
    const alfven = await run([
      'derive',
      'alfven-speed:velocity',
      'magnetic_flux_density:magnetic_field',
      'plasma_mass_density:density',
      '--formula',
      'magnetic_flux_density',
    ]);
    expect(alfven.code).toBe(3);
    expect(alfven.text).toMatch(/be-67 \(Alfvén/);
    expect(alfven.text).not.toMatch(/be-69 \(Fast magnetosonic/);
  });
});
