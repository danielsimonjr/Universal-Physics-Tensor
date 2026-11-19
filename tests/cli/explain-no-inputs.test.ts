/**
 * `upt explain <quantity>` with an empty bound set states only what that set shows.
 * The library sees the bound set, so it says that no graph quantity is known.
 * Only the CLI sees the raw arguments, so only the CLI says that no inputs were given.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

const USAGE = 'give inputs in the form: upt explain <quantity> [name=value | name]';
const EMPTY_SET = 'cannot be determined: no graph quantity is known';
const CONSTANT_LINE = 'every input names a registered constant';

describe('upt explain with no inputs', () => {
  it('a source-only leaf states the empty set and shows the usage form', async () => {
    const r = await run(['explain', 'damping-spring', '--source=catalog']);
    expect(r.code).toBe(0);
    expect(r.text).toContain(EMPTY_SET);
    expect(r.text).toContain(USAGE);
    expect(r.text).not.toContain('no derivation path');
  });

  it('keeps the frontier hint and adds the usage form', async () => {
    const r = await run(['explain', 'hawking-temperature']);
    expect(r.code).toBe(0);
    expect(r.text).toContain(EMPTY_SET);
    expect(r.text).toContain('Knowing one of {');
    expect(r.text).toContain('to determine it, also supply:');
    expect(r.text).toContain(USAGE);
  });

  it('guard: with inputs and no path, the graph sentence stays', async () => {
    const r = await run(['explain', 'kinetic-energy', '--source=canonical', 'mass=2']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('cannot be determined from {mass}: the graph has no derivation path');
    expect(r.text).not.toContain(EMPTY_SET);
    expect(r.text).not.toContain(USAGE);
  });

  it.each([
    ['hawking-temperature', 'k_B=1.380649e-23'],
    ['damping-spring', 'c=299792458'],
  ])('a constant-only input set (%s %s) gets the constant line, not the usage line', async (q, input) => {
    const r = await run(['explain', q, input]);
    expect(r.code).toBe(0);
    expect(r.text).toContain(EMPTY_SET);
    expect(r.text).toContain(CONSTANT_LINE);
    expect(r.text).not.toContain('no inputs were given');
    expect(r.text).not.toContain(USAGE);
  });

  it('guard: a bare name keeps the graph sentence', async () => {
    const r = await run(['explain', 'kinetic-energy', '--source=canonical', 'mass']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('cannot be determined from {mass}: the graph has no derivation path');
    expect(r.text).not.toContain(USAGE);
    expect(r.text).not.toContain(CONSTANT_LINE);
  });

  it('--source=both with no input shows the usage line', async () => {
    const r = await run(['explain', 'hawking-temperature', '--source=both']);
    expect(r.code).toBe(0);
    expect(r.text).toContain(USAGE);
  });

  it('guard: a constant with no inputs is still determined', async () => {
    const r = await run(['explain', 'stefan-sigma']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('determined from {} (no inputs) via be-165');
    expect(r.text).not.toContain(USAGE);
  });

  it('--json keeps the library summary CLI-neutral', async () => {
    const r = await run(['explain', 'damping-spring', '--source=catalog', '--json']);
    const summary = (JSON.parse(r.text) as { result: { summary: string } }).result.summary;
    expect(summary).toContain(EMPTY_SET);
    expect(summary).not.toContain('no inputs were given');
    expect(summary).not.toContain('upt explain <quantity>');
  });
});
