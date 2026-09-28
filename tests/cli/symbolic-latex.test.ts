/**
 * Audit I10 (with F12): `upt symbolic` prints each composed formula as plain text, as LaTeX and as a
 * runnable `upt eval` form, with a symbol table (symbol, meaning, value, unit, source).
 *
 * The round trips are checked by a second method. Each printed form is read back into a formula the
 * builtin parser evaluates (the LaTeX through a reader in this file that shares no code with the
 * printer) and compared with `evalExpr` on the AST itself. A printer that dropped a grouping, a
 * `\frac` argument or an exponent would give a different number.
 */
import { describe, it, expect } from 'vitest';
import { printDisplay, printEval, printLatex, siUnitOf } from '../../src/cli/expr-print.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { parseFormula } from '../../src/numerical/formula.js';
import { CONSTANTS, CONSTANT_PROVENANCE } from '../../src/composition/symbolic-constants.js';
import { parseUnit } from '../../src/dimensional/units.js';
import { equals } from '../../src/dimensional/algebra.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { runCli } from '../../dist/cli/main.js';

const s = (name: string): ExprNode => ({ kind: 'symbol', name, dim: { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 } } as ExprNode);
const op = (o: '+' | '-' | '*' | '/' | '^', ...args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args });

/** A LaTeX reader for the subset the printer emits; independent of the printer. */
function latexToFormula(tex: string): string {
  let t = tex;
  const NAMES: [RegExp, string][] = [
    [/k_\{\\mathrm\{B\}\}/g, 'k_B'],
    [/\\hbar/g, 'hbar'],
    [/\\ln 2/g, '(ln(2))'],
    [/(\d+)\\pi/g, '($1*pi)'],
    [/\\pi/g, 'pi'],
    [/\\(?:mathrm|text)\{([^{}]+)\}/g, '$1'],
    [/\\cdot/g, '*'],
    [/\\left\(/g, '('],
    [/\\right\)/g, ')'],
  ];
  for (const [re, to] of NAMES) t = t.replace(re, to);
  // Innermost first, until nothing changes: \frac{a}{b} → ((a)/(b)), x^{e} → x^(e), a base {x}^ → (x)^.
  const RULES: [RegExp, string][] = [
    [/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))'],
    [/\^\{([^{}]*)\}/g, '^($1)'],
    [/\{([^{}]*)\}(?=\^)/g, '($1)'],
  ];
  for (let before = ''; before !== t; ) {
    before = t;
    for (const [re, to] of RULES) t = t.replace(re, to);
  }
  if (/[\\{}]/.test(t)) throw new Error(`unread LaTeX left in '${t}'`);
  return t;
}

const displayToFormula = (d: string): string =>
  d.replace(/·/g, '*').replace(/(\d+)pi\b/g, '($1*pi)').replace(/\bln2\b/g, 'ln(2)');

const SCOPE = { a: 2.5, b: 1.75, c: 3.2, d: 0.6, mass: 1.989e30 };

const CASES: [string, ExprNode][] = [
  ['nested division a/(b/c)', op('/', s('a'), op('/', s('b'), s('c')))],
  ['nested division (a/b)/c', op('/', op('/', s('a'), s('b')), s('c'))],
  ['division by a product a/(b·c)', op('/', s('a'), op('*', s('b'), s('c')))],
  ['a quotient raised to a power (a/b)^2', op('^', op('/', s('a'), s('b')), s('2'))],
  ['a power of a power (a^b)^c', op('^', op('^', s('a'), s('b')), s('c'))],
  ['a quotient in an exponent a^(b/c)', op('^', s('a'), op('/', s('b'), s('c')))],
  ['a sum under a quotient (a+b)/(c-d)', op('/', op('+', s('a'), s('b')), op('-', s('c'), s('d')))],
  ['a difference of a difference a-(b-c)', op('-', s('a'), op('-', s('b'), s('c')))],
  ['a named factor 8π·a/(b·ln2)', op('/', op('*', s('8pi'), s('a')), op('*', s('b'), s('ln2')))],
];

describe('audit I10: every printed form evaluates to the AST value', () => {
  it.each(CASES)('%s', (_label, ast) => {
    // The test variables shadow the constants of the same name (c, b); the named factors come from CONSTANTS.
    const scope = { ...Object.fromEntries(Object.entries(CONSTANTS).map(([k, v]) => [k, v.value])), ...SCOPE };
    const truth = evalExpr(ast, scope);
    const vars = { a: SCOPE.a, b: SCOPE.b, c: SCOPE.c, d: SCOPE.d };
    const evalForm = printEval(ast);
    const latex = printLatex(ast);
    const display = printDisplay(ast);
    expect(evalForm).not.toBeNull();
    expect(latex).not.toBeNull();
    expect(parseFormula(evalForm!).evaluate(vars)).toBeCloseTo(truth, 12);
    expect(parseFormula(latexToFormula(latex!)).evaluate(vars)).toBeCloseTo(truth, 12);
    expect(parseFormula(displayToFormula(display!)).evaluate(vars)).toBeCloseTo(truth, 12);
  });

  it('LaTeX writes every division as \\frac, never as a slash', () => {
    for (const [, ast] of CASES) expect(printLatex(ast)).not.toContain('/');
    expect(printLatex(CASES[0]![1])).toBe('\\frac{a}{\\frac{b}{c}}');
  });

  it('control: the LaTeX reader catches a dropped grouping (the reader can fail)', () => {
    const wrong = 'a^{b}^{c}'.replace('a^{b}', '{a}^{b}'); // missing \left( \right) around a^b
    const truth = evalExpr(op('^', op('^', s('a'), s('b')), s('c')), SCOPE);
    const read = parseFormula(latexToFormula(wrong)).evaluate({ a: SCOPE.a, b: SCOPE.b, c: SCOPE.c });
    expect(Math.abs(read - truth)).toBeGreaterThan(1e-3);
  });

  it('a node the scalar printers cannot take gives null, not a guess', () => {
    const t = { kind: 'transcendental', fn: 'ln', arg: s('a') } as unknown as ExprNode;
    expect(printLatex(t)).toBeNull();
    expect(printEval(t)).toBeNull();
  });
});

describe('audit I10: the constant table, checked against the constants it describes', () => {
  it('describes exactly the registered constants', () => {
    expect(Object.keys(CONSTANT_PROVENANCE).sort()).toEqual(Object.keys(CONSTANTS).sort());
  });

  it.each(Object.keys(CONSTANTS))('%s: its unit parses to its registered dimension, at SI scale 1', (name) => {
    const u = parseUnit(CONSTANT_PROVENANCE[name]!.unit);
    expect(equals(u.dim, CONSTANTS[name]!.dim)).toBe(true);
    expect(u.scale).toBe(1);
  });

  it('siUnitOf writes a dimension that parses back to itself', () => {
    for (const d of [{ M: 1 }, { L: 3, M: -1, T: -2 }, { L: 2, M: 1, T: -2, Theta: -1 }, { T: -1 }, {}]) {
      const dim = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0, ...d };
      const u = parseUnit(siUnitOf(dim));
      expect(equals(u.dim, dim)).toBe(true);
      expect(u.scale).toBe(1);
    }
  });
});

async function run(argv: string[]) {
  const o = { stdout: '', stderr: '' };
  const code = await runCli(argv, {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (x: string) => void (o.stdout += x),
  });
  return { code, ...o };
}

describe('audit I10: upt symbolic prints LaTeX and a symbol table', () => {
  it('--json: each chain has LaTeX that evaluates to its printed value, and a table row per symbol', async () => {
    const r = await run(['symbolic', '--json']);
    expect(r.code).toBe(0);
    const chains = JSON.parse(r.stdout).result as {
      latex: string;
      value: number;
      symbols: { symbol: string; meaning: string; value: number; unit: string; source: string }[];
    }[];
    expect(chains.length).toBe(2);
    for (const ch of chains) {
      const rhs = ch.latex.slice(ch.latex.indexOf('=') + 1);
      const scope = Object.fromEntries(ch.symbols.map((x) => [x.symbol, x.value]));
      expect(parseFormula(latexToFormula(rhs)).evaluate(scope) / ch.value).toBeCloseTo(1, 12);
      for (const x of ch.symbols) {
        expect(x.meaning.length).toBeGreaterThan(0);
        expect(x.source.length).toBeGreaterThan(0);
        expect(Number.isFinite(x.value)).toBe(true);
      }
      expect(ch.symbols.map((x) => x.symbol)).toContain('mass');
    }
  });

  it('text: the chain shows a LaTeX line and a symbols block naming each constant source', async () => {
    const r = await run(['symbolic']);
    expect(r.stdout).toMatch(/latex: +\\text\{landauer-erasure-energy\}\(\\mathrm\{mass\}\) = /);
    expect(r.stdout).toMatch(/k_B +Boltzmann constant +1\.380649e-23 +J\/K +exact SI/);
    expect(r.stdout).toMatch(/mass +.*1\.989e\+30 +kg/);
  });
});
