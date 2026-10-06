/**
 * User-equation injection — parse a free-form `TARGET = EXPR` into a junction
 * (target + source quantities), resolve user symbols to the catalog vocabulary
 * (literal or `_`↔`-` swap), suggest near-misses, and report where the injected
 * junction lands in a built `VizModel`.
 *
 * @module tests/composition/user-equation
 */
import { describe, it, expect } from 'vitest';
import {
  parseUserEquation,
  suggestQuantities,
  suggestByDimension,
  equationLanding,
  formatConnectedSummary,
  analyzeUserEquation,
  rewriteCatalogHyphens,
  UserEquationError,
} from '../../src/composition/user-equation.js';
import { resolveQuantityName } from '../../src/dimensional/formula-names.js';
import {
  LENGTH, MASS, TIME, VELOCITY, ACCELERATION, ENERGY, FREQUENCY, ENTROPY, AREA,
} from '../../src/dimensional/types.js';
import { buildVizModel } from '../../src/composition/graph-viz.js';
import type { VizJunction } from '../../src/composition/graph-viz.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const q = (name: string): Quantity => ({ name, symbol: name, dim: DIMENSIONLESS, attributes: {} });
const edge = (id: string, src: string[], tgt: string): BridgeEdge => ({
  id, beId: null, kind: 'bridge', label: id,
  sources: src.map(q), target: q(tgt),
  confidence: 'speculative',
  domain: { description: 'any', predicate: () => true },
  evaluate: () => 0, citation: 'synthetic',
});

describe('parseUserEquation', () => {
  it('splits TARGET = EXPR and extracts source quantities', async () => {
    const e = await parseUserEquation('period = 2*pi*sqrt(length/gravity)');
    expect(e.target).toBe('period');
    expect([...e.sources].sort()).toEqual(['gravity', 'length']);
    expect(e.text).toContain('period =');
  });

  it('strips physics constants (h, c, k_B), numbers, pi, and functions', async () => {
    const e = await parseUserEquation('photon_energy = h * nu');
    expect(e.target).toBe('photon_energy');
    expect(e.sources).toEqual(['nu']); // h removed as a constant
  });

  it('preserves underscores in quantity names', async () => {
    const e = await parseUserEquation('x = secondary_mass * c');
    expect(e.sources).toEqual(['secondary_mass']); // c removed; underscore kept
  });

  it('rejects a missing "="', async () => {
    await expect(parseUserEquation('period 2*pi')).rejects.toThrow(UserEquationError);
  });

  it('rejects an empty target', async () => {
    await expect(parseUserEquation('  = length')).rejects.toThrow(UserEquationError);
  });

  it('rejects an RHS with no source quantities (only constants/numbers)', async () => {
    await expect(parseUserEquation('x = 2*pi*c')).rejects.toThrow(UserEquationError);
  });

  it('rejects equations exceeding the length cap', async () => {
    const long = 'x = ' + 'a'.repeat(9000);
    await expect(parseUserEquation(long)).rejects.toThrow(/exceeds 8192/);
  });
});

describe('W2: catalog kebabs are identifiers, not subtraction', () => {
  const names = new Set(['planck-length', 'speed-of-light', 'bh-entropy', 'mass']);

  it('rewriteCatalogHyphens turns kebabs into underscores, longest first', () => {
    expect(rewriteCatalogHyphens('S = A/(4*planck-length^2)', names)).toBe(
      'S = A/(4*planck_length^2)',
    );
    expect(rewriteCatalogHyphens('rest-energy = mass*speed-of-light^2', names)).toBe(
      'rest-energy = mass*speed_of_light^2',
    );
  });

  it('parseUserEquation with catalog names accepts planck-length on the RHS', async () => {
    const e = await parseUserEquation('length = 2*planck-length', names);
    expect([...e.sources].sort()).toEqual(['planck_length']);
    expect(e.text).toBe('length = 2*planck_length');
  });

  it('analyzeUserEquation accepts length = 2*planck-length (no subtract error)', async () => {
    const catalog = new Map([
      ['length', LENGTH],
      ['planck-length', LENGTH],
    ]);
    const a = await analyzeUserEquation('length = 2*planck-length', catalog);
    expect(a.parseError).toBeNull();
    expect(a.consistent).toBe(true);
    // Junction sources resolve back to the catalog kebab form.
    expect(a.junction.sources).toContain('planck-length');
  });
});

describe('resolveQuantityName', () => {
  const names = new Set(['photon-energy', 'impact_parameter', 'mass', 'temperature']);
  it('matches a literal name', () => {
    expect(resolveQuantityName('mass', names)).toBe('mass');
    expect(resolveQuantityName('photon-energy', names)).toBe('photon-energy');
    expect(resolveQuantityName('impact_parameter', names)).toBe('impact_parameter');
  });

  it('L4: latex T resolves to temperature when temperature is in the catalog', () => {
    expect(resolveQuantityName('T', names)).toBe('temperature');
    expect(resolveQuantityName('T', new Set(['mass']))).toBeNull();
  });
  it('matches via the _<->- swap (both directions)', () => {
    expect(resolveQuantityName('photon_energy', names)).toBe('photon-energy');
    expect(resolveQuantityName('impact-parameter', names)).toBe('impact_parameter');
  });
  it('returns null for an unmatched name', () => {
    expect(resolveQuantityName('unknown-thing', names)).toBeNull();
  });
});

describe('suggestQuantities', () => {
  const names = ['temperature', 'mass', 'time', 'photon-energy', 'energy'];
  it('puts the closest catalog name first for a near miss', () => {
    expect(suggestQuantities('temperatur', names)[0]).toBe('temperature');
  });
  it('respects the k limit', () => {
    expect(suggestQuantities('e', names, 2).length).toBeLessThanOrEqual(2);
  });

  it('filters out spurious short-name matches (relevance gate)', () => {
    // a typo of "length" must not suggest unrelated short names like "a"/"nu".
    const got = suggestQuantities('lenth', ['length', 'a', 'nu', 'mass']);
    expect(got).toContain('length');
    expect(got).not.toContain('a');
    expect(got).not.toContain('nu');
  });
});

describe('suggestByDimension', () => {
  const ENERGY = { L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0 };
  const cat = new Map([
    ['photon-energy', ENERGY],
    ['erasure-energy', ENERGY],
    ['mass', MASS],
    ['length', LENGTH],
  ]);
  it('returns catalog names of the matching dimension, sorted', () => {
    expect(suggestByDimension(ENERGY, cat)).toEqual(['erasure-energy', 'photon-energy']);
  });
  it('excludes non-matching dimensions and respects k', () => {
    expect(suggestByDimension(ENERGY, cat, 1)).toEqual(['erasure-energy']);
    expect(suggestByDimension(MASS, cat)).toEqual(['mass']);
  });
});

describe('W3: formatConnectedSummary', () => {
  it('ranks by shared-quantity overlap so the restated law leads, and caps the rest', () => {
    const junctions: VizJunction[] = [
      { id: 'user-equation', label: 'user', status: 'user', sources: ['length', 'gravity'], target: 'period' },
      { id: 'CE-pendulum-period', label: 'pendulum', status: 'law', sources: ['length', 'gravity'], target: 'period' },
      { id: 'CE-wien', label: 'wien', status: 'law', sources: ['temperature'], target: 'peak-wavelength' },
      { id: 'be-11-zurek', label: 'zurek', status: 'speculative', sources: ['temperature'], target: 'decoherence-rate' },
      { id: 'CE-kepler-third', label: 'kepler', status: 'law', sources: ['gravity'], target: 'period' },
      { id: 'be-12', label: 'be12', status: 'speculative', sources: ['temperature'], target: 'thermal-wavelength' },
      { id: 'be-16', label: 'be16', status: 'speculative', sources: ['temperature'], target: 'landauer-erasure-energy' },
      { id: 'be-23', label: 'be23', status: 'speculative', sources: ['temperature'], target: 'relaxation-rate' },
    ];
    const model = {
      junctions,
      clusters: [{
        size: junctions.length,
        anchored: true,
        junctionIds: junctions.map((j) => j.id),
        quantities: ['length', 'gravity', 'period', 'temperature', 'peak-wavelength',
          'decoherence-rate', 'thermal-wavelength', 'landauer-erasure-energy', 'relaxation-rate'],
      }],
      filterStats: { total: junctions.length, kept: junctions.length, droppedNotMatching: 0, droppedMissingMetadata: 0 },
      filterLegend: null,
      toMermaid: () => '',
      toDot: () => '',
    };
    const landing = {
      isolated: false,
      clusterSize: junctions.length,
      anchored: true,
      sharedQuantities: ['gravity', 'length', 'period'],
      connectedJunctionIds: junctions.filter((j) => j.id !== 'user-equation').map((j) => j.id),
    };

    const lines = formatConnectedSummary(model, landing, 3);
    expect(lines[0]).toMatch(/^     nearest equations: CE-pendulum-period/);
    expect(lines[0]).toMatch(/CE-kepler-third/);
    expect(lines[0]).toMatch(/\(\+4 more\)/);
    expect(lines[1]).toBe('     (shared-quantity connectivity, not a physics claim)');
    expect(lines.join('\n')).not.toMatch(/be-23/);
  });
});

describe('equationLanding', () => {
  // a→b (e1), b→d (e2) form one cluster {e1,e2} sharing b; x→y (e3) is isolated.
  const FIXTURE: BridgeEdge[] = [
    edge('e1', ['a'], 'b'),
    edge('e2', ['b'], 'd'),
    edge('e3', ['x'], 'y'),
  ];

  it('reports the cluster a connected user equation joins', () => {
    const user: VizJunction = {
      id: 'user-equation', label: 'd = a + g', status: 'user',
      sources: ['a'], target: 'd', // shares a and d with the {e1,e2} cluster
    };
    const model = buildVizModel(FIXTURE, { extraJunctions: [user] });
    const landing = equationLanding(model, 'user-equation');
    expect(landing.isolated).toBe(false);
    expect(landing.connectedJunctionIds).toEqual(
      expect.arrayContaining(['e1', 'e2']),
    );
    expect(landing.sharedQuantities).toEqual(
      expect.arrayContaining(['a', 'd']),
    );
  });

  it('reports isolation when the equation shares no quantity', () => {
    const user: VizJunction = {
      id: 'user-equation', label: 'p = u + v', status: 'user',
      sources: ['u'], target: 'p',
    };
    const model = buildVizModel(FIXTURE, { extraJunctions: [user] });
    const landing = equationLanding(model, 'user-equation');
    expect(landing.isolated).toBe(true);
    expect(landing.clusterSize).toBe(1);
    expect(landing.connectedJunctionIds).toEqual([]);
  });
});

describe('analyzeUserEquation — dimensional validation + hints', () => {
  const cat = new Map([
    ['period', TIME], ['length', LENGTH], ['gravity', ACCELERATION],
    ['mass', MASS], ['speed', VELOCITY], ['photon-energy', ENERGY],
    ['frequency', FREQUENCY],
  ]);

  it('reports a dimensionally consistent equation', async () => {
    const a = await analyzeUserEquation('period = length / speed', cat);
    expect(a.parseError).toBeNull();
    expect(a.consistent).toBe(true);
  });

  it('flags a dimensional mismatch (period = mass)', async () => {
    const a = await analyzeUserEquation('period = mass', cat);
    expect(a.parseError).toBeNull();
    expect(a.consistent).toBe(false);
  });

  it('infers a single unknown\'s dimension for a dimension-based hint', async () => {
    // period = unknown / gravity ⟹ unknown is a velocity ⟹ suggest "speed".
    const a = await analyzeUserEquation('period = uu / gravity', cat);
    const hint = a.hints.find((h) => h.name === 'uu');
    expect(hint?.byDimension).toBe(true);
    expect(hint?.suggestions).toContain('speed');
  });

  it('gives physics constants their real dimensions (h carries action)', async () => {
    // photon_energy = h * nu ⟹ nu is a frequency (NOT energy), proving h's
    // dimension (action) was supplied to the parser.
    const a = await analyzeUserEquation('photon_energy = h * nu', cat);
    const hint = a.hints.find((h) => h.name === 'nu');
    expect(hint?.byDimension).toBe(true);
    expect(hint?.suggestions).toContain('frequency');
  });

  it('reports a parseError on a non-homogeneous RHS', async () => {
    const a = await analyzeUserEquation('period = length + gravity', cat);
    expect(a.parseError).not.toBeNull();
    expect(a.rhsDimension).toBeNull();
  });

  it('throws UserEquationError on a structurally malformed equation', async () => {
    await expect(analyzeUserEquation('no equals', cat)).rejects.toThrow(UserEquationError);
  });
});
