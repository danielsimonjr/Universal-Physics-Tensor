/**
 * `upt map --relation= --evidence=` — in-process against the built CLI
 * (`dist/cli/main.js`), the convention of `confront.test.ts` and
 * `regime.test.ts`.
 *
 * Exit-code contract, inherited from `confront.ts`: a bad flag VALUE throws
 * `CliError` → exit 1; an unknown FLAG is rejected by the parser → exit 2;
 * `run` returns 0 on success.
 *
 * @module tests/cli/map-filters
 */
import '../helpers/dist.js';
import { captureMerged } from '../helpers/cli.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const cap = captureMerged();
  const code = await runCli(args, cap.io);
  return { code, text: cap.lines.join('') };
}

describe('upt map — filter flags', () => {
  it('no filter: the legend line is absent and the map is the whole graph', async () => {
    const { code, text } = await run(['map', '--source=both']);
    expect(code).toBe(0);
    expect(text).toContain('Linkage map');
    expect(text).not.toContain('filter:');
  });

  it('--relation=derivation prints the legend with BOTH dropped counts', async () => {
    const { code, text } = await run(['map', '--source=both', '--relation=derivation']);
    expect(code).toBe(0);
    expect(text).toMatch(/filter: relation=derivation/);
    expect(text).toMatch(/\d+ dropped \(did not match\)/);
    expect(text).toMatch(/\d+ dropped \(no overlay metadata\)/);
  });

  it('--relation=approximation keeps nothing — the S1.5 audit recorded none', async () => {
    const { code, text } = await run(['map', '--source=both', '--relation=approximation']);
    expect(code).toBe(0);
    expect(text).toMatch(/filter: relation=approximation — 0 of \d+ kept/);
  });

  it('--evidence selects via DERIVED tags, and says how many could not be evaluated', async () => {
    const { code, text } = await run(['map', '--source=both', '--evidence=proposed']);
    expect(code).toBe(0);
    const m = /filter: evidence=proposed — (\d+) of (\d+) kept; (\d+) dropped \(did not match\); (\d+) dropped \(no overlay metadata\)/.exec(
      text,
    );
    expect(m).not.toBeNull();
    const [, kept, total, notMatching, missing] = m!.map(Number);
    expect(kept).toBeGreaterThan(0);
    // Edges with no numeric beId cannot be evaluated at all: they are MISSING,
    // never "did not match". That distinction is the point of the two counts.
    // Kind-bridge catalog edges derive formally-proved, so they do not match.
    expect(missing).toBeGreaterThan(0);
    expect(notMatching).toBeGreaterThan(0);
    expect(kept + notMatching + missing).toBe(total);
  });

  it('a catalog proposed filter drops the kind-bridge edges and still prints both drop counts', async () => {
    // The legend prints a zero rather than dropping the clause. The mirror
    // case — a zero lacking-metadata count — is pinned in
    // `tests/composition/graph-viz-filters.test.ts`. Kind-bridge edges do
    // not match `proposed`, so the did-not-match count is not zero.
    const { code, text } = await run(['map', '--source=catalog', '--evidence=proposed']);
    expect(code).toBe(0);
    expect(text).toMatch(/dropped \(did not match\)/);
    // A count of 50 contains the characters "0 dropped". Match a count that is zero.
    const drops = /filter: evidence=proposed — (\d+) of (\d+) kept; (\d+) dropped \(did not match\); (\d+) dropped \(no overlay metadata\)/.exec(
      text,
    );
    expect(drops).not.toBeNull();
    expect(Number(drops![3])).toBeGreaterThan(0);
    expect(Number(drops![4])).toBeGreaterThan(0);
  });

  it('--json carries the filter stats in the envelope', async () => {
    const { code, text } = await run(['map', '--source=both', '--relation=derivation', '--json']);
    expect(code).toBe(0);
    const payload = JSON.parse(text) as {
      result: { filter?: Record<string, number | string> };
    };
    const f = payload.result.filter!;
    expect(f).toBeDefined();
    expect(f.relation).toBe('derivation');
    expect(typeof f.droppedMissingMetadata).toBe('number');
    expect((f.kept as number) + (f.droppedNotMatching as number) + (f.droppedMissingMetadata as number)).toBe(
      f.total,
    );
  });

  it('the visual formats carry the legend in the diagram source', async () => {
    const dot = await run(['map', '--source=both', '--relation=derivation', '--format=dot']);
    expect(dot.code).toBe(0);
    expect(dot.text).toContain('no overlay metadata');
    const mermaid = await run(['map', '--source=both', '--relation=derivation', '--format=mermaid']);
    expect(mermaid.code).toBe(0);
    expect(mermaid.text).toContain('no overlay metadata');
  });

  it('a bad --relation value exits 1 and names the vocabulary', async () => {
    const { code, text } = await run(['map', '--relation=nonsense']);
    expect(code).toBe(1);
    expect(text).toMatch(/unknown --relation='nonsense'/);
    expect(text).toMatch(/approximation/);
  });

  it('a bad --evidence value exits 1', async () => {
    const { code, text } = await run(['map', '--evidence=very-true']);
    expect(code).toBe(1);
    expect(text).toMatch(/unknown --evidence='very-true'/);
  });

  it('an empty value is a bad value, not an absent filter', async () => {
    const { code } = await run(['map', '--relation=']);
    expect(code).toBe(1);
  });

  it('an unknown FLAG is the parser\'s job — exit 2', async () => {
    const { code } = await run(['map', '--relationship=derivation']);
    expect(code).toBe(2);
  });
});
