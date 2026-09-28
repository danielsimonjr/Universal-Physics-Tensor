/**
 * MathTS-backed scalar-formula parser (Path A — see
 * docs/planning/MathTS-Formula-Integration-Design-Note.md).
 *
 * Implements the same {@link FormulaParser} contract as the self-contained
 * Path B parser (`formula.ts`), backed by `@danielsimonjr/mathts-functions`'s
 * assembled mathjs-style engine (`parse(expr) → Node`, `node.evaluate(scope)`).
 * The optional peer is loaded dynamically (it is NOT present at tsc time —
 * the ambient declaration in `mathts-functions.ambient.d.ts` covers it), so
 * the package still builds and runs without it; the registry
 * (`formula-registry.ts`) falls back to Path B when it is absent.
 *
 * SCALAR-ONLY guard: the CLI/inference contract returns a `number`. If a
 * formula evaluates to a non-number (matrix, complex, unit, function), this
 * throws a {@link FormulaError} rather than leaking MathTS types through the
 * seam — keeping the two parsers interchangeable.
 *
 * @module numerical/formula-mathts
 */

import type { CompiledFormula, FormulaParser } from './formula.js';
import { BUILTIN_FUNCTION_NAMES, callBuiltinFunction, FormulaError, unknownFunctionMessage } from './formula.js';

/** Minimal structural shape of a MathTS AST node (the bits we use). */
interface MathNode {
  evaluate(scope: Record<string, number>): unknown;
  filter(predicate: (node: MathNode) => boolean): MathNode[];
  toString(): string;
  readonly isSymbolNode?: boolean;
  readonly isFunctionNode?: boolean;
  readonly name?: string;
  readonly fn?: { readonly name?: string };
}

/** Minimal structural shape of the @danielsimonjr/mathts-functions module. */
interface MathtsFunctionsModule {
  parse(expr: string): MathNode;
}

/**
 * Build a {@link FormulaParser} bound to an already-loaded mathts-functions
 * module. Pure (no I/O) — the dynamic import lives in the registry.
 */
function createMathtsFormulaParser(
  mod: MathtsFunctionsModule,
): FormulaParser {
  const builtinCache = new Map<string, boolean>();
  const isBuiltin = (name: string): boolean => {
    const cached = builtinCache.get(name);
    if (cached !== undefined) return cached;
    let builtin: boolean;
    try {
      mod.parse(name).evaluate({});
      builtin = true; // pi / e / sin / … resolve with an empty scope
    } catch {
      builtin = false; // a free variable does not
    }
    builtinCache.set(name, builtin);
    return builtin;
  };

  // Functions the built-in parser documents but MathTS does not define (`ln`),
  // supplied through the scope so a formula means the same under either
  // parser. Anything outside the documented list still fails.
  const shims: Record<string, (...args: number[]) => number> = {};
  for (const name of BUILTIN_FUNCTION_NAMES) {
    if (!isBuiltin(name)) shims[name] = (...args) => callBuiltinFunction(name, args);
  }

  return {
    parse(expr: string): CompiledFormula {
      if (!expr || !expr.trim()) throw new FormulaError('empty formula');
      let node: MathNode;
      try {
        node = mod.parse(expr);
      } catch (err) {
        throw new FormulaError(
          `parse error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Free variables = symbol names − function callees − built-in
      // constants/functions (MathTS's own namespace decides "built-in").
      const callees = new Set(
        node
          .filter((n) => n.isFunctionNode === true)
          .map((n) => n.fn?.name)
          .filter((n): n is string => typeof n === 'string'),
      );
      // A callee MathTS does not resolve and no shim supplies: evaluation would fail with MathTS's
      // own "Undefined function", so it fails with the shared diagnostic instead (audit I4).
      const unknownCallee = [...callees].find((n) => !(n in shims) && !isBuiltin(n));
      const variables = [
        ...new Set(
          node
            .filter((n) => n.isSymbolNode === true)
            .map((n) => n.name)
            .filter((n): n is string => typeof n === 'string')
            .filter((n) => !callees.has(n) && !isBuiltin(n)),
        ),
      ].sort();

      return {
        source: expr,
        variables,
        evaluate(scope: Record<string, number>): number {
          if (unknownCallee !== undefined) throw new FormulaError(unknownFunctionMessage(unknownCallee));
          let result: unknown;
          try {
            result = node.evaluate({ ...shims, ...scope } as Record<string, number>);
          } catch (err) {
            throw new FormulaError(
              err instanceof Error ? err.message : String(err),
            );
          }
          if (typeof result !== 'number' || !Number.isFinite(result)) {
            throw new FormulaError(
              `formula did not evaluate to a finite number (got ${typeof result})`,
            );
          }
          return result;
        },
      };
    },
  };
}

/**
 * Dynamically load the optional peer and build the MathTS-backed parser.
 * Throws if the peer is absent or fails to assemble — the registry catches
 * this and falls back to the self-contained Path B parser.
 */
export async function loadMathtsFormulaParser(): Promise<FormulaParser> {
  const mod = (await import(
    '@danielsimonjr/mathts-functions'
  )) as unknown as MathtsFunctionsModule;
  if (typeof mod.parse !== 'function') {
    throw new FormulaError('mathts-functions: no parse() export');
  }
  return createMathtsFormulaParser(mod);
}
