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
 * Bare `e` is the elementary charge. MathTS 0.28 reads bare `e` as Euler's number
 * in physics mode, so this parser binds `e` to the SI magnitude `E_SI`
 * (`1.602176634e-19`) in the evaluation scope, and `1-e^2` is ordinary
 * arithmetic. Euler's number is `exp(x)`. The name `euler` is refused. `E` stays
 * unbound.
 *
 * @module numerical/formula-mathts
 */

import { compileExpr, parse as parseMathTs } from '@danielsimonjr/mathts-functions';
import { E_SI } from '../core/constants.js';
import { rewriteConstantSpellings } from '../dimensional/constant-rows.js';
import type { CompiledFormula, FormulaParser } from './formula-contract.js';
import { BUILTIN_FUNCTION_NAMES, callBuiltinFunction, EulerNumberError, FormulaError, unknownFunctionMessage, FormulaValueError } from './formula-contract.js';

/** MathTS physics scope: `c`, `G`, `hbar`, `e0`. Bare `e` stays Euler's number there; it is rebound below. */
const PHYSICS = { physics: true } as const;

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
  compileExpr(
    expr: string,
    options: { physics: true },
  ): { evaluate(scope: Record<string, number>): unknown };
}

/** The compiled-formula cache holds at most this many expression texts; the oldest is evicted first. @internal */
export const MAX_FORMULA_CACHE_ENTRIES = 2048;

/**
 * Build a {@link FormulaParser} bound to an already-loaded mathts-functions
 * module. Pure (no I/O) — the dynamic import lives in the registry.
 *
 * Compiled formulas are memoized per expression text in a bounded FIFO map
 * (`MAX_FORMULA_CACHE_ENTRIES` entries, oldest evicted). Every cached
 * `CompiledFormula` is frozen before it is cached, so a caller cannot mutate
 * a shared entry; `evaluate(scope)` still receives the caller's scope on
 * every call, so no numeric result is cached and a scope entry always wins
 * over the built-in defaults. A formula that fails to parse is never cached:
 * it throws before any cache write and recompiles on the next attempt.
 * @internal
 */
export function createMathtsFormulaParser(
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
  // below reads it as the elementary charge by binding `e` to `E_SI` in the scope.
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

  const formulaCache = new Map<string, CompiledFormula>();

  return {
    parse(expr: string): CompiledFormula {
      if (!expr || !expr.trim()) throw new FormulaError('empty formula');
      const cached = formulaCache.get(expr);
      if (cached !== undefined) return cached;
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

      // `compileExpr` applies `{ physics: true }` on each evaluation. Bare `e` is the SI
      // magnitude through the `e: E_SI` default below, and a scope entry for `e` wins.
      // Only the `e` row's aliases (`e_charge`) compile as the canonical name so
      // physics mode cannot treat `e` as Euler's number beside an independent
      // `e_charge` symbol: the unre-written `e + e_charge` with `e=E_SI` and
      // `e_charge=3` sums to 3 in float64. `speed_of_light` and `mu0` stay: they
      // are the caller's identifiers.
      const compiled = mod.compileExpr(rewriteConstantSpellings(expr, new Set(['e'])), PHYSICS);
      const formula: CompiledFormula = Object.freeze({
        source: expr,
        variables: Object.freeze(variables),
        evaluate(scope: Record<string, number>, opts?: { readonly allowInfinity?: boolean }): number {
          if (unknownCallee !== undefined) throw new FormulaError(unknownFunctionMessage(unknownCallee));
          let result: unknown;
          try {
            result = compiled.evaluate({ ...shims, e: E_SI, ...scope });
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
          // typeof Infinity and NaN is "number", which reads as a type error.
          // A Complex is an object; "got object" hides that sqrt(-1) left the reals.
          if (typeof result !== 'number') {
            throw new FormulaValueError(`formula did not evaluate to a finite number (got ${describeNonFinite(result)})`);
          }
          if (Number.isNaN(result)) {
            throw new FormulaValueError('formula did not evaluate to a finite number (got NaN)');
          }
          if (!Number.isFinite(result) && opts?.allowInfinity !== true) {
            throw new FormulaValueError(`formula did not evaluate to a finite number (got ${describeNonFinite(result)})`);
          }
          return result;
        },
      });
      if (formulaCache.size >= MAX_FORMULA_CACHE_ENTRIES) {
        // FIFO: drop the oldest entry. `Map` iteration is insertion order.
        const oldest = formulaCache.keys().next().value;
        if (oldest !== undefined) formulaCache.delete(oldest);
      }
      formulaCache.set(expr, formula);
      return formula;
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
  compileExpr: (expr, options) => compileExpr(expr, options),
};

/** The MathTS formula parser. @internal */
export const mathtsFormulaParser: FormulaParser = createMathtsFormulaParser(mathTsModule);

/** Parse a scalar formula. @internal */
export function parseFormula(expr: string): CompiledFormula {
  return mathtsFormulaParser.parse(expr);
}
