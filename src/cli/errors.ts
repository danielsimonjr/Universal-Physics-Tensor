/**
 * Typed error classes and exit codes for the UPT CLI.
 *
 * `UsageError` signals a malformed invocation (bad flags, missing values,
 * unknown flags) — callers map it to exit code 2. `CliError` signals a
 * runtime failure within an otherwise well-formed invocation — exit code 1.
 * `EXIT_CHECK_FAILED` (3) is returned, not thrown: the command ran, and its
 * check came out negative.
 */

/** A malformed invocation: bad flags, missing values, unknown flags. The CLI exits 2. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

/** A runtime failure inside a well-formed invocation, such as an unknown model id. The CLI exits 1. */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/**
 * Exit code of a command that ran and whose CHECK came out negative: a
 * dimension mismatch, a formula that differs from the canonical one, a regime
 * or horizon violated on a path (persona finding F2; 0.47.0). Such a command
 * used to exit 0, so a script could not tell a failed check from a passed one.
 * A path or regime UNKNOWN, where a coordinate was not supplied, is not a
 * failure and exits 0. A map equation whose catalog target was compared using
 * an unresolved name exits 3 and does not quote that placeholder dimension,
 * unless a canonical comparison agreed. A derive that is not a unique monomial
 * exits 3. An unbound map target, where nothing was compared, stays 0.
 */
export const EXIT_CHECK_FAILED = 3;
