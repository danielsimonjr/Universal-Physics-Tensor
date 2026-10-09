/**
 * Every catalog reference is the value the engine returns at its inputs, and
 * the reference point can tell a wrong exponent from the right one.
 *
 * A reference at all-ones inputs cannot: 1^k is 1 for every k, so a formula
 * with a wrong exponent on any input returns the same number. A reference
 * whose value is 0 cannot either, since the comparison rescales a zero. Before
 * 9.0.1, 63 references used all-ones inputs and 10 had value 0. Now every
 * input of every reference is off 0 and ±1, every value is finite and
 * nonzero, and the control below mutates one literal exponent of each
 * expression and shows the stored reference moves.
 *
 * `be-21` and `be-165` have no sources: their references are the constants
 * themselves, and the exponent rule has no input to apply to.
 */
import { describe, expect, it } from 'vitest';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { evaluateFormula } from '../../src/bridges/expr-parse.js';
import { catalogEdge } from '../../src/composition/catalog-graph.js';
import { evaluateEdge } from '../../src/composition/edge.js';

/** Ids whose vitest value is not bitwise identical to the stored reference (measured; none at 9.0.1). */
const OFF_BY_ONE_ULP: readonly string[] = [];

/** The first literal numeric exponent of an expression, as a regular-expression match. */
const EXPONENT = /\^(\d+(?:\.\d+)?)/;

describe('catalog reference goldens', () => {
  const relations = catalogRelations().filter((relation) => relation.reference !== undefined);

  it('there is a reference on every relation', () => {
    expect(relations.length).toBe(catalogRelations().length);
    expect(relations.length).toBe(158);
  });

  it('a relation with no sources is a constant; its reference has no inputs', () => {
    const constants = relations.filter((relation) => relation.sources.length === 0).map((relation) => relation.id);
    expect(constants).toEqual(['be-21', 'be-165']);
    for (const id of constants) expect(relations.find((r) => r.id === id)!.reference!.inputs).toEqual({});
  });

  it('every reference input is off 0 and ±1, so a wrong exponent on any input moves the value', () => {
    const trivial = relations
      .filter((relation) => relation.sources.length > 0)
      .flatMap((relation) =>
        Object.entries(relation.reference!.inputs)
          .filter(([, value]) => value === 0 || Math.abs(value) === 1)
          .map(([name, value]) => `${relation.id}: ${name} = ${value}`),
      );
    expect(trivial).toEqual([]);
  });

  it('every reference binds exactly the relation sources', () => {
    for (const relation of relations) {
      expect(Object.keys(relation.reference!.inputs).sort(), relation.id).toEqual([...relation.sources].sort());
    }
  });

  it('every reference value is finite and nonzero', () => {
    const zero = relations.filter((relation) => !Number.isFinite(relation.reference!.value) || relation.reference!.value === 0);
    expect(zero.map((relation) => relation.id)).toEqual([]);
  });

  it('evaluateEdge reproduces each stored reference, bitwise unless measured off by one ulp', () => {
    const off: string[] = [];
    for (const relation of relations) {
      const reference = relation.reference!;
      const value = evaluateEdge(catalogEdge(relation.id), { ...reference.inputs });
      if (value === reference.value) continue;
      const rel = Math.abs(value - reference.value) / Math.abs(reference.value);
      expect(rel, relation.id).toBeLessThan(1e-15);
      off.push(relation.id);
    }
    expect(off).toEqual([...OFF_BY_ONE_ULP]);
  });

  it('control: a wrong literal exponent is caught at the reference point', () => {
    // Positive control for the rule above: with one exponent raised by one, the
    // expression no longer reproduces the stored reference. On all-ones inputs
    // this control fails, which is what the rule exists to prevent.
    const blind: string[] = [];
    let controlled = 0;
    for (const relation of relations) {
      const match = EXPONENT.exec(relation.expression);
      if (match === null) continue;
      controlled += 1;
      const mutated = relation.expression.replace(EXPONENT, `^${Number(match[1]) + 1}`);
      const value = evaluateFormula(mutated, { ...relation.reference!.inputs }, relation.sources);
      const scale = Math.abs(relation.reference!.value);
      if (!(Math.abs(value - relation.reference!.value) > 1e-9 * scale)) blind.push(relation.id);
    }
    expect(controlled).toBeGreaterThanOrEqual(80);
    expect(blind).toEqual([]);
  });

  it('a changed input does not match the stored reference', () => {
    const relation = relations.find((row) => row.id === 'be-12')!;
    const reference = relation.reference!;
    const shifted = { ...reference.inputs, temperature: reference.inputs.temperature! + 1 };
    const value = evaluateEdge(catalogEdge('be-12'), shifted);
    expect(value).not.toBe(reference.value);
    const rel = Math.abs(value - reference.value) / Math.abs(reference.value);
    expect(rel).toBeGreaterThan(1e-3);
  });
});
