/**
 * `upt symbolic` — compose bridges' SYMBOLIC (AST) forms, not just their
 * numeric evaluators (the Observable contract). Transposed verbatim from
 * bin/upt.mjs's `symbolicCmd()` + `exprToString()` (lines 734-777), plus
 * `--json`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { commandHelp, JSON_FLAG } from '../flag-help.js';
import { emitJson } from '../output.js';
import type { ExprNode } from '../../dimensional/validator.js';
import { EVAL_STUBS, printDisplay, printEval, printLatex, latexName, siUnitOf } from '../expr-print.js';

const FLAGS: FlagSpec[] = [
  {
    name: '--simplify',
    valueStyle: 'none',
    description: 'Fold each composed AST with MathTS, then check the fold dimensionally and numerically.',
  },
  JSON_FLAG,
];

const HELP = `upt symbolic [--simplify]
        Compose bridges' SYMBOLIC (AST) forms, not just their numeric
        evaluators (the Observable contract). Shows the CT-1 / CT-1b chains
        composed by substitution, dimensionally validated and evaluable.
        With --simplify, folds the composed AST via MathTS (k_B cancels),
        re-validated dimensionally + numerically. Each chain also prints an
        'eval form': a runnable \`upt eval\` command, fully grouped, that
        reproduces the printed value, a LaTeX form (\\frac for every
        division) and a symbol table: each symbol's meaning, value, SI unit
        and the source of a constant or the point an input is evaluated at.`;

function exprToString(n: ExprNode): string {
  return printDisplay(n) ?? `⟨${n.kind}⟩`;
}

/**
 * The composed formula as a runnable `upt eval` input, with every constant
 * and leaf bound, so copying it reproduces the printed value. `null` when the
 * AST holds a node the scalar evaluator cannot take.
 */
function evalFormOf(
  n: ExprNode,
  constants: CommandCtx['api']['CONSTANTS'],
  point: Readonly<Record<string, number>>,
): { formula: string; bindings: string[] } | null {
  const formula = printEval(n);
  if (formula === null) return null;
  const names: string[] = [];
  const collect = (e: ExprNode): void => {
    if (e.kind === 'symbol') {
      if (!names.includes(e.name)) names.push(e.name);
    } else if (e.kind === 'op') e.args.forEach(collect);
  };
  collect(n);
  const bindings: string[] = [];
  for (const name of names) {
    if (name in EVAL_STUBS || Number.isFinite(Number(name))) continue;
    const value = constants[name]?.value ?? point[name];
    if (value === undefined) return null;
    bindings.push(`${name}=${value}`);
  }
  return { formula, bindings };
}

const showEvalForm = (f: { formula: string; bindings: string[] } | null): string =>
  f === null ? 'none (a node the scalar evaluator cannot take)' : `upt eval "${f.formula}" ${f.bindings.join(' ')}`;

/** One row of the symbol table (audit I10). */
interface SymbolRow {
  readonly symbol: string;
  readonly meaning: string;
  readonly value: number;
  readonly unit: string;
  readonly source: string;
}

const SOLAR_MASS_SOURCE =
  'evaluation point: the solar mass 1.989e30 kg, the rounded value the repository uses (core/constants.ts M_SUN_SI)';

/**
 * Every named symbol of the formula, in order of first use: a registered constant with its meaning,
 * unit and source; an input with its quantity and the point it is evaluated at. Numeric literals are
 * not symbols. `null` when a name is neither, so no row is ever invented.
 */
function symbolTable(
  n: ExprNode,
  api: CommandCtx['api'],
  inputs: readonly { name: string; symbol: string; dim: Parameters<CommandCtx['api']['format']>[0] }[],
  point: Readonly<Record<string, number>>,
): SymbolRow[] | null {
  const names: string[] = [];
  const collect = (e: ExprNode): void => {
    if (e.kind === 'symbol') {
      if (!names.includes(e.name) && !Number.isFinite(Number(e.name))) names.push(e.name);
    } else if (e.kind === 'op') e.args.forEach(collect);
  };
  collect(n);
  const rows: SymbolRow[] = [];
  for (const name of names) {
    const c = api.CONSTANTS[name];
    const info = api.CONSTANT_PROVENANCE[name];
    if (c !== undefined && info !== undefined) {
      rows.push({ symbol: name, meaning: info.meaning, value: c.value, unit: info.unit, source: info.source });
      continue;
    }
    const q = inputs.find((i) => i.name === name);
    const v = point[name];
    if (q === undefined || v === undefined) return null;
    rows.push({
      symbol: name,
      meaning: `input quantity ${q.name} (symbol ${q.symbol}), ${api.format(q.dim)}`,
      value: v,
      unit: siUnitOf(q.dim),
      source: name === 'mass' && v === api.M_SUN_KG ? SOLAR_MASS_SOURCE : 'evaluation point',
    });
  }
  return rows;
}

function showSymbolTable(rows: readonly SymbolRow[] | null, out: CommandCtx['out']): void {
  if (rows === null) {
    out('      symbols:    none (a name is neither a registered constant nor an input)');
    return;
  }
  out('      symbols:');
  const w = (k: keyof SymbolRow): number => Math.max(...rows.map((r) => String(r[k]).length));
  const [ws, wm, wv, wu] = [w('symbol'), w('meaning'), w('value'), w('unit')];
  for (const r of rows) {
    out(`        ${r.symbol.padEnd(ws)}  ${r.meaning.padEnd(wm)}  ${String(r.value).padEnd(wv)} ${r.unit.padEnd(wu)}  ${r.source}`);
  }
}

const latexOf = (name: string, leaves: readonly string[], n: ExprNode): string | null => {
  const rhs = printLatex(n);
  return rhs === null ? null : `${latexName(name)}(${leaves.map(latexName).join(', ')}) = ${rhs}`;
};
async function run(ctx: CommandCtx): Promise<number> {
  const { args, api, out } = ctx;
  const doSimplify = args.flags.has('simplify');
  const isJson = args.flags.has('json');
  const chains = [
    { first: api.be42Edge, second: api.be16Edge, label: 'CT-1  (be-42 ∘ be-16, via hawking-temperature ≡ temperature)' },
    {
      first: api.lawSchwarzschildRadius,
      second: api.be42ViaRsEdge,
      label: 'CT-1b (law-r_s ∘ be-42-via-rs, name-match junction)',
    },
  ];

  const jsonResult: unknown[] = [];

  if (!isJson) {
    out('\nSymbolic bridge composition — composing the SYMBOLIC forms, not just numbers');
    out('(the Observable contract: composed AST, dimensionally validated + numerically evaluable)\n');
  }

  for (const { first, second, label } of chains) {
    const obs = api.composeSymbolic(first, second);
    const point = { mass: api.M_SUN_KG };
    const num = obs.evaluate(point);
    const inputs = [...first.sources, ...second.sources];

    if (!isJson) {
      out(`  ● ${label}`);
      out(`      composed:   ${obs.name}(${obs.leaves.join(',')}) = ${exprToString(obs.expr)}`);
    }

    if (doSimplify) {
      const s = await api.simplifyObservable(obs);
      const sNum = s.evaluate({ mass: api.M_SUN_KG });
      if (isJson) {
        jsonResult.push({
          label,
          name: s.name,
          leaves: s.leaves,
          expr: exprToString(s.expr),
          latex: latexOf(s.name, s.leaves, s.expr),
          evalForm: evalFormOf(s.expr, api.CONSTANTS, point),
          symbols: symbolTable(s.expr, api, inputs, point),
          dim: api.format(s.dim),
          value: sNum,
          simplified: true,
        });
      } else {
        const tag = s.expr === obs.expr ? '  (unchanged — minimal, MathTS absent, or not reducible here)' : '';
        out(`      simplified: ${s.name}(${s.leaves.join(',')}) = ${exprToString(s.expr)}${tag}`);
        out(`      latex:      ${latexOf(s.name, s.leaves, s.expr) ?? 'none (a node the printer cannot take)'}`);
        out(`      eval form:  ${showEvalForm(evalFormOf(s.expr, api.CONSTANTS, point))}`);
        showSymbolTable(symbolTable(s.expr, api, inputs, point), out);
        out(`      value @ mass = M_sun:  ${sNum.toExponential(4)}  (= composed, ${api.format(s.dim)})`);
      }
    } else if (isJson) {
      jsonResult.push({
        label,
        name: obs.name,
        leaves: obs.leaves,
        expr: exprToString(obs.expr),
        latex: latexOf(obs.name, obs.leaves, obs.expr),
        evalForm: evalFormOf(obs.expr, api.CONSTANTS, point),
        symbols: symbolTable(obs.expr, api, inputs, point),
        dim: api.format(obs.dim),
        value: num,
      });
    } else {
      out(`      latex:      ${latexOf(obs.name, obs.leaves, obs.expr) ?? 'none (a node the printer cannot take)'}`);
      out(`      eval form:  ${showEvalForm(evalFormOf(obs.expr, api.CONSTANTS, point))}`);
      showSymbolTable(symbolTable(obs.expr, api, inputs, point), out);
      out(`      dimension: ${api.format(obs.dim)}   (validated on the composed AST)`);
      out(`      value @ mass = M_sun:  ${num.toExponential(4)}`);
    }
    if (!isJson && (first.beId === 16 || second.beId === 16)) {
      const composed = api.composeEdges(first, second);
      out(
        `      confidence: ${composed.confidence}. This chain stays provisional. ` +
          'upt atlas be-16 shows the kind-bridge formalRef; that page is not this grade.',
      );
    }
    if (!isJson) out('');
  }

  if (isJson) {
    emitJson({ command: 'symbolic', result: jsonResult }, ctx.write);
    return 0;
  }

  out('  Both compose by AST substitution at the junction and match the numeric composeEdges');
  out(
    '  pipeline to float precision.'
      + (doSimplify
        ? ' --simplify folds the composed AST via MathTS (k_B cancels), guarded by re-validation.'
        : ' Pass --simplify to fold the composed AST via MathTS.')
  );
  return 0;
}

export const command: Command = {
  name: 'symbolic',
  aliases: ['compose-symbolic'],
  flags: FLAGS,
  help: commandHelp(HELP, FLAGS),
  summary: 'Compose the symbolic forms of the registered bridge chains.',
  example: 'upt symbolic',
  group: 'evaluate',
  run,
};

registerCommand(command);
