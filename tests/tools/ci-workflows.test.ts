/**
 * The GitHub workflows, read as data.
 *
 * Each rule below names the defect it keeps out:
 * - publish.yml once ran the full suite twice (`bun run test`, then `npm publish` →
 *   `prepublishOnly` → `validate` → `npm test`). One run, through `prepublishOnly`, which is the
 *   packaging gate TOOLS.md names.
 * - ci.yml's test job once compiled src three times (`build`, `typecheck`'s `tsc --noEmit`, then
 *   `test`'s `pretest`) and ran the probe suite twice (`test`, then `test:probe-coverage`). The
 *   job compiles src once, typechecks the tests project once, and runs vitest once with coverage,
 *   whose thresholds in vitest.config.ts are the probe gate.
 * - Third-party actions are pinned to a commit, not a movable tag, the way setup-bun already was.
 * - The nightly long-tests job sets GL4_LONG, which the long numerical tests read.
 * - The code-docs ratchet runs on pushes to master as well as on pull requests, so a direct push
 *   (the recorded workflow for local work) does not bypass it.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

interface Step {
  readonly name?: string;
  readonly uses?: string;
  readonly run?: string;
  readonly env?: Record<string, string>;
  readonly if?: string;
}
interface Job {
  readonly if?: string;
  readonly steps: readonly Step[];
}
interface Workflow {
  readonly jobs: Record<string, Job>;
}

const read = (name: string): Workflow =>
  load(readFileSync(resolve(root, '.github/workflows', name), 'utf8')) as Workflow;

const ci = read('ci.yml');
const publish = read('publish.yml');
const steps = (wf: Workflow): Step[] => Object.values(wf.jobs).flatMap((j) => j.steps);
const runs = (job: Job): string[] => job.steps.map((s) => s.run ?? '').filter((r) => r !== '');

describe('publish.yml runs the suite once', () => {
  it('has no explicit test step: prepublishOnly (validate) is the one run', () => {
    const explicit = runs(publish.jobs.publish!).filter((r) => /\b(bun run test|npm test|vitest)\b/.test(r));
    expect(explicit).toEqual([]);
  });

  it('still demands the peers on the one run that happens inside npm publish', () => {
    const pub = publish.jobs.publish!.steps.find((s) => /npm publish/.test(s.run ?? ''));
    expect(pub).toBeDefined();
    expect(pub!.env?.UPT_REQUIRE_PEERS).toBe('1');
  });

  it('cites the persona-session record under its current path', () => {
    const text = readFileSync(resolve(root, '.github/workflows/publish.yml'), 'utf8');
    expect(text).not.toMatch(/docs\/dogfood\//);
    expect(text).toMatch(/docs\/persona-sessions\/2026-10-01-library-api\.md/);
  });
});

describe('ci.yml test job compiles once and runs the probe suite once', () => {
  const job = ci.jobs.test!;
  it('builds, typechecks only the tests project, and runs vitest directly with coverage', () => {
    const r = runs(job);
    expect(r).toContain('bun run build');
    expect(r).toContain('bun run typecheck:tests');
    expect(r.filter((x) => /\btsc\b|bun run typecheck$/.test(x))).toEqual([]);
    expect(r.filter((x) => /test:probe-coverage/.test(x))).toEqual([]);
    const suite = r.filter((x) => /vitest run/.test(x));
    expect(suite).toHaveLength(1);
    expect(suite[0]).toMatch(/--coverage/);
    // `bun run test` would re-enter `pretest` (tsc) and compile src a second time.
    expect(r.filter((x) => /^bun run test$/.test(x))).toEqual([]);
  });
});

describe('ci.yml and publish.yml pin third-party actions to a commit', () => {
  it('every `uses:` names a 40-hex commit and a version comment', () => {
    const text = (name: string) => readFileSync(resolve(root, '.github/workflows', name), 'utf8');
    for (const name of ['ci.yml', 'publish.yml']) {
      const uses = [...text(name).matchAll(/^\s*(?:- )?uses:\s*(\S+)(.*)$/gm)];
      expect(uses.length).toBeGreaterThan(0);
      for (const [, ref, rest] of uses) {
        expect(ref, `${name}: ${ref}`).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);
        expect(rest, `${name}: ${ref} needs a "# vX.Y.Z" comment`).toMatch(/#\s*v\d/);
      }
    }
  });

  it('every job that installs with Bun restores Bun\'s install cache first', () => {
    for (const [name, job] of Object.entries({ ...ci.jobs, ...publish.jobs })) {
      const installs = job.steps.findIndex((s) => /bun install/.test(s.run ?? ''));
      if (installs === -1) continue;
      const cache = job.steps.findIndex((s) => /^actions\/cache@/.test(s.uses ?? ''));
      expect(cache, `${name}: a cache step before bun install`).toBeGreaterThanOrEqual(0);
      expect(cache, `${name}: cache precedes install`).toBeLessThan(installs);
    }
  });
});

describe('ci.yml long-tests job', () => {
  it('sets GL4_LONG on the suite run, and the long numerical tests read that variable', () => {
    const suite = ci.jobs['long-tests']!.steps.find((s) => /vitest|bun run test/.test(s.run ?? ''));
    expect(suite?.env?.GL4_LONG).toBe('1');
    for (const file of ['tests/numerical/conserved-charge-mercury.test.ts', 'tests/numerical/gl4-integrator.test.ts']) {
      expect(readFileSync(resolve(root, file), 'utf8'), file).toMatch(/gl4LongScope|GL4_LONG/);
    }
  });
});

describe('ci.yml code-docs ratchet', () => {
  it('runs on a push to master as well as on a pull request', () => {
    const job = ci.jobs['code-docs-ratchet']!;
    expect(job.if).toMatch(/pull_request/);
    expect(job.if).toMatch(/push/);
    const check = job.steps.find((s) => /code-docs-ratchet\/check\.ts/.test(s.run ?? ''));
    expect(check?.run).toMatch(/github\.event\.before/);
  });
});

describe('no workflow runs the suite through `bun run test` twice', () => {
  it('each job runs at most one suite', () => {
    for (const [name, job] of Object.entries({ ...ci.jobs, ...publish.jobs })) {
      const suites = runs(job).filter((r) => /\bvitest run\b|\bbun run test\b|\bnpm test\b/.test(r));
      expect(suites.length, `${name}: ${suites.join(' | ')}`).toBeLessThanOrEqual(1);
    }
    expect(steps(ci).length).toBeGreaterThan(0);
  });
});
