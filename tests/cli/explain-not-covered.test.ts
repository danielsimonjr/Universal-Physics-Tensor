/**
 * `upt explain` says plainly when a name is not covered (persona finding C4, 2026-09-25).
 *
 * `upt explain qwertyuiop`, `upt explain soliton-speed` and `upt explain driven-damped-oscillator`
 * all printed "'X' cannot be determined from {} (no inputs): the graph has no derivation path" and
 * exited 0: the same answer as for a real quantity that the given inputs cannot reach. A name that is
 * not a quantity of the graph is now reported as NOT COVERED, with suggestions, and exits 1, as an
 * unknown model id does in `upt path`. A real quantity the inputs cannot reach is still an answer.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { formatQuantity } from '../../src/composition/explain.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  let code: number;
  try {
    code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  } catch (e) {
    throw e;
  }
  return { code, text: lines.join('') };
}

describe('upt explain — not covered vs not derivable', () => {
  it('a name that is not a quantity of the graph is NOT COVERED, and exits 1', async () => {
    const r = await run(['explain', 'qwertyuiop']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/'qwertyuiop' is not a quantity in the catalog graph: NOT COVERED/);
  });

  it('uses canonical coverage for an exact quantity absent from the default catalog', async () => {
    const inputs = ['kinetic-energy', 'mass=2kg', 'speed=3m/s'];
    const implicit = await run(['explain', ...inputs, '--json']);
    const canonical = await run(['explain', ...inputs, '--source=canonical', '--json']);
    expect(implicit.code).toBe(0);
    expect(JSON.parse(implicit.text)).toEqual(JSON.parse(canonical.text));
    expect(JSON.parse(implicit.text)).toMatchObject({ source: 'canonical', result: { recoveredValue: 9 } });

    const catalog = await run(['explain', ...inputs, '--source=catalog']);
    expect(catalog.code).toBe(1);
    expect(catalog.text).toContain('NOT COVERED');
  });

  it('suggests near names for a misspelling', async () => {
    const r = await run(['explain', 'hawkng-temperature']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/did you mean: .*hawking-temperature/);
  });

  it('an out-of-coverage system (the persona’s driven damped oscillator) is NOT COVERED too', async () => {
    const r = await run(['explain', 'driven-damped-oscillator']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/NOT COVERED/);
  });

  it('underscores resolve like hyphens: hawking_temperature is covered', async () => {
    const r = await run(['explain', 'hawking_temperature', 'mass=1.989e30']);
    expect(r.code).toBe(0);
    const json = await run(['explain', 'hawking_temperature', 'mass=1.989e30', '--json']);
    const raw = (JSON.parse(json.text) as { result: { recoveredValue: number } }).result.recoveredValue;
    expect(Math.abs(raw - 6.1684e-8) / 6.1684e-8).toBeLessThan(1e-4);
    expect(r.text).toContain(`Recovered value: ${formatQuantity(raw)} K [highly-speculative].`);
    expect(r.text).not.toContain('6.1684e-8');
  });

  it('a real quantity that the inputs cannot reach is an answer: exit 0, and it says it IS in the graph', async () => {
    const r = await run(['explain', 'hawking-temperature']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/is in the graph, but cannot be determined: no graph quantity is known/);
  });
});

// Audit I5 residual (owner review 2026-09-27): `explain schrodinger-equation --source=canonical` said
// "did you mean: a, A, g, q, r?" — one-letter names that the containment rule let through because each
// occurs inside the long input. It now names what `upt search` finds for the input's words.
describe('audit I5 residual: a law or model name is pointed to upt search', () => {
  const suggested = (text: string): string[] =>
    (/did you mean: ([^?]*)\?/.exec(text)?.[1] ?? '').split(', ').filter((s) => s !== '');

  it('schrodinger-equation lists the search hits and the search command, and no one-letter names', async () => {
    const r = await run(['explain', 'schrodinger-equation', '--source=canonical']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/'schrodinger-equation' is not a quantity in the canonical graph: NOT COVERED/);
    expect(r.text).toMatch(/`upt search schrodinger` finds/);
    for (const id of ['model-schrodinger-free', 'ab-kg-schrodinger', 'ab-schrodinger-diffusion']) {
      expect(r.text).toContain(id);
    }
    expect(suggested(r.text).filter((s) => s.length < 3)).toEqual([]);
  });

  it('control: a misspelled quantity still gets its near name, and no search line when search finds nothing', async () => {
    const r = await run(['explain', 'hawkng-temperature']);
    expect(suggested(r.text)[0]).toBe('hawking-temperature');
    const q = await run(['explain', 'qwertyuiop']);
    expect(q.text).not.toMatch(/upt search/);
  });
});

it('recovers units and source-free canonical values', async () => {
  const kinetic = await run(['explain', 'kinetic-energy', 'mass=2kg', 'speed=3m/s', '--source=canonical', '--json']);
  expect(JSON.parse(kinetic.text).result).toMatchObject({ recoveredValue: 9, unit: 'J', confidence: 'established' });
  for (const [name, expected] of [
    ['bohr-radius', 5.29177210544346e-11],
    ['rydberg-energy', 2.17987236109917e-18],
    ['position-momentum-uncertainty-product', 5.27285908823078e-35],
  ] as const) {
    const report = await run(['explain', name, '--source=canonical', '--json']);
    expect(JSON.parse(report.text).result.recoveredValue / expected).toBeCloseTo(1, 10);
  }
});

it('reports the executed upstream routes and constant substitutions', async () => {
  const landauer = await run(['explain', 'landauer-erasure-energy', 'mass=1Msun', '--json']);
  const result = JSON.parse(landauer.text).result;
  expect(result.confidence).toBe('highly-speculative');
  expect(result.derivations[0].route).toMatchObject([
    { kind: 'edge', id: 'be-42', confidence: 'highly-speculative' },
    { kind: 'identification', from: 'hawking-temperature', to: 'temperature', confidence: 'established' },
    { kind: 'edge', id: 'be-16' },
  ]);
  const field = await run(['explain', 'magnetic-field', 'current=10A', 'distance=0.05m', '--source=canonical', '--json']);
  expect(JSON.parse(field.text).result.recoveredValue).toBeCloseTo(4e-5, 13);
  const epsilon = await run(['explain', 'field-energy-density', 'electric-field=1000V/m', 'epsilon_0=8.854e-12F/m', '--source=canonical']);
  expect(epsilon.text).toContain('Entered epsilon_0 = 8.854e-12 SI. Used registered epsilon_0 = 8.8541878188e-12 SI');
  expect(epsilon.text).toContain('0.5% relative tolerance');
});
