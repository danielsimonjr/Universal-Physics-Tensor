/**
 * Command registry + the `Command`/`CommandCtx` contract for the UPT CLI.
 *
 * A `Command` is a self-contained verb handler: its own flag specs, its own
 * help block, and a `run` that receives an injected `CommandCtx` (never
 * reaches for `process.stdout`/`process.argv` itself, so it is trivially
 * testable in-process). `main.ts` owns dispatch (`runCli`); this module only
 * owns the registry those commands plug into — new commands register
 * themselves (typically from their own module's top-level side effect, or
 * from a barrel later tasks import) without `runCli`'s body ever changing.
 */

import type { ParsedArgs, FlagSpec } from './args.js';
import type * as cliApi from '../cli-api.js';

export interface CommandCtx {
  args: ParsedArgs;
  api: typeof cliApi; // injected so tests can stub; main.ts passes the real barrel
  out: (line?: string) => void; // console.log semantics: write((line ?? '') + '\n')
  err: (line?: string) => void; // same semantics on stderr
  write: (s: string) => void; // raw stdout write, no newline (diagram output only)
}

/** README / docs/CLI.md grouping. The generator is the only reader. */
export type CommandGroup = 'evaluate' | 'explore' | 'discovery' | 'data' | 'utilities';

export interface CommandSub {
  readonly name: string;
  readonly summary: string;
}

export interface Command {
  name: string;
  aliases: string[];
  flags: FlagSpec[];
  help: string; // per-command usage block; the Flags section is renderFlagCatalog(flags)
  /** One line for the README table and docs/CLI.md. */
  summary?: string;
  /** One real invocation, including the `upt` word. */
  example?: string;
  group?: CommandGroup;
  /** Subverbs, when the command has them. `probe` is the one that does. */
  subcommands?: readonly CommandSub[];
  run(ctx: CommandCtx): Promise<number>; // 0 on success; throws UsageError/CliError otherwise
}

const registry = new Map<string, Command>();

/** Register a command under its name and every alias. Later registrations for
 * an already-taken name/alias overwrite the earlier one (keeps this usable
 * from tests that re-register a stub across cases). */
export function registerCommand(command: Command): void {
  registry.set(command.name, command);
  for (const alias of command.aliases) registry.set(alias, command);
}

/** Look up a command by its primary name or any alias. */
export function resolveCommand(nameOrAlias: string): Command | undefined {
  return registry.get(nameOrAlias);
}

/**
 * The PRIMARY names of every registered command, sorted (aliases excluded).
 *
 * The authority on what the CLI can run. `upt --help` is this list, each
 * command's own `help`, so a command registered without a help entry is still
 * named; `tests/cli/help-covers-registry.test.ts` compares the two. `upt chain`
 * is registered and omitted from that text.
 */
export function listCommandNames(): string[] {
  return [...new Set([...registry.values()].map((c) => c.name))].sort();
}

/** Test-only registration hook. Same behavior as `registerCommand` — kept as
 * a distinct, deliberately-unexciting name so it reads as test scaffolding
 * (not part of the CLI's own porting surface) at call sites in
 * `tests/cli/*.test.ts`. Not re-exported from `cli-api.ts` or `index.ts`. */
export function registerForTest(command: Command): void {
  registerCommand(command);
}

/** Test-only reset hook: clears every registered command (including
 * aliases). Lets test files register stub commands without leaking them
 * across files that share the module registry within a single worker. */
export function clearRegistryForTest(): void {
  registry.clear();
}
