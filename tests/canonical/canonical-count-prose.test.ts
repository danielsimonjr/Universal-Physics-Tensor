/**
 * The stated canonical-entry count must equal the REGISTRY, not a literal.
 *
 * Sprint 3 adds L1 entries, which moves this number. The Sprint 3 plan states that the count
 * "lives only in `CHANGELOG.md`, `ROADMAP.md`, and the architecture docs" — three locations.
 * MEASURED 2026-09-22: the literal appears in **22 files**, and the live product docs the plan
 * did NOT name include `README.md`, `todo.md`, `docs/specification/Part-V.md` and three files
 * under `docs/research/`. So adding an entry would leave at least seven live prose statements
 * stale while every test still passed.
 *
 * THAT IS THE THIRD TIME IN THIS REPO that a number restated in several places was accompanied by
 * an INCOMPLETE list of the places — the CLI command count was in four locations, two of which
 * disagreed with each other by four (see `tests/cli/command-count-prose.test.ts`). The recurring
 * defect is not the stale number; it is trusting a hand-maintained list of where a number lives.
 *
 * So this test does not hardcode a list of files. It DISCOVERS every product doc stating the
 * count and asserts each against `CANONICAL_EQUATIONS.length`. A file added later is covered
 * without anyone remembering to add it here, which is the property the hand-maintained list
 * lacked.
 *
 * Deliberately NOT covered: `CHANGELOG.md` and `docs/architecture/archive/` are HISTORY. A release
 * note recording "103 canonical equations" at v0.40.0 stays true forever and must not be rewritten
 * when the registry grows. The same applies to dated audit findings under `docs/planning/`, which
 * record what was measured at the time.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** History and dated findings: a count recorded there is a fact about the past, not a claim now. */
const HISTORY = [
  `CHANGELOG.md`,
  join('docs', 'architecture', 'archive') + sep,
  join('docs', 'planning', 'v0.3.0-audit') + sep,
  join('docs', 'planning', 'v0.6.0-Review-Findings.md'),
  join('docs', 'superpowers') + sep,
];

/**
 * Scratch directories that are not product documentation. Every dot-directory is skipped as well:
 * `.claude/worktrees/` holds other checkouts of this repository, whose CHANGELOG this walker once
 * read as product prose (2026-10-09), and `.git`, `.remember`, `.superpowers` are the same kind.
 */
const NOT_PRODUCT = ['node_modules', 'dist', 'coverage'];

function markdownFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (NOT_PRODUCT.includes(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) markdownFiles(full, acc);
    else if (name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

/**
 * A prose statement OF THE CANONICAL COUNT, as opposed to the digits appearing for another reason
 * (a page number, a physical constant such as the `101:103502` in a DOI, a year).
 *
 * The phrasings are drawn from how the repo actually writes it. A file that states the count in
 * some NEW phrasing is not caught — see the vacuity guard below, which is what stops that gap from
 * silently emptying this test.
 */
const statesCount = (n: number): RegExp[] => [
  new RegExp(`\\b${n} canonical (?:equations?|entries|entry)\\b`, 'i'),
  new RegExp(`\\bcanonical (?:equations?|entries)[^.\\n]{0,24}\\b${n}\\b`, 'i'),
  new RegExp(`\\b${n}-entry\\b`, 'i'),
  new RegExp(`\\b${n} \`law\` edges\\b`, 'i'),
];

describe('the stated canonical-entry count matches the registry', () => {
  const measured = CANONICAL_EQUATIONS.length;

  it('the registry is non-trivial (guards every assertion below from passing vacuously)', () => {
    expect(measured).toBeGreaterThan(50);
  });

  it('no product doc states a canonical count OTHER than the registry length', () => {
    const offenders: string[] = [];

    for (const file of markdownFiles(repoRoot)) {
      const rel = relative(repoRoot, file);
      if (HISTORY.some((h) => (h.endsWith(sep) ? rel.startsWith(h) : rel === h))) continue;

      const text = readFileSync(file, 'utf8');
      // Any count within a plausible band that is NOT the measured one is drift.
      for (let n = measured - 12; n <= measured + 12; n++) {
        if (n === measured || n < 1) continue;
        for (const re of statesCount(n)) {
          const m = re.exec(text);
          if (m) offenders.push(`${rel}: "${m[0]}" (registry says ${measured})`);
        }
      }
    }

    expect(offenders, `stale canonical counts:\n${offenders.join('\n')}`).toEqual([]);
  });

  /**
   * VACUITY GUARD. The test above passes trivially if the patterns match nothing at all — the
   * exact shape this repo has produced four times (a filter that could not match anything, read as
   * a clean result). So assert the patterns DO fire on the live docs.
   */
  it('POSITIVE CONTROL: the patterns actually match the real count in real files', () => {
    const hits: string[] = [];
    for (const file of markdownFiles(repoRoot)) {
      const rel = relative(repoRoot, file);
      if (HISTORY.some((h) => (h.endsWith(sep) ? rel.startsWith(h) : rel === h))) continue;
      const text = readFileSync(file, 'utf8');
      if (statesCount(measured).some((re) => re.test(text))) hits.push(rel);
    }
    // If this ever drops to zero the test above has stopped checking anything, whatever it reports.
    expect(hits.length, 'no product doc states the count — the matcher has gone blind').toBeGreaterThan(3);
  });

  /**
   * NEGATIVE CONTROL: prove the matcher is sensitive to the number, not merely to the words. A
   * pattern that matched any count would report clean forever.
   */
  it('NEGATIVE CONTROL: a wrong figure in the same phrasing IS detected', () => {
    const wrong = `${measured + 1} canonical equations`;
    expect(statesCount(measured + 1).some((re) => re.test(wrong))).toBe(true);
    expect(statesCount(measured).some((re) => re.test(wrong))).toBe(false);
  });
});
