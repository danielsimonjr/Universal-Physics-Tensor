/**
 * The dominance witness runner: a bound checked against a measurement at
 * every sample, with the coarse-to-fine difference as the uncertainty there.
 *
 * @module tests/atlas/witness-dominance
 */
import { describe, expect, it } from 'vitest';

import { runDominanceWitness, type DominanceWitnessSpec } from '../../src/atlas/witness-dominance.js';

/** measured = 1 − x² + err(res), bound supplied; err shrinks as res grows. */
function spec(bound: (x: number) => number, err = (res: number) => 1 / res): DominanceWitnessSpec {
  const xs = Array.from({ length: 11 }, (_, i) => i / 10);
  return {
    id: 'D',
    kind: 'dominance',
    evaluate: (res) => ({ measured: xs.map((x) => 1 - x * x + err(res)), bound: xs.map(bound) }),
    coarseResolution: 10,
    fineResolution: 100,
  };
}

describe('runDominanceWitness', () => {
  it('checked when the bound clears the measurement by more than the pointwise uncertainty', () => {
    const r = runDominanceWitness(spec(() => 1.2));
    expect(r.status).toBe('checked');
    expect(r.tightness!).toBeLessThan(1);
  });

  it('refuted when the measurement exceeds the bound by more than the uncertainty', () => {
    const r = runDominanceWitness(spec((x) => 1 - x * x - 0.2));
    expect(r.status).toBe('refuted');
    expect(r.margin!).toBeLessThan(0);
  });

  it('unresolved when the margin is within the uncertainty: the resolutions do not settle it', () => {
    // fine 1 − x² + 0.01, coarse + 0.1: uncertainty 0.09; the bound sits 0.02 above the fine value.
    const r = runDominanceWitness(spec((x) => 1 - x * x + 0.03));
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('no-convergence');
  });

  it('unresolved, never checked, when the resolutions disagree on the sample count or a value is not finite', () => {
    const bad: DominanceWitnessSpec = {
      ...spec(() => 2),
      evaluate: (res) => ({ measured: Array(res).fill(0), bound: Array(res).fill(1) }),
    };
    expect(runDominanceWitness(bad).status).toBe('unresolved');
    const nan: DominanceWitnessSpec = { ...spec(() => Number.NaN) };
    expect(runDominanceWitness(nan).status).toBe('unresolved');
    const throws: DominanceWitnessSpec = {
      ...spec(() => 2),
      evaluate: () => {
        throw new Error('boom');
      },
    };
    expect(runDominanceWitness(throws)).toMatchObject({ status: 'unresolved', reason: 'parse-error' });
  });
});
