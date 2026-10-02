/**
 * Unit coverage for Product B probe modules (not the identification funnel).
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TIME, LENGTH, ACCELERATION, FORCE, MASS, DIMENSIONLESS } from '../../../src/dimensional/types.js';
import { sym } from '../../../src/dimensional/ast-builders.js';
import {
  openBudget,
  budgetStopReason,
  canEmitCandidate,
  DEFAULT_SEARCH_BUDGET,
} from '../../../src/composition/probe/search-budget.js';
import {
  bodyExpression,
  countAstNodes,
  countOperators,
  maxPowerOrder,
  complexityOf,
  fingerprintExpr,
} from '../../../src/composition/probe/fingerprint.js';
import { scalarDiscrepancy, rmse, ResidualError } from '../../../src/composition/probe/residual.js';
import {
  canTransition,
  applyStatus,
  statusRank,
  ProbeCandidateStore,
} from '../../../src/composition/probe/candidate-store.js';
import { monomialToExpr, generateNative } from '../../../src/composition/probe/generator.js';
import {
  wrapRelationLinkGaps,
  wrapConnectorGaps,
  wrapRegimeGaps,
  scanFrontier,
  findFrontierGap,
  problemFromResidualGap,
} from '../../../src/composition/probe/frontier.js';
import { CATALOG_GRAPH } from '../../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../../src/composition/canonical-graph.js';
import { candidateId } from '../../../src/composition/adjudication.js';
import { fitPrefactor } from '../../../src/composition/probe/fit.js';
import { scoreCandidate, rankPareto } from '../../../src/composition/probe/scoring.js';
import { compareToCorpus, corpusRelativeWording } from '../../../src/composition/probe/corpus.js';
import { checkDeclaredLimit, checkDeclaredLimits } from '../../../src/composition/probe/limits.js';
import { runFalsification, DEFAULT_BATTERIES } from '../../../src/composition/probe/falsify.js';
import {
  datasetFromRows,
  asDatasetSafe,
  loadDatasetFromJson,
  loadSplitDatasetsFromJson,
  loadDatasetFromCsv,
  loadSplitCsv,
} from '../../../src/composition/probe/dataset.js';
import { suggestDiscriminatingPoint } from '../../../src/composition/probe/experiment-design.js';
import {
  detectMeanChangepoint,
  estimateScaleExponent,
  probeConservation,
} from '../../../src/composition/probe/structure.js';
import {
  setRelationMetadata,
  getRelationMetadata,
  listRelationMetadata,
  clearRelationMetadata,
} from '../../../src/composition/probe/metadata.js';
import { makeResidualGap, searchProblemFromFile, parseExprJson } from '../../../src/composition/probe/problem.js';
import { openManifest, closeManifest, captureEnvironment } from '../../../src/composition/probe/run-manifest.js';
import type { ProbeCandidateRecord, ProbeDataset } from '../../../src/composition/probe/types.js';
import { SCHEMA_VERSION } from '../../../src/composition/probe/types.js';

const period = { name: 'period', dim: TIME };
const length = { name: 'length', dim: LENGTH };
const gravity = { name: 'gravity', dim: ACCELERATION };

function expl(rows: ProbeDataset['rows']): ProbeDataset {
  return datasetFromRows(rows, 'period', 'exploratory-fit', 'e');
}
function hold(rows: ProbeDataset['rows']): ProbeDataset {
  return datasetFromRows(rows, 'period', 'validation-holdout', 'h');
}

function blankRecord(over: Partial<ProbeCandidateRecord> = {}): ProbeCandidateRecord {
  const expr = monomialToExpr({ length: 0.5, gravity: -0.5 }, [period, length, gravity]);
  const fp = fingerprintExpr(expr);
  return {
    id: 'h-test',
    gapId: 'fg-test',
    body: { kind: 'scalar-expr', expression: expr },
    origin: { kind: 'human-authored', source: 'test' },
    assumptions: [],
    status: 'generated',
    statusHistory: [
      { at: 't', from: 'none', to: 'generated', reason: 'test', runId: 'dr-test' },
    ],
    evaluations: [],
    fingerprint: fp,
    complexity: complexityOf(expr),
    schemaVersion: SCHEMA_VERSION,
    ...over,
  };
}

describe('search-budget', () => {
  it('opens defaults and reports candidate-limit', () => {
    const s = openBudget({ ...DEFAULT_SEARCH_BUDGET, maxCandidates: 1, maxWallClockMs: 60_000 });
    expect(canEmitCandidate(s)).toBe(true);
    s.candidates = 1;
    expect(budgetStopReason(s)).toBe('candidate-limit');
    expect(canEmitCandidate(s)).toBe(false);
  });
  it('reports evaluation-limit and time-limit', () => {
    const s = openBudget({ ...DEFAULT_SEARCH_BUDGET, maxEvaluations: 0, maxWallClockMs: 60_000 });
    expect(budgetStopReason(s)).toBe('evaluation-limit');
    const t = openBudget({ ...DEFAULT_SEARCH_BUDGET, maxWallClockMs: 0 });
    expect(budgetStopReason(t)).toBe('time-limit');
  });
  it('a sub-millisecond budget stops after a few tens of microseconds of work', () => {
    // Date.now() moves in whole milliseconds, so this used to stay open and a
    // 1 ms probe could finish as exhausted-space on one run and time-limit on
    // the next. Replay then called the two searches reproduced.
    const t = openBudget({ ...DEFAULT_SEARCH_BUDGET, maxWallClockMs: 1e-3 });
    const start = performance.now();
    while (performance.now() - start < 0.05) {
      // spin ~50 µs, far under one Date.now() tick
    }
    expect(budgetStopReason(t)).toBe('time-limit');
  });
});

describe('fingerprint / residual', () => {
  it('counts nodes and operators and hashes', () => {
    const expr = monomialToExpr({ length: 0.5, gravity: -0.5 }, [period, length, gravity]);
    expect(countAstNodes(expr)).toBeGreaterThan(2);
    expect(countOperators(expr)).toBeGreaterThan(0);
    expect(maxPowerOrder(expr)).toBeCloseTo(0.5);
    const c = complexityOf(expr);
    expect(c.astNodes).toBe(countAstNodes(expr));
    const fp = fingerprintExpr(expr, 'classical', 'small-angle');
    expect(fp.syntaxHash).toMatch(/^[0-9a-f]{64}$/);
    expect(fp.dimensionalSignature).not.toBe('invalid');
    expect(bodyExpression({ kind: 'scalar-expr', expression: expr })).toBe(expr);
    const corr = { kind: 'correction' as const, baselineRef: { kind: 'canonical-equation' as const, id: 'CE-x' }, correction: expr, discrepancy: { kind: 'additive' as const, observableIds: ['period'] } };
    expect(bodyExpression(corr)).toBe(expr);
  });
  it('scalar residuals and RMSE; vector kinds abstain', () => {
    expect(scalarDiscrepancy(3, 1, 'additive')).toBe(2);
    expect(scalarDiscrepancy(4, 2, 'relative', 2)).toBe(1);
    expect(scalarDiscrepancy(Math.E, 1, 'log-ratio')).toBeCloseTo(1);
    expect(scalarDiscrepancy(5, 3, 'standardized', 2)).toBe(1);
    expect(scalarDiscrepancy(1, 1, 'likelihood', 1)).toBeGreaterThan(0);
    expect(rmse([1, 2], [1, 3], { kind: 'additive', observableIds: ['y'] })).toBeCloseTo(Math.sqrt(0.5));
    expect(() => scalarDiscrepancy(NaN, 1, 'additive')).toThrow(ResidualError);
    expect(() => scalarDiscrepancy(-1, 1, 'log-ratio')).toThrow(ResidualError);
    expect(() => scalarDiscrepancy(1, 1, 'vector')).toThrow(/not implemented/);
    expect(() => rmse([], [], { kind: 'additive', observableIds: [] })).toThrow(ResidualError);
  });
});

describe('candidate-store', () => {
  it('enforces the lifecycle and terminals', () => {
    expect(canTransition('none', 'generated')).toBe(true);
    expect(canTransition('generated', 'heldout-supported')).toBe(false);
    let r = blankRecord();
    r = applyStatus(r, 'structurally-valid', 'ok', 'dr-test');
    r = applyStatus(r, 'insufficient-evidence', 'no data', 'dr-test');
    expect(r.status).toBe('insufficient-evidence');
    expect(() => applyStatus(r, 'empirically-fit', 'nope', 'dr-test')).toThrow(/terminal/);
    const store = new ProbeCandidateStore();
    store.put(blankRecord({ id: 'h-a' }));
    expect(() => store.put(blankRecord({ id: 'h-a' }))).toThrow(/duplicate/);
    expect(store.get('h-a')?.id).toBe('h-a');
    store.rememberRejection({
      fingerprint: blankRecord().fingerprint,
      reason: 'x',
      context: 'c',
      timestamp: 't',
    });
    expect(store.isRejected(blankRecord().fingerprint.canonicalAstHash, 'c')).toBe(true);
    expect(store.rejectionList()).toHaveLength(1);
    expect(statusRank('generated')).toBe(0);
    expect(statusRank('rejected')).toBe(-1);
  });
});

describe('generator', () => {
  it('emits the pendulum monomial and a 2π variant that share a normal-form hash', () => {
    const gap = makeResidualGap('fg-pendulum-period', 'pendulum');
    const problem = problemFromResidualGap(gap, period, [length, gravity]);
    const state = openBudget();
    const got = [...generateNative(problem, state)];
    expect(got.length).toBeGreaterThanOrEqual(1);
    expect(got[0]!.monomial).toEqual({ length: 0.5, gravity: -0.5 });
    const a = fingerprintExpr(got[0]!.expression);
    const b = fingerprintExpr(got[1]!.expression);
    expect(a.canonicalAstHash).toBe(b.canonicalAstHash);
  });
});

describe('frontier', () => {
  it('wraps Product A surfaces as not-searchable and suppresses nothing crashy', () => {
    const links = wrapRelationLinkGaps(CATALOG_GRAPH);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((g) => g.kind === 'relation-link' && !g.searchability.searchable)).toBe(true);
    const conn = wrapConnectorGaps(CATALOG_GRAPH);
    expect(conn.every((g) => !g.searchability.searchable)).toBe(true);
    const regime = wrapRegimeGaps(CATALOG_GRAPH);
    expect(regime.every((g) => g.kind === 'regime-transition' && !g.searchability.searchable)).toBe(true);
    const all = scanFrontier(CATALOG_GRAPH);
    expect(all.length).toBe(links.length + conn.length + regime.length);
    expect(findFrontierGap(CATALOG_GRAPH, links[0]!.id)?.id).toBe(links[0]!.id);
    expect(findFrontierGap(CATALOG_GRAPH, 'fg-nope')).toBeUndefined();
  });
  it('refuses to build a Product B problem from a relation-link gap', () => {
    const gap = wrapRelationLinkGaps(CATALOG_GRAPH)[0]!;
    expect(() => problemFromResidualGap(gap, period, [length, gravity])).toThrow(/not a Product B/);
  });
  it('keeps the ledger slug guard and still lists a canonical symbol that is not a slug', () => {
    expect(() => candidateId('A', 'area')).toThrow(/kebab-case slugs/);
    const links = wrapRelationLinkGaps(CANONICAL_GRAPH);
    const hit = links.find(
      (g) => g.participants.some((p) => p.id === 'A') && g.participants.some((p) => p.id === 'area'),
    );
    expect(hit?.id.startsWith('fg-link-raw:')).toBe(true);
    expect(hit?.searchability.searchable).toBe(false);
    expect(() => scanFrontier(CANONICAL_GRAPH)).not.toThrow();
    expect(wrapRelationLinkGaps(CATALOG_GRAPH).every((g) => !g.id.includes('raw:'))).toBe(true);
  });
  it('refuses relation-link and regime-transition and points at upt discover', () => {
    const link = wrapRelationLinkGaps(CATALOG_GRAPH)[0]!;
    const regime = wrapRegimeGaps(CATALOG_GRAPH)[0]!;
    expect(() => problemFromResidualGap(link, period, [length, gravity])).toThrow(/upt discover/);
    expect(() => problemFromResidualGap(regime, period, [length, gravity])).toThrow(/upt discover/);
  });
});

describe('fit / scoring / corpus', () => {
  it('recovers 2π on exploratory data and rejects holdout leakage', () => {
    const expr = monomialToExpr({ length: 0.5, gravity: -0.5 }, [period, length, gravity]);
    const rows = [
      { length: 1, gravity: 9.81, period: 2 * Math.PI * Math.sqrt(1 / 9.81) },
      { length: 2, gravity: 9.81, period: 2 * Math.PI * Math.sqrt(2 / 9.81) },
    ];
    const fit = fitPrefactor(expr, expl(rows), hold([{ length: 3, gravity: 9.81, period: 2 * Math.PI * Math.sqrt(3 / 9.81) }]));
    expect(fit.prefactor).toBeCloseTo(2 * Math.PI, 5);
    expect(fit.holdoutSupported).toBe(true);
    expect(() => fitPrefactor(expr, expl(rows), expl(rows))).toThrow(/role must be/);
    expect(() =>
      fitPrefactor(expr, expl(rows), hold(rows)),
    ).toThrow(/leaked/);
    expect(() =>
      fitPrefactor(
        expr,
        expl([{ length: 1, gravity: 9.81, period: 2 }]),
        hold([{ length: 1, gravity: 9.81, period: 3 }]),
      ),
    ).toThrow(/leaked/);
  });
  it('ranks Pareto and scores invalid fingerprints at validity 0', () => {
    const good = blankRecord({ id: 'h-g' });
    const bad = blankRecord({
      id: 'h-b',
      fingerprint: { ...blankRecord().fingerprint, dimensionalSignature: 'invalid' },
    });
    const ranked = rankPareto([
      { record: good, scores: scoreCandidate(good, 0.9, 1) },
      { record: bad, scores: scoreCandidate(bad, 0.9, 1) },
    ]);
    expect(ranked.find((r) => r.record.id === 'h-g')!.pareto).toBe(true);
    expect(scoreCandidate(bad).validity).toBe(0);
    expect(scoreCandidate(good, Number.NaN).empirical).toBe(0);
    expect(scoreCandidate({ ...good, status: 'heldout-supported' }).robustness).toBe(0.7);
  });
  it('corpus wording is relative and finds CE-pendulum-period', () => {
    const expr = monomialToExpr({ length: 0.5, gravity: -0.5 }, [period, length, gravity]);
    const r = compareToCorpus(expr, '0');
    expect(r.algebraicMatches.some((m) => m.id === 'CE-pendulum-period')).toBe(true);
    expect(corpusRelativeWording(r)).toMatch(/Algebraic equivalent/);
    const none = compareToCorpus(sym('not-a-law', DIMENSIONLESS), '0');
    expect(corpusRelativeWording(none)).toMatch(/SCIENTIFIC NOVELTY NOT ESTABLISHED/);
  });
});

describe('limits / falsify / structure / design / metadata', () => {
  it('treats unclaimed limit failures as non-fatal', () => {
    const expr = monomialToExpr({ length: 0.5, gravity: -0.5 }, [period, length, gravity]);
    const ds = expl([{ length: 1, gravity: 9.81, period: 1e9 }]);
    const unclaimed = checkDeclaredLimit(expr, ds, 1, { id: 'lim', regime: { scale: 'quantum' } }, false);
    expect(unclaimed.fatal).toBe(false);
    expect(unclaimed.passed).toBe(false);
    const claimed = checkDeclaredLimit(expr, ds, 1, { id: 'lim', regime: { scale: 'classical' } }, true);
    expect(claimed.fatal).toBe(true);
    const all = checkDeclaredLimits(expr, ds, 1, [{ id: 'lim', regime: { scale: 'classical' } }], {});
    expect(all[0]!.fatal).toBe(false);
  });
  it('falsifies non-finite predictions and lists batteries', () => {
    const expr = { kind: 'op' as const, op: '/' as const, args: [sym('1', DIMENSIONLESS), sym('x', DIMENSIONLESS)] };
    const ds = datasetFromRows([{ x: 0, y: 1 }], 'y', 'falsification-only', 'z');
    const r = runFalsification({ expr, dataset: ds, prefactor: 1 });
    expect(r.survived).toBe(false);
    expect(r.records.some((b) => b.battery === 'finiteness' && b.outcome === 'fail')).toBe(true);
    expect(DEFAULT_BATTERIES).toContain('dimensional');
  });
  it('recovers a synthetic changepoint, scale exponent, and conservation', () => {
    const y = [0, 0, 0, 0, 5, 5, 5, 5];
    const cp = detectMeanChangepoint({ x: y.map((_, i) => i), y });
    expect(cp.abstained).toBe(false);
    expect(cp.index).toBe(4);
    expect(detectMeanChangepoint({ x: [1], y: [1] }).abstained).toBe(true);
    const xs = [1, 2, 4, 8];
    const ys = xs.map((x) => Math.sqrt(x));
    const exp = estimateScaleExponent({ x: xs, y: ys });
    expect(exp.exponent).toBeCloseTo(0.5, 5);
    expect(probeConservation([1, 1, 1], [0, 1, 2]).conserved).toBe(true);
    expect(probeConservation([1], [0]).abstained).toBe(true);
  });
  it('never recommends a forbidden region', () => {
    const h1 = sym('x', DIMENSIONLESS);
    const h2 = { kind: 'op' as const, op: '*' as const, args: [sym('2', DIMENSIONLESS), sym('x', DIMENSIONLESS)] };
    const s = suggestDiscriminatingPoint(h1, h2, {
      variables: { x: { min: 0, max: 10, steps: 5 } },
      forbidden: [{ x: { min: 8, max: 10 } }],
      sigma: 1,
    });
    expect(s.abstained).not.toBe(true);
    expect(s.point.x).toBeLessThan(8);
    const empty = suggestDiscriminatingPoint(h1, h2, { variables: {} });
    expect(empty.abstained).toBe(true);
    const allForbidden = suggestDiscriminatingPoint(h1, h2, {
      variables: { x: { min: 1, max: 2, steps: 2 } },
      forbidden: [{ x: { min: 0, max: 3 } }],
    });
    expect(allForbidden.abstained).toBe(true);
  });
  it('stores overlay metadata without becoming a registry', () => {
    clearRelationMetadata();
    setRelationMetadata({
      ref: { kind: 'canonical-equation', id: 'CE-pendulum-period' },
      audit: 'not-yet-audited',
      notes: 'overlay only',
    });
    expect(getRelationMetadata({ kind: 'canonical-equation', id: 'CE-pendulum-period' })?.notes).toBe(
      'overlay only',
    );
    expect(listRelationMetadata()).toHaveLength(1);
    clearRelationMetadata();
    expect(listRelationMetadata()).toHaveLength(0);
  });
});

describe('dataset / problem / manifest', () => {
  it('round-trips JSON and CSV adapters', () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-probe-'));
    const jsonPath = join(dir, 'd.json');
    writeFileSync(
      jsonPath,
      JSON.stringify({
        id: 'd',
        role: 'exploratory-fit',
        observable: 'y',
        rows: [{ x: 1, y: 2 }],
      }),
    );
    expect(loadDatasetFromJson(jsonPath).rows[0]!.y).toBe(2);
    const splitPath = join(dir, 's.json');
    writeFileSync(
      splitPath,
      JSON.stringify({
        exploratory: { role: 'exploratory-fit', observable: 'y', rows: [{ x: 1, y: 2 }] },
        holdout: { role: 'validation-holdout', observable: 'y', rows: [{ x: 3, y: 4 }] },
      }),
    );
    expect(loadSplitDatasetsFromJson(splitPath).holdout?.rows[0]!.y).toBe(4);
    const csvPath = join(dir, 'c.csv');
    writeFileSync(csvPath, 'x,y\n1,2\n3,4\n');
    expect(loadDatasetFromCsv(csvPath, 'y', 'exploratory-fit').rows).toHaveLength(2);
    const splitCsv = join(dir, 'sc.csv');
    writeFileSync(splitCsv, 'x,y,split\n1,2,exploratory\n3,4,holdout\n5,6,blind\n');
    const split = loadSplitCsv(splitCsv, 'y');
    expect(split.holdout.rows[0]!.y).toBe(4);
    expect(split.holdout.rows[1]!.y).toBe(6);
    expect(split.exploratory.rows).toHaveLength(1);
    expect(asDatasetSafe({ rows: [{ a: 1 }], observable: 'a', role: 'exploratory-fit' }, 't').rows[0]!.a).toBe(1);
  });
  it('builds residual problems and rejects Product A kinds', () => {
    expect(() => makeResidualGap('nope', 'x')).toThrow(/fg-/);
    expect(() => makeResidualGap('fg-x', 'x', 'relation-link')).toThrow(/Product A/);
    const p = searchProblemFromFile({
      gap: { id: 'fg-inline', kind: 'unexplained-observation' },
      target: { name: 'period', dim: 'time' },
      governing: [
        { name: 'length', dim: 'length' },
        { name: 'gravity', dim: 'acceleration' },
      ],
    });
    expect(p.target.name).toBe('period');
    const env = captureEnvironment();
    expect(env.node).toBeTruthy();
    const m = openManifest({ runId: 'dr-abc', repositoryCommit: 'deadbeef', problem: p });
    expect(closeManifest(m, 'exhausted-space').stopReason).toBe('exhausted-space');
    expect(() => openManifest({ runId: 'nope', repositoryCommit: 'x', problem: p })).toThrow(/dr-/);
  });
  it('parseExprJson reads a bare node', () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-expr-'));
    const path = join(dir, 'e.json');
    writeFileSync(path, JSON.stringify(sym('x', DIMENSIONLESS)));
    expect(parseExprJson(path).kind).toBe('symbol');
  });
});

describe('force / mass symbols exist for newton', () => {
  it('monomialToExpr of F=ma is mass*acceleration', () => {
    const expr = monomialToExpr({ mass: 1, acceleration: 1 }, [
      { name: 'force', dim: FORCE },
      { name: 'mass', dim: MASS },
      { name: 'acceleration', dim: ACCELERATION },
    ]);
    expect(expr.kind).toBe('op');
  });
});
