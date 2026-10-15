/**
 * `upt probe` help says the native enumerator also fits a rational power law.
 *
 * `generateNative` (src/composition/probe/generator.ts) emits, when the governing variables
 * leave dimensionless groups and the problem has exploratory rows, the power law
 * `base · Π πₖ^{pₖ/qₖ}` that `powerLawDetermination` (src/composition/probe/power-law.ts) fits on
 * THOSE rows only, and states an exponent that is no small fraction as a negative result. The
 * help described `run` as a bounded native search and did not say so.
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

describe('upt probe help names the power-law fit', () => {
  it('says the native enumerator fits a rational power law of the π-groups on the exploratory rows', async () => {
    const cap = capture();
    expect(await runCli(['help', 'probe'], cap.io)).toBe(0);
    const text = cap.lines.join('').replace(/\s+/g, ' ');
    expect(text).toMatch(/native enumerator also fits a rational power law of the π-groups[^.]*on the exploratory rows only/);
    expect(text).toMatch(/holdout rows are never fitted/);
  });
});
