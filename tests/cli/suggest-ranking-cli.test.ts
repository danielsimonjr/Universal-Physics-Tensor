/**
 * What the user sees from the one "did you mean?" ranking (0.47.0 persona findings N2 and N5).
 * In-process against the built CLI (dist/cli/main.js). The ranking itself is pinned in
 * tests/composition/suggest-ranking.test.ts.
 */
import '../helpers/dist.js';
import { runText } from '../helpers/cli-run.js';
import { describe, it, expect } from 'vitest';

describe('upt map and upt explain rank suggestions by edit distance first', () => {
  it('map: the typo `lenght` suggests `length` first (by its inferred dimension)', async () => {
    const r = await runText(['map', '--equation', 'period = 2*pi*sqrt(lenght/gravity)']);
    expect(r.code).toBe(3);
    expect(r.text).toMatch(/'lenght' is unknown — by its inferred dimension, did you mean: length,/);
  });

  it('explain: `hawkng-temperature` suggests `hawking-temperature` first', async () => {
    const r = await runText(['explain', 'hawkng-temperature']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/did you mean: hawking-temperature/);
  });
});
