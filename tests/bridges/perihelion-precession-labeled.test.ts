/**
 * Tests for `src/bridges/perihelion-precession-labeled.ts` — Phase 4
 * single-bridge demo of v0.7 Proposal 1 (Intelligent Index Layer).
 *
 * Validates that:
 *   - The labeled entry point returns the SAME numerical values as
 *     the original `evaluatePerihelionPrecession`.
 *   - The wrapper carries `Axes.scale.classical` identity, NOT a
 *     fresh `makeIndex('scale', 'classical')` (singleton check).
 *   - A LabeledTensor from this bridge can contract with another
 *     LabeledTensor that also carries `Axes.scale.classical`
 *     — physics-axis identity drives the contraction.
 *
 * @module tests/bridges/perihelion-precession-labeled
 */

import { describe, it, expect } from 'vitest';
import { Float64ReferenceEngine } from '../../src/numerical/float64-engine.js';
import { evaluatePerihelionPrecession } from '../../src/bridges/perihelion-precession.js';
import { evaluatePerihelionPrecessionLabeled } from '../../src/bridges/perihelion-precession-labeled.js';
import { IndexNameMismatchError, LabeledTensor } from '../../src/core/labeled-tensor.js';
import { Axes } from '../../src/core/axes-registry.js';
import { makeIndex } from '../../src/core/universal-index.js';

const engine = new Float64ReferenceEngine();

// Mercury's orbital parameters (textbook values).
const MERCURY = {
  M_kg: 1.989e30,    // solar mass
  a_m: 5.7909e10,    // Mercury semi-major axis
  e: 0.20563,        // Mercury eccentricity
  T_yr: 0.2408,      // Mercury orbital period
};

describe('evaluatePerihelionPrecessionLabeled — additive entry point', () => {
  it('produces the same numerical values as the original evaluator', () => {
    const raw = evaluatePerihelionPrecession(MERCURY);
    const { raw: labeledRaw } = evaluatePerihelionPrecessionLabeled(MERCURY, engine);
    expect(labeledRaw.dphi_rad_per_orbit).toBe(raw.dphi_rad_per_orbit);
    expect(labeledRaw.dphi_arcsec_per_orbit).toBe(raw.dphi_arcsec_per_orbit);
    expect(labeledRaw.dphi_arcsec_per_century).toBe(raw.dphi_arcsec_per_century);
  });

  it('returns a LabeledTensor of shape [3] with the three perihelion quantities', () => {
    const { raw, labeled } = evaluatePerihelionPrecessionLabeled(MERCURY, engine);
    expect(labeled).toBeInstanceOf(LabeledTensor);
    expect(labeled.tensor.shape).toEqual([3]);
    const nested = engine.toNested(labeled.tensor) as number[];
    expect(nested[0]).toBeCloseTo(raw.dphi_rad_per_orbit);
    expect(nested[1]).toBeCloseTo(raw.dphi_arcsec_per_orbit);
    expect(nested[2]).toBeCloseTo(raw.dphi_arcsec_per_century);
  });

  it('carries Axes.scale.classical identity (singleton, not a fresh makeIndex)', () => {
    const { labeled } = evaluatePerihelionPrecessionLabeled(MERCURY, engine);
    // The `scale` label is the same OBJECT as Axes.scale.classical —
    // not just an axis/name structural match.
    expect(labeled.labels.scale).toBe(Axes.scale.classical);
  });

  it('produces a Mercury-consistent result (~43 arcsec/century)', () => {
    const { raw } = evaluatePerihelionPrecessionLabeled(MERCURY, engine);
    // Famous result: GR predicts ~43 arcsec/century of perihelion
    // advance for Mercury (the historical anomaly explained by
    // Einstein in 1915).
    expect(raw.dphi_arcsec_per_century).toBeGreaterThan(40);
    expect(raw.dphi_arcsec_per_century).toBeLessThan(46);
  });
});

describe('Cross-bridge LabeledTensor contraction via singleton identity', () => {
  it('two bridges carrying Axes.scale.classical contract together', () => {
    // Bridge 1: perihelion (rank-1 over scale.classical).
    const { labeled: perihelion } = evaluatePerihelionPrecessionLabeled(MERCURY, engine);
    // Bridge 2: a synthetic "observational weights" tensor that also
    // carries Axes.scale.classical — represents downstream consumer
    // weighting the three perihelion quantities. The wrapper matches
    // these by object identity (both reference the same singleton
    // entry from the Axes registry).
    const weights = new LabeledTensor(
      engine.fromNested([1, 0, 0], [3]), // pick the rad-per-orbit only
      engine,
      { scale: Axes.scale.classical },
    );
    const contracted = perihelion.contract(weights);
    // Contraction collapses the shared axis to a scalar (rank-0).
    expect(contracted.tensor.shape).toEqual([]);
    // Result should equal perihelion.dphi_rad_per_orbit * 1.
    const result = engine.toNested(contracted.tensor) as number;
    const { raw } = evaluatePerihelionPrecessionLabeled(MERCURY, engine);
    expect(result).toBeCloseTo(raw.dphi_rad_per_orbit);
  });

  it('throws when a fresh scale.classical index shares the name and not the id', () => {
    const { labeled: perihelion } = evaluatePerihelionPrecessionLabeled(MERCURY, engine);
    // Manually-constructed index with the same axis/name but a
    // FRESH id — Decision #3 says this is NOT the same physics axis.
    const freshScale = makeIndex('scale', 'classical');
    const other = new LabeledTensor(
      engine.fromNested([2, 2, 2], [3]),
      engine,
      { scale: freshScale }, // different id from Axes.scale.classical
    );
    expect(() => perihelion.contract(other)).toThrow(IndexNameMismatchError);
    try {
      perihelion.contract(other);
    } catch (error) {
      expect(error).toBeInstanceOf(IndexNameMismatchError);
      const mismatch = error as IndexNameMismatchError;
      expect(mismatch.message).toContain(freshScale.id);
      expect(mismatch.message).toContain(Axes.scale.classical.id);
      expect(mismatch.indexName).toBe('classical');
    }
  });
});
