/** `upt ground` verifies ledger content, computed absence and graph scope. */
import '../helpers/dist.js';
import { describe, expect, it, vi } from 'vitest';
import '../../dist/cli/commands/ground.js';
import { resolveCommand, type CommandCtx } from '../../dist/cli/command.js';
import * as cliApi from '../../dist/cli-api.js';
import { json, run, runText } from '../helpers/cli-run.js';

const FUNNEL_MS = 360_000;

describe('upt ground', () => {
  it('shows a candidate grounding ledger with the honest ceiling, exit 0', async () => {
    const r = await runText(['ground', 'landauer-erasure-energy', 'dark-fermion-mass']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/mechanism-tested false · data-tested false/);
    expect(r.text).toMatch(/mechanism-tested/);
  }, FUNNEL_MS);

  it('a non-candidate pair of held names is a computed absence: exit 0, and says it is in none of the three graphs', async () => {
    // Tom's review of #502: a name no graph holds is exit 1; a pair every graph holds that
    // no funnel pairs is an answer, under the rule `search` with no match follows.
    const r = await runText(['ground', 'mass', 'mass']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/in any of catalog, canonical, both/);
  }, FUNNEL_MS);

  it('needs two names → exit 2', async () => {
    expect((await runText(['ground', 'mass'])).code).toBe(2);
  });

  // Audit F04 (2026-09-26): canonical/combined `discover` pairs could not be grounded, and
  // the refusal implied the pair never existed.
  describe('graph scope (audit F04)', () => {
    it('grounds a canonical discover pair with --source=canonical and prints the source', async () => {
      const r = await runText(['ground', '--source=canonical', 'compton-wavelength', 'hubble-distance']);
      expect(r.code).toBe(0);
      expect(r.text).toMatch(/\[source: canonical/);
      expect(r.text).toMatch(/compton-wavelength ≟ hubble-distance/);
    }, FUNNEL_MS);

    it('a pair from another scope names the scope that has it (exit 0: an answer, not an error)', async () => {
      const r = await runText(['ground', 'compton-wavelength', 'hubble-distance']);
      expect(r.code).toBe(0);
      expect(r.text).toMatch(/not a candidate in the catalog graph/);
      expect(r.text).toMatch(/upt ground --source=canonical compton-wavelength hubble-distance/);
    }, FUNNEL_MS);

    it('help documents --source and the discover options', async () => {
      const r = await runText(['help', 'ground']);
      expect(r.code).toBe(0);
      expect(r.text).toMatch(/--source=catalog\|canonical\|both/);
      expect(r.text).toMatch(/--anchor/);
    });

    it("--anchor is accepted with discover's validation", async () => {
      const r = await runText(['ground', '--anchor=mass', 'a', 'b']);
      expect(r.code).toBe(2);
      expect(r.text).toMatch(/--anchor expects k=v/);
    });

    it('every canonical discover candidate can be grounded with the same source', async () => {
      const cands = (await json(['discover', '--source=canonical'])).result as { a: string; b: string }[];
      expect(cands.length).toBeGreaterThan(0);
      for (const { a, b } of cands.slice(0, 5)) {
        expect((await run(['ground', '--source=canonical', a, b])).code, `${a} ≟ ${b}`).toBe(0);
      }
    }, FUNNEL_MS);
  });

  // Audit I3: the funnel `ground` re-ran names its source and its anchor, default and overridden.
  describe('source and anchor (audit I3)', () => {
    it('ground prints the source and anchor of the funnel it re-ran', async () => {
      const pair = (await json(['discover'])).result[0] as { a: string; b: string };
      const r = await run(['ground', pair.a, pair.b]);
      expect(r.code, r.stderr).toBe(0);
      expect(r.stdout).toMatch(/\[source: catalog \(/);
      expect(r.stdout).toMatch(/anchor: mass=[0-9.e+]+ \(the default/);
      const j = await json(['ground', pair.a, pair.b, '--anchor=mass=2e30']);
      expect(j.source).toBe('catalog');
      expect(j.anchor.groundTruth).toEqual({ values: { mass: 2e30 }, isDefault: false });
    }, FUNNEL_MS);
  });
});

it('vets only the requested candidate and does no vetting to answer a miss', async () => {
  const [candidate] = cliApi.proposeLinkCandidates(cliApi.CATALOG_GRAPH);
  expect(candidate).toBeDefined();
  const vetLinkCandidate = vi.fn(cliApi.vetLinkCandidate);
  const rankDiscoveries = vi.fn(() => {
    throw new Error('ground must not rank unrelated candidates');
  });
  const api = { ...cliApi, vetLinkCandidate, rankDiscoveries };
  const invoke = (positionals: string[]) => resolveCommand('ground')!.run({
    api,
    args: { flags: new Map(), positionals } as CommandCtx['args'],
    out: () => {},
    err: () => {},
    write: () => {},
  });
  expect(await invoke(['temperature', 'mass'])).toBe(0);
  expect(vetLinkCandidate).not.toHaveBeenCalled();
  expect(await invoke([candidate!.b, candidate!.a])).toBe(0);
  expect(vetLinkCandidate).toHaveBeenCalledExactlyOnceWith(cliApi.CATALOG_GRAPH, candidate, { includeSubstitutions: true });
  expect(rankDiscoveries).not.toHaveBeenCalled();
});

it('reports a representative downstream refusal with the catalog condition', async () => {
  const report = await json([
    'ground', '--source=both', 'barrier-width', 'compton-wavelength',
  ]);
  expect(report.result.substitutions).toEqual(expect.arrayContaining([
    expect.objectContaining({
      edgeId: 'be-26-wkb',
      from: 'compton-wavelength',
      to: 'barrier-width',
      status: 'refused',
      reason: expect.stringContaining('100'),
      baselineInput: expect.objectContaining({ value: 1e-10, unit: 'm' }),
    }),
  ]));
  const text = await runText(['ground', '--source=both', 'barrier-width', 'compton-wavelength']);
  expect(text.code).toBe(0);
  expect(text.text).toMatch(/substitution compton-wavelength → barrier-width via be-26-wkb .*refused/);
}, FUNNEL_MS);

it('includes substitution evidence in discovery JSON only when requested', async () => {
  const regular = await json(['discover', '--source=both']);
  const detailed = await json(['discover', '--source=both', '--substitutions']);
  const findWidth = (report: typeof regular) => (report.result as {
    a: string;
    b: string;
    verdict: string;
    substitutions?: unknown;
  }[]).find((row) => row.a === 'barrier-width' && row.b === 'compton-wavelength');
  const baseline = findWidth(regular);
  const withEvidence = findWidth(detailed);
  expect(baseline).toBeDefined();
  expect(baseline?.substitutions).toBeUndefined();
  expect(withEvidence?.verdict).toBe(baseline?.verdict);
  expect(withEvidence?.substitutions).toEqual(expect.arrayContaining([
    expect.objectContaining({ edgeId: 'be-26-wkb', status: 'refused' }),
  ]));
}, FUNNEL_MS);
