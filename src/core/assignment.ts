/**
 * One split of a `name=value` token.
 *
 * Every reader of such tokens (the CLI bindings, an evaluator's `key=value`
 * arguments, a metric's parameters, a discovery anchor) splits on the first
 * `=` and refuses a token with no `=` or an empty name. The split is here,
 * once; what a null means (usage error, unit error, metric refusal) and what
 * an empty value means stay with the caller.
 *
 * @module core/assignment
 */

/** A `name=value` token split on its first `=`. `raw` may be empty (`mass=`). @internal */
export interface SplitAssignment {
  readonly name: string;
  readonly raw: string;
}

/** `token` split on its first `=`, or null when it has no `=` or an empty name. @internal */
export function splitAssignment(token: string): SplitAssignment | null {
  const eq = token.indexOf('=');
  if (eq <= 0) return null;
  return { name: token.slice(0, eq), raw: token.slice(eq + 1) };
}
