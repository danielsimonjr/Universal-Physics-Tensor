/**
 * The closed-form range `upt evaluate` prints, read from the evaluator
 * registry. A handwritten `55..65` goes stale the moment an id is added.
 *
 * @module cli/closed-form-range
 */

import { BRIDGE_EVALUATORS } from '../bridges/evaluators.js';

/**
 * `BE-51/52/55..87` for the ids that are registered. A run of three or more
 * consecutive ids is `start..end`. A shorter run is joined with `/`.
 *
 * @internal
 */
export function formatClosedFormRange(ids: readonly number[]): string {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const id of sorted) {
    const last = runs[runs.length - 1];
    if (last !== undefined && id === last[last.length - 1]! + 1) last.push(id);
    else runs.push([id]);
  }
  const parts = runs.map((run) =>
    run.length >= 3 ? `${run[0]}..${run[run.length - 1]}` : run.join('/'),
  );
  return `BE-${parts.join('/')}`;
}

/** The range of {@link BRIDGE_EVALUATORS}. @internal */
export function closedFormRangeLabel(): string {
  return formatClosedFormRange([...BRIDGE_EVALUATORS.keys()]);
}
