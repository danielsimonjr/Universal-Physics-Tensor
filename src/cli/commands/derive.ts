/**
 * `upt derive` — derive the caller's own equation's dimensional form, and
 * (with `--formula`) verify it and recover the dimensionless prefactor.
 * Transposed verbatim from bin/upt.mjs's `derive()` (lines 313-385, the
 * post-crash-fix body — `format(r.dim)`/`format(target.dim)` on the
 * dimension-check line), plus `--json`. `fmtMono`/`BASES`/`dimsEqualTol`
 * move here with it.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';
import { UsageError, EXIT_CHECK_FAILED } from '../errors.js';
import { formulaParserLabel } from '../version.js';
import { withParser } from '../euler-guard.js';
import { canonicalCheckFailed, conventionLines } from '../conventions.js';
import type { Dimension } from '../../dimensional/types.js';

const FLAGS: FlagSpec[] = [
  {
    name: '--formula',
    valueStyle: 'next',
    description: 'Check EXPR against the declared dimensions and recover the dimensionless prefactor.',
  },
  { name: '--debug', valueStyle: 'none', description: 'Print the formula parser name and version on stderr.' },
  JSON_FLAG,
];

const HELP = `upt derive <target:dim> <var:dim> ... [--formula "<expr>"] [--debug]
        Derive YOUR OWN equation's dimensional form. <dim> is a named
        dimension (length, time, mass, velocity, ...), a constant (hbar, c,
        G, k_B, e — e here is the elementary charge's dimension), a named
        product/quotient (power/area, length*temperature),
        or explicit (L^3.M^-1.T^-2). Parentheses group a factor
        (power/(area*temperature^4)); pressure, density, volume, viscosity,
        resistance, magnetic_field and permeability are names; mass/length^3 and M/L^3 work.
        In --formula, a bare e is the elementary charge and E is energy.
        Euler's number is exp(x), for example exp(1). The name euler is refused.
        With --formula, also verify it and
        recover the dimensionless prefactor. --debug prints the formula parser
        and its version to stderr.
        e.g.  upt derive period:time length:length gravity:acceleration \\
                       --formula "2*pi*sqrt(length/gravity)"`;

const fmtMono = (m: Readonly<Record<string, number>>): string =>
  Object.entries(m)
    .filter(([, e]) => Math.abs(e) > 1e-9)
    .map(([n, e]) => (e === 1 ? n : `${n}^${e}`))
    .join('·') || '(dimensionless)';

const BASES = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const;
const dimsEqualTol = (a: Dimension, b: Dimension): boolean =>
  BASES.every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) < 1e-9);

async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out, err } = ctx;
  const isJson = args.flags.has('json');
  const debug = args.flags.has('debug');
  const formulaFlag = args.flags.get('formula');
  const formula = formulaFlag ? formulaFlag[formulaFlag.length - 1] : undefined;

  const rest = args.positionals;
  if (rest.length < 1) {
    throw new UsageError(
      'upt derive needs a target spec, e.g.  upt derive period:time length:length gravity:acceleration'
    );
  }

  let specs: { name: string; dim: Dimension }[];
  try {
    specs = rest.map((a) => {
      const c = a.indexOf(':');
      if (c < 1) throw new Error(`'${a}' must be name:dimension (e.g. period:time)`);
      return { name: a.slice(0, c), dim: api.parseDimensionSpec(a.slice(c + 1)) };
    });
  } catch (e) {
    throw new UsageError('  ' + (e as Error).message);
  }

  const target = specs[0];
  const governing = specs.slice(1);
  const det = api.dimensionallyDetermines(target, governing);

  // Text lines follow the OLD bin's exact interleaving (bin/upt.mjs lines
  // 340-385): the header/determination block — and the dimensional-check
  // line — hit stdout BEFORE the formula parse/evaluate error sites, so a
  // failing formula still leaves the partial report on stdout (the
  // error-conversion fidelity rule: output emitted before the old
  // `process.exit(2)` stays emitted before the throw). In --json mode text
  // is suppressed and errors emit no JSON, so nothing precedes a throw.
  const textOut = isJson ? () => {} : out;

  let full: ReturnType<typeof api.buckinghamPi> | undefined;
  let formulaCheck: ReturnType<Awaited<ReturnType<typeof api.getFormulaDimensionChecker>>['check']> | undefined;
  let mean: number | undefined;
  let canonicalComparisons: ReturnType<typeof api.compareWithCanonical> | undefined;
  // The formula's checks: dimension, monomial, canonical comparison. Any failure exits 3.
  let failed = false;

  const emitEnvelope = (): void => {
    emitJson(
      {
        command: 'derive',
        result: {
          determination: det,
          ...(full !== undefined ? { buckingham: full } : {}),
          ...(formulaCheck !== undefined ? { formulaCheck } : {}),
          ...(mean !== undefined ? { prefactor: mean } : {}),
          ...(canonicalComparisons !== undefined ? { canonicalComparisons } : {}),
        },
      },
      ctx.write
    );
  };

  textOut(`\n● ${target.name}  from {${governing.map((g) => g.name).join(', ')}}`);
  if (det.determined) {
    textOut(`  dimensionally determined up to a constant:  ${target.name} ∝ ${fmtMono(det.monomial!)}`);
  } else {
    full = api.buckinghamPi([target, ...governing]);
    textOut(`  NOT a unique monomial — ${full.piGroupCount} free dimensionless group(s) (${full.verdict}):`);
    for (const g of full.piGroups) textOut(`     ${g.formula}`);
    textOut(`  (${det.reason})`);
  }

  if (formula) {
    const parser = await api.getFormulaParser();
    if (debug) err(`  [parser: ${formulaParserLabel(await api.getFormulaParserKind())}]`);

    const checker = await api.getFormulaDimensionChecker();
    const dims = Object.fromEntries(governing.map((g) => [g.name, g.dim]));
    const r = checker.check(formula, dims);
    formulaCheck = r;
    if (!r.ok) {
      failed = true;
      textOut(`  formula dimensional check: ✗ ${r.error}`);
    } else {
      const matches = dimsEqualTol(r.dim!, target.dim);
      if (!matches) failed = true;
      textOut(
        `  formula dimension: ${api.format(r.dim!)}`
          + (matches ? `  ✓ homogeneous, matches target` : `  ⚠ homogeneous but ≠ target ${api.format(target.dim)}`)
      );
    }

    let cf;
    try {
      cf = parser.parse(formula);
    } catch (e) {
      throw new UsageError(withParser('  formula parse error: ' + (e as Error).message, await api.getFormulaParserKind()));
    }
    // Dimensions cannot see a prefactor: compare with the canonical equation this
    // formula restates, when the registry holds one (persona finding L2). This
    // needs no unique monomial, so it runs on both branches below. A variable
    // named after a registered constant is that constant, as in `upt map --equation`.
    const isConstant = (g: { name: string; dim: Dimension }): boolean => {
      const c = api.CONSTANTS[g.name];
      return c !== undefined && dimsEqualTol(c.dim, g.dim);
    };
    const variables = governing.filter((g) => !isConstant(g));
    const compiled = cf;
    canonicalComparisons = api.compareWithCanonical(
      target.name,
      variables.map((g) => ({ name: g.name, dim: g.dim })),
      (values) =>
        compiled.evaluate(
          Object.fromEntries(
            governing.map((g) => [
              g.name,
              isConstant(g) ? api.CONSTANTS[g.name]!.value : values[g.name.replace(/_/g, '-')]!,
            ]),
          ),
        ),
    );
    const printComparisons = (): void => {
      for (const line of api.describeComparisons(canonicalComparisons!)) textOut(`  ${line}`);
      for (const line of conventionLines(canonicalComparisons!.map((c) => c.id))) textOut(`  ${line}`);
    };
    if (canonicalCheckFailed(canonicalComparisons)) failed = true;

    if (!det.determined) {
      textOut('  formula given, but with no unique monomial there is no single prefactor to recover.');
      printComparisons();
      if (isJson) emitEnvelope();
      return failed ? EXIT_CHECK_FAILED : 0;
    }

    const ratios: number[] = [];
    for (let j = 0; j < 3; j++) {
      const scope: Record<string, number> = {};
      governing.forEach((g, i) => {
        scope[g.name] = Math.pow(1.7 + i, 1 + 0.3 * j);
      });
      let cand = 1;
      for (const g of governing) cand *= Math.pow(scope[g.name], det.monomial?.[g.name] || 0);
      try {
        ratios.push(cf.evaluate(scope) / cand);
      } catch (e) {
        throw new UsageError('  formula uses an undeclared variable: ' + (e as Error).message);
      }
    }
    mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const cv = Math.sqrt(ratios.reduce((a, b) => a + (b - mean!) ** 2, 0) / ratios.length) / Math.abs(mean);
    if (!(cv < 1e-9)) failed = true;
    textOut(
      cv < 1e-9
        ? `  formula MATCHES the dimensional form — recovered prefactor ≈ ${mean.toExponential(4)}`
        : `  formula does NOT match the dimensional monomial (different input-dependence — a decoy or different physics).`
    );
    printComparisons();
  }

  if (isJson) emitEnvelope();
  return failed ? EXIT_CHECK_FAILED : 0;
}

export const command: Command = {
  name: 'derive',
  aliases: ['dim'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Derive the dimensional form of your own equation and, with --formula, the prefactor.',
  example: 'upt derive period:time length:length gravity:acceleration --formula "2*pi*sqrt(length/gravity)"',
  group: 'evaluate',
  run,
};

registerCommand(command);
