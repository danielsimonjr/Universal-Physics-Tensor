/**
 * `upt eval` — evaluate the caller's own scalar formula (safe — arithmetic
 * only). Transposed verbatim from bin/upt.mjs's `evalCmd()` (lines
 * 290-310), plus `--json`. `--debug`/`--json` are now declared flags
 * (parsed by `args.ts`), so the positionals `evalCmd` used to filter
 * `--debug` out of by hand are already clean — the `expr`/`name=value`
 * positional-parsing contract is otherwise unchanged.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { emitJson } from '../output.js';
import { UsageError } from '../errors.js';
import { formulaParserLabel } from '../version.js';
import { eulerConstantNote } from '../../numerical/formula.js';

const FLAGS: FlagSpec[] = [
  { name: '--debug', valueStyle: 'none' },
  { name: '--json', valueStyle: 'none' },
];

/** Reject malformed `name=value` bindings — same contract as `upt explain` values mode. */
function parseScope(args: readonly string[]): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const a of args) {
    const eq = a.indexOf('=');
    if (eq < 0) {
      throw new UsageError(`upt eval: '${a}' must be name=value. See \`upt help\`.`);
    }
    const name = a.slice(0, eq);
    const raw = a.slice(eq + 1);
    const num = Number(raw);
    if (raw === '' || !Number.isFinite(num)) {
      throw new UsageError(
        `upt eval: '${a}' is not a finite number. Expected ${name}=<number>. See \`upt help\`.`,
      );
    }
    scope[name] = num;
  }
  return scope;
}

const HELP = `upt eval "<formula>" name=value ...
        Evaluate YOUR OWN scalar formula (safe — arithmetic only). Knows the
        constants pi and tau and the functions sqrt, cbrt, exp, ln, log
        (natural, = ln), log10, log2, abs, sin, cos, tan, asin, acos, atan,
        sinh, cosh, tanh, pow, atan2. log is the NATURAL logarithm: use log10
        or log2 for base 10 or 2. With the MathTS parser, a bare e is Euler's
        number (≈2.718); the built-in parser leaves e for you to set.
        Elementary charge and eccentricity need their own names. An unknown
        function fails and names a documented equivalent where one exists
        (lg → log10). Any other name must be supplied. --debug prints the
        parser and its version to stderr.
        e.g.  upt eval "hbar*c^3/(8*pi*G*M*k_B)" hbar=1.054571817e-34 \\
                       c=299792458 G=6.6743e-11 M=1.989e30 k_B=1.380649e-23`;

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out, err } = ctx;
  const debug = args.flags.has('debug');
  const isJson = args.flags.has('json');
  const positionals = args.positionals;

  const expr = positionals[0];
  if (!expr) {
    throw new UsageError('upt eval needs a formula, e.g.  upt eval "a*b^2" a=2 b=3');
  }

  const parser = await api.getFormulaParser();
  if (debug) err(`[parser: ${formulaParserLabel(await api.getFormulaParserKind())}]`);

  let cf;
  try {
    cf = parser.parse(expr);
  } catch (e) {
    throw new UsageError('parse error: ' + (e as Error).message);
  }

  const note = eulerConstantNote(expr, cf.variables);
  if (note) err(note);

  const scope = parseScope(positionals.slice(1));

  const missing = cf.variables.filter((v) => !(v in scope));
  if (missing.length) {
    throw new UsageError(
      `missing values for: ${missing.join(', ')}   (free variables: ${cf.variables.join(', ') || 'none'})`
    );
  }

  let value: number;
  try {
    value = cf.evaluate(scope);
  } catch (e) {
    throw new UsageError((e as Error).message);
  }

  if (isJson) {
    emitJson({ command: 'eval', result: { value } }, ctx.write);
    return 0;
  }

  out(String(value));
  return 0;
}

export const command: Command = {
  name: 'eval',
  aliases: ['calc'],
  flags: FLAGS,
  help: HELP,
  run,
};

registerCommand(command);
