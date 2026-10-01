/**
 * Symbolic bridge composition (v0.12 — the Observable contract).
 *
 * Resolves the Part-IX §4 "Observable contract" deferral with a fourth
 * option the spec did not enumerate: an OPTIONAL `symbolic` ExprNode on a
 * bridge edge (leaves = source-quantity names + the `CONSTANTS` registry),
 * composed by AST SUBSTITUTION. `composeSymbolic(first, second)` substitutes
 * `first`'s symbolic form into the junction leaf of `second`'s, producing a
 * new ExprNode that is dimensionally validated and numerically evaluable —
 * not the black-box numeric closure `composeEdges` chains.
 *
 * Non-breaking (the field is optional), no per-pair adapters, and it retains
 * dimensional type-safety. Edges without a `symbolic` form fall back to
 * numeric `composeEdges` (unchanged).
 *
 * @module composition/compose-symbolic
 */

import { equals, format } from '../dimensional/algebra.js';
import { validate } from '../dimensional/validator.js';
import type { ExprNode } from '../dimensional/validator.js';
import type { Dimension } from '../dimensional/types.js';
import type { BridgeEdge } from './edge.js';
import type { QuantityIdentification } from './compose.js';
import { QUANTITY_IDENTIFICATIONS } from './compose.js';
import { substitute } from './expr-subst.js';
import { evalExpr, SymbolicEvalError } from './expr-eval.js';
import { CONSTANTS } from '../dimensional/symbolic-constants.js';

/**
 * A composed quantity carrying its SYMBOLIC form and an executable
 * evaluator — the shared return contract Part-IX §4 said was missing.
 *
 * @public
 */
export interface Observable {
  /** Target quantity name (from `second.target`). */
  readonly name: string;
  /** Display symbol. */
  readonly symbol: string;
  /** Dimensionally-validated SI dimension. */
  readonly dim: Dimension;
  /** The composed (substituted) AST. */
  readonly expr: ExprNode;
  /** Free leaf symbols = the required inputs (constants/literals excluded). */
  readonly leaves: readonly string[];
  /**
   * Numerically evaluate the composed form. STRICT input (Eve EVE-1): every
   * `leaves` key must be supplied and no extra key is accepted. PURE symbolic
   * value — NOT domain-checked (unlike `composeEdges`, which throws
   * `DomainViolationError`); use `composeEdges` for domain-checked values.
   */
  evaluate(values: Readonly<Record<string, number>>): number;
}

/** Symbolic composition is undefined (no junction / missing `symbolic` /
 *  zero-occurrence substitution / dimensional mismatch). @public */
export class SymbolicCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SymbolicCompositionError';
  }
}

/** Options for {@link composeSymbolic}. @public */
export interface ComposeSymbolicOptions {
  /** Extra identifications consulted after the registered ones. */
  readonly identifications?: readonly QuantityIdentification[];
}

/** Find the junction source of `second` matching `first.target` (by name or
 *  identification). Returns the source whose NAME is the substitution leaf —
 *  `junction.name` is correct in BOTH the name-match and identification cases
 *  (Eve EVE-4), avoiding the always-`ident.to` trap. */
function findJunctionName(
  first: BridgeEdge,
  second: BridgeEdge,
  identifications: readonly QuantityIdentification[],
): string {
  for (const src of second.sources) {
    if (src.name === first.target.name) return src.name;
  }
  for (const ident of identifications) {
    if (ident.from !== first.target.name) continue;
    for (const src of second.sources) {
      if (src.name === ident.to) return src.name;
    }
  }
  throw new SymbolicCompositionError(
    `Cannot symbolically compose ${first.id} -> ${second.id}: target ` +
      `'${first.target.name}' matches none of [${second.sources
        .map((s) => `'${s.name}'`)
        .join(', ')}] by name or registered identification.`,
  );
}

/** Collect the distinct leaf-symbol names of a scalar ExprNode. */
function collectSymbols(expr: ExprNode, out: Set<string>): void {
  switch (expr.kind) {
    case 'symbol':
      out.add(expr.name);
      return;
    case 'op':
      for (const a of expr.args) collectSymbols(a, out);
      return;
    case 'integral':
      collectSymbols(expr.over, out);
      collectSymbols(expr.integrand, out);
      return;
    case 'derivative':
      collectSymbols(expr.of, out);
      collectSymbols(expr.wrt, out);
      return;
    case 'transcendental':
    case 'abs':
    case 'dirac-delta':
      // Scalar arms carrying a single inner expression — their leaves are real
      // inputs (e.g. BE-37 ln(R_far/R_near), BE-26 exp(−WKB), BE-41 |φ−φ₀|).
      collectSymbols(expr.arg, out);
      return;
    case 'variational-derivative':
      collectSymbols(expr.functional, out);
      collectSymbols(expr.field, out);
      collectSymbols(expr.over, out);
      return;
    default:
      // Tensor arms cannot reach here (substitute would have thrown first).
      return;
  }
}

/** Free leaves = symbols that are neither registered constants nor numeric
 *  literals (those are not inputs). */
function freeLeaves(expr: ExprNode): string[] {
  const all = new Set<string>();
  collectSymbols(expr, all);
  return [...all]
    .filter((n) => !(n in CONSTANTS) && !Number.isFinite(Number(n)))
    .sort();
}

/**
 * Build an {@link Observable} from a composed/simplified expression: computes
 * the free `leaves` and a STRICT `evaluate` closure over THIS `expr` + leaves.
 * Shared by `composeSymbolic` and `simplifyObservable` so a simplified
 * Observable gets a fresh closure (never the stale unsimplified one).
 *
 * @internal
 */
export function makeObservable(
  name: string,
  symbol: string,
  dim: Dimension,
  expr: ExprNode,
): Observable {
  const leaves = freeLeaves(expr);
  return {
    name,
    symbol,
    dim,
    expr,
    leaves,
    evaluate(values) {
      for (const leaf of leaves) {
        if (!Object.prototype.hasOwnProperty.call(values, leaf)) {
          throw new SymbolicEvalError(
            `Observable(${name}).evaluate: missing required input '${leaf}' ` +
              `(leaves: ${leaves.join(', ')}).`,
          );
        }
      }
      for (const key of Object.keys(values)) {
        if (!leaves.includes(key)) {
          throw new SymbolicEvalError(
            `Observable(${name}).evaluate: unexpected input '${key}' (this ` +
              `Observable's inputs are exactly: ${leaves.join(', ') || '(none)'}).`,
          );
        }
      }
      return evalExpr(expr, values);
    },
  };
}

/**
 * Compose two bridges SYMBOLICALLY: substitute `first`'s `symbolic` form into
 * the junction leaf of `second`'s, validate the composed AST's dimension, and
 * return an {@link Observable}. Both operands must carry a `symbolic` form
 * (else throws — fall back to `composeEdges` for numeric-only composition).
 *
 * @public
 */
export function composeSymbolic(
  first: BridgeEdge,
  second: BridgeEdge,
  opts: ComposeSymbolicOptions = {},
): Observable {
  const identifications = [
    ...QUANTITY_IDENTIFICATIONS,
    ...(opts.identifications ?? []),
  ];

  if (!first.symbolic || !second.symbolic) {
    const missing = !first.symbolic ? first.id : second.id;
    throw new SymbolicCompositionError(
      `Cannot symbolically compose ${first.id} -> ${second.id}: edge ` +
        `'${missing}' has no symbolic form (numeric-only edge — use ` +
        `composeEdges).`,
    );
  }

  const junctionName = findJunctionName(first, second, identifications);
  const { expr, count } = substitute(
    second.symbolic,
    junctionName,
    first.symbolic,
  );

  if (count === 0) {
    throw new SymbolicCompositionError(
      `Cannot symbolically compose ${first.id} -> ${second.id}: junction ` +
        `'${junctionName}' does not appear as a leaf of ${second.id}'s ` +
        `symbolic form — substitution would silently ignore ${first.id}.`,
    );
  }

  const v = validate(expr);
  if (!v.ok || v.inferredDimension === null) {
    throw new SymbolicCompositionError(
      `Composed symbolic form of ${first.id} -> ${second.id} failed ` +
        `dimensional validation: ${v.violations[0]?.note ?? 'not homogeneous'}.`,
    );
  }
  if (!equals(v.inferredDimension, second.target.dim)) {
    throw new SymbolicCompositionError(
      `Composed symbolic form of ${first.id} -> ${second.id} has dimension ` +
        `${format(v.inferredDimension)} but ${second.target.name} is ` +
        `${format(second.target.dim)}.`,
    );
  }

  return makeObservable(
    second.target.name,
    second.target.symbol,
    second.target.dim,
    expr,
  );
}
