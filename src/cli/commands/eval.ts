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
import { unboundEulerRefusal, withParser } from '../euler-guard.js';
import { HBAR_TRUNCATION_NOTE, codataScope, evalUnitNotes, parseEvalToken } from '../eval-numbers.js';
import type { UnitMode } from '../../composition/natural-units.js';
import { UnitError } from '../../dimensional/units.js';

const FLAGS: FlagSpec[] = [
  { name: '--debug', valueStyle: 'none' },
  { name: '--json', valueStyle: 'none' },
  { name: '--show-parser', valueStyle: 'none' },
  { name: '--allow-euler', valueStyle: 'none' },
  { name: '--natural', valueStyle: 'none' },
  { name: '--geometrized', valueStyle: 'none' },
];

/** Reject malformed `name=value` bindings. A value may carry a unit (`1Msun`). */
function parseScope(args: readonly string[]): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const a of args) {
    const eq = a.indexOf('=');
    if (eq < 0) {
      throw new UsageError(`upt eval: '${a}' must be name=value. See \`upt help\`.`);
    }
    const name = a.slice(0, eq);
    const raw = a.slice(eq + 1);
    let num: number;
    try {
      num = parseEvalToken(raw);
    } catch (e) {
      const msg = e instanceof UnitError ? e.message : (e as Error).message;
      throw new UsageError(`upt eval: '${a}' is not a finite number or a known unit. ${msg}`);
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
        Elementary charge is e_charge, not e. An unbound e under MathTS is
        refused (exit 2) unless you pass e=<number> or --allow-euler. CODATA
        names are filled in when you omit them: G, c, hbar, h, k_B, e_charge,
        m_e, eps0, epsilon_0, mu0, mu_0, kB, M_sun, GM_sun. A value may carry a unit (M=1Msun,
        B=1T, x=1AU). --natural sets ħ = c = 1 (h = 2π); --geometrized also
        sets G = 1. --show-parser prints mathts or builtin and, with no
        formula, exits 0. --debug prints the parser and its version to stderr.
        An unknown function fails and names a documented equivalent where one
        exists (lg → log10).
        e.g.  upt eval "hbar*c^3/(8*pi*G*M*k_B)" hbar=1.054571817e-34 \\
                       c=299792458 G=6.6743e-11 M=1.989e30 k_B=1.380649e-23`;

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out, err } = ctx;
  const debug = args.flags.has('debug');
  const isJson = args.flags.has('json');
  const positionals = args.positionals;
  const kind = await api.getFormulaParserKind();

  const expr = positionals[0];
  if (args.flags.has('show-parser') && !expr) {
    out(kind);
    return 0;
  }
  if (!expr) {
    throw new UsageError('upt eval needs a formula, e.g.  upt eval "a*b^2" a=2 b=3');
  }

  const parser = await api.getFormulaParser();
  if (debug) err(`[parser: ${formulaParserLabel(kind)}]`);

  let cf;
  try {
    cf = parser.parse(expr);
  } catch (e) {
    throw new UsageError(withParser('parse error: ' + (e as Error).message, kind));
  }

  const mode: UnitMode = args.flags.has('geometrized') ? 'geometrized' : args.flags.has('natural') ? 'natural' : 'si';
  const scope = { ...codataScope(mode), ...parseScope(positionals.slice(1)) };
  if (args.flags.has('allow-euler') && !('e' in scope)) scope.e = Math.E;

  const refusal = unboundEulerRefusal(expr, cf.variables, kind, args.flags.has('allow-euler'), 'e' in parseScope(positionals.slice(1)));
  if (refusal) throw new UsageError(refusal);
  const note = eulerConstantNote(expr, cf.variables);
  if (note && (args.flags.has('allow-euler') || 'e' in scope)) err(note);

  const missing = cf.variables.filter((v) => !(v in scope));
  if (missing.length) {
    const eHint = missing.includes('e')
      ? ' A bare e is not given a value. Pass e=<number>, --allow-euler for Euler\'s number, or e_charge for the elementary charge.'
      : '';
    throw new UsageError(
      withParser(
        `missing values for: ${missing.join(', ')}   (free variables: ${cf.variables.join(', ') || 'none'}).${eHint}`,
        kind,
      ),
    );
  }

  const notes: string[] = [];
  if (mode === 'si' && cf.variables.includes('hbar')) notes.push(HBAR_TRUNCATION_NOTE);
  for (const raw of positionals.slice(1)) {
    for (const note of evalUnitNotes(raw.slice(raw.indexOf('=') + 1))) {
      if (!notes.includes(note)) notes.push(note);
    }
  }
  for (const note of notes) err(note);

  let value: number;
  try {
    value = cf.evaluate(scope);
  } catch (e) {
    throw new UsageError(withParser((e as Error).message, kind));
  }

  if (isJson) {
    emitJson(
      {
        command: 'eval',
        result: { value, ...(notes.length === 0 ? {} : { notes }), ...(mode === 'si' ? {} : { units: mode }) },
      },
      ctx.write,
    );
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
