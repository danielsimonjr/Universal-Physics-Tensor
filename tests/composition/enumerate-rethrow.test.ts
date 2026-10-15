/**
 * `enumerateCompositions` once caught EVERY error from `composeEdges` and from
 * `composeSymbolic` and filed the pair as a silent non-pair (a dimension or
 * junction failure, or a pair that is not substitutable). An instrument
 * failure, a `TypeError` from a malformed edge, a `RangeError` from a broken
 * evaluator, was filed the same way, so a defect in the composer read as "no
 * composition here". Only the composition's own refusal classes are a
 * non-pair; anything else is rethrown.
 */
import { describe, expect, it } from 'vitest';
import { enumerateCompositionsWithRefusals } from '../../src/composition/enumerate.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import type { QuantityIdentification } from '../../src/composition/compose.js';
import { validityDomain } from '../../src/composition/edge.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';

const L: Dimension = { ...DIMENSIONLESS, L: 1 };
const T: Dimension = { ...DIMENSIONLESS, T: 1 };
const V: Dimension = { ...DIMENSIONLESS, L: 1, T: -1 };
const F: Dimension = { ...DIMENSIONLESS, M: 1, L: 1, T: -2 };
const E: Dimension = { ...DIMENSIONLESS, M: 1, L: 2, T: -2 };

const q = (name: string, dim: Dimension): Quantity => ({ name, symbol: name, dim, attributes: {} });
const sym = (name: string, dim: Dimension): ExprNode => ({ kind: 'symbol', name, dim });

/** `x = v · t` then `E = F · x`: the pair composes on the junction `length`, forward only. */
const xFromVT: BridgeEdge = {
  id: 'law-x',
  beId: null,
  kind: 'law',
  label: 'x = v t',
  sources: [q('speed', V), q('time', T)],
  target: q('length', L),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: (i) => i['speed']! * i['time']!,
  symbolic: { kind: 'op', op: '*', args: [sym('speed', V), sym('time', T)] },
  citation: 'synthetic',
};
const eFromFX: BridgeEdge = {
  id: 'law-e',
  beId: null,
  kind: 'law',
  label: 'E = F x',
  sources: [q('force', F), q('length', L)],
  target: q('energy', E),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: (i) => i['force']! * i['length']!,
  symbolic: { kind: 'op', op: '*', args: [sym('force', F), sym('length', L)] },
  citation: 'synthetic',
};

describe('enumerateCompositions rethrows what is not a composition refusal', () => {
  it('control: the clean pair composes forward, with no refusal and no throw; the reverse pair has no junction and is a silent non-pair', () => {
    const { report, relationRefusals } = enumerateCompositionsWithRefusals([xFromVT, eFromFX], {
      seedIds: new Set(['law-x', 'law-e']),
    });
    expect(report.all.map((c) => c.edge.id)).toEqual(['law-x>>law-e']);
    expect(relationRefusals).toEqual([]);
    expect(report.notSubstitutable).toEqual([]);
    expect(report.proofTargets.map((t) => `${t.first.id}>>${t.second.id}`)).toEqual(['law-x>>law-e']);
  });

  it('control: a shared source name is the alias refusal, not an error', () => {
    const shared: BridgeEdge = { ...eFromFX, id: 'law-s', sources: [q('time', T), q('length', L)] };
    const { report } = enumerateCompositionsWithRefusals([xFromVT, shared]);
    expect(report.all).toEqual([]);
    expect(report.requiresDisposition.map((d) => d.composedId)).toEqual(['law-x>>law-s']);
  });

  it('a composer failure that is not a refusal class (a broken edge) is rethrown from the composeEdges site', () => {
    const broken = new Proxy(eFromFX, {
      get(target, key, receiver) {
        if (key === 'sources') throw new RangeError('instrument broke: sources unreadable');
        return Reflect.get(target, key, receiver);
      },
    });
    expect(() => enumerateCompositionsWithRefusals([xFromVT, broken])).toThrow(RangeError);
  });

  it('a composer failure that is not a refusal class is rethrown from the composeSymbolic site', () => {
    // `composeEdges` and `composeSymbolic` each spread `opts.identifications` once per call, in the
    // order the enumerator makes them: composeEdges(x, e), composeSymbolic(x, e), composeEdges(e, x).
    // An iterable that breaks on its second iteration breaks inside the composeSymbolic call,
    // after composeEdges accepted the pair.
    let iterations = 0;
    const identifications = {
      *[Symbol.iterator](): Generator<QuantityIdentification> {
        iterations += 1;
        if (iterations === 2) throw new RangeError('instrument broke: identifications unreadable');
      },
    } as unknown as readonly QuantityIdentification[];
    expect(() =>
      enumerateCompositionsWithRefusals([xFromVT, eFromFX], {
        seedIds: new Set(['law-x', 'law-e']),
        identifications,
      }),
    ).toThrow(RangeError);
    expect(iterations).toBe(2);
  });
});
