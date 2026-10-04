/**
 * BE-71 Clapeyron slope. Dropping T is a different slope.
 * The source is specific latent heat, not the energy node.
 * @module tests/bridges/be-71-clapeyron
 */
import { describe, expect, it } from 'vitest';
import { evaluateClapeyron } from '../../src/bridges/be71-clapeyron.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { be71Edge } from '../../src/composition/edges/applied-physicist.js';

describe('BE-71 Clapeyron slope', () => {
  it('is L/(T Δv), and dropping T is not that slope', () => {
    const L = 2.26e6;
    const T = 373.15;
    const dv = 1.672;
    const row = evaluateClapeyron({ L_J_per_kg: L, T_K: T, delta_v_m3_per_kg: dv });
    expect(row.slope_Pa_per_K).toBe(L / (T * dv));
    expect(L / dv).not.toBe(row.slope_Pa_per_K);
  });

  it('rejects a zero volume change', () => {
    expect(() => evaluateClapeyron({ L_J_per_kg: 1, T_K: 300, delta_v_m3_per_kg: 0 })).toThrow(/delta_v/);
  });

  it('the formalRef is slope_eq, and the source is not the energy latent-heat', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 71)!;
    expect(entry.bridges).toEqual(['thermodynamics', 'continuum']);
    expect(catalogFormalRef(71)?.statement).toBe('PhysJS.Clapeyron.slope_eq');
    expect(be71Edge.sources.map((source) => source.name)).toContain('specific-latent-heat');
    expect(be71Edge.sources.map((source) => source.name)).not.toContain('latent-heat');
  });
});
