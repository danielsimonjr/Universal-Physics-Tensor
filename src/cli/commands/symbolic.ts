/**
 * `upt symbolic` — compose bridges' SYMBOLIC (AST) forms, not just their
 * numeric evaluators (the Observable contract). Transposed verbatim from
 * bin/upt.mjs's `symbolicCmd()` + `exprToString()` (lines 734-777), plus
 * `--json`.
 */
import type { FlagSpec } from '../args.js';
import { registerCommand, type Command, type CommandCtx } from '../command.js';
import { emitJson } from '../output.js';
import type { ExprNode } from '../../dimensional/validator.js';

const FLAGS: FlagSpec[] = [
  { name: '--simplify', valueStyle: 'none' },
  { name: '--json', valueStyle: 'none' },
];

const HELP = `upt symbolic [--simplify]
        Compose bridges' SYMBOLIC (AST) forms, not just their numeric
        evaluators (the Observable contract). Shows the CT-1 / CT-1b chains
        composed by substitution, dimensionally validated and evaluable.
        With --simplify, folds the composed AST via MathTS (k_B cancels),
        re-validated dimensionally + numerically. Each chain also prints an
        'eval form': a runnable \`upt eval\` command, fully grouped, that
        reproduces the printed value.`;

interface PrintStyle {
  readonly times: string;
  readonly divide: string;
  readonly symbol: (name: string) => string;
}

const DISPLAY: PrintStyle = { times: '·', divide: ' / ', symbol: (name) => name };

/** Named numeric stubs spelled so `upt eval` parses them. */
const EVAL_STUBS: Readonly<Record<string, string>> = {
  '8pi': '(8*pi)',
  '4pi': '(4*pi)',
  '2pi': '(2*pi)',
  ln2: 'ln(2)',
};
const EVAL: PrintStyle = { times: '*', divide: '/', symbol: (name) => EVAL_STUBS[name] ?? name };

/**
 * Precedence-aware printing. Every divisor that is not a bare power is
 * grouped, so `a / (b·c)` never prints as `a / b·c` (audit F12); a quotient
 * inside a product or as a dividend is grouped too, for the reader.
 */
function printExpr(n: ExprNode, style: PrintStyle): string | null {
  if (n.kind === 'symbol') return style.symbol(n.name);
  if (n.kind !== 'op') return null;
  const parts: string[] = [];
  for (let i = 0; i < n.args.length; i++) {
    const a = n.args[i]!;
    const s = printExpr(a, style);
    if (s === null) return null;
    const aOp = a.kind === 'op' ? a.op : null;
    const group =
      aOp !== null &&
      (n.op === '^'
        ? true
        : n.op === '/'
          ? i === 0
            ? aOp === '+' || aOp === '-' || aOp === '/'
            : aOp !== '^'
          : n.op === '*'
            ? aOp === '+' || aOp === '-' || aOp === '/'
            : n.op === '-' && i > 0 && (aOp === '+' || aOp === '-'));
    parts.push(group ? `(${s})` : s);
  }
  const sep = n.op === '*' ? style.times : n.op === '/' ? style.divide : n.op === '^' ? '^' : ` ${n.op} `;
  return parts.join(sep);
}

function exprToString(n: ExprNode): string {
  return printExpr(n, DISPLAY) ?? `⟨${n.kind}⟩`;
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
  const formula = printExpr(n, EVAL);
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
          evalForm: evalFormOf(s.expr, api.CONSTANTS, point),
          dim: api.format(s.dim),
          value: sNum,
          simplified: true,
        });
      } else {
        const tag = s.expr === obs.expr ? '  (unchanged — minimal, MathTS absent, or not reducible here)' : '';
        out(`      simplified: ${s.name}(${s.leaves.join(',')}) = ${exprToString(s.expr)}${tag}`);
        out(`      eval form:  ${showEvalForm(evalFormOf(s.expr, api.CONSTANTS, point))}`);
        out(`      value @ mass = M_sun:  ${sNum.toExponential(4)}  (= composed, ${api.format(s.dim)})`);
      }
    } else if (isJson) {
      jsonResult.push({
        label,
        name: obs.name,
        leaves: obs.leaves,
        expr: exprToString(obs.expr),
        evalForm: evalFormOf(obs.expr, api.CONSTANTS, point),
        dim: api.format(obs.dim),
        value: num,
      });
    } else {
      out(`      eval form:  ${showEvalForm(evalFormOf(obs.expr, api.CONSTANTS, point))}`);
      out(`      dimension: ${api.format(obs.dim)}   (validated on the composed AST)`);
      out(`      value @ mass = M_sun:  ${num.toExponential(4)}`);
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
  help: HELP,
  run,
};

registerCommand(command);
