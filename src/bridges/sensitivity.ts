/**
 * Deciding-measurement elasticity for value-kind confrontations. For each
 * input of a stored prediction point, report the dimensionless
 * log-sensitivity E_i = |∂P/∂x_i|·x_i/P of the number the record predicts.
 * This ranks which input the prediction depends on most strongly. It is not
 * an uncertainty budget.
 *
 * @module bridges/sensitivity
 */

import { centralPartial } from '../numerical/finite-difference.js';
import { catalogConfrontations } from './catalog-load.js';
import type { CatalogPrediction } from './catalog-types.js';
import { BRIDGE_EVALUATORS } from './evaluators.js';

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
  const x = point[key]!;
  // Relative step 1e-6, absolute 1e-12 at x = 0: this reader's rule; the derivative is the shared one.
  const h = Math.abs(x) * 1e-6 || 1e-12;
  const P = predict(point);
  const dP = centralPartial(predict, point, key, h);
  if (!(Number.isFinite(P) && P !== 0)) return 0;
  return (Math.abs(dP) * Math.abs(x)) / Math.abs(P);
}

/**
 * The number a confrontation's prediction point yields: the evaluator's value
 * at the point, or the extra output the prediction names.
 * @internal
 */
export function predictedAt(catalogId: number, prediction: CatalogPrediction, inputs: Record<string, number>): number {
  const spec = BRIDGE_EVALUATORS.get(catalogId);
  if (spec === undefined) throw new Error(`confrontation ${catalogId}: no evaluator predicts it`);
  const result = spec.run(inputs, prediction.output === undefined ? 'value' : 'all');
  const key = prediction.output ?? 'value';
  const value = result[key];
  if (value === undefined) throw new Error(`confrontation ${catalogId}: the evaluator returns no '${key}' at the prediction point`);
  return value;
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
  const prediction = row.prediction;
  const point = { ...prediction.inputs };
  const predict = (inputs: Record<string, number>): number => predictedAt(catalogId, prediction, inputs);
  return Object.keys(point)
    .map((key) => ({ input: key, elasticity: elasticityOf(predict, point, key) }))
    .sort((a, b) => b.elasticity - a.elasticity);
}
