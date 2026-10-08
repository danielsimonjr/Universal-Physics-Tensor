/**
 * The errors one evaluation throws, in the order it checks: the bindings
 * against the declared inputs first (an unknown key, a non-number, a key given
 * twice, an absent input), then the validity domain. An input error says what
 * the caller left out or misspelled; a domain error says the physics refuses
 * the values. The library throws these classes so a caller can tell them
 * apart by type, never by message text.
 *
 * @module bridges/evaluation-errors
 */

/** A required input is absent. It is not a physically bad value. @public */
export class MissingInputError extends Error {
  /** The id evaluated, the absent keys, and every declared key. */
  constructor(
    readonly id: string,
    readonly missing: readonly string[],
    readonly inputs: readonly string[],
  ) {
    super(`${id}: missing input ${missing.map((key) => `'${key}'`).join(', ')}; the inputs are: ${inputs.join(', ')}`);
    this.name = 'MissingInputError';
  }
}

const prefix = (id: string | undefined): string => (id === undefined ? '' : `${id}: `);

/** A binding names no declared input, alias or alternate of the id. @public */
export class UnknownInputError extends Error {
  /** The id evaluated (absent when the reader was not told it), the unknown key, and every declared key. */
  constructor(
    readonly id: string | undefined,
    readonly key: string,
    readonly inputs: readonly string[],
  ) {
    super(`${prefix(id)}'${key}' is not an input here; the inputs are: ${inputs.join(', ')}`);
    this.name = 'UnknownInputError';
  }
}

/** A binding's value is not a number. A `TypeError`, as before it was typed. @public */
export class InputTypeError extends TypeError {
  /** The id evaluated, the key, and the JavaScript type that was given. */
  constructor(
    readonly id: string,
    readonly key: string,
    readonly got: string,
  ) {
    super(`${id}: ${key} must be a number, got ${got}`);
    this.name = 'InputTypeError';
  }
}

/** One input is given twice, under two of its spellings (its key, an alias, or an alternate). @public */
export class DuplicateInputError extends Error {
  /** The id evaluated (absent when the reader was not told it), the input, and the two spellings it was given under. */
  constructor(
    readonly id: string | undefined,
    readonly key: string,
    readonly spellings: readonly [string, string],
  ) {
    super(
      spellings[0] === spellings[1]
        ? `${prefix(id)}'${key}' is given twice`
        : `${prefix(id)}'${key}' is given twice (once through an alternate): ${spellings[0]} and ${spellings[1]}`,
    );
    this.name = 'DuplicateInputError';
  }
}

/**
 * Evaluation refused: the inputs fall outside the relation's validity domain.
 *
 * Honest deviation from design D-3's "domain-incompatible at compose
 * time": domain predicates are opaque functions, so incompatibility is
 * detectable only at evaluation. This error is thrown by `evaluateEdge`, by
 * a catalog evaluator, and by composed edges internally, not by
 * `composeEdges`.
 *
 * @public
 */
export class DomainViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainViolationError';
  }
}
