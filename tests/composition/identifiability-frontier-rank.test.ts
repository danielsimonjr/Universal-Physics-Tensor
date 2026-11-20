/**
 * The blocking frontier reads the graph with the same relation as the verdict (#704).
 *
 * The verdict counts a monomial law as a path in both directions (the rank). The frontier
 * once counted every law only from source to target, so a source-only target showed no
 * frontier although a reversed law would determine it.
 */
import { describe, expect, it } from 'vitest';
import { classifyIdentifiability } from '../../src/composition/identifiability.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import { validityDomain } from '../../src/composition/edge.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const q = (name: string): Quantity => ({ name, symbol: name, dim: DIMENSIONLESS, attributes: {} });
const sym = (name: string): ExprNode => ({ kind: 'symbol', name, dim: DIMENSIONLESS });

/** A monomial edge `target = source`, with its symbolic form. */
const monomial = (id: string, source: string, target: string): BridgeEdge => ({
  id,
  beId: null,
  kind: 'law',
  label: id,
  sources: [q(source)],
  target: q(target),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: (i) => i[source]!,
  symbolic: sym(source),
  citation: 'synthetic',
});

/** A numeric-only edge: no symbolic form, so the rank cannot read it. */
const opaque = (id: string, source: string, target: string): BridgeEdge => ({
  id,
  beId: null,
  kind: 'law',
  label: id,
  sources: [q(source)],
  target: q(target),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: () => 1,
  citation: 'synthetic',
});

const NO_IDENTS = { identifications: [] as const };

describe('blockingFrontier — the rank relation', () => {
  it('a source-only target sees the names its reversed monomial laws link to it', () => {
    const chain = [monomial('ab', 'a', 'b'), monomial('bc', 'b', 'c')];
    const r = classifyIdentifiability(chain, [], 'a', NO_IDENTS);
    expect(r.verdict).toBe('under-determined');
    expect(r.blockingFrontier).toEqual(['b', 'c']);
  });

  it('control: an opaque law is not read backwards, so the frontier stays empty', () => {
    const r = classifyIdentifiability([opaque('e', 'b', 't')], [], 'b', NO_IDENTS);
    expect(r.verdict).toBe('under-determined');
    expect(r.blockingFrontier).toEqual([]);
  });
});

describe('blockingFrontier — the identification relation', () => {
  it('a name that reaches the target only through an identification is on the frontier', () => {
    const r = classifyIdentifiability([opaque('xt', 'x', 't')], [], 't', {
      identifications: [{ from: 'y', to: 'x', rationale: 'synthetic' }],
    });
    expect(r.verdict).toBe('under-determined');
    expect(r.blockingFrontier).toEqual(['x', 'y']);
  });
});
