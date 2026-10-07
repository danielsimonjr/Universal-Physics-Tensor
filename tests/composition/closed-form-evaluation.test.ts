/**
 * A fully-quantitative closed form evaluates. A complete finite input never
 * throws "missing a finite input". A scalar-up-to-constant sum stays unset:
 * the dropped ½ is not the law.
 */
import { describe, expect, it } from 'vitest';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { DomainViolationError } from '../../src/composition/edge.js';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';
import { K_B_SI } from '../../src/core/constants.js';

const FULLY = new Set(
  CANONICAL_EQUATIONS.filter((equation) => equation.epistemicStatus === 'fully-quantitative').map((equation) => equation.id),
);

function samples(names: readonly string[]): Record<string, number>[] {
  // 4.965114231744276 is the root of (5 - x) = 5 exp(-x); a relation that states a regime inequality needs spread values.
  const scales = [1, 2, 0.5, 0.25, 0.1, 3, 4.5, 10, 300, 1e-3, 0, 4.965114231744276];
  const out: Record<string, number>[] = [];
  for (const scale of scales) {
    const equal: Record<string, number> = {};
    const varied: Record<string, number> = {};
    const reversed: Record<string, number> = {};
    const negative: Record<string, number> = {};
    const alternating: Record<string, number> = {};
    const spread: Record<string, number> = {};
    const spreadReversed: Record<string, number> = {};
    names.forEach((name, index) => {
      equal[name] = scale;
      varied[name] = (scale * (index + 1)) / (names.length + 1);
      reversed[name] = (scale * (names.length - index)) / (names.length + 1);
      negative[name] = -scale;
      alternating[name] = scale * (index % 2 === 0 ? 1 : -1);
      spread[name] = scale * 100 ** index;
      spreadReversed[name] = scale * 100 ** (names.length - 1 - index);
    });
    out.push(equal, varied, reversed, negative, alternating, spread, spreadReversed);
  }
  return out;
}

describe('closed-form evaluation', () => {
  it('Carnot, the first law, and the Boltzmann factor return the closed form', () => {
    expect(
      evaluateRelation('CE-carnot-efficiency', {
        'cold-reservoir-temperature': 300,
        'hot-reservoir-temperature': 800,
      }),
    ).toMatchObject({ kind: 'value', value: 0.625 });
    expect(
      evaluateRelation('CE-first-law-thermodynamics', {
        'heat-added': 100,
        'work-done-by-system': 40,
      }),
    ).toMatchObject({ kind: 'value', value: 60 });
    const factor = evaluateRelation('CE-boltzmann-factor', {
      'state-energy': K_B_SI,
      'boltzmann-constant': K_B_SI,
      temperature: 1,
    });
    expect(factor.kind).toBe('value');
    if (factor.kind === 'value') expect(factor.value).toBeCloseTo(Math.exp(-1), 12);
  });

  it('Bernoulli stays unset when every input is finite', () => {
    const result = evaluateRelation('CE-bernoulli', {
      density: 1,
      'flow-velocity': 1,
      'gravitational-acceleration': 1,
      height: 1,
      'static-pressure': 1,
    });
    expect(result).toMatchObject({ kind: 'unset' });
  });

  it('every catalog and canonical edge accepts a complete finite input without throwing', () => {
    const failures: string[] = [];
    for (const edge of [...CATALOG_GRAPH, ...CANONICAL_GRAPH]) {
      let accepted = false;
      let finiteValue = false;
      let lastError = 'no domain-satisfying input';
      for (const inputs of samples(edge.sources.map((source) => source.name))) {
        try {
          const result = evaluateRelation(edge.id, inputs);
          accepted = true;
          if (result.kind === 'value' && Number.isFinite(result.value)) {
            finiteValue = true;
            if (FULLY.has(edge.id)) break;
          }
        } catch (error) {
          if (error instanceof DomainViolationError) continue;
          lastError = error instanceof Error ? error.message : String(error);
        }
      }
      if (!accepted) failures.push(`${edge.id}: ${lastError}`);
      if (FULLY.has(edge.id) && !finiteValue) failures.push(`${edge.id}: fully-quantitative did not return a finite value`);
    }
    expect(failures).toEqual([]);
  });
});
