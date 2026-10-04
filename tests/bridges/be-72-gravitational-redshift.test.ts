/**
 * BE-72 gravitational frequency ratio. A non-negative metric component is refused.
 * The ports are not the Tolman ports.
 * @module tests/bridges/be-72-gravitational-redshift
 */
import { describe, expect, it } from 'vitest';
import { evaluateGravitationalRedshift } from '../../src/bridges/be72-gravitational-redshift.js';
import { evaluateTolmanEhrenfest } from '../../src/bridges/be68-tolman-ehrenfest.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { be72Edge } from '../../src/composition/edges/applied-physicist.js';

describe('BE-72 gravitational redshift', () => {
  it('is √(g2/g1) for two negative components', () => {
    const row = evaluateGravitationalRedshift({ g1: -1, g2: -4 });
    expect(row.frequency_ratio).toBe(2);
    const deep = evaluateTolmanEhrenfest({ T_K: 1, g_00: -4 }).invariant_K;
    const shallow = evaluateTolmanEhrenfest({ T_K: 1, g_00: -1 }).invariant_K;
    expect(deep).not.toBe(shallow);
    expect(deep / shallow).toBe(row.frequency_ratio);
  });

  it('rejects a non-negative component', () => {
    expect(() => evaluateGravitationalRedshift({ g1: -1, g2: 4 })).toThrow(/g2/);
    expect(() => evaluateGravitationalRedshift({ g1: 0, g2: -1 })).toThrow(/g1/);
  });

  it('the formalRef is frequency_ratio, and the ports are not Tolman quantities', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 72)!;
    expect(entry.bridges).toEqual(['gravitation', 'radiation']);
    expect(catalogFormalRef(72)?.statement).toBe('PhysJS.GravitationalRedshift.frequency_ratio');
    const names = [be72Edge.target.name, ...be72Edge.sources.map((source) => source.name)];
    expect(names).not.toContain('metric-g00');
    expect(names).not.toContain('proper-temperature');
    expect(names).not.toContain('tolman-invariant');
  });
});
