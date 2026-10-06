/**
 * Sign of the one-loop coefficient, read from the catalog expression.
 * The statement is the coefficient, not a residual against a measurement.
 *
 * @module bridges/coefficient-statement
 */

import { catalogEntries, primaryRelation } from './catalog-load.js';
import { evaluateFormula } from './expr-parse.js';

/** Sign of the one-loop coefficient. @public */
export type OneLoopCoefficientSign = 'positive' | 'zero' | 'negative';

/**
 * Whether b₀ is positive, zero, or negative for a stated color number and
 * flavor number. Positive is asymptotic freedom in this one-loop truncation.
 *
 * @public
 */
export interface OneLoopCoefficientStatement {
  readonly label: 'one-loop coefficient';
  readonly sign: OneLoopCoefficientSign;
  readonly b0: number;
}

/**
 * State the sign of b₀ for the catalog row whose statement is the one-loop
 * coefficient. At unit coupling, β = −b₀ / (16π²).
 *
 * @public
 */
export function oneLoopCoefficientStatement(
  colorNumber: number,
  flavorNumber: number,
): OneLoopCoefficientStatement {
  const entry = catalogEntries().find((row) => row.statement === 'one-loop-coefficient');
  if (entry === undefined) {
    throw new Error('oneLoopCoefficientStatement: the catalog has no one-loop coefficient statement');
  }
  const relation = primaryRelation(entry.id);
  if (relation === undefined) {
    throw new Error('oneLoopCoefficientStatement: the statement has no expression');
  }
  const beta = evaluateFormula(relation.expression, {
    'gauge-coupling': 1,
    'color-number': colorNumber,
    'flavor-number': flavorNumber,
  });
  const b0 = -beta * 16 * Math.PI * Math.PI;
  const sign: OneLoopCoefficientSign = b0 > 0 ? 'positive' : b0 < 0 ? 'negative' : 'zero';
  return { label: 'one-loop coefficient', sign, b0 };
}
