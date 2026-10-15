/**
 * `upt derive` names which exponent differs on a form mismatch.
 *
 * `compareWithCanonical` fits `log(yours/canonical)` on the logs of the variables when the ratio
 * is not constant, and stores the fit as `exponentDifference`; the JSON envelope carried it, and
 * the text printed only "differs in FORM". The text now prints `describeExponentDifference`
 * beneath that line. `v²/2` against the canonical kinetic energy `m v²/2` differs by `mass^-1`,
 * and the fit is exact (R² = 1).
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

async function derive(formula: string) {
  const cap = capture();
  const code = await runCli(['derive', 'kinetic-energy:energy', 'mass:mass', 'speed:velocity', '--formula', formula], cap.io);
  return { code, stdout: cap.lines.join('') };
}

describe('upt derive prints the exponent difference of a form mismatch', () => {
  it('v²/2 against the kinetic energy: the difference is mass^-1, R² = 1', async () => {
    const r = await derive('speed^2/2');
    expect(r.code).toBe(3);
    const lines = r.stdout.split('\n');
    const i = lines.findIndex((l) => l.includes('differs in FORM from CE-kinetic-energy'));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(lines[i + 1]).toBe(
      '      yours/canonical ∝ mass^-1 (R² = 1): the difference is a monomial in these variables',
    );
  });

  it('a matching formula prints no difference line', async () => {
    const r = await derive('mass*speed^2/2');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('agrees with CE-kinetic-energy');
    expect(r.stdout).not.toContain('yours/canonical ∝');
  });
});
