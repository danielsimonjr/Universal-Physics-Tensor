/**
 * Plan task P5, RED (b): `runProbeSearch` with the opt-in `scalarSearch` option adds MathTS
 * scalar-search candidates, and without the option the result is unchanged. CI asserts that the
 * source ran and was recorded, not that the search finds a known relation.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runProbeSearch } from '../../../src/composition/probe/pipeline.js';
import { loadSearchProblemFromJson } from '../../../src/composition/probe/problem.js';

const here = dirname(fileURLToPath(import.meta.url));
const problemPath = join(here, '../../fixtures/discovery/pendulum-scaling/public/problem.json');
const pinned = { repositoryCommit: 'test', now: '2026-11-07T00:00:00.000Z' } as const;
const search = { seed: 7, maxEvaluations: 300, binary: ['*', '/'], unary: ['sqrt'], maxSize: 7 } as const;

describe('runProbeSearch scalarSearch option', () => {
  it('adds candidates whose origin is the MathTS scalar search, and records the source', async () => {
    const problem = loadSearchProblemFromJson(problemPath);
    const result = await runProbeSearch(problem, { ...pinned, scalarSearch: search });
    const fromSearch = result.candidates.filter(
      (c) => c.origin.kind === 'external-backend' && c.origin.backendId === 'mathts-scalar-search',
    );
    expect(fromSearch.length).toBeGreaterThan(0);
    expect(result.manifest.backendDescriptors?.some((d) => d.backendId === 'mathts-scalar-search')).toBe(true);
  });

  it('leaves the result unchanged when the option is absent', async () => {
    const problem = loadSearchProblemFromJson(problemPath);
    const a = await runProbeSearch(problem, pinned);
    const b = await runProbeSearch(problem, { ...pinned, scalarSearch: undefined });
    expect(b).toEqual(a);
    expect(a.manifest.backendDescriptors?.map((d) => d.backendId)).toEqual(['native']);
    expect(a.candidates.some((c) => c.origin.kind === 'external-backend')).toBe(false);
    expect(a.wording.some((w) => w.startsWith('scalar search'))).toBe(false);
  });

  it('accepts log (lowered to log10) and abstains with a note when the observable column is missing', async () => {
    const problem = loadSearchProblemFromJson(problemPath);
    const ok = await runProbeSearch(problem, { ...pinned, scalarSearch: { ...search, unary: ['log'] } });
    expect(ok.wording.some((w) => w.startsWith('scalar search abstained'))).toBe(false);
    const broken = { ...problem, exploratory: { ...problem.exploratory!, observable: 'no-such-column' } };
    const r = await runProbeSearch(broken, { ...pinned, scalarSearch: search });
    expect(r.wording.some((w) => /^scalar search abstained: .*no-such-column/.test(w))).toBe(true);
  });

  it('refuses a grammar that lists a function with no UPT form', async () => {
    const problem = loadSearchProblemFromJson(problemPath);
    await expect(
      runProbeSearch(problem, { ...pinned, scalarSearch: { ...search, unary: ['atan'] } }),
    ).rejects.toThrow(/'atan' has no UPT form/);
  });
});
