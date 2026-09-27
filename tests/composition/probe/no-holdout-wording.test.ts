/**
 * A search with no holdout rows says so, instead of claiming that no candidate
 * survived a holdout that was never run (audit I19).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { searchProblemFromFile, type ProblemFile } from '../../../src/composition/probe/problem.js';
import { runProbeSearch } from '../../../src/composition/probe/pipeline.js';

const here = dirname(fileURLToPath(import.meta.url));
const pendulum = JSON.parse(
  readFileSync(join(here, '../../fixtures/discovery/pendulum-scaling/public/problem.json'), 'utf8'),
) as ProblemFile & { holdout?: unknown };

describe('runProbeSearch — no holdout rows', () => {
  it('reports that nothing was tested on withheld data, not that nothing survived it', async () => {
    const { holdout: _h, ...exploratoryOnly } = pendulum;
    const r = await runProbeSearch(searchProblemFromFile(exploratoryOnly), { now: '2026-01-01T00:00:00Z' });
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.wording.join('\n')).not.toMatch(/survived holdout/);
    expect(r.wording.join('\n')).toMatch(/no holdout observations/);
  });

  it('with a holdout that every candidate fails, still says no candidate survived it', async () => {
    const hold = pendulum.holdout as { rows: Record<string, number>[] };
    const broken = {
      ...pendulum,
      holdout: { ...hold, rows: hold.rows.map((r) => ({ ...r, period: r.period! * 3 })) },
    };
    const r = await runProbeSearch(searchProblemFromFile(broken), { now: '2026-01-01T00:00:00Z' });
    expect(r.stopReason).toBe('no-credible-candidate');
    expect(r.wording.join('\n')).toMatch(/no candidate survived holdout/);
  });
});
