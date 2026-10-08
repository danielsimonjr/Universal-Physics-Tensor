/**
 * The one check of a binding record against an id's declared inputs.
 *
 * Every evaluation runs it before any domain check: `evaluateRelation`, the
 * CLI's `upt evaluate`, an evaluator's `run`, the uncertainty probes that
 * call `run`, and an applied case. It refuses an unknown key, a non-number, a
 * number that is not finite and a key given twice, converts a declared
 * alternate onto its key, and names every absent required input, in that
 * order.
 *
 * A spelling binds one slot. {@link inputContract} builds a contract and
 * refuses one whose spellings or alternates name two slots, so an ambiguous
 * key fails when the contract is built, not when a caller happens to use it.
 *
 * What is required depends on what the caller asks for. A slot is read by the
 * value (it owns a source of the relation) or only by the extra outputs. A
 * caller who wants the value alone (`evaluateRelation`, the graph edge) need
 * not give an output-only input; a caller who wants every output must.
 *
 * @module bridges/input-contract
 */

import {
  DuplicateInputError,
  InputTypeError,
  MissingInputError,
  NonFiniteInputError,
  UnknownInputError,
} from './evaluation-errors.js';

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

/** Spelling → the slot it binds and the factor onto the slot's key. */
type SpellingIndex = ReadonlyMap<string, { readonly slot: InputSlot; readonly factor: number }>;

const INDEX = new WeakMap<InputContract, SpellingIndex>();

/**
 * Every spelling and alternate of `contract`, each onto its one slot.
 * @throws Error when one spelling names two slots.
 */
function spellingIndex(contract: InputContract): SpellingIndex {
  const cached = INDEX.get(contract);
  if (cached !== undefined) return cached;
  const index = new Map<string, { slot: InputSlot; factor: number }>();
  const bind = (spelling: string, slot: InputSlot, factor: number): void => {
    const earlier = index.get(spelling);
    if (earlier !== undefined && earlier.slot !== slot) {
      throw new Error(
        `${contract.id}: input contract spells '${spelling}' for both '${earlier.slot.key}' and '${slot.key}'`,
      );
    }
    if (earlier === undefined) index.set(spelling, { slot, factor });
  };
  for (const slot of contract.slots) for (const spelling of slot.spellings) bind(spelling, slot, 1);
  for (const slot of contract.slots) for (const alt of slot.alternates) bind(alt.key, slot, alt.toKey);
  INDEX.set(contract, index);
  return index;
}

/**
 * A contract for `id` with `slots`, checked once here: every spelling and
 * alternate binds exactly one slot.
 *
 * @throws Error when a spelling or an alternate names two slots.
 * @public
 */
export function inputContract(id: string, slots: readonly InputSlot[]): InputContract {
  const contract: InputContract = { id, slots };
  spellingIndex(contract);
  return contract;
}

/**
 * `bindings` keyed by slot key, after the contract's checks.
 *
 * @throws UnknownInputError a key no slot spells.
 * @throws InputTypeError a value that is not a number.
 * @throws NonFiniteInputError a number that is `NaN`, `Infinity` or `-Infinity`.
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
  const bySpelling = spellingIndex(contract);
  const out: Record<string, number> = {};
  const givenAs = new Map<string, string>();
  for (const [key, value] of Object.entries(bindings)) {
    const found = bySpelling.get(key);
    if (found === undefined) throw new UnknownInputError(contract.id, key, listed);
    if (typeof value !== 'number') throw new InputTypeError(contract.id, key, typeof value);
    if (!Number.isFinite(value)) throw new NonFiniteInputError(contract.id, key, value);
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
