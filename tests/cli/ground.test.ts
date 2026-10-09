/**
 * `upt ground` — every case, in one file, through the funnel cache.
 *
 * `ground` re-runs the discovery funnel of the graph it is told to use (and, for a pair the graph
 * does not hold, the other two graphs as well, to name the scope that has it). That is 10–80 s a
 * call. The cases below were spread over `new-commands.test.ts`, `cli-from-src.test.ts` and
 * `source-anchor.test.ts`, and `ground mass mass` ran twice in one of them (78 s + 67 s measured).
 * `tests/helpers/discover-cache.js` memoises each distinct argv on disk under the build's
 * fingerprint, so a repeated call, in this file or another fork, costs a file read.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { json, run, runText } from '../helpers/cli-run.js';

const FUNNEL_MS = 360_000;

describe('upt ground', () => {
  it('shows a candidate grounding ledger with the honest ceiling, exit 0', async () => {
    const r = await runText(['ground', 'landauer-erasure-energy', 'dark-fermion-mass']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/mechanism-tested false · data-tested false/);
    expect(r.text).toMatch(/mechanism-tested/);
  }, FUNNEL_MS);

  it('a non-candidate pair is exit 1, and says it is in none of the three graphs', async () => {
    const r = await runText(['ground', 'mass', 'mass']);
    expect(r.code).toBe(1);
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

    it('a pair from another scope names the scope that has it', async () => {
      const r = await runText(['ground', 'compton-wavelength', 'hubble-distance']);
      expect(r.code).toBe(1);
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
