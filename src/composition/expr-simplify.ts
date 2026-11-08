/**
 * Symbolic simplification of a scalar `ExprNode` through MathTS, a supplement
 * to symbolic composition.
 *
 * Composing two bridges' symbolic forms leaves an UNSIMPLIFIED AST — CT-1 is
 * `k_B·(ℏc³/8πG·mass·k_B)·ln2`, with `k_B` uncancelled. This folds it to the
 * canonical `ℏc³·ln2/(8πG·mass)` using `@danielsimonjr/mathts-functions`'
 * `simplify`, a required dependency.
 *
 * Pipeline (Adam+Eve-vetted — docs/planning/v0.12.0-Symbolic-Simplification-
 * Design.md): GENSYM every non-exponent leaf to a mathjs-safe identifier
 * (shared by name, so repeated leaves cancel), render FULLY-PARENTHESIZED
 * (EVE-A — no precedence ambiguity), `parse`+`simplify`, walk the result back
 * (un-gensym, INTEGER-exponent-strict — EVE/Adam HIGH-1). Three guards make a
 * black-box CAS safe to trust:
 *   1. dimensional — `validate(simplified)` dim `equals` the original's;
 *   2. structural — non-numeric symbols of the result ⊆ those of the original
 *      (no leaf invented — Adam HIGH-2 / EVE-B);
 *   3. numeric    — `evalExpr` agrees over ≥2 finite synthesized probes at
 *      rel tol 1e-9 (Adam CRITICAL-2 / EVE-C).
 * A representable result that DISAGREES dimensionally/numerically THROWS (a
 * bug to surface); anything we cannot represent or verify degrades to a
 * graceful no-op (return the original, `simplified:false`).
 *
 * INTERNAL — surfaced via `upt symbolic --simplify`.
 *
 * @module composition/expr-simplify
 */

import type { ExprNode } from '../dimensional/validator.js';
import { validate } from '../dimensional/validator.js';
import { equals } from '../dimensional/algebra.js';
import type { Dimension } from '../dimensional/types.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import { evalExpr } from './expr-eval.js';
import { forEachScalarLeaf, isDecimalLiteral } from '../dimensional/ast-leaves.js';
import { isRegisteredConstant } from '../dimensional/symbolic-constants.js';
import type { Observable } from './compose-symbolic.js';
import { makeObservable } from './compose-symbolic.js';
import { renderScalarLeaf } from './mathts-scalar-symbols.js';
import { parse as mathtsParse, simplify as mathtsSimplify } from '@danielsimonjr/mathts-functions';
import { quietlySync } from './mathts-quiet.js';

/** A simplification completed but produced a dimensionally/numerically wrong
 *  result (a real bug — not a graceful no-op). @internal */
class SimplificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimplificationError';
  }
}

/** The bits of a MathTS (mathjs-style) AST node the walk-back reads — pinned
 *  + runtime-verified (Adam CRITICAL-1). */
interface MathNode {
  readonly type?: string;
  readonly op?: string;
  readonly name?: string;
  readonly value?: unknown;
  readonly args?: MathNode[];
  readonly content?: MathNode;
  toString(): string;
}
interface MathtsSimplifyModule {
  parse(expr: string): MathNode;
  simplify(node: MathNode): MathNode;
}

/** Thrown internally when a node cannot be rendered/walked — caught and turned
 *  into a graceful no-op (never escapes the module). */
class Unsupported extends Error {}

// ---------------------------------------------------------------------------
// The MathTS simplifier: a static import, bound once after a smoke test.
// ---------------------------------------------------------------------------

let cached: MathtsSimplifyModule | undefined;

/**
 * `parse` and `simplify`, bound once after a smoke test that `simplify`
 * CANCELS (`(g0)*((g1)/(g0))` must come back as `g1` alone). The smoke is the
 * first use, so it runs inside the one console window (`mathts-quiet.ts`).
 * MathTS is a required dependency, so a failed smoke is a defect of that
 * dependency and throws; it is not read as an absent simplifier.
 */
function loadSimplifier(): MathtsSimplifyModule {
  if (cached !== undefined) return cached;
  const mod: MathtsSimplifyModule = {
    parse: (text) => mathtsParse(text) as unknown as MathNode,
    simplify: (node) => mathtsSimplify(node as never) as unknown as MathNode,
  };
  const names = new Set<string>();
  quietlySync(() => collectMathSymbols(mod.simplify(mod.parse('(g0)*((g1)/(g0))')), names));
  if (names.size !== 1 || !names.has('g1')) {
    throw new Error(`expr-simplify: MathTS simplify did not cancel g0 in the smoke test (left ${[...names].join(', ')})`);
  }
  cached = mod;
  return cached;
}

function collectMathSymbols(n: MathNode, out: Set<string>): void {
  if (n.type === 'SymbolNode' && n.name) out.add(n.name);
  if (n.content) collectMathSymbols(n.content, out);
  for (const a of n.args ?? []) collectMathSymbols(a, out);
}

// ---------------------------------------------------------------------------
// ExprNode → gensym string (fully parenthesized) and back.
// ---------------------------------------------------------------------------

/** The leaf a gensym stands for: its name and dimension. @internal */
export interface LeafMeta {
  readonly name: string;
  readonly dim: Dimension;
}

const isLiteral = isDecimalLiteral;

/**
 * Render a scalar ExprNode to a mathjs-safe, fully-parenthesized string,
 * gensym'ing each non-literal leaf by NAME (so repeats share an identifier
 * and can cancel). Throws on a non-scalar arm and on a non-literal exponent;
 * `algebraic-equivalence.ts` renders both sides of a quotient through one
 * gensym table with it.
 *
 * @internal
 */
export function renderGensym(
  expr: ExprNode,
  gensymOf: Map<string, string>,
  meta: Map<string, LeafMeta>,
): string {
  switch (expr.kind) {
    case 'symbol':
      return renderScalarLeaf(expr, gensymOf, meta);
    case 'op': {
      if (expr.op === '^') {
        const exp = expr.args[1];
        if (!exp || exp.kind !== 'symbol' || !isLiteral(exp.name)) {
          throw new Unsupported();
        }
        return `(${renderGensym(expr.args[0], gensymOf, meta)})^${Number(exp.name)}`;
      }
      if (expr.args.length === 0) throw new Unsupported();
      if (expr.args.length === 1) {
        const arg = renderGensym(expr.args[0]!, gensymOf, meta);
        if (expr.op === '-') return `(-(${arg}))`;
        if (expr.op === '+') return `(${arg})`;
      }
      const parts = expr.args.map((a) => `(${renderGensym(a, gensymOf, meta)})`);
      return `(${parts.join(expr.op)})`;
    }
    default:
      throw new Unsupported(); // integral / derivative / tensor arms
  }
}

const lit = (v: number): ExprNode => ({ kind: 'symbol', name: String(v), dim: DIMENSIONLESS });

/** Walk a simplified MathTS node back to an ExprNode, un-gensym'ing leaves and
 *  rejecting anything outside UPT's integer-exponent scalar model (→ throws
 *  `Unsupported`, a graceful no-op). */
function walkBack(node: MathNode, meta: Map<string, LeafMeta>): ExprNode {
  switch (node.type) {
    case 'ConstantNode': {
      if (typeof node.value !== 'number' || !Number.isFinite(node.value)) {
        throw new Unsupported();
      }
      return lit(node.value);
    }
    case 'SymbolNode': {
      const m = node.name !== undefined ? meta.get(node.name) : undefined;
      if (!m) throw new Unsupported(); // a symbol we did not issue
      return { kind: 'symbol', name: m.name, dim: m.dim };
    }
    case 'ParenthesisNode':
      if (!node.content) throw new Unsupported();
      return walkBack(node.content, meta);
    case 'OperatorNode': {
      const op = node.op;
      const args = node.args ?? [];
      if (op === '^') {
        if (args.length !== 2) throw new Unsupported();
        const exp = args[1];
        if (
          exp.type !== 'ConstantNode' ||
          typeof exp.value !== 'number' ||
          !Number.isInteger(exp.value)
        ) {
          throw new Unsupported(); // non-integer exponent — not in ℤ⁷ model
        }
        return {
          kind: 'op',
          op: '^',
          args: [walkBack(args[0], meta), lit(exp.value)],
        };
      }
      if (op === '-' && args.length === 1) {
        // unary minus → (-1) * arg
        return { kind: 'op', op: '*', args: [lit(-1), walkBack(args[0], meta)] };
      }
      if (op === '+' && args.length === 1) return walkBack(args[0], meta); // unary plus is the argument
      if (op === '+' || op === '-' || op === '*' || op === '/') {
        if (args.length < 2) throw new Unsupported();
        return { kind: 'op', op, args: args.map((a) => walkBack(a, meta)) };
      }
      throw new Unsupported();
    }
    default:
      throw new Unsupported(); // FunctionNode (sqrt/cbrt/…) etc.
  }
}

// ---------------------------------------------------------------------------
// Guards.
// ---------------------------------------------------------------------------

function symbolNames(expr: ExprNode, out: string[] = []): string[] {
  forEachScalarLeaf(expr, (leaf) => out.push(leaf.name), { integral: 'over+integrand', derivative: true });
  return out;
}

const nonNumericSymbols = (expr: ExprNode): string[] =>
  symbolNames(expr).filter((n) => !isLiteral(n));

const PROBE_VALUES = [2.3, 3.7, 5.1, 7.9, 11.3, 13.1, 17.9, 19.3];
const PROBE_MULTIPLIERS = [1, 1.7, 0.41, 2.9];

/** Numeric agreement of `original` and `candidate` over synthesized probes.
 *  Free (non-constant) leaves get distinct, mutually-incommensurate values to
 *  avoid accidental cancellation. <2 finite probes ⇒ 'insufficient' (cannot
 *  verify — EVE-C). */
function numericAgreement(
  original: ExprNode,
  candidate: ExprNode,
): 'agree' | 'disagree' | 'insufficient' {
  const leaves = [...new Set(nonNumericSymbols(original))].filter(
    (n) => !isRegisteredConstant(n),
  );
  let finiteProbes = 0;
  for (const mult of PROBE_MULTIPLIERS) {
    const values: Record<string, number> = {};
    leaves.forEach((leaf, i) => {
      values[leaf] = PROBE_VALUES[i % PROBE_VALUES.length] * mult;
    });
    let a: number;
    let b: number;
    try {
      a = evalExpr(original, values);
      b = evalExpr(candidate, values);
    } catch {
      continue; // a probe drove evalExpr non-finite — skip it
    }
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    finiteProbes++;
    if (Math.abs(a - b) / Math.abs(b || 1) > 1e-9) return 'disagree';
  }
  return finiteProbes >= 2 ? 'agree' : 'insufficient';
}

// ---------------------------------------------------------------------------
// Public entry points.
// ---------------------------------------------------------------------------

/** The result of attempting to simplify an expression. */
interface SimplifyResult {
  readonly expr: ExprNode;
  /** True iff MathTS was present AND produced a guard-passing, distinct form. */
  readonly simplified: boolean;
}

/**
 * Whether the MathTS simplifier is usable. MathTS is a required dependency, so
 * the answer is true; a simplifier that fails its smoke test throws instead.
 * The atlas witness runner reads it to choose between the simplifier and its
 * `peer-absent` path, which a caller still reaches by passing `null`.
 *
 * @internal
 */
export async function isSimplifierAvailable(): Promise<boolean> {
  loadSimplifier();
  return true;
}

/**
 * Simplify a scalar `ExprNode` via MathTS, guarded. Returns the original
 * unchanged (`simplified:false`) when the result cannot be represented or
 * verified; THROWS {@link SimplificationError} only when a
 * representable result disagrees dimensionally/numerically. See module docs.
 *
 * @internal
 */
export async function simplifyExpr(expr: ExprNode): Promise<SimplifyResult> {
  const mod = loadSimplifier();

  const gensymOf = new Map<string, string>();
  const meta = new Map<string, LeafMeta>();
  let candidate: ExprNode;
  try {
    const str = renderGensym(expr, gensymOf, meta);
    // The peer can THROW on some forms (e.g. a known mathts `simplify` BigInt
    // bug on nested `a/(b/c²)`); that, like an unsupported node, is a graceful
    // no-op, not an error. The console is not touched here: the first use
    // already ran inside `loadSimplifier`'s window.
    const simplifiedNode = mod.simplify(mod.parse(str));
    candidate = walkBack(simplifiedNode, meta);
  } catch {
    return { expr, simplified: false }; // unsupported / unrepresentable / peer threw
  }

  // Guard 1 — dimensional. Inability to validate ⇒ no-op; a CHANGED dimension
  // is a representable disagreement ⇒ throw.
  const origDim = validate(expr).inferredDimension;
  // A literal ZERO carries every dimension: `x − x` with `x` a length is a zero
  // LENGTH, but the CAS hands back a bare dimensionless `0`. Re-stamp it with
  // the original dimension, or this guard would reject every exact
  // cancellation of a dimensioned expression as a "changed dimension".
  if (
    origDim !== null &&
    candidate.kind === 'symbol' &&
    candidate.name.trim() !== '' &&
    Number(candidate.name) === 0
  ) {
    candidate = { kind: 'symbol', name: '0', dim: origDim };
  }
  const newResult = validate(candidate);
  if (origDim === null || !newResult.ok || newResult.inferredDimension === null) {
    return { expr, simplified: false };
  }
  if (!equals(origDim, newResult.inferredDimension)) {
    throw new SimplificationError(
      `simplifyExpr: the simplified form changed dimension — a CAS or ` +
        `walk-back error.`,
    );
  }

  // Guard 2 — structural subset (no non-numeric leaf invented).
  const origSyms = new Set(nonNumericSymbols(expr));
  for (const s of nonNumericSymbols(candidate)) {
    if (!origSyms.has(s)) return { expr, simplified: false }; // suspicious ⇒ no-op
  }

  // Guard 3 — numeric agreement.
  const verdict = numericAgreement(expr, candidate);
  if (verdict === 'disagree') {
    throw new SimplificationError(
      `simplifyExpr: the simplified form disagrees numerically with the ` +
        `original — a CAS or walk-back error.`,
    );
  }
  if (verdict === 'insufficient') return { expr, simplified: false };

  // Identical-structure ⇒ nothing gained; report not simplified.
  const changed = symbolNames(candidate).length !== symbolNames(expr).length;
  return { expr: candidate, simplified: changed };
}

/**
 * Simplify a composed {@link Observable}: returns a freshly-RECONSTRUCTED
 * Observable (new strict `evaluate` closure over the simplified `expr` +
 * recomputed `leaves`) when simplification succeeds, else the original
 * unchanged. See module docs.
 *
 * @internal
 */
export async function simplifyObservable(obs: Observable): Promise<Observable> {
  const { expr, simplified } = await simplifyExpr(obs.expr);
  if (!simplified) return obs;
  return makeObservable(obs.name, obs.symbol, obs.dim, expr);
}
