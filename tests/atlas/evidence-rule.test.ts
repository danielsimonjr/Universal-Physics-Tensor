/**
 * Atlas Phase 0 S0.6 — the evidence-tag rule, enforced.
 *
 * Design note §7: a tag is carried on a record ONLY if the witness that
 * supports it passes in that record's own test file. A tag with no witness is
 * theatre, and so is a witness id that no test ever names.
 *
 * Two things make this gate real rather than decorative:
 *
 * 1. **Whole-word matching.** `W1` must NOT be satisfied by a title that says
 *    `W1a`. A substring match would make the gate pass vacuously, which is
 *    worse than having no gate at all. The controls at the bottom of this file
 *    prove the matcher rejects both a substring hit and a fabricated id.
 * 2. **The title scan covers `describe`, `it` and `test`.** The S0.6 brief
 *    said `it`/`test` only; measured against the landed W1/W2 suites, the
 *    witness ids live predominantly in `describe` titles (`describe('W7b — …')`),
 *    so an `it`-only scan would have failed every witness for a reason that
 *    has nothing to do with evidence. The rule enforced is the brief's intent:
 *    the witness id is NAMED in a test title in the file the witness claims.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { AtlasBridge, AtlasRejection, Witness } from '../../src/atlas/types.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence } from '../../src/atlas/derive-evidence.js';
import { artifactPassingWitnessIds, type WitnessResultsArtifact } from '../../src/atlas/witness-artifact.js';

/** The committed witness results: which witnesses pass is decided here, not on a record. */
const witnessResults = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../data/atlas/witness-results.json'), 'utf-8'),
) as WitnessResultsArtifact;

/** The closed list of Phase 0 witness ids (design note §6). */
const KNOWN_WITNESSES: readonly string[] = [
  'W1',
  'W1a',
  'W1b',
  'W2',
  'W2b',
  'W3',
  'W3b',
  'W4',
  'W5',
  'W6',
  'W7',
  'W7b',
  'W7c',
  'W8',
  'W8b',
  'W9',
  'W9b',
  // Phase 4 S4.3 — CAS checks of the spring ↔ circuit dictionary, run into
  // data/atlas/witness-results.json and named in tests/atlas/witness-results.test.ts.
  'W1s',
  'W2s',
  // Phase 4 S4.4 — the diffusion family (tests/atlas/diffusion.test.ts) and its
  // CAS witness (tests/atlas/witness-results.test.ts).
  'WD1',
  'WD1b',
  'WD2',
  'WD2s',
  'WD3',
  'WD3b',
  // Phase 4 S4.5 — the wave family (tests/atlas/waves.test.ts).
  'WS1',
  'WS2',
  'WS3',
  'WS3b',
  'WS4',
  'WS4b',
  // Sprint 4 closure (tests/atlas/closure.test.ts; WD5s in witness-results.test.ts).
  'WD4',
  'WD4b',
  'WD5',
  'WD5s',
  'WD6',
  'WD6b',
  'WD7',
  'WD8',
  'WS5',
  'WS5b',
  'WS6',
  'WS7',
  'WS7b',
];

const here = dirname(fileURLToPath(import.meta.url));
const testsDir = resolve(here);
const repoRoot = resolve(here, '../..');

/** Every `describe`/`it`/`test` title in every tests/atlas/*.test.ts, by repo-relative path. */
const TITLES: ReadonlyMap<string, readonly string[]> = (() => {
  const titleRe = /\b(?:describe|it|test)\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  const map = new Map<string, string[]>();
  for (const file of readdirSync(testsDir).filter((f) => f.endsWith('.test.ts'))) {
    const source = readFileSync(resolve(testsDir, file), 'utf-8');
    const titles: string[] = [];
    for (const m of source.matchAll(titleRe)) titles.push(m[2] as string);
    map.set(`tests/atlas/${file}`, titles);
  }
  return map;
})();

/** Whole word, not substring: `W1` never matches inside `W1a`. */
const namedInTitle = (id: string, title: string): boolean =>
  new RegExp(`\\b${id}\\b`).test(title);

const witnessNamedIn = (w: Witness): boolean =>
  (TITLES.get(w.test.replace(/\\/g, '/')) ?? []).some((t) => namedInTitle(w.id, t));

// EVERY registered family, not one by name: a gate that named the oscillator
// family would pass forever over a family it never read.
const bridges: readonly AtlasBridge[] = ATLAS_FAMILIES.flatMap((f) => f.bridges);
const rejections: readonly AtlasRejection[] = ATLAS_FAMILIES.flatMap((f) => f.rejections);
const records: ReadonlyArray<{ id: string; witnesses: readonly Witness[] }> = [
  ...bridges,
  ...rejections,
];

describe('evidence-rule — the scan is not vacuous', () => {
  it('parsed titles out of every tests/atlas test file', () => {
    expect(TITLES.size).toBeGreaterThan(5);
    for (const [file, titles] of TITLES) {
      expect(titles.length, `${file} yielded no test titles`).toBeGreaterThan(0);
    }
  });

  it('found bridges and rejections to check', () => {
    expect(bridges.length).toBeGreaterThan(0);
    expect(rejections.length).toBeGreaterThan(0);
    expect(records.every((r) => r.witnesses.length > 0)).toBe(true);
  });
});

describe('evidence-rule — every derived tag is witness-backed, and no record stores one', () => {
  const derived = (b: AtlasBridge): ReadonlySet<string> => deriveEvidence(b, artifactPassingWitnessIds(witnessResults, b.id));

  it('no record carries an evidence field: the set is derived, never stored', () => {
    for (const b of bridges) expect(Object.hasOwn(b, 'evidence'), b.id).toBe(false);
  });

  it('every bridge deriving a witness-governed tag has that witness in the closed list and checked in the artifact', () => {
    const offenders: string[] = [];
    for (const b of bridges) {
      const tags = derived(b);
      const governed = [...tags].filter((t) => t === 'numerically-supported' || t === 'symbolically-checked');
      if (governed.length === 0) continue;
      const checked = [...artifactPassingWitnessIds(witnessResults, b.id)];
      const backed = checked.some((id) => KNOWN_WITNESSES.includes(id) && b.witnesses.some((w) => w.id === id));
      if (!backed) offenders.push(`${b.id}: derived [${governed.join(', ')}] with no checked witness from the closed list`);
    }
    expect(offenders).toEqual([]);
  });

  it('the rule is not vacuous: every bridge derives a witness-governed tag, and stripping the artifact removes them all', () => {
    const withTags = bridges.filter((b) => [...derived(b)].some((t) => t === 'numerically-supported' || t === 'symbolically-checked'));
    expect(withTags.length).toBeGreaterThan(0);
    const empty: WitnessResultsArtifact = { schemaVersion: '0', results: [] };
    for (const b of bridges) {
      const tags = deriveEvidence(b, artifactPassingWitnessIds(empty, b.id));
      expect(tags.has('numerically-supported'), b.id).toBe(false);
      expect(tags.has('symbolically-checked'), b.id).toBe(false);
    }
  });
});

describe('evidence-rule — every witness id is known and named by a test', () => {
  it('uses only ids from the closed list', () => {
    const unknown: string[] = [];
    for (const r of records) {
      for (const w of r.witnesses) {
        if (!KNOWN_WITNESSES.includes(w.id)) unknown.push(`${r.id} → ${w.id}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('names its test file among tests/atlas/*.test.ts', () => {
    const missing: string[] = [];
    for (const r of records) {
      for (const w of r.witnesses) {
        if (!TITLES.has(w.test.replace(/\\/g, '/'))) missing.push(`${r.id} → ${w.id}: ${w.test}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('appears AS A WHOLE WORD in a test title of the file it names', () => {
    const unnamed: string[] = [];
    for (const r of records) {
      for (const w of r.witnesses) {
        if (!witnessNamedIn(w)) unnamed.push(`${r.id} → ${w.id} not named in ${w.test}`);
      }
    }
    expect(unnamed).toEqual([]);
  });

  it('names every counterexample witness too', () => {
    const unnamed: string[] = [];
    for (const b of bridges) {
      for (const c of b.counterexamples) {
        expect(KNOWN_WITNESSES).toContain(c.witness);
        const anywhere = [...TITLES.values()]
          .flat()
          .some((t) => namedInTitle(c.witness, t));
        if (!anywhere) unnamed.push(`${b.id} counterexample → ${c.witness}`);
      }
    }
    expect(unnamed).toEqual([]);
  });
});

describe('evidence-rule — CONTROLS: the gate can fail', () => {
  it('rejects a substring hit: W1 is not satisfied by a title that says W1a', () => {
    expect(namedInTitle('W1', 'W1a — spring and LC trajectories coincide')).toBe(false);
    expect(namedInTitle('W1', 'W1 — ab-spring-lc nondimensionalizes exactly')).toBe(true);
    expect(namedInTitle('W7', 'W7b: the approximation is NON-UNIFORM in time')).toBe(false);
    expect(namedInTitle('W8', 'W8b: the lost initial condition')).toBe(false);
  });

  it('rejects a fabricated witness id that no title names', () => {
    const fake: Witness = {
      id: 'W42',
      kind: 'numeric',
      test: 'tests/atlas/oscillators-exact.test.ts',
    };
    expect(KNOWN_WITNESSES).not.toContain(fake.id);
    expect(witnessNamedIn(fake)).toBe(false);
  });

  it('rejects a real id pointed at the wrong file', () => {
    const misfiled: Witness = {
      id: 'W9',
      kind: 'numeric',
      test: 'tests/atlas/oscillators-exact.test.ts',
    };
    expect(witnessNamedIn(misfiled)).toBe(false);
  });

  it('the repo root resolves (the scan is reading this tree, not a phantom)', () => {
    expect(readdirSync(repoRoot)).toContain('package.json');
  });
});
