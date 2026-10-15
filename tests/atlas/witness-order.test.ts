/**
 * Proposal 14: a numeric witness that carries three or more resolutions
 * reports an OBSERVED order of convergence, the slope of log|error| against
 * log(1/resolution) by MathTS `linearRegression`, with the slope's standard
 * error. It is reported beside the two-resolution ratio and never asserted
 * (the runner's rule); the verdict, the convergence record and the detail
 * sentence of every two-resolution witness are unchanged, and the artifact
 * rows never carry the field.
 */
import { describe, expect, it } from 'vitest';
import { runWitnessRegistry } from '../../src/atlas/witness-artifact.js';
import { runNumericWitness } from '../../src/atlas/witness-numeric.js';
import type { NumericWitnessSpec } from '../../src/atlas/witness-numeric.js';
import { WITNESS_REGISTRY } from '../../src/atlas/witness-specs.js';

/** error = 3/resolution²: exactly second order in h = 1/resolution. */
const secondOrder: NumericWitnessSpec = {
  id: 'order-h2',
  evaluate: (r) => 1 + 3 / (r * r),
  target: 1,
  coarseResolution: 10,
  fineResolution: 20,
  tolerance: 0.01,
  orderResolutions: [40, 80],
};

describe('observedOrder from three or more resolutions', () => {
  it('a known O(h²) witness reports slope 2 with a vanishing standard error over n = 4 resolutions', () => {
    const r = runNumericWitness(secondOrder);
    expect(r.status).toBe('checked');
    expect(r.observedOrder).toBeDefined();
    expect(r.observedOrder!.n).toBe(4);
    expect(Math.abs(r.observedOrder!.slope - 2)).toBeLessThan(1e-9);
    expect(r.observedOrder!.stdErr).toBeLessThan(1e-6);
  });

  it('a first-order witness reports slope 1, and one with resolution as a multiplier of the error reports −1', () => {
    expect(runNumericWitness({ ...secondOrder, evaluate: (r) => 1 + 3 / r }).observedOrder!.slope).toBeCloseTo(1, 9);
    expect(runNumericWitness({ ...secondOrder, evaluate: (r) => 1 + r / 1e6, tolerance: 1 }).observedOrder!.slope).toBeCloseTo(-1, 9);
  });

  it('a noisy witness reports a wide interval: the standard error is of order the slope’s departure from 2', () => {
    const noisy = runNumericWitness({ ...secondOrder, evaluate: (r) => 1 + (3 / (r * r)) * (1 + 0.5 * Math.sin(7 * r)) });
    expect(noisy.observedOrder).toBeDefined();
    expect(noisy.observedOrder!.stdErr).toBeGreaterThan(0.05);
    expect(Math.abs(noisy.observedOrder!.slope - 2)).toBeLessThan(2 * noisy.observedOrder!.stdErr + 0.5);
  });

  it('a two-resolution witness reports no order, and gains none of its numbers from the extra resolutions', () => {
    const { orderResolutions: _drop, ...two } = secondOrder;
    const withoutOrder = runNumericWitness(two);
    expect(withoutOrder.observedOrder).toBeUndefined();
    const { observedOrder: _order, elapsedMs: _e1, ...restWith } = runNumericWitness(secondOrder);
    const { elapsedMs: _e2, ...restWithout } = withoutOrder;
    expect(restWith).toEqual(restWithout);
  });

  it('the order is never asserted: a refuted fine value with a clean O(h²) still reports the order, and a checked one with no fit reports none', () => {
    const refuted = runNumericWitness({ ...secondOrder, tolerance: 1e-6 });
    expect(refuted.status).toBe('refuted');
    expect(refuted.observedOrder?.slope).toBeCloseTo(2, 9);
    // An extra resolution that throws, or lands exactly on the target, leaves the verdict and drops the fit.
    const throwing = runNumericWitness({ ...secondOrder, evaluate: (r) => (r === 80 ? (() => { throw new Error('no'); })() : 1 + 3 / (r * r)) });
    expect(throwing.status).toBe('checked');
    expect(throwing.observedOrder).toBeUndefined();
    const exact = runNumericWitness({ ...secondOrder, evaluate: (r) => (r === 80 ? 1 : 1 + 3 / (r * r)) });
    expect(exact.status).toBe('checked');
    expect(exact.observedOrder).toBeUndefined();
  });

  it('a spec with one extra resolution (n = 3) fits, and a slope’s standard error with one degree of freedom is reported as is', () => {
    const r = runNumericWitness({ ...secondOrder, orderResolutions: [40] });
    expect(r.observedOrder!.n).toBe(3);
    expect(r.observedOrder!.slope).toBeCloseTo(2, 9);
  });
});

describe('the registered witnesses and the artifact', () => {
  it('every registered spec that carries orderResolutions reports an order, and the artifact rows carry no observedOrder', async () => {
    const withOrder = WITNESS_REGISTRY.filter((w) => w.kind === 'numeric' && (w.spec.orderResolutions?.length ?? 0) > 0);
    for (const w of withOrder) {
      if (w.kind !== 'numeric') continue;
      const r = runNumericWitness(w.spec);
      expect(r.observedOrder, w.spec.id).toBeDefined();
      expect(r.observedOrder!.n, w.spec.id).toBe(2 + w.spec.orderResolutions!.length);
    }
    const artifact = await runWitnessRegistry(WITNESS_REGISTRY.filter((w) => w.kind === 'numeric'), null);
    for (const row of artifact.results) expect('observedOrder' in row, row.witnessId).toBe(false);
  });
});
