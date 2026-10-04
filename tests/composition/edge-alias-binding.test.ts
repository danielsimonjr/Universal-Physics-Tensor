/**
 * An edge alias is an evaluate key. `upt evaluate` already accepts it.
 * `edge.evaluate`, `evaluateEdge`, and a composed edge must read the same map
 * before the domain predicate and the formula. A finite alias is not a
 * missing quantity.
 */
import { describe, expect, it } from 'vitest';
import { composeEdges } from '../../src/composition/compose.js';
import { evaluateEdge } from '../../src/composition/edge.js';
import {
  be66Edge,
  be67Edge,
  be68Edge,
  be69Edge,
  be70Edge,
  be71Edge,
  be72Edge,
  be73Edge,
  be74Edge,
  be75Edge,
  be76Edge,
} from '../../src/composition/edges/applied-physicist.js';
import type { BridgeEdge } from '../../src/composition/edge.js';

const PROBES: Record<string, Record<string, number>> = {
  'be-66': { 'poynting-flux': 1e6, reflectance: 0.4, 'incidence-angle': Math.PI / 5 },
  'be-67': { 'magnetic-flux-density': 12e-9, 'plasma-mass-density': 14e6 * 1.67262192369e-27 },
  'be-68': { 'proper-temperature': 300, 'metric-g00': -0.8 },
  'be-69': { 'sound-speed': 1e5, 'magnetic-flux-density': 1e-4, 'plasma-mass-density': 1e-6 },
  'be-70': { 'electrical-mobility': 1e-8, 'einstein-temperature': 300, 'carrier-charge': 1.602176634e-19 },
  'be-71': { 'specific-latent-heat': 2.26e6, 'clapeyron-temperature': 373.15, 'specific-volume-change': 1.672 },
  'be-72': { 'redshift-metric-g00-1': -1, 'redshift-metric-g00-2': -4 },
  'be-73': { 'seebeck-coefficient': 2e-4, 'peltier-temperature': 300 },
  'be-74': { 'magnetic-flux-density': 1 },
  'be-75': { 'effective-mass': 9.1093837015e-31, 'carrier-density': 1e28 },
  'be-76': { 'carrier-density': 1e20, temperature: 300, 'magnetic-pressure': 397887.35751312086 },
};

const EDGES: readonly BridgeEdge[] = [
  be66Edge,
  be67Edge,
  be68Edge,
  be69Edge,
  be70Edge,
  be71Edge,
  be72Edge,
  be73Edge,
  be74Edge,
  be75Edge,
  be76Edge,
];

function firstAliasInputs(edge: BridgeEdge, probe: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [quantity, keys] of Object.entries(edge.aliases ?? {})) {
    out[keys[0]!] = probe[quantity]!;
  }
  return out;
}

describe('edge evaluate reads aliases', () => {
  it('accepts B_T on be-74, evaluateEdge, and the be-74∘be-76 chain', () => {
    const byName = be74Edge.evaluate({ 'magnetic-flux-density': 1 });
    expect(be74Edge.evaluate({ B_T: 1 })).toBe(byName);
    expect(be74Edge.evaluate({ B: 1 })).toBe(byName);
    expect(evaluateEdge(be74Edge, { B_T: 1 })).toBe(byName);
    expect(byName).toBeCloseTo(397887.35751312086, 6);

    const chain = composeEdges(be74Edge, be76Edge);
    const named = chain.evaluate({
      'magnetic-flux-density': 1,
      'carrier-density': 1e20,
      temperature: 300,
    });
    expect(chain.evaluate({ B_T: 1, n_per_m3: 1e20, T_K: 300 })).toBe(named);
    expect(named).toBeCloseTo(0.0000010409848219073948, 18);
  });

  it('evaluates every aliased edge from its CLI keys', () => {
    for (const edge of EDGES) {
      const probe = PROBES[edge.id]!;
      const viaAlias = edge.evaluate(firstAliasInputs(edge, probe));
      expect(viaAlias, edge.id).toBe(edge.evaluate(probe));
      expect(evaluateEdge(edge, firstAliasInputs(edge, probe)), edge.id).toBe(viaAlias);
    }
  });

  it('names the quantity when two aliases disagree', () => {
    expect(() => be74Edge.evaluate({ B_T: 1, B: 2 })).toThrow(/magnetic-flux-density/);
  });
});
