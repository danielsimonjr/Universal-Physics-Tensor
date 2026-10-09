/**
 * MathTS-backed scalar-formula parser.
 *
 * Backed by `@danielsimonjr/mathts-functions` (`parse(expr) → Node`,
 * `node.evaluate(scope)`). The package is a required dependency.
 *
 * SCALAR-ONLY guard: the CLI/inference contract returns a `number`. If a
 * formula evaluates to a non-number (matrix, complex, unit, function), this
 * throws a {@link FormulaError} rather than leaking MathTS types through the
 * seam.
 *
 * Bare `e` is the elementary charge. MathTS `{ physics: true, charge: 'scalar' }`
 * binds that symbol to the SI magnitude `1.602176634e-19`, so `1-e^2` is
 * ordinary arithmetic. `{ physics: true }` without `charge: 'scalar'` is a
 * Unit, and subtract does not accept it. Euler's number is `exp(x)`. The name
 * `euler` is refused. `E` stays unbound.
 *
 * @module numerical/formula-mathts
 */

import { compileExpr, parse as parseMathTs } from '@danielsimonjr/mathts-functions';
import type { CompiledFormula, FormulaParser } from './formula-contract.js';
import { BUILTIN_FUNCTION_NAMES, callBuiltinFunction, EulerNumberError, FormulaError, unknownFunctionMessage } from './formula-contract.js';

/** Bare `e` is the SI magnitude, not the coulomb Unit. */
const PHYSICS_SCALAR = { physics: true, charge: 'scalar' } as const;

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

  // A MathTS *function* (`gamma`, `distance`, `zeta`, `sin`, …) also resolves
  // with an empty scope: it returns the function. That is not a value. A bare
  // symbol with that name is a quantity (the adiabatic index, a length), and
  // treating it as a built-in dropped it from the free-variable list, so
  // `sqrt(gamma*pressure/density)` died as "undeclared symbol 'gamma'".
  // Only a name that evaluates to a number is a MathTS constant (`pi`, `tau`).
  // Bare `e` is one of those under MathTS's default (Euler's number). Evaluation
  // below reads it as the elementary charge through `{ physics: true, charge: 'scalar' }`.
  // An explicit scope `e` still wins. The name `euler` is refused below.
  // A call such as `gamma(5)` is still a callee, decided separately.
  const valueConstantCache = new Map<string, boolean>();
  const isValueConstant = (name: string): boolean => {
    const cached = valueConstantCache.get(name);
    if (cached !== undefined) return cached;
    let constant = false;
    try {
      constant = typeof mod.parse(name).evaluate({}) === 'number';
    } catch {
      constant = false;
    }
    valueConstantCache.set(name, constant);
    return constant;
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

      // Free variables = symbol names − function callees − numeric constants.
      // A function name is excluded only where it is called (`gamma(5)`), not
      // where it is a quantity (`gamma` the adiabatic index).
      const callees = new Set(
        node
          .filter((n) => n.isFunctionNode === true)
          .map((n) => n.fn?.name)
          .filter((n): n is string => typeof n === 'string'),
      );
      // A callee MathTS does not resolve and no shim supplies: evaluation would fail with MathTS's
      // own "Undefined function", so it fails with the shared diagnostic instead (audit I4).
      const symbolNames = node
        .filter((n) => n.isSymbolNode === true)
        .map((n) => n.name)
        .filter((n): n is string => typeof n === 'string');
      if (symbolNames.includes('euler') || callees.has('euler')) {
        throw new EulerNumberError();
      }
      const unknownCallee = [...callees].find((n) => !(n in shims) && !isBuiltin(n));
      const variables = [
        ...new Set(
          node
            .filter((n) => n.isSymbolNode === true)
            .map((n) => n.name)
            .filter((n): n is string => typeof n === 'string')
            .filter((n) => !callees.has(n) && !isValueConstant(n)),
        ),
      ].sort();

      // `compileExpr` applies `{ physics: true, charge: 'scalar' }` on each
      // evaluation, so bare `e` is the SI magnitude and a scope entry for `e` wins.
      const compiled = compileExpr(expr, PHYSICS_SCALAR);
      return {
        source: expr,
        variables,
        evaluate(scope: Record<string, number>): number {
          if (unknownCallee !== undefined) throw new FormulaError(unknownFunctionMessage(unknownCallee));
          let result: unknown;
          try {
            result = compiled.evaluate({ ...shims, ...scope });
          } catch (err) {
            // `compileExpr` quotes the name (`Undefined symbol "process"`).
            // The interpreter path reports `Undefined symbol process`.
            // The one place src/ reads MathTS message text: MathTS throws a plain `Error` with no
            // symbol field, and a pre-check against the scope cannot stand in because MathTS resolves
            // some names itself (`hbar` reads as a unit). It only normalizes the text; nothing branches on it.
            // Tracked in ACTIVE.md as a MathTS follow-up (a typed undefined-symbol error).
            const message = err instanceof Error ? err.message : String(err);
            throw new FormulaError(message.replace(/^Undefined symbol "([^"]+)"$/, 'Undefined symbol $1'));
          }
          if (typeof result !== 'number' || !Number.isFinite(result)) {
            // typeof Infinity and NaN is "number", which reads as a type error.
            // A Complex is an object; "got object" hides that sqrt(-1) left the reals.
            throw new FormulaError(`formula did not evaluate to a finite number (got ${describeNonFinite(result)})`);
          }
          return result;
        },
      };
    },
  };
}

/** What a non-finite or non-number result was, for the error text. */
function describeNonFinite(result: unknown): string {
  if (typeof result === 'number') return String(result);
  if (result !== null && typeof result === 'object') {
    const c = result as { re?: unknown; im?: unknown; toString?: () => string };
    if (typeof c.re === 'number' && typeof c.im === 'number') {
      const text = typeof c.toString === 'function' ? c.toString() : `${c.re}+${c.im}i`;
      return `a complex number (${text})`;
    }
  }
  return typeof result;
}

const mathTsModule: MathtsFunctionsModule = {
  // MathTS's Node type is not imported; `MathNode` is the structural subset
  // this parser reads (`evaluate`, `filter`, `isSymbolNode`, `isFunctionNode`,
  // `name`, `fn`), every member of which exists on a MathTS node.
  parse: (expr) => parseMathTs(expr) as unknown as MathNode,
};

/** The MathTS formula parser. @internal */
export const mathtsFormulaParser: FormulaParser = createMathtsFormulaParser(mathTsModule);

/** Parse a scalar formula. @internal */
export function parseFormula(expr: string): CompiledFormula {
  return mathtsFormulaParser.parse(expr);
}
