/**
 * Product B search orchestrator.
 *
 * Identifiability gate → native enumerator → fingerprint dedup → corpus
 * comparison → validate → exploratory fit (never holdout) → holdout →
 * falsify → Pareto. Relation-link / regime gaps abstain (`non-identifiable`)
 * and tell the caller to use `upt discover`.
 *
 * @internal
 */

import { validate } from '../../dimensional/validator.js';
import { equals } from '../../dimensional/algebra.js';
import type {
  ProbeCandidateRecord,
  ProbeRejectionRecord,
  SearchBudget,
  SearchProblem,
  SearchStopReason,
  DiscoveryRunManifest,
} from './types.js';
import { DEFAULT_SEARCH_BUDGET, SCHEMA_VERSION } from './types.js';
import { openBudget, budgetStopReason, type BudgetState } from './search-budget.js';
import { generateNative, nativeDetermination, type RawCandidate } from './generator.js';
import { fingerprintExpr, complexityOf, bodyExpression } from './fingerprint.js';
import {
  compareToCorpus,
  corpusPrefactorNotes,
  corpusRelativeWording,
  type CorpusComparisonResult,
} from './corpus.js';
import { fitPrefactor, type FitResult } from './fit.js';
import { runFalsification, type FalsifyResult } from './falsify.js';
import { applyStatus, ProbeCandidateStore } from './candidate-store.js';
import { openManifest, closeManifest } from './run-manifest.js';
import { hashCanonical } from './serialize.js';
import { scoreCandidate, rankPareto, type RankedCandidate } from './scoring.js';
import { runBackendWorker } from './backend-protocol.js';

/** Stop wording when the problem carried no holdout rows. @internal */
export const NO_HOLDOUT_WORDING = 'no holdout observations: no candidate was tested on withheld data';

export interface ProbeSearchOptions {
  readonly budget?: SearchBudget;
  readonly runId?: string;
  readonly repositoryCommit?: string;
  readonly holdoutTol?: number;
  readonly backendArgv?: readonly string[];
  readonly corpusVersion?: string;
  readonly now?: string;
}

export interface ProbeSearchResult {
  readonly manifest: DiscoveryRunManifest;
  readonly candidates: readonly ProbeCandidateRecord[];
  readonly ranked: readonly RankedCandidate[];
  readonly rejections: readonly ProbeRejectionRecord[];
  readonly fits: Readonly<Record<string, FitResult>>;
  readonly falsifications: Readonly<Record<string, FalsifyResult>>;
  readonly corpus: Readonly<Record<string, CorpusComparisonResult>>;
  /**
   * For a candidate equivalent to a corpus relation, the fitted prefactor
   * against that relation's prefactor (see `corpusPrefactorNotes`).
   */
  readonly prefactorNotes: Readonly<Record<string, readonly string[]>>;
  readonly wording: readonly string[];
  readonly stopReason: SearchStopReason;
}

function abstain(
  problem: SearchProblem,
  opts: ProbeSearchOptions,
  reason: SearchStopReason,
  wording: readonly string[],
): ProbeSearchResult {
  const budget = opts.budget ?? DEFAULT_SEARCH_BUDGET;
  const runId = opts.runId ?? `dr-${hashCanonical(problem.gap.id).slice(0, 12)}`;
  const open = openManifest({
    runId,
    repositoryCommit: opts.repositoryCommit ?? 'unknown',
    problem,
    searchBudget: budget,
    startedAt: opts.now,
  });
  const manifest = closeManifest(open, reason, opts.now);
  return {
    manifest,
    candidates: [],
    ranked: [],
    rejections: [],
    fits: {},
    falsifications: {},
    corpus: {},
    prefactorNotes: {},
    wording,
    stopReason: reason,
  };
}

function gate(problem: SearchProblem): { ok: true } | { ok: false; wording: string } {
  if (problem.gap.kind === 'relation-link' || problem.gap.kind === 'regime-transition') {
    return {
      ok: false,
      wording: `${problem.gap.kind} gaps are Product A — use \`upt discover\`, not \`upt probe run\``,
    };
  }
  if (!problem.gap.searchability.searchable) {
    return {
      ok: false,
      wording: problem.gap.searchability.reasons.join('; ') || 'gap is not searchable',
    };
  }
  if (problem.gap.identifiability.parametric?.status === 'non-identifiable') {
    return {
      ok: false,
      wording:
        problem.gap.identifiability.parametric.reasons.join('; ') || 'parametrically non-identifiable',
    };
  }
  return { ok: true };
}

function referencesSymbol(expr: RawCandidate['expression'], name: string): boolean {
  switch (expr.kind) {
    case 'symbol':
      return expr.name === name;
    case 'op':
      return expr.args.some((arg) => referencesSymbol(arg, name));
    case 'integral':
      return referencesSymbol(expr.over, name) || referencesSymbol(expr.integrand, name);
    case 'derivative':
      return referencesSymbol(expr.of, name) || referencesSymbol(expr.wrt, name);
    case 'transcendental':
    case 'abs':
    case 'dirac-delta':
      return referencesSymbol(expr.arg, name);
    case 'variational-derivative':
      return (
        referencesSymbol(expr.functional, name) ||
        referencesSymbol(expr.field, name) ||
        referencesSymbol(expr.over, name)
      );
    default:
      return false;
  }
}

function makeGenerated(
  expr: RawCandidate['expression'],
  problem: SearchProblem,
  runId: string,
  at: string,
  origin: ProbeCandidateRecord['origin'],
  seq: number,
): ProbeCandidateRecord {
  const fp = fingerprintExpr(
    expr,
    problem.regimeSignature ?? '',
    (problem.assumptions ?? []).join('|'),
  );
  return {
    id: `h-${seq}-${fp.canonicalAstHash.slice(0, 10)}`,
    gapId: problem.gap.id,
    body: { kind: 'scalar-expr', expression: expr },
    origin,
    assumptions: problem.assumptions ?? [],
    status: 'generated',
    statusHistory: [
      { at, from: 'none', to: 'generated', reason: 'enumerator', runId },
    ],
    evaluations: [],
    fingerprint: fp,
    complexity: complexityOf(expr),
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Run a bounded Product B search. Never mutates Product A catalogs.
 *
 * @internal
 */
export async function runProbeSearch(
  problem: SearchProblem,
  opts: ProbeSearchOptions = {},
): Promise<ProbeSearchResult> {
  const blocked = gate(problem);
  if (!blocked.ok) {
    return abstain(problem, opts, 'non-identifiable', [blocked.wording]);
  }

  const budget = opts.budget ?? DEFAULT_SEARCH_BUDGET;
  const state: BudgetState = openBudget(budget);
  const runId = opts.runId ?? `dr-${hashCanonical({
    gap: problem.gap.id,
    target: problem.target.name,
    governing: problem.governing.map((g) => g.name),
  }).slice(0, 12)}`;
  const at = opts.now ?? new Date().toISOString();
  const corpusVersion = opts.corpusVersion ?? SCHEMA_VERSION;
  const store = new ProbeCandidateStore();
  const fits: Record<string, FitResult> = {};
  const falsifications: Record<string, FalsifyResult> = {};
  const corpus: Record<string, CorpusComparisonResult> = {};
  const prefactorNotes: Record<string, string[]> = {};
  const wording: string[] = [];
  const seenHash = new Set<string>();
  let seq = 0;

  const raws: RawCandidate[] = [];
  const { unsearched } = nativeDetermination(problem);
  if (unsearched.length > 0) {
    wording.push(
      `the monomial is taken from the dimensioned inputs; an unknown function of the ` +
        `dimensionless input(s) {${unsearched.join(', ')}} is not searched`,
    );
  }
  for (const raw of generateNative(problem, state)) {
    raws.push(raw);
    const stop = budgetStopReason(state);
    if (stop) break;
  }

  if (opts.backendArgv && opts.backendArgv.length > 0 && !budgetStopReason(state)) {
    const remainingMs = Math.max(1, budget.maxWallClockMs - (Date.now() - state.startedAtMs));
    const backend = await runBackendWorker(
      opts.backendArgv,
      {
        problemId: problem.gap.id,
        budgetMs: remainingMs,
        variables: problem.governing.map((g) => g.name),
        target: problem.target.name,
      },
      { timeoutMs: remainingMs },
    );
    if (!backend.ok) {
      wording.push(`backend abstained: ${backend.error ?? 'unknown error'}`);
    } else {
      for (const c of backend.candidates) {
        if (budgetStopReason(state)) break;
        state.candidates += 1;
        raws.push({
          expression: c.expression,
          monomial: null,
          originNote: 'external-backend',
        });
      }
    }
  }

  const open = openManifest({
    runId,
    repositoryCommit: opts.repositoryCommit ?? 'unknown',
    problem,
    datasetHashes: [
      ...(problem.exploratory ? [hashCanonical(problem.exploratory)] : []),
      ...(problem.holdout ? [hashCanonical(problem.holdout)] : []),
    ],
    tolerances: { holdoutRmse: opts.holdoutTol ?? 0.15 },
    searchBudget: budget,
    startedAt: at,
    backendDescriptors: opts.backendArgv
      ? [
          {
            protocolVersion: '0',
            backendId: 'native',
            backendVersion: SCHEMA_VERSION,
            capabilities: ['grammar-enumerator'],
            deterministic: 'yes',
          },
          {
            protocolVersion: '0',
            backendId: opts.backendArgv.join(' '),
            backendVersion: 'external',
            capabilities: ['external-backend'],
            deterministic: 'unknown',
          },
        ]
      : undefined,
  });

  for (const raw of raws) {
    const stop = budgetStopReason(state);
    if (stop) break;

    const origin: ProbeCandidateRecord['origin'] = raw.originNote === 'external-backend'
      ? { kind: 'external-backend', backendId: 'external', runId }
      : { kind: 'grammar-enumerator', runId };
    seq += 1;
    let rec = makeGenerated(raw.expression, problem, runId, at, origin, seq);
    if (seenHash.has(rec.fingerprint.canonicalAstHash)) continue;
    seenHash.add(rec.fingerprint.canonicalAstHash);
    store.put(rec);

    const expr = bodyExpression(rec.body);
    if (referencesSymbol(expr, problem.target.name)) {
      rec = applyStatus(rec, 'rejected', `candidate reads target observable '${problem.target.name}'`, runId, at);
      store.replace(rec);
      store.rememberRejection({
        fingerprint: rec.fingerprint,
        reason: `target-observable self-reference: ${problem.target.name}`,
        context: problem.gap.id,
        timestamp: at,
      });
      continue;
    }

    const v = validate(expr);
    if (!v.ok || v.inferredDimension === null) {
      rec = applyStatus(rec, 'rejected', 'dimensionally invalid', runId, at);
      store.replace(rec);
      store.rememberRejection({
        fingerprint: rec.fingerprint,
        reason: 'dimensionally invalid',
        context: problem.gap.id,
        timestamp: at,
      });
      continue;
    }
    if (!equals(v.inferredDimension, problem.target.dim)) {
      rec = applyStatus(rec, 'rejected', 'candidate dimension does not match target observable', runId, at);
      store.replace(rec);
      store.rememberRejection({
        fingerprint: rec.fingerprint,
        reason: 'target-dimension mismatch',
        context: problem.gap.id,
        timestamp: at,
      });
      continue;
    }
    rec = applyStatus(rec, 'structurally-valid', 'validate() ok', runId, at);
    store.replace(rec);

    const corp = compareToCorpus(bodyExpression(rec.body), corpusVersion);
    corpus[rec.id] = corp;
    wording.push(corpusRelativeWording(corp));
    const known = corp.algebraicMatches.length > 0;
    const hasData = (problem.exploratory?.rows.length ?? 0) > 0;

    if (!hasData) {
      rec = applyStatus(
        rec,
        known ? 'equivalent-known' : 'insufficient-evidence',
        known ? corpusRelativeWording(corp) : 'no exploratory observations',
        runId,
        at,
      );
      store.replace(rec);
      continue;
    }

    state.evaluations += 1;
    let fit: FitResult;
    try {
      fit = fitPrefactor(
        bodyExpression(rec.body),
        problem.exploratory!,
        problem.holdout,
        opts.holdoutTol ?? 0.15,
      );
    } catch (err) {
      rec = applyStatus(
        rec,
        'rejected',
        err instanceof Error ? err.message : String(err),
        runId,
        at,
      );
      store.replace(rec);
      continue;
    }
    fits[rec.id] = fit;
    rec = applyStatus(rec, 'empirically-fit', `exploratory RMSE ${fit.exploratoryRmse}`, runId, at);
    store.replace(rec);

    if (!problem.holdout || problem.holdout.rows.length === 0) {
      rec = applyStatus(rec, 'insufficient-evidence', 'no holdout observations', runId, at);
      store.replace(rec);
      continue;
    }
    if (!fit.holdoutSupported) {
      rec = applyStatus(rec, 'rejected', `holdout RMSE ${fit.holdoutRmse} exceeds tolerance`, runId, at);
      store.replace(rec);
      store.rememberRejection({
        fingerprint: rec.fingerprint,
        reason: `holdout RMSE ${fit.holdoutRmse}`,
        context: problem.gap.id,
        timestamp: at,
      });
      continue;
    }

    rec = applyStatus(rec, 'heldout-supported', `holdout RMSE ${fit.holdoutRmse}`, runId, at);
    store.replace(rec);

    if (known) {
      // Equivalent up to a constant is not equal: compare the fitted constant
      // with the corpus one where the corpus records it (persona finding L7).
      prefactorNotes[rec.id] = corpusPrefactorNotes(
        corp,
        bodyExpression(rec.body),
        fit.prefactor,
        opts.holdoutTol ?? 0.15,
      );
      rec = applyStatus(rec, 'equivalent-known', corpusRelativeWording(corp), runId, at);
      store.replace(rec);
      continue;
    }

    const fal = runFalsification({
      expr: bodyExpression(rec.body),
      dataset: problem.holdout,
      prefactor: fit.prefactor,
      claimedRegimes: problem.claimedRegimes,
      limits: problem.limits,
      observationalBoundIds: problem.observationalBoundIds,
    });
    falsifications[rec.id] = fal;
    if (!fal.survived) {
      rec = applyStatus(rec, 'falsified', fal.records.filter((r) => r.outcome === 'fail').map((r) => r.detail).join('; '), runId, at);
      store.replace(rec);
      continue;
    }
    rec = applyStatus(rec, 'falsification-survivor', 'all fatal batteries passed', runId, at);
    rec = applyStatus(rec, 'expert-review-required', 'survived batteries; human review required', runId, at);
    store.replace(rec);
  }

  const all = store.all();
  const scored = all.map((record) => {
    const fit = fits[record.id];
    const emp = fit
      ? 1 / (1 + fit.exploratoryRmse)
      : record.status === 'equivalent-known'
        ? 0.5
        : 0;
    const corp = corpus[record.id];
    const dist = corp && corp.algebraicMatches.length > 0 ? 0 : 1;
    return { record, scores: scoreCandidate(record, emp, dist) };
  });
  const ranked = rankPareto(scored);

  const budgetStop = budgetStopReason(state);
  let stopReason: SearchStopReason;
  if (budgetStop) {
    stopReason = budgetStop;
  } else if (all.length === 0) {
    stopReason = 'no-credible-candidate';
    // Say WHY (persona finding C2): "no dimensionally valid candidates" was
    // printed even when the real reason was a non-unique monomial.
    const { det } = nativeDetermination(problem);
    wording.push(
      det.determined
        ? 'enumerator produced no dimensionally valid candidates'
        : `the target is not a unique monomial of the inputs (${det.reason}); ` +
            'the native enumerator searches unique monomials only',
    );
  } else if (
    hasAnyData(problem) &&
    all.every(
      (c) =>
        c.status === 'rejected' ||
        c.status === 'falsified' ||
        c.status === 'insufficient-evidence',
    )
  ) {
    stopReason = 'no-credible-candidate';
    wording.push(
      (problem.holdout?.rows.length ?? 0) > 0
        ? 'no candidate survived holdout / falsification'
        : NO_HOLDOUT_WORDING,
    );
  } else {
    stopReason = 'exhausted-space';
  }

  return {
    manifest: closeManifest(open, stopReason, opts.now ?? new Date().toISOString()),
    candidates: all,
    ranked,
    rejections: store.rejectionList(),
    fits,
    falsifications,
    corpus,
    prefactorNotes,
    wording,
    stopReason,
  };
}

function hasAnyData(problem: SearchProblem): boolean {
  return (problem.exploratory?.rows.length ?? 0) > 0;
}
