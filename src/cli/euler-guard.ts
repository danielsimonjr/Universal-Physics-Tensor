/**
 * Name the active formula parser on an error a script can read.
 *
 * @module cli/euler-guard
 * @internal
 */

/** Name the active parser on a formula error a script can read. @internal */
export function withParser(message: string, kind: 'mathts' | 'builtin'): string {
  return message.includes('(formula parser:') ? message : `${message} (formula parser: ${kind})`;
}
