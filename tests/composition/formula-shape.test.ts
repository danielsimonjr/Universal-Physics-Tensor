/**
 * A sum of dimensionful terms is not a monomial. Buckingham's unique
 * monomial for the fast magnetosonic speed, from sound speed, B and density
 * alone, is sound-speed^1: B carries a current nothing else cancels without
 * μ0. The encoded formula is √(c_s² + B²/(μ0 ρ)). Printing that speed as
 * proportional to the sound speed, and listing the bridge as a failed
 * monomial reconstruction, both treat a sum as a product of powers.
 *
 * Proof status is the Lean kind. A reconstruction classification does not
 * remove be-69 from the formally-proved map filter.
 */
import { describe, it, expect } from 'vitest';
import { attemptDerivation } from '../../src/composition/bridge-analysis.js';
import { explainQuantity } from '../../src/composition/explain.js';
import { formulaShape } from '../../src/composition/formula-shape.js';
import {
  CATALOG_GRAPH,
  be27Edge,
  be36Edge,
  be52Edge,
  be66Edge,
  be67Edge,
  be69Edge,
} from '../../src/composition/index.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';

const SOLAR_WIND = {
  'sound-speed': 58489.41649057923,
  'magnetic-flux-density': 12e-9,
  'plasma-mass-density': 2.341670693166e-20,
};

describe('a dimensional sum is not a monomial reconstruction', () => {
  it('be-69 is not a failed monomial: the formula adds dimensionful terms', () => {
    expect(formulaShape(be69Edge.symbolic!)).toBe('dimensional-sum');
    expect(formulaShape(be36Edge.symbolic!)).toBe('dimensional-sum');
    expect(formulaShape(be27Edge.symbolic!)).toBe('monomial');
    expect(formulaShape(be66Edge.symbolic!)).toBe('monomial');
    expect(formulaShape(be52Edge.symbolic!)).toBe('monomial');
    expect(attemptDerivation(be69Edge).status).toBe('not-a-monomial');
  });

  it('explain of fast-magnetosonic-speed does not print a proportionality', () => {
    const x = explainQuantity(CATALOG_GRAPH, 'fast-magnetosonic-speed', SOLAR_WIND);
    expect(x.recoveredValue).toBeGreaterThan(90000);
    expect(x.summary).not.toMatch(/∝/);
    expect(x.summary).toMatch(/adds dimensionful terms/);
    expect(x.summary).not.toMatch(/dimensionful constants/);
    expect(x.derivations[0]?.dimensionalForm).toBeUndefined();
  });

  it('c_s = 0 recovers a non-zero Alfvén number and is still not a proportionality', () => {
    const x = explainQuantity(CATALOG_GRAPH, 'fast-magnetosonic-speed', {
      ...SOLAR_WIND,
      'sound-speed': 0,
    });
    expect(x.recoveredValue).toBeGreaterThan(60000);
    expect(x.summary).not.toMatch(/∝/);
  });

  it('a dimensionless factor stays a monomial, and a real monomial mismatch stays a decoy', () => {
    expect(attemptDerivation(be27Edge).status).toBe('decoy');
    expect(attemptDerivation(be67Edge).status).toBe('decoy');
    expect(attemptDerivation(be52Edge).status).not.toBe('not-a-monomial');
    expect(attemptDerivation(be66Edge).status).not.toBe('not-a-monomial');
  });

  it('be-36 (c_GW − c)/c is a dimensional sum, so the constant −1 is not a derivation', () => {
    expect(attemptDerivation(be36Edge).status).toBe('not-a-monomial');
  });

  it('the Lean bridge proof still keeps be-69 in the map filter', () => {
    expect(deriveEdgeEvidence(69).has('formally-proved')).toBe(true);
  });

  it('Clapeyron stays a proportionality: the inputs fix the slope up to a dimensionless constant', () => {
    const x = explainQuantity(CATALOG_GRAPH, 'clapeyron-slope', {
      'specific-latent-heat': 2.26e6,
      'clapeyron-temperature': 373.15,
      'specific-volume-change': 1.672,
    });
    expect(x.recoveredValue).toBeCloseTo(3622.3359001697, 6);
    expect(x.summary).toMatch(/∝/);
  });
});
