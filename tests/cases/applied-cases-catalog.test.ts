/**
 * Part B catalog loader (plan MATHTS_UNITS_AND_CASES_PLAN.md §B1): the declarative
 * projection of every live case validates through readAppliedCaseFile; broken
 * copies are refused.
 */
import { describe, expect, it } from 'vitest';
import { APPLIED_CASES } from '../../src/cases/index.js';
import { CHECKS_BY_CASE_ID } from '../../src/cases/catalog-checks.js';
import {
  catalogSemanticProblems,
  projectAppliedCaseRecord,
  readAppliedCaseFile,
  appliedCaseCatalog,
  type AppliedCaseFile,
} from '../../src/cases/catalog.js';
import { CASE_METHOD_NAMES } from '../../src/cases/methods.js';
import { dataSchema } from '../../src/core/data-file.js';

const schema = dataSchema('applied-cases.json');

function projectionFile(): AppliedCaseFile {
  const cases = [...APPLIED_CASES.values()].map((c) => projectAppliedCaseRecord(c, CHECKS_BY_CASE_ID[c.id]!));
  return { schemaVersion: 1, cases };
}

describe('applied-cases catalog loader', () => {
  it('validates the in-memory projection of all six cases', () => {
    const text = `${JSON.stringify(projectionFile())}\n`;
    const loaded = readAppliedCaseFile(text, schema);
    expect(loaded.cases.map((c) => c.id).sort()).toEqual([...APPLIED_CASES.keys()].sort());
  });

  it('loads data/applied-cases.json matching the live cases\' declarative fields', () => {
    const text = `${JSON.stringify({ schemaVersion: 1, cases: appliedCaseCatalog().cases.map((row) => {
      const live = APPLIED_CASES.get(row.id)!;
      return projectAppliedCaseRecord(live, row.checks);
    }) })}\n`;
    readAppliedCaseFile(text, schema);
    for (const row of appliedCaseCatalog().cases) {
      const live = APPLIED_CASES.get(row.id)!;
      const projected = projectAppliedCaseRecord(live, row.checks);
      expect(row.parameters).toEqual(projected.parameters);
      expect(row.checks).toEqual(projected.checks);
      expect(row.examples).toEqual(projected.examples);
    }
  });

  it('refuses a duplicate id, an unknown op, and a check with no expr', () => {
    const base = projectionFile();
    expect(catalogSemanticProblems({ ...base, cases: [{ ...base.cases[0]!, id: '' }] })).toContainEqual(
      expect.stringMatching(/missing id/),
    );

    const dup = { ...structuredClone(base), cases: [base.cases[0]!, base.cases[0]!] };
    expect(() => readAppliedCaseFile(JSON.stringify(dup), schema)).toThrow(/duplicate id/);

    const badOp = structuredClone(base);
    (badOp.cases[0]!.checks[0] as { op: string }).op = '!=';
    expect(catalogSemanticProblems(badOp)).toContainEqual(expect.stringMatching(/unknown op/));

    const noExpr = structuredClone(base);
    (noExpr.cases[0]!.checks[0] as { expr: string }).expr = '   ';
    expect(catalogSemanticProblems(noExpr)).toContainEqual(expect.stringMatching(/has no expr/));
  });

  it('refuses malformed, non-numeric, whitespace, and unknown-key needs at catalog load', () => {
    const brownian = structuredClone(appliedCaseCatalog());
    const drift = brownian.cases.find((c) => c.id === 'case-brownian-sphere')!.checks.find((c) => c.id === 'drift') as {
      needs?: string[];
    };
    expect(drift.needs).toEqual(['d=3']);

    const cases: Array<{ needs: string[]; match: RegExp }> = [
      { needs: ['d=banana'], match: /needs 'd=banana' value is not a finite number/ },
      { needs: ['d='], match: /needs 'd=' has a malformed value/ },
      { needs: ['d==3'], match: /needs 'd==3' must contain exactly one '='/ },
      { needs: ['d = 2'], match: /needs 'd = 2' has a malformed key/ },
      { needs: ['foo=3'], match: /needs 'foo=3' names unknown parameter 'foo'/ },
      { needs: ['not_a_key'], match: /needs 'not_a_key' names unknown parameter 'not_a_key'/ },
    ];
    for (const { needs, match } of cases) {
      drift.needs = needs;
      expect(catalogSemanticProblems(brownian), needs.join()).toContainEqual(expect.stringMatching(match));
      expect(() => readAppliedCaseFile(JSON.stringify(brownian), schema)).toThrow(match);
    }

    drift.needs = ['d=3'];
    expect(catalogSemanticProblems(brownian).filter((m) => m.includes('needs'))).toEqual([]);
  });

  it('refuses a catalog regimeAt that names an unknown method', () => {
    const file = structuredClone(appliedCaseCatalog());
    const brownian = file.cases.find((c) => c.id === 'case-brownian-sphere')!;
    expect(brownian.regimeAt).toBe('brownianSphereRegimeAt');
    expect(catalogSemanticProblems(file, CASE_METHOD_NAMES)).toEqual([]);
    (brownian as { regimeAt: string }).regimeAt = 'notARegisteredMethod';
    expect(catalogSemanticProblems(file, CASE_METHOD_NAMES)).toContainEqual(
      expect.stringMatching(/regimeAt names unknown method 'notARegisteredMethod'/),
    );
  });

});
