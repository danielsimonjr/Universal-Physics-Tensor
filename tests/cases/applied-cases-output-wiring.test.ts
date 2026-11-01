/**
 * Part B step B12: every catalog output is wired as expr, relation, or a known method.
 */
import { describe, expect, it } from 'vitest';
import { appliedCaseCatalog, catalogSemanticProblems } from '../../src/cases/catalog.js';
import { CASE_METHOD_NAMES } from '../../src/cases/methods.js';

describe('applied-cases catalog output wiring (B12)', () => {
  it('requires each output to have exactly one of expr, relation, or method', () => {
    expect(catalogSemanticProblems(appliedCaseCatalog(), CASE_METHOD_NAMES)).toEqual([]);
  });

  it('control: an output with no wiring is refused', () => {
    const file = structuredClone(appliedCaseCatalog());
    const row = file.cases.find((c) => c.id === 'case-resistor-noise')!;
    delete (row.outputs[0] as { method?: string }).method;
    expect(catalogSemanticProblems(file, CASE_METHOD_NAMES)).toContainEqual(
      expect.stringMatching(/must have exactly one of expr, relation, method/),
    );
  });
});
