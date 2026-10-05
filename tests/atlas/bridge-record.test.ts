/**
 * `getBridge` reads the registration, the canonical foreign key, and the
 * generated formal reference. It does not keep a second catalog.
 */
import { describe, expect, it } from 'vitest';
import { getBridge } from '../../src/atlas/bridge-record.js';

describe('getBridge', () => {
  it('joins Landauer to CE-landauer and the generated reference', () => {
    const record = getBridge(16);
    expect(record.entry.id).toBe(16);
    expect(record.canonicalId).toBe('CE-landauer');
    expect(record.formalRef?.kind).toBe('bridge');
    expect(record.rhs).toBeDefined();
  });

  it('reads BE-103 from the registration and has no canonical foreign key', () => {
    const record = getBridge('BE-103');
    expect(record.entry.name).toMatch(/Bohm/);
    expect(record.canonicalId).toBeUndefined();
    expect(record.formalRef?.kind).toBe('bridge');
    expect(record.formalRef?.statement).toBe('PhysJS.BohmSheath.cold_bohm_threshold');
    expect(record.evaluator?.bridgeId).toBe(103);
    expect(record.edges.map((edge) => edge.id)).toEqual(['be-103']);
    expect(record.rhs).toBeUndefined();
  });
});
