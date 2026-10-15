/**
 * The closed-form `deltaAt` bounds must keep their precision in the limit the
 * bridge describes. Each is a difference of nearly equal numbers
 * (`√(1 + r²) − 1`, `(1 − √(1 − 4ε))/(2ε)`), and written naively it cancels
 * catastrophically exactly where the approximation is good: a bound that
 * returns 0, or a value BELOW the true error, is not a bound. The second
 * method is MathTS core `BigNumber` at 50 digits, which has no cancellation at
 * these sizes.
 */
import { BigNumber } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import { telegraphSlowRateExcess } from '../../src/atlas/diffusion/numerics.js';
import { kgNonrelativisticError, kleinGordonPhaseError, stiffStringPhaseError } from '../../src/atlas/waves/numerics.js';

BigNumber.config({ precision: 50 });
const big = (x: number): BigNumber => BigNumber.fromNumber(x);
const one = big(1);

/** √(1 + s) − 1 at 50 digits. */
function sqrtOnePlusMinusOne(s: number): number {
  return one.add(big(s)).sqrt().sub(one).toNumber();
}

/** |(√(1 + x²) − 1)/(x²/2) − 1| at 50 digits. */
function nonrelativisticReference(x: number): number {
  const x2 = big(x).mul(big(x));
  const num = one.add(x2).sqrt().sub(one);
  return num.div(x2.div(big(2))).sub(one).abs().toNumber();
}

/** (1 − √(1 − 4ε))/(2ε) − 1 at 50 digits. */
function telegraphReference(eps: number): number {
  const e = big(eps);
  const root = one.sub(big(4).mul(e)).sqrt();
  return one.sub(root).div(big(2).mul(e)).sub(one).toNumber();
}

const closeAndNotBelow = (value: number, reference: number): void => {
  expect(reference).toBeGreaterThan(0);
  expect(Math.abs(value / reference - 1)).toBeLessThan(1e-9);
  // A bound stated as the exact error must not fall below it by more than rounding.
  expect(value).toBeGreaterThanOrEqual(reference * (1 - 1e-12));
};

describe('closed-form bounds keep their precision in their own limit', () => {
  it('the Klein–Gordon phase error at ω₀/(ck) = 1e-8 and 1e-7', () => {
    for (const r of [1e-8, 1e-7, 1e-4, 0.3]) {
      closeAndNotBelow(kleinGordonPhaseError(r, 1, 1), sqrtOnePlusMinusOne(r * r));
    }
  });

  it('the stiff-string phase error at β = 1e-16 and 1e-10', () => {
    for (const beta of [1e-16, 1e-10, 1e-3, 0.25]) {
      closeAndNotBelow(stiffStringPhaseError(1, beta, 1), sqrtOnePlusMinusOne(beta));
    }
  });

  it('the non-relativistic kinetic error at x = 1e-3 and 1e-6', () => {
    for (const x of [1e-6, 1e-3, 0.05, 0.5]) {
      closeAndNotBelow(kgNonrelativisticError(x), nonrelativisticReference(x));
    }
  });

  it('the telegraph slow-rate ratio minus one at ε = 1e-9 and 1e-7', () => {
    for (const eps of [1e-9, 1e-7, 1e-3, 0.2]) {
      closeAndNotBelow(telegraphSlowRateExcess(eps, 1, 1), telegraphReference(eps));
    }
  });
});
