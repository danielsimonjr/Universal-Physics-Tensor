/**
 * Audit I16 limits: an atlas-wide evidence view (`upt atlas --evidence`), and `--run`'s exit 3 on a
 * refutation, for `atlas` and `map`. Nothing in the shipped registry refutes, so a refuting witness is
 * injected through a test-only patched api; the unpatched run is the paired check that the same
 * assertion fails on the true registry.
 */
import '../helpers/dist.js';
import { captureMerged } from '../helpers/cli.js';
import { runText } from '../helpers/cli-run.js';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { ALL_EVIDENCE_TAGS } from '../../src/atlas/types.js';
import { deriveEvidence } from '../../src/atlas/derive-evidence.js';
import { WITNESS_REGISTRY } from '../../src/atlas/witness-specs.js';

async function runPatched(name: string, args: string[], patch: Record<string, unknown>): Promise<{ code: number; text: string }> {
  const [{ resolveCommand }, { parseArgs }, api] = await Promise.all([
    import('../../dist/cli/command.js'),
    import('../../dist/cli/args.js'),
    import('../../dist/cli-api.js'),
    import('../../dist/cli/commands/index.js'),
  ]);
  const command = resolveCommand(name)!;
  const c = captureMerged();
  const code = await command.run({ args: parseArgs(command.name, args, command.flags), api: { ...api, ...patch }, ...c.io } as any);
  return { code, text: c.lines.join('') };
}

const BRIDGES = ATLAS_FAMILIES.flatMap((f) => f.bridges.map((b) => ({ family: f.family, b })));

describe('audit I16: the atlas-wide evidence view', () => {
  it('lists every bridge of every family once, with the denominators derived from the families', async () => {
    const r = await runText(['atlas', '--evidence', '--json']);
    expect(r.code).toBe(0);
    const v = JSON.parse(r.text).result;
    expect(v.view).toBe('atlas-evidence');
    expect(v.bridges.map((b: { id: string }) => b.id)).toEqual(BRIDGES.map((x) => x.b.id));
    expect(v.bridges.map((b: { family: string }) => b.family)).toEqual(BRIDGES.map((x) => x.family));
    expect(v.denominator).toEqual({
      families: ATLAS_FAMILIES.length,
      bridges: BRIDGES.length,
      witnesses: BRIDGES.reduce((n, x) => n + x.b.witnesses.length, 0),
    });
    // Every tag, zero included, in the tag list's order.
    expect(v.byTag.map((t: { tag: string }) => t.tag)).toEqual([...ALL_EVIDENCE_TAGS]);
  });

  it('--stored: each bridge derives what deriveEvidence gives under the committed results (a second derivation)', async () => {
    const v = JSON.parse((await runText(['atlas', '--stored', '--json'])).text).result;
    const stored = JSON.parse(readFileSync('data/atlas/witness-results.json', 'utf8')) as {
      results: { recordId: string; witnessId: string; status: string }[];
    };
    for (const { b } of BRIDGES) {
      const rows = stored.results.filter((x) => x.recordId === b.id);
      const passing = new Set(rows.filter((x) => x.status === 'checked').map((x) => x.witnessId));
      const unobserved = b.witnesses.map((w) => w.id).filter((id) => !rows.some((x) => x.witnessId === id));
      const low = deriveEvidence(b, passing);
      const high = deriveEvidence(b, new Set([...passing, ...unobserved]));
      const row = v.bridges.find((x: { id: string }) => x.id === b.id);
      expect(row.evidence.derived, b.id).toEqual([...low].filter((t) => high.has(t)).sort());
      expect(row.evidence.undecided, b.id).toEqual([...new Set([...low, ...high])].filter((t) => low.has(t) !== high.has(t)).sort());
    }
    // The per-tag counts are the counts over those rows; derived and undecided are counted apart.
    for (const t of v.byTag) {
      expect(t.derived, t.tag).toBe(v.bridges.filter((b: any) => b.evidence.derived.includes(t.tag)).length);
      expect(t.undecided, t.tag).toBe(v.bridges.filter((b: any) => b.evidence.undecided.includes(t.tag)).length);
    }
  });

  it("--stored agrees with each family view's filed bridges (a second code path)", async () => {
    const v = JSON.parse((await runText(['atlas', '--stored', '--json'])).text).result;
    for (const f of ATLAS_FAMILIES) {
      const fv = JSON.parse((await runText(['map', `--family=${f.family}`, '--stored', '--json'])).text).result;
      for (const b of fv.bridges.filter((x: { role: string }) => x.role === 'filed')) {
        expect(v.bridges.find((x: { id: string }) => x.id === b.id).evidence, b.id).toEqual(b.evidence);
      }
    }
  });

  it('with no results source, every witness is unobserved and the text says so', async () => {
    const r = await runText(['atlas', '--evidence']);
    expect(r.code).toBe(0);
    expect(r.text).toContain('witness results: none observed');
    expect(r.text).toMatch(/by tag \(bridges; a bridge carries several tags, so the counts do not sum to 20\)/);
    const v = JSON.parse((await runText(['atlas', '--evidence', '--json'])).text).result;
    expect(v.witnessResults).toBeUndefined();
    expect(v.bridges.every((b: any) => b.evidence.results === undefined)).toBe(true);
  });

  it('--run runs every registered witness, the transport witnesses included', async () => {
    const v = JSON.parse((await runText(['atlas', '--run', '--json'])).text).result;
    expect(v.witnessResults.provenance.registered).toBe(WITNESS_REGISTRY.length);
    expect(v.witnessResults.witnesses.refuted).toBe(0);
    expect(v.normTransports).toEqual([{ id: 'nt-spring-lc-relative-period', bridge: 'ab-spring-lc', witness: 'W1τ', status: 'checked' }]);
  });

  it('refuses a bridge id with --evidence or --stored, and both results sources at once', async () => {
    expect((await runText(['atlas', 'ab-spring-lc', '--evidence'])).code).toBe(1);
    expect((await runText(['atlas', 'ab-spring-lc', '--stored'])).code).toBe(1);
    const both = await runText(['atlas', '--stored', '--run']);
    expect(both.code).toBe(1);
    expect(both.text).toContain('pick one witness-results source');
  });

  it('the plain listing points to the evidence view', async () => {
    expect((await runText(['atlas'])).text).toContain('`upt atlas --evidence`');
  });
});

/** The shipped registry with W7's target moved off the true value, so it refutes. */
function refutingRegistry(): unknown[] {
  return WITNESS_REGISTRY.map((e) => (e.kind === 'numeric' && e.spec.id === 'W7' ? { ...e, spec: { ...e.spec, target: 2 } } : e));
}
/** The shipped registry with W7 made unresolved (its value does not converge), not refuted. */
function unresolvedRegistry(): unknown[] {
  return WITNESS_REGISTRY.map((e) =>
    e.kind === 'numeric' && e.spec.id === 'W7' ? { ...e, spec: { ...e.spec, evaluate: () => 1 + 1e-3 } } : e,
  );
}

describe('audit I16: --run exits 3 on a refutation (a refuting witness injected, test-only)', () => {
  const cases: [string, string[]][] = [
    ['atlas', ['ab-pendulum-linear', '--run']],
    ['atlas', ['--evidence', '--run']],
    ['map', ['--family=oscillators', '--run']],
    ['map', ['--route=model-pendulum,model-spring', '--run']],
    ['map', ['--observable=phase', '--run']],
  ];

  it.each(cases)('%s %s: exit 3 and W7 named as refuted', async (name, args) => {
    const r = await runPatched(name, args, { WITNESS_REGISTRY: refutingRegistry() });
    expect(r.code).toBe(3);
    expect(r.text).toMatch(/refuted[^\n]*W7|W7[^\n]*refuted/);
  });

  it.each(cases)('paired check, %s %s: the shipped registry exits 0, so the assertion above can fail', async (name, args) => {
    const r = await runPatched(name, args, {});
    expect(r.code).toBe(0);
  });

  it.each(cases)('%s %s: an unresolved witness is not a refutation (exit 0)', async (name, args) => {
    const r = await runPatched(name, args, { WITNESS_REGISTRY: unresolvedRegistry() });
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/unresolved[^\n]*W7|W7[^\n]*unresolved/);
  });

  it('--stored never exits 3: the committed artifact is read, not a check run now', async () => {
    const r = await runPatched('map', ['--family=oscillators', '--stored'], { WITNESS_REGISTRY: refutingRegistry() });
    expect(r.code).toBe(0);
  });
});
