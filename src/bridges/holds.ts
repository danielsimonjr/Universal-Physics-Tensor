/**
 * Interpreter for a catalog validity condition.
 *
 * A condition is a boolean expression over quantity names, the registered
 * constants, `isFinite` and `isInteger`, written in MathTS's grammar
 * (`and`, `or`, `not`, `<`, `<=`, `>`, `>=`, `==`, `!=`). MathTS parses it,
 * and MathTS evaluates every arithmetic sub-expression. The comparisons and
 * the logical operators are evaluated here, exactly: MathTS's own comparison
 * operators are tolerance-based (`absTol` 1e-15), so under them `1e-18 > 0`
 * is false, which no condition over SI magnitudes can accept.
 *
 * It is not JavaScript `eval`.
 *
 * @module bridges/holds
 */

import { parse as parseMathTs } from '@danielsimonjr/mathts-functions';
import { rewriteCatalogHyphens } from '../dimensional/hyphen-names.js';

/** A condition could not be evaluated: it names an unbound symbol, or its text does not parse. @internal */
export class HoldsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HoldsError';
  }
}

/** The MathTS node shape this interpreter reads. */
interface MathNode {
  readonly type: string;
  readonly op?: string;
  readonly fn?: string | { readonly name?: string };
  readonly name?: string;
  readonly value?: unknown;
  readonly args?: readonly MathNode[];
  readonly content?: MathNode;
  evaluate(scope: Record<string, unknown>): unknown;
}

type Scope = Record<string, number>;
type Compiled = (scope: Scope) => boolean | number;

const COMPARISONS: Readonly<Record<string, (a: number, b: number) => boolean>> = {
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
};

const PREDICATES: Readonly<Record<string, (x: number) => boolean>> = {
  isFinite: (x) => Number.isFinite(x),
  isInteger: (x) => Number.isInteger(x),
};

function functionName(node: MathNode): string {
  return typeof node.fn === 'string' ? node.fn : (node.fn?.name ?? node.name ?? '');
}

/** Evaluate an arithmetic sub-tree through MathTS; the result must be a number. */
function arithmetic(node: MathNode, source: string): Compiled {
  return (scope) => {
    let v: unknown;
    try {
      v = node.evaluate(scope);
    } catch (error) {
      throw new HoldsError(`${error instanceof Error ? error.message : String(error)} in ${source}`);
    }
    if (typeof v !== 'number') throw new HoldsError(`operand is not a number: ${node.toString()} in ${source}`);
    return v;
  };
}

function compile(node: MathNode, source: string): Compiled {
  switch (node.type) {
    case 'ParenthesisNode':
      return compile(node.content!, source);
    case 'ConstantNode':
      if (typeof node.value === 'boolean') return () => node.value as boolean;
      return arithmetic(node, source);
    case 'OperatorNode': {
      const op = node.op ?? '';
      const args = node.args ?? [];
      if (op === 'and' || op === 'or') {
        const parts = args.map((a) => compile(a, source));
        return (scope) => {
          const values = parts.map((p) => p(scope));
          if (values.some((v) => typeof v !== 'boolean')) throw new HoldsError(`'${op}' of a number in ${source}`);
          return op === 'and' ? values.every(Boolean) : values.some(Boolean);
        };
      }
      if (op === 'not') {
        const inner = compile(args[0]!, source);
        return (scope) => {
          const v = inner(scope);
          if (typeof v !== 'boolean') throw new HoldsError(`'not' of a number in ${source}`);
          return !v;
        };
      }
      const compare = COMPARISONS[op];
      if (compare !== undefined) {
        const [left, right] = args.map((a) => compile(a, source));
        return (scope) => {
          const a = left!(scope);
          const b = right!(scope);
          if (typeof a !== 'number' || typeof b !== 'number') throw new HoldsError(`'${op}' of a boolean in ${source}`);
          return compare(a, b);
        };
      }
      return arithmetic(node, source);
    }
    case 'FunctionNode': {
      const predicate = PREDICATES[functionName(node)];
      if (predicate !== undefined) {
        const arg = compile(node.args![0]!, source);
        return (scope) => {
          const v = arg(scope);
          if (typeof v !== 'number') throw new HoldsError(`${functionName(node)} of a boolean in ${source}`);
          return predicate(v);
        };
      }
      return arithmetic(node, source);
    }
    default:
      return arithmetic(node, source);
  }
}

/**
 * One conjunct of a validity condition: the text it is written in (the
 * relation's own names), the names it reads, and its test.
 * @internal
 */
export interface HoldsCondition {
  /** The conjunct as the condition states it, in the relation's names (`swing-kelvin >= 0`). */
  readonly text: string;
  /** The names it reads, in order of first use, as the relation spells them. */
  readonly names: readonly string[];
  /** True when the conjunct holds; a name it cannot bind, or a non-boolean result, throws {@link HoldsError}. */
  test(scope: Readonly<Record<string, number>>): boolean;
}

/**
 * The conjuncts of `node`: an `and` splits, `not (not X)` is X, `not (A or B)` is
 * `not A` and `not B`, and `not (x == y)` is `x != y`. Each rewrite is exact, so
 * the conjunction of the parts is the condition. Anything else is one conjunct.
 */
function conjuncts(node: MathNode): MathNode[] {
  if (node.type === 'ParenthesisNode') return conjuncts(node.content!);
  if (node.type === 'OperatorNode' && node.op === 'and') return (node.args ?? []).flatMap(conjuncts);
  if (node.type === 'OperatorNode' && node.op === 'not') {
    let inner = node.args![0]!;
    while (inner.type === 'ParenthesisNode') inner = inner.content!;
    if (inner.type === 'OperatorNode' && inner.op === 'not') return conjuncts(inner.args![0]!);
    if (inner.type === 'OperatorNode' && inner.op === 'or') return (inner.args ?? []).flatMap((arg) => conjuncts(negation(arg)));
    if (inner.type === 'OperatorNode' && inner.op === '==') return [withOperator(inner, '!=')];
  }
  return [node];
}

/** `not X` as a node, so the rewrite above can recurse into it. */
function negation(node: MathNode): MathNode {
  return parseMathTs(`not (${node.toString()})`) as unknown as MathNode;
}

/** `a op b` with the same operands. */
function withOperator(node: MathNode, op: string): MathNode {
  const [a, b] = node.args!;
  return parseMathTs(`${a!.toString()} ${op} ${b!.toString()}`) as unknown as MathNode;
}

/** The symbol names a node reads, in order, without functions. */
function symbolNames(node: MathNode): string[] {
  const out: string[] = [];
  const visit = (n: MathNode): void => {
    if (n.type === 'SymbolNode' && n.name !== undefined) {
      if (!out.includes(n.name)) out.push(n.name);
      return;
    }
    if (n.type === 'ParenthesisNode') visit(n.content!);
    for (const arg of n.args ?? []) visit(arg);
  };
  visit(node);
  return out;
}

/** Replace each whole-word identifier of `text` through `rename`. */
function renameIdentifiers(text: string, rename: (name: string) => string): string {
  return text.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (word) => rename(word));
}

const CONDITIONS = new Map<string, readonly HoldsCondition[]>();

/**
 * The conjuncts of the condition `source`, each testable alone. Their
 * conjunction is the condition, so a caller that tests them all decides
 * exactly what {@link holds} decides, and can say which part failed.
 * Hyphenated names are rewritten with `names` before parsing and restored in
 * each conjunct's `text` and `names`.
 * @internal
 */
export function holdsConditions(source: string, names: readonly string[]): readonly HoldsCondition[] {
  const rewritten = rewriteCatalogHyphens(source, names);
  const hit = CONDITIONS.get(rewritten);
  if (hit !== undefined) return hit;
  let root: MathNode;
  try {
    root = parseMathTs(rewritten) as unknown as MathNode;
  } catch (error) {
    throw new HoldsError(`${error instanceof Error ? error.message : String(error)} in ${source}`);
  }
  const spelled = new Map(names.map((name) => [name.replace(/-/g, '_'), name]));
  const restore = (name: string): string => spelled.get(name) ?? name;
  const parts = conjuncts(root).map((node): HoldsCondition => {
    const text = renameIdentifiers(node.toString(), restore);
    const fn = compile(node, text);
    return {
      text,
      names: symbolNames(node).map(restore),
      test: (scope) => {
        const result = fn({ ...scope });
        if (typeof result !== 'boolean') throw new HoldsError(`condition is not boolean: ${text}`);
        return result;
      },
    };
  });
  CONDITIONS.set(rewritten, parts);
  return parts;
}

/** A scope for a condition: the constants, then `values` with hyphens written as underscores. */
export function holdsScope(values: Readonly<Record<string, number>>, constants: Readonly<Record<string, number>>): Record<string, number> {
  const scope: Record<string, number> = { ...constants };
  for (const [key, value] of Object.entries(values)) scope[key.replace(/-/g, '_')] = value;
  return scope;
}

/**
 * Whether `holds` is true for `values`: every conjunct of
 * {@link holdsConditions} holds. Hyphenated quantity names are rewritten with
 * `names` before parsing; an unbound name, a non-boolean result, and a syntax
 * error are a {@link HoldsError}.
 */
export function holds(
  source: string,
  values: Readonly<Record<string, number>>,
  constants: Readonly<Record<string, number>>,
  names: readonly string[],
): boolean {
  const scope = holdsScope(values, constants);
  return holdsConditions(source, names).every((condition) => condition.test(scope));
}
