/**
 * The one reader of a numeric flag value for the UPT CLI.
 *
 * `Number()` accepts hex (`0x10`), binary, octal, an exponent on an integer (`1e1`), and reads
 * `''` and whitespace as 0, so a flag read through it took a value the user did not type
 * (`upt map --max-routes=0x10` ran with 16). An integer flag is digits with an optional sign; a
 * real flag is a decimal with an optional fraction and exponent. A token outside the grammar is
 * a malformed invocation (`UsageError`, exit 2) naming the flag and the token; a well-formed
 * value outside the flag's range is the command's own value refusal (exit 1), judged after.
 *
 * @module cli/numeric-flag
 * @internal
 */
import { UsageError } from './errors.js';

/** `3`, `-2`, `+7`, `010`: digits with an optional sign, nothing else. */
const INTEGER = /^[+-]?\d+$/;

/** `3`, `-2.5`, `.5`, `5.`, `1e-3`, `2E+4`: a decimal with an optional fraction and exponent. */
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Whether `s` is a decimal literal of the AST grammar (`2`, `0.5`, `1e-3`), and so a number and
 * not a symbol name. `''`, whitespace and `0x10` are not. (`src/dimensional/ast-leaves.ts` is
 * to export the same test; this copy goes when it lands.)
 */
export function isDecimalLiteral(s: string): boolean {
  return DECIMAL.test(s);
}

/** The help pointer, worded as the parser's unknown-flag message words it. */
function hint(command: string): string {
  return command === '' ? 'see upt help' : `see upt help ${command.split(' ')[0]}`;
}

/**
 * The integer a flag was given, or a `UsageError` naming the flag and the token.
 * `command` is the command word for the message (`''` for an option of upt itself);
 * `label` names the flag (`--max-routes`, or `--sweep sample count` for one field of a value).
 */
export function integerFlag(command: string, label: string, raw: string): number {
  if (!INTEGER.test(raw)) {
    throw new UsageError(
      `upt${command === '' ? '' : ` ${command}`}: ${label} '${raw}' is not an integer (digits only, such as 3 or -2; ${hint(command)})`,
    );
  }
  return Number(raw);
}

/**
 * The real number a flag was given, or a `UsageError` naming the flag and the token. The
 * arguments are {@link integerFlag}'s. An exponent is a decimal form (`1e-3`); hex is not.
 */
export function realFlag(command: string, label: string, raw: string): number {
  if (!DECIMAL.test(raw)) {
    throw new UsageError(
      `upt${command === '' ? '' : ` ${command}`}: ${label} '${raw}' is not a number (a decimal such as 2, 0.5 or 1e-3; ${hint(command)})`,
    );
  }
  return Number(raw);
}
