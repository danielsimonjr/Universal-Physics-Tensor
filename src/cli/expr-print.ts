/**
 * The three printed forms of a scalar composed AST (`upt symbolic`, audit F12 and I10):
 *
 * - DISPLAY: plain text for the reader, `·` for a product.
 * - EVAL: a formula `upt eval` parses, every named factor spelled so it evaluates (`8pi` → `(8*pi)`).
 * - LATEX: `\frac` for every division, `\cdot` for a product, braces for every exponent.
 *
 * Only `symbol` and `op` nodes are printed; any other node gives `null`, never a guess.
 */
import type { ExprNode } from '../dimensional/validator.js';
import type { Dimension } from '../dimensional/types.js';

interface PrintStyle {
  readonly times: string;
  readonly divide: string;
  readonly symbol: (name: string) => string;
}

const DISPLAY: PrintStyle = { times: '·', divide: ' / ', symbol: (name) => name };

/** Named numeric stubs spelled so `upt eval` parses them. */
export const EVAL_STUBS: Readonly<Record<string, string>> = {
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
function printInfix(n: ExprNode, style: PrintStyle): string | null {
  if (n.kind === 'symbol') return style.symbol(n.name);
  if (n.kind !== 'op') return null;
  const parts: string[] = [];
  for (let i = 0; i < n.args.length; i++) {
    const a = n.args[i]!;
    const s = printInfix(a, style);
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

export const printDisplay = (n: ExprNode): string | null => printInfix(n, DISPLAY);
export const printEval = (n: ExprNode): string | null => printInfix(n, EVAL);

/** LaTeX for the constant and stub names; any other name is spelled by {@link latexName}. */
const LATEX_NAMES: Readonly<Record<string, string>> = {
  hbar: '\\hbar',
  k_B: 'k_{\\mathrm{B}}',
  '8pi': '8\\pi',
  '4pi': '4\\pi',
  '2pi': '2\\pi',
  ln2: '\\ln 2',
  pi: '\\pi',
  epsilon_0: '\\varepsilon_{0}',
  sigma_sb: '\\sigma_{\\mathrm{SB}}',
};

/** A name in LaTeX: one letter or a number as is, a hyphenated name as text, otherwise upright. */
export function latexName(name: string): string {
  const known = LATEX_NAMES[name];
  if (known !== undefined) return known;
  if (/^[A-Za-z]$/.test(name) || Number.isFinite(Number(name))) return name;
  return name.includes('-') ? `\\text{${name}}` : `\\mathrm{${name.replace(/_/g, '\\_')}}`;
}

/** The AST in LaTeX; `null` for a node other than `symbol` or `op`. */
export function printLatex(n: ExprNode): string | null {
  if (n.kind === 'symbol') return latexName(n.name);
  if (n.kind !== 'op') return null;
  const args: string[] = [];
  for (const a of n.args) {
    const s = printLatex(a);
    if (s === null) return null;
    args.push(s);
  }
  const isOp = (a: ExprNode, ...ops: string[]): boolean => a.kind === 'op' && ops.includes(a.op);
  const paren = (s: string): string => `\\left(${s}\\right)`;
  switch (n.op) {
    case '/':
      return args.slice(1).reduce((num, den) => `\\frac{${num}}{${den}}`, args[0]!);
    case '*':
      return args.map((s, i) => (isOp(n.args[i]!, '+', '-') ? paren(s) : s)).join(' \\cdot ');
    case '^': {
      // The validator's arity guard makes `^` binary; a base that is not a symbol is grouped.
      const base = n.args[0]!.kind === 'symbol' ? args[0]! : paren(args[0]!);
      return `{${base}}^{${args[1]}}`;
    }
    case '+':
      return args.join(' + ');
    case '-':
      return args.length === 1
        ? `-${isOp(n.args[0]!, '+', '-') ? paren(args[0]!) : args[0]}`
        : args.map((s, i) => (i > 0 && isOp(n.args[i]!, '+', '-') ? paren(s) : s)).join(' - ');
  }
}

const SI_BASE: readonly (readonly [keyof Dimension, string])[] = [
  ['M', 'kg'],
  ['L', 'm'],
  ['T', 's'],
  ['I', 'A'],
  ['Theta', 'K'],
  ['N', 'mol'],
  ['J', 'cd'],
];

/**
 * A dimension as SI base units, numerator before one `/` (`m^3/(kg*s^2)`), a bare denominator as
 * negative powers (`s^-1`), and `1` when dimensionless: the forms `parseUnit` reads back.
 */
export function siUnitOf(dim: Dimension): string {
  const factor = (u: string, e: number): string => (e === 1 ? u : `${u}^${e}`);
  const num = SI_BASE.filter(([k]) => dim[k] > 0).map(([k, u]) => factor(u, dim[k]));
  const den = SI_BASE.filter(([k]) => dim[k] < 0).map(([k, u]) => factor(u, -dim[k]));
  if (num.length === 0 && den.length === 0) return '1';
  if (num.length === 0) return SI_BASE.filter(([k]) => dim[k] < 0).map(([k, u]) => factor(u, dim[k])).join('*');
  if (den.length === 0) return num.join('*');
  return `${num.join('*')}/${den.length === 1 ? den[0] : `(${den.join('*')})`}`;
}
