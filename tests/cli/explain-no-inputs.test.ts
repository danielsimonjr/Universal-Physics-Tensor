/**
 * `upt explain <quantity>` with no inputs names the cause it can prove: no inputs were given.
 * With inputs and no path, the graph sentence stays. The library summary stays CLI-neutral.
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

const USAGE = 'upt explain <quantity> name=value';

describe('upt explain with no inputs', () => {
  it('a source-only leaf says no inputs were given and shows the usage form', async () => {
    const r = await run(['explain', 'damping-spring', '--source=catalog']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('no inputs were given');
    expect(r.text).toContain(USAGE);
    expect(r.text).not.toContain('no derivation path');
  });

  it('keeps the frontier hint and adds the usage form', async () => {
    const r = await run(['explain', 'hawking-temperature']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('no inputs were given');
    expect(r.text).toContain('Knowing one of {');
    expect(r.text).toContain('to determine it, also supply:');
    expect(r.text).toContain(USAGE);
  });

  it('guard: with inputs and no path, the graph sentence stays', async () => {
    const r = await run(['explain', 'kinetic-energy', '--source=canonical', 'mass=2']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('cannot be determined from {mass}: the graph has no derivation path');
    expect(r.text).not.toContain('no inputs were given');
    expect(r.text).not.toContain(USAGE);
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
    expect(summary).toContain('no inputs were given');
    expect(summary).not.toContain(USAGE);
  });
});
