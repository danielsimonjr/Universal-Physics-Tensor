/**
 * BE-26 reference point and opaque-barrier condition.
 *
 * The notes of row 26 bracket-check the WKB rate with a proton, a 0.4 eV
 * barrier and a 1 Å width. The stored reference used an electron, 1 eV and
 * 3 Å, where 2κL = 3.07: the barrier is not opaque, and the prefactor-1 WKB
 * form does not apply. The condition 2κL >= 10, written
 * 8 m (V−E) L² >= 100 ħ², now refuses that point, and the reference is the
 * point the notes name.
 */
import { describe, expect, it } from 'vitest';
import { primaryRelation } from '../../src/bridges/catalog-load.js';
import { DomainViolationError } from '../../src/bridges/evaluation-errors.js';
import { catalogEdge } from '../../src/composition/catalog-graph.js';
import { evaluateEdge } from '../../src/composition/edge.js';

const HBAR = 6.62607015e-34 / (2 * Math.PI);
const OPAQUE = '8*tunneling-mass*barrier-height*barrier-width*barrier-width >= 100*hbar*hbar';
const OLD_POINT = {
  'attempt-frequency': 1e13,
  'tunneling-mass': 9.1093837015e-31,
  'barrier-height': 1.602176634e-19,
  'barrier-width': 3e-10,
  'biological-rate-correction': 0.5,
};
const NEW_POINT = {
  'attempt-frequency': 1e13,
  'tunneling-mass': 1.67262192369e-27,
  'barrier-height': 6.408706536e-20,
  'barrier-width': 1e-10,
  'biological-rate-correction': 0.5,
};
const twoKappaL = (p: typeof NEW_POINT): number =>
  (2 * Math.sqrt(2 * p['tunneling-mass'] * p['barrier-height']) * p['barrier-width']) / HBAR;

describe('BE-26 reference point', () => {
  it('the old electron point is not an opaque barrier, and the relation refuses it', () => {
    expect(twoKappaL(OLD_POINT)).toBeLessThan(10);
    expect(() => evaluateEdge(catalogEdge('be-26'), { ...OLD_POINT })).toThrow(DomainViolationError);
  });

  it('the stored reference is the proton / 0.4 eV / 1 Å point of the notes', () => {
    const relation = primaryRelation(26)!;
    expect(relation.holds).toContain(OPAQUE);
    expect(relation.reference!.inputs).toEqual(NEW_POINT);
    expect(twoKappaL(NEW_POINT)).toBeGreaterThan(10);
    const value = evaluateEdge(catalogEdge('be-26'), { ...NEW_POINT });
    expect(value).toBe(relation.reference!.value);
    expect(Math.abs(value - 4.357625350016062) / 4.357625350016062).toBeLessThan(1e-12);
  });

  it('the value is ν₀ exp(−2κL) f, computed apart from the engine', () => {
    const expected = 1e13 * Math.exp(-twoKappaL(NEW_POINT)) * 0.5;
    const value = evaluateEdge(catalogEdge('be-26'), { ...NEW_POINT });
    expect(Math.abs(value - expected) / expected).toBeLessThan(1e-12);
  });
});
