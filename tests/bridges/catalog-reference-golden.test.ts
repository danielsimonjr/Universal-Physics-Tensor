/**
 * Every catalog reference is the value the engine returns at those inputs.
 *
 * The 126 numeric master goldens were copied onto the relation as `reference`.
 * Under vitest, 114 of those are bitwise identical and 12 differ by one unit
 * in the last place (relative error below 1e-15). That is the measured
 * difference, not a widened physics tolerance. A thermal row (147–170) has no
 * master before-value; two of them, be-164 and be-165, sit in the same
 * one-ulp set. be-142's snapshot golden was null, so its reference is not a
 * master before-value.
 */
import { describe, expect, it } from 'vitest';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { catalogEdge } from '../../src/composition/catalog-graph.js';
import { evaluateEdge } from '../../src/composition/edge.js';

/** Ids whose vitest value is not bitwise identical to the stored reference. */
const ONE_ULP = [
  'be-14',
  'be-43',
  'be-56',
  'be-69',
  'be-74',
  'be-90',
  'be-94',
  'be-109',
  'be-115',
  'be-116',
  'be-117',
  'be-120',
  'be-164',
  'be-165',
] as const;

describe('catalog reference goldens', () => {
  const relations = catalogRelations().filter((relation) => relation.reference !== undefined);

  it('there is a reference on every relation', () => {
    expect(relations.length).toBe(catalogRelations().length);
    expect(relations.length).toBe(158);
  });

  it('evaluateEdge matches each stored reference, or misses by one unit in the last place', () => {
    const off: string[] = [];
    for (const relation of relations) {
      const reference = relation.reference!;
      const value = evaluateEdge(catalogEdge(relation.id), { ...reference.inputs });
      if (value === reference.value) continue;
      const scale = reference.value === 0 ? 1 : Math.abs(reference.value);
      const rel = Math.abs(value - reference.value) / scale;
      expect(rel, relation.id).toBeLessThan(1e-15);
      off.push(relation.id);
    }
    const byId = (id: string) => Number(id.slice(3));
    expect(off.sort((a, b) => byId(a) - byId(b))).toEqual([...ONE_ULP]);
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
