/**
 * The applied-case registry behind `upt evaluate case-<id>`.
 *
 * @module cases
 */
import { appliedCaseCatalog } from './catalog.js';
import { APPLIED_CASE_RUNNERS } from './methods.js';
import type { AppliedCase, CaseResult } from './types.js';
import { checkInputs, parameterContract, type InputContract } from '../bridges/input-contract.js';

export type { AppliedCase, CaseCheck, CaseComparison, CaseExample, CaseOutput, CaseResult } from './types.js';

/** Validate the catalog once at load. @internal */
appliedCaseCatalog();

/** Case id → case. @internal */
export const APPLIED_CASES: ReadonlyMap<string, AppliedCase> = APPLIED_CASE_RUNNERS;

/**
 * The declared inputs of a case: one listed slot per parameter, spelled by its
 * key and converted from its alternates, required unless the parameter is optional.
 */
function caseContract(c: AppliedCase): InputContract {
  return parameterContract(c.id, c.parameters);
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
