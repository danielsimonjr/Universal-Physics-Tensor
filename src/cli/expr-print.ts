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

const DIM_KEYS: readonly (keyof Dimension)[] = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'];
const dimEqual = (a: Dimension, b: Dimension): boolean => DIM_KEYS.every((k) => (a[k] ?? 0) === (b[k] ?? 0));
const dimPow = (a: Dimension, n: number): Dimension =>
  Object.fromEntries(DIM_KEYS.map((k) => [k, (a[k] ?? 0) * n])) as unknown as Dimension;
const dimMul = (a: Dimension, b: Dimension): Dimension =>
  Object.fromEntries(DIM_KEYS.map((k) => [k, (a[k] ?? 0) + (b[k] ?? 0)])) as unknown as Dimension;
const isDimensionless = (d: Dimension): boolean => DIM_KEYS.every((k) => (d[k] ?? 0) === 0);

/** One coherent SI unit of the table: a scale of exactly 1 and a dimension. */
export interface CoherentUnit {
  readonly name: string;
  readonly dim: Dimension;
}

/**
 * The coherent named SI units of a unit table (`unitRows()`): scale exactly 1,
 * not dimensionless, the first spelling the table gives for each dimension
 * (`ohm` before `Ω`). The seven base units are added so a label can mix them.
 */
export function coherentUnits(
  rows: ReadonlyMap<string, { readonly scale: { readonly num: bigint; readonly den: bigint; readonly irrational: number }; readonly dim: Dimension }>,
): CoherentUnit[] {
  const out: CoherentUnit[] = [];
  const seen: Dimension[] = [];
  const add = (name: string, dim: Dimension): void => {
    if (isDimensionless(dim) || seen.some((d) => dimEqual(d, dim))) return;
    seen.push(dim);
    out.push({ name, dim });
  };
  for (const [name, row] of rows) {
    if (row.scale.num === 1n && row.scale.den === 1n && row.scale.irrational === 1) add(name, row.dim);
  }
  for (const [k, u] of SI_BASE) {
    add(u, Object.fromEntries(DIM_KEYS.map((key) => [key, key === k ? 1 : 0])) as unknown as Dimension);
  }
  return out;
}

/**
 * A dimension as a product of at most two coherent units (`V^2/Hz`, `J/K`,
 * `kg*m^2/s`), the fewest factors with the smallest exponents, a named unit
 * before a base unit (`V^2/Hz` over `V^2*s`), else the SI base form.
 * Presentation only: the dimension is the fact, the label is a reading of it.
 */
export function derivedUnitOf(dim: Dimension, units: readonly CoherentUnit[]): string {
  if (isDimensionless(dim)) return '1';
  const base = new Set(SI_BASE.map(([, u]) => u));
  type Term = { readonly unit: CoherentUnit; readonly exp: number };
  const label = (terms: readonly Term[]): string => {
    const factor = (t: Term, e: number): string => (e === 1 ? t.unit.name : `${t.unit.name}^${e}`);
    const num = terms.filter((t) => t.exp > 0).map((t) => factor(t, t.exp));
    const den = terms.filter((t) => t.exp < 0).map((t) => factor(t, -t.exp));
    if (num.length === 0) return terms.map((t) => factor(t, t.exp)).join('*');
    if (den.length === 0) return num.join('*');
    return `${num.join('*')}/${den.length === 1 ? den[0] : `(${den.join('*')})`}`;
  };
  // Score: factor count, then the sum of |exponents|, then base units used (fewer is better).
  const score = (terms: readonly Term[]): number =>
    terms.length * 1000 + terms.reduce((s, t) => s + Math.abs(t.exp), 0) * 10 + terms.filter((t) => base.has(t.unit.name)).length;
  const EXPS = [1, -1, 2, -2, 3, -3, 4, -4];
  let best: Term[] | null = null;
  const consider = (terms: Term[]): void => {
    if (best === null || score(terms) < score(best)) best = terms;
  };
  for (const u of units) {
    for (const e of EXPS) {
      if (dimEqual(dimPow(u.dim, e), dim)) consider([{ unit: u, exp: e }]);
    }
  }
  if (best === null) {
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        for (const e1 of EXPS) {
          for (const e2 of EXPS) {
            if (dimEqual(dimMul(dimPow(units[i]!.dim, e1), dimPow(units[j]!.dim, e2)), dim)) {
              consider([{ unit: units[i]!, exp: e1 }, { unit: units[j]!, exp: e2 }]);
            }
          }
        }
      }
    }
  }
  return best === null ? siUnitOf(dim) : label(best);
}

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
