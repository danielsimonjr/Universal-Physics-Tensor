/**
 * Extra branch coverage for Product B modules.
 */
import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TIME,
  LENGTH,
  ACCELERATION,
  DIMENSIONLESS,
} from '../../../src/dimensional/types.js';
import { sym } from '../../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../../src/dimensional/ast-types.js';
import {
  countAstNodes,
  countOperators,
  complexityOf,
  fingerprintExpr,
} from '../../../src/composition/probe/fingerprint.js';
import { generateNative, monomialToExpr } from '../../../src/composition/probe/generator.js';
import { openBudget, DEFAULT_SEARCH_BUDGET } from '../../../src/composition/probe/search-budget.js';
import {
  makeResidualGap,
  searchProblemFromFile,
  parseExprJson,
  loadSearchProblemFromJson,
} from '../../../src/composition/probe/problem.js';
import { problemFromResidualGap, scanFrontier } from '../../../src/composition/probe/frontier.js';
import { runProbeSearch } from '../../../src/composition/probe/pipeline.js';
import {
  formatProbeReport,
  formatFrontierScan,
  formatFrontierGap,
} from '../../../src/composition/probe/report.js';
import { CATALOG_GRAPH } from '../../../src/composition/catalog-graph.js';
import {
  asDatasetSafe,
  loadSplitDatasetsFromJson,
  loadDatasetFromCsv,
  loadSplitCsv,
  datasetFromRows,
} from '../../../src/composition/probe/dataset.js';
import { runFalsification } from '../../../src/composition/probe/falsify.js';
import { checkDeclaredLimit } from '../../../src/composition/probe/limits.js';
import { scalarDiscrepancy } from '../../../src/composition/probe/residual.js';
import { fitPrefactor } from '../../../src/composition/probe/fit.js';
import {
  detectMeanChangepoint,
  estimateScaleExponent,
  probeConservation,
} from '../../../src/composition/probe/structure.js';
import { runBackendWorker, type WorkerLauncher } from '../../../src/composition/probe/backend-protocol.js';
import { REAL_WORKER_HANG_GUARD_MS } from './worker-hang-guard.js';
import { canTransition } from '../../../src/composition/probe/candidate-store.js';
import { compareToCorpus } from '../../../src/composition/probe/corpus.js';
import { BRIDGE_RHS_BY_ID } from '../../../src/bridges/rhs-registry.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('fingerprint extra node kinds', () => {
  it('counts transcendental, abs, integral, derivative, variational', () => {
    const x = sym('x', DIMENSIONLESS);
    const trans: ExprNode = { kind: 'transcendental', fn: 'exp', arg: x };
    const ab: ExprNode = { kind: 'abs', arg: x };
    const delta: ExprNode = { kind: 'dirac-delta', arg: x };
    const integ: ExprNode = { kind: 'integral', integrand: x, over: x, lower: x, upper: x };
    const deriv: ExprNode = { kind: 'derivative', of: x, wrt: x };
    const varn: ExprNode = {
      kind: 'variational-derivative',
      functional: x,
      field: x,
      over: x,
    };
    expect(countAstNodes(trans)).toBe(2);
    expect(countAstNodes(ab)).toBe(2);
    expect(countAstNodes(delta)).toBe(2);
    expect(countAstNodes(integ)).toBeGreaterThan(3);
    expect(countAstNodes(deriv)).toBe(3);
    expect(countAstNodes(varn)).toBe(4);
    expect(countOperators(trans)).toBe(1);
    expect(countOperators(ab)).toBe(0);
    expect(countOperators(integ)).toBeGreaterThan(0);
    expect(countOperators(deriv)).toBe(1);
    expect(complexityOf(integ).astNodes).toBeGreaterThan(1);
    expect(fingerprintExpr(trans).dimensionalSignature).toBeTruthy();
  });
});

describe('generator corrections and budget skip', () => {
  it('emits an additive correction when a baseline is supplied', () => {
    const gap = makeResidualGap('fg-corr', 'corr', 'prediction-residual');
    const baseline = monomialToExpr({ length: 0.5, gravity: -0.5 }, [
      { name: 'period', dim: TIME },
      { name: 'length', dim: LENGTH },
      { name: 'gravity', dim: ACCELERATION },
    ]);
    const problem = {
      ...problemFromResidualGap(gap, { name: 'period', dim: TIME }, [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ]),
      baseline,
      discrepancy: { kind: 'additive' as const, observableIds: ['period'] },
    };
    const got = [...generateNative(problem, openBudget())];
    expect(got.some((c) => c.originNote.startsWith('correction:'))).toBe(true);
  });
  it('skips when the budget is already exhausted', () => {
    const gap = makeResidualGap('fg-corr2', 'corr');
    const problem = problemFromResidualGap(gap, { name: 'period', dim: TIME }, [
      { name: 'length', dim: LENGTH },
      { name: 'gravity', dim: ACCELERATION },
    ]);
    const state = openBudget({ ...DEFAULT_SEARCH_BUDGET, maxCandidates: 0 });
    expect([...generateNative(problem, state)]).toEqual([]);
  });
});

describe('report + frontier formatters', () => {
  it('formats empty and nonempty reports and gaps', async () => {
    const gaps = scanFrontier(CATALOG_GRAPH).slice(0, 2);
    expect(formatFrontierScan(gaps)).toMatch(/typed frontier/);
    expect(formatFrontierGap(gaps[0]!)).toContain(gaps[0]!.id);
    const searchable = {
      ...gaps[0]!,
      searchability: { searchable: true, reasons: ['ok'] },
    };
    expect(formatFrontierScan([searchable])).toMatch(/searchable/);
    const empty = await runProbeSearch({
      gap: {
        ...makeResidualGap('fg-empty', 'x'),
        searchability: { searchable: false, reasons: ['nope'] },
      },
      target: { name: 'period', dim: TIME },
      governing: [{ name: 'length', dim: LENGTH }],
    });
    expect(formatProbeReport(empty)).toMatch(/no candidates to rank/);
  });
});

describe('pipeline extra gates', () => {
  it('abstains when parametric status is non-identifiable', async () => {
    const gap = makeResidualGap('fg-ni', 'x');
    const problem = problemFromResidualGap(
      gap,
      { name: 'period', dim: TIME },
      [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ],
      datasetFromRows([{ length: 1, gravity: 9.81, period: 1 }], 'period', 'exploratory-fit'),
    );
    const blocked = {
      ...problem,
      gap: {
        ...problem.gap,
        identifiability: {
          kind: 'parametric' as const,
          parametric: { status: 'non-identifiable' as const, reasons: ['rank 0'] },
        },
      },
    };
    const r = await runProbeSearch(blocked);
    expect(r.stopReason).toBe('non-identifiable');
  });

  it('recovers a novel monomial into expert-review-required', async () => {
    const twoPi = 2 * Math.PI;
    const g = 9.81;
    const rows = [1, 2, 3, 4].map((L) => ({ L, g, period: twoPi * Math.sqrt(L / g) }));
    const hold = [1.5, 2.5].map((L) => ({ L, g, period: twoPi * Math.sqrt(L / g) }));
    const problem = problemFromResidualGap(
      makeResidualGap('fg-novel-pendulum', 'renamed vars'),
      { name: 'period', dim: TIME },
      [
        { name: 'L', dim: LENGTH },
        { name: 'g', dim: ACCELERATION },
      ],
      datasetFromRows(rows, 'period', 'exploratory-fit', 'e'),
      datasetFromRows(hold, 'period', 'validation-holdout', 'h'),
    );
    const r = await runProbeSearch(problem, { repositoryCommit: 'test' });
    expect(r.candidates.some((c) => c.status === 'expert-review-required')).toBe(true);
    expect(formatProbeReport(r)).toMatch(/RMSE/);
  });

  it('uses a failing backend without aborting the native enumerator', async () => {
    const problem = problemFromResidualGap(
      makeResidualGap('fg-backend', 'b'),
      { name: 'period', dim: TIME },
      [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ],
    );
    const r = await runProbeSearch(problem, {
      backendArgv: [
        process.execPath,
        join(here, '../../fixtures/discovery-workers/malformed-worker.mjs'),
      ],
      budget: { ...DEFAULT_SEARCH_BUDGET, maxWallClockMs: REAL_WORKER_HANG_GUARD_MS },
    });
    expect(r.wording.join(' ')).toMatch(/backend abstained: malformed NDJSON/);
  });

  it('ingests echo-worker candidates', async () => {
    const problem = problemFromResidualGap(
      makeResidualGap('fg-echo', 'b'),
      { name: 'period', dim: TIME },
      [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ],
    );
    const r = await runProbeSearch(problem, {
      backendArgv: [process.execPath, join(here, '../../fixtures/discovery-workers/echo-worker.mjs')],
      budget: { ...DEFAULT_SEARCH_BUDGET, maxWallClockMs: REAL_WORKER_HANG_GUARD_MS },
    });
    expect(r.candidates.some((c) => c.status === 'rejected')).toBe(true);
    expect(r.candidates.some((c) => c.status === 'heldout-supported' || c.status === 'expert-review-required')).toBe(false);
  });

  it('stops on candidate-limit mid-run', async () => {
    const problem = problemFromResidualGap(
      makeResidualGap('fg-lim', 'b'),
      { name: 'period', dim: TIME },
      [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ],
    );
    const r = await runProbeSearch(problem, {
      budget: { ...DEFAULT_SEARCH_BUDGET, maxCandidates: 1, maxWallClockMs: 60_000 },
    });
    expect(['candidate-limit', 'exhausted-space', 'no-credible-candidate']).toContain(r.stopReason);
  });

  it('rejects dimensionally invalid backend candidates', async () => {
    const problem = problemFromResidualGap(
      makeResidualGap('fg-inv', 'b'),
      { name: 'period', dim: TIME },
      [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ],
    );
    const r = await runProbeSearch(problem, {
      backendArgv: [
        process.execPath,
        join(here, '../../fixtures/discovery-workers/invalid-worker.mjs'),
      ],
      budget: { ...DEFAULT_SEARCH_BUDGET, maxWallClockMs: REAL_WORKER_HANG_GUARD_MS },
    });
    expect(r.rejections.length + r.candidates.filter((c) => c.status === 'rejected').length).toBeGreaterThan(
      0,
    );
  });

  it('rejects when exploratory observations cannot be fit', async () => {
    const problem = problemFromResidualGap(
      makeResidualGap('fg-nan', 'b'),
      { name: 'period', dim: TIME },
      [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ],
      datasetFromRows(
        [{ length: 1, gravity: 9.81, period: Number.NaN }],
        'period',
        'exploratory-fit',
      ),
    );
    const r = await runProbeSearch(problem);
    expect(r.candidates.some((c) => c.status === 'rejected')).toBe(true);
  });

  it('marks insufficient-evidence when exploratory exists but holdout does not', async () => {
    const problem = problemFromResidualGap(
      makeResidualGap('fg-noho', 'b'),
      { name: 'period', dim: TIME },
      [
        { name: 'length', dim: LENGTH },
        { name: 'gravity', dim: ACCELERATION },
      ],
      datasetFromRows([{ length: 1, gravity: 9.81, period: 2 }], 'period', 'exploratory-fit'),
    );
    const r = await runProbeSearch(problem);
    expect(
      r.candidates.some((c) => c.status === 'insufficient-evidence' || c.status === 'equivalent-known'),
    ).toBe(true);
  });
});

describe('dataset / problem error paths', () => {
  it('throws on malformed JSON datasets and CSVs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-ds-'));
    expect(() => asDatasetSafe(null, 'n')).toThrow(/not an object/);
    expect(() => asDatasetSafe({ observable: 'y' }, 'n')).toThrow(/rows/);
    expect(() => asDatasetSafe({ rows: [], observable: '' }, 'n')).toThrow(/observable/);
    expect(() => asDatasetSafe({ rows: [], observable: 'y', role: 'nope' }, 'n')).toThrow(/invalid role/);
    expect(() => asDatasetSafe({ rows: [1], observable: 'y', role: 'exploratory-fit' }, 'n')).toThrow(
      /not an object/,
    );
    expect(() =>
      asDatasetSafe({ rows: [{ y: 'x' }], observable: 'y', role: 'exploratory-fit' }, 'n'),
    ).toThrow(/finite/);
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ foo: 1 }));
    expect(() => loadSplitDatasetsFromJson(bad)).toThrow(/exploratory/);
    const obs = join(dir, 'obs.json');
    writeFileSync(obs, JSON.stringify({ observations: { rows: [{ y: 1 }], observable: 'y' } }));
    expect(loadSplitDatasetsFromJson(obs).exploratory?.rows[0]!.y).toBe(1);
    const csv = join(dir, 'only.csv');
    writeFileSync(csv, 'x\n');
    expect(() => loadDatasetFromCsv(csv, 'x', 'exploratory-fit')).toThrow(/header/);
    writeFileSync(csv, 'x,y\n1,nope\n');
    expect(() => loadDatasetFromCsv(csv, 'y', 'exploratory-fit')).toThrow(/finite/);
    writeFileSync(csv, 'x\n1\n');
    expect(() => loadDatasetFromCsv(csv, 'y', 'exploratory-fit')).toThrow(/missing observable/);
    const sc = join(dir, 'sc.csv');
    writeFileSync(sc, 'x\n');
    expect(() => loadSplitCsv(sc, 'x')).toThrow(/header/);
    writeFileSync(sc, 'x,y\n1,2\n');
    expect(() => loadSplitCsv(sc, 'y')).toThrow(/split column/);
    writeFileSync(sc, 'x,y,split\n1,nope,exploratory\n');
    expect(() => loadSplitCsv(sc, 'y')).toThrow(/finite/);
  });

  it('loads observationsPath and wrapped Expr JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-pr-'));
    const data = join(dir, 'd.json');
    writeFileSync(
      data,
      JSON.stringify({
        exploratory: {
          role: 'exploratory-fit',
          observable: 'period',
          rows: [{ length: 1, gravity: 9.81, period: 2 }],
        },
      }),
    );
    const p = searchProblemFromFile({
      gap: { id: 'fg-path', summary: 'via path' },
      target: { name: 'period', dim: 'time' },
      governing: [
        { name: 'length', dim: 'length' },
        { name: 'gravity', dim: 'acceleration' },
      ],
      observationsPath: data,
    });
    expect(p.exploratory?.rows).toHaveLength(1);
    expect(() =>
      searchProblemFromFile({
        gap: { kind: 'not-a-kind' },
        target: { name: 'period', dim: 'time' },
        governing: [],
      }),
    ).toThrow(/unknown gap kind/);
    const wrap = join(dir, 'e.json');
    writeFileSync(wrap, JSON.stringify({ expression: sym('x', DIMENSIONLESS) }));
    expect(parseExprJson(wrap).kind).toBe('symbol');
    writeFileSync(wrap, JSON.stringify({ nope: 1 }));
    expect(() => parseExprJson(wrap)).toThrow(/not an ExprNode/);
    const pendulum = join(here, '../../fixtures/discovery/pendulum-scaling/public/problem.json');
    expect(loadSearchProblemFromJson(pendulum).target.name).toBe('period');
  });

  it('resolves observationsPath relative to the problem file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-pr-rel-'));
    const data = join(dir, 'data.json');
    writeFileSync(
      data,
      JSON.stringify({
        exploratory: {
          role: 'exploratory-fit',
          observable: 'period',
          rows: [{ length: 1, gravity: 9.81, period: 2 }],
        },
      }),
    );
    const problemPath = join(dir, 'problem.json');
    writeFileSync(
      problemPath,
      JSON.stringify({
        gap: { id: 'fg-rel', summary: 'relative path' },
        target: { name: 'period', dim: 'time' },
        governing: [
          { name: 'length', dim: 'length' },
          { name: 'gravity', dim: 'acceleration' },
        ],
        observationsPath: './data.json',
      }),
    );
    expect(loadSearchProblemFromJson(problemPath).exploratory?.rows).toHaveLength(1);
  });
});

describe('falsify / limits / residual / fit extra branches', () => {
  it('records observational bounds and empty-limit datasets', () => {
    const expr = sym('1', DIMENSIONLESS);
    const r = runFalsification({
      expr,
      skipDimensional: true,
    });
    // The batteries that ran, and no battery that is inconclusive by construction.
    expect(r.records.map((b) => b.battery)).toEqual(['finiteness', 'limits']);
    const empty = datasetFromRows([], 'y', 'falsification-only');
    const lim = checkDeclaredLimit(expr, empty, 1, { id: 'l', regime: { a: 'b' } }, true);
    expect(lim.detail).toMatch(/no observations/);
    expect(() => scalarDiscrepancy(1, 1, 'standardized', 0)).toThrow(/sigma/);
    expect(() =>
      fitPrefactor(expr, datasetFromRows([{ y: 1 }], 'y', 'validation-holdout'), undefined),
    ).toThrow(/exploratory role/);
    expect(() =>
      fitPrefactor(expr, datasetFromRows([{ y: NaN }], 'y', 'exploratory-fit'), undefined),
    ).toThrow(/missing finite/);
    const ho = fitPrefactor(
      expr,
      datasetFromRows([{ y: 1 }], 'y', 'exploratory-fit'),
      datasetFromRows([], 'y', 'validation-holdout'),
    );
    expect(ho.holdoutRmse).toBeNull();
    const ds = datasetFromRows([{ y: 1e9 }], 'y', 'falsification-only');
    const failLim = runFalsification({
      expr,
      dataset: ds,
      limits: [{ id: 'lim', regime: { scale: 'classical' } }],
      claimedRegimes: { scale: 'classical' },
    });
    expect(failLim.records.some((b) => b.battery === 'limits' && b.outcome === 'fail')).toBe(true);
    const incon = runFalsification({
      expr,
      dataset: ds,
      limits: [{ id: 'lim', regime: { scale: 'classical' } }],
      claimedRegimes: { scale: 'quantum' },
    });
    expect(incon.records.some((b) => b.battery === 'limits' && b.outcome === 'inconclusive')).toBe(true);
  });
});

describe('structure abstentions', () => {
  it('abstains on weak changepoints, nonpositive pairs, degenerate x, zero dt', () => {
    const y = [1, 1.01, 1.02, 1.01, 1, 1.02, 1.01, 1];
    expect(detectMeanChangepoint({ x: y.map((_, i) => i), y }, 10).abstained).toBe(true);
    expect(estimateScaleExponent({ x: [-1, -2, -3], y: [1, 2, 3] }).abstained).toBe(true);
    expect(estimateScaleExponent({ x: [1, 1, 1], y: [1, 2, 3] }).abstained).toBe(true);
    expect(probeConservation([1, 2], [5, 5]).abstained).toBe(true);
  });
});

/**
 * A fake worker launcher for the failure paths. Once the harness closes stdin, the fake process
 * either exits (after optional stderr) or fails to start, on a microtask. A microtask runs before
 * any timer, so the result cannot depend on process start-up time or on the wall clock. A real
 * `node` child here once lost a race against its 1000 ms budget on a loaded host.
 */
function fakeWorker(outcome: { exitCode: number; stderr?: string } | { spawnError: string }) {
  const calls: Array<{ command: string; args: readonly string[] }> = [];
  const launch: WorkerLauncher = (command, args) => {
    calls.push({ command, args });
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: () => true,
      stdin: {
        write: () => true,
        end: () => {
          queueMicrotask(() => {
            if ('spawnError' in outcome) {
              child.emit('error', new Error(outcome.spawnError));
              return;
            }
            if (outcome.stderr) child.stderr.emit('data', Buffer.from(outcome.stderr));
            child.emit('close', outcome.exitCode, null);
          });
        },
      },
    });
    return child;
  };
  return { launch, calls };
}

describe('backend nonzero exit + store illegal transition', () => {
  const request = { problemId: 'fg', budgetMs: 1000, variables: [], target: 'y' };
  it('reports worker stderr on nonzero exit', async () => {
    const worker = fakeWorker({ exitCode: 2, stderr: 'boom\n' });
    const r = await runBackendWorker(['fake-worker', '--flag'], request, { spawn: worker.launch });
    expect(r).toEqual({ ok: false, candidates: [], error: 'boom' });
    expect(worker.calls).toEqual([{ command: 'fake-worker', args: ['--flag'] }]);
  });
  it('reports the exit code when a failing worker writes no stderr', async () => {
    const worker = fakeWorker({ exitCode: 2 });
    const r = await runBackendWorker(['fake-worker'], request, { spawn: worker.launch });
    expect(r).toEqual({ ok: false, candidates: [], error: 'worker exited 2' });
  });
  it('reports the launch error when the worker cannot start', async () => {
    const worker = fakeWorker({ spawnError: 'spawn fake-worker ENOENT' });
    const r = await runBackendWorker(['fake-worker'], request, { spawn: worker.launch });
    expect(r).toEqual({ ok: false, candidates: [], error: 'spawn fake-worker ENOENT' });
  });
  it('rejects illegal transitions', () => {
    expect(canTransition('generated', 'heldout-supported')).toBe(false);
  });
});

describe('corpus bridge-layer match', () => {
  it('matches a catalog RHS when one exists', () => {
    const first = [...BRIDGE_RHS_BY_ID.entries()][0];
    if (!first) return;
    const r = compareToCorpus(first[1], '0');
    expect(r.algebraicMatches.some((m) => m.id === `be-${first[0]}`)).toBe(true);
  });
});

describe('regime-transition gate', () => {
  it('abstains on regime-transition gaps', async () => {
    const gap = scanFrontier(CATALOG_GRAPH).find((g) => g.kind === 'regime-transition');
    expect(gap).toBeDefined();
    const r = await runProbeSearch({
      gap: gap!,
      target: { name: 'period', dim: TIME },
      governing: [{ name: 'length', dim: LENGTH }],
    });
    expect(r.stopReason).toBe('non-identifiable');
    expect(r.wording.join(' ')).toMatch(/upt discover/);
  });
});
