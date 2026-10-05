/**
 * `registerBridge` is the only builder of a catalog id.
 *
 * A fixture appears in the four projections. An `ab-*` id is rejected.
 * The production singleton is not used here: a later registration would
 * not update an already-exported snapshot.
 */
import { describe, expect, it } from 'vitest';
import { createBridgeRegistry } from '../../src/bridges/registry.js';

describe('registerBridge', () => {
  it('puts one registration in the four projections and rejects an atlas id', () => {
    const registry = createBridgeRegistry();
    const entry = { id: 9001, name: 'fixture' };
    const rhs = { kind: 'symbol' as const, name: 'x', dim: { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } };
    const evaluator = { bridgeId: 9001, name: 'fixture' };
    const edge = { id: 'be-9001', beId: 9001 as number | null };
    registry.register({ entry, rhs, evaluator, edge });
    expect(registry.equations()).toEqual([entry]);
    expect(registry.rhs().get(9001)).toBe(rhs);
    expect(registry.evaluators().get(9001)).toBe(evaluator);
    expect(registry.edges()).toEqual([edge]);
    expect(() => registry.register({ id: 'ab-foo' })).toThrow(/rejects atlas id 'ab-foo'/);
    expect(Object.keys(registry).sort()).toEqual(['edges', 'equations', 'evaluators', 'register', 'rhs']);
  });
});
