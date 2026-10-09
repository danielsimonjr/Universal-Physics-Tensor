/**
 * Atlas Phase 5, S5.3 — request and response SHAPES for the out-of-process
 * conditions (embeddings, LLMs).
 *
 * Design note: `docs/planning/Atlas-Phase-5-Design.md` §7.
 *
 * Only the shapes and a strict response parser live here. The process plumbing
 * is the probe's existing NDJSON worker protocol
 * (`src/composition/probe/backend-protocol.ts`): argv spawn, no shell, timeout,
 * schema-validated output. **A malformed response is an ERROR, never a
 * default:** an outcome that defaulted to `'abstain'` would credit a broken
 * worker with the benchmark's preferred behaviour.
 *
 * @module atlas/benchmark/backend-shapes
 * @internal
 */

import type { RelationType } from '../types.js';

/** What an out-of-process condition is asked. @internal */
export interface BenchmarkBackendRequest {
  readonly itemId: string;
  /** `classify`: judge the claim. `retrieve`: rank `corpusIds` for it. */
  readonly task: 'classify' | 'retrieve';
  readonly premises: readonly string[];
  readonly conclusion: string;
  readonly claimedRelation: RelationType;
  /** Required for `retrieve`: the records to rank. */
  readonly corpusIds?: readonly string[];
  readonly budgetMs: number;
}

/** What it answers. Exactly one of `outcome` or `ranking`, matching the task. @internal */
export interface BenchmarkBackendResponse {
  readonly itemId: string;
  readonly outcome?: 'accept' | 'reject' | 'abstain';
  readonly ranking?: readonly string[];
}

/** A response that failed validation, with every reason. @internal */
export interface BackendShapeError {
  readonly error: string;
}

const OUTCOMES = new Set(['accept', 'reject', 'abstain']);

/**
 * Validate one parsed response against the request it answers.
 *
 * @returns the response, or an error naming every problem. Never throws.
 * @internal
 */
export function parseBackendResponse(
  request: BenchmarkBackendRequest,
  value: unknown,
): BenchmarkBackendResponse | BackendShapeError {
  const problems: string[] = [];
  if (value === null || typeof value !== 'object') return { error: 'response is not an object' };
  const v = value as Record<string, unknown>;
  if (v['itemId'] !== request.itemId) problems.push(`itemId ${String(v['itemId'])} ≠ ${request.itemId}`);
  if (request.task === 'classify') {
    if (typeof v['outcome'] !== 'string' || !OUTCOMES.has(v['outcome'])) {
      problems.push('classify needs outcome ∈ {accept, reject, abstain}');
    }
    if (v['ranking'] !== undefined) problems.push('classify must not carry a ranking');
  } else {
    const r = v['ranking'];
    if (!Array.isArray(r) || !r.every((x) => typeof x === 'string')) {
      problems.push('retrieve needs ranking: string[]');
    } else {
      const allowed = new Set(request.corpusIds ?? []);
      const unknown = r.filter((x) => !allowed.has(x as string));
      if (unknown.length > 0) problems.push(`ranking names ids outside the corpus: ${unknown.join(', ')}`);
      if (new Set(r).size !== r.length) problems.push('ranking repeats an id');
    }
    if (v['outcome'] !== undefined) problems.push('retrieve must not carry an outcome');
  }
  if (problems.length > 0) return { error: problems.join('; ') };
  // A typed pick of the validated fields: an extra field on the reply is not
  // carried through, and no cast is needed.
  return request.task === 'classify'
    ? { itemId: request.itemId, outcome: v['outcome'] as 'accept' | 'reject' | 'abstain' }
    : { itemId: request.itemId, ranking: [...(v['ranking'] as string[])] };
}
