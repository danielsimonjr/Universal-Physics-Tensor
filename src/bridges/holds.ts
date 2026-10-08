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

const COMPILED = new Map<string, Compiled>();

function compiled(rewritten: string, source: string): Compiled {
  const hit = COMPILED.get(rewritten);
  if (hit !== undefined) return hit;
  let node: MathNode;
  try {
    node = parseMathTs(rewritten) as unknown as MathNode;
  } catch (error) {
    throw new HoldsError(`${error instanceof Error ? error.message : String(error)} in ${source}`);
  }
  const fn = compile(node, source);
  COMPILED.set(rewritten, fn);
  return fn;
}

/**
 * Whether `holds` is true for `values`.
 * Hyphenated quantity names are rewritten with `names` before parsing; an
 * unbound name, a non-boolean result, and a syntax error are a {@link HoldsError}.
 */
export function holds(
  source: string,
  values: Readonly<Record<string, number>>,
  constants: Readonly<Record<string, number>>,
  names: readonly string[],
): boolean {
  const rewritten = rewriteCatalogHyphens(source, names);
  const scope: Scope = { ...constants };
  for (const [key, value] of Object.entries(values)) scope[key.replace(/-/g, '_')] = value;
  const result = compiled(rewritten, source)(scope);
  if (typeof result !== 'boolean') throw new HoldsError(`condition is not boolean: ${source}`);
  return result;
}
