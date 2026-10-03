/**
 * Canonical Landauer and catalog be-16 are one law: E = k_B T ln 2.
 * The canonical graph used to evaluate the dimensional monomial and take the
 * recorded dimensionless factor as 1, so `erasure-energy` was k_B T, the audit
 * reported ×1.000, and that comparison could not see the ln 2 in the AST.
 */
import { describe, expect, it } from 'vitest';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { attemptDerivation } from '../../src/composition/bridge-analysis.js';
import { be16Edge } from '../../src/composition/edges/calibration.js';
import { K_B_SI } from '../../src/core/constants.js';

const T = 300;

describe('Landauer erasure energy keeps ln 2', () => {
  it('the canonical evaluator matches k_B T ln 2 and the catalog edge', () => {
    const edge = CANONICAL_GRAPH.find((e) => e.id === 'CE-landauer');
    expect(edge).toBeDefined();
    const canonical = edge!.evaluate({ temperature: T });
    const catalog = be16Edge.evaluate({ temperature: T });
    const expected = K_B_SI * T * Math.LN2;
    // Relative: these energies are ~1e-21, so an absolute decimal tolerance cannot fail.
    expect(canonical / expected).toBeCloseTo(1, 9);
    expect(catalog / expected).toBeCloseTo(1, 9);
    expect(canonical / catalog).toBeCloseTo(1, 9);
    expect(canonical / (K_B_SI * T)).toBeCloseTo(Math.LN2, 9);
  });

  it('the dimensional audit reports the ln 2, not ×1', () => {
    const edge = CANONICAL_GRAPH.find((e) => e.id === 'CE-landauer')!;
    const d = attemptDerivation(edge);
    expect(d.status).toBe('derived');
    expect(d.prefactor).toBeCloseTo(Math.LN2, 6);
    expect(Math.abs(d.prefactor! - 1)).toBeGreaterThan(0.1);
  });
});
