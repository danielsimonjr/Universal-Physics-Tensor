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

    const dup = structuredClone(base);
    dup.cases = [dup.cases[0]!, dup.cases[0]!];
    expect(() => readAppliedCaseFile(JSON.stringify(dup), schema)).toThrow(/duplicate id/);

    const badOp = structuredClone(base);
    (badOp.cases[0]!.checks[0] as { op: string }).op = '!=';
    expect(catalogSemanticProblems(badOp)).toContainEqual(expect.stringMatching(/unknown op/));

    const noExpr = structuredClone(base);
    (noExpr.cases[0]!.checks[0] as { expr: string }).expr = '   ';
    expect(catalogSemanticProblems(noExpr)).toContainEqual(expect.stringMatching(/has no expr/));
  });

});
