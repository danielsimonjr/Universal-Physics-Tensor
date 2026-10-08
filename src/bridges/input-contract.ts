/**
 * The one check of a binding record against an id's declared inputs.
 *
 * Every evaluation runs it before any domain check: `evaluateRelation`, the
 * CLI's `upt evaluate`, an evaluator's `run`, and the uncertainty probes that
 * call `run`. It refuses an unknown key, a non-number and a key given twice,
 * converts a declared alternate onto its key, and names every absent
 * required input, in that order.
 *
 * What is required depends on what the caller asks for. A slot is read by the
 * value (it owns a source of the relation) or only by the extra outputs. A
 * caller who wants the value alone (`evaluateRelation`, the graph edge) need
 * not give an output-only input; a caller who wants every output must.
 *
 * @module bridges/input-contract
 */

import { DuplicateInputError, InputTypeError, MissingInputError, UnknownInputError } from './evaluation-errors.js';

/** A second key that converts into a slot's key by a factor. @public */
export interface ContractAlternate {
  readonly key: string;
  readonly toKey: number;
}

/** One declared input: the key the evaluation reads, and every spelling that binds it. @public */
export interface InputSlot {
  readonly key: string;
  /** Spellings that bind this slot as given (the key, its quantity, its source and aliases). */
  readonly spellings: readonly string[];
  readonly alternates: readonly ContractAlternate[];
  readonly optional: boolean;
  /** `'value'` when the relation's value reads this slot; `'outputs'` when only an extra output does. */
  readonly readBy: 'value' | 'outputs';
  /** Listed in a message as one of "the inputs". A constant a caller may override is not. */
  readonly listed: boolean;
}

/** What the caller wants back: the relation's value alone, or the value and every extra output. @public */
export type EvaluationWant = 'value' | 'all';

/** The declared inputs of one id. @public */
export interface InputContract {
  readonly id: string;
  readonly slots: readonly InputSlot[];
}

/**
 * `bindings` keyed by slot key, after the contract's checks.
 *
 * @throws UnknownInputError a key no slot spells.
 * @throws InputTypeError a value that is not a number.
 * @throws DuplicateInputError one slot bound under two spellings.
 * @throws MissingInputError a required slot left unbound (every one is named).
 *   With `want` `'value'`, a slot only an extra output reads is not required.
 */
export function checkInputs(
  contract: InputContract,
  bindings: Readonly<Record<string, unknown>>,
  want: EvaluationWant = 'all',
): Record<string, number> {
  const listed = contract.slots.filter((slot) => slot.listed).map((slot) => slot.key);
  const bySpelling = new Map<string, { slot: InputSlot; factor: number }>();
  for (const slot of contract.slots) {
    for (const spelling of slot.spellings) if (!bySpelling.has(spelling)) bySpelling.set(spelling, { slot, factor: 1 });
  }
  for (const slot of contract.slots) {
    for (const alt of slot.alternates) if (!bySpelling.has(alt.key)) bySpelling.set(alt.key, { slot, factor: alt.toKey });
  }
  const out: Record<string, number> = {};
  const givenAs = new Map<string, string>();
  for (const [key, value] of Object.entries(bindings)) {
    const found = bySpelling.get(key);
    if (found === undefined) throw new UnknownInputError(contract.id, key, listed);
    if (typeof value !== 'number') throw new InputTypeError(contract.id, key, typeof value);
    const earlier = givenAs.get(found.slot.key);
    if (earlier !== undefined) throw new DuplicateInputError(contract.id, found.slot.key, [earlier, key]);
    givenAs.set(found.slot.key, key);
    out[found.slot.key] = value * found.factor;
  }
  const required = (slot: InputSlot): boolean => !slot.optional && (want === 'all' || slot.readBy === 'value');
  const missing = contract.slots.filter((slot) => required(slot) && !givenAs.has(slot.key)).map((slot) => slot.key);
  if (missing.length > 0) throw new MissingInputError(contract.id, missing, listed);
  return out;
}
