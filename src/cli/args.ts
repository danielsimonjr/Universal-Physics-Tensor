/**
 * Hand-written declarative flag parser for the UPT CLI.
 *
 * Only tokens starting with `--` are treated as flags; everything else
 * (including `name=value` and `name:dim` positionals) passes through to
 * `positionals` untouched and in original order. A bare `--` ends the
 * options: every later token is a positional, whatever it starts with.
 * Single left-to-right scan, zero dependencies.
 */

import { UsageError } from './errors.js';

export interface FlagSpec {
  name: string; // e.g. '--source'
  valueStyle: 'attached' | 'next' | 'either' | 'none';
  /** The flag may be given more than once; the values are kept in order. */
  repeatable?: boolean;
  /** For 'either'/'next' styles: a missing value stores '' instead of throwing —
   * exists for old-CLI fidelity (--equation's empty-value diagnostic belongs to
   * the command, not the parser). */
  optionalValue?: boolean;
  /**
   * One sentence printed by `upt help` and by `docs/CLI.md`.
   * A registered command's flags set this. The parser does not read it.
   */
  description?: string;
  /** Printed default, when the command has one. Omit when there is no default. */
  defaultValue?: string;
}

/** The token that ends option parsing. */
export const END_OF_OPTIONS = '--';

/** The tokens before a bare `--`: the ones the dispatcher may read as options. */
export function optionTokens(argv: readonly string[]): readonly string[] {
  const end = argv.indexOf(END_OF_OPTIONS);
  return end === -1 ? argv : argv.slice(0, end);
}

export interface ParsedArgs {
  flags: Map<string, string[]>; // name (no dashes) -> raw values ('' for none-style)
  positionals: string[];
}

/**
 * How many positional arguments a command reads. A command declares it on its registration;
 * absent means none, and every positional is then a stray token (cli/README.md §Hardening:
 * nothing typed is silently dropped).
 */
export interface PositionalArity {
  /** The most positionals the command reads; `Infinity` for a list. The token past it is refused. */
  readonly max: number;
}

/** No positional is read. The parser's default when a command declares nothing. */
export const NO_POSITIONALS: PositionalArity = { max: 0 };

/**
 * Refuse the positional past `max` as a usage error naming the token and the command:
 * `upt audit: unexpected argument 'junk' (audit takes no positional arguments; see upt help audit)`.
 * `command` may carry a subverb (`probe scan`), whose first word is the help target.
 */
export function refuseExtraPositionals(command: string, positionals: readonly string[], max: number): void {
  if (positionals.length <= max) return;
  const takes =
    max === 0
      ? `${command} takes no positional arguments`
      : `${command} takes at most ${max} positional argument${max === 1 ? '' : 's'}`;
  throw new UsageError(
    `upt ${command}: unexpected argument '${positionals[max]}' (${takes}; see upt help ${command.split(' ')[0]})`,
  );
}

/**
 * Parse `argv` against the command's flag specs. `positionals` is the command's declared arity
 * (`Command.positionals`); a token past it, or any token when none is declared, is a `UsageError`.
 */
export function parseArgs(
  command: string,
  argv: string[],
  specs: FlagSpec[],
  arity: PositionalArity = NO_POSITIONALS,
): ParsedArgs {
  const bySpecName = new Map<string, FlagSpec>();
  for (const spec of specs) bySpecName.set(spec.name, spec);

  const flags = new Map<string, string[]>();
  const positionals: string[] = [];
  const hint = `(see upt help ${command})`;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === END_OF_OPTIONS) {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const eqIndex = token.indexOf('=');
    const flagName = eqIndex === -1 ? token : token.slice(0, eqIndex);
    const attachedValue = eqIndex === -1 ? undefined : token.slice(eqIndex + 1);

    const spec = bySpecName.get(flagName);
    if (!spec) {
      // The three file options belong to `upt`, not to a command, and are read only before the command.
      if (flagName === '--record' || flagName === '--replay' || flagName === '--show-record') {
        throw new UsageError(
          `unknown flag '${flagName}' for '${command}' ${hint}; ${flagName} is an option of upt itself and goes before the command: upt ${flagName}=FILE ${command} ...`,
        );
      }
      throw new UsageError(`unknown flag '${flagName}' for '${command}' ${hint}`);
    }

    let value: string;
    if (attachedValue !== undefined) {
      if (spec.valueStyle === 'next') {
        throw new UsageError(
          `flag '${spec.name}' does not accept an attached value; use '${spec.name} VALUE' for '${command}' ${hint}`
        );
      }
      if (spec.valueStyle === 'none') {
        throw new UsageError(`flag '${spec.name}' takes no value for '${command}' ${hint}`);
      }
      value = attachedValue;
    } else if (spec.valueStyle === 'attached') {
      throw new UsageError(`flag '${spec.name}' requires '${spec.name}=VALUE' for '${command}' ${hint}`);
    } else if (spec.valueStyle === 'none') {
      value = '';
    } else {
      // 'next' or 'either' with no attached value: consume the next token.
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        if (!spec.optionalValue) {
          throw new UsageError(`flag '${spec.name}' requires a value for '${command}' ${hint}`);
        }
        value = '';
      } else {
        value = next;
        i++;
      }
    }

    const key = spec.name.slice(2);
    const existing = flags.get(key);
    if (existing) {
      if (!spec.repeatable) {
        throw new UsageError(`flag '${spec.name}' given more than once for '${command}' ${hint}`);
      }
      existing.push(value);
    } else {
      flags.set(key, [value]);
    }
  }

  refuseExtraPositionals(command, positionals, arity.max);
  return { flags, positionals };
}
