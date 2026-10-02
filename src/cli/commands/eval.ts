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
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';
import { CliError, UsageError } from '../errors.js';
import { formulaParserLabel } from '../version.js';
import { withParser } from '../euler-guard.js';
import { HBAR_TRUNCATION_NOTE, codataScope } from '../eval-numbers.js';
import type { UnitMode } from '../../dimensional/natural-units.js';
import { UnitError } from '../../dimensional/units.js';
import { readBinding } from '../../numerical/binding-value.js';
import { builtinFormulaDimensionChecker } from '../../numerical/formula-dimension.js';

const FLAGS: FlagSpec[] = [
  { name: '--debug', valueStyle: 'none', description: 'Print the formula parser name and version on stderr.' },
  JSON_FLAG,
  {
    name: '--show-parser',
    valueStyle: 'none',
    description: 'Print mathts or builtin. With no formula, that is the whole output and the exit code is 0.',
  },
  { name: '--natural', valueStyle: 'none', description: 'Set ħ = c = 1 (and h = 2π) when reading values.' },
  { name: '--geometrized', valueStyle: 'none', description: 'Set ħ = c = G = 1 when reading values.' },
];

/**
 * Read `name=value` bindings. A missing `=` is a usage error (exit 2).
 * A value that is not a finite number or a known unit is a bad value
 * (exit 1), the same code `upt evaluate` uses. A value is a number, a
 * unit (`1Msun`), or an expression of constants and units (`0.6*c`, `pi/2`).
 */
function parseScope(args: readonly string[], mode: UnitMode): { scope: Record<string, number>; notes: string[] } {
  const scope: Record<string, number> = {};
  const notes: string[] = [];
  for (const a of args) {
    const eq = a.indexOf('=');
    if (eq < 0) {
      throw new UsageError(`upt eval: '${a}' must be name=value. See \`upt help\`.`);
    }
    const name = a.slice(0, eq);
    const raw = a.slice(eq + 1);
    try {
      const read = readBinding(raw, { mode });
      scope[name] = read.value;
      for (const note of read.notes) if (!notes.includes(note)) notes.push(note);
    } catch (e) {
      const msg = e instanceof UnitError ? e.message : (e as Error).message;
      throw new CliError(`upt eval: '${a}' is not a finite number or a known unit. ${msg}`);
    }
  }
  return { scope, notes };
}

const HELP = `upt eval "<formula>" name=value ...
        Evaluate YOUR OWN scalar formula (safe — arithmetic only). Knows the
        constants pi and tau and the functions sqrt, cbrt, exp, ln, log
        (natural, = ln), log10, log2, abs, sin, cos, tan, asin, acos, atan,
        sinh, cosh, tanh, pow, atan2. log is the NATURAL logarithm: use log10
        or log2 for base 10 or 2. A bare e is the elementary charge (the
        CODATA value). E is energy: pass E=<number>. Euler's number is
        exp(x), for example exp(1), never a bare e and never the name euler.
        e_charge is the same charge.
        An explicit e=<number> replaces the CODATA value. CODATA
        names are filled in when you omit them: every registered constant
        (G, c, hbar, h, k_B, e, ln2, epsilon_0, sigma_sb, b, GM_sun, Msun_iau)
        and the aliases e_charge, m_e, eps0, mu0, mu_0, kB, M_sun. A bare
        sigma is not the Stefan–Boltzmann constant; write sigma_sb. A value may be a
        number, a unit (M=1Msun, B=1T, x=1AU) or an expression of those
        constants and units (v=0.6*c, theta=pi/2). Bindings use the built-in
        parser, so write 2*pi; a bare e there is the elementary charge.
        --natural sets ħ = c = 1 (h = 2π); --geometrized also
        sets G = 1. --show-parser prints mathts or builtin and, with no
        formula, exits 0. With --json that answer is a JSON envelope.
        --debug prints the parser and its version to stderr.
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
    if (isJson) {
      emitJson({ command: 'eval', result: { parser: kind } }, ctx.write);
      return 0;
    }
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
  const parsed = parseScope(positionals.slice(1), mode);
  const scope = { ...codataScope(mode), ...parsed.scope };

  const missing = cf.variables.filter((v) => !(v in scope));
  if (missing.length) {
    const energyHint = missing.includes('E')
      ? ' E is energy. Pass E=<number> in joules, or with a unit (E=1eV).'
      : '';
    throw new UsageError(
      withParser(
        `missing values for: ${missing.join(', ')}   (free variables: ${cf.variables.join(', ') || 'none'}).${energyHint}`,
        kind,
      ),
    );
  }

  // A bare e is the CODATA charge. Subtracting it from a number is not
  // eccentricity, and the numeric result is indistinguishable from 1.
  // A caller who bound e chose a different quantity.
  if (!('e' in parsed.scope)) {
    const checked = builtinFormulaDimensionChecker().check(expr, {});
    if (!checked.ok && checked.error?.includes('elementary charge')) {
      throw new UsageError(withParser(checked.error, kind));
    }
  }

  const notes: string[] = [...parsed.notes];
  if (mode === 'si' && cf.variables.includes('hbar')) notes.push(HBAR_TRUNCATION_NOTE);
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
  help: commandHelp(HELP, FLAGS),
  summary: 'Evaluate a scalar formula. A bare e is the elementary charge; Euler\'s number is exp(x).',
  example: 'upt eval "2*pi*sqrt(1/9.81)"',
  group: 'evaluate',
  run,
};

registerCommand(command);
