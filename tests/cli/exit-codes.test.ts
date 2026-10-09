/**
 * A check that runs and fails exits 3 (persona finding F2, 2026-09-25; BREAKING in 0.47.0).
 *
 * `derive` with a dimension mismatch, `map --equation` with a mismatch, and `path` with a violated
 * regime or horizon all printed the failure and exited 0, so a script could not tell a failed check
 * from a passed one. The convention now: 0 success, 1 runtime error, 2 usage error, 3 the command
 * ran and its check came out negative. A path or regime UNKNOWN (a coordinate not
 * supplied) is not a failure: it stays 0. A map equation whose catalog target
 * was compared through an unresolved name exits 3. A derive that is not a
 * unique monomial exits 3.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

async function code(args: string[]): Promise<number> {
  const sink = () => {};
  return runCli(args, { out: sink, err: sink, write: sink });
}

describe('exit 3: the check ran and failed', () => {
  it('derive: the formula dimension differs from the target', async () => {
    expect(await code(['derive', 'period:time', 'length:length', 'gravity:acceleration', '--formula', '2*pi*sqrt(gravity/length)'])).toBe(3);
  });
  it('derive: the formula differs from the canonical equation by a constant factor', async () => {
    expect(await code(['derive', 'period:time', 'length:length', 'gravity:acceleration', '--formula', 'pi*sqrt(length/gravity)'])).toBe(3);
  });
  it('map --equation: the right-hand side has the wrong dimension', async () => {
    expect(await code(['map', '--equation', 'period = 2*pi*sqrt(gravity/length)'])).toBe(3);
  });
  it('map --equation: the equation differs from the canonical one by a factor', async () => {
    expect(await code(['map', '--equation', 'period = pi*sqrt(length/gravity)'])).toBe(3);
  });
  it('path: the regime is violated at the --at point', async () => {
    expect(await code(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.8', 'T0=1', 't=1'])).toBe(3);
  });
  it('path: a horizon is violated', async () => {
    expect(await code(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=1000'])).toBe(3);
  });
  it('the --json envelope exits 3 too', async () => {
    expect(await code(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.8', 'T0=1', 't=1', '--json'])).toBe(3);
  });
});

describe('exit 0: the check passed, or could not run', () => {
  it('derive: the formula is right', async () => {
    expect(await code(['derive', 'period:time', 'length:length', 'gravity:acceleration', '--formula', '2*pi*sqrt(length/gravity)'])).toBe(0);
  });
  it('map --equation: the equation agrees with the canonical one', async () => {
    expect(await code(['map', '--equation', 'period = 2*pi*sqrt(length/gravity)'])).toBe(0);
  });
  it('path: every regime and horizon holds', async () => {
    expect(await code(['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.2', 'T0=1', 't=10'])).toBe(0);
  });
  it('path: UNKNOWN (no --at) is not a failure', async () => {
    expect(await code(['path', 'model-pendulum', 'model-spring'])).toBe(0);
  });
  it('path: a no-composite-claim is an answer, not a failure', async () => {
    // model-rlc → model-first-order: exact then approximation, a silent cell (pendulum → lc composes since 2026-09-27).
    expect(await code(['path', 'model-rlc', 'model-first-order'])).toBe(0);
  });
  it('regime exits 3 when a record is VIOLATED, and 0 when the survey is unchecked', async () => {
    expect(await code(['regime', 'oscillators', '--at', 'theta0=0.8'])).toBe(3);
    expect(await code(['regime', 'oscillators'])).toBe(0);
  });
});

describe('an unresolved name on a catalog target is not a passed check', () => {
  it('map --equation with an unresolved name exits 3', async () => {
    expect(await code(['map', '--equation', 'period = uu / gravity'])).toBe(3);
  });
});

// `path --at` resolves group spellings and parameter-derived groups the same way as `upt regime`
// (landed in F1, e9a90c5). With exit 3, that matters more: a spelling the path could not resolve
// would read as an unchecked regime, or, worse, feed a wrong value, and a false VIOLATED now fails
// a script. Every spelling of the same point must give the same verdict and the same exit code.
describe('path --at: every spelling of a point gives the same verdict', () => {
  const spellings = (eps: number): string[][] => [
    [`tau · D · q^2=${eps}`],
    [`tau*D*q^2=${eps}`],
    ['tau=1', `D=${eps}`, 'q=1'],
  ];
  it('ε = 1 (outside ε ≤ 0.05): all three spellings exit 3', async () => {
    for (const at of spellings(1)) {
      expect(await code(['path', 'model-telegraph', 'model-fick', '--at', ...at]), at.join(' ')).toBe(3);
    }
  });
  it('ε = 0.02 (inside): all three spellings exit 0', async () => {
    for (const at of spellings(0.02)) {
      expect(await code(['path', 'model-telegraph', 'model-fick', '--at', ...at]), at.join(' ')).toBe(0);
    }
  });
});

describe('Kerr geodesic values', () => {
  it('a non-positive mass is a bad value and exits 1', async () => {
    expect(await code(['metric', 'kerr', '--geodesic', 'M=0', 'r=1e8'])).toBe(1);
    expect(await code(['metric', 'kerr', '--geodesic', 'M=-1', 'r=1e8'])).toBe(1);
  });
  it('|a| above GM/c² is a bad value and exits 1', async () => {
    expect(await code(['metric', 'kerr', '--geodesic', 'a=2000', 'r=1e8'])).toBe(1);
  });
  it('a missing metric name stays a usage error and exits 2', async () => {
    expect(await code(['metric'])).toBe(2);
  });
  it('a Kerr finite-difference refusal is a bad value and exits 1', async () => {
    expect(await code(['metric', 'kerr', '--geodesic', 'a=1e9', 'r=1e8'])).toBe(1);
  });
  it('a spin inside the bound still exits 0', async () => {
    expect(await code(['metric', 'kerr', '--geodesic', 'a=1000', 'r=1e8'])).toBe(0);
  });
});
