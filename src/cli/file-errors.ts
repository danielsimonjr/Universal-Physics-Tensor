/**
 * Maps a failure to read or parse an input file to a `CliError`, so no stack trace reaches the
 * user. `upt probe` and `upt retrieve --expr` read the same file formats and share this mapper.
 *
 * @module cli/file-errors
 * @internal
 */
import type { CommandCtx } from './command.js';
import { CliError, UsageError } from './errors.js';

/** The `code` and `path` Node puts on a failed file-system call; empty for any other error. */
function errnoOf(e: unknown): { code?: string; path?: string } {
  if (!(e instanceof Error)) return {};
  const code: unknown = 'code' in e ? e.code : undefined;
  const path: unknown = 'path' in e ? e.path : undefined;
  return {
    ...(typeof code === 'string' ? { code } : {}),
    ...(typeof path === 'string' ? { path } : {}),
  };
}

/**
 * Map file and parse failures to CLI errors (no stack traces). `command` is the command name
 * that starts each message. `kind` names what the file was read as (`a problem file`,
 * `an expression file`, `a bounds file`), so a refusal of the loader's own checks says the right thing.
 */
export function mapFileError(
  api: CommandCtx['api'],
  e: unknown,
  command: string,
  context?: string,
  kind = 'a problem file',
): never {
  if (e instanceof UsageError || e instanceof CliError) throw e;
  const errno = errnoOf(e);
  if (errno.code === 'ENOENT') {
    throw new CliError(`upt ${command}: file not found: ${errno.path ?? context ?? 'unknown'}`);
  }
  if (e instanceof SyntaxError) {
    // The JSON readers prefix the file's path; a context that names it already drops the repeat.
    const message = context !== undefined && e.message.startsWith(`${context}: `) ? e.message.slice(context.length + 2) : e.message;
    throw new CliError(`upt ${command}: invalid JSON${context ? ` in ${context}` : ''}: ${message}`);
  }
  // The loader checks every field it reads and names the one that is wrong.
  if (e instanceof api.ProblemFileError) {
    throw new CliError(
      `upt ${command}: ${context ?? 'the file'} is not ${kind}: ${e.message}. \`upt help ${command}\` shows the format.`,
    );
  }
  // A TypeError or a RangeError past those checks is a field of a shape the loader does not
  // check. It is reported as that, with the engine's words marked as the engine's.
  if (e instanceof TypeError || e instanceof RangeError) {
    throw new CliError(
      `upt ${command}: ${context ?? 'the file'} has a field of a shape the ${command} command does not read (internal: ${e.message}). \`upt help ${command}\` shows the format.`,
    );
  }
  if (e instanceof Error) {
    throw new CliError(`upt ${command}: ${e.message}`);
  }
  throw e;
}
