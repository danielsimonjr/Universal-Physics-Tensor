/**
 * Refuse a bare `e` that the MathTS parser would evaluate as Euler's number.
 * An explicit `e=<number>` or `--allow-euler` opts in. The builtin parser
 * leaves `e` free; its missing-value error names the same choices.
 *
 * @module cli/euler-guard
 * @internal
 */

import { eulerConstantNote } from '../numerical/formula.js';

/** The refusal, or null when the formula may be evaluated. @internal */
export function unboundEulerRefusal(
  expr: string,
  variables: readonly string[],
  kind: 'mathts' | 'builtin',
  allowEuler: boolean,
  boundE: boolean,
): string | null {
  if (allowEuler || boundE) return null;
  if (kind !== 'mathts') return null;
  if (eulerConstantNote(expr, variables) === undefined) return null;
  return (
    "unbound e is Euler's number under the MathTS parser, so this formula was not evaluated. " +
    'Pass e=<number> to set it, --allow-euler to accept Euler\'s number, or write e_charge for the elementary charge. ' +
    '(formula parser: mathts)'
  );
}

/** Name the active parser on a formula error a script can read. @internal */
export function withParser(message: string, kind: 'mathts' | 'builtin'): string {
  return message.includes('(formula parser:') ? message : `${message} (formula parser: ${kind})`;
}
