/**
 * Command text that names a repository file names the GitHub blob URL.
 * The published package does not contain docs/, tests/, or data/.
 *
 * A line that contains the relative path and does not contain the blob
 * prefix is the failure this file exists to catch.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { publishedUrl } from '../../src/cli/published-url.js';

const ORPHAN = 'docs/research/Orphan-Connector-Analysis.md';
const LINKAGE = 'docs/research/Linkage-Candidate-Proposals.md';
const AXES = 'docs/research/rank7-axis-measurement.md';
const PROBE = 'tests/fixtures/probe-study';
const WITNESS = 'data/atlas/witness-results.json';
const LIMITS = 'tests/atlas/oscillators-limits.test.ts';
const DESIGN = 'docs/planning/Bridge-Discovery-Pipeline-Design.md';
const ADR = 'docs/planning/ADR-transported-norm-composition.md';
const PHASE1 = 'docs/planning/Atlas-Phase-1-Design.md';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    text: () => lines.join(''),
    err: () => err.join(''),
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

function assertCited(text: string, repoPath: string): void {
  const url = publishedUrl(repoPath);
  expect(text).toContain(url);
  for (const line of text.split('\n')) {
    if (line.includes(repoPath) && !line.includes(url)) {
      throw new Error(`bare repository path:\n${line}`);
    }
  }
}

describe('publishedUrl', () => {
  it('is the master blob URL of a repository path', () => {
    expect(publishedUrl(ORPHAN)).toBe(
      'https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/master/docs/research/Orphan-Connector-Analysis.md',
    );
  });
});

describe('commands cite GitHub, not a repository path', () => {
  it('upt connectors cites the orphan-connector analysis', async () => {
    const cap = capture();
    expect(await runCli(['connectors'], cap.io)).toBe(0);
    assertCited(cap.text(), ORPHAN);
  });

  it('upt candidates cites the linkage proposals', async () => {
    const cap = capture();
    expect(await runCli(['candidates'], cap.io)).toBe(0);
    assertCited(cap.text(), LINKAGE);
  });

  it('upt axes cites the rank-7 measurement', async () => {
    const cap = capture();
    expect(await runCli(['axes'], cap.io)).toBe(0);
    assertCited(cap.text(), AXES);
  });

  it('upt help probe cites the synthetic-control directory', async () => {
    const cap = capture();
    expect(await runCli(['help', 'probe'], cap.io)).toBe(0);
    assertCited(cap.text(), PROBE);
  });

  it('upt help discover cites each adjudication source', async () => {
    const cap = capture();
    expect(await runCli(['help', 'discover'], cap.io)).toBe(0);
    assertCited(cap.text(), 'docs/research/proposed-equations-adjudication.md');
    assertCited(cap.text(), 'docs/research/orphan-connector-adjudication.md');
    expect(cap.text()).not.toContain('docs/research/*-adjudication.md');
  });

  it('upt help confront cites files as GitHub URLs', async () => {
    const cap = capture();
    expect(await runCli(['help', 'confront'], cap.io)).toBe(0);
    expect(cap.text()).toContain('GitHub URL of the file');
    expect(cap.text()).not.toMatch(/cites a repository file/);
  });

  it('upt confront prints each source file as a GitHub URL', async () => {
    const cap = capture();
    expect(await runCli(['confront', 'be-52'], cap.io)).toBe(0);
    assertCited(cap.text(), 'data/confrontation-sources.md');
  });

  it('upt atlas names the witness artifact and the test as URLs', async () => {
    const stokes = capture();
    expect(await runCli(['atlas', 'ab-stokes-einstein'], stokes.io)).toBe(0);
    assertCited(stokes.text(), WITNESS);
    assertCited(stokes.text(), 'tests/atlas/witness-results.test.ts');
    expect(stokes.text()).not.toContain('bunx vitest');
    const pendulum = capture();
    expect(await runCli(['atlas', 'ab-pendulum-linear'], pendulum.io)).toBe(0);
    assertCited(pendulum.text(), LIMITS);
    expect(pendulum.text()).not.toContain('bunx vitest');
  });

  it('upt atlas --json uses the same URLs', async () => {
    const cap = capture();
    expect(await runCli(['atlas', 'ab-pendulum-linear', '--json'], cap.io)).toBe(0);
    const body = JSON.parse(cap.text());
    expect(body.epistemics).toContain(publishedUrl(WITNESS));
    const tests = (body.result.witnesses as { test: string }[]).map((w) => w.test);
    expect(tests).toContain(publishedUrl(LIMITS));
    expect(JSON.stringify(body)).not.toContain('bunx vitest');
  });

  it('upt map --stored labels the artifact with its URL', async () => {
    const cap = capture();
    expect(await runCli(['map', '--route=model-spring,model-lc', '--stored'], cap.io)).toBe(0);
    assertCited(cap.text(), WITNESS);
    const json = capture();
    expect(await runCli(['map', '--route=model-spring,model-lc', '--stored', '--json'], json.io)).toBe(0);
    const body = JSON.parse(json.text());
    expect(body.result.witnessResults.provenance.url).toBe(publishedUrl(WITNESS));
    expect(body.result.witnessResults.provenance.path).toBeUndefined();
  });

  it('upt help map and upt help atlas cite the artifact', async () => {
    for (const cmd of ['map', 'atlas']) {
      const cap = capture();
      expect(await runCli(['help', cmd], cap.io)).toBe(0);
      assertCited(cap.text(), WITNESS);
    }
  });

  it('upt chain still cites the design through the same helper', async () => {
    const cap = capture();
    expect(await runCli(['chain'], cap.io)).toBe(2);
    assertCited(cap.err(), DESIGN);
  });

  it('a route refusal cites the planning notes as URLs', async () => {
    const heat = capture();
    expect(await runCli(['path', 'model-telegraph', 'model-heat'], heat.io)).toBe(0);
    assertCited(heat.text(), ADR);
    const rlc = capture();
    expect(await runCli(['path', 'model-rlc', 'model-first-order'], rlc.io)).toBe(0);
    assertCited(rlc.text(), PHASE1);
  });
});
