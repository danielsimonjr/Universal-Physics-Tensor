/**
 * The long GL4 tests take their scope from ONE switch, `GL4_LONG=1`, which the nightly
 * `long-tests` job sets (`.github/workflows/ci.yml`).
 *
 * Before this helper, `conserved-charge-mercury.test.ts` read `GL4_LONG_ORBITS`/`GL4_LONG_STEPS`
 * with defaults of 2 and 2000 and a comment promising "the full 10-orbit test via env override";
 * nothing set those variables, so the nightly ran the 2-orbit scope and the comment described a
 * run that never happened. The scope is now derived from `GL4_LONG`, and the two variables stay
 * as explicit overrides for a hand run.
 */
import { describe, expect, it } from 'vitest';
import { gl4LongScope } from '../helpers/gl4-long.js';

const MERCURY = { short: { orbits: 2, steps: 2000 }, long: { orbits: 10, steps: 10000 } };

describe('gl4LongScope', () => {
  it('is the short scope when GL4_LONG is unset', () => {
    expect(gl4LongScope(MERCURY, {})).toEqual({ orbits: 2, steps: 2000 });
    expect(gl4LongScope(MERCURY, { GL4_LONG: '0' })).toEqual({ orbits: 2, steps: 2000 });
  });

  it('is the long scope when GL4_LONG=1, with no other variable set', () => {
    expect(gl4LongScope(MERCURY, { GL4_LONG: '1' })).toEqual({ orbits: 10, steps: 10000 });
  });

  it('an explicit GL4_LONG_ORBITS or GL4_LONG_STEPS overrides either scope', () => {
    expect(gl4LongScope(MERCURY, { GL4_LONG: '1', GL4_LONG_ORBITS: '3' })).toEqual({ orbits: 3, steps: 10000 });
    expect(gl4LongScope(MERCURY, { GL4_LONG_STEPS: '500' })).toEqual({ orbits: 2, steps: 500 });
  });

  it('a non-numeric or non-positive override is an error, not a silent NaN', () => {
    expect(() => gl4LongScope(MERCURY, { GL4_LONG_ORBITS: 'ten' })).toThrow(/GL4_LONG_ORBITS/);
    expect(() => gl4LongScope(MERCURY, { GL4_LONG_STEPS: '0' })).toThrow(/GL4_LONG_STEPS/);
  });
});
