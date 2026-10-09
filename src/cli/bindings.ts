/**
 * The one reader of `name=value` tokens for every command that takes them
 * (`eval`, `explain`, `evaluate` and its `--sigma`, `regime`/`path` `--at`,
 * `metric`). It settles two things once: a token with no `=` (or an empty
 * name) is a malformed invocation, exit 2; a name given twice is refused,
 * exit 1, never "the last one wins". The value itself is read by the
 * command's own binding reader afterwards.
 *
 * @module cli/bindings
 * @internal
 */
import { CliError, UsageError } from './errors.js';

/** One `name=value` token, split. `raw` may be empty (`mass=`); the reader decides what that means. */
export interface Assignment {
  readonly name: string;
  readonly raw: string;
  /** The token as given, for messages. */
  readonly token: string;
}

/**
 * Split `name=value` tokens. `shape` names the expected form in the usage
 * message (`name=value`, `group=value`, `key=value (e.g. mu_e=2)`).
 */
export function splitAssignments(command: string, tokens: readonly string[], shape = 'name=value'): Assignment[] {
  const out: Assignment[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const eq = token.indexOf('=');
    if (eq <= 0) throw new UsageError(`upt ${command}: '${token}' must be ${shape}. See \`upt help ${command.split(' ')[0]}\`.`);
    const name = token.slice(0, eq);
    if (seen.has(name)) throw new CliError(`upt ${command}: '${name}' is given twice ('${token}'); give one value per name`);
    seen.add(name);
    out.push({ name, raw: token.slice(eq + 1), token });
  }
  return out;
}
