/**
 * S5 of the optimization plan: the three whole-case runners
 * `runCaseSkinDepth`, `runCaseKeplerRv` and `runCaseDampedResonator` are
 * deleted. `data/applied-cases.json` wires those cases' outputs through
 * `expr`, `relation` and named methods — never through a `runCase*` runner —
 * so the three records run through `runAppliedCaseEngine` on the wired-output
 * rule alone and `buildAppliedCase` never selects a legacy runner. The
 * runners, their `RUN_BY_ID` entries and their `CASE_METHODS` /
 * `CASE_METHOD_NAMES` rows are deleted with them.
 *
 * The data assertion and the wired-output assertions are the positive
 * evidence; the `CASE_METHOD_NAMES` assertion is the one that failed on the
 * unchanged tree (the set still listed the three names), which is the RED
 * state recorded in the pull request.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appliedCaseRecord } from '../../src/cases/catalog.js';
import { CASE_METHOD_NAMES } from '../../src/cases/methods.js';

const DEAD_RUNNERS = ['runCaseSkinDepth', 'runCaseKeplerRv', 'runCaseDampedResonator'] as const;
const DEAD_CASE_IDS = ['case-skin-depth', 'case-kepler-rv', 'case-damped-resonator'] as const;

describe('dead case runners are gone', () => {
  it('data/applied-cases.json never names a deleted runner', () => {
    const text = readFileSync(new URL('../../data/applied-cases.json', import.meta.url), 'utf8');
    for (const name of DEAD_RUNNERS) expect(text).not.toContain(name);
  });

  it('CASE_METHOD_NAMES does not list the deleted runners', () => {
    for (const name of DEAD_RUNNERS) expect([...CASE_METHOD_NAMES]).not.toContain(name);
  });

  it('every one of the three cases is catalog-engine driven without the ENGINE_CASE_IDS shortcut', () => {
    for (const id of DEAD_CASE_IDS) {
      const record = appliedCaseRecord(id);
      expect(record.outputs.every((o) => o.expr !== undefined || o.relation !== undefined || o.method !== undefined)).toBe(true);
    }
  });

  it('CONTROL: the CASE_METHOD_NAMES pin would catch a reinstated runner name', () => {
    // A set doctored as if a runner row came back: the pin's own assertion
    // must FAIL on it, proving the matcher fires rather than passing vacuously.
    const reinstated = new Set([...CASE_METHOD_NAMES, 'runCaseSkinDepth']);
    expect(() => expect([...reinstated]).not.toContain('runCaseSkinDepth')).toThrow(
      /to not include 'runCaseSkinDepth'/,
    );
  });
});
