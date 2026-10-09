/**
 * `attemptDerivation` samples a bridge's inputs to recover its monomial and
 * prefactor. A domain that holds only for a negative input (a signed charge,
 * a potential below zero) must still get samples: positives alone reported
 * `no-samples` for every sign-dependent domain (9.0.0 audit §4 Low).
 *
 * @module tests/composition/bridge-analysis
 */
import { describe, expect, it } from 'vitest';
import { attemptDerivation } from '../../src/composition/bridge-analysis.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { LENGTH } from '../../src/dimensional/types.js';

const q = (name: string): Quantity => ({ name, symbol: name, dim: LENGTH, attributes: {} });
const edge = (over: Partial<BridgeEdge>): BridgeEdge => ({
  id: 'signed',
  beId: null,
  kind: 'law',
  label: 'signed',
  sources: [q('x')],
  target: q('y'),
  confidence: 'established',
  domain: { description: 'x < 0', predicate: (i) => i['x']! < 0 },
  evaluate: (i) => -2 * i['x']!,
  citation: 'synthetic',
  ...over,
});

describe('attemptDerivation samples both signs where a domain needs it', () => {
  it('a domain that admits only x < 0 is sampled, not reported as no-samples', () => {
    const r = attemptDerivation(edge({}));
    expect(r.status).not.toBe('no-samples');
    expect(r.status).toBe('derived');
    expect(r.monomial).toEqual({ x: 1 });
    expect(r.prefactor).toBeCloseTo(-2, 12);
  });

  it('control: a domain that admits x > 0 still derives from the positive samples', () => {
    const r = attemptDerivation(edge({ domain: { description: 'x > 0', predicate: (i) => i['x']! > 0 }, evaluate: (i) => 2 * i['x']! }));
    expect(r.status).toBe('derived');
    expect(r.prefactor).toBeCloseTo(2, 12);
  });

  it('control: a domain no sign satisfies is still no-samples', () => {
    const r = attemptDerivation(edge({ domain: { description: 'never', predicate: () => false } }));
    expect(r.status).toBe('no-samples');
  });
});
