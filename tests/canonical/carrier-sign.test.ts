/**
 * A positive transport coefficient built from carrier charge and mobility
 * rejects opposite signs. The check is the monomial, not one equation id:
 * conductivity is `n q μ`, and a synthetic monomial with the same odd powers
 * throws the same way. Hall coefficient and cyclotron frequency stay signed.
 */
import { describe, expect, it } from 'vitest';
import { canonicalToEdges } from '../../src/composition/canonical-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { explainQuantity } from '../../src/composition/explain.js';
import type { CanonicalEquation } from '../../src/canonical/canonical-equation.js';
import { CHARGE } from '../../src/dimensional/types.js';
import { runCli } from '../../src/cli/main.js';

const N = 8.47e28;
const Q = 1.602176634e-19;
const MU = 0.003;
const M = 9.1093837015e-31;
const TAU = 2.5e-14;

const MOBILITY = { L: 0, M: -1, T: 2, I: 1, Theta: 0, N: 0, J: 0 };

function conductivityEdge() {
  const edge = CANONICAL_GRAPH.find((e) => e.id === 'CE-electrical-conductivity');
  if (edge === undefined) throw new Error('missing CE-electrical-conductivity');
  return edge;
}

const synthetic: CanonicalEquation = {
  id: 'CE-synthetic-carrier-product',
  name: 'Synthetic carrier product',
  domain: 'condensed-matter',
  formula_latex: 'y = q \\mu',
  epistemicStatus: 'fully-quantitative',
  freeDimensionlessGroups: 0,
  dimensional: {
    target: { name: 'synthetic-carrier-product', dim: CHARGE },
    governing: [
      { name: 'charge', dim: CHARGE },
      { name: 'carrier-mobility', dim: MOBILITY },
    ],
    monomial: { charge: 1, 'carrier-mobility': 1 },
  },
  regime: { scale: 'mesoscopic', force: 'electromagnetic' },
  assumptions: [],
  references: [],
  partnerBridges: [],
};

describe('carrier charge and mobility share a sign on a positive product', () => {
  it('rejects opposite signs on conductivity and on any odd product of the two', () => {
    const inputs = { 'carrier-density': N, charge: -Q, 'carrier-mobility': MU };
    expect(() => conductivityEdge().evaluate(inputs)).toThrow(/charge and carrier-mobility must have the same sign/);
    const syntheticEdge = canonicalToEdges([synthetic])[0]!;
    expect(() => syntheticEdge.evaluate({ charge: -Q, 'carrier-mobility': MU })).toThrow(
      /charge and carrier-mobility must have the same sign/,
    );
    expect(() =>
      explainQuantity(CANONICAL_GRAPH, 'electrical-conductivity', inputs),
    ).toThrow(/same sign/);
  });

  it('keeps a matching pair positive, and a zero mobility at zero', () => {
    const both = conductivityEdge().evaluate({
      'carrier-density': N,
      charge: -Q,
      'carrier-mobility': -0.00439705002693041,
    });
    const rho = CANONICAL_GRAPH.find((e) => e.id === 'CE-drude-resistivity')!.evaluate({
      mass: M,
      'carrier-density': N,
      charge: -Q,
      'relaxation-time': TAU,
    });
    expect(both).toBeCloseTo(1 / rho, 6);
    expect(both).toBeGreaterThan(0);
    const zero = conductivityEdge().evaluate({
      'carrier-density': N,
      charge: -Q,
      'carrier-mobility': 0,
    });
    expect(zero === 0).toBe(true);
  });

  it('does not take the sign off a Hall coefficient or a cyclotron frequency', () => {
    const hall = CANONICAL_GRAPH.find((e) => e.id === 'CE-hall-coefficient')!.evaluate({
      'carrier-density': N,
      charge: -Q,
    });
    expect(hall).toBeCloseTo(1 / (N * -Q), 8);
    expect(hall).toBeLessThan(0);
    const cyclotron = CANONICAL_GRAPH.find((e) => e.id === 'CE-cyclotron-frequency')!.evaluate({
      charge: -Q,
      'magnetic-field': 1,
      mass: M,
    });
    expect(cyclotron).toBeCloseTo((-Q * 1) / M, 6);
    expect(cyclotron).toBeLessThan(0);
  });

  it('upt explain exits 1 on the mixed signs and prints the positive conductivity when they agree', async () => {
    const lines: string[] = [];
    const io = {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => lines.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    };
    const bad = await runCli(
      [
        'explain',
        'electrical-conductivity',
        `carrier-density=${N}`,
        `charge=${-Q}`,
        `carrier-mobility=${MU}`,
        '--source=canonical',
      ],
      io,
    );
    expect(bad).toBe(1);
    expect(lines.join('')).toMatch(/charge and carrier-mobility must have the same sign/);
    expect(lines.join('')).not.toMatch(/Recovered value: -/);
    lines.length = 0;
    const good = await runCli(
      [
        'explain',
        'electrical-conductivity',
        `carrier-density=${N}`,
        `charge=${-Q}`,
        'carrier-mobility=-0.00439705002693041',
        '--source=canonical',
      ],
      io,
    );
    expect(good).toBe(0);
    expect(lines.join('')).toMatch(/Recovered value: 59669886\.374904/);
  });
});
