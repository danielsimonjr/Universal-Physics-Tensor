/**
 * The errors one evaluation throws, in the order it checks: the bindings
 * against the declared inputs first (an unknown key, a non-number, a number
 * that is not finite, a key given twice, an absent input), then the validity
 * domain. An input error says what the caller left out or misspelled; a
 * domain error says the physics refuses the values. The library throws these classes so a caller can tell them
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

/**
 * A binding's value is a number that is not finite (`NaN`, `Infinity`,
 * `-Infinity`). It is refused before the domain, so a validity predicate never
 * sees it and a closed form never turns it into an unset result. @public
 */
export class NonFiniteInputError extends Error {
  /** The id evaluated, the key, and the value that was given. */
  constructor(
    readonly id: string,
    readonly key: string,
    readonly value: number,
  ) {
    super(`${id}: ${key} must be a finite number, got ${value}`);
    this.name = 'NonFiniteInputError';
  }
}

/**
 * A binding names π, a registered physical constant or a formula overlay
 * (`G`, `k_B`, `m_p`, …). A constant is never an input: the value would
 * silently replace the constant in the formula. A relation's own declared
 * source may carry such a name (a named default the caller overrides); any
 * other key with that name is refused before the formula is evaluated.
 * @public
 */
export class ConstantInputError extends Error {
  /** The key that was given. */
  constructor(readonly key: string) {
    super(`'${key}' names a registered constant and is not an input`);
    this.name = 'ConstantInputError';
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
 * True for an error the input contract throws: an absent, unknown, non-number,
 * non-finite, twice-given or constant-named input. A caller that reports input errors one way
 * and domain errors another asks this, not the message.
 * @internal
 */
export function isInputContractError(
  error: unknown,
): error is MissingInputError | UnknownInputError | InputTypeError | NonFiniteInputError | DuplicateInputError | ConstantInputError {
  return (
    error instanceof MissingInputError ||
    error instanceof UnknownInputError ||
    error instanceof InputTypeError ||
    error instanceof NonFiniteInputError ||
    error instanceof DuplicateInputError ||
    error instanceof ConstantInputError
  );
}

/**
 * One input a violated condition reads: the key the caller gave it under, the
 * name the relation reads it by, and its value. @public
 */
export interface DomainInput {
  readonly key: string;
  readonly quantity: string;
  readonly value: number;
}

/**
 * One violated condition of a validity domain. `condition` is the conjunct of
 * the record's `holds` that failed, written with the caller's keys
 * (`T_K >= 0`); `key` and `value` are the first input it reads, and `inputs`
 * every input it reads. A condition that reads no input (a constant check) has
 * `key` `''` and `value` `NaN`. A later range-per-kind change generates the
 * same objects. @public
 */
export interface DomainViolation {
  readonly condition: string;
  readonly key: string;
  readonly value: number;
  readonly inputs: readonly DomainInput[];
}

/** `T_K = -1 violates T_K >= 0`; two inputs: `T_c_K = 5, T_h_K = 3 violate T_c_K <= T_h_K`. */
function describeViolation(violation: DomainViolation): string {
  if (violation.inputs.length === 0) return `${violation.condition} fails`;
  const given = violation.inputs.map((input) => `${input.key} = ${input.value}`).join(', ');
  return `${given} ${violation.inputs.length === 1 ? 'violates' : 'violate'} ${violation.condition}`;
}

/**
 * Evaluation refused: the inputs fall outside the relation's validity domain.
 * The error lists only the conditions that failed, each with the input keys it
 * reads and their values; the message is rendered from them, so it cannot name
 * a condition the check did not run.
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
  /** The id evaluated, every violated condition, and, for a composed edge, where in the composition it failed. */
  constructor(
    readonly id: string,
    readonly violations: readonly DomainViolation[],
    readonly context?: string,
  ) {
    super(
      `${id}: outside the validity domain${context === undefined ? '' : ` (${context})`}: ` +
        violations.map(describeViolation).join('; '),
    );
    this.name = 'DomainViolationError';
  }
}
