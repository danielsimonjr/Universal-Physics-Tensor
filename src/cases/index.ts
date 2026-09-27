/**
 * The applied-case registry behind `upt evaluate case-<id>`.
 *
 * @module cases
 */
import { BROWNIAN_SPHERE_CASE } from './brownian-sphere.js';
import { DAMPED_RESONATOR_CASE } from './damped-resonator.js';
import { KEPLER_RV_CASE } from './kepler-rv.js';
import { LUMPED_COOLING_CASE } from './lumped-cooling.js';
import { RESISTOR_NOISE_CASE } from './resistor-noise.js';
import { SKIN_DEPTH_CASE } from './skin-depth.js';
import type { AppliedCase, CaseResult } from './types.js';

export type { AppliedCase, CaseCheck, CaseComparison, CaseExample, CaseOutput, CaseResult } from './types.js';

/** Case id → case. @internal */
export const APPLIED_CASES: ReadonlyMap<string, AppliedCase> = new Map(
  [RESISTOR_NOISE_CASE, BROWNIAN_SPHERE_CASE, DAMPED_RESONATOR_CASE, SKIN_DEPTH_CASE, LUMPED_COOLING_CASE, KEPLER_RV_CASE].map((c) => [c.id, c]),
);

/**
 * Run a case with a numeric input record.
 * @throws Error on an unknown id, a missing input, or an input outside the model's domain.
 * @internal
 */
export function runAppliedCase(id: string, inputs: Readonly<Record<string, number>>): CaseResult {
  const c = APPLIED_CASES.get(id);
  if (c === undefined) throw new Error(`runAppliedCase: no case '${id}' (cases: ${[...APPLIED_CASES.keys()].join(', ')})`);
  const missing = c.parameters.filter((p) => p.optional !== true || p.key in inputs).map((p) => p.key).filter((k) => !(k in inputs) || !Number.isFinite(inputs[k]));
  if (missing.length > 0) {
    throw new Error(`${id} needs {${c.parameters.map((p) => p.key).join(', ')}}; missing/non-finite: ${missing.join(', ')}`);
  }
  return c.run(inputs);
}
