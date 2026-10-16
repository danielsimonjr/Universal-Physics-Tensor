/**
 * `upt discover` and `upt ground` on the Hubble rows, once the Hubble distance has a magnitude
 * (option 2 of the owner's decision of 2026-10-16, "Both": the sourced table row, and the
 * own-equation mechanism that `tests/composition/discovery-own-equation.test.ts` tests with the
 * row removed). The rows are magnitude clashes, `--json` carries `magnitudeDerived`, and the
 * proposals they used to derive are gone from `--derive`.
 *
 * In-process against `dist/cli/main.js`; the funnel runs are shared through
 * `tests/helpers/discover-cache.js`.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { json, runText } from '../helpers/cli-run.js';

const FUNNEL_MS = 360_000;

/** The lines of the printed MAGNITUDE-CLASH list. */
function clashLines(text: string): string[] {
  const at = text.indexOf('\n  MAGNITUDE-CLASH');
  if (at < 0) return [];
  const body = text.slice(at + 1);
  const end = body.indexOf('\n\n');
  return body.slice(0, end < 0 ? undefined : end).split('\n').slice(1);
}

describe('upt discover --source=canonical: the Hubble rows are magnitude clashes', () => {
  it('the clash list names them with their orders, and says which value is anchor-derived', async () => {
    const { code, text } = await runText(['discover', '--source=canonical']);
    expect(code).toBe(0);
    const lines = clashLines(text);
    const line = (pair: string): string => {
      const hit = lines.find((l) => l.trim().startsWith(pair + ' '));
      if (hit === undefined) throw new Error(`no clash line for ${pair}`);
      return hit;
    };
    expect(line('hubble-distance ≟ bohr-radius')).toMatch(/~36\.4 orders apart/);
    expect(line('compton-wavelength ≟ hubble-distance')).toMatch(/~37\.7 orders apart/);
    expect(line('hubble-distance ≟ peak-wavelength')).toMatch(/~21\.5 orders apart.*\(anchor-derived\)/);
    // the table states the Hubble distance, so no clash line says "from its own equation"
    expect(lines.join('\n')).not.toMatch(/from its own equation/);
  }, FUNNEL_MS);

  it('--json carries magnitudeDerived on every row, and the Hubble rows are clashes', async () => {
    const rows = (await json(['discover', '--source=canonical'])).result as {
      a: string;
      b: string;
      verdict: string;
      magnitudeDerived?: string[];
      magnitudeChecked: boolean;
      magnitudeMissing?: string[];
    }[];
    for (const r of rows) expect(r.magnitudeDerived, `${r.a} ≟ ${r.b}`).toEqual([]);
    const hubble = rows.filter((r) => r.a === 'hubble-distance' || r.b === 'hubble-distance');
    expect(hubble.filter((r) => r.verdict === 'magnitude-clash').length).toBe(7);
    for (const r of hubble) {
      // the Hubble distance always has a magnitude now; a row the gate did not run on is missing
      // the other endpoint's (thermal-wavelength: its canonical coefficient is unset)
      expect(r.magnitudeMissing ?? [], `${r.a} ≟ ${r.b}`).not.toContain('hubble-distance');
      if (r.magnitudeChecked) expect(r.verdict, `${r.a} ≟ ${r.b}`).toBe('magnitude-clash');
    }
  }, FUNNEL_MS);

  it('--derive no longer lists the four Hubble proposals', async () => {
    const { code, text } = await runText(['discover', '--source=canonical', '--derive']);
    expect(code).toBe(0);
    for (const id of [
      'IC-bohr-radius--hubble-distance--hubble-rate',
      'IC-classical-electron-radius--hubble-distance--hubble-rate',
      'IC-compton-wavelength-full--hubble-distance--hubble-rate',
      'IC-hubble-distance--peak-wavelength--temperature',
    ]) {
      expect(text, id).not.toContain(id);
    }
    expect(text).toContain('IC-erasure-energy--photon-energy--nu');
  }, FUNNEL_MS);
});

describe('upt ground on a Hubble row', () => {
  it('is a magnitude clash, and --json carries magnitudeDerived', async () => {
    const { code, text } = await runText(['ground', '--source=canonical', 'hubble-distance', 'bohr-radius']);
    expect(code).toBe(0);
    expect(text).toMatch(/hubble-distance ≟ bohr-radius {2}\[magnitude-clash\]/);
    const env = await json(['ground', '--source=canonical', 'hubble-distance', 'bohr-radius']);
    expect(env.result.verdict).toBe('magnitude-clash');
    expect(env.result.magnitudeDerived).toEqual([]);
  }, FUNNEL_MS);
});
