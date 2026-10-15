/**
 * `upt discover` prints the magnitude falsifier's strength beside "orders apart".
 *
 * The funnel computes `magnitudeP = 2·Φ(−ordersApart/√(σa² + σb²))` for every pair whose
 * magnitude gate ran, and only the JSON carried it. The MAGNITUDE-CLASH text now prints it on
 * each row, and the section header says what it is: the strength of the falsifier at the
 * values' stated uncertainty, not a credibility score. A p that underflows a double prints as
 * `p < 1e-300`, never `p = 0`.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { json, run } from '../helpers/cli-run.js';
import { formatQuantity } from '../../dist/composition/explain.js';

interface Row {
  readonly a: string;
  readonly b: string;
  readonly verdict: string;
  readonly ordersApart: number | null;
  readonly magnitudeP?: number | null;
}

describe('upt discover prints magnitudeP on the clash rows', () => {
  it('each MAGNITUDE-CLASH row prints its p, labelled as strength and not credibility', async () => {
    const text = (await run(['discover', '--source=canonical'])).stdout;
    const env = (await json(['discover', '--source=canonical'])) as { result: Row[] };
    const clash = env.result.filter((r) => r.verdict === 'magnitude-clash');
    expect(clash.length).toBeGreaterThan(5);
    const section = text.split('MAGNITUDE-CLASH')[1]!.split('\n\n')[0]!;
    expect(section.split('\n')[0]).toMatch(/p is the falsifier's strength .*not a credibility score/);
    for (const r of clash) {
      const line = section.split('\n').find((l) => l.trimStart().startsWith(`${r.a} ≟ ${r.b} `));
      expect(line, `${r.a} ≟ ${r.b}`).toBeDefined();
      const p = r.magnitudeP!;
      expect(typeof p).toBe('number');
      const shown = p === 0 ? 'p < 1e-300' : `p = ${formatQuantity(p, 3)}`;
      expect(line, `${r.a} ≟ ${r.b}`).toContain(`orders apart, ${shown}`);
      expect(line).not.toMatch(/p = 0(?![.\d])/);
    }
  });
});
