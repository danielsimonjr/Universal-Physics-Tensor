/**
 * Search-budget accounting for Product B. Product A (`rankDiscoveries`) is
 * already finite and must not grow AST-depth caps.
 *
 * @module composition/probe/search-budget
 */

import type { SearchBudget, SearchStopReason } from './types.js';
import { DEFAULT_SEARCH_BUDGET } from './types.js';

/**
 * The default search budget.
 *
 * @internal
 */
export { DEFAULT_SEARCH_BUDGET } from './types.js';

/** Mutable counters for one run. @internal */
export interface BudgetState {
  readonly budget: SearchBudget;
  readonly startedAtMs: number;
  candidates: number;
  evaluations: number;
}

/** Open a budget clock. @internal */
export function openBudget(budget: SearchBudget = DEFAULT_SEARCH_BUDGET): BudgetState {
  return {
    budget,
    // performance.now() moves inside a millisecond. Date.now() does not, so a
    // budget under 1 ms — and a 1 ms budget on a search that finishes in the
    // same tick — never returned time-limit, and a replay of that search could
    // disagree with the recording while still being called reproduced.
    startedAtMs: performance.now(),
    candidates: 0,
    evaluations: 0,
  };
}

/**
 * First violated stop reason, or `undefined` if the search may continue.
 * @internal
 */
export function budgetStopReason(state: BudgetState): SearchStopReason | undefined {
  const { budget } = state;
  if (state.candidates >= budget.maxCandidates) return 'candidate-limit';
  if (state.evaluations >= budget.maxEvaluations) return 'evaluation-limit';
  if (performance.now() - state.startedAtMs >= budget.maxWallClockMs) return 'time-limit';
  return undefined;
}

/** True when another candidate may be emitted. @internal */
export function canEmitCandidate(state: BudgetState): boolean {
  return budgetStopReason(state) === undefined;
}
