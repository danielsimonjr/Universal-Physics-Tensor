/**
 * Deciding-measurement elasticity for value-kind confrontations. For each
 * numeric input of a stored prediction point, report the dimensionless
 * log-sensitivity E_i = |∂P/∂x_i|·x_i/P. This ranks which input the
 * prediction depends on most strongly. It is not an uncertainty budget.
 *
 * @module bridges/sensitivity
 */

import { catalogConfrontations } from './catalog-load.js';
import { evaluateFormula } from './expr-parse.js';
import { primaryRelation } from './catalog-load.js';

/** One input's elasticity. @public */
export interface Elasticity {
  readonly input: string;
  readonly elasticity: number;
}

function elasticityOf(
  predict: (point: Record<string, number>) => number,
  point: Record<string, number>,
  key: string,
): number {
  const x = point[key];
  const h = Math.abs(x) * 1e-6 || 1e-12;
  const up = { ...point, [key]: x + h };
  const dn = { ...point, [key]: x - h };
  const P = predict(point);
  const dP = (predict(up) - predict(dn)) / (2 * h);
  if (!(Number.isFinite(P) && P !== 0)) return 0;
  return (Math.abs(dP) * Math.abs(x)) / Math.abs(P);
}

/**
 * Elasticity ranking for a value-kind confrontation that stores a prediction
 * point. `[]` when the record is not value-kind, has no point, or is absent.
 *
 * @public
 */
export function decidingMeasurement(catalogId: number): Elasticity[] {
  const row = catalogConfrontations().find((item) => item.catalogId === catalogId);
  if (row === undefined || row.kind !== 'value' || row.prediction === undefined) return [];
  const relation = primaryRelation(catalogId);
  if (relation === undefined) return [];
  const point = { ...row.prediction.inputs };
  const predict = (inputs: Record<string, number>): number => evaluateFormula(relation.expression, inputs);
  return Object.keys(point)
    .map((key) => ({ input: key, elasticity: elasticityOf(predict, point, key) }))
    .sort((a, b) => b.elasticity - a.elasticity);
}
