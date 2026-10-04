/**
 * `upt --help` is the registered commands' own help, not a second copy.
 *
 * `upt chain` stays off this list: the name is registered so it is not
 * "unknown", and `upt help chain` is the status. `help` and `version` are
 * dispatch verbs, not registered commands, so this renderer names them once.
 *
 * @module cli/top-level-help
 */

import type { FlagSpec } from './args.js';
import type { Command } from './command.js';
import { renderFlagCatalog } from './flag-help.js';

const HEADER = `upt — Universal Physics Tensor bridge-inference CLI

Usage:`;

const DISPATCH_VERBS = `  upt help        Show this message.
  upt help <command>
                  Show one command's usage and flags.
  upt help statuses
                  Define every status word the commands print.
  upt version     Show the installed CLI/package version.

Run with no arguments for a short demo.`;

/** Indent a command's own help so the registry test sees `  upt <name>`. */
function block(command: Command): string {
  const [first, ...rest] = command.help.split('\n');
  return [`  ${first ?? ''}`, ...rest].join('\n');
}

/**
 * Top-level help. Every non-empty line of a listed command's `help` appears
 * here. `upt chain` does not.
 *
 * @internal
 */
export function renderTopLevelHelp(commands: readonly Command[], globalFlags: readonly FlagSpec[]): string {
  const unique = [...new Map(commands.map((command) => [command.name, command])).values()];
  const blocks = unique
    .filter((command) => command.name !== 'chain')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(block);
  return `${HEADER}\n${blocks.join('\n\n')}\n\n${DISPATCH_VERBS}\n${renderFlagCatalog(globalFlags, 'Global options:')}`;
}
