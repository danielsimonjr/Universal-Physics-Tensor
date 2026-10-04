/**
 * `upt explain` says plainly when a name is not covered (persona finding C4, 2026-09-25).
 *
 * `upt explain qwertyuiop`, `upt explain soliton-speed` and `upt explain driven-damped-oscillator`
 * all printed "'X' cannot be determined from {} (no inputs): the graph has no derivation path" and
 * exited 0: the same answer as for a real quantity that the given inputs cannot reach. A name that is
 * not a quantity of the graph is now reported as NOT COVERED, with suggestions, and exits 1, as an
 * unknown model id does in `upt path`. A real quantity the inputs cannot reach is still an answer.
 */
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
    expect(r.text).toContain(`Recovered value: ${formatQuantity(raw)}.`);
    expect(r.text).not.toContain('6.1684e-8');
  });

  it('a real quantity that the inputs cannot reach is an answer: exit 0, and it says it IS in the graph', async () => {
    const r = await run(['explain', 'hawking-temperature']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/is in the graph, but cannot be determined from \{\} \(no inputs\)/);
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
