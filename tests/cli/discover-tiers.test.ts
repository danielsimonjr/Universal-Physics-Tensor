/**
 * `upt discover` reports the two promising tiers apart and never adds them (AGENTS law 4; the
 * owner's decision of 2026-10-16, option 1). `promising` is a structurally promising row the
 * magnitude falsifier ran on and could have failed; `promising-unchecked` is the same structure
 * with no magnitude evidence (the gate abstained, or its pass was anchor-invariant).
 *
 * In-process against `dist/cli/main.js`; the funnel runs are shared through
 * `tests/helpers/discover-cache.js`.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { json, runText } from '../helpers/cli-run.js';

type Row = {
  a: string;
  b: string;
  verdict: string;
  magnitudeChecked: boolean;
  magnitudeAnchorInvariant?: boolean;
  axisChecked: boolean;
  consequence?: { signal: string };
  grounding: { mechanismTested: boolean; dataTested: boolean };
  readiness: { falsifiers: { survived: string[] } };
};

const evidenced = (r: Row): boolean => r.magnitudeChecked && r.magnitudeAnchorInvariant !== true;

/** The rows of one printed section: from its heading to the next blank line. */
function section(text: string, heading: string): string[] {
  const at = text.indexOf(`\n  ${heading}`);
  if (at < 0) return [];
  const body = text.slice(at + 1);
  const end = body.indexOf('\n\n');
  return (body.slice(0, end < 0 ? undefined : end).match(/^ {4}\S+ ≟ \S+/gm) ?? []).map((s) => s.trim());
}

describe('upt discover: the funnel line, the readiness and the JSON report the two tiers apart', () => {
  for (const source of ['catalog', 'canonical'] as const) {
    it(`--source=${source}: the funnel line names both counts, each equal to its verdict count`, async () => {
      const env = await json(['discover', `--source=${source}`]);
      const rows = env.result as Row[];
      const c = rows.filter((r) => r.verdict === 'promising').length;
      const u = rows.filter((r) => r.verdict === 'promising-unchecked').length;
      expect(u).toBeGreaterThan(0);
      const { text } = await runText(['discover', `--source=${source}`]);
      expect(text).toContain(`→  ${c} promising  ·  ${u} promising, magnitude unchecked  ·  `);
      // Never the sum.
      expect(text).not.toContain(`→  ${c + u} promising  `);
      // The tiers are exactly the magnitude evidence of the row.
      for (const r of rows) {
        if (r.verdict === 'promising') expect(evidenced(r), `${r.a} ≟ ${r.b}`).toBe(true);
        if (r.verdict === 'promising-unchecked') expect(evidenced(r), `${r.a} ≟ ${r.b}`).toBe(false);
      }
    }, 300_000);

    it(`--source=${source}: readiness is per tier, in text and in JSON`, async () => {
      const env = await json(['discover', `--source=${source}`]);
      const rows = env.result as Row[];
      const readinessOf = (v: string) => {
        const p = rows.filter((r) => r.verdict === v);
        return {
          count: p.length,
          mechanismTested: p.filter((r) => r.grounding.mechanismTested).length,
          dataTested: p.filter((r) => r.grounding.dataTested).length,
          withoutMagnitudeEvidence: p.filter((r) => !evidenced(r)).length,
          axisUnresolved: p.filter((r) => !r.axisChecked).length,
          entailedConsequence: p.filter((r) => r.consequence?.signal === 'entailed').length,
        };
      };
      expect(env.readiness).toEqual({
        promising: readinessOf('promising'),
        promisingUnchecked: readinessOf('promising-unchecked'),
      });
      expect(env.readiness.promising.withoutMagnitudeEvidence).toBe(0);
      expect(env.readiness.promisingUnchecked.withoutMagnitudeEvidence).toBe(env.readiness.promisingUnchecked.count);
      const { text } = await runText(['discover', `--source=${source}`]);
      for (const [label, r] of [
        ['promising', env.readiness.promising],
        ['promising, magnitude unchecked', env.readiness.promisingUnchecked],
      ] as const) {
        expect(text).toContain(
          `readiness of the ${r.count} ${label}: ${r.mechanismTested} mechanism-tested · ${r.dataTested} data-tested · ` +
            `${r.withoutMagnitudeEvidence} without magnitude evidence · ${r.axisUnresolved} with axis unresolved · ` +
            `${r.entailedConsequence} with an entailed consequence`,
        );
      }
    }, 300_000);
  }
});

describe('upt discover: two sections, each listing only its own tier', () => {
  it('catalog: the magnitude-evidenced row is under PROMISING, and the anchor-invariant pass is not', async () => {
    const { text } = await runText(['discover', '--source=catalog']);
    const checked = section(text, 'PROMISING (');
    const unchecked = section(text, 'PROMISING, MAGNITUDE UNCHECKED (');
    expect(checked).toContain('landauer-erasure-energy ≟ barrier-height');
    // thermal-wavelength ≟ planck-length passes the gate only because the graph fixes the ratio.
    expect(checked).not.toContain('thermal-wavelength ≟ planck-length');
    expect(unchecked).toContain('thermal-wavelength ≟ planck-length');
    expect(unchecked).not.toContain('landauer-erasure-energy ≟ barrier-height');
  }, 300_000);

  it('canonical: no row has magnitude evidence, the PROMISING section says so, and the unchecked section lists them', async () => {
    const { text } = await runText(['discover', '--source=canonical']);
    expect(section(text, 'PROMISING (')).toEqual([]);
    expect(text).toContain('no candidate is `promising` (with magnitude evidence) from the anchor above.');
    const unchecked = section(text, 'PROMISING, MAGNITUDE UNCHECKED (');
    // hubble-distance ≟ bohr-radius was the example until the Hubble distance had a magnitude
    // (option 2 of the owner's decision of 2026-10-16): it is a magnitude clash now.
    expect(unchecked).not.toContain('hubble-distance ≟ bohr-radius');
    expect(unchecked).toContain('planck-mass ≟ molecular-mass');
    // The same per-row detail as the PROMISING section.
    const row = text.slice(text.indexOf('    planck-mass ≟ molecular-mass'));
    expect(row).toMatch(/^ {4}planck-mass ≟ molecular-mass .*\n {8}unlocks: /);
    expect(row).toMatch(/\[readiness — structure: merges components/);
  }, 300_000);

  it('--require-falsifier counts each tier apart', async () => {
    const env = await json(['discover', '--source=catalog']);
    const rows = env.result as Row[];
    const tier = (v: string) => rows.filter((r) => r.verdict === v);
    const hidden = (v: string) => tier(v).filter((r) => r.readiness.falsifiers.survived.length === 0).length;
    const { text } = await runText(['discover', '--source=catalog', '--require-falsifier']);
    expect(text).toContain(
      `--require-falsifier: ${hidden('promising')} of the ${tier('promising').length} promising and ` +
        `${hidden('promising-unchecked')} of the ${tier('promising-unchecked').length} promising, magnitude unchecked hidden`,
    );
  }, 300_000);
});

describe('upt discover --derive: a proposal says when its identification had no magnitude evidence', () => {
  it('text and JSON', async () => {
    const { text } = await runText(['discover', '--source=canonical', '--derive']);
    // The Hubble proposals are no longer derived (option 2, 2026-10-16); the Landauer photon is the example.
    expect(text).not.toContain('IC-bohr-radius--hubble-distance--hubble-rate');
    const block = text.slice(text.indexOf('  IC-erasure-energy--photon-energy--nu'));
    expect(block).toMatch(/from: erasure-energy ≟ photon-energy .*\n {6}magnitude: no evidence — the identification is promising, magnitude unchecked/);
    const env = await json(['discover', '--source=canonical', '--derive']);
    const p = (env.result as { id: string; derivedFrom: { identification: { magnitudeEvidence: boolean } } }[]).find(
      (x) => x.id === 'IC-erasure-energy--photon-energy--nu',
    );
    expect(p?.derivedFrom.identification.magnitudeEvidence).toBe(false);
  }, 300_000);
});

describe('upt map --proposed: the proposal list says when an identification had no magnitude evidence', () => {
  it('text and JSON', async () => {
    const { text } = await runText(['map', '--source=canonical', '--proposed']);
    expect(text).toMatch(
      /^ {5}IC-erasure-energy--photon-energy--nu: nu ← .*\(from an identification with no magnitude evidence\)$/m,
    );
    const env = await json(['map', '--source=canonical', '--proposed']);
    const p = (env.result.proposed as { id: string; magnitudeEvidence: boolean }[]).find(
      (x) => x.id === 'IC-erasure-energy--photon-energy--nu',
    );
    expect(p?.magnitudeEvidence).toBe(false);
  }, 300_000);
});
