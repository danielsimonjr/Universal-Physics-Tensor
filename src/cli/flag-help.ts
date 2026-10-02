/**
 * Flag text for `upt help` and for `docs/CLI.md`.
 *
 * The parser reads `FlagSpec` (`args.ts`). This module renders the same
 * objects. A command's help string is `commandHelp(prose, flags)`, so the
 * Flags section cannot list a different set than the parser accepts.
 */

import type { FlagSpec } from './args.js';

/** `--json` on a data-bearing command. The same object is the global option. */
export const JSON_FLAG: FlagSpec = {
  name: '--json',
  valueStyle: 'none',
  description: 'Write a JSON envelope to stdout instead of the text report.',
};

/**
 * `--source=VALUE` for a graph command.
 * `detail` is the sentence; `defaultValue` is what the command uses when the flag is absent.
 */
export function sourceFlag(defaultValue: string, detail: string): FlagSpec {
  return {
    name: '--source',
    valueStyle: 'attached',
    description: detail,
    defaultValue,
  };
}

/** Dispatcher options. `main.ts` accepts these before the command name. */
export const GLOBAL_FLAGS: readonly FlagSpec[] = [
  {
    name: '--help',
    valueStyle: 'none',
    description:
      'Show this command list, or `upt help <command>` for one command. `-h` is the same. `upt <command> --help` prints that command.',
  },
  {
    name: '--version',
    valueStyle: 'none',
    description: 'Print the package version as one semver line and exit. `-v` and `upt version` are the same. Neither takes --json.',
  },
  JSON_FLAG,
  {
    name: '--record',
    valueStyle: 'attached',
    description:
      'Run the following command unchanged and append one JSONL entry to FILE: arguments, stdout, stderr, exit code, versions, and hashes. A failed run is recorded too.',
  },
  {
    name: '--replay',
    valueStyle: 'attached',
    description:
      'Re-run every entry of FILE and report reproduced, differs, or not replayable. Takes no command. `--json` after it selects the JSON report. Exit 0 when every entry is reproduced and unchanged, 3 when any differs, 1 otherwise.',
  },
  {
    name: '--show-record',
    valueStyle: 'attached',
    description: 'Print FILE as a transcript and run nothing. Takes no command. `--json` after it selects the JSON report.',
  },
];

export const BUILTIN_VERBS: readonly {
  name: string;
  summary: string;
  example: string;
  group: 'utilities';
}[] = [
  {
    name: 'help',
    summary: 'Show every command, or one command\'s usage and flags. `upt help statuses` defines the status words.',
    example: 'upt help eval',
    group: 'utilities',
  },
  {
    name: 'version',
    summary: 'Print the installed package version as one semver line.',
    example: 'upt version',
    group: 'utilities',
  },
];

export function flagHeading(flag: FlagSpec): string {
  const repeat = flag.repeatable ? ' (repeatable)' : '';
  switch (flag.valueStyle) {
    case 'none':
      return `${flag.name}${repeat}`;
    case 'attached':
      return `${flag.name}=VALUE${repeat}`;
    case 'next':
      return `${flag.name} VALUE${repeat}`;
    case 'either':
      return `${flag.name}=VALUE${repeat} (or ${flag.name} VALUE)`;
    default: {
      const _never: never = flag.valueStyle;
      return _never;
    }
  }
}

/** The Flags block a command's help string ends with. Empty when the command takes no flags. */
export function renderFlagCatalog(flags: readonly FlagSpec[], heading = 'Flags:'): string {
  if (flags.length === 0) return '';
  const lines = [heading];
  for (const flag of flags) {
    if (flag.description === undefined || flag.description.trim() === '') {
      throw new Error(`flag ${flag.name} has no description`);
    }
    lines.push(`  ${flagHeading(flag)}`);
    const def = flag.defaultValue === undefined ? '' : ` Default: ${flag.defaultValue}.`;
    lines.push(`        ${flag.description}${def}`);
  }
  return lines.join('\n');
}

/** Prose plus the flag catalog. The catalog is the spec; the prose is the narrative. */
export function commandHelp(prose: string, flags: readonly FlagSpec[]): string {
  const catalog = renderFlagCatalog(flags);
  return catalog === '' ? prose : `${prose}\n${catalog}`;
}

/**
 * Flags whose description is missing from `help`.
 * A command that forgot `commandHelp` fails here. A description that is present does not.
 */
export function undocumentedFlags(help: string, flags: readonly FlagSpec[]): string[] {
  return flags.filter((flag) => flag.description === undefined || !help.includes(flag.description)).map((flag) => flag.name);
}
