/**
 * A catalog edge is named when the formula's target and sources are that
 * edge. Two edges that fit only by dropping a dimensionless source are not
 * both named. A shared token is not a match.
 */
import { describe, expect, it } from 'vitest';
import { DIMENSIONLESS, type Dimension } from '../../src/dimensional/types.js';
import { describeKnownRelation, matchingCatalogEdges } from '../../src/composition/canonical-compare.js';

const MASS: Dimension = { L: 0, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

describe('matchingCatalogEdges', () => {
  it('names be-66 for the radiation-pressure monomial and for the full source set', () => {
    const reduced = matchingCatalogEdges('radiation-pressure', ['poynting_flux', 'c']);
    expect(reduced.map((edge) => edge.id)).toEqual(['be-66']);
    expect(reduced[0]?.fit).toBe('dimensionful');

    const full = matchingCatalogEdges('radiation_pressure', ['I', 'R', 'theta', 'c']);
    expect(full.map((edge) => edge.id)).toEqual(['be-66']);
    expect(full[0]?.fit).toBe('exact');
  });

  it('does not name an edge for a different target, an extra source, or a missing dimensionful source', () => {
    expect(matchingCatalogEdges('pressure', ['intensity', 'c'])).toEqual([]);
    expect(matchingCatalogEdges('radiation-pressure', ['poynting-flux', 'temperature'])).toEqual([]);
    expect(matchingCatalogEdges('radiation-pressure', ['reflectance', 'incidence-angle'])).toEqual([]);
  });

  it('names neither edge when each fits only by omitting a different dimensionless source', () => {
    const edges = [
      {
        id: 'edge-a',
        label: 'A',
        target: { name: 'speed' },
        sources: [
          { name: 'field', dim: MASS },
          { name: 'ratio-a', dim: DIMENSIONLESS },
        ],
      },
      {
        id: 'edge-b',
        label: 'B',
        target: { name: 'speed' },
        sources: [
          { name: 'field', dim: MASS },
          { name: 'ratio-b', dim: DIMENSIONLESS },
        ],
      },
    ];
    expect(matchingCatalogEdges('speed', ['field'], edges)).toEqual([]);
    const lines = describeKnownRelation([], 'speed', ['field'], edges);
    expect(lines).toEqual([
      '· no canonical equation has this target and these variables, so the prefactor is NOT checked',
    ]);
    expect(lines.join('\n')).not.toMatch(/edge-a|edge-b/);
  });
});
