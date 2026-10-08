/**
 * Name the active formula parser on an error a script can read.
 *
 * @module cli/euler-guard
 * @internal
 */
import { UsageError } from './errors.js';

/**
 * A usage error from the formula parser or its evaluation, tagged once with
 * the parser that read it. The tag is added here, at construction, so a
 * message is never inspected for an earlier tag: each throw site builds it
 * from the parser's own message.
 * @internal
 */
export class FormulaUsageError extends UsageError {
  constructor(
    readonly detail: string,
    readonly parser: 'mathts' | 'builtin',
  ) {
    super(`${detail} (formula parser: ${parser})`);
    this.name = 'FormulaUsageError';
  }
}
