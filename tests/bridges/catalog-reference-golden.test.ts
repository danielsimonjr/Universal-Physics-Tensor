/**
 * Every catalog reference is the value the engine returns at those inputs.
 *
 * The 126 numeric master goldens were copied onto the relation as `reference`. Which rows land
 * bitwise and which land a unit or two in the last place away depends on the host's
 * floating-point library: the set was once measured on one platform and typed in as a list of
 * thirteen ids said to be "one unit in the last place" off, and on Linux x86-64 three of them
 * (be-74, be-120, be-164) are TWO units off. So the rule is the assertion, not a list: every row
 * is within two ulp of its reference, and a failure names the rows and both values. Two ulp is
 * the measured maximum across the two hosts, not a widened physics tolerance (it is below the
 * relative 1e-15 the old test also required). be-142's snapshot golden was null, so its
 * reference is not a master before-value.
 */
import { describe, expect, it } from 'vitest';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { catalogEdge } from '../../src/composition/catalog-graph.js';
import { evaluateEdge } from '../../src/composition/edge.js';

/** The spacing of doubles at `x`: the smallest step to the next representable value. */
function ulp(x: number): number {
  if (x === 0) return Number.MIN_VALUE;
  const exponent = Math.floor(Math.log2(Math.abs(x)));
  return 2 ** (exponent - 52);
}

describe('catalog reference goldens', () => {
  const relations = catalogRelations().filter((relation) => relation.reference !== undefined);

  it('there is a reference on every relation', () => {
    expect(relations.length).toBe(catalogRelations().length);
    expect(relations.length).toBe(158);
  });

  const MAX_ULP = 2;

  it('evaluateEdge matches each stored reference to within two units in the last place', () => {
    const beyond: string[] = [];
    for (const relation of relations) {
      const reference = relation.reference!;
      const value = evaluateEdge(catalogEdge(relation.id), { ...reference.inputs });
      if (Math.abs(value - reference.value) > MAX_ULP * ulp(reference.value)) {
        beyond.push(`${relation.id}: ${value} vs ${reference.value}`);
      }
    }
    expect(beyond).toEqual([]);
  });

  it('control: the ulp rule separates two steps from three, and is the spacing of doubles', () => {
    const x = 4.107369998431901e-24;
    const two = x + 2 * ulp(x);
    expect(two).not.toBe(x);
    expect(Math.abs(two - x)).toBeLessThanOrEqual(MAX_ULP * ulp(x));
    expect(Math.abs(two + ulp(x) - x)).toBeGreaterThan(MAX_ULP * ulp(x));
    expect(ulp(1)).toBe(Number.EPSILON);
    expect(x + ulp(x) / 2).toBe(x); // half a step rounds back: ulp is the spacing, not less
  });

  it('be-12 at mass 1 and temperature 300 is the stored thermal wavelength', () => {
    const relation = relations.find((row) => row.id === 'be-12')!;
    expect(relation.reference!.value).toBe(4.107369998431901e-24);
    expect(evaluateEdge(catalogEdge('be-12'), { ...relation.reference!.inputs })).toBe(4.107369998431901e-24);
  });

  it('a changed input does not match the stored reference', () => {
    const relation = relations.find((row) => row.id === 'be-12')!;
    const reference = relation.reference!;
    const shifted = { ...reference.inputs, temperature: reference.inputs.temperature + 1 };
    const value = evaluateEdge(catalogEdge('be-12'), shifted);
    expect(value).not.toBe(reference.value);
    const rel = Math.abs(value - reference.value) / Math.abs(reference.value);
    expect(rel).toBeGreaterThan(1e-3);
  });
});
