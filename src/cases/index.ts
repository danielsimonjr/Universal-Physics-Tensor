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
import { checkInputs, inputContract, type InputContract } from '../bridges/input-contract.js';

export type { AppliedCase, CaseCheck, CaseComparison, CaseExample, CaseOutput, CaseResult } from './types.js';

/** Case id → case. @internal */
export const APPLIED_CASES: ReadonlyMap<string, AppliedCase> = new Map(
  [RESISTOR_NOISE_CASE, BROWNIAN_SPHERE_CASE, DAMPED_RESONATOR_CASE, SKIN_DEPTH_CASE, LUMPED_COOLING_CASE, KEPLER_RV_CASE].map((c) => [c.id, c]),
);

/**
 * The declared inputs of a case: one listed slot per parameter, spelled by its
 * key and converted from its alternates, required unless the parameter is optional.
 */
function caseContract(c: AppliedCase): InputContract {
  return inputContract(
    c.id,
    c.parameters.map((p) => ({
      key: p.key,
      spellings: [p.key],
      alternates: (p.alternates ?? []).map((alt) => ({ key: alt.key, toKey: alt.toKey })),
      optional: p.optional === true,
      readBy: 'value' as const,
      listed: true,
    })),
  );
}

/** Case id → its input contract, built once at load (a contract that spells one key twice fails here). @internal */
export const CASE_CONTRACTS: ReadonlyMap<string, InputContract> = new Map([...APPLIED_CASES].map(([id, c]) => [id, caseContract(c)]));

/**
 * Run a case with a numeric input record. The inputs go through the same
 * {@link checkInputs} contract as a catalog evaluator before the case's model runs.
 * @throws Error on an unknown id.
 * @throws UnknownInputError, InputTypeError, NonFiniteInputError, DuplicateInputError or
 *   MissingInputError on an input the contract refuses.
 * @throws Error from the case's model on an input outside its domain.
 * @internal
 */
export function runAppliedCase(id: string, inputs: Readonly<Record<string, number>>): CaseResult {
  const c = APPLIED_CASES.get(id);
  const contract = CASE_CONTRACTS.get(id);
  if (c === undefined || contract === undefined) {
    throw new Error(`runAppliedCase: no case '${id}' (cases: ${[...APPLIED_CASES.keys()].join(', ')})`);
  }
  return c.run(checkInputs(contract, inputs));
}
