/**
 * Hand-written declarative flag parser for the UPT CLI.
 *
 * Only tokens starting with `--` are treated as flags; everything else
 * (including `name=value` and `name:dim` positionals) passes through to
 * `positionals` untouched and in original order. Single left-to-right scan,
 * zero dependencies.
 */

import { UsageError } from './errors.js';

export interface FlagSpec {
  name: string; // e.g. '--source'
  valueStyle: 'attached' | 'next' | 'either' | 'none';
  repeatable?: boolean; // only --anchor today
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

export interface ParsedArgs {
  flags: Map<string, string[]>; // name (no dashes) -> raw values ('' for none-style)
  positionals: string[];
}

export function parseArgs(command: string, argv: string[], specs: FlagSpec[]): ParsedArgs {
  const bySpecName = new Map<string, FlagSpec>();
  for (const spec of specs) bySpecName.set(spec.name, spec);

  const flags = new Map<string, string[]>();
  const positionals: string[] = [];
  const hint = `(see upt help ${command})`;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const eqIndex = token.indexOf('=');
    const flagName = eqIndex === -1 ? token : token.slice(0, eqIndex);
    const attachedValue = eqIndex === -1 ? undefined : token.slice(eqIndex + 1);

    const spec = bySpecName.get(flagName);
    if (!spec) {
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

  return { flags, positionals };
}
