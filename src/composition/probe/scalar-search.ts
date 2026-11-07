/**
 * MathTS scalar-search trees as UPT probe candidates (plan task P5).
 *
 * `scalarNodeToExpr` converts a MathTS `ScalarNode` to a UPT `ExprNode`.
 * `dimensionToRational` converts a UPT `Dimension` to the MathTS
 * `SiDimensionVector` that the search's `dimensions` filter reads.
 *
 * @module composition/probe/scalar-search
 */

import {
  SCALAR_FUNCTION_LOWERING,
  type ScalarGrammar,
  type ScalarNode,
  type ScalarOperator,
} from '@danielsimonjr/mathts-expression';
import type { Fraction, SiDimensionVector } from '@danielsimonjr/mathts-core';
import { runScalarSearch } from '@danielsimonjr/mathts-functions';

import type { ExprNode } from '../../dimensional/validator.js';
import type { Dimension } from '../../dimensional/types.js';
import { rationalize } from '../rational-exponent.js';
import type { RawCandidate } from './generator.js';
import type { SearchProblem } from './types.js';

type TranscendentalFn = Extract<ExprNode, { kind: 'transcendental' }>['fn'];

const ZERO_DIMENSION: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

const UPT_TRANSCENDENTAL_NAMES: ReadonlySet<string> = new Set([
  'exp', 'ln', 'log2', 'log10', 'sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh',
]);

function isTranscendentalFn(name: string): name is TranscendentalFn {
  return UPT_TRANSCENDENTAL_NAMES.has(name);
}

/**
 * The inverse of MathTS `SCALAR_FUNCTION_LOWERING`, restricted to the UPT
 * transcendental names. The table is not one-to-one (`log` and `log10` both
 * lower to `log10`), so an input name equal to its lowered name wins.
 */
const TRANSCENDENTAL_BY_LOWERED: ReadonlyMap<string, TranscendentalFn> = (() => {
  const inverse = new Map<string, TranscendentalFn>();
  for (const [inputName, loweredName] of Object.entries(SCALAR_FUNCTION_LOWERING)) {
    if (!isTranscendentalFn(inputName)) continue;
    if (!inverse.has(loweredName) || inputName === loweredName) inverse.set(loweredName, inputName);
  }
  return inverse;
})();

function literal(name: string): ExprNode {
  return { kind: 'symbol', name, dim: ZERO_DIMENSION };
}

/** A MathTS `ScalarNode` as a UPT `ExprNode`; a symbol takes its governing variable's dimension. @throws Error on an unknown symbol or a function with no UPT form. @internal */
export function scalarNodeToExpr(
  node: ScalarNode,
  variables: ReadonlyMap<string, Dimension>,
): ExprNode {
  switch (node.kind) {
    case 'number':
      return literal(String(node.value));
    case 'symbol': {
      const dim = variables.get(node.name);
      if (dim === undefined) throw new Error(`scalar search: unknown symbol '${node.name}'`);
      return { kind: 'symbol', name: node.name, dim };
    }
    case 'op':
      return { kind: 'op', op: node.op, args: node.args.map((a) => scalarNodeToExpr(a, variables)) };
    case 'call': {
      const arg = scalarNodeToExpr(node.arg, variables);
      if (node.fn === 'abs') return { kind: 'abs', arg };
      if (node.fn === 'sqrt') return { kind: 'op', op: '^', args: [arg, literal('0.5')] };
      const fn = TRANSCENDENTAL_BY_LOWERED.get(node.fn);
      if (fn === undefined) throw new Error(`scalar search: function '${node.fn}' has no UPT form`);
      return { kind: 'transcendental', fn, arg };
    }
  }
}

function rationalAxis(axis: string, value: number): Fraction {
  const f = rationalize(value);
  if (f === undefined) throw new RangeError(`scalar search: dimension ${axis} = ${value} is not rational`);
  return f;
}

/** A UPT `Dimension` as a MathTS `SiDimensionVector`, by key in BIPM order `[L, M, T, I, Θ, N, J]`. @throws RangeError on an exponent that does not rationalize. @internal */
export function dimensionToRational(dim: Dimension): SiDimensionVector {
  return [
    rationalAxis('L', dim.L),
    rationalAxis('M', dim.M),
    rationalAxis('T', dim.T),
    rationalAxis('I', dim.I),
    rationalAxis('Theta', dim.Theta),
    rationalAxis('N', dim.N),
    rationalAxis('J', dim.J),
  ];
}

/** The scalar-search grammar lists a function with no UPT form: a caller error, not an abstention. @internal */
export class UnsupportedScalarFunctionError extends Error {
  constructor(name: string) {
    super(`scalar search: function '${name}' has no UPT form`);
    this.name = 'UnsupportedScalarFunctionError';
  }
}

/** Options of the opt-in MathTS scalar search (plan task P5). @internal */
export interface ProbeScalarSearchOptions {
  /** Seed of the MathTS random stream. */
  readonly seed: number;
  /** Cap on tree evaluations. */
  readonly maxEvaluations: number;
  /** Binary operators of the grammar. */
  readonly binary: readonly ScalarOperator[];
  /** Unary functions of the grammar, by MathTS input name. Default none. */
  readonly unary?: readonly string[];
  /** Largest tree size. Default 7. */
  readonly maxSize?: number;
}

/** The `originNote` and the backend id of a scalar-search candidate. @internal */
export const SCALAR_SEARCH_ORIGIN = 'mathts-scalar-search';

/** MathTS input names whose lowered form has a UPT form, read from the same table the converter reads. */
const UNARY_WITH_UPT_FORM: ReadonlySet<string> = new Set(
  Object.entries(SCALAR_FUNCTION_LOWERING)
    .filter(([, lowered]) => TRANSCENDENTAL_BY_LOWERED.has(lowered) || lowered === 'abs' || lowered === 'sqrt')
    .map(([input]) => input),
);

type LoweredFn = (typeof SCALAR_FUNCTION_LOWERING)[keyof typeof SCALAR_FUNCTION_LOWERING];

function isLoweringKey(name: string): name is keyof typeof SCALAR_FUNCTION_LOWERING {
  return Object.prototype.hasOwnProperty.call(SCALAR_FUNCTION_LOWERING, name);
}

function loweredName(name: string): LoweredFn {
  if (!isLoweringKey(name)) throw new Error(`scalar search: unknown function '${name}'`);
  return SCALAR_FUNCTION_LOWERING[name];
}

function column(rows: readonly Readonly<Record<string, number>>[], name: string): Float64Array {
  return Float64Array.from(rows, (row) => {
    const v = row[name];
    if (v === undefined) throw new RangeError(`scalar search: a row has no '${name}'`);
    return v;
  });
}

/**
 * Runs MathTS `runScalarSearch` over the exploratory rows, structure only (no fitted
 * parameters), and converts each front tree to a raw probe candidate. A front tree with no
 * UPT form is skipped and counted in the note.
 * @throws Error when the grammar lists a function with no UPT form.
 * @internal
 */
export async function scalarSearchCandidates(
  problem: SearchProblem,
  opts: ProbeScalarSearchOptions,
  budgetMs: number,
): Promise<{ readonly raws: readonly RawCandidate[]; readonly note?: string }> {
  const unary = opts.unary ?? [];
  for (const name of unary) {
    if (!UNARY_WITH_UPT_FORM.has(name)) throw new UnsupportedScalarFunctionError(name);
  }
  const data = problem.exploratory;
  if (data === undefined || data.rows.length === 0) {
    return { raws: [], note: 'scalar search did not run: no exploratory data' };
  }
  const rows = data.rows;

  const names = problem.governing.map((g) => g.name);
  const columns: Record<string, Float64Array> = {};
  for (const name of names) columns[name] = column(rows, name);
  const symbols: Record<string, SiDimensionVector> = {};
  for (const g of problem.governing) symbols[g.name] = dimensionToRational(g.dim);
  const grammar: ScalarGrammar = {
    variables: names,
    parameters: [],
    binary: opts.binary,
    unary: unary.map(loweredName),
    maxSize: opts.maxSize ?? 7,
  };

  const result = await runScalarSearch(
    { variables: names, columns, observed: column(rows, data.observable), parameters: [] },
    {
      seed: opts.seed,
      grammar,
      maxEvaluations: opts.maxEvaluations,
      signal: AbortSignal.timeout(Math.max(1, Math.floor(budgetMs))),
      dimensions: { symbols, target: dimensionToRational(problem.target.dim) },
    },
  );

  const variables = new Map(problem.governing.map((g) => [g.name, g.dim]));
  const raws: RawCandidate[] = [];
  let skipped = 0;
  for (const entry of result.front) {
    try {
      raws.push({ expression: scalarNodeToExpr(entry.item, variables), monomial: null, originNote: SCALAR_SEARCH_ORIGIN });
    } catch {
      skipped += 1;
    }
  }
  const notes: string[] = [];
  if (result.stopReason !== 'max-evaluations') {
    notes.push(`scalar search stopped: ${result.stopReason} after ${result.evaluations} evaluation(s)`);
  }
  if (skipped > 0) notes.push(`scalar search: ${skipped} front tree(s) had no UPT form`);
  return notes.length > 0 ? { raws, note: notes.join('; ') } : { raws };
}
