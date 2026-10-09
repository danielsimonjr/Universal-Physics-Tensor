/**
 * Formula-parser registry.
 *
 * `getFormulaParser()` returns the MathTS-backed parser. The MathTS packages
 * are required dependencies, so there is no absent-peer branch and no Path B
 * parser.
 *
 * @module numerical/formula-registry
 */

import type { FormulaParser } from './formula-contract.js';
import { mathtsFormulaParser } from './formula-mathts.js';
import type { Dimension } from '../dimensional/types.js';
import type { FormulaDimensionChecker, ParsedPhysics } from './formula-dimension.js';
import { builtinFormulaDimensionChecker } from './formula-dimension.js';

/**
 * The one formula parser kind. The `builtin` recursive-descent parser was
 * removed with Path B, so the type has no second member; the CLI records
 * this value in an experiment record's environment.
 */
type FormulaParserKind = 'mathts';

/**
 * Resolve the active formula parser. It is the MathTS parser. The function
 * stays async because the CLI awaits it on a code path that once loaded an
 * optional peer; the value is constant.
 * @internal
 */
export async function getFormulaParser(): Promise<FormulaParser> {
  return mathtsFormulaParser;
}

/** Which parser is active: `mathts`, the one value of {@link FormulaParserKind}. @internal */
export async function getFormulaParserKind(): Promise<FormulaParserKind> {
  return 'mathts';
}

/**
 * The dimensional checker for user formulas. It transpiles the MathTS AST.
 * @internal
 */
export async function getFormulaDimensionChecker(): Promise<FormulaDimensionChecker> {
  return builtinFormulaDimensionChecker();
}

/**
 * Parse physics text to a dimensional `ExprNode` + its inferred dimension.
 * The single public string→`ExprNode` entry point.
 *
 * @throws {FormulaDimensionError} on a parse error or non-homogeneity.
 * @public
 */
export async function parsePhysics(
  text: string,
  dims: Readonly<Record<string, Dimension>>,
): Promise<ParsedPhysics> {
  return builtinFormulaDimensionChecker().parse(text, dims);
}
