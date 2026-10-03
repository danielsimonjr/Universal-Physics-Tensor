/**
 * BE-68 Tolman–Ehrenfest. The catalog form is T √(−g_00). Dropping the
 * minus makes the square root NaN. A constant temperature is not the
 * invariant when g_00 changes.
 * @module tests/bridges/be-68-tolman-ehrenfest
 */
import { describe, expect, it } from 'vitest';
import {
  evaluateTolmanEhrenfest,
  tolmanTemperatureAt,
} from '../../src/bridges/be68-tolman-ehrenfest.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { be68Edge } from '../../src/composition/edges/applied-physicist.js';
import { regimesDiffer } from '../../src/composition/quantity.js';
import { QUANTITY_IDENTIFICATIONS } from '../../src/composition/compose.js';

describe('BE-68 Tolman–Ehrenfest', () => {
  it('evaluates T √(−g_00); √(g_00) is NaN when g_00 is negative', () => {
    const g = -0.81;
    const row = evaluateTolmanEhrenfest({ T_K: 300, g_00: g });
    expect(row.invariant_K).toBeCloseTo(300 * Math.sqrt(-g), 10);
    expect(Number.isNaN(Math.sqrt(g))).toBe(true);
    expect(row.invariant_K).not.toBeNaN();
    expect(() => evaluateTolmanEhrenfest({ T_K: 300, g_00: -g })).toThrow(/g_00/);
    expect(() => evaluateTolmanEhrenfest({ T_K: 0, g_00: g })).toThrow(/T_K/);
  });

  it('a constant temperature is not the invariant when g_00 changes', () => {
    const deep = evaluateTolmanEhrenfest({ T_K: 300, g_00: -0.81 });
    const shallow = evaluateTolmanEhrenfest({ T_K: 300, g_00: -0.25 });
    expect(shallow.invariant_K).not.toBeCloseTo(deep.invariant_K, 6);
    const moved = tolmanTemperatureAt(deep.invariant_K, -0.25);
    expect(moved).toBeCloseTo(deep.invariant_K / 0.5, 10);
    expect(moved).not.toBeCloseTo(300, 4);
  });

  it('does not identify the proper temperature with hawking-temperature or temperature', () => {
    const names = QUANTITY_IDENTIFICATIONS.map((row) => `${row.from}->${row.to}`);
    expect(names).not.toContain('proper-temperature->temperature');
    expect(names).not.toContain('hawking-temperature->proper-temperature');
    expect(names).not.toContain('tolman-invariant->temperature');
  });

  it('catalog row is established, the edge is a law, and confidence stays established', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 68)!;
    expect(entry.status).toBe('established');
    expect(entry.category).toBe('I');
    expect(entry.bridges).toEqual(['gravitation', 'thermodynamics']);
    expect(entry.dimensional_signature).toBe('[temperature]');
    expect(entry.dependencies).toEqual([]);
    expect(entry.counterexamples ?? []).toEqual([]);
    expect(catalogFormalRef(68)?.statement).toBe('PhysJS.TolmanEhrenfest.hydrostatic_constant');
    expect(catalogFormalRef(68)?.kind).toBe('bridge');
    expect(be68Edge.kind).toBe('law');
    expect(be68Edge.confidence).toBe('established');
    expect(be68Edge.symbolic).toBeDefined();
    expect(regimesDiffer(be68Edge.sources[0].attributes, be68Edge.target.attributes)).toBe(false);
    expect(be68Edge.sources.map((q) => q.name)).toEqual(['proper-temperature', 'metric-g00']);
    expect(be68Edge.target.name).toBe('tolman-invariant');
  });
});
