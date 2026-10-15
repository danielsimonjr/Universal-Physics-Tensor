/**
 * Tests for `src/core/universal-index.ts` — v0.7-p1 Phase 1.
 *
 * Covers: `makeIndex` factory shape, fresh-UUID-per-call semantics,
 * branded-type rejection of plain strings, optional-field handling,
 * `AxisName` exhaustiveness.
 *
 * @module tests/core/universal-index
 */

import { describe, it, expect } from 'vitest';
import { makeIndex } from '../../src/core/universal-index.js';
import type {
  AxisName,
  UniversalIndex,
  UniversalIndexId,
} from '../../src/core/universal-index.js';

describe('makeIndex factory', () => {
  it('returns a UniversalIndex with the given axis and name', () => {
    const idx = makeIndex('scale', 'quantum');
    expect(idx.axis).toBe('scale');
    expect(idx.name).toBe('quantum');
  });

  it('generates a UUID-shaped id (8-4-4-4-12 hex pattern)', () => {
    const idx = makeIndex('force', 'gravitational');
    expect(idx.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('produces distinct ids on consecutive calls with the same axis/name', () => {
    const a = makeIndex('scale', 'quantum');
    const b = makeIndex('scale', 'quantum');
    expect(a.id).not.toBe(b.id);
  });

  it('propagates the axis discriminator through the generic parameter', () => {
    const scaleIdx: UniversalIndex<'scale'> = makeIndex('scale', 'classical');
    const forceIdx: UniversalIndex<'force'> = makeIndex('force', 'weak');
    // Compile-time: scaleIdx.axis is the literal 'scale', not the
    // wider AxisName union. The @ts-expect-error below proves it.
    expect(scaleIdx.axis).toBe('scale');
    expect(forceIdx.axis).toBe('force');

    // @ts-expect-error — assigning a 'force' index to a 'scale' slot.
    const wrong: UniversalIndex<'scale'> = forceIdx;
    void wrong;
  });

  it('passes through optional metadata (tags, limits, notes)', () => {
    const idx = makeIndex('information', 'shannon', {
      tags: ['entropy', 'classical'],
      limits: { min: 0, max: 1 },
      notes: 'normalized Shannon entropy',
    });
    expect(idx.tags).toEqual(['entropy', 'classical']);
    expect(idx.limits).toEqual({ min: 0, max: 1 });
    expect(idx.notes).toBe('normalized Shannon entropy');
  });

  it('omits optional fields when not provided', () => {
    const idx = makeIndex('symmetry', 'poincare');
    expect(idx.tags).toBeUndefined();
    expect(idx.limits).toBeUndefined();
    expect(idx.notes).toBeUndefined();
  });
});

describe('UniversalIndexId branding', () => {
  it('rejects plain strings at compile time', () => {
    // @ts-expect-error — plain string is not assignable to the branded id.
    const wrong: UniversalIndexId = 'not-a-uuid';
    void wrong;
    // The check is the @ts-expect-error above, which `typecheck:tests` fails when the
    // assignment compiles; no runtime assertion stands in for it (law 3).
  });

  it('accepts the id returned from makeIndex without further casting', () => {
    const idx = makeIndex('scale', 'cosmological');
    const id: UniversalIndexId = idx.id; // No cast needed.
    expect(typeof id).toBe('string');
  });
});

describe('AxisName union', () => {
  it('accepts each of the 6 namespace + integer-axis names', () => {
    const names: AxisName[] = [
      'scale', 'force', 'symmetry', 'information', 'dimension', 'topology',
    ];
    expect(names).toHaveLength(6);
  });

  it('rejects unknown axis names at compile time', () => {
    // @ts-expect-error — 'mass' is not a valid AxisName member.
    const wrong: AxisName = 'mass';
    void wrong;
  });
});
