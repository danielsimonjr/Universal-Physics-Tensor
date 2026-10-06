/**
 * Regime join gate.
 *
 * The two catalog joins on `mass` are domain mismatches. A confirmation
 * is not blocked. Silence on a facet is not a mismatch. Scale fires only
 * when both ports state it. A π-regime fires only when `regimeOverlap`
 * returns `disjoint`.
 *
 * Control: the catalog test failed, before this gate, because those two
 * ids were still stubs.
 */

import { describe, expect, it } from 'vitest';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { runChainPipeline } from '../../src/atlas/chain-pipeline.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { joinRegimeMismatch } from '../../src/composition/chain-regime.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import type { RegimeAttributes } from '../../src/composition/quantity.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { ACCELERATION, DIMENSIONLESS, ENERGY, LENGTH, MASS, TEMPERATURE, TIME } from '../../src/dimensional/types.js';
import type { Dimension } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import type { Regime } from '../../src/relations/types.js';

function q(name: string, dim: Dimension, attributes: RegimeAttributes = {}): Quantity {
  return { name, symbol: name, dim, attributes };
}

function edge(
  id: string,
  sources: readonly Quantity[],
  target: Quantity,
  symbolic: ExprNode,
  extra: { beId?: number | null; regime?: Regime } = {},
): BridgeEdge {
  return {
    id,
    beId: extra.beId === undefined ? null : extra.beId,
    kind: 'bridge',
    label: id,
    sources,
    target,
    confidence: 'established',
    domain: { description: 'any', predicate: () => true },
    citation: 'fixture',
    evaluate: (inputs) => {
      const first = sources[0];
      return first === undefined ? 0 : (inputs[first.name] ?? 0);
    },
    symbolic,
    ...(extra.regime === undefined ? {} : { regime: extra.regime }),
  };
}

function onGroup(op: Regime['inequalities'][number]['op'], bound: number): Regime {
  return {
    family: 'fixture',
    inequalities: [{ group: 'x', op, bound }],
    groupDefinitions: {},
  };
}

const mass = q('mass', MASS);
const identity = sym('mass', MASS);

describe('joinRegimeMismatch', () => {
  const be63 = CATALOG_GRAPH.find((candidate) => candidate.id === 'be-63');
  const be12 = CATALOG_GRAPH.find((candidate) => candidate.id === 'be-12');
  const be37 = CATALOG_GRAPH.find((candidate) => candidate.id === 'be-37');
  if (be63 === undefined || be12 === undefined || be37 === undefined) {
    throw new Error('catalog graph is missing a join edge');
  }

  it('rejects the two mass joins on domain and nothing else', () => {
    expect(joinRegimeMismatch(be63, be12)).toEqual({
      kind: 'rejected: regime mismatch',
      edgeIds: ['be-63', 'be-12'],
      quantity: 'mass',
      reasons: ['domain: information-geometry ≠ quantum-classical'],
    });
    expect(joinRegimeMismatch(be63, be37)).toEqual({
      kind: 'rejected: regime mismatch',
      edgeIds: ['be-63', 'be-37'],
      quantity: 'mass',
      reasons: ['domain: information-geometry ≠ field-unification'],
    });
  });

  it('does not file an edge by its id string', () => {
    const producer = edge('be-63', [q('omega', DIMENSIONLESS)], mass, identity);
    const consumer = edge('be-12', [mass], q('wavelength', LENGTH), sym('mass', MASS));
    expect(producer.beId).toBeNull();
    expect(joinRegimeMismatch(producer, consumer)).toBeUndefined();
  });

  it('abstains when one domain is missing or unassigned', () => {
    const filed = edge('be-63', [q('omega', DIMENSIONLESS)], mass, identity, { beId: 63 });
    const law = edge('law', [mass], q('wavelength', LENGTH), sym('mass', MASS));
    const unassigned = edge('be-45', [mass], q('wavelength', LENGTH), sym('mass', MASS), {
      beId: 45,
    });
    expect(joinRegimeMismatch(filed, law)).toBeUndefined();
    expect(joinRegimeMismatch(filed, unassigned)).toBeUndefined();
  });

  it('rejects a scale clash and abstains when one port is silent', () => {
    const producer = edge(
      'be-21',
      [q('rod', LENGTH)],
      q('span', LENGTH, { scale: 'quantum' }),
      sym('rod', LENGTH),
    );
    const clashing = edge(
      'be-27',
      [q('span', LENGTH, { scale: 'classical' })],
      q('period', TIME),
      sym('span', LENGTH),
    );
    const silent = edge(
      'be-27',
      [q('span', LENGTH)],
      q('period', TIME),
      sym('span', LENGTH),
    );
    expect(joinRegimeMismatch(producer, clashing)?.reasons).toEqual(['scale: quantum ≠ classical']);
    expect(joinRegimeMismatch(producer, silent)).toBeUndefined();
  });

  it('rejects disjoint π-regimes and admits an overlap or a one-sided regime', () => {
    const low = edge('be-21', [q('rod', LENGTH)], q('span', LENGTH), sym('rod', LENGTH), {
      regime: onGroup('<=', 0),
    });
    const high = edge('be-27', [q('span', LENGTH)], q('period', TIME), sym('span', LENGTH), {
      regime: onGroup('>=', 1),
    });
    const wide = edge('be-27', [q('span', LENGTH)], q('period', TIME), sym('span', LENGTH), {
      regime: onGroup('>=', 0),
    });
    const bare = edge('be-27', [q('span', LENGTH)], q('period', TIME), sym('span', LENGTH));
    expect(joinRegimeMismatch(low, high)?.reasons).toEqual(['regime: disjoint']);
    expect(joinRegimeMismatch(low, wide)).toBeUndefined();
    expect(joinRegimeMismatch(low, bare)).toBeUndefined();
  });

  it('compares the identified consumer port and records the producer name', () => {
    const producer = edge(
      'be-21',
      [q('mass', MASS)],
      q('hawking-temperature', TEMPERATURE, { scale: 'cosmological' }),
      sym('mass', MASS),
    );
    const consumer = edge(
      'be-27',
      [q('temperature', TEMPERATURE, { scale: 'classical' })],
      q('period', TIME),
      sym('temperature', TEMPERATURE),
    );
    expect(joinRegimeMismatch(producer, consumer)).toEqual({
      kind: 'rejected: regime mismatch',
      edgeIds: ['be-21', 'be-27'],
      quantity: 'hawking-temperature',
      reasons: ['scale: cosmological ≠ classical'],
    });
  });
});

const rhs12 = BRIDGE_RHS_BY_ID.get(12);
if (rhs12 === undefined) throw new Error('catalog 12 has no right-hand side');
const rhs16 = BRIDGE_RHS_BY_ID.get(16);
if (rhs16 === undefined) throw new Error('catalog 16 has no right-hand side');

describe('runChainPipeline regime gate', () => {
  it('does not block a confirmation whose domains differ', () => {
    const producer = edge('be-55', [q('particle-mass', MASS)], q('mass', MASS), sym('mass', MASS), {
      beId: 63,
    });
    const consumer = edge('be-12', [q('mass', MASS)], q('wavelength', LENGTH), rhs12, { beId: 12 });
    expect(joinRegimeMismatch(producer, consumer)?.reasons).toEqual([
      'domain: information-geometry ≠ quantum-classical',
    ]);
    expect(runChainPipeline([producer, consumer])).toEqual([
      { kind: 'confirmation', catalogId: 12, edgeIds: ['be-55', 'be-12'] },
    ]);
  });

  it('does not block a restatement whose domains differ', () => {
    const producer = edge('be-21', [q('seed', TEMPERATURE)], q('temperature', TEMPERATURE), sym('temperature', TEMPERATURE), {
      beId: 63,
    });
    const consumer = edge('be-27', [q('temperature', TEMPERATURE)], q('erasure-energy', ENERGY), rhs16, {
      beId: 12,
    });
    expect(joinRegimeMismatch(producer, consumer)?.kind).toBe('rejected: regime mismatch');
    expect(runChainPipeline([producer, consumer])).toEqual([
      {
        kind: 'restatement',
        canonicalId: 'CE-landauer',
        restatesBridge: '16',
        edgeIds: ['be-21', 'be-27'],
      },
    ]);
  });

  it('admits a same-component pair as a stub', () => {
    const producer = edge('be-55', [q('rod', LENGTH)], q('span', LENGTH), sym('rod', LENGTH), {
      beId: 55,
    });
    const consumer = edge(
      'be-59',
      [q('span', LENGTH), q('gravity', ACCELERATION)],
      q('period', TIME),
      {
        kind: 'op',
        op: '^',
        args: [
          {
            kind: 'op',
            op: '/',
            args: [sym('span', LENGTH), sym('gravity', ACCELERATION)],
          },
          sym('0.5', DIMENSIONLESS),
        ],
      },
      { beId: 59 },
    );
    const results = runChainPipeline([producer, consumer]);
    expect(results.map((row) => row.kind)).toEqual(['stub']);
    expect(results[0]?.edgeIds).toEqual(['be-55', 'be-59']);
  });

  it('records a scale clash from the pipeline and does not emit a stub', () => {
    const producer = edge(
      'be-21',
      [q('rod', LENGTH)],
      q('span', LENGTH, { scale: 'quantum' }),
      sym('rod', LENGTH),
    );
    const consumer = edge(
      'be-27',
      [q('span', LENGTH, { scale: 'classical' }), q('gravity', ACCELERATION)],
      q('period', TIME),
      {
        kind: 'op',
        op: '^',
        args: [
          {
            kind: 'op',
            op: '/',
            args: [sym('span', LENGTH), sym('gravity', ACCELERATION)],
          },
          sym('0.5', DIMENSIONLESS),
        ],
      },
    );
    const results = runChainPipeline([producer, consumer]);
    expect(results).toEqual([
      {
        kind: 'rejected: regime mismatch',
        edgeIds: ['be-21', 'be-27'],
        quantity: 'span',
        reasons: ['scale: quantum ≠ classical'],
      },
    ]);
  });
});
