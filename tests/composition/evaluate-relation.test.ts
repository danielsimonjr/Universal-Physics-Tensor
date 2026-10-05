/**
 * `evaluateRelation` is the public evaluation. The closed form stays the
 * numeric body. An unset coefficient is a result, not a monomial times 1.
 */
import { describe, expect, it } from 'vitest';
import { CarrierSignError } from '../../src/bridges/carrier-sign.js';
import { K_B_SI } from '../../src/core/constants.js';
import {
  CoefficientUnsetError,
  evaluateRelation,
  type Evaluation,
} from '../../src/index.js';
import { CANONICAL_GRAPH, be16Edge, be42Edge, be70Edge, evaluateEdge } from '../../src/composition/index.js';
import { M_SUN_KG } from '../../src/composition/edges/calibration.js';

const mu = 0.14;
const T = 300;
const q = 1.602176634e-19;

function valueOf(result: Evaluation): number {
  expect(result.kind).toBe('value');
  if (result.kind !== 'value') throw new Error('unset');
  return result.value;
}

describe('evaluateRelation', () => {
  it('matches the Einstein edge on an alias key and on the quantity names', () => {
    const expected = (mu * K_B_SI * T) / q;
    const byAlias = evaluateRelation('be-70', { mu_m2_per_Vs: mu, T_K: T, q_C: q });
    const byName = evaluateRelation('be-70', {
      'electrical-mobility': mu,
      'einstein-temperature': T,
      'carrier-charge': q,
    });
    expect(byAlias).toEqual({ kind: 'value', value: expected, dimension: be70Edge.target.dim });
    expect(valueOf(byName)).toBe(expected);
    expect(evaluateEdge(be70Edge, { mu_m2_per_Vs: mu, T_K: T, q_C: q })).toBe(expected);
    expect(() => evaluateRelation('be-70', { mu_m2_per_Vs: mu, T_K: T, q_C: -q })).toThrow(CarrierSignError);
  });

  it('evaluates be-16 and be-42 by id', () => {
    const landauer = evaluateRelation('be-16', { temperature: T });
    expect(valueOf(landauer) / (K_B_SI * T * Math.LN2)).toBeCloseTo(1, 12);
    expect(landauer.kind === 'value' && landauer.dimension).toEqual(be16Edge.target.dim);
    expect(valueOf(evaluateRelation(16, { temperature_K: T }))).toBe(valueOf(landauer));

    const hawking = evaluateRelation('be-42', { mass: M_SUN_KG });
    expect(valueOf(hawking)).toBeGreaterThan(0);
    expect(valueOf(evaluateRelation(42, { M_kg: M_SUN_KG }))).toBe(valueOf(hawking));
    expect(hawking.kind === 'value' && hawking.dimension).toEqual(be42Edge.target.dim);
  });

  it('records an unset coefficient and still throws it from evaluateEdge', () => {
    const sound = CANONICAL_GRAPH.find((edge) => edge.id === 'CE-sound-speed');
    expect(sound).toBeDefined();
    const bare = evaluateRelation('CE-sound-speed', { pressure: 1e5, density: 1.2 });
    expect(bare.kind).toBe('unset');
    if (bare.kind === 'unset') expect(bare.formula.length).toBeGreaterThan(0);
    expect(() => evaluateEdge(sound!, { pressure: 1e5, density: 1.2 })).toThrow(CoefficientUnsetError);
    expect(() => evaluateEdge(sound!, { pressure: 1e5, density: 1.2 })).not.toThrow(/dimension/);
    const bound = evaluateRelation('CE-sound-speed', { pressure: 1e5, density: 1.2, gamma: 1.4 });
    expect(valueOf(bound)).toBeCloseTo(Math.sqrt(1.4 * 1e5 / 1.2), 8);
  });

  it('an unknown id throws', () => {
    expect(() => evaluateRelation('be-9999', {})).toThrow(/unknown id/);
  });
});
