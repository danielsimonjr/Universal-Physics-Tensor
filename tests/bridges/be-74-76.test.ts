/**
 * BE-74, BE-75, and BE-76.
 *
 * The factor 2 in magnetic pressure is the inductor integral. Units give
 * p ∝ B²/μ0 and do not choose it. London units admit a second length.
 * Plasma beta composes on the magnetic pressure, so B²/μ0 is half of it.
 */
import { describe, expect, it } from 'vitest';
import { evaluateMagneticPressure } from '../../src/bridges/be74-magnetic-pressure.js';
import { evaluateLondonPenetration } from '../../src/bridges/be75-london-penetration.js';
import { evaluatePlasmaBeta } from '../../src/bridges/be76-plasma-beta.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';
import { MU0_SI } from '../../src/dimensional/formula-names.js';
import { composeEdges } from '../../src/composition/compose.js';
import { CompositionJunctionError } from '../../src/composition/edge.js';
import { be74Edge, be75Edge, be76Edge } from '../../src/composition/edges/applied-physicist.js';
import { matchingCatalogEdges } from '../../src/composition/canonical-compare.js';
import { explainQuantity, formatQuantity } from '../../src/composition/explain.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { regimesDiffer } from '../../src/composition/quantity.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';

const B = 0.2;
const battery = (B * B) / MU0_SI;

describe('BE-74 magnetic pressure', () => {
  it('is B²/(2 μ0), half the battery work per volume', () => {
    const p = evaluateMagneticPressure({ B_T: B }).p_Pa;
    expect(p).toBe(battery / 2);
    expect(p).not.toBe(battery);
    expect(evaluateMagneticPressure({ B_T: 0 }).p_Pa).toBe(0);
    expect(evaluateMagneticPressure({ B_T: -B }).p_Pa).toBe(p);
  });

  it('explain recovers that half, and units do not print it as a proportionality', () => {
    const explained = explainQuantity(CATALOG_GRAPH, 'magnetic-pressure', { 'magnetic-flux-density': B });
    expect(explained.recoveredValue).toBe(battery / 2);
    expect(explained.summary).toContain(`Recovered value: ${formatQuantity(battery / 2)}`);
    expect(explained.summary).toContain('be-74');
    expect(explained.summary).toContain('dimensionful constants');
    expect(explained.summary).not.toContain('∝');
    expect(explained.dimensional?.outsideGoverningSpan).toBe(true);
  });
});

describe('BE-75 London penetration depth', () => {
  const m = 9.1093837015e-31;
  const n = 1e28;
  const london = Math.sqrt(m / (MU0_SI * n * E_SI * E_SI));
  const other = (MU0_SI * E_SI * E_SI) / m;

  it('is the screened root, not μ0 e²/m, and not the depth at 2e', () => {
    const lambda = evaluateLondonPenetration({ m_kg: m, n_per_m3: n }).lambda_m;
    expect(lambda).toBeCloseTo(london, 12);
    expect(lambda / other).toBeGreaterThan(100);
    const doubled = Math.sqrt(m / (MU0_SI * n * (2 * E_SI) * (2 * E_SI)));
    expect(lambda / doubled).toBeCloseTo(2, 6);
  });

  it('explain recovers that root and does not claim a unique monomial', () => {
    const explained = explainQuantity(CATALOG_GRAPH, 'london-penetration-depth', {
      'effective-mass': m,
      'carrier-density': n,
    });
    expect(explained.recoveredValue).toBeCloseTo(london, 12);
    expect(explained.summary).toContain('be-75');
    expect(explained.summary).toContain('dimensionful constants');
    expect(explained.summary).not.toContain('∝');
    expect((explained.recoveredValue ?? 0) / other).toBeGreaterThan(100);
  });
});

describe('BE-76 plasma beta', () => {
  const n = 1e20;
  const T = 1e6;
  const pB = evaluateMagneticPressure({ B_T: B }).p_Pa;
  const beta = (2 * MU0_SI * n * K_B_SI * T) / (B * B);

  it('composes on BE-74, and B²/μ0 is half of this beta', () => {
    expect(evaluatePlasmaBeta({ n_per_m3: n, T_K: T, p_B_Pa: pB }).beta).toBeCloseTo(beta, 10);
    const half = (n * K_B_SI * T) / battery;
    expect(beta).toBeCloseTo(2 * half, 10);
    expect(beta).not.toBeCloseTo(half, 6);
    const chain = composeEdges(be74Edge, be76Edge);
    expect(chain.evaluate({ 'magnetic-flux-density': B, 'carrier-density': n, temperature: T })).toBeCloseTo(beta, 10);
    expect(() => composeEdges(be76Edge, be74Edge)).toThrow(CompositionJunctionError);
    expect(be76Edge.kind).toBe('bridge');
    expect(regimesDiffer(be74Edge.target.attributes, be76Edge.sources[2]!.attributes)).toBe(false);
  });

  it('explain from B, n, and T recovers the substituted beta, including the 2', () => {
    const explained = explainQuantity(CATALOG_GRAPH, 'plasma-beta', {
      'carrier-density': n,
      temperature: T,
      'magnetic-flux-density': B,
    });
    expect(explained.recoveredValue).toBeCloseTo(beta, 10);
    expect(explained.summary).toContain('be-76');
    expect(explained.summary).toContain('dimensionful constants');
    expect(explained.summary).not.toContain('∝');
    const half = (n * K_B_SI * T) / battery;
    expect(explained.recoveredValue).not.toBeCloseTo(half, 6);
  });
});

describe('catalog evidence', () => {
  it('each id is formally-proved through its formalRef, and map names the source set', () => {
    for (const id of [74, 75, 76]) {
      const ref = catalogFormalRef(id);
      expect(ref?.kind).toBe('bridge');
      expect(ref?.url).toContain('/lean/');
      expect(ref?.url).not.toContain('/lean/PhysJS/');
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(true);
    }
    expect(matchingCatalogEdges('magnetic-pressure', ['magnetic-flux-density']).map((e) => e.id)).toEqual(['be-74']);
    expect(matchingCatalogEdges('london-penetration-depth', ['effective-mass', 'carrier-density']).map((e) => e.id)).toEqual([
      'be-75',
    ]);
    expect(
      matchingCatalogEdges('plasma-beta', ['carrier-density', 'temperature', 'magnetic-pressure']).map((e) => e.id),
    ).toEqual(['be-76']);
    expect(matchingCatalogEdges('plasma-beta', ['carrier-density', 'temperature', 'magnetic-flux-density'])).toEqual([]);
    expect(be75Edge.kind).toBe('law');
    expect(regimesDiffer(be75Edge.sources[0]!.attributes, be75Edge.target.attributes)).toBe(false);
  });
});
